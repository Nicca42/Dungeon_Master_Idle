import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceTo,
  learn,
  spendStamina,
  defenderDuty,
  defenseWarning,
  bankFloorXp,
  damageFloor,
  surfaceCombat,
  moveMobs,
  floorMobCount,
  mobLimitReached,
  adventurerCap,
  nextArrivalClass,
  trainingEligible,
  excavationMinutes,
  tutorialStep,
  excavationEnd,
  diggersInactive,
  maintenanceNeeded,
  processRest,
  processStaffRest,
  attack,
  command,
  demoState,
  heal,
  initialState,
  level,
  validateState,
} from '../src/game/engine';
import { DAY, HOUR } from '../src/game/content';
import { decode } from '../src/persistence/schema';

test('tutorial starts with 200 gold, finishes for 135, and only boosts floor one', () => {
  let s = initialState();
  assert.equal(s.gold, 20000);
  for (let i = 0; i < 8; i++) s = tutorialStep(s);
  assert.equal(s.gold, 6500);
  assert.equal(s.floors[0]!.stage, 'ready');
  assert.equal(s.floors[1]!.stage, 'queued');
  assert.equal(s.floors[2]!.stage, 'queued');
  assert.equal(s.actors.filter((a) => a.role === 'miner').length, 3);
  assert.equal(s.actors.filter((a) => a.role === 'maintenance').length, 3);
  assert.equal(s.floors[0]!.restSpots, 1);
});
test('opening spawns one fighter; the final tutorial step assembles the first legal party', () => {
  let s = initialState();
  for (let i = 0; i < 9; i++) s = tutorialStep(s);
  assert.equal(s.actors.filter((a) => ['fighter', 'wizard', 'healer'].includes(a.role)).length, 1);
  assert.equal(s.parties.length, 0);
  s = tutorialStep(s);
  const party = s.parties[0]!;
  const people = s.actors.filter((a) => party.members.includes(a.id));
  assert.ok(people.filter((a) => a.role === 'fighter').length >= 2);
  assert.ok(people.some((a) => a.role === 'wizard'));
  assert.ok(people.some((a) => a.role === 'healer'));
  assert.ok(people.every((a) => a.wealth === 1000));
  assert.equal(s.totals.income, people.length * 1000);
  assert.equal(party.status, 'arriving');
  assert.ok(s.research.includes('training'));
});
test('clock uses x24 and partitioned advancement equals one offline interval', () => {
  const start = demoState(),
    target = HOUR * 24;
  const once = advanceTo(start, target);
  let sliced = start;
  for (let i = 1; i <= 60; i++) sliced = advanceTo(sliced, (i * HOUR * 24) / 60);
  assert.deepEqual(sliced, once);
  assert.equal(once.now, DAY);
  assert.deepEqual(advanceTo(once, once.now), once);
});
test('save round-trip does not change seeded simulation', () => {
  const start = advanceTo(demoState(), HOUR * 7 + 333);
  const loaded = decode(JSON.stringify({ state: start, wall: 123456 })).state;
  assert.deepEqual(advanceTo(loaded, DAY * 3), advanceTo(start, DAY * 3));
});
test('tutorial time remains paused and cannot be replayed after completion', () => {
  assert.deepEqual(advanceTo(initialState(), DAY), initialState());
  assert.throws(() => command(demoState(), { type: 'tutorial' }));
});
test('damage drains shield first and level-two healing overflows into defense', () => {
  const a = { health: 10, defense: 10 };
  attack(a, 14);
  assert.deepEqual(a, { health: 6, defense: 0 });
  const healer = initialState().actors[0]!;
  healer.health = 4;
  healer.defense = 0;
  heal(healer, 20);
  assert.equal(healer.health, 10);
  assert.equal(healer.defense, 10);
  healer.health = 4;
  healer.defense = 0;
  heal(healer, 9);
  assert.equal(healer.health, 10);
  assert.equal(healer.defense, 0);
});
test('invalid commands leave original state unchanged', () => {
  const s = demoState(),
    original = structuredClone(s);
  assert.throws(() => command(s, { type: 'fee', value: -1 }));
  assert.throws(() => command(s, { type: 'fund', amount: 1_000_000 }));
  assert.deepEqual(s, original);
});
test('treasure allocation transfers, not creates, money', () => {
  const s = demoState(),
    total = s.gold + s.reserve;
  const next = command(s, { type: 'fund', amount: 1000 });
  assert.equal(next.gold + next.reserve, total);
  assert.equal(next.reserve, s.reserve + 1000);
});
test('policy rejects impossible layouts and defense limits', () => {
  const s = demoState();
  assert.throws(() => command(s, { type: 'policy', policy: { ...s.policy, mimics: 6 } }));
  assert.throws(() => command(s, { type: 'policy', policy: { ...s.policy, wood: 10 } }));
});
test('training completes once, upgrades stats and learning requirement', () => {
  const s = demoState();
  const trainee = structuredClone(s.actors.find((a) => a.role === 'fighter')!);
  trainee.id = s.nextId++;
  trainee.status = 'training';
  trainee.until = HOUR;
  trainee.maxHealth =
    trainee.maxDefense =
    trainee.maxStamina =
    trainee.damage =
    trainee.speed =
    trainee.intelligence =
    trainee.primary =
      9;
  trainee.health = trainee.defense = trainee.stamina = 9;
  s.actors.push(trainee);
  const id = trainee.id;
  const next = advanceTo(s, 6 * HOUR);
  const a = next.actors.find((a) => a.id === id)!;
  assert.equal(a.trained, true);
  assert.equal(level(a), 1);
  assert.equal(a.learning, 11);
  assert.equal(advanceTo(next, 7 * HOUR).actors.find((a) => a.id === id)!.learning, 11);
});
function constructionFixture() {
  const s = demoState();
  s.policy.mobSlots = 0;
  for (const f of s.floors)
    f.encounters = f.encounters.filter((e) => !['zombie', 'slime'].includes(e.kind));
  return s;
}

test('eight-day simulation preserves resources, population caps, and completes construction', () => {
  const s = validateState(advanceTo(constructionFixture(), DAY * 8));
  for (const [role, cap] of [
    ['fighter', 30],
    ['wizard', 20],
    ['healer', 10],
  ] as const)
    assert.ok(s.actors.filter((a) => a.role === role && a.health > 0).length <= cap);
  assert.equal(s.floors[1]!.stage, 'ready');
  assert.equal(s.floors[2]!.stage, 'ready');
  assert.ok(s.totals.admissions > 10);
  assert.ok(s.totals.income > 0);
  assert.ok(s.totals.loot > 0);
  for (const f of s.floors) for (const e of f.encounters) assert.ok(e.gold <= e.capacity);
});
test('save parser rejects malformed resources and unknown versions', () => {
  const state = demoState();
  assert.throws(() => decode(JSON.stringify({ state: { ...state, version: 4 }, wall: 1 })));
  state.actors[0]!.health = -1;
  assert.throws(() => decode(JSON.stringify({ state, wall: 1 })));
});

test('floors must open in order and all five floors can be developed', () => {
  let s = advanceTo(constructionFixture(), DAY * 8);
  s = command(s, { type: 'installFloor', floor: 2 });
  s = command(s, { type: 'installFloor', floor: 3 });
  s = advanceTo(s, s.now + DAY * 4);
  assert.throws(() => command(s, { type: 'openFloor', floor: 3 }), /floor above/);
  s = command(s, { type: 'openFloor', floor: 2 });
  s = command(s, { type: 'openFloor', floor: 3 });
  s = command(s, { type: 'develop', floor: 4 });
  assert.throws(() => command(s, { type: 'develop', floor: 4 }));
  s = advanceTo(s, s.now + DAY * 8);
  s = command(s, { type: 'installFloor', floor: 4 });
  s = advanceTo(s, s.now + DAY * 4);
  s = command(s, { type: 'openFloor', floor: 4 });
  s = command(s, { type: 'develop', floor: 5 });
  s = advanceTo(s, s.now + DAY * 8);
  s = command(s, { type: 'installFloor', floor: 5 });
  s = advanceTo(s, s.now + DAY * 4);
  s = command(s, { type: 'openFloor', floor: 5 });
  assert.equal(s.floors.filter((f) => f.stage === 'open').length, 5);
  assert.equal(s.totals.built, 5);
  validateState(s);
});

