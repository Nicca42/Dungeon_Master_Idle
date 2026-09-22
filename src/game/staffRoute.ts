import { EXIT_CENTER, ENTRY_CENTER } from './layout';
export type StaffPoint = { floor: number; x: number };
export function staffRoute(from: StaffPoint, to: StaffPoint, unfinished = false): StaffPoint[] {
  if (from.floor === to.floor) return [from, to];
  if (unfinished && from.floor === to.floor - 1 && from.floor > 0)
    return [from, { floor: from.floor, x: ENTRY_CENTER }, { floor: to.floor, x: EXIT_CENTER }, to];
  const path: StaffPoint[] = [from];
  if (from.floor > 0) path.push({ floor: from.floor, x: EXIT_CENTER });
  path.push({ floor: 0, x: from.floor === 0 ? from.x : 90 });
  if (to.floor === 0) return [...path, to];
  path.push({ floor: 0, x: 90 });
  if (unfinished && to.floor > 1) {
    path.push({ floor: to.floor - 1, x: EXIT_CENTER });
    path.push({ floor: to.floor - 1, x: ENTRY_CENTER });
  }
  path.push({ floor: to.floor, x: EXIT_CENTER });
  path.push(to);
  return path;
}
/** Discrete cave transitions; never interpolate vertically through solid earth. */
export function staffRoutePose(path: StaffPoint[], progress: number) {
  const weights = path
    .slice(1)
    .map((p, i) => (p.floor !== path[i].floor ? 35 : Math.max(1, Math.abs(p.x - path[i].x))));
  let distance = Math.max(0, Math.min(1, progress)) * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) {
    if (distance <= weights[i]) {
      const from = path[i],
        to = path[i + 1];
      return {
        floor: from.floor,
        x: from.x + ((to.x - from.x) * distance) / weights[i],
        hidden: from.floor !== to.floor,
        facing: to.x < from.x ? -1 : 1,
      };
    }
    distance -= weights[i];
  }
  return { ...path[path.length - 1], hidden: false, facing: 1 };
}
