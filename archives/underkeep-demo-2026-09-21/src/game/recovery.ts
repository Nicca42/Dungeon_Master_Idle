import { Actor } from './types';
import { HOUR } from './content';
export const ROOM_RECOVERY_INTERVAL = HOUR / 2;

// Permanent primary rating determines levels; the separate pool is spent on actions.
export const primaryAvailable = (a: Actor) =>
  Math.max(0, Math.min(a.primary, a.primaryCurrent ?? a.primary));
export const fullyRecovered = (a: Actor) =>
  a.health >= a.maxHealth &&
  a.defense >= a.maxDefense &&
  a.stamina >= a.maxStamina &&
  primaryAvailable(a) >= a.primary;
export const recoveryHours = (a: Actor) =>
  Math.max(
    a.maxHealth - a.health,
    a.maxDefense - a.defense,
    a.maxStamina - a.stamina,
    a.primary - primaryAvailable(a),
  );
export function replenish(a: Actor) {
  if (a.health <= 0 || a.status === 'dead') return;
  a.health = Math.min(a.maxHealth, a.health + 1);
  a.defense = Math.min(a.maxDefense, a.defense + 1);
  a.stamina = Math.min(a.maxStamina, a.stamina + 1);
  a.primaryCurrent = Math.min(a.primary, primaryAvailable(a) + 1);
}
