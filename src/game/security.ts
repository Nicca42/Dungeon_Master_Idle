import { staffTravelTime } from './staffSpeed';
import { Actor, GameState } from './types';
import { TICK } from './content';
export const ADVENTURER_SPAWN_X = 560;
export function securityPose(g: GameState, a: Actor, index: number) {
  const travel = staffTravelTime(g, a);
  const home = 110 + (index % 4) * 25;
  if (a.securitySpawnedAt !== undefined && g.now < a.securitySpawnedAt + travel) {
    const progress = Math.max(0, (g.now - a.securitySpawnedAt) / travel);
    return {
      x: ADVENTURER_SPAWN_X + (home - ADVENTURER_SPAWN_X) * progress,
      facing: -1,
      arriving: true,
    };
  }
  const threat =
    a.status === 'working' && a.health > 0 && a.stamina > 0
      ? g.escapedMobs
          .filter((m) => m.health > 0)
          .reduce<GameState['escapedMobs'][number] | undefined>(
            (nearest, mob) =>
              !nearest || Math.abs(mob.position - home) < Math.abs(nearest.position - home)
                ? mob
                : nearest,
            undefined,
          )
      : undefined;
  return {
    x: threat ? threat.position + (threat.position >= home ? -28 : 28) : home,
    facing: threat && threat.position < home ? -1 : 1,
    arriving: false,
  };
}
