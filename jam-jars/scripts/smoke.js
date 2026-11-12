// Дымовая проверка в Chrome: скриншоты на 320 и 480 px, ошибки консоли, прохождение уровня по решателю.
// node scripts/smoke.js [url]
import { chromium } from 'playwright-core';
import { generateLevel } from '../src/game/generator.js';

const url = process.argv[2] ?? 'http://localhost:5173/';
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const errors = [];

async function open(width, level, height = 640) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  page.on('console', (m) => m.type() === 'error' && errors.push(`[${width}px ур.${level}] ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`[${width}px ур.${level}] ${e.message}`));
  await page.goto(`${url}?level=${level}`);
  await page.waitForSelector('.slot');
  await page.waitForTimeout(400);
  return page;
}

// 1. скриншоты
for (const [w, lvl] of [[320, 1], [320, 35], [320, 170], [480, 12]]) {
  const page = await open(w, lvl);
  await page.screenshot({ path: `scripts/shots/w${w}-l${lvl}.png` });
  await page.close();
}

// 2. 14 банок в двух рядах + 2 добавленные на 320 px: ничего не обрезано
{
  const page = await open(320, 170, 568);
  const initial = await page.evaluate(() => ({ jars: document.querySelectorAll('.slot').length, rows: document.querySelectorAll('.board .row').length }));
  if (initial.jars !== 14 || initial.rows !== 2) errors.push(`уровень 170: ожидалось 14 банок в 2 рядах, получено ${JSON.stringify(initial)}`);
  for (let i = 0; i < 2; i++) {
    const before = await page.locator('.slot').count();
    await page.click('[data-act="jar"]');
    await page.waitForFunction((n) => document.querySelectorAll('.slot').length > n, before, { timeout: 6000 });
  }
  await page.waitForTimeout(400);
  const info = await page.evaluate(() => {
    const board = document.querySelector('.board').getBoundingClientRect();
    const out = [...document.querySelectorAll('.slot .jar')].filter((j) => {
      const r = j.getBoundingClientRect();
      return r.left < 0 || r.right > innerWidth || r.top < board.top - 1 || r.bottom > board.bottom + 1;
    }).length;
    return { jars: document.querySelectorAll('.slot').length, clipped: out };
  });
  console.log('320×568, уровень 170 + 2 банки:', info);
  await page.screenshot({ path: 'scripts/shots/w320-l170-16jars.png' });
  await page.close();
}

// 3. пройти уровень нажатиями по решению (быстро, без ожидания анимаций)
for (const lvl of [1, 35, 90]) {
  const level = generateLevel(lvl);
  const page = await open(360, lvl);
  for (const [f, t] of level.solution) {
    await page.tap(`.slot[data-i="${f}"]`);
    await page.tap(`.slot[data-i="${t}"]`);
  }
  await page.waitForSelector('.win-title', { timeout: 15000 });
  const title = await page.textContent('.win-title');
  console.log(`уровень ${lvl}: ${level.solution.length} ходов быстрыми нажатиями →`, title);
  if (lvl === 35) await page.screenshot({ path: 'scripts/shots/win-35.png' });
  await page.close();
}

// 4. середина анимации переливания
{
  const level = generateLevel(12);
  const page = await open(390, 12, 760);
  const [f, t] = level.solution[0];
  await page.tap(`.slot[data-i="${f}"]`);
  await page.screenshot({ path: 'scripts/shots/selected-12.png' });
  await page.tap(`.slot[data-i="${t}"]`);
  await page.waitForTimeout(260);
  await page.screenshot({ path: 'scripts/shots/pouring-12.png' });
  await page.close();
}

// 5. полный путь: подарок → уровень 1 → победа → перезапуск сохраняет уровень и монеты
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(`[путь] ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`[путь] ${e.message}`));
  await page.goto(url);
  await page.waitForSelector('.daily-grid');
  await page.screenshot({ path: 'scripts/shots/daily.png' });
  await page.click('.modal .btn-primary');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'scripts/shots/main.png' });
  await page.click('.btn-play');
  const level = generateLevel(1);
  for (const [f, t] of level.solution) {
    await page.tap(`.slot[data-i="${f}"]`);
    await page.tap(`.slot[data-i="${t}"]`);
  }
  await page.waitForSelector('.win-title', { timeout: 15000 });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: 'scripts/shots/win.png' });
  const coinsWin = await page.textContent('.coin-value');
  await page.reload();
  await page.waitForSelector('.btn-play');
  const playText = await page.textContent('.btn-play');
  const coinsAfter = await page.textContent('.coin-value');
  console.log(`после победы: монет ${coinsWin}; после перезапуска: «${playText}», монет ${coinsAfter}`);
  if (!playText.includes('уровень 2') || coinsAfter !== coinsWin) errors.push('прогресс не сохранился');
  await page.click('[data-menu="pantry"]');
  await page.waitForSelector('.pantry-shelf');
  await page.screenshot({ path: 'scripts/shots/pantry.png' });
  await ctx.close();
}

// 6. подсказка за монеты
{
  const ctx = await browser.newContext({ viewport: { width: 320, height: 640 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[подсказка] ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`[подсказка] ${m.text()}`));
  await page.goto(url);
  await page.evaluate(() => {
    const save = { schemaVersion: 1, rev: 50, level: 12, coins: 100, inventory: { undo: 5, jars: 0 }, noAds: false,
      daily: { streak: 1, lastDay: 99999 }, settings: { sound: false }, stats: { wins: 11 } };
    localStorage.setItem('jam-jars-save', JSON.stringify(save));
  });
  await page.goto(url);
  await page.click('.btn-play');
  await page.waitForSelector('.slot');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'scripts/shots/hint-before.png' });
  const handTarget = () => page.evaluate(() => {
    const h = document.querySelector('.hand');
    if (!h || h.style.display === 'none') return -1;
    const hr = h.getBoundingClientRect();
    const x = hr.left + 24, y = hr.top + 6;
    let best = -1, bestD = 1e9;
    document.querySelectorAll('.slot').forEach((s, i) => {
      const r = s.querySelector('.glass').getBoundingClientRect();
      const d = Math.hypot(r.left + r.width / 2 - x, r.top + r.height * 0.45 - y);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  });
  if ((await handTarget()) !== -1) errors.push('рука видна до подсказки');
  await page.click('[data-act="hint"]');
  await page.waitForTimeout(400);
  const coins1 = await page.textContent('.coin-value');
  const from = await handTarget();
  await page.screenshot({ path: 'scripts/shots/hint-shown.png' });
  await page.click('[data-act="hint"]'); // повторное нажатие не списывает
  const coins2 = await page.textContent('.coin-value');
  await page.tap(`.slot[data-i="${from}"]`);
  await page.waitForTimeout(350);
  const to = await handTarget();
  await page.tap(`.slot[data-i="${to}"]`);
  await page.waitForTimeout(700);
  const after = await handTarget();
  const undoEnabled = await page.evaluate(() => !document.querySelector('[data-act="undo"]').classList.contains('disabled'));
  console.log(`подсказка: монет 100 → ${coins1} (повторно: ${coins2}); рука ${from} → ${to}; ход сделан: ${undoEnabled}; рука после хода: ${after === -1 ? 'скрыта' : 'видна'}`);
  if (coins1 !== '70' || coins2 !== '70' || from < 0 || to < 0 || from === to || !undoEnabled || after !== -1) errors.push('подсказка работает неверно');
  await ctx.close();
}

console.log(errors.length ? `ОШИБКИ:\n${errors.join('\n')}` : 'Ошибок в консоли нет');
await browser.close();
process.exit(errors.length ? 1 : 0);
