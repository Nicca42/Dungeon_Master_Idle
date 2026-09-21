import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceTo, demoState } from '../src/game/engine';
import { DEFAULT_RULES } from '../src/game/config';
import { HOUR } from '../src/game/content';
import { decode } from '../src/persistence/schema';

function spawn(reason: 'level' | 'wealth' | 'high' | 'eligible') {
  const s = demoState();
  s.parties = [];
  s.actors = [];
  s.floors.forEach((f) => {
    f.encounters = [];
    f.restQueue = [];
    f.restOccupants = [];
  });
  s.config = {
    ...DEFAULT_RULES,
    ...(reason === 'level'
      ? { 'fighter.maxHealth': 9 }
      : reason === 'wealth'
        ? { 'fighter.wealth': 0 }
        : {}),
  };
  if (reason === 'high') s.spawnTiers = [2];
  s.arrivalSequence = 0;
  s.nextArrivalAt = s.nextTick;
  return advanceTo(s, s.nextTick);
}

test('underlevel, overlevel and unaffordable arrivals leave in their spawn tick', () => {
  for (const reason of ['level', 'wealth', 'high'] as const) {
    const s = spawn(reason);
    assert.equal(s.actors.length, 0);
    assert.ok(s.activity.some((e) => e.text.includes('left immediately')));
  }
});

test('old rejection timers are cleared without waiting for their saved deadline', () => {
  const s = spawn('eligible');
  const a = s.actors[0]!;
  a.wealth = 0;
  a.entryDeadline = s.now + HOUR / 3;
  s.nextArrivalAt = 100 * HOUR;
  const saved = decode(JSON.stringify({ state: s, wall: 0 })).state;
  assert.equal(advanceTo(saved, saved.nextTick).actors.length, 0);
  assert.equal(advanceTo(saved, 8 * HOUR).actors.length, 0);
});

test('eligible adventurers still wait indefinitely and an obsolete rejection flag does not eject them', () => {
  const s = spawn('eligible');
  const id = s.actors[0]!.id;
  s.actors[0]!.entryDeadline = s.now;
  s.nextArrivalAt = 100 * HOUR;
  const next = advanceTo(s, 24 * HOUR);
  assert.equal(next.actors[0]!.id, id);
  assert.equal(next.actors[0]!.entryDeadline, undefined);
  assert.equal(next.actors[0]!.status, 'town');
});
