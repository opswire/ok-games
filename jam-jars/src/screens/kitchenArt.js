// Рисованная кухня для главного экрана (SVG): окно с занавесками и солнцем, герань на подоконнике,
// стол в клетчатой скатерти, банки варенья в выбранном игроком оформлении и миска с ягодами.
import { jarSvg } from './jarArt.js';
import { DECOR } from '../assets/decor.js';

export function kitchenSvg() {
  const jars = [
    [0, 44],
    [2, 52],
    [8, 48],
    [4, 42],
  ]
    .map(([fl, w], i) => {
      const L = w / 2.9;
      const x = 58 + i * 50 - w / 2;
      const h = L * 6.3;
      return `<g transform="translate(${x} ${200 - h})">${jarSvg({ W: w * 0.82, L, jar: [fl, fl, fl, fl], complete: true, mini: true })}</g>`;
    })
    .join('');
  return `<svg class="kitchen" viewBox="0 0 360 250" role="img" aria-label="Кухня с банками варенья">
    <defs>
      <linearGradient id="k-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd3ff"/><stop offset="1" stop-color="#e8f6ff"/></linearGradient>
      <radialGradient id="k-sun" cx=".8" cy=".2" r=".9"><stop offset="0" stop-color="#fff6c8" stop-opacity=".95"/><stop offset=".5" stop-color="#fff6c8" stop-opacity=".25"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient>
      <pattern id="k-cloth" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#d23b2a"/><rect width="8" height="16" fill="rgba(255,255,255,.55)"/><rect width="16" height="8" fill="rgba(255,255,255,.55)"/></pattern>
      <pattern id="k-curtain" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#fff6e6"/><circle cx="5" cy="5" r="1.6" fill="#e57373"/></pattern>
    </defs>
    <!-- окно -->
    <rect x="96" y="6" width="168" height="112" rx="6" fill="url(#k-sky)" stroke="#a8703f" stroke-width="7"/>
    <circle cx="232" cy="34" r="14" fill="#ffe27a"/>
    <path d="M100 96c26-14 52-16 80-6s56 10 80-4v28H100z" fill="#9bc35a"/>
    <path d="M180 6v112M96 62h168" stroke="#a8703f" stroke-width="5"/>
    <!-- занавески -->
    <path d="M78 0h56c-6 30-2 70 10 124H78z" fill="url(#k-curtain)" stroke="#d9a07a" stroke-width="1.5"/>
    <path d="M282 0h-56c6 30 2 70-10 124h66z" fill="url(#k-curtain)" stroke="#d9a07a" stroke-width="1.5"/>
    <rect x="70" y="0" width="220" height="7" rx="3" fill="#8a5a33"/>
    <!-- подоконник и герань -->
    <rect x="86" y="118" width="188" height="9" rx="3" fill="#c48a55"/>
    <g transform="translate(222 70) scale(.78)">${DECOR.geranium}</g>
    <!-- солнечный свет -->
    <rect width="360" height="250" fill="url(#k-sun)"/>
    <!-- стол -->
    <path d="M10 196h340l-8 54H18z" fill="url(#k-cloth)" stroke="#8f2416" stroke-width="1.5"/>
    <path d="M10 196h340v6H10z" fill="rgba(0,0,0,.12)"/>
    ${jars}
    <!-- миска с ягодами -->
    <path d="M262 186h64c-2 10-14 16-32 16s-30-6-32-16z" fill="#fffaf0" stroke="#c9a27a" stroke-width="1.5"/>
    <g fill="#e53935" stroke="#8f1f1a" stroke-width=".8"><circle cx="278" cy="183" r="5"/><circle cx="290" cy="180" r="5.5"/><circle cx="302" cy="182" r="5"/><circle cx="312" cy="184" r="4.5"/><circle cx="296" cy="186" r="4"/></g>
    <g fill="#3b5fd9"><circle cx="284" cy="187" r="3"/><circle cx="306" cy="188" r="3"/></g>
  </svg>`;
}
