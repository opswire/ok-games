import { describe, it, expect } from 'vitest';
import { createInput, tap } from '../src/game/input.js';
import { createSession } from '../src/game/session.js';
import { generateLevel } from '../src/game/generator.js';
import { createRng } from '../src/game/rng.js';

function layerCounts(board) {
  const m = new Map();
  for (const j of board.jars) for (const s of j) m.set(s, (m.get(s) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => a[0] - b[0]);
}

describe('ввод', () => {
  it('выбор, снятие выбора, переливание', () => {
    const level = generateLevel(1);
    const [f, t] = level.solution[0];
    let s = createSession(level);
    let input = createInput();
    let r = tap(s, input, f);
    expect(r.action.type).toBe('select');
    r = tap(r.session, r.input, f);
    expect(r.action.type).toBe('deselect');
    r = tap(r.session, r.input, f);
    r = tap(r.session, r.input, t);
    expect(r.action.type).toBe('pour');
    expect(r.input.selected).toBe(-1);
    expect(r.session.moves).toBe(1);
  });

  it('пустую банку выбрать нельзя', () => {
    const s = createSession(generateLevel(3));
    const empty = s.board.jars.findIndex((j) => j.length === 0);
    expect(tap(s, createInput(), empty).action.type).toBe('ignore');
  });

  it('недопустимый ход снимает выбор и не меняет поле', () => {
    const s = createSession(generateLevel(3));
    const full = s.board.jars.map((j, i) => (j.length === 4 ? i : -1)).filter((i) => i >= 0);
    let r = tap(s, createInput(), full[0]);
    r = tap(r.session, r.input, full[1]);
    expect(r.action.type).toBe('invalid');
    expect(r.session).toBe(s);
    expect(r.input.selected).toBe(-1);
  });

  it('5000 случайных быстрых нажатий: слои не теряются и не дублируются', () => {
    const rng = createRng(99);
    for (const n of [5, 35, 120]) {
      const level = generateLevel(n);
      let s = createSession(level);
      let input = createInput();
      const before = layerCounts(s.board);
      let pours = 0;
      for (let i = 0; i < 5000 && !s.won; i++) {
        const r = tap(s, input, rng.int(s.board.jars.length));
        s = r.session;
        input = r.input;
        if (r.action.type === 'pour') pours++;
        expect(layerCounts(s.board)).toEqual(before);
        for (const j of s.board.jars) expect(j.length).toBeLessThanOrEqual(4);
      }
      expect(s.moves).toBe(pours);
    }
  });
});
