# Dungeon Master Idle — executable MVP/demo plan

Status: proposed implementation baseline, 20 September 2026. This document turns the rough specification into buildable rules. All numerical values introduced here are tunable demo defaults, not validated game balance. No follow-up answers are required to start implementation.

Implementation update: a playable basic demo now exists. See the [README](../README.md) for run commands, verification, and explicit differences between the demo and this broader MVP target.

Implementation companion: [Technical implementation specification](./TECHNICAL_IMPLEMENTATION.md), covering selected frameworks, installation commands, module interfaces, save schema, rendering, tests, build tooling, and milestone-specific engineering tasks. This document owns gameplay rules; the companion owns their implementation.

## 1. Product and scope

You are the operator of a slightly disreputable dungeon business. Hire workers, excavate floors, stock encounters and treasure, attract adventurers, and use admission and training revenue to expand. Adventurers act autonomously; the player manages the business rather than fighting directly.

**Demo outcome:** in an 8–12 minute guided session, a player builds and opens the first floor, watches a party explore, adjusts admission and treasure funding, and sees an accurate return-from-away report. Five floors are playable through normal progression or explicitly labelled demo time skips.

**Platform:** a portrait-first Expo/React Native application with TypeScript, targeting iOS and Android, with a browser preview for easy review. Use local pixel assets, local saves, and simulated town demand. No backend, login, payments, ads, live services, or store submission for this demo.

“Mock it all” means a self-contained playable prototype: the simulation and management controls work, while external services and the economy are fictional. Avoid disconnected screen mockups that cannot demonstrate idle progression.

### Included

- Surface office, three miners, two maintenance workers, up to five floors.
- Excavation → foundation → furnishing → opening, with visible staff activity.
- Fighter, wizard, healer; party formation; shield-first combat; rest and retreat.
- Three traps, two mob species, two chest types, all listed research topics.
- Admission, training, treasure allocation, mock equipment sale allocation.
- Persisted progress, deterministic offline catch-up, return summary, demo controls.
- Pixel dungeon cutaway, animated NPCs, inspectable characters and encounters.

### Deferred

- Races, stat caps by race, bosses, extra classes, merchants as simulated NPCs, equipment combat modifiers, crafting, procedurally generated mazes, freeform tile placement, multiplayer, cloud saves, push notifications, monetization, and deeper floor groups.
- Temporary workers remain supported by the staff data model but are not a separate hiring system.
- Movement is along fixed encounter routes. The cutaway is a visual representation of those routes, not a physics or pathfinding simulation.

## 2. Player experience and art direction

Four bottom tabs: **Dungeon · Build · Research · Office**. Persistent header: treasury, in-game day/time, dungeon open/closed state. Tap entities to inspect; use bottom sheets for adjustments. Staff management, admission, finances, and training live under Office.

| Screen | Required content and actions |
|---|---|
| First launch | New dungeon, resume when available, clearly marked demo scenario loader |
| Dungeon | Surface office/town, vertically stacked floors, workers, parties, shield/health bars, event feed, floor inspection |
| Build | Floor status and queue; excavate/foundation actions; floor-group trap, chest, mob limits; rest spots; validation and cost preview |
| Research | Small dependency tree, cost/time, locked reason, active research, completed effect |
| Office | Staff cards and task assignment; fees; level policy; chest funding; equipment allocation; training price/demand |
| Character sheet | Current/max resources, all baseline stats, class stat, per-stat XP, current action, party position |
| Return report | Time elapsed, admissions, revenue, expenditure, treasure taken, construction/research progress, retreats, maintenance backlog |
| Demo drawer | Skip 5 real minutes / 1 hour / 8 hours; load tutorial/open-floor/five-floor fixtures; reset with confirmation |

Visual style: warm torchlit stone, dark outlines, muted earth tones, gold highlights, and a lightly comic bureaucratic tone. Use 16×16 tiles and 24×24 or 32×32 character sprites at integer scales, nearest-neighbor rendering where supported, and pre-scaled assets where needed to avoid blur. Pixel lettering for headings; readable system text for numeric panels and explanations. Do not reference proprietary D&D artwork, names, or branding.

