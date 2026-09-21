import test from 'node:test';
import assert from 'node:assert/strict';
import { STATS_CATEGORIES } from '../src/game/statsCategories';
import { RULE_FIELDS } from '../src/game/config';

test('every deep stats group belongs to exactly one populated subpage', () => {
  const pages = STATS_CATEGORIES.flatMap((c) => c.pages.map(([key]) => key));
  assert.equal(new Set(pages).size, pages.length);
  assert.deepEqual([...new Set(RULE_FIELDS.map((f) => f.group))].sort(), [...pages].sort());
});
test('mob creature stats and spawn timing have separate subpages', () => {
  for (const mob of ['slime', 'zombie']) {
    assert.equal(RULE_FIELDS.find((f) => f.key === `${mob}.health`)!.group, mob);
    assert.equal(
      RULE_FIELDS.find((f) => f.key === `${mob}.spawnHours`)!.group,
      `${mob === 'slime' ? 'Slime' : 'Zombie'} spawners`,
    );
  }
});
