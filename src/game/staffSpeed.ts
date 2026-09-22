import { Actor, GameState, Encounter } from './types';
import { HOUR, TICK } from './content';
import { rule } from './config';

export const staffSpeed = (s: GameState, a: Actor) =>
  Math.max(1, a.speed) * (s.research.includes('staffSpeed') ? 2 : 1);
export const staffTravelTime = (s: GameState, a: Actor, floors = 1) =>
  Math.ceil((TICK * Math.max(1, floors) * 10) / staffSpeed(s, a));

export function maintenanceWorkTime(
  s: GameState,
  a: Actor,
  trap?: Pick<Encounter, 'kind' | 'tier'>,
) {
  if (trap && ['trapdoor', 'arrows'].includes(trap.kind)) {
    const value = (key: string) => rule(s, `${trap.kind}.${key}`);
    const difficulty =
      value('resetDifficulty') +
      Math.max(0, (trap.tier ?? 1) - 1) * value('resetDifficultyPerLevel');
    const skill =
      staffSpeed(s, a) +
      a.intelligence +
      (s.research.includes('resetKits') ? 10 : s.research.includes('toolbelts') ? 5 : 0);
    // Only complete five-point steps change the default multiplier.
    const steps = Math.trunc((difficulty - skill) / value('resetSkillStep'));
    const multiplier = Math.max(
      value('resetMinimumPercent') / 100,
      1 + (steps * value('resetPercent')) / 100,
    );
    return Math.ceil(((value('resetMinutes') * HOUR) / 60) * multiplier);
  }
  return Math.ceil((rule(s, 'maintenanceHours') * HOUR * 10) / staffSpeed(s, a));
}
export function maintenanceTiming(
  s: GameState,
  a: Actor,
  floor: number,
  trap?: Pick<Encounter, 'kind' | 'tier'>,
) {
  const arriveAt = s.now + staffTravelTime(s, a, Math.abs(floor - (a.workFloor ?? 0)));
  return { arriveAt, until: arriveAt + maintenanceWorkTime(s, a, trap) };
}