Minimum art set: stone/dirt/foundation tiles, office, stair/elevator connection, rest room, two chest states per type, trap armed/spent states, zombie, slime, mimic, three adventurer sprites, miner, maintenance worker, and resource icons. Character states: idle, move, act, rest, incapacitated; 2–4 frames each is sufficient. Disable decorative motion through a reduced-motion setting. Use symbols and labels as well as color, with mobile targets at least 44 points high.

## 3. Clock, simulation, and persistence

**1 real hour = 24 game hours.** Thus 1 real minute = 24 game minutes; 1 game hour = 2.5 real minutes; 1 game day = 1 real hour.

The app does not need to execute while closed. Save a complete simulation state and timestamp, then advance it to the current time on launch/resume. Foreground and offline progression must use the same engine.

Implementation contract:

1. `advanceTo(state, targetGameTime)` processes discrete scheduled events in order `(dueTime, priority, entityId, sequence)`.
2. Store all simulation time as integer game milliseconds. Store the seeded pseudorandom generator state; never call unseeded randomness in the engine.
3. Process work completion, research, recovery, encounters, spawns, town arrivals, party formation, admissions, and maintenance through explicit events. Specify this order as the tie-break priority; player commands first advance to command time, then apply atomically.
4. Foreground animation interpolates between authoritative positions. Rendering frequency never changes results.
5. Persist after each player command, on background transition when available, and at a short periodic interval. Use transactional current/previous snapshots, schema versioning, and a recovery path for corrupted saves.
6. Resume uses `max(0, now - lastSavedRealTime)`; if the clock moved backwards, simulate zero elapsed and retain the previous timestamp high-water mark. Use a monotonic clock for active-session elapsed time.
7. No arbitrary offline reward cap in this demo. Process long absences in bounded chunks without blocking the UI, showing “Catching up” and saving resumable checkpoints. Defer new management commands until complete. Benchmark 30 real days; optimize repeated recovery/spawn events if needed without changing outcomes.
8. A resume checkpoint stores the fixed target timestamp and remaining catch-up interval so relaunch cannot award the same interval twice. Returning again without elapsed time produces no new rewards.
9. Demo skips advance virtual game time through this same engine and are labelled as simulated time. They do not forge the saved wall-clock anchor or cause a second catch-up.

Before the tutorial opens the dungeon, only guided construction advances occur; background time is paused and the UI says so. The first floor receives an explicit scripted construction completion, not a global acceleration that finishes every floor. On opening, establish the real-time anchor and use the normal clock permanently.

## 4. Character rules and resolved ambiguities

### Stats, resources, and levels

All normal starting characters have 10 in health, damage, defense, speed, intelligence, stamina, XP learning requirement, and wealth. Class primary stats also start at 10. Staff add digging/building/maintenance skill values of 10. Mobs and traps have their own smaller archetype values.

- Store maximum health/defense/stamina separately from current resources. Damage never changes maximum defense or the level used for admission.
- Wealth means spendable gold. A separate `wealthTier = max(1, floor(wealth / 10))` limits purchasable item/training tiers; it does not determine combat level.
- `statLevel(value) = max(1, floor(value / 10))` for normal stat displays; admission level is `max(0, floor(min(maxHealth, damage, maxDefense, speed, intelligence, maxStamina, primaryStat) / 10))`. Level 1 admission therefore requires all relevant base stats to be at least 10. Exclude wealth and learning requirement.
- XP learning rate is displayed as **XP needed per stat point**: a larger value makes learning slower. Each successful relevant action grants 1 XP to its primary used stat; reaching the requirement increases that stat by 1 and carries remainder XP. Defense gains XP on absorbing damage, health on surviving an encounter, speed on completing a route segment, stamina on completing an encounter without exhaustion, intelligence on successful detection/unlocking/manipulation. Award once per eligible action/encounter, not once per render frame. Current health/defense/stamina do not refill when their maxima increase.
- Learning requirement and wealth are special attributes, not infinitely trainable combat skills. Training can increase the requirement; income changes wealth. This makes the otherwise circular “all skills improve” statement implementable.
- Only the scripted underqualified training cohort starts at 9 in level-relevant stats. Label this as a demo exception to the default of 10.

### Movement and action timing

