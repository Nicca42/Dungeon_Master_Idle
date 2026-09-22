import catalog from '../../docs/planning/entity-stats.v1.json';
import type { Encounter } from './types';
export function fixtureStats(kind: Encounter['kind'], tier: number): Record<string, number> {
  const family: Record<string, any> = {
    trapdoor: catalog.traps.trapdoors,
    arrows: catalog.traps.arrowWalls,
    mimic: catalog.traps.mimics,
    zombie: catalog.mobs.zombies,
    slime: catalog.mobs.slimes,
    wood: catalog.treasure.chests,
    silver: catalog.treasure.chests,
    gold: catalog.treasure.chests,
  };
  return family[kind]?.[`level_${Math.min(5, Math.max(1, tier))}`] ?? {};
}
