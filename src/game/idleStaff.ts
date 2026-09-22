import { GameState } from './types';
import { upgradingFloor } from './research';
import { staffRoom } from './staffRest';
/** Staff resting in beds or defending the entrance are not inactive office occupants. */
export function inactiveOfficeStaff(s: GameState, travelling: ReadonlySet<number> = new Set()) {
  const digging =
    !!upgradingFloor(s) ||
    s.floors.some((f) => ['queued', 'excavating', 'foundation', 'furnishing'].includes(f.stage));
  const room = staffRoom(s);
  return s.actors.filter(
    (a) =>
      ['maintenance', 'miner'].includes(a.role) &&
      a.health > 0 &&
      a.status === 'working' &&
      !a.task &&
      !a.workFloor &&
      !a.returnUntil &&
      !travelling.has(a.id) &&
      !room.queue.includes(a.id) &&
      !room.occupants.some((o) => o.actorId === a.id) &&
      (a.role !== 'miner' || !digging),
  );
}