Use a fixed line of route nodes per floor: entrance, up to ten encounter nodes, rest nodes, exit. Default movement: 5 game minutes per edge at speed 10, scaled by `10 / speed`. Every two completed movement edges cost 1 stamina, carried across encounters. An ordinary action takes 1 game minute at speed 10, with the same speed scaling. Party movement follows its slowest active member.

### Combat

Damage removes current defense first, then current health. Keep `currentHealth` and `currentDefense` in `[0, max]`; show shield and health separately. No accuracy, critical hits, status effects, or elemental rules in the demo.

| Class/action | Effect | Stamina |
|---|---|---|
| Fighter attack | `damage + strength`; targets mobs or destructible traps, never unlocks treasure | 1 |
| Fighter block | Absorb up to `damage + defense` from an attack on eligible adjacent allies; remaining damage reaches original target | 1 per interception |
| Wizard attack | `mana + damage` raw damage | spell level |
| Wizard protection | Absorb up to `mana + defense` from one incoming hit on any party member; no permanent shield increase | spell level |
| Wizard manipulation | `mana + intelligence`; succeeds when at least the target's manipulation requirement | spell level |
| Healer heal | `divinity + intelligence`, capped at max health; at healing level 2+, overflow restores current defense up to its max | healing level |

Spell/healing level is `max(1, floor(effectPower / 10))`. This preserves the supplied examples and prevents free level-0 spells. Mana and divinity are power stats, not consumable pools; stamina is the casting resource. Starting power 20 means a level-2 heal can already restore defense.

Blocking level is `max(0, floor((damage + defense) / 10))`; eligible protected positions extend up to `1 + blockingLevel` members ahead or behind in party order. Each interception protects one target and spends stamina. The blocked amount dissipates; it is not additional damage to the fighter. This is an explicit demo interpretation of the blocking description.

Use an initiative queue with `nextActionAt`; tie-break by stable ID. An eligible fighter can intercept automatically once between its own turns; otherwise a wizard may protect once between its turns. Never stack both on the same hit. Healers prioritize allies below 60% health, then heal defense if applicable; otherwise rest/idle. Wizards prioritize noticed traps, then attack. Fighters attack the closest enemy. Mobs attack the first active party member. No friendly fire.

On zero health, an adventurer is incapacitated and the party retreats; no permanent death or corpse-looting system. If nobody can perform a useful action or all active members are exhausted, retreat rather than looping. Town recovery takes 12 game hours and restores health, defense, and stamina. The party dissolves on returning to town.

## 5. Town, parties, and admission

- Seed tutorial town with 6 fighters, 4 wizards, and 2 healers. Normal arrivals follow a repeating shuffled bag containing 3 fighters, 2 wizards, 1 healer, one arrival per game hour. Caps are 30 fighters, 20 wizards, 10 healers across town, dungeon, training, and recovery combined. Skip a capped class slot rather than exceeding its cap.
- Every game hour, randomly select unpartied, recovered, eligible NPCs to create a minimum party of 2 fighters + 1 wizard + 1 healer. Optionally add 0–2 random available members with seeded randomness. Maximum party size is 6. The tutorial's underqualified cohort is an explicit scripted party that reaches admission despite this normal eligibility filter.
- Parties require every member to satisfy the level policy and afford their individual fee. Pay once per visit, not per floor. Admission does not consume wealth for rejected parties. Prevent a rejected party blocking the entire queue; dissolve it after one rejection and apply a 6-game-hour retry cooldown to its members.
- Default policy: level 1 only, fee 1 gold per adventurer. Adjustable fee 0–5 gold. Do not invent a separate admission demand curve: affordability and level eligibility govern admission in this demo.
- At most one party explores a floor at once; other parties wait at the surface or previous floor exit without stamina cost. Admit at most one party per game hour. Parties traverse consecutive open floors before returning; newly finished floors are not added mid-visit.
- At each game-day boundary, award each recovered, idle NPC in town a fictional town-work stipend of up to 3 gold, stopping at 20 owned gold. NPCs already holding 20 or more keep their existing wealth and receive no stipend. Returning from a visit does not itself trigger payment. This supports repeat visits without an external merchant economy; report it as NPC income, never dungeon income.

