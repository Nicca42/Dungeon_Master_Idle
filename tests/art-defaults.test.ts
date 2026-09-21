import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, demoState } from '../src/game/engine';
import { nextLook } from '../src/game/appearance';
test('selected art is permanent for fresh tutorials and prepared demos, without sharing mutable arrays', () => {
  const s = initialState();
  assert.deepEqual(s.artChoices, {
    coffin: 4,
    puddle: 1,
    zombie: [1, 3, 5],
    fighter: [1, 3, 4],
    wizard: [2, 1, 3],
    healer: [1, 3, 4],
  });
  assert.deepEqual(demoState().artChoices, s.artChoices);
  s.artSequence = {};
  assert.deepEqual(
    Array.from({ length: 4 }, () => nextLook(s, 'wizard').variant),
    [2, 1, 3, 2],
  );
  s.artChoices!.fighter!.push(5);
  assert.deepEqual(initialState().artChoices!.fighter, [1, 3, 4]);
});
