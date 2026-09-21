import type { CombatStats } from './adventureStats';
export type Stat =
  'primary' | 'damage' | 'maxHealth' | 'maxDefense' | 'maxStamina' | 'speed' | 'intelligence';
export type Xp = Record<Stat, number>;
export interface ActionCue {
  kind: 'lock' | 'attack' | 'defend' | 'heal' | 'detect';
  actor: string;
  difficulty: number;
  power: number;
  success: boolean;
  time: number;
}
export type Role = 'fighter' | 'wizard' | 'healer' | 'miner' | 'maintenance' | 'defender';
export type Stage =
  'locked' | 'queued' | 'excavating' | 'foundation' | 'furnishing' | 'ready' | 'open';
export interface Actor {
  combatStats?: CombatStats;
  variant?: number;
  id: number;
  name: string;
  role: Role;
  health: number;
  maxHealth: number;
  defense: number;
  maxDefense: number;
  stamina: number;
  maxStamina: number;
  damage: number;
  speed: number;
  intelligence: number;
  primary: number;
  primaryCurrent?: number;
  outfitSaturation?: number;
  outfitTier?: number;
  wealth: number;
  xp: number;
  learning: number;
  status: 'town' | 'adventure' | 'recovering' | 'working' | 'resting' | 'training' | 'dead';
  until: number;
  trained: boolean;
  restCheckedAt?: number;
  securitySpawnedAt?: number;
  dutyTicks?: number;
  trainingCount?: number;
  quietRecoverAt?: number;
  returnUntil?: number;
  workFloor?: number;
  workPosition?: number;
  bankedXp: Xp;
  pendingXp: Xp;
  task: {
    floor: number;
    encounter: number;
    kind: 'reset' | 'refill' | 'repair' | 'install' | 'replace';
    arriveAt?: number;
    until: number;
  } | null;
}
export interface Encounter {
  variant?: number;
  saturation?: number;
  destroyed?: boolean;
  tier?: number;
  xp?: number;
  triggeredParty?: number;
  triggeredParties?: number[];
  installed?: boolean;
  slot?: number;
  patrolDirection?: -1 | 1;
  revealedUntil?: number;
  roaming: boolean;
  id: number;
  kind: 'trapdoor' | 'arrows' | 'mimic' | 'wood' | 'silver' | 'gold' | 'zombie' | 'slime';
  active: boolean;
  health: number;
  defense: number;
  maxDefense: number;
  damage: number;
  gold: number;
  capacity: number;
  readyAt: number;
  position: number;
}
export interface Floor {
  upgradeWork?: number;
  upgradeRequired?: number;
  installation?: 'pending' | 'installing' | 'complete';
  id: number;
  name: string;
  stage: Stage;
  work: number;
  required: number;
  restSpots: number;
  encounters: Encounter[];
  visitors: number;
  spawnAt: number;
  policyRevision: number;
  health: number;
  defense: number;
  level: number;
  restQueue: number[];
  restOccupants: { actorId: number; partyId: number; recoverAt: number }[];
}
export interface Party {
  completedEncounters?: number[];
  id: number;
  members: number[];
  floor: number;
  node: number;
  status: 'arriving' | 'moving' | 'fighting' | 'resting' | 'waiting';
  surfaceUntil: number;
  restUntil: number;
  visited: number[];
  checkpointed: boolean;
  restJoinedAt: number | null;
  lastRestAdmissionAt: number | null;
  restedIds: number[];
  restPaidIds?: number[];
  actions: ActionCue[];
}
export interface Activity {
  id: number;
  time: number;
  text: string;
  kind: 'gold' | 'work' | 'combat' | 'info';
}
export interface Totals {
  admissions: number;
  income: number;
  loot: number;
  visits: number;
  retreats: number;
  training: number;
  built: number;
}
export type ResearchId =
  | 'traps'
  | 'mobs'
  | 'treasure'
  | 'rest'
  | 'door'
  | 'finance'
  | 'staff'
  | 'training'
  | 'digging'
  | 'building'
  | 'localAds'
  | 'getDigging'
  | 'betterTraps'
  | 'depths'
  | 'staminaManagement'
  | 'staffSpeed'
  | 'level2Adventurers'
  | 'goldChests'
  | 'stealth'
  | 'guild';
