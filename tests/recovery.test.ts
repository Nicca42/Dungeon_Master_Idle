import test from 'node:test';
import assert from 'node:assert/strict';
import { demoState, quietRecovery, usePrimary, processRest, advanceTo } from '../src/game/engine';
import { fullyRecovered, primaryAvailable, replenish } from '../src/game/recovery';
import { HOUR } from '../src/game/content';
import { decode } from '../src/persistence/schema';

test('primary actions spend current points, earn XP and preserve permanent skill rating', () => {
  const a = demoState().actors.find((a) => a.role === 'wizard')!;
  a.primaryCurrent = 2;
  a.pendingXp.primary = 0;
  usePrimary(a);
  usePrimary(a);
  usePrimary(a);
  assert.equal(primaryAvailable(a), 0);
  assert.equal(a.primary, 10);
  assert.equal(a.pendingXp.primary, 2);
  delete a.primaryCurrent;
  assert.equal(primaryAvailable(a), a.primary);
});

test('all four resources recover four times as fast in a room, without free XP or overhealing', () => {
  const outside = demoState();
  const a = outside.actors.find((a) => a.role === 'fighter')!;
  a.health = a.defense = a.stamina = a.primaryCurrent = 7;
  const xp = structuredClone(a.pendingXp);
  quietRecovery(outside, a, true);
  outside.now = HOUR;
  quietRecovery(outside, a, true);
  assert.equal(a.health, 7);
  outside.now = 2 * HOUR;
  quietRecovery(outside, a, true);
  assert.deepEqual([a.health, a.defense, a.stamina, a.primaryCurrent], [8, 8, 8, 8]);
  const inside = demoState(),
    p = inside.parties[0]!,
    f = inside.floors[0]!;
  const b = inside.actors.find((a) => a.id === p.members[0])!;
  p.members = [b.id];
  p.status = 'resting';
  p.restedIds = [];
  f.restQueue = [p.id];
  b.health = b.defense = b.stamina = b.primaryCurrent = 7;
  processRest(inside, f);
  inside.now = HOUR;
  processRest(inside, f);
  inside.now = 2 * HOUR;
  processRest(inside, f);
  assert.deepEqual([b.health, b.defense, b.stamina, b.primaryCurrent], [10, 10, 10, 10]);
  assert.deepEqual(a.pendingXp, xp);
  replenish(b);
  replenish(b);
  assert.ok(fullyRecovered(b));
  assert.equal(b.primaryCurrent, 10);
  b.health = 0;
  replenish(b);
  assert.equal(b.health, 0);
});

test('quiet recovery pauses during danger and resource pools survive save reload', () => {
  const s = demoState(),
    a = s.actors[0]!;
  a.defense = 5;
  a.primaryCurrent = 3;
  quietRecovery(s, a, true);
  s.now = HOUR;
  quietRecovery(s, a, false);
  assert.equal(a.quietRecoverAt, undefined);
  s.now = 2 * HOUR;
  quietRecovery(s, a, true);
  assert.equal(a.defense, 5);
  const restored = decode(
    JSON.stringify({ state: { ...s, nextTick: s.now + HOUR }, wall: 0 }),
  ).state;
  assert.equal(restored.actors[0]!.primaryCurrent, 3);
});

test('triggering a trap awards defense XP for absorbed damage', () => {
  const s = demoState(),
    p = s.parties[0]!,
    f = s.floors[0]!;
  p.status = 'moving';
  p.node = f.encounters.findIndex((e) => e.kind === 'trapdoor');
  for (const a of s.actors.filter((a) => p.members.includes(a.id))) a.intelligence = 0;
  const victim = s.actors.find((a) => a.id === p.members[0])!;
  const before = victim.pendingXp.maxDefense;
  const next = advanceTo(s, s.nextTick);
  assert.equal(next.actors.find((a) => a.id === victim.id)!.pendingXp.maxDefense, before + 1);
});
