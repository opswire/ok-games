import { describe, it, expect } from 'vitest';
import { generateLevel, levelParams, MIN_SOLUTION } from '../src/game/generator.js';
import { pour, isWon, isJarComplete, boardKey } from '../src/game/board.js';
import { solve, solvableWithin } from '../src/game/solver.js';
import flavors from '../src/data/flavors.json';

const LEVELS = 500;
const levels = [];
const times = [];
for (let n = 1; n <= LEVELS; n++) {
  const t0 = performance.now();
  levels.push(generateLevel(n));
  times.push(performance.now() - t0);
}

/** Проигрывает решение обычными правилами игры — независимо от внутренностей решателя. */
function replay(level) {
  let board = level.board;
  for (const [f, t] of level.solution) {
    const res = pour(board, f, t);
    if (!res) return false;
    board = res.board;
  }
  return isWon(board);
}

describe(`генератор: уровни 1–${LEVELS}`, () => {
  it('все уровни решаемы (решение проверено правилами игры)', () => {
    const bad = levels.filter((l) => !replay(l)).map((l) => l.number);
    expect(bad).toEqual([]);
  });

  it('генерация каждого уровня быстрее 200 мс', () => {
    const max = Math.max(...times);
    expect(max).toBeLessThan(200);
  });

  it('нет тривиальных уровней (решение не короче 5 ходов)', () => {
    const trivial = levels.filter((l) => solvableWithin(l.board, MIN_SOLUTION - 1));
    expect(trivial.map((l) => l.number)).toEqual([]);
  });

  it('форма поля: каждого сорта ровно 4 слоя, все банки полные или пустые, собранных нет', () => {
    for (const l of levels) {
      const { jars } = l.board;
      const counts = new Map();
      for (const j of jars) for (const s of j) counts.set(s, (counts.get(s) ?? 0) + 1);
      expect([...counts.keys()].sort((a, b) => a - b)).toEqual(l.flavors);
      for (const c of counts.values()) expect(c).toBe(4);
      expect(jars.every((j) => j.length === 0 || j.length === 4)).toBe(true);
      expect(jars.some((j) => isJarComplete(j))).toBe(false);
      expect(jars.filter((j) => j.length === 0).length).toBe(l.params.empties);
      for (const s of l.flavors) expect(flavors[s]).toBeDefined();
    }
  });

  it('один номер — один и тот же уровень', () => {
    for (const n of [1, 2, 17, 35, 90, 333, 500]) {
      expect(boardKey(generateLevel(n).board)).toBe(boardKey(levels[n - 1].board));
    }
  });

  it('уровни различаются', () => {
    const keys = new Set(levels.map((l) => boardKey(l.board)));
    expect(keys.size).toBe(LEVELS);
  });

  it('решатель независимо подтверждает решаемость', () => {
    for (const n of [1, 50, 100, 250, 500]) {
      expect(solve(levels[n - 1].board).solved).toBe(true);
    }
  });
});

