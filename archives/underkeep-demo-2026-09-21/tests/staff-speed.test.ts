import test from 'node:test';
import assert from 'node:assert/strict';
import { demoState, command, advanceTo, processStaffRest } from '../src/game/engine';
import {
  maintenanceTiming,
  staffTravelTime,
  staffSpeed,
  maintenanceWorkTime,
} from '../src/game/staffSpeed';
import { HOUR, TICK } from '../src/game/content';
import { staffRestRoster } from '../src/game/staffRest';
import { decode } from '../src/persistence/schema';

test('maintenance reset uses speed plus intelligence and editable tier difficulty', () => {
  const s = demoState(),
    a = s.actors.find((a) => a.role === 'maintenance')!;
  a.speed = a.intelligence = 10;
  const trap = { kind: 'trapdoor' as const, tier: 1 };
  const minutes = () => maintenanceWorkTime(s, a, trap) / (HOUR / 60);
  assert.equal(minutes(), 5);
  assert.equal(maintenanceWorkTime(s, a, { ...trap, tier: 2 }) / (HOUR / 60), 7);
  a.speed = 5;
  assert.equal(minutes(), 6);
  a.speed = 15;
  assert.equal(minutes(), 4);
  a.intelligence = 15;
  assert.equal(minutes(), 3);
  a.speed = 100;
  assert.equal(minutes(), 1);
  a.speed = a.intelligence = 10;
  const first = maintenanceTiming(s, a, 3, trap);
  assert.equal(first.arriveAt - s.now, 3 * TICK);
  s.research.push('staffSpeed');
  assert.equal(staffSpeed(s, a), 20);
  assert.equal(staffTravelTime(s, a, 3), (3 * TICK) / 2);
  assert.equal(minutes(), 3);
});

test('staff speed research completes, persists, and accelerates an ongoing reset', () => {
  let s = demoState();
  s.gold = 100000;
  s.parties = [];
  s.nextArrivalAt = 100 * HOUR;
  const a = s.actors.find((a) => a.role === 'maintenance')!;
  const e = s.floors[0]!.encounters.find((e) => e.kind === 'trapdoor')!;
  s.actors = [a];
  e.active = false;
  s.floors[0]!.encounters = [e];
  s = command(s, { type: 'research', id: 'staffSpeed' });
  s = advanceTo(s, s.nextTick);
  const oldEnd = s.actors[0]!.task!.until;
  s.researchJob!.end = s.nextTick;
  s = advanceTo(s, s.nextTick);
  assert.equal(s.actors[0]!.task!.until, s.now + Math.ceil((oldEnd - s.now) * 0.6));
  const restored = decode(JSON.stringify({ state: s, wall: 0 })).state;
  assert.ok(restored.research.includes('staffSpeed'));
  assert.equal(restored.actors[0]!.task!.arriveAt, s.actors[0]!.task!.arriveAt);
});

test('office beds restore all resources every half hour and show the matching countdown', () => {
  const s = demoState();
  s.parties = [];
  const a = s.actors.find((a) => a.role === 'miner')!;
  s.actors = [a];
  a.health = a.defense = a.stamina = a.primaryCurrent = 8;
  a.status = 'resting';
  processStaffRest(s);
  assert.equal(staffRestRoster(s)[0]!.end, HOUR);
  s.now = HOUR / 2;
  processStaffRest(s);
  assert.deepEqual([a.health, a.defense, a.stamina, a.primaryCurrent], [9, 9, 9, 9]);
  s.now = HOUR;
  processStaffRest(s);
  assert.deepEqual([a.health, a.defense, a.stamina, a.primaryCurrent], [10, 10, 10, 10]);
  assert.equal(a.status, 'working');
});

test('fast resets finish between simulation ticks and survive time chunking', () => {
  let s = demoState();
  const a = s.actors.find((a) => a.role === 'maintenance')!;
  s.actors = [a];
  s.parties = [];
  s.nextArrivalAt = 100 * HOUR;
  const trap = s.floors[0]!.encounters.find((e) => e.kind === 'trapdoor')!;
  s.floors[0]!.encounters = [trap];
  trap.active = false;
  a.speed = 15;
  a.intelligence = 10;
  s = advanceTo(s, s.nextTick);
  const end = s.actors[0]!.task!.until;
  assert.notEqual(end % TICK, 0);
  const before = advanceTo(s, end - 1);
  assert.equal(before.floors[0]!.encounters[0]!.active, false);
  const after = advanceTo(before, end);
  assert.equal(after.floors[0]!.encounters[0]!.active, true);
  assert.deepEqual(after, advanceTo(s, end));
});

test('deep baseline edits retime resets in progress and apply to future jobs', async () => {
  const { applyRules } = await import('../src/game/config');
  let s = demoState();
  const a = s.actors.find((a) => a.role === 'maintenance')!;
  const e = s.floors[0]!.encounters.find((e) => e.kind === 'trapdoor')!;
  a.speed = a.intelligence = 10;
  a.task = {
    kind: 'reset',
    floor: 1,
    encounter: e.id,
    arriveAt: s.now,
    until: s.now + (5 * HOUR) / 60,
  };
  s = applyRules(s, { ...s.config, 'trapdoor.resetMinutes': 10 });
  assert.equal(s.actors.find((x) => x.id === a.id)!.task!.until - s.now, (10 * HOUR) / 60);
  s = applyRules(s, { ...s.config, 'maintenance.intelligence': 15 });
  const updated = s.actors.find((x) => x.id === a.id)!;
  assert.equal(updated.task!.until - s.now, (8 * HOUR) / 60);
  assert.equal(maintenanceWorkTime(s, updated, e), (8 * HOUR) / 60);
});
