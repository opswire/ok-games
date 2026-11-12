import { describe, it, expect } from 'vitest';
import { dailyStatus, claimDaily, dayNumber } from '../src/common/daily.js';

const L = 7;

describe('ежедневный подарок', () => {
  it('первый раз — день 1', () => {
    expect(dailyStatus({ streak: 0, lastDay: null }, 100, L)).toEqual({ available: true, dayIndex: 0 });
  });

  it('семь дней подряд — вся лента, потом заново', () => {
    let daily = { streak: 0, lastDay: null };
    const got = [];
    for (let d = 100; d < 109; d++) {
      const r = claimDaily(daily, d, L);
      got.push(r.dayIndex);
      daily = r.daily;
    }
    expect(got).toEqual([0, 1, 2, 3, 4, 5, 6, 0, 1]);
  });

  it('дважды за день нельзя', () => {
    const r = claimDaily({ streak: 0, lastDay: null }, 100, L);
    expect(claimDaily(r.daily, 100, L)).toBeNull();
    expect(dailyStatus(r.daily, 100, L).available).toBe(false);
  });

  it('пропуск дня сбрасывает ленту', () => {
    let daily = { streak: 3, lastDay: 100 };
    const r = claimDaily(daily, 102, L);
    expect(r.dayIndex).toBe(0);
    expect(r.daily.streak).toBe(1);
  });

  it('перевод часов назад не даёт подарок', () => {
    expect(dailyStatus({ streak: 2, lastDay: 100 }, 99, L).available).toBe(false);
  });

  it('номер дня меняется в полночь по местному времени', () => {
    const a = dayNumber(new Date(2026, 10, 12, 0, 1));
    const b = dayNumber(new Date(2026, 10, 12, 23, 59));
    const c = dayNumber(new Date(2026, 10, 13, 0, 0));
    expect(a).toBe(b);
    expect(c).toBe(a + 1);
  });
});