export interface Research {
  id: ResearchId;
  name: string;
  description: string;
  cost: number;
  hours: number;
  icon: string;
}
export type ArtChoices = {
  coffin?: number;
  puddle?: number;
  zombie?: number[];
  fighter?: number[];
  wizard?: number[];
  healer?: number[];
};
export interface GameState {
  mobScheduleKey?: string;
  adventureStats?: {
    since: number;
    partiesTotal: number;
    totals: CombatStats;
    history: (CombatStats & { hour: number; parties: number; adventurers: number })[];
  };
  artChoices?: ArtChoices;
  artSequence?: Record<string, number>;
  trapStealth?: number;
  staffRestThreshold?: number;
  spawnTiers?: number[];
  staffRoom?: {
    capacity: number;
    queue: number[];
    occupants: { actorId: number; recoverAt: number }[];
  };
  config?: Record<string, number>;
  configRevision?: number;
  ledger?: { hour: number; reason: string; amount: number }[];
  ledgerSince?: number;
  version: 1;
  rulesVersion: 2;
  groupLayout?: { kind: Encounter['kind']; ordinal: number; slot: number }[];
  policyRevision: number;
  complaints: { id: number; partyId: number; floor: number; time: number; message: string }[];
  seed: number;
  now: number;
  nextTick: number;
  nextId: number;
  tutorial: number;
  gold: number;
  reserve: number;
  fee: number;
  reinvest: number;
  saleRatio: number;
  trainingPrice: number;
  trainingLimit: number;
  office: boolean;
  officeHealth: number;
  gameOver: boolean;
  arrivalSequence?: number;
  nextArrivalAt: number;
  spawnPoints: number;
  excavationSpells: number;
  escapedMobs: {
    variant?: number;
    saturation?: number;
    id: number;
    kind: 'zombie' | 'slime';
    health: number;
    defense: number;
    damage: number;
    position: number;
  }[];
  opened: boolean;
  actors: Actor[];
  floors: Floor[];
  parties: Party[];
  research: ResearchId[];
  researchJob: { id: ResearchId; end: number } | null;
  activity: Activity[];
  totals: Totals;
  trainingOffered: boolean;
  trainingDay: number;
  trainingSeats: number;
  recoveryGrant: boolean;
  quietSince: number;
  policy: {
    trapdoors: number;
    arrows: number;
    mimics: number;
    wood: number;
    silver: number;
    gold: number;
    mobSlots: number;
    mobLimit: number;
    zombieNests?: number;
    attackBudget: number;
    trapAttackBudget: number;
    trapDefenseBudget: number;
    treasureBudget: number;
    floorHealth: number;
    floorDefense: number;
    floorLevel: number;
    restCapacity: number;
    restFee: number;
  };
}
export type Command =
  | { type: 'artChoices'; choices: ArtChoices }
  | { type: 'addFixture'; floor: number; slot: number; kind: Encounter['kind'] }
  | { type: 'tutorial' }
  | { type: 'develop'; floor: number }
  | { type: 'excavateNext' }
  | { type: 'excavationSpell'; floor: number }
  | { type: 'buySpawnPoint' }
  | { type: 'installFloor'; floor: number }
  | { type: 'openFloor'; floor: number }
  | { type: 'research'; id: ResearchId }
  | { type: 'fee'; value: number }
  | { type: 'reinvest'; value: number }
  | { type: 'trainingPrice'; value: number }
  | { type: 'trainingLimit'; value: number }
  | { type: 'saleRatio'; value: number }
  | { type: 'fund'; amount: number }
  | { type: 'policy'; policy: GameState['policy'] }
  | { type: 'training' }
  | { type: 'rest'; floor: number }
  | { type: 'grant' }
  | { type: 'upgradeFloors' }
  | { type: 'upgradeSpawn'; point: number }
  | { type: 'staffRestThreshold'; value: number }
  | { type: 'expandStaffRoom' }
  | { type: 'hireMaintenance' }
  | { type: 'hireMiner' }
  | { type: 'hireDefender' }
  | { type: 'reorder'; floor: number; ids: number[]; slots?: number[] };