test('a pending catch-up checkpoint preserves its fixed target through serialization', () => {
  const s = advanceTo(demoState(), DAY * 2);
  const pending = { game: DAY * 8, wall: 1_000_000 };
  const loaded = decode(JSON.stringify({ state: s, wall: 100, pending }));
  assert.deepEqual(loaded.pending, pending);
  assert.deepEqual(advanceTo(loaded.state, loaded.pending!.game), advanceTo(demoState(), DAY * 8));
});

test('many different time partitions produce the same authoritative state', () => {
  for (let seed = 1; seed <= 12; seed++) {
    let start = initialState(seed);
    for (let step = 0; step < 10; step++) start = tutorialStep(start);
    const target = DAY * 3 + seed * 12345;
    const complete = advanceTo(start, target);
    let sliced = start;
    while (sliced.now < target)
      sliced = advanceTo(sliced, Math.min(target, sliced.now + (seed + 1) * 98765));
    assert.deepEqual(sliced, complete);
  }
});

// Floor-exit rules use the same deterministic functions as online/offline ticking.
test('floor checkpoint banks each stat once and collects only available pooled gold', () => {
  const s = demoState(),
    p = s.parties[0]!;
  const team = s.actors.filter((a) => p.members.includes(a.id));
  for (const a of team) a.wealth = 0;
  team[1]!.wealth = 150;
  const a = team[0]!,
    gold = s.gold,
    primary = a.primary;
  a.pendingXp.primary = 20;
  a.pendingXp.intelligence = 11;
  bankFloorXp(s, p);
  assert.equal(a.primary, primary + 2);
  assert.equal(a.bankedXp.intelligence, 1);
  assert.equal(s.gold, gold + 150);
  assert.equal(
    team.reduce((n, a) => n + a.wealth, 0),
    0,
  );
  assert.equal(
    Object.values(a.pendingXp).reduce((n, v) => n + v, 0),
    0,
  );
  const copy = structuredClone(s);
  bankFloorXp(s, p);
  assert.deepEqual(s, copy);
});
function queuedParties(capacity = 1) {
  const s = demoState(),
    f = s.floors[0]!,
    p = s.parties[0]!;
  s.policy.restCapacity = capacity;
  p.node = f.encounters.length;
  p.checkpointed = true;
  p.restJoinedAt = s.now;
  p.status = 'resting';
  for (const id of p.members) {
    const clone = structuredClone(s.actors.find((a) => a.id === id)!);
    clone.id = s.nextId++;
    clone.status = 'town';
    s.actors.push(clone);
  }
  const q = {
    ...structuredClone(p),
    id: s.nextId++,
    members: s.actors
      .filter((a) => a.status === 'town')
      .slice(0, 4)
      .map((a) => a.id),
  };
  assert.ok(q.members.length);
  s.parties = [p, q];
  f.restQueue = [p.id, q.id];
  f.restOccupants = [];
  for (const a of s.actors.filter((a) => [...p.members, ...q.members].includes(a.id))) {
    a.stamina = 0;
    a.status = 'adventure';
  }
  return { s, f, p, q };
}
test('rest admits part of a party, then its remaining members before later parties', () => {
  const { s, f, p, q } = queuedParties();
  processRest(s, f);
  assert.deepEqual(
    f.restOccupants.map((o) => o.actorId),
    [p.members[0]],
  );
  const first = s.actors.find((a) => a.id === p.members[0])!;
  first.stamina = first.maxStamina;
  processRest(s, f);
  assert.ok(p.restedIds.includes(first.id));
  assert.equal(f.restOccupants[0]!.actorId, p.members[1]);
  assert.ok(!f.restOccupants.some((o) => o.partyId === q.id));
});
test('six hours without any admission causes an office complaint and departure', () => {
  const { s, f, p, q } = queuedParties();
  processRest(s, f);
  s.now += 6 * HOUR;
  processRest(s, f);
  assert.ok(s.parties.some((x) => x.id === q.id));
  s.now += 1;
  processRest(s, f);
  assert.ok(!s.parties.some((x) => x.id === q.id));
  assert.equal(s.complaints[0]!.partyId, q.id);
  assert.ok(s.parties.some((x) => x.id === p.id));
});
test('rest healing stays unbanked and the party waits for healer stamina', () => {
  const { s, f, p } = queuedParties(30);
  s.parties = [p];
  f.restQueue = [p.id];
  const team = s.actors.filter((a) => p.members.includes(a.id));
  for (const a of team) a.stamina = a.maxStamina;
  const healer = team.find((a) => a.role === 'healer')!,
    injured = team.find((a) => a.role === 'fighter')!;
  injured.health = 1;
  injured.defense = 0;
  processRest(s, f);
  processRest(s, f);
  assert.equal(injured.health, injured.maxHealth);
  assert.ok(healer.stamina < healer.maxStamina);
  assert.equal(healer.pendingXp.primary, 1);
  assert.equal(healer.bankedXp.primary, 0);
  assert.ok(f.restQueue.includes(p.id));
  for (let i = 0; i < 4; i++) {
    s.now += HOUR;
    processRest(s, f);
  }
  assert.equal(healer.stamina, healer.maxStamina);
  assert.ok(!f.restQueue.includes(p.id));
  assert.equal(healer.pendingXp.primary, 1);
  p.checkpointed = false;
  bankFloorXp(s, p);
  assert.equal(healer.bankedXp.primary, 1);
});
test('a wipe or exhaustion before the exit loses pending XP but retains banked XP', () => {
  for (const dead of [false, true]) {
    const s = demoState(),
      p = s.parties[0]!;
    p.status = 'moving';
    for (const a of s.actors.filter((a) => p.members.includes(a.id))) {
      a.pendingXp.primary = 8;
      a.bankedXp.primary = 3;
      a.stamina = 0;
      if (dead) a.health = 0;
    }
    const next = advanceTo(s, s.nextTick);
    assert.ok(!next.parties.some((x) => x.id === p.id));
    for (const a of next.actors.filter((a) => p.members.includes(a.id))) {
      assert.equal(a.pendingXp.primary, 0);
      assert.equal(a.bankedXp.primary, 3);
      if (dead) assert.equal(a.status, 'dead');
    }
  }
});
test('shared budgets apply to empty floors and defer encounter changes on occupied floors', () => {
  const s = demoState(),
    before = s.floors[0]!.encounters;
  const next = command(s, {
    type: 'policy',
    policy: {
      ...s.policy,
      trapAttackBudget: 3,
      trapDefenseBudget: 2,
      treasureBudget: 1,
    },
  });
  assert.deepEqual(next.floors[0]!.encounters, before);
  next.parties = [];
  for (const a of next.actors) a.task = null;
  const applied = advanceTo(next, next.nextTick),
    f = applied.floors[0]!;
  const traps = f.encounters.filter((e) => ['trapdoor', 'arrows', 'mimic'].includes(e.kind));
  assert.ok(traps.reduce((n, e) => n + e.damage, 0) <= 3);
  assert.ok(traps.reduce((n, e) => n + e.maxDefense, 0) <= 2);
  assert.ok(f.encounters.reduce((n, e) => n + e.capacity, 0) <= 100);
  assert.equal(f.health, 10);
});
test('legacy saves migrate additively without changing treasury, clock or actor IDs', () => {
  const original = demoState(),
    raw: any = structuredClone(original);
  delete raw.rulesVersion;
  delete raw.policyRevision;
  delete raw.complaints;
  for (const a of raw.actors) {
    delete a.pendingXp;
    delete a.bankedXp;
    delete a.task;
  }
  for (const f of raw.floors) {
    for (const key of [
      'policyRevision',
      'health',
      'defense',
      'level',
      'restQueue',
      'restOccupants',
    ])
      delete f[key];
    for (const e of f.encounters) {
      delete e.position;
      delete e.maxDefense;
    }
  }
  for (const p of raw.parties)
    for (const key of [
      'checkpointed',
      'restJoinedAt',
      'lastRestAdmissionAt',
      'restedIds',
      'actions',
    ])
      delete p[key];
  const migrated = decode(JSON.stringify({ state: raw, wall: 100 })).state;
  assert.equal(migrated.gold, original.gold);
  assert.equal(migrated.now, original.now);
  assert.deepEqual(
    migrated.actors.map((a) => a.id),
    original.actors.map((a) => a.id),
  );
  assert.equal(migrated.rulesVersion, 2);
  validateState(advanceTo(migrated, DAY));
});

