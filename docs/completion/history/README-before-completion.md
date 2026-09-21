# Underkeep

A playable, locally saved dungeon-management demo. Built with Expo 57, React Native, TypeScript, Expo Router, Zustand, Zod, SQLite, and original pixel-style SVG artwork. It runs in a browser and includes shared iOS/Android application code.

## Run the demo

```sh
npm ci
npm run web
```

Open the URL printed by Expo. The default is `http://localhost:8081`.

Follow **The first descent** guide to open the office, hire workers, build the first floor, fund treasure, and admit adventurers. Use **Demo controls** to skip 5 minutes, 1 hour, or 8 hours of real time. One real hour advances one game day. A ready-to-play scenario is available in the same menu.

Use **Build** to develop and open floors, **Research** to unlock upgrades, and **Office** to adjust prices, allocate treasure funding, and inspect staff. Tap a floor or adventurer for details. Five floors start unlocked; repeat Dungeon depths research to unlock five more at a time, up to 50.

Research has six categories: Traps, Dungeon depths, Finance, Staff investment, Adventurer attractions, and Treasure. Better Building is shared between two categories and queues real builder work from the deepest furnished floor upward. Staff stamina management unlocks a percentage rest threshold. In Headquarters → Adventurers, buy extra spawn points and upgrade them to level-two arrivals. Silver chest statistics derive from wood at 2×, and gold derives at 4×. Better basic traps upgrades trap doors and mimics to 10–20 damage; their attack cap must reserve at least 10 per upgraded trap. Beginner stealth research caps at 10; upgraded trap doors require perception 20.

The browser saves to localStorage. Native builds save to SQLite. No account, backend, payment service, or network connection is needed after the application and assets have loaded. Keep one browser tab open per dungeon; a Web Lock prevents simultaneous writers where supported. Private browsing or clearing site storage can remove a browser save.

## Native development

Use a supported Node LTS version for the installed Expo SDK. This workspace was installed and checked using Node 25.8.2 / npm 11.11.1; those are the tested local versions, not a requirement to adopt a non-LTS Node release.

```sh
# Requires Xcode and an iOS simulator on macOS:
npm run ios

# Requires Android Studio, the Android SDK, and an emulator/device:
npm run android
```

These commands compile and launch native development builds. Device signing may be required for a physical iPhone. Native JS/Hermes bundle export was checked for both platforms; a bundle export is not proof of successful device installation. Xcode/Android emulator testing has not been performed in this workspace.

## Checks

```sh
npm run typecheck
npm test
npm run benchmark
npm run export:web
npm run export:native
```

Original version-one saves migrate additively to the new rules, retaining treasury, clock, actors and progress.

The engine suite uses Node's test runner with `tsx`, keeping the basic demo's test tooling small. It covers tutorial costs, legal parties, deterministic idle progress, save round-trips, shield/healing formulas, training, resource invariants, floor sequencing, five-floor expansion, pooled checkpoint fees, FIFO rest, abandonment, healer recovery, lost XP, policy budgets, and save migration.

Reusable Playwright regression flows are included for desktop and a 390-pixel phone viewport:

```sh
npx playwright install chromium
npm run test:web
```

These automated browser tests are provided but were not executed during implementation. The tutorial, first-party admission, real return-from-away report, time skips, saved fee changes, research completion, opening floors, and desktop/phone layouts were exercised through the in-app browser. No browser runtime errors were reported in those flows.

## What works

