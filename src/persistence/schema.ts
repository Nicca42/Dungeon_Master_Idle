import { excavationWork, foundationWork } from '../game/construction';
import { z } from 'zod';
import { GameState } from '../game/types';
import { validateState, blankXp } from '../game/engine';

const number = z.number().finite().nonnegative();
const xp = z.object({
  primary: number,
  damage: number,
  maxHealth: number,
  maxDefense: number,
  maxStamina: number,
  speed: number,
  intelligence: number,
});
const combat = z.object({
  xp,
  defenseDealt: number,
  healthDealt: number,
  defenseTaken: number,
  healthTaken: number,
  deaths: number,
});
const actionCue = z.object({
  kind: z.enum(['lock', 'attack', 'defend', 'heal', 'detect', 'gold']),
  role: z.enum(['fighter', 'wizard', 'healer', 'miner', 'maintenance', 'defender']).optional(),
  tier: number.optional(),
  actor: z.string(),
  actorId: number.optional(),
  difficulty: number,
  power: number,
  success: z.boolean(),
  time: number,
});
const dailyReport = z.object({
  day: number.int().positive(),
  since: number,
  end: number,
  partial: z.boolean(),
  adventurers: number,
  parties: number,
  entryGold: number,
  traps: number,
  treasureGold: number,
  xp: number,
  deaths: number,
  levels: number,
  levelGold: number,
});
const actor = z.object({
  revivalTrained: z.boolean().optional(),
  ghostCreated: z.boolean().optional(),
  spawnedAt: number.optional(),
  id: number,
  name: z.string(),
  role: z.enum(['fighter', 'wizard', 'healer', 'miner', 'maintenance', 'defender']),
  health: number,
  maxHealth: number,
  defense: number,
  maxDefense: number,
  stamina: number,
  maxStamina: number,
  damage: number,
  speed: number,
  intelligence: number,
  primary: number,
  primaryCurrent: number.optional(),
  variant: number.min(1).max(5).optional(),
  combatStats: combat.optional(),
  outfitTier: number.min(1).max(2).optional(),
  outfitSaturation: z.number().min(0.8).max(1.5).optional(),
  wealth: number,
  xp: number,
  learning: number.positive(),
  status: z.enum(['town', 'adventure', 'recovering', 'working', 'resting', 'training', 'dead']),
  until: number,
  trained: z.boolean(),
  restCheckedAt: number.optional(),
  securitySpawnedAt: number.optional(),
  dutyTicks: number.optional(),
  trainingCount: number.int().optional(),
  entryDeadline: number.optional(),
  quietRecoverAt: number.optional(),
  returnUntil: number.optional(),
  workFloor: number.max(50).optional(),
  workPosition: number.optional(),
  bankedXp: xp,
  pendingXp: xp,
  task: z
    .object({
      floor: number,
      encounter: z.number().int().min(-50),
      kind: z.enum(['reset', 'refill', 'repair', 'install', 'replace']),
      arriveAt: number.optional(),
      until: number,
    })
    .nullable(),
});
const research = z.enum([
  'revivalClass',
  'building3',
  'building4',
  'building5',
  'builders2',
  'builders3',
  'builders4',
  'traps3',
  'traps4',
  'traps5',
  'mobs2',
  'mobs3',
  'mobs4',
  'mobs5',
  'staff2',
  'staff3',
  'staff4',
  'staff5',
  'adventurers3',
  'adventurers4',
  'adventurers5',
  'rest2',
  'rest3',
  'rest4',
  'betterTreasure',
  'crystalChests',
  'royalChests',
  'toolbelts',
  'resetKits',
  'containment',
  'containment2',
  'guild3',
  'regionalAds',
  'unpaidOvertime',
  'guildGrant',
  'getDigging',
  'betterTraps',
  'depths',
  'staminaManagement',
  'staffSpeed',
  'level2Adventurers',
  'goldChests',
  'stealth',
  'guild',
  'guild2',
  'traps',
  'mobs',
  'treasure',
  'rest',
  'door',
  'finance',
  'staff',
  'training',
  'digging',
  'building',
  'localAds',
]);
const state = z.object({
  version: z.literal(1),
  rulesVersion: z.literal(2),
  contentRevision: number.optional(),
  groupLayout: z
    .array(
      z.object({
        kind: z.enum(['trapdoor', 'arrows', 'mimic', 'wood', 'silver', 'gold', 'zombie', 'slime']),
        ordinal: number.int(),
        slot: number.int().max(11),
      }),
    )
    .max(12)
    .optional(),
  policyRevision: number,
  complaints: z.array(
    z.object({ id: number, partyId: number, floor: number, time: number, message: z.string() }),
  ),
  seed: number,
  now: number,
  nextTick: number,
  nextId: number,
  tutorial: number.max(10),
  gold: number,
  reserve: number,
  config: z.record(z.string(), z.number().finite()).optional(),
  trapStealth: number.min(5).max(10).optional(),
  staffRestThreshold: number.min(0).max(90).optional(),
  spawnTiers: z.array(number.min(1).max(5)).max(6).optional(),
  configRevision: number.optional(),
  staffRoom: z
    .object({
      capacity: number.int().min(10).max(100),
      queue: z.array(number),
      occupants: z.array(z.object({ actorId: number, recoverAt: number })),
    })
    .optional(),
  ledger: z
    .array(z.object({ hour: number, reason: z.string(), amount: z.number().finite() }))
    .max(4000)
    .optional(),
  ledgerSince: number.optional(),
  dailyReports: z
    .object({ current: dailyReport, reports: z.array(dailyReport).max(90) })
    .optional(),
  fee: number.max(2000),
  reinvest: number.max(100),
  saleRatio: number.max(100),
  trainingPrice: number.min(1).max(5),
  trainingLimit: number.int().max(3).default(3),
  office: z.boolean(),
  officeHealth: number.default(100),
  gameOver: z.boolean().default(false),
  nextArrivalAt: number.default(3600000),
  arrivalSequence: number.int().optional(),
  spawnPoints: number.int().min(1).max(6).default(1),
  excavationSpells: number.int().max(2).default(2),
  escapedMobs: z
    .array(
      z.object({
        variant: number.min(1).max(5).optional(),
        saturation: number.min(0.8).max(1.2).optional(),
        id: number,
        kind: z.enum(['zombie', 'slime']),
        health: number,
        defense: number,
        damage: number,
        position: number,
      }),
    )
    .default([]),
  opened: z.boolean(),
  actors: z.array(actor),
  floors: z
    .array(
      z.object({
        id: number,
        name: z.string(),
        stage: z.enum([
          'locked',
          'queued',
          'excavating',
          'foundation',
          'furnishing',
          'ready',
          'open',
        ]),
        upgradeWork: number.optional(),
        upgradeRequired: number.optional(),
        work: number,
        required: number,
        restSpots: number.max(5),
        visitors: number,
        installation: z.enum(['pending', 'installing', 'complete']).optional(),
        spawnAt: number,
        policyRevision: number,
        health: number,
        defense: number,
        level: number,
        restQueue: z.array(number),
        restOccupants: z.array(z.object({ actorId: number, partyId: number, recoverAt: number })),
        encounters: z.array(
          z.object({
            id: number,
            spawnedAt: number.optional(),
            slot: z.number().int().min(0).max(11).optional(),
            kind: z.enum([
              'trapdoor',
              'arrows',
              'mimic',
              'wood',
              'silver',
              'gold',
              'zombie',
              'slime',
            ]),
            variant: number.min(1).max(5).optional(),
            saturation: number.min(0.8).max(1.2).optional(),
            tier: number.optional(),
            xp: number.int().optional(),
            triggeredParty: number.int().optional(),
            triggeredParties: z.array(number).optional(),
            installed: z.boolean().optional(),
            installProgress: z.number().min(0).max(1).optional(),
            installPaid: z.boolean().optional(),
            destroyed: z.boolean().optional(),
            active: z.boolean(),
            health: number,
            defense: number,
            maxDefense: number,
            damage: number,
            gold: number,
            capacity: number,
            readyAt: number,
            position: z.number().finite().min(-2),
            roaming: z.boolean().default(false),
            revealedUntil: number.optional(),
            patrolDirection: z.union([z.literal(-1), z.literal(1)]).optional(),
          }),
        ),
      }),
    )
    .min(5)
    .max(50),
  parties: z.array(
    z.object({
      id: number,
      members: z.array(number),
      floor: number.min(1).max(50),
      node: number,
      status: z.enum(['arriving', 'moving', 'fighting', 'resting', 'waiting']),
      restUntil: number,
      surfaceUntil: number.default(0),
      visited: z.array(number),
      checkpointed: z.boolean(),
      restJoinedAt: number.nullable(),
      lastRestAdmissionAt: number.nullable(),
      completedEncounters: z.array(number).optional(),
      restedIds: z.array(number),
      restPaidIds: z.array(number).optional(),
      actions: z.array(actionCue),
    }),
  ),
  ghosts: z
    .array(
      z.object({
        actorId: number,
        partyId: number,
        floor: number,
        node: number,
        diedAt: number,
        deadline: number,
        hostile: z.boolean(),
        health: number,
        maxHealth: number,
        defense: number,
        maxDefense: number,
        damage: number,
        primary: number,
        speed: number,
        intelligence: number,
        stamina: number,
        maxStamina: number,
        healerId: number.optional(),
        castAt: number.optional(),
      }),
    )
    .optional(),
  research: z.array(research),
  researchJob: z.object({ id: research, end: number }).nullable(),
  activity: z.array(
    z.object({
      id: number,
      time: number,
      text: z.string(),
      kind: z.enum(['gold', 'work', 'combat', 'info']),
    }),
  ),
  totals: z.object({
    admissions: number,
    income: number,
    loot: number,
    visits: number,
    retreats: number,
    training: number,
    built: number,
  }),
  trainingOffered: z.boolean(),
  trainingDay: number,
  trainingSeats: number,
  recoveryGrant: z.boolean(),
  quietSince: number,
  adventureStats: z
    .object({
      since: number,
      partiesTotal: number,
      totals: combat,
      history: z
        .array(combat.extend({ hour: number, parties: number, adventurers: number }))
        .max(720),
    })
    .optional(),
  artChoices: z
    .object({
      coffin: number.min(1).max(5).optional(),
      puddle: number.min(1).max(5).optional(),
      zombie: z.array(number.min(1).max(5)).length(3).optional(),
      fighter: z.array(number.min(1).max(5)).length(3).optional(),
      wizard: z.array(number.min(1).max(5)).length(3).optional(),
      healer: z.array(number.min(1).max(5)).length(3).optional(),
    })
    .optional(),
  mobScheduleKey: z.string().optional(),
  artSequence: z.record(z.string(), number).optional(),
  policy: z
    .object({
      trapdoors: number,
      arrows: number,
      mimics: number,
      wood: number,
      silver: number,
      gold: number.default(0),
      mobSlots: number,
      mobLimit: number.max(30).optional(),
      zombieNests: number.optional(),
      attackBudget: number,
      trapAttackBudget: number,
      trapDefenseBudget: number,
      treasureBudget: number,
      floorHealth: number,
      floorDefense: number,
      floorLevel: number,
      restCapacity: number,
      restFee: number.max(20).default(0),
    })
    .transform((p) => ({ ...p, mobLimit: p.mobLimit ?? p.mobSlots })),
});
export interface Save {
  state: GameState;
  wall: number;
  pending?: { game: number; wall: number; active?: boolean };
}
export function decode(raw: string): Save {
  const data = JSON.parse(raw);
  // Additive, lossless migration of the original demo; never reset its wallet or clock.
  if (data.state?.version === 1 && data.state.rulesVersion === undefined) {
    const s = data.state;
    s.rulesVersion = 2;
    s.policyRevision = 0;
    s.complaints = [];
    Object.assign(s.policy, {
      trapAttackBudget: 30,
      trapDefenseBudget: 30,
      treasureBudget: 30,
      floorHealth: 10,
      floorDefense: 10,
      floorLevel: 1,
      restCapacity: 10,
    });
    for (const a of s.actors) {
      a.bankedXp = { ...blankXp(), primary: a.xp };
      a.pendingXp = blankXp();
      a.task = null;
    }
    for (const f of s.floors) {
      Object.assign(f, {
        policyRevision: 0,
        health: 10,
        defense: 10,
        level: 1,
        restQueue: [],
        restOccupants: [],
      });
      f.encounters.forEach((e: any, i: number) => (e.position = i));
      f.restSpots = Math.max(1, f.restSpots);
    }
    for (const p of s.parties) {
      Object.assign(p, {
        checkpointed: false,
        restJoinedAt: null,
        lastRestAdmissionAt: null,
        restedIds: [],
        actions: [],
      });
      if (p.status === 'resting') p.status = 'moving';
    }
  }
  if (Array.isArray(data.state?.floors))
    for (const f of data.state.floors)
      if (Array.isArray(f.encounters))
        for (const e of f.encounters) if (e.maxDefense === undefined) e.maxDefense = e.defense;
  const result = z
    .object({
      state,
      wall: number,
      pending: z.object({ game: number, wall: number, active: z.boolean().optional() }).optional(),
    })
    .parse(data);
  // Rebalance ongoing saves without discarding completed construction work.
  for (const floor of result.state.floors) {
    if (['locked', 'queued', 'excavating'].includes(floor.stage))
      floor.required = excavationWork(
        floor.id,
        result.state.config?.digMinutes ?? 10,
        result.state.config?.digGrowth ?? 1.5,
      );
    else if (floor.stage === 'foundation') floor.required = foundationWork(floor.id);
    else continue;
    floor.work = Math.min(floor.work, floor.required);
  }
  validateState(result.state);
  return result;
}
