# structure.map.md
# project: scrmlts
# updated: 2026-05-13T15:00:00Z  commit: 9b98118

## Entry Points
compiler/src/cli.js            — CLI entry; routes compile/dev/build/serve/migrate/promote/init subcommands
compiler/src/api.js            — programmatic API; orchestrates full BS→TAB→NR→MOD→CE→PA→RI→TS→META→DG→CG pipeline
compiler/bin/scrml.js          — installed binary (points to cli.js via package.json `bin`)
lsp/server.js                  — Language Server Protocol server; started via `scrml lsp --stdio`
compiler/src/codegen/index.ts  — Stage 8 CG entry point; runCG() exported

## Directory Ownership

compiler/                     — workspace root; compiler/package.json declares acorn + astring deps
compiler/src/                 — all pipeline stage implementations: tokenizer, block-splitter, ast-builder, type-system, etc.
compiler/src/codegen/         — Stage 8 (CG) emitters; 30+ emit-*.ts files + IR, BindingRegistry, CompileContext, errors
compiler/src/codegen/compat/  — integration shim: parser-workarounds.js (setBPPOverrides hook for self-hosted BPP modules)
compiler/src/commands/        — CLI subcommand implementations: compile.js, dev.js, build.js, serve.js, migrate.js, init.js, promote.js
compiler/src/types/           — AST type definitions (ast.ts — single source of truth, 1,828 LOC)
compiler/src/validators/      — UVB sub-passes: post-ce-invariant.ts, attribute-interpolation.ts, attribute-allowlist.ts, ast-walk.ts
compiler/runtime/             — server-side runtime JS shims; copied to dist/_scrml/ at compile time
compiler/runtime/stdlib/      — hand-written ES modules for stdlib (auth.js, crypto.js, store.js, host.js [NEW S88])
compiler/tests/               — 590 test files (bun test); organized by category
compiler/tests/unit/          — unit tests (~427 files) covering individual pipeline passes
compiler/tests/integration/   — integration tests (~39 files) covering multi-stage scenarios
compiler/tests/conformance/   — conformance tests (~17 files) testing SPEC error-code compliance per §34
compiler/tests/browser/       — browser-environment tests (11 files, happy-dom)
compiler/tests/lsp/           — LSP server protocol tests (10 files)
compiler/tests/self-host/     — compiler self-host tests (4 files)
compiler/tests/commands/      — CLI command tests (4 files)
compiler/tests/fixtures/      — shared test fixtures (promote-match-canonical.scrml, expr.ts, extract-user-fns.js)
compiler/tests/helpers/       — test utilities (expr.ts — ExprNode construction helpers, extract-user-fns.js)
compiler/self-host/           — self-hosted compiler; dist/tab.js is gitignored (built locally per machine)
compiler/SPEC.md              — authoritative language spec (26,976 lines); use SPEC-INDEX.md for navigation
compiler/SPEC-INDEX.md        — spec section index (308 lines); read this first for navigation
compiler/PIPELINE.md          — stage pipeline contracts (v0.7.1; authoritative)
lsp/                          — LSP server (hover, diagnostics, completion, workspace management)
stdlib/                       — scrml standard library source .scrml files organized by module name (20 modules)
stdlib/host/                  — NEW S88: scrml:host module (index.scrml + runtime shim in compiler/runtime/stdlib/host.js)
samples/                      — sample .scrml programs; samples/compilation-tests/ has ~288 .scrml fixtures
scripts/                      — build, test, and maintenance scripts (shell + .ts)
scripts/git-hooks/            — pre-commit hook (source-controlled; activate via git config core.hooksPath scripts/git-hooks)
docs/                         — project documentation: articles, audits, changelog, changes, deep-dives
docs/changes/                 — active dispatch directories
docs/audits/                  — audit snapshots: compiler-forgotten-surface, happy-dom-perf, self-host-spec-conformance, scope-c-findings-tracker
editors/                      — editor integrations (VSCode extension, neovim)
examples/                     — standalone scrml usage examples; 23-trucking-dispatch fully migrated to v0.3
benchmarks/                   — performance benchmarks (todomvc-react, todomvc-svelte, fullstack-react, sql-batching)
e2e/                          — Playwright e2e test suite (3-browser; 5 spec files)
handOffs/                     — historical hand-offs (read-only; current session hand-off at hand-off.md)

## Notable New Files (S88 — 2026-05-13)

compiler/runtime/stdlib/host.js           — NEW: JS runtime shim for scrml:host; safeCall/safeCallAsync/HostError
stdlib/host/index.scrml                   — NEW: scrml:host stdlib module declaration; safeCall + safeCallAsync signatures
compiler/tests/unit/safe-call.test.js     — NEW: 24 tests for safeCall primitive (SC-01..SC-24)
compiler/tests/unit/safe-call-async.test.js — NEW: 20 tests for safeCallAsync primitive
compiler/tests/unit/dg-markup-read-node-a12.test.js — NEW: A-1.2 MarkupReadDGNode shape + walker tests
compiler/tests/unit/dg-markup-read-emission-a13.test.js — NEW: A-1.3 markup-read edge emission (4 high-freq shapes)
compiler/tests/unit/dg-markup-read-emission-a14.test.js — NEW: A-1.4 call-ref/for-iterable/lift-template edge emission
compiler/tests/unit/dg-markup-read-emission-a15.test.js — NEW: A-1.5 engine state-child + onTransition/Timeout/Idle edge emission (14 tests)
compiler/tests/unit/lift-5-reconciler-ambient.test.js  — NEW: LIFT-5 fix regression test
samples/compilation-tests/lift-5-repro.scrml           — NEW: LIFT-5 compilation fixture

## Notable Modified Files (S88)

compiler/src/dependency-graph.ts      — A-1.2 MarkupReadDGNode kind added; A-1.3/A-1.4/A-1.5 emission logic activated (markupContextEmitEdges = true)
compiler/src/codegen/emit-lift.js     — LIFT-1 fix (parseLiftTag paren-attr null return); LIFT-2/3/4 fixes (bind:*/if=/event-arg parity)
compiler/src/codegen/emit-control-flow.ts — LIFT-5 fix: if/for children route through container helpers in reconciler factory
compiler/src/ast-builder.js           — A-1.4/A-1.5 AST annotations for call-ref, for-iterable, lift-template-body edges
stdlib/auth/password.scrml            — Phase 3a async: verifyPassword migrated to safeCallAsync
stdlib/crypto/index.scrml             — Phase 3a sync: safeCall integrated for verifySync + hash
compiler/SPEC.md                      — §4.7 BS-comment-skip amendment + §18.7 mixed positional+named binding + §41.4 bun:/node: protocol prefixes

## Ignored / Generated Paths
node_modules/, compiler/node_modules/, dist/, compiler/dist/self-host/, compiler/self-host/dist/,
build/, .git/, .jj/, samples/compilation-tests/dist/, handOffs/

## Tags
#scrmlts #map #structure #compiler #cli #pipeline #s88 #v0.3 #approach-a #lift-fixes #safecall #stdlib-host

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [dependencies.map.md](./dependencies.map.md)
- [build.map.md](./build.map.md)
