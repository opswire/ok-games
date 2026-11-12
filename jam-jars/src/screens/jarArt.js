// Рисунок банки с вареньем: геометрия, общие градиенты и SVG-разметка.
// Одна и та же геометрия используется в SVG (банки на полках) и в Canvas (переливание),
// поэтому банка не «прыгает», когда анимация берёт её на себя.
//
// Стиль: тёплая бабушкина кухня. Толстое стекло с бликами, варенье с объёмом
// (темнее к краям — банка круглая), кусочки ягод и семечки, глянцевая поверхность,
// крышка из ткани в клетку с бечёвкой. Значок сорта остаётся на каждом слое (дальтонизм).

import flavors from '../data/flavors.json';
import { flavorIconInner } from '../assets/flavorIcons.js';

// ---------- цвета ----------

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Осветлить (amt > 0) или затемнить (amt < 0) цвет. */
export function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  const mix = (c) => Math.round(c + (t - c) * p);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

/** Цветовые ступени варенья: тень у стенки, тело, свет в толще. */
export function jamStops(hex) {
  return [
    [0, shade(hex, -0.38)],
    [0.16, shade(hex, -0.08)],
    [0.4, shade(hex, 0.14)],
    [0.62, hex],
    [0.86, shade(hex, -0.18)],
    [1, shade(hex, -0.42)],
  ];
}

// ---------- геометрия ----------

/**
 * Размеры банки при ширине W и высоте слоя L (всё в px, начало — левый верхний угол).
 */
export function jarGeometry(W, L, cap = 4) {
  const t = Math.max(2, W * 0.06); // толщина стекла
  const rimH = L * 0.42;
  const rimW = W * 0.82;
  const neckW = W * 0.74;
  const neckH = L * 0.16;
  const shoulder = L * 0.32;
  const head = L * 0.3; // свободное место над вареньем
  const bodyTop = rimH + neckH + shoulder;
  const cavTop = rimH + neckH + shoulder * 0.55;
  const cavBottom = cavTop + head + cap * L;
  const H = cavBottom + t;
  const r = Math.min(W * 0.22, L * 0.9);
  const ri = Math.max(1, r - t);
  return { W, L, cap, t, rimH, rimW, neckW, neckH, shoulder, head, bodyTop, cavTop, cavBottom, H, r, ri, cavW: W - 2 * t };
}

const f = (n) => Math.round(n * 100) / 100;

/** Внешний контур стекла (без резьбы горлышка). */
export function bodyPath(g) {
  const { W, H, rimH, neckW, neckH, bodyTop, r } = g;
  const nx = (W - neckW) / 2;
  const y1 = rimH;
  const y2 = rimH + neckH;
  return (
    `M${f(nx)} ${f(y1)}L${f(nx)} ${f(y2)}` +
    `C${f(nx)} ${f(bodyTop - 2)} ${f(0)} ${f(y2 + 1)} ${f(0)} ${f(bodyTop + 2)}` +
    `L0 ${f(H - r)}Q0 ${f(H)} ${f(r)} ${f(H)}L${f(W - r)} ${f(H)}Q${f(W)} ${f(H)} ${f(W)} ${f(H - r)}` +
    `L${f(W)} ${f(bodyTop + 2)}C${f(W)} ${f(y2 + 1)} ${f(W - nx)} ${f(bodyTop - 2)} ${f(W - nx)} ${f(y2)}` +
    `L${f(W - nx)} ${f(y1)}Z`
  );
}

/** Внутренняя полость, где лежит варенье. */
export function cavityPath(g) {
  const { W, t, cavTop, cavBottom, ri } = g;
  return (
    `M${f(t)} ${f(cavTop)}L${f(t)} ${f(cavBottom - ri)}Q${f(t)} ${f(cavBottom)} ${f(t + ri)} ${f(cavBottom)}` +
    `L${f(W - t - ri)} ${f(cavBottom)}Q${f(W - t)} ${f(cavBottom)} ${f(W - t)} ${f(cavBottom - ri)}L${f(W - t)} ${f(cavTop)}Z`
  );
}

