import test from 'node:test';
import assert from 'node:assert/strict';
import { demoState, advanceTo } from '../src/game/engine';
import { HOUR, TICK } from '../src/game/content';
import { installationProgress } from '../src/game/installation';
import { decode } from '../src/persistence/schema';

test('reset interrupts installation, persists partial work, and resumes without another stamina charge', () => {
  let s = demoState();
  s.parties = [];
  s.nextArrivalAt = s.now + 100 * HOUR;
  const a = s.actors.find((a) => a.role === 'maintenance')!;
  s.actors = [a];
  a.stamina = 9;
  a.status = 'working';
  const f = s.floors[0]!;
  const reset = f.encounters.find((e) => e.kind === 'trapdoor')!;
  const install = f.encounters.find((e) => e.kind === 'arrows')!;
  f.encounters = [reset, install];
  reset.active = false;
  install.installed = false;
  install.active = false;
  f.installation = 'installing';
  a.workFloor = f.id;
  delete a.returnUntil;
  a.task = {
    kind: 'install',
    floor: f.id,
    encounter: install.id,
    arriveAt: s.now - HOUR / 2,
    until: s.now + HOUR / 2,
  };
  const pauseAt = s.nextTick;
  const expected = installationProgress(install, a.task, pauseAt);
  s = advanceTo(s, pauseAt);
  assert.equal(s.actors[0]!.task!.kind, 'reset');
  assert.equal(s.floors[0]!.encounters[1]!.installProgress, expected);
  assert.equal(s.actors[0]!.stamina, 8);
  s = decode(JSON.stringify({ state: s, wall: 0 })).state;
  assert.equal(s.floors[0]!.encounters[1]!.installProgress, expected);
  const end = s.actors[0]!.task!.until;
  s = advanceTo(s, end + TICK);
  assert.equal(s.floors[0]!.encounters[0]!.active, true);
  assert.equal(s.actors[0]!.task!.kind, 'install');
  assert.equal(s.actors[0]!.stamina, 8);
  const task = s.actors[0]!.task!;
  assert.equal(task.until - task.arriveAt!, Math.ceil(HOUR * (1 - expected)));
  s = advanceTo(s, task.until);
  assert.equal(s.floors[0]!.encounters[1]!.installed, true);
  assert.equal(s.floors[0]!.encounters[1]!.installProgress, undefined);
});

test('installation progress is frozen when paused and excludes travel on resumption', () => {
  const e = demoState().floors[0]!.encounters[0]!;
  e.installProgress = 0.4;
  assert.equal(installationProgress(e, null, HOUR), 0.4);
  const task = {
    kind: 'install' as const,
    floor: 1,
    encounter: e.id,
    arriveAt: HOUR,
    until: 2 * HOUR,
  };
  assert.equal(installationProgress(e, task, 0), 0.4);
  assert.equal(installationProgress(e, task, 1.5 * HOUR), 0.7);
  assert.equal(installationProgress(e, task, 3 * HOUR), 1);
});
