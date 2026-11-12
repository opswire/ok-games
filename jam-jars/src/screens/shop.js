import { el, t } from '../common/ui.js';
import { COIN_SVG } from './widgets.js';

const ICON_BACK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5 8 12l7 7"/></svg>';

export function mountShopScreen(root, { items, isStub, hasNoAds, onBuy, onBack }) {
  const screen = el('div', 'screen shop-screen');
  const top = el('header', 'topbar');
  const back = el('button', 'icon-btn', ICON_BACK);
  back.type = 'button';
  back.setAttribute('aria-label', t('back'));
  top.append(back, el('h1', 'screen-title', t('shopTitle')), el('span', 'icon-btn-spacer'));
  const list = el('div', 'scroll shop-list');
  if (isStub) list.appendChild(el('p', 'shop-note', t('shopStub')));

  const buttons = new Map();
  let ownedNoAds = hasNoAds;
  for (const item of items) {
    const card = el('article', 'shop-item');
    const text = el('div', 'shop-item-text');
    text.appendChild(el('h2', 'shop-item-title', item.title));
    text.appendChild(el('p', 'shop-item-description', item.description));
    if (item.reward.coins) text.appendChild(el('div', 'shop-item-coins', `${COIN_SVG}<span>+${item.reward.coins}</span>`));
    const owned = item.reward.noAds && hasNoAds;
    const buy = el('button', `btn ${owned ? '' : 'btn-primary'} shop-buy`, owned ? t('shopOwned') : t('shopBuy', { price: item.price }));
    buy.type = 'button';
    buy.disabled = owned;
    buy.dataset.item = item.id;
    buy.addEventListener('click', async () => {
      if (buttons.get(item.id)?.disabled) return;
      for (const button of buttons.values()) button.disabled = true;
      buy.textContent = t('shopProcessing');
      const ok = await onBuy(item);
      if (ok && item.reward.noAds) ownedNoAds = true;
      buy.textContent = ok && item.reward.noAds ? t('shopOwned') : t('shopBuy', { price: item.price });
      for (const [id, button] of buttons) button.disabled = id === 'no_ads' && ownedNoAds;
    });
    buttons.set(item.id, buy);
    card.append(text, buy);
    list.appendChild(card);
  }
  screen.append(top, list);
  root.appendChild(screen);
  back.addEventListener('click', onBack);
  return { destroy: () => screen.remove() };
}