/** Горлышко с резьбой. */
export function rimPath(g) {
  const { W, rimW, rimH } = g;
  const x = (W - rimW) / 2;
  const rr = Math.min(4, rimH / 2);
  return `M${f(x + rr)} 0L${f(x + rimW - rr)} 0Q${f(x + rimW)} 0 ${f(x + rimW)} ${f(rr)}L${f(x + rimW)} ${f(rimH)}L${f(x)} ${f(rimH)}L${f(x)} ${f(rr)}Q${f(x)} 0 ${f(x + rr)} 0Z`;
}

// ---------- оформление: выбранные игроком крышка и этикетка ----------

let jarStyle = { lid: 'red', label: 'paper' };

/** Задать оформление всех банок (из сохранения игрока). */
export function setJarStyle(style) {
  jarStyle = { ...jarStyle, ...style };
}

// ---------- общие градиенты и узоры (один раз на документ) ----------

let defsReady = false;

export function ensureJarDefs() {
  if (defsReady || typeof document === 'undefined') return;
  defsReady = true;
  const grads = flavors
    .map((fl) => {
      const stops = jamStops(fl.color)
        .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
        .join('');
      return `<linearGradient id="jam-${fl.id}" x1="0" x2="1" y1="0" y2="0">${stops}</linearGradient>`;
    })
    .join('');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  svg.innerHTML = `<defs>
    ${grads}
    <pattern id="jam-tex" width="14" height="14" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="4" r="1.1" fill="rgba(40,10,0,.22)"/>
      <circle cx="10" cy="9" r="0.9" fill="rgba(40,10,0,.18)"/>
      <ellipse cx="9" cy="3" rx="2.4" ry="1.4" fill="rgba(255,255,255,.14)"/>
      <ellipse cx="4" cy="11" rx="2" ry="1.2" fill="rgba(0,0,0,.08)"/>
      <circle cx="12.5" cy="12.5" r="0.7" fill="rgba(255,240,200,.35)"/>
    </pattern>
    <linearGradient id="jar-glass" x1="0" x2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".55"/>
      <stop offset=".22" stop-color="#fff" stop-opacity=".18"/>
      <stop offset=".7" stop-color="#fff" stop-opacity=".08"/>
      <stop offset="1" stop-color="#fff" stop-opacity=".4"/>
    </linearGradient>
    <linearGradient id="jar-shine" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".85"/>
      <stop offset=".6" stop-color="#fff" stop-opacity=".35"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="jar-rim" x1="0" x2="1">
      <stop offset="0" stop-color="#e9e2d6"/><stop offset=".35" stop-color="#fffdf8"/><stop offset="1" stop-color="#cfc4b2"/>
    </linearGradient>
    <linearGradient id="jar-hidden" x1="0" x2="1">
      <stop offset="0" stop-color="#6e6158"/><stop offset=".4" stop-color="#9a8c80"/><stop offset="1" stop-color="#5f534b"/>
    </linearGradient>
    ${['red:#d23b2a', 'blue:#2f62b8', 'green:#3f8a3a', 'violet:#7550a6']
      .map((x) => {
        const [k, c] = x.split(':');
        return `<pattern id="lid-${k}" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${c}"/><rect width="4" height="8" fill="rgba(255,255,255,.5)"/><rect width="8" height="4" fill="rgba(255,255,255,.5)"/></pattern>`;
      })
      .join('')}
    <pattern id="lid-polka" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#d23b2a"/><circle cx="2.5" cy="2.5" r="1.6" fill="#fff"/><circle cx="7" cy="7" r="1.6" fill="#fff"/></pattern>
    <pattern id="lid-flowers" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#fbe9c6"/>
      <g fill="#e05a7a"><circle cx="3" cy="3" r="1.3"/><circle cx="5" cy="3" r="1.3"/><circle cx="4" cy="1.6" r="1.3"/><circle cx="4" cy="4.4" r="1.3"/></g><circle cx="4" cy="3" r="0.8" fill="#ffd54a"/>
      <g fill="#5a8fd6"><circle cx="9" cy="9" r="1.2"/><circle cx="11" cy="9" r="1.2"/><circle cx="10" cy="7.7" r="1.2"/><circle cx="10" cy="10.3" r="1.2"/></g><path d="M6 8l2 1" stroke="#5f9e3a" stroke-width=".8"/></pattern>
    <pattern id="lid-linen" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#e9dcc2"/><path d="M0 3h6M3 0v6" stroke="rgba(120,90,50,.18)" stroke-width="1"/></pattern>
    <pattern id="lid-honey" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#d8891f"/><circle cx="2.5" cy="2.5" r="1.7" fill="#fff0c4"/><circle cx="7.5" cy="7.5" r="1.7" fill="#fff0c4"/><path d="M0 5h10" stroke="rgba(255,255,255,.22)"/></pattern>
    <pattern id="lid-stripes" width="12" height="8" patternUnits="userSpaceOnUse"><rect width="12" height="8" fill="#f5d6a4"/><rect width="3" height="8" fill="#c9543d"/><rect x="5" width="2" height="8" fill="#5f9e3a"/><rect x="9" width="3" height="8" fill="#d8873d"/></pattern>
    <pattern id="lid-velvet" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#842443"/><path d="M-2 8L8-2M0 10L10 0M2 12L12 2" stroke="#b4516d" stroke-width="1.2"/><path d="M-2 10L10-2" stroke="rgba(255,255,255,.14)" stroke-width=".5"/></pattern>
    <linearGradient id="lid-gold" x1="0" x2="1"><stop offset="0" stop-color="#a87a1e"/><stop offset=".35" stop-color="#ffe08a"/><stop offset=".6" stop-color="#e2b53e"/><stop offset="1" stop-color="#8a6414"/></linearGradient>
  </defs>`;
  document.body.prepend(svg);
}

// ---------- SVG-разметка банки ----------

let uidSeq = 0;

/**
 * SVG банки.
 * @param {{ W:number, L:number, jar:number[], hidden?:number, complete?:boolean, mini?:boolean,
 *          cap?:number, lockLeft?:number, only?:number }} o
 *   jar — сорта слоёв снизу вверх, hidden — сколько нижних слоёв закрыто «?»,
 *   cap — вместимость (маленькая банка — 3), lockLeft — сколько ещё собрать банок до открытия замка,
 *   only — банка только для этого сорта (-1 — любая).
 */
export function jarSvg({ W, L, jar, hidden = 0, complete = false, mini = false, cap = 4, lockLeft = 0, only = -1, style = null }) {
  ensureJarDefs();
  const g = jarGeometry(W, L, cap);
  const id = `jc${++uidSeq}`;
  const parts = [];

  // слои варенья: снизу вверх, внутри полости
  jar.forEach((sort, i) => {
    const y = g.cavBottom - (i + 1) * L;
    const isHidden = i < hidden;
    const fill = isHidden ? 'url(#jar-hidden)' : `url(#jam-${sort})`;
    parts.push(`<g class="layer${isHidden ? ' hidden' : ''}" data-i="${i}">`);
    parts.push(`<rect x="0" y="${f(y)}" width="${f(W)}" height="${f(L + 0.6)}" fill="${fill}"/>`);
    if (!isHidden) parts.push(`<rect x="0" y="${f(y)}" width="${f(W)}" height="${f(L + 0.6)}" fill="url(#jam-tex)"/>`);
    // граница слоёв — лёгкая тень
    parts.push(`<rect x="0" y="${f(y + L - 1)}" width="${f(W)}" height="1.2" fill="rgba(0,0,0,.14)"/>`);
    if (!mini && !complete) {
      const s = Math.min(L * 0.78, W * 0.5);
      const x = (W - s) / 2;
      const yy = y + (L - s) / 2;
      if (isHidden) {
        parts.push(
          `<text x="${f(W / 2)}" y="${f(y + L * 0.78)}" text-anchor="middle" font-size="${f(L * 0.78)}" font-weight="900" fill="#fff" stroke="rgba(0,0,0,.25)" stroke-width="1">?</text>`,
        );
      } else {
        parts.push(`<svg x="${f(x)}" y="${f(yy)}" width="${f(s)}" height="${f(s)}" viewBox="0 0 24 24">${flavorIconInner(sort)}</svg>`);
      }
    }
    parts.push('</g>');
  });

  // глянцевая поверхность верхнего слоя
  if (jar.length) {
    const top = jar[jar.length - 1];
    const yTop = g.cavBottom - jar.length * L;
    const color = jar.length - 1 < hidden ? '#b5a79a' : shade(flavors[top].color, 0.35);
    parts.push(`<ellipse cx="${f(W / 2)}" cy="${f(yTop + 0.5)}" rx="${f(g.cavW / 2)}" ry="${f(Math.max(1.5, L * 0.13))}" fill="${color}" opacity=".85"/>`);
  }

  const shineW = Math.max(2, W * 0.09);
  const label = complete && jar.length ? labelSvg(g, jar[0], style?.label ?? jarStyle.label) : '';

  const lid = complete ? lidSvg(g, style?.lid ?? jarStyle.lid) : '';
  const lockMark = lockLeft > 0 ? lockSvg(g, lockLeft) : '';
  const onlyMark = only >= 0 ? onlySvg(g, only, jar.length === 0) : '';

  return `<svg class="jar-svg" viewBox="${f(-W * 0.12)} ${f(-L * 0.55)} ${f(W * 1.24)} ${f(g.H + L * 0.55 + 2)}" width="${f(W * 1.24)}" height="${f(g.H + L * 0.55 + 2)}" aria-hidden="true">
    <defs><clipPath id="${id}"><path d="${cavityPath(g)}"/></clipPath></defs>
    <ellipse cx="${f(W / 2)}" cy="${f(g.H)}" rx="${f(W * 0.48)}" ry="${f(Math.max(2, L * 0.16))}" fill="rgba(60,35,15,.22)"/>
    <path class="glass" d="${bodyPath(g)}" fill="rgba(255,255,255,.42)"/>
    <g clip-path="url(#${id})">${parts.join('')}</g>
    <path d="${bodyPath(g)}" fill="url(#jar-glass)" stroke="rgba(92,60,36,.42)" stroke-width="${f(Math.max(1.4, W * 0.035))}"/>
    <rect x="${f(g.t + W * 0.06)}" y="${f(g.cavTop + L * 0.2)}" width="${f(shineW)}" height="${f(g.cavBottom - g.cavTop - L * 0.6)}" rx="${f(shineW / 2)}" fill="url(#jar-shine)"/>
    <rect x="${f(W - g.t - W * 0.14)}" y="${f(g.cavTop + L * 0.5)}" width="${f(shineW * 0.45)}" height="${f(L * 1.3)}" rx="${f(shineW / 4)}" fill="#fff" opacity=".45"/>
    <path d="${rimPath(g)}" fill="url(#jar-rim)" stroke="rgba(92,60,36,.4)" stroke-width="1.2"/>
    <path d="M${f((W - g.rimW) / 2 + 1)} ${f(g.rimH * 0.5)}h${f(g.rimW - 2)}" stroke="rgba(92,60,36,.25)" stroke-width="1"/>
    ${onlyMark}${label}${lid}${lockMark}
  </svg>`;
}