test('floor stats reject direct edits; encounter changes do not heal structural damage', () => {
  let s = demoState();
  assert.throws(() => command(s, { type: 'policy', policy: { ...s.policy, floorHealth: 20 } }));
  assert.throws(() => command(s, { type: 'policy', policy: { ...s.policy, floorDefense: 20 } }));
  s.parties = [];
  s.floors[0]!.health = 3;
  s = command(s, { type: 'policy', policy: { ...s.policy, trapAttackBudget: 15 } });
  assert.equal(s.floors[0]!.health, 3);
});
test('structural damage equals attack minus defense and never goes negative', () => {
  const f = demoState().floors[0]!;
  damageFloor(f, 9);
  assert.equal(f.health, 10);
  damageFloor(f, 14);
  assert.equal(f.health, 6);
  damageFloor(f, 50);
  assert.equal(f.health, 0);
});
test('maintenance repairs one floor health for each stamina spent', () => {
  let s = demoState();
  s.parties = [];
  s.floors[0]!.health = 5;
  for (const f of s.floors) f.encounters = [];
  const workers = s.actors.filter((a) => a.role === 'maintenance');
  s.actors = s.actors.filter((a) => a.id !== workers[1]!.id);
  for (const a of s.actors)
    if (['fighter', 'wizard', 'healer'].includes(a.role)) {
      a.status = 'recovering';
      a.until = DAY;
    }
  s = advanceTo(s, HOUR);
  const worker = s.actors.find((a) => a.id === workers[0]!.id)!;
  assert.equal(worker.task?.kind, 'repair');
  assert.equal(worker.stamina, 9);
  assert.equal(s.floors[0]!.health, 5);
  s = advanceTo(s, worker.task!.until);
  assert.equal(s.floors[0]!.health, 6);
  assert.equal(s.actors.find((a) => a.id === worker.id)!.stamina, 9); // returning after first repair
  s = advanceTo(s, 3 * HOUR);
  assert.equal(s.actors.find((a) => a.id === worker.id)!.stamina, 9); // next repair minus one stamina, plus one quiet recovery
});
test('busy crew and unclaimed spent trap raise a hiring alert; hiring adds available staff', () => {
  const s = demoState();
  const trap = s.floors[0]!.encounters.find((e) => e.kind === 'trapdoor')!;
  trap.active = false;
  for (const a of s.actors.filter((a) => a.role === 'maintenance')) a.status = 'resting';
  assert.equal(maintenanceNeeded(s), true);
  const hired = command(s, { type: 'hireMaintenance' });
  assert.equal(hired.gold, s.gold - 1500);
  assert.equal(hired.actors.filter((a) => a.role === 'maintenance').length, 4);
  assert.equal(maintenanceNeeded(hired), false);
});
test('increasing rest capacity immediately admits waiting members without advancing time', () => {
  const { s, f, p, q } = queuedParties(1);
  processRest(s, f);
  const next = command(s, { type: 'rest', floor: 1 });
  const room = next.floors[0]!;
  assert.equal(next.now, s.now);
  assert.equal(room.restOccupants.length, 2);
  assert.ok(room.restOccupants.every((o) => o.partyId === p.id));
  assert.ok(!room.restOccupants.some((o) => o.partyId === q.id));
  assert.deepEqual(room.encounters, f.encounters);
});

test('rest capacity is purchased one bed at a time for five gold; policy cannot bypass payment', () => {
  const s = demoState();
  assert.throws(() => command(s, { type: 'policy', policy: { ...s.policy, restCapacity: 30 } }));
  const next = command(s, { type: 'rest', floor: 1 });
  assert.equal(next.gold, s.gold - 500);
  assert.equal(next.policy.restCapacity, s.policy.restCapacity + 1);
});
test('layout reorder preserves encounter resources, rejects duplicates and allows occupied floors', () => {
  const s = demoState(),
    f = s.floors[0]!,
    ids = f.encounters.map((e) => e.id).reverse();
  assert.doesNotThrow(() => command(s, { type: 'reorder', floor: 1, ids }));
  s.parties = [];
  const next = command(s, { type: 'reorder', floor: 1, ids });
  assert.deepEqual(
    next.floors[0]!.encounters.map((e) => e.id),
    ids,
  );
  assert.equal(
    next.floors[0]!.encounters.reduce((n, e) => n + e.gold, 0),
    f.encounters.reduce((n, e) => n + e.gold, 0),
  );
  assert.throws(() => command(s, { type: 'reorder', floor: 1, ids: ids.map(() => ids[0]!) }));
});
test('mobs patrol only the exit-side third after failed rolls and retry at the exit', () => {
  const s = demoState();
  s.parties = [];
  s.seed = 1;
  const f = s.floors[0]!;
  const mob = f.encounters.find((e) => e.kind === 'zombie')!;
  mob.active = true;
  mob.position = -0.5;
  moveMobs(s, f);
  assert.equal(mob.active, true);
  assert.equal(mob.patrolDirection, 1);
  assert.equal(mob.position, -1);
  const failedSeed = s.seed;
  moveMobs(s, f);
  assert.equal(mob.position, -0.5);
  assert.equal(s.seed, failedSeed, 'walking away must not roll escape');
  let ticks = 0;
  while (mob.active && ticks++ < 500) {
    moveMobs(s, f);
    if (mob.active) assert.ok(mob.position >= -1 && mob.position <= f.encounters.length / 3 - 1);
  }
  assert.equal(mob.active, false);
  assert.equal(s.escapedMobs.length, 1);
});
test('escaped mobs ignore exposed maintenance staff but can destroy headquarters', () => {
  const s = demoState();
  s.parties = [];
  s.officeHealth = 3;
  for (const a of s.actors.filter((a) => a.role === 'maintenance')) {
    a.health = 1;
    a.defense = 0;
    a.task = null;
  }
  s.escapedMobs = [
    { id: s.nextId++, kind: 'zombie', health: 10, defense: 0, damage: 5, position: 340 },
  ];
  surfaceCombat(s);
  assert.equal(s.actors.filter((a) => a.role === 'maintenance' && a.status === 'dead').length, 0);
  surfaceCombat(s);
  surfaceCombat(s);
  surfaceCombat(s);
  assert.equal(s.officeHealth, 0);
  assert.equal(s.gameOver, true);
  assert.throws(() => command(s, { type: 'hireMaintenance' }), /Headquarters has fallen/);
});
test('an incoming party defeats escaped mobs before they damage headquarters', () => {
  const s = demoState();
  s.escapedMobs = [
    { id: s.nextId++, kind: 'slime', health: 10, defense: 10, damage: 3, position: 340 },
  ];
  surfaceCombat(s);
  assert.equal(s.escapedMobs.length, 0);
  assert.equal(s.officeHealth, 100);
});
test('party starts on the surface, then enters the first cave after its arrival time', () => {
  const s = demoState(),
    p = s.parties[0]!;
  assert.equal(p.status, 'arriving');
  const before = advanceTo(s, p.surfaceUntil - 1);
  assert.equal(before.parties[0]!.status, 'arriving');
  const after = advanceTo(s, p.surfaceUntil);
  assert.equal(after.parties[0]!.status, 'moving');
  assert.equal(after.parties[0]!.node, 0);
});

