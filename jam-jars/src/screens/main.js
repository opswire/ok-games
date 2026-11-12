// Главный экран: «Играть — уровень N», подарок, кладовая, магазин, настройки.
import { el, t } from '../common/ui.js';
import { coinPill, miniJar } from './widgets.js';

const ICON_GEAR =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
const ICON_GIFT =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13M12 8C9 8 7 6.5 7.5 5S10.5 4 12 8c1.5-4 4-4.5 4.5-3s-1.5 3-4.5 3z"/></svg>';
const ICON_SHELF =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h18M3 21h18"/><rect x="5" y="4" width="4" height="7" rx="1"/><rect x="11" y="5" width="4" height="6" rx="1"/><rect x="7" y="14" width="4" height="7" rx="1"/><rect x="14" y="15" width="4" height="6" rx="1"/></svg>';
const ICON_QUESTS =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v2h6V3M9 11l2 2 4-4M9 17h6"/></svg>';
const ICON_DECOR =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9c0-4 14-4 14 0"/><path d="M4 9h16l-1 2H5z"/><path d="M6 11v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8"/><circle cx="12" cy="16" r="2"/></svg>';
const ICON_SHOP =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v11h16V9M3 9l2-6h14l2 6M3 9c0 3 4 3 4 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 4 3 4 0M9 20v-6h6v6"/></svg>';

export function mountMainScreen(root, { save, dailyAvailable, questsReady = 0, onPlay, onDaily, onPantry, onSettings, onQuests, onDecor, onShop, hero }) {
  const screen = el('div', 'screen main-screen');
  const top = el('header', 'topbar');
  const coins = coinPill(save.coins);
  const gear = el('button', 'icon-btn', ICON_GEAR);
  gear.type = 'button';
  gear.setAttribute('aria-label', t('settings'));
  top.append(coins, gear);

  const heroBox = el('div', 'hero');
  heroBox.appendChild(el('h1', 'game-title', t('title')));
  if (hero) heroBox.appendChild(hero);
  else {
    const shelf = el('div', 'hero-shelf');
    for (const f of [0, 2, 8, 4]) shelf.appendChild(miniJar(f, 'l'));
    heroBox.appendChild(shelf);
  }

  const play = el('button', 'btn btn-primary btn-play', t('play', { n: save.level }));
  play.type = 'button';

  const menu = el('div', 'menu-row');
  const daily = el('button', 'btn menu-btn', `${ICON_GIFT}<span>${t('daily')}</span>`);
  daily.type = 'button';
  if (dailyAvailable) daily.appendChild(el('span', 'dot'));
  const quests = el('button', 'btn menu-btn', `${ICON_QUESTS}<span>${t('quests')}</span>`);
  quests.type = 'button';
  if (questsReady) quests.appendChild(el('span', 'badge-count', String(questsReady)));
  const shop = el('button', 'btn menu-btn', `${ICON_SHOP}<span>${t('shop')}</span>`);
  shop.type = 'button';
  const pantry = el('button', 'btn menu-btn', `${ICON_SHELF}<span>${t('pantry')}</span>`);
  pantry.type = 'button';
  const decor = el('button', 'btn menu-btn', `${ICON_DECOR}<span>${t('decor')}</span>`);
  decor.type = 'button';
  daily.dataset.menu = 'daily';
  quests.dataset.menu = 'quests';
  shop.dataset.menu = 'shop';
  pantry.dataset.menu = 'pantry';
  decor.dataset.menu = 'decor';
  menu.append(daily, quests, shop, pantry, decor);
  decor.classList.add('menu-wide');

  screen.append(top, heroBox, play, menu);
  root.appendChild(screen);

  play.addEventListener('click', onPlay);
  daily.addEventListener('click', onDaily);
  pantry.addEventListener('click', onPantry);
  quests.addEventListener('click', onQuests);
  decor.addEventListener('click', onDecor);
  shop.addEventListener('click', onShop);
  gear.addEventListener('click', onSettings);

  return {
    destroy: () => screen.remove(),
    setDailyAvailable(v) {
      daily.querySelector('.dot')?.remove();
      if (v) daily.appendChild(el('span', 'dot'));
    },
    setQuestsReady(n) {
      quests.querySelector('.badge-count')?.remove();
      if (n) quests.appendChild(el('span', 'badge-count', String(n)));
    },
    setCoins(v) {
      coins.querySelector('.coin-value').textContent = String(v);
    },
  };
}