/** Крышка: ткань (клетка, горошек, ситец, лён с кружевом) с бечёвкой или золотая металлическая. */
function lidSvg(g, kind = 'red') {
  const { W, rimW, rimH, L } = g;
  if (kind === 'gold') {
    const x = (W - rimW) / 2 - W * 0.05;
    const w = rimW + W * 0.1;
    const ridges = Array.from({ length: 7 }, (_, i) => `M${f(x + (w * (i + 1)) / 8)} ${f(-L * 0.25)}v${f(rimH + L * 0.3)}`).join('');
    return `<g class="lid"><rect x="${f(x)}" y="${f(-L * 0.3)}" width="${f(w)}" height="${f(rimH + L * 0.4)}" rx="${f(L * 0.2)}" fill="url(#lid-gold)" stroke="#7a5a10" stroke-width="1.2"/>
      <path d="${ridges}" stroke="rgba(120,80,0,.35)" stroke-width="1"/><rect x="${f(x + 2)}" y="${f(-L * 0.28)}" width="${f(w - 4)}" height="${f(L * 0.14)}" rx="2" fill="rgba(255,255,255,.45)"/></g>`;
  }
  const x0 = (W - rimW) / 2 - W * 0.1;
  const x1 = W - x0;
  const top = -L * 0.45;
  const bottom = rimH + L * 0.35;
  const n = 6; // зубцы ткани
  const step = (x1 - x0) / n;
  let edge = '';
  for (let i = 0; i < n; i++) {
    const xa = x1 - i * step;
    edge += `Q${f(xa - step / 2)} ${f(bottom + L * 0.22)} ${f(xa - step)} ${f(bottom)}`;
  }
  const cloth = `M${f(x0)} ${f(bottom)}C${f(x0 - 2)} ${f(top + L * 0.3)} ${f(x0 + W * 0.1)} ${f(top)} ${f(W / 2)} ${f(top)}C${f(x1 - W * 0.1)} ${f(top)} ${f(x1 + 2)} ${f(top + L * 0.3)} ${f(x1)} ${f(bottom)}${edge}Z`;
  const fill = {
    red: 'lid-red',
    blue: 'lid-blue',
    green: 'lid-green',
    polka: 'lid-polka',
    flowers: 'lid-flowers',
    linen: 'lid-linen',
    violet: 'lid-violet',
    honey: 'lid-honey',
    stripes: 'lid-stripes',
    velvet: 'lid-velvet',
  }[kind] ?? 'lid-red';
  const edgeColor = {
    blue: '#1d3f7a',
    green: '#25591f',
    flowers: '#b5715a',
    linen: '#9c8358',
    violet: '#49305f',
    honey: '#8f5411',
    stripes: '#8f4b31',
    velvet: '#54162c',
  }[kind] ?? '#8f2416';
  // кружево для льняной крышки: белые полукружия по краю
  let lace = '';
  if (kind === 'linen') {
    for (let i = 0; i < n * 2; i++) {
      const cx = x0 + (step / 2) * (i + 0.5);
      lace += `<circle cx="${f(cx)}" cy="${f(bottom + L * 0.12)}" r="${f(step * 0.22)}" fill="#fffdf5" stroke="#d8ccb2" stroke-width=".6"/>`;
    }
  }
  return `<g class="lid">
    ${lace}<path d="${cloth}" fill="url(#${fill})" stroke="${edgeColor}" stroke-width="1.2"/>
    <path d="${cloth}" fill="url(#jar-shine)" opacity=".25"/>
    <path d="M${f(x0 + 2)} ${f(rimH * 0.75)}Q${f(W / 2)} ${f(rimH * 0.95)} ${f(x1 - 2)} ${f(rimH * 0.75)}" fill="none" stroke="#e7cf9f" stroke-width="${f(Math.max(1.5, L * 0.12))}" stroke-linecap="round"/>
    <path d="M${f(W * 0.62)} ${f(rimH * 0.85)}q${f(L * 0.3)} ${f(L * 0.4)} ${f(L * 0.1)} ${f(L * 0.75)}M${f(W * 0.62)} ${f(rimH * 0.85)}q${f(L * 0.45)} ${f(L * 0.2)} ${f(L * 0.5)} ${f(L * 0.6)}" fill="none" stroke="#e7cf9f" stroke-width="${f(Math.max(1.2, L * 0.09))}" stroke-linecap="round"/>
  </g>`;
}

