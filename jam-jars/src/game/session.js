// Партия на одном уровне: текущее поле, история для отмены, добавленные банки.
// Чистые функции: каждая возвращает новую партию и не меняет старую.
//
// Запасы отмен и банок (сколько их у игрока) — это экономика, она живёт снаружи.
// Здесь только правила: отмена возвращает поле ровно в предыдущее состояние,
// включая закрытые «секретные» слои; добавить можно не больше двух банок за уровень.

import { addEmptyJar, cloneBoard, isWon, pour, hasUsefulMoves } from './board.js';
import { solve } from './solver.js';

export const MAX_EXTRA_JARS = 2;

export function createSession(level) {
  return {
    levelNumber: level.number,
    initial: cloneBoard(level.board),
    board: cloneBoard(level.board),
    history: [], // снимки поля до каждого хода
    extraJars: 0,
    moves: 0,
    won: false,
  };
}

/**
 * Ход. Возвращает { session, event } или { session, error: 'invalid' } (партия не меняется).
 */
export function makeMove(session, from, to) {
  if (session.won) return { session, error: 'won' };
  const res = pour(session.board, from, to);
  if (!res) return { session, error: 'invalid' };
  const won = isWon(res.board);
  return {
    session: {
      ...session,
      board: res.board,
      history: [...session.history, session.board],
      moves: session.moves + 1,
      won,
    },
    event: { ...res.event, won },
  };
}

export function canUndo(session) {
  return session.history.length > 0 && !session.won;
}

/** Снимок, сделанный до добавления банки, дополняем пустыми банками до текущего числа. */
function padJars(board, count) {
  let b = board;
  while (b.jars.length < count) b = addEmptyJar(b);
  return b;
}

export function undo(session) {
  if (!canUndo(session)) return session;
  const prev = session.history[session.history.length - 1];
  return {
    ...session,
    board: padJars(prev, session.board.jars.length),
    history: session.history.slice(0, -1),
    moves: session.moves - 1,
  };
}

export function canAddJar(session) {
  return session.extraJars < MAX_EXTRA_JARS && !session.won;
}

export function addJar(session) {
  if (!canAddJar(session)) return session;
  return {
    ...session,
    board: addEmptyJar(session.board),
    extraJars: session.extraJars + 1,
  };
}

/** Начать уровень заново. Добавленные банки остаются: игрок за них уже заплатил. */
export function restart(session) {
  return {
    ...session,
    board: padJars(cloneBoard(session.initial), session.board.jars.length),
    history: [],
    moves: 0,
    won: false,
  };
}

/** Ходов не осталось — пора предложить отмену, банку или «Заново». */
export function isStuck(session) {
  return !session.won && !hasUsefulMoves(session.board);
}

/**
 * Поле уже не решить (даже если формально ходы есть — например, ходят по кругу).
 * При исчерпании лимита решателя считаем, что шанс есть.
 */
export function isHopeless(session, { limit = 20000 } = {}) {
  if (session.won) return false;
  const r = solve(session.board, { limit });
  return !r.solved && !r.exhausted;
}

/** Следующий ход по решателю — для руки-указателя в обучении. null, если решения нет. */
export function hintMove(session, { limit = 20000 } = {}) {
  if (session.won) return null;
  const r = solve(session.board, { limit });
  return r.solved && r.moves.length ? r.moves[0] : null;
}
