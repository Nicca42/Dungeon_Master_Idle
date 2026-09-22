import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addColumn,
  addRow,
  initialTables,
  move,
  tablesSchema,
  decodeTables,
  ResearchCell,
} from '../src/planning/tables';

test('seed tables include research and complete entity values', () => {
  const t = initialTables();
  assert.equal(t.research.rows.length, 10);
  assert.match(
    (t.research.rows.find((r) => r.id === 'mobs')!.cells.level_5 as ResearchCell).name,
    /Monster husbandry 5/,
  );
  assert.match(
    (t.research.rows.find((r) => r.id === 'mobs')!.cells.supporting as ResearchCell).name,
    /Strictly indoor monsters/,
  );
  assert.match(
    t.stats.rows.find((r) => r.id === 'mobs_zombies')!.cells.level_1 as string,
    /spawn Period In Game Hours: 1/,
  );
});
test('adding and reordering keeps edited cells attached to stable rows and columns', () => {
  let t = initialTables().stats;
  const rowId = t.rows[0].id,
    colId = t.columns[0].id;
  t.rows[0].cells[colId] = 'CUSTOM 123';
  t = addColumn(addRow(t));
  t = { columns: move(t.columns, 0, 1), rows: move(t.rows, 0, 1) };
  assert.equal(t.rows[1].id, rowId);
  assert.equal(t.columns[1].id, colId);
  assert.equal(t.rows[1].cells[t.columns[1].id], 'CUSTOM 123');
  assert.equal(t.rows.at(-1)!.cells[t.columns.at(-1)!.id], '');
  assert.deepEqual(
    tablesSchema.parse(JSON.parse(JSON.stringify({ ...initialTables(), stats: t }))).stats,
    t,
  );
  assert.equal(move(t.rows, 0, -1), t.rows);
});
test('invalid saved table structure is rejected rather than silently losing cells', () => {
  const t = initialTables();
  t.stats.columns[1].id = t.stats.columns[0].id;
  assert.equal(tablesSchema.safeParse(t).success, false);
});

test('legacy migration restores seed fields and preserves edited multiline text and ordering', () => {
  const old = initialTables();
  old.research.rows = old.research.rows.filter((r) => r.label !== 'Builders');
  old.research.rows[0].cells.level_1 =
    "Get diggin'\nThe first five dungeon floors are unlocked.\nResearch: 0 gold / 0 game hours\nRequires: None";
  old.research.rows[0].cells.level_2 = 'My custom title\nMy custom description\nExtra notes';
  const migrated = decodeTables({ ...old, version: 1 });
  const first = migrated.research.rows[0].cells.level_1 as ResearchCell;
  assert.equal(first.name, "Get diggin'");
  assert.equal(first.description, 'The first five dungeon floors are unlocked.');
  assert.match(first.unlocks, /\+5 floors unlocked/);
  assert.deepEqual(migrated.research.rows.find((r) => r.label === 'Builders')!.cells.level_2, {
    name: 'My custom title',
    description: 'My custom description\nExtra notes',
    unlocks: '',
    hours: '',
  });
  assert.deepEqual(migrated.stats, old.stats);
  let extended = addColumn(addRow(migrated.research, true), true);
  assert.deepEqual(extended.rows.at(-1)!.cells[extended.columns.at(-1)!.id], {
    name: '',
    description: '',
    unlocks: '',
    hours: '',
  });
  assert.deepEqual(decodeTables(JSON.parse(JSON.stringify(migrated))), migrated);
});

test('depth and builder split retains floor milestones and separates digging upgrades', () => {
  const t = initialTables();
  const depth = t.research.rows.find((r) => r.label === 'Dungeon Depths')!;
  const builders = t.research.rows.find((r) => r.label === 'Builders')!;
  assert.match((depth.cells.supporting as ResearchCell).name, /Deeper ambitions 10/);
  assert.equal((depth.cells.level_2 as ResearchCell).name, '');
  assert.equal((builders.cells.level_2 as ResearchCell).name, 'Better building');
  assert.match((builders.cells.supporting as ResearchCell).name, /Faster digging/);
  assert.doesNotMatch(
    (t.research.rows.find((r) => r.id === 'staff')!.cells.supporting as ResearchCell).name,
    /Faster digging/,
  );
  assert.deepEqual(decodeTables(JSON.parse(JSON.stringify(t))), t);
});

test('research hours seed, migrate and preserve edited durations', () => {
  const seeded = initialTables();
  const floor = seeded.research.rows.find((r) => r.id === 'floors')!;
  assert.equal((floor.cells.level_1 as ResearchCell).hours, '0');
  const builders = seeded.research.rows.find((r) => r.label === 'Builders')!;
  assert.equal((builders.cells.level_2 as ResearchCell).hours, '6');
  const old = JSON.parse(JSON.stringify(seeded));
  old.version = 3;
  for (const r of old.research.rows)
    for (const cell of Object.values(r.cells) as any[]) delete cell.hours;
  const migrated = decodeTables(old);
  assert.equal(
    (migrated.research.rows.find((r) => r.label === 'Builders')!.cells.level_2 as ResearchCell)
      .hours,
    '6',
  );
  (builders.cells.level_2 as ResearchCell).hours = '12.5';
  assert.deepEqual(decodeTables(JSON.parse(JSON.stringify(seeded))), seeded);
});

