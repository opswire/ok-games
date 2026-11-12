import bridge from '@vkontakte/vk-bridge';
import { el, t } from './ui.js';

const STUB_PREFIX = 'platform-stub:';

export function hasPlatformLaunch(search = '', referrer = '') {
  const params = new URLSearchParams(search);
  if (params.has('vk_app_id') || params.has('api_id')) return true;
  try {
    const host = new URL(referrer).hostname;
    return /(^|\.)(vk\.com|vk\.ru|ok\.ru|odnoklassniki\.ru)$/.test(host);
  } catch {
    return false;
  }
}

function showStubAd(format) {
  return new Promise((resolve) => {
    const overlay = el('div', 'modal-overlay stub-ad');
    const box = el('div', 'modal');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', t('adStubTitle'));
    box.appendChild(el('h2', 'modal-title', t('adStubTitle')));
    box.appendChild(el('div', 'ad-demo', format === 'reward' ? '▶' : '…'));
    box.appendChild(el('p', 'modal-text', t(format === 'reward' ? 'adStubReward' : 'adStubInterstitial')));
    overlay.appendChild(box);
    document.querySelector('#app').appendChild(overlay);
    setTimeout(() => {
      overlay.remove();
      resolve(true);
    }, 2000);
  });
}

export function createPlatform({
  bridgeClient = bridge,
  search = globalThis.location?.search ?? '',
  referrer = globalThis.document?.referrer ?? '',
  local = globalThis.localStorage,
  stubAd = showStubAd,
} = {}) {
  let stub = !hasPlatformLaunch(search, referrer);
  let initPromise = null;
  let stubOrder = 0;

  async function init() {
    if (!initPromise) {
      initPromise = (async () => {
        if (!stub) {
          try {
            await bridgeClient.send('VKWebAppInit');
          } catch (e) {
            console.warn('VK Bridge не инициализирован, платформенные функции недоступны', e);
            return { stub, initialized: false };
          }
        }
        return { stub, initialized: true };
      })();
    }
    return initPromise;
  }

  async function save(key, value) {
    await init();
    if (stub) {
      local?.setItem(STUB_PREFIX + key, value);
      return;
    }
    await bridgeClient.send('VKWebAppStorageSet', { key, value });
  }

  async function load(key) {
    await init();
    if (stub) return local?.getItem(STUB_PREFIX + key) ?? null;
    const data = await bridgeClient.send('VKWebAppStorageGet', { keys: [key] });
    return data.keys.find((x) => x.key === key)?.value || null;
  }

  async function isRewardedReady() {
    await init();
    if (stub) return true;
    try {
      const data = await bridgeClient.send('VKWebAppCheckNativeAds', { ad_format: 'reward' });
      return data.result === true;
    } catch {
      return false;
    }
  }

  async function showNativeAd(format) {
    await init();
    if (stub) return (await stubAd(format)) === true;
    try {
      const data = await bridgeClient.send('VKWebAppShowNativeAds', { ad_format: format });
      return data.result === true;
    } catch {
      return false;
    }
  }

  return {
    init,
    save,
    load,
    isStub: () => stub,
    isRewardedReady,
    showRewarded: () => showNativeAd('reward'),
    showInterstitial: () => showNativeAd('interstitial'),
    async buy(itemId) {
      await init();
      if (stub) return { success: true, orderId: `stub-${++stubOrder}` };
      try {
        const data = await bridgeClient.send('VKWebAppShowOrderBox', { type: 'item', item: itemId });
        return { success: data.status === 'success', orderId: data.order_id ?? null };
      } catch {
        return { success: false, orderId: null };
      }
    },
    async share(link) {
      await init();
      if (stub) return true;
      try {
        await bridgeClient.send('VKWebAppShare', link ? { link } : {});
        return true;
      } catch {
        return false;
      }
    },
    async invite() {
      await init();
      if (stub) return true;
      try {
        const data = await bridgeClient.send('VKWebAppShowInviteBox');
        return data.success === true;
      } catch {
        return false;
      }
    },
  };
}

const platform = createPlatform();

export const init = platform.init;
export const save = platform.save;
export const load = platform.load;
export const isStub = platform.isStub;
export const isRewardedReady = platform.isRewardedReady;
export const showRewarded = platform.showRewarded;
export const showInterstitial = platform.showInterstitial;
export const buy = platform.buy;
export const share = platform.share;
export const invite = platform.invite;
