import test from 'node:test';
import assert from 'node:assert/strict';
import { demoState, advanceTo, guildPartyForecast } from '../src/game/engine';
import { DEFAULT_RULES } from '../src/game/config';
import { HOUR } from '../src/game/content';

function fixture() {
  const s = demoState();
  s.research.push('guild');
  s.parties = [];
  const templates = s.actors.filter((a) => ['fighter', 'wizard', 'healer'].includes(a.role));
  s.actors = ['fighter', 'fighter', 'wizard', 'healer', 'fighter', 'wizard'].map((role) => ({
    ...structuredClone(templates.find((a) => a.role === role)!),
    id: s.nextId++,
    status: 'town' as const,
    wealth: 2000,
  }));
  s.floors.forEach((f) => {
    f.encounters = [];
    f.restQueue = [];
    f.restOccupants = [];
  });
  s.config = { ...DEFAULT_RULES, populationCap: 6 };
  s.nextArrivalAt = 20 * HOUR;
  return s;
}

test('full character capacity never blocks forming an existing team before the next spawn', () => {
  const s = fixture();
  assert.equal(guildPartyForecast(s).remaining, s.nextTick - s.now);
  const next = advanceTo(s, s.nextTick);
  assert.equal(next.actors.length, s.actors.length);
  assert.equal(next.nextArrivalAt, s.nextArrivalAt);
  assert.equal(next.parties.length, 1);
  assert.ok(next.parties[0]!.members.length >= 4);
});

test('a blocked spawn still permits a waiting party to form, including above population cap', () => {
  const s = fixture();
  s.actors.push({ ...structuredClone(s.actors[0]!), id: s.nextId++ });
  s.nextArrivalAt = s.nextTick;
  const next = advanceTo(s, s.nextTick);
  assert.equal(next.actors.length, s.actors.length);
  assert.equal(next.parties.length, 1);
});

test('a recovering missing member can complete a team without waiting for a spawn', () => {
  const s = fixture();
  const healer = s.actors.find((a) => a.role === 'healer')!;
  healer.status = 'recovering';
  healer.until = s.nextTick;
  const next = advanceTo(s, s.nextTick);
  assert.equal(next.parties.length, 1);
  assert.ok(next.parties[0]!.members.includes(healer.id));
  assert.equal(next.actors.length, s.actors.length);
});

test('guild drains a 59-character backlog into 14 teams without consuming scarce roles as extras', () => {
  const s = fixture();
  const templates = s.actors;
  s.actors = Array.from({ length: 59 }, (_, i) => {
    const role = i < 30 ? 'fighter' : i < 45 ? 'wizard' : 'healer';
    return { ...structuredClone(templates.find((a) => a.role === role)!), id: s.nextId++ };
  });
  const next = advanceTo(s, s.nextTick);
  assert.equal(next.actors.length, 59);
  assert.equal(next.parties.length, 14);
  assert.ok(next.parties.every((p) => p.members.length === 4));
  assert.equal(new Set(next.parties.flatMap((p) => p.members)).size, 56);
  assert.equal(next.actors.filter((a) => a.status === 'town').length, 3);
});

test('legacy poor returnees leave, freeing spawn capacity without charging or inventing gold', () => {
  const s = fixture();
  s.fee = 1500;
  const healer = s.actors.find((a) => a.role === 'healer')!;
  healer.wealth = 775;
  const beforeGold = s.gold;
  const next = advanceTo(s, s.nextTick);
  assert.ok(!next.actors.some((a) => a.id === healer.id));
  assert.equal(next.parties.length, 0);
  assert.equal(next.gold, beforeGold);
  assert.equal(guildPartyForecast(next).reason, 'Need 1 healer');
});
