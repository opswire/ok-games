// Сцена комнаты кладовой (SVG): стены, пол, особая примета комнаты, полка с банками
// и украшения на своих местах. Закрытые украшения — бледный силуэт.
import { DECOR } from '../assets/decor.js';
import { jarSvg, shade } from './jarArt.js';
import { pantryFlavor } from '../game/progress.js';

const W = 360;
const H = 240;
const FLOOR = 170; // где начинается пол

// украшения, которые вешают на стену; остальные ставят на пол
const WALL_ITEMS = new Set(['curtain', 'clock', 'lamp', 'onions', 'herbs', 'towel', 'garland', 'shawl', 'frame', 'hoop', 'quilt']);
const WALL_SLOTS = [
  [14, 20, 76],
  [270, 20, 76],
];
const FLOOR_SLOTS = [
  [6, 150, 80],
  [272, 150, 80],
  [92, 168, 66],
  [200, 168, 66],
];

function feature(room) {
  const sky = '<linearGradient id="room-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe3ff"/><stop offset="1" stop-color="#eaf6ff"/></linearGradient>';
  const frame = 'fill="url(#room-sky)" stroke="#8a5a33" stroke-width="5"';
  switch (room.feature) {
    case 'window':
      return `<defs>${sky}</defs><rect x="140" y="18" width="80" height="62" rx="4" ${frame}/><path d="M180 18v62M140 49h80" stroke="#8a5a33" stroke-width="4"/>
        <rect x="134" y="80" width="92" height="7" rx="2" fill="#b07a4a"/>`;
    case 'bigwindow':
      return `<defs>${sky}</defs><rect x="104" y="14" width="152" height="74" rx="4" ${frame}/><path d="M154 14v74M206 14v74" stroke="#8a5a33" stroke-width="4"/>
        <path d="M110 80c20-12 40-12 60-4s50 8 80-6v18H110z" fill="#9bc35a" opacity=".7"/>`;
    case 'stone': {
      let s = '';
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 9; c++) {
          const x = c * 42 + (r % 2 ? -21 : 0);
          s += `<rect x="${x + 2}" y="${r * 28 + 2}" width="38" height="24" rx="5" fill="rgba(0,0,0,.07)"/>`;
        }
      }
      return s;
    }
    case 'roof':
      return `<path d="M0 0L180 -10 360 0V40L180 4 0 40z" fill="#8a5a33" opacity=".9"/><path d="M0 40L180 4 360 40" stroke="#6e4424" stroke-width="6" fill="none"/>
        <circle cx="180" cy="60" r="18" fill="url(#room-sky)" stroke="#8a5a33" stroke-width="5"/><defs>${sky}</defs><path d="M162 60h36M180 42v36" stroke="#8a5a33" stroke-width="3"/>`;
    case 'door':
      return `<rect x="150" y="40" width="64" height="130" rx="4" fill="#9a6a3a" stroke="#6e4424" stroke-width="4"/><path d="M158 48h48v56h-48zM158 112h48v50h-48z" fill="none" stroke="#6e4424" stroke-width="2"/>
        <circle cx="204" cy="110" r="3.5" fill="#e0b040"/>`;
    case 'garden':
      return `<path d="M0 0h360v170H0z" fill="#cdeaf7"/><path d="M0 120c40-20 80-20 120-6s80 14 120-4 80-14 120 0v60H0z" fill="#8fc35a"/>
        <g fill="#6ea64a"><circle cx="40" cy="118" r="20"/><circle cx="320" cy="114" r="24"/></g>
        <path d="M0 0h360v14H0z" fill="#a8703f"/><path d="M20 14v156M120 14v156M240 14v156M340 14v156" stroke="#b07a4a" stroke-width="10"/>
        <path d="M20 14q50 40 100 0M120 14q60 40 120 0M240 14q50 40 100 0" stroke="#b07a4a" stroke-width="5" fill="none"/>`;
    case 'beams':
      return `<path d="M40 0v170M140 0v170M220 0v170M320 0v170" stroke="#8a5f38" stroke-width="12"/><path d="M0 26h360" stroke="#7a5230" stroke-width="10"/>`;
    default:
      return '';
  }
}

/**
 * @param {object} room — из data/pantry.json
 * @param {object[]} decorations — украшения этой комнаты (4 шт.)
 * @param {number} levelsDone — пройдено уровней
 */
export function roomSceneSvg(room, decorations, levelsDone) {
  const wallTint = shade(room.wall, -0.06);
  // обои: тонкие вертикальные полоски
  const stripes = `<pattern id="room-paper-${room.key}" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="${room.wall}"/><rect width="2" height="18" x="8" fill="${wallTint}"/></pattern>`;
  const planks = Array.from({ length: 8 }, (_, i) => `<path d="M0 ${FLOOR + 10 + i * 9}h${W}" stroke="rgba(0,0,0,.12)" stroke-width="1"/>`).join('');

  // полка на стене: последние закатанные в этой комнате банки
  const roomDone = Math.max(0, Math.min(100, levelsDone - (room.from - 1)));
  const jarsOnShelf = [];
  for (let k = Math.max(1, roomDone - 6); k <= roomDone; k++) jarsOnShelf.push(pantryFlavor(room.from - 1 + k));
  const jarW = 22;
  const shelfY = 128;
  const jars = jarsOnShelf
    .map((fl, i) => {
      const x = 180 - (jarsOnShelf.length * (jarW + 4)) / 2 + i * (jarW + 4);
      return `<g transform="translate(${x} ${shelfY - 42})">${jarSvg({ W: jarW, L: 7.5, jar: [fl, fl, fl, fl], complete: true, mini: true })}</g>`;
    })
    .join('');

  // украшения: стенные — на стену, остальные — на пол
  const wall = WALL_SLOTS.slice();
  const floor = FLOOR_SLOTS.slice();
  const items = decorations
    .map((d) => {
      const slot = (WALL_ITEMS.has(d.key) ? wall.shift() : floor.shift()) ?? wall.shift() ?? floor.shift();
      if (!slot) return '';
      const [x, y, size] = slot;
      const open = levelsDone >= d.at;
      const attrs = open ? '' : ' opacity=".18" filter="url(#room-gray)"';
      return `<g transform="translate(${x} ${y}) scale(${size / 64})"${attrs}>${DECOR[d.key] ?? ''}</g>`;
    })
    .join('');

  return `<svg class="room-scene" viewBox="0 0 ${W} ${H}" role="img" aria-label="${room.name}">
    <defs>${stripes}<filter id="room-gray"><feColorMatrix type="saturate" values="0"/></filter></defs>
    <rect width="${W}" height="${FLOOR}" fill="url(#room-paper-${room.key})"/>
    ${feature(room)}
    <rect y="${FLOOR}" width="${W}" height="${H - FLOOR}" fill="${room.floor}"/>${planks}
    <rect y="${FLOOR - 4}" width="${W}" height="6" fill="${shade(room.floor, -0.25)}"/>
    <rect x="96" y="${shelfY}" width="168" height="8" rx="2" fill="#a86f3f"/><rect x="96" y="${shelfY + 8}" width="168" height="3" fill="#7e4f2a"/>
    ${jars}
    ${items}
  </svg>`;
}
