import { z } from 'zod';
import consistencyAdditions from './consistency-additions.json';
import auditPatch from './stat-audit-patch.json';
import reviewPatch from './review-decisions-patch.json';
import research from '../../docs/planning/research-tree.v1.json';
import stats from '../../docs/planning/entity-stats.v1.json';

const column = z.object({ id: z.string(), label: z.string() });
export const researchCellSchema = z.object({
  name: z.string(),
  description: z.string(),
  unlocks: z.string(),
  hours: z.string().default(''),
});
export type ResearchCell = z.infer<typeof researchCellSchema>;
const row = z.object({
  id: z.string(),
  label: z.string(),
  cells: z.record(z.string(), z.union([z.string(), researchCellSchema])),
});
const table = z
  .object({ columns: z.array(column).min(1), rows: z.array(row).min(1) })
  .superRefine((t, ctx) => {
    if (
      new Set(t.columns.map((c) => c.id)).size !== t.columns.length ||
      new Set(t.rows.map((r) => r.id)).size !== t.rows.length ||
      t.rows.some(
        (r) =>
          Object.keys(r.cells).length !== t.columns.length ||
          t.columns.some((c) => !(c.id in r.cells)),
      )
    ) {
      ctx.addIssue({ code: 'custom', message: 'Invalid table identities or cells' });
    }
  });
export const tablesSchema = z.object({
  version: z.literal(4),
  research: table,
  stats: table,
  statsAuditRevision: z.number().default(0),
});
export type Table = z.infer<typeof table>;
export type Tables = z.infer<typeof tablesSchema>;
export type TableKind = 'research' | 'stats';
export function move<T>(items: T[], index: number, delta: number): T[] {
  const destination = index + delta;
  if (index < 0 || index >= items.length || destination < 0 || destination >= items.length)
    return items;
  const copy = [...items];
  [copy[index], copy[destination]] = [copy[destination], copy[index]];
  return copy;
}
function nextId(ids: string[], prefix: string): string {
  let i = 1;
  while (ids.includes(`${prefix}${i}`)) i++;
  return `${prefix}${i}`;
}
export function addRow(t: Table, research = false): Table {
  return {
    ...t,
    rows: [
      ...t.rows,
      {
        id: nextId(
          t.rows.map((r) => r.id),
          'row_',
        ),
        label: 'New row',
        cells: Object.fromEntries(
          t.columns.map((c) => [c.id, research ? emptyResearchCell() : '']),
        ),
      },
    ],
  };
}
export function addColumn(t: Table, research = false): Table {
  const id = nextId(
    t.columns.map((c) => c.id),
    'column_',
  );
  return {
    columns: [...t.columns, { id, label: 'New column' }],
    rows: t.rows.map((r) => ({
      ...r,
      cells: { ...r.cells, [id]: research ? emptyResearchCell() : '' },
    })),
  };
}
const levels = () =>
  Array.from({ length: 5 }, (_, i) => ({ id: `level_${i + 1}`, label: `Level ${i + 1}` }));
const label = (s: string) => s.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
function flatten(value: unknown, prefix = ''): string[] {
  if (value && typeof value === 'object' && !Array.isArray(value))
    return Object.entries(value).flatMap(([k, v]) =>
      flatten(v, prefix ? `${prefix} / ${label(k)}` : label(k)),
    );
  return [`${prefix}: ${value === null ? 'Unspecified' : String(value)}`];
}
function legacyInitialTables() {
  const researchTable: Table = {
    columns: [...levels(), { id: 'supporting', label: 'Supporting research' }],
    rows: [],
  };
  for (const [id, branch] of Object.entries(research)) {
    if (!('research' in branch)) continue;
    const cells: Record<string, ResearchCell> = Object.fromEntries(
      researchTable.columns.map((c) => [c.id, emptyResearchCell()]),
    );
    for (const n of Object.values(branch.research)) {
      const tiers = [
        ...new Set(
          n.unlocks.flatMap((u: { level?: number }) => (u.level !== undefined ? [u.level] : [])),
        ),
      ];
      const destinations = tiers.length ? tiers.map((t) => `level_${t}`) : ['supporting'];
      const changes = describeUnlocks(n);
      for (const destination of destinations) {
        const current = cells[destination];
        current.hours += `${current.hours ? '\n\n' : ''}${n.durationGameHours}`;
        current.name += `${current.name ? '\n\n' : ''}${n.title}`;
        current.description += `${current.description ? '\n\n' : ''}${n.description}`;
        current.unlocks += `${current.unlocks ? '\n\n' : ''}${changes}`;
      }
    }
    if (id === 'adventurers')
      cells.level_1 = {
        name: 'Starting adventurers',
        description: 'Fighters, wizards and healers are available initially.',
        unlocks: 'Level 1 fighters, wizards and healers',
        hours: '0',
      };
    researchTable.rows.push({ id, label: branch.title, cells });
  }
  const statsTable: Table = { columns: levels(), rows: [] };
  for (const [branch, families] of Object.entries(stats)) {
    if (branch.startsWith('_') || branch === 'finance') continue;
    for (const [family, values] of Object.entries(families)) {
      statsTable.rows.push({
        id: `${branch}_${family}`,
        label: `${label(branch)} / ${label(family)}`,
        cells: Object.fromEntries(
          statsTable.columns.map((c) => [
            c.id,
            c.id in values
              ? flatten((values as Record<string, unknown>)[c.id]).join('\n')
              : 'Not defined',
          ]),
        ),
      });
    }
  }
  return { version: 2 as const, research: researchTable, stats: statsTable };
}

