import { test, expect } from '@playwright/test';
test('art matrix has tiered class variants, actions, and pause control', async ({ page }) => {
  await page.goto('/art');
  await expect(page.getByText('Asset library · levels I–V')).toBeVisible();
  const table = page.getByLabel('Art table horizontal scroll');
  for (const kind of ['wizard', 'fighter', 'healer']) {
    await expect(table.locator(`[aria-label^="${kind} level "]`)).toHaveCount(15);
  }
  await expect(table.locator('[aria-label$=" icon"]')).toHaveCount(45);
  await expect(table.locator('[aria-label="Builders research level 1 icon"]')).toHaveAttribute(
    'width',
    '58',
  );
  await expect(table.getByText('5 bolts', { exact: true })).toHaveCount(1);
  await expect(table.locator('[aria-label$=" animation"]')).toHaveCount(50);
  for (let tier = 1; tier <= 5; tier++) {
    const chest = table.locator(`[aria-label="chest level ${tier} variant 1"]`);
    const mimic = table.locator(`[aria-label="mimic level ${tier} variant 1"]`);
    expect(await chest.innerHTML()).toBe(await mimic.innerHTML());
    expect(await chest.getAttribute('viewBox')).toBe(await mimic.getAttribute('viewBox'));
  }
  await expect(table.getByLabel('Gold earned level 1 animation', { exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Pause animations', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play animations', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Planning tables', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Research table', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Art table', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play animations', exact: true })).toBeVisible();
});
