// Частота кадров во время переливания при замедленном процессоре (имитация недорогого Android).
// node scripts/perf.js [url]
import { chromium } from 'playwright-core';
import { generateLevel } from '../src/game/generator.js';

const url = process.argv[2] ?? 'http://localhost:5173/';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
for (const rate of [1, 4, 6]) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  const n = 170;
  await page.goto(`${url}?level=${n}`);
  await page.waitForSelector('.slot');
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    window.__frames = [];
    let last = performance.now();
    const tick = (t) => { window.__frames.push(t - last); last = t; if (window.__frames.length < 2000) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  const sol = generateLevel(n).solution.slice(0, 6);
  for (const [f, t] of sol) {
    await page.tap(`.slot[data-i="${f}"]`);
    await page.tap(`.slot[data-i="${t}"]`);
    await page.waitForTimeout(500);
  }
  const frames = await page.evaluate(() => window.__frames.slice(5));
  frames.sort((a, b) => a - b);
  const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
  const p95 = frames[Math.floor(frames.length * 0.95)];
  console.log(`CPU ×${rate}: средний кадр ${avg.toFixed(1)} мс (${(1000 / avg).toFixed(0)} к/с), 95% кадров быстрее ${p95.toFixed(1)} мс`);
  await ctx.close();
}
await browser.close();
