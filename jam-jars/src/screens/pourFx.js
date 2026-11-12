// Переливание на Canvas: наклон банки, горизонтальная поверхность варенья при любом наклоне
// (объём каждого слоя сохраняется), струя, волна в банке-получателе, брызги, искры.
//
// Пока идёт анимация, обе банки (источник и получатель) рисуются здесь, а их SVG на полке
// скрыты. Геометрия общая с jarArt.js, поэтому подмена незаметна.

import flavors from '../data/flavors.json';
import { flavorIconDataUrl } from '../assets/flavorIcons.js';
import { jarGeometry, bodyPath, cavityPath, rimPath, jamStops, shade } from './jarArt.js';

const DEG = Math.PI / 180;

// ---------- геометрия жидкости ----------

/** Отсечь многоугольник полуплоскостью y >= Y (кромка жидкости, ось y вниз). */
function clipBelow(poly, Y) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ina = a[1] >= Y;
    const inb = b[1] >= Y;
    if (ina) out.push(a);
    if (ina !== inb) {
      const t = (Y - a[1]) / (b[1] - a[1]);
      out.push([a[0] + (b[0] - a[0]) * t, Y]);
    }
  }
  return out;
}

function area(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

function rot([x, y], a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x * c - y * s, x * s + y * c];
}

/**
 * Уровни (координата y относительно центра поворота) для накопленных объёмов.
 * cavity — полость как прямоугольник в координатах относительно центра поворота.
 */
