import { test, expect } from '@playwright/test';
import { demoState } from '../../src/game/engine';
import { HOUR } from '../../src/game/content';

test('actions stay inside the real actor, show results, and disappear without replaying', async ({
  page,
}) => {
  const state = demoState();
  const party = state.parties[0];
  party.status = 'moving';
  party.actions = [];
  state.nextTick = state.now + HOUR;
  state.nextArrivalAt = state.now + HOUR;
  const team = party.members.map((id) => state.actors.find((a) => a.id === id)!);
  for (const [index, actor] of team.slice(0, 3).entries()) {
    actor.name = 'Robin';
    party.actions.push({
      actor: actor.name,
      actorId: actor.id,
      role: index === 1 ? 'wizard' : actor.role,
      tier: actor.outfitTier,
      kind: index === 0 ? 'gold' : index === 1 ? 'attack' : 'lock',
      time: state.now,
      difficulty: 999,
      power: 888,
      success: index !== 2,
    });
  }
  await page.addInitScript(
    (state) =>
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      ),
    state,
  );
  await page.goto('/');
  for (const actor of team.slice(0, 3)) {
    const target = page.getByRole('button', { name: `Inspect Robin ${actor.id}`, exact: true });
    await expect(target.getByTestId(`character-action-${actor.id}`)).toBeAttached();
  }
  await expect(page.locator('[aria-label*="difficulty 999"]')).toHaveCount(0);
  await expect(page.getByLabel('Robin: lock failed', { exact: true })).toBeAttached();
  await expect(page.getByLabel('Robin: attack succeeded', { exact: true })).toBeAttached();
  await expect(page.locator('[data-testid^="character-action-"]')).toHaveCount(0);
  await page.waitForTimeout(1200);
  await expect(page.locator('[data-testid^="character-action-"]')).toHaveCount(0);
});

test('spawn effects finish once while the spawned entities remain', async ({ page }) => {
  const state = demoState();
  state.nextTick = state.now + HOUR;
  state.nextArrivalAt = state.now + HOUR;
  const visitor = state.actors.find((a) => a.role === 'fighter')!;
  visitor.status = 'town';
  visitor.spawnedAt = state.now;
  state.parties.forEach((p) => (p.members = p.members.filter((id) => id !== visitor.id)));
  const mob = state.floors[0].encounters.find((e) => e.kind === 'zombie')!;
  mob.active = true;
  mob.roaming = true;
  mob.spawnedAt = state.now;
  await page.addInitScript(
    (state) =>
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      ),
    state,
  );
  await page.goto('/');
  await expect(page.getByLabel('Adventurer spawning', { exact: true })).toBeAttached();
  await expect(page.getByLabel('Mob spawning', { exact: true })).toBeAttached();
  await expect(page.getByLabel('Adventurer spawning', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Mob spawning', { exact: true })).toHaveCount(0);
  await page.waitForTimeout(1500);
  await expect(page.getByLabel('Adventurer spawning', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Mob spawning', { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: `Waiting ${visitor.name}`, exact: true }),
  ).toBeAttached();
  await expect(page.getByTestId('floor-character-bars').first()).toHaveCSS('top', '-36px');
});

test('idle research shortcut and surface buildings align', async ({ page }, testInfo) => {
  const state = demoState();
  state.researchJob = null;
  state.research.push('guild');
  state.nextTick = state.now + HOUR;
  await page.addInitScript(
    (state) =>
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      ),
    state,
  );
  await page.goto('/');
  const staff = page.getByRole('button', { name: 'Staff-only office rest room', exact: true });
  const guild = page.getByTestId('guild-building');
  await expect(staff).toBeAttached();
  await page.screenshot({ path: testInfo.outputPath('surface-review.png'), fullPage: true });
  const doorBox = await staff.boundingBox(),
    guildBox = await guild.boundingBox();
  expect(Math.abs(doorBox!.y + doorBox!.height - guildBox!.y - guildBox!.height)).toBeLessThan(2);
  await page
    .getByRole('button', { name: 'No research active: open research', exact: true })
    .click();
  await expect(page).toHaveURL(/\/research$/);
});

test('research prompt is hidden during active research', async ({ page }) => {
  const state = demoState();
  state.researchJob = { id: 'digging', end: state.now + 4 * HOUR };
  state.nextTick = state.now + HOUR;
  await page.addInitScript(
    (state) =>
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      ),
    state,
  );
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Headquarters settings', exact: true }),
  ).toBeAttached();
  await expect(
    page.getByRole('button', { name: 'No research active: open research', exact: true }),
  ).toHaveCount(0);
});

for (const queued of [false, true]) {
  test(`rest waiting effect only for room queue: ${queued}`, async ({ page }) => {
    const state = demoState();
    state.nextTick = state.now + HOUR;
    const party = state.parties[0];
    party.status = 'resting';
    party.checkpointed = true;
    party.actions = [];
    state.floors[0].restQueue = [party.id];
    for (const id of party.members) {
      const a = state.actors.find((a) => a.id === id)!;
      a.health = a.maxHealth;
      a.defense = a.maxDefense;
      a.stamina = a.maxStamina;
      a.primaryCurrent = a.primary;
    }
    if (queued) state.actors.find((a) => a.id === party.members[0])!.stamina = 0;
    await page.addInitScript(
      (state) =>
        localStorage.setItem(
          'underkeep-demo-v1',
          JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
        ),
      state,
    );
    await page.goto('/');
    await expect(
      page.getByRole('button', { name: 'Headquarters settings', exact: true }),
    ).toBeAttached();
    await expect(page.getByLabel('Waiting for rest', { exact: true })).toHaveCount(queued ? 1 : 0);
    if (queued) {
      const actor = state.actors.find((a) => a.id === party.members[0])!;
      await expect(
        page
          .getByRole('button', { name: `Inspect ${actor.name} ${actor.id}`, exact: true })
          .locator('svg[viewBox="0 -4 22 26"]'),
      ).toHaveAttribute('height', '46');
    }
  });
}

test('defeated party members are hidden and living members stay opaque', async ({ page }) => {
  const state = demoState();
  state.nextTick = state.now + HOUR;
  state.nextArrivalAt = state.now + HOUR;
  const party = state.parties[0];
  party.status = 'moving';
  party.actions = [];
  const dead = state.actors.find((a) => a.id === party.members[0])!;
  const living = state.actors.find((a) => a.id === party.members[1])!;
  dead.health = 0;
  await page.addInitScript(
    (state) =>
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      ),
    state,
  );
  await page.goto('/');
  const aliveSprite = page.getByRole('button', {
    name: `Inspect ${living.name} ${living.id}`,
    exact: true,
  });
  await expect(aliveSprite).toBeAttached();
  await expect(aliveSprite).toHaveCSS('opacity', '1');
  await expect(
    page.getByRole('button', { name: `Inspect ${dead.name} ${dead.id}`, exact: true }),
  ).toHaveCount(0);
});
