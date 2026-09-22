import type { GameState } from './types';
export const unlockedTier = (s: Pick<GameState, 'research'>, family: string) => {
  const ids: Record<string, string[]> = {
    floor: ['getDigging', 'building', 'building3', 'building4', 'building5'],
    trap: ['traps', 'betterTraps', 'traps3', 'traps4', 'traps5'],
    mob: ['mobs', 'mobs2', 'mobs3', 'mobs4', 'mobs5'],
    adventurer: ['getDigging', 'level2Adventurers', 'adventurers3', 'adventurers4', 'adventurers5'],
    staff: ['staff', 'staff2', 'staff3', 'staff4', 'staff5'],
    builder: ['getDigging', 'builders2', 'builders3', 'builders4'],
    rest: ['rest', 'rest2', 'rest3', 'rest4'],
  };
  return (ids[family] ?? []).reduce(
    (tier, id, i) => (s.research.includes(id as never) ? i + 1 : tier),
    1,
  );
};
export const roomTier = (s: GameState, staff = false) =>
  Math.min(unlockedTier(s, 'rest'), staff ? 3 : 4);
export const roomInterval = (s: GameState, staff = false) => 3600000 / (roomTier(s, staff) + 1);
export const spawnPointLimit = (s: GameState) =>
  Math.min(
    unlockedTier(s, 'adventurer') + 1,
    s.research.includes('regionalAds') ? 5 : s.research.includes('localAds') ? 3 : 2,
  );
export const fixtureTierLimit = (s: GameState, kind: string) =>
  ['zombie', 'slime'].includes(kind)
    ? unlockedTier(s, 'mob')
    : ['trapdoor', 'arrows', 'mimic'].includes(kind)
      ? unlockedTier(s, 'trap')
      : kind === 'wood'
        ? 1
        : kind === 'silver'
          ? 2
          : s.research.includes('royalChests')
            ? 5
            : s.research.includes('crystalChests')
              ? 4
              : 3;
