import type { GameState } from './types';
import { DAY } from './content';
export const emptyDailyMetrics = () => ({
  adventurers: 0,
  parties: 0,
  entryGold: 0,
  traps: 0,
  treasureGold: 0,
  xp: 0,
  deaths: 0,
  levels: 0,
  levelGold: 0,
});
export type DailyMetrics = ReturnType<typeof emptyDailyMetrics>;
export type DailyReport = DailyMetrics & {
  day: number;
  since: number;
  end: number;
  partial: boolean;
};
export type DailyReports = { current: DailyReport; reports: DailyReport[] };
export function createDailyReports(now: number): DailyReports {
  const start = Math.floor(now / DAY) * DAY;
  return {
    current: {
      ...emptyDailyMetrics(),
      day: Math.floor(now / DAY) + 1,
      since: now,
      end: start + DAY,
      partial: now !== start,
    },
    reports: [],
  };
}
/** Midnight belongs to the new day. Retain 90 immutable daily summaries. */
export function rollDailyReports(s: GameState, at = s.now) {
  const daily = (s.dailyReports ??= createDailyReports(s.now));
  while (at >= daily.current.end) {
    daily.reports.push({ ...daily.current });
    const start = daily.current.end;
    daily.current = {
      ...emptyDailyMetrics(),
      day: daily.current.day + 1,
      since: start,
      end: start + DAY,
      partial: false,
    };
  }
  daily.reports = daily.reports.slice(-90);
  return daily;
}
export function dailyEvent(s: GameState, values: Partial<DailyMetrics>, at = s.now) {
  const current = rollDailyReports(s, at).current;
  for (const key of Object.keys(values) as (keyof DailyMetrics)[]) current[key] += values[key] ?? 0;
}
