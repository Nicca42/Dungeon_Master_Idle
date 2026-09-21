import test from 'node:test';
import assert from 'node:assert/strict';
import { demoState, command, advanceTo, adventurerCap } from '../src/game/engine';
import { arrivalInterval, partyFormationTime } from '../src/game/config';
import { arrivalAt } from '../src/game/spawnTiming';
import { HOUR } from '../src/game/content';
import { researchAvailable } from '../src/game/research';
import { decode } from '../src/persistence/schema';

test('guild II requires the guild and improves spawn intervals and total capacity', () => {
  const s = demoState();
  assert.equal(researchAvailable(s, 'guild2'), false);
  s.research.push('guild');
  assert.equal(researchAvailable(s, 'guild2'), true);
  s.spawnPoints = 3;
  const cap = adventurerCap(s),
    interval = arrivalInterval(s);
  s.research.push('guild2');
  assert.equal(adventurerCap(s), cap + 20);
  assert.equal(arrivalInterval(s), interval * 0.75);
  s.arrivalSequence = 0;
  assert.equal(arrivalAt(s, 1) - arrivalAt(s, 0), HOUR / 4);
  assert.equal(partyFormationTime(s), 15 * 24 * 1000);
});

test('formation completes at 20 real seconds, or 15 with guild II, between action ticks', () => {
  for (const upgraded of [false, true]) {
    const s = demoState();
    s.escapedMobs = [];
    s.floors.forEach((f) => {
      f.encounters = [];
    });
    s.nextArrivalAt = 100 * HOUR;
    if (upgraded) s.research.push('guild', 'guild2');
    const p = s.parties[0]!;
    p.surfaceUntil = s.now + partyFormationTime(s);
    const before = advanceTo(s, p.surfaceUntil - 1);
    assert.equal(before.parties[0]!.status, 'arriving');
    const after = advanceTo(before, p.surfaceUntil);
    assert.equal(after.parties[0]!.status, 'moving');
    assert.equal(s.parties[0]!.status, 'arriving');
    assert.deepEqual(after, advanceTo(s, p.surfaceUntil));
  }
});

test('completing guild II shortens the current spawn countdown and persists', () => {
  let s = demoState();
  s.gold = 100000;
  s.research.push('guild');
  s = command(s, { type: 'research', id: 'guild2' });
  s.researchJob!.end = s.nextTick;
  s.nextArrivalAt = 2 * HOUR;
  const completedAt = s.nextTick;
  s = advanceTo(s, completedAt);
  assert.equal(s.nextArrivalAt, completedAt + (2 * HOUR - completedAt) * 0.75);
  assert.ok(decode(JSON.stringify({ state: s, wall: 0 })).state.research.includes('guild2'));
});
