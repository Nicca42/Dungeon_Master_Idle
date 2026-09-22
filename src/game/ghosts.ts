import { dailyEvent } from './dailyReports';
import type { Actor, GameState, Party } from './types';
import { MINUTE } from './content';
import { recordGold } from './ledger';

export const REVIVAL_WINDOW = 5 * MINUTE;
export const revivalCost = (a: Actor) => Math.ceil((a.maxStamina * 2) / 3);
export const revivalCastTime = (a: Actor) => Math.ceil((MINUTE * 10) / Math.max(1, a.speed));
export interface Ghost {
  actorId: number;
  partyId: number;
  floor: number;
  node: number;
  diedAt: number;
  deadline: number;
  hostile: boolean;
  health: number;
  maxHealth: number;
  defense: number;
  maxDefense: number;
  damage: number;
  primary: number;
  speed: number;
  intelligence: number;
  stamina: number;
  maxStamina: number;
  healerId?: number;
  castAt?: number;
}
export function teachRevival(s: GameState) {
  if (!s.research.includes('revivalClass')) return;
  for (const a of s.actors) {
    if (a.role !== 'healer' || a.revivalTrained || a.status !== 'town' || a.wealth < 1000) continue;
    a.wealth -= 1000;
    a.revivalTrained = true;
    s.gold += 1000;
    s.totals.income += 1000;
    recordGold(s, 1000, 'Revival course');
  }
}
export function captureGhosts(s: GameState, p: Party) {
  s.ghosts ??= [];
  for (const a of s.actors.filter((a) => p.members.includes(a.id) && a.health <= 0)) {
    if (a.ghostCreated) continue;
    a.ghostCreated = true;
    a.status = 'dead';
    s.ghosts.push({
      actorId: a.id,
      partyId: p.id,
      floor: p.floor,
      node: p.node,
      diedAt: s.now,
      deadline: s.now + REVIVAL_WINDOW,
      hostile: false,
      health: a.maxHealth / 2,
      maxHealth: a.maxHealth / 2,
      defense: a.maxDefense / 2,
      maxDefense: a.maxDefense / 2,
      damage: a.damage / 2,
      primary: a.primary / 2,
      speed: a.speed / 2,
      intelligence: a.intelligence / 2,
      stamina: a.maxStamina / 2,
      maxStamina: a.maxStamina / 2,
    });
  }
  scheduleRevival(s, p, s.now);
}
function scheduleRevival(s: GameState, p: Party, at: number) {
  for (const ghost of (s.ghosts ?? []).filter(
    (g) => g.partyId === p.id && !g.hostile && g.castAt === undefined,
  )) {
    const healer = s.actors.find(
      (a) =>
        p.members.includes(a.id) &&
        a.role === 'healer' &&
        a.health > 0 &&
        a.revivalTrained &&
        a.stamina >= revivalCost(a) &&
        !(s.ghosts ?? []).some((g) => g.healerId === a.id && g.castAt !== undefined),
    );
    if (!healer || at + revivalCastTime(healer) > ghost.deadline) continue;
    ghost.healerId = healer.id;
    ghost.castAt = at + revivalCastTime(healer);
  }
}
// Resolve exact deadlines even between five-minute simulation ticks and during offline catch-up.
export function settleGhosts(
  s: GameState,
  until: number,
  learn: (a: Actor, stat: 'primary' | 'maxStamina') => void,
) {
  for (;;) {
    const next = (s.ghosts ?? [])
      .filter((g) => !g.hostile && Math.min(g.castAt ?? Infinity, g.deadline) <= until)
      .sort(
        (a, b) =>
          Math.min(a.castAt ?? Infinity, a.deadline) - Math.min(b.castAt ?? Infinity, b.deadline),
      )[0];
    if (!next) break;
    const at = Math.min(next.castAt ?? Infinity, next.deadline);
    const healer = s.actors.find((a) => a.id === next.healerId);
    const member = s.actors.find((a) => a.id === next.actorId);
    const party = s.parties.find((p) => p.id === next.partyId);
    if (
      next.castAt === at &&
      healer &&
      healer.health > 0 &&
      member &&
      party &&
      healer.stamina >= revivalCost(healer)
    ) {
      healer.stamina -= revivalCost(healer);
      learn(healer, 'maxStamina');
      learn(healer, 'primary');
      dailyEvent(s, { xp: 2 }, at);
      member.health = member.maxHealth / 2;
      member.defense = 0;
      member.status = 'adventure';
      member.ghostCreated = false;
      party.actions.push({
        kind: 'heal',
        actor: healer.name,
        actorId: healer.id,
        role: healer.role,
        tier: healer.outfitTier,
        power: member.health,
        difficulty: 0,
        success: true,
        time: at,
      });
      s.ghosts = s.ghosts!.filter((g) => g !== next);
      scheduleRevival(s, party, at);
    } else {
      delete next.castAt;
      delete next.healerId;
      if (at >= next.deadline) next.hostile = true;
    }
  }
}
