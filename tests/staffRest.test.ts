import test from 'node:test';
import assert from 'node:assert/strict';
import { demoState, command, processStaffRest, advanceTo } from '../src/game/engine';
import { HOUR } from '../src/game/content';
import { decode } from '../src/persistence/schema';
import { saturateColor } from '../src/game/palette';

test('staff room is staff only, caps admission, expands for 5 gold and preserves FIFO', () => {
  const s = demoState();
  s.parties = [];
  const base = s.actors.find((a) => a.role === 'maintenance')!;
  s.actors = [];
  for (let i = 0; i < 11; i++)
    s.actors.push({ ...structuredClone(base), id: 100 + i, stamina: 3, status: 'resting' });
  const visitor = {
    ...structuredClone(base),
    id: 999,
    role: 'fighter' as const,
    stamina: 0,
    status: 'resting' as const,
  };
  s.actors.push(visitor);
  processStaffRest(s);
  assert.equal(s.staffRoom!.occupants.length, 10);
  assert.deepEqual(s.staffRoom!.queue, [110]);
  assert.ok(!s.staffRoom!.occupants.some((o) => o.actorId === visitor.id));
  const next = command(s, { type: 'expandStaffRoom' });
  assert.equal(next.gold, s.gold - 500);
  assert.equal(next.staffRoom!.capacity, 11);
  assert.equal(next.staffRoom!.occupants.at(-1)!.actorId, 110);
  assert.deepEqual(
    decode(JSON.stringify({ state: next, wall: 0 })).state.staffRoom,
    next.staffRoom,
  );
});

test('staff bank multiple skill gains only when admitted to the office, not on task completion', () => {
  let s = demoState();
  s.parties = [];
  const a = s.actors.find((a) => a.role === 'maintenance')!;
  a.pendingXp.primary = 23;
  a.stamina = 8;
  a.workFloor = 1;
  a.task = {
    floor: 1,
    encounter: s.floors[0]!.encounters[0]!.id,
    kind: 'reset',
    until: s.nextTick,
  };
  const primary = a.primary;
  s = advanceTo(s, s.nextTick);
  assert.equal(s.actors.find((x) => x.id === a.id)!.primary, primary);
  s = advanceTo(s, s.nextTick);
  const rested = s.actors.find((x) => x.id === a.id)!;
  assert.equal(rested.primary, primary + 2);
  assert.equal(rested.pendingXp.primary, 0);
  assert.equal(rested.bankedXp.primary, 4);
  const before = structuredClone(rested.bankedXp);
  processStaffRest(s);
  assert.deepEqual(rested.bankedXp, before);
});

test('adventurer saturation varies per spawn and survives save/reload without changing class hues', () => {
  const s = demoState();
  const people = s.actors.filter((a) => ['fighter', 'wizard', 'healer'].includes(a.role));
  assert.ok(people.every((a) => a.outfitSaturation! >= 0.8 && a.outfitSaturation! <= 1.2));
  assert.ok(new Set(people.map((a) => a.outfitSaturation)).size > 1);
  const saved = decode(JSON.stringify({ state: s, wall: 0 })).state;
  assert.deepEqual(
    saved.actors.map((a) => a.outfitSaturation),
    s.actors.map((a) => a.outfitSaturation),
  );
  assert.equal(saturateColor('#a58bc9', 1), '#a58bc9');
  assert.notEqual(saturateColor('#a58bc9', 0.9), saturateColor('#a58bc9', 1.5));
});
