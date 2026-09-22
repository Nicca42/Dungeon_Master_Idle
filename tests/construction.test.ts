import { test } from 'node:test';
import assert from 'node:assert/strict';
import { excavationWork, foundationWork } from '../src/game/construction';
import { excavationMinutes, demoState } from '../src/game/engine';
import { decode } from '../src/persistence/schema';
test('construction workloads change only at five-floor boundaries', () => {
  for (let floor = 1; floor <= 50; floor++) {
    const group = Math.floor((floor - 1) / 5);
    assert.equal(excavationWork(floor), 12 * 1.5 ** group);
    assert.equal(foundationWork(floor), 6 * (group + 1));
    assert.equal(excavationMinutes(floor), 10 * 1.5 ** group);
    assert.equal(excavationMinutes(floor, true), 5 * 1.5 ** group);
    assert.equal(excavationMinutes(floor, false, 6), 5 * 1.5 ** group);
  }
});
test('old saves retain completed work with the new excavation and foundation requirements', () => {
  const state = demoState();
  const dig = state.floors[1],
    foundation = state.floors[2];
  dig.stage = 'excavating';
  dig.required = 18;
  dig.work = 4;
  foundation.stage = 'foundation';
  foundation.required = 18;
  foundation.work = 3;
  const restored = decode(JSON.stringify({ state, wall: Date.now() })).state;
  assert.equal(restored.floors[1].required, 12);
  assert.equal(restored.floors[1].work, 4);
  assert.equal(restored.floors[2].required, 6);
  assert.equal(restored.floors[2].work, 3);
  assert.equal(restored.gold, state.gold);
});
