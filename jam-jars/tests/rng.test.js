import { describe, it, expect } from 'vitest';
import { createRng, levelSeed } from '../src/game/rng.js';

describe('rng', () => {
  it('закреплённые первые значения (иначе у всех игроков поменяются уровни)', () => {
    const r = createRng(0);
    expect([r.nextU32(), r.nextU32(), r.nextU32()]).toEqual([1144304738, 1416247, 958946056]);
    expect(levelSeed(1)).toBe(1573952294);
    expect(levelSeed(1, 1)).toBe(425398080);
  });

  it('один seed — одна последовательность', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 100; i++) expect(a.nextU32()).toBe(b.nextU32());
  });

  it('int(n) в диапазоне и покрывает все значения', () => {
    const r = createRng(7);
    const seen = new Set();
    for (let i = 0; i < 2000; i++) {
      const x = r.int(6);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(6);
      seen.add(x);
    }
    expect(seen.size).toBe(6);
  });

  it('shuffle сохраняет элементы', () => {
    const r = createRng(3);
    const arr = r.shuffle([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(arr.slice().sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
