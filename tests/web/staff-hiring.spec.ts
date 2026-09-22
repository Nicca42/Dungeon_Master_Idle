import { test, expect } from '@playwright/test';
import { demoState } from '../../src/game/engine';
test('unlocked staff pages offer both hiring tiers', async ({ page }) => {
  const state = demoState();
  state.research.push('staff2');
  state.gold = 100000;
  await page.addInitScript(
    (state) =>
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      ),
    state,
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Headquarters settings', exact: true }).click();
  await page.getByRole('button', { name: 'Staff', exact: true }).click();
  await page.getByRole('button', { name: 'Maintainers', exact: true }).click();
  await expect(
    page.getByRole('button', { name: /Maintainer I\s+5 gold/, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Maintainer II\s+15 gold/, exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Diggers', exact: true }).click();
  await expect(page.getByRole('button', { name: /Digger I\s+5 gold/, exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Digger II\s+15 gold/, exact: true }),
  ).toBeVisible();
});
