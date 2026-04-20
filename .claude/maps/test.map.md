# test.map.md
# project: scrmlTS
# updated: 2026-04-20T22:05:00Z  commit: d6e8288

## Test Framework
Runner: bun test (built-in)
Config: bunfig.toml (root: compiler/tests/, timeout: 10000ms)
Pretest hook: scripts/compile-test-samples.sh (recompiles the sample corpus before every bun test)
Run all: bun test compiler/tests/
Run single: bun test compiler/tests/unit/some-file.test.js
Run category: bun test compiler/tests/unit/ or compiler/tests/integration/

## Test Categories
Unit:         compiler/tests/unit/*.test.js — 175 top-level .test.js files + gauntlet-s{19,20,22,23,24,25,26,27,28}/ subtrees
  gauntlet-s19/ — Phase 2 cleanup fixtures (10 files)
  gauntlet-s20/ — Phase 5–7 fixtures (5 files + __fixtures__/)
  gauntlet-s22/ — payload-variants cluster
  gauntlet-s23/ — meta-bugs
  gauntlet-s24/ — §2a push-scope extensions
  gauntlet-s25/ — §2a loop/if + §35.5 lin request/poll
  gauntlet-s26/ — §51.13 projection machine phases 1-6 + E-MACHINE-019 audit
  gauntlet-s27/ — 8 correctness-gap tests (unit-variant transition, guarded wildcard, effect-body refs, audit timer/freeze, audit entry rule+label, replay primitive, replay compile-validation, match-arm expression-only)
  gauntlet-s28/ — 6 elision/adjacent-fix tests (elision-cat-2a-2b, elision-slice-2-3-4, error-arm-scope, multi-stmt-effect-body, payload-enum-comma-split, projection-guard-phase-7)
  gauntlet-s32/ — (see un-skip pass commit 36eadb9; 9 tests covered by Phase 4a-4g moved from skip to pass)
Integration:  compiler/tests/integration/*.test.js — 6 files (expr-parity, expr-node-corpus-invariant, lin-decl-emission, lin-enforcement-e2e, self-compilation, self-host-smoke)
Browser E2E:  compiler/tests/browser/*.test.js — 11 files (Puppeteer-based)
Conformance:  compiler/tests/conformance/{block-grammar,tab}/*.test.js — 77 files (block-grammar: 47, tab: 30)
Commands:     compiler/tests/commands/*.test.js — 3 files (build-adapters, init, library-mode-types)
Self-host:    compiler/tests/self-host/*.test.js — 4 files (ast, bs, bpp, tab)

## Current Baseline (verified this refresh via `bun test compiler/tests/`)
**7,373 pass / 40 skip / 2 fail** / 26,808 expects / 338 files / 11.56s (S34 close at commit d6e8288)
- +190 pass, +30 skip, +23 files since S29 open snapshot (7,183 / 10 skip / 315 files)
- +51 pass and +8 files landed in S34 alone (adopter-bug coverage; 10 commits aa92070..d23fd54)
- 2 persistent self-host smoke failures deferred per user
- The 40 skips include 8 TodoMVC happy-dom harness-only (Puppeteer covers), and a larger pool added during S32-S33 gauntlet expansion

## S34 new test files (adopter-bug regression coverage — 8 files, +51 tests)
compiler/tests/unit/arrow-block-body-in-call-arg.test.js — 6nz Bug C: CallExpression args drop block-body arrows; fix threads `rawSource` + slices arrow substring using node.start/end. (expression-parser.ts)
compiler/tests/unit/event-handler-args-e2e.test.js — Bug A-adjacent: onclick=fn("arg") end-to-end through call-ref → BindingRegistry → emit-event-wiring; 7 sections (string/reactive/multi/no-args/HTML/delegation/non-delegable).
compiler/tests/unit/event-delegation.test.js — §16/§17 added S34: raw-string args regression + fn() handlerExpr no-double-wrap; Approach D delegation harness.
compiler/tests/unit/import-scope-registration.test.js — GITI-002: import-decl case in type-system.ts binds imported locals with kind:"import" so checkLogicExprIdents finds them via scopeChain.lookup() (no false E-SCOPE-001).
compiler/tests/unit/let-reassignment-in-branch.test.js — 6nz Bug B + Bug F: declaredNames now threaded through IfOpts/forStmt/whileStmt; bare `x = expr` inside a branch re-uses outer `let x`.
compiler/tests/unit/mangle-property-access.test.js — 6nz Bug D: emit-client.ts mangler regex adds negative lookbehind for `.` so `classList.toggle` is not rewritten when a user fn `toggle` exists.
compiler/tests/unit/meta-captured-bindings.test.js — Bug E-adjacent: Object.freeze comma separators in captured-bindings object literal (CB-1..CB-8).
compiler/tests/unit/request-tag-and-server-fn-reactive.test.js — GITI-001: `@data = loadValue()` awaits server-fn Promise; `<request>` without url= skips fetch machinery.
compiler/tests/unit/server-client-boundary.test.js — GITI-003 + GITI-004: emit-client.ts post-emit prune drops imports with no client body usage; `lift` / `boundary:"server"` inside server fn bodies now lowers to a plain IIFE (no `document`/`_scrml_lift` in server bundle).
compiler/tests/unit/server-fn-markup-interpolation.test.js — GITI-005: `${serverFn()}` in markup wires to DOM via async IIFE that sets textContent after await.
compiler/tests/unit/state-block-event-wiring.test.js — BUG-R14-005: emit-html.js state-node handler recurses into children so nested onclick reaches BindingRegistry.
compiler/tests/unit/cross-file-import-export.test.js — Cross-file type-registry seeding + emit-client import-source rewrite (.scrml→.client.js, scrml:/vendor: passthrough, .js passthrough).

## Fixtures & Factories
compiler/tests/unit/__fixtures__/ — top-level test fixture data
compiler/tests/unit/gauntlet-s20/__fixtures__/ — per-test scratch trees (compiler runs, then rmSync)
compiler/tests/unit/__fixtures__/mangle-property-access/ — S34 fixture for 6nz Bug D (toggle.scrml)
compiler/tests/helpers/expr.ts — ExprNode round-trip assertion helper (assertRoundTrip)
compiler/tests/helpers/extract-user-fns.js — S28: centralizes 8 duplicated regexes for user-fn extraction; bare-keyword entries gain `(?!_\d)` negative lookahead
samples/compilation-tests/ — 782 .scrml files across 12+ subdirs (bench + expr-parity corpus)

## Key Test Files (S27-S34 highlights)
S34 adopter-bug coverage (see "S34 new test files" above — 8 files, +51 tests)
S32-S33 Phase 4a-4g purity/terminal-mutation/transition enforcement (gauntlet-s32 un-skip commit 36eadb9)
S27-S28 machine-cluster tests (listed under gauntlet-s27/s28/ above)
compiler/tests/integration/expr-parity.test.js — corpus parity test (ExprNode emitExpr vs string rewriteExpr)
compiler/tests/integration/expr-node-corpus-invariant.test.js — ExprNode structural invariant checks

## Coverage gap flagged by S29 diagnosis (still open as of S34)
compiler/tests/unit/tab.test.js:649-654 explicitly **expects** `const MyComponent = 42;` (non-markup!) to produce kind `component-def` — encodes the ast-builder.js:3634 bug as policy. No ast-builder fix landed S29-S34; the component-def vacuum behavior remains. S34 focused on codegen adopter bugs instead.

## Pattern
Tests use bun:test with describe/test/expect. No mocking framework — tests compile real .scrml source and assert on output strings. Browser tests use Puppeteer to load compiled output and query DOM. Integration tests compile multi-file scenarios end-to-end. Conformance tests verify spec section compliance with named test cases (conf-001 through conf-047 for block grammar). S34 adopter-bug tests follow one of two shapes: (a) direct-emitter unit tests that construct an AST node and call the emit fn in isolation, asserting on substrings of the returned JS; (b) compileScrml-driven fixture tests that write a .scrml file to a __fixtures__/ subtree, compile, and assert on dist/*.client.js or *.server.js contents.

## Tags
#scrmlTS #map #test #bun-test #conformance #expr-parity #gauntlet-s27 #gauntlet-s28 #gauntlet-s32 #s34 #adopter-bugs

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
