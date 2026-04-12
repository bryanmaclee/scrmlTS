# structure.map.md
# project: scrmlTS
# updated: 2026-04-12T20:00:00Z  commit: 623aeac

## Entry Points
compiler/src/cli.js: CLI router — subcommands compile/dev/build/init/serve, falls through to compile
compiler/src/index.js: Legacy CLI entry — parses args, calls compileScrml() from api.js
compiler/src/api.js: Programmatic API — exports compileScrml(), scanDirectory(); runs BS->TAB->CE->BPP->PA->RI->TS->MC->DG->CG pipeline
compiler/src/codegen/index.ts: CG entry — exports runCG(); orchestrates analyze->plan->emit three-phase model
compiler/bin/scrml.js: Bin shim for `scrml` command
lsp/server.js: Language server protocol implementation

## Directory Ownership
compiler/                — Compiler source, spec, tests, self-host modules, build scripts
compiler/src/            — Compiler pipeline stages (~24,739 LOC across 27 top-level files + subdirs)
compiler/src/codegen/    — Code generator (Stage 8) — 36 modules, ~14,777 LOC; emit-* pattern for each output concern
compiler/src/types/      — TypeScript type definitions; ast.ts is the single source of truth for AST shape (1,356 lines)
compiler/src/commands/   — CLI subcommand implementations (compile, dev, build, init, serve)
compiler/src/codegen/compat/ — Parser bug workarounds (leaked comments, merged statements)
compiler/tests/          — Test suites organized by category (~5,710 pass, ~149 fail)
compiler/tests/unit/     — Unit tests (~140 files); __fixtures__/ for test data
compiler/tests/integration/ — Integration tests (expr-parity, lin-enforcement, self-compilation)
compiler/tests/browser/  — Puppeteer-based browser E2E tests (11 files)
compiler/tests/conformance/ — Spec conformance suites: block-grammar/ (47 tests), tab/ (30 tests)
compiler/tests/commands/ — CLI command tests (build-adapters, init, library-mode-types)
compiler/tests/self-host/ — Self-host module tests (bs, bpp, tab, ast)
compiler/tests/helpers/  — Test utilities (expr.ts for ExprNode round-trip assertions)
compiler/self-host/      — Self-hosted .scrml compiler modules (11 files + cg-parts/ + dist/)
compiler/scripts/        — Build scripts (build-self-host.js)
stdlib/                  — 13 standard library modules (auth, compiler, crypto, data, format, fs, http, path, process, router, store, test, time)
samples/                 — Sample .scrml files for testing; compilation-tests/ has 280 entries
examples/                — 14 runnable example apps (01-hello through 14-mario-state-machine)
benchmarks/              — Performance benchmarks (runtime, build, TodoMVC comparisons vs React/Svelte/Vue)
editors/vscode/          — VS Code extension (syntax highlighting, LSP client)
editors/neovim/          — Neovim integration (syntax + treesitter)
lsp/                     — Language server (server.js)
scripts/                 — Utility scripts (assemble-spec, bundle-size, generate-api-ref, git-hooks, etc.)
docs/changes/            — Change anomaly reports per development slice

## Ignored / Generated Paths
node_modules/, dist/, build/, .git/, .claude/, archive/, handOffs/

## Tags
#scrmlTS #map #structure #compiler #pipeline

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
