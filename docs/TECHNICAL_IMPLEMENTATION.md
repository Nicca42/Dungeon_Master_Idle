# Dungeon Master Idle — technical implementation specification

Companion to [the MVP/demo plan](./MVP_DEMO_PLAN.md). Updated 20 September 2026. Status: implementation specification; commands and interfaces below are proposed, not installed or tested application code. Gameplay formulas and balance defaults remain in the main plan.

Implementation update: the initial playable demo is implemented. This document remains the larger target architecture; the [README](../README.md) describes the actual installed stack, tested commands, and deliberate simplifications in the current build.

## 1. Selected frameworks and packages

Use a single Expo application with a framework-independent simulation directory. A monorepo, server, or separate game-engine runtime would add setup without helping the five-floor demo.

| Layer | Choice | Project responsibility |
|---|---|---|
| App | Expo + React Native + TypeScript | One mobile implementation with browser preview; strict type checking |
| Navigation | Expo Router | Four tab routes, root loading gate, character/floor detail routes |
| Native execution | Expo development build | Test the actual app identity, native storage, lifecycle, and assets |
| State | Zustand | Immutable published game snapshots, fine-grained screen selectors, controller status |
| Simulation | Plain TypeScript | Event queue, rules, seeded randomness, commands, accounting; no React/native imports |
| Runtime validation | Zod | Decode saved games, fixture data, and editable content; reject invalid input |
| Persistence | expo-sqlite | Two transactional native save generations and schema migrations |
| Browser persistence | localStorage | Small self-contained preview save, behind the same repository contract |
| Animation | react-native-reanimated | Presentation-only character travel, action cues, panels |
| Layout | React Native StyleSheet, safe-area-context | Shared spacing/color/type tokens, safe areas, accessible controls |
| Fonts/assets | expo-font, expo-asset | Bundled fonts and images available without network access |
| Optional polish | expo-audio, expo-haptics | Local sound effects, feedback; add in M5 only |
| Tests | Jest, jest-expo, React Native Testing Library | Pure engine tests and native component behavior |
| Randomized verification | fast-check | Generate clock partitions and command sequences; record failing seeds |
| Native E2E | Maestro | Tutorial and lifecycle flows on installed development builds |
| Web E2E | Playwright | Browser navigation, save/reload, screenshots, responsive layout |
| Developer tools | npm, ESLint, Prettier, Expo Doctor | Reproducible install, lint/format/type checks, native dependency checks |

