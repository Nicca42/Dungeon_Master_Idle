# Timing and performance audit

## Changes

- Keep the original five-game-minute rules tick (12.5 real seconds). Simulation remains deterministic and independent of display frame rate.
- Synchronize foreground state every second instead of every five seconds. Coalesce overlapping periodic updates to avoid a growing work queue.
- Save routine foreground progress every five seconds rather than on every sync. Commands are still saved immediately; foreground/background transitions request a save. Reload catches up from the persisted wall anchor.
- Derive displayed time from the saved simulation time and its matching wall timestamp. Save latency no longer resets the presentation anchor. Commands retain the synchronized wall timestamp instead of discarding the time spent executing them.
- Between simulation ticks, reuse unchanged entities rather than serializing the complete world. Actual rules ticks still copy state before mutation, keeping published snapshots immutable.
- Update time-dependent UI four times a second instead of ten. Native-driven character transforms animate between these renders.
- Align floor movement and excavation reveal animations with the 12.5-second rules interval. Surface movement interpolates across the 250 ms presentation interval. Maintainers retain their existing continuous travel animation.
- Memoize pixel sprites, sprite geometry, floor backgrounds and health bars. Stable empty-floor props preserve those caches. Update the memoized sky once per game minute rather than on every UI pulse.

## Verification

`npm test`: 65 engine/timing tests. New coverage includes delayed-publication clock continuity, paused/backward-clock behavior, unchanged references between ticks, snapshot immutability, commands between ticks, save cadence, and equivalence between irregular foreground updates/reloads and uninterrupted simulation.

`PLAYWRIGHT_CHANNEL=chrome npm run test:web`: six desktop/phone browser checks, including tutorial completion, time skipping, finance edits, save/reload, setup navigation, and frame-sampled surface-party movement. The movement regression requires more than 20 moving frames in 2.5 seconds, no jump exceeding 25 pixels, a 95th-percentile frame gap below 120 ms, and a responsive headquarters menu. These are broad regression limits, not a promise of 60 FPS.

TypeScript and web/iOS/Android bundle exports are also checked. Chrome phone emulation is not a physical iOS/Android device performance test.

## Local measurements

`npm run benchmark` includes a same-snapshot, 1,000-sample comparison after warm-up:

| Between-tick path | Median | 95th percentile |
| --- | ---: | ---: |
| Previous full JSON copy | 0.0283 ms | 0.0355 ms |
| Shared entity references | 0.00017 ms | 0.00021 ms |

A sample catch-up took 33 ms for 24 game days and 153 ms for 720 game days. This fixture can reach a quiet/end-game state, so it is not a sustained maximum-crowd benchmark. Results vary by machine and do not measure React paint time or physical-device FPS.

## Next performance work, if population grows

The current vector assets remain resolution-independent and avoid adding image downloads. Memoizing their geometry is the lowest-risk improvement at demo scale. Before replacing the renderer, profile an active five-floor dungeon on physical midrange devices.

If SVG element count becomes the bottleneck, move repeated characters to a shared sprite atlas and batch floor rendering in a canvas/native renderer. If simulation time dominates, build actor/party lookup indexes once per rules tick and move long catch-up batches off the UI thread. Avoid storing derived indexes in saves, and retain deterministic partition-equivalence tests through either change. Isolating live timers into smaller subscribing components would further reduce React work before a renderer rewrite.
