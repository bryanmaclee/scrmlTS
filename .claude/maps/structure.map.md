# structure.map.md
# project: scrmlTS
# updated: 2026-04-17T17:00:00Z  commit: 41e4401

## Entry Points
compiler/src/cli.js: CLI router — subcommands compile/dev/build/init/serve, falls through to compile
compiler/src/index.js: Legacy CLI entry — parses args, calls compileScrml() from api.js
compiler/src/api.js: Programmatic API — exports compileScrml(), scanDirectory(); runs BS->TAB->CE->BPP->PA->RI->TS->MC->DG->CG pipeline
compiler/src/codegen/index.ts: CG entry — exports runCG(); orchestrates analyze->plan->emit three-phase model
compiler/bin/scrml.js: Bin shim for `scrml` command
lsp/server.js: Language server protocol implementation

## Directory Ownership
compiler/                — Compiler source, spec, tests, self-host modules, build scripts
compiler/src/            — Compiler pipeline stages (27 top-level files, ~31,926 LOC across .ts+.js)
compiler/src/codegen/    — Code generator (Stage 8) — 36 .ts/.js modules + compat/, ~15,690 LOC; emit-* pattern for each output concern
compiler/src/types/      — TypeScript type definitions; ast.ts is the single source of truth for AST shape (1,420 lines)
compiler/src/commands/   — CLI subcommand implementations (compile, dev, build, init, serve)
compiler/src/codegen/compat/ — Parser bug workarounds (leaked comments, merged statements)
compiler/tests/          — Test suites organized by category (6,824 pass / 10 skip / 2 fail at S21)
compiler/tests/unit/     — Unit tests (~157 files at top level); __fixtures__/, gauntlet-s19/, gauntlet-s20/ subtrees
compiler/tests/unit/gauntlet-s19/ — 10 Phase 2 gauntlet compiler tests (equality, fn-prohibitions, import/export, lin, match-exhaustiveness, tokenizer-slash, etc.)
compiler/tests/unit/gauntlet-s20/ — 5 Phase 5–7 gauntlet tests (error-handling-codegen, fn-purity-reactive, import-resolution, machine-or-alternation, meta-gauntlet) + __fixtures__/ (created/torn-down per test)
compiler/tests/integration/ — 6 files (expr-parity, expr-node-corpus-invariant, lin-decl-emission, lin-enforcement-e2e, self-compilation, self-host-smoke)
compiler/tests/browser/  — 11 Puppeteer-based browser E2E tests
compiler/tests/conformance/ — Spec conformance: block-grammar/ (47 tests), tab/ (30 tests)
compiler/tests/commands/ — 3 CLI command tests (build-adapters, init, library-mode-types)
compiler/tests/self-host/ — 4 self-host module tests (bs, bpp, tab, ast)
compiler/tests/helpers/  — Test utilities (expr.ts for ExprNode round-trip assertions)
compiler/self-host/      — 11 self-hosted .scrml compiler modules + cg-parts/ + dist/
compiler/scripts/        — Build scripts (build-self-host.js)
stdlib/                  — 13 standard library modules (auth, compiler, crypto, data, format, fs, http, path, process, router, store, test, time)
samples/                 — Sample .scrml files; compilation-tests/ has 781 .scrml files across 12 subdirs
samples/compilation-tests/gauntlet-s19-* — 4 S19 gauntlet fixture dirs (phase1-decls, phase2-control-flow, phase3-operators, phase4-markup)
samples/compilation-tests/gauntlet-s20-* — 7 S20 gauntlet fixture dirs (channels, error-test, error-ux, meta, sql, styles, validation), each with dist/ output
examples/                — 14 runnable example apps (01-hello through 14-mario-state-machine); 14 demonstrates §51 `|` machine alternation
benchmarks/              — Performance benchmarks (runtime, build, sql-batching, TodoMVC comparisons vs React/Svelte/Vue)
editors/vscode/          — VS Code extension (syntax highlighting, LSP client)
editors/neovim/          — Neovim integration (syntax + treesitter)
lsp/                     — Language server (server.js)
scripts/                 — Utility scripts (assemble-spec, bundle-size, compile-test-samples, gauntlet-s19-verify, migrate-closers, update-spec-index, etc.)
docs/                    — tutorial.md (V2 content, V1 retired 2026-04-17), tutorial-snippets/ (33 .scrml files), changelog.md
docs/changes/            — 5 change-log directories (dq7-css-scope, expr-ast-phase-1-audit, expr-ast-phase-2-slice-3, gauntlet-s19, lin-batch-a)
handOffs/                — 20 historical hand-off docs (hand-off-1.md through hand-off-20.md); S21 in-progress at /hand-off.md

## Ignored / Generated Paths
node_modules/, dist/, build/, .git/, .claude/, archive/, handOffs/, samples/compilation-tests/**/dist/

## Tags
#scrmlTS #map #structure #compiler #pipeline #gauntlet-s20 #gauntlet-s19

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
