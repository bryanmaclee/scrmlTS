# structure.map.md
# project: scrmlTS
# updated: 2026-04-19T22:00:00Z  commit: 74303d3

## Entry Points
compiler/src/cli.js: CLI router — subcommands compile/dev/build/init/serve, falls through to compile
compiler/src/index.js: Legacy CLI entry — parses args, calls compileScrml() from api.js
compiler/src/api.js: Programmatic API — exports compileScrml(), scanDirectory(); runs BS->TAB->MOD->CE->BPP->PA->RI->TS->MC->DG->CG pipeline
compiler/src/codegen/index.ts: CG entry — exports runCG(); orchestrates analyze->plan->emit three-phase model
compiler/bin/scrml.js: Bin shim for `scrml` command
lsp/server.js: Language server protocol implementation

## Directory Ownership
compiler/                — Compiler source, spec, tests, self-host modules, build scripts
compiler/src/            — Compiler pipeline stages (27 top-level files); ast-builder.js is 6,489 LOC; type-system.ts is 7,926 LOC
compiler/src/codegen/    — Code generator (Stage 8) — 37 .ts/.js modules + compat/; emit-* pattern per output concern; emit-machines.ts 719 LOC, emit-machine-property-tests.ts 579 LOC (S26-S28 phase 1-7), emit-logic.ts 1,605 LOC
compiler/src/types/      — TypeScript type defs; ast.ts is the single source of truth for AST shape (1,420 lines)
compiler/src/commands/   — CLI subcommand implementations (compile, dev, build, init, serve)
compiler/src/codegen/compat/ — Parser bug workarounds (parser-workarounds.js, 265 LOC); ported to self-host/bpp.scrml S29
compiler/tests/          — Test suites organized by category (7,183 pass / 10 skip / 2 fail / 26,415 expects / 315 files at S29 baseline)
compiler/tests/unit/     — Unit tests (167 top-level files); __fixtures__/, gauntlet-s19/ through gauntlet-s28/ subtrees
compiler/tests/unit/gauntlet-s27/ — 8 S27 correctness-gap tests (unit-variant transition, guarded wildcard, effect-body refs, audit timer/freeze, audit entry rule+label, replay primitive, replay compile-validation, match-arm expression-only)
compiler/tests/unit/gauntlet-s28/ — 6 S28 elision/adjacent-fix tests (elision-cat-2a-2b, elision-slice-2-3-4, error-arm-scope, multi-stmt-effect-body, payload-enum-comma-split, projection-guard-phase-7)
compiler/tests/integration/ — 6 files (expr-parity, expr-node-corpus-invariant, lin-decl-emission, lin-enforcement-e2e, self-compilation, self-host-smoke)
compiler/tests/browser/  — 11 Puppeteer-based browser E2E tests
compiler/tests/conformance/ — Spec conformance: block-grammar/ (47 tests), tab/ (30 tests)
compiler/tests/commands/ — 3 CLI command tests (build-adapters, init, library-mode-types)
compiler/tests/self-host/ — 4 self-host module tests (bs, bpp, tab, ast)
compiler/tests/helpers/  — Test utilities; includes S28 extract-user-fns.js (centralizing 8 duplicated regexes)
compiler/self-host/      — 11 self-hosted .scrml compiler modules + cg-parts/ (5 js shards) + dist/ (bs.js)
compiler/self-host/bpp.scrml — S29 parity with src/codegen/compat/parser-workarounds.js; 232 LOC vs 265 LOC JS; wraps content in `${}` logic block + fixes broken regex (commit 74303d3)
compiler/scripts/        — Build scripts (build-self-host.js)
stdlib/                  — 13 standard library modules (auth, compiler, crypto, data, format, fs, http, path, process, router, store, test, time)
samples/                 — Sample .scrml files; compilation-tests/ has 782 .scrml files across 12+ gauntlet subdirs
samples/compilation-tests/gauntlet-s19-* — 4 S19 gauntlet fixture dirs (phase1-decls, phase2-control-flow, phase3-operators, phase4-markup)
samples/compilation-tests/gauntlet-s20-* — 7 S20 gauntlet fixture dirs (channels, error-test, error-ux, meta, sql, styles, validation)
examples/                — 14 runnable example apps (01-hello through 14-mario-state-machine); 14 demonstrates §51 `|` machine alternation
benchmarks/              — Performance benchmarks (runtime, build, sql-batching, TodoMVC vs React/Svelte/Vue)
editors/vscode/          — VS Code extension (syntax highlighting, LSP client)
editors/neovim/          — Neovim integration (syntax + treesitter)
lsp/                     — Language server (server.js)
scripts/                 — Utility scripts (assemble-spec, bundle-size, compile-test-samples, gauntlet-s19-verify, migrate-closers, rebuild-bs-dist, update-spec-index, verify-js)
docs/                    — tutorial.md (V2 content promoted 2026-04-17), tutorial-snippets/ (33 .scrml files), changelog.md (S28 current), lin.md, SEO-LAUNCH.md (uncommitted 5 sessions)
docs/changes/            — 2 tooling-only dirs: dq7-css-scope (apply-spec-patch.js), lin-batch-a (3 js files); gauntlet-s19/ and expr-ast-phase-*/ subtrees previously removed
handOffs/                — 29 historical hand-off docs (hand-off-1.md through hand-off-29.md); S29 in-progress at /hand-off.md; incoming/ empty (only read/ archive)

## Ignored / Generated Paths
node_modules/, dist/, build/, .git/, .claude/, archive/, samples/compilation-tests/**/dist/

## Tags
#scrmlTS #map #structure #compiler #pipeline #s27 #s28 #s29 #gauntlet

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
