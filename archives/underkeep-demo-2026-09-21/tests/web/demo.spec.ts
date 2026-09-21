import { expect, test, Page } from '@playwright/test';

async function finishTutorial(page: Page) {
  const open = async () => page.getByTestId('tutorial-action').click();
  const confirm = async (name: string) =>
    page.getByRole('button', { name, exact: true }).last().click();
  await open();
  await confirm('Open headquarters');
  await open();
  for (let i = 0; i < 3; i++) await confirm('Hire digger · 10 gold');
  for (let i = 0; i < 3; i++)
    await page.getByRole('button', { name: /Excavate next floor/ }).click();
  await open();
  await confirm('Build & fast-track floor 1');
  await open();
  for (let i = 0; i < 8; i++) await confirm('Next tip');
  await confirm('Furnish first floor · 10 gold');
  await page.getByRole('button', { name: /Build 1 rest spot.*5 gold/ }).click();
  await open();
  for (let i = 0; i < 3; i++) await confirm('Next tip');
  await confirm('Finish finances · 20 gold');
  await open();
  for (let i = 0; i < 3; i++) await confirm('Hire maintainer · 15 gold');
  await open();
  await confirm('Open the dungeon');
  await open();
  await confirm('Spawn first party · free');
  await expect(page.getByText('Business as unusual', { exact: true })).toBeVisible();
}

