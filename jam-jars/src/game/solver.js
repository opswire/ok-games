// Решатель: поиск в глубину с запоминанием посещённых состояний и лимитом на их число.
// Работает с полной информацией (секретные слои ему видны) — нужен для проверки уровней,
// оценки сложности и подсказок. Учитывает маленькие банки, замки и банки «только для сорта».
//
// Внутри банки — строки ('abca' = сорта 0,1,2,0 снизу вверх): так копирование и ключи дешевле.

const A = 97; // 'a'
const SORT = 4; // слоёв одного сорта — собранная банка

function runLen(s) {
  const n = s.length;
  if (!n) return 0;
  const c = s.charCodeAt(n - 1);
  let k = 1;
  while (k < n && s.charCodeAt(n - 1 - k) === c) k++;
  return k;
}

function isComplete(s) {
  return s.length === SORT && runLen(s) === SORT;
}

function isWonStr(jars) {
  for (const s of jars) if (s.length && !isComplete(s)) return false;
  return true;
}

/**
 * Неизменные свойства банок: вместимость, «только для сорта», порог замка.
 * sig — подпись банки: банки с одинаковой подписью взаимозаменяемы.
 */
function staticInfo(board) {
  const n = board.jars.length;
  const caps = [];
  const only = [];
  const lockAt = [];
  const sig = [];
  for (let i = 0; i < n; i++) {
    caps.push(board.caps?.[i] ?? board.capacity ?? SORT);
    only.push(board.only?.[i] ?? -1);
    lockAt.push(board.locks?.[i] ?? 0);
    sig.push(`${caps[i]}.${only[i]}`);
  }
  return { caps, only, lockAt, sig };
}

function encode(board) {
  return board.jars.map((j) => String.fromCharCode(...j.map((s) => A + s)));
}

/** Ключ без учёта порядка взаимозаменяемых банок. locked — маска закрытых банок. */
function keyOf(jars, info, locked) {
  const parts = new Array(jars.length);
  for (let i = 0; i < jars.length; i++) parts[i] = `${info.sig[i]}${locked & (1 << i) ? 'L' : ''}:${jars[i]}`;
  return parts.sort().join('|');
}

function completed(jars) {
  let n = 0;
  for (const s of jars) if (isComplete(s)) n++;
  return n;
}

/** Снять замки, если собрано достаточно банок. */
function updateLocks(jars, info, locked) {
  if (!locked) return 0;
  const done = completed(jars);
  let m = locked;
  for (let i = 0; i < jars.length; i++) if (m & (1 << i) && done >= info.lockAt[i]) m &= ~(1 << i);
  return m;
}

/**
 * Ходы с отсечениями симметрий и бессмысленных ходов, отсортированные эвристикой:
 * сначала ходы, которые собирают банку и наращивают серию, переливание в пустую — в конце.
 */
function movesOf(jars, info, locked) {
  const out = [];
  const seenEmpty = new Set(); // в пустые банки одной подписи — только в первую
  const firstEmpty = new Map();
  for (let i = 0; i < jars.length; i++) {
    if (!jars[i].length && !(locked & (1 << i)) && !firstEmpty.has(info.sig[i])) firstEmpty.set(info.sig[i], i);
  }

  for (let f = 0; f < jars.length; f++) {
    const a = jars[f];
    if (!a.length || isComplete(a) || locked & (1 << f)) continue;
    const run = runLen(a);
    const uniform = run === a.length;
    const c = a.charCodeAt(a.length - 1);
    const sortId = c - A;
    seenEmpty.clear();
    for (let t = 0; t < jars.length; t++) {
      if (t === f || locked & (1 << t)) continue;
      const b = jars[t];
      const space = info.caps[t] - b.length;
      if (space <= 0) continue;
      if (info.only[t] >= 0 && info.only[t] !== sortId) continue;
      let score;
      const moved = Math.min(run, space);
      if (!b.length) {
        if (firstEmpty.get(info.sig[t]) !== t) continue;
        if (uniform && info.caps[t] <= info.caps[f]) continue; // переставить однородную банку — бессмысленно
        score = run - 10 + (info.only[t] >= 0 ? 6 : 0);
      } else {
        if (b.charCodeAt(b.length - 1) !== c) continue;
        score = runLen(b) + moved + (moved === run ? 2 : 0) + (moved === a.length ? 3 : 0);
        if (runLen(b) === b.length && b.length + moved === SORT) score += 10; // собрали банку
      }
      out.push(f, t, moved, score);
    }
  }
  const idx = [];
  for (let i = 0; i < out.length; i += 4) idx.push(i);
  idx.sort((x, y) => out[y + 3] - out[x + 3]);
  return idx.map((i) => [out[i], out[i + 1], out[i + 2]]);
}

