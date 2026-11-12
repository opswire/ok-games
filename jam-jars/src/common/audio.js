// Звук: Web Audio, звуки синтезируются кодом (никаких чужих файлов).
// Игра регистрирует «рецепты» звуков через register(); здесь — общая громкость,
// выключатель, ограничитель на выходе и пауза при сворачивании вкладки.

let ctx = null;
let master = null;
let enabled = true;
let hidden = typeof document !== 'undefined' && document.hidden;
const recipes = {};

function ensureContext() {
  if (ctx) return ctx;
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  const limiter = ctx.createDynamicsCompressor(); // страховка от хрипа при наложении звуков
  limiter.threshold.value = -10;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.15;
  master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(limiter).connect(ctx.destination);
  return ctx;
}

/** Браузеры разрешают звук только после жеста игрока — вызываем при первом нажатии. */
export function unlock() {
  const c = ensureContext();
  if (c && c.state === 'suspended' && enabled && !hidden) c.resume();
}

export function register(map) {
  Object.assign(recipes, map);
}

export function setEnabled(on) {
  enabled = !!on;
  if (!ctx) return;
  if (enabled && !hidden) ctx.resume();
  else ctx.suspend();
}

export function isEnabled() {
  return enabled;
}

export function play(name, opts = {}) {
  if (!enabled || hidden) return;
  const c = ensureContext();
  if (!c || c.state !== 'running') return;
  const recipe = recipes[name];
  if (!recipe) return console.warn(`Нет звука: ${name}`);
  try {
    recipe(c, master, opts);
  } catch (e) {
    console.warn('Ошибка звука', name, e);
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden;
    if (!ctx) return;
    if (hidden) ctx.suspend();
    else if (enabled) ctx.resume();
  });
  // первый жест игрока «разблокирует» звук
  const first = () => unlock();
  document.addEventListener('pointerdown', first, { passive: true });
  document.addEventListener('keydown', first);
}

// ---------- помощники для рецептов ----------

/** Тон с огибающей: частота может плавно меняться от freq к freqEnd. */
export function tone(c, out, { type = 'sine', freq, freqEnd, start = 0, dur = 0.1, gain = 0.2, attack = 0.005 }) {
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(out);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Короткий шумовой щелчок через полосовой фильтр. */
export function noise(c, out, { start = 0, dur = 0.03, gain = 0.3, freq = 2500, q = 1 }) {
  const t0 = c.currentTime + start;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(out);
  src.start(t0);
}

export const audio = { play, register, setEnabled, isEnabled, unlock };
