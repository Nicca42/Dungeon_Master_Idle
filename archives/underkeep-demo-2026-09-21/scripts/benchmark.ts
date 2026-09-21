import { performance } from 'node:perf_hooks';
import { advanceTo, demoState, validateState } from '../src/game/engine';
import { DAY } from '../src/game/content';

for (const days of [1, 30]) {
  const start = demoState();
  const t = performance.now();
  const result = validateState(advanceTo(start, start.now + days * 24 * DAY));
  console.log(
    JSON.stringify({
      realDays: days,
      gameDays: days * 24,
      milliseconds: Math.round((performance.now() - t) * 10) / 10,
      saveBytes: Buffer.byteLength(JSON.stringify(result)),
      admissions: result.totals.admissions,
      earnedGold: result.totals.income / 100,
      npcs: result.actors.length,
    }),
  );
}

// Foreground calls usually land between rules ticks; compare the old full-copy
// path with the shared-reference path using the same populated snapshot.
const foreground = demoState();
for (const mode of ['legacy-copy', 'shared-reference']) {
  const samples: number[] = [];
  for (let i = 0; i < 1100; i++) {
    const start = performance.now();
    if (mode === 'legacy-copy') {
      const copy = JSON.parse(JSON.stringify(foreground));
      copy.now = foreground.nextTick - 1;
    } else advanceTo(foreground, foreground.nextTick - 1);
    if (i >= 100) samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  console.log(
    JSON.stringify({ mode, samples: samples.length, medianMs: samples[500], p95Ms: samples[950] }),
  );
}
