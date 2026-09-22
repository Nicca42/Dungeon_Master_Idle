import type { Rules } from './config';
/** Only replace known previous defaults; preserve explicit non-default tuning. */
export function migrateContentDefaults(input: Rules): Rules {
  const next = { ...input };
  for (const [key, before, after] of [
    ['cost.miner', 10, 5],
    ['research.traps.hours', 1, 5 / 60],
    ['research.staff.hours', 1, 5 / 60],
    ['research.rest.hours', 1, 10 / 60],
    ['research.building.hours', 4, 2],
  ] as const)
    if (next[key] === before) next[key] = after;
  return next;
}