export function emptyResearchCell(): ResearchCell {
  return { name: '', description: '', unlocks: '', hours: '' };
}
function describeUnlocks(n: { unlocks: any[]; changes: any[] }): string {
  const names = n.unlocks.map((u) =>
    u.type === 'floorRange'
      ? `+${u.toFloor - u.fromFloor + 1} floors unlocked (floors ${u.fromFloor}–${u.toFloor})`
      : `Level ${u.level} ${label(u.type)}${u.component ? ' ' + u.component : ''} unlocked`,
  );
  const changes = n.changes
    .filter((c) => c.target !== 'dungeon.maxUnlockedFloors')
    .map(
      (c) =>
        `${label(c.target).replace(/\./g, ' / ')}: ${c.operation === 'add' ? '+' : ''}${String(c.value)}`,
    );
  return [...names, ...changes].join('\n');
}
function decodeTablesBeforeAudit(saved: unknown): Tables {
  if (!saved || typeof saved !== 'object' || !('version' in saved) || saved.version !== 1)
    return migrateBuilderRows(saved);
  const legacy = z.object({ version: z.literal(1), research: table, stats: table }).parse(saved);
  const defaults = legacyInitialTables();
  const migrated = {
    ...legacy,
    version: 2 as const,
    research: {
      ...legacy.research,
      rows: legacy.research.rows.map((r) => ({
        ...r,
        cells: Object.fromEntries(
          Object.entries(r.cells).map(([id, cell]) => {
            if (typeof cell !== 'string') return [id, cell];
            const original = defaults.research.rows.find((v) => v.id === r.id)?.cells[id];
            // Only replace an unchanged legacy seed. Preserve custom text verbatim in editable fields.
            const branch = (research as Record<string, any>)[r.id];
            const entries = branch
              ? Object.values(branch.research)
                  .filter((n: any) => {
                    const levels = n.unlocks.flatMap((u: any) =>
                      u.level === undefined ? [] : [`level_${u.level}`],
                    );
                    return levels.length ? levels.includes(id) : id === 'supporting';
                  })
                  .map(
                    (n: any) =>
                      `${n.title}\n${n.description}\nResearch: ${n.costGold} gold / ${n.durationGameHours} game hours\nRequires: ${n.prerequisites.allOf.join(', ') || 'None'}`,
                  )
                  .join('\n\n')
              : null;
            if (
              original &&
              (cell === entries ||
                (r.id === 'adventurers' &&
                  id === 'level_1' &&
                  cell === 'Fighters, wizards and healers available initially.'))
            )
              return [id, original];
            const [name, ...rest] = cell.split('\n');
            return [id, { name, description: rest.join('\n'), unlocks: '' }];
          }),
        ),
      })),
    },
  };
  return migrateBuilderRows(migrated);
}

export function initialTables(): Tables {
  return addRevivalRows(
    applyConsistencyAdditions(
      applyReviewDecisions(applyStatAudit(migrateBuilderRows(legacyInitialTables()))),
    ),
  );
}

