import test from 'node:test';
import assert from 'node:assert/strict';
import {
  demoState,
  attack,
  learn,
  command,
  advanceTo,
  nextExcavationFloor,
} from '../src/game/engine';
import { observeAdventures, recordAdventures } from '../src/game/adventureStats';
import { HOUR } from '../src/game/content';
import { decode } from '../src/persistence/schema';
import { DEFAULT_RULES, applyRules } from '../src/game/config';

test('adventure history records earned XP and actual shield/health damage, without double-counting death', () => {
  const s = demoState();
  const a = s.actors.find((a) => a.role === 'fighter')!;
  const b = s.actors.find((a) => a.role === 'wizard')!;
  a.health = 10;
  a.defense = 10;
  b.health = 5;
  b.defense = 3;
  let observed = observeAdventures(s);
  learn(a, 'speed');
  attack(b, 100, a);
  a.pendingXp.speed = 0; // Banking or losing pending XP must not erase earned history.
  recordAdventures(s, observed);
  assert.equal(s.adventureStats!.totals.xp.speed, 1);
  assert.equal(s.adventureStats!.totals.defenseDealt, 3);
  assert.equal(s.adventureStats!.totals.healthDealt, 5);
  assert.equal(s.adventureStats!.totals.defenseTaken, 3);
  assert.equal(s.adventureStats!.totals.healthTaken, 5);
  assert.equal(s.adventureStats!.totals.deaths, 1);
  observed = observeAdventures(s);
  attack(b, 100, a);
  recordAdventures(s, observed);
  assert.equal(s.adventureStats!.totals.deaths, 1);
  assert.deepEqual(
    decode(JSON.stringify({ state: s, wall: 0 })).state.adventureStats,
    s.adventureStats,
  );
});

test('depth completion makes floor six immediately available to queue and excavate', () => {
  let s = demoState();
  s.gold = 100000;
  s.parties = [];
  s.nextArrivalAt = 1000 * HOUR;
  s.floors.forEach((f) => {
    f.stage = 'open';
    f.encounters = [];
  });
  assert.equal(nextExcavationFloor(s), undefined);
  s = command(s, { type: 'research', id: 'depths' });
  s.researchJob!.end = s.nextTick;
  s = advanceTo(s, s.nextTick);
  assert.equal(nextExcavationFloor(s)!.id, 6);
  s = command(s, { type: 'excavateNext' });
  assert.equal(s.floors[5]!.stage, 'queued');
  s.actors
    .filter((a) => a.role === 'miner')
    .forEach((a) => {
      a.status = 'working';
      a.stamina = a.maxStamina;
    });
  s = advanceTo(s, s.nextTick);
  assert.equal(s.floors[5]!.stage, 'excavating');
  assert.ok(s.floors[5]!.work > 0);
});

test('level two spawner baselines affect new and ongoing level two actors independently', () => {
  let s = demoState();
  s.parties = [];
  s.research.push('level2Adventurers');
  s.spawnTiers = [2];
  s.arrivalSequence = 0;
  s.config = { ...DEFAULT_RULES, ...s.config, 'level2.fighter.maxHealth': 33 };
  s.nextArrivalAt = s.nextTick;
  s = advanceTo(s, s.nextTick);
  const a = s.actors.at(-1)!;
  assert.equal(a.role, 'fighter');
  assert.equal(a.maxHealth, 33);
  assert.equal(a.maxStamina, 20);
  const next = applyRules(s, { ...DEFAULT_RULES, ...s.config, 'level2.fighter.maxHealth': 35 });
  assert.equal(next.actors.find((x) => x.id === a.id)!.maxHealth, 35);
  assert.equal(next.actors.find((x) => x.id === a.id)!.health, 35);
});
