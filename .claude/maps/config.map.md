# config.map.md
# project: scrmlTS
# updated: 2026-04-19T22:00:00Z  commit: 74303d3

## Environment Variables
SCRML_NO_ELIDE — optional — S28 slice 4 — when set to "1" at module load, `classifyTransition` always returns "unknown" so the full machine-guard emits on every assignment; CI uses this to run the suite in dual-mode parity (emit-machines.ts:54)

No .env.example or .env.template file. SCRML_NO_ELIDE is the only environment variable read by compiler source.

## Feature Flags
--no-elide — CLI-equivalent via `setNoElide(true)` (emit-machines.ts:57); programmatic knob for unit tests

## Config Files

### bunfig.toml
test.root: "compiler/tests/" — bun test runner root
test.timeout: 10000 — 10s per-test timeout

### .gitignore
Ignores: node_modules/, dist/, .DS_Store, *.log, .env, .env.local, editors/vscode/out/, editors/vscode/bun.lock

### package.json scripts
compile: bun run compiler/src/cli.js compile
pretest: bash scripts/compile-test-samples.sh — recompile the shared sample corpus before bun test
test: bun test compiler/tests/
test:coverage: bun test compiler/tests/ --coverage
watch: bun --watch compiler/src/cli.js compile
bench: bun run compiler/src/cli.js compile samples/compilation-tests/ --timing
security: compile samples + node --check on output
lsp: bun run lsp/server.js --stdio

## CLI Flags (compiler/src/cli.js)
--verbose — verbose compiler output
--convert-legacy-css — one-shot css migration
--embed-runtime — inline runtime chunks instead of import statements
--self-host — load 11 self-hosted .scrml modules from compiler/self-host/
--timing — emit per-stage timing for bench

## Tags
#scrmlTS #map #config #bun #cli #s28-no-elide

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