Expo documents shared mobile/web setup and Reanimated integration. Zustand supports external stores and selective subscriptions; Zod supplies runtime validation. These are project selections based on those capabilities. [Expo setup](https://docs.expo.dev/get-started/create-a-project/), [animation](https://docs.expo.dev/develop/user-interface/animation/), [Zustand](https://github.com/pmndrs/zustand), [Zod](https://zod.dev/).

Use React Native views/images initially because only a few rooms and characters animate at once. Do not add Unity, Godot, Phaser, Skia, a physics engine, Redux, XState, an ORM, or server-query tooling to M0. Reconsider a custom renderer only if the measured scene performance in M3 misses its budget after culling and subscription fixes.

## 2. Bootstrap and developer environment

Use the Node LTS version supported by the chosen stable Expo SDK; record the exact version in `.nvmrc`, plus compatible `engines` in `package.json`. Keep npm as the sole package manager and commit `package-lock.json`. Install native packages through `expo install` so they match the SDK. Pin the working scaffold/SDK versions in the README after creation; never use `latest` in CI.

The current repository contains planning documents. Scaffold into a temporary sibling directory, inspect the generated files, then copy the app scaffold into this repository without replacing `docs/` or `.git/`. The following commands are the bootstrap recipe, not instructions to overwrite the existing workspace:

```sh
# Run from a temporary parent directory.
npx create-expo-app@latest dungeon-master-idle --template default
cd dungeon-master-idle

npx expo install expo-dev-client expo-sqlite expo-font expo-asset
npx expo install react-native-reanimated react-native-worklets
npx expo install react-native-safe-area-context
npm install zustand zod

npx expo install jest-expo jest @types/jest @testing-library/react-native --dev
npm install --save-dev fast-check @playwright/test prettier tsx

npx expo install --check
npx expo-doctor
```

Keep the generated Router, Metro, TypeScript, and ESLint configuration as the starting point. Follow the selected SDK's Reanimated setup; do not paste Babel configuration from another SDK generation. Use `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` in TypeScript. Install optional audio/haptics only when implementing their features.

Native tools: Xcode and an iOS simulator on macOS; Android Studio, SDK, and an emulator for Android. Use `npx expo run:ios` and `npx expo run:android` for local development builds, then `npx expo start --dev-client`. Use `npx expo start --web` for browser review. Expo Go is acceptable for early layout checks, but final lifecycle/storage QA uses a development build. [Development builds](https://docs.expo.dev/develop/development-builds/introduction/).

Define these project scripts during M0:

| Script | Command or task |
|---|---|
| `start`, `ios`, `android`, `web` | Expo development server / local native run / web preview |
| `typecheck` | `tsc --noEmit` |
| `lint` | `expo lint` |
| `format:check` | `prettier --check .` |
| `test` | `jest` with engine and UI projects |
| `test:ci` | `jest --ci --runInBand` |
| `test:web` | `playwright test` |
| `test:native` | `maestro test .maestro` against an installed app |
| `sim:benchmark` | `tsx scripts/benchmark-simulation.ts` |
| `sim:balance` | `tsx scripts/simulate-balance.ts` |
| `export:web` | `expo export --platform web` |

## 3. Boundaries and runtime ownership

```text
Screen / control
    → GameController.dispatch(command)
    → advance engine to command time → validate → apply command
    → SaveRepository.commit(snapshot)
    → publish immutable snapshot to Zustand
    → selectors → views and animation projection

App resume / timer / demo skip
    → the same serialized GameController → the same engine
```

`GameController` is the sole writer. Screens, audio, and animation callbacks cannot award gold, finish work, advance time, or mutate NPCs. Zustand is a publication/subscription layer, not a second simulation engine. Do not enable Zustand persistence middleware for authoritative game state; it would compete with the save repository.

Keep modules small and explicit:

```text
src/app/_layout.tsx                 boot/save recovery/catch-up gate
src/app/(tabs)/index.tsx            dungeon
src/app/(tabs)/build.tsx
src/app/(tabs)/research.tsx
src/app/(tabs)/office.tsx
src/app/npc/[id].tsx                character detail
src/app/floor/[id].tsx              floor detail
src/components/ui/                 Button, Panel, ResourceBar, Sheet
src/theme/                         colors, type, spacing, sprite scales
src/game/controller/               serialization, lifecycle, wall clock
src/game/engine/                   command reducer, scheduler, RNG
src/game/model/                    types and state schemas
src/game/systems/                  combat/work/rest/town/finance/research
src/game/content/                  balance and typed content definitions
src/game/persistence/save.native.ts SQLite adapter
src/game/persistence/save.web.ts    browser adapter
src/game/fixtures/                 reproducible scenario factories
src/store/                        snapshots and selectors
src/rendering/                    scene projection and sprite components
scripts/                          balance/benchmark/asset checks
tests/                            engine, UI, web flows
.maestro/                         native flows
```

Keep tests outside `src/app`, since Router treats that directory as routes. [Expo Router testing](https://docs.expo.dev/router/reference/testing/).

## 4. Engine contracts and deterministic scheduling

The following are interface sketches; expand the command/event unions as features land. IDs are stable ASCII strings generated from a saved counter, not timestamps. Store money as integer hundredths of a gold coin; time as integer game milliseconds; work as integer milli-work units. Round durations up to at least one game millisecond. Runtime validation must enforce safe integer bounds.

```ts
type GameMs = number;
type Money = number;

type Command =
  | { type: 'HireStaff'; role: 'miner' | 'maintenance' }
  | { type: 'QueueExcavation'; floor: number }
  | { type: 'SetEntryFee'; fee: Money }
  | { type: 'OpenDungeon' };

type CommandEnvelope = {
  sessionId: string;
  sequence: number;
  expectedRevision: number;
  command: Command;
};

type CommandError = {
  code: 'INSUFFICIENT_GOLD' | 'PREREQUISITE' | 'STALE' | 'INVALID';
  message: string;
};

type AdvanceResult = {
  state: GameState;
  processedEvents: number;
  reachedTarget: boolean;
};

// No platform APIs or wall-clock reads in these functions.
declare function advanceTo(
  state: GameState,
  target: GameMs,
  maxEvents: number,
): AdvanceResult;

declare function applyCommand(
  state: GameState,
  command: Command,
): { ok: true; state: GameState } | { ok: false; error: CommandError };
```

Use a binary min-heap keyed by `(dueAt, priority, entityId, sequence)`. Compare IDs by ASCII/code-unit order, not locale-sensitive comparison. Priority values implement the order in the main spec. Serialize queued event records as data; rebuild the heap on load. Each record includes a job/entity generation number so a cancelled or replaced job makes old events inert.

Use a small fixed, tested PRNG algorithm such as Mulberry32, with stored unsigned 32-bit state and known-output fixtures. Version the algorithm as part of engine versioning. Use seeded Fisher–Yates shuffles for class bags and party selection; never use random sort comparators. All candidate collections must be ordered by stable ID before sampling.

Successful commands clone or structurally share changed records; rejected commands consume no money, XP, or RNG draws. Engine handlers may mutate a private batch working copy for efficiency, but must never mutate a published or saved snapshot. Freeze snapshots in development to detect violations.

An event either advances a state machine or schedules future work. Idle/capped systems sleep until the relevant state changes; do not schedule one useless event per millisecond. Each action delay is positive. Detect repeated same-time non-progress and raise a reproducible engine error rather than freezing the app. A scheduling limit may split a batch, but must never drop events or declare an unfinished target complete.

Normal runtime wakes about four times per real second and advances to elapsed monotonic time ×24. This timer is only a wake-up mechanism: delayed timers do not lose progress. UI animation is independent and may run at display refresh rate.

## 5. Clock, catch-up, and command safety

Persist these clock fields: `gameNowMs`, `accountedWallMs`, and optional `catchUp` containing `fromWallMs`, `targetWallMs`, `startGameMs`, `targetGameMs`, and report baseline. `accountedWallMs` means the wall time fully represented by the snapshot, not the instant a file write occurred.

On resume:

1. Load and validate the newest complete snapshot.
2. If a catch-up is already pending, finish its fixed target first. Do not recompute its starting time or target on each launch.
3. Otherwise capture `targetWallMs = max(now, accountedWallMs)`, compute elapsed ×24, and persist the pending catch-up marker before processing.
4. Advance in batches initially limited to 250 events, checking elapsed processing cost between batches and yielding after about 8 ms. The processing budget controls responsiveness only; simulated results depend solely on event order.
5. Persist checkpoints approximately once per real second of lengthy processing. Save partial game state and the unchanged catch-up target together. Do not mark its wall interval accounted yet.
6. At completion, atomically save the final game state, set `accountedWallMs` to that target, clear the pending marker, and save the return report. Then account for additional time since that target before normal play resumes.

Native `AppState` and web visibility changes trigger pause/resume handling through one controller. Stop normal timer callbacks while catching up. A background event stops rendering and requests a flush; correctness must tolerate the OS killing the process before that flush completes. The previous complete snapshot will replay the unaccounted interval.

Commands queue behind advancement. Each UI action gets a session/sequence token; keep a session sequence high-water mark in the save. Apply, record the token, and save in one transaction. Repeated delivery returns the prior acknowledgement. Disable the initiating button until completion; stale form revisions return a refreshable error. On storage failure, retain the previously committed command state, pause new purchases, and show Retry. Routine time autosaves occur every five real seconds; important player commands save before displaying success.

Demo skips first account for ordinary elapsed time, then advance virtual time with a persisted `pendingDemoAdvance` target and command token. On restart finish that target once; it must not be counted again as wall time. The same chunking code handles both kinds of advancement. During tutorial setup, elapsed wall time is deliberately excluded until the opening command sets the first anchor.

## 6. Save schema, recovery, and accounting

Use a snapshot database, not one SQL table per NPC. The simulation is small enough to operate in memory; snapshots keep offline replay and save rollback straightforward.

```sql
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS snapshots (
  slot TEXT PRIMARY KEY CHECK (slot IN ('current', 'previous')),
  revision INTEGER NOT NULL,
  schema_version INTEGER NOT NULL,
  payload TEXT NOT NULL
);
PRAGMA user_version = 1;
```

The payload envelope includes `schemaVersion`, `engineVersion`, `balanceVersion`, save ID, revision, clock state, RNG, entity counters, all entities/jobs/events, command receipt metadata, tutorial grants, and report accumulators. SQL schema migrations and game-payload migrations are separate numbered sequences.

For a native write, use a serialized repository and Expo SQLite's exclusive transaction API: move the old current row into previous and insert the new current row using bound parameters. Publish command success only after commit. Keep all reads outside partial transactions. On launch validate current with Zod; if invalid, try previous and explain recovery. If neither is valid, preserve the files and offer a new demo rather than silently erasing them. A future unsupported save version must not be overwritten. [Expo SQLite API](https://docs.expo.dev/versions/latest/sdk/sqlite/).

For web, store `{current, previous}` in one localStorage value so each replacement is one storage operation. Validate both generations on read, catch quota/unavailable-storage errors, and avoid writing before hydration. Support only one active writer tab: use a Web Lock where available and disable saving/play in secondary tabs; when unavailable, enforce a single-tab demo with a visible warning and revision conflict checks. Do not claim multi-tab synchronization. Keep native-only imports in `.native.ts` files. Expo's web SQLite path has additional setup requirements, so the simple browser adapter is deliberate. [SQLite web setup](https://docs.expo.dev/versions/latest/sdk/sqlite/#web-setup).

Store balance configuration version with the save. Migrate explicitly when rules change; do not silently replay old saves under new rules. Fixtures pin engine/content versions and seed. A demo reset creates a new save ID after user confirmation and removes the previous active scenario's queued work.

Ledger entries contain sequence, time, source account, destination account, integer amount, and reason. Model explicit external sources/sinks for NPC stipends, hiring, and item sales. Keep the most recent 500 entries and 200 activity messages, plus cumulative per-category totals and report baselines; compact old entries into totals only after reconciliation. This bounds saves during long absences. Reports are differences of cumulative totals, not another rewards system; dismissing a report never awards income.

## 7. Systems translated into implementation tasks

| System | Implementation detail | Required edge-case fixture |
|---|---|---|
| Construction | Work orders reserve cost once, assign worker IDs, accrue integer work, reschedule when staffing/rest changes | All miners exhausted with no floor rest room |
| Floor lifecycle | Discriminated states: locked, excavating, foundation, furnishing, ready, open; separate pending policy | Policy changed with a party inside |
| Encounter layout | Generate bounded feasible counts first, reserve slots, then seed placement; preview uses a cloned RNG so opening UI does not change outcomes | Minimum traps exceed budget |
| Town | Class-bag index and RNG stored; arrivals, formation, admission, recovery are separate jobs | Healer cap reached and rejected party at queue head |
| Combat | Per-actor next-action time and reaction availability; defeat/retreat cancels stale actions through encounter generation | Last fighter falls while healer action is queued |
| Rest | Room reservations, FIFO queue, hourly recovery event; leave on target stamina | Staff and party reach a full room together |
| Maintenance | Unique task claim; completion revalidates trap/chest and available reserve | Two workers select one empty chest |
| Research | Typed prerequisites/effects; one active job; effect applied once by completion ID | Research completes during save/reload |
| Training | Daily demand counter, actor reservation, upfront payment, one completion grant | Course completes at the day boundary |
| Finances | Pure transfer function checks balances and records source/destination/reason atomically | Very small fee split over many visits |
| Tutorial | Persist step and granted reward IDs; gates inspect world invariants | Relaunch after charge but before next tooltip |

Three implementation clarifications discovered during the technical pass:

- The “rejected low-level cohort” must reach an admission check despite normal party formation excluding ineligible NPCs. Create it as an explicit scripted tutorial party, then dissolve it into training candidates after rejection.
- The town-work stipend runs at each game-day boundary for recovered, idle town NPCs; it is not paid on every return. This resolves the main plan's ambiguous “on returning … per game day” wording and prevents fast visits multiplying income.
- When a generated mob cannot fit even on an empty floor under the configured attack cap, show “Spawn budget too low,” pause that queue, and let a policy edit resolve it. Never reroll secretly or keep scheduling futile spawn attempts.

## 8. Screens and pixel rendering

Create shared components before styling individual screens: `PixelPanel`, `ActionButton`, `ResourceBar`, `StatRow`, `QuantityStepper`, `PriceSelector`, `ProgressRow`, `EntityCard`, `ConfirmDialog`, and `DetailSheet`. Use discrete steppers for integer counts and prices; percentage settings can use preset buttons plus integer input. Controlled form drafts stay local until Apply; preview selectors return cost, errors, and resulting budgets without changing state.

Use `Modal` plus a styled bottom panel for the initial detail sheet. Add draggable sheets only if needed after playtesting. All disabled actions explain their unmet prerequisite. Reuse engine validation messages so UI and simulation cannot disagree on affordability.

The cutaway is a vertically scrolling set of five floor panels. Each floor projects fixed route nodes to display coordinates; narrow phones horizontally scroll the floor scene rather than shrinking sprites below an integer scale. Town/office remain above floor 1. Render moving entities only for visible floors; off-screen floors show summary counts and progress.

Keep logical sprite size independent of simulation movement. Export manually cleaned pixel PNG frames from a sprite editor; use pre-scaled integer variants as the cross-platform fallback. Build an asset manifest with frame keys, dimensions, animation duration, and attribution. Frame changes are cosmetic; movement uses Reanimated transforms toward the authoritative segment endpoint. Resuming from a time skip snaps to the new state rather than replaying hours of animation.

Do not call React state setters on every animation frame. Update HUD selectors only when values change, memoize floor/character components by ID, and keep particle/sound effects capped. Render rest/construction progress from timestamps; never infer completion from a progress bar reaching 100%.

Use a single theme file: stone background, dirt foreground, brass/gold economy accents, cyan shields, red health, green stamina, plus text/icons for each. Bundle the pixel heading font with its license. Use system text for body copy and allow text scaling without breaking primary controls. Optional audio uses expo-audio, pauses in background, and obeys a persisted mute preference. [Expo Audio](https://docs.expo.dev/versions/latest/sdk/audio/).

## 9. Tests, diagnostics, and performance tools

Configure Jest projects separately: Node environment for pure simulation tests and `jest-expo` for UI/native module tests. Test adapters with real integration flows as well as mocked unit tests. React Native Testing Library checks interactions and accessibility labels. [Expo Jest setup](https://docs.expo.dev/develop/unit-testing/).

Use fast-check for the high-risk invariants: random partitions of the same elapsed time produce the same state; balances/resources stay nonnegative; random legal command sequences survive save/reload. On failure print seed, minimal command sequence, and content version. Use exact fixtures for formulas and tutorial grants; avoid snapshot tests of entire UI trees. [fast-check](https://fast-check.dev/docs/introduction/).

Maestro flows cover onboarding, admission, demo skip, kill/relaunch, and a maintenance backlog on iOS/Android development builds, addressed through stable `testID` values. Playwright covers browser preview, responsive screens, and localStorage recovery. Keep scenario loading behind a demo/test flag rather than exposing an unrestricted debug route in later production builds. [Maestro React Native support](https://docs.maestro.dev/get-started/supported-platform/react-native), [Playwright](https://playwright.dev/docs/intro).

`sim:balance` runs fixed seeds and reports treasury trend, visitor throughput, completed floors, rest time, retreats, unfilled chests, and staff utilization for 1/8/24 real hours. `sim:benchmark` measures 24 hours and 30 days at full five-floor population, including serialization and validation cost. Report event count and snapshot bytes alongside timing so optimizations can be assessed. Node measurements are preliminary; repeat catch-up timing on physical devices in release-like builds.

Add a debug panel with seed, game time, revision, event queue size, next event, processing ms, serialized bytes, and last save result. Persist only aggregate game metrics locally; no analytics service in this demo. Preserve a small reproduction export containing the save and version metadata when an invariant fails.

Target save payload under 500 KB per generation; log compaction is essential for the browser adapter. If full-scene rendering misses 60 fps, first inspect React render counts, off-screen animations, and image sizes. If catch-up misses its main-plan budget, profile event types, eliminate idle polling, and aggregate only mathematically equivalent recurring work. Never trade exact accounting for a silent offline cap.

## 10. Build pipeline and concrete milestone outputs

At M0 add a CI workflow specification, then enable it when a remote repository is configured. Each change runs `npm ci`, type checking, lint, formatting, engine/UI tests, and web export. Run Playwright against the exported bundle on UI changes. Native smoke tests run before each review build and after native dependency/config changes; a full cloud mobile build on every text edit is unnecessary.

Commit the package lockfile, app configuration, content definitions, fixture factories, test flows, and asset attribution. Ignore generated native folders when using Expo's generated-native-project workflow; if native customization later becomes necessary, explicitly change that policy. Use local simulator/emulator builds first. EAS preview distribution is optional later; physical iOS distribution needs appropriate signing. No hosting or store publication is part of this planning update.

| Milestone | Concrete engineering outputs |
|---|---|
| M0 | `package.json`, lockfile, app config, strict TS/lint/test configs; four routes; theme; fixture picker; README setup |
| M1 | `GameState` schema, RNG fixtures, heap, `advanceTo`, command controller, save adapters, migrations, clock tests, ledger tests |
| M2 | Construction/research/rest handlers, validated content tables, Build/Research views, first-floor boost invariant |
| M3 | Town/party/encounter/maintenance handlers, scene projection, first complete visit, initial device performance recording |
| M4 | Idempotent tutorial, Office controls, training, return reports, five-floor fixture, core Maestro/Playwright flows |
| M5 | Clean pixel assets, animation atlas/manifest, reduced motion, audio/haptics if retained, visual QA screenshots |
| M6 | Balance report, long-absence benchmark, interrupted-save tests, per-platform smoke results, review build instructions |

First coding session: scaffold and validate all three targets; create routes/theme; define validated initial state and two deterministic engine events; prove 1 real hour maps to 24 game hours; persist/reload that state. The next session connects one construction command and one paying party. This sequence proves the architecture before the full content set is added.
