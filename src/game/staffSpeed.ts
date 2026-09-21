import { Actor, GameState } from './types';
import { HOUR, TICK } from './content';
import { rule } from './config';

export const staffSpeed = (s: GameState, a: Actor) =>
  Math.max(1, a.speed) * (s.research.includes('staffSpeed') ? 2 : 1);
export const staffTravelTime = (s: GameState, a: Actor, floors = 1) =>
  Math.ceil((TICK * Math.max(1, floors) * 10) / staffSpeed(s, a));
export function maintenanceTiming(s: GameState, a: Actor, floor: number, tier = 1) {
  const arriveAt = s.now + staffTravelTime(s, a, Math.abs(floor - (a.workFloor ?? 0)));
  const work = (rule(s, 'maintenanceHours') * HOUR * (tier >= 2 ? 1.5 : 1) * 10) / staffSpeed(s, a);
  return { arriveAt, until: arriveAt + Math.ceil(work) };
}