test('excavation takes ten and fifteen real minutes with three rested diggers, and research halves both', () => {
  for (const floor of [1, 2])
    for (const upgraded of [false, true]) {
      const s = demoState();
      s.parties = [];
      s.policy.mobSlots = 0;
      for (const f of s.floors) {
        f.stage = 'locked';
        f.encounters = [];
      }
      for (const f of s.floors.filter((f) => f.id < floor)) f.stage = 'ready';
      const target = s.floors[floor - 1]!;
      target.stage = 'queued';
      target.work = 0;
      target.required = 12 * 1.5 ** (floor - 1);
      for (const a of s.actors.filter((a) => a.role === 'miner')) {
        a.stamina = 10;
        a.status = 'working';
      }
      if (upgraded) s.research.push('digging');
      const duration = excavationMinutes(floor, upgraded) * 60000 * 24;
      assert.equal(advanceTo(s, duration - 1).floors[floor - 1]!.stage, 'excavating');
      assert.equal(advanceTo(s, duration).floors[floor - 1]!.stage, 'foundation');
    }
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((f) => excavationMinutes(f)),
    [10, 15, 22.5, 33.75, 50.625],
  );
});
test('staff management hires a digger for ten gold with baseline stats', () => {
  const s = demoState(),
    next = command(s, { type: 'hireMiner' });
  assert.equal(next.gold, s.gold - 1000);
  assert.equal(next.actors.filter((a) => a.role === 'miner').length, 4);
  const a = next.actors.at(-1)!;
  assert.equal(a.stamina, 10);
  assert.equal(a.primary, 10);
  assert.equal(a.status, 'working');
});

test('tutorial hiring and excavation require three individual paid clicks each', () => {
  let s = tutorialStep(initialState());
  assert.throws(() => command(s, { type: 'tutorial' }), /highlighted/);
  for (let i = 1; i <= 3; i++) {
    s = command(s, { type: 'hireMiner' });
    assert.equal(s.actors.filter((a) => a.role === 'miner').length, i);
    assert.equal(s.tutorial, i === 3 ? 2 : 1);
  }
  for (let i = 1; i <= 3; i++) {
    const gold = s.gold;
    s = command(s, { type: 'excavateNext' });
    assert.equal(s.gold, gold - 500);
    assert.equal(s.floors.filter((f) => f.stage === 'queued').length, i);
    assert.equal(s.tutorial, i === 3 ? 3 : 2);
  }
  while (s.tutorial < 7) s = tutorialStep(s);
  assert.throws(() => command(s, { type: 'tutorial' }), /three maintainers/);
  for (let i = 1; i <= 3; i++) {
    s = command(s, { type: 'hireMaintenance' });
    assert.equal(s.actors.filter((a) => a.role === 'maintenance').length, i);
    assert.equal(s.tutorial, i === 3 ? 8 : 7);
  }
});
test('first rest room is absent until purchased and completes the tutorial step', () => {
  let s = initialState();
  while (s.tutorial < 5) s = tutorialStep(s);
  assert.equal(s.floors[0]!.restSpots, 0);
  const gold = s.gold;
  s = command(s, { type: 'rest', floor: 1 });
  assert.equal(s.gold, gold - 500);
  assert.equal(s.floors[0]!.restSpots, 1);
  assert.equal(s.tutorial, 6);
});
test('diggers rest to full in the office and excavation ETA includes recovery', () => {
  const s = constructionFixture();
  s.parties = [];
  for (const a of s.actors.filter((a) => a.role === 'miner')) {
    a.stamina = 0;
    a.status = 'resting';
  }
  const f = s.floors[1]!;
  f.stage = 'queued';
  f.work = 0;
  f.required = 18;
  processStaffRest(s);
  const eta = excavationEnd(s, 2)!;
  assert.ok(eta >= 11 * HOUR - HOUR / 12);
  const resting = advanceTo(s, 4.5 * HOUR);
  assert.ok(
    resting.actors
      .filter((a) => a.role === 'miner')
      .every((a) => a.status === 'resting' && a.stamina === 9),
  );
  const full = advanceTo(s, 5 * HOUR);
  assert.ok(
    full.actors
      .filter((a) => a.role === 'miner')
      .every((a) => a.status === 'working' && a.stamina === 10),
  );
  assert.equal(advanceTo(s, eta - 1).floors[1]!.stage, 'excavating');
  assert.equal(advanceTo(s, eta).floors[1]!.stage, 'foundation');
});
test('inactive diggers alert clears when another floor is queued', () => {
  const s = demoState();
  for (const f of s.floors.slice(0, 3)) f.stage = 'ready';
  assert.equal(diggersInactive(s), true);
  const next = command(s, { type: 'excavateNext' });
  assert.equal(next.floors[3]!.stage, 'queued');
  assert.equal(diggersInactive(next), false);
});

test('defenders earn exactly one gold per active hour, and no wages during rest', () => {
  let s = command(demoState(), { type: 'hireDefender' });
  const guard = s.actors.find((a) => a.role === 'defender')!;
  const before = s.gold;
  for (let i = 0; i < 12; i++) {
    s.now += HOUR / 12;
    defenderDuty(s);
  }
  assert.equal(before - s.gold, 100);
  assert.equal(guard.stamina, 10);
  guard.stamina = 0;
  defenderDuty(s);
  const restingGold = s.gold;
  s.parties = [];
  s.floors[0]!.restQueue = [];
  processStaffRest(s);
  assert.equal(guard.status, 'resting');
  for (let i = 0; i < 59; i++) {
    s.now += HOUR / 12;
    processStaffRest(s);
    defenderDuty(s);
  }
  assert.equal(s.gold, restingGold);
  s.now += HOUR / 12;
  processStaffRest(s);
  defenderDuty(s);
  assert.equal(guard.status, 'working');
  assert.equal(guard.stamina, guard.maxStamina);
});

test('blue-jacket defenders intercept escaped mobs and warnings forecast defeat', () => {
  const s = command(demoState(), { type: 'hireDefender' });
  s.parties = [];
  const guard = s.actors.find((a) => a.role === 'defender')!;
  s.escapedMobs = [{ id: 9999, kind: 'zombie', health: 5, defense: 5, damage: 2, position: 340 }];
  assert.equal(defenseWarning(s), null);
  surfaceCombat(s);
  assert.equal(s.escapedMobs.length, 0);
  assert.equal(s.officeHealth, 100);
  guard.status = 'resting';
  assert.equal(defenseWarning(s)?.color, 'yellow');
  s.escapedMobs = [
    { id: 9998, kind: 'slime', health: 1000, defense: 100, damage: 50, position: 340 },
  ];
  assert.equal(defenseWarning(s)?.color, 'red');
  guard.status = 'working';
  assert.equal(defenseWarning(s)?.color, 'red');
  assert.equal(guard.health, 10, 'forecast must not mutate real characters');
  assert.equal(s.officeHealth, 100);
});

test('defender wages cannot overdraw the treasury and saved duty is preserved', () => {
  const s = command(demoState(), { type: 'hireDefender' });
  s.gold = 0;
  defenderDuty(s);
  assert.equal(s.gold, 0);
  assert.equal(s.actors.find((a) => a.role === 'defender')!.status, 'resting');
  assert.deepEqual(decode(JSON.stringify({ state: s, wall: 100 })).state, s);
});

