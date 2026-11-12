// Прогресс игрока: уровень, монеты, запасы, кладовая. Чистые функции над простыми данными.
// Сохранение должно оставаться маленьким: хранилище VK принимает до 4096 байт на ключ.

import { mix32 } from './rng.js';
import { FLAVOR_COUNT } from './generator.js';
import { fillQuests } from './quests.js';

export const SCHEMA_VERSION = 2;

export const ECONOMY = {
  startUndo: 5,
  undoPackCost: 50, // 50 монет = 5 отмен
  undoPackSize: 5,
  hintCost: 30, // подсказка «следующий ход» за монеты
};

export function defaultSave() {
  return {
    schemaVersion: SCHEMA_VERSION,
    rev: 0, // номер записи: растёт при каждом сохранении, при загрузке берётся больший
    level: 1, // текущий (ещё не пройденный) уровень
    coins: 0,
    inventory: { undo: ECONOMY.startUndo, jars: 0 },
    noAds: false,
    daily: { streak: 0, lastDay: null },
    settings: { sound: true },
    stats: { wins: 0, jars: 0 },
    quests: fillQuests({ active: [], seq: 0 }, 1),
    cosmetics: { owned: ['red', 'paper'], lid: 'red', label: 'paper' },
  };
}

/**
 * Миграции: MIGRATIONS[v] переводит запись из версии v в v+1. Удалять старые нельзя.
 * Версия 0 — временное сохранение этапа 2 (только номер уровня).
 */
const MIGRATIONS = {
  0: (old) => ({ ...defaultSave(), schemaVersion: 1, level: Math.max(1, Number(old.level) || 1) }),
  // версия 2: задания и оформление банок; банок закатано — оценка по пройденным уровням
  1: (old) => ({
    ...old,
    stats: { ...(old.stats ?? {}), jars: (old.stats?.wins ?? 0) * 6 },
    quests: fillQuests({ active: [], seq: 0 }, Math.max(1, Number(old.level) || 1)),
    cosmetics: { owned: ['red', 'paper'], lid: 'red', label: 'paper' },
  }),
};

/**
 * Привести запись к текущей схеме. Возвращает null, если запись непригодна
 * или сделана более новой версией игры (её нельзя «понизить» без потерь).
 */
export function migrate(raw) {
  if (!raw || typeof raw !== 'object') return null;
  let data = { ...raw };
  let v = Number.isInteger(data.schemaVersion) ? data.schemaVersion : 0;
  if (v > SCHEMA_VERSION) return null;
  while (v < SCHEMA_VERSION) {
    data = MIGRATIONS[v](data);
    v += 1;
    data.schemaVersion = v;
  }
  return sanitize(data);
}

/** Заполнить пропущенные поля значениями по умолчанию и отсечь мусор. */
function sanitize(d) {
  const def = defaultSave();
  const int = (x, fallback, min = 0) => (Number.isFinite(x) ? Math.max(min, Math.floor(x)) : fallback);
  return {
    schemaVersion: SCHEMA_VERSION,
    rev: int(d.rev, 0),
    level: int(d.level, 1, 1),
    coins: int(d.coins, 0),
    inventory: {
      undo: int(d.inventory?.undo, def.inventory.undo),
      jars: int(d.inventory?.jars, def.inventory.jars),
    },
    noAds: d.noAds === true,
    daily: {
      streak: int(d.daily?.streak, 0),
      lastDay: Number.isFinite(d.daily?.lastDay) ? d.daily.lastDay : null,
    },
    settings: { sound: d.settings?.sound !== false },
    stats: { wins: int(d.stats?.wins, 0), jars: int(d.stats?.jars, 0) },
    quests: sanitizeQuests(d.quests, int(d.level, 1, 1)),
    cosmetics: sanitizeCosmetics(d.cosmetics),
  };
}

function sanitizeQuests(q, level) {
  const ok = (x) => x && Number.isInteger(x.id) && typeof x.type === 'string' && x.target > 0;
  const active = Array.isArray(q?.active) ? q.active.filter(ok).slice(0, 3) : [];
  const seq = Number.isInteger(q?.seq) ? q.seq : 0;
  return fillQuests({ active, seq: Math.max(seq, ...active.map((x) => x.id + 1), 0) }, level);
}

function sanitizeCosmetics(c) {
  const owned = Array.from(new Set(['red', 'paper', ...(Array.isArray(c?.owned) ? c.owned.filter((x) => typeof x === 'string') : [])]));
  const lid = owned.includes(c?.lid) ? c.lid : 'red';
  const label = owned.includes(c?.label) ? c.label : 'paper';
  return { owned, lid, label };
}