test('tutorial, time skip, office controls, and save/reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await finishTutorial(page);
  await page.getByRole('button', { name: 'Demo settings', exact: true }).first().click();
  await page.getByRole('button', { name: /5 minutes.*2 dungeon hours/ }).click();
  await expect(page.getByText(/Progress is already saved/)).toBeVisible();
  await expect(page.getByText(/Progress is already saved/)).toBeVisible();
  await page.getByRole('button', { name: 'Back to the dungeon' }).click();
  await page.getByRole('button', { name: 'Headquarters settings', exact: true }).click();
  await page.getByRole('button', { name: 'Finances', exact: true }).click();
  await expect(page.getByText('Dungeon finances', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Increase Entrance fee', exact: true }).click();
  await expect(page.getByText('11 gold', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Headquarters settings', exact: true }).click();
  await page.getByRole('button', { name: 'Finances', exact: true }).click();
  await expect(page.getByText('11 gold', { exact: true })).toBeVisible();
  await expect(page.getByText('A small cave-in.', { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('build and research screens remain accessible during setup', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('tutorial-action')).toBeVisible();
  await page.getByRole('button', { name: 'Build', exact: true }).click();
  await expect(page.getByText('Build from the ground down.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Develop', exact: true }).first()).toBeDisabled();
  await page.getByRole('button', { name: 'Research', exact: true }).click();
  await page.getByRole('button', { name: 'Staff investment', exact: true }).click();
  await expect(page.getByText('Faster digging', { exact: true })).toBeVisible();
  await page.getByTestId('tutorial-action').click();
  await page.getByRole('button', { name: 'Open headquarters', exact: true }).last().click();
  await expect(page.getByTestId('tutorial-action')).toHaveText('Excavate three floors');
});

test('surface party interpolates continuously and timers keep the UI responsive', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await finishTutorial(page);
  const party = page.locator('[aria-label*="walking from spawn to the cave"]').first();
  await expect(party).toBeVisible();
  const samples = await party.evaluate(async (element) => {
    const samples: { time: number; x: number }[] = [];
    const start = performance.now();
    await new Promise<void>((resolve) => {
      const sample = (time: number) => {
        samples.push({ time, x: element.getBoundingClientRect().x });
        if (time - start < 2500) requestAnimationFrame(sample);
        else resolve();
      };
      requestAnimationFrame(sample);
    });
    return samples;
  });
  const steps = samples.slice(1).map((sample, i) => Math.abs(sample.x - samples[i]!.x));
  const gaps = samples
    .slice(1)
    .map((sample, i) => sample.time - samples[i]!.time)
    .sort((a, b) => a - b);
  const metrics = {
    frames: samples.length,
    movingFrames: steps.filter((step) => step > 0.01).length,
    largestStepPixels: Math.max(...steps),
    p95FrameGapMs: gaps[Math.floor(gaps.length * 0.95)],
  };
  await testInfo.attach('movement-metrics', {
    body: JSON.stringify(metrics, null, 2),
    contentType: 'application/json',
  });
  expect(metrics.movingFrames).toBeGreaterThan(20);
  expect(metrics.largestStepPixels).toBeLessThan(25);
  // Broad regression threshold; not a claim of 60 FPS on physical devices.
  expect(metrics.p95FrameGapMs).toBeLessThan(120);
  await page.getByRole('button', { name: 'Headquarters settings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Finances', exact: true })).toBeVisible({
    timeout: 2000,
  });
});

test('layout arrows swap real slots, drag moves items, and saved positions survive reload', async ({
  page,
}) => {
  const { demoState } = await import('../../src/game/engine');
  const state = demoState();
  state.parties[0]!.status = 'moving';
  state.floors[1]!.stage = 'ready';
  state.floors[1]!.encounters = state.floors[0]!.encounters.map((e) => ({
    ...e,
    id: state.nextId++,
  }));
  const secondFloorFirst = state.floors[1]!.encounters[0]!.id;
  const maintainer = state.actors.find((a) => a.role === 'maintenance')!;
  state.actors.forEach((a) => {
    a.task = null;
  });
  maintainer.workFloor = 1;
  maintainer.task = {
    floor: 1,
    encounter: state.floors[0]!.encounters[0]!.id,
    kind: 'reset',
    until: state.now + 3600000,
  };
  await page.addInitScript((state) => {
    if (!localStorage.getItem('underkeep-demo-v1'))
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      );
  }, state);
  await page.goto('/');
  const edit = async () => {
    await page.getByRole('button', { name: 'Floor group settings', exact: true }).click();
    await page.getByRole('button', { name: 'Edit floor layout', exact: true }).click();
  };
  await edit();
  const first = state.floors[0]!.encounters[0]!;
  await page.getByRole('button', { name: /Move .* in slot 1 right/ }).click();
  await expect(page.getByTestId(`layout-item-${first.id}-slot-2`)).toBeVisible();
  await page.getByRole('button', { name: /Move .* in slot 2 left/ }).click();
  await expect(page.getByTestId(`layout-item-${first.id}-slot-1`)).toBeVisible();
  const handle = page.getByTestId(`layout-item-${first.id}-slot-1`).locator('[aria-label^="Drag"]');
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 15);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 82, box.y + 15, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByTestId(`layout-item-${first.id}-slot-2`)).toBeVisible();
  await page.getByRole('button', { name: 'Save layout', exact: true }).click();
  await expect(
    page.getByText('Dungeon updated. All changes saved.', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await edit();
  await expect(page.getByTestId(`layout-item-${first.id}-slot-2`)).toBeVisible();
  await page.getByRole('button', { name: 'Floor 2', exact: true }).click();
  await expect(page.getByTestId(`layout-item-${secondFloorFirst}-slot-2`)).toBeVisible();
});

test('rest door opens its own occupant menu with HH:MM recovery estimates', async ({ page }) => {
  const { demoState } = await import('../../src/game/engine');
  const state = demoState();
  const actor = state.actors.find((a) => a.role === 'fighter')!;
  actor.stamina = 5;
  state.floors[0]!.restOccupants = [
    { actorId: actor.id, partyId: state.parties[0]!.id, recoverAt: state.now + 3600000 },
  ];
  await page.addInitScript(
    (state) =>
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      ),
    state,
  );
  await page.goto('/');
  await page.getByRole('button', { name: /Rest room floor 1:/ }).click();
  const toggle = page.getByRole('button', { name: 'Rest room · Floor 1 occupants', exact: true });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  const occupant = page.getByRole('button', { name: `Fighter · ${actor.name}`, exact: true });
  await expect(occupant).toHaveCount(0);
  await toggle.click();
  await expect(occupant).toBeVisible();
  await expect(occupant.locator('svg')).toHaveCount(1);
  await expect(page.getByText(/Stamina 5\/10 · 03:00 remaining/)).toBeVisible();
});

test('new furnished floor orders installation before its centered open button appears', async ({
  page,
}) => {
  const { demoState } = await import('../../src/game/engine');
  const state = demoState();
  state.parties = [];
  state.policy = {
    ...state.policy,
    trapdoors: 1,
    wood: 0,
    arrows: 0,
    silver: 0,
    mimics: 0,
    mobSlots: 0,
  };
  state.floors[1]!.stage = 'ready';
  state.floors[1]!.installation = 'pending';
  state.floors[1]!.encounters = [];
  await page.addInitScript(
    (state) =>
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      ),
    state,
  );
  await page.goto('/');
  await page.getByRole('button', { name: /add traps & treasure.*-5 gold/ }).click();
  await expect(page.getByText('Installing 0/1', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'open', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Demo settings', exact: true }).first().click();
  await page.getByRole('button', { name: /5 minutes.*2 dungeon hours/ }).click();
  await page.getByRole('button', { name: 'Back to the dungeon', exact: true }).click();
  await page.getByRole('button', { name: 'open', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Inspect floor 2', exact: true })).toContainText(
    'OPEN',
  );
});

for (const count of [2, 3])
  test(`mob warning distinguishes ${count}/2 and rest information sits above entry`, async ({
    page,
  }) => {
    const { demoState } = await import('../../src/game/engine');
    const state = demoState();
    state.parties = [];
    const floor = state.floors[0]!;
    const mobs = floor.encounters.filter((e) => ['zombie', 'slime'].includes(e.kind));
    mobs.forEach((e) => {
      e.active = true;
      e.health = 10;
    });
    if (count === 3) floor.encounters.push({ ...mobs[0]!, id: state.nextId++, roaming: true });
    await page.addInitScript(
      (state) =>
        localStorage.setItem(
          'underkeep-demo-v1',
          JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
        ),
      state,
    );
    await page.goto('/');
    const warning = page.getByRole('alert', {
      name: `${count === 2 ? 'Yellow' : 'Red'} ! Mob limit reached ${count}/2`,
    });
    await expect(warning).toBeVisible();
    await expect(warning).toContainText(`Mobs: ${count}/2`);
    await expect(warning).not.toContainText('Too many');
    const color = await warning.evaluate((e) => getComputedStyle(e).color);
    const { colors } = await import('../../src/theme');
    const hex = count === 2 ? colors.gold : colors.red;
    const expected = `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;
    expect(color).toBe(expected);
    const rest = await page.getByTestId('rest-sign-1').boundingBox();
    const entry = await page.getByText('ENTRY', { exact: true }).nth(1).boundingBox();
    expect(rest!.y).toBeLessThan(entry!.y);
  });

test('hired security walks in from the adventurer spawner', async ({ page }) => {
  const { demoState, command } = await import('../../src/game/engine');
  const state = command(demoState(), { type: 'hireDefender' });
  state.parties = [];
  const guard = state.actors.at(-1)!;
  await page.addInitScript(
    (state) =>
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      ),
    state,
  );
  await page.goto('/');
  const security = page.getByTestId(`security-${guard.id}`);
  await expect(security).toBeVisible();
  const start = (await security.boundingBox())!.x;
  await expect.poll(async () => (await security.boundingBox())!.x).toBeLessThan(start - 8);
  await expect(
    page.getByRole('button', { name: `Guard ${guard.name}`, exact: true }),
  ).toBeVisible();
});

test('furnishing order is visible during construction and progress stays in the floor header', async ({
  page,
}) => {
  const { demoState } = await import('../../src/game/engine');
  const state = demoState();
  state.parties = [];
  const floor = state.floors[1]!;
  floor.stage = 'furnishing';
  floor.work = 2;
  floor.required = 6;
  floor.encounters = [];
  await page.addInitScript(
    (state) =>
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      ),
    state,
  );
  await page.goto('/');
  const header = page.getByRole('button', { name: 'Inspect floor 2', exact: true });
  await expect(header.getByTestId('floor-progress-2')).toBeVisible();
  const line = (await page.getByTestId('floor-header-line-2').boundingBox())!;
  const progressBox = (await header.getByTestId('floor-progress-2').boundingBox())!;
  expect(progressBox.y).toBeGreaterThanOrEqual(line.y - 1);
  expect(progressBox.y + progressBox.height).toBeLessThanOrEqual(line.y + line.height + 1);

  await expect(header).toContainText(/\d{2}:\d{2} · furnishing/);
  await page.getByRole('button', { name: /add traps & treasure.*-5 gold/ }).click();
  await expect(page.getByText(/Installation queued/)).toBeVisible();
  await expect(page.getByRole('button', { name: /add traps & treasure.*-5 gold/ })).toHaveCount(0);
});

test('active research bonus stops while the app is hidden and resumes when visible', async ({
  page,
}) => {
  const { demoState } = await import('../../src/game/engine');
  const state = demoState();
  state.researchJob = { id: 'digging', end: state.now + 4 * 3600000 };
  await page.clock.install();
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
    page.getByRole('button', { name: 'Open active research', exact: true }),
  ).toBeVisible();
  const savedEnd = () =>
    page.evaluate(
      () =>
        JSON.parse(JSON.parse(localStorage.getItem('underkeep-demo-v1')!).current).state.researchJob
          .end as number,
    );
  await page.clock.fastForward(10000);
  const activeEnd = await savedEnd();
  expect(activeEnd).toBeLessThan(state.researchJob.end - 150000);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.fastForward(10000);
  expect(Math.abs((await savedEnd()) - activeEnd)).toBeLessThan(30000);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.fastForward(10000);
  expect(await savedEnd()).toBeLessThan(activeEnd - 150000);
});

test('top encounter labels show empty chest gold and rest door opens from its bottom edge', async ({
  page,
}) => {
  const { demoState } = await import('../../src/game/engine');
  const state = demoState();
  state.parties = [];
  const chest = state.floors[0]!.encounters.find((e) => e.kind === 'wood')!;
  chest.gold = 0;
  chest.active = true;
  await page.addInitScript(
    (state) =>
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      ),
    state,
  );
  await page.goto('/');
  const info = page.getByTestId(`encounter-info-${chest.id}`);
  await expect(info).toHaveText('0 g');
  const color = await info.getByText('0 g').evaluate((e) => getComputedStyle(e).color);
  const { colors } = await import('../../src/theme');
  expect(color).toBe(
    `rgb(${[1, 3, 5].map((i) => parseInt(colors.red.slice(i, i + 2), 16)).join(', ')})`,
  );
  const rest = page.getByRole('button', { name: /Rest room floor 1:/ });
  await rest.scrollIntoViewIfNeeded();
  const box = (await rest.boundingBox())!;
  await rest.click({ position: { x: box.width / 2, y: box.height - 4 } });
  await expect(page.getByText('Rest room · Floor 1', { exact: true }).first()).toBeVisible();
});

test('character card displays class skill first and uncapped gold XP for every skill', async ({
  page,
}) => {
  const { demoState } = await import('../../src/game/engine');
  const state = demoState();
  const actor = state.actors.find((a) => a.role === 'wizard')!;
  actor.status = 'town';
  actor.pendingXp.primary = 13;
  actor.primaryCurrent = 4;
  actor.bankedXp.primary = 0;
  state.actors = [actor];
  state.parties = [];
  await page.addInitScript(
    (state) =>
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      ),
    state,
  );
  await page.goto('/');
  await page.getByRole('button', { name: `Waiting ${actor.name}`, exact: true }).click();
  await expect(page.getByTestId('actor-current')).toContainText('Currently: Waiting for a party');
  await expect(page.getByTestId('actor-next')).toContainText('Queued: Form a party');
  await expect(page.getByTestId('skill-primary')).toContainText('Mana · Primary skill');
  await expect(page.getByTestId('skill-primary')).toContainText('4 / 10');
  await expect(page.getByTestId('xp-primary')).toContainText('13/10 XP · +1 ready');
  const primary = (await page.getByTestId('skill-primary').boundingBox())!;
  const defense = (await page.getByTestId('skill-maxDefense').boundingBox())!;
  expect(primary.y).toBeLessThan(defense.y);
  for (const stat of [
    'primary',
    'maxDefense',
    'maxHealth',
    'maxStamina',
    'damage',
    'intelligence',
    'speed',
  ]) {
    await expect(page.getByTestId(`xp-${stat}`)).toContainText('/10 XP');
  }
});

test('floor settings buy the next room and save adjustable rest fees', async ({ page }) => {
  const { demoState } = await import('../../src/game/engine');
  const state = demoState();
  state.parties = [];
  state.floors[1]!.stage = 'ready';
  state.floors[1]!.restSpots = 0;
  await page.addInitScript((state) => {
    if (!localStorage.getItem('underkeep-demo-v1'))
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      );
  }, state);
  await page.goto('/');
  await page.getByRole('button', { name: 'Floor group settings', exact: true }).click();
  await page.getByRole('button', { name: /add rest room to new floor/ }).click();
  await expect(page.getByRole('button', { name: /add rest room to new floor/ })).toBeDisabled();
  await page.getByRole('button', { name: 'Increase rest fee', exact: true }).click();
  await page.getByRole('button', { name: 'Increase rest fee', exact: true }).click();
  await page.getByRole('button', { name: 'Decrease rest fee', exact: true }).click();
  await page.getByRole('button', { name: 'Apply group settings', exact: true }).click();
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const save = JSON.parse(localStorage.getItem('underkeep-demo-v1')!);
        return JSON.parse(save.current).state.policy.restFee;
      }),
    )
    .toBe(1);
});

test('stats forecast and deep baseline editing persist across reload and a fresh game', async ({
  page,
}) => {
  const { demoState } = await import('../../src/game/engine');
  const state = demoState();
  await page.addInitScript((state) => {
    if (!sessionStorage.getItem('stats-seeded')) {
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      );
      sessionStorage.setItem('stats-seeded', 'yes');
    }
  }, state);
  await page.goto('/stats');
  await expect(page.getByText('Gold over time', { exact: true })).toBeVisible();
  await expect(page.getByText(/Expected net:/)).toBeVisible();
  await expect(page.getByText('Entrance fees', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Deep stats', exact: true }).click();
  await page.getByRole('button', { name: 'Edit baseline', exact: true }).click();
  await page.getByRole('button', { name: 'Increase fighter.maxHealth', exact: true }).click();
  await expect(page.getByTestId('rule-fighter.maxHealth')).toHaveText('11');
  await page.getByRole('button', { name: 'Save baseline', exact: true }).click();
  await expect(page.getByTestId('baseline-progress')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit baseline', exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('underkeep-baseline-v1')!)['fighter.maxHealth'],
      ),
    )
    .toBe(11);
  await page.reload();
  await page.getByRole('button', { name: 'Deep stats', exact: true }).click();
  await expect(page.getByTestId('rule-fighter.maxHealth')).toHaveText('11');
  await page.evaluate(() => localStorage.removeItem('underkeep-demo-v1'));
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(
            JSON.parse(localStorage.getItem('underkeep-demo-v1')!).current,
          ).state.actors.find((a: any) => a.role === 'fighter').maxHealth,
      ),
    )
    .toBe(11);
  await page.getByRole('button', { name: 'Deep stats', exact: true }).click();
  await page.screenshot({ path: `/tmp/stats-${test.info().project.name}.png`, fullPage: true });
});

test('blue office door opens staff roster and capacity upgrades admit waiting staff', async ({
  page,
}) => {
  const { demoState, processStaffRest } = await import('../../src/game/engine');
  const state = demoState();
  state.parties = [];
  const base = state.actors.find((a) => a.role === 'maintenance')!;
  state.actors = Array.from({ length: 11 }, (_, i) => ({
    ...structuredClone(base),
    id: 100 + i,
    name: `Worker ${i + 1}`,
    status: 'resting' as const,
    stamina: 4,
  }));
  processStaffRest(state);
  await page.addInitScript((state) => {
    if (!localStorage.getItem('underkeep-demo-v1'))
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      );
  }, state);
  await page.goto('/');
  const door = page.getByRole('button', { name: 'Staff-only office rest room', exact: true });
  await expect(door).toBeVisible();
  await page.screenshot({ path: `/tmp/staff-door-${test.info().project.name}.png` });
  await door.click();
  await expect(page.getByText('10/10 occupied · 1 waiting', { exact: true })).toBeVisible();
  const toggle = page.getByRole('button', {
    name: 'Staff-only office rest room occupants',
    exact: true,
  });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: /Maintainer · Worker/ })).toHaveCount(0);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: /Maintainer · Worker/ }).first()).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  await page
    .getByRole('button', { name: 'Expand staff room · +1 person · 5 gold', exact: true })
    .click();
  await expect(page.getByText('11/11 occupied · 0 waiting', { exact: true })).toBeVisible();
  await expect(page.getByText(/Worker 11 · waiting/)).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Staff-only office rest room', exact: true }).click();
  await expect(page.getByText('11/11 occupied · 0 waiting', { exact: true })).toBeVisible();
});

test('research categories expose progression and spawn purchases live in Office Adventurers', async ({
  page,
}) => {
  const { demoState, command, advanceTo } = await import('../../src/game/engine');
  let state = demoState();
  state.gold = 100000;
  state.parties = [];
  state.research.push('localAds', 'level2Adventurers');
  state = command(state, { type: 'research', id: 'depths' });
  state.researchJob!.end = state.nextTick;
  state = advanceTo(state, state.nextTick);
  await page.addInitScript((state) => {
    if (!localStorage.getItem('underkeep-demo-v1'))
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      );
  }, state);
  await page.goto('/research');
  await expect(
    page.getByRole('button', { name: 'Research Better basic traps', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Dungeon depths', exact: true }).click();
  await expect(page.getByText("✓ Get diggin'", { exact: true })).toBeVisible();
  await expect(page.getByText(/10\/50 floors unlocked/)).toBeVisible();
  await page.getByRole('button', { name: 'Treasure', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Research Gold chests', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Buy spawn point/ })).toHaveCount(0);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Inspect floor 10', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Headquarters settings', exact: true }).click();
  await page.getByRole('button', { name: 'Adventurers', exact: true }).click();
  await page.getByRole('button', { name: /Buy spawn point/ }).click();
  await expect(page.getByText('Spawn point 2 · Level 1', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Upgrade to level 2 · 25 gold', exact: true })
    .last()
    .click();
  await expect(page.getByText('Spawn point 2 · Level 2', { exact: true })).toBeVisible();
  await page.screenshot({ path: `/tmp/research-office-${test.info().project.name}.png` });
});

test('upgraded dungeon art and Mimics II remain visible while builders upgrade the next floor', async ({
  page,
}) => {
  const { demoState } = await import('../../src/game/engine');
  const state = demoState();
  state.parties = [];
  state.research.push('building', 'betterTraps');
  state.floors[0]!.level = 2;
  state.floors[0]!.health = 20;
  state.floors[0]!.defense = 20;
  const mimic = state.floors[0]!.encounters.find((e) => e.kind === 'mimic')!;
  mimic.tier = 2;
  state.floors[1]!.stage = 'ready';
  state.floors[1]!.upgradeWork = 3;
  state.floors[1]!.upgradeRequired = 6;
  await page.addInitScript(
    (state) =>
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      ),
    state,
  );
  await page.goto('/');
  await expect(page.getByTestId('upgrade-progress-2')).toContainText('Building level 2');
  await expect(page.getByTestId('upgrade-art-2')).toBeVisible();
  await expect(page.getByTestId(`encounter-info-${mimic.id}`)).toContainText('Mimics II');
  await page.screenshot({ path: `/tmp/research-art-${test.info().project.name}.png` });
});

test('empty layout picker installs unlocked fixtures and monster limit saves separately', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const { demoState, attack } = await import('../../src/game/engine');
  const state = demoState();
  state.parties = [];
  const chest = state.floors[0]!.encounters.find((e) => e.kind === 'wood')!;
  attack(chest, 1000);
  await page.addInitScript(
    (state) =>
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      ),
    state,
  );
  await page.goto('/');
  await expect(page.getByTestId(`destroyed-fixture-${chest.id}`)).toBeVisible();
  await page.screenshot({ path: `/tmp/fixture-glow-${test.info().project.name}.png` });
  await page.getByRole('button', { name: 'Floor group settings', exact: true }).click();
  await page.getByRole('button', { name: 'Increase Monster limit per floor', exact: true }).click();
  await page.getByRole('button', { name: 'Apply group settings', exact: true }).click();
  await page.getByRole('button', { name: 'Edit floor layout', exact: true }).click();
  const empty = page.getByRole('button', { name: 'Add trap', exact: true });
  const before = await empty.count();
  await empty.first().click();
  await expect(page.getByRole('button', { name: 'zombie spawner', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'gold', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Arrow wall', exact: true }).click();
  await expect(empty).toHaveCount(before - 1);
  const save = await page.evaluate(
    () => JSON.parse(JSON.parse(localStorage.getItem('underkeep-demo-v1')!).current).state,
  );
  expect(errors.filter((e) => /non-boolean|collapsable/.test(e))).toEqual([]);
  expect(save.policy.mobLimit).toBe(3);
  expect(save.policy.mobSlots).toBe(2);
  expect(save.floors[0].encounters.filter((e: any) => e.kind === 'arrows')).toHaveLength(2);
});

test('art gallery previews five options in each category and saves explicit choices', async ({
  page,
}) => {
  const { demoState } = await import('../../src/game/engine');
  const state = demoState();
  await page.addInitScript(
    (state) =>
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      ),
    state,
  );
  await page.goto('/art');
  for (const category of ['coffin', 'puddle', 'zombie', 'fighter', 'wizard', 'healer']) {
    await page.getByRole('button', { name: category, exact: true }).click();
    await expect(
      page.getByRole('button', { name: /^(Choose [1-5]|Selected · [1-3])$/ }),
    ).toHaveCount(5);
    if (test.info().project.name === 'desktop')
      await page.screenshot({ path: `/tmp/art-options-${category}.png`, fullPage: true });
  }
  await page.getByRole('button', { name: 'coffin', exact: true }).click();
  await page.getByRole('button', { name: 'Choose 2', exact: true }).click();
  await page.getByRole('button', { name: 'Apply coffin selection', exact: true }).click();
  await expect(
    page.getByText('Saved. Spawner art updates now; character designs apply to new spawns.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'zombie', exact: true }).click();
  while (await page.getByRole('button', { name: /^Selected ·/ }).count())
    await page
      .getByRole('button', { name: /^Selected ·/ })
      .first()
      .click();
  for (const i of [1, 3, 5])
    await page.getByRole('button', { name: `Choose ${i}`, exact: true }).click();
  await page.getByRole('button', { name: 'Apply zombie selection', exact: true }).click();
  const save = await page.evaluate(
    () => JSON.parse(JSON.parse(localStorage.getItem('underkeep-demo-v1')!).current).state,
  );
  expect(save.artChoices.coffin).toBe(2);
  expect(save.artChoices.zombie).toEqual([1, 3, 5]);
});

test('trap inspection and ready-party counters appear without recovered characters crowding the door', async ({
  page,
}) => {
  const { demoState } = await import('../../src/game/engine');
  const state = demoState();
  const p = state.parties[0]!;
  p.status = 'resting';
  p.checkpointed = true;
  p.node = state.floors[0]!.encounters.length;
  state.floors[0]!.restQueue = [p.id];
  for (const id of p.members) {
    const a = state.actors.find((a) => a.id === id)!;
    a.health = a.maxHealth;
    a.defense = a.maxDefense;
    a.stamina = a.maxStamina;
    a.primaryCurrent = a.primary;
  }
  const last = state.actors.find((a) => a.id === p.members.at(-1))!;
  last.stamina = 0;
  const trap = state.floors[0]!.encounters.find((e) => e.kind === 'trapdoor')!;
  await page.addInitScript(
    (state) =>
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      ),
    state,
  );
  await page.goto('/');
  await expect(page.getByTestId('party-recovery-1')).toContainText(
    `${p.members.length - 1}/${p.members.length}`,
  );
  const first = state.actors.find((a) => a.id === p.members[0])!;
  await expect(
    page.getByRole('button', { name: `Inspect ${first.name} ${first.id}`, exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: `Inspect trapdoor trap ${trap.id}`, exact: true }).click();
  await expect(page.getByText(`Damage: ${trap.damage}`, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close trap stats', exact: true }).click();
});

test('adventure stats and both adventurer and monster spawner settings are accessible', async ({
  page,
}) => {
  const { demoState, advanceTo } = await import('../../src/game/engine');
  const { HOUR } = await import('../../src/game/content');
  const state = advanceTo(demoState(), HOUR);
  await page.addInitScript(
    (state) =>
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      ),
    state,
  );
  await page.goto('/stats');
  await page.getByRole('button', { name: 'Adventure stats', exact: true }).click();
  await expect(page.getByText('Skill XP over time', { exact: true })).toBeVisible();
  await expect(page.getByText(/Defense damage dealt:/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Deep stats', exact: true }).click();
  for (const group of [
    'Level 1 adventurer spawners',
    'Level 2 adventurer spawners',
    'Zombie spawners',
    'Slime spawners',
  ]) {
    await page
      .getByRole('button', {
        name: `Stats category ${group.includes('adventurer') ? 'Adventurers' : 'Mobs'}`,
        exact: true,
      })
      .click();
    await page.getByRole('button', { name: `Stats group ${group}`, exact: true }).click();
    await expect(
      page.getByText(/Shared town setting|spawn.*hours|reset.*hours/).first(),
    ).toBeVisible();
  }
});

test('completed mob spawn ring is solid and over-cap text is red', async ({ page }) => {
  const { demoState } = await import('../../src/game/engine');
  const state = demoState();
  state.parties = [];
  state.policy.mobLimit = 1;
  state.floors[0]!.spawnAt = 0;
  for (const e of state.floors[0]!.encounters.filter((e) => ['zombie', 'slime'].includes(e.kind))) {
    e.active = true;
    e.readyAt = 0;
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
  const timer = page.getByLabel('Spawn ready, waiting for capacity').first();
  await expect(timer).toBeVisible();
  await expect(timer).toContainText('00:00');
  expect(await timer.locator('circle').last().getAttribute('stroke-dasharray')).toBeNull();
  const warning = page.getByTestId('floor-mob-count-1');
  const color = await warning.evaluate((e) => getComputedStyle(e).color);
  const { colors } = await import('../../src/theme');
  const expected = await page.evaluate((color) => {
    const e = document.createElement('div');
    e.style.color = color;
    document.body.append(e);
    const result = getComputedStyle(e).color;
    e.remove();
    return result;
  }, colors.red);
  expect(color).toBe(expected);
});

test('staff excavation button queues floor six after a depth research unlock', async ({ page }) => {
  const { demoState, command, advanceTo } = await import('../../src/game/engine');
  let state = demoState();
  state.gold = 100000;
  state.parties = [];
  state.floors.forEach((f) => {
    f.stage = 'open';
    f.encounters = [];
  });
  state = command(state, { type: 'research', id: 'depths' });
  state.researchJob!.end = state.nextTick;
  state = advanceTo(state, state.nextTick);
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
  await page.getByRole('button', { name: 'Diggers', exact: true }).click();
  const button = page.getByRole('button', { name: /Excavate next floor/ });
  await expect(button).toBeEnabled();
  await button.click();
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          JSON.parse(JSON.parse(localStorage.getItem('underkeep-demo-v1')!).current).state.floors[5]
            .stage,
      ),
    )
    .toBe('queued');
});

test('town timers are staggered and the researched guild previews the missing healer', async ({
  page,
}) => {
  const { demoState } = await import('../../src/game/engine');
  const { HOUR } = await import('../../src/game/content');
  const state = demoState();
  state.parties = [];
  state.spawnPoints = 3;
  state.spawnTiers = [1, 1, 1];
  state.nextArrivalAt = HOUR;
  state.arrivalSequence = 0;
  state.research.push('guild');
  state.actors = state.actors.filter((a) => a.role !== 'healer');
  state.actors
    .filter((a) => ['fighter', 'wizard'].includes(a.role))
    .forEach((a) => {
      a.status = 'town';
      a.wealth = 2000;
    });
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
    page.getByRole('button', { name: 'Basic Adventurers Guild', exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('town-spawner-0')).toContainText('01:00');
  await expect(page.getByTestId('town-spawner-1')).toContainText('01:20');
  await expect(page.getByTestId('town-spawner-2')).toContainText('01:40');
  await expect(
    page.getByTestId('town-spawner-0').getByLabel('Next adventurer: healer'),
  ).toHaveCount(1);
  await expect(page.getByTestId('guild-party-countdown')).toContainText('Need 1 healer');
  await page.screenshot({ path: `/tmp/guild-${test.info().project.name}.png` });
});

test('linked silver and gold deep stats have working edit controls', async ({ page }) => {
  const { demoState } = await import('../../src/game/engine');
  const state = demoState();
  await page.addInitScript(
    (state) =>
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      ),
    state,
  );
  await page.goto('/stats');
  await page.getByRole('button', { name: 'Deep stats', exact: true }).click();
  await page.getByRole('button', { name: 'Edit baseline', exact: true }).click();
  await page.getByRole('button', { name: 'Stats category Treasure', exact: true }).click();
  await page.getByRole('button', { name: 'Stats group silver', exact: true }).click();
  await page.getByRole('button', { name: 'Increase silver.health', exact: true }).click();
  await expect(page.getByTestId('rule-silver.health')).toHaveText('22');
  await page.getByRole('button', { name: 'Stats group gold', exact: true }).click();
  await page.getByRole('button', { name: 'Increase gold.health', exact: true }).click();
  await expect(page.getByTestId('rule-gold.health')).toHaveText('48');
  await page.getByRole('button', { name: 'Save baseline', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit baseline', exact: true })).toBeVisible();
});

test('all waiting adventurers remain visible in the roster after a demo skip and reload', async ({
  page,
}) => {
  const { demoState } = await import('../../src/game/engine');
  const { DAY } = await import('../../src/game/content');
  const state = demoState();
  const fighter = state.actors.find((a) => a.role === 'fighter')!;
  state.parties = [];
  state.actors = Array.from({ length: 8 }, (_, i) => ({
    ...structuredClone(fighter),
    id: state.nextId++,
    name: `Patient ${i + 1}`,
    status: 'town' as const,
  }));
  state.floors.forEach((f) => {
    f.encounters = [];
    f.restQueue = [];
    f.restOccupants = [];
  });
  state.nextArrivalAt = 1000 * DAY;
  await page.addInitScript((state) => {
    if (!localStorage.getItem('underkeep-demo-v1'))
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      );
  }, state);
  await page.goto('/');
  await expect(page.getByTestId('town-waiting-count')).toHaveText('8 waiting · View all');
  await page.getByRole('button', { name: 'Town adventurer roster', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Town adventurer \d+:/ })).toHaveCount(8);
  await page.getByRole('button', { name: 'Close town roster', exact: true }).click();
  await page.getByRole('button', { name: 'Demo settings', exact: true }).first().click();
  await page.getByRole('button', { name: /8 hours.*8 dungeon days/ }).click();
  await page.getByRole('button', { name: 'Back to the dungeon', exact: true }).click();
  await expect(page.getByTestId('town-waiting-count')).toHaveText('8 waiting · View all');
  await page.reload();
  await page.getByRole('button', { name: 'Town adventurer roster', exact: true }).click();
  for (const a of state.actors)
    await expect(
      page.getByRole('button', { name: `Town adventurer ${a.id}: ${a.name}`, exact: true }),
    ).toHaveCount(1);
  await page.screenshot({ path: `/tmp/town-roster-${test.info().project.name}.png` });
});

test('spawner deep stats edit ratios while class skills stay on class pages', async ({ page }) => {
  await page.goto('/stats');
  await page.getByRole('button', { name: 'Deep stats', exact: true }).click();
  await page.getByRole('button', { name: 'Edit baseline', exact: true }).click();
  for (const tier of [1, 2]) {
    await page
      .getByRole('button', { name: `Stats group Level ${tier} adventurer spawners`, exact: true })
      .click();
    await expect(page.getByText(/The guild fills teams in order/)).toBeVisible();
    await page
      .getByRole('button', { name: `Increase spawn${tier}.fighterRatio`, exact: true })
      .click();
    await expect(page.getByTestId(`rule-spawn${tier}.fighterRatio`)).toHaveText('4');
    await expect(page.getByRole('button', { name: /Increase .*maxHealth/ })).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'Stats group Level 2 fighter', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Increase level2.fighter.maxHealth', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Save baseline', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit baseline', exact: true })).toBeVisible();
});

test('staff speed research is available in Staff investment and starts successfully', async ({
  page,
}) => {
  const { demoState } = await import('../../src/game/engine');
  const state = demoState();
  await page.addInitScript(
    (state) =>
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      ),
    state,
  );
  await page.goto('/research');
  await page.getByRole('button', { name: 'Staff investment', exact: true }).click();
  await expect(page.getByText('Fleet-footed staff', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Research Fleet-footed staff', exact: true }).click();
  await expect(
    page.getByText('Research started. Your scholars are on it.', { exact: true }),
  ).toBeVisible();
});

test('deep stats categories expose every subpage and preserve edits across navigation', async ({
  page,
}) => {
  const { STATS_CATEGORIES } = await import('../../src/game/statsCategories');
  const { RULE_FIELDS } = await import('../../src/game/config');
  await page.goto('/stats');
  await page.getByRole('button', { name: 'Deep stats', exact: true }).click();
  await page.getByRole('button', { name: 'Edit baseline', exact: true }).click();
  await page.getByRole('button', { name: 'Increase fighter.maxHealth', exact: true }).click();
  for (const category of STATS_CATEGORIES) {
    await page
      .getByRole('button', { name: `Stats category ${category.name}`, exact: true })
      .click();
    for (const [group] of category.pages) {
      await page.getByRole('button', { name: `Stats group ${group}`, exact: true }).click();
      const field = RULE_FIELDS.find((f) => f.group === group)!;
      await expect(page.getByTestId(`rule-${field.key}`)).toBeVisible();
    }
  }
  await page.getByRole('button', { name: 'Stats category Adventurers', exact: true }).click();
  await expect(page.getByTestId('rule-fighter.maxHealth')).toHaveText('11');
  await page.getByRole('button', { name: 'Stats category Mobs', exact: true }).click();
  await page.getByRole('button', { name: 'Stats group Slime spawners', exact: true }).click();
  await expect(page.getByTestId('rule-slime.health')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save baseline', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit baseline', exact: true })).toBeVisible();
  await page.screenshot({
    path: `/tmp/deep-stats-categories-${test.info().project.name}.png`,
    animations: 'disabled',
  });
});

test('guild level two can be researched and its upgrade controls appear in deep stats', async ({
  page,
}) => {
  const { demoState } = await import('../../src/game/engine');
  const state = demoState();
  state.research.push('guild');
  await page.addInitScript(
    (state) =>
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      ),
    state,
  );
  await page.goto('/research');
  await page.getByRole('button', { name: 'Adventurer attractions', exact: true }).click();
  await page
    .getByRole('button', { name: 'Research Adventurers Guild Level 2', exact: true })
    .click();
  await expect(
    page.getByText('Research started. Your scholars are on it.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Stats', exact: true }).click();
  await page.getByRole('button', { name: 'Deep stats', exact: true }).click();
  await page
    .getByRole('button', { name: 'Stats group Level 1 adventurer spawners', exact: true })
    .click();
  await expect(page.getByTestId('rule-guild2.spawnReduction')).toHaveText('25');
  await expect(page.getByTestId('rule-guild2.capacity')).toHaveText('20');
  await expect(page.getByTestId('rule-guild2.partySeconds')).toHaveText('15');
});

test('guild drains the existing backlog above spawn caps and reports missing roles instead of caps', async ({
  page,
}) => {
  const { demoState } = await import('../../src/game/engine');
  const { DEFAULT_RULES } = await import('../../src/game/config');
  const state = demoState();
  const templates = state.actors;
  state.actors = Array.from({ length: 59 }, (_, i) => {
    const role = i < 30 ? 'fighter' : i < 45 ? 'wizard' : 'healer';
    return {
      ...structuredClone(templates.find((a) => a.role === role)!),
      id: state.nextId++,
      status: 'town' as const,
      wealth: 2000,
    };
  });
  state.parties = [];
  state.floors.forEach((f) => {
    f.encounters = [];
    f.restQueue = [];
    f.restOccupants = [];
  });
  state.research.push('guild');
  state.config = { ...DEFAULT_RULES, populationCap: 6 };
  state.nextArrivalAt = 100 * 3600000;
  state.nextTick = 1;
  await page.addInitScript(
    (state) =>
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      ),
    state,
  );
  await page.goto('/');
  await expect(page.getByText('14 ACTIVE PARTIES', { exact: true })).toBeVisible();
  await expect(page.getByTestId('town-waiting-count')).toHaveText('3 waiting · View all');
  await expect(page.getByTestId('guild-party-countdown')).not.toContainText('limit');
});

test('tutorial actions glow and demo controls live only in Demo settings', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByTestId('tutorial-action').getByTestId('tutorial-button-glow'),
  ).toBeVisible();
  await page.getByTestId('tutorial-action').click();
  await page.getByRole('button', { name: 'Open headquarters', exact: true }).last().click();
  await page.getByTestId('tutorial-action').click();
  const hire = page.getByRole('button', { name: 'Hire digger · 10 gold', exact: true });
  for (let i = 0; i < 3; i++) {
    await expect(hire.getByTestId('tutorial-button-glow')).toBeVisible();
    await hire.click();
  }
  await expect(hire.getByTestId('tutorial-button-glow')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: /Excavate next floor/ }).getByTestId('tutorial-button-glow'),
  ).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Demo controls', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /5 minutes.*2 dungeon hours/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Demo settings', exact: true }).click();
  await expect(page.getByRole('button', { name: /5 minutes.*2 dungeon hours/ })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Restart the tutorial', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('coffin · 1/1 selected')).toBeVisible();
  await page.reload();
  await expect(page.getByText('coffin · 1/1 selected')).toBeVisible();
});

test('trap reset difficulty and timing are editable and persist in deep stats', async ({
  page,
}) => {
  await page.goto('/stats');
  await page.getByRole('button', { name: 'Deep stats', exact: true }).click();
  await page.getByRole('button', { name: 'Stats category Traps', exact: true }).click();
  await page.getByRole('button', { name: 'Stats group trapdoor', exact: true }).click();
  await expect(page.getByTestId('rule-trapdoor.resetDifficulty')).toHaveText('20');
  await expect(page.getByTestId('rule-trapdoor.resetMinutes')).toHaveText('5');
  await page.getByRole('button', { name: 'Edit baseline', exact: true }).click();
  await page
    .getByRole('button', { name: 'Increase trapdoor.resetDifficulty', exact: true })
    .click();
  await page.getByRole('button', { name: 'Save baseline', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit baseline', exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Deep stats', exact: true }).click();
  await page.getByRole('button', { name: 'Stats category Traps', exact: true }).click();
  await page.getByRole('button', { name: 'Stats group trapdoor', exact: true }).click();
  await expect(page.getByTestId('rule-trapdoor.resetDifficulty')).toHaveText('21');
});

test('maintainer repair ring starts on arrival, fills, and disappears when the trap is reset', async ({
  page,
}) => {
  const { demoState } = await import('../../src/game/engine');
  const { HOUR } = await import('../../src/game/content');
  const state = demoState();
  const worker = state.actors.find((a) => a.role === 'maintenance')!;
  const trap = state.floors[0]!.encounters.find((e) => e.kind === 'trapdoor')!;
  state.actors = [worker];
  state.parties = [];
  state.nextArrivalAt = state.now + HOUR * 100;
  state.floors[0]!.encounters = [trap];
  trap.active = false;
  worker.task = {
    kind: 'reset',
    floor: 1,
    encounter: trap.id,
    arriveAt: state.now + HOUR / 30,
    until: state.now + HOUR / 12,
  };
  worker.workFloor = 1;
  delete worker.returnUntil;
  await page.addInitScript(
    (state) =>
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      ),
    state,
  );
  await page.goto('/');
  const ring = page.getByTestId(`maintenance-progress-${worker.id}`);
  await expect(ring).toHaveCount(0);
  await expect(ring).toBeAttached();
  await expect(
    page.getByTestId(`encounter-info-${trap.id}`).getByTestId(`maintenance-progress-${worker.id}`),
  ).toBeAttached();
  await expect(page.getByTestId(`maintenance-countdown-${worker.id}`)).toHaveText(/\d{2}:\d{2}/);
  await expect
    .poll(async () => Number(await ring.getAttribute('aria-valuenow')))
    .toBeGreaterThan(15);
  await expect(ring).toHaveCount(0, { timeout: 15000 });
});

test('paused fixture keeps its partial installation ring across reload', async ({ page }) => {
  const { demoState } = await import('../../src/game/engine');
  const { HOUR } = await import('../../src/game/content');
  const state = demoState();
  state.parties = [];
  state.nextArrivalAt = state.now + 100 * HOUR;
  const a = state.actors.find((a) => a.role === 'maintenance')!;
  state.actors = [a];
  const floor = state.floors[0]!;
  const trap = floor.encounters.find((e) => e.kind === 'trapdoor')!;
  const paused = floor.encounters.find((e) => e.kind === 'arrows')!;
  floor.encounters = [trap, paused];
  trap.active = false;
  paused.installed = false;
  paused.installPaid = true;
  paused.installProgress = 0.4;
  a.task = {
    kind: 'reset',
    floor: 1,
    encounter: trap.id,
    arriveAt: state.now,
    until: state.now + HOUR,
  };
  a.workFloor = 1;
  delete a.returnUntil;
  await page.addInitScript((state) => {
    if (!sessionStorage.getItem('pause-seed')) {
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      );
      sessionStorage.setItem('pause-seed', 'yes');
    }
  }, state);
  await page.goto('/');
  const ring = page.getByTestId(`installation-progress-${paused.id}`);
  await expect(ring).toHaveAttribute('aria-valuenow', '40');
  await expect(ring).toHaveAttribute('aria-label', 'arrows installation paused');
  await page.reload();
  await expect(ring).toHaveAttribute('aria-valuenow', '40');
});

test('four-row floors separate actors, bars, fixture labels and compact footer', async ({
  page,
}) => {
  const { demoState } = await import('../../src/game/engine');
  const state = demoState();
  await page.addInitScript(
    (state) =>
      localStorage.setItem(
        'underkeep-demo-v1',
        JSON.stringify({ current: JSON.stringify({ state, wall: Date.now() }), previous: null }),
      ),
    state,
  );
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  const floor = page.getByTestId('floor-grid-1');
  await floor.scrollIntoViewIfNeeded();
  const stats = (await page.getByTestId('floor-stats-row-1').boundingBox())!;
  const info = (await page.getByTestId('floor-info-row-1').boundingBox())!;
  const footer = (await page.getByTestId('floor-footer-1').boundingBox())!;
  expect(footer.y + footer.height).toBeLessThanOrEqual(info.y + 1);
  expect(info.y + info.height).toBeLessThanOrEqual(stats.y + 1);
  for (const bar of await floor.getByTestId('floor-character-bars').all()) {
    const b = (await bar.boundingBox())!;
    expect(b.y).toBeGreaterThanOrEqual(stats.y - 1);
    expect(b.y + b.height).toBeLessThanOrEqual(stats.y + stats.height + 1);
  }
  for (const label of await floor.locator('[data-testid^="encounter-info-"]').all()) {
    const b = (await label.boundingBox())!;
    expect(b.y).toBeGreaterThanOrEqual(info.y - 1);
    expect(b.y + b.height).toBeLessThanOrEqual(stats.y + 1);
    const content = await label.evaluate((el) => {
      const boxes = Array.from(el.children).map((child) => child.getBoundingClientRect());
      return {
        top: Math.min(...boxes.map((b) => b.top)),
        bottom: Math.max(...boxes.map((b) => b.bottom)),
        left: Math.min(...boxes.map((b) => b.left)),
        right: Math.max(...boxes.map((b) => b.right)),
      };
    });
    expect(Math.abs((content.top + content.bottom) / 2 - (b.y + b.height / 2))).toBeLessThan(1);
    expect(Math.abs((content.left + content.right) / 2 - (b.x + b.width / 2))).toBeLessThan(1);
  }
  const header = page.getByTestId('floor-footer-1');
  const name = (await header.getByText('01 - The Welcome Depths', { exact: true }).boundingBox())!;
  const mobs = (await header.getByTestId('floor-mob-count-1').boundingBox())!;
  const parties = (await header.getByText(/Parties:/).boundingBox())!;
  expect(Math.abs(name.y + name.height / 2 - mobs.y - mobs.height / 2)).toBeLessThan(2);
  expect(Math.abs(mobs.y + mobs.height / 2 - parties.y - parties.height / 2)).toBeLessThan(2);
  await expect(page.getByTestId('floor-footer-1')).toContainText('Mobs:');
  await expect(page.getByTestId('floor-footer-1')).toContainText('Parties:');
  await expect(page.getByText('At limit', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: `/tmp/floor-grid-${test.info().project.name}.png` });
  expect(errors.filter((e) => e.includes('Unexpected text node'))).toEqual([]);
});
