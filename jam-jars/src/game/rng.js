// Детерминированный генератор случайных чисел (mulberry32).
// Своя реализация, чтобы один и тот же номер уровня давал один и тот же уровень
// на любом браузере и после любых обновлений. Первые значения закреплены в тестах.

/** Перемешивание 32-битного числа (используется для вывода seed из номера уровня). */
export function mix32(x) {
  x = x >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

/** seed для уровня n и попытки attempt (при перегенерации берётся следующая попытка). */
export function levelSeed(n, attempt = 0) {
  return mix32(mix32(n) ^ Math.imul(attempt + 1, 0x9e3779b9));
}

export function createRng(seed) {
  let s = seed >>> 0;

  function nextU32() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  /** Целое 0 <= x < n без смещения по модулю. */
  function int(n) {
    if (n <= 0) throw new Error('int(n): n must be > 0');
    const limit = 0x100000000 - (0x100000000 % n);
    let x;
    do x = nextU32();
    while (x >= limit);
    return x % n;
  }

  return {
    nextU32,
    int,
    /** Целое в диапазоне [min, max] включительно. */
    range: (min, max) => min + int(max - min + 1),
    float: () => nextU32() / 0x100000000,
    pick: (arr) => arr[int(arr.length)],
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
    get state() {
      return s;
    },
  };
}