function levelsFor(cavity, angle, volumes) {
  const poly = cavity.map((p) => rot(p, angle));
  const ys = poly.map((p) => p[1]);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return volumes.map((v) => {
    if (v <= 0) return maxY;
    let lo = minY;
    let hi = maxY;
    for (let k = 0; k < 28; k++) {
      const mid = (lo + hi) / 2;
      if (area(clipBelow(poly, mid)) > v) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  });
}

// ---------- значки для Canvas ----------

const iconImages = flavors.map((fl) => {
  if (typeof Image === 'undefined') return null;
  const img = new Image();
  img.src = flavorIconDataUrl(fl.id, 64);
  return img;
});

// ---------- рисование банки ----------

function makeJar(W, L, cap = 4) {
  const g = jarGeometry(W, L, cap);
  return {
    g,
    body: new Path2D(bodyPath(g)),
    cavity: new Path2D(cavityPath(g)),
    rim: new Path2D(rimPath(g)),
    // полость прямоугольником относительно центра банки (для объёмов)
    cavRect: [
      [g.t - W / 2, g.cavTop - g.H / 2],
      [W - g.t - W / 2, g.cavTop - g.H / 2],
      [W - g.t - W / 2, g.cavBottom - g.H / 2],
      [g.t - W / 2, g.cavBottom - g.H / 2],
    ],
  };
}

let texturePattern = null;
function texture(ctx) {
  if (texturePattern) return texturePattern;
  const c = document.createElement('canvas');
  c.width = c.height = 14;
  const x = c.getContext('2d');
  const dot = (cx, cy, rx, ry, color) => {
    x.fillStyle = color;
    x.beginPath();
    x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    x.fill();
  };
  dot(3, 4, 1.1, 1.1, 'rgba(40,10,0,.22)');
  dot(10, 9, 0.9, 0.9, 'rgba(40,10,0,.18)');
  dot(9, 3, 2.4, 1.4, 'rgba(255,255,255,.14)');
  dot(4, 11, 2, 1.2, 'rgba(0,0,0,.08)');
  dot(12.5, 12.5, 0.7, 0.7, 'rgba(255,240,200,.35)');
  texturePattern = ctx.createPattern(c, 'repeat');
  return texturePattern;
}

/**
 * Нарисовать банку.
 * pose: { px, py — центр поворота (центр банки) на экране, angle — радианы }
 * liquid: [{ sort, hidden, amount }] снизу вверх; amount — в слоях (может быть дробным)
 * wave: { amp, phase } — волна на поверхности
 */
function drawJar(ctx, jar, pose, liquid, wave) {
  const { g } = jar;
  const { W, L } = g;
  const { px, py, angle } = pose;
  const toLocal = ([x, y]) => {
    const [lx, ly] = rot([x, y], -angle);
    return [lx + W / 2, ly + g.H / 2];
  };

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angle);
  ctx.translate(-W / 2, -g.H / 2);

  ctx.fillStyle = 'rgba(255,255,255,.42)';
  ctx.fill(jar.body);

  // жидкость
  const total = liquid.reduce((s, l) => s + l.amount, 0);
  if (total > 0.001) {
    const cum = [];
    let acc = 0;
    for (const l of liquid) {
      acc += l.amount;
      cum.push(acc * g.cavW * L);
    }
    const levels = levelsFor(jar.cavRect, angle, cum);
    ctx.save();
    ctx.clip(jar.cavity);
    const big = W * 3;
    let bottomY = big;
    liquid.forEach((l, i) => {
      if (l.amount <= 0.001) return;
      const topY = levels[i];
      const isTop = i === liquid.length - 1 || liquid.slice(i + 1).every((x) => x.amount <= 0.001);
      // полоса слоя в мировых координатах → в координаты банки
      const pts = [];
      const N = isTop ? 18 : 1;
      for (let k = 0; k <= N; k++) {
        const x = -big + (2 * big * k) / N;
        const y = isTop && wave ? topY + wave.amp * Math.sin(x * (2.2 / W) * Math.PI + wave.phase) : topY;
        pts.push([x, y]);
      }
      pts.push([big, bottomY], [-big, bottomY]);
      ctx.beginPath();
      pts.map(toLocal).forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      if (l.hidden) {
        ctx.fillStyle = '#857669';
        ctx.fill();
      } else {
        const grad = ctx.createLinearGradient(g.t, 0, W - g.t, 0);
        for (const [o, c] of jamStops(flavors[l.sort].color)) grad.addColorStop(o, c);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.fillStyle = texture(ctx);
        ctx.fill();
      }
      // глянец на поверхности
      if (isTop) {
        ctx.beginPath();
        pts.slice(0, N + 1).map(toLocal).forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.strokeStyle = l.hidden ? 'rgba(255,255,255,.35)' : shade(flavors[l.sort].color, 0.4);
        ctx.lineWidth = Math.max(1.5, L * 0.16);
        ctx.globalAlpha = 0.8;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // значок сорта посередине слоя
      const band = clipBelow(jar.cavRect.map((p) => rot(p, angle)), topY).filter((p) => p[1] <= bottomY + 0.01);
      if (band.length >= 3 && bottomY - topY > L * 0.55) {
        const cx = band.reduce((s, p) => s + p[0], 0) / band.length;
        const cy = (topY + Math.min(bottomY, Math.max(...band.map((p) => p[1])))) / 2;
        const [lx, ly] = toLocal([cx, cy]);
        const s = Math.min(L * 0.78, W * 0.5);
        if (l.hidden) {
          ctx.fillStyle = '#fff';
          ctx.font = `900 ${Math.round(L * 0.78)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('?', lx, ly);
        } else {
          const img = iconImages[l.sort];
          if (img?.complete && img.naturalWidth) ctx.drawImage(img, lx - s / 2, ly - s / 2, s, s);
        }
      }
      bottomY = topY;
    });
    ctx.restore();
  }

  // стекло поверх
  const glass = ctx.createLinearGradient(0, 0, W, 0);
  glass.addColorStop(0, 'rgba(255,255,255,.55)');
  glass.addColorStop(0.22, 'rgba(255,255,255,.18)');
  glass.addColorStop(0.7, 'rgba(255,255,255,.08)');
  glass.addColorStop(1, 'rgba(255,255,255,.4)');
  ctx.fillStyle = glass;
  ctx.fill(jar.body);
  ctx.strokeStyle = 'rgba(92,60,36,.42)';
  ctx.lineWidth = Math.max(1.4, W * 0.035);
  ctx.stroke(jar.body);
  const shineW = Math.max(2, W * 0.09);
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath();
  ctx.roundRect?.(g.t + W * 0.06, g.cavTop + L * 0.2, shineW, g.cavBottom - g.cavTop - L * 0.6, shineW / 2);
  ctx.fill();
  const rimGrad = ctx.createLinearGradient(0, 0, W, 0);
  rimGrad.addColorStop(0, '#e9e2d6');
  rimGrad.addColorStop(0.35, '#fffdf8');
  rimGrad.addColorStop(1, '#cfc4b2');
  ctx.fillStyle = rimGrad;
  ctx.fill(jar.rim);
  ctx.strokeStyle = 'rgba(92,60,36,.4)';
  ctx.lineWidth = 1.2;
  ctx.stroke(jar.rim);
  ctx.restore();
}

// ---------- частицы ----------

function drawParticles(ctx, particles, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const k = p.life / p.max;
    ctx.globalAlpha = Math.min(1, k * 1.5);
    ctx.fillStyle = p.color;
    if (p.star) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot + (1 - k) * 3);
      const r = p.r * (0.5 + k * 0.5);
      ctx.beginPath();
      for (let j = 0; j < 8; j++) {
        const rr = j % 2 ? r * 0.4 : r;
        const a = (j * Math.PI) / 4;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// ---------- плавность ----------

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const easeOut = (t) => 1 - (1 - t) ** 3;
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const lerp = (a, b, t) => a + (b - a) * t;

function bezier(p0, p1, p2, t) {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
}

// ---------- слой эффектов ----------

export function createPourFx(host) {
  const canvas = document.createElement('canvas');
  canvas.className = 'fx-canvas';
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let dpr = 1;
  let raf = 0;
  let scene = null; // текущее переливание
  const particles = [];
  let last = 0;

  function fit() {
    const r = host.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(r.width * dpr);
    const h = Math.round(r.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (scene) scene.frame(now, dt);
    drawParticles(ctx, particles, dt);
    if (scene || particles.length) raf = requestAnimationFrame(loop);
    else {
      raf = 0;
      last = 0;
    }
  }

  function kick() {
    if (!raf) raf = requestAnimationFrame(loop);
  }

  /**
   * Переливание. src/dst: { x, y — где на экране точка (0,0) геометрии банки, W, L,
   *   liquid: [{ sort, hidden }] снизу вверх (до хода) }, lift — на сколько поднят источник.
   * Возвращает Promise, который выполняется по окончании; onStream — момент начала струи.
   */
  function pour({ src, dst, count, sort, duration, lift = 0, onStream }) {
    fit();
    const hostRect = host.getBoundingClientRect();
    const sJar = makeJar(src.W, src.L, src.cap);
    const dJar = makeJar(dst.W, dst.L, dst.cap);
    const sg = sJar.g;
    const dg = dJar.g;
    const toHost = (x, y) => [x - hostRect.left, y - hostRect.top];

    const sHome = toHost(src.x + src.W / 2, src.y + sg.H / 2);
    const dHome = toHost(dst.x + dst.W / 2, dst.y + dg.H / 2);
    // наклоняем так, чтобы корпус банки уходил к середине экрана, а не за край
    const dir = dHome[0] >= hostRect.width / 2 ? 1 : -1;
    const lipLocal = [dir > 0 ? (src.W + sg.rimW) / 2 - src.W / 2 : (src.W - sg.rimW) / 2 - src.W / 2, -sg.H / 2];
    // куда смотрит горлышко: чуть сбоку от центра получателя, над его горлышком
    const target = [dHome[0] - dir * dst.W * 0.1, dHome[1] - dg.H / 2 - dst.L * 0.5];
    const poseAt = (angle) => {
      const [lx, ly] = rot(lipLocal, angle);
      return [target[0] - lx, target[1] - ly];
    };

    const remaining = src.liquid.length - count;
    const a1 = 50 * DEG * dir;
    const a2 = (95 - 8 * remaining) * DEG * dir;
    const srcBefore = src.liquid.map((l) => ({ ...l, amount: 1 }));
    const dstLayers = dst.liquid.map((l) => ({ ...l, amount: 1 }));
    const incoming = { sort, hidden: false, amount: 0 };
    dstLayers.push(incoming);
    const color = flavors[sort].color;

    const T1 = 0.28; // подход и наклон
    const T2 = 0.8; // конец струи
    let start = 0;
    let streamStarted = false;
    let waveAmp = 0;
    let wavePhase = 0;

    return new Promise((resolve) => {
      scene = {
        cancel: () => resolve(false),
        frame(now, dt) {
          if (!start) start = now;
          const p = clamp01((now - start) / duration);
          let angle;
          let pivot;
          let flow = 0; // 0..1 сколько уже вылилось
          if (p < T1) {
            const k = easeInOut(p / T1);
            angle = a1 * k;
            const to = poseAt(a1);
            pivot = [lerp(sHome[0], to[0], k), lerp(sHome[1] - lift, to[1], k)];
          } else if (p < T2) {
            const k = (p - T1) / (T2 - T1);
            angle = lerp(a1, a2, easeOut(k));
            pivot = poseAt(angle);
            flow = clamp01(k * 1.08);
          } else {
            const k = easeInOut((p - T2) / (1 - T2));
            angle = lerp(a2, 0, k);
            const from = poseAt(a2);
            pivot = [lerp(from[0], sHome[0], k), lerp(from[1], sHome[1], k)];
            flow = 1;
          }

          // объёмы: источник теряет, получатель набирает с небольшим запаздыванием (струя летит)
          const outAmount = count * flow;
          const srcLiquid = srcBefore.map((l) => ({ ...l }));
          let left = outAmount;
          for (let i = srcLiquid.length - 1; i >= 0 && left > 0; i--) {
            const take = Math.min(srcLiquid[i].amount, left);
            srcLiquid[i].amount -= take;
            left -= take;
          }
          const arrived = count * clamp01(flow * 1.12 - 0.1);
          incoming.amount = arrived;
          const dstLiquid = [...dstLayers.slice(0, -1), { ...incoming, amount: Math.max(0, arrived) }];

          // волна в получателе: раскачивается, пока бьёт струя, потом затухает
          const streaming = p >= T1 && p < T2 + 0.06;
          waveAmp = streaming ? Math.min(dst.L * 0.14, waveAmp + dt * dst.L * 1.4) : waveAmp * Math.exp(-dt * 7);
          wavePhase += dt * 14;

          // уровень поверхности в получателе (экранные координаты)
          const dTotal = dstLiquid.reduce((s, l) => s + l.amount, 0);
          const surfaceY = dHome[1] - dg.H / 2 + dg.cavBottom - dTotal * dst.L;

          drawJar(ctx, dJar, { px: dHome[0], py: dHome[1], angle: 0 }, dstLiquid, { amp: waveAmp, phase: wavePhase });

          // струя
          if (p >= T1 && p < T2 + 0.08) {
            if (!streamStarted) {
              streamStarted = true;
              onStream?.();
            }
            const [lx, ly] = rot(lipLocal, angle);
            const lip = [pivot[0] + lx, pivot[1] + ly];
            const end = [target[0] + dir * dst.W * 0.08, surfaceY];
            const ctrl = [lip[0] + dir * dst.L * 0.6, lip[1] + (end[1] - lip[1]) * 0.25];
            const k = (p - T1) / (T2 + 0.08 - T1);
            const head = clamp01(k / 0.22); // струя дотягивается до поверхности
            const tail = clamp01((k - 0.82) / 0.18); // хвост отрывается от горлышка
            if (head > tail) {
              const width = Math.max(3, dst.L * 0.34) * (1 - tail * 0.6);
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              const path = () => {
                ctx.beginPath();
                for (let i = 0; i <= 14; i++) {
                  const t = lerp(tail, head, i / 14);
                  const [x, y] = bezier(lip, ctrl, end, t);
                  const wob = Math.sin(now / 40 + t * 9) * width * 0.08;
                  if (i) ctx.lineTo(x + wob, y);
                  else ctx.moveTo(x + wob, y);
                }
              };
              path();
              ctx.strokeStyle = shade(color, -0.12);
              ctx.lineWidth = width;
              ctx.stroke();
              path();
              ctx.strokeStyle = shade(color, 0.35);
              ctx.globalAlpha = 0.6;
              ctx.lineWidth = Math.max(1, width * 0.28);
              ctx.stroke();
              ctx.globalAlpha = 1;
              // брызги в месте удара
              if (head >= 1 && Math.random() < 0.9) {
                for (let s = 0; s < 2; s++) {
                  particles.push({
                    x: end[0] + (Math.random() - 0.5) * width,
                    y: end[1] - 1,
                    vx: (Math.random() - 0.5) * 140,
                    vy: -60 - Math.random() * 120,
                    g: 900,
                    r: (0.9 + Math.random() * 1.4) * Math.max(1, dst.L / 18),
                    color: Math.random() < 0.3 ? shade(color, 0.35) : color,
                    life: 0.28,
                    max: 0.28,
                  });
                }
              }
            }
          }

          drawJar(ctx, sJar, { px: pivot[0], py: pivot[1], angle }, srcLiquid, { amp: dst.L * 0.05 * flow * (1 - flow), phase: wavePhase });

          if (p >= 1) {
            scene = null;
            resolve(true);
          }
        },
      };
      kick();
    });
  }

  /** Искры над собранной банкой. x, y — экранные координаты. */
  function burst(x, y, size = 20) {
    fit();
    const r = host.getBoundingClientRect();
    const colors = ['#ffd54a', '#fff3b0', '#ffb347', '#ffffff'];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
      const v = 80 + Math.random() * 110;
      particles.push({
        x: x - r.left,
        y: y - r.top,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 60,
        g: 260,
        r: size * (0.2 + Math.random() * 0.18),
        color: colors[i % colors.length],
        star: true,
        rot: Math.random() * 3,
        life: 0.7,
        max: 0.7,
      });
    }
    kick();
  }

  function cancel() {
    if (scene) {
      const s = scene;
      scene = null;
      s.cancel();
    }
    particles.length = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  return { pour, burst, cancel, canvas };
}

export const __test = { clipBelow, area, levelsFor, rot };
