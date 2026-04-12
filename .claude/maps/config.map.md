# config.map.md
# project: scrmlTS
# updated: 2026-04-12T20:00:00Z  commit: 623aeac

## Environment Variables
No .env.example or .env.template found.
No process.env references found in compiler source — the compiler is a pure local tool with no env var configuration.

## Feature Flags
No feature flags detected. The compiler uses CLI flags (--verbose, --convert-legacy-css, --embed-runtime, --self-host, --timing) passed via argv.

## Config Files

### bunfig.toml
test.root: "compiler/tests/" — bun test runner root
test.timeout: 10000 — 10s per-test timeout

### .gitignore
Ignores: node_modules/, dist/, .DS_Store, *.log, .env, .env.local, editors/vscode/out/, editors/vscode/bun.lock

### package.json scripts
compile: bun run compiler/src/cli.js compile
test: bun test compiler/tests/
test:coverage: bun test compiler/tests/ --coverage
watch: bun --watch compiler/src/cli.js compile
bench: bun run compiler/src/cli.js compile samples/compilation-tests/ --timing
security: compile samples + node --check on output
lsp: bun run lsp/server.js --stdio

## Tags
#scrmlTS #map #config #bun #cli

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
