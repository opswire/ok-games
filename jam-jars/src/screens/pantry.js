// Кладовая: витрина прогресса. Каждые 100 уровней — новая комната (кладовая, погреб, веранда, …).
// В комнате: нарисованная сцена с украшениями на своих местах, карточки украшений и полки —
// каждый пройденный уровень ставит банку, полка — 10 уровней.
import { el, t } from '../common/ui.js';
import { miniJar } from './widgets.js';
import { decorSvg } from '../assets/decor.js';
import { roomSceneSvg } from './roomArt.js';
import { pantryFlavor, SHELF_SIZE, ROOM_LEVELS, roomsUnlocked, roomIndexOf } from '../game/progress.js';
import pantryData from '../data/pantry.json';

const ICON_BACK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5 8 12l7 7"/></svg>';
const ICON_NEXT =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>';

export function mountPantryScreen(root, { levelsDone, onBack }) {
  const { rooms, decorations } = pantryData;
  const opened = roomsUnlocked(levelsDone, rooms);
  let current = Math.min(opened - 1, roomIndexOf(levelsDone + 1));

  const screen = el('div', 'screen pantry-screen');
  const top = el('header', 'topbar');
  const back = el('button', 'icon-btn', ICON_BACK);
  back.type = 'button';
  back.setAttribute('aria-label', t('back'));
  top.append(back, el('h1', 'screen-title', t('pantryTitle')), el('div', 'icon-btn-spacer'));

  const nav = el('div', 'room-nav');
  const prev = el('button', 'icon-btn', ICON_BACK);
  const next = el('button', 'icon-btn', ICON_NEXT);
  prev.type = next.type = 'button';
  prev.setAttribute('aria-label', 'Предыдущая комната');
  next.setAttribute('aria-label', 'Следующая комната');
  const roomTitle = el('div', 'room-title');
  nav.append(prev, roomTitle, next);

  const scroll = el('div', 'scroll');
  screen.append(top, nav, scroll);
  root.appendChild(screen);

  function render() {
    const room = rooms[current];
    const roomDecor = decorations.filter((d) => roomIndexOf(d.at) === current);
    const roomDone = Math.max(0, Math.min(ROOM_LEVELS, levelsDone - (room.from - 1)));
    roomTitle.innerHTML = `<b>${room.name}</b><span>${t('pantryRoomJars', { n: roomDone })}</span>`;
    prev.disabled = current === 0;
    next.disabled = current >= opened - 1;
    // подсказка о следующей комнате
    next.title = current >= opened - 1 && rooms[current + 1] ? t('pantryLocked', { n: rooms[current + 1].from }) : '';

    scroll.textContent = '';
    const scene = el('div', 'room-scene-box', roomSceneSvg(room, roomDecor, levelsDone));
    scroll.appendChild(scene);

    const wall = el('div', 'decor-wall');
    for (const d of roomDecor) {
      const open = levelsDone >= d.at;
      const tile = el('div', `decor-tile ${open ? '' : 'locked'}`, decorSvg(d.key));
      tile.appendChild(el('div', 'decor-name', open ? d.name : t('pantryLocked', { n: d.at })));
      wall.appendChild(tile);
    }
    scroll.appendChild(wall);

    if (current === opened - 1 && rooms[current + 1]) {
      scroll.appendChild(el('p', 'pantry-text', t('newRoomAt', { name: rooms[current + 1].name, n: rooms[current + 1].from })));
    }

    const shelves = Math.min(10, Math.floor(roomDone / SHELF_SIZE) + 1);
    for (let sIdx = 0; sIdx < shelves; sIdx++) {
      const block = el('div', 'pantry-shelf');
      block.appendChild(el('div', 'shelf-name', t('pantryShelf', { n: sIdx + 1 })));
      const row = el('div', 'shelf-jars');
      for (let k = 1; k <= SHELF_SIZE; k++) {
        const n = room.from - 1 + sIdx * SHELF_SIZE + k;
        row.appendChild(n <= levelsDone ? miniJar(pantryFlavor(n)) : el('div', 'mini-jar empty-spot'));
      }
      block.appendChild(row);
      scroll.appendChild(block);
    }
  }

  prev.addEventListener('click', () => {
    if (current > 0) {
      current--;
      render();
      scroll.scrollTop = 0;
    }
  });
  next.addEventListener('click', () => {
    if (current < opened - 1) {
      current++;
      render();
      scroll.scrollTop = 0;
    }
  });
  back.addEventListener('click', onBack);
  render();
  return { destroy: () => screen.remove() };
}
