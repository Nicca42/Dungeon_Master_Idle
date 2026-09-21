import { Actor, GameState } from './types';
import { fullyRecovered, replenish, recoveryHours, ROOM_RECOVERY_INTERVAL } from './recovery';
import { HOUR } from './content';
export const isStaff = (a: Actor) => ['miner', 'maintenance', 'defender'].includes(a.role);
export const staffRoom = (s: GameState) =>
  s.staffRoom ?? { capacity: 10, queue: [], occupants: [] };
export function serviceStaffRoom(s: GameState, bank: (a: Actor) => void) {
  if (!s.office) return;
  const room = (s.staffRoom ??= { capacity: 10, queue: [], occupants: [] });
  const eligible = (id: number) => s.actors.find((a) => a.id === id && isStaff(a) && a.health > 0);
  room.queue = room.queue.filter((id) => !!eligible(id));
  room.occupants = room.occupants.filter((o) => !!eligible(o.actorId));
  // Old saves may still have staff in public beds. Only party adventurers use those now.
  for (const f of s.floors)
    f.restOccupants = f.restOccupants.filter(
      (o) => !s.actors.some((a) => a.id === o.actorId && isStaff(a)),
    );
  for (const o of [...room.occupants]) {
    const a = eligible(o.actorId)!;
    while (s.now >= o.recoverAt && !fullyRecovered(a)) {
      replenish(a);
      o.recoverAt += ROOM_RECOVERY_INTERVAL;
    }
    if (fullyRecovered(a)) {
      room.occupants = room.occupants.filter((x) => x.actorId !== a.id);
      a.status = 'working';
      a.until = s.now;
    }
  }
  const digging = s.floors.some(
    (f) =>
      f.upgradeWork !== undefined ||
      ['queued', 'excavating', 'foundation', 'furnishing'].includes(f.stage),
  );
  for (const a of s.actors.filter((a) => isStaff(a) && a.health > 0)) {
    if (a.task || a.returnUntil || a.workFloor) continue;
    const threshold = Math.floor((a.maxStamina * (s.staffRestThreshold ?? 0)) / 100);
    const maintenanceWork =
      s.research.includes('staminaManagement') &&
      s.floors.some(
        (f) =>
          f.health < (f.level === 2 ? 20 : s.policy.floorHealth) ||
          f.encounters.some(
            (e) =>
              e.destroyed ||
              e.installed === false ||
              (!e.active && ['trapdoor', 'arrows'].includes(e.kind)) ||
              (e.capacity > e.gold && s.reserve > 0),
          ),
      );
    const shouldRest =
      a.status === 'resting' ||
      (a.role === 'miner'
        ? a.stamina <= Math.floor((a.maxStamina * (s.staffRestThreshold ?? 0)) / 100) ||
          (!digging && !fullyRecovered(a))
        : (a.role === 'defender' && s.escapedMobs.length) ||
            (a.role === 'maintenance' && maintenanceWork)
          ? a.stamina <= Math.floor((a.maxStamina * (s.staffRestThreshold ?? 0)) / 100)
          : !fullyRecovered(a));
    if (!shouldRest) continue;
    a.status = 'resting';
    delete a.quietRecoverAt;
    if (!room.queue.includes(a.id) && !room.occupants.some((o) => o.actorId === a.id))
      room.queue.push(a.id);
  }
  while (room.occupants.length < room.capacity && room.queue.length) {
    const a = eligible(room.queue.shift()!)!;
    bank(a);
    if (fullyRecovered(a)) {
      a.status = 'working';
      continue;
    }
    room.occupants.push({ actorId: a.id, recoverAt: s.now + ROOM_RECOVERY_INTERVAL });
    a.until = s.now + recoveryHours(a) * ROOM_RECOVERY_INTERVAL;
  }
}
export function staffRestRoster(s: GameState) {
  return staffRoom(s).occupants.flatMap((o) => {
    const actor = s.actors.find((a) => a.id === o.actorId);
    if (!actor) return [];
    return [
      { actor, end: o.recoverAt + Math.max(0, recoveryHours(actor) - 1) * ROOM_RECOVERY_INTERVAL },
    ];
  });
}