function migrateBuilderRows(saved: unknown): Tables {
  if (!saved || typeof saved !== 'object' || !('version' in saved) || saved.version !== 2)
    return upgradeResearchTimes(saved);
  const previous = z.object({ version: z.literal(2), research: table, stats: table }).parse(saved);
  previous.research = upgradeResearchTimes({ ...previous, version: 3 }).research;
  const t = previous.research;
  const floorIndex = t.rows.findIndex((r) => r.id === 'floors');
  if (floorIndex === -1) return upgradeResearchTimes({ ...previous, version: 3 });
  const rows = t.rows.map((r) => ({ ...r, cells: { ...r.cells } }));
  const floors = rows[floorIndex];
  floors.label = 'Dungeon Depths';
  const builders = {
    id: nextId(
      rows.map((r) => r.id),
      'builders_',
    ),
    label: 'Builders',
    cells: Object.fromEntries(t.columns.map((c) => [c.id, emptyResearchCell()])) as Record<
      string,
      string | ResearchCell
    >,
  };
  for (const column of t.columns) {
    if (/^level_[2-5]$/.test(column.id)) {
      builders.cells[column.id] = floors.cells[column.id];
      floors.cells[column.id] = emptyResearchCell();
    }
  }
  const staff = rows.find((r) => r.id === 'staff');
  const support = staff?.cells.supporting;
  if (staff && support && typeof support !== 'string' && 'supporting' in builders.cells) {
    const fields = ['name', 'description', 'unlocks', 'hours'] as const;
    const parts = Object.fromEntries(fields.map((f) => [f, support[f].split('\n\n')])) as Record<
      (typeof fields)[number],
      string[]
    >;
    // Only split aligned entries; custom free-form edits stay intact in the original row.
    if (fields.every((f) => parts[f].length === parts.name.length)) {
      const moving = parts.name.map((name) =>
        ['Faster digging', 'Powered wheelbarrows', 'Runic excavation tools'].includes(name),
      );
      builders.cells.supporting = Object.fromEntries(
        fields.map((f) => [f, parts[f].filter((_, i) => moving[i]).join('\n\n')]),
      ) as ResearchCell;
      staff.cells.supporting = Object.fromEntries(
        fields.map((f) => [f, parts[f].filter((_, i) => !moving[i]).join('\n\n')]),
      ) as ResearchCell;
    }
  }
  rows.splice(floorIndex + 1, 0, builders);
  return upgradeResearchTimes({ ...previous, version: 3, research: { ...t, rows } });
}

function upgradeResearchTimes(saved: unknown): Tables {
  if (!saved || typeof saved !== 'object' || !('version' in saved) || saved.version !== 3)
    return tablesSchema.parse(saved);
  const previous = z.object({ version: z.literal(3), research: table, stats: table }).parse(saved);
  const durations = new Map<string, string>();
  for (const branch of Object.values(research)) {
    if ('research' in branch)
      for (const node of Object.values(branch.research))
        durations.set(node.title, String(node.durationGameHours));
  }
  durations.set('Starting adventurers', '0');
  return tablesSchema.parse({
    ...previous,
    version: 4,
    research: {
      ...previous.research,
      rows: previous.research.rows.map((row) => ({
        ...row,
        cells: Object.fromEntries(
          Object.entries(row.cells).map(([id, cell]) => [
            id,
            typeof cell === 'string' || cell.hours !== ''
              ? cell
              : {
                  ...cell,
                  hours: cell.name
                    .split('\n\n')
                    .map((name) => durations.get(name) ?? '')
                    .join('\n\n'),
                },
          ]),
        ),
      })),
    },
  });
}

/** Apply only reviewed stat deltas. User-edited values, row/column order and research stay intact. */
export function applyStatAudit(input: Tables): Tables {
  if (input.statsAuditRevision >= 1) return input;
  const output: Tables = {
    ...input,
    stats: {
      ...input.stats,
      columns: [...input.stats.columns],
      rows: input.stats.rows.map((row) => ({ ...row, cells: { ...row.cells } })),
    },
  };
  const table = output.stats;
  for (const patch of auditPatch) {
    if (!table.columns.some((c) => c.id === patch.columnId)) continue;
    let row = table.rows.find((r) => r.id === patch.rowId);
    if (!row) {
      row = {
        id: patch.rowId,
        label: patch.rowLabel,
        cells: Object.fromEntries(table.columns.map((c) => [c.id, 'Not defined'])),
      };
      table.rows.push(row);
    }
    const current = row.cells[patch.columnId];
    if (typeof current !== 'string') continue;
    if (current === patch.before || current === 'Not defined' || current === '') {
      row.cells[patch.columnId] = patch.after;
      continue;
    }
    const lines = current.split('\n');
    const before = patch.before.split('\n');
    const key = (line: string) => line.split(':')[0].trim();
    for (const line of patch.after.split('\n')) {
      const i = lines.findIndex((existing) => key(existing) === key(line));
      if (i === -1) lines.push(line);
      else if (before.includes(lines[i])) lines[i] = line;
    }
    row.cells[patch.columnId] = lines.join('\n');
  }
  output.statsAuditRevision = 1;
  return tablesSchema.parse(output);
}
export function decodeTables(saved: unknown): Tables {
  return addRevivalRows(
    applyConsistencyAdditions(applyReviewDecisions(applyStatAudit(decodeTablesBeforeAudit(saved)))),
  );
}

