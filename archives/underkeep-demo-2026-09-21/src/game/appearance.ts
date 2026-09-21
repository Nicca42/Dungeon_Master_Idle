import { GameState, ArtChoices } from './types';
// Selected art direction, shared by new games and saves without custom choices.
export const DEFAULT_ART_CHOICES: ArtChoices = {
  coffin: 4,
  puddle: 1,
  zombie: [1, 3, 5],
  fighter: [1, 3, 4],
  wizard: [2, 1, 3],
  healer: [1, 3, 4],
};
export function defaultArtChoices(): ArtChoices {
  return JSON.parse(JSON.stringify(DEFAULT_ART_CHOICES));
}
export function nextLook(s: GameState, kind: string, commit = true) {
  const sequence = s.artSequence?.[kind] ?? 0;
  const choices = s.artChoices?.[kind as keyof ArtChoices];
  const result = {
    variant: Array.isArray(choices) ? choices[sequence % choices.length] : undefined,
    saturation: (80 + (((Math.imul(sequence + 1, 2654435761) ^ s.seed) >>> 0) % 41)) / 100,
  };
  if (commit) {
    s.artSequence ??= {};
    s.artSequence[kind] = sequence + 1;
  }
  return result;
}
