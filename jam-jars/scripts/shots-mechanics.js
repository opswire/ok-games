// Скриншоты уровней с механиками: окно знакомства и поле.
import { chromium } from 'playwright-core';
const url = process.argv[2] ?? 'http://localhost:5173/';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
for (const n of process.argv.slice(3).map(Number)) {
  await page.goto(`${url}?level=${n}`);
  await page.waitForSelector('.slot');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `scripts/shots/mech-${n}-a.png` });
  const intro = await page.$('.modal .btn-primary');
  if (intro) { await intro.click(); await page.waitForTimeout(400); }
  await page.screenshot({ path: `scripts/shots/mech-${n}-b.png` });
}
console.log(errors.length ? errors.join('\n') : 'Ошибок нет');
await browser.close();
