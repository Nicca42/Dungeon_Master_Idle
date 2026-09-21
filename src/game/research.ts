import { GameState, ResearchId, Floor } from './types';
export const RESEARCH_CATEGORIES = [
  'Traps',
  'Dungeon depths',
  'Finance',
  'Staff investment',
  'Adventurer attractions',
  'Treasure',
] as const;
export const CATEGORY_IDS: Record<string, ResearchId[]> = {
  Traps: ['traps', 'stealth', 'betterTraps', 'mobs'],
  'Dungeon depths': ['getDigging', 'building', 'depths', 'rest'],
  Finance: ['door', 'finance'],
  'Staff investment': ['staff', 'digging', 'building', 'staminaManagement', 'staffSpeed'],
  'Adventurer attractions': ['training', 'guild', 'localAds', 'level2Adventurers'],
  Treasure: ['treasure', 'goldChests'],
};
export const PREREQUISITES: Partial<Record<ResearchId, ResearchId[]>> = {
  betterTraps: ['traps'],
  stealth: ['traps'],
  building: ['getDigging'],
  depths: ['getDigging'],
  staminaManagement: ['staff'],
  staffSpeed: ['staff'],
  level2Adventurers: ['localAds'],
  goldChests: ['treasure'],
};
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
    if (['ready', 'open'].includes(f.stage) && f.level < 2) {
      f.upgradeWork ??= 0;
      f.upgradeRequired = 6;
    }
}
export const upgradingFloor = (s: GameState) =>
  s.floors.filter((f) => f.upgradeWork !== undefined && f.level < 2).sort((a, b) => b.id - a.id)[0];
export function newFloor(id: number): Floor {
  return {
    id,
    name: `The ${['Mossy', 'Forgotten', 'Echoing', 'Sunken', 'Obsidian'][(id - 1) % 5]} Depths`,
    stage: 'locked',
    work: 0,
    required: 12 * 1.5 ** (id - 1),
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
