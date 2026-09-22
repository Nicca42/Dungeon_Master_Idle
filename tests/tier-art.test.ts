import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tierColor,
  tierStrength,
  slimeScale,
  characterColors,
  trapSpikeCount,
  arrowHoleCount,
} from '../src/art/tierStyle';
test('tier palettes reach full color at IV; fighters remain entirely gray', () => {
  assert.deepEqual(tierStrength, [0.45, 0.72, 0.86, 1, 1]);
  for (const color of characterColors.fighter)
    for (let tier = 1; tier <= 5; tier++) {
      const c = tierColor(color, tier);
      assert.equal(c.slice(1, 3), c.slice(3, 5));
      assert.equal(c.slice(3, 5), c.slice(5, 7));
    }
  for (const color of characterColors.wizard) assert.equal(tierColor(color, 4), color);
  assert.deepEqual([1, 2, 3, 4, 5].map(trapSpikeCount), [3, 3, 3, 4, 4]);
  assert.deepEqual([1, 2, 3, 4, 5].map(arrowHoleCount), [2, 3, 4, 5, 6]);
  assert.ok(slimeScale.every((n, i) => !i || n > slimeScale[i - 1]));
  assert.equal(slimeScale[4], 1);
});
