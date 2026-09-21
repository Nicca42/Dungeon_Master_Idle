import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceTo, demoState, guildPartyForecast, spawnPopulation } from '../src/game/engine';
import { HOUR } from '../src/game/content';

test('fighter cap counts town and dungeon members, not recovery, training or dead fighters', () => {
  const s = demoState();
  const base = s.actors.find((a) => a.role === 'fighter')!;
  s.parties = [];
  s.actors = (['town', 'adventure', 'recovering', 'training', 'dead'] as const).map(
    (status, i) => ({ ...structuredClone(base), id: 100 + i, status }),
  );
  assert.deepEqual(
    spawnPopulation(s).map((a) => a.id),
    [100, 101],
  );
  s.actors[0]!.health = 0;
  assert.deepEqual(
    spawnPopulation(s).map((a) => a.id),
    [101],
  );
});

test('recovering and training fighters neither block the guild forecast nor actual arrivals', () => {
  let s = demoState();
  const base = s.actors.find((a) => a.role === 'fighter')!;
  s.parties = [];
  s.floors.forEach((f) => {
    f.encounters = [];
    f.restOccupants = [];
    f.restQueue = [];
  });
  s.research.push('guild');
  s.actors = Array.from({ length: 60 }, (_, i) => ({
    ...structuredClone(base),
    id: s.nextId++,
    status: i % 2 ? ('training' as const) : ('recovering' as const),
    until: 100 * HOUR,
  }));
  s.nextArrivalAt = s.nextTick;
  assert.equal(guildPartyForecast(s).reason, 'Need 2 fighters · 1 wizard · 1 healer');
  s = advanceTo(s, s.nextTick);
  assert.equal(s.actors.length, 61);
  assert.equal(s.actors.at(-1)!.role, 'fighter');
  assert.equal(s.actors.at(-1)!.status, 'town');
});

test('waiting fighters still enforce the cap and arriving parties retain their reserved places', () => {
  let s = demoState();
  const base = s.actors.find((a) => a.role === 'fighter')!;
  const party = s.parties[0]!;
  s.actors = Array.from({ length: 30 }, () => ({
    ...structuredClone(base),
    id: s.nextId++,
    status: 'town' as const,
  }));
  s.parties = [];
  s.research.push('guild');
  s.nextArrivalAt = s.nextTick;
  // Without the guild, the next normal spawn is a fighter, already at its cap.
  s.research = s.research.filter((r) => r !== 'guild');
  s.arrivalSequence = 0;
  s = advanceTo(s, s.nextTick);
  assert.equal(s.actors.length, 30);
  s.actors[0]!.status = 'adventure';
  s.parties = [{ ...party, status: 'arriving', members: [s.actors[0]!.id] }];
  assert.equal(spawnPopulation(s).length, 30);
});
