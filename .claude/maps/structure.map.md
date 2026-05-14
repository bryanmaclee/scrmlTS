# structure.map.md
# project: scrmlts
# updated: 2026-05-14T00:37:04-06:00  commit: ff9be0e

## Entry Points

compiler/src/cli.js            — CLI entry; routes compile/dev/build/serve/migrate/promote/init subcommands
compiler/src/api.js            — programmatic API; orchestrates full BS→TAB→NR→MOD→CE→PA→RI→TS→META→DG→BP→RS→CG pipeline (includes Stage 3.007 LINT-TRY-CATCH + Stage 3.105 STDLIB-EXPORT-SEED + Stage 7.6 reachability)
compiler/bin/scrml.js          — installed binary (points to cli.js via package.json `bin`)
lsp/server.js                  — Language Server Protocol server; started via `scrml lsp --stdio`
compiler/src/codegen/index.ts  — Stage 8 CG entry point; runCG() exported

## Directory Ownership

compiler/                      — workspace root; compiler/package.json declares acorn + astring deps
compiler/src/                  — all pipeline stage implementations: tokenizer, block-splitter, ast-builder, type-system, etc.
compiler/src/codegen/          — Stage 8 (CG) emitters; 30+ emit-*.ts files + IR, BindingRegistry, CompileContext, errors; NEW S90: wire-format.ts + lint-undefined-interpolation.ts
compiler/src/codegen/compat/   — integration shim: parser-workarounds.js (setBPPOverrides hook for self-hosted BPP modules)
compiler/src/commands/         — CLI subcommand implementations: compile.js, dev.js, build.js, serve.js, migrate.js, init.js, promote.js
compiler/src/types/            — AST type definitions (ast.ts — single source of truth, ~1,858 LOC); reachability.ts [A-2.1]; auth-graph.ts [NEW S90 A-3.1 ~354 LOC]
compiler/src/validators/       — UVB sub-passes: post-ce-invariant.ts, attribute-interpolation.ts, attribute-allowlist.ts, ast-walk.ts, lint-try-catch.ts, lint-async-user-source.ts
compiler/src/reachability/     — Components 1-5 + entry-points.ts + gate-classifier.ts [S89 A-2.2 + S90 A-2.3..A-2.5 + A-3.3]
compiler/runtime/              — server-side runtime JS shims; copied to dist/_scrml/ at compile time
compiler/runtime/stdlib/       — hand-written ES modules for stdlib (auth.js, crypto.js, store.js, host.js)
compiler/tests/                — 617 test files (bun test); organized by category
compiler/tests/unit/           — unit tests (~444 files) covering individual pipeline passes
compiler/tests/conformance/    — conformance tests (~102 files) testing SPEC §34 error-code compliance; conf-AUTH-003..005 + conf-CG-001-warn + conf-CG-010 + conf-CG-014 + conf-WIRE-FORMAT-DECODER [NEW S90]
compiler/tests/integration/    — integration tests (~42 files); wire-format-encoder-decoder.test.js [NEW S90]
compiler/tests/browser/        — browser-environment tests (11 files, happy-dom)
compiler/tests/lsp/            — LSP server protocol tests (10 files)
compiler/tests/self-host/      — compiler self-host tests (4 files)
compiler/tests/commands/       — CLI command tests (4 files)
compiler/tests/fixtures/       — shared test fixtures
compiler/tests/helpers/        — test utilities (expr.ts, extract-user-fns.js)
compiler/self-host/            — self-hosted compiler; dist/ artifacts gitignored (built locally)
compiler/self-host/cg-parts/   — code-generation partials for self-host compiler
lsp/                           — LSP server (hover, diagnostics, completion, workspace management)
stdlib/                        — scrml standard library source .scrml files (auth, crypto, data, format, fs, http, etc.)
samples/                       — sample .scrml programs; samples/compilation-tests/ has ~311 .scrml fixtures
scripts/                       — build, test, and maintenance scripts (shell + .ts); scripts/git-hooks/ pre-commit hook
docs/                          — project documentation: articles, audits, changelog, changes dirs, curation, pinned-discussions
docs/changes/                  — active dispatch directories; NEW S90: m-7c-d-12-runtime-sentinel-scoping, a3-auth-graph-scoping, a2-reachability-solver-scoping, null-eradication-*, undefined-eradication-*, wave-4-* (50+ entries total)
docs/audits/                   — audit snapshots; articles-currency-table-2026-05-13.md, wave-3-7-corpus-ouroboros-2026-05-13.md [NEW S90]
editors/                       — editor integrations (VSCode extension, neovim)
examples/                      — standalone scrml usage examples
benchmarks/                    — performance benchmarks (todomvc-react, todomvc-svelte, fullstack-react, sql-batching)
e2e/                           — Playwright e2e test suite (3-browser)
handOffs/                      — historical hand-offs (read-only; current hand-off at hand-off.md)

## Notable New Files (S90 — 2026-05-14)

