# build.map.md
# project: scrmlTS
# updated: 2026-04-12T20:00:00Z  commit: 623aeac

## Development Commands
bun run compile <file|dir> — compile .scrml to HTML/CSS/JS via compiler/src/cli.js
bun run test — run all tests (bun test compiler/tests/)
bun run test:coverage — run tests with coverage reporting
bun run watch — watch mode recompilation
bun run bench — compile all 280 compilation-tests with --timing
bun run security — compile samples + node --check JS validity
bun run lsp — start language server on stdio

## Build & Release
bun run compiler/scripts/build-self-host.js — build self-hosted compiler modules
bash scripts/assemble-spec.sh — assemble SPEC.md from sources
bash scripts/update-spec-index.sh — regenerate SPEC-INDEX.md line numbers
node scripts/generate-api-reference.js — generate API reference docs
node scripts/verify-js.js — verify JS output validity
node scripts/bundle-size-benchmark.js — measure bundle size
bash scripts/pull-worktree.sh — pull scrml worktree for self-host

## CLI Subcommands  [compiler/src/commands/]
compile.js — single/batch .scrml compilation
dev.js — compile + watch + serve (hot reload)
build.js — production build with adapters
init.js — scaffold new scrml project
serve.js — persistent compiler server

## CI/CD Pipeline
No CI/CD configuration found (.github/workflows/, Dockerfile, etc. absent).

## Tags
#scrmlTS #map #build #cli #bun

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
