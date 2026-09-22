import { test, expect } from '@playwright/test';
import { demoState } from '../../src/game/engine';
import { captureGhosts } from '../../src/game/ghosts';
import { HOUR } from '../../src/game/content';

test('hostile ghost renders red eyes and Training research is accessible', async ({ page }) => {
  const s = demoState(),
    p = s.parties[0];
  p.status = 'moving';
  const a = s.actors.find((a) => a.id === p.members[0])!;
  a.health = 0;
  captureGhosts(s, p);
  s.ghosts![0].hostile = true;
  s.nextTick = s.now + HOUR;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(
    (state) =>
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      ),
    s,
  );
  await page.goto('/');
  const ghost = page.getByLabel(`${a.name}: hostile ghost`, { exact: true });
  await expect(ghost).toBeVisible();
  await expect(ghost.locator('rect[fill="#ff243e"]')).toHaveCount(2);
  await page.getByRole('button', { name: 'Research', exact: true }).first().click();
  await page.getByRole('button', { name: 'Training', exact: true }).click();
  await expect(page.getByText('Revival class', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
