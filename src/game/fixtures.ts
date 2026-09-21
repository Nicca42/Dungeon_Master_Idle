import { Encounter, GameState } from './types';
export function availableFixtures(s: GameState): Encounter['kind'][] {
  return [
    ...(s.research.includes('traps') ? (['trapdoor', 'arrows', 'mimic'] as const) : []),
    ...(s.research.includes('mobs') ? (['zombie', 'slime'] as const) : []),
    ...(s.research.includes('treasure') ? (['wood', 'silver'] as const) : []),
    ...(s.research.includes('goldChests') ? (['gold'] as const) : []),
  ];
}
export function fixtureName(s: GameState, kind: Encounter['kind']) {
  return kind === 'mimic' && s.research.includes('betterTraps')
    ? 'Mimics II'
    : kind === 'trapdoor'
      ? 'Trap door'
      : kind === 'arrows'
        ? 'Arrow wall'
        : ['zombie', 'slime'].includes(kind)
          ? `${kind} spawner`
          : kind;
}
