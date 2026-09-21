# Underkeep production research: combat, persistence and performance

Research date: 21 September 2026. Scope: the completed Expo/React Native demo in this archive. Sources were opened directly; links are primary engine/platform documentation or the original technical author's work. This is a design recommendation, not a completed production implementation. There is no single industry-standard RPG damage formula, database schema, or idle-game tick rate. The useful standards are reproducible rules, explicit effect ordering, durable state transitions and measured resource budgets.

## Recommended direction

Keep the TypeScript simulation and Expo shell for the next iteration. First modularize the existing rules without changing outcomes, strengthen save durability, and measure a sustained busy 50-floor scenario on real devices. Use SQLite on native and migrate substantial browser saves to IndexedDB. Separate simulation work from rendering and add viewport-based scene culling. Prototype a sprite atlas or GPU scene layer only if release profiling identifies SVG composition as the bottleneck. Do not buy an engine migration before obtaining those measurements.

The completed demo already has seeded randomness, pure simulation functions, integer money, fixed ticks, exact maintenance deadlines, resumable catch-up, typed configuration and regression tests. Preserve them. The weakest boundaries are the large engine module, global policy/template state, full-world cloning at rule transitions, synchronous browser serialization, a separate baseline commit, UI work proportional to all floors, and forecasts executed on the same JavaScript runtime as interaction.

## 1. Combat calculations

### A. Separate attributes, effects and presentation

Epic's Gameplay Ability System separates attributes, immutable effect definitions, runtime effect specifications, custom execution calculations and cosmetic cues. It supports instant/duration effects and explicit stacking policy. That is a useful architectural precedent, not a reason to adopt Unreal for this game. [Epic: Gameplay Effects](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-effects-for-the-gameplay-ability-system-in-unreal-engine).

Apply this idea in TypeScript:

```
ActorDefinition -> base ratings and class
ActorState      -> current pools, XP, statuses, cooldown deadlines
AbilityDefinition -> cost, target rule, coefficients, effect order
CombatEvent     -> stable ID, time, source, target, actual deltas, reason
PresentationCue -> derived icon/animation; never changes gameplay
```

Extract a resolver from `engine.ts`; start by reproducing the existing output exactly. Specify this order: target eligibility → resource affordability → target selection → compute attack → interception → defense absorption → health loss → death → actual-use XP → structural effects → loot/checkpoint consequences. A successful zero-damage block must not be logged as health damage. Emit a death once. Use integer minor units for currency and explicitly defined rounding for every quantized resource.

**Current model to preserve:** defense is a depletable second health pool. It is not passive armor or probability to hit. A 20-power strike against 10 defense and 10 health removes ten of each. Without healing, regeneration or interference, `ceil((health + defense) / power)` estimates repeated equal-power strikes to defeat the target; multi-actor initiative changes the actual result.

### B. Compare balance models before changing one

These are analytical options, not claims that one equation is mandated by the industry:

| Model | Example equation | Behavior and suitability |
|---|---|---|
| Demo's shield pool | absorb = min(shield, D); HP loses residual | Legible, deterministic; fits attrition and paid rest. Recommended for next prototype. |
| Flat armor | damage = max(minDamage, D − armor) | Easy but creates hard breakpoints and trivializes many small hits; minimum damage requires a deliberate rule. |
| Saturating mitigation | damage = D × K/(K + armor), K > 0 | Smooth scaling; armor K halves incoming damage. Requires a separate armor rating and one rounding policy. |
| Hit roll + damage roll | hit probability × damage distribution | Adds uncertainty and misses; increases balancing variance and makes idle feedback less predictable. |

For the saturating example, armor 0/K/3K gives 100%/50%/25% damage. This follows algebraically; it is a proposed experiment, not the archived formula. Do not reinterpret existing blue defense values as armor without a versioned migration and a player-facing explanation.

With crit probability `p` and multiplier `c`, expected crit multiplier is `1 + p(c − 1)` when other factors are independent. It helps compare DPS, but expected damage alone does not predict death chance against discrete health thresholds. Measure time-to-kill distributions, one-shot rate, party attrition, rest demand and net earnings over seeded encounters. Healing, shielding and resource exhaustion require simulation rather than a single DPS quotient.

Keep the current formula for now. The more urgent balance question is whether primary-resource drain, room throughput and checkpoint income produce satisfying decisions. A five-minute reset base is now much shorter than installation: field-test staffing shortages before raising trap damage.

### C. Make scheduling explicit