test('six diggers excavate at twice the three-digger rate', () => {
  let s = initialState();
  s = tutorialStep(s);
  s = tutorialStep(s);
  s = tutorialStep(s);
  s.opened = true;
  const six = command(command(command(s, { type: 'hireMiner' }), { type: 'hireMiner' }), {
    type: 'hireMiner',
  });
  const threeResult = advanceTo(s, 2 * HOUR);
  const sixResult = advanceTo(six, 2 * HOUR);
  assert.equal(threeResult.floors[0]!.work, 6);
  assert.equal(sixResult.floors[0]!.stage, 'furnishing');
  assert.equal(advanceTo(six, HOUR).floors[0]!.work, threeResult.floors[0]!.work);
  assert.equal(excavationMinutes(1, false, 6), 5);
});

test('finance tutorial settings are editable before setup and retained after completion', () => {
  let s = initialState();
  while (s.tutorial < 6) s = tutorialStep(s);
  s = command(s, { type: 'fee', value: 3 });
  s = command(s, { type: 'reinvest', value: 50 });
  s = command(s, { type: 'saleRatio', value: 20 });
  s = tutorialStep(s);
  assert.equal(s.tutorial, 7);
  assert.equal(s.fee, 300);
  assert.equal(s.reinvest, 50);
  assert.equal(s.saleRatio, 20);
});

test('layout rejects encounter IDs from a different floor', () => {
  const s = demoState();
  s.parties = [];
  s.floors[1]!.encounters = [{ ...s.floors[0]!.encounters[0]!, id: 99999 }];
  const ids = s.floors[0]!.encounters.map((e) => e.id);
  ids[0] = 99999;
  assert.throws(() => command(s, { type: 'reorder', floor: 1, ids }));
});

test('exit rolls approximate one in five and transfer live counts between floors', () => {
  let escapes = 0;
  for (let seed = 0; seed < 1000; seed++) {
    const s = demoState();
    s.parties = [];
    s.seed = seed;
    const f = s.floors[0]!;
    const mob = f.encounters.find((e) => e.kind === 'zombie')!;
    mob.active = true;
    mob.position = -0.5;
    moveMobs(s, f);
    escapes += s.escapedMobs.length;
  }
  assert.ok(escapes > 150 && escapes < 250, `${escapes} escapes from 1000 seeded rolls`);
  const s = demoState();
  s.parties = [];
  s.seed = 7;
  const below = s.floors[1]!;
  below.encounters = [
    {
      ...s.floors[0]!.encounters.find((e) => e.kind === 'zombie')!,
      id: 99999,
      active: true,
      position: -0.5,
    },
  ];
  moveMobs(s, below);
  assert.equal(floorMobCount(below), 0);
  assert.equal(floorMobCount(s.floors[0]!), 1);
  assert.equal(s.floors[0]!.encounters.at(-1)!.roaming, true);
});

test('incoming mobs block spawns at the floor count limit and spawning resumes below it', () => {
  const s = demoState();
  s.parties = [];
  const f = s.floors[0]!;
  const nest = f.encounters.find((e) => e.kind === 'zombie')!;
  nest.active = false;
  nest.readyAt = 0;
  f.spawnAt = 0;
  f.encounters.push(
    { ...nest, id: 90001, roaming: true, active: true, position: 100 },
    { ...nest, id: 90002, roaming: true, active: true, position: 100 },
  );
  assert.equal(mobLimitReached(s, f), true);
  const blocked = advanceTo(s, HOUR);
  assert.equal(blocked.floors[0]!.encounters.find((e) => e.id === nest.id)!.active, false);
  blocked.floors[0]!.encounters.find((e) => e.id === 90001)!.active = false;
  assert.equal(mobLimitReached(blocked, blocked.floors[0]!), false);
  const resumed = advanceTo(blocked, 2 * HOUR);
  assert.equal(resumed.floors[0]!.encounters.find((e) => e.id === nest.id)!.active, true);
  assert.equal(floorMobCount(resumed.floors[0]!), 2);
});

test('defenders use office beds even when there are no public rest rooms', () => {
  const s = command(command(demoState(), { type: 'hireDefender' }), { type: 'hireDefender' });
  s.parties = [];
  s.floors.forEach((f) => {
    f.restSpots = 0;
  });
  const guards = s.actors.filter((a) => a.role === 'defender');
  guards.forEach((a) => {
    a.stamina = 0;
    a.status = 'resting';
  });
  processStaffRest(s);
  assert.equal(s.staffRoom!.occupants.length, 2);
  assert.equal(s.floors[0]!.restOccupants.length, 0);
  s.now += HOUR;
  processStaffRest(s);
  guards.forEach((a) => assert.equal(a.stamina, 2));
});

test('looted chests become inactive and unsuccessful lock attempts are explained', () => {
  const s = demoState();
  const p = s.parties[0]!;
  const f = s.floors[0]!;
  p.status = 'moving';
  p.node = f.encounters.findIndex((e) => e.kind === 'wood');
  const chest = f.encounters[p.node]!;
  const opened = advanceTo(s, s.nextTick);
  const result = opened.floors[0]!.encounters.find((e) => e.id === chest.id)!;
  assert.equal(result.gold, 0);
  assert.equal(result.active, false);
  assert.ok(opened.parties[0]!.actions.some((a) => a.kind === 'lock' && a.success));
  for (const a of s.actors.filter((a) => p.members.includes(a.id))) {
    a.intelligence = 0;
    a.primary = 0;
  }
  const failed = advanceTo(s, s.nextTick);
  assert.equal(failed.floors[0]!.encounters.find((e) => e.id === chest.id)!.gold, chest.gold);
  assert.ok(failed.activity.some((a) => a.text.includes('could not open wood')));
});

test('mimics reveal tentacles during combat and reset themselves without maintenance', () => {
  const s = demoState();
  const p = s.parties[0]!;
  const f = s.floors[0]!;
  p.status = 'moving';
  p.node = f.encounters.findIndex((e) => e.kind === 'mimic');
  const mimic = f.encounters[p.node]!;
  const fought = advanceTo(s, s.nextTick);
  const spent = fought.floors[0]!.encounters.find((e) => e.id === mimic.id)!;
  assert.equal(spent.active, false);
  assert.ok(spent.revealedUntil! > fought.now);
  fought.parties = [];
  fought.reserve = 0;
  for (const floor of fought.floors) {
    floor.health = 10;
    for (const e of floor.encounters) if (e.id !== mimic.id) e.active = true;
  }
  const reset = advanceTo(fought, spent.readyAt);
  assert.equal(reset.floors[0]!.encounters.find((e) => e.id === mimic.id)!.active, true);
  assert.ok(reset.actors.every((a) => a.task?.encounter !== mimic.id));
});

test('local ads unlocks exactly two paid spawn points and each produces an extra arrival', () => {
  let s = demoState();
  s.gold = 20000;
  s.parties = [];
  assert.throws(() => command(s, { type: 'buySpawnPoint' }));
  s.research.push('localAds');
  s = command(s, { type: 'buySpawnPoint' });
  s = command(s, { type: 'buySpawnPoint' });
  assert.equal(s.spawnPoints, 3);
  assert.equal(adventurerCap(s), 80);
  assert.equal(s.gold, 15000);
  assert.throws(() => command(s, { type: 'buySpawnPoint' }));
  s.actors = s.actors.filter((a) => ['miner', 'maintenance'].includes(a.role));
  const expected = [0, 1, 2].map((point) => nextArrivalClass(s, point));
  const next = advanceTo(s, HOUR);
  assert.deepEqual(
    next.actors.filter((a) => ['fighter', 'wizard', 'healer'].includes(a.role)).map((a) => a.role),
    expected,
  );
});

