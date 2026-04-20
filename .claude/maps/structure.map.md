# structure.map.md
# project: scrmlTS
# updated: 2026-04-20T22:05:00Z  commit: d6e8288

## Entry Points
compiler/src/cli.js: CLI router — subcommands compile/dev/build/init/serve, falls through to compile
compiler/src/index.js: Legacy CLI entry — parses args, calls compileScrml() from api.js
compiler/src/api.js: Programmatic API — exports compileScrml(), scanDirectory(); runs BS->TAB->MOD->CE->BPP->PA->RI->TS->MC->DG->CG pipeline
compiler/src/codegen/index.ts: CG entry — exports runCG(); orchestrates analyze->plan->emit three-phase model
compiler/bin/scrml.js: Bin shim for `scrml` command
lsp/server.js: Language server protocol implementation

## Directory Ownership
compiler/                — Compiler source, spec, tests, self-host modules, build scripts
compiler/src/            — Compiler pipeline stages (27 top-level files); ast-builder.js is 6,489 LOC; type-system.ts is 8,712 LOC (+786 since S29 snapshot); expression-parser.ts is 2,029 LOC
compiler/src/codegen/    — Code generator (Stage 8) — 37 .ts/.js modules + compat/; emit-* pattern per output concern; emit-machines.ts 719 LOC, emit-machine-property-tests.ts 579 LOC, emit-logic.ts 1,630 LOC, emit-client.ts 1,058 LOC (+~180 S34), rewrite.ts 1,767 LOC, emit-control-flow.ts 1,200 LOC, emit-event-wiring.ts 555 LOC, emit-reactive-wiring.ts 807 LOC, emit-server.ts 759 LOC, emit-expr.ts 428 LOC
compiler/src/types/      — TypeScript type defs; ast.ts is the single source of truth for AST shape (1,420 lines)
compiler/src/commands/   — CLI subcommand implementations (compile, dev, build, init, serve)
compiler/src/codegen/compat/ — Parser bug workarounds (parser-workarounds.js, 265 LOC); ported to self-host/bpp.scrml S29
compiler/tests/          — Test suites organized by category (7,373 pass / 40 skip / 2 fail / 26,808 expects / 338 files at S34 close)
compiler/tests/unit/     — Unit tests (175 .test.js files under root + gauntlet-s{19..28}/ subtrees); +8 new files at S34 for adopter bug coverage
compiler/tests/unit/gauntlet-s27/ — 8 S27 correctness-gap tests
compiler/tests/unit/gauntlet-s28/ — 6 S28 elision/adjacent-fix tests
compiler/tests/integration/ — 6 files (expr-parity, expr-node-corpus-invariant, lin-decl-emission, lin-enforcement-e2e, self-compilation, self-host-smoke)
compiler/tests/browser/  — 11 Puppeteer-based browser E2E tests
compiler/tests/conformance/ — Spec conformance: block-grammar/ (47 tests), tab/ (30 tests)
compiler/tests/commands/ — 3 CLI command tests (build-adapters, init, library-mode-types)
compiler/tests/self-host/ — 4 self-host module tests (bs, bpp, tab, ast)
compiler/tests/helpers/  — Test utilities; includes S28 extract-user-fns.js
compiler/self-host/      — 11 self-hosted .scrml compiler modules + cg-parts/ (5 js shards) + dist/ (bs.js)
compiler/self-host/bpp.scrml — 232 LOC (S29 parity with src/codegen/compat/parser-workarounds.js)
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
docs/                    — tutorial.md (V2), tutorial-snippets/ (33 .scrml files), changelog.md (S28 current — S29-S34 pending entries), lin.md, SEO-LAUNCH.md (uncommitted 12 sessions running at S34)
docs/changes/            — 2 tooling-only dirs: dq7-css-scope (apply-spec-patch.js), lin-batch-a (3 js files)
handOffs/                — 34 historical hand-off docs (hand-off-1.md through hand-off-34.md); S34 wrap at handOffs/hand-off-34.md; incoming/read/ has S34 adopter-bug inbound from giti + 6nz; incoming/ has active 2026-04-20-1251 6nz follow-up

## Ignored / Generated Paths
node_modules/, dist/, build/, .git/, .claude/, archive/, samples/compilation-tests/**/dist/

## Tags
#scrmlTS #map #structure #compiler #pipeline #s29 #s30 #s31 #s32 #s33 #s34 #adopter-bugs #codegen

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