**Training:** after the first opening, introduce one cohort of four underqualified NPCs (2 fighters, 1 wizard, 1 healer), respecting class caps. The tutorial demonstrates the rejection and training unlock. A course grants +1 to all maximum/core stats and primary stat, +1 XP requirement, and +1 wealth; existing XP is retained. This faithfully exposes the “slower learning” effect.

Price `p` is an integer 1–5 gold; displayed demand is `10 - p` seats per game day (9 at 1 gold, 5 at 5 gold). Actual enrollments are capped by affordable, available underqualified NPCs and demand; charge when enrolling. Course duration is 6 game hours. One course per NPC for the demo. The +1 wealth is a clearly fictional scholarship, tracked as external NPC income; it is not deducted from or credited twice to the dungeon treasury.

## 6. Floors, encounters, and rest

All floors 1–5 share a group policy. Each floor has ten encounter slots plus five possible rest slots, on a fixed route. Generate a seeded layout when furnishing completes. Changes require a preview and Apply action; changes take effect when the floor is empty. Do not replace encounters under an active party. Existing mobs above a newly lowered cap remain until removed, but no replacement spawns occur until compliant.

Trap min/max counts, chest counts, and mob caps must fit ten encounter slots. Reserve slots for each mob spawn capacity. Sample trap counts within valid min/max ranges and defense budget; reject an impossible minimum with a useful explanation, rather than silently violating it. Chests, traps, and mobs never occupy the same slot.

| Content | Demo properties and behavior |
|---|---|
| Trap door | Damage seeded 5–10; disguise 12; health 10, defense 5; single use until reset; spent trap safely bypassed; maintenance reset costs 1 stamina |
| Arrow wall | Damage seeded 10–15; disguise 5; health 10, defense 5; single use until reset; highest party intelligence >=5 detects and safely bypasses it |
| Mimic | Living trap; health 10, damage 5, defense 10, disguise 12; detected by intelligence or revealed when opened; combat after reveal; maintenance rebuild after defeat |
| Zombie | Health 10, speed 5, damage 1–5, defense 1–5; sampled at spawn |
| Slime | Health 10, speed 5, damage 1–5, defense 10–15; sampled at spawn |
| Wood chest | Capacity/loot 1–5 gold seeded at placement; intelligence requirement 10; unlock costs 1 stamina |
| Silver chest | Capacity/loot 5–10 gold; intelligence requirement 15; unlock costs 2 stamina |

Detection compares the highest active party intelligence to disguise. Noticed static traps may be bypassed at no extra action stamina or disabled by manipulation (`power >= disguise`) or fighter damage if destructible. Bypass is default to conserve stamina. Unnoticed traps hit the first party member once and become spent. Mimics are defeated through combat; they are never safely looted as normal chests.

Chest unlocking requires an actor with intelligence at least the stated requirement; wizard manipulation can substitute if its power meets the same threshold. Both consume the chest's stated stamina cost; chest handling is an explicit exception to general spell costs. Failed eligibility means leave it unopened with an explanation. Distribute gold evenly to party members, assigning remainder coins in party order. Fighters cannot break chests to obtain their contents.

**Mob spawning:** one floor spawn queue, maximum configured throughput 1 mob per game hour. A zombie consumes 1 hour of spawn time; a slime consumes 2 hours. A mix therefore never exceeds the overall maximum. Stop when live count/slot cap or sum of living mobs' attack values reaches the configured attack budget. Determine the next creature's stats before checking budget; do not reroll until one fits. Resume when capacity permits. No stored burst of missed spawns.

If the queued creature cannot fit the configured attack budget even on an empty floor, pause spawning with “Spawn budget too low” until the policy changes. Do not silently reroll its stats or keep scheduling unsuccessful spawn attempts.

**Trap defense budget:** sum maximum defense of installed traps, including mimics. Default per-floor group preset: one trap door, one arrow wall, one mimic (20 defense total); two wood chests and one silver chest; two mob slots, attack budget 10; three rest spots. This uses eight of ten encounter slots.

