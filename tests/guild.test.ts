import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceTo, demoState, guildPartyForecast, nextArrivalClass } from '../src/game/engine';
import { HOUR, TICK } from '../src/game/content';
import { DEFAULT_RULES, RULE_FIELDS, applyRules } from '../src/game/config';

function emptyTown(points = 1) {
  const s = demoState();
  s.parties = [];
  s.actors = [];
  s.floors.forEach((f) => {
    f.encounters = [];
    f.restQueue = [];
    f.restOccupants = [];
  });
  s.research.push('guild');
  s.spawnPoints = points;
  s.spawnTiers = Array(points).fill(1);
  s.arrivalSequence = 0;
  s.nextArrivalAt = TICK;
  return s;
}

test('guild requests two fighters, then wizard, then healer and assembles a team', () => {
  for (const points of [1, 2, 3]) {
    let s = emptyTown(points);
    for (const role of ['fighter', 'fighter', 'wizard', 'healer']) {
      assert.equal(nextArrivalClass(s), role);
      s = advanceTo(s, Math.ceil(s.nextArrivalAt/TICK)*TICK);
      assert.equal(s.actors.at(-1)!.role, role);
    }
    assert.equal(s.parties.length, 1);
    assert.equal(s.parties[0]!.members.length, 4);
  }
});

test('guild previews spawn order but its status only describes the existing backlog', () => {
  const s = emptyTown(3);
  assert.deepEqual(
    [0, 1, 2].map((point) => nextArrivalClass(s, point)),
    ['fighter', 'fighter', 'wizard'],
  );
  assert.equal(guildPartyForecast(s).reason, 'Need 2 fighters · 1 wizard · 1 healer');
  assert.deepEqual(guildPartyForecast(s, true), guildPartyForecast(s, false));
});

test('guild missing-role status is independent of spawn caps, tiers and intervals', () => {
  const s = emptyTown();
  const sample = demoState().actors.find((a) => a.role === 'fighter')!;
  s.actors = Array.from({ length: 6 }, (_, i) => ({
    ...structuredClone(sample),
    id: 100 + i,
    status: 'town' as const,
  }));
  assert.equal(nextArrivalClass(s), 'wizard');
  const expected = { remaining: null, reason: 'Need 1 wizard · 1 healer' };
  assert.deepEqual(guildPartyForecast(s), expected);
  s.spawnTiers = [2];
  s.config = { ...DEFAULT_RULES, populationCap: 6, arrivalHours: 24 };
  assert.deepEqual(guildPartyForecast(s), expected);
});

test('spawn ratio controls replace class skills on spawner pages and apply to ongoing games', () => {
  let s = emptyTown();
  s.research = s.research.filter((r) => r !== 'guild');
  s = applyRules(s, {
    ...DEFAULT_RULES,
    'spawn1.fighterRatio': 4,
    'spawn1.wizardRatio': 1,
    'spawn1.healerRatio': 1,
  });
  assert.deepEqual(
    Array.from({ length: 6 }, (_, i) => nextArrivalClass({ ...s, arrivalSequence: i })),
    ['fighter', 'fighter', 'fighter', 'fighter', 'wizard', 'healer'],
  );
  for (const tier of [1, 2]) {
    const fields = RULE_FIELDS.filter((f) => f.group === `Level ${tier} adventurer spawners`);
    assert.equal(fields.filter((f) => f.key.endsWith('Ratio')).length, 3);
    assert.ok(fields.every((f) => !f.key.includes('maxHealth')));
  }
  assert.ok(
    RULE_FIELDS.some((f) => f.key === 'level2.fighter.maxHealth' && f.group === 'Level 2 fighter'),
  );
});

test('each mixed-tier spawn point follows its own configured ratio over a full cycle', () => {
  const s = emptyTown(2);
  s.research = s.research.filter((r) => r !== 'guild');
  s.spawnTiers = [1, 2];
  s.config = {
    ...DEFAULT_RULES,
    'spawn2.fighterRatio': 1,
    'spawn2.wizardRatio': 1,
    'spawn2.healerRatio': 4,
  };
  for (const point of [0, 1]) {
    const roles = Array.from({ length: 6 }, (_, i) =>
      nextArrivalClass({ ...s, arrivalSequence: i * 2 + point }, point),
    );
    assert.deepEqual(
      ['fighter', 'wizard', 'healer'].map((role) => roles.filter((r) => r === role).length),
      point === 0 ? [3, 2, 1] : [1, 1, 4],
    );
  }
});
