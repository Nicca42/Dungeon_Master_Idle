import { floorGroupIndex, excavationWork, foundationWork } from './construction';
import { unlockedTier } from './progression';
import { maintenanceWorkTime } from './staffSpeed';
import type { GameState } from './types';
import { RESEARCH, HOUR } from './content';
export type Rules = Record<string, number>;
export type RuleField = {
  key: string;
  group: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
};
export const RULE_FIELDS: RuleField[] = [];
const add = (
  group: string,
  key: string,
  label: string,
  value: number,
  min = 0,
  max = 100,
  step = 1,
) => RULE_FIELDS.push({ group, key, label, value, min, max, step });
for (const role of ['fighter', 'wizard', 'healer', 'miner', 'maintenance', 'defender']) {
  for (const stat of [
    'maxHealth',
    'maxDefense',
    'maxStamina',
    'damage',
    'speed',
    'intelligence',
    'primary',
    'learning',
  ])
    add(
      role,
      `${role}.${stat}`,
      stat === 'intelligence' ? 'Intelligence / perception' : stat,
      10,
      1,
      100,
    );
  add(
    role,
    `${role}.wealth`,
    'Starting wealth · gold',
    ['fighter', 'wizard', 'healer'].includes(role) ? 20 : 10,
    0,
    1000,
  );
}
for (const [kind, damageMin, damageMax, defMin, defMax] of [
  ['trapdoor', 5, 10, 5, 5],
  ['arrows', 10, 15, 5, 5],
  ['mimic', 5, 5, 10, 10],
  ['zombie', 1, 5, 5, 5],
  ['slime', 1, 5, 10, 15],
  ['wood', 1, 5, 5, 5],
  ['silver', 1, 5, 5, 5],
] as const) {
  add(kind, `${kind}.health`, 'Health', 10, 1);
  add(kind, `${kind}.damageMin`, 'Minimum damage', damageMin);
  add(kind, `${kind}.damageMax`, 'Maximum damage', damageMax);
  add(kind, `${kind}.defenseMin`, 'Minimum defense', defMin);
  add(kind, `${kind}.defenseMax`, 'Maximum defense', defMax);
}
for (const [kind, min, max, perception, cost] of [
  ['wood', 1, 5, 10, 1],
  ['silver', 5, 10, 15, 2],
] as const) {
  add(kind, `${kind}.goldMin`, 'Minimum chest gold', min);
  add(kind, `${kind}.goldMax`, 'Maximum chest gold', max);
  add(kind, `${kind}.perception`, 'Lock intelligence required', perception);
  add(kind, `${kind}.stamina`, 'Lock-picking stamina', cost, 1, 20);
}
for (const kind of ['trapdoor', 'arrows']) {
  add(kind, `${kind}.resetDifficulty`, 'Reset difficulty · level 1', 20, 1, 200);
  add(kind, `${kind}.resetDifficultyPerLevel`, 'Extra reset difficulty per level', 10, 0, 100);
  add(kind, `${kind}.resetMinutes`, 'Reset base time · game minutes', 5, 1, 120);
  add(kind, `${kind}.resetSkillStep`, 'Skill points per timing step', 5, 1, 100);
  add(kind, `${kind}.resetPercent`, 'Time change per skill step · %', 20, 0, 100);
  add(kind, `${kind}.resetMinimumPercent`, 'Minimum reset time · % of base', 20, 1, 100);
}
add('trapdoor', 'trapdoor.perception', 'Perception to detect', 12);
add('arrows', 'arrows.perception', 'Perception to detect', 5);
for (const [key, label, value] of [
  ['miner', 'Hire digger', 5],
  ['maintenance', 'Hire maintainer', 15],
  ['defender', 'Hire security', 0],
  ['upgrade', 'Upgrade floor group', 50],
  ['excavate', 'Excavate floor', 5],
  ['install', 'Install fixtures', 5],
  ['rest', 'Room / extra bed', 5],
  ['spawn', 'Extra spawn point', 25],
  ['develop', 'Develop floor', 45],
] as const)
  add('Costs', `cost.${key}`, `${label} · gold`, value, 0, 1000);
