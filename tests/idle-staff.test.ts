import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoState } from '../src/game/engine';
import { inactiveOfficeStaff } from '../src/game/idleStaff';
test('office idle count excludes workers, resting staff, guards and travellers', () => {
  const s = demoState();
  s.actors.forEach(a => { a.task = null; delete a.workFloor; delete a.returnUntil; });
  const maintainers = s.actors.filter(a => a.role === 'maintenance');
  assert.equal(inactiveOfficeStaff(s).length, maintainers.length);
  maintainers[0].status = 'resting';
  assert.equal(inactiveOfficeStaff(s).length, maintainers.length - 1);
  assert.equal(inactiveOfficeStaff(s, new Set([maintainers[1].id])).length, maintainers.length - 2);
  s.floors.forEach(f => f.stage = 'ready');
  assert.equal(inactiveOfficeStaff(s).length, maintainers.length - 1 + s.actors.filter(a => a.role === 'miner').length);
});
