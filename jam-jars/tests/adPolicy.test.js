import { describe, it, expect } from 'vitest';
import { INTERSTITIAL_INTERVAL_MS, shouldShowInterstitial } from '../src/common/adPolicy.js';

const at = INTERSTITIAL_INTERVAL_MS;

describe('реклама между уровнями', () => {
  it('не показывается на первых трёх уровнях и после отключения рекламы', () => {
    expect(shouldShowInterstitial({ completedLevel: 3, now: at })).toBe(false);
    expect(shouldShowInterstitial({ completedLevel: 4, now: at, noAds: true })).toBe(false);
  });

  it('показывается с четвёртого уровня не чаще одного раза в три минуты', () => {
    expect(shouldShowInterstitial({ completedLevel: 4, now: at })).toBe(true);
    expect(shouldShowInterstitial({ completedLevel: 5, lastShownAt: 100, now: at + 99 })).toBe(false);
    expect(shouldShowInterstitial({ completedLevel: 5, lastShownAt: 100, now: at + 100 })).toBe(true);
  });

  it('не даёт показ при переводе часов назад', () => {
    expect(shouldShowInterstitial({ completedLevel: 8, lastShownAt: 10000, now: 5000 })).toBe(false);
  });
});