- Ten-step setup tutorial opens the corresponding settings before applying each action. Nine guided floor-setting tips introduce XP, traps, caps, mobs, treasure and rest while retaining the full menu, dimming other controls and outlining the relevant section. The final furnish action sits immediately below the tip. Opening spawns one fighter; the last tutorial step spawns the rest of the first party for free. Hiring requires three individual digger clicks and three individual maintainer clicks. Queue three excavations individually for 5 gold each. Purchase the first rest room for 5 gold; rooms are not auto-created by furnishing. The first-floor-only fast track is retained. The dungeon page uses a compact resource bar and shows its welcome heading for five seconds on launch/resume.
- Red health bars with blue defense bars above them, moving diggers, rest-aware excavation estimates, smooth countdowns, and a clickable purple research progress banner.
- A day/night pixel village, top-left game clock, five-floor bordered group, paired cave entrances, directional movement, action comparisons and opening-lock animations. Wide screens use three equal-width columns.
- Three initial diggers and three initial maintenance workers with work/rest cycles. Diggers use purchased rest rooms until fully recovered, and the yellow “Diggers inactive” alert links to the next-floor excavation button. Headquarters has Overview, Staff, and Research pages, with 15-gold maintainer and 10-gold digger hiring buttons. A headquarters exclamation mark offers an extra maintainer when the crew is occupied and a reset job is waiting.
- Shared counts and attack/defense/treasure budgets, read-only floor health/defense, research-gated level-two upgrades, monsters with a 20% escape chance at each exit approach and patrols within the exit-side third after a failure, spawn timers, and maintenance stamina/work indicators.
- Autonomous parties with two fighters, a wizard, and a healer minimum; population caps and seeded selection. Town spawns show a countdown. Parties walk from town into the surface cave before entering floor one.
- Escaped mobs attack waiting maintainers and headquarters. Incoming parties can defeat them; losing all 100 headquarters health ends the game and exposes a restart button.
- Shield-first combat, healing, stamina and training; per-stat XP banks at floor exits and charges up to one pooled-party gold per stat gained. Wipes/exhaustion discard unbanked XP.
- Mandatory end-floor rest doors with configurable capacity, FIFO partial-party admission, six-hour abandonment complaints in Office, and full-stamina/healing departure checks. Increasing capacity admits waiting members immediately; rested members wait outside for their whole party. Rest-healing XP waits for the next floor checkpoint.
- Two free excavation spells are included in both new and migrated saves. Cast them from Staff → Diggers on a queued or excavating floor whose predecessor is furnished. They finish digging only; foundations and furnishing still take time and block the following floor.
- Local ads research costs 20 gold and takes four game hours. It unlocks two extra adventurer spawn points at 25 gold each. Each adds one arrival attempt per game hour and ten population slots (60 → 70 → 80), retaining the class mix.
- Looted chests become inactive and use gray open-chest artwork until refilled; triggered traps gray out until reset. Detected traps stay armed when avoided. Failed chest attempts explain skill/stamina requirements in the ledger. Mimics show pink tentacles in combat and self-reset one game hour after defeat, without maintenance. Mob spawners keep timers and ghost creature previews while occupied or capped; town points preview their next class.
- Admission fees, treasure reinvestment, reserve transfers, training prices/demand, and research. Headquarters has a dedicated Finances page with a four-step tutorial guide.
- Staff has separate Diggers, Maintainers and Adventurers pages. The live monster limit is adjustable separately from nest count (0–30). Transferred mobs count on their destination; reaching the cap shows yellow, exceeding it shows red, and spawning pauses until below the cap. Mobs pursue the nearest party in either direction and ignore maintenance staff, including on the surface.
- Staff → Adventurers hires blue-jacket headquarters defenders. Each earns 1 gold per active game hour, accrued in five-minute portions without a hiring fee. Threatened patrol duty uses one stamina per hour; attacks use one stamina. In calm conditions guards regain one stamina per two hours outside beds. Parties awaiting rest beds recover at that rate when no mobs are near the rest area and can continue once fully recovered. Exhausted defenders take available beds in the first dungeon rest room and recover one stamina per game hour without pay. They wait when the room is full; recovery requires a purchased room. If wage funds run out, they stand down and retry after an hour. Yellow warnings flag an entirely resting guard; red warnings forecast escaped-mob combat using current defenses, stamina and headquarters health, without assuming future hires or arrivals.
- Countdown labels use HH:MM (game hours and minutes); world clocks show hours with AM/PM. Character movement interpolates between steps and sprites are 10% larger.
- Persisted idle progression, time skips, return reports, two-generation save recovery, and resumable catch-up checkpoints.

## Deliberate basic-demo simplifications

The planning documents describe a larger MVP. This build implements its playable core with these explicit limits:

