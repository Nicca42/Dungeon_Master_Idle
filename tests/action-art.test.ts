import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACTIONS, actionStrip, FRAME_COUNT } from '../src/art/actionFrames';
test('all action tiers have deterministic eight-frame PNG strips', () => {
  for (const kind of ACTIONS)
    for (let tier = 1; tier <= 5; tier++) {
      const png = readFileSync(
        `assets/actions/${kind.toLowerCase().replaceAll(' ', '-')}-${tier}.png`,
      );
      assert.equal(png.readUInt32BE(16), 320);
      assert.equal(png.readUInt32BE(20), 40);
      const svg = decodeURIComponent(actionStrip(kind, tier).split(',')[1]);
      assert.equal((svg.match(/<g /g) || []).length, FRAME_COUNT);
      assert.equal(actionStrip(kind, tier), actionStrip(kind, tier));
    }
  assert.notEqual(actionStrip('Lightning spell', 1), actionStrip('Lightning spell', 5));
});
