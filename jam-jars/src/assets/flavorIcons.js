// Значки сортов (свой рисунок, viewBox 0 0 24 24). Дублируют цвет слоя,
// чтобы сорта различались и при дальтонизме. Белая заливка с тёмным контуром
// читается на любом цвете варенья.

const ICONS = [
  // 0 клубника: ягода-сердечко с хвостиком
  '<path d="M12 21C7 18 4 14 4 10.5 4 8 6 6.5 8.2 6.8 9.8 7 11 8 12 9c1-1 2.2-2 3.8-2.2C18 6.5 20 8 20 10.5 20 14 17 18 12 21z"/><path d="M9 4.5 12 7l3-2.5" fill="none" stroke-width="2"/>',
  // 1 малина: купол из зёрнышек
  '<circle cx="12" cy="8" r="3"/><circle cx="8" cy="12" r="3"/><circle cx="16" cy="12" r="3"/><circle cx="12" cy="13" r="3"/><circle cx="10" cy="17" r="3"/><circle cx="14" cy="17" r="3"/>',
  // 2 абрикос: круг с бороздкой
  '<circle cx="12" cy="13" r="8"/><path d="M12 5.5c-2.5 3-2.5 12 0 15" fill="none" stroke-width="1.8"/>',
  // 3 смородина: гроздь из четырёх ягод на веточке
  '<path d="M12 2v5" fill="none" stroke-width="2"/><circle cx="8.5" cy="11" r="3.4"/><circle cx="15.5" cy="11" r="3.4"/><circle cx="8.5" cy="18" r="3.4"/><circle cx="15.5" cy="18" r="3.4"/>',
  // 4 крыжовник: овал с прожилками
  '<ellipse cx="12" cy="13" rx="6.5" ry="8"/><path d="M12 5v16M8.5 7.5c-1.5 3.5-1.5 7.5 0 11M15.5 7.5c1.5 3.5 1.5 7.5 0 11" fill="none" stroke-width="1.4"/>',
  // 5 вишня: две ягоды на сходящихся черешках
  '<path d="M7 15C8 9 11 5 16 3M17 15c0-5-.5-9-1-12" fill="none" stroke-width="2"/><circle cx="7" cy="17" r="4"/><circle cx="17" cy="17" r="4"/>',
  // 6 слива: овал с листиком
  '<ellipse cx="11" cy="14" rx="6.5" ry="7.5" transform="rotate(-15 11 14)"/><path d="M13 6c2-3 5-3.5 7-3-1 2.5-3.5 4-7 3z"/>',
  // 7 облепиха: веточка с ягодами
  '<path d="M4 21 20 3" fill="none" stroke-width="2"/><ellipse cx="7.5" cy="14" rx="2.3" ry="3"/><ellipse cx="13" cy="15.5" rx="2.3" ry="3"/><ellipse cx="11" cy="8" rx="2.3" ry="3"/><ellipse cx="17" cy="10" rx="2.3" ry="3"/>',
  // 8 черника: ягода с венчиком-звёздочкой
  '<circle cx="12" cy="13" r="8"/><path d="m12 7.5 1.2 2.6 2.8.3-2.1 1.9.6 2.8L12 13.7l-2.5 1.4.6-2.8L8 10.4l2.8-.3z" fill="currentColor" stroke="none"/>',
  // 9 яблоко
  '<path d="M12 8c-2-1.5-7-1.5-7 4.5 0 4.5 3 8.5 5 8.5 1 0 1.5-.5 2-.5s1 .5 2 .5c2 0 5-4 5-8.5C19 6.5 14 6.5 12 8z"/><path d="M12 8c0-2 .5-3.5 2-5" fill="none" stroke-width="2"/>',
  // 10 груша
  '<path d="M12 5c-2 0-2.5 2-2.5 4 0 2-4 3.5-4 7.5 0 3 2.8 5 6.5 5s6.5-2 6.5-5c0-4-4-5.5-4-7.5 0-2-.5-4-2.5-4z"/><path d="M12 5c0-1.3.4-2.3 1.5-3" fill="none" stroke-width="2"/>',
  // 11 брусника: веточка с тремя ягодами и листком
  '<circle cx="7" cy="16" r="3.4"/><circle cx="13" cy="18" r="3.4"/><circle cx="11.5" cy="11.5" r="3.4"/><path d="M14 9c1.5-4 4.5-6 7-6-.5 3.5-3 6-7 6z"/>',
];

export function flavorIconSvg(id) {
  return (
    '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' +
    '<g fill="#fff" stroke="rgba(40,20,10,.55)" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round" color="rgba(40,20,10,.55)">' +
    ICONS[id] +
    '</g></svg>'
  );
}

/** Рука-указатель для обучения. */
export const HAND_SVG =
  '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M26 6c3 0 5 2 5 5v17l2-1c2-1 5 0 6 2 2-1 5 0 6 2 2-1 5 1 5 4v12c0 8-6 14-14 14h-3c-5 0-9-2-12-6L11 42c-2-2-2-5 0-7s5-2 7 0l3 3V11c0-3 2-5 5-5z" fill="#fff" stroke="#5a3a22" stroke-width="3" stroke-linejoin="round"/></svg>';

/** Значок как отдельная картинка (для Canvas): белый рисунок с контуром. */
export function flavorIconDataUrl(id, size = 48) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">` +
    '<g fill="#fff" stroke="rgba(40,20,10,.55)" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round" color="rgba(40,20,10,.55)">' +
    ICONS[id] +
    '</g></svg>';
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Внутренность значка без обёртки — для вставки во вложенный SVG. */
export function flavorIconInner(id, { fill = '#fff', stroke = 'rgba(40,20,10,.55)' } = {}) {
  return (
    `<g fill="${fill}" stroke="${stroke}" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round" color="${stroke}">` +
    ICONS[id] +
    '</g>'
  );
}
