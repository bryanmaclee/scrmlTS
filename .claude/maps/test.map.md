# test.map.md
# project: scrmlTS
# updated: 2026-04-12T20:00:00Z  commit: 623aeac

## Test Framework
Runner: bun test (built-in)
Config: bunfig.toml (root: compiler/tests/, timeout: 10000ms)
Run all: bun test compiler/tests/
Run single: bun test compiler/tests/unit/some-file.test.js
Run category: bun test compiler/tests/unit/ or compiler/tests/integration/

## Test Categories
Unit: compiler/tests/unit/*.test.js — ~140 files
Integration: compiler/tests/integration/*.test.js — 6 files (expr-parity, expr-node-corpus-invariant, lin-enforcement-e2e, lin-decl-emission, self-compilation, self-host-smoke)
Browser E2E: compiler/tests/browser/*.test.js — 11 files (Puppeteer-based)
Conformance: compiler/tests/conformance/{block-grammar,tab}/*.test.js — ~77 files (block-grammar: 47, tab: 30)
Commands: compiler/tests/commands/*.test.js — 3 files (build-adapters, init, library-mode-types)
Self-host: compiler/tests/self-host/*.test.js — 4 files (ast, bs, bpp, tab)

## Current Baseline
~5,709 pass / ~149 fail / 0 skip (S8, 2026-04-12)
Non-deterministic browser/dist tests account for variance.

## Fixtures & Factories
compiler/tests/unit/__fixtures__/ — test fixture data (empty at scan time)
compiler/tests/helpers/expr.ts — ExprNode round-trip assertion helper (assertRoundTrip)
samples/compilation-tests/ — 280 .scrml compilation test entries (used by bench and expr-parity)

## Key Test Files (Phase 3 related)
compiler/tests/integration/expr-parity.test.js — 286-file corpus parity test comparing ExprNode emitExpr vs string rewriteExpr
compiler/tests/integration/expr-node-corpus-invariant.test.js — ExprNode structural invariant checks
compiler/tests/unit/expression-parser.test.js — expression parser unit tests
compiler/tests/unit/expr-node-round-trip.test.js — round-trip invariant: emitStringFromTree(parseExprToNode(x)) === x
compiler/tests/unit/callback-props.test.js — callback prop binding codegen tests

## Pattern
Tests use bun:test with describe/test/expect. No mocking framework — tests compile real .scrml source and assert on output strings. Browser tests use Puppeteer to load compiled output and query DOM. Integration tests compile multi-file scenarios end-to-end. Conformance tests verify spec section compliance with named test cases (conf-001 through conf-047 for block grammar).

## Tags
#scrmlTS #map #test #bun-test #conformance #expr-parity

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
