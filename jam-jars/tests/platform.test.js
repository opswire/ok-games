import { describe, it, expect, vi } from 'vitest';
import { createPlatform, hasPlatformLaunch } from '../src/common/platform.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, String(v)),
  };
}

describe('определение запуска в VK или ОК', () => {
  it('различает параметры запуска и локальный браузер', () => {
    expect(hasPlatformLaunch('?vk_app_id=123')).toBe(true);
    expect(hasPlatformLaunch('?api_id=123')).toBe(true);
    expect(hasPlatformLaunch('', 'https://ok.ru/game/123')).toBe(true);
    expect(hasPlatformLaunch('', 'https://example.com/')).toBe(false);
  });
});

describe('локальная заглушка платформы', () => {
  it('хранит данные отдельно и выдаёт тестовые награды и покупки', async () => {
    const local = memoryStorage();
    const p = createPlatform({ local, search: '', stubAd: async () => true });
    expect(p.isStub()).toBe(true);
    await p.save('save', 'данные');
    expect(await p.load('save')).toBe('данные');
    expect(await p.isRewardedReady()).toBe(true);
    expect(await p.showRewarded()).toBe(true);
    expect(await p.showInterstitial()).toBe(true);
    expect((await p.buy('coins_150')).success).toBe(true);
  });

  it('не выдаёт награду за неудачный показ', async () => {
    const p = createPlatform({ local: memoryStorage(), search: '', stubAd: async () => false });
    expect(await p.showRewarded()).toBe(false);
  });
});

describe('VK Bridge', () => {
  it('использует методы и параметры платформы', async () => {
    const send = vi.fn(async (method) => {
      if (method === 'VKWebAppStorageGet') return { keys: [{ key: 'save', value: 'облако' }] };
      if (method === 'VKWebAppCheckNativeAds') return { result: true };
      if (method === 'VKWebAppShowNativeAds') return { result: true };
      if (method === 'VKWebAppShowOrderBox') return { status: 'success', order_id: '42' };
      return { result: true };
    });
    const p = createPlatform({ bridgeClient: { send }, search: '?vk_app_id=123', local: memoryStorage() });
    await p.init();
    await p.save('save', 'локальные');
    expect(await p.load('save')).toBe('облако');
    expect(await p.isRewardedReady()).toBe(true);
    expect(await p.showRewarded()).toBe(true);
    expect(await p.buy('undo_10')).toEqual({ success: true, orderId: '42' });
    expect(send).toHaveBeenCalledWith('VKWebAppStorageSet', { key: 'save', value: 'локальные' });
    expect(send).toHaveBeenCalledWith('VKWebAppShowNativeAds', { ad_format: 'reward' });
    expect(send).toHaveBeenCalledWith('VKWebAppShowOrderBox', { type: 'item', item: 'undo_10' });
  });

  it('отказ рекламы или покупки не становится успехом', async () => {
    const send = vi.fn(async (method) => {
      if (method === 'VKWebAppShowOrderBox') return { status: 'cancel', order_id: '42' };
      throw new Error('отменено');
    });
    const p = createPlatform({ bridgeClient: { send }, search: '?vk_app_id=123', local: memoryStorage() });
    expect(await p.showRewarded()).toBe(false);
    expect(await p.isRewardedReady()).toBe(false);
    expect(await p.buy('undo_10')).toEqual({ success: false, orderId: '42' });
  });
});
