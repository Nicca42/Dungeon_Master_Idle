/** Construction difficulty advances once per five-floor group. */
export const floorGroupIndex = (floor: number) => Math.floor((Math.max(1, floor) - 1) / 5);
export const excavationWork = (floor: number, minutes = 10, growth = 1.5) =>
  1.2 * minutes * growth ** floorGroupIndex(floor);
export const foundationWork = (floor: number) => 6 * (floorGroupIndex(floor) + 1);