The demo ticks every five game minutes and resolves selected deadlines between ticks. Rendering must never determine the number of attacks. Fixed-step simulation plus interpolation is a well-established solution to frame-rate-dependent behavior; Fiedler also explains why unbounded catch-up can create a feedback loop of ever-increasing work. [Gaffer: Fix Your Timestep](https://gafferongames.com/post/fix_your_timestep/).

Do not switch this idle simulation to 60 rules updates per second. A suitable future hybrid is a deterministic event queue ordered by `(gameTime, priority, sequenceId)`, with fixed ticks retained where helpful. Candidate event types: travel arrival, attack, reset completion, rest admission/recovery, spawn attempt, research completion, checkpoint. Specify same-time ordering once, including whether a maintainer can reset before a party reaches the trap. Bounded cooperative processing should stop at a wall-time budget and resume without skipping world events.

For maintenance, separate travel and work, preserve completed fraction, and version the reset formula. The current `trunc` step rule intentionally changes duration only at complete five-point differences. A smooth alternative is proportional interpolation; it is a future balancing choice, not an unannounced fix. Preserve the 20% minimum-time clamp and no-double-charge installation resume rule.

### D. Randomness and balance harness

Use explicit seeded RNG streams for combat, spawning and cosmetic appearance. Saving only one shared seed makes unrelated additions alter subsequent combat rolls. Do not replace the existing generator inside old saves without a version rule. The PCG author documents reproducibility and independent streams as design properties; this supports considering a well-specified generator, not claiming PCG is required or cryptographically secure. [PCG](https://www.pcg-random.org/).

Build a headless balance harness using the real resolver. Sweep seeds, floor tier, party composition, resource pools, encounter density, rest beds and staff. Initially compare at least 1,000 seeds per configuration, then increase samples until the uncertainty of the chosen metric is useful. Proposed outputs: median/p95 completion time, death and abandonment rates, time spent waiting, consumable-resource depletion, gold by source, staff utilization and install/reset queue age. Preserve failing seeds as regression fixtures.

The current finance forecast averages three future seeds over 24 game hours. Label it a scenario estimate. For a production chart, run more trials in a worker, show percentile bands, and record assumptions about active-play multipliers. Never use a chart forecast as authoritative currency accounting.

## 2. Storage and save architecture

### A. Current design and concrete gaps

`index.web.ts` stores a JSON envelope containing two serialized generations. It parses the outer envelope before entering the fallback block; malformed outer JSON cannot recover from the inner previous record. Writes synchronously parse/validate/stringify existing state. `index.ts` uses SQLite WAL and an exclusive transaction to rotate current/previous snapshots. Baseline is a separate write in both adapters, so termination between baseline and state persistence can leave mismatched revisions. The serialized controller is valuable, but does not make separate database operations one atomic commit.

Recommendations for a successor save envelope:

```
schemaVersion, rulesVersion, contentVersion, revision
worldTime, wallAnchor, savedRngStreams
currentState, configRevision/configSnapshot
pendingCatchUp { targetGameTime, targetWallTime, activeRateMode }
checksum, createdAt
```

A checksum detects accidental corruption; it is not anti-cheat. Retain a last-known-good validated snapshot and a small bounded command journal. Do not retain an unbounded history of every animation or movement frame. Put configuration revision and world state in the same durable transaction. Adopt explicit ordered migrations with golden fixtures, rather than relying indefinitely on optional field defaults.

### B. Browser: IndexedDB for world state

Web Storage operations are synchronous. IndexedDB provides asynchronous, transactional structured storage; these properties make it a better fit for a growing save and history workload. Keep tiny preferences in localStorage if convenient. [MDN: Web Storage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API), [MDN: IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API).

MDN documents approximately 5 MiB for localStorage per origin and quota exceptions; IndexedDB quotas vary by browser/device, and best-effort data may be evicted. Request persistent storage where appropriate, report quota failures, and offer a user-controlled export/import. Persistence permission is not a substitute for backups. [MDN: quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

Migration plan: read/validate the old key → write state, baseline and metadata in one IndexedDB transaction → read back and validate → mark migration complete → keep the original key until a later confirmed cleanup. Fault-inject each boundary. Preserve single-writer ownership; define a fallback if Web Locks are absent. On failure, keep the last valid world and present retry/export, rather than silently resetting.

### C. Native: retain SQLite, improve the commit boundary

WAL allows readers and a writer to proceed concurrently, but does not create unlimited concurrent writers. Checkpointing is part of its lifecycle. Keep one serialized write path, short transactions and a bounded history; do not persist each displayed timer update. [SQLite: WAL](https://www.sqlite.org/wal.html).

Expo documents `withExclusiveTransactionAsync` for isolating operations inside the provided transaction callback, and warns that the nonexclusive async transaction can include concurrent queries. The archive already uses the exclusive variant for save rotation. Extend that transaction to include baseline revision and any journal record. It is not supported on web, so share the repository contract, not a blind adapter implementation. [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/).

SQLite's atomic-commit guarantees depend on its journaling/storage assumptions; they do not validate a game's semantic invariants. Test both interrupted writes and valid-but-inconsistent worlds. For a live native export, use a supported backup/export path; do not copy only the main `.db` while WAL changes may still be outstanding. [SQLite: atomic commit](https://www.sqlite.org/atomiccommit.html), [SQLite: backup API](https://www.sqlite.org/backup.html).

Initially retain snapshot blobs. Normalize entity/ledger tables only when measured save size, query cost or migration needs justify the complexity. A 50-floor game does not automatically need a network database, event-sourced backend, Redis, or one SQL row per animation.

### D. Clock trust and optional cloud

Use a monotonic clock for in-session elapsed-time measurements; wall time is needed across app restarts. `performance.now()` is monotonic, unlike adjustable `Date.now()`, but sleep behavior varies across platforms. Reconcile lifecycle transitions rather than assuming either API alone solves offline timing. [MDN: performance.now](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now).

For this local demo, document that clock edits and save edits are possible. If a later product adds competitive rankings or purchased currency, calculate authoritative rewards on a server from versioned commands/time and make retry IDs idempotent. Unity describes server authority as moving trusted rules and validation away from client-controlled execution. This is an optional product boundary, not a reason to force accounts into the finished demo. [Unity: server authority](https://docs.unity.com/en-us/cloud-code/server-authority).

## 3. Performance and asset handling

### A. What the measurements actually show

The fresh `scripts/benchmark.ts` run is in [verification/benchmark.txt](verification/benchmark.txt). On this host, while browser tests were also running:

| Existing benchmark | Result |
|---|---:|
| 1 real day / 24 game days | 1,100.1 ms; final state JSON 208,601 bytes |
| 30 real days / 720 game days | 16,410.9 ms; final state JSON 240,721 bytes |
| Between-tick full-copy microbenchmark, median / p95 | 0.0921 / 0.3134 ms |
| Shared-reference path, median / p95 | 0.000291 / 0.000375 ms |

These are single host runs and microbenchmark timings, not mobile FPS or guaranteed latency. State bytes exclude the outer save envelope, second generation, string escaping and storage encoding. The fixture has the same admissions/income at both horizons; it is not a sustained maximum-load scenario. The synchronous benchmark excludes the controller's per-day writes/yields and UI paint, so it is not complete user-visible offline-load time. Historical 33/153 ms figures in the old audit are obsolete for this snapshot.

### B. Preserve the correct separation

React Native distinguishes JavaScript-thread and UI-thread performance, recommends release-build profiling, and gives roughly 16.67 ms per frame at 60 Hz. Native-driven transforms can continue without calculating each frame in JavaScript, but this does not make expensive state work free. [React Native performance](https://reactnative.dev/docs/performance).

Maintain these existing choices: simulation independent of React, 250-ms presentation clock, one-second state synchronization, five-second periodic persistence, memoized art, integer money, and movement interpolation. Improve them in this order:

1. Instrument tick phases, cloning, schema validation, serialization, persistence, forecast, React commits and rendered SVG-node count separately.
2. Build transient indexes once per simulation step: actor by ID, party membership, occupants per floor, claimed maintenance jobs. The engine repeatedly scans arrays and performs nested lookups. Avoid serializing redundant indexes; rebuild or invalidate them consistently.
3. Publish narrow selectors/stable identities so one timer does not rerender every floor. The current scene receives a changing world and renders all groups.
4. Cull offscreen scene rows and suspend their cosmetic loops. Fixed 146-unit geometry makes viewport range calculations practical. Keep simulation active for invisible floors.
5. Move expensive forecasts and offline chunks off the browser UI thread. Exchange coarse snapshots/deltas, not the full world every animation frame.
6. Only then benchmark a different rendering layer.

Virtualized lists offer a tradeoff between responsiveness, blank regions and memory. Fixed item dimensions and memoized row components help, but apply virtualization to the actual scroll structure; putting a virtualized list inside the existing full-height transformed scene is not enough. [React Native: optimizing FlatList](https://reactnative.dev/docs/optimizing-flatlist-configuration).

Web Workers run separately from the main thread and communicate through messages; cloning large payloads can still cost time. Use a worker-owned simulation/forecast with revision-tagged responses, cancellation and bounded messages. Browser workers are not a drop-in React Native native runtime API; implement and benchmark a separate native execution strategy or cooperative chunks there. [MDN: using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers).

### C. Assets

The current original SVG sprites are compact, editable and share palettes across portraits and scene actors. Keep authoritative appearance as `(kind, variant, outfitTier, saturation)`; do not generate new geometry or encode images every tick. Persist the selected variant, not a random redraw result. Cache bounded palette variants rather than building an unbounded cache of arbitrary floats.

A measured alternative is an offline-generated pixel atlas: stable frame IDs, nearest-neighbor sampling, transparent padding to prevent texture bleed, and baked common color variants or a small palette shader. Draw visible instances in batches. Keep native/DOM text and controls for accessibility. Tradeoffs: fewer drawable objects, but texture memory, atlas tooling, scaling and tint behavior must be tested. Converting every asset to a bitmap without profiling is not inherently an improvement.

Another option is a GPU-backed scene while retaining Expo navigation/menus. Evaluate startup, memory, input hit testing, snapshots, accessibility overlays and low-end Android behavior. A full Unity/Godot rewrite is justified only by requirements such as substantially richer animation, physics or content tooling—not by the word “game” alone.

### D. Performance acceptance plan

Proposed project targets below are engineering budgets to validate, not industry guarantees:

| Measurement | Initial acceptance target |
|---|---|
| Visible scene | Stable 60-Hz presentation on selected mid-tier device; track p95/p99 frame time |
| Menu response | p95 under 100 ms during ordinary simulation |
| Scheduled foreground work | Short chunks, initially 4–8 ms JS budget before yielding |
| Cold load and one-day catch-up | Measure p50/p95 on devices; agree threshold after first baseline |
| 30-day catch-up | Progress/cancellation and no lost/duplicated rewards; bounded memory |
| Saves | Fault-injection passes; no acknowledged command lost across tested crash boundaries |
| Long run | No continuing memory growth after entity/history retention stabilizes |

Test 5/25/50 active floors; low/default/high configured population; no arrivals; all beds full; all spawners capped; mass fixture resets; interrupted installs; three spawn points; upgraded parties; and the Stats forecast open. Run 1 hour, 1 day and 30 days offline. Include app background/foreground, suspended process, backward/forward wall-clock changes and low storage. Capture build mode, device/OS, battery/thermal state and scenario seed. Android vitals covers stability and performance signals such as crashes, ANRs and slow sessions; release monitoring complements controlled tests. [Android game vitals](https://developer.android.com/games/optimize/vitals).

## 4. Prioritized successor work

| Priority | Work | Completion evidence |
|---|---|---|
| P0 | Freeze/replay combat and economy outcomes; extract resolver | Golden seeded scenarios match archived behavior |
| P0 | Transactional config+save revision; robust malformed-envelope recovery; export/import | Crash/corruption/quota and migration tests |
| P0 | Lifecycle clock policy and chunk-equivalence tests | Offline = uninterrupted outcome, including resets and XP |
| P1 | Separate per-group configuration; stable rule/content versions | Different floor groups behave independently; old saves migrate |
| P1 | Indexed lookup caches, narrow state subscriptions, viewport culling | Profiled reductions under the busy 50-floor scenario |
| P1 | Worker/cooperative forecast and catch-up | Responsive menus while processing long absences |
| P1 | Combat/maintenance/rest balance harness | Reproducible distributions and retained failing seeds |
| P2 | Atlas/GPU scene experiment | A/B release benchmarks beat SVG on agreed targets |
| P2 | Optional cloud authority | Only if competition/purchases/cross-device sync require it |

Do not silently replace the demo archive with this successor. Start a new development copy, preserve the frozen rules for replay, and version intentional balance changes separately from refactors.

## Source and evidence notes

All linked web sources above were accessed on the research date. The Expo/React Native “latest” documentation may describe a newer version than the lockfile; check the installed API before implementation. Community wikis/search snippets were not used as authority for combat formulas. The recommended formulas, event ordering, data model, test matrix and work priorities are this report's analysis of the local code. No claim is made that the proposed architecture has been implemented or benchmarked.
