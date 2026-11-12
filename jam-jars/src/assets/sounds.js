// Звуки «Банок с вареньем» — синтез, без файлов. Небольшой случайный разброс высоты,
// чтобы повторяющиеся звуки (бульканье) не звучали одинаково.
import { tone, noise } from '../common/audio.js';

const vary = (x, spread = 0.08) => x * (1 + (Math.random() * 2 - 1) * spread);

export const SOUNDS = {
  // бульканье: несколько «пузырьков» с растущей высотой; больше слоёв — дольше
  pour(c, out, { count = 1 } = {}) {
    const bubbles = 3 + count * 2;
    for (let i = 0; i < bubbles; i++) {
      const f = vary(260 + i * 25, 0.15);
      tone(c, out, { type: 'sine', freq: f, freqEnd: f * 2.2, start: i * 0.045, dur: 0.07, gain: 0.22 });
    }
  },
  // щелчок крышки
  lid(c, out) {
    noise(c, out, { dur: 0.025, gain: 0.5, freq: 3000, q: 2 });
    tone(c, out, { type: 'sine', freq: 160, freqEnd: 60, dur: 0.09, gain: 0.35 });
    tone(c, out, { type: 'triangle', freq: vary(1320, 0.03), start: 0.05, dur: 0.12, gain: 0.08 });
  },
  select(c, out) {
    tone(c, out, { type: 'triangle', freq: vary(620, 0.04), dur: 0.05, gain: 0.12 });
  },
  invalid(c, out) {
    tone(c, out, { type: 'triangle', freq: 220, freqEnd: 170, dur: 0.14, gain: 0.2 });
  },
  reveal(c, out) {
    tone(c, out, { type: 'sine', freq: 1200, freqEnd: 1900, dur: 0.12, gain: 0.12 });
  },
  coin(c, out) {
    tone(c, out, { type: 'triangle', freq: 988, dur: 0.08, gain: 0.18 });
    tone(c, out, { type: 'triangle', freq: 1319, start: 0.07, dur: 0.16, gain: 0.18 });
  },
  tap(c, out) {
    tone(c, out, { type: 'sine', freq: 520, dur: 0.04, gain: 0.1 });
  },
  // похвала: быстрый восходящий перезвон, выше с каждой банкой подряд
  praise(c, out, { n = 2 } = {}) {
    const base = 660 * 2 ** ((Math.min(n, 5) - 2) / 12 * 2);
    [1, 1.25, 1.5].forEach((k, i) => tone(c, out, { type: 'triangle', freq: base * k, start: i * 0.06, dur: 0.16, gain: 0.16 }));
  },
  // короткая мелодия победы: до-ми-соль-до с колокольчиком
  win(c, out) {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      const last = i === notes.length - 1;
      tone(c, out, { type: 'triangle', freq: f, start: i * 0.13, dur: last ? 0.6 : 0.18, gain: 0.22 });
      tone(c, out, { type: 'sine', freq: f * 2, start: i * 0.13, dur: last ? 0.5 : 0.12, gain: 0.06 });
    });
  },
};
