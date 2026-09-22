import test from 'node:test';
import assert from 'node:assert/strict';
import {
  demoState,
  command,
  moveMobs,
  advanceTo,
  attack,
  mobLimitReached,
} from '../src/game/engine';
import { actorActivity } from '../src/game/actorActivity';
import { HOUR, TICK } from '../src/game/content';
import { decode } from '../src/persistence/schema';

test('card activity distinguishes the actor action, rest admission and party queue', () => {
  const s = demoState(),
    p = s.parties[0]!,
    a = s.actors.find((a) => a.id === p.members[0])!;
  p.status = 'moving';
  p.node = s.floors[0]!.encounters.length;
  p.actions = [
    { kind: 'lock', actor: a.name, power: 20, difficulty: 10, success: true, time: s.now },
  ];
  assert.equal(actorActivity(s, a).current, 'Picking a lock');
  assert.equal(actorActivity(s, a).next, 'Queue for the rest room');
  p.checkpointed = true;
  assert.equal(actorActivity(s, a).current, 'Queuing for the rest room');
  s.floors[0]!.restOccupants.push({ actorId: a.id, partyId: p.id, recoverAt: HOUR });
  assert.equal(actorActivity(s, a).current, 'Resting in the rest room');
});

test('empty slots accept only unlocked fixtures and preserve occupied-floor encounters', () => {
  let s = demoState();
  const f = s.floors[0]!,
    before = f.encounters.map((e) => ({ id: e.id, gold: e.gold, health: e.health }));
  assert.throws(() => command(s, { type: 'addFixture', floor: 1, slot: 11, kind: 'gold' }));
  assert.throws(() => command(s, { type: 'addFixture', floor: 1, slot: 0, kind: 'arrows' }));
  s = command(s, { type: 'addFixture', floor: 1, slot: 11, kind: 'zombie' });
  const added = s.floors[0]!.encounters.find((e) => e.slot === 11)!;
  assert.equal(added.kind, 'zombie');
  assert.equal(added.installed, false);
  for (const old of before) {
    const e = s.floors[0]!.encounters.find((e) => e.id === old.id)!;
    assert.equal(e.gold, old.gold);
    assert.equal(e.health, old.health);
  }
  const loaded = decode(JSON.stringify({ state: s, wall: 0 })).state;
  assert.equal(loaded.floors[0]!.encounters.find((e) => e.id === added.id)!.installed, false);
  s.parties = [];
  s.nextArrivalAt = 1000 * HOUR;
  s = advanceTo(s, 2 * HOUR);
  assert.equal(s.floors[0]!.encounters.find((e) => e.id === added.id)!.installed, true);
});

test('destroyed fixtures persist until a maintainer replaces them using exactly one stamina', () => {
  let s = demoState();
  s.parties = [];
  s.nextArrivalAt = 1000 * HOUR;
  const e = s.floors[0]!.encounters.find((e) => e.kind === 'wood')!;
  attack(e, 1000);
  assert.equal(e.destroyed, true);
  const id = e.id;
  s.actors = s.actors.filter((a) => a.role === 'maintenance').slice(0, 1);
  const worker = s.actors[0]!;
  worker.task = null;
  worker.stamina = 10;
  s = advanceTo(s, HOUR);
  assert.equal(s.actors[0]!.task?.kind, 'replace');
  assert.equal(s.actors[0]!.stamina, 9);
  s = advanceTo(s, s.actors[0]!.task!.until);
  const repaired = s.floors[0]!.encounters.find((e) => e.id === id)!;
  assert.equal(repaired.destroyed, false);
  assert.ok(repaired.health > 0);
});

test('monsters pursue parties in both directions and do not pursue maintenance', () => {
  const s = demoState(),
    f = s.floors[0]!,
    p = s.parties[0]!;
  p.status = 'moving';
  p.node = 5;
  const mob = f.encounters.find((e) => e.kind === 'zombie')!;
  mob.active = true;
  mob.position = 2;
  moveMobs(s, f);
  assert.equal(mob.position, 2.5);
  p.node = 0;
  moveMobs(s, f);
  assert.equal(mob.position, 2);
  s.parties = [];
  mob.patrolDirection = -1;
  const worker = s.actors.find((a) => a.role === 'maintenance')!;
  worker.workFloor = 1;
  worker.workPosition = 6;
  moveMobs(s, f);
  assert.equal(mob.position, 1.5);
});

test('monster population cap is independent of nests and changes without rebuilding fixtures', () => {
  let s = demoState();
  s.parties = [];
  const f = s.floors[0]!;
  const before = structuredClone(f.encounters);
  s = command(s, { type: 'policy', policy: { ...s.policy, mobLimit: 0 } });
  assert.equal(mobLimitReached(s, s.floors[0]!), true);
  assert.deepEqual(s.floors[0]!.encounters, before);
  s = command(s, { type: 'policy', policy: { ...s.policy, mobLimit: 10 } });
  assert.equal(mobLimitReached(s, s.floors[0]!), false);
  assert.equal(s.policy.mobSlots, 2);
});

test('mobs ignore protected survivors even when a dead party member is outside', () => {
  const s = demoState(),
    f = s.floors[0],
    p = s.parties[0];
  p.status = 'resting';
  p.node = 6;
  const team = p.members.map((id) => s.actors.find((a) => a.id === id)!);
  team[0].health = 0;
  f.restOccupants = team
    .slice(1)
    .map((a) => ({ actorId: a.id, partyId: p.id, recoverAt: s.now + HOUR }));
  const mob = f.encounters.find((e) => e.kind === 'zombie')!;
  mob.active = true;
  mob.position = 2;
  mob.patrolDirection = -1;
  moveMobs(s, f);
  assert.equal(mob.position, 1.5);
  f.restOccupants.pop();
  moveMobs(s, f);
  assert.equal(mob.position, 2);
});
