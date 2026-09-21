import { GameState, ArtChoices } from './types';
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