/** Этикетка: бумажная, крафтовая, круглая, сердечко, лента, кружевная — со значком ягоды. */
function labelSvg(g, sort, kind = 'paper') {
  const { W, L, cavW, cavBottom, cap } = g;
  const c = flavors[sort].color;
  const s = Math.min(cavW * 0.7, L * 2.1);
  const cx = W / 2;
  const cy = cavBottom - (cap / 2) * L;
  const x = cx - s / 2;
  const y = cy - s / 2;
  const icon = (k = 0.72) =>
    `<svg x="${f(cx - (s * k) / 2)}" y="${f(cy - (s * k) / 2)}" width="${f(s * k)}" height="${f(s * k)}" viewBox="0 0 24 24">${flavorIconInner(sort, { fill: c, stroke: shade(c, -0.45) })}</svg>`;
  let shape;
  switch (kind) {
    case 'kraft':
      shape = `<rect x="${f(x)}" y="${f(y)}" width="${f(s)}" height="${f(s)}" rx="${f(s * 0.08)}" fill="#d4ad78" stroke="#8a6a3c" stroke-width="1.2"/>
        <circle cx="${f(x + s * 0.16)}" cy="${f(y + s * 0.16)}" r="${f(s * 0.05)}" fill="#7a5a30"/>`;
      return `<g class="label">${shape}${icon(0.62)}</g>`;
    case 'round':
      shape = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(s * 0.52)}" fill="#fffaf0" stroke="${c}" stroke-width="${f(Math.max(1.5, s * 0.09))}"/>`;
      return `<g class="label">${shape}${icon(0.64)}</g>`;
    case 'heart': {
      const h = s * 1.05;
      shape = `<path d="M${f(cx)} ${f(cy + h * 0.45)}C${f(cx - h * 0.62)} ${f(cy + h * 0.05)} ${f(cx - h * 0.55)} ${f(cy - h * 0.5)} ${f(cx)} ${f(cy - h * 0.22)}C${f(cx + h * 0.55)} ${f(cy - h * 0.5)} ${f(cx + h * 0.62)} ${f(cy + h * 0.05)} ${f(cx)} ${f(cy + h * 0.45)}Z" fill="#fff4f4" stroke="#d9667a" stroke-width="1.4"/>`;
      return `<g class="label">${shape}${icon(0.5)}</g>`;
    }
    case 'ribbon': {
      const w = Math.min(cavW * 1.02, s * 1.5);
      const hh = s * 0.62;
      const lx = cx - w / 2;
      shape = `<path d="M${f(lx)} ${f(cy - hh / 2)}h${f(w)}l${f(-hh * 0.3)} ${f(hh / 2)}l${f(hh * 0.3)} ${f(hh / 2)}h${f(-w)}l${f(hh * 0.3)} ${f(-hh / 2)}z" fill="#fffaf0" stroke="${shade(c, -0.2)}" stroke-width="1.2"/>
        <path d="M${f(lx + hh * 0.35)} ${f(cy - hh * 0.32)}h${f(w - hh * 0.7)}M${f(lx + hh * 0.35)} ${f(cy + hh * 0.32)}h${f(w - hh * 0.7)}" stroke="${c}" stroke-width="1.2"/>`;
      return `<g class="label">${shape}${icon(0.48)}</g>`;
    }
    case 'lace': {
      let dots = '';
      const r = s * 0.5;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        dots += `<circle cx="${f(cx + Math.cos(a) * r)}" cy="${f(cy + Math.sin(a) * r)}" r="${f(s * 0.1)}" fill="#fffdf8" stroke="#d8ccb2" stroke-width=".6"/>`;
      }
      shape = `${dots}<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="#fffdf8" stroke="#d8ccb2" stroke-width=".8"/>`;
      return `<g class="label">${shape}${icon(0.62)}</g>`;
    }
    default:
      shape = `<rect x="${f(x)}" y="${f(y)}" width="${f(s)}" height="${f(s)}" rx="${f(s * 0.14)}" fill="#fffaf0" stroke="#c9a27a" stroke-width="1.5"/>`;
      return `<g class="label">${shape}${icon(0.76)}</g>`;
  }
}

