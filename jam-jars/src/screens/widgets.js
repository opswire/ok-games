// Мелкие общие элементы экранов: монета, маленькая банка для полок.
import flavors from '../data/flavors.json';
import { jarSvg } from './jarArt.js';
import { el } from '../common/ui.js';

export const COIN_SVG =
  '<svg class="coin-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#f2b632" stroke="#a8721a" stroke-width="2"/><circle cx="12" cy="12" r="6" fill="none" stroke="#fff3c4" stroke-width="2"/></svg>';

export function coinPill(value) {
  const p = el('div', 'coin-pill', `${COIN_SVG}<span class="coin-value">${value}</span>`);
  p.setAttribute('aria-label', `Монеты: ${value}`);
  return p;
}

export function setCoinPill(pill, value) {
  pill.querySelector('.coin-value').textContent = String(value);
  pill.setAttribute('aria-label', `Монеты: ${value}`);
}

/** Маленькая закатанная банка (полки кладовой, экран победы, главный экран). size: s | m | l */
export function miniJar(flavorId, size = 's', style = null) {
  const [W, L] = { s: [30, 10], m: [40, 14], l: [58, 21], xl: [70, 25] }[size];
  const j = el('div', 'mini-jar', jarSvg({ W, L, jar: [flavorId, flavorId, flavorId, flavorId], complete: true, mini: true, style }));
  j.title = flavors[flavorId].name;
  return j;
}
