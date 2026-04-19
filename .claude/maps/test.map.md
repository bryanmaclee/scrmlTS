# test.map.md
# project: scrmlTS
# updated: 2026-04-19T22:00:00Z  commit: 74303d3

## Test Framework
Runner: bun test (built-in)
Config: bunfig.toml (root: compiler/tests/, timeout: 10000ms)
Pretest hook: scripts/compile-test-samples.sh (recompiles the sample corpus before every bun test)
Run all: bun test compiler/tests/
Run single: bun test compiler/tests/unit/some-file.test.js
Run category: bun test compiler/tests/unit/ or compiler/tests/integration/

## Test Categories
Unit:         compiler/tests/unit/*.test.js — 167 top-level files + gauntlet-s{19,20,22,23,24,25,26,27,28}/ subtrees
  gauntlet-s19/ — Phase 2 cleanup fixtures (10 files)
  gauntlet-s20/ — Phase 5–7 fixtures (5 files + __fixtures__/)
  gauntlet-s22/ — payload-variants cluster
  gauntlet-s23/ — meta-bugs
  gauntlet-s24/ — §2a push-scope extensions
  gauntlet-s25/ — §2a loop/if + §35.5 lin request/poll
  gauntlet-s26/ — §51.13 projection machine phases 1-6 + E-MACHINE-019 audit
  gauntlet-s27/ — 8 tests: unit-variant transition, guarded wildcard, effect-body refs, audit timer/freeze, audit entry rule+label, replay primitive, replay compile-validation, match-arm expression-only
  gauntlet-s28/ — 6 tests: elision-cat-2a-2b, elision-slice-2-3-4, error-arm-scope, multi-stmt-effect-body, payload-enum-comma-split, projection-guard-phase-7
Integration:  compiler/tests/integration/*.test.js — 6 files (expr-parity, expr-node-corpus-invariant, lin-decl-emission, lin-enforcement-e2e, self-compilation, self-host-smoke)
Browser E2E:  compiler/tests/browser/*.test.js — 11 files (Puppeteer-based)
Conformance:  compiler/tests/conformance/{block-grammar,tab}/*.test.js — 77 files (block-grammar: 47, tab: 30)
Commands:     compiler/tests/commands/*.test.js — 3 files (build-adapters, init, library-mode-types)
Self-host:    compiler/tests/self-host/*.test.js — 4 files (ast, bs, bpp, tab)

## Current Baseline (verified this refresh)
**7,183 pass / 10 skip / 2 fail** / 26,415 expects / 315 files / 10.83s (S29 open at commit 74303d3)
The 2 persistent failures are self-host smoke tests deferred per user. 8 of the 10 skips are TodoMVC happy-dom harness-only (Puppeteer covers).

## Fixtures & Factories
compiler/tests/unit/__fixtures__/ — top-level test fixture data
compiler/tests/unit/gauntlet-s20/__fixtures__/ — per-test scratch trees (compiler runs, then rmSync)
compiler/tests/helpers/expr.ts — ExprNode round-trip assertion helper (assertRoundTrip)
compiler/tests/helpers/extract-user-fns.js — S28: centralizes 8 duplicated regexes for user-fn extraction; bare-keyword entries (`effect`, `lift`, `replay`, etc.) now gain `(?!_\d)` negative lookahead
samples/compilation-tests/ — 782 .scrml files across 12+ subdirs (bench + expr-parity corpus)
samples/compilation-tests/gauntlet-s19-* — 4 S19 gauntlet fixture dirs
samples/compilation-tests/gauntlet-s20-* — 7 S20 gauntlet fixture dirs (channels, error-test, error-ux, meta, sql, styles, validation)

## Key Test Files (S27-S28)
compiler/tests/unit/gauntlet-s28/elision-cat-2a-2b.test.js — S28 slice 1, 22 tests for classifyTransition + emitElidedTransition (literal unit-variant RHS against unguarded wildcard)
compiler/tests/unit/gauntlet-s28/elision-slice-2-3-4.test.js — S28 slices 2-4, 17 tests covering Cat 2.d payload literals, Cat 2.f compile-time E-MACHINE-001, setNoElide/env-var
compiler/tests/unit/gauntlet-s28/error-arm-scope.test.js — S28 E-SCOPE-001 walk of arm.handlerExpr (6 tests)
compiler/tests/unit/gauntlet-s28/multi-stmt-effect-body.test.js — S28 parseMachineRules splitRuleLines with depth tracking (6 tests)
compiler/tests/unit/gauntlet-s28/payload-enum-comma-split.test.js — S28 parseEnumBody splitTopLevel on single-line payload variants (5 tests)
compiler/tests/unit/gauntlet-s28/projection-guard-phase-7.test.js — S28 phase 7 guarded projection property-test generator (8 tests)
compiler/tests/unit/gauntlet-s27/replay-primitive.test.js — S27 `replay(@target, @log [, index])`
compiler/tests/unit/gauntlet-s27/replay-compile-validation.test.js — S27-S28 E-REPLAY-001/002/003 compile-time validation
compiler/tests/unit/gauntlet-s27/unit-variant-transition-regression.test.js — S27 runtime transition bug regression
compiler/tests/unit/gauntlet-s27/guarded-wildcard-rules.test.js — S27 guarded wildcard rule runtime firing
compiler/tests/unit/gauntlet-s27/effect-body-reactive-refs.test.js — S27 rewriteExpr for @-refs in machine effect bodies
compiler/tests/unit/gauntlet-s27/audit-timer-and-freeze.test.js — S27 §51.11 audit completeness (timer transitions + freeze)
compiler/tests/unit/gauntlet-s27/audit-entry-rule-label.test.js — S27 §51.11 audit entry shape extension
compiler/tests/unit/gauntlet-s27/match-arm-expression-only.test.js — S27 §18 match-arm expression-only form on a single line
compiler/tests/integration/expr-parity.test.js — corpus parity test (ExprNode emitExpr vs string rewriteExpr)
compiler/tests/integration/expr-node-corpus-invariant.test.js — ExprNode structural invariant checks

## Coverage gap flagged by S29 diagnosis
compiler/tests/unit/tab.test.js:649-654 explicitly **expects** `const MyComponent = 42;` (non-markup!) to produce kind `component-def` — this test encodes the bug as policy. No test asserts that non-markup RHS uppercase-const decls fall through to const-decl or that subsequent sibling declarations survive adjacent to an uppercase-const-not-markup node.

## Pattern
Tests use bun:test with describe/test/expect. No mocking framework — tests compile real .scrml source and assert on output strings. Browser tests use Puppeteer to load compiled output and query DOM. Integration tests compile multi-file scenarios end-to-end. Conformance tests verify spec section compliance with named test cases (conf-001 through conf-047 for block grammar). Gauntlet-s28 tests use beforeAll/afterAll to create and tear down a per-test __fixtures__/ subtree with the test's inline scrml source.

## Tags
#scrmlTS #map #test #bun-test #conformance #expr-parity #gauntlet-s27 #gauntlet-s28 #component-def-bug

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
