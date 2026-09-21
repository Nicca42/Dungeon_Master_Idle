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
      s = advanceTo(s, s.nextArrivalAt);
      assert.equal(s.actors.at(-1)!.role, role);
    }
    assert.equal(s.parties.length, 1);
    assert.equal(s.parties[0]!.members.length, 4);
  }
});

test('guild previews spawners in scheduled order and forecast matches the next formation', () => {
  let s = emptyTown(3);
  assert.deepEqual(
    [0, 1, 2].map((point) => nextArrivalClass(s, point)),
    ['fighter', 'fighter', 'wizard'],
  );
  const forecast = guildPartyForecast(s).remaining!;
  assert.equal(forecast, TICK + HOUR);
  const activeForecast = guildPartyForecast(s, true).remaining!;
  assert.equal(activeForecast, TICK + HOUR / 2);
  const activeState = advanceTo(s, activeForecast, true);
  assert.equal(activeState.parties.length, 1);
  assert.equal(advanceTo(s, activeForecast - TICK, true).parties.length, 0);
  s = advanceTo(s, forecast - TICK);
  assert.equal(s.parties.length, 0);
  s = advanceTo(s, forecast);
  assert.equal(s.parties.length, 1);
});

test('guild fills only missing roles and explains population and door-policy blockers', () => {
  const s = emptyTown();
  const sample = demoState().actors.find((a) => a.role === 'fighter')!;
  s.actors = [0, 1].map((i) => ({
    ...structuredClone(sample),
    id: 100 + i,
    status: 'town' as const,
  }));
  assert.equal(nextArrivalClass(s), 'wizard');
  assert.equal(guildPartyForecast(s).remaining, TICK + HOUR);
  s.spawnTiers = [2];
  assert.match(guildPartyForecast(s).reason!, /door policy/);
  s.spawnTiers = [1];
  s.config = { ...DEFAULT_RULES, populationCap: 6 };
  s.actors = Array.from({ length: 6 }, (_, i) => ({
    ...structuredClone(sample),
    id: 100 + i,
    status: 'town' as const,
  }));
  assert.match(guildPartyForecast(s).reason!, /Population limit/);
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