test('reviewed stat audit preserves custom edits, ordering and research while adding missing fields once', () => {
  const current = initialTables();
  const old = {
    ...current,
    statsAuditRevision: 0,
    stats: {
      ...current.stats,
      rows: current.stats.rows
        .filter((r) => !['adventurers_spawners', 'finance_researchModifiers'].includes(r.id))
        .map((r) => ({ ...r, cells: { ...r.cells } })),
    },
  };
  const diggers = old.stats.rows.find((r) => r.id === 'staff_diggers')!;
  diggers.cells.level_1 = 'hire Gold: 10\nspeed: 77\nCustom note: keep me';
  old.stats.rows.reverse();
  const beforeResearch = JSON.stringify(old.research);
  const result = decodeTables(old);
  const updated = result.stats.rows.find((r) => r.id === 'staff_diggers')!.cells.level_1 as string;
  assert.match(updated, /hire Gold: 5/);
  assert.match(updated, /speed: 77/);
  assert.match(updated, /Custom note: keep me/);
  assert.match(updated, /max Hireable After Builder Research: 5/);
  assert.equal(result.stats.rows[0].id, old.stats.rows[0].id);
  assert.equal(JSON.stringify(result.research), beforeResearch);
  assert.ok(result.stats.rows.some((r) => r.id === 'adventurers_spawners'));
  assert.deepEqual(decodeTables(JSON.parse(JSON.stringify(result))), result);
});

test('reviewed catalog includes rates, training, chest chances and room IV without new monster types', () => {
  const rows = initialTables().stats.rows;
  const cell = (id: string, level: number) =>
    rows.find((r) => r.id === id)!.cells[`level_${level}`] as string;
  assert.match(cell('treasure_chests', 3), /open Success Probability: 0.25/);
  assert.match(cell('treasure_chests', 4), /material: crystal/);
  assert.match(cell('staff_maintainers', 4), /training \/ cost Gold: 15/);
  assert.match(cell('adventurers_spawners', 5), /max Spawn Points: 6/);
  assert.match(cell('rest_adventurerRooms', 4), /entry Fee Gold: 4/);
  assert.equal(cell('rest_staffRooms', 4), 'Not defined');
  assert.ok(!rows.some((r) => /bear|fire|skeleton/i.test(r.id)));
});

test('approved review decisions update both tables once and retain Luxury unlocks', () => {
  const t = initialTables();
  t.statsAuditRevision = 1;
  const row = t.research.rows[0];
  row.cells.level_1 = {
    name: 'Luxury Suits',
    description: 'Keep my wording',
    unlocks: 'Level 4 adventurer rooms\nLevel 3 staff rooms',
    hours: '',
  };
  row.cells.level_2 = {
    name: 'Guild Grant',
    description: 'old',
    unlocks: '+1 gold per entry',
    hours: '8',
  };
  row.cells.level_3 = {
    name: 'The Best Builders',
    description: 'Keep this',
    unlocks: 'Level 3',
    hours: '8',
  };
  row.cells.level_4 = {
    name: 'Better basic treasure',
    description: '1/3 failure',
    unlocks: '1/3 opening',
    hours: '1',
  };
  const result = decodeTables(t);
  const r = result.research.rows[0];
  assert.deepEqual(r.cells.level_1, {
    name: 'Luxury Suits',
    description: 'Keep my wording',
    unlocks: 'Level 4 adventurer rooms\nLevel 3 staff rooms',
    hours: '10',
  });
  assert.match((r.cells.level_2 as ResearchCell).unlocks, /per adventurer stat point/);
  assert.match((r.cells.level_3 as ResearchCell).unlocks, /Level 4/);
  assert.match((r.cells.level_4 as ResearchCell).description, /1\/3 chance of opening/);
  const builders = result.stats.rows.find((r) => r.id === 'staff_diggers')!.cells.level_4 as string;
  assert.match(builders, /hire Gold: 20/);
  assert.match(builders, /speed: 45/);
  assert.doesNotMatch(builders, /requires Review:/);
  assert.deepEqual(decodeTables(JSON.parse(JSON.stringify(result))), result);
});

test('consistency audit fills omissions once, preserves research, custom stats and order', () => {
  const t = initialTables();
  t.statsAuditRevision = 2;
  t.stats.rows.reverse();
  t.stats.columns.reverse();
  const row = t.stats.rows.find((r) => r.id === 'adventurers_spawners')!;
  row.cells.level_1 = 'local Ads / purchase Gold Per Point: 99\nCustom: keep';
  const research = JSON.stringify(t.research);
  const result = decodeTables(t);
  const text = result.stats.rows.find((r) => r.id === row.id)!.cells.level_1 as string;
  assert.match(text, /purchase Gold Per Point: 99/);
  assert.match(text, /additional Arrival Points: 2/);
  assert.match(text, /formation Game Seconds: 480/);
  assert.equal(JSON.stringify(result.research), research);
  assert.deepEqual(result.stats.columns, t.stats.columns);
  assert.deepEqual(
    result.stats.rows.map((r) => r.id),
    t.stats.rows.map((r) => r.id),
  );
  assert.deepEqual(decodeTables(result), result);
  assert.match(
    initialTables().stats.rows.find((r) => r.id === row.id)!.cells.level_1 as string,
    /purchase Gold Per Point: 25/,
  );
});