- The engine advances in deterministic **five-game-minute steps**, with excavation work every tick and hourly maintenance/recovery/spawn systems, rather than a general event heap. Actor speed is displayed but does not yet change action timing. The x24 clock and offline equivalence are implemented. Excavation throughput scales linearly with active diggers (six diggers are twice as fast as three). Three rested diggers take 10, 15, 22.5, 33.75 and 50.625 real minutes to excavate floors 1–5; Faster Digging halves these durations. Queueing, resting, foundations and furnishing add time.
- Floor layouts start with a default encounter order and exact counts. Edit floor layout supports drag-and-drop ordering and accessible move buttons on empty floors. Group encounter changes apply immediately to empty built floors and wait for occupied floors to empty. Budgets can reduce installed trap strengths or chest capacities. Floor health/defense are set by the floor level. Attacks deal max(0, attack − defense) structural damage, clamped at zero health; there is no collapse mechanic in this demo. Maintainers repair one health per stamina.
- Each floor has one end-of-route rest room. Each additional bed costs 5 gold and increases shared capacity by one. Its shared group capacity defaults to 10; legacy rest-spot counts describe construction, while the room-capacity setting controls actual admission. Parties do not physically pathfind around each other. All floors run left to right, with gray entry/exit signs until opened. Dirt excavation and foundation construction reveal their backgrounds with work progress. Maintainers walk to the exit after completing a job, then wait on the surface. Rest doors open an occupant list with game-time HH:MM stamina estimates. Cave arrival and action animations interpolate between simulation checkpoints. Onward caves appear only when the destination is furnished; their signs stay gray until it opens.
- Combat supports fighter attacks/basic interception, wizard attacks/chest manipulation, and healer health/shield restoration. Full positional blocking and wizard protection reactions remain future work. Action XP covers primary skill, damage, health, defense, stamina, speed and intelligence; learning rate changes through training. Wealth changes through transactions.
- The first three floors receive tutorial-subsidized foundation/furnishing work after their initial fees. Floors four/five use a 45-gold bundled development price, including three rest spots.
- Better Building increases foundation work time for novice builders and unlocks the level-two structural upgrade. Equipment is converted into treasury or reserve gold, rather than becoming inventory items.
- Training is restricted to adventurers below the first-floor door level. The admin overview sets a maximum of zero to three courses per person (default three); adventurers stop training as soon as they qualify. There are no bosses, merchants, race modifiers, audio, cloud saves, monetization, or live services.
- The activity ledger is a bounded recent-event feed with cumulative totals, not an exportable double-entry accounting database. Sprite bounce uses React Native Animated; Reanimated is installed for the Expo dependency graph and future richer movement.

## Project layout

```text
app/                    Expo Router routes and root lifecycle
src/components/         Responsive screens, controls, pixel artwork
src/game/               Typed state, balance data, pure simulation, controller
src/persistence/        Zod save decoding, native SQLite/web localStorage
src/theme/              Colors and fonts
tests/engine.test.ts    Deterministic simulation tests
tests/web/              Playwright flow definitions
scripts/benchmark.ts   Long-absence timing and save-size check
docs/                   Original gameplay and technical plans
```

`src/game/engine.ts` is independent of React and native APIs. `src/game/store.ts` serializes mutations and persistence, and publishes committed state to the UI. Save payloads contain the RNG state, next simulation boundary, NPCs, jobs, floors, counters, and clock anchor. Pending catch-up targets are persisted so a relaunch resumes the unfinished interval instead of awarding it twice.

See [the gameplay plan](docs/MVP_DEMO_PLAN.md), [technical plan](docs/TECHNICAL_IMPLEMENTATION.md), and [asset attribution](assets/ATTRIBUTION.md).

New floors furnished by diggers require a one-time 5-gold traps & treasure order. Maintainers install each fixture for one stamina and one game hour; opening is blocked until every installation is finished. These controls sit in the floor center. The tutorial first floor retains its scripted setup, and existing saves keep their already-installed encounters. Excavation progress is shown beside each floor name.

While the app is visible/active, adventurer arrivals and research earn progress at twice their normal rate. The world clock, construction, combat and staff rates are unchanged. Background/offline catch-up and demo time skips run at normal speed. Visibility transitions settle elapsed time before switching rates; resumable catch-up checkpoints retain their original rate. Closed, newly installed wood chests use brown wood grain even before stocking; opened chests remain greyed out until refilled.

Adventurer cards show current activity and their next intended action before the skills. Empty layout slots offer an unlocked fixture picker; adding fixtures preserves existing floor resources and queues maintenance installation. Destroyed nonliving fixtures show a pulsing red silhouette until maintenance replaces them for one stamina; living mimics retain their self-reset behavior.

The **Art** tab offers five previews each for open coffins, slime pools, zombies, fighters, wizards, and healers. Choose one design per spawner and three per character category, then apply each selection. Selected character looks cycle on new spawns with ±20% outfit saturation; their appearance persists across reloads and is shared by scene sprites and mini portraits. Existing characters keep their appearance. Empty treasure chests retain their material color with raised lids. Rest-complete members are summarized above the next-floor entry (three party counters, then “4+ parties waiting”), capped spawn clocks are yellow and pulse when ready, and trap sprites open live stat panels.

Town spawn points take turns across the shared arrival cycle (two points every 30 game minutes; three every 20, before the active-play bonus). Monster nests are phased across open floors, with equal-rate nests evenly spaced and slower nests offset between faster ones; capacity and attack caps still apply. Mobs return to the exit patrol area when their targets leave. **Basic Adventurers Guild** research (15 gold, two base game hours) builds a recruitment stand and prioritizes the missing roles in an eligible waiting party, respecting class/population limits. Silver and gold Deep stats controls edit their linked wood baseline and immediately update existing fixtures while retaining their 2×/4× ratios.
