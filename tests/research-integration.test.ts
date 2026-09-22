import test from 'node:test';
import assert from 'node:assert/strict';
import { demoState, command, advanceTo } from '../src/game/engine';
import { HOUR } from '../src/game/content';
import { unlockedTier, roomInterval } from '../src/game/progression';
import { researchAvailable } from '../src/game/research';
import { arrivalInterval } from '../src/game/config';
import { decode } from '../src/persistence/schema';
test('tier research has prerequisites, effects and lossless persistence', () => {
  let s = demoState();
  s.gold = 1000000;
  assert.equal(researchAvailable(s, 'traps3'), false);
  s.research.push('betterTraps');
  assert.equal(researchAvailable(s, 'traps3'), true);
  s = command(s, { type: 'research', id: 'traps3' });
  s.researchJob!.end = s.nextTick;
  s = advanceTo(s, s.nextTick);
  assert.equal(unlockedTier(s, 'trap'), 3);
  assert.deepEqual(decode(JSON.stringify({ state: s, wall: 0 })).state.research, s.research);
  const e = s.floors[0].encounters.find((e) => e.kind === 'mimic')!;
  e.tier = 2;
  for (const a of s.actors) a.task = null;
  const next = command(s, { type: 'upgradeFixture', floor: 1, encounter: e.id });
  const changed = next.floors[0].encounters.find((x) => x.id === e.id)!;
  assert.equal(changed.tier, 3);
  assert.equal(changed.health, 30);
  assert.equal(next.gold, s.gold - 3000);
  assert.equal(e.tier, 2);
});
test('staff training preserves earned stat growth and requires unlocked tier', () => {
  let s = demoState();
  s.gold = 1000000;
  const a = s.actors.find((a) => a.role === 'maintenance')!;
  a.task = null;
  delete a.workFloor;
  delete a.returnUntil;
  a.damage = 13;
  assert.throws(() => command(s, { type: 'trainStaff', actor: a.id }));
  s.research.push('staff2');
  const next = command(s, { type: 'trainStaff', actor: a.id });
  const trained = next.actors.find((x) => x.id === a.id)!;
  assert.equal(trained.damage, 23);
  assert.equal(trained.outfitTier, 2);
  assert.equal(a.damage, 13);
  assert.equal(next.gold, s.gold - 1000);
  assert.equal(
    decode(JSON.stringify({ state: next, wall: 0 })).state.actors.find((x) => x.id === a.id)!
      .outfitTier,
    2,
  );
});
test('room and spawner tiers use strongest research with Luxury staff III preserved', () => {
  const s = demoState();
  s.research.push('rest2');
  assert.equal(roomInterval(s), HOUR / 3);
  s.research.push('rest4');
  assert.equal(roomInterval(s), HOUR / 5);
  assert.equal(roomInterval(s, true), HOUR / 4);
  s.research.push('adventurers5', 'guild3');
  assert.equal(arrivalInterval(s), HOUR / 4);
  s.spawnPoints = 5;
  s.spawnTiers = [5, 4, 3, 2, 1];
  assert.deepEqual(decode(JSON.stringify({ state: s, wall: 0 })).state.spawnTiers, s.spawnTiers);
});

test('baseline edits retain upgraded floor health and defense', async () => {
  const { applyRules, DEFAULT_RULES } = await import('../src/game/config');
  const s = demoState();
  s.floors[0].level = 4;
  s.floors[0].health = 33;
  s.floors[0].defense = 40;
  const next = applyRules(s, { ...DEFAULT_RULES, arrivalHours: 2 });
  assert.equal(next.floors[0].health, 33);
  assert.equal(next.floors[0].defense, 40);
});

test('content migration updates only prior defaults and is idempotent', async () => {
  const { migrateContentDefaults } = await import('../src/game/contentMigration');
  const changed = migrateContentDefaults({
    'cost.miner': 10,
    'research.traps.hours': 1,
    'research.staff.hours': 3,
  });
  assert.equal(changed['cost.miner'], 5);
  assert.equal(changed['research.traps.hours'], 5 / 60);
  assert.equal(changed['research.staff.hours'], 3);
  assert.deepEqual(migrateContentDefaults(changed), changed);
});