add('Economy', 'startingGold', 'New-game treasury · gold', 200, 0, 10000);
add('Economy', 'levelFee', 'Fee per stat gained · gold', 1, 0, 20);
add('Economy', 'equipmentChance', 'Equipment reward chance · %', 20, 0, 100);
add('Economy', 'equipmentGold', 'Equipment sale / treasure value · gold', 2, 0, 100);
add('Timing', 'populationCap', 'Base adventurer population cap', 60, 6, 300);
add('Timing', 'trainingHours', 'Training course · hours', 6, 1, 72);
add('Timing', 'restPatienceHours', 'Rest queue patience · hours', 6, 1, 24);
add('Timing', 'maintenanceStamina', 'Stamina per maintenance task', 1, 1, 10);
add('Economy', 'fee', 'Default entry fee · gold', 10, 0, 20);
add('Economy', 'wage', 'Security wage · gold/hour', 1, 0, 20);
add('Economy', 'reinvest', 'Entrance fees to treasure · %', 30, 0, 100);
add('Economy', 'saleRatio', 'Equipment sold · %', 50, 0, 100);
add('Economy', 'trainingPrice', 'Training fee · gold', 1, 1, 5);
add('Economy', 'trainingLimit', 'Training limit', 3, 0, 10);
add('Timing', 'arrivalHours', 'Adventurer spawn interval · hours', 1, 0.25, 24, 0.25);
add('Timing', 'maintenanceHours', 'Maintenance job duration · hours', 1, 0.25, 24, 0.25);
for (let tier = 1; tier <= 5; tier++)
  add('Costs', `cost.staffTier${tier}`, `Hire tier ${tier} staff`, 5 + (tier - 1) * 10, 0, 1000);
add('Timing', 'digMinutes', 'First floor group digging · real minutes / 3 diggers', 10, 1, 120);
add('Timing', 'digGrowth', 'Digging duration multiplier per five-floor group', 1.5, 1, 3, 0.1);
add('Timing', 'escapeChance', 'Mob escape chance · %', 20, 0, 100);
add('Timing', 'zombie.spawnHours', 'Zombie / mimic reset · hours', 1, 0.25, 24, 0.25);
add('Timing', 'slime.spawnHours', 'Slime spawn · hours', 2, 0.25, 24, 0.25);
for (const r of RESEARCH) {
  add('Research', `research.${r.id}.cost`, `${r.name} · gold`, r.cost / 100, 0, 1000);
  add('Research', `research.${r.id}.hours`, `${r.name} · hours`, r.hours, 0, 72, 1 / 60);
}
for (const [key, value] of Object.entries({
  trapdoors: 1,
  arrows: 1,
  mimics: 1,
  wood: 2,
  silver: 1,
  mobSlots: 2,
  mobLimit: 2,
  attackBudget: 10,
  trapAttackBudget: 30,
  trapDefenseBudget: 30,
  treasureBudget: 30,
  floorHealth: 10,
  floorDefense: 10,
  restCapacity: 10,
  restFee: 0,
}))
  add(
    'Floor group',
    `policy.${key}`,
    key,
    value,
    ['floorHealth', 'floorDefense', 'restCapacity'].includes(key) ? 1 : 0,
    ['restCapacity', 'mobLimit'].includes(key)
      ? 30
      : key === 'restFee'
        ? 20
        : ['trapdoors', 'arrows', 'mimics', 'mobSlots'].includes(key)
          ? 4
          : ['wood', 'silver', 'gold'].includes(key)
            ? 5
            : 100,
  );
