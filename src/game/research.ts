import { floorGroupIndex, excavationWork, foundationWork } from './construction';
import { unlockedTier } from './progression';
import { GameState, ResearchId, Floor } from './types';
export const RESEARCH_CATEGORIES = [
  'Training',
  'Traps',
  'Dungeon depths',
  'Finance',
  'Staff investment',
  'Adventurer attractions',
  'Treasure',
  'Builders',
  'Mobs',
  'Rest and hospitality',
] as const;
export const CATEGORY_IDS: Record<string, ResearchId[]> = {
  Training: ['revivalClass'],
  Traps: ['traps', 'betterTraps', 'traps3', 'traps4', 'traps5', 'stealth'],
  'Dungeon depths': ['getDigging', 'building', 'building3', 'building4', 'building5', 'depths'],
  Finance: ['door', 'finance', 'unpaidOvertime', 'guildGrant'],
  'Staff investment': [
    'staff',
    'staff2',
    'staff3',
    'staff4',
    'staff5',
    'staminaManagement',
    'staffSpeed',
    'toolbelts',
    'resetKits',
  ],
  'Adventurer attractions': [
    'training',
    'guild',
    'guild2',
    'guild3',
    'localAds',
    'regionalAds',
    'level2Adventurers',
    'adventurers3',
    'adventurers4',
    'adventurers5',
  ],
  Treasure: ['treasure', 'betterTreasure', 'goldChests', 'crystalChests', 'royalChests'],
  Builders: ['digging', 'builders2', 'builders3', 'builders4'],
  Mobs: ['mobs', 'mobs2', 'mobs3', 'mobs4', 'mobs5', 'containment', 'containment2'],
  'Rest and hospitality': ['rest', 'rest2', 'rest3', 'rest4'],
};
export const PREREQUISITES: Partial<Record<ResearchId, ResearchId[]>> = {
  guild2: ['guild'],
  guild3: ['guild2'],
  regionalAds: ['localAds'],
  toolbelts: ['staff'],
  resetKits: ['toolbelts'],
  containment: ['mobs'],
  containment2: ['containment'],
  betterTreasure: ['treasure'],
  crystalChests: ['goldChests'],
  royalChests: ['crystalChests'],
  unpaidOvertime: ['staff'],
  guildGrant: ['unpaidOvertime'],
  betterTraps: ['traps'],
  stealth: ['traps'],
  building: ['getDigging'],
  depths: ['getDigging'],
  staminaManagement: ['staff'],
  staffSpeed: ['staff'],
  level2Adventurers: ['localAds'],
  goldChests: ['treasure'],
};
for (const chain of [
  ['building', 'building3', 'building4', 'building5'],
  ['digging', 'builders2', 'builders3', 'builders4'],
  ['betterTraps', 'traps3', 'traps4', 'traps5'],
  ['mobs', 'mobs2', 'mobs3', 'mobs4', 'mobs5'],
  ['staff', 'staff2', 'staff3', 'staff4', 'staff5'],
  ['level2Adventurers', 'adventurers3', 'adventurers4', 'adventurers5'],
  ['rest', 'rest2', 'rest3', 'rest4'],
] as ResearchId[][])
  for (let i = 1; i < chain.length; i++) PREREQUISITES[chain[i]] = [chain[i - 1]];
export const researchDone = (s: GameState, id: ResearchId) =>
  id === 'getDigging' ||
  (id === 'depths'
    ? s.floors.length >= 50
    : id === 'stealth'
      ? (s.trapStealth ?? 5) >= 10
      : s.research.includes(id));
export const researchAvailable = (s: GameState, id: ResearchId) =>
  !researchDone(s, id) &&
  (PREREQUISITES[id] ?? []).every((k) => k === 'getDigging' || s.research.includes(k));
export function queueBuildingUpgrade(s: GameState) {
  for (const f of s.floors)
    if (['furnishing', 'ready', 'open'].includes(f.stage) && f.level < unlockedTier(s, 'floor')) {
      f.upgradeWork ??= 0;
      f.upgradeRequired = 6;
    }
}
export const upgradingFloor = (s: GameState) =>
  s.floors
    .filter((f) => f.upgradeWork !== undefined && f.level < unlockedTier(s, 'floor'))
    .sort((a, b) => b.id - a.id)[0];
export function newFloor(id: number): Floor {
  return {
    id,
    name: `The ${['Mossy', 'Forgotten', 'Echoing', 'Sunken', 'Obsidian'][(id - 1) % 5]} Depths`,
    stage: 'locked',
    work: 0,
    required: excavationWork(id),
    restSpots: 0,
    encounters: [],
    visitors: 0,
    spawnAt: 0,
    policyRevision: 0,
    health: 10,
    defense: 10,
    level: 1,
    restQueue: [],
    restOccupants: [],
  };
}
