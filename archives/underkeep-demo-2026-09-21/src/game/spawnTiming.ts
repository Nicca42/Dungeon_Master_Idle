import { GameState, Encounter } from './types';
import { rule, arrivalInterval } from './config';
import { HOUR, TICK } from './content';
export const arrivalSequence = (s: GameState) =>
  s.arrivalSequence ?? Math.max(0, Math.floor(s.nextArrivalAt / HOUR) - 1);
export const arrivalOffset = (s: GameState, point: number) =>
  (point - (arrivalSequence(s) % s.spawnPoints) + s.spawnPoints) % s.spawnPoints;
export const arrivalAt = (s: GameState, point: number) =>
  s.nextArrivalAt + (arrivalOffset(s, point) * arrivalInterval(s)) / s.spawnPoints;
const nests = (s: GameState) =>
  s.floors
    .filter((f) => f.stage === 'open')
    .flatMap((f) =>
      f.encounters.filter(
        (e) =>
          !e.destroyed &&
          !e.roaming &&
          e.installed !== false &&
          ['zombie', 'slime'].includes(e.kind),
      ),
    );
export function mobReadyAt(s: GameState, e: Encounter, from: number) {
  const all = nests(s);
  const index = all.findIndex((x) => x.id === e.id);
  if (index < 0) return from;
  const period = rule(s, `${e.kind}.spawnHours`) * HOUR;
  const sameRate = all.filter((x) => rule(s, `${x.kind}.spawnHours`) * HOUR === period);
  const fastPeriod = Math.min(...all.map((x) => rule(s, `${x.kind}.spawnHours`) * HOUR));
  const fastCount = all.filter((x) => rule(s, `${x.kind}.spawnHours`) * HOUR === fastPeriod).length;
  // Spread equal-rate nests evenly; place the slower cohort between faster arrivals.
  const phase =
    (period * (sameRate.findIndex((x) => x.id === e.id) + 1)) / sameRate.length +
    (period === fastPeriod ? 0 : fastPeriod / fastCount / 2);
  return Math.ceil((phase + Math.ceil((from - phase) / period) * period) / TICK) * TICK;
}
export function staggerMobs(s: GameState) {
  const all = nests(s);
  const key = all.map((e) => `${e.id}:${rule(s, `${e.kind}.spawnHours`)}`).join(',');
  if (key === s.mobScheduleKey) return;
  const previous = new Set((s.mobScheduleKey ?? '').split(',').map((x) => Number(x.split(':')[0])));
  s.mobScheduleKey = key;
  for (const e of all)
    if (!e.active && e.readyAt > s.now)
      e.readyAt = mobReadyAt(
        s,
        e,
        previous.has(e.id) ? Math.max(e.readyAt, s.now + TICK) : s.now + TICK,
      );
  for (const f of s.floors) {
    const own = all.filter((e) => f.encounters.includes(e));
    if (own.length) f.spawnAt = Math.min(...own.map((e) => e.readyAt));
  }
}
