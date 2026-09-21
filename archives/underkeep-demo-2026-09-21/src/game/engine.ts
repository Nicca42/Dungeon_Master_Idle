import { installationProgress } from './installation';
import { maintenanceTiming, maintenanceWorkTime, staffTravelTime } from './staffSpeed';
import { arrivalSequence, arrivalOffset, mobReadyAt, staggerMobs } from './spawnTiming';
import { combatStats, adventureStats, observeAdventures, recordAdventures } from './adventureStats';
import { nextLook, defaultArtChoices } from './appearance';
import { availableFixtures } from './fixtures';
import { researchAvailable, queueBuildingUpgrade, upgradingFloor, newFloor } from './research';
import { serviceStaffRoom, isStaff, staffRoom } from './staffRest';
import {
  rule,
  DEFAULT_RULES,
  Rules,
  validateRules,
  arrivalInterval,
  partyFormationTime,
} from './config';
import { recordGold } from './ledger';
import { primaryAvailable, fullyRecovered, replenish, ROOM_RECOVERY_INTERVAL } from './recovery';
import { restWaiters } from './rest';
import {
  Actor,
  Command,
  Encounter,
  Floor,
  GameState,
  Party,
  ResearchId,
  Role,
  Stat,
  Xp,
  ActionCue,
} from './types';
import { encounterX, nodeAtX } from './layout';
import { DAY, floorNames, HOUR, RESEARCH, TICK } from './content';

