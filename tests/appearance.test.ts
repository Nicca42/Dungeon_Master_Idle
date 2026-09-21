import test from 'node:test';
import assert from 'node:assert/strict';
import { demoState, command, advanceTo } from '../src/game/engine';
import { nextLook } from '../src/game/appearance';
import { decode } from '../src/persistence/schema';
import { HOUR, TICK } from '../src/game/content';

test('art choices validate and cycle the selected three designs without consuming gameplay RNG', () => {
  let s = demoState();
  const seed = s.seed;
  assert.throws(() => command(s, { type: 'artChoices', choices: { fighter: [1, 1, 2] } }));
  assert.throws(() => command(s, { type: 'artChoices', choices: { coffin: 6 } }));
  s = command(s, {
    type: 'artChoices',
    choices: { fighter: [5, 2, 4], zombie: [1, 3, 5], coffin: 2, puddle: 4 },
  });
  const variants = Array.from({ length: 6 }, () => nextLook(s, 'fighter'));
  assert.deepEqual(
    variants.map((a) => a.variant),
    [5, 2, 4, 5, 2, 4],
  );
  assert.ok(variants.every((a) => a.saturation >= 0.8 && a.saturation <= 1.2));
  assert.equal(s.seed, seed);
  const loaded = decode(JSON.stringify({ state: s, wall: 0 })).state;
  assert.deepEqual(loaded.artChoices, s.artChoices);
  assert.equal(nextLook(loaded, 'fighter').variant, 5);
});

test('spawn backlog releases one mob and starts a fresh interval, never a burst', () => {
  let s = demoState();
  s.parties = [];
  s.actors = [];
  s.nextArrivalAt = 1000 * HOUR;
  const f = s.floors[0]!;
  s.policy.mobLimit = 1;
  const nests = f.encounters.filter((e) => ['zombie', 'slime'].includes(e.kind));
  nests.forEach((e) => {
    e.active = false;
    e.readyAt = 0;
    e.damage = 1;
  });
  f.spawnAt = 0;
  s = advanceTo(s, s.nextTick);
  assert.equal(
    s.floors[0]!.encounters.filter((e) => ['zombie', 'slime'].includes(e.kind) && e.active).length,
    1,
  );
  assert.ok(s.floors[0]!.spawnAt > s.now);
  const spawned = s.floors[0]!.encounters.find(
    (e) => ['zombie', 'slime'].includes(e.kind) && e.active,
  )!;
  spawned.active = false;
  spawned.readyAt = 100 * HOUR;
  s = advanceTo(s, s.now + TICK);
  assert.equal(
    s.floors[0]!.encounters.filter((e) => ['zombie', 'slime'].includes(e.kind) && e.active).length,
    1,
  );
});
