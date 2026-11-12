// Свежие скриншоты всех экранов для ревью. Нужен запущенный `npm run dev`.
// node scripts/screenshots.js [url]  →  review-screenshots/
import { chromium } from 'playwright-core';
import { mkdirSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { generateLevel } from '../src/game/generator.js';

const url = process.argv[2] ?? 'http://localhost:5173/';
const OUT = 'review-screenshots';
mkdirSync(OUT, { recursive: true });
// удаляем только старые картинки — README.md с описанием остаётся
for (const f of readdirSync(OUT)) if (f.endsWith('.png')) rmSync(join(OUT, f));

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const errors = [];
const today = () => Math.floor(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) / 86400000);

function saveWith(over) {
  return {
    schemaVersion: 1, rev: 100, level: 1, coins: 0, inventory: { undo: 5, jars: 0 }, noAds: false,
    daily: { streak: 1, lastDay: today() }, settings: { sound: false }, stats: { wins: 0 }, ...over,
  };
}

async function page(width, height, save) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await p.goto(url);
  await p.evaluate((s) => {
    localStorage.clear();
    if (s) localStorage.setItem('jam-jars-save', JSON.stringify(s));
  }, save);
  return p;
}

async function shot(p, name) {
  await p.screenshot({ path: `${OUT}/${name}.png` });
  console.log('✓', name);
}

async function openLevel(p, n) {
  await p.goto(`${url}?level=${n}`);
  await p.waitForSelector('.slot');
  await p.waitForTimeout(500);
}

for (const [w, h] of [[360, 780], [320, 568]]) {
  const tag = `${w}px`;

  // новый игрок: подарок открывается сам
  let p = await page(w, h, null);
  await p.goto(url);
  await p.waitForSelector('.daily-grid');
  await p.waitForTimeout(400);
  await shot(p, `${tag}-01-daily-gift`);
  await p.click('.modal .btn-primary');
  await p.waitForTimeout(2500);
  await shot(p, `${tag}-02-main`);

  // уровень 1: обучение с рукой
  await p.click('.btn-play');
  await p.waitForSelector('.hand');
  await p.waitForTimeout(500);
  await shot(p, `${tag}-03-level1-tutorial`);
  const l1 = generateLevel(1);
  await p.tap(`.slot[data-i="${l1.solution[0][0]}"]`);
  await p.waitForTimeout(400);
  await shot(p, `${tag}-04-level1-jar-selected`);
  await p.context().close();

  // игровые экраны
  p = await page(w, h, saveWith({ level: 12, coins: 120 }));
  await openLevel(p, 12);
  await shot(p, `${tag}-05-level12-normal`);
  const l12 = generateLevel(12);
  // переливание в замедлении ×10: подход, струя, возврат
  await p.goto(`${url}?level=12&slowmo=10`);
  await p.waitForSelector('.slot');
  await p.waitForTimeout(500);
  await p.tap(`.slot[data-i="${l12.solution[0][0]}"]`);
  await p.tap(`.slot[data-i="${l12.solution[0][1]}"]`);
  await p.waitForTimeout(700);
  await shot(p, `${tag}-06a-pour-tilt`);
  await p.waitForTimeout(1300);
  await shot(p, `${tag}-06b-pour-stream`);
  await p.waitForTimeout(1300);
  await shot(p, `${tag}-06c-pour-stream-late`);
  await p.waitForTimeout(2000);
  await openLevel(p, 12);
  await p.click('[data-act="hint"]');
  await p.waitForTimeout(500);
  await shot(p, `${tag}-07-paid-hint`);
  await p.click('[data-act="restart"]');
  await p.waitForTimeout(400);
  await shot(p, `${tag}-08-restart-confirm`);

  await openLevel(p, 35);
  await shot(p, `${tag}-09-level35-secret-layers`);
  const l35 = generateLevel(35);
  for (const [f, t] of l35.solution.slice(0, 6)) {
    await p.tap(`.slot[data-i="${f}"]`);
    await p.tap(`.slot[data-i="${t}"]`);
  }
  await p.waitForTimeout(2500);
  await shot(p, `${tag}-10-level35-after-6-moves`);

  await openLevel(p, 170);
  await shot(p, `${tag}-11-level170-hard-14-jars`);
  for (let i = 0; i < 2; i++) {
    const before = await p.locator('.slot').count();
    await p.click('[data-act="jar"]');
    await p.waitForFunction((n) => document.querySelectorAll('.slot').length > n, before, { timeout: 6000 });
  }
  await p.waitForTimeout(400);
  await shot(p, `${tag}-12-level170-16-jars`);
  await p.context().close();

  // отмены кончились
  p = await page(w, h, saveWith({ level: 20, coins: 20, inventory: { undo: 0, jars: 0 } }));
  await openLevel(p, 20);
  const l20 = generateLevel(20);
  await p.tap(`.slot[data-i="${l20.solution[0][0]}"]`);
  await p.tap(`.slot[data-i="${l20.solution[0][1]}"]`);
  await p.waitForTimeout(700);
  await p.click('[data-act="undo"]');
  await p.waitForTimeout(400);
  await shot(p, `${tag}-13-out-of-undos`);
  await p.context().close();

  // победа (уровень 20 открывает полку и украшение)
  p = await page(w, h, saveWith({ level: 20, coins: 150 }));
  await openLevel(p, 20);
  for (const [f, t] of l20.solution) {
    await p.tap(`.slot[data-i="${f}"]`);
    await p.tap(`.slot[data-i="${t}"]`);
  }
  await p.waitForSelector('.win-title', { timeout: 20000 });
  await p.waitForTimeout(2500);
  await shot(p, `${tag}-14-win-with-unlocks`);
  await p.context().close();

  // кладовая с прогрессом 46 уровней
  p = await page(w, h, saveWith({ level: 47, coins: 380 }));
  await p.goto(url);
  await p.waitForSelector('.btn-play');
  await p.click('[data-menu="pantry"]');
  await p.waitForSelector('.pantry-shelf');
  await p.waitForTimeout(400);
  await shot(p, `${tag}-15-pantry-bottom`);
  await p.evaluate(() => (document.querySelector('.scroll').scrollTop = 0));
  await p.waitForTimeout(200);
  await shot(p, `${tag}-16-pantry-top`);
  await p.click('.icon-btn');
  await p.waitForSelector('.btn-play');
  await p.click('.topbar .icon-btn');
  await p.waitForTimeout(400);
  await shot(p, `${tag}-17-settings`);
  await p.context().close();

  // подарок на 5-й день ленты
  p = await page(w, h, saveWith({ level: 47, coins: 380, daily: { streak: 4, lastDay: today() - 1 } }));
  await p.goto(url);
  await p.waitForSelector('.daily-grid');
  await p.waitForTimeout(400);
  await shot(p, `${tag}-18-daily-gift-day5`);
  await p.context().close();
}

