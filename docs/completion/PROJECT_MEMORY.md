# Project memory and handoff

Demo declared complete by the owner on 21 September 2026. This document is durable project-local memory, not an external account memory or a request to keep working automatically.

## Decisions to preserve

- Name: Underkeep. Pixel-style 2D, Expo browser demo with shared native code. Minimize follow-up questions; make routine implementation choices and verify them.
- Keep the current save unless a fresh reset is explicitly requested. Reload is not reset. Browser tests use isolated storage. A source archive does not capture localStorage.
- Final floor order TOP → BOTTOM: inline level/counters/status; centered fixture information; resource bars; actors/fixtures. Fifteen equal columns; fixed doors/rest room. Every label group centered within its column and row.
- Background pillars and bricks extend behind information. Undug floors are dirt. Blue defense sits above red HP. Timers are HH:MM game time; clock uses AM/PM.
- Full document reload matters: the live in-app tab repeatedly retained an older visual tree even though isolated browser tests loaded current code. Compare the actual tab, reload without clearing saves, then verify. Do not repeatedly redesign correct code to compensate for a stale preview.
- Demo settings is the sole home for time skips/reset/fixture demo shortcuts/art options. Art defaults and selection order are in `src/game/appearance.ts`; portraits and scene sprites must match.
- Maintainers interrupt installs for unclaimed resets when they have stamina. Store partial progress on the fixture, charge installation once, preserve through reload. Reset ring/countdown belongs in the fixture-information slot.
- Staff rest is separate from adventurer rest. All occupant menus collapse by default. Buttons show icon, job/class, name. Staff capacity upgrade remains visible.
- Spawn caps govern spawning only. Guild forms parties from eligible backlog regardless of cap. Eligible unpartied visitors wait forever. Ineligible arrivals leave immediately; do not reintroduce timeout despawning for eligible visitors.
- XP banks at checkpoints for adventurers, at office rest for staff; UI shows over-threshold XP and current/queued activity.
- Deep stats modifies a persistent baseline and ongoing state. Ordinary floor health/defense stay read-only. Avoid describing all Deep stats changes as merely cosmetic.

## Engineering lessons

1. Derive UI timers from actual task deadlines, not independent intervals. Exclude travel from work progress. Pause/resume must preserve fraction, paid cost and job identity.
2. A five-minute simulation tick cannot express a three-minute job by itself. Exact completion settlement was added; retain chunk-equivalence tests.
3. Match selectors to rendered accessibility labels. React Native Web required `aria-valuenow` and `aria-expanded` for the accessible values used by these browser checks; native-style aggregate props did not produce the expected DOM attributes in this installed stack.
4. Avoid raw whitespace text children inside React Native Views. They generated development errors. Inspect the console as well as screenshots.
5. Preserve IDs when editing layouts while parties/staff are present. Slots are presentation/order, not entity identity.
6. Store primary rating and current resource separately. Defense is a pool in this demo, not armor mitigation. Never mix these meanings during tuning.
7. Check both equality and over-cap states. A ready capped spawner holds one spawn and shows a complete ring; it does not bank an unlimited backlog.
8. Large historical README feature lists went stale. Use final spec + generated balance catalog, and date validation reports. Do not carry old performance numbers forward as current facts.
9. Targeted browser checks caught row geometry and job timing errors. Full-suite verification and real device profiling answer different questions. A browser phone viewport is not Android/iOS device qualification.
10. Measure before replacing assets or architecture. The biggest current risks are simulation/persistence/UI boundaries, not a proven inadequacy of TypeScript or SVG.

## Where to resume later

Read README, FINAL_SPEC, VERIFICATION and RESEARCH_REPORT in that order. `engine.ts` owns authoritative rules; `store.ts` serializes commands/save/catch-up; persistence adapters differ by platform. `config.ts` defines editable rules; `statsCategories.ts` organizes them. `DungeonScene.tsx` and `layout.ts` own floor geometry. `RestRoomPanel.tsx` is shared room UI. Tests near each subsystem are the best executable history.

Production follow-up starts from a copy, not edits to the frozen snapshot. Known gaps include independent per-group policies, native release/device evidence, browser storage hardening, precise migration versioning, and representative stress benchmarks. The research report proposes a staged path without changing the completed demo's rules.
