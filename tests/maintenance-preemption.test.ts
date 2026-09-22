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

test('all available maintainers install continuously, including partially rested and returning staff', () => {
  let s = demoState();
  s.parties = [];
  s.nextArrivalAt = s.now + 100 * HOUR;
  const base = s.actors.find((a) => a.role === 'maintenance')!;
  s.actors = Array.from({ length: 4 }, (_, i) => ({
    ...structuredClone(base),
    id: s.nextId++,
    stamina: 3,
    status: i === 0 ? ('resting' as const) : ('working' as const),
    task: null,
  }));
  s.staffRoom = {
    capacity: 10,
    queue: [],
    occupants: [{ actorId: s.actors[0].id, recoverAt: s.now + HOUR }],
  };
  s.staffRestThreshold = 90;
  s.research.push('staminaManagement');
  s.actors[1].returnUntil = s.now + HOUR;
  const f = s.floors[0];
  f.stage = 'ready';
  f.installation = 'installing';
  f.health = 10;
  f.encounters.forEach((e) => {
    e.installed = false;
    e.active = false;
  });
  s = advanceTo(s, s.nextTick);
  assert.equal(s.actors.filter((a) => a.task?.kind === 'install').length, 4);
  assert.ok(s.actors.every((a) => a.stamina === 2 && a.status === 'working'));
  assert.equal(s.staffRoom!.occupants.length, 0);
  const end = Math.max(...s.actors.map((a) => a.task!.until));
  s = advanceTo(s, end);
  assert.equal(s.actors.filter((a) => a.task?.kind === 'install').length, 4);
  assert.ok(s.actors.every((a) => a.stamina === 1));
});

test('installation runs beside architecture upgrades and survives construction completion', () => {
  let s = demoState();
  s.parties = [];
  s.nextArrivalAt = s.now + 100 * HOUR;
  s.research.push('building');
  const f = s.floors[0];
  f.stage = 'furnishing';
  f.work = 0;
  f.required = 6;
  f.installation = 'installing';
  f.upgradeWork = 0;
  f.upgradeRequired = 6;
  f.encounters = f.encounters.filter((e) => e.kind === 'arrows').slice(0, 1);
  f.encounters[0].installed = false;
  f.encounters[0].active = false;
  s.actors = s.actors.filter((a) => a.role === 'maintenance' || a.role === 'miner');
  s.actors.forEach((a) => {
    a.stamina = a.maxStamina = 100;
    a.primary = 20;
    a.status = 'working';
    a.task = null;
  });
  s = advanceTo(s, s.nextTick);
  assert.ok(s.actors.some((a) => a.task?.kind === 'install'));
  assert.equal(s.floors[0].stage, 'furnishing');
  const deadline = s.actors.find((a) => a.task?.kind === 'install')!.task!.until;
  s = advanceTo(s, deadline + TICK);
  assert.equal(s.floors[0].installation, 'complete');
  assert.equal(s.floors[0].encounters[0].installed, true);
  const id = s.floors[0].encounters[0].id;
  s = advanceTo(s, 8 * HOUR);
  assert.equal(s.floors[0].stage, 'ready');
  assert.equal(s.floors[0].level, 2);
  assert.equal(s.floors[0].installation, 'complete');
  assert.equal(s.floors[0].encounters[0].id, id);
});
