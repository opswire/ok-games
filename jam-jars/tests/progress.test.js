import { describe, it, expect } from 'vitest';
import {
  defaultSave, migrate, pickNewest, applyWin, buyUndoPack, grant, applyPurchase,
  pantryFlavor, shelvesUnlocked, pantryUnlocksAt, SCHEMA_VERSION,
  buyCosmetic, selectCosmetic, roomsUnlocked, roomIndexOf,
} from '../src/game/progress.js';
import cosmetics from '../src/data/cosmetics.json';
import pantryData from '../src/data/pantry.json';

describe('сохранение: схема и миграции', () => {
  it('новая запись — текущая схема и стартовые запасы', () => {
    const s = defaultSave();
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.inventory.undo).toBe(5);
    expect(migrate(s)).toEqual(s);
  });

  it('запись без schemaVersion (этап 2) переносит номер уровня', () => {
    const s = migrate({ level: 17 });
    expect(s.level).toBe(17);
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.coins).toBe(0);
  });

  it('запись более новой версии игры не применяется', () => {
    expect(migrate({ ...defaultSave(), schemaVersion: SCHEMA_VERSION + 1 })).toBeNull();
  });

  it('мусор и пропуски заменяются значениями по умолчанию', () => {
    const s = migrate({ schemaVersion: 1, level: -3, coins: 'много', inventory: { undo: 2.7 } });
    expect(s.level).toBe(1);
    expect(s.coins).toBe(0);
    expect(s.inventory).toEqual({ undo: 2, jars: 0 });
    expect(migrate(null)).toBeNull();
    expect(migrate('строка')).toBeNull();
  });

  it('берётся запись с большим номером rev', () => {
    const a = { ...defaultSave(), rev: 5, level: 9 };
    const b = { ...defaultSave(), rev: 7, level: 8 };
    expect(pickNewest(a, b).level).toBe(8);
    expect(pickNewest(a, null).level).toBe(9);
    expect(pickNewest(null, b).level).toBe(8);
  });

  it('сохранение помещается в лимит хранилища VK (4096 байт)', () => {
    const allOwned = [...cosmetics.lids, ...cosmetics.labels].map((x) => x.id);
    const big = migrate({ ...defaultSave(), level: 99999, coins: 9999999, rev: 999999,
      cosmetics: { owned: allOwned, lid: 'gold', label: 'lace' } });
    expect(JSON.stringify(big).length).toBeLessThan(2000);
  });

  it('запись схемы 1 получает задания и оформление', () => {
    const v1 = { schemaVersion: 1, rev: 5, level: 40, coins: 70, inventory: { undo: 2, jars: 1 },
      noAds: false, daily: { streak: 2, lastDay: 100 }, settings: { sound: true }, stats: { wins: 39 } };
    const s = migrate(v1);
    expect(s.schemaVersion).toBe(2);
    expect([s.level, s.coins, s.inventory.undo]).toEqual([40, 70, 2]);
    expect(s.quests.active.length).toBe(3);
    expect(s.cosmetics).toEqual({ owned: ['red', 'paper'], lid: 'red', label: 'paper' });
  });
});

describe('экономика', () => {
  it('победа: монеты и следующий уровень, повтор не начисляется', () => {
    let s = defaultSave();
    s = applyWin(s, 1, 10);
    expect([s.level, s.coins, s.stats.wins]).toEqual([2, 10, 1]);
    expect(applyWin(s, 1, 10)).toBe(s);
  });

  it('50 монет = 5 отмен; без монет — нельзя', () => {
    expect(buyUndoPack(defaultSave())).toBeNull();
    const s = buyUndoPack({ ...defaultSave(), coins: 60 });
    expect(s.coins).toBe(10);
    expect(s.inventory.undo).toBe(10);
  });

  it('награда ежедневного подарка', () => {
    const s = grant(defaultSave(), { coins: 100, jars: 1, undo: 2 });
    expect([s.coins, s.inventory.jars, s.inventory.undo]).toEqual([100, 1, 7]);
  });

  it('покупка выдаёт товар, «Без рекламы» не применяется повторно', () => {
    let s = applyPurchase(defaultSave(), { reward: { coins: 150, undo: 10 } });
    expect([s.coins, s.inventory.undo]).toEqual([150, 15]);
    s = applyPurchase(s, { reward: { noAds: true } });
    expect(s.noAds).toBe(true);
    expect(applyPurchase(s, { reward: { noAds: true } })).toBe(s);
  });
});

describe('оформление банок', () => {
  it('покупка списывает монеты, повторная — бесплатно, без монет — нельзя', () => {
    const blue = cosmetics.lids.find((x) => x.id === 'blue');
    expect(buyCosmetic(defaultSave(), blue)).toBeNull();
    let s = buyCosmetic({ ...defaultSave(), coins: 200 }, blue);
    expect(s.coins).toBe(200 - blue.price);
    expect(buyCosmetic(s, blue)).toBe(s);
    s = selectCosmetic(s, 'lid', 'blue');
    expect(s.cosmetics.lid).toBe('blue');
    expect(selectCosmetic(s, 'lid', 'gold')).toBe(s); // не куплена
  });
});

describe('комнаты', () => {
  it('новая комната каждые 100 уровней', () => {
    const rooms = pantryData.rooms;
    expect(rooms.length).toBe(10);
    expect(roomsUnlocked(0, rooms)).toBe(1);
    expect(roomsUnlocked(99, rooms)).toBe(1);
    expect(roomsUnlocked(100, rooms)).toBe(2);
    expect(roomsUnlocked(5000, rooms)).toBe(10);
    expect(roomIndexOf(100)).toBe(0);
    expect(roomIndexOf(101)).toBe(1);
    expect(pantryUnlocksAt(100, pantryData).map((u) => u.type)).toEqual(['room']);
  });

  it('40 украшений до 1000-го уровня, по 4 в каждой комнате, у каждого есть рисунок', async () => {
    const { DECOR } = await import('../src/assets/decor.js');
    expect(pantryData.decorations.length).toBe(40);
    for (let r = 0; r < 10; r++) {
      expect(pantryData.decorations.filter((d) => roomIndexOf(d.at) === r).length).toBe(4);
    }
    for (const d of pantryData.decorations) expect(DECOR[d.key], d.key).toBeDefined();
  });
});

describe('кладовая', () => {
  it('новая полка каждые 10 уровней, украшение каждые 20', () => {
    expect(shelvesUnlocked(0)).toBe(1);
    expect(shelvesUnlocked(9)).toBe(1);
    expect(shelvesUnlocked(10)).toBe(2);
    const at = (n) => pantryUnlocksAt(n, pantryData).map((u) => u.type);
    expect(at(10)).toEqual(['shelf']);
    expect(at(20)).toEqual(['shelf', 'decor']);
    expect(at(15)).toEqual([]);
  });

  it('сорт банки уровня постоянен', () => {
    for (let n = 1; n < 100; n++) {
      expect(pantryFlavor(n)).toBe(pantryFlavor(n));
      expect(pantryFlavor(n)).toBeGreaterThanOrEqual(0);
      expect(pantryFlavor(n)).toBeLessThan(12);
    }
  });
});
