# Freeze verification — 21 September 2026

Environment: macOS, Node v25.8.2, npm 11.11.1. Installed project dependencies were reused; a clean network dependency reinstall was not performed during the freeze. `package-lock.json` is included for reproducible `npm ci`.

## Executed checks

- TypeScript: passed. [Raw output](verification/typecheck.txt).
- Unit tests: 156 passed, zero failures. [Raw output](verification/unit-tests.txt).
- Web export: passed; static routes and bundled assets produced. [Raw output](verification/web-export.txt). Generated `dist` is intentionally excluded from the source archive and can be rebuilt.
- Browser suite: **74 passed, zero failures** across desktop and phone; final run took about 1.8 minutes. [Final raw output](verification/browser-tests-final.txt).
- Benchmark: completed 1-day and 30-day real-time catch-up plus between-tick comparison. [Raw output](verification/benchmark.txt).

The first full browser run passed 70 and failed four (two scenarios × desktop/phone). Both were outdated test expectations: the installation flow closed a time-skip report without leaving Demo settings, and the art test assumed no saved/default selections. Tests were updated to use Back to the dungeon, the uppercase floor status, and the explicit/default art selections. No runtime gameplay code changed during archive preparation. [Initial output](verification/browser-tests.txt) is retained for transparency.

The final targeted visual work before this freeze also verified row centering, room interactions, reset timers and construction headers in desktop/phone viewports. The live in-app preview was reloaded to display current code without clearing its save.

## Benchmark interpretation

1 real day: 1,100.1 ms; 208,601 JSON state bytes. 30 real days: 16,410.9 ms; 240,721 bytes. Both ended with 808 admissions and 8,329 gold cumulative income. Consequently this is not a sustained maximum-crowd benchmark. The full outer two-generation save is larger than the single-state byte measurement. Browser testing ran concurrently, so timings are not isolated machine-performance measurements.

## Not established by these checks

- A fresh dependency installation on every Node/OS combination.
- Native application compilation, installation, signing, release-mode FPS or memory on physical iOS/Android devices during this freeze.
- App Store / Play Store readiness, server security or cloud-save durability.
- Maximum-load 50-floor sustained performance, thermal behavior or long-session battery use.
- Exhaustive gameplay correctness for every Deep stats combination.

## Archive integrity

The archive includes the complete source/tests/assets/configuration, generated balance catalog and these logs. `MANIFEST.sha256` lists every snapshot file except itself. Files are verified against their source during packaging; the ZIP receives a separate checksum. No browser save or localStorage reset is part of this operation.
