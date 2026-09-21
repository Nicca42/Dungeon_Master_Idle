import test from 'node:test';
import assert from 'node:assert/strict';
import { demoState, command, advanceTo, processStaffRest } from '../src/game/engine';
import { maintenanceTiming, staffTravelTime, staffSpeed } from '../src/game/staffSpeed';
import { HOUR, TICK } from '../src/game/content';
import { staffRestRoster } from '../src/game/staffRest';
import { decode } from '../src/persistence/schema';

test('maintenance speed scales travel, work, tier-two resets and office return trips', () => {
  const s = demoState(),
    a = s.actors.find((a) => a.role === 'maintenance')!;
  const first = maintenanceTiming(s, a, 3, 1);
  const second = maintenanceTiming(s, a, 3, 2);
  assert.equal(first.arriveAt - s.now, 3 * TICK);
  assert.equal(first.until - first.arriveAt, HOUR);
  assert.equal(second.until - second.arriveAt, 1.5 * HOUR);
  a.speed = 20;
  assert.equal(maintenanceTiming(s, a, 3, 2).until - s.now, (second.until - s.now) / 2);
  s.research.push('staffSpeed');
  assert.equal(staffSpeed(s, a), 40);
  assert.equal(a.speed, 20);
  assert.equal(staffTravelTime(s, a, 3), (3 * TICK) / 4);
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
  assert.equal(s.actors[0]!.task!.until, s.now + Math.ceil((oldEnd - s.now) / 2));
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
