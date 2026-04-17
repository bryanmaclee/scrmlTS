# test.map.md
# project: scrmlTS
# updated: 2026-04-17T17:00:00Z  commit: 41e4401

## Test Framework
Runner: bun test (built-in)
Config: bunfig.toml (root: compiler/tests/, timeout: 10000ms)
Pretest hook: scripts/compile-test-samples.sh (recompiles the sample corpus before every bun test)
Run all: bun test compiler/tests/
Run single: bun test compiler/tests/unit/some-file.test.js
Run category: bun test compiler/tests/unit/ or compiler/tests/integration/

## Test Categories
Unit:         compiler/tests/unit/*.test.js — ~157 top-level files + gauntlet-s19/ (10) + gauntlet-s20/ (5)
  gauntlet-s19/ — Phase 2 cleanup fixtures (equality-diagnostics, fn-prohibitions, import-export-scope-use, is-not-type-checks, lin-checker, match-exhaustiveness, phase3-wrapup, server-boundary, tokenizer-slash, type-annot-mismatch)
  gauntlet-s20/ — Phase 5–7 fixtures (error-handling-codegen [11 tests S21], fn-purity-reactive, import-resolution, machine-or-alternation [§51 S21], meta-gauntlet) + __fixtures__/ (per-test beforeAll/afterAll mkdir/rm)
Integration:  compiler/tests/integration/*.test.js — 6 files (expr-parity, expr-node-corpus-invariant, lin-decl-emission, lin-enforcement-e2e, self-compilation, self-host-smoke)
Browser E2E:  compiler/tests/browser/*.test.js — 11 files (Puppeteer-based)
Conformance:  compiler/tests/conformance/{block-grammar,tab}/*.test.js — 77 files (block-grammar: 47, tab: 30)
Commands:     compiler/tests/commands/*.test.js — 3 files (build-adapters, init, library-mode-types)
Self-host:    compiler/tests/self-host/*.test.js — 4 files (ast, bs, bpp, tab)

## Current Baseline
**6,824 pass / 10 skip / 2 fail** / 25,375 expects / 273 files / 4.75s (S21, 2026-04-17)
The 2 persistent failures are self-host smoke tests deferred per user. 8 of the 10 skips are TodoMVC happy-dom harness-only (Puppeteer covers).

## Fixtures & Factories
compiler/tests/unit/__fixtures__/ — top-level test fixture data
compiler/tests/unit/gauntlet-s20/__fixtures__/ — per-test scratch trees (compiler runs, then rmSync)
compiler/tests/helpers/expr.ts — ExprNode round-trip assertion helper (assertRoundTrip)
samples/compilation-tests/ — 781 .scrml files across 12 subdirs (bench + expr-parity corpus)
samples/compilation-tests/gauntlet-s19-* — 4 S19 gauntlet fixture dirs
samples/compilation-tests/gauntlet-s20-* — 7 S20 gauntlet fixture dirs (channels, error-test, error-ux, meta, sql, styles, validation), each with dist/ output

## Key Test Files (S21 + Phase 3 related)
compiler/tests/unit/gauntlet-s20/error-handling-codegen.test.js — 11 tests covering §19 codegen rewrite (fail tagged-object, ? propagation in nested bodies, !{} value-based catch)
compiler/tests/unit/gauntlet-s20/machine-or-alternation.test.js — §51 `|` alternation expansion + E-MACHINE-014 duplicate check
compiler/tests/unit/gauntlet-s20/import-resolution.test.js — E-IMPORT-006 missing-file enforcement
compiler/tests/unit/gauntlet-s20/fn-purity-reactive.test.js — E-FN-003 for reactive writes inside fn bodies
compiler/tests/unit/gauntlet-s20/meta-gauntlet.test.js — meta (^{}) bug fixes (Phase 5 S20)
compiler/tests/unit/emit-logic-s19-error-handling.test.js — 14 tests, rewritten S21 to match new §19 return-value error model
compiler/tests/integration/expr-parity.test.js — corpus parity test comparing ExprNode emitExpr vs string rewriteExpr
compiler/tests/integration/expr-node-corpus-invariant.test.js — ExprNode structural invariant checks
compiler/tests/unit/expression-parser.test.js — expression parser unit tests
compiler/tests/unit/expr-node-round-trip.test.js — round-trip invariant: emitStringFromTree(parseExprToNode(x)) === x

## Pattern
Tests use bun:test with describe/test/expect. No mocking framework — tests compile real .scrml source and assert on output strings. Browser tests use Puppeteer to load compiled output and query DOM. Integration tests compile multi-file scenarios end-to-end. Conformance tests verify spec section compliance with named test cases (conf-001 through conf-047 for block grammar). Gauntlet-s20 tests use beforeAll/afterAll to create and tear down a per-test __fixtures__/ subtree with the test's inline scrml source.

## Tags
#scrmlTS #map #test #bun-test #conformance #expr-parity #gauntlet-s20 #gauntlet-s19

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
