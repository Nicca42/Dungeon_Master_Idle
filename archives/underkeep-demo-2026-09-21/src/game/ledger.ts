import type { GameState } from './types';
import { HOUR } from './content';
export type GoldEntry = { hour: number; reason: string; amount: number };
// Aggregate per reason/hour; no per-tick transaction objects or unbounded save growth.
export function recordGold(s: GameState, amount: number, reason: string) {
  if (!amount) return;
  s.ledger ??= [];
  s.ledgerSince ??= s.now;
  const hour = Math.floor(s.now / HOUR) * HOUR;
  const entry = s.ledger.findLast((e) => e.hour === hour && e.reason === reason);
  if (entry) entry.amount += amount;
  else s.ledger.push({ hour, reason, amount });
  if (s.ledger.length > 4000) {
    s.ledger.splice(0, s.ledger.length - 4000);
    s.ledgerSince = s.ledger[0]!.hour;
  }
}
