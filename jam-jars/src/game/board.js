// Правила поля «Банки с вареньем». Только чистые функции, без DOM.
//
// Состояние поля:
//   {
//     capacity: 4,          // слоёв одного сорта на уровне (= вместимость обычной банки)
//     jars:   number[][],   // банки, слои снизу вверх, число = номер сорта
//     hidden: number[],     // сколько нижних слоёв банки закрыто «?» (секретные слои)
//     caps:   number[],     // вместимость каждой банки (обычная 4, маленькая 3)
//     locks:  number[],     // банка под замком: сколько собранных банок нужно, чтобы открылась (0 — открыта)
//     only:   number[],     // банка «только для одного сорта»: номер сорта (-1 — любая)
//   }
// Банка собрана, когда в ней все 4 слоя одного сорта. Маленькая банка поэтому
// никогда не бывает собранной — она только перевалочная.
// Функции никогда не меняют переданное состояние, а возвращают новое.

export const CAPACITY = 4;

export function createBoard(jars, { capacity = CAPACITY, hidden, caps, locks, only } = {}) {
  return {
    capacity,
    jars: jars.map((j) => j.slice()),
    hidden: hidden ? hidden.slice() : jars.map(() => 0),
    caps: caps ? caps.slice() : jars.map(() => capacity),
    locks: locks ? locks.slice() : jars.map(() => 0),
    only: only ? only.slice() : jars.map(() => -1),
  };
}

export function cloneBoard(board) {
  return createBoard(board.jars, board);
}

export function top(jar) {
  return jar.length ? jar[jar.length - 1] : -1;
}

/** Длина верхней серии одинаковых слоёв. */
export function topRunLength(jar) {
  if (!jar.length) return 0;
  const sort = jar[jar.length - 1];
  let n = 1;
  while (n < jar.length && jar[jar.length - 1 - n] === sort) n++;
  return n;
}

/** Собрана: все слои одного сорта в одной банке. */
export function isJarComplete(jar, capacity = CAPACITY) {
  return jar.length === capacity && jar.every((s) => s === jar[0]);
}

/** Банка содержит слои только одного сорта (не обязательно полная). */
export function isJarUniform(jar) {
  return jar.length > 0 && jar.every((s) => s === jar[0]);
}

export function completedCount(board) {
  let n = 0;
  for (const j of board.jars) if (isJarComplete(j, board.capacity)) n++;
  return n;
}

export function isLocked(board, i) {
  return (board.locks?.[i] ?? 0) > 0;
}

export function capOf(board, i) {
  return board.caps?.[i] ?? board.capacity;
}

/**
 * Сколько слоёв перельётся из from в to. 0 — ход недопустим.
 * Ход допустим, если вторая банка пуста или её верхний слой того же сорта и есть место;
 * банки под замком не участвуют; в банку «только для одного сорта» — только этот сорт.
 * Переливаются все одинаковые верхние слои подряд, сколько поместится.
 */
export function pourAmount(board, from, to) {
  if (from === to) return 0;
  const a = board.jars[from];
  const b = board.jars[to];
  if (!a || !b || !a.length) return 0;
  if (isLocked(board, from) || isLocked(board, to)) return 0;
  const space = capOf(board, to) - b.length;
  if (space <= 0) return 0;
  const sort = top(a);
  if (b.length && top(b) !== sort) return 0;
  const only = board.only?.[to] ?? -1;
  if (only >= 0 && only !== sort) return 0;
  return Math.min(topRunLength(a), space);
}

export function canPour(board, from, to) {
  return pourAmount(board, from, to) > 0;
}

/** Почему ход недопустим — для подсказки игроку. */
export function whyInvalid(board, from, to) {
  if (isLocked(board, from) || isLocked(board, to)) return 'locked';
  const only = board.only?.[to] ?? -1;
  if (only >= 0 && board.jars[from]?.length && top(board.jars[from]) !== only) return 'only';
  return 'rule';
}

/**
 * Переливание. Возвращает { board, event } или null, если ход недопустим.
 * event: { from, to, sort, count, revealed, completed, unlocked }
 *   revealed — индекс открывшегося слоя в банке from (секретные слои), иначе -1;
 *   completed — банка to собрана этим ходом; unlocked — номера банок, с которых снят замок.
 */
export function pour(board, from, to) {
  const count = pourAmount(board, from, to);
  if (!count) return null;
  const next = cloneBoard(board);
  const a = next.jars[from];
  const b = next.jars[to];
  const sort = top(a);
  a.length -= count;
  for (let i = 0; i < count; i++) b.push(sort);

  const completed = isJarComplete(b, next.capacity);
  // Банка-получатель собрана целиком из одного сорта — скрывать в ней больше нечего.
  if (next.hidden[to] > 0 && completed) next.hidden[to] = 0;

  let revealed = -1;
  const maxHidden = Math.max(0, a.length - 1);
  if (next.hidden[from] > maxHidden) {
    if (a.length > 0 && next.hidden[from] >= a.length) revealed = a.length - 1;
    next.hidden[from] = maxHidden;
  }

  // замки открываются, когда собрано нужное число банок (и остаются открытыми)
  const unlocked = [];
  if (next.locks.some((l) => l > 0)) {
    const done = completedCount(next);
    next.locks.forEach((need, i) => {
      if (need > 0 && done >= need) {
        next.locks[i] = 0;
        unlocked.push(i);
      }
    });
  }
  return { board: next, event: { from, to, sort, count, revealed, completed, unlocked } };
}

/** Уровень пройден: каждая банка пуста или собрана (все 4 слоя одного сорта). */
export function isWon(board) {
  return board.jars.every((j) => j.length === 0 || isJarComplete(j, board.capacity));
}

/** Слой виден игроку (не закрыт «?»). */
export function isLayerVisible(board, jarIndex, layerIndex) {
  return layerIndex >= board.hidden[jarIndex];
}

/**
 * Полезный ход — допустимый ход, который не бессмыслен:
 * не трогаем собранную банку и не переставляем однородную банку в пустую такую же или меньшую.
 */
export function isUsefulMove(board, from, to) {
  const count = pourAmount(board, from, to);
  if (!count) return false;
  const a = board.jars[from];
  if (isJarComplete(a, board.capacity)) return false;
  if (board.jars[to].length === 0 && isJarUniform(a) && capOf(board, to) <= capOf(board, from)) return false;
  return true;
}

export function listMoves(board, { usefulOnly = false } = {}) {
  const moves = [];
  const n = board.jars.length;
  for (let from = 0; from < n; from++) {
    for (let to = 0; to < n; to++) {
      if (usefulOnly ? isUsefulMove(board, from, to) : canPour(board, from, to)) {
        moves.push([from, to]);
      }
    }
  }
  return moves;
}

export function hasUsefulMoves(board) {
  const n = board.jars.length;
  for (let from = 0; from < n; from++) {
    for (let to = 0; to < n; to++) if (isUsefulMove(board, from, to)) return true;
  }
  return false;
}

export function addEmptyJar(board) {
  const next = cloneBoard(board);
  next.jars.push([]);
  next.hidden.push(0);
  next.caps.push(next.capacity);
  next.locks.push(0);
  next.only.push(-1);
  return next;
}

/** Строковый ключ состояния (для тестов и сравнения «ровно то же поле»). */
export function boardKey(board) {
  return JSON.stringify([board.jars, board.hidden, board.caps, board.locks, board.only]);
}
