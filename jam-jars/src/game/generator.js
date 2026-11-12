// Генератор уровней по номеру. Один номер — всегда один и тот же уровень.
//
// Способ: берём решённое состояние (каждая банка — один сорт, плюс пустые банки),
// делаем K случайных обменов слоями между банками (K — ручка сложности),
// затем решатель проверяет, что уровень решаем. Нерешаемые и тривиальные
// (решаются меньше чем за MIN_SOLUTION ходов) отбрасываются, берётся следующий seed.
//
// Почему не «обратные переливания»: проверено экспериментом — случайный обход
// обратными ходами приходит к форме «все банки полные + 2 пустые» лишь в ~20% случаев,
// а поля почти не перемешаны (12 сортов: ~14 пар одинаковых соседних слоёв из 36,
// у случайного поля ~2). Обмены сохраняют форму поля и дают управляемую сложность.

import { createRng, levelSeed } from './rng.js';
import { CAPACITY, createBoard, isJarComplete } from './board.js';
import { solve, solvableWithin } from './solver.js';

export const FLAVOR_COUNT = 12;
export const MIN_SOLUTION = 5;
const MAX_ATTEMPTS = 60;
const SOLVER_LIMIT = 40000;

/** Сложный уровень: с 81-го каждый 10-й. */
export function isHardLevel(n) {
  return n >= 81 && n % 10 === 0;
}

/** Уровень с «секретными» слоями: на 31–80 каждый 5-й, дальше — каждый 10-й (25, 35, …). */
export function isSecretLevel(n) {
  if (n >= 31 && n <= 80) return n % 5 === 0;
  return n > 80 && n % 10 === 5;
}

/**
 * Новые механики вводятся по одной каждые 35 уровней. На уровне знакомства механика
 * показывается впервые (уровень легче обычного), дальше встречается регулярно.
 */
export const MECHANICS = [
  { key: 'secret', intro: 31 },
  { key: 'small', intro: 66, every: 7, offset: 3 }, // маленькая банка на 3 слоя
  { key: 'lock', intro: 101, every: 9, offset: 4 }, // банка под замком: открывается после 2 собранных
  { key: 'only', intro: 136, every: 8, offset: 6 }, // банка «только для одного сорта»
];

export const LOCK_AFTER = 2;

/** Какая механика знакомится на уровне n (или null). */
export function introAt(n) {
  return MECHANICS.find((m) => m.intro === n)?.key ?? null;
}

function hasMechanic(n, key) {
  if (key === 'secret') return isSecretLevel(n);
  const m = MECHANICS.find((x) => x.key === key);
  if (n < m.intro) return false;
  if (n === m.intro) return true;
  if (isHardLevel(n) || isBreatherLevel(n)) return false;
  return n % m.every === m.offset;
}

/** Уровень-передышка: сразу после сложного или секретного. */
export function isBreatherLevel(n) {
  return n > 1 && (isHardLevel(n - 1) || isSecretLevel(n - 1));
}

/**
 * Параметры уровня по кривой сложности.
 * mix — доля перемешивания: K = round(mix * слоёв); 1 ≈ полностью случайное поле.
 */