**M-7C-D-12 runtime sentinel wave:**
compiler/src/codegen/wire-format.ts              — §57 wire-format codegen (returnTypeAllowsAbsence + SERVER_WIRE_ENCODER_HELPER + CLIENT_WIRE_DECODER_HELPER; 228 LOC)
compiler/src/codegen/lint-undefined-interpolation.ts — W-CG-UNDEFINED-INTERPOLATION post-emission lint (318 LOC)
compiler/tests/conformance/conf-WIRE-FORMAT-DECODER.test.js — §57 decoder conformance test [NEW S90]
compiler/tests/integration/wire-format-encoder-decoder.test.js — wire format integration test [NEW S90]

**A-2 Reachability Solver Components 2-5 (wired S90):**
compiler/src/reachability/component-2.ts         — reactive_dep_closure (537 LOC; A-2.3)
compiler/src/reachability/component-3.ts         — server_fn_reachable_within + interaction-graph projection (1,023 LOC; A-2.4)
compiler/src/reachability/component-4.ts         — auth_gated_boundaries_visible_to (558 LOC; A-2.5)
compiler/src/reachability/component-5.ts         — vendor_units_used_by (451 LOC; A-2.6)
compiler/tests/unit/reachability-solver-component-2.test.ts — A-2.3 tests [NEW S90]
compiler/tests/unit/reachability-solver-component-3.test.ts — A-2.4 tests [NEW S90]
compiler/tests/unit/reachability-solver-component-4.test.ts — A-2.5 tests [NEW S90]
compiler/tests/unit/reachability-solver-component-5.test.ts — A-2.6 tests [NEW S90]

**A-3 AuthGraph wave:**
compiler/src/auth-graph.ts                       — runAuthGraph() + resolveRoleEnum() + classifyGates() + crossRefRedirects() (1,692 LOC; A-3.1 + A-3.2 + A-3.3 + A-3.4)
compiler/src/types/auth-graph.ts                 — AuthGraph/AuthGate/RoleEnum/AuthGraphDiagnostic types (~354 LOC; A-3)
compiler/tests/unit/auth-graph-site-enumerator.test.ts      — A-3.1 tests [NEW S90]
compiler/tests/unit/auth-graph-role-enum-resolution.test.ts — A-3.2 tests [NEW S90]
compiler/tests/unit/auth-graph-classifier.test.ts           — A-3.3 tests [NEW S90]
compiler/tests/unit/auth-graph-redirect-crossref.test.ts    — A-3.4 tests [NEW S90]

**Conformance tests:**
compiler/tests/conformance/conf-AUTH-003.test.js — auth gate conformance [NEW S90]
compiler/tests/conformance/conf-AUTH-004.test.js — auth gate conformance [NEW S90]
compiler/tests/conformance/conf-AUTH-005.test.js — auth gate conformance [NEW S90]
compiler/tests/conformance/conf-CG-001-warn.test.js — CG warning conformance [NEW S90]
compiler/tests/conformance/conf-CG-010.test.js  — CG conformance [NEW S90]
compiler/tests/conformance/conf-CG-014.test.js  — CG conformance [NEW S90]

## Notable Modified Files (S90)

compiler/src/ast-builder.js       — T1: AST cleanup (M-7C-D-12 Track 1)
compiler/src/codegen/emit-server.ts — wire-format integration: returnTypeAllowsAbsence + SERVER_WIRE_ENCODER_HELPER (M-7C-D-12 Track 2)
compiler/src/codegen/emit-logic.ts — T3 codegen lint integration (M-7C-D-12 Track 3)
compiler/src/codegen/scheduling.ts — scheduling updates (M-7C-D-12)
compiler/src/runtime-template.js   — runtime sentinel updates (M-7C-D-12 Track 1)
compiler/src/html-elements.js      — `<auth>` element registered (A-3.1)
compiler/src/attribute-registry.js — `<auth role=>` registered with supportsInterpolation: true (A-3.1) [relaxed to allow role= interpolation]
compiler/src/reachability-solver.ts — orchestrator extended with per-role ChunkPlan emission + Components 2-5 wired (A-2.5)
compiler/SPEC.md                   — +112 lines: NEW §57 Wire Format (lines 27051+); E-CLOSURE-002 + W-CG-UNDEFINED-INTERPOLATION catalog rows; W-AUTH-RUNTIME-FALLBACK full prose; §40.9.5 + §40.9.9 normative additions

## Ignored / Generated Paths
node_modules/, compiler/node_modules/, dist/, compiler/dist/self-host/, compiler/self-host/dist/,
build/, .git/, .jj/, samples/compilation-tests/dist/, handOffs/

## Tags
#scrmlts #map #structure #compiler #cli #pipeline #s90 #v0.3 #approach-a #approach-a2 #approach-a3 #wire-format #auth-graph #reachability

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [dependencies.map.md](./dependencies.map.md)
- [build.map.md](./build.map.md)
