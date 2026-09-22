import { test } from 'node:test';
import assert from 'node:assert/strict';
import { staffRoute, staffRoutePose } from '../src/game/staffRoute';
import { ENTRY_CENTER, EXIT_CENTER } from '../src/game/layout';
test('staff enter the surface cave and emerge from the destination exit', () => {
  const route = staffRoute({ floor: 0, x: 250 }, { floor: 3, x: 340 });
  assert.deepEqual(route.slice(-3), [
    { floor: 0, x: 90 },
    { floor: 3, x: EXIT_CENTER },
    { floor: 3, x: 340 },
  ]);
  for (let i = 0; i <= 100; i++) {
    const pose = staffRoutePose(route, i / 100);
    if (!pose.hidden) assert.ok(pose.floor === 0 || pose.floor === 3);
  }
  assert.equal(staffRoutePose(route, 1).x, 340);
});
test('diggers use the preceding floor next-level door for unfinished floors', () => {
  const route = staffRoute({ floor: 2, x: 300 }, { floor: 3, x: 75 }, true);
  assert.deepEqual(route, [
    { floor: 2, x: 300 },
    { floor: 2, x: ENTRY_CENTER },
    { floor: 3, x: EXIT_CENTER },
    { floor: 3, x: 75 },
  ]);
  const surface = staffRoute({ floor: 0, x: 250 }, { floor: 3, x: 75 }, true);
  assert.ok(surface.some((p) => p.floor === 2 && p.x === ENTRY_CENTER));
});
test('same-floor tasks walk directly and returning staff use the exit cave', () => {
  assert.equal(staffRoute({ floor: 2, x: 100 }, { floor: 2, x: 400 }).length, 2);
  const route = staffRoute({ floor: 2, x: 400 }, { floor: 0, x: 329 });
  assert.deepEqual(route[1], { floor: 2, x: EXIT_CENTER });
  assert.deepEqual(route[2], { floor: 0, x: 90 });
});
