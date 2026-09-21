import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceTo, demoState, command, initialState } from '../src/game/engine';
import { TICK, HOUR } from '../src/game/content';
import {
  projectedTime,
  shouldPersist,
  movementDuration,
  TIME_SCALE,
  UI_PULSE_MS,
} from '../src/game/timing';

test('clock interpolation survives delayed publication without rewinding or double-counting', () => {
  const game = 8 * HOUR,
    wall = 100000;
  for (const delay of [0, 1, 250, 2500, 60000]) {
    const before = projectedTime(game, wall, wall + 5000 + delay, true);
    const after = projectedTime(game + 5000 * TIME_SCALE, wall + 5000, wall + 5000 + delay, true);
    assert.equal(after, before);
  }
  assert.equal(projectedTime(game, wall, wall - 1000, true), game);
  assert.equal(projectedTime(game, wall, wall + HOUR, false), game);
});

test('foreground updates preserve references between ticks and never mutate a published snapshot', () => {
  const s = demoState();
  const snapshot = JSON.stringify(s);
  const target = s.nextTick - 1;
  const next = advanceTo(s, target);
  assert.equal(next.actors, s.actors);
  assert.equal(next.floors, s.floors);
  assert.equal(next.parties, s.parties);
  assert.equal(next.now, target);
  const event = advanceTo(next, next.nextTick);
  assert.notEqual(event.actors, next.actors);
  assert.equal(JSON.stringify(s), snapshot);
  assert.equal(advanceTo(next, next.now), next);
  const paused = initialState();
  assert.equal(advanceTo(paused, TICK), paused);
});

test('one-second foreground cadence, irregular stalls and reloads match uninterrupted simulation', () => {
  const initial = demoState();
  const target = initial.now + 6 * HOUR;
  let online = initial;
  const gaps = [1000, 1000, 370, 1630, 10000, 500, 60000];
  let i = 0;
  while (online.now < target) {
    online = advanceTo(
      online,
      Math.min(target, online.now + gaps[i++ % gaps.length]! * TIME_SCALE),
    );
    if (i % 9 === 0) online = JSON.parse(JSON.stringify(online));
  }
  assert.deepEqual(online, advanceTo(initial, target));
});

test('a command between ticks does not mutate shared entities or consume simulation time', () => {
  const s = advanceTo(demoState(), TICK - 1);
  const before = JSON.stringify(s);
  const next = command(s, { type: 'hireMiner' });
  assert.equal(next.now, s.now);
  assert.equal(next.actors.length, s.actors.length + 1);
  assert.equal(JSON.stringify(s), before);
});

test('save cadence is independent of UI pulses and movement uses the fixed simulation interval', () => {
  assert.equal(shouldPersist(4999, 0), false);
  assert.equal(shouldPersist(5000, 0), true);
  assert.equal(shouldPersist(9000, 10000), false);
  assert.equal(movementDuration(true, TICK / TIME_SCALE), 0);
  assert.equal(movementDuration(false, TICK / TIME_SCALE), 12500);
  assert.equal(1000 / UI_PULSE_MS, 4);
});

test('rest roster estimates each occupant using their actual recovery rate and next recovery time', async () => {
  const { restRoster } = await import('../src/game/rest');
  const s = demoState();
  const a = s.actors.find((a) => a.role === 'fighter')!;
  a.maxStamina = 20;
  a.stamina = 15;
  s.floors[0]!.restOccupants = [{ actorId: a.id, partyId: 1, recoverAt: HOUR / 2 }];
  assert.equal(restRoster(s, 1).find((r) => r.actor.id === a.id)!.end, 2.5 * HOUR);
  a.stamina = 20;
  assert.equal(restRoster(s, 1).find((r) => r.actor.id === a.id)!.end, s.now);
  s.floors[0]!.restOccupants = [];
  assert.equal(restRoster(s, 1).length, 0);
});

test('fixed encounter slots and party travel advance from left exit to right rest room', async () => {
  const { slotX, encounterX } = await import('../src/game/layout');
  const s = demoState();
  for (let i = 1; i < 12; i++) assert.ok(slotX(i) > slotX(i - 1));
  const floor = s.floors[0]!;
  assert.ok(encounterX(floor, -1) < encounterX(floor, 0));
  assert.ok(
    encounterX(floor, floor.encounters.length) > encounterX(floor, floor.encounters.length - 1),
  );
});

test('all fifteen floor columns have identical spacing', async () => {
  const { cellCenter, CELL_WIDTH } = await import('../src/game/layout');
  for (let i = 1; i < 15; i++)
    assert.ok(Math.abs(cellCenter(i) - cellCenter(i - 1) - CELL_WIDTH) < 0.000001);
});

test('active play doubles arrivals and research without accelerating world time or construction', () => {
  const s = demoState();
  s.parties = [];
  s.actors = s.actors.filter((a) => ['miner', 'maintenance'].includes(a.role));
  s.researchJob = { id: 'digging', end: 4 * HOUR };
  const offline = advanceTo(s, HOUR);
  const active = advanceTo(s, HOUR, true);
  const population = (g: typeof s) =>
    g.actors.filter((a) => ['fighter', 'wizard', 'healer'].includes(a.role)).length;
  assert.equal(population(offline), 1);
  assert.equal(population(active), 2);
  assert.equal(active.now, offline.now);
  assert.equal(active.floors[1]!.work, offline.floors[1]!.work);
  assert.equal(active.researchJob!.end - active.now, 2 * HOUR);
  assert.equal(offline.researchJob!.end - offline.now, 3 * HOUR);
  assert.ok(advanceTo(s, 2 * HOUR, true).research.includes('digging'));
  assert.ok(!advanceTo(s, 2 * HOUR).research.includes('digging'));
});

test('active updates are partition independent and returning offline restores normal research speed', () => {
  const s = demoState();
  s.researchJob = { id: 'digging', end: 8 * HOUR };
  let small = s;
  while (small.now < 3 * HOUR)
    small = advanceTo(small, Math.min(3 * HOUR, small.now + 24000), true);
  assert.deepEqual(small, advanceTo(s, 3 * HOUR, true));
  const offline = advanceTo(small, 4 * HOUR);
  assert.equal(offline.researchJob!.end - offline.now, HOUR);
  assert.equal(small.researchJob!.end - small.now, 2 * HOUR);
});