export const blankXp = (): Xp => ({
  primary: 0,
  damage: 0,
  maxHealth: 0,
  maxDefense: 0,
  maxStamina: 0,
  speed: 0,
  intelligence: 0,
});
function random(s: GameState): number {
  let t = (s.seed += 0x6d2b79f5) >>> 0;
  s.seed >>>= 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const roll = (s: GameState, lo: number, hi: number) => lo + Math.floor(random(s) * (hi - lo + 1));
function log(s: GameState, text: string, kind: 'gold' | 'work' | 'combat' | 'info' = 'info') {
  s.activity.unshift({ id: s.nextId++, time: s.now, text, kind });
  s.activity = s.activity.slice(0, 60);
}
const names: Record<Role, string[]> = {
  fighter: ['Bram', 'Thora', 'Garrick', 'Pip', 'Rook', 'Freya'],
  wizard: ['Elowen', 'Orin', 'Nyx', 'Aster'],
  healer: ['Mira', 'Sage', 'Clover'],
  miner: ['Flint', 'Moss', 'Grumble'],
  maintenance: ['Patch', 'Wren'],
  defender: ['Bluebell', 'Kit', 'Robin', 'Indigo'],
};
function actor(s: GameState, role: Role, base = 10): Actor {
  const count = s.actors.filter((a) => a.role === role).length;
  const look = nextLook(s, role);
  return {
    id: s.nextId++,
    ...(look.variant !== undefined ? { variant: look.variant } : {}),
    name: names[role][count % names[role].length]!,
    role,
    health: rule(s, `${role}.maxHealth`) + base - 10,
    maxHealth: rule(s, `${role}.maxHealth`) + base - 10,
    defense: rule(s, `${role}.maxDefense`) + base - 10,
    maxDefense: rule(s, `${role}.maxDefense`) + base - 10,
    stamina: rule(s, `${role}.maxStamina`) + base - 10,
    maxStamina: rule(s, `${role}.maxStamina`) + base - 10,
    damage: rule(s, `${role}.damage`) + base - 10,
    speed: rule(s, `${role}.speed`) + base - 10,
    intelligence: rule(s, `${role}.intelligence`) + base - 10,
    primary: rule(s, `${role}.primary`) + base - 10,
    primaryCurrent: rule(s, `${role}.primary`) + base - 10,
    outfitSaturation: ['fighter', 'wizard', 'healer', 'defender'].includes(role)
      ? look.saturation
      : 1,
    wealth: rule(s, `${role}.wealth`) * 100,
    xp: 0,
    learning: rule(s, `${role}.learning`),
    status: role === 'miner' || role === 'maintenance' || role === 'defender' ? 'working' : 'town',
    until: 0,
    trained: false,
    bankedXp: blankXp(),
    pendingXp: blankXp(),
    task: null,
  };
}
export function initialState(seed = 42691, config: Rules = DEFAULT_RULES): GameState {
  const s: GameState = {
    version: 1,
    artChoices: defaultArtChoices(),
    rulesVersion: 2,
    config: { ...config },
    configRevision: 0,
    staffRoom: { capacity: 10, queue: [], occupants: [] },
    ledger: [],
    ledgerSince: 0,
    policyRevision: 0,
    complaints: [],
    seed,
    now: 0,
    nextTick: TICK,
    nextId: 1,
    tutorial: 0,
    gold: 20000,
    reserve: 0,
    fee: 1000,
    reinvest: 30,
    saleRatio: 50,
    trainingPrice: 1,
    trainingLimit: 3,
    office: false,
    officeHealth: 100,
    gameOver: false,
    nextArrivalAt: HOUR,
    spawnPoints: 1,
    excavationSpells: 2,
    escapedMobs: [],
    opened: false,
    actors: [],
    floors: floorNames.map((name, index) => ({
      id: index + 1,
      name,
      stage: 'locked',
      work: 0,
      required: 12 * 1.5 ** index,
      restSpots: 0,
      encounters: [],
      visitors: 0,
      spawnAt: HOUR,
      policyRevision: 0,
      health: 10,
      defense: 10,
      level: 1,
      restQueue: [],
      restOccupants: [],
    })),
    parties: [],
    research: ['getDigging'],
    trapStealth: 5,
    staffRestThreshold: 0,
    spawnTiers: [1],
    researchJob: null,
    activity: [],
    totals: { admissions: 0, income: 0, loot: 0, visits: 0, retreats: 0, training: 0, built: 0 },
    trainingOffered: false,
    trainingDay: 0,
    trainingSeats: 0,
    recoveryGrant: false,
    quietSince: 0,
    policy: {
      trapdoors: 1,
      arrows: 1,
      mimics: 1,
      wood: 2,
      silver: 1,
      gold: 0,
      mobSlots: 2,
      mobLimit: 2,
      attackBudget: 10,
      trapAttackBudget: 30,
      trapDefenseBudget: 30,
      treasureBudget: 30,
      floorHealth: 10,
      floorDefense: 10,
      floorLevel: 1,
      restCapacity: 10,
      restFee: 0,
    },
  };
  s.gold = rule(s, 'startingGold') * 100;
  s.fee = rule(s, 'fee') * 100;
  for (const key of ['reinvest', 'saleRatio', 'trainingPrice', 'trainingLimit'] as const)
    s[key] = rule(s, key);
  for (const key of Object.keys(s.policy) as (keyof GameState['policy'])[])
    if (config[`policy.${key}`] !== undefined) s.policy[key] = config[`policy.${key}`]!;
  for (const f of s.floors) {
    f.required = 1.2 * rule(s, 'digMinutes') * rule(s, 'digGrowth') ** (f.id - 1);
    f.health = s.policy.floorHealth;
    f.defense = s.policy.floorDefense;
  }
  s.nextArrivalAt = arrivalInterval(s);
  for (const role of [
    'fighter',
    'fighter',
    'fighter',
    'fighter',
    'fighter',
    'fighter',
    'wizard',
    'wizard',
    'wizard',
    'wizard',
    'healer',
    'healer',
  ] as Role[])
    s.actors.push(actor(s, role));
  log(s, 'A new dungeon. A fresh start. A very long way down.');
  return s;
}
function spend(s: GameState, amount: number, reason = 'Construction & setup') {
  if (!Number.isSafeInteger(amount) || amount < 0 || s.gold < amount)
    throw new Error('Not enough gold in the treasury.');
  s.gold -= amount;
  recordGold(s, -amount, reason);
}
function unlock(s: GameState, ...ids: ResearchId[]) {
  for (const id of ids) if (!s.research.includes(id)) s.research.push(id);
}
function makeEncounter(s: GameState, kind: Encounter['kind']): Encounter {
  const capacity = ['wood', 'silver', 'gold'].includes(kind)
    ? roll(s, rule(s, `${kind}.goldMin`), rule(s, `${kind}.goldMax`)) * 100
    : 0;
  return {
    id: s.nextId++,
    kind,
    tier: ['mimic', 'trapdoor'].includes(kind) && s.research.includes('betterTraps') ? 2 : 1,
    roaming: false,
    active: true,
    health: rule(s, `${kind}.health`),
    maxDefense: 0,
    defense: roll(s, rule(s, `${kind}.defenseMin`), rule(s, `${kind}.defenseMax`)),
    damage:
      ['mimic', 'trapdoor'].includes(kind) && s.research.includes('betterTraps')
        ? roll(s, 10, 20)
        : roll(s, rule(s, `${kind}.damageMin`), rule(s, `${kind}.damageMax`)),
    gold: 0,
    capacity,
    readyAt: s.now + rule(s, `${kind === 'slime' ? 'slime' : 'zombie'}.spawnHours`) * HOUR,
    position: 0,
  };
}
function capTrapDamage(s: GameState, encounters: Encounter[]) {
  const traps = encounters.filter((e) => ['trapdoor', 'arrows', 'mimic'].includes(e.kind));
  const minimum = (e: Encounter) => (e.tier === 2 ? 10 : 0);
  let reserved = traps.reduce((n, e) => n + minimum(e), 0);
  let remaining = Math.max(s.policy.trapAttackBudget, reserved);
  for (const e of traps) {
    reserved -= minimum(e);
    e.damage = Math.max(minimum(e), Math.min(e.damage, remaining - reserved));
    remaining -= e.damage;
  }
}
function layout(s: GameState, f: Floor) {
  s.reserve += f.encounters.reduce((n, e) => n + e.gold, 0);
  f.encounters = [];
  const groups: [Encounter['kind'], number][] = [
    ['trapdoor', s.policy.trapdoors],
    ['wood', s.policy.wood],
    ['zombie', Math.min(s.policy.mobSlots, s.policy.zombieNests ?? 1)],
    ['arrows', s.policy.arrows],
    ['silver', s.policy.silver],
    ['gold', s.research.includes('goldChests') ? (s.policy.gold ?? 0) : 0],
    ['slime', Math.max(0, s.policy.mobSlots - (s.policy.zombieNests ?? 1))],
    ['mimic', s.policy.mimics],
  ];
  for (const [kind, count] of groups)
    for (let i = 0; i < count; i++) {
      const e = makeEncounter(s, kind);
      if (kind === 'slime' || kind === 'zombie') e.active = false;
      e.position = f.encounters.length;
      e.slot = f.encounters.length;
      f.encounters.push(e);
    }
  capTrapDamage(s, f.encounters);
  let defenseRemaining = s.policy.trapDefenseBudget,
    treasureRemaining = s.policy.treasureBudget * 100;
  for (const e of f.encounters) {
    if (['trapdoor', 'arrows', 'mimic'].includes(e.kind)) {
      e.defense = Math.min(e.defense, defenseRemaining);
      defenseRemaining -= e.defense;
    }
    e.maxDefense = e.defense;
    if (e.capacity) {
      e.capacity = Math.min(e.capacity, treasureRemaining);
      treasureRemaining -= e.capacity;
    }
  }
  if (!['ready', 'open'].includes(f.stage)) f.health = s.policy.floorHealth;
  f.level = Math.max(f.level, s.policy.floorLevel);
  f.defense = f.level === 2 ? 20 : s.policy.floorDefense;
  f.policyRevision = s.policyRevision;

  f.spawnAt = s.now + HOUR;
  applyGroupLayout(s, f);
}
function reorderFloor(s: GameState, f: Floor, ids: number[], slots: number[]) {
  const parties = s.parties.filter((p) => p.floor === f.id);
  const current = new Map(parties.map((p) => [p.id, f.encounters[p.node]?.id]));
  for (const p of parties)
    p.completedEncounters ??=
      p.status === 'arriving' ? [] : f.encounters.slice(0, p.node).map((e) => e.id);
  const mobX = new Map(
    f.encounters
      .filter((e) => ['zombie', 'slime'].includes(e.kind) && e.active)
      .map((e) => [e.id, encounterX(f, e.position)]),
  );
  const workers = s.actors.filter((a) => a.workFloor === f.id);
  const workerX = new Map(workers.map((a) => [a.id, encounterX(f, a.workPosition ?? 0)]));
  const roaming = f.encounters.filter((e) => e.roaming);
  f.encounters = ids.map((id) => f.encounters.find((e) => e.id === id)!);
  f.encounters.forEach((e, i) => {
    e.slot = slots[i]!;
  });
  f.encounters.sort((a, b) => a.slot! - b.slot!);
  f.encounters.push(...roaming);
  f.encounters.forEach((e, i) => {
    e.position = mobX.has(e.id) ? nodeAtX(f, mobX.get(e.id)!) : i;
  });
  for (const p of parties) {
    const id = current.get(p.id);
    p.node =
      p.status === 'arriving'
        ? 0
        : id === undefined
          ? f.encounters.length
          : f.encounters.findIndex((e) => e.id === id);
  }
  for (const a of workers) a.workPosition = nodeAtX(f, workerX.get(a.id)!);
}
function applyGroupLayout(s: GameState, f: Floor) {
  if (!s.groupLayout || !f.encounters.length) return;
  const fixtures = f.encounters.filter((e) => !e.roaming).sort((a, b) => a.id - b.id);
  const placements: { id: number; slot: number }[] = [];
  for (const entry of s.groupLayout) {
    const e = fixtures.filter((e) => e.kind === entry.kind)[entry.ordinal];
    if (e && !placements.some((p) => p.id === e.id || p.slot === entry.slot))
      placements.push({ id: e.id, slot: entry.slot });
  }
  for (const e of fixtures.filter((e) => !placements.some((p) => p.id === e.id))) {
    const slot = Array.from({ length: 12 }, (_, i) => i).find(
      (i) => !placements.some((p) => p.slot === i),
    );
    if (slot !== undefined) placements.push({ id: e.id, slot });
  }
  reorderFloor(
    s,
    f,
    placements.map((p) => p.id),
    placements.map((p) => p.slot),
  );
}
function fill(s: GameState, e: Encounter) {
  const amount = Math.min(e.capacity - e.gold, s.reserve);
  s.reserve -= amount;
  e.gold += amount;
  if (e.capacity > 0) e.active = e.gold > 0;
}
function members(s: GameState, p: Party) {
  return p.members.map((id) => s.actors.find((a) => a.id === id)!).filter(Boolean);
}
export function level(a: Actor) {
  return Math.floor(
    Math.min(
      a.maxHealth,
      a.maxDefense,
      a.maxStamina,
      a.damage,
      a.intelligence,
      a.speed,
      a.primary,
    ) / 10,
  );
}
export function attack(target: { health: number; defense: number }, power: number, source?: Actor) {
  const blocked = Math.min(target.defense, power);
  target.defense -= blocked;
  const lost = Math.min(target.health, power - blocked);
  if (source) {
    combatStats(source).defenseDealt += blocked;
    combatStats(source).healthDealt += lost;
  }
  if ('pendingXp' in target) {
    const stats = combatStats(target as Actor);
    stats.defenseTaken += blocked;
    stats.healthTaken += lost;
    if (target.health > 0 && lost >= target.health) stats.deaths++;
    if (blocked > 0) learn(target as Actor, 'maxDefense');
    if (lost > 0) learn(target as Actor, 'maxHealth');
  }
  target.health = Math.max(0, target.health - (power - blocked));
  if (
    'kind' in target &&
    target.health === 0 &&
    !['mimic', 'zombie', 'slime'].includes((target as Encounter).kind)
  ) {
    (target as Encounter).destroyed = true;
    (target as Encounter).active = false;
  }
}
export function heal(a: Actor, power: number) {
  const amount = Math.min(power, a.maxHealth - a.health);
  a.health += amount;
  if (Math.floor(power / 10) >= 2) a.defense = Math.min(a.maxDefense, a.defense + power - amount);
}
export function learn(a: Actor, stat: Stat = 'primary') {
  if (a.health <= 0) return;
  a.pendingXp[stat]++;
  combatStats(a).xp[stat]++;
}
export function usePrimary(a: Actor) {
  if (a.health <= 0 || primaryAvailable(a) <= 0) return;
  a.primaryCurrent = primaryAvailable(a) - 1;
  learn(a);
}
export function spendStamina(a: Actor, amount: number) {
  const spent = Math.min(a.stamina, amount);
  a.stamina -= spent;
  if (spent > 0) learn(a, 'maxStamina');
}
function bankStaffXp(a: Actor) {
  for (const stat of Object.keys(a.pendingXp) as Stat[]) {
    a.bankedXp[stat] += a.pendingXp[stat];
    a.pendingXp[stat] = 0;
    while (a.bankedXp[stat] >= a.learning) {
      a.bankedXp[stat] -= a.learning;
      a[stat]++;
    }
  }
  a.xp = Object.values(a.bankedXp).reduce((n, xp) => n + xp, 0);
}
export function bankFloorXp(s: GameState, p: Party) {
  if (p.checkpointed) return;
  const team = members(s, p);
  let gained = 0,
    charged = 0;
  for (const a of team) {
    if (a.health <= 0) {
      a.pendingXp = blankXp();
      continue;
    }
    for (const stat of Object.keys(a.pendingXp) as Stat[]) {
      a.bankedXp[stat] += a.pendingXp[stat];
      a.pendingXp[stat] = 0;
      while (a.bankedXp[stat] >= a.learning) {
        a.bankedXp[stat] -= a.learning;
        a[stat]++;
        gained++;
        let fee = rule(s, 'levelFee') * 100;
        for (const payer of team.filter((x) => x.health > 0)) {
          const paid = Math.min(payer.wealth, fee);
          payer.wealth -= paid;
          fee -= paid;
          charged += paid;
          if (!fee) break;
        }
      }
    }
    a.xp = Object.values(a.bankedXp).reduce((n, v) => n + v, 0);
  }
  s.gold += charged;
  recordGold(s, charged, 'Stat level-up fees');
  s.totals.income += charged;
  p.checkpointed = true;
  if (gained)
    log(
      s,
      `Floor ${p.floor} checkpoint: ${gained} stat gains; ${charged / 100} gold collected from party #${p.id}.`,
      'gold',
    );
}
function finishParty(s: GameState, p: Party, retreat = false) {
  for (const a of members(s, p)) {
    a.pendingXp = blankXp();
    if (a.health <= 0) {
      a.status = 'dead';
      continue;
    }
    a.status = 'recovering';
    a.until = s.now + 12 * HOUR;
  }
  for (const f of s.floors) {
    f.restQueue = f.restQueue.filter((id) => id !== p.id);
    f.restOccupants = f.restOccupants.filter((o) => o.partyId !== p.id);
  }
  s.parties = s.parties.filter((x) => x.id !== p.id);
  s.totals.visits++;
  if (retreat) s.totals.retreats++;
  log(
    s,
    retreat
      ? `Party #${p.id} failed its expedition. Unbanked XP was lost.`
      : `Party #${p.id} completed its expedition.`,
    retreat ? 'combat' : 'info',
  );
  if (!retreat && random(s) < rule(s, 'equipmentChance') / 100) {
    if (random(s) * 100 < s.saleRatio) {
      s.gold += rule(s, 'equipmentGold') * 100;
      recordGold(s, rule(s, 'equipmentGold') * 100, 'Equipment sales');
      s.totals.income += rule(s, 'equipmentGold') * 100;
      log(s, `Lost-property equipment sold for ${rule(s, 'equipmentGold')} gold.`, 'gold');
    } else {
      s.reserve += rule(s, 'equipmentGold') * 100;
      log(
        s,
        `Lost-property equipment converted to ${rule(s, 'equipmentGold')} gold for treasure.`,
        'gold',
      );
    }
  }
}
export function damageFloor(f: Floor, power: number) {
  f.health = Math.max(0, f.health - Math.max(0, power - f.defense));
}
export function maintenanceNeeded(s: GameState) {
  const staff = s.actors.filter((a) => a.role === 'maintenance' && a.health > 0);
  const claimed = new Set(staff.filter((a) => a.task).map((a) => a.task!.encounter));
  const waiting = s.floors.some((f) =>
    f.encounters.some(
      (e) =>
        (e.destroyed || (!e.active && ['trapdoor', 'arrows'].includes(e.kind))) &&
        !claimed.has(e.id),
    ),
  );
  return (
    s.office && waiting && staff.every((a) => !!a.task || a.status === 'resting' || a.stamina === 0)
  );
}
function cue(
  s: GameState,
  p: Party,
  kind: ActionCue['kind'],
  a: Actor,
  difficulty: number,
  power: number,
  success = true,
) {
  if (kind === 'attack' || kind === 'defend')
    damageFloor(s.floors[p.floor - 1]!, kind === 'attack' ? power : difficulty);
  p.actions.push({ kind, actor: a.name, difficulty, power, success, time: s.now });
  p.actions = p.actions.slice(-8);
}
function needsHealing(a: Actor, healer: Actor) {
  return (
    a.health > 0 &&
    (a.health < a.maxHealth ||
      (healer.primary + healer.intelligence >= 20 && a.defense < a.maxDefense))
  );
}
export const restAreaThreatened = (f: Floor) =>
  f.encounters.some(
    (e) =>
      e.active &&
      e.health > 0 &&
      ['zombie', 'slime'].includes(e.kind) &&
      e.position >= (f.encounters.length * 2) / 3,
  );
export const headquartersThreatened = (s: GameState) =>
  s.escapedMobs.length > 0 ||
  s.floors[0]!.encounters.some(
    (e) =>
      e.active &&
      e.health > 0 &&
      ['zombie', 'slime'].includes(e.kind) &&
      e.position <= s.floors[0]!.encounters.length / 3,
  );
export function quietRecovery(s: GameState, a: Actor, safe: boolean) {
  if (!safe || fullyRecovered(a) || a.health <= 0 || a.status === 'dead') {
    delete a.quietRecoverAt;
    return;
  }
  if (a.quietRecoverAt === undefined) a.quietRecoverAt = s.now + 2 * HOUR;
  if (s.now >= a.quietRecoverAt) {
    replenish(a);
    a.quietRecoverAt += 2 * HOUR;
    if (fullyRecovered(a)) a.until = Math.min(a.until, s.now);
  }
}
export function processRest(s: GameState, f: Floor, service = true) {
  if (service)
    for (const a of restWaiters(s, f.id)) {
      if (a.restCheckedAt === undefined || s.now - a.restCheckedAt >= TICK) a.restCheckedAt = s.now;
    }
  const capacity = f.restSpots > 0 ? s.policy.restCapacity : 0;
  f.restQueue = f.restQueue.filter((id) => s.parties.some((p) => p.id === id));
  f.restOccupants = f.restOccupants.filter(
    (o) =>
      (s.parties.some((p) => p.id === o.partyId) ||
        (o.partyId === 0 &&
          s.actors.some(
            (a) =>
              a.id === o.actorId &&
              a.role === 'defender' &&
              a.status === 'resting' &&
              !fullyRecovered(a),
          ))) &&
      s.actors.some((a) => a.id === o.actorId && a.health > 0),
  );
  for (const occupant of service ? f.restOccupants : []) {
    const a = s.actors.find((a) => a.id === occupant.actorId)!;
    delete a.quietRecoverAt;
    while (s.now >= occupant.recoverAt && !fullyRecovered(a)) {
      replenish(a);
      delete a.quietRecoverAt;
      occupant.recoverAt += ROOM_RECOVERY_INTERVAL;
    }
  }
  for (const id of [...f.restQueue]) {
    const p = s.parties.find((p) => p.id === id)!;
    const team = members(s, p).filter((a) => a.health > 0);
    if (service)
      for (const a of team)
        quietRecovery(
          s,
          a,
          !restAreaThreatened(f) && !f.restOccupants.some((o) => o.actorId === a.id),
        );
    for (const a of team)
      if (
        fullyRecovered(a) &&
        !p.restedIds.includes(a.id) &&
        (a.role !== 'healer' || !team.some((x) => needsHealing(x, a)))
      )
        p.restedIds.push(a.id);
    for (const a of team.filter(
      (a) =>
        service &&
        a.role === 'healer' &&
        (f.restOccupants.some((o) => o.actorId === a.id) || !restAreaThreatened(f)),
    )) {
      const target = team.find((x) => needsHealing(x, a));
      const power = primaryAvailable(a) + a.intelligence,
        cost = Math.max(1, Math.floor(power / 10));
      if (target && a.stamina >= cost && primaryAvailable(a) > 0) {
        cue(
          s,
          p,
          'heal',
          a,
          target.maxHealth - target.health + target.maxDefense - target.defense,
          power,
        );
        heal(target, power);
        spendStamina(a, cost);
        usePrimary(a);
        learn(a, 'intelligence');
      }
    }
    if (f.restOccupants.some((o) => o.partyId === id)) p.lastRestAdmissionAt = s.now;
    for (const o of [...f.restOccupants].filter((o) => o.partyId === id)) {
      const a = team.find((a) => a.id === o.actorId)!;
      if (fullyRecovered(a) && !(a.role === 'healer' && team.some((x) => needsHealing(x, a)))) {
        p.restedIds.push(a.id);
        f.restOccupants = f.restOccupants.filter((x) => x.actorId !== a.id);
      }
    }
    p.restedIds = p.restedIds.filter((id) =>
      team.some(
        (a) =>
          a.id === id &&
          fullyRecovered(a) &&
          (a.role !== 'healer' || !team.some((x) => needsHealing(x, a))),
      ),
    );
    const healer = team.find((a) => a.role === 'healer');
    if (
      team.every((a) => p.restedIds.includes(a.id) && fullyRecovered(a)) &&
      (!healer || !team.some((a) => needsHealing(a, healer)))
    ) {
      f.restQueue = f.restQueue.filter((x) => x !== id);
      p.status = 'waiting';
      continue;
    }
    if (
      !f.restOccupants.some((o) => o.partyId === id) &&
      s.now - (p.lastRestAdmissionAt ?? p.restJoinedAt ?? s.now) >
        rule(s, 'restPatienceHours') * HOUR
    ) {
      const message = `Party #${id}: We waited over six hours at floor ${f.id} without a bed. We're leaving!`;
      s.complaints.unshift({ id: s.nextId++, partyId: id, floor: f.id, time: s.now, message });
      s.complaints = s.complaints.slice(0, 40);
      log(s, `Complaint delivered to headquarters. ${message}`);
      finishParty(s, p, true);
      continue;
    }
  }
  for (const id of f.restQueue) {
    const p = s.parties.find((p) => p.id === id)!;
    for (const a of members(s, p).filter((a) => a.health > 0)) {
      if (f.restOccupants.length >= capacity) return;
      if (p.restedIds.includes(a.id) || f.restOccupants.some((o) => o.actorId === a.id)) continue;
      p.restPaidIds ??= [];
      if (!p.restPaidIds.includes(a.id)) {
        const paid = Math.min(a.wealth, s.policy.restFee * 100);
        a.wealth -= paid;
        s.gold += paid;
        recordGold(s, paid, 'Rest room fees');
        s.totals.income += paid;
        p.restPaidIds.push(a.id);
      }
      f.restOccupants.push({
        actorId: a.id,
        partyId: id,
        recoverAt: s.now + ROOM_RECOVERY_INTERVAL,
      });
      p.lastRestAdmissionAt = s.now;
      p.status = 'resting';
    }
  }
}
export const meetsEntryRequirements = (s: GameState, a: Actor) =>
  a.health > 0 && level(a) >= 1 && level(a) <= s.floors[0]!.level && a.wealth >= s.fee;
function checkNewArrival(s: GameState, a: Actor) {
  if (meetsEntryRequirements(s, a)) {
    delete a.entryDeadline;
    return true;
  }
  log(s, `${a.name} left immediately: first-floor entry requirements were not met.`);
  return false;
}
function expireRejectedArrivals(s: GameState) {
  const departing = new Set<number>();
  const assigned = new Set(s.parties.flatMap((p) => p.members));
  for (const a of s.actors) {
    if (!['fighter', 'wizard', 'healer'].includes(a.role) || assigned.has(a.id)) continue;
    const waiting =
      a.status === 'town' || (a.status === 'training' && a.entryDeadline !== undefined);
    if (waiting && !meetsEntryRequirements(s, a)) {
      departing.add(a.id);
      log(
        s,
        `${a.name} left immediately: ${a.wealth < s.fee ? 'cannot afford the entrance fee' : 'first-floor level requirements were not met'}.`,
      );
    } else if (meetsEntryRequirements(s, a)) delete a.entryDeadline;
  }
  if (departing.size) s.actors = s.actors.filter((a) => !departing.has(a.id));
}
function admit(s: GameState) {
  if (!s.opened || s.gameOver) return false;
  const available = s.actors.filter(
    (a) =>
      a.status === 'town' &&
      ['fighter', 'wizard', 'healer'].includes(a.role) &&
      meetsEntryRequirements(s, a),
  );
  // Recruitment is independent of spawning, and incomplete teams consume no RNG.
  if (
    available.filter((a) => a.role === 'fighter').length < 2 ||
    !available.some((a) => a.role === 'wizard') ||
    !available.some((a) => a.role === 'healer')
  )
    return false;
  for (let i = available.length - 1; i > 0; i--) {
    const j = roll(s, 0, i);
    [available[i], available[j]] = [available[j]!, available[i]!];
  }
  const fighters = available.filter((a) => a.role === 'fighter').slice(0, 2),
    wizard = available.find((a) => a.role === 'wizard'),
    healer = available.find((a) => a.role === 'healer');
  if (fighters.length < 2 || !wizard || !healer) return false;
  const group = [...fighters, wizard, healer];
  const extra = available.filter((a) => !group.includes(a));
  if (!s.research.includes('guild'))
    for (let n = roll(s, 0, 2); n > 0 && extra.length; n--) group.push(extra.shift()!);

  const receipt = group.length * s.fee,
    reserve = Math.floor((receipt * s.reinvest) / 100);
  s.gold += receipt - reserve;
  recordGold(s, receipt, 'Entrance fees');
  recordGold(s, -reserve, 'Treasure reinvestment');
  s.reserve += reserve;
  s.totals.income += receipt;
  s.totals.admissions += group.length;
  s.quietSince = s.now;
  for (const a of group) {
    a.wealth -= s.fee;
    a.status = 'adventure';
  }
  const p: Party = {
    id: s.nextId++,
    members: group.map((a) => a.id),
    floor: 1,
    node: 0,
    status: 'arriving',
    surfaceUntil: s.now + partyFormationTime(s),
    restUntil: 0,
    visited: s.floors.filter((f) => f.stage === 'open').map((f) => f.id),
    checkpointed: false,
    restJoinedAt: null,
    lastRestAdmissionAt: null,
    restedIds: [],
    actions: [],
  };
  adventureStats(s).partiesTotal++;
  s.parties.push(p);
  s.floors[0]!.visitors += group.length;
  log(s, `${group.length} adventurers entered. +${receipt / 100} gold admission.`, 'gold');
  return true;
}
function advanceParty(s: GameState, p: Party) {
  const f = s.floors[p.floor - 1]!,
    team = members(s, p).filter((a) => a.health > 0);
  p.actions = p.actions.filter((a) => s.now - a.time < 2 * TICK);
  if (!team.length) {
    finishParty(s, p, true);
    return;
  }
  if (p.status === 'arriving') {
    if (s.now < p.surfaceUntil || s.escapedMobs.length) return;
    p.status = 'moving';
    return;
  }
  if (p.node >= f.encounters.length) {
    if (!p.checkpointed) {
      bankFloorXp(s, p);
      p.restJoinedAt = s.now;
      f.restQueue.push(p.id);
      p.status = 'resting';
      return;
    }
    if (f.restQueue.includes(p.id)) return;
    if (!team.every(fullyRecovered)) return;
    const next = s.floors[p.floor];
    if (next && next.stage === 'open') {
      if (!p.visited.includes(next.id)) p.visited.push(next.id);
      p.floor++;
      p.node = 0;
      delete p.completedEncounters;
      p.status = 'moving';
      p.checkpointed = false;
      p.restedIds = [];
      p.restPaidIds = [];
      p.restJoinedAt = null;
      p.lastRestAdmissionAt = null;
      p.actions = [];
      next.visitors += team.length;
    } else finishParty(s, p);
    return;
  }
  if (team.every((a) => a.stamina === 0)) {
    finishParty(s, p, true);
    return;
  }
  const mobile = f.encounters.find(
    (e) => e.active && ['zombie', 'slime'].includes(e.kind) && Math.abs(e.position - p.node) <= 0.6,
  );
  const slot = f.encounters[p.node]!;
  const e = mobile ?? slot;
  if (e.destroyed || e.installed === false) {
    p.node++;
    p.status = 'moving';
    return;
  }
  if (['wood', 'silver', 'gold'].includes(e.kind) && e.gold > 0) {
    const requirement = rule(s, `${e.kind}.perception`),
      cost = rule(s, `${e.kind}.stamina`);
    const a =
      team.find((a) => a.intelligence >= requirement && a.stamina >= cost) ??
      team.find(
        (a) =>
          a.role === 'wizard' &&
          a.intelligence + primaryAvailable(a) >= requirement &&
          a.stamina >= cost,
      );
    const candidate = a ?? team.find((a) => a.role === 'wizard') ?? team[0]!;
    const power =
      candidate.role === 'wizard'
        ? candidate.intelligence + primaryAvailable(candidate)
        : candidate.intelligence;
    cue(s, p, 'lock', candidate, requirement, power, !!a);
    if (a && e.gold > 0) {
      spendStamina(a, cost);
      learn(a, 'intelligence');
      if (a.role === 'wizard') usePrimary(a);
      const loot = e.gold;
      e.gold = 0;
      e.active = false;
      s.totals.loot += loot;
      team.forEach(
        (m, i) => (m.wealth += Math.floor(loot / team.length) + (i < loot % team.length ? 1 : 0)),
      );
      log(s, `${a.name} opened a ${e.kind} chest. ${loot / 100} gold claimed.`, 'gold');
    }
    if (!a) {
      learn(candidate, 'intelligence');
      log(
        s,
        `Party #${p.id} could not open ${e.kind}: needs ${requirement} intelligence or wizard manipulation and ${cost} stamina.`,
        'info',
      );
    }
  } else if (['trapdoor', 'arrows'].includes(e.kind) && e.active) {
    const requirement =
      e.tier === 2 && e.kind === 'trapdoor'
        ? 20
        : Math.min(10, Math.max(rule(s, `${e.kind}.perception`), s.trapStealth ?? 5));
    const observer = [...team].sort((a, b) => b.intelligence - a.intelligence)[0]!;
    cue(
      s,
      p,
      'detect',
      observer,
      requirement,
      observer.intelligence,
      observer.intelligence >= requirement,
    );
    learn(observer, 'intelligence');
    if (observer.intelligence < requirement) {
      const target = team[0]!;
      cue(s, p, 'defend', target, e.damage, target.defense, target.defense >= e.damage);
      attack(target, e.damage);
      if (target.health <= 0) target.status = 'dead';
      e.active = false;
    }
  } else if (e.active && (e.kind === 'mimic' || e === mobile)) {
    p.status = 'fighting';
    if (e.kind === 'mimic') {
      e.triggeredParties ??= e.triggeredParty === undefined ? [] : [e.triggeredParty];
      if (!e.triggeredParties.includes(p.id)) {
        e.xp = (e.xp ?? 0) + 1;
        e.triggeredParties.push(p.id);
      }
      e.revealedUntil = s.now + TICK;
    }
    for (const a of team.filter((a) => a.stamina > 0)) {
      if (a.role === 'healer') {
        const target = team.find((x) => x.health > 0 && x.health < x.maxHealth);
        const power = primaryAvailable(a) + a.intelligence,
          cost = Math.max(1, Math.floor(power / 10));
        if (target && a.stamina >= cost && primaryAvailable(a) > 0) {
          cue(s, p, 'heal', a, target.maxHealth - target.health, power);
          heal(target, power);
          spendStamina(a, cost);
          usePrimary(a);
          learn(a, 'intelligence');
        } else spendStamina(a, 1);
        continue;
      }
      if (e.health <= 0) break;
      const power = a.damage + primaryAvailable(a),
        cost = a.role === 'wizard' ? Math.max(1, Math.floor(power / 10)) : 1;
      if (a.stamina >= cost) {
        cue(s, p, 'attack', a, e.health + e.defense, power);
        attack(e, power, a);
        spendStamina(a, cost);
        usePrimary(a);
        learn(a, 'damage');
      } else spendStamina(a, 1);
    }
    if (e.health > 0) {
      const target = team[0]!;
      const blocker = team.find((a) => a.role === 'fighter' && a.stamina > 0 && a !== target);
      let damage = e.damage;
      if (blocker) {
        cue(s, p, 'defend', blocker, damage, blocker.damage + blocker.maxDefense);
        damage = Math.max(0, damage - blocker.damage - blocker.maxDefense);
        spendStamina(blocker, 1);
        learn(blocker, 'maxDefense');
      } else cue(s, p, 'defend', target, damage, target.defense, target.defense >= damage);
      attack(target, damage);
      if (target.health <= 0) target.status = 'dead';
      return;
    }
    e.active = false;
    e.readyAt = ['zombie', 'slime'].includes(e.kind)
      ? mobReadyAt(s, e, s.now + rule(s, `${e.kind}.spawnHours`) * HOUR)
      : s.now + HOUR;
    log(s, `Party #${p.id} defeated a ${e.kind}.`, 'combat');
    if (mobile && mobile !== slot) return;
  }
  if (p.completedEncounters) {
    if (!p.completedEncounters.includes(slot.id)) p.completedEncounters.push(slot.id);
    const next = f.encounters.findIndex((e) => !p.completedEncounters!.includes(e.id));
    p.node = next < 0 ? f.encounters.length : next;
  } else p.node++;
  p.status = 'moving';
  if (p.node % 2 === 0)
    for (const a of team) {
      spendStamina(a, 1);
      learn(a, 'speed');
    }
}
export const floorMobCount = (f: Floor) =>
  f.encounters.filter((e) => e.active && e.health > 0 && ['zombie', 'slime'].includes(e.kind))
    .length;
export const mobLimitReached = (s: GameState, f: Floor) =>
  floorMobCount(f) >= (s.policy.mobLimit ?? s.policy.mobSlots);
export function moveMobs(s: GameState, f: Floor) {
  for (const e of f.encounters.filter((e) => e.active && ['zombie', 'slime'].includes(e.kind))) {
    const party = s.parties
      .filter(
        (p) =>
          p.floor === f.id &&
          p.status !== 'arriving' &&
          members(s, p).some((a) => a.health > 0) &&
          !f.restOccupants.some(
            (o) =>
              o.partyId === p.id &&
              p.members.every((id) => f.restOccupants.some((x) => x.actorId === id)),
          ),
      )
      .sort((a, b) => Math.abs(a.node - e.position) - Math.abs(b.node - e.position))[0];
    if (party) {
      const delta = party.node - e.position;
      if (Math.abs(delta) > 0.6) e.position += Math.sign(delta) * Math.min(0.5, Math.abs(delta));
      continue;
    }
    // Return from a chase before resuming patrol around the upper-floor exit.
    const exitZone = Math.max(0.5, f.encounters.filter((e) => !e.roaming).length / 3 - 1);
    if (e.position > exitZone) e.patrolDirection = -1;
    e.position += (e.patrolDirection ?? -1) * 0.5;
    const patrolEnd = Math.max(0.5, f.encounters.filter((e) => !e.roaming).length / 3 - 1);
    if (e.patrolDirection === 1 && e.position >= patrolEnd) {
      e.position = patrolEnd;
      e.patrolDirection = -1;
    }
    if (e.position <= -1 && e.patrolDirection !== 1) {
      if (random(s) >= rule(s, 'escapeChance') / 100) {
        e.position = -1;
        e.patrolDirection = 1;
        continue;
      }
      e.patrolDirection = -1;
      e.active = false;
      e.readyAt = ['zombie', 'slime'].includes(e.kind)
        ? mobReadyAt(s, e, s.now + rule(s, `${e.kind}.spawnHours`) * HOUR)
        : s.now + HOUR;
      if (f.id === 1) {
        s.escapedMobs.push({
          id: s.nextId++,
          kind: e.kind as 'zombie' | 'slime',
          ...(e.variant !== undefined ? { variant: e.variant } : {}),
          ...(e.saturation !== undefined ? { saturation: e.saturation } : {}),
          health: e.health,
          defense: e.defense,
          damage: e.damage,
          position: 90,
        });
        log(s, `A ${e.kind} escaped onto the surface!`, 'combat');
      } else {
        const above = s.floors[f.id - 2]!;
        above.encounters.push({
          ...e,
          id: s.nextId++,
          roaming: true,
          patrolDirection: -1,
          active: true,
          position: Math.max(0, above.encounters.length - 1),
        });
      }
    }
  }
}
export function surfaceCombat(s: GameState) {
  for (const mob of s.escapedMobs) {
    const defenders = [
      ...s.actors.filter((a) => a.role === 'defender' && a.status === 'working'),
      ...s.parties.filter((p) => p.status === 'arriving').flatMap((p) => members(s, p)),
    ].filter((a) => a.health > 0 && a.stamina > 0);
    if (defenders.length) {
      for (const a of defenders) {
        if (mob.health <= 0) break;
        attack(mob, a.damage + primaryAvailable(a), a);
        spendStamina(a, 1);
        usePrimary(a);
        learn(a, 'damage');
        if (a.role === 'defender' && a.stamina === 0) {
          a.status = 'resting';
          a.until = s.now + 10 * HOUR;
        }
      }
      if (mob.health > 0) {
        const target = defenders[0]!;
        attack(target, mob.damage);
        if (target.health <= 0) target.status = 'dead';
      }
    } else {
      mob.position = Math.min(340, mob.position + 18);
      if (mob.position >= 340) s.officeHealth = Math.max(0, s.officeHealth - mob.damage);
    }
  }
  const defeated = s.escapedMobs.some((e) => e.health <= 0);
  s.escapedMobs = s.escapedMobs.filter((e) => e.health > 0);

  if (s.officeHealth === 0 && !s.gameOver) {
    s.gameOver = true;
    log(s, 'Headquarters has fallen. Your dungeon has closed. Restart to try again.', 'combat');
  }
}
// Wages accrue only for active five-minute duty ticks: exactly 1 gold per game hour.
export function processStaffRest(s: GameState) {
  serviceStaffRoom(s, bankStaffXp);
}
export function defenderDuty(s: GameState) {
  for (const a of s.actors.filter((a) => a.role === 'defender' && a.health > 0)) {
    if (a.status === 'resting') continue;
    if (a.stamina <= 0 || (!s.escapedMobs.length && a.stamina < a.maxStamina)) {
      a.status = 'resting';
      continue;
    }
    const ticks = a.dutyTicks ?? 0;
    const wage =
      Math.floor(((ticks + 1) * rule(s, 'wage') * 100) / 12) -
      Math.floor((ticks * rule(s, 'wage') * 100) / 12);
    if (s.gold < wage) {
      a.status = 'resting';
      a.until = s.now + HOUR;
      continue;
    }
    s.gold -= wage;
    recordGold(s, -wage, 'Security wages');
    a.wealth += wage;
    a.dutyTicks = ticks + 1;
    if (a.dutyTicks % 12 === 0 && headquartersThreatened(s)) spendStamina(a, 1);
    if (a.stamina === 0) {
      a.status = 'resting';
      a.until = s.now + 10 * HOUR;
    }
  }
}
export function defenseWarning(s: GameState): { color: 'red' | 'yellow'; text: string } | null {
  const guards = s.actors.filter((a) => a.role === 'defender' && a.health > 0);
  const ready = guards.filter((a) => a.status === 'working' && a.stamina > 0);
  if (!s.escapedMobs.length)
    return guards.length && !ready.length
      ? { color: 'yellow', text: 'All defenders resting' }
      : null;
  if (!ready.length) return { color: 'red', text: 'Escaped mobs · no defenders on duty' };
  // Forecast the same attack order, shields, stamina and travel used by actual combat.
  // No speculative future hires or arrivals are assumed.
  const forecast: GameState = JSON.parse(JSON.stringify(s));
  for (let i = 0; i < 1000 && forecast.escapedMobs.length && !forecast.gameOver; i++) {
    surfaceCombat(forecast);
    if (!forecast.actors.some((a) => a.role === 'defender' && a.health > 0))
      return { color: 'red', text: 'Defenders will be overwhelmed' };
  }
  return forecast.officeHealth <= 0 || forecast.escapedMobs.length
    ? { color: 'red', text: 'Headquarters at risk · hire defenders' }
    : null;
}
function completeMaintenance(s: GameState) {
  for (const a of s.actors) {
    if (a.role === 'maintenance' && !a.task && a.workFloor) {
      a.returnUntil ??= s.now + staffTravelTime(s, a, a.workFloor);
      if (s.now >= a.returnUntil) {
        delete a.workFloor;
        delete a.workPosition;
        delete a.returnUntil;
      }
    }
    if (!a.task || a.task.until > s.now) continue;
    const floor = s.floors[a.task.floor - 1];
    if (a.task.kind === 'repair' && floor)
      floor.health = Math.min(floor.level === 2 ? 20 : s.policy.floorHealth, floor.health + 1);
    const e = s.floors[a.task.floor - 1]?.encounters.find((e) => e.id === a.task!.encounter);
    if (e) {
      if (a.task.kind === 'replace') {
        e.destroyed = false;
        e.installed = true;
        e.active = true;
        e.health = rule(s, `${e.kind}.health`);
        e.defense = e.maxDefense;
      } else if (a.task.kind === 'install') {
        e.installed = true;
        delete e.installProgress;
        delete e.installPaid;
        e.active = !['zombie', 'slime'].includes(e.kind);
      } else if (a.task.kind === 'refill') fill(s, e);
      else {
        e.active = true;
        e.health = rule(s, `${e.kind}.health`);
        e.defense = e.maxDefense;
      }
    }
    a.workFloor = a.task.floor;
    a.workPosition = Math.max(
      0,
      floor?.encounters.findIndex((e) => e.id === a.task!.encounter) ?? 0,
    );
    usePrimary(a);
    a.task = null;
    a.returnUntil = s.now + staffTravelTime(s, a, a.workFloor);
  }
}
function assignMaintenance(s: GameState, resetsOnly = true) {
  for (const a of s.actors.filter((a) => a.role === 'maintenance' && a.health > 0)) {
    const urgent = s.floors.some((f) =>
      f.encounters.some(
        (e) =>
          e.installed !== false &&
          !e.destroyed &&
          !e.active &&
          ['trapdoor', 'arrows'].includes(e.kind) &&
          !s.actors.some((worker) => worker.task?.encounter === e.id),
      ),
    );
    if (a.task?.kind === 'install' && urgent && a.stamina >= rule(s, 'maintenanceStamina')) {
      const fixture = s.floors[a.task.floor - 1]?.encounters.find(
        (e) => e.id === a.task!.encounter,
      );
      if (fixture) {
        fixture.installProgress = installationProgress(fixture, a.task, s.now);
        fixture.installPaid = true;
      }
      a.task = null;
    }
    if (a.task) continue;
    if (!urgent && (resetsOnly || a.status === 'resting' || a.returnUntil)) continue;
    if (a.stamina < rule(s, 'maintenanceStamina')) {
      a.status = 'resting';
      continue;
    }
    const claimed = new Set(s.actors.flatMap((a) => (a.task ? [a.task.encounter] : [])));
    const choices = s.floors
      .flatMap((f) => f.encounters.map((e) => ({ f, e })))
      .filter(({ e }) => e.installed !== false && !claimed.has(e.id));
    const work =
      choices.find(
        ({ e }) => !e.destroyed && !e.active && ['trapdoor', 'arrows'].includes(e.kind),
      ) ??
      choices.find(({ e }) => e.destroyed) ??
      choices.find(({ e }) => e.capacity > e.gold && s.reserve > 0);
    if (work) {
      const { f, e } = work;
      // A charged maintainer may leave the office bed or return journey for an urgent reset.
      a.status = 'working';
      delete a.returnUntil;
      if (s.staffRoom) {
        s.staffRoom.queue = s.staffRoom.queue.filter((id) => id !== a.id);
        s.staffRoom.occupants = s.staffRoom.occupants.filter((o) => o.actorId !== a.id);
      }
      const kind = e.destroyed ? 'replace' : e.capacity ? 'refill' : 'reset';
      spendStamina(a, e.destroyed ? 1 : rule(s, 'maintenanceStamina'));
      const timing = maintenanceTiming(s, a, f.id, kind === 'reset' ? e : undefined);
      a.workFloor = f.id;
      a.workPosition = f.encounters.indexOf(e);
      a.task = {
        floor: f.id,
        encounter: e.id,
        kind,
        ...timing,
      };
    } else {
      const damaged = s.floors.find(
        (f) =>
          ['ready', 'open'].includes(f.stage) &&
          f.health < s.policy.floorHealth &&
          !s.actors.some((worker) => worker.task?.kind === 'repair' && worker.task.floor === f.id),
      );
      if (damaged) {
        spendStamina(a, rule(s, 'maintenanceStamina'));
        const timing = maintenanceTiming(s, a, damaged.id);
        a.workFloor = damaged.id;
        a.workPosition = 0;
        a.task = {
          floor: damaged.id,
          encounter: -damaged.id,
          kind: 'repair',
          ...timing,
        };
      }
    }
  }
}
function installEncounters(s: GameState) {
  assignMaintenance(s);
  for (const f of s.floors.filter(
    (f) =>
      (f.installation === 'installing' && f.stage === 'ready') ||
      (['ready', 'open'].includes(f.stage) &&
        f.installation !== 'pending' &&
        f.encounters.some((e) => e.installed === false)),
  )) {
    if (f.encounters.every((e) => e.installed !== false)) {
      f.installation = 'complete';
      log(s, `Floor ${f.id}: all fixtures installed. Ready to open.`, 'work');
      continue;
    }
    for (const a of s.actors.filter(
      (a) =>
        a.role === 'maintenance' &&
        a.health > 0 &&
        a.stamina > 0 &&
        a.stamina >= rule(s, 'maintenanceStamina') &&
        a.status !== 'resting' &&
        !a.task,
    )) {
      const available = f.encounters.filter(
        (e) => e.installed === false && !s.actors.some((a) => a.task?.encounter === e.id),
      );
      const e = available.find((e) => e.installPaid) ?? available[0];
      if (!e) break;
      if (!e.installPaid) {
        spendStamina(a, rule(s, 'maintenanceStamina'));
        e.installPaid = true;
      }
      delete a.returnUntil;
      const timing = maintenanceTiming(s, a, f.id);
      timing.until =
        timing.arriveAt +
        Math.ceil((timing.until - timing.arriveAt) * (1 - (e.installProgress ?? 0)));
      a.workFloor = f.id;
      a.workPosition = f.encounters.indexOf(e);
      a.task = {
        floor: f.id,
        encounter: e.id,
        kind: 'install',
        ...timing,
      };
    }
  }
}
export const excavationMinutes = (
  floor: number,
  upgraded = false,
  diggers = 3,
  state: Pick<GameState, 'config'> = {},
) =>
  (((rule(state, 'digMinutes') * rule(state, 'digGrowth') ** (floor - 1)) / (upgraded ? 2 : 1)) *
    3) /
  Math.max(1, diggers);
function excavateTick(s: GameState) {
  if (upgradingFloor(s)) return;
  const f = s.floors.find((f) =>
    ['queued', 'excavating', 'foundation', 'furnishing'].includes(f.stage),
  );
  if (!f || !['queued', 'excavating'].includes(f.stage) || !canExcavate(s, f)) return;
  const crew = s.actors.filter(
    (a) => a.role === 'miner' && a.health > 0 && a.status !== 'resting' && a.stamina > 0,
  );
  if (!crew.length) return;
  f.stage = 'excavating';
  f.work =
    Math.round(
      (f.work + crew.length * (TICK / HOUR) * (s.research.includes('digging') ? 2 : 1)) * 1e9,
    ) / 1e9;
  if (f.work + 1e-7 >= f.required) {
    f.stage = 'foundation';
    f.work = 0;
    f.required = 6 * f.id;
    log(s, `Floor ${f.id} excavation complete. Building foundations.`, 'work');
  }
}
export const adventurerCap = (s: GameState) =>
  rule(s, 'populationCap') +
  (s.spawnPoints - 1) * 10 +
  (s.research.includes('guild2') ? rule(s, 'guild2.capacity') : 0);
const adventurerRoles = ['fighter', 'wizard', 'healer'] as const;
const partyRequirement = { fighter: 2, wizard: 1, healer: 1 };
// Fighters occupy spawn capacity while queued or assigned to a dungeon party.
// Arriving parties reserve their places; recovery and training do not.
export function spawnPopulation(s: GameState) {
  const partyMembers = new Set(s.parties.flatMap((p) => p.members));
  return s.actors.filter(
    (a) =>
      adventurerRoles.includes(a.role as (typeof adventurerRoles)[number]) &&
      a.health > 0 &&
      a.status !== 'dead' &&
      (a.role !== 'fighter' ||
        a.status === 'town' ||
        a.status === 'adventure' ||
        partyMembers.has(a.id)),
  );
}

export function waitingPartyCounts(s: GameState) {
  const counts = { fighter: 0, wizard: 0, healer: 0 };
  for (const a of s.actors)
    if (
      a.status === 'town' &&
      a.health > 0 &&
      level(a) >= 1 &&
      level(a) <= s.floors[0]!.level &&
      a.wealth >= s.fee &&
      adventurerRoles.includes(a.role as (typeof adventurerRoles)[number])
    )
      counts[a.role as (typeof adventurerRoles)[number]]++;
  return counts;
}
function guildChoice(counts: ReturnType<typeof waitingPartyCounts>) {
  const complete = Math.min(Math.floor(counts.fighter / 2), counts.wizard, counts.healer);
  return adventurerRoles.find(
    (r) => counts[r] - complete * partyRequirement[r] < partyRequirement[r],
  )!;
}
export function nextArrivalClass(s: GameState, point = arrivalSequence(s) % s.spawnPoints): Role {
  if (s.research.includes('guild')) {
    const counts = waitingPartyCounts(s);
    let choice = guildChoice(counts);
    // Preview each point's future turn, including the classes earlier points will supply.
    for (let n = 0; n < arrivalOffset(s, point); n++) {
      counts[choice]++;
      choice = guildChoice(counts);
    }
    return choice;
  }
  const tier = s.spawnTiers?.[point] ?? 1;
  const weights = adventurerRoles.map((r) => rule(s, `spawn${tier}.${r}Ratio`));
  const bag: Role[] =
    weights.join() === '3,2,1'
      ? ['fighter', 'wizard', 'fighter', 'healer', 'fighter', 'wizard']
      : adventurerRoles.flatMap((r, i) => Array<Role>(weights[i]!).fill(r));
  // Each point completes its own ratio cycle, even with mixed spawn tiers.
  const turn = Math.floor((arrivalSequence(s) + arrivalOffset(s, point)) / s.spawnPoints);
  return bag[(turn + point) % bag.length]!;
}
export function guildPartyForecast(
  s: GameState,
  _active = false,
): { remaining: number | null; reason?: string } {
  if (!s.opened || s.gameOver) return { remaining: null, reason: 'Dungeon closed' };
  const counts = waitingPartyCounts(s);
  if (counts.fighter >= 2 && counts.wizard >= 1 && counts.healer >= 1)
    return { remaining: Math.max(0, s.nextTick - s.now) };
  const forming = s.parties.filter((p) => p.status === 'arriving');
  if (forming.length)
    return { remaining: Math.max(0, Math.min(...forming.map((p) => p.surfaceUntil)) - s.now) };
  const missing = adventurerRoles.flatMap((role) => {
    const n = Math.max(0, partyRequirement[role] - counts[role]);
    return n ? [`${n} ${role}${n > 1 ? 's' : ''}`] : [];
  });
  return { remaining: null, reason: `Need ${missing.join(' · ')}` };
}
export const nextExcavationFloor = (s: GameState) => s.floors.find((f) => f.stage === 'locked');
export const canExcavate = (s: GameState, f: Floor) =>
  f.id === 1 || ['ready', 'open'].includes(s.floors[f.id - 2]!.stage);
function workBuildingUpgrade(s: GameState, a: Actor): boolean {
  const upgrading = upgradingFloor(s);
  if (upgrading) {
    spendStamina(a, 1);
    usePrimary(a);
    upgrading.upgradeWork! += a.primary < 20 ? 0.5 : 1;
    if (upgrading.upgradeWork! >= (upgrading.upgradeRequired ?? 6)) {
      upgrading.level = 2;
      upgrading.health += 10;
      upgrading.defense = 20;
      delete upgrading.upgradeWork;
      delete upgrading.upgradeRequired;
      if (!upgradingFloor(s)) {
        s.policy.floorLevel = 2;
        s.policy.floorHealth = 20;
        s.policy.floorDefense = 20;
      }
    }
    return true;
  }

  return false;
}
function hourly(s: GameState) {
  // Staff resources and productive work use whole, deterministic game hours.
  for (const a of s.actors.filter(
    (a) => (a.role === 'miner' || a.role === 'maintenance') && a.health > 0,
  )) {
    if (a.returnUntil) continue;
    if (a.status === 'resting' || a.stamina <= 0) continue;
    if (a.role === 'miner') {
      if (workBuildingUpgrade(s, a)) continue;
      const f = s.floors.find((f) =>
        ['queued', 'excavating', 'foundation', 'furnishing'].includes(f.stage),
      );
      if (!f) continue;
      if (['queued', 'excavating'].includes(f.stage)) {
        if (s.now % (4 * HOUR) === 0) spendStamina(a, 1);
        usePrimary(a);
        continue;
      }
      spendStamina(a, 1);
      f.work +=
        f.stage === 'excavating' && s.research.includes('digging')
          ? 2
          : f.stage === 'foundation' && s.research.includes('building') && a.primary < 20
            ? 0.5
            : 1;
      usePrimary(a);
      if (f.work >= f.required) {
        f.work = 0;
        if (f.stage === 'excavating') {
          f.stage = 'foundation';
          f.required = 6 * f.id;
        } else if (f.stage === 'foundation') {
          f.stage = 'furnishing';
          f.required = 6;
        } else {
          f.stage = 'ready';
          f.health = s.policy.floorHealth;
          f.defense = s.policy.floorDefense;
          f.level = s.policy.floorLevel;
          f.required = 0;
          if (f.installation !== 'installing') {
            f.installation = 'pending';
            f.encounters = [];
          }

          s.totals.built++;
          log(
            s,
            `Floor ${f.id} is furnished. Order traps & treasure for 5 gold before opening.`,
            'work',
          );
        }
      }
    }
  }
  assignMaintenance(s, false);
  if (s.now % DAY === 0) {
    s.trainingSeats = 0;
    s.trainingDay++;
    for (const a of s.actors.filter((a) => a.status === 'town'))
      a.wealth += Math.max(0, Math.min(300, 2000 - a.wealth));
  }
  if (s.research.includes('training')) enroll(s);
}
function spawnMobs(s: GameState) {
  staggerMobs(s);
  for (const f of s.floors.filter((f) => s.tutorial >= 10 && f.stage === 'open')) {
    if (s.now < f.spawnAt || mobLimitReached(s, f)) continue;
    const e = f.encounters.find(
      (e) =>
        !e.destroyed &&
        e.installed !== false &&
        !e.roaming &&
        ['zombie', 'slime'].includes(e.kind) &&
        !e.active &&
        e.readyAt <= s.now,
    );
    const currentAttack = f.encounters
      .filter((e) => ['zombie', 'slime'].includes(e.kind) && e.active)
      .reduce((sum, e) => sum + e.damage, 0);
    if (e && currentAttack + e.damage <= s.policy.attackBudget) {
      const look = nextLook(s, e.kind);
      if (look.variant !== undefined) e.variant = look.variant;
      else delete e.variant;
      e.saturation = look.saturation;
      e.active = true;
      e.position = f.encounters.indexOf(e);
      e.patrolDirection = -1;
      e.health = rule(s, `${e.kind}.health`);
      e.defense = e.maxDefense;
      f.spawnAt = s.now + TICK;
    }
  }
}
function arrivals(s: GameState) {
  if (s.tutorial >= 10 && s.now >= s.nextArrivalAt) {
    {
      const point = arrivalSequence(s) % s.spawnPoints;
      const role = nextArrivalClass(s, point);
      const tierForRatio = s.spawnTiers?.[point] ?? 1;
      const weight = (r: (typeof adventurerRoles)[number]) =>
        s.research.includes('guild')
          ? partyRequirement[r]
          : rule(s, `spawn${tierForRatio}.${r}Ratio`);
      const cap = Math.ceil(
        (adventurerCap(s) * weight(role as (typeof adventurerRoles)[number])) /
          adventurerRoles.reduce((sum, r) => sum + weight(r), 0),
      );
      const population = spawnPopulation(s);
      if (
        population.length < adventurerCap(s) &&
        population.filter((a) => a.role === role).length < cap
      ) {
        const person = actor(s, role),
          tier = s.spawnTiers?.[point] ?? 1;
        if (tier === 2) {
          for (const stat of [
            'maxHealth',
            'maxDefense',
            'maxStamina',
            'primary',
            'damage',
            'intelligence',
            'speed',
            'learning',
          ] as const)
            person[stat] = rule(s, `level2.${role}.${stat}`);
          person.wealth = rule(s, `level2.${role}.wealth`) * 100;
          person.health = person.maxHealth;
          person.defense = person.maxDefense;
          person.stamina = person.maxStamina;
          person.primaryCurrent = person.primary;
        }
        person.outfitTier = tier;
        if (checkNewArrival(s, person)) s.actors.push(person);
      }
    }
    s.arrivalSequence =
      (s.arrivalSequence ?? Math.max(0, Math.floor(s.nextArrivalAt / HOUR) - 1)) + 1;
    s.nextArrivalAt = s.now + arrivalInterval(s) / s.spawnPoints;
  }
}
export const trainingEligible = (s: GameState, a: Actor) =>
  ['fighter', 'wizard', 'healer'].includes(a.role) &&
  a.status === 'town' &&
  level(a) < 1 &&
  (a.trainingCount ?? (a.trained ? 1 : 0)) < s.trainingLimit;
function enroll(s: GameState) {
  const demand = 10 - s.trainingPrice;
  for (const a of s.actors.filter(
    (a) => trainingEligible(s, a) && a.wealth >= s.trainingPrice * 100,
  )) {
    if (s.trainingSeats >= demand) break;
    a.status = 'training';
    a.until = s.now + rule(s, 'trainingHours') * HOUR;
    a.wealth -= s.trainingPrice * 100;
    s.gold += s.trainingPrice * 100;
    recordGold(s, s.trainingPrice * 100, 'Training fees');
    s.totals.income += s.trainingPrice * 100;
    s.totals.training++;
    s.trainingSeats++;
    log(s, `${a.name} enrolled in training. +${s.trainingPrice} gold.`, 'gold');
  }
}
function tick(s: GameState) {
  if (s.researchJob && s.now >= s.researchJob.end) {
    const id = s.researchJob.id;
    const previousArrivalInterval = arrivalInterval(s);
    const previousFormationTime = partyFormationTime(s);
    unlock(s, id);
    if (id === 'guild2') {
      s.nextArrivalAt =
        s.now +
        Math.ceil(
          (Math.max(0, s.nextArrivalAt - s.now) * arrivalInterval(s)) / previousArrivalInterval,
        );
      for (const p of s.parties.filter((p) => p.status === 'arriving'))
        p.surfaceUntil =
          s.now +
          Math.ceil(
            (Math.max(0, p.surfaceUntil - s.now) * partyFormationTime(s)) / previousFormationTime,
          );
    }
    if (id === 'staffSpeed')
      for (const a of s.actors.filter((a) =>
        ['miner', 'maintenance', 'defender'].includes(a.role),
      )) {
        if (a.task) {
          const e = s.floors[a.task.floor - 1]?.encounters.find((e) => e.id === a.task!.encounter);
          const trap = a.task.kind === 'reset' ? e : undefined;
          const before = { ...s, research: s.research.filter((r) => r !== 'staffSpeed') };
          const ratio = maintenanceWorkTime(s, a, trap) / maintenanceWorkTime(before, a, trap);
          const travel = Math.max(0, (a.task.arriveAt ?? s.now) - s.now);
          const work = Math.max(0, a.task.until - Math.max(s.now, a.task.arriveAt ?? s.now));
          a.task.until = s.now + Math.ceil(travel / 2 + work * ratio);
          if (a.task.arriveAt !== undefined && a.task.arriveAt > s.now)
            a.task.arriveAt = s.now + Math.ceil(travel / 2);
        }
        if (a.returnUntil)
          a.returnUntil = s.now + Math.ceil(Math.max(0, a.returnUntil - s.now) / 2);
      }
    if (id === 'depths')
      for (let i = 0, n = Math.min(5, 50 - s.floors.length); i < n; i++) {
        const f = newFloor(s.floors.length + 1);
        f.required = 1.2 * rule(s, 'digMinutes') * rule(s, 'digGrowth') ** (f.id - 1);
        s.floors.push(f);
      }
    if (id === 'stealth') s.trapStealth = Math.min(10, (s.trapStealth ?? 5) + 1);
    if (id === 'building') queueBuildingUpgrade(s);
    if (id === 'betterTraps') {
      // Research must not turn a level-two trap into a zero-damage fixture.
      s.policy.trapAttackBudget = Math.max(
        s.policy.trapAttackBudget,
        10 * (s.policy.trapdoors + s.policy.mimics),
      );
      for (const f of s.floors) {
        for (const e of f.encounters)
          if (['mimic', 'trapdoor'].includes(e.kind)) {
            e.tier = 2;
            e.damage = roll(s, 10, 20);
          }
        capTrapDamage(s, f.encounters);
      }
    }
    s.researchJob = null;
    log(s, `Research complete: ${RESEARCH.find((r) => r.id === id)!.name}.`, 'work');
  }
  for (const a of s.actors) {
    if (a.status === 'recovering' && s.now >= a.until && fullyRecovered(a)) {
      a.status = 'town';
    }
    if (a.status === 'training' && s.now >= a.until) {
      a.maxHealth++;
      a.maxDefense++;
      a.maxStamina++;
      a.damage++;
      a.speed++;
      a.intelligence++;
      a.primary++;
      a.learning++;
      a.wealth += 100;
      a.health = a.maxHealth;
      a.primaryCurrent = a.primary;
      a.defense = a.maxDefense;
      a.stamina = a.maxStamina;
      a.status = 'town';
      a.trainingCount = (a.trainingCount ?? (a.trained ? 1 : 0)) + 1;
      a.trained = true;
      log(s, `${a.name} graduated. Stronger, wealthier, slower to learn.`, 'work');
    }
  }
  expireRejectedArrivals(s);
  if (s.gameOver) return;
  // Living traps recover themselves; discard legacy reset assignments without charging again.
  for (const f of s.floors)
    for (const e of f.encounters) {
      if (!['zombie', 'slime', 'mimic'].includes(e.kind) && e.health <= 0) {
        e.destroyed = true;
        e.active = false;
      }
      if (e.kind !== 'mimic' || e.destroyed) continue;
      for (const a of s.actors)
        if (a.task?.encounter === e.id && a.task.kind !== 'install') a.task = null;
      if (!e.active && s.now >= e.readyAt) {
        delete e.triggeredParty;
        delete e.triggeredParties;
        e.active = true;
        e.health = rule(s, `${e.kind}.health`);
        e.defense = e.maxDefense;
      }
    }
  completeMaintenance(s);
  assignMaintenance(s);
  processStaffRest(s);
  for (const f of s.floors) {
    if (
      (!f.installation || f.installation === 'complete') &&
      f.policyRevision !== s.policyRevision &&
      ['ready', 'open'].includes(f.stage) &&
      !s.parties.some((p) => p.floor === f.id) &&
      !s.actors.some((a) => a.task?.floor === f.id)
    )
      layout(s, f);
  }
  installEncounters(s);
  excavateTick(s);
  if (s.now % HOUR === 0) hourly(s);
  spawnMobs(s);
  for (const f of s.floors) moveMobs(s, f);
  arrivals(s);
  if (s.tutorial >= 10) {
    if (s.research.includes('guild')) {
      while (admit(s)) {
        /* Drain complete backlog teams. */
      }
    } else admit(s);
  }
  for (const a of s.actors) {
    if (isStaff(a) || a.status === 'resting') continue;
    const party = s.parties.find((p) => p.members.includes(a.id));
    if (party && s.floors[party.floor - 1]!.restQueue.includes(party.id)) continue;
    const floor = party ? s.floors[party.floor - 1] : undefined;
    const safe = floor
      ? !floor.encounters.some(
          (e) =>
            e.active &&
            e.health > 0 &&
            ['mimic', 'zombie', 'slime'].includes(e.kind) &&
            Math.abs(e.position - party!.node) <= 1,
        )
      : !headquartersThreatened(s);
    quietRecovery(s, a, safe);
  }
  defenderDuty(s);
  surfaceCombat(s);
  for (const p of [...s.parties]) advanceParty(s, p);
  for (const f of s.floors) processRest(s, f);
  assignMaintenance(s);
  processStaffRest(s);
}
function settleArrivals(s: GameState, at: number) {
  if (s.gameOver || s.escapedMobs.length) return;
  for (const p of s.parties)
    if (p.status === 'arriving' && p.surfaceUntil <= at && members(s, p).some((a) => a.health > 0))
      p.status = 'moving';
}
// Finish short reset jobs at their deadline, rather than rounding up to the next five-minute tick.
function settleMaintenance(s: GameState, at: number) {
  if (s.gameOver) return;
  const now = s.now;
  while (true) {
    const due = s.actors.flatMap((a) => (a.task && a.task.until <= at ? [a.task.until] : []));
    if (!due.length) break;
    s.now = Math.max(now, Math.min(...due));
    completeMaintenance(s);
  }
  s.now = now;
}
export function advanceTo(state: GameState, target: number, active = false): GameState {
  if (!Number.isSafeInteger(target) || target < state.now)
    throw new Error('Invalid simulation time.');
  // Party formation can complete between action ticks. Otherwise retain entity
  // references so memoized UI and derived calculations remain cached.
  if (!state.opened || target === state.now) return state;
  const arrivalDue =
    !state.escapedMobs.length &&
    state.parties.some((p) => p.status === 'arriving' && p.surfaceUntil <= target);
  const maintenanceDue = state.actors.some((a) => a.task && a.task.until <= target);
  if (target < state.nextTick && !active && !arrivalDue && !maintenanceDue)
    return { ...state, now: target };
  const s: GameState =
    target < state.nextTick && !arrivalDue && !maintenanceDue
      ? { ...state, researchJob: state.researchJob ? { ...state.researchJob } : null }
      : JSON.parse(JSON.stringify(state));
  const bonus = (until: number) => {
    if (!active || s.gameOver) return;
    const elapsed = until - s.now;
    s.arrivalSequence ??= Math.max(0, Math.floor(s.nextArrivalAt / HOUR) - 1);
    if (s.tutorial >= 10) s.nextArrivalAt -= elapsed;
    if (s.researchJob) s.researchJob.end -= elapsed;
  };
  while (s.nextTick <= target) {
    settleMaintenance(s, s.nextTick);
    settleArrivals(s, s.nextTick);
    bonus(s.nextTick);
    s.now = s.nextTick;
    s.nextTick += TICK;
    const observed = observeAdventures(s);
    tick(s);
    recordAdventures(s, observed);
  }
  settleMaintenance(s, target);
  bonus(target);
  settleArrivals(s, target);
  s.now = target;
  return s;
}
function tutorial(s: GameState) {
  const f = s.floors[0]!;
  switch (s.tutorial) {
    case 0:
      s.office = true;
      log(s, 'Underkeep headquarters is open for business.', 'work');
      break;
    case 1:
    case 2:
      throw new Error('Use the highlighted hiring and excavation buttons one at a time.');
    case 3:
      spend(s, 1000);
      f.stage = 'furnishing';
      f.work = 0;
      f.required = 6;
      log(s, 'Tutorial boost: floor 1 excavated and reinforced.', 'work');
      break;
    case 4:
      spend(s, 1000);
      unlock(s, 'traps', 'mobs', 'treasure');
      layout(s, f);
      f.stage = 'ready';
      s.totals.built++;
      log(s, 'Traps, chests, and monster nests installed.', 'work');
      break;
    case 5:
      throw new Error('Purchase the highlighted rest spot in floor settings.');
    case 6:
      spend(s, 2000);
      s.reserve += 2000;
      unlock(s, 'door', 'finance');
      for (const e of f.encounters) fill(s, e);
      log(
        s,
        `Treasure stocked. Entrance fee: ${s.fee / 100} gold. Reinvestment: ${s.reinvest}%.`,
        'gold',
      );
      break;
    case 7:
      throw new Error('Hire three maintainers with the highlighted button.');
    case 8:
      s.opened = true;
      f.stage = 'open';
      s.actors = s.actors.filter((a) => ['miner', 'maintenance', 'defender'].includes(a.role));
      {
        const first = actor(s, 'fighter');
        if (checkNewArrival(s, first)) s.actors.push(first);
      }
      s.nextArrivalAt = s.now + arrivalInterval(s);
      log(s, 'One fighter has arrived at the town spawn. Invite the rest of their party.');
      break;
    case 9:
      for (const role of ['fighter', 'wizard', 'healer'] as Role[]) {
        const person = actor(s, role);
        if (checkNewArrival(s, person)) s.actors.push(person);
      }
      admit(s);
      unlock(s, 'training');
      s.trainingOffered = true;
      log(
        s,
        'Your free party has assembled and is walking to the entrance. Training is also unlocked.',
      );
      break;
    default:
      throw new Error('Tutorial is already complete.');
  }
  s.tutorial++;
}
export function command(state: GameState, action: Command): GameState {
  const s: GameState = JSON.parse(JSON.stringify(state));
  if (s.gameOver) throw new Error('Headquarters has fallen. Restart the demo to play again.');
  switch (action.type) {
    case 'tutorial':
      tutorial(s);
      break;
    case 'buySpawnPoint':
      if (!s.research.includes('localAds') || s.spawnPoints >= 3)
        throw new Error('Research Local ads; at most two extra spawn points can be bought.');
      spend(s, rule(s, 'cost.spawn') * 100, 'Spawn points');
      s.spawnPoints++;
      s.nextArrivalAt = Math.min(s.nextArrivalAt, s.now + arrivalInterval(s) / s.spawnPoints);
      s.spawnTiers = Array.from({ length: s.spawnPoints }, (_, i) => s.spawnTiers?.[i] ?? 1);
      log(
        s,
        `Adventurer spawn point ${s.spawnPoints} opened. Population cap ${adventurerCap(s)}.`,
        'work',
      );
      break;
    case 'excavationSpell': {
      const f = s.floors.find((f) => f.id === action.floor);
      if (!f || !['queued', 'excavating'].includes(f.stage) || !canExcavate(s, f))
        throw new Error('Queue this floor and furnish the floor above before casting.');
      if (s.excavationSpells <= 0) throw new Error('No free excavation spells remain.');
      s.excavationSpells--;
      f.stage = 'foundation';
      f.work = 0;
      f.required = 6 * f.id;
      log(
        s,
        `Free excavation spell finished digging floor ${f.id}. Foundations and furnishing are next.`,
        'work',
      );
      break;
    }
    case 'excavateNext': {
      if (!s.office || !s.actors.some((a) => a.role === 'miner' && a.health > 0))
        throw new Error('Hire a digger first.');
      if (s.tutorial < 2) throw new Error('Hire three diggers first.');
      const f = nextExcavationFloor(s);
      if (!f)
        throw new Error('All unlocked floors are queued. Research Dungeon depths to unlock more.');
      spend(s, rule(s, 'cost.excavate') * 100, 'Excavation');
      f.stage = 'queued';
      f.work = 0;
      f.required = 1.2 * rule(s, 'digMinutes') * rule(s, 'digGrowth') ** (f.id - 1);
      log(s, `Floor ${f.id} queued for excavation. 5 gold.`, 'work');
      if (s.tutorial === 2 && s.floors.slice(0, 3).every((f) => f.stage !== 'locked'))
        s.tutorial = 3;
      break;
    }
    case 'develop': {
      if (s.tutorial < 9) throw new Error('Finish opening your first floor before expanding.');
      const f = s.floors.find((f) => f.id === action.floor);
      if (!f || f.stage !== 'locked') throw new Error('This floor is already under development.');
      if (!s.floors.some((x) => x.id === f.id - 1 && ['ready', 'open'].includes(x.stage)))
        throw new Error('Finish the floor above first.');
      spend(s, rule(s, 'cost.develop') * 100, 'Development');
      f.stage = 'queued';
      log(s, `Floor ${f.id} queued. Foundation, fixtures, and 3 rest spots included.`, 'work');
      break;
    }
    case 'installFloor': {
      const f = s.floors.find((f) => f.id === action.floor);
      if (
        !f ||
        s.tutorial < 9 ||
        !['ready', 'furnishing'].includes(f.stage) ||
        (f.installation ? f.installation !== 'pending' : f.stage !== 'furnishing')
      )
        throw new Error('This floor is not awaiting installation.');
      spend(s, rule(s, 'cost.install') * 100, 'Fixture installation');
      layout(s, f);
      f.encounters.forEach((e) => {
        e.installed = false;
      });
      f.installation = 'installing';
      installEncounters(s);
      log(
        s,
        `Floor ${f.id}: installation ordered for 5 gold. Each fixture costs one maintainer stamina.`,
        'work',
      );
      break;
    }
    case 'openFloor': {
      const f = s.floors.find((f) => f.id === action.floor);
      if (
        !f ||
        f.stage !== 'ready' ||
        !s.opened ||
        (f.installation && f.installation !== 'complete')
      )
        throw new Error('This floor is not ready to open.');
      if (f.id > 1 && s.floors[f.id - 2]!.stage !== 'open')
        throw new Error('Open the floor above first so adventurers can reach this one.');
      f.stage = 'open';
      log(s, `Floor ${f.id} is now open to adventurers.`, 'work');
      break;
    }
    case 'research': {
      const r = RESEARCH.find((r) => r.id === action.id);
      if (!r || s.researchJob || !researchAvailable(s, r.id) || s.tutorial < 9)
        throw new Error('Research is not available yet.');
      spend(s, rule(s, `research.${r.id}.cost`) * 100, `Research: ${r.name}`);
      s.researchJob = { id: r.id, end: s.now + rule(s, `research.${r.id}.hours`) * HOUR };
      log(s, `Research started: ${r.name}.`, 'work');
      break;
    }
    case 'fee':
      if (
        (!s.research.includes('door') && s.tutorial !== 6) ||
        !Number.isInteger(action.value) ||
        action.value < 0 ||
        action.value > 20
      )
        throw new Error('Entrance fee must be 0–20 gold.');
      s.fee = action.value * 100;
      break;
    case 'reinvest':
      if (
        (!s.research.includes('finance') && s.tutorial !== 6) ||
        !Number.isInteger(action.value) ||
        action.value < 0 ||
        action.value > 100
      )
        throw new Error('Reinvestment must be 0–100%.');
      s.reinvest = action.value;
      break;
    case 'saleRatio':
      if (
        (!s.research.includes('finance') && s.tutorial !== 6) ||
        !Number.isInteger(action.value) ||
        action.value < 0 ||
        action.value > 100
      )
        throw new Error('Sale allocation must be 0–100%.');
      s.saleRatio = action.value;
      break;
    case 'trainingLimit':
      if (!s.office || !Number.isInteger(action.value) || action.value < 0 || action.value > 3)
        throw new Error('Training limit must be 0–3 courses.');
      s.trainingLimit = action.value;
      break;
    case 'trainingPrice':
      if (
        !s.research.includes('training') ||
        !Number.isInteger(action.value) ||
        action.value < 1 ||
        action.value > 20
      )
        throw new Error('Training price must be 1–5 gold.');
      s.trainingPrice = action.value;
      break;
    case 'fund':
      if ((!s.research.includes('finance') && s.tutorial !== 6) || action.amount <= 0)
        throw new Error('Unlock dungeon finances first.');
      spend(s, action.amount, 'Treasure reserve funding');
      s.reserve += action.amount;
      log(s, `${action.amount / 100} gold moved into the treasure reserve.`, 'gold');
      break;
    case 'training':
      if (!s.research.includes('training')) throw new Error('Training is not unlocked.');
      enroll(s);
      break;
    case 'rest': {
      const f = s.floors.find((f) => f.id === action.floor);
      if (
        !f ||
        !['open', 'ready'].includes(f.stage) ||
        (f.restSpots > 0 && s.policy.restCapacity >= 30) ||
        (!s.research.includes('rest') && s.tutorial !== 5)
      )
        throw new Error('A rest spot cannot be added here.');
      spend(s, rule(s, 'cost.rest') * 100, 'Rest rooms');
      const first = f.restSpots === 0;
      if (first) f.restSpots = 1;
      if (s.tutorial === 5) {
        unlock(s, 'rest');
        s.tutorial++;
      }
      if (!first) s.policy.restCapacity = Math.min(30, s.policy.restCapacity + 1);
      for (const room of s.floors) processRest(s, room, false);
      break;
    }
    case 'policy': {
      if (s.tutorial < 4)
        throw new Error('Complete the guided layout before changing floor rules.');
      const p = action.policy;
      if ((p.gold ?? 0) > 0 && !s.research.includes('goldChests'))
        throw new Error('Research Gold chests first.');
      if (s.research.includes('betterTraps') && p.trapAttackBudget < 10 * (p.trapdoors + p.mimics))
        throw new Error('Upgraded trap doors and Mimics II require at least 10 attack cap each.');
      if (
        Object.values(p).some((n) => !Number.isSafeInteger(n) || n < 0) ||
        p.mobSlots > 4 ||
        p.mobLimit > 30 ||
        p.attackBudget > 100 ||
        p.trapAttackBudget > 100 ||
        p.trapDefenseBudget > 100 ||
        p.treasureBudget > 100 ||
        p.restCapacity !== s.policy.restCapacity ||
        p.restCapacity < 1 ||
        p.restCapacity > 30 ||
        p.restFee > 20 ||
        p.floorLevel !== s.policy.floorLevel ||
        p.floorHealth !== s.policy.floorHealth ||
        p.floorDefense !== s.policy.floorDefense ||
        p.floorHealth < 1 ||
        p.floorDefense < 1 ||
        p.floorHealth > p.floorLevel * 20 ||
        p.floorDefense > p.floorLevel * 20
      )
        throw new Error('Invalid encounter limits.');
      if (p.trapdoors + p.arrows + p.mimics + p.wood + p.silver + (p.gold ?? 0) + p.mobSlots > 12)
        throw new Error('Each floor has room for 12 encounters.');

      const changed = Object.keys(p).some(
        (key) =>
          key !== 'mobLimit' &&
          key !== 'restCapacity' &&
          key !== 'restFee' &&
          p[key as keyof typeof p] !== s.policy[key as keyof typeof p],
      );
      s.policy = p;
      if (changed) s.policyRevision++;
      for (const f of s.floors) {
        processRest(s, f, false);
        if (
          changed &&
          (!f.installation || f.installation === 'complete') &&
          ['ready', 'open'].includes(f.stage) &&
          !s.parties.some((x) => x.floor === f.id) &&
          !s.actors.some((a) => a.task?.floor === f.id)
        )
          layout(s, f);
      }
      log(s, 'Floor-group rules saved. Occupied floors update after their parties leave.');
      break;
    }
    case 'artChoices': {
      const allowed = ['coffin', 'puddle', 'zombie', 'fighter', 'wizard', 'healer'];
      for (const [key, value] of Object.entries(action.choices)) {
        if (!allowed.includes(key)) throw new Error('Unknown artwork category.');
        const values = Array.isArray(value) ? value : [value];
        if (
          values.length !== (['coffin', 'puddle'].includes(key) ? 1 : 3) ||
          new Set(values).size !== values.length ||
          values.some((v) => !Number.isInteger(v) || v < 1 || v > 5)
        )
          throw new Error('Choose one spawner design or three distinct character designs.');
      }
      s.artChoices = { ...s.artChoices, ...action.choices };
      s.artSequence = { ...s.artSequence };
      for (const key of Object.keys(action.choices)) delete s.artSequence[key];
      break;
    }
    case 'addFixture': {
      const f = s.floors.find((f) => f.id === action.floor);
      if (!f || !['ready', 'open'].includes(f.stage) || !availableFixtures(s).includes(action.kind))
        throw new Error('This fixture is not unlocked or the floor is not furnished.');
      if (
        !Number.isInteger(action.slot) ||
        action.slot < 0 ||
        action.slot >= 12 ||
        f.encounters.some((e, i) => !e.roaming && (e.slot ?? i) === action.slot)
      )
        throw new Error('Choose an empty item slot.');
      const keys = {
        trapdoor: 'trapdoors',
        arrows: 'arrows',
        mimic: 'mimics',
        wood: 'wood',
        silver: 'silver',
        gold: 'gold',
        zombie: 'mobSlots',
        slime: 'mobSlots',
      } as const;
      const key = keys[action.kind];
      const limit = ['wood', 'silver', 'gold'].includes(key) ? 5 : 4;
      if (s.policy[key] >= limit) throw new Error('This fixture type has reached its floor limit.');
      if (
        s.floors.some(
          (x) =>
            ['ready', 'open'].includes(x.stage) &&
            x.encounters.filter((e) => !e.roaming).length >= 12,
        )
      )
        throw new Error('A shared floor has no free fixture slots.');
      s.groupLayout = f.encounters
        .filter((e) => !e.roaming)
        .map((e, i, list) => ({
          kind: e.kind,
          slot: e.slot ?? i,
          ordinal: list
            .filter((x) => x.kind === e.kind)
            .sort((a, b) => a.id - b.id)
            .findIndex((x) => x.id === e.id),
        }));
      const ordinal = f.encounters.filter((e) => !e.roaming && e.kind === action.kind).length;
      s.groupLayout.push({ kind: action.kind, ordinal, slot: action.slot });
      if (key === 'mobSlots')
        s.policy.zombieNests =
          Math.min(s.policy.mobSlots, s.policy.zombieNests ?? 1) +
          (action.kind === 'zombie' ? 1 : 0);
      s.policy[key]++;
      if (s.research.includes('betterTraps'))
        s.policy.trapAttackBudget = Math.max(
          s.policy.trapAttackBudget,
          10 * (s.policy.trapdoors + s.policy.mimics),
        );
      for (const floor of s.floors.filter((x) => ['ready', 'open'].includes(x.stage))) {
        const e = makeEncounter(s, action.kind);
        e.installed = false;
        e.active = false;
        e.slot = action.slot;
        e.position = floor.encounters.length;
        floor.encounters.push(e);
        applyGroupLayout(s, floor);
        capTrapDamage(s, floor.encounters);
      }
      log(s, 'Fixture added to the shared layout. Maintenance will install it.', 'work');
      break;
    }
    case 'reorder': {
      const f = s.floors.find((f) => f.id === action.floor);
      if (!f || !['ready', 'open'].includes(f.stage))
        throw new Error('Furnish this floor before rearranging it.');
      if (
        action.ids.length !== f.encounters.filter((e) => !e.roaming).length ||
        new Set(action.ids).size !== action.ids.length ||
        action.ids.some((id) => !f.encounters.some((e) => e.id === id && !e.roaming))
      )
        throw new Error('Invalid floor layout.');
      const slots = action.slots ?? action.ids.map((_, i) => i);
      if (
        slots.length !== action.ids.length ||
        new Set(slots).size !== slots.length ||
        slots.some((slot) => !Number.isInteger(slot) || slot < 0 || slot >= 12)
      )
        throw new Error('Invalid item slots.');
      s.groupLayout = action.ids.map((id, i) => {
        const e = f.encounters.find((e) => e.id === id)!;
        const ordinal = f.encounters
          .filter((x) => !x.roaming && x.kind === e.kind)
          .sort((a, b) => a.id - b.id)
          .findIndex((x) => x.id === id);
        return { kind: e.kind, ordinal, slot: slots[i]! };
      });
      for (const floor of s.floors) applyGroupLayout(s, floor);
      log(s, `Dungeon floors now share this layout, including future installations.`, 'work');
      break;
    }
    case 'expandStaffRoom': {
      if (!s.office || staffRoom(s).capacity >= 100)
        throw new Error('Office rest room cannot be expanded.');
      spend(s, 500, 'Staff room capacity');
      s.staffRoom ??= { capacity: 10, queue: [], occupants: [] };
      s.staffRoom.capacity++;
      processStaffRest(s);
      break;
    }
    case 'hireDefender':
      if (!s.office || !s.research.includes('staff'))
        throw new Error('Unlock Staff Management first.');
      if (s.gold < 100) throw new Error('Keep at least 1 gold available for wages.');
      spend(s, rule(s, 'cost.defender') * 100, 'Security hiring');
      s.actors.push({ ...actor(s, 'defender'), securitySpawnedAt: s.now });
      log(
        s,
        'A blue-jacket defender joined. 1 gold per active dungeon hour; rest is unpaid.',
        'work',
      );
      break;
    case 'hireMiner':
      if (!s.office || s.tutorial < 1)
        throw new Error('Hire your first crew through the tutorial.');
      spend(s, rule(s, 'cost.miner') * 100, 'Digger hiring');
      s.actors.push(actor(s, 'miner'));
      if (s.tutorial === 1 && s.actors.filter((a) => a.role === 'miner').length >= 3)
        s.tutorial = 2;
      log(s, 'A digger joined the crew. 10 gold hiring fee.', 'work');
      break;
    case 'hireMaintenance':
      if (!s.research.includes('staff') && s.tutorial !== 7)
        throw new Error('Unlock Staff Management first.');
      spend(s, rule(s, 'cost.maintenance') * 100, 'Maintainer hiring');
      s.actors.push(actor(s, 'maintenance'));
      if (s.tutorial === 7 && s.actors.filter((a) => a.role === 'maintenance').length >= 3) {
        unlock(s, 'staff');
        s.tutorial = 8;
      }
      log(s, 'A maintenance worker joined the crew. 15 gold hiring fee.', 'work');
      break;
    case 'upgradeFloors':
      if (
        !s.research.includes('building') ||
        upgradingFloor(s) ||
        !s.floors.some((f) => ['ready', 'open'].includes(f.stage) && f.level < 2)
      )
        throw new Error('No floor upgrade is available.');
      spend(s, rule(s, 'cost.upgrade') * 100, 'Floor upgrades');
      queueBuildingUpgrade(s);
      break;
    case 'staffRestThreshold':
      if (
        !s.research.includes('staminaManagement') ||
        !Number.isInteger(action.value) ||
        action.value < 0 ||
        action.value > 90
      )
        throw new Error('Research stamina management first. Choose 0–90%.');
      s.staffRestThreshold = action.value;
      break;
    case 'upgradeSpawn':
      if (
        !s.research.includes('level2Adventurers') ||
        action.point < 0 ||
        action.point >= s.spawnPoints ||
        !Number.isInteger(action.point) ||
        (s.spawnTiers?.[action.point] ?? 1) >= 2
      )
        throw new Error('Spawn upgrade is unavailable.');
      spend(s, 2500, 'Level 2 spawn upgrade');
      s.spawnTiers = Array.from({ length: s.spawnPoints }, (_, i) => s.spawnTiers?.[i] ?? 1);
      s.spawnTiers[action.point] = 2;
      break;
    case 'grant':
      if (s.recoveryGrant || s.gold > 0 || s.now - s.quietSince < DAY)
        throw new Error('Recovery grant is not available.');
      s.gold += 2500;
      recordGold(s, 2500, 'Recovery grant');
      s.recoveryGrant = true;
      log(s, 'One-time demo recovery grant: 25 gold.', 'gold');
      break;
  }
  return s;
}
export function tutorialStep(state: GameState): GameState {
  if (state.tutorial === 1) {
    let s = state;
    while (s.tutorial === 1) s = command(s, { type: 'hireMiner' });
    return s;
  }
  if (state.tutorial === 2) {
    let s = state;
    while (s.tutorial === 2) s = command(s, { type: 'excavateNext' });
    return s;
  }
  if (state.tutorial === 5) return command(state, { type: 'rest', floor: 1 });
  if (state.tutorial === 7) {
    let s = state;
    while (s.tutorial === 7) s = command(s, { type: 'hireMaintenance' });
    return s;
  }
  return command(state, { type: 'tutorial' });
}
export function demoState(config: Rules = DEFAULT_RULES): GameState {
  let s = initialState(42691, config);
  while (s.tutorial < 10) s = tutorialStep(s);
  return s;
}
export function diggersInactive(s: GameState) {
  return (
    s.opened &&
    s.actors.some((a) => a.role === 'miner' && a.health > 0) &&
    !upgradingFloor(s) &&
    !s.floors.some((f) => ['queued', 'excavating', 'foundation', 'furnishing'].includes(f.stage))
  );
}
export function excavationEnd(s: GameState, floorId: number, currentPhase = false): number | null {
  const f = s.floors[floorId - 1]!;
  if (
    !(
      currentPhase ? ['queued', 'excavating', 'foundation', 'furnishing'] : ['queued', 'excavating']
    ).includes(f.stage)
  )
    return null;
  const forecast = structuredClone(s);
  const miners = forecast.actors.filter((a) => a.role === 'miner' && a.health > 0);
  if (!miners.length) return null;
  const floors = s.floors.map((f) => ({ ...f }));

  const step = TICK / HOUR,
    speed = s.research.includes('digging') ? 2 : 1;
  for (let now = s.nextTick; now < s.now + 30 * DAY; now += TICK) {
    forecast.now = now;
    forecast.floors = floors;
    processStaffRest(forecast);
    let current = floors.find((f) =>
      ['queued', 'excavating', 'foundation', 'furnishing'].includes(f.stage),
    );
    if (!current) return null;
    if (!upgradingFloor(forecast) && ['queued', 'excavating'].includes(current.stage)) {
      if (current.id > 1 && !['ready', 'open'].includes(floors[current.id - 2]!.stage)) return null;
      current.work +=
        miners.filter((a) => a.status !== 'resting' && a.stamina > 0).length * step * speed;
      if (current.work + 1e-7 >= current.required) {
        if (current.id === floorId) return now;
        current.stage = 'foundation';
        current.work = 0;
        current.required = 6 * current.id;
      }
    }
    const recoverMiners = () => processStaffRest(forecast);
    if (now % HOUR !== 0) {
      recoverMiners();
      continue;
    }
    for (const a of miners) {
      if (a.status === 'resting' || a.stamina <= 0) continue;
      if (workBuildingUpgrade(forecast, a)) continue;
      current = floors.find((f) =>
        ['queued', 'excavating', 'foundation', 'furnishing'].includes(f.stage),
      );
      if (!current) continue;
      if (['queued', 'excavating'].includes(current.stage)) {
        if (now % (4 * HOUR) === 0) spendStamina(a, 1);
        usePrimary(a);
        continue;
      }
      spendStamina(a, 1);
      usePrimary(a);
      current.work +=
        current.stage === 'foundation' && s.research.includes('building') && a.primary < 20
          ? 0.5
          : 1;
      if (current.work >= current.required) {
        if (currentPhase && current.id === floorId && current.stage === f.stage) return now;
        current.work = 0;
        if (current.stage === 'foundation') {
          current.stage = 'furnishing';
          current.required = 6;
        } else {
          current.stage = 'ready';
        }
      }
    }
    recoverMiners();
  }
  return null;
}
export function validateState(s: GameState) {
  if (s.config) validateRules(s.config);
  if (
    s.version !== 1 ||
    !Number.isSafeInteger(s.now) ||
    s.now < 0 ||
    !Number.isSafeInteger(s.gold) ||
    s.gold < 0 ||
    !Number.isSafeInteger(s.reserve) ||
    s.reserve < 0 ||
    s.floors.length < 5 ||
    s.floors.length > 50 ||
    s.floors.length % 5 !== 0 ||
    s.nextTick <= s.now
  )
    throw new Error('Invalid saved dungeon.');
  for (const a of s.actors)
    if (a.stamina < 0 || a.stamina > a.maxStamina || a.health < 0 || a.defense < 0 || a.wealth < 0)
      throw new Error('Invalid character resources.');
  return s;
}
