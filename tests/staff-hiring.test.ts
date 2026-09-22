import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoState, command } from '../src/game/engine';
test('tier buttons hire the selected staff tier for 5 or 15 gold', () => {
  for (const role of ['maintenance', 'miner', 'defender'] as const) {
    const s = demoState();
    s.research.push('staff2');
    s.gold = 10000;
    for (const tier of [1, 2]) {
      const next = command(s, { type: 'hireStaff', role, tier });
      const actor = next.actors.at(-1)!;
      assert.equal(next.gold, s.gold - (tier === 1 ? 500 : 1500));
      assert.equal(actor.role, role);
      assert.equal(actor.outfitTier, tier);
      assert.equal(actor.maxStamina, tier * 10);
      assert.equal(actor.intelligence, tier * 10);
      assert.equal(actor.speed, tier * 10);
      assert.equal(actor.maxHealth, tier * 10);
      if (role === 'defender') assert.equal(actor.securitySpawnedAt, s.now);
    }
  }
});
test('staff tiers cannot bypass research or available funds', () => {
  const s = demoState();
  assert.throws(() => command(s, { type: 'hireStaff', role: 'maintenance', tier: 2 }), /Research/);
  s.research.push('staff2');
  s.gold = 1499;
  assert.throws(() => command(s, { type: 'hireStaff', role: 'maintenance', tier: 2 }));
  assert.equal(s.gold, 1499);
});
