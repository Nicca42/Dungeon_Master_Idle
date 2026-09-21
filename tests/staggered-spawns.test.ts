import test from 'node:test';
import assert from 'node:assert/strict';
import { demoState, advanceTo, command, nextArrivalClass, moveMobs } from '../src/game/engine';
import { arrivalAt, staggerMobs } from '../src/game/spawnTiming';
import { HOUR, TICK } from '../src/game/content';
import { DEFAULT_RULES, adjustRule, applyRules, rule, validateRules } from '../src/game/config';
import { decode } from '../src/persistence/schema';

test('three town points take turns every twenty game minutes and keep their spawn tiers', () => {
  let s = demoState();
  s.parties = [];
  s.actors = s.actors.filter((a) => a.role === 'miner');
  s.floors.forEach((f) => (f.encounters = []));
  s.spawnPoints = 3;
  s.spawnTiers = [1, 2, 1];
  s.arrivalSequence = 0;
  s.nextArrivalAt = TICK;
  assert.equal(arrivalAt(s, 1) - arrivalAt(s, 0), HOUR / 3);
  for (const tier of [1, 2, 1]) {
    const before = s.actors.length;
    s = advanceTo(s, s.nextArrivalAt);
    assert.equal(s.actors.length, before + 1);
    assert.equal(s.actors.at(-1)!.outfitTier, tier);
    assert.equal(s.nextArrivalAt - s.now, HOUR / 3);
  }
  assert.deepEqual(decode(JSON.stringify({ state: s, wall: 0 })).state.spawnTiers, [1, 2, 1]);
});

test('same-rate nests on different floors get evenly spaced deadlines', () => {
  const s = demoState();
  s.parties = [];
  const original = s.floors[0]!.encounters.find((e) => e.kind === 'zombie')!;
  s.floors.forEach((f, i) => {
    f.stage = i < 3 ? 'open' : 'locked';
    f.encounters = i < 3 ? [{ ...original, id: s.nextId++, active: false, readyAt: HOUR }] : [];
  });
  staggerMobs(s);
  assert.deepEqual(
    s.floors.slice(0, 3).map((f) => f.encounters[0]!.readyAt),
    [HOUR / 3, (2 * HOUR) / 3, HOUR],
  );
  const before = s.floors.map((f) => f.spawnAt);
  staggerMobs(s);
  assert.deepEqual(
    s.floors.map((f) => f.spawnAt),
    before,
  );
});

test('mobs return smoothly to the exit zone when a party leaves, even if facing away', () => {
  const s = demoState();
  s.parties = [];
  const f = s.floors[0]!,
    mob = f.encounters.find((e) => e.kind === 'zombie')!;
  mob.active = true;
  mob.position = 6;
  mob.patrolDirection = 1;
  moveMobs(s, f);
  assert.equal(mob.position, 5.5);
  assert.equal(mob.patrolDirection, -1);
});

test('silver and gold +/- controls edit valid linked stats while keeping tier ratios', () => {
  let r = adjustRule(DEFAULT_RULES, 'silver.health', 1);
  assert.equal(rule({ config: r }, 'wood.health'), 11);
  assert.equal(rule({ config: r }, 'silver.health'), 22);
  r = adjustRule(r, 'gold.health', 1);
  assert.equal(rule({ config: r }, 'gold.health'), 48);
  validateRules(r);
});

test('guild research supplies a missing healer and immediately forms an eligible waiting party', () => {
  let s = demoState();
  s.gold = 100000;
  s.parties = [];
  s.floors.forEach((f) => (f.encounters = []));
  s.actors = s.actors.filter((a) => ['fighter', 'wizard'].includes(a.role));
  s.actors.forEach((a) => {
    a.status = 'town';
    a.wealth = 2000;
  });
  s = command(s, { type: 'research', id: 'guild' });
  s.researchJob!.end = s.nextTick;
  s = advanceTo(s, s.nextTick);
  assert.ok(s.research.includes('guild'));
  assert.equal(nextArrivalClass(s), 'healer');
  s.nextArrivalAt = s.nextTick;
  s = advanceTo(s, s.nextTick);
  assert.equal(s.actors.at(-1)!.role, 'healer');
  assert.equal(s.parties.length, 1);
  assert.ok(decode(JSON.stringify({ state: s, wall: 0 })).state.research.includes('guild'));
});

test('linked chest edits update fixtures already in the dungeon', () => {
  const s = demoState();
  const silver = s.floors[0]!.encounters.find((e) => e.kind === 'silver')!;
  const edited = adjustRule({ ...DEFAULT_RULES, ...s.config }, 'silver.health', 1);
  const next = applyRules(s, edited);
  assert.equal(
    next.floors[0]!.encounters.find((e) => e.id === silver.id)!.health,
    silver.health + 2,
  );
});