**Rest spots:** each holds ten occupants across staff and adventurers; FIFO waiting with staff/adventurer labels. Recover `statLevel(maxStamina)` stamina per game hour up to max. No passive health or defense recovery in dungeon rest rooms. Staff rest automatically at <=2 stamina; parties stop before the next segment when any member cannot afford estimated segment actions plus a 2-stamina reserve.

Starting stamina 10 means a full refill takes 10 game hours = 25 real minutes. Show that wait honestly; use the demo skip to inspect it. Provide a surface break area from the start so exhausted miners cannot be stuck waiting for a rest room they must build.

Rest room guidance is an estimate, not a promise: sum per-member movement, chest handling, expected attack/spell actions, and optional trap-disabling costs. Divide each member's route demand by usable stamina (`maxStamina - 2`), take the worst member's segment count, subtract one, and clamp recommended rooms to 1–5. Default placement is evenly spaced; warn if estimates exceed five or an individual segment is infeasible. Track observed stamina costs to evaluate the estimate. Three rooms is the starting layout, not an invariant enforced by the engine.

## 7. Construction, staff, and economy

Miners also perform building work in the demo. Workers spend 1 stamina per productive game hour and contribute 1 work unit/hour at baseline. Allocate work in stable staff-ID order and distribute fractional completion consistently. Shared queues default to finish floor 1 before floor 2. Staff rest at the surface or nearest available rest point.

| Action | Cost | Work/duration |
|---|---:|---|
| Open office | Free tutorial action | Immediate |
| Hire miner | 10 gold each | Immediate, max 3 in demo |
| Excavate floor | 10 gold | `12 × floorNumber` work units |
| Basic foundation | 10 gold | `6 × floorNumber` work units |
| Initial furnishing | 10 gold | 6 work units, covers starter fixtures |
| Rest spot | 5 gold | 2 work units |
| Hire maintenance | 10 gold each | Immediate, max 2 in demo |
| Additional trap/chest/mob slot | 2 gold each | 1 work unit each, only while floor empty |

Start with 200 gold. Queueing charges the complete quoted cost immediately and reserves it; cancellation refunds only unstarted work. Start with three queued excavations, but only floor 1 foundation/furnishing is purchased during tutorial. Initial tutorial outlay: miners 30 + excavation 30 + floor-1 foundation 10 + furnishing 10 + three rest rooms 15 + maintenance 20 + initial treasure reserve 20 = **135 gold**, leaving 65 gold. Tutorial research is granted free; later upgrades are optional.

Maintenance priority: reset spent traps → refill empty chests → reconstruct defeated mimics. One task takes 1 game hour and 1 stamina, including abstracted travel. Trap reset is free; mimic reconstruction costs 1 gold. A chest refill transfers available treasure reserve up to its fixed capacity; partial refills are permitted and visible. No reserve means the worker chooses another task rather than blocking the queue. Every task has one owner to prevent duplicate refill/reset.

No salaries or recurring spawner charges in the demo; one-time hiring and capital costs keep the initial economy manageable. Surface rest and town recovery remain available at zero treasury.

**Ledger:** keep operating treasury, treasure reserve, and chest balances separate. Default entry-fee reinvestment is 30%; for each receipt, allocate in integer subunits (100 per gold) and carry fractions so rounding cannot create money. Remaining admission revenue goes to operating treasury. Training income goes to operating treasury. Player transfers can top up reserve; reserve only funds chests. Loot moves from chest balances to NPC wallets, never duplicates itself.

Found-equipment policy uses a mocked lost-property item created at most once per completed party visit with a seeded 20% chance, worth 2 gold. A configurable ratio chooses sale versus chest allocation; sold equipment yields treasury gold, chest equipment is a collectible worth 2 gold to its looter with no combat modifier. Default 50%. Track it separately from gold refill capacity. Label this simplified equipment system in Office.

Anti-stall rules: an empty chest or spent trap does not close the dungeon; players can lower admission to zero, stop research/building, or prioritize maintenance. Provide a one-time, clearly labelled 25-gold demo recovery grant if treasury is zero and no paid visitors have entered for a game day. Include it in the ledger and return report.

## 8. Research tree

One active research job; no parallel queue. Tutorial nodes are instant/free when the corresponding step grants them. Their normal costs/durations below are for scenario fixtures and future unguided starts; do not charge retrospectively.