export function levelParams(n) {
  if (!Number.isInteger(n) || n < 1) throw new Error(`Номер уровня должен быть >= 1: ${n}`);
  let sorts;
  let empties = 2;
  let mix;

  if (n <= 2) {
    sorts = 2;
    empties = 1;
    mix = 0.5;
  } else if (n <= 10) {
    sorts = n <= 5 ? 3 : 4;
    mix = 0.45 + (n - 3) * 0.03;
  } else if (n <= 30) {
    sorts = n <= 20 ? 5 : 6;
    mix = 0.55 + ((n - 11) % 10) * 0.02;
  } else if (n <= 80) {
    sorts = n <= 55 ? 7 : 8;
    mix = 0.65 + ((n - 31) % 10) * 0.02;
  } else {
    sorts = Math.min(12, 9 + Math.floor((n - 81) / 40));
    mix = 0.75 + ((n - 81) % 10) * 0.02;
  }

  const hard = isHardLevel(n);
  const secret = isSecretLevel(n);
  const breather = isBreatherLevel(n);
  const intro = introAt(n);
  let small = hasMechanic(n, 'small');
  const lock = hasMechanic(n, 'lock');
  const only = hasMechanic(n, 'only');
  // маленькая банка вместе с «только для сорта» не оставляют обычной пустой банки — слишком тесно
  if (small && only) small = intro === 'small';

  if (hard) {
    sorts = Math.min(12, sorts + 1);
    mix = 1.2;
  }
  if (breather || intro) {
    sorts = Math.max(n >= 81 ? 9 : 3, sorts - 1);
    mix = Math.max(0.4, mix - 0.25);
  }

  return {
    sorts,
    empties,
    mix,
    hard,
    secret,
    breather,
    small,
    lock,
    only: only && (!small || intro !== 'small'),
    intro,
    tutorial: n <= 2,
    reward: hard ? 20 : 10,
  };
}

/** Перемешать решённое поле K случайными обменами слоёв разных сортов между банками. */
function scramble(rng, sortIds, empties, swaps) {
  const jars = sortIds.map((s) => Array(CAPACITY).fill(s));
  const filled = jars.length;
  for (let k = 0; k < swaps; k++) {
    const a = rng.int(filled);
    let b = rng.int(filled - 1);
    if (b >= a) b++;
    const i = rng.int(CAPACITY);
    const j = rng.int(CAPACITY);
    if (jars[a][i] === jars[b][j]) continue;
    [jars[a][i], jars[b][j]] = [jars[b][j], jars[a][i]];
  }
  for (let e = 0; e < empties; e++) jars.push([]);
  return jars;
}

function hasCompleteJar(jars) {
  return jars.some((j) => isJarComplete(j, CAPACITY));
}

/**
 * Построить уровень n.
 * @returns {{
 *   number, seed, attempt, params, flavors: number[],
 *   board: {capacity, jars, hidden}, solution: number[][], explored: number
 * }}
 */
export function generateLevel(n) {
  const params = levelParams(n);
  const layers = params.sorts * CAPACITY;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const seed = levelSeed(n, attempt);
    const rng = createRng(seed);

    // какие сорта варенья на уровне (номера 0..11 из data/flavors.json)
    const all = Array.from({ length: FLAVOR_COUNT }, (_, i) => i);
    const flavors = rng.shuffle(all).slice(0, params.sorts).sort((x, y) => x - y);

    const swaps = Math.max(2, Math.round(params.mix * layers));
    const jars = scramble(rng, flavors, params.empties, swaps);
    if (hasCompleteJar(jars)) continue;

    const hidden = jars.map((j) => (params.secret && j.length ? j.length - 1 : 0));
    // механики: пустые банки стоят в конце (scramble кладёт их последними)
    const caps = jars.map(() => CAPACITY);
    const locks = jars.map(() => 0);
    const only = jars.map(() => -1);
    const emptyIdx = jars.map((j, i) => (j.length ? -1 : i)).filter((i) => i >= 0);
    if (params.small) caps[emptyIdx[emptyIdx.length - 1]] = 3;
    if (params.only) only[emptyIdx[0]] = flavors[rng.int(flavors.length)];
    if (params.lock) locks[rng.int(params.sorts)] = LOCK_AFTER;
    const board = createBoard(jars, { hidden, caps, locks, only });

    if (solvableWithin(board, MIN_SOLUTION - 1)) continue; // тривиальный
    const result = solve(board, { limit: SOLVER_LIMIT });
    if (!result.solved) continue;

    return {
      number: n,
      seed,
      attempt,
      params,
      flavors,
      board,
      solution: result.moves,
      explored: result.explored,
    };
  }
  throw new Error(`Не удалось построить уровень ${n} за ${MAX_ATTEMPTS} попыток`);
}