describe('кривая сложности', () => {
  it('сорта и пустые банки по таблице', () => {
    const p = (n) => levelParams(n);
    expect([p(1).sorts, p(1).empties, p(2).sorts]).toEqual([2, 1, 2]);
    for (let n = 3; n <= 10; n++) {
      expect(p(n).sorts).toBeGreaterThanOrEqual(3);
      expect(p(n).sorts).toBeLessThanOrEqual(4);
      expect(p(n).empties).toBe(2);
    }
    for (let n = 11; n <= 30; n++) expect([5, 6]).toContain(p(n).sorts);
    for (let n = 31; n <= 80; n++) {
      // передышка и уровень знакомства с механикой могут быть на сорт легче
      expect(p(n).sorts).toBeGreaterThanOrEqual(p(n).breather || p(n).intro ? 6 : 7);
      expect(p(n).sorts).toBeLessThanOrEqual(8);
    }
    for (let n = 81; n <= 1000; n++) {
      expect(p(n).sorts).toBeGreaterThanOrEqual(9);
      expect(p(n).sorts).toBeLessThanOrEqual(12);
    }
  });

  it('обучение — уровни 1–2', () => {
    expect(levelParams(1).tutorial && levelParams(2).tutorial).toBe(true);
    expect(levelParams(3).tutorial).toBe(false);
  });

  it('секретные слои — каждый 5-й на 31–80, дальше каждый 10-й; видны только верхние слои', () => {
    for (let n = 1; n <= LEVELS; n++) {
      const l = levels[n - 1];
      const secret = (n >= 31 && n <= 80 && n % 5 === 0) || (n > 80 && n % 10 === 5);
      expect(l.params.secret).toBe(secret);
      l.board.jars.forEach((j, i) => {
        expect(l.board.hidden[i]).toBe(secret && j.length ? j.length - 1 : 0);
      });
    }
  });

  it('сложные — каждый 10-й с 81-го, двойная награда', () => {
    expect(levelParams(80).hard).toBe(false);
    expect(levelParams(90).hard).toBe(true);
    expect(levelParams(90).reward).toBe(2 * levelParams(89).reward);
    expect(levelParams(95).hard).toBe(false);
  });

  it('уровень после сложного заметно легче сложного', () => {
    for (let n = 90; n <= 1000; n += 10) {
      const hard = levelParams(n);
      const next = levelParams(n + 1);
      expect(next.breather).toBe(true);
      expect(next.sorts).toBeLessThan(hard.sorts);
      expect(next.mix).toBeLessThan(hard.mix);
    }
    // и по факту: решение короче в среднем
    let hardLen = 0;
    let nextLen = 0;
    for (let n = 90; n < LEVELS; n += 10) {
      hardLen += levels[n - 1].solution.length;
      nextLen += levels[n].solution.length;
    }
    expect(nextLen).toBeLessThan(hardLen);
  });
});

describe('новые механики', () => {
  const has = (key) => levels.filter((l) => l.params[key]);

  it('вводятся по одной каждые 35 уровней и потом встречаются регулярно', () => {
    expect(levelParams(66).intro).toBe('small');
    expect(levelParams(101).intro).toBe('lock');
    expect(levelParams(136).intro).toBe('only');
    for (const key of ['small', 'lock', 'only']) {
      const ns = has(key).map((l) => l.number);
      const first = { small: 66, lock: 101, only: 136 }[key];
      expect(ns[0]).toBe(first);
      expect(ns.length).toBeGreaterThan(20); // встречается и после знакомства
    }
  });

  it('маленькая банка — одна, на 3 слоя, пустая', () => {
    for (const l of has('small')) {
      const smalls = l.board.caps.map((c, i) => (c === 3 ? i : -1)).filter((i) => i >= 0);
      expect(smalls.length).toBe(1);
      expect(l.board.jars[smalls[0]]).toEqual([]);
    }
  });

  it('банка под замком — одна, с вареньем, открывается после 2 собранных', () => {
    for (const l of has('lock')) {
      const locked = l.board.locks.map((x, i) => (x > 0 ? i : -1)).filter((i) => i >= 0);
      expect(locked.length).toBe(1);
      expect(l.board.locks[locked[0]]).toBe(2);
      expect(l.board.jars[locked[0]].length).toBe(4);
    }
  });

  it('банка «только для сорта» — пустая, сорт есть на уровне', () => {
    for (const l of has('only')) {
      const idx = l.board.only.findIndex((x) => x >= 0);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(l.board.jars[idx]).toEqual([]);
      expect(l.flavors).toContain(l.board.only[idx]);
    }
  });

  it('механики не появляются на сложных уровнях и передышках (кроме секретных слоёв)', () => {
    for (const l of levels) {
      if ((l.params.hard || l.params.breather) && !l.params.intro) {
        expect(l.params.small || l.params.lock || l.params.only).toBe(false);
      }
    }
  });
});
