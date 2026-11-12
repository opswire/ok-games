// Раскладка банок по рядам: чистая функция без DOM.
// До 14 банок используем не больше двух рядов по ТЗ; для 15–16 разрешён третий.
// На 320 px семь банок в ряду физически не оставляют по 48 px на ячейку,
// поэтому там важнее сохранить двухрядное поле и увеличить высоту зоны нажатия.

export const MIN_SLOT = 48;
const MAX_SLOT = 92;
const ROW_OVERHEAD = 26; // полка, зазор между рядами
const ROW_LAYERS = 7.6; // высота ряда в слоях: подъём, крышка, горлышко, 4 слоя, запас
const JAR_OF_SLOT = 0.8; // ширина банки от ширины ячейки
const LAYER_OF_JAR = 0.5; // высота слоя от ширины банки (пропорция банки)

/** Разбить n банок на r рядов: верхние ряды не короче нижних. */
export function splitRows(n, r) {
  const base = Math.floor(n / r);
  const extra = n % r;
  return Array.from({ length: r }, (_, i) => base + (i < extra ? 1 : 0));
}

/**
 * @param {number} n — число банок
 * @param {number} width — доступная ширина поля, px
 * @param {number} height — доступная высота поля, px
 * @returns {{ rows: number[], slotW: number, layerPx: number, jarW: number }}
 */
export function chooseLayout(n, width, height) {
  const options = [];
  const maxRows = n <= 14 ? 2 : 3;
  for (let r = 1; r <= Math.min(maxRows, n); r++) {
    const perRow = Math.ceil(n / r);
    const slotW = Math.min(MAX_SLOT, width / perRow);
    const byHeight = (height / r - ROW_OVERHEAD) / ROW_LAYERS;
    const byWidth = slotW * JAR_OF_SLOT * LAYER_OF_JAR;
    const layerPx = Math.max(10, Math.floor(Math.min(byHeight, byWidth)));
    const jarW = Math.min(slotW * JAR_OF_SLOT, layerPx * 2.1);
    options.push({ rows: splitRows(n, r), slotW, layerPx, jarW });
  }
  const wide = options.filter((o) => o.slotW >= MIN_SLOT);
  const pool = wide.length ? wide : options;
  // крупнее слой — лучше; при равенстве — меньше рядов (спокойнее выглядит)
  return pool.reduce((best, o) => (o.layerPx > best.layerPx ? o : best));
}
