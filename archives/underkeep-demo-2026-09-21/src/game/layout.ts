import { Floor } from './types';
export const ITEM_SLOTS = 12;
// Three equal sections, five cells each. Route runs from left to right.
export const CELL_WIDTH = 640 / 15;
export const DOOR_GAP = 0;
export const FLOOR_ROWS = {
  actors: 58,
  stats: 40,
  info: 0,
  canvasHeight: 118,
  headerHeight: 28,
  height: 146,
} as const;
export const cellCenter = (cell: number) => (cell + 0.5) * CELL_WIDTH;
export const EXIT_CENTER = cellCenter(0);
export const REST_CENTER = cellCenter(13);
export const ENTRY_CENTER = cellCenter(14);
export const slotX = (slot: number) => cellCenter(slot + 1) - 15;
export function encounterX(f: Floor, node: number): number {
  const i = Math.floor(node),
    fraction = node - i;
  const at = (index: number) =>
    index < 0
      ? EXIT_CENTER - 15
      : index >= f.encounters.length
        ? REST_CENTER - 15
        : slotX(f.encounters[index]!.slot ?? index);
  return at(i) + (at(i + 1) - at(i)) * fraction;
}

export function nodeAtX(f: Floor, x: number): number {
  for (let node = -1; node < f.encounters.length; node++) {
    const left = encounterX(f, node),
      right = encounterX(f, node + 1);
    if (x <= right) return node + Math.max(0, Math.min(1, (x - left) / Math.max(1, right - left)));
  }
  return f.encounters.length;
}
