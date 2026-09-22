import { test, expect } from '@playwright/test';
import { demoState } from '../../src/game/engine';
import { createDailyReports, dailyEvent, rollDailyReports } from '../../src/game/dailyReports';
import { DAY, TICK } from '../../src/game/content';
test('daily report displays grouped totals and survives reload', async ({ page }) => {
  const s = demoState();
  s.dailyReports = createDailyReports(0);
  dailyEvent(s, {
    adventurers: 12,
    parties: 3,
    entryGold: 12000,
    traps: 17,
    treasureGold: 2300,
    xp: 94,
    deaths: 2,
    levels: 8,
    levelGold: 800,
  });
  rollDailyReports(s, DAY);
  s.now = DAY;
  s.nextTick = DAY + TICK;
  await page.addInitScript((state) => {
    if (!localStorage.getItem('underkeep-demo-v1'))
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      );
  }, s);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/stats');
  await page.getByRole('button', { name: /Daily reports/ }).click();
  await expect(page.getByText('Day 1', { exact: true })).toBeVisible();
  for (const label of [
    'Visitors',
    'Dungeon activity',
    'Admission & advancement earnings',
    'Traps triggered',
    'Stat levels gained',
  ])
    await expect(page.getByTestId('daily-report').getByText(label, { exact: true })).toBeVisible();
  await expect(page.getByText('120 gold', { exact: true })).toBeVisible();
  await expect(page.getByText('128 gold', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: /Daily reports/ }).click();
  await expect(page.getByText('Day 1', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
