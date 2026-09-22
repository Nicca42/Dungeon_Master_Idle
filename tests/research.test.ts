import test from 'node:test';
import assert from 'node:assert/strict';
import { demoState, command, advanceTo, processStaffRest, excavationEnd } from '../src/game/engine';
import { researchAvailable, upgradingFloor } from '../src/game/research';
import { GameState, ResearchId } from '../src/game/types';
import { rule } from '../src/game/config';
import { HOUR } from '../src/game/content';
import { decode } from '../src/persistence/schema';
function fixture() {
  const s = demoState();
  s.gold = 1000000;
  s.parties = [];
  s.floors.forEach((f) => (f.encounters = []));
  s.nextArrivalAt = 1000 * HOUR;
  return s;
}
function finish(s: GameState, id: ResearchId) {
  s = command(s, { type: 'research', id });
  s.researchJob!.end = s.nextTick;
  return advanceTo(s, s.nextTick);
}

test('depth research repeatedly unlocks five floors, persists and stops at fifty', () => {
  let s = fixture();
  assert.ok(s.research.includes('getDigging'));
  for (let count = 10; count <= 50; count += 5) {
    s = finish(s, 'depths');
    assert.equal(s.floors.length, count);
    assert.equal(s.floors.at(-1)!.id, count);
  }
  assert.equal(researchAvailable(s, 'depths'), false);
  assert.throws(() => command(s, { type: 'research', id: 'depths' }));
  assert.equal(decode(JSON.stringify({ state: s, wall: 0 })).state.floors.length, 50);
});

test('trap research has a four-hour base duration, upgrades fixtures and caps beginner stealth at ten', () => {
  let s = demoState();
  s.gold = 1000000;
  const start = command(s, { type: 'research', id: 'betterTraps' });
  assert.equal(start.researchJob!.end - start.now, 4 * HOUR);
  s = finish(s, 'betterTraps');
  for (const e of s.floors[0]!.encounters.filter((e) => ['mimic', 'trapdoor'].includes(e.kind))) {
    assert.equal(e.tier, 2);
    assert.ok(e.damage >= 10 && e.damage <= 20);
  }
  s.parties = [];
  s.actors.forEach((a) => {
    a.task = null;
  });
  assert.throws(
    () =>
      command(s, {
        type: 'policy',
        policy: { ...s.policy, trapAttackBudget: 0 },
      }),
    /10 attack cap/,
  );
  s = command(s, { type: 'policy', policy: { ...s.policy, trapAttackBudget: 20 } });
  const traps = s.floors[0]!.encounters.filter((e) =>
    ['trapdoor', 'arrows', 'mimic'].includes(e.kind),
  );
  assert.ok(traps.filter((e) => e.tier === 2).every((e) => e.damage >= 10 && e.damage <= 20));
  assert.ok(traps.reduce((n, e) => n + e.damage, 0) <= 20);
  for (let i = 0; i < 5; i++) s = finish(s, 'stealth');
  assert.equal(s.trapStealth, 10);
  assert.throws(() => command(s, { type: 'research', id: 'stealth' }));
});

test('building research queues deepest-first real work, keeps encounters, then changes floor stats', () => {
  let s = fixture();
  s.actors = s.actors.filter((a) => a.role === 'miner');
  s.floors[1]!.stage = 'ready';
  s.floors[2]!.stage = 'ready';
  s = finish(s, 'building');
  assert.equal(upgradingFloor(s)!.id, 3);
  assert.equal(s.floors[2]!.level, 1);
  s = advanceTo(s, HOUR);
  assert.ok(s.floors[2]!.upgradeWork! > 0);
  assert.equal(s.floors[0]!.upgradeWork, 0);
  s = advanceTo(s, 40 * HOUR);
  for (const f of s.floors.slice(0, 3)) {
    assert.equal(f.level, 2);
    assert.equal(f.defense, 20);
    assert.equal(f.health, 20);
  }
});