test('two excavation spells preserve gold, only skip excavation, and require furnished predecessors', () => {
  let s = demoState();
  const gold = s.gold;
  s = command(s, { type: 'excavationSpell', floor: 2 });
  assert.equal(s.excavationSpells, 1);
  assert.equal(s.gold, gold);
  assert.equal(s.floors[1]!.stage, 'foundation');
  assert.equal(s.floors[1]!.work, 0);
  assert.throws(() => command(s, { type: 'excavationSpell', floor: 3 }));
  const eta = excavationEnd(s, 3)!;
  assert.ok(eta > s.now + 9 * HOUR, 'ETA includes previous foundations and furnishing');
  s.floors[1]!.stage = 'ready';
  s = command(s, { type: 'excavationSpell', floor: 3 });
  assert.equal(s.excavationSpells, 0);
  s.floors[3]!.stage = 'queued';
  s.floors[2]!.stage = 'ready';
  assert.throws(() => command(s, { type: 'excavationSpell', floor: 4 }));
});

test('existing saves receive two spells and one spawn point without losing progress', () => {
  const s: any = demoState();
  delete s.excavationSpells;
  delete s.spawnPoints;
  const migrated = decode(JSON.stringify({ state: s, wall: 100 })).state;
  assert.equal(migrated.excavationSpells, 2);
  assert.equal(migrated.spawnPoints, 1);
  assert.equal(migrated.gold, s.gold);
  assert.deepEqual(migrated.floors, s.floors);
});

test('quiet defenders with depleted stamina enter the office rather than waiting at their station', () => {
  const s = command(demoState(), { type: 'hireDefender' });
  const a = s.actors.find((a) => a.role === 'defender')!;
  a.stamina = 5;
  defenderDuty(s);
  processStaffRest(s);
  assert.equal(a.status, 'resting');
  assert.ok(s.staffRoom!.occupants.some((o) => o.actorId === a.id));
  s.now = HOUR;
  processStaffRest(s);
  assert.equal(a.stamina, 7);
});

test('a party can fully recover outside a full rest room and proceed without bed admission', () => {
  const s = demoState();
  const p = s.parties[0]!;
  const f = s.floors[0]!;
  f.restSpots = 0;
  f.restQueue = [p.id];
  p.node = f.encounters.length;
  p.checkpointed = true;
  p.restJoinedAt = 0;
  p.status = 'resting';
  for (const e of f.encounters) e.active = false;
  for (const a of s.actors.filter((a) => p.members.includes(a.id))) a.stamina = 9;
  processRest(s, f);
  s.now = 2 * HOUR;
  processRest(s, f);
  assert.equal(f.restQueue.length, 0);
  assert.equal(p.status, 'waiting');
  assert.equal(f.restOccupants.length, 0);
  assert.ok(s.actors.filter((a) => p.members.includes(a.id)).every((a) => a.stamina === 10));
  s.floors[1]!.stage = 'open';
  s.nextTick = s.now + HOUR / 12;
  const next = advanceTo(s, s.nextTick);
  assert.equal(next.parties[0]!.floor, 2);
});

test('nearby mobs stop stamina recovery for parties awaiting rest beds', () => {
  const s = demoState();
  const p = s.parties[0]!;
  const f = s.floors[0]!;
  f.restSpots = 0;
  f.restQueue = [p.id];
  p.status = 'resting';
  p.restJoinedAt = 0;
  const team = s.actors.filter((a) => p.members.includes(a.id));
  team.forEach((a) => (a.stamina = 5));
  const mob = f.encounters.find((e) => e.kind === 'zombie')!;
  mob.active = true;
  mob.position = f.encounters.length - 1;
  processRest(s, f);
  s.now = 2 * HOUR;
  processRest(s, f);
  assert.ok(team.every((a) => a.stamina === 5));
});

test('training stops at entry eligibility or the configured three-course limit', () => {
  let s = demoState();
  s.parties = [];
  const a = s.actors.find((a) => a.role === 'fighter')!;
  a.status = 'town';
  assert.equal(trainingEligible(s, a), false, 'eligible adventurers must not train');
  a.primary = 6;
  a.trainingCount = 0;
  assert.equal(trainingEligible(s, a), true);
  s = command(s, { type: 'trainingLimit', value: 2 });
  const trainee = s.actors.find((x) => x.id === a.id)!;
  trainee.trainingCount = 2;
  assert.equal(trainingEligible(s, trainee), false);
  s = command(s, { type: 'trainingLimit', value: 3 });
  assert.equal(
    trainingEligible(
      s,
      s.actors.find((x) => x.id === a.id)!,
    ),
    true,
  );
  s.actors.find((x) => x.id === a.id)!.trainingCount = 3;
  assert.equal(
    trainingEligible(
      s,
      s.actors.find((x) => x.id === a.id)!,
    ),
    false,
  );
  assert.throws(() => command(s, { type: 'trainingLimit', value: 4 }));
});

test('maintainers walk back after a job and clear their floor location on arrival', () => {
  const s = demoState();
  s.parties = [];
  s.reserve = 0;
  const worker = s.actors.find((a) => a.role === 'maintenance')!;
  const f = s.floors[0]!;
  f.health = 10;
  const trap = f.encounters.find((e) => e.kind === 'trapdoor')!;
  worker.task = { floor: 1, encounter: trap.id, kind: 'reset', until: s.nextTick };
  const next = advanceTo(s, s.nextTick);
  const a = next.actors.find((a) => a.id === worker.id)!;
  assert.equal(a.task, null);
  assert.equal(a.workFloor, 1);
  assert.equal(
    a.workPosition,
    f.encounters.findIndex((e) => e.id === trap.id),
  );
  assert.equal(a.returnUntil, next.nextTick);
  const returned = advanceTo(next, next.nextTick).actors.find((x) => x.id === a.id)!;
  assert.equal(returned.workFloor, undefined);
  assert.equal(returned.returnUntil, undefined);
});

test('repeated training increments its course counter and stops after three graduations', () => {
  const s = demoState();
  s.parties = [];
  for (const f of s.floors) f.encounters = [];
  const a = s.actors.find((a) => a.role === 'fighter')!;
  a.status = 'town';
  a.primary = 6;
  a.trainingCount = 0;
  const next = advanceTo(s, 24 * HOUR);
  const graduate = next.actors.find((x) => x.id === a.id)!;
  assert.equal(graduate.trainingCount, 3);
  assert.equal(graduate.primary, 9);
  assert.equal(graduate.status, 'town');
  assert.equal(trainingEligible(next, graduate), false);
});

test('fixed layout slots preserve gaps and resources across saves and reject reserved positions', () => {
  const s = demoState();
  s.parties = [];
  const ids = s.floors[0]!.encounters.map((e) => e.id);
  const slots = ids.map((_, i) => (i === ids.length - 1 ? 11 : i));
  const next = command(s, { type: 'reorder', floor: 1, ids, slots });
  assert.deepEqual(
    next.floors[0]!.encounters.map((e) => e.slot),
    slots,
  );
  assert.equal(next.floors[0]!.encounters.at(-1)!.id, ids.at(-1));
  assert.deepEqual(
    decode(JSON.stringify({ state: next, wall: 0 })).state.floors[0]!.encounters.map((e) => e.slot),
    slots,
  );
  for (const invalid of [-1, 12, 1.5, 0]) {
    assert.throws(() =>
      command(s, {
        type: 'reorder',
        floor: 1,
        ids,
        slots: slots.map((v, i) => (i === slots.length - 1 ? invalid : v)),
      }),
    );
  }
});

