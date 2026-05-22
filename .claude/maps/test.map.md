# test.map.md
# project: scrmlts
# updated: 2026-05-22T00:00:00Z  commit: 5d2003dd

## Test Framework
Runner: bun test (Bun >=1.3.13 built-in; uses `bun:test` API)
Config: bunfig.toml — [test] root="compiler/tests/", timeout=10000ms
Browser tests: @happy-dom/global-registrator + happy-dom; e2e via @playwright/test
Run all: `bun test compiler/tests/`  (preceded by `pretest` sample compilation)
Run single: `bun test compiler/tests/unit/<file>.test.js`
Run a name: `bun test compiler/tests/<file>.test.js -t "<test name>"`

## Test Categories  (721 .test.js files total)
Unit:         compiler/tests/unit/**          — ~509 files
Integration:  compiler/tests/integration/**   — ~75 files
Conformance:  compiler/tests/conformance/**   — ~105 files (SPEC-section behavior)
Browser:      compiler/tests/browser/**       — happy-dom; excluded from pre-commit
Commands:     compiler/tests/commands/**      — CLI subcommand tests
LSP:          compiler/tests/lsp/**
Self-host:    compiler/tests/self-host/**
E2E:          e2e/**                          — Playwright (separate runner)

## Parser-Conformance Suite  (load-bearing for the M5 swap / C1+C2)
Top-level files at compiler/tests/:
  parser-conformance-lexer.test.js            — native lexer vs Acorn (M1.x)
  parser-conformance-expr.test.js             — native Expr AST vs Acorn (M2.x)
  parser-conformance-stmt.test.js             — native Stmt AST vs Acorn (M3.x)
  parser-conformance-markup.test.js           — native markup Block tree (MKx); +287 lines
                                                S119 (HTML void-element + state-recognition)
  parser-conformance-corpus.test.js           — bench corpus + .scrml smoke pass (new S119)
  parser-conformance-canary.test.js           — dual-pipeline-canary harness (new S119)
  parser-conformance-collect-hoisted.test.js  — collectHoisted hoist-synthesis (A3)
  parser-conformance-parse-file.test.js       — `nativeParseFile` FileAST assembler (C1; new S119)
Native-parser bridge unit tests (compiler/tests/unit/):
  translate-stmt-bridge.test.js               — R1 native Stmt[] → live LogicStatement[]
  translate-expr-bridge.test.js               — A2 native Expr → live ExprNode
  native-parser-core-decl-keywords.test.js    — B4/B5/B6 lin/type/fn productions
  native-parser-scrml-extension-exprs.test.js — B1/B2/B3/B7 ?/!{}/~/throw-try productions
Support dir: compiler/tests/parser-conformance/
  dual-pipeline-canary.js — the C2 proof instrument. Runs LIVE (splitBlocks→buildAST)
    AND NATIVE (nativeParseFile) on a source; structurally diffs the two FileASTs along
    the top-level node-kind sequence, the RECURSIVE node-kind sequence (deep axis), the
    6 hoist counts, hasProgramRoot, and the diagnostic streams. `classifyDivergence`
    tags EXACT / DIFF-top-seq / DIFF-deep-seq / DEFERRAL-* classes. True EXACT requires
    both the top-level AND recursive sequences to match.
  corpus-enumerator.js, parsers.js (Acorn-oracle adapter), tier-diff.js, bench/, markup-bench/.
These tests ARE the source of truth for native-parser pass/skip/fail status.

## Pre-commit Test Gate
`bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance --bail`
Browser tests are NOT in the pre-commit gate (run separately / in pre-push).

## Fixtures & Factories
compiler/tests/fixtures/  — promote-match-canonical.scrml, promote-multi-file-app/
compiler/tests/helpers/   — expr.ts (expression test helpers), extract-user-fns.js
samples/compilation-tests/ — ~318 test-case directories driven by pretest
                             (compile-test-samples.sh); counted, not enumerated.

## Pattern
Tests use `bun:test` (`describe` / `test` / `expect`). Compiler tests drive
`compileScrml()` from compiler/src/api.js and assert on `result.errors` /
`result.warnings` / `result.outputs`. Diagnostic-stream partition rule (memory
S92/S93): W-* / I-* + severity warning/info → `result.warnings`; tests asserting
on W-/I- codes (including the S119 `I-NATIVE-BLOCK-*` codes) MUST use a
cross-stream helper, not `result.errors.filter`. Parser-conformance tests diff
native-parser output against the Acorn oracle; the dual-pipeline canary diffs the
native `nativeParseFile` FileAST against the live `buildAST` FileAST.

## Tags
#scrmlts #map #test #bun-test #parser-conformance #native-parser #dual-pipeline-canary

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [build.map.md](./build.map.md)
