import { describe, it, expect } from 'vitest';
import { boardKey, listMoves } from '../src/game/board.js';
import { generateLevel } from '../src/game/generator.js';
import { createRng } from '../src/game/rng.js';
import {
  createSession,
  makeMove,
  undo,
  addJar,
  restart,
  canAddJar,
  isStuck,
  isHopeless,
  hintMove,
  MAX_EXTRA_JARS,
} from '../src/game/session.js';

describe('отмена', () => {
  it('случайный ход + отмена возвращают поле ровно в прежнее состояние (1000 раз, с секретными слоями)', () => {
    const rng = createRng(2026);
    let session = createSession(generateLevel(35)); // секретный уровень
    expect(session.board.hidden.some((h) => h > 0)).toBe(true);
    let checks = 0;
    for (let i = 0; i < 1500 && checks < 1000; i++) {
      const moves = listMoves(session.board);
      if (!moves.length || session.won) {
        session = restart(session);
        continue;
      }
      const before = boardKey(session.board);
      const [f, t] = rng.pick(moves);
      const { session: after } = makeMove(session, f, t);
      if (after.won) {
        // после победы отмена запрещена — уровень окончен
        expect(undo(after)).toBe(after);
        session = restart(after);
        continue;
      }
      expect(boardKey(undo(after).board)).toBe(before);
      checks++;
      session = after;
    }
    expect(checks).toBe(1000);
  });

  it('отмена возвращает замок обратно (1000 случайных ходов на уровне с замком)', () => {
    const rng = createRng(77);
    const level = generateLevel(101);
    expect(level.board.locks.some((x) => x > 0)).toBe(true);
    let session = createSession(level);
    for (let i = 0; i < 1000; i++) {
      const moves = listMoves(session.board);
      if (!moves.length || session.won) {
        session = restart(session);
        continue;
      }
      const before = boardKey(session.board);
      const [f, t] = rng.pick(moves);
      const { session: after } = makeMove(session, f, t);
      if (after.won) {
        session = restart(after);
        continue;
      }
      expect(boardKey(undo(after).board)).toBe(before);
      session = after;
    }
  });

  it('цепочка ходов отменяется до начала', () => {
    const level = generateLevel(12);
    let s = createSession(level);
    const start = boardKey(s.board);
    for (const [f, t] of level.solution.slice(0, 6)) s = makeMove(s, f, t).session;
    for (let i = 0; i < 6; i++) s = undo(s);
    expect(boardKey(s.board)).toBe(start);
    expect(s.moves).toBe(0);
    expect(undo(s)).toBe(s); // отменять больше нечего
  });

  it('отмена после добавления банки сохраняет банку', () => {
    const level = generateLevel(5);
    let s = createSession(level);
    const [f, t] = level.solution[0];
    s = makeMove(s, f, t).session;
    s = addJar(s);
    const jarsNow = s.board.jars.length;
    s = undo(s);
    expect(s.board.jars.length).toBe(jarsNow);
    expect(s.board.jars[jarsNow - 1]).toEqual([]);
  });
});

describe('партия', () => {
  it('недопустимый ход не меняет партию', () => {
    const s = createSession(generateLevel(3));
    const full = s.board.jars.findIndex((j) => j.length === 4);
    const other = s.board.jars.findIndex((j, i) => i !== full && j.length === 4);
    const res = makeMove(s, full, other);
    expect(res.error).toBe('invalid');
    expect(res.session).toBe(s);
  });

  it('решение решателя приводит к победе', () => {
    const level = generateLevel(20);
    let s = createSession(level);
    for (const [f, t] of level.solution) s = makeMove(s, f, t).session;
    expect(s.won).toBe(true);
    expect(makeMove(s, 0, 1).error).toBe('won');
  });

  it('не больше двух банок за уровень, «Заново» их сохраняет', () => {
    let s = createSession(generateLevel(8));
    const base = s.board.jars.length;
    for (let i = 0; i < 5; i++) s = addJar(s);
    expect(s.board.jars.length).toBe(base + MAX_EXTRA_JARS);
    expect(canAddJar(s)).toBe(false);
    s = restart(s);
    expect(s.board.jars.length).toBe(base + MAX_EXTRA_JARS);
    expect(s.history).toEqual([]);
  });

  it('тупик распознаётся', () => {
    const stuck = createSession({
      number: 0,
      board: { capacity: 4, jars: [[0, 1, 0, 1], [1, 0, 1, 0]], hidden: [0, 0] },
    });
    expect(isStuck(stuck)).toBe(true);
    expect(isHopeless(stuck)).toBe(true);
    expect(hintMove(stuck)).toBeNull();
  });

  it('подсказка даёт допустимый ход', () => {
    const s = createSession(generateLevel(1));
    const m = hintMove(s);
    expect(m).not.toBeNull();
    expect(makeMove(s, m[0], m[1]).error).toBeUndefined();
  });
});
