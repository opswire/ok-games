import { describe, it, expect } from 'vitest';
import { chooseLayout, splitRows, MIN_SLOT } from '../src/game/layout.js';

// доступное поле для банок: ширина экрана − 16 px отступов; высота — между шапкой и кнопками
const SCREENS = {
  '320×568': [304, 330],
  '360×780': [344, 540],
  '390×844': [374, 600],
  '480×900': [464, 650],
};

describe('раскладка банок', () => {
  it('ряды делятся поровну, верхние не короче нижних', () => {
    expect(splitRows(14, 3)).toEqual([5, 5, 4]);
    expect(splitRows(16, 3)).toEqual([6, 5, 5]);
    expect(splitRows(7, 2)).toEqual([4, 3]);
  });

  it('ячейки используют доступную ширину, а при возможности не уже 48 px', () => {
    for (const [name, [w, h]] of Object.entries(SCREENS)) {
      for (let n = 4; n <= 16; n++) {
        const l = chooseLayout(n, w, h);
        const twoRowWidth = w / Math.ceil(n / 2);
        const expected = name === '320×568' && n >= 13 && n <= 14 ? twoRowWidth : MIN_SLOT;
        expect(l.slotW, `${name}, ${n} банок`).toBeGreaterThanOrEqual(expected - 0.001);
        expect(l.rows.reduce((a, b) => a + b, 0)).toBe(n);
      }
    }
  });

  it('14 банок на 320 px — два ряда, 16 — три без обрезки', () => {
    const [w, h] = SCREENS['320×568'];
    expect(chooseLayout(14, w, h).rows).toEqual([7, 7]);
    expect(chooseLayout(16, w, h).rows.length).toBe(3);
  });

  it('три банки обучения — один ряд крупных банок', () => {
    const [w, h] = SCREENS['360×780'];
    const l = chooseLayout(3, w, h);
    expect(l.rows).toEqual([3]);
    expect(l.layerPx).toBeGreaterThanOrEqual(30);
  });

  it('высота поля не превышена', () => {
    for (const [name, [w, h]] of Object.entries(SCREENS)) {
      for (let n = 3; n <= 16; n++) {
        const l = chooseLayout(n, w, h);
        expect(l.rows.length * (l.layerPx * 7.6 + 26), `${name}, ${n} банок`).toBeLessThanOrEqual(h + 1);
      }
    }
  });
});