test('level-two spawn upgrades are gated, double baseline stats and keep existing actors unchanged', () => {
  let s = fixture();
  assert.throws(() => command(s, { type: 'upgradeSpawn', point: 0 }));
  s = finish(s, 'localAds');
  s = finish(s, 'level2Adventurers');
  s.floors[0]!.level = 2;
  const before = structuredClone(s.actors);
  s = command(s, { type: 'upgradeSpawn', point: 0 });
  assert.deepEqual(s.actors, before);
  s.nextArrivalAt = s.nextTick;
  s = advanceTo(s, s.nextTick);
  const a = s.actors.at(-1)!;
  assert.equal(a.outfitTier, 2);
  for (const stat of [
    'maxHealth',
    'maxDefense',
    'maxStamina',
    'damage',
    'intelligence',
    'speed',
    'primary',
    'learning',
  ] as const)
    assert.equal(a[stat], 20);
  assert.equal(a.wealth, 4000);
  assert.equal(a.status, 'town');
});

test('gold chests are gated and all silver/gold baseline statistics derive from wood', () => {
  let s = fixture();
  const policy = { ...s.policy, gold: 1 };
  assert.throws(() => command(s, { type: 'policy', policy }));
  s = finish(s, 'goldChests');
  s = command(s, { type: 'policy', policy });
  assert.ok(s.floors[0]!.encounters.some((e) => e.kind === 'gold'));
  for (const stat of [
    'health',
    'damageMin',
    'damageMax',
    'defenseMin',
    'defenseMax',
    'goldMin',
    'goldMax',
    'perception',
    'stamina',
  ]) {
    assert.equal(rule(s, `silver.${stat}`), 2 * rule(s, `wood.${stat}`));
    assert.equal(rule(s, `gold.${stat}`), 4 * rule(s, `wood.${stat}`));
  }
});

test('stamina management gates the staff threshold and sends working diggers to the office early', () => {
  let s = fixture();
  assert.throws(() => command(s, { type: 'staffRestThreshold', value: 50 }));
  s = finish(s, 'staminaManagement');
  s = command(s, { type: 'staffRestThreshold', value: 50 });
  const a = s.actors.find((a) => a.role === 'miner')!;
  a.stamina = 5;
  processStaffRest(s);
  assert.equal(a.status, 'resting');
  assert.ok(s.staffRoom!.occupants.some((o) => o.actorId === a.id));
});

test('excavation estimates include deepest-first building work before mining resumes', () => {
  let s = fixture();
  s.actors = s.actors.filter((a) => a.role === 'miner');
  const base = excavationEnd(s, 2)!;
  s = finish(s, 'building');
  const eta = excavationEnd(s, 2)!;
  assert.ok(eta > base);
  assert.equal(advanceTo(s, eta - 1).floors[1]!.stage, 'excavating');
  assert.equal(advanceTo(s, eta).floors[1]!.stage, 'foundation');
});

test('new foundations receive researched architecture before furnishing continues', () => {
  let s = demoState();
  s.parties = [];
  s.nextArrivalAt = s.now + 100 * HOUR;
  s.research.push('building');
  s.floors[0].level = 2;
  s.floors[0].health = s.floors[0].defense = 20;
  const floor = s.floors[1];
  floor.stage = 'foundation';
  floor.required = 1;
  floor.work = 0;
  s.actors = s.actors.filter((a) => a.role === 'miner').slice(0, 1);
  s.actors[0].primary = 20;
  s.actors[0].stamina = 100;
  s.actors[0].maxStamina = 100;
  s.actors[0].status = 'working';
  s = advanceTo(s, HOUR);
  assert.equal(s.floors[1].stage, 'furnishing');
  assert.equal(s.floors[1].upgradeWork, 0);
  s = advanceTo(s, 2 * HOUR);
  assert.equal(s.floors[1].upgradeWork, 1);
  assert.equal(s.floors[1].work, 0);
  s = advanceTo(s, 7 * HOUR);
  assert.equal(s.floors[1].level, 2);
  assert.equal(s.floors[1].health, 20);
  assert.equal(s.floors[1].defense, 20);
  assert.equal(s.floors[1].stage, 'furnishing');
  assert.equal(s.floors[1].upgradeWork, undefined);
});