/** Из двух записей (платформа и устройство) выбрать ту, у которой больше номер записи. */
export function pickNewest(a, b) {
  if (!a) return b;
  if (!b) return a;
  return b.rev > a.rev ? b : a;
}

/** Победа на уровне n: награда, следующий уровень. */
export function applyWin(save, levelNumber, reward) {
  if (levelNumber !== save.level) return save; // повторная победа на том же уровне не начисляется
  return {
    ...save,
    level: save.level + 1,
    coins: save.coins + reward,
    stats: { ...save.stats, wins: save.stats.wins + 1 },
  };
}

export function addCoins(save, amount) {
  return { ...save, coins: Math.max(0, save.coins + amount) };
}

export function canAfford(save, cost) {
  return save.coins >= cost;
}

/** Обмен монет на набор отмен. null — монет не хватает. */
export function buyUndoPack(save) {
  if (!canAfford(save, ECONOMY.undoPackCost)) return null;
  return {
    ...save,
    coins: save.coins - ECONOMY.undoPackCost,
    inventory: { ...save.inventory, undo: save.inventory.undo + ECONOMY.undoPackSize },
  };
}

export function grant(save, reward) {
  let s = save;
  if (reward.coins) s = addCoins(s, reward.coins);
  if (reward.undo || reward.jars) {
    s = {
      ...s,
      inventory: {
        undo: s.inventory.undo + (reward.undo ?? 0),
        jars: s.inventory.jars + (reward.jars ?? 0),
      },
    };
  }
  return s;
}

export function applyPurchase(save, item) {
  if (item.reward.noAds && save.noAds) return save;
  const next = grant(save, item.reward);
  return item.reward.noAds ? { ...next, noAds: true } : next;
}

// ---------- оформление банок: крышки и этикетки ----------

/** Купить крышку или этикетку (item из data/cosmetics.json). null — не хватает монет. */
export function buyCosmetic(save, item) {
  if (save.cosmetics.owned.includes(item.id)) return save;
  if (!canAfford(save, item.price)) return null;
  return {
    ...save,
    coins: save.coins - item.price,
    cosmetics: { ...save.cosmetics, owned: [...save.cosmetics.owned, item.id] },
  };
}

/** Выбрать купленную крышку (kind = 'lid') или этикетку (kind = 'label'). */
export function selectCosmetic(save, kind, id) {
  if (!save.cosmetics.owned.includes(id)) return save;
  return { ...save, cosmetics: { ...save.cosmetics, [kind]: id } };
}

// ---------- кладовая ----------
// За каждый пройденный уровень на полку ставится одна банка. Полка — 10 банок,
// так что каждые 10 уровней открывается новая полка, а каждые 20 — украшение.
// Каждые 100 уровней — новая комната (кладовая, погреб, веранда, …): 10 полок и 4 украшения.

export const SHELF_SIZE = 10;

/** Сорт банки, которую уровень n ставит в кладовую (детерминированно). */
export function pantryFlavor(n) {
  return mix32(n * 7919 + 17) % FLAVOR_COUNT;
}

/** Сколько полок видно при данном числе пройденных уровней. */
export function shelvesUnlocked(levelsDone) {
  return Math.floor(levelsDone / SHELF_SIZE) + 1;
}

/** Открывшиеся украшения: decorations — список { at, key, name } из data/pantry.json. */
export function decorationsUnlocked(levelsDone, decorations) {
  return decorations.filter((d) => levelsDone >= d.at);
}

export const ROOM_LEVELS = 100;

/** Номер комнаты (0…) для уровня n. */
export function roomIndexOf(n) {
  return Math.floor((Math.max(1, n) - 1) / ROOM_LEVELS);
}

/** Сколько комнат открыто: комната открывается, как только игрок до неё дошёл. */
export function roomsUnlocked(levelsDone, rooms) {
  return Math.min(rooms.length, roomIndexOf(levelsDone + 1) + 1);
}

/**
 * Что нового откроется после прохождения уровня n.
 * data — data/pantry.json ({ rooms, decorations }).
 */
export function pantryUnlocksAt(n, data) {
  const decorations = Array.isArray(data) ? data : data.decorations;
  const rooms = Array.isArray(data) ? [] : data.rooms;
  const out = [];
  const nextRoom = rooms.find((r) => r.from === n + 1);
  if (nextRoom) out.push({ type: 'room', name: nextRoom.name });
  else if (n % SHELF_SIZE === 0) out.push({ type: 'shelf' });
  for (const d of decorations) if (d.at === n) out.push({ type: 'decor', ...d });
  return out;
}
