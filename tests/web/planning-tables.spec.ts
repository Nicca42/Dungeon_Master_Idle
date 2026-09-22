import { test, expect } from '@playwright/test';

test('planning tables edit, extend, reorder and persist independently', async ({ page }) => {
  await page.goto('/art');
  await page.getByRole('button', { name: 'Planning tables', exact: true }).click();
  const field = (name: string) => page.getByRole('textbox', { name, exact: true });
  await expect(field('Dungeon Depths — Level 1 — description')).toHaveValue(
    'The first five dungeon floors are unlocked.',
  );
  await expect(field('Dungeon Depths — Level 1 — unlocks')).toHaveValue(/\+5 floors unlocked/);
  await expect(field('Dungeon Depths — Level 1 — hours')).toHaveValue('0');
  await field('Dungeon Depths — Level 1 — hours').fill('2.5');
  await field('Dungeon Depths — Level 1 — name').fill('Research custom');
  await field('Dungeon Depths — Level 1 — description').fill('Custom description');
  await field('Dungeon Depths — Level 1 — unlocks').fill('+10 floors');
  await page.getByRole('button', { name: 'Add row', exact: true }).click();
  await field('Row 10 name').fill('New track');
  await page.getByRole('button', { name: 'Add column', exact: true }).click();
  await field('Column 7 name').fill('Level 6');
  await field('New track — Level 6 — name').fill('New unlock');
  await page.getByRole('button', { name: 'Move column Level 6 left', exact: true }).click();
  await page.getByRole('button', { name: 'Move row New track up', exact: true }).click();
  await expect(field('Column 6 name')).toHaveValue('Level 6');
  await expect(field('Row 9 name')).toHaveValue('New track');
  await expect(field('New track — Level 6 — name')).toHaveValue('New unlock');
  await page.getByRole('button', { name: 'Entity stats table', exact: true }).click();
  await field('floors / floor groups — Level 1').fill('Health: 123');
  await page.getByRole('button', { name: 'Move column Level 1 right', exact: true }).click();
  await page
    .getByRole('button', { name: 'Move row floors / floor groups down', exact: true })
    .click();
  await page.getByRole('button', { name: 'Save tables', exact: true }).click();
  await expect(page.getByText('Both tables saved on this device.')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Planning tables', exact: true }).click();
  await expect(field('Dungeon Depths — Level 1 — name')).toHaveValue('Research custom');
  await expect(field('Dungeon Depths — Level 1 — hours')).toHaveValue('2.5');
  await expect(field('Dungeon Depths — Level 1 — description')).toHaveValue('Custom description');
  await expect(field('Dungeon Depths — Level 1 — unlocks')).toHaveValue('+10 floors');
  await expect(field('New track — Level 6 — name')).toHaveValue('New unlock');
  await expect(field('Row 9 name')).toHaveValue('New track');
  await page.getByRole('button', { name: 'Entity stats table', exact: true }).click();
  await expect(field('Column 2 name')).toHaveValue('Level 1');
  await expect(field('Row 2 name')).toHaveValue('floors / floor groups');
  await expect(field('floors / floor groups — Level 1')).toHaveValue('Health: 123');
});
