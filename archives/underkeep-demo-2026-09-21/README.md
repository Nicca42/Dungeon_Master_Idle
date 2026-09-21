# Underkeep — completed demo archive

Completed demo, frozen on **21 September 2026**. Original pixel-style dungeon management with local idle progression. This folder is a self-contained source snapshot; it is not an App Store/Play Store release or a capture of the owner's saved dungeon.

## Start locally (browser)

Prerequisites: Node.js and npm, a modern browser, internet for the initial dependency install. This snapshot was checked with **Node 25.8.2 / npm 11.11.1** on macOS. For exact reproduction use those versions. A supported Node LTS compatible with Expo 57 is preferable for future development, but was not independently certified in this freeze. Dependencies are locked in `package-lock.json`; do not run upgrade/fix commands as part of restoring the archive.

Open a terminal **in this archive folder**, then:

```sh
npm ci
npm run web -- --port 8081 --host localhost
```

Open **http://localhost:8081/**. Stop with **Ctrl+C** in that terminal. The project has no required `.env`, backend, API keys, database service or paid tooling. Initial installation downloads dependencies; fonts/artwork are bundled with the application. The dev server must remain running. This is not a service-worker/offline-installable PWA.

If another game server already uses 8081, stop that server or run:

```sh
npm run web -- --port 8082 --host localhost
```

Open the printed address. Browser saves are scoped to the origin, including port: 8082 has a different save from 8081. Close duplicate game tabs if the app reports that another tab owns the dungeon. To load changed code, reload the browser document; if necessary restart Metro using `npm run web -- --port 8081 --host localhost --clear`. This clears Metro's code cache, not browser save data.

## Play or present the demo

- Follow the pulsing tutorial actions, or open **Demo settings → Load a ready-to-play dungeon** and confirm replacement of that browser's save.
- **Demo settings** also contains time skips, restart, free excavation spells and art previews. Ordinary gameplay pages do not contain those demo shortcuts.
- One real hour equals 24 game hours. Active play doubles adventurer arrivals and research only. Returning later simulates elapsed time.
- Click headquarters for staff, rest capacity, finances, research and adventurer-spawn management. Click rooms or actors to inspect them.
- Floor settings configure encounters and layout. Final floor order is header → fixture information → resource bars → characters/fixtures. Labels are centered; blue defense is above red health.
- **Stats → Deep stats** edits persistent baseline values for the current and future games on that device. Restarts keep this baseline; start in a separate browser profile/origin to inspect pristine defaults.

## Saves and preservation

Browser: localStorage keys `underkeep-demo-v1` and `underkeep-baseline-v1`. Native: SQLite database `underkeep.db` with current/previous save generations and a baseline record. Clearing site data, private-session shutdown, or uninstalling a native app can remove local progress. Source files do not contain these saves.

The archive deliberately contains **no owner's live save**. The working project and running game were left in place. The archived defaults match the selected art direction, not arbitrary later Deep stats overrides in a player's browser.

For a manual browser backup, use the browser's developer tools Storage panel to copy both keys into a local file before clearing anything. Keep their raw values intact. There is no finished in-game save export/import feature; robust export/import is recommended in the research report. Do not copy a running native database's main file alone while its WAL may contain uncheckpointed changes.

## Run checks

```sh
npm run typecheck
npm test
npm run benchmark
npm run export:web
```

Browser regression tests use isolated browser contexts and do not share the normal in-app browser's localStorage:

```sh
npx playwright install chromium
npm run test:web
```

Alternatively, if Google Chrome is installed, macOS/Linux can use:

```sh
PLAYWRIGHT_CHANNEL=chrome npm run test:web
```

The Playwright configuration uses port 8081. Run against this archive's server, or stop other servers so Playwright can start the correct one. The configuration has `reuseExistingServer: true`; an unrelated existing server would invalidate the result. Desktop and 390-pixel phone viewport tests are provided. Phone emulation is not physical-device testing.

The benchmark is a headless simulation test, not an FPS benchmark. It can take tens of seconds or longer; see [verification](docs/completion/VERIFICATION.md) for the measured host and limitations.

## iOS and Android locally

The shared code and Expo platform configuration are included. Native installation, signing and store submission are not archive deliverables.

```sh
# macOS + Xcode + simulator; generates/builds the native iOS project:
npm run ios

# Android Studio + Android SDK/JDK + running emulator or connected device:
npm run android

# Compile JS/assets for both native targets without installing on a device:
npm run export:native
```

Physical iOS devices may require signing. These run commands are development builds and can generate `ios/` or `android/`; those generated directories are not frozen here. Match native tooling to Expo 57. Do not assume the latest Expo Go client supports this archived SDK. See [Expo's development-build overview](https://docs.expo.dev/develop/development-builds/introduction/) for the platform workflow. Native bundle generation is different from successful native build/install and physical-device performance validation.

## Contents and reading order

1. [Final implemented specification](docs/completion/FINAL_SPEC.md) — authoritative product handoff.
2. [Project memory and lessons](docs/completion/PROJECT_MEMORY.md) — decisions, regressions and resumption notes.
3. [Verification and limitations](docs/completion/VERIFICATION.md) — actual results, not inferred coverage.
4. [Combat, storage and performance research](docs/completion/RESEARCH_REPORT.md) — primary-source research and prioritized successor plan.
5. [Generated balance catalog](docs/completion/BALANCE_CATALOG.json) — every exposed rule's default/range and research definitions.
6. [Original gameplay plan](docs/MVP_DEMO_PLAN.md) and [technical plan](docs/TECHNICAL_IMPLEMENTATION.md) — historical design, superseded by the final spec.
7. [Asset attribution](assets/ATTRIBUTION.md).

```
app/                 Expo routes and lifecycle
src/game/            simulation, configuration, forecasts and controller
src/persistence/     browser/native save adapters and decoding
src/components/      UI, floor renderer, SVG sprites and menus
assets/              bundled icon/art attribution
scripts/             benchmark and icon tooling
tests/               simulation tests and Playwright browser flows
docs/completion/     final spec, research, lessons, verification evidence
MANIFEST.sha256      SHA-256 for snapshot files (excluding this manifest)
```

The snapshot includes the lockfile and all tracked/untracked implementation source present at freeze. It excludes `.git`, `node_modules`, `.expo`, generated exports, browser traces, OS files and secrets. Run `shasum -a 256 -c MANIFEST.sha256` from this folder before editing to check integrity. The adjacent `.zip` is a convenience copy of the same folder; its SHA-256 is recorded in `archives/ARCHIVES.md` in the parent workspace.

## Freeze policy

Treat this folder as the reference demo. Make a new working copy for production work; do not rewrite the archive's implementation while retaining its freeze date/checksum. There is no new license grant for third-party packages; their licenses are delivered by `npm ci` and summarized in attribution. Known production gaps are documented rather than silently changed as part of archiving.