/** Замок: бечёвка крест-накрест и висячий замок с числом банок, которые осталось собрать. */
function lockSvg(g, left) {
  const { W, L, H, cavTop } = g;
  const cy = cavTop + (H - cavTop) * 0.5;
  const s = Math.min(W * 0.62, L * 2.2);
  const x = W / 2 - s / 2;
  const y = cy - s * 0.35;
  const sw = Math.max(1.6, L * 0.14);
  return `<g class="lock">
    <rect x="0" y="${f(cavTop)}" width="${f(W)}" height="${f(H - cavTop)}" fill="rgba(255,255,255,.35)"/>
    <path d="M${f(W * 0.05)} ${f(cavTop + L * 0.2)}L${f(W * 0.95)} ${f(H - L * 0.3)}M${f(W * 0.95)} ${f(cavTop + L * 0.2)}L${f(W * 0.05)} ${f(H - L * 0.3)}" stroke="#a87b45" stroke-width="${f(sw)}" stroke-linecap="round"/>
    <path d="M${f(x + s * 0.24)} ${f(y + s * 0.38)}v${f(-s * 0.12)}a${f(s * 0.26)} ${f(s * 0.26)} 0 0 1 ${f(s * 0.52)} 0v${f(s * 0.12)}" fill="none" stroke="#8b8f96" stroke-width="${f(Math.max(2, s * 0.1))}"/>
    <rect x="${f(x + s * 0.1)}" y="${f(y + s * 0.36)}" width="${f(s * 0.8)}" height="${f(s * 0.62)}" rx="${f(s * 0.12)}" fill="#e2b53e" stroke="#8a6414" stroke-width="1.4"/>
    <text x="${f(W / 2)}" y="${f(y + s * 0.84)}" text-anchor="middle" font-size="${f(s * 0.46)}" font-weight="900" fill="#5a3a10">${left}</text>
  </g>`;
}

