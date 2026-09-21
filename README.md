# Underkeep — demo complete

The completed demo is frozen in [archives/underkeep-demo-2026-09-21](archives/underkeep-demo-2026-09-21/README.md). That self-contained source folder includes the lockfile, final specification, lessons, verification evidence and local run instructions. The active workspace and saved game remain intact.

To run this working copy:

```sh
npm ci
npm run web -- --port 8081 --host localhost
```

Open http://localhost:8081/. The tested environment is Node 25.8.2 / npm 11.11.1. Read the archive README for alternate ports, native development, save behavior and test commands. All demo shortcuts now live in **Demo settings**.

- [Final specification](docs/completion/FINAL_SPEC.md)
- [Project memory](docs/completion/PROJECT_MEMORY.md)
- [Production research: combat, storage, performance](docs/completion/RESEARCH_REPORT.md)
- [Verification](docs/completion/VERIFICATION.md)
- [Generated balance catalog](docs/completion/BALANCE_CATALOG.json)

The original plans and previous README are retained as history. They do not override the final specification. This is a local demo, not a production release or a cloud backup of browser/device progress.
