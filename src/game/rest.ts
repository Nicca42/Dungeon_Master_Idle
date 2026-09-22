import { roomInterval } from './progression';
import { recoveryHours, fullyRecovered, ROOM_RECOVERY_INTERVAL } from './recovery';
import { GameState } from './types';
import { HOUR } from './content';
export function restRoster(g: GameState, floorId: number) {
  const floor = g.floors[floorId - 1]!;
  const roster = floor.restOccupants.flatMap((o) => {
    const actor = g.actors.find((a) => a.id === o.actorId && a.health > 0);
    if (!actor) return [];
    const hours = Math.ceil(recoveryHours(actor));
    return [{ actor, end: hours <= 0 ? g.now : o.recoverAt + (hours - 1) * roomInterval(g) }];
  });
  return roster;
}

export function restWaiters(g: GameState, floorId: number) {
  const f = g.floors[floorId - 1]!;
  const ids = new Set(
    g.parties
      .filter((p) => f.restQueue.includes(p.id))
      .flatMap((p) => p.members.filter((id) => !p.restedIds.includes(id))),
  );
  return g.actors.filter(
    (a) => a.health > 0 && ids.has(a.id) && !f.restOccupants.some((o) => o.actorId === a.id),
  );
}
