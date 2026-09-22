import test from 'node:test';
import assert from 'node:assert/strict';
import { createDailyReports, dailyEvent, rollDailyReports } from '../src/game/dailyReports';
import { advanceTo, demoState, bankFloorXp, learn, attack } from '../src/game/engine';
import { observeAdventures, recordAdventures } from '../src/game/adventureStats';
import { DAY, HOUR, TICK } from '../src/game/content';
import { decode } from '../src/persistence/schema';

test('midnight finalizes once; midnight events belong to the following day', () => {
  const s = demoState();
  s.dailyReports = createDailyReports(0);
  dailyEvent(
    s,
    {
      adventurers: 4,
      parties: 1,
      entryGold: 4000,
      traps: 3,
      treasureGold: 700,
      xp: 18,
      deaths: 1,
      levels: 2,
      levelGold: 200,
    },
    DAY - 1,
  );
  assert.equal(s.dailyReports.reports.length, 0);
  dailyEvent(s, { traps: 1 }, DAY);
  const report = s.dailyReports.reports[0];
  assert.equal(report.day, 1);
  assert.equal(report.traps, 3);
  assert.equal(report.entryGold, 4000);
  assert.equal(s.dailyReports.current.traps, 1);
  rollDailyReports(s, DAY);
  assert.equal(s.dailyReports.reports.length, 1);
});
test('multi-day catch-up includes quiet days and retains at most ninety reports', () => {
  const s = demoState();
  s.dailyReports = createDailyReports(0);
  rollDailyReports(s, 100 * DAY);
  assert.equal(s.dailyReports.reports.length, 90);
  assert.equal(s.dailyReports.reports[0].day, 11);
  assert.equal(s.dailyReports.current.day, 101);
  assert.equal(s.dailyReports.reports.at(-1)!.xp, 0);
});
test('older saves start a clearly marked partial day and reports survive loading', () => {
  const s = demoState();
  delete s.dailyReports;
  s.now = 3 * DAY + HOUR;
  s.nextTick = s.now + TICK;
  rollDailyReports(s);
  dailyEvent(s, { traps: 2 });
  rollDailyReports(s, 4 * DAY);
  assert.equal(s.dailyReports!.reports[0].partial, true);
  assert.equal(s.dailyReports!.reports[0].day, 4);
  const loaded = decode(JSON.stringify({ state: s, wall: 1 })).state;
  assert.deepEqual(loaded.dailyReports, s.dailyReports);
});
test('daily XP and deaths include dungeon adventurers, excluding staff and town training', () => {
  const s = demoState(),
    p = s.parties[0];
  p.status = 'moving';
  s.dailyReports = createDailyReports(0);
  const a = s.actors.find((a) => a.id === p.members[0])!,
    staff = s.actors.find((a) => a.role === 'miner')!;
  const before = observeAdventures(s);
  learn(a, 'damage');
  learn(staff, 'damage');
  attack(a, 10000);
  recordAdventures(s, before);
  assert.equal(s.dailyReports.current.xp, 3);
  assert.equal(s.dailyReports.current.deaths, 1);
});
test('checkpoint records multiple stat gains and actual fees paid', () => {
  const s = demoState(),
    p = s.parties[0];
  s.dailyReports = createDailyReports(0);
  const a = s.actors.find((a) => a.id === p.members[0])!;
  a.pendingXp.damage = 2 * a.learning;
  bankFloorXp(s, p);
  assert.equal(s.dailyReports.current.levels, 2);
  assert.equal(s.dailyReports.current.levelGold, 200);
  bankFloorXp(s, p);
  assert.equal(s.dailyReports.current.levels, 2);
});
test('one time skip and incremental updates produce the same midnight report', () => {
  const s = demoState();
  s.now = DAY - 2 * TICK;
  s.nextTick = DAY - TICK;
  const end = DAY + TICK;
  const skipped = advanceTo(s, end);
  let stepped = s;
  for (let at = s.nextTick; at <= end; at += TICK) stepped = advanceTo(stepped, at);
  assert.deepEqual(skipped.dailyReports, stepped.dailyReports);
  assert.equal(skipped.dailyReports!.reports[0].day, 1);
});
