// Задания: «Закатай 20 банок малины», «Пройди 3 уровня без отмен» и т. п. — с наградой монетами.
// Одновременно активны 3 задания. Выполненное забирается кнопкой и заменяется новым.
// Новые задания выбираются детерминированно по номеру (seq), а цели подстраиваются под уровень игрока.
// Чистые функции без DOM.

import { createRng, mix32 } from './rng.js';
import { levelParams, FLAVOR_COUNT } from './generator.js';

export const ACTIVE_QUESTS = 3;

/** Склонение: plural(5, ['уровень', 'уровня', 'уровней']) → 'уровней'. */
export function plural(n, [one, few, many]) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

const TYPES = [
  { type: 'flavor', weight: 4 }, // закатать N банок определённого сорта
  { type: 'jars', weight: 2 }, // закатать N банок любого варенья
  { type: 'wins', weight: 2 }, // пройти N уровней
  { type: 'noUndo', weight: 3 }, // пройти N уровней без отмен
  { type: 'noHint', weight: 2 }, // пройти N уровней без подсказок
  { type: 'hard', weight: 2, minLevel: 85 }, // пройти N сложных уровней
];

/** Создать задание номер seq для игрока на уровне level. exclude — уже активные задания. */
export function makeQuest(seq, level, exclude = []) {
  const rng = createRng(mix32(seq * 2654435761 + 97));
  const sorts = levelParams(Math.max(1, level)).sorts;
  for (let attempt = 0; attempt < 20; attempt++) {
    const pool = TYPES.filter((t) => level >= (t.minLevel ?? 0));
    const total = pool.reduce((s, t) => s + t.weight, 0);
    let roll = rng.int(total);
    const pick = pool.find((t) => (roll -= t.weight) < 0);
    const q = { id: seq, type: pick.type, progress: 0, target: 0, reward: 0 };
    if (pick.type === 'flavor') {
      q.flavor = rng.int(FLAVOR_COUNT);
      // в среднем сорт встречается в sorts/12 уровней; цель — примерно 10–20 уровней игры
      q.target = Math.max(3, Math.round(((10 + rng.int(11)) * sorts) / FLAVOR_COUNT));
      q.reward = 30 + q.target * 4;
    } else if (pick.type === 'jars') {
      q.target = Math.max(10, Math.round((6 + rng.int(7)) * sorts / 5) * 5);
      q.reward = 30 + Math.round(q.target * 1.2);
    } else if (pick.type === 'wins') {
      q.target = 5 + rng.int(6);
      q.reward = 20 + q.target * 6;
    } else if (pick.type === 'noUndo') {
      q.target = 3 + rng.int(3);
      q.reward = 30 + q.target * 12;
    } else if (pick.type === 'noHint') {
      q.target = 4 + rng.int(4);
      q.reward = 25 + q.target * 8;
    } else {
      q.target = 1 + rng.int(2);
      q.reward = 50 + q.target * 30;
    }
    q.reward = Math.round(q.reward / 5) * 5;
    const dup = exclude.some((e) => e.type === q.type && (q.type !== 'flavor' || e.flavor === q.flavor));
    if (!dup) return q;
  }
  return { id: seq, type: 'wins', progress: 0, target: 5, reward: 50 };
}

/** Дополнить список активных заданий до трёх. */
export function fillQuests(quests, level) {
  let { active, seq } = quests;
  active = active.slice();
  while (active.length < ACTIVE_QUESTS) {
    active.push(makeQuest(seq, level, active));
    seq += 1;
  }
  return { active, seq };
}

/**
 * Учесть пройденный уровень.
 * win: { flavors: number[], undos: number, hints: number, hard: boolean }
 * Возвращает { quests, completed: [задания, выполненные именно сейчас] }.
 */
export function onLevelWin(quests, win) {
  const completed = [];
  const active = quests.active.map((q) => {
    if (q.progress >= q.target) return q;
    let add = 0;
    if (q.type === 'flavor') add = win.flavors.includes(q.flavor) ? 1 : 0;
    else if (q.type === 'jars') add = win.flavors.length;
    else if (q.type === 'wins') add = 1;
    else if (q.type === 'noUndo') add = win.undos === 0 ? 1 : 0;
    else if (q.type === 'noHint') add = win.hints === 0 ? 1 : 0;
    else if (q.type === 'hard') add = win.hard ? 1 : 0;
    const progress = Math.min(q.target, q.progress + add);
    const next = { ...q, progress };
    if (progress >= q.target && q.progress < q.target) completed.push(next);
    return next;
  });
  return { quests: { ...quests, active }, completed };
}

/** Забрать награду за выполненное задание: { quests, reward } или null. */
export function claimQuest(quests, id, level) {
  const q = quests.active.find((x) => x.id === id);
  if (!q || q.progress < q.target) return null;
  const rest = { active: quests.active.filter((x) => x.id !== id), seq: quests.seq };
  return { quests: fillQuests(rest, level), reward: q.reward };
}

export function claimableCount(quests) {
  return quests.active.filter((q) => q.progress >= q.target).length;
}

/** Текст задания. flavors — data/flavors.json (для названия сорта). */
export function questText(q, flavors) {
  const n = q.target;
  switch (q.type) {
    case 'flavor':
      return `Закатай ${n} ${plural(n, ['банку', 'банки', 'банок'])} ${flavors[q.flavor].gen}`;
    case 'jars':
      return `Закатай ${n} ${plural(n, ['банку', 'банки', 'банок'])} варенья`;
    case 'wins':
      return `Пройди ${n} ${plural(n, ['уровень', 'уровня', 'уровней'])}`;
    case 'noUndo':
      return `Пройди ${n} ${plural(n, ['уровень', 'уровня', 'уровней'])} без отмен`;
    case 'noHint':
      return `Пройди ${n} ${plural(n, ['уровень', 'уровня', 'уровней'])} без подсказок`;
    case 'hard':
      return `Пройди ${n} ${plural(n, ['сложный уровень', 'сложных уровня', 'сложных уровней'])}`;
    default:
      return '';
  }
}
