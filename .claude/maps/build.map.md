# build.map.md
# project: scrmlTS
# updated: 2026-04-10T22:00:00Z  commit: 482373c

## Development Commands (package.json scripts)

| Command | What it does |
|---|---|
| `bun run compile` | Compile a file: `bun compiler/src/cli.js compile` |
| `bun run watch` | Watch + recompile on change: `bun --watch compiler/src/cli.js compile` |
| `bun run lsp` | Start LSP server: `bun lsp/server.js --stdio` |
| `bun run bench` | Compile all 275 samples with timing output |
| `bun run security` | Compile all samples + `node --check` on output JS |

## Build & Release

| Command | What it does |
|---|---|
| `bun test compiler/tests/` | Run full test suite (5,542 tests, ~10s) |
| `bun test compiler/tests/ --coverage` | Test suite with coverage |
| `cd editors/vscode && bunx tsc` | Build VS Code extension → `out/extension.js` |
| `bun compiler/scripts/build-self-host.js` | Rebuild self-host .scrml dist artifacts |

## Git Hooks (.git/hooks/ — not versioned, installed manually)

| Hook | Trigger | What it does |
|---|---|---|
| `pre-commit` | Any commit with `compiler/` files staged | Runs `bun test compiler/tests/`; blocks on fail |
| `post-commit` | After `compiler/` commit | Full test suite + TodoMVC compile + browser-quality checks (CSS braces, bare fn calls, dot-path subscriptions) |
| `pre-push` | Push | Full test suite + TodoMVC gauntlet check; blocks push on fail |

**Caveat:** `.git/hooks/` is not versioned. Fresh clones need manual hook installation. Consider `scripts/git-hooks/` mirror (open TODO in master-list.md).

## CI/CD Pipeline

No `.github/workflows/` or other CI config detected. No CD pipeline.

## Docker

No Dockerfile or docker-compose detected.

## VS Code Extension Build

Entry: `editors/vscode/src/extension.ts`
Config: `editors/vscode/tsconfig.json`
Command: `cd editors/vscode && bunx tsc`
Output: `editors/vscode/out/extension.js` (83 lines, LSP client that spawns `lsp/server.js`)

## Tags
#scrmlTS #map #build #cli #bun #git-hooks #vscode

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