| Research | Prerequisite | Normal cost / game hours | Effect |
|---|---|---|---|
| It's a Trap! | First foundation | 5 / 1 | Trap door, arrow wall, mimic; counts and trap defense budget |
| Mob-tastic | First foundation | 5 / 1 | Zombie/slime spawners, throughput and attack cap |
| Treasure-me-timbers | First foundation | 5 / 1 | Wood/silver chests |
| Basic Rest Spots | First foundation | 5 / 1 | Rest rooms and stamina budget estimate |
| Basic Door Policy | First floor furnished | 5 / 1 | Level-1 policy and admission fee |
| Sketchy Finances | Basic Door Policy | 5 / 1 | Treasure reinvestment and lost-property allocation |
| Staff Management | Office | 5 / 1 | Roster, task priority, maintenance hiring; miners can already be hired through tutorial |
| Short-sighted Adventurer Training | First rejected underqualified cohort | 5 / 1 | One-course training, price 1–5, demand 9–5 |
| Faster Digging | First excavation complete | 10 / 4 | Digging productivity 1 → 2 units/hour; same stamina consumption |
| Better Building | First foundation complete | 15 / 6 | New upgraded foundations health/defense 10 → 20; builder level 2 recommended |

For Better Building, interpret “100% speed penalty” as **100% extra build time**, or half productivity, for level-1 builders. A literal zero-speed penalty would create a deadlock. Level-2 builders work at full productivity. Builder level is `statLevel(buildingSkill)`; building earns skill XP. Foundations show health/defense but structural damage is deferred. State this clearly in the upgrade description so the demo does not imply unimplemented spell-damage simulation.

## 9. Tutorial state machine

Persist the step ID and use idempotent completion commands. A relaunch cannot duplicate workers, gold, fixtures, or research rewards.

| Step | Player action | Completion and demonstration |
|---|---|---|
| 1. A questionable business | Open surface office | Office appears near town |
| 2. Hire the crew | Hire three miners | Three visible workers; cost deducted once |
| 3. Going underground | Confirm excavation of three floors in Build | Floors 1–3 queued; excavation/foundation/build-level stages explained |
| 4. First-floor fast track | Start floor-1 foundation, accept tutorial boost | Only floor 1 excavation/foundation completes; floors 2–3 remain queued |
| 5. Stock the danger | Unlock traps/mobs/chests; apply starter preset | Encounter preview, budgets, and furnishing visible |
| 6. Even villains need breaks | Unlock rest spots; build three | Tutorial miners reach zero stamina; show resting and surface fallback; explicit guided completion allows furnishing/rest rooms to finish |
| 7. Set the business rules | Unlock door policy and finances; set fee/reserve | Default 1-gold fee, 30% reinvestment; initial 20-gold reserve funded and chest stock assigned |
| 8. Hire maintenance | Unlock roster; hire two workers | Reset/refill roles visible |
| 9. Open for business | Open floor 1 | Establish normal clock anchor; seed an eligible party at entrance; other floors resume normal work |
| 10. Training opportunity | Inspect underqualified cohort; unlock course and set price | Rejection explained; free tutorial research unlock; course still costs the NPC its selected fee |
| 11. Your dungeon runs itself | Inspect activity and return summary using optional labelled time skip | Tutorial ends; floors 4–5 and optional research remain normal progression |

Tutorial gating checks invariants, not merely taps: sufficient rest capacity, stocked treasure, staff hired, legal encounter budgets, and an eligible party. Do not require a 25-real-minute rest or a 6-game-hour course to finish onboarding. Optional demo skips illustrate those waits; regular play retains the time scale.

## 10. Implementation architecture and tools

The detailed build specification is in [TECHNICAL_IMPLEMENTATION.md](./TECHNICAL_IMPLEMENTATION.md). The selected stack is:

| Concern | Selected implementation |
|---|---|
| Mobile and web shell | Expo, React Native, TypeScript strict mode, Expo Router |
| Simulation | Framework-independent TypeScript, deterministic event queue and seeded RNG |
| UI state | Zustand selectors over immutable simulation snapshots; separate temporary form state |
| Pixel rendering | React Native images/views, pre-scaled sprite frames, Reanimated movement |
| Save storage | Expo SQLite on native; localStorage adapter for browser demo |
| Validation | Zod for save/content boundaries; engine validation for gameplay commands |
| Unit/component tests | Jest, jest-expo, React Native Testing Library, fast-check invariants |
| End-to-end tests | Maestro on native development builds; Playwright for web preview |
| Quality and builds | ESLint, Prettier, TypeScript, Expo Doctor, npm lockfile; local native builds first |

These are technical design choices for the demo, not additional gameplay scope. Package versions will be resolved together against the selected stable Expo SDK and recorded in the lockfile during M0.

Use Expo/React Native + TypeScript because the project is primarily mobile management UI with a small animated 2D scene. Keep a pure TypeScript simulation package usable without React or a device. Use React Native Reanimated for sprite transitions and ordinary native views/images for the cutaway; do not introduce a game engine until rendering needs justify one.

Use SQLite snapshots on native behind a `SaveRepository` interface; use browser local storage for the small web-demo snapshots, with explicit storage-error handling. Keep both adapters interchangeable. Unit tests target simulation and finance contracts; component tests target commands and tutorial gates; device/browser smoke tests cover rendering, lifecycle, and storage integration. Lock compatible dependencies during implementation rather than guessing future package versions.

Suggested layout:

```text
src/app/                   navigation and screens
src/components/            pixel UI, sheets, stat bars
src/game/model/            state, commands, events, schemas
src/game/systems/          clock, combat, work, town, economy, research
src/game/content/          archetypes, balance constants, tutorial steps
src/game/fixtures/         new-game, first-open, five-floor, exhausted-party
src/game/persistence/      native/web save adapters and migrations
src/rendering/             sprite atlas, scene projection, animation
tests/simulation/          deterministic and invariant tests
tests/flows/               tutorial, lifecycle, and return-report tests
assets/pixel/              local sprites, fonts, license/attribution manifest
```

Core records: `GameState`, `ClockState`, `Npc`, `Party`, `Floor`, `FloorGroupPolicy`, `Encounter`, `WorkOrder`, `ResearchJob`, `TrainingJob`, `LedgerEntry`, `ScheduledEvent`, `TutorialState`, `SaveEnvelope`. Every entity has a stable ID. Store behavior state, reservations, seeded RNG state, next event sequence, and active event queue in snapshots; rebuild only derived UI projections on load. Use commands such as `HireStaff`, `QueueExcavation`, `ApplyFloorPolicy`, `SetEntryFee`, `AllocateReserve`, `StartResearch`, `OpenDungeon`, and `AdvanceDemoTime`. Validate affordability and prerequisites in the engine, not only the UI.

Official references checked for this plan:

- [Expo project setup and mobile targets](https://docs.expo.dev/get-started/create-a-project/)
- [Expo universal iOS, Android, and web tutorial](https://docs.expo.dev/tutorial/create-your-first-app/)
- [Expo animation guidance](https://docs.expo.dev/develop/user-interface/animation/)
- [Expo SQLite reference](https://docs.expo.dev/versions/latest/sdk/sqlite/)

## 11. Execution backlog and gates

Estimates assume one experienced developer, placeholder art initially, and no service integration. They are planning ranges, not delivery commitments: **18–27 focused engineering days**, plus approximately 2–4 art days if custom pixel assets are required. Review after the first complete floor before committing to polish scope.

| ID | Deliverable | Depends on | Estimate | Acceptance gate |
|---|---|---|---|---|
| M0 | Expo shell, navigation, content schema, balance config, fixture loader, test harness | None | 1–2 days | Opens on iOS/Android and web; loads three named fixtures |
| M1 | Pure clock/event engine, seeded RNG, snapshot adapters, ledger | M0 | 3–4 days | Online/offline equivalence; 1 hour→24 hours; reload cannot duplicate income |
| M2 | Office/hiring, floor work queue, stamina/rest, build policies, research | M1 | 3–4 days | Three queued floors; first-floor-only boost; work resumes after rest |
| M3 | Town/party formation, admission, movement, combat, traps/chests, maintenance | M2 | 4–6 days | Autonomous party enters, pays, explores, rests/retreats, returns; workers reset/refill |
| M4 | Guided tutorial, training event, finances UI, reports, five-floor progression | M3 | 3–4 days | Full guided demo without deadlock; all listed research observable |
| M5 | Pixel assets, cutaway motion, sound toggle, accessibility and performance | M4 | 2–3 days | Readable portrait UI, distinguishable NPCs, smooth selected-floor scene |
| M6 | Balance run, save recovery, long-absence tests, device QA, demo packaging | M5 | 2–4 days | All release gates below pass; recorded known limitations accompany demo |

Implement a visible vertical slice early: office → one floor → one paying party → save → skip → return report. Do not build every research panel before validating this loop. The first implementation session should complete M0 and the clock/model portion of M1; initial review should show navigation, the pixel scene placeholder, and clock advancement.

If scope must shrink, cut cosmetic variants, sound, and equipment visuals first. Retain five-floor capacity, all three adventurer roles, rest, real idle accounting, and the full tutorial. Structural damage and equipment combat behavior remain deferred regardless.

## 12. Testable release criteria

### Simulation correctness

- Advancing a fixed seed by 60 real minutes in one call produces the same authoritative state as sixty one-minute advances and a mixed save/reload sequence.
- One-hour catch-up advances exactly one game day. Fake-clock boundary cases cover zero/negative elapsed time, interrupted catch-up, and repeated launch.
- No negative treasury, reserve, chest balance, health, defense, or stamina. Gold transfers reconcile; explicitly created sources and sinks are named in the ledger.
- Fighter, wizard, and healer formulas match this document, including shield spillover, level-2 healing overflow, insufficient stamina, block range, and protection non-stacking.
- Party formation always includes 2 fighters, 1 wizard, 1 healer; no NPC belongs to two parties; class population caps are respected through recovery/training.
- Wood and silver eligibility/costs are verified. Arrow wall bypass at intelligence 5 is intentional, even though starting adventurers therefore avoid it.
- Spawns obey single-floor throughput, slime duration, slots, and attack budget. Policy edits cannot duplicate encounters or eject an active party.
- Full rest from stamina 0 to 10 takes 10 game hours at stamina level 1. Queueing, rest, empty reserves, and a complete party wipe cannot deadlock advancement.
- Tutorial restart at every step does not repeat grants or charges; fast track affects only floor 1.

### Experience and performance

- A new player completes guided setup and sees first admission within 8–12 minutes using only the explicitly offered tutorial/demo advances.
- Five floors are reachable; the fifth displays “Demo depth reached” and offers continued operation rather than another excavation purchase.
- Return report totals reconcile with the ledger and floor/research changes. Empty or quiet periods are explained without invented revenue.
- On representative iOS and Android devices, navigation and the selected-floor view target 60 fps; cull off-screen animation. Establish measurements in M3. Initial catch-up budget: 24 real hours within 2 seconds, 30 real days within 10 seconds; report measured results and optimize if missed.
- Screens support a small portrait phone and modern large phone, safe areas, screen-reader labels for controls, reduced motion, and readable non-pixel body text.
- Complete one force-close/reopen and one background/resume walkthrough on each native platform; browser preview alone is insufficient proof of mobile readiness.

## 13. Demo walkthrough for review

1. Create a dungeon; open office, hire three miners, queue three floors.
2. Boost only first-floor construction; choose traps/mobs/chests; explain stamina and add rest rooms.
3. Hire maintenance, set 1-gold admission and treasure funding, open the floor.
4. Follow a four-member party: admission → arrow-wall detection → fight → chest → rest. Inspect health, defense, stamina, and a worker task.
5. Trigger the low-level cohort; show training price 1 versus 5 and demand 9 versus 5.
6. Skip one real hour; show one game day of traceable progress and return report, then reopen to prove no duplicate reward.
7. Load the five-floor fixture to inspect the depth limit and optional upgrades. Explain that fixture loading replaces demo state and requires confirmation.

The first playtest should answer whether maintaining a profitable dungeon is fun, whether stamina creates understandable management decisions, and whether returning after time away feels rewarding. Tune content values after those observations; preserve the deterministic accounting and clock contracts.