test('installation charges once, consumes one stamina per fixture, survives reload and gates opening', () => {
  let s = constructionFixture();
  s.parties = [];
  s.actors = s.actors.filter((a) => a.role === 'maintenance');
  const f = s.floors[1]!;
  f.stage = 'ready';
  f.installation = 'pending';
  f.encounters = [];
  s.policy = { ...s.policy, trapdoors: 1, arrows: 0, mimics: 0, wood: 1, silver: 0, mobSlots: 0 };
  const gold = s.gold;
  const stamina = s.actors.reduce((n, a) => n + a.stamina, 0);
  assert.throws(() => command(s, { type: 'openFloor', floor: 2 }));
  s = command(s, { type: 'installFloor', floor: 2 });
  assert.equal(s.gold, gold - 500);
  assert.equal(
    s.actors.reduce((n, a) => n + a.stamina, 0),
    stamina - 2,
  );
  assert.equal(s.floors[1]!.encounters.filter((e) => e.installed).length, 0);
  assert.throws(() => command(s, { type: 'installFloor', floor: 2 }));
  assert.throws(() => command(s, { type: 'openFloor', floor: 2 }));
  s = decode(JSON.stringify({ state: s, wall: 0 })).state;
  s = advanceTo(s, Math.max(...s.actors.map((a) => a.task?.until ?? s.now)));
  assert.equal(s.floors[1]!.installation, 'complete');
  assert.ok(s.floors[1]!.encounters.every((e) => e.installed));
  assert.equal(command(s, { type: 'openFloor', floor: 2 }).floors[1]!.stage, 'open');
});

test('furnished floor stays empty until installation is ordered, including policy updates', () => {
  let s = advanceTo(constructionFixture(), DAY * 8);
  assert.equal(s.floors[1]!.installation, 'pending');
  assert.equal(s.floors[1]!.encounters.length, 0);
  s = command(s, { type: 'policy', policy: { ...s.policy, wood: 1 } });
  s = advanceTo(s, s.now + HOUR);
  assert.equal(s.floors[1]!.encounters.length, 0);
  s.actors = s.actors.filter((a) => a.role !== 'maintenance');
  s = command(s, { type: 'installFloor', floor: 2 });
  s = advanceTo(s, Math.max(...s.actors.map((a) => a.task?.until ?? s.now)));
  assert.equal(s.floors[1]!.installation, 'installing');
  assert.ok(s.floors[1]!.encounters.every((e) => e.installed === false));
});

test('occupied layout save preserves party progress, resting parties, jobs and roaming mob coordinates', async () => {
  const { encounterX } = await import('../src/game/layout');
  const s = demoState();
  const f = s.floors[0]!;
  const p = s.parties[0]!;
  p.status = 'moving';
  p.node = 2;
  const current = f.encounters[2]!.id;
  const completed = f.encounters.slice(0, 2).map((e) => e.id);
  const rest = {
    ...structuredClone(p),
    id: 9999,
    node: f.encounters.length,
    status: 'resting' as const,
    checkpointed: true,
  };
  s.parties.push(rest);
  f.restQueue = [rest.id];
  const worker = s.actors.find((a) => a.role === 'maintenance')!;
  worker.workFloor = 1;
  worker.workPosition = 0;
  worker.task = { floor: 1, encounter: f.encounters[0]!.id, kind: 'reset', until: s.now + HOUR };
  const mob = f.encounters.find((e) => e.kind === 'zombie')!;
  mob.active = true;
  mob.position = 2.5;
  const x = encounterX(f, mob.position);
  const saved = command(s, {
    type: 'reorder',
    floor: 1,
    ids: f.encounters.map((e) => e.id).reverse(),
  });
  const next = saved.floors[0]!;
  assert.equal(next.encounters[saved.parties[0]!.node]!.id, current);
  assert.deepEqual(saved.parties[0]!.completedEncounters, completed);
  assert.equal(saved.parties[1]!.node, next.encounters.length);
  assert.deepEqual(next.restQueue, [rest.id]);
  assert.deepEqual(saved.actors.find((a) => a.id === worker.id)!.task, worker.task);
  assert.ok(
    Math.abs(encounterX(next, next.encounters.find((e) => e.id === mob.id)!.position) - x) < 0.001,
  );
  const again = command(saved, { type: 'reorder', floor: 1, ids: f.encounters.map((e) => e.id) });
  assert.deepEqual(again.parties[0]!.completedEncounters, completed);
  assert.deepEqual(
    decode(JSON.stringify({ state: again, wall: 0 })).state.parties[0]!.completedEncounters,
    completed,
  );
});

test('security hires use a separate arrival without changing the town spawn stream', async () => {
  const { securityPose, ADVENTURER_SPAWN_X } = await import('../src/game/security');
  const s = demoState();
  const next = command(s, { type: 'hireDefender' });
  const guard = next.actors.at(-1)!;
  assert.equal(guard.securitySpawnedAt, s.now);
  assert.equal(next.nextArrivalAt, s.nextArrivalAt);
  assert.equal(nextArrivalClass(next), nextArrivalClass(s));
  assert.equal(next.spawnPoints, s.spawnPoints);
  assert.equal(next.seed, s.seed);
  assert.equal(
    next.actors.filter((a) => ['fighter', 'wizard', 'healer'].includes(a.role)).length,
    s.actors.filter((a) => ['fighter', 'wizard', 'healer'].includes(a.role)).length,
  );
  assert.equal(securityPose(next, guard, 0).x, ADVENTURER_SPAWN_X);
  next.now += HOUR / 24;
  assert.ok(securityPose(next, guard, 0).x < ADVENTURER_SPAWN_X);
  assert.equal(
    decode(JSON.stringify({ state: next, wall: 0 })).state.actors.at(-1)!.securitySpawnedAt,
    s.now,
  );
});

test('security turns toward and attacks escaped mobs on either side of its post', async () => {
  const { securityPose } = await import('../src/game/security');
  for (const position of [50, 300]) {
    const s = command(demoState(), { type: 'hireDefender' });
    s.parties = [];
    const a = s.actors.at(-1)!;
    delete a.securitySpawnedAt;
    s.escapedMobs = [{ id: 9999, kind: 'zombie', health: 5, defense: 0, damage: 1, position }];
    const pose = securityPose(s, a, 0);
    assert.equal(pose.facing, position < 110 ? -1 : 1);
    assert.ok(position < 110 ? pose.x < 110 : pose.x > 110);
    surfaceCombat(s);
    assert.equal(s.escapedMobs.length, 0);
    assert.equal(a.stamina, 9);
    assert.equal(s.officeHealth, 100);
  }
});

test('installation ordered during furnishing waits for builders and is retained when ready', () => {
  let s = demoState();
  s.parties = [];
  const f = s.floors[1]!;
  f.stage = 'furnishing';
  f.work = 0;
  f.required = 3;
  f.encounters = [];
  s = command(s, { type: 'installFloor', floor: 2 });
  const ids = s.floors[1]!.encounters.map((e) => e.id);
  assert.equal(s.floors[1]!.installation, 'installing');
  assert.ok(!s.actors.some((a) => a.task?.floor === 2));
  assert.throws(() => command(s, { type: 'installFloor', floor: 2 }));
  s = advanceTo(s, HOUR);
  assert.equal(s.floors[1]!.stage, 'ready');
  assert.deepEqual(
    s.floors[1]!.encounters.map((e) => e.id),
    ids,
  );
  s = advanceTo(s, s.nextTick);
  assert.ok(s.actors.some((a) => a.task?.floor === 2 && a.task.kind === 'install'));
});

test('construction header ETA matches the end of foundation and furnishing phases', () => {
  for (const stage of ['foundation', 'furnishing'] as const) {
    const s = demoState();
    s.parties = [];
    s.actors = s.actors.filter((a) => a.role === 'miner');
    const f = s.floors[1]!;
    f.stage = stage;
    f.required = 3;
    f.work = 0;
    const eta = excavationEnd(s, 2, true)!;
    assert.equal(eta, HOUR);
    assert.equal(advanceTo(s, eta - 1).floors[1]!.stage, stage);
    assert.equal(
      advanceTo(s, eta).floors[1]!.stage,
      stage === 'foundation' ? 'furnishing' : 'ready',
    );
  }
});