for (const stat of [
  'health',
  'damageMin',
  'damageMax',
  'defenseMin',
  'defenseMax',
  'goldMin',
  'goldMax',
  'perception',
  'stamina',
]) {
  const wood = RULE_FIELDS.find((f) => f.key === `wood.${stat}`)!;
  const silver = RULE_FIELDS.find((f) => f.key === `silver.${stat}`)!;
  silver.value = wood.value * 2;
  add('gold', `gold.${stat}`, wood.label, wood.value * 4, wood.min, Math.max(100, wood.max));
}
// Creature baselines belong to class pages; spawner pages contain timing and ratios.
for (const field of [...RULE_FIELDS]) {
  if (/^(fighter|wizard|healer)\./.test(field.key)) {
    RULE_FIELDS.push({
      ...field,
      key: `level2.${field.key}`,
      group: `Level 2 ${field.group}`,
      value: field.value * 2,
      max: field.max * 2,
    });
  }
  if (['arrivalHours', 'populationCap'].includes(field.key))
    for (const group of ['Level 1 adventurer spawners', 'Level 2 adventurer spawners'])
      RULE_FIELDS.push({ ...field, group, label: `Shared town setting · ${field.label}` });
  if (field.key === 'zombie.spawnHours') field.group = 'Zombie spawners';
  if (field.key === 'slime.spawnHours') field.group = 'Slime spawners';
}
for (const tier of [1, 2])
  for (const [role, weight] of [
    ['fighter', 3],
    ['wizard', 2],
    ['healer', 1],
  ] as const)
    add(
      `Level ${tier} adventurer spawners`,
      `spawn${tier}.${role}Ratio`,
      `${role} spawn ratio · without guild`,
      weight,
      1,
      10,
    );
for (const group of ['Level 1 adventurer spawners', 'Level 2 adventurer spawners']) {
  add(group, 'guild2.spawnReduction', 'Guild II spawn time reduction · %', 25, 0, 75, 5);
  add(group, 'guild2.capacity', 'Guild II extra population capacity', 20, 0, 200, 5);
  add(group, 'partySeconds', 'Party formation · real seconds', 20, 1, 120);
  add(group, 'guild2.partySeconds', 'Guild II party formation · real seconds', 15, 1, 120);
}
export const DEFAULT_RULES: Rules = Object.fromEntries(RULE_FIELDS.map((f) => [f.key, f.value]));
export const rule = (s: Pick<GameState, 'config'>, key: string): number => {
  if (/^(silver|gold)\./.test(key)) {
    const [kind, stat] = key.split('.');
    return (
      (s.config?.[`wood.${stat}`] ?? DEFAULT_RULES[`wood.${stat}`]!) * (kind === 'silver' ? 2 : 4)
    );
  }
  return s.config?.[key] ?? DEFAULT_RULES[key]!;
};
export const arrivalInterval = (s: GameState) =>
  rule(s, 'arrivalHours') *
  HOUR *
  Math.min(
    [0.75, 0.75, 0.5, 0.25, 0.25][unlockedTier(s, 'adventurer') - 1],
    s.research.includes('guild3')
      ? 0.6
      : s.research.includes('guild2')
        ? 1 - rule(s, 'guild2.spawnReduction') / 100
        : 1,
  );
export const partyFormationTime = (s: GameState) =>
  (s.research.includes('guild3')
    ? 10
    : rule(s, s.research.includes('guild2') ? 'guild2.partySeconds' : 'partySeconds')) *
  1000 *
  24;
