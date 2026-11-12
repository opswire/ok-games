// Отчёт по уровням: решаемость, длина решения, усилие решателя, время генерации.
// node scripts/levels-report.js [from] [to]
import { generateLevel } from '../src/game/generator.js';

const from = Number(process.argv[2] ?? 1);
const to = Number(process.argv[3] ?? 500);
let maxMs = 0, maxAt = 0, totalMs = 0, attemptsSum = 0;
const rows = [];
for (let n = from; n <= to; n++) {
  const t0 = performance.now();
  const lvl = generateLevel(n);
  const ms = performance.now() - t0;
  totalMs += ms;
  attemptsSum += lvl.attempt;
  if (ms > maxMs) { maxMs = ms; maxAt = n; }
  const p = lvl.params;
  const tag = p.hard ? 'СЛОЖН' : p.secret ? 'СЕКР' : p.breather ? 'отдых' : '';
  rows.push(`${String(n).padStart(4)} сортов ${String(p.sorts).padStart(2)} решение ${String(lvl.solution.length).padStart(3)} состояний ${String(lvl.explored).padStart(6)} попытка ${lvl.attempt} ${ms.toFixed(1).padStart(6)} мс ${tag}`);
}
console.log(rows.join('\n'));
console.log(`\nУровни ${from}–${to}: среднее ${(totalMs / (to - from + 1)).toFixed(1)} мс, максимум ${maxMs.toFixed(1)} мс (уровень ${maxAt}), лишних попыток ${attemptsSum}`);
