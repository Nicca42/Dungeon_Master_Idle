import test from 'node:test';
import assert from 'node:assert/strict';
import { demoState, advanceTo, learn } from '../src/game/engine';
import { MINUTE, TICK } from '../src/game/content';
import { captureGhosts, settleGhosts, teachRevival, revivalCost } from '../src/game/ghosts';
import { decode } from '../src/persistence/schema';
import { initialTables, decodeTables } from '../src/planning/tables';
function fixture() {
  const s = demoState(),
    p = s.parties[0]!;
  p.status = 'moving';
  p.surfaceUntil = 0;
  const team = s.actors.filter((a) => p.members.includes(a.id));
  const healer = team.find((a) => a.role === 'healer')!,
    victim = team.find((a) => a.role === 'fighter')!;
  healer.revivalTrained = true;
  healer.stamina = healer.maxStamina;
  healer.speed = 10;
  victim.health = 0;
  captureGhosts(s, p);
  return { s, p, healer, victim };
}
test('revival resolves between ticks, keeps max health and charges two thirds maximum stamina', () => {
  const { s, healer, victim } = fixture();
  const max = victim.maxHealth;
  const before = advanceTo(s, s.now + MINUTE - 1);
  assert.equal(before.actors.find((a) => a.id === victim.id)!.health, 0);
  const next = advanceTo(before, s.now + MINUTE);
  assert.equal(next.actors.find((a) => a.id === victim.id)!.health, max / 2);
  assert.equal(next.actors.find((a) => a.id === victim.id)!.maxHealth, max);
  assert.equal(
    next.actors.find((a) => a.id === healer.id)!.stamina,
    healer.maxStamina - revivalCost(healer),
  );
  assert.equal(next.ghosts!.length, 0);
  assert.equal(victim.health, 0, 'advance does not mutate input');
});
test('insufficient stamina or a slow healer produces hostile half-stat ghosts at 00:05', () => {
  for (const slow of [false, true]) {
    const { s, p, healer, victim } = fixture();
    s.ghosts = [];
    victim.ghostCreated = false;
    if (slow) healer.speed = 1;
    else healer.stamina = 0;
    captureGhosts(s, p);
    settleGhosts(s, s.now + 5 * MINUTE - 1, learn);
    assert.equal(s.ghosts![0].hostile, false);
    settleGhosts(s, s.now + 5 * MINUTE, learn);
    const ghost = s.ghosts![0];
    assert.equal(ghost.hostile, true);
    assert.equal(ghost.damage, victim.damage / 2);
    assert.equal(ghost.maxHealth, victim.maxHealth / 2);
  }
});
test('dead caster cannot revive; exact deadline cast succeeds', () => {
  const { s, healer, victim } = fixture();
  healer.health = 0;
  settleGhosts(s, s.now + 5 * MINUTE, learn);
  assert.equal(victim.health, 0);
  assert.equal(s.ghosts![0].hostile, true);
  const f = fixture();
  f.s.ghosts![0].castAt = f.s.ghosts![0].deadline;
  settleGhosts(f.s, f.s.ghosts![0].deadline, learn);
  assert.equal(f.victim.health, f.victim.maxHealth / 2);
});
test('hostile ghost attacks its own party and survivors fight back', () => {
  const { s, healer } = fixture();
  healer.revivalTrained = false;
  const ghost = s.ghosts![0];
  delete ghost.castAt;
  delete ghost.healerId;
  ghost.hostile = true;
  ghost.health = 1000;
  const next = advanceTo(s, s.nextTick);
  assert.ok(
    next.actors
      .filter((a) => s.parties[0].members.includes(a.id))
      .some((a) => a.defense < s.actors.find((b) => b.id === a.id)!.defense),
  );
  assert.ok(next.ghosts![0].health < 1000);
});
test('revival course charges healer once and persists with ghost deadlines', () => {
  const { s, healer } = fixture();
  healer.revivalTrained = false;
  healer.status = 'town';
  healer.wealth = 2000;
  s.research.push('revivalClass');
  teachRevival(s);
  teachRevival(s);
  assert.equal(healer.wealth, 1000);
  const loaded = decode(JSON.stringify({ state: s, wall: 1 })).state;
  assert.equal(loaded.actors.find((a) => a.id === healer.id)!.revivalTrained, true);
  assert.deepEqual(loaded.ghosts, s.ghosts);
});
test('time skip and incremental simulation agree', () => {
  const { s } = fixture();
  const target = s.now + 3 * TICK;
  let incremental = s;
  for (let t = s.now + MINUTE; t <= target; t += MINUTE) incremental = advanceTo(incremental, t);
  assert.deepEqual(advanceTo(s, target), incremental);
});
test('planning migration adds Training and ghosts without replacing custom rows', () => {
  const tables = initialTables();
  tables.research.rows = tables.research.rows.filter((r) => r.id !== 'training');
  tables.stats.rows = tables.stats.rows.filter(
    (r) => !['training_revival', 'mobs_ghosts'].includes(r.id),
  );
  tables.research.rows[0].label = 'Custom';
  const next = decodeTables(tables);
  assert.equal(next.research.rows[0].label, 'Custom');
  assert.ok(next.research.rows.some((r) => r.id === 'training'));
  assert.ok(next.stats.rows.some((r) => r.id === 'mobs_ghosts'));
});
