import { chromium } from 'playwright-core';
import { generateLevel } from '../src/game/generator.js';

const url = process.argv[2] ?? 'http://localhost:5173/';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const errors = [];
const external = new Set();
let checks = 0;

function check(condition, message) {
  checks++;
  if (!condition) errors.push(message);
}

async function makePage({ level = 1, coins = 0, undo = 5, jars = 0, noAds = false, width = 360, height = 740 } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(`[консоль] ${m.text()}`));
  page.on('pageerror', (e) => errors.push(`[страница] ${e.message}`));
  page.on('request', (r) => {
    const target = new URL(r.url());
    if (/^https?:$/.test(target.protocol) && !['localhost', '127.0.0.1'].includes(target.hostname)) external.add(target.href);
  });
  await page.goto(url);
  await page.evaluate((save) => {
    localStorage.clear();
    localStorage.setItem('jam-jars-save', JSON.stringify(save));
  }, {
    schemaVersion: 2, rev: 10, level, coins, inventory: { undo, jars }, noAds,
    daily: { streak: 1, lastDay: Math.floor(Date.now() / 86400000) },
    settings: { sound: false }, stats: { wins: level - 1, jars: (level - 1) * 6 },
  });
  await page.reload();
  await page.waitForSelector('.btn-play');
  return { context, page };
}

async function start(page) {
  await page.click('.btn-play');
  await page.waitForSelector('.slot');
}

async function solve(page, n) {
  const level = generateLevel(n);
  for (const [from, to] of level.solution) {
    await page.tap(`.slot[data-i="${from}"]`);
    await page.tap(`.slot[data-i="${to}"]`);
  }
  await page.waitForSelector('.win-title', { timeout: 20000 });
}

async function saved(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('jam-jars-save')));
}

try {
  {
    const { context, page } = await makePage();
    for (let n = 1; n <= 10; n++) {
      await start(page);
      await solve(page, n);
      if (n < 10) {
        await page.click('.win-buttons .btn-primary');
        if (n === 4) {
          await page.waitForSelector('.stub-ad', { timeout: 3000 });
          await page.waitForSelector('.stub-ad', { state: 'detached', timeout: 5000 });
        }
        await page.waitForFunction((next) => document.querySelector('.level-title')?.textContent.includes(`Уровень ${next}`), n + 1);
        await page.goBack().catch(() => {});
        await page.goto(url);
        await page.waitForSelector('.btn-play');
      }
    }
    await page.goto(url);
    const state = await saved(page);
    check(state.level === 11 && state.coins === 100, `10 уровней: ожидались уровень 11 и 100 монет, получено ${state.level} и ${state.coins}`);
    await context.close();
  }

  {
    const { context, page } = await makePage({ level: 4, coins: 100, undo: 0 });
    await page.click('[data-menu="shop"]');
    await page.waitForSelector('.shop-item');
    check(await page.locator('.shop-item').count() === 4, 'Магазин: не все четыре товара показаны');
    await page.screenshot({ path: 'scripts/shots/release-shop.png' });
    await page.click('[data-item="undo_10"]');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('jam-jars-save')).inventory.undo === 10);
    await page.click('[data-item="no_ads"]');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('jam-jars-save')).noAds === true);
    check(await page.locator('[data-item="no_ads"]').isDisabled(), 'Магазин: «Без рекламы» можно купить повторно');
    await page.click('[data-item="coins_150"]');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('jam-jars-save')).coins === 250);
    check(await page.locator('[data-item="no_ads"]').isDisabled(), 'Магазин: следующая покупка снова включила «Без рекламы»');
    await page.click('.shop-screen .icon-btn');
    await page.screenshot({ path: 'scripts/shots/release-main.png' });
    await start(page);
    const before = await page.locator('.slot').count();
    await page.click('[data-act="jar"]');
    await page.waitForSelector('.stub-ad');
    await page.waitForFunction((n) => document.querySelectorAll('.slot').length === n + 1, before, { timeout: 6000 });
    check((await saved(page)).noAds, 'Покупка «Без рекламы» отключила видео за награду');
    await solve(page, 4);
    await page.click('[data-act="double"]');
    await page.waitForFunction(() => document.querySelector('[data-act="double"]')?.textContent.includes('Награда удвоена'), { timeout: 6000 });
    check((await saved(page)).coins === 270, 'Удвоение: монеты начислены неверно');
    check(await page.locator('[data-act="double"]').isDisabled(), 'Удвоение доступно повторно');
    await page.screenshot({ path: 'scripts/shots/release-win-double.png' });
    await page.click('.win-buttons .btn-primary');
    await page.waitForFunction(() => document.querySelector('.level-title')?.textContent.includes('Уровень 5'));
    check(await page.locator('.stub-ad').count() === 0, '«Без рекламы» не отключило паузу между уровнями');
    await context.close();
  }

  {
    const { context, page } = await makePage({ undo: 0 });
    await start(page);
    const [from, to] = generateLevel(1).solution[0];
    await page.tap(`.slot[data-i="${from}"]`);
    await page.tap(`.slot[data-i="${to}"]`);
    await page.click('[data-act="undo"]');
    await page.waitForSelector('.modal');
    await page.click('.modal .btn-primary');
    await page.waitForSelector('.stub-ad');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('jam-jars-save')).inventory.undo === 4, { timeout: 6000 });
    check((await saved(page)).inventory.undo === 4, 'Видео за отмены: после награды и одной отмены должно остаться 4');
    await context.close();
  }

  {
    const { context, page } = await makePage({ width: 320, height: 568 });
    const playBox = await page.locator('.btn-play').boundingBox();
    check(playBox && playBox.y >= 0 && playBox.y + playBox.height <= 568, '320×568: кнопка «Играть» обрезана');
    await page.screenshot({ path: 'scripts/shots/release-main-320.png' });
    await start(page);
    await solve(page, 1);
    const nextBox = await page.locator('.win-buttons .btn-primary').boundingBox();
    check(nextBox && nextBox.y >= 0 && nextBox.y + nextBox.height <= 568, '320×568: кнопка следующего уровня обрезана');
    await page.screenshot({ path: 'scripts/shots/release-win-320.png' });
    await context.close();
  }

  check(external.size === 0, `Внешние запросы без VK: ${[...external].join(', ')}`);
} catch (e) {
  errors.push(e.stack);
} finally {
  await browser.close();
}

console.log(`Проверок: ${checks}`);
console.log(errors.length ? `ОШИБКИ:\n${errors.join('\n')}` : 'Релизный сценарий пройден, ошибок нет');
process.exit(errors.length ? 1 : 0);
