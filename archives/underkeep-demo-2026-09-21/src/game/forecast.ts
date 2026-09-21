import { advanceTo } from './engine';
import { GameState } from './types';
import { HOUR } from './content';
export type ForecastPoint = { time: number; gold: number };
// Yield every simulated hour; never change the live seed, actors, timers or money.
export async function forecastGold(
  state: GameState,
  active: boolean,
  cancelled = () => false,
): Promise<ForecastPoint[]> {
  const points: ForecastPoint[] = [];
  const runs = Array.from({ length: 3 }, (_, i) => ({
    ...structuredClone(state),
    seed: (state.seed + i * 7919) >>> 0,
  }));
  points.push({ time: state.now, gold: state.gold });
  for (let hour = 1; hour <= 24; hour++) {
    if (cancelled()) return [];
    for (let i = 0; i < runs.length; i++)
      runs[i] = advanceTo(runs[i]!, state.now + hour * HOUR, active);
    points.push({
      time: state.now + hour * HOUR,
      gold: runs.reduce((n, s) => n + s.gold, 0) / runs.length,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return points;
}
