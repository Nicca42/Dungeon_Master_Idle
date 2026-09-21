import { Actor, GameState } from './types';
import { TICK } from './content';
export function actorActivity(s: GameState, a: Actor) {
  if (a.health <= 0) return { current: 'Dead', next: 'None' };
  if (a.task)
    return {
      current: `${{ reset: 'Resetting a trap', refill: 'Refilling treasure', repair: 'Repairing the floor', install: 'Installing a fixture', replace: 'Replacing a destroyed fixture' }[a.task.kind]}`,
      next: 'Return to the office',
    };
  const p = s.parties.find((p) => p.members.includes(a.id));
  if (!p)
    return {
      current: {
        town: 'Waiting for a party',
        adventure: 'Exploring',
        recovering: 'Recovering',
        working: 'Working',
        resting: 'Resting',
        training: 'Training',
        dead: 'Dead',
      }[a.status],
      next:
        a.status === 'resting'
          ? 'Return to work when recovered'
          : a.status === 'town'
            ? 'Form a party and enter the dungeon'
            : 'Continue current duty',
    };
  const f = s.floors[p.floor - 1]!;
  const onward =
    s.floors[p.floor]?.stage === 'open'
      ? 'Continue to the next floor with the party'
      : 'Leave the dungeon with the party';
  if (f.restOccupants.some((o) => o.actorId === a.id))
    return { current: 'Resting in the rest room', next: 'Wait for the whole party to recover' };
  if (p.checkpointed || p.status === 'waiting' || p.status === 'resting')
    return {
      current: p.restedIds.includes(a.id)
        ? 'Waiting for party members to rest'
        : 'Queuing for the rest room',
      next: p.restedIds.includes(a.id) ? onward : 'Enter the rest room when a bed is available',
    };
  if (p.status === 'arriving')
    return { current: 'Walking to the dungeon entrance', next: 'Explore the first floor' };
  const cue = [...p.actions].reverse().find((c) => c.actor === a.name && s.now - c.time < TICK);
  const action = cue
    ? {
        lock: 'Picking a lock',
        attack: 'Attacking a monster',
        defend: 'Defending the party',
        heal: 'Healing a party member',
        detect: 'Checking for traps',
      }[cue.kind]
    : undefined;
  const next =
    p.status === 'fighting'
      ? 'Continue combat until the encounter is resolved'
      : p.node >= f.encounters.length
        ? 'Queue for the rest room'
        : `Explore ${f.encounters[p.node]!.kind} in slot ${(f.encounters[p.node]!.slot ?? p.node) + 1}`;
  return {
    current:
      action ??
      (p.status === 'fighting' ? 'Fighting with the party' : 'Walking through the dungeon'),
    next,
  };
}