function applyStr(jars, f, t, count) {
  const next = jars.slice();
  const a = jars[f];
  next[f] = a.slice(0, a.length - count);
  next[t] = jars[t] + a.slice(a.length - count);
  return next;
}

function initialLocked(info) {
  let m = 0;
  info.lockAt.forEach((need, i) => {
    if (need > 0) m |= 1 << i;
  });
  return m;
}

/**
 * Найти решение.
 * @returns {{ solved: boolean, moves: number[][], explored: number, exhausted: boolean }}
 *   exhausted — лимит состояний исчерпан (результат «не знаю»).
 */
export function solve(board, { limit = 200000 } = {}) {
  const info = staticInfo(board);
  const start = encode(board);
  const startLocked = updateLocks(start, info, initialLocked(info));
  if (isWonStr(start)) return { solved: true, moves: [], explored: 1, exhausted: false };

  const visited = new Set([keyOf(start, info, startLocked)]);
  const stack = [{ jars: start, locked: startLocked, moves: movesOf(start, info, startLocked), i: 0, via: null }];

  while (stack.length) {
    const frame = stack[stack.length - 1];
    if (frame.i >= frame.moves.length) {
      stack.pop();
      continue;
    }
    const [f, t, count] = frame.moves[frame.i++];
    const next = applyStr(frame.jars, f, t, count);
    const locked = updateLocks(next, info, frame.locked);
    const key = keyOf(next, info, locked);
    if (visited.has(key)) continue;
    visited.add(key);

    if (isWonStr(next)) {
      const moves = stack.slice(1).map((fr) => fr.via);
      moves.push([f, t]);
      return { solved: true, moves, explored: visited.size, exhausted: false };
    }
    if (visited.size >= limit) {
      return { solved: false, moves: [], explored: visited.size, exhausted: true };
    }
    stack.push({ jars: next, locked, moves: movesOf(next, info, locked), i: 0, via: [f, t] });
  }
  return { solved: false, moves: [], explored: visited.size, exhausted: false };
}

/**
 * Решается ли поле не более чем за depth ходов (поиск в ширину по слоям).
 * Нужен, чтобы отбраковывать тривиальные уровни.
 */
export function solvableWithin(board, depth) {
  const info = staticInfo(board);
  const s0 = encode(board);
  let layer = [{ jars: s0, locked: updateLocks(s0, info, initialLocked(info)) }];
  const seen = new Set([keyOf(s0, info, layer[0].locked)]);
  for (let d = 0; d <= depth; d++) {
    for (const st of layer) if (isWonStr(st.jars)) return true;
    if (d === depth) break;
    const nextLayer = [];
    for (const st of layer) {
      for (const [f, t, count] of movesOf(st.jars, info, st.locked)) {
        const next = applyStr(st.jars, f, t, count);
        const locked = updateLocks(next, info, st.locked);
        const key = keyOf(next, info, locked);
        if (seen.has(key)) continue;
        seen.add(key);
        nextLayer.push({ jars: next, locked });
      }
    }
    layer = nextLayer;
  }
  return false;
}
