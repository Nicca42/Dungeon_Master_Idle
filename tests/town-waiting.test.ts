import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceTo, demoState } from '../src/game/engine';
import { DAY, TICK } from '../src/game/content';
import { decode } from '../src/persistence/schema';

function waitingTown() {
  const s = demoState();
  const fighter = s.actors.find((a) => a.role === 'fighter')!;
  const wizard = s.actors.find((a) => a.role === 'wizard')!;
  s.parties = [];
  s.actors = Array.from({ length: 8 }, (_, i) => ({
    ...structuredClone(i < 6 ? fighter : wizard),
    id: s.nextId++,
    status: 'town' as const,
    until: TICK, // A legacy deadline must never expire a waiting actor.
    wealth: 2000,
  }));
  s.floors.forEach((f) => {
    f.encounters = [];
    f.restQueue = [];
    f.restOccupants = [];
  });
  s.nextArrivalAt = 1000 * DAY;
  return s;
}

test('unpartied adventurers wait indefinitely, including past legacy deadlines', () => {
  const s = waitingTown();
  for (const active of [false, true]) {
    const next = advanceTo(s, s.now + 30 * DAY, active);
    assert.deepEqual(
      next.actors.map((a) => a.id),
      s.actors.map((a) => a.id),
    );
    assert.ok(next.actors.every((a) => a.status === 'town' && a.health > 0));
    assert.equal(next.parties.length, 0);
  }
});

test('demo-sized skips and day-by-day offline catch-up preserve the same waiting queue and save', () => {
  const s = waitingTown();
  const target = s.now + 8 * DAY;
  const skipped = advanceTo(s, target);
  let chunks = s;
  while (chunks.now < target) chunks = advanceTo(chunks, Math.min(target, chunks.now + DAY));
  assert.deepEqual(chunks, skipped);
  const restored = decode(JSON.stringify({ state: skipped, wall: 0 })).state;
  assert.deepEqual(
    restored.actors.map((a) => [a.id, a.status]),
    s.actors.map((a) => [a.id, a.status]),
  );
});

test('the original waiting adventurers can still form a party after a long time skip', () => {
  let s = waitingTown();
  const ids = new Set(s.actors.map((a) => a.id));
  s = advanceTo(s, s.now + 8 * DAY);
  s.research.push('guild');
  s.nextArrivalAt = s.nextTick;
  s = advanceTo(s, s.nextTick);
  assert.equal(s.parties.length, 1);
  assert.ok(s.parties[0]!.members.filter((id) => ids.has(id)).length >= 3);
  assert.ok([...ids].every((id) => s.actors.some((a) => a.id === id)));
});
