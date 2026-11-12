// «Оформление»: крышки и этикетки за монеты. Купленное можно выбрать в любой момент;
// выбранное оформление получают все собранные банки — на поле, на полках и в кладовой.
import { el, t } from '../common/ui.js';
import { coinPill, setCoinPill, miniJar, COIN_SVG } from './widgets.js';
import cosmetics from '../data/cosmetics.json';

const ICON_BACK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5 8 12l7 7"/></svg>';

/**
 * @param {{ getSave: () => object, onBuy: (kind, item) => boolean, onSelect: (kind, id) => void, onBack }} o
 */
export function mountDecorShop(root, { getSave, onBuy, onSelect, onBack }) {
  let tab = 'lid';
  const screen = el('div', 'screen shop-screen');
  const top = el('header', 'topbar');
  const back = el('button', 'icon-btn', ICON_BACK);
  back.type = 'button';
  back.setAttribute('aria-label', t('back'));
  const pill = coinPill(getSave().coins);
  top.append(back, el('h1', 'screen-title', t('decorTitle')), pill);

  const tabs = el('div', 'tabs');
  const tabLid = el('button', 'tab', t('decorLids'));
  const tabLabel = el('button', 'tab', t('decorLabels'));
  tabLid.type = tabLabel.type = 'button';
  tabs.append(tabLid, tabLabel);

  const preview = el('div', 'shop-preview');
  const grid = el('div', 'shop-grid scroll');
  screen.append(top, tabs, preview, grid);
  root.appendChild(screen);

  function render() {
    const save = getSave();
    setCoinPill(pill, save.coins);
    tabLid.classList.toggle('active', tab === 'lid');
    tabLabel.classList.toggle('active', tab === 'label');
    const style = { lid: save.cosmetics.lid, label: save.cosmetics.label };
    preview.textContent = '';
    for (const f of [1, 2, 8]) preview.appendChild(miniJar(f, 'l', style));

    grid.textContent = '';
    const items = tab === 'lid' ? cosmetics.lids : cosmetics.labels;
    for (const item of items) {
      const owned = save.cosmetics.owned.includes(item.id);
      const selected = save.cosmetics[tab] === item.id;
      const card = el('div', `shop-card ${selected ? 'selected' : ''}`);
      card.appendChild(miniJar(0, 'm', { ...style, [tab]: item.id }));
      card.appendChild(el('div', 'shop-name', item.name));
      const btn = el('button', `btn shop-btn ${!owned ? 'btn-primary' : ''}`);
      btn.type = 'button';
      if (selected) {
        btn.textContent = t('decorSelected');
        btn.disabled = true;
      } else if (owned) {
        btn.textContent = t('decorSelect');
        btn.addEventListener('click', () => {
          onSelect(tab, item.id);
          render();
        });
      } else {
        btn.innerHTML = `${COIN_SVG}<span>${item.price}</span>`;
        if (save.coins < item.price) btn.classList.add('poor');
        btn.addEventListener('click', () => {
          if (onBuy(tab, item)) {
            onSelect(tab, item.id);
            render();
          }
        });
      }
      card.appendChild(btn);
      grid.appendChild(card);
    }
  }

  tabLid.addEventListener('click', () => {
    tab = 'lid';
    render();
  });
  tabLabel.addEventListener('click', () => {
    tab = 'label';
    render();
  });
  back.addEventListener('click', onBack);
  render();
  return { destroy: () => screen.remove() };
}