export function validateRules(input: Rules): Rules {
  const rules = { ...DEFAULT_RULES, ...input };
  for (const [key, value] of Object.entries(rules)) {
    const f = RULE_FIELDS.find((f) => f.key === key);
    if (
      !f ||
      !Number.isFinite(value) ||
      value < f.min ||
      value > f.max ||
      Math.abs((value - f.min) / f.step - Math.round((value - f.min) / f.step)) > 1e-6
    )
      throw new Error(`Invalid setting: ${key}`);
  }
  for (const key of Object.keys(rules).filter((k) => k.endsWith('Min')))
    if (rules[key]! > rules[key.replace(/Min$/, 'Max')]!)
      throw new Error(`${key}: minimum must not exceed maximum.`);
  if (
    ['trapdoors', 'arrows', 'mimics', 'wood', 'silver', 'mobSlots'].reduce(
      (n, k) => n + rules[`policy.${k}`]!,
      0,
    ) > 12
  )
    throw new Error('Floor layout exceeds 12 encounter slots.');
  return rules;
}
export function applyRules(state: GameState, input: Rules): GameState {
  const next = structuredClone(state),
    rules = validateRules(input);
  const changed = (key: string) => rule(state, key) !== rule({ config: rules }, key);
  next.config = rules;
  if (
    Object.keys(rules).some(
      (k) =>
        k.startsWith('policy.') &&
        changed(k) &&
        !['policy.restFee', 'policy.restCapacity', 'policy.mobLimit'].includes(k),
    )
  )
    next.policyRevision++;
  next.configRevision = (state.configRevision ?? 0) + 1;
  if (partyFormationTime(next) !== partyFormationTime(state))
    for (const p of next.parties.filter((p) => p.status === 'arriving'))
      p.surfaceUntil =
        next.now +
        Math.ceil(
          (Math.max(0, p.surfaceUntil - next.now) * partyFormationTime(next)) /
            partyFormationTime(state),
        );
  for (const a of next.actors) {
    const old = {
      health: a.maxHealth,
      defense: a.maxDefense,
      stamina: a.maxStamina,
      primary: a.primary,
    };
    for (const stat of [
      'maxHealth',
      'maxDefense',
      'maxStamina',
      'damage',
      'speed',
      'intelligence',
      'primary',
      'learning',
    ] as const) {
      const advanced = (a.outfitTier ?? 1) >= 2 && ['fighter', 'wizard', 'healer'].includes(a.role);
      const factor = advanced ? (a.outfitTier ?? 2) / 2 : 1;
      const key = `${advanced ? 'level2.' : ''}${a.role}.${stat}`;
      if (changed(key)) a[stat] = Math.max(1, a[stat] + (rules[key]! - rule(state, key)) * factor);
    }
    a.health =
      a.health <= 0 ? 0 : Math.max(1, Math.min(a.maxHealth, a.health + a.maxHealth - old.health));
    a.defense = Math.max(0, Math.min(a.maxDefense, a.defense + a.maxDefense - old.defense));
    a.stamina = Math.max(0, Math.min(a.maxStamina, a.stamina + a.maxStamina - old.stamina));
    a.primaryCurrent = Math.max(
      0,
      Math.min(a.primary, (a.primaryCurrent ?? old.primary) + a.primary - old.primary),
    );
  }
  for (const key of Object.keys(next.policy) as (keyof GameState['policy'])[])
    if (changed(`policy.${key}`) && rules[`policy.${key}`] !== undefined)
      next.policy[key] = rules[`policy.${key}`]!;
  for (const key of ['reinvest', 'saleRatio', 'trainingPrice', 'trainingLimit'] as const)
    if (changed(key)) next[key] = rules[key]!;
  if (changed('fee')) next.fee = rules.fee! * 100;
  for (const f of next.floors) {
    if (changed('policy.floorHealth'))
      f.health = Math.max(0, f.health + next.policy.floorHealth - state.policy.floorHealth);
    if (changed('policy.floorDefense'))
      f.defense = Math.max(0, f.defense + next.policy.floorDefense - state.policy.floorDefense);
    if (['queued', 'excavating'].includes(f.stage))
      f.required = excavationWork(f.id, rules.digMinutes!, rules.digGrowth!);
    for (const e of f.encounters) {
      const k = e.kind;
      if (e.health > 0 && changed(`${k}.health`))
        e.health = Math.max(0, e.health + rule(next, `${k}.health`) - rule(state, `${k}.health`));
      for (const [stat, suffix] of [
        ['damage', 'damage'],
        ['maxDefense', 'defense'],
      ] as const)
        if (changed(`${k}.${suffix}Min`) || changed(`${k}.${suffix}Max`))
          e[stat] = Math.round(
            (rule(next, `${k}.${suffix}Min`) + rule(next, `${k}.${suffix}Max`)) / 2,
          );
      e.defense = Math.min(e.defense, e.maxDefense);
      if (
        ['wood', 'silver', 'gold'].includes(k) &&
        (changed(`${k}.goldMin`) || changed(`${k}.goldMax`))
      ) {
        e.capacity = Math.round((rule(next, `${k}.goldMin`) + rule(next, `${k}.goldMax`)) * 50);
        if (e.gold > e.capacity) {
          next.reserve += e.gold - e.capacity;
          e.gold = e.capacity;
        }
      }
      const key = `${k === 'slime' ? 'slime' : 'zombie'}.spawnHours`;
      if (changed(key))
        e.readyAt =
          next.now + (Math.max(0, e.readyAt - next.now) * rule(next, key)) / rule(state, key);
    }
    if (changed('zombie.spawnHours') || changed('slime.spawnHours'))
      f.spawnAt =
        next.now + Math.min(rule(next, 'zombie.spawnHours'), rule(next, 'slime.spawnHours')) * HOUR;
  }
  if (changed('arrivalHours') || changed('guild2.spawnReduction'))
    next.nextArrivalAt =
      next.now +
      (Math.max(0, next.nextArrivalAt - next.now) * arrivalInterval(next)) / arrivalInterval(state);
  if (partyFormationTime(next) !== partyFormationTime(state))
    for (const p of next.parties.filter((p) => p.status === 'arriving'))
      p.surfaceUntil =
        next.now +
        Math.ceil(
          (Math.max(0, p.surfaceUntil - next.now) * partyFormationTime(next)) /
            partyFormationTime(state),
        );
  for (const a of next.actors) {
    const old = state.actors.find((x) => x.id === a.id)!;
    const speedRatio = Math.max(1, old.speed) / Math.max(1, a.speed);
    if (a.task && old.task) {
      const encounter = next.floors[a.task.floor - 1]?.encounters.find(
        (e) => e.id === a.task!.encounter,
      );
      const oldEncounter = state.floors[old.task.floor - 1]?.encounters.find(
        (e) => e.id === old.task!.encounter,
      );
      const workRatio =
        maintenanceWorkTime(next, a, a.task.kind === 'reset' ? encounter : undefined) /
        maintenanceWorkTime(state, old, old.task.kind === 'reset' ? oldEncounter : undefined);
      const travel = Math.max(0, (a.task.arriveAt ?? next.now) - next.now);
      const work = Math.max(0, a.task.until - Math.max(next.now, a.task.arriveAt ?? next.now));
      if (a.task.arriveAt !== undefined && a.task.arriveAt > next.now)
        a.task.arriveAt = next.now + Math.ceil(travel * speedRatio);
      a.task.until = next.now + Math.ceil(travel * speedRatio + work * workRatio);
    }
    if (a.returnUntil && speedRatio !== 1)
      a.returnUntil = next.now + Math.ceil(Math.max(0, a.returnUntil - next.now) * speedRatio);
  }
  if (next.researchJob) {
    const key = `research.${next.researchJob.id}.hours`;
    if (changed(key))
      next.researchJob.end =
        next.now +
        (Math.max(0, next.researchJob.end - next.now) * rule(next, key)) / rule(state, key);
  }
  return next;
}

/** Material tiers edit their shared wood baseline, retaining silver=2x and gold=4x. */
export const editableRuleKey = (key: string) => key.replace(/^(silver|gold)\./, 'wood.');
export function adjustRule(rules: Rules, key: string, direction: -1 | 1): Rules {
  const target = editableRuleKey(key),
    field = RULE_FIELDS.find((f) => f.key === target)!;
  return {
    ...rules,
    [target]: Number(
      Math.max(
        field.min,
        Math.min(field.max, (rules[target] ?? field.value) + direction * field.step),
      ).toFixed(2),
    ),
  };
}

export const staffHireCost = (s: GameState, role: 'miner' | 'maintenance' | 'defender') =>
  Math.max(
    0,
    rule(s, `cost.${role}`) +
      (role === 'miner' ? (unlockedTier(s, 'builder') - 1) * 5 : 0) -
      (s.research.includes('unpaidOvertime') ? 1 : 0),
  );

export const tierStaffHireCost = (s: GameState, tier: number) =>
  Math.max(0, rule(s, `cost.staffTier${tier}`) - (s.research.includes('unpaidOvertime') ? 1 : 0));