// новое: механики, задания, оформление, комнаты (только 360 px)
{
  const w = 360, h = 780, tag = '360px';
  let p = await page(w, h, saveWith({ level: 136, coins: 900 }));
  for (const [n, name] of [[66, 'small'], [101, 'lock'], [136, 'only']]) {
    await p.goto(`${url}?level=${n}`);
    await p.waitForSelector('.modal .btn-primary');
    await p.waitForTimeout(400);
    await shot(p, `${tag}-19-intro-${name}`);
    await p.click('.modal .btn-primary');
    await p.waitForTimeout(500);
    await shot(p, `${tag}-20-level-${name}`);
  }
  await p.goto(url);
  await p.waitForSelector('.btn-play');
  await p.waitForTimeout(500);
  await shot(p, `${tag}-21-main-kitchen`);
  // задание выполнено: подменяем прогресс первого задания
  await p.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('jam-jars-save'));
    s.quests.active[0].progress = s.quests.active[0].target;
    s.quests.active[1].progress = Math.floor(s.quests.active[1].target / 2);
    s.rev += 10;
    localStorage.setItem('jam-jars-save', JSON.stringify(s));
  });
  await p.reload();
  await p.waitForSelector('.btn-play');
  await p.click('[data-menu="quests"]');
  await p.waitForSelector('.quest-list');
  await p.waitForTimeout(300);
  await shot(p, `${tag}-22-quests`);
  await p.click('.modal .btn:not(.quest-claim)');
  await p.waitForTimeout(300);
  await p.click('[data-menu="decor"]');
  await p.waitForSelector('.shop-grid');
  await p.waitForTimeout(300);
  await shot(p, `${tag}-23-decor-lids`);
  await p.click('.shop-card:nth-child(6) .shop-btn');
  await p.waitForTimeout(300);
  await p.click('.tab:nth-child(2)');
  await p.waitForTimeout(300);
  await p.click('.shop-card:nth-child(4) .shop-btn');
  await p.waitForTimeout(300);
  await shot(p, `${tag}-24-decor-labels`);
  await p.context().close();

  p = await page(w, h, saveWith({ level: 47, coins: 100 }));
  await p.goto(url);
  await p.waitForSelector('.btn-play');
  await p.click('[data-menu="pantry"]');
  await p.waitForSelector('.room-scene');
  await p.evaluate(() => (document.querySelector('.scroll').scrollTop = 0));
  await p.waitForTimeout(300);
  await shot(p, `${tag}-25-room-pantry`);
  await p.context().close();

  p = await page(w, h, saveWith({ level: 275, coins: 100 }));
  await p.goto(url);
  await p.waitForSelector('.btn-play');
  await p.click('[data-menu="pantry"]');
  await p.waitForSelector('.room-scene');
  await p.evaluate(() => (document.querySelector('.scroll').scrollTop = 0));
  await p.waitForTimeout(300);
  await shot(p, `${tag}-26-room-veranda`);
  await p.context().close();
}

await browser.close();
console.log(errors.length ? `ОШИБКИ:\n${errors.join('\n')}` : 'Ошибок в консоли нет');
