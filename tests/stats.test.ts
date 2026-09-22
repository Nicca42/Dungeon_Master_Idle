import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, demoState, command, advanceTo } from '../src/game/engine';
import { DEFAULT_RULES, applyRules, validateRules, RULE_FIELDS } from '../src/game/config';
import { forecastGold } from '../src/game/forecast';
import { HOUR } from '../src/game/content';
import { decode } from '../src/persistence/schema';

test('treasury history reconciles all purchases and simulated income with actual gold', () => {
  let s = demoState();
  s = command(s, { type: 'hireMiner' });
  s = command(s, { type: 'fund', amount: 500 });
  s = advanceTo(s, s.now + 24 * HOUR);
  assert.equal(s.gold, 20000 + s.ledger!.reduce((n, e) => n + e.amount, 0));
  assert.ok(s.ledger!.some((e) => e.reason === 'Digger hiring' && e.amount === -2000));
  assert.ok(s.ledger!.some((e) => e.reason === 'Entrance fees' && e.amount > 0));
  assert.deepEqual(decode(JSON.stringify({ state: s, wall: 0 })).state.ledger, s.ledger);
});

test('baseline changes affect existing and new actors without losing wounds, earned gains or identity', () => {
  const s = demoState();
  const a = s.actors.find((a) => a.role === 'fighter')!;
  a.maxHealth = 12;
  a.health = 8;
  const next = applyRules(s, {
    ...DEFAULT_RULES,
    'fighter.maxHealth': 20,
    'fighter.damage': 14,
    'cost.miner': 12,
    arrivalHours: 2,
  });
  const changed = next.actors.find((x) => x.id === a.id)!;
  assert.equal(changed.maxHealth, 22);
  assert.equal(changed.health, 18);
  assert.equal(changed.damage, 14);
  assert.equal(a.maxHealth, 12);
  assert.equal(command(next, { type: 'hireMiner' }).gold, next.gold - 1200);
  assert.equal(next.nextArrivalAt, 2 * s.nextArrivalAt);
  const fresh = initialState(123, next.config);
  assert.equal(fresh.actors.find((a) => a.role === 'fighter')!.maxHealth, 20);
  assert.equal(fresh.actors.find((a) => a.role === 'fighter')!.damage, 14);
  assert.deepEqual(decode(JSON.stringify({ state: next, wall: 0 })).state.config, next.config);
});

test('deep stats validates all ranges, counts and unknown values', () => {
  assert.ok(RULE_FIELDS.length > 150);
  assert.throws(() => validateRules({ ...DEFAULT_RULES, 'zombie.damageMin': 20 }));
  assert.throws(() => validateRules({ ...DEFAULT_RULES, arrivalHours: 0 }));
  assert.throws(() => validateRules({ ...DEFAULT_RULES, unknown: 1 }));
  assert.throws(() => validateRules({ ...DEFAULT_RULES, 'policy.wood': 5, 'policy.silver': 5 }));
});

test('forecast is repeatable, uses current configuration and never mutates live state', async () => {
  const s = command(demoState(), { type: 'hireDefender' }),
    before = structuredClone(s);
  const first = await forecastGold(s, true);
  assert.equal(first.length, 25);
  assert.deepEqual(s, before);
  assert.deepEqual(first, await forecastGold(s, true));
  const expensive = applyRules(s, { ...DEFAULT_RULES, wage: 20 });
  assert.notDeepEqual(await forecastGold(expensive, true), first);
});

test('sub-hour mob spawn settings are used on simulation ticks instead of rounded to an hour', () => {
  let s = applyRules(demoState(), {
    ...DEFAULT_RULES,
    'zombie.spawnHours': 0.25,
    'slime.spawnHours': 0.25,
  });
  s.parties = [];
  const f = s.floors[0]!;
  for (const e of f.encounters)
    if (['zombie', 'slime'].includes(e.kind)) {
      e.active = false;
      e.readyAt = HOUR / 4;
    }
  f.spawnAt = HOUR / 4;
  s = advanceTo(s, HOUR / 4);
  assert.ok(s.floors[0]!.encounters.some((e) => ['zombie', 'slime'].includes(e.kind) && e.active));
});