/** Банка «только для одного сорта»: бирка цвета варенья на горлышке и бледный значок внутри. */
function onlySvg(g, sort, empty) {
  const { W, L, rimH, cavTop, cavBottom } = g;
  const c = flavors[sort].color;
  const s = Math.min(W * 0.7, L * 2.4);
  const ghost = empty
    ? `<svg x="${f(W / 2 - s / 2)}" y="${f((cavTop + cavBottom) / 2 - s / 2)}" width="${f(s)}" height="${f(s)}" viewBox="0 0 24 24" opacity=".32">${flavorIconInner(sort, { fill: c, stroke: shade(c, -0.4) })}</svg>`
    : '';
  const tag = Math.max(10, L * 0.95);
  return `<g class="only">${ghost}
    <rect x="${f(W * 0.08)}" y="${f(rimH * 0.15)}" width="${f(W * 0.84)}" height="${f(rimH * 0.7)}" rx="2" fill="${c}" opacity=".9"/>
    <rect x="${f(W - tag * 0.9)}" y="${f(rimH + L * 0.1)}" width="${f(tag)}" height="${f(tag)}" rx="${f(tag * 0.2)}" fill="#fffaf0" stroke="${shade(c, -0.3)}" stroke-width="1.5" transform="rotate(12 ${f(W - tag * 0.4)} ${f(rimH + L * 0.1 + tag / 2)})"/>
    <svg x="${f(W - tag * 0.8)}" y="${f(rimH + L * 0.2)}" width="${f(tag * 0.8)}" height="${f(tag * 0.8)}" viewBox="0 0 24 24">${flavorIconInner(sort, { fill: c, stroke: shade(c, -0.45) })}</svg>
  </g>`;
}
