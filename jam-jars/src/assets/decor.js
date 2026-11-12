// Украшения кладовой — свои простые SVG-рисунки (viewBox 0 0 64 64).
const S = 'stroke="#4a2e1a" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';

export const DECOR = {
  curtain: `<line x1="4" y1="8" x2="60" y2="8" ${S} stroke-width="3"/>
    <path d="M6 9h24c-2 14 2 30-6 46H6z" fill="#f6d3a8" ${S}/><path d="M58 9H34c2 14-2 30 6 46h18z" fill="#f6d3a8" ${S}/>
    <g fill="#d9482b"><circle cx="12" cy="18" r="2"/><circle cx="20" cy="28" r="2"/><circle cx="12" cy="38" r="2"/><circle cx="22" cy="44" r="2"/>
    <circle cx="52" cy="18" r="2"/><circle cx="44" cy="28" r="2"/><circle cx="52" cy="38" r="2"/><circle cx="44" cy="46" r="2"/></g>`,
  geranium: `<path d="M20 40h24l-4 18H24z" fill="#c8693c" ${S}/><rect x="18" y="36" width="28" height="6" rx="2" fill="#d97b4a" ${S}/>
    <g fill="#5f9e3a" ${S}><circle cx="22" cy="30" r="7"/><circle cx="42" cy="30" r="7"/><circle cx="32" cy="27" r="7"/></g>
    <g fill="#e53950" ${S} stroke-width="1.5"><circle cx="24" cy="16" r="5"/><circle cx="33" cy="12" r="5"/><circle cx="41" cy="18" r="5"/></g>`,
  clock: `<rect x="18" y="4" width="28" height="34" rx="4" fill="#a8703f" ${S}/><circle cx="32" cy="20" r="10" fill="#fff7ea" ${S}/>
    <path d="M32 20v-6M32 20l5 3" ${S}/><line x1="32" y1="38" x2="32" y2="52" ${S}/><circle cx="32" cy="55" r="5" fill="#e0b040" ${S}/>`,
  basket: `<path d="M10 30h44l-6 26H16z" fill="#c99a5b" ${S}/><path d="M14 38h36M16 46h32M24 30l-2 26M32 30v26M40 30l2 26" stroke="#8a5a33" stroke-width="1.5"/>
    <path d="M14 30c0-14 36-14 36 0" fill="none" ${S} stroke-width="3"/>
    <g fill="#e53935" ${S}><circle cx="22" cy="27" r="7"/><circle cx="34" cy="25" r="7"/><circle cx="44" cy="28" r="6"/></g>`,
  lamp: `<line x1="32" y1="0" x2="32" y2="16" ${S}/><path d="M20 16h24l10 22H10z" fill="#f28c38" ${S}/>
    <path d="M12 38v6M18 38v6M24 38v6M30 38v6M36 38v6M42 38v6M48 38v6M54 38v4" ${S} stroke="#d9482b"/>
    <ellipse cx="32" cy="40" rx="8" ry="3" fill="#fff3b0"/>`,
  jug: `<path d="M24 10h16l-2 8c10 6 12 18 8 30-2 6-8 10-14 10s-12-4-14-10c-4-12-2-24 8-30z" fill="#c26a3d" ${S}/>
    <path d="M46 24c8 0 10 12 2 16" fill="none" ${S} stroke-width="3"/><path d="M20 34c8 3 16 3 24 0" fill="none" stroke="#f3d6a4" stroke-width="3"/>`,
  onions: `<path d="M32 2c-4 12 4 22-2 34s2 14 0 22" fill="none" stroke="#c9a76b" stroke-width="4"/>
    <g fill="#e6a443" ${S}><path d="M22 18c-6 0-8 8-2 12h6c4-4 2-12-4-12z"/><path d="M42 26c-6 0-8 8-2 12h6c4-4 2-12-4-12z"/>
    <path d="M22 38c-6 0-8 8-2 12h6c4-4 2-12-4-12z"/><path d="M42 46c-6 0-8 8-2 12h6c4-4 2-12-4-12z"/></g>`,
  cat: `<ellipse cx="32" cy="54" rx="28" ry="7" fill="#7aa6c2" ${S}/><path d="M8 54h48" stroke="#f3e7bd" stroke-width="2"/>
    <ellipse cx="34" cy="44" rx="18" ry="10" fill="#e08a3c" ${S}/><circle cx="18" cy="40" r="8" fill="#e08a3c" ${S}/>
    <path d="M12 35l1-7 5 4M20 32l4-6 2 7" fill="#e08a3c" ${S}/><path d="M15 41h3M21 41h3" ${S} stroke-width="1.5"/>
    <path d="M52 46c6 0 6 8 0 8" fill="none" ${S} stroke-width="3"/>`,
  barrel: `<rect x="14" y="10" width="36" height="48" rx="10" fill="#a8703f" ${S}/><path d="M14 22h36M14 46h36" stroke="#5a3a1a" stroke-width="3"/>
    <ellipse cx="32" cy="12" rx="17" ry="4" fill="#6b8f3a" ${S}/><path d="M24 11c2-3 6-3 8 0M34 12c2-3 6-3 8 0" stroke="#3f6420" stroke-width="2" fill="none"/>`,
  tub: `<path d="M12 26h40l-5 30H17z" fill="#b98352" ${S}/><path d="M13 36h38M15 46h34" stroke="#6b4424" stroke-width="2.5"/>
    <g fill="#a6c96a" ${S}><circle cx="24" cy="24" r="8"/><circle cx="38" cy="22" r="9"/><circle cx="31" cy="18" r="6"/></g>`,
  lantern: `<path d="M26 8h12M32 4v4" ${S}/><path d="M24 10h16l-2 8H26z" fill="#6f6f6f" ${S}/><path d="M22 18h20c2 10 2 22 0 30H22c-2-8-2-20 0-30z" fill="#fff3c4" fill-opacity=".85" ${S}/>
    <ellipse cx="32" cy="36" rx="4" ry="7" fill="#ffb347"/><rect x="18" y="48" width="28" height="8" rx="2" fill="#8a5a33" ${S}/>`,
  samovar: `<path d="M22 14h20l3 6H19z" fill="#d9a441" ${S}/><path d="M18 20h28c3 12 3 20-2 28H20c-5-8-5-16-2-28z" fill="#e8b84f" ${S}/>
    <path d="M18 28c-6 0-8 8-2 10M46 28c6 0 8 8 2 10" fill="none" ${S}/><path d="M24 48h16l4 10H20z" fill="#c98f2e" ${S}/>
    <path d="M44 38h8v3h-8" fill="#c98f2e" ${S}/><circle cx="32" cy="10" r="3" fill="#c98f2e" ${S}/>`,
  chair: `<path d="M16 10c0-4 32-4 32 0v26H16z" fill="#d9b277" ${S}/><path d="M20 14v20M26 13v21M32 12v22M38 13v21M44 14v20" stroke="#a87c45" stroke-width="1.5"/>
    <path d="M12 36h40v8H12z" fill="#c99a5b" ${S}/><path d="M16 44l-2 14M48 44l2 14M24 44v14M40 44v14" ${S} stroke-width="3"/>`,
  vase: `<path d="M24 34h16c2 8 2 16-2 24H26c-4-8-4-16-2-24z" fill="#7aa6c2" ${S}/><path d="M26 34c0-4 12-4 12 0" fill="none" ${S}/>
    <g fill="#b48ad8" ${S} stroke-width="1.2"><circle cx="24" cy="18" r="5"/><circle cx="30" cy="12" r="5"/><circle cx="38" cy="16" r="5"/><circle cx="34" cy="22" r="4"/><circle cx="27" cy="25" r="4"/></g>
    <path d="M30 34l-4-8M34 34l2-10" stroke="#5f9e3a" stroke-width="2"/>`,
  stove: `<rect x="10" y="16" width="44" height="42" rx="4" fill="#f3efe6" ${S}/><rect x="16" y="34" width="16" height="16" rx="2" fill="#4a2e1a" ${S}/>
    <path d="M19 46c2-6 6-6 6-10 3 4 4 8 2 12" fill="#ff8a3d"/><rect x="36" y="32" width="12" height="4" rx="1" fill="#c9a27a"/>
    <rect x="8" y="10" width="48" height="8" rx="2" fill="#8b8f96" ${S}/><rect x="40" y="2" width="8" height="10" fill="#a8703f" ${S}/>`,
  basin: `<path d="M6 30h52c-2 14-12 24-26 24S8 44 6 30z" fill="#d07a3a" ${S}/><path d="M6 30c0-3 52-3 52 0" fill="#b5602a" ${S}/>
    <ellipse cx="32" cy="31" rx="24" ry="3" fill="#c0392b"/><path d="M58 32h6M0 32h6" ${S} stroke-width="3"/>
    <path d="M44 30l12-22" stroke="#a8703f" stroke-width="4" stroke-linecap="round"/>`,
  towel: `<path d="M10 8h44" ${S} stroke-width="3"/><path d="M16 8h32v46l-4-3-4 3-4-3-4 3-4-3-4 3-4-3-4 3z" fill="#fffaf0" ${S}/>
    <path d="M18 40h28M18 46h28" stroke="#d9482b" stroke-width="2.5"/><path d="M26 22l6-6 6 6-6 6z" fill="#d9482b"/><path d="M22 32h20" stroke="#5f9e3a" stroke-width="2"/>`,
  chest: `<path d="M8 28h48v28H8z" fill="#a8703f" ${S}/><path d="M8 28c0-14 48-14 48 0z" fill="#c48a55" ${S}/>
    <path d="M8 28h48M18 18v38M46 18v38" stroke="#6e4424" stroke-width="3"/><rect x="28" y="30" width="8" height="10" rx="2" fill="#e0b040" ${S}/>`,
  herbs: `<path d="M8 10h48" ${S} stroke-width="3"/><g ${S} stroke-width="1.5">
    <path d="M16 10l-4 34h10z" fill="#7da34a"/><path d="M32 10l-5 40h11z" fill="#9bbf5f"/><path d="M48 10l-4 32h10z" fill="#6f9a3e"/></g>
    <g fill="#c58ae0"><circle cx="30" cy="44" r="2"/><circle cx="34" cy="46" r="2"/><circle cx="32" cy="41" r="2"/></g>`,
  trunk: `<rect x="8" y="20" width="48" height="34" rx="5" fill="#7a5c3c" ${S}/><path d="M24 20v-6h16v6" fill="none" ${S} stroke-width="3"/>
    <circle cx="20" cy="34" r="6" fill="#e6a443"/><rect x="34" y="28" width="14" height="9" rx="2" fill="#7aa6c2"/><rect x="18" y="44" width="16" height="6" rx="2" fill="#d9482b"/>
    <path d="M8 26h48" stroke="#4a2e1a" stroke-width="2"/>`,
  boots: `<path d="M10 10h14v32c0 6 4 8 10 8v8H10z" fill="#7d7d85" ${S}/><path d="M32 6h14v32c0 6 4 8 10 8v8H32z" fill="#8e8e96" ${S}/>
    <path d="M10 18h14M32 14h14" stroke="#5c5c63" stroke-width="2"/>`,
  buckets: `<rect x="4" y="44" width="56" height="6" rx="2" fill="#a8703f" ${S}/><path d="M10 50v10M54 50v10" ${S} stroke-width="3"/>
    <path d="M8 20h20l-3 24H11z" fill="#aab4bf" ${S}/><path d="M36 20h20l-3 24H39z" fill="#aab4bf" ${S}/>
    <path d="M8 20c0-12 20-12 20 0M36 20c0-12 20-12 20 0" fill="none" ${S}/>`,
  shawl: `<circle cx="32" cy="6" r="3" fill="#8a5a33" ${S}/><path d="M32 8L8 40h48z" fill="#d23b5a" ${S}/>
    <g fill="#ffd54a"><circle cx="32" cy="24" r="3"/><circle cx="22" cy="34" r="3"/><circle cx="42" cy="34" r="3"/></g>
    <path d="M10 40l-2 8M18 40l-1 8M26 40v8M34 40v8M42 40l1 8M50 40l2 8" stroke="#d23b5a" stroke-width="2"/>`,
  rug: `<ellipse cx="32" cy="40" rx="30" ry="14" fill="#e6a443" ${S}/><ellipse cx="32" cy="40" rx="22" ry="10" fill="#7aa6c2"/>
    <ellipse cx="32" cy="40" rx="14" ry="6" fill="#d9482b"/><ellipse cx="32" cy="40" rx="6" ry="2.6" fill="#f3e7bd"/>`,
  pie: `<ellipse cx="32" cy="46" rx="28" ry="8" fill="#f3efe6" ${S}/><path d="M10 42c0-14 44-14 44 0z" fill="#e0a85a" ${S}/>
    <path d="M18 34l28 0M14 40h36M24 28l-6 14M32 27v15M40 28l6 14" stroke="#b5783a" stroke-width="2"/>`,
  garland: `<path d="M2 10c14 14 46 14 60 0" fill="none" stroke="#4a2e1a" stroke-width="1.5"/>
    <g ${S} stroke-width="1.2"><rect x="8" y="14" width="7" height="10" rx="3" fill="#ffd54a"/><rect x="20" y="19" width="7" height="10" rx="3" fill="#ff8a3d"/>
    <rect x="31" y="20" width="7" height="10" rx="3" fill="#7ad3a0"/><rect x="42" y="18" width="7" height="10" rx="3" fill="#ff6b8a"/><rect x="52" y="13" width="7" height="10" rx="3" fill="#7ab6ff"/></g>`,
  teapot: `<ellipse cx="30" cy="38" rx="18" ry="16" fill="#fffaf0" ${S}/><path d="M48 32c8-2 12 6 4 10" fill="none" ${S} stroke-width="3"/>
    <path d="M14 34L4 26" ${S} stroke-width="4"/><path d="M22 24c0-6 16-6 16 0" fill="#fffaf0" ${S}/><circle cx="30" cy="18" r="2.5" fill="#d9482b" ${S}/>
    <g fill="#d9482b"><circle cx="26" cy="38" r="3"/><circle cx="34" cy="42" r="3"/></g><path d="M28 36l-4-4M36 44l3 3" stroke="#5f9e3a" stroke-width="1.5"/>`,
  flowerbed: `<path d="M4 50c8-6 48-6 56 0v8H4z" fill="#8b6440" ${S}/>
    <g stroke="#5f9e3a" stroke-width="2"><path d="M14 50V34M26 50V28M38 50V30M50 50V36"/></g>
    <g fill="#fff" ${S} stroke-width="1"><circle cx="14" cy="32" r="5"/><circle cx="26" cy="26" r="6"/><circle cx="38" cy="28" r="5"/><circle cx="50" cy="34" r="5"/></g>
    <g fill="#ffd54a"><circle cx="14" cy="32" r="2"/><circle cx="26" cy="26" r="2.4"/><circle cx="38" cy="28" r="2"/><circle cx="50" cy="34" r="2"/></g>`,
  sacks: `<path d="M8 58c-2-14 2-30 8-34l-2-6h16l-2 6c6 4 10 20 8 34z" fill="#e6d3b0" ${S}/>
    <path d="M30 58c-2-12 2-24 8-28l-2-5h14l-2 5c6 4 10 16 8 28z" fill="#efe0c2" ${S}/><path d="M14 40h14M38 44h12" stroke="#a87b45" stroke-width="2"/>`,
  eggs: `<path d="M8 32h48l-6 24H14z" fill="#c99a5b" ${S}/><path d="M12 40h40M14 48h36" stroke="#8a5a33" stroke-width="1.5"/>
    <g fill="#fff6e6" ${S}><ellipse cx="20" cy="28" rx="6" ry="8"/><ellipse cx="32" cy="26" rx="6" ry="8"/><ellipse cx="44" cy="28" rx="6" ry="8"/></g>`,
  milkcan: `<path d="M24 6h16v8l6 6v34c0 3-3 6-6 6H24c-3 0-6-3-6-6V20l6-6z" fill="#c7cdd4" ${S}/><rect x="22" y="2" width="20" height="6" rx="2" fill="#a9b0b8" ${S}/>
    <path d="M18 30h28" stroke="#8b8f96" stroke-width="2"/><path d="M12 24c-4 4-4 10 0 12M52 24c4 4 4 10 0 12" fill="none" ${S} stroke-width="3"/>`,
  scales: `<rect x="10" y="50" width="44" height="8" rx="2" fill="#8a5a33" ${S}/><path d="M32 50V14M14 14h36" ${S} stroke-width="3"/>
    <path d="M8 30c0-6 12-6 12 0zM44 30c0-6 12-6 12 0z" fill="#d9a441" ${S}/><path d="M14 14l-4 16M14 14l4 16M50 14l-4 16M50 14l4 16" stroke="#4a2e1a" stroke-width="1"/>
    <path d="M44 46l3-8h6l3 8z" fill="#5c5c63" ${S}/>`,
  dresser: `<rect x="8" y="14" width="48" height="42" rx="3" fill="#b07a4a" ${S}/><path d="M8 28h48M8 42h48" stroke="#6e4424" stroke-width="2.5"/>
    <g fill="#e0b040"><circle cx="24" cy="21" r="2"/><circle cx="40" cy="21" r="2"/><circle cx="24" cy="35" r="2"/><circle cx="40" cy="35" r="2"/><circle cx="24" cy="49" r="2"/><circle cx="40" cy="49" r="2"/></g>
    <path d="M12 56v6M52 56v6" ${S} stroke-width="3"/>`,
  ficus: `<path d="M22 44h20l-3 16H25z" fill="#c8693c" ${S}/><path d="M32 44V16" stroke="#6b4424" stroke-width="3"/>
    <g fill="#3f7d3a" ${S} stroke-width="1"><ellipse cx="22" cy="20" rx="8" ry="5" transform="rotate(-30 22 20)"/><ellipse cx="42" cy="18" rx="8" ry="5" transform="rotate(30 42 18)"/>
    <ellipse cx="22" cy="34" rx="8" ry="5" transform="rotate(-20 22 34)"/><ellipse cx="42" cy="32" rx="8" ry="5" transform="rotate(20 42 32)"/><ellipse cx="32" cy="10" rx="5" ry="7"/></g>`,
  frame: `<rect x="8" y="8" width="48" height="44" rx="2" fill="#c48a55" ${S}/><rect x="14" y="14" width="36" height="32" fill="#bfe0f2"/>
    <path d="M14 46h36V36c-10-4-26-4-36 0z" fill="#9bc35a"/>
    <g stroke="#5f9e3a" stroke-width="1.5"><path d="M24 44V30M38 44V28"/></g>
    <g fill="#ffc83d"><circle cx="24" cy="28" r="5"/><circle cx="38" cy="26" r="5"/></g><g fill="#8a5a33"><circle cx="24" cy="28" r="2"/><circle cx="38" cy="26" r="2"/></g>`,
  yarn: `<path d="M8 36h48l-6 22H14z" fill="#d9b277" ${S}/>
    <g ${S} stroke-width="1.2"><circle cx="20" cy="32" r="9" fill="#e57373"/><circle cx="36" cy="30" r="9" fill="#7aa6c2"/><circle cx="48" cy="34" r="7" fill="#ffd54a"/></g>
    <path d="M14 28c4 4 10 6 14 4M30 26c4 4 10 6 14 4" stroke="rgba(0,0,0,.25)" fill="none"/><path d="M50 26l8-14M54 26l6-12" stroke="#8a5a33" stroke-width="2"/>`,
  hoop: `<circle cx="32" cy="32" r="22" fill="#fffaf0" stroke="#c48a55" stroke-width="5"/><rect x="28" y="4" width="8" height="6" rx="2" fill="#a8703f" ${S}/>
    <g fill="#d9482b"><circle cx="28" cy="30" r="4"/><circle cx="36" cy="30" r="4"/><path d="M24 32l8 10 8-10z"/></g><path d="M32 42v6M28 46l4 2 4-2" stroke="#5f9e3a" stroke-width="2" fill="none"/>`,
  quilt: `<rect x="6" y="14" width="52" height="40" rx="3" fill="#fffaf0" ${S}/>
    <g><rect x="6" y="14" width="13" height="13" fill="#e57373"/><rect x="32" y="14" width="13" height="13" fill="#7aa6c2"/><rect x="19" y="27" width="13" height="14" fill="#ffd54a"/>
    <rect x="45" y="27" width="13" height="14" fill="#9bc35a"/><rect x="6" y="41" width="13" height="13" fill="#b48ad8"/><rect x="32" y="41" width="13" height="13" fill="#ff8a3d"/></g>
    <rect x="6" y="14" width="52" height="40" rx="3" fill="none" ${S}/>`,
  candle: `<path d="M18 54h28l-4-6H22z" fill="#d9a441" ${S}/><rect x="28" y="22" width="8" height="26" rx="2" fill="#fff6e6" ${S}/>
    <path d="M32 6c-5 7-5 12 0 14 5-2 5-7 0-14z" fill="#ffb347"/><path d="M32 11c-2 4-2 6 0 7 2-1 2-3 0-7z" fill="#fff3b0"/>
    <path d="M46 40c6 0 8 8 2 10" fill="none" ${S} stroke-width="3"/>`,
  daisies: `<path d="M22 36h20l-2 22H24z" fill="#c26a3d" ${S}/><path d="M42 40c6 0 6 10 0 10" fill="none" ${S} stroke-width="3"/>
    <g stroke="#5f9e3a" stroke-width="2"><path d="M26 36l-6-16M32 36V14M38 36l6-16"/></g>
    <g fill="#fff" ${S} stroke-width="1"><circle cx="20" cy="18" r="6"/><circle cx="32" cy="12" r="6"/><circle cx="44" cy="18" r="6"/></g>
    <g fill="#ffd54a"><circle cx="20" cy="18" r="2.4"/><circle cx="32" cy="12" r="2.4"/><circle cx="44" cy="18" r="2.4"/></g>`,
};

export function decorSvg(key) {
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${DECOR[key] ?? ''}</svg>`;
}
