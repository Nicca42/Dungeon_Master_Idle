import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceTo, demoState } from '../src/game/engine';
import { HOUR, TICK } from '../src/game/content';

function fixture() {
  const s = demoState();
  s.parties = [];
  s.nextArrivalAt = 100 * HOUR;
  const worker = s.actors.find((a) => a.role === 'maintenance')!;
  s.actors = [worker];
  worker.task = null;
  const trap = s.floors[0]!.encounters.find((e) => e.kind === 'trapdoor')!;
  trap.active = false;
  trap.installed = true;
  s.floors[0]!.encounters = [trap];
  return { s, worker, trap };
}

test('reset work starts on the next tick, before new-floor installation', () => {
  const { s, worker, trap } = fixture();
  const f = s.floors[1]!;
  f.stage = 'ready';
  f.installation = 'installing';
  f.encounters = [{ ...trap, id: s.nextId++, installed: false }];
  const next = advanceTo(s, s.nextTick);
  assert.equal(next.now, TICK);
  assert.equal(next.actors[0]!.task?.kind, 'reset');
  assert.equal(next.actors[0]!.task?.encounter, trap.id);
  assert.equal(next.actors[0]!.stamina, worker.stamina - 1);
  assert.equal(next.floors[1]!.encounters[0]!.installed, false);
});

test('maintainer with one stamina leaves the staff rest room for an urgent reset', () => {
  const { s, worker } = fixture();
  worker.stamina = 1;
  worker.status = 'resting';
  s.staffRoom = {
    capacity: 10,
    queue: [worker.id],
    occupants: [{ actorId: worker.id, recoverAt: HOUR }],
  };
  const next = advanceTo(s, s.nextTick);
  assert.equal(next.actors[0]!.task?.kind, 'reset');
  assert.equal(next.actors[0]!.stamina, 0);
  assert.equal(next.actors[0]!.status, 'working');
  assert.deepEqual(next.staffRoom!.queue, []);
  assert.deepEqual(next.staffRoom!.occupants, []);
});

test('empty maintainer rests, then starts a reset as soon as one stamina recovers', () => {
  const { s, worker } = fixture();
  worker.stamina = 0;
  let next = advanceTo(s, s.nextTick);
  assert.equal(next.actors[0]!.task, null);
  assert.equal(next.actors[0]!.status, 'resting');
  const recovered = advanceTo(next, next.staffRoom!.occupants[0]!.recoverAt);
  assert.equal(recovered.actors[0]!.task?.kind, 'reset');
  assert.equal(recovered.actors[0]!.stamina, 0);
});

test('completed maintainer takes the next reset without returning to the office; claims are unique', () => {
  const { s, worker, trap } = fixture();
  const second = { ...trap, id: s.nextId++ };
  s.floors[0]!.encounters.push(second);
  worker.task = { floor: 1, encounter: trap.id, kind: 'reset', until: s.nextTick };
  worker.workFloor = 1;
  const next = advanceTo(s, s.nextTick);
  assert.equal(next.floors[0]!.encounters[0]!.active, true);
  assert.equal(next.actors[0]!.task?.encounter, second.id);
  assert.equal(next.actors[0]!.returnUntil, undefined);
  const extra = { ...structuredClone(worker), id: s.nextId++, task: null, workFloor: undefined };
  s.actors.push(extra);
  const staffed = advanceTo(s, s.nextTick);
  assert.equal(staffed.actors.filter((a) => a.task?.encounter === second.id).length, 1);
});
