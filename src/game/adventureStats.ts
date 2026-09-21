import { Actor, GameState, Stat } from './types';
import { HOUR } from './content';
export const skillNames = [
  'primary',
  'damage',
  'maxHealth',
  'maxDefense',
  'maxStamina',
  'speed',
  'intelligence',
] as Stat[];
export const emptyCombat = () => ({
  xp: Object.fromEntries(skillNames.map((k) => [k, 0])) as Record<Stat, number>,
  defenseDealt: 0,
  healthDealt: 0,
  defenseTaken: 0,
  healthTaken: 0,
  deaths: 0,
});
export type CombatStats = ReturnType<typeof emptyCombat>;
export const combatStats = (a: Actor) => (a.combatStats ??= emptyCombat());
export function adventureStats(s: GameState) {
  return (s.adventureStats ??= {
    since: s.now,
    partiesTotal: s.parties.length,
    totals: emptyCombat(),
    history: [],
  });
}
export function observeAdventures(s: GameState) {
  adventureStats(s);
  return s.actors
    .filter((a) => ['fighter', 'wizard', 'healer'].includes(a.role))
    .map((a) => ({
      a,
      before: {
        ...(a.combatStats ?? emptyCombat()),
        xp: { ...(a.combatStats?.xp ?? emptyCombat().xp) },
      },
    }));
}
export function recordAdventures(s: GameState, before: ReturnType<typeof observeAdventures>) {
  const stats = adventureStats(s),
    hour = Math.floor(s.now / HOUR);
  const existing = new Set(before.map((x) => x.a.id));
  const people = [
    ...before,
    ...s.actors
      .filter((a) => !existing.has(a.id) && ['fighter', 'wizard', 'healer'].includes(a.role))
      .map((a) => ({ a, before: emptyCombat() })),
  ];
  let point = stats.history.at(-1);
  if (!point || point.hour !== hour) {
    point = { hour, ...emptyCombat(), parties: 0, adventurers: 0 };
    stats.history.push(point);
  }
  for (const { a, before: previous } of people) {
    const current = a.combatStats ?? emptyCombat();
    for (const skill of skillNames) {
      const gain = current.xp[skill] - previous.xp[skill];
      stats.totals.xp[skill] += gain;
      point.xp[skill] += gain;
    }
    for (const key of [
      'defenseDealt',
      'healthDealt',
      'defenseTaken',
      'healthTaken',
      'deaths',
    ] as const) {
      const gain = current[key] - previous[key];
      stats.totals[key] += gain;
      point[key] += gain;
    }
  }
  const inside = s.parties.filter((p) => p.status !== 'arriving');
  point.parties = inside.length;
  point.adventurers = inside.reduce(
    (n, p) =>
      n + p.members.filter((id) => s.actors.some((a) => a.id === id && a.health > 0)).length,
    0,
  );
  stats.history = stats.history.slice(-720);
}
