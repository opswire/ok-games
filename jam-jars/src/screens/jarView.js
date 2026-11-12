// Отрисовка одной банки на поле (SVG из jarArt.js). Только картинка — правила живут в src/game.
import flavors from '../data/flavors.json';
import { el } from '../common/ui.js';
import { jarSvg } from './jarArt.js';

export function createSlot(index) {
  const slot = el('div', 'slot');
  slot.dataset.i = String(index);
  slot.setAttribute('role', 'button');
  slot.innerHTML = '<div class="jar"></div>';
  return slot;
}

/**
 * Перерисовать банку.
 * opts: { layerPx, jarW, reveal — индекс открывшегося слоя (вспышка), lid — анимировать крышку,
 *         cap, lockLeft, only — механики банки (см. jarSvg) }
 */
export function renderJar(slot, jar, hidden, capacity, opts = {}) {
  const { reveal = -1, lid = false, layerPx = 20, jarW = layerPx * 2.1, cap = capacity, lockLeft = 0, only = -1 } = opts;
  const complete = jar.length === capacity && jar.every((s) => s === jar[0]);
  const box = slot.querySelector('.jar');
  box.innerHTML = jarSvg({ W: jarW, L: layerPx, jar, hidden, complete, cap, lockLeft, only });
  slot.classList.toggle('locked', lockLeft > 0);
  slot.classList.toggle('complete', complete);
  slot.classList.toggle('empty', jar.length === 0);
  slot.setAttribute('aria-label', complete ? `${flavors[jar[0]].name}, собрано` : `Банка ${Number(slot.dataset.i) + 1}`);

  const anims = [];
  if (reveal >= 0) {
    const layer = box.querySelector(`.layer[data-i="${reveal}"]`);
    if (layer) {
      anims.push(
        layer.animate([{ opacity: 0.2, filter: 'brightness(2.2)' }, { opacity: 1, filter: 'brightness(1)' }], {
          duration: 380,
          easing: 'ease-out',
        }),
      );
    }
  }
  if (complete && lid) {
    const lidEl = box.querySelector('.lid');
    const label = box.querySelector('.label');
    if (lidEl) {
      anims.push(
        lidEl.animate(
          [
            { transform: 'translateY(-45%) scale(1.15)', opacity: 0 },
            { transform: 'translateY(4%) scale(.95)', opacity: 1, offset: 0.65 },
            { transform: 'translateY(0) scale(1)', opacity: 1 },
          ],
          { duration: 360, easing: 'ease-out' },
        ),
      );
    }
    if (label) {
      anims.push(
        label.animate([{ transform: 'scale(0) rotate(-25deg)' }, { transform: 'scale(1) rotate(0)' }], {
          duration: 320,
          delay: 200,
          easing: 'cubic-bezier(.34,1.56,.64,1)',
          fill: 'backwards',
        }),
      );
    }
  }
  return anims;
}