/** User-approved review decisions; no new entity types or broad rebalance. */
export function applyReviewDecisions(input: Tables): Tables {
  if (input.statsAuditRevision >= 2) return input;
  const output: Tables = {
    ...input,
    stats: { ...input.stats, rows: input.stats.rows.map((r) => ({ ...r, cells: { ...r.cells } })) },
    research: {
      ...input.research,
      rows: input.research.rows.map((r) => ({ ...r, cells: { ...r.cells } })),
    },
  };
  for (const patch of reviewPatch) {
    const row = output.stats.rows.find((r) => r.id === patch.rowId);
    const current = row?.cells[patch.columnId];
    if (!row || typeof current !== 'string') continue;
    const before = patch.before.split('\n');
    const after = patch.after.split('\n');
    const key = (line: string) => line.split(':')[0].trim();
    let lines = current
      .split('\n')
      .filter((line) => !before.includes(line) || after.some((next) => key(next) === key(line)));
    for (const line of after) {
      const i = lines.findIndex((old) => key(old) === key(line));
      if (i < 0) lines.push(line);
      else if (before.includes(lines[i])) lines[i] = line;
    }
    row.cells[patch.columnId] = lines.join('\n');
  }
  for (const row of output.research.rows)
    for (const [id, value] of Object.entries(row.cells)) {
      if (typeof value === 'string') continue;
      const cell = { ...value };
      const name = cell.name.trim().toLowerCase();
      if (name === 'better basic treasure') {
        cell.description =
          'Wood and silver chests are harder to open. Adventurers meeting the intelligence requirement have a 1/3 chance of opening the chest.';
        cell.unlocks =
          'Wood chest difficulty +5\nSilver chest difficulty +10\nChest opening success chance: 1/3';
      }
      if (name === 'guild grant') {
        cell.description =
          'Gain an additional 1 gold per stat point gained by adventurers at the floor checkpoint.';
        cell.unlocks = '+1 gold per adventurer stat point gained at the floor checkpoint';
      }
      if (name === 'the best builders') {
        cell.unlocks =
          'Level 4 builder hiring unlocked\nGold per builder: 20\nBuilder speed: 45 (+15)\nMaximum builders hireable: 25 (+10)';
      }
      if (name === 'basic rest spots') {
        cell.description =
          'Bunks, a tap, and a much-needed refill. Tier 1 rooms recover 2 points per game hour in each depleted resource. Staff and visitors retain separate rooms.';
      }
      if (name === 'luxury suits' || name === 'luxury suites') cell.hours = '10';
      if (
        !cell.unlocks.includes('Spawn interval bonuses:') &&
        /adventurer/i.test(row.label) &&
        /spawner interval multiplier|guild|spawn intervals/i.test(cell.unlocks + cell.description)
      ) {
        cell.unlocks +=
          '\nSpawn interval bonuses: use the strongest unlocked reduction only (smallest multiplier); tier and guild bonuses do not multiply. Active-play speed applies separately.';
      }
      if (
        !cell.unlocks.includes('Initial spawner price:') &&
        row.id === 'mobs' &&
        cell.name &&
        /spawner|nest|zombies|slimes/i.test(cell.unlocks + cell.description)
      ) {
        cell.unlocks +=
          '\nInitial spawner price: 0 gold separately; floor installation order: 5 gold. Tier upgrade prices remain separate.';
      }
      row.cells[id] = cell;
    }
  output.statsAuditRevision = 2;
  return tablesSchema.parse(output);
}

/** Fill unambiguous omissions from the saved research review without overwriting edits. */
export function applyConsistencyAdditions(input: Tables): Tables {
  if (input.statsAuditRevision >= 3) return input;
  const output = {
    ...input,
    stats: {
      ...input.stats,
      rows: input.stats.rows.map((row) => ({ ...row, cells: { ...row.cells } })),
    },
  };
  for (const patch of consistencyAdditions) {
    const row = output.stats.rows.find((row) => row.id === patch.rowId);
    const current = row?.cells[patch.columnId];
    if (!row || typeof current !== 'string' || current === 'Not defined') continue;
    const lines = current.split('\n');
    const key = (line: string) => line.split(':')[0].trim();
    for (const line of patch.lines) {
      if (!lines.some((existing) => key(existing) === key(line))) lines.push(line);
    }
    row.cells[patch.columnId] = lines.join('\n');
  }
  output.statsAuditRevision = 3;
  return tablesSchema.parse(output);
}

function addRevivalRows(t: Tables): Tables {
  const defaults = legacyInitialTables();
  for (const key of ['research', 'stats'] as const) {
    for (const r of defaults[key].rows.filter((r) =>
      ['training', 'training_revival', 'mobs_ghosts'].includes(r.id),
    )) {
      if (!t[key].rows.some((existing) => existing.id === r.id))
        t[key].rows.push({
          ...r,
          cells: Object.fromEntries(
            t[key].columns.map((c) => [
              c.id,
              r.cells[c.id] ?? (key === 'research' ? emptyResearchCell() : ''),
            ]),
          ),
        });
    }
  }
  return t;
}