test('group layout propagates to occupied floors and future installations without copying resources', () => {
  let s = demoState();
  const source = s.floors[0]!;
  const second = s.floors[1]!;
  second.stage = 'ready';
  second.encounters = source.encounters.map((e) => ({
    ...e,
    id: s.nextId++,
    gold: e.capacity ? 100 : 0,
  }));
  const preserved = second.encounters.map((e) => ({ id: e.id, gold: e.gold, health: e.health }));
  const party = {
    ...structuredClone(s.parties[0]!),
    id: s.nextId++,
    floor: 2,
    status: 'moving' as const,
    node: 1,
  };
  s.parties.push(party);
  const activeId = second.encounters[party.node]!.id;
  s = command(s, { type: 'reorder', floor: 1, ids: source.encounters.map((e) => e.id).reverse() });
  const pattern = (f: typeof source) => f.encounters.map((e) => [e.kind, e.slot]);
  assert.deepEqual(pattern(s.floors[1]!), pattern(s.floors[0]!));
  for (const e of s.floors[1]!.encounters)
    assert.deepEqual(
      { id: e.id, gold: e.gold, health: e.health },
      preserved.find((x) => x.id === e.id),
    );
  assert.equal(
    s.floors[1]!.encounters[s.parties.find((p) => p.id === party.id)!.node]!.id,
    activeId,
  );
  s = decode(JSON.stringify({ state: s, wall: 0 })).state;
  s.floors[2]!.stage = 'ready';
  s.floors[2]!.installation = 'pending';
  s = command(s, { type: 'installFloor', floor: 3 });
  assert.deepEqual(pattern(s.floors[2]!), pattern(s.floors[0]!));
  assert.ok(s.floors[2]!.encounters.every((e) => e.installed === false));
});

test('mimic XP increments once during sustained combat and persists through reset', () => {
  const s = demoState();
  const p = s.parties[0]!;
  const f = s.floors[0]!;
  p.status = 'moving';
  p.node = f.encounters.findIndex((e) => e.kind === 'mimic');
  const mimic = f.encounters[p.node]!;
  mimic.health = 1000;
  mimic.defense = 1000;
  mimic.damage = 0;
  let next = advanceTo(s, s.nextTick);
  assert.equal(next.floors[0]!.encounters.find((e) => e.id === mimic.id)!.xp, 1);
  next = advanceTo(next, next.nextTick);
  assert.equal(next.floors[0]!.encounters.find((e) => e.id === mimic.id)!.xp, 1);
  const reset = next.floors[0]!.encounters.find((e) => e.id === mimic.id)!;
  reset.active = false;
  reset.readyAt = next.nextTick;
  next = advanceTo(next, next.nextTick);
  assert.equal(next.floors[0]!.encounters.find((e) => e.id === mimic.id)!.xp, 2);
  assert.equal(
    decode(JSON.stringify({ state: next, wall: 0 })).state.floors[0]!.encounters.find(
      (e) => e.id === mimic.id,
    )!.xp,
    2,
  );
});

test('waiting parties check public beds every five game minutes without polling between ticks', () => {
  let s = command(demoState(), { type: 'hireDefender' });
  const p = s.parties[0]!;
  const f = s.floors[0]!;
  f.restSpots = 1;
  s.policy.restCapacity = 0;
  f.restQueue = [p.id];
  p.status = 'resting';
  p.node = f.encounters.length;
  p.checkpointed = true;
  p.restJoinedAt = 0;
  p.members.forEach((id) => {
    s.actors.find((a) => a.id === id)!.stamina = 3;
  });
  const guard = s.actors.at(-1)!;
  guard.status = 'resting';
  guard.stamina = 3;
  guard.until = DAY;
  s = advanceTo(s, s.nextTick);
  const checked = s.now;
  for (const id of p.members)
    assert.equal(s.actors.find((a) => a.id === id)!.restCheckedAt, checked);
  s = advanceTo(s, s.nextTick - 1);
  assert.equal(s.actors.find((a) => a.id === p.members[0])!.restCheckedAt, checked);
  s = advanceTo(s, s.nextTick);
  assert.equal(s.actors.find((a) => a.id === p.members[0])!.restCheckedAt, checked + HOUR / 12);
  s.policy.restCapacity = 10;
  s = advanceTo(s, s.nextTick);
  assert.ok(s.staffRoom!.occupants.some((o) => o.actorId === guard.id));
  assert.ok(!s.floors[0]!.restOccupants.some((o) => o.actorId === guard.id));
});

test('skill XP retains overflow until checkpoint and stamina earns one XP per use', () => {
  const s = demoState(),
    p = s.parties[0]!;
  const a = s.actors.find((a) => a.id === p.members[0])!;
  const initial = a.primary;
  a.pendingXp.primary = 0;
  a.bankedXp.primary = 3;
  for (let i = 0; i < 20; i++) learn(a);
  assert.equal(a.primary, initial);
  assert.equal(a.pendingXp.primary + a.bankedXp.primary, 23);
  a.pendingXp.maxStamina = 0;
  spendStamina(a, 2);
  assert.equal(a.pendingXp.maxStamina, 1);
  spendStamina(a, 0);
  assert.equal(a.pendingXp.maxStamina, 1);
  bankFloorXp(s, p);
  assert.equal(a.primary, initial + 2);
  assert.equal(a.bankedXp.primary, 3);
  assert.equal(a.pendingXp.primary, 0);
});

test('absorbing an attack awards defense and health XP only to the skills used', () => {
  const a = demoState().actors[0]!;
  a.defense = 3;
  a.health = 10;
  a.pendingXp.maxDefense = a.pendingXp.maxHealth = 0;
  attack(a, 2);
  assert.equal(a.pendingXp.maxDefense, 1);
  assert.equal(a.pendingXp.maxHealth, 0);
  attack(a, 3);
  assert.equal(a.pendingXp.maxDefense, 2);
  assert.equal(a.pendingXp.maxHealth, 1);
});

test('rest fees charge only once on admission, preserve wallets and survive saving', () => {
  const { s, f, p } = queuedParties(10);
  s.parties = [p];
  f.restQueue = [p.id];
  s.policy.restFee = 3;
  const team = s.actors.filter((a) => p.members.includes(a.id));
  team.forEach((a) => {
    a.wealth = 500;
  });
  team[0]!.wealth = 100;
  const gold = s.gold;
  processRest(s, f, false);
  assert.equal(s.gold - gold, 100 + (team.length - 1) * 300);
  assert.equal(team[0]!.wealth, 0);
  const paid = s.gold;
  processRest(s, f, false);
  assert.equal(s.gold, paid);
  const restored = decode(JSON.stringify({ state: s, wall: Date.now() })).state;
  restored.floors[0]!.restOccupants = [];
  processRest(restored, restored.floors[0]!, false);
  assert.equal(restored.gold, paid);
});

test('new floor room purchase works at maximum bed capacity and costs five gold', () => {
  const s = demoState();
  s.policy.restCapacity = 30;
  s.floors[1]!.stage = 'ready';
  s.floors[1]!.restSpots = 0;
  const next = command(s, { type: 'rest', floor: 2 });
  assert.equal(next.floors[1]!.restSpots, 1);
  assert.equal(next.gold, s.gold - 500);
  assert.equal(next.policy.restCapacity, 30);
});

test('ten-gold entry defaults and old saves remain valid with free rest', () => {
  const s = demoState();
  assert.equal(s.fee, 1000);
  assert.equal(command(s, { type: 'fee', value: 10 }).fee, 1000);
  const legacy: any = structuredClone(s);
  delete legacy.policy.restFee;
  legacy.fee = 100;
  const restored = decode(JSON.stringify({ state: legacy, wall: Date.now() })).state;
  assert.equal(restored.policy.restFee, 0);
  assert.equal(restored.fee, 100);
});
