# test.map.md
# project: scrmlts
# updated: 2026-05-14T00:37:04-06:00  commit: ff9be0e

## Test Framework

| Field | Value |
|-------|-------|
| Runner | bun:test (built-in) |
| Config | bunfig.toml (`root = "compiler/tests/"`, `timeout = 10000`) |
| Pretest | `bash scripts/compile-test-samples.sh` — compiles ~311 sample fixtures |
| Run all | `bun test compiler/tests/` |
| Run subset | `bun test compiler/tests/unit` / `compiler/tests/integration` / `compiler/tests/conformance` |
| Run single | `bun test compiler/tests/unit/<file>.test.js` |
| With bail | `bun test ... --bail` (used by pre-commit hook) |
| Coverage | `bun test compiler/tests/ --coverage` |

## Test Counts (S90 close, 2026-05-14)

617 files; **12,275 pass / ~117 skip / 1 todo / 0 fail** (+363 pass, +13 files vs S89 close at 71305fe)
HEAD `ff9be0e` on v0.3.0 cut path (untagged). Current shipped tag: v0.2.6.

## New Tests Since S89 Baseline (71305fe)

**M-7C-D-12 runtime sentinel wave:**
- compiler/tests/conformance/conf-WIRE-FORMAT-DECODER.test.js — §57 dual-decoder conformance
- compiler/tests/integration/wire-format-encoder-decoder.test.js — wire format encoder+decoder integration

**A-2 Reachability Solver Components 2-5:**
- compiler/tests/unit/reachability-solver-component-2.test.ts — A-2.3 reactive_dep_closure tests
- compiler/tests/unit/reachability-solver-component-3.test.ts — A-2.4 server_fn_reachable_within tests
- compiler/tests/unit/reachability-solver-component-4.test.ts — A-2.5 auth_gated_boundaries_visible_to tests
- compiler/tests/unit/reachability-solver-component-5.test.ts — A-2.6 vendor_units_used_by tests

**A-3 AuthGraph wave:**
- compiler/tests/unit/auth-graph-site-enumerator.test.ts — A-3.1 auth-site enumeration tests
- compiler/tests/unit/auth-graph-role-enum-resolution.test.ts — A-3.2 role-enum resolution tests
- compiler/tests/unit/auth-graph-classifier.test.ts — A-3.3 gate classifier + W-AUTH-PAGE-INFERRED tests
- compiler/tests/unit/auth-graph-redirect-crossref.test.ts — A-3.4 redirect cross-ref + I-AUTH-REDIRECT-UNRESOLVED tests

**Conformance:**
- compiler/tests/conformance/conf-AUTH-003.test.js — auth gate conformance
- compiler/tests/conformance/conf-AUTH-004.test.js — auth gate conformance
- compiler/tests/conformance/conf-AUTH-005.test.js — auth gate conformance
- compiler/tests/conformance/conf-CG-001-warn.test.js — CG warning conformance
- compiler/tests/conformance/conf-CG-010.test.js — CG codegen conformance
- compiler/tests/conformance/conf-CG-014.test.js — CG codegen conformance

## Test Categories

| Category | Path | Approx Count |
|----------|------|--------------|
| Unit (named) | compiler/tests/unit/ (top-level .test.*) | ~380 files |
| Unit (gauntlet-s*) | compiler/tests/unit/gauntlet-s*/ | ~64 files |
| Integration | compiler/tests/integration/ | ~42 files |
| Conformance (top-level) | compiler/tests/conformance/ (top-level) | ~25 files |
| Conformance (subtrees) | compiler/tests/conformance/block-grammar, s32-fn-state-machine, tab | ~77 files |
| Browser | compiler/tests/browser/ | 11 files |
| LSP | compiler/tests/lsp/ | 10 files |
| Self-host | compiler/tests/self-host/ | 4 files |
| Commands | compiler/tests/commands/ | 4 files |
| E2E (Playwright) | e2e/tests/ | 5 spec files (3-browser) |

## Unit Test Coverage Highlights (S90 additions in brackets)

**A-2 Reachability Components [NEW S90]**
reachability-solver-component-2.test.ts [A-2.3 reactive_dep_closure],
reachability-solver-component-3.test.ts [A-2.4 server_fn_reachable_within],
reachability-solver-component-4.test.ts [A-2.5 auth_gated_boundaries_visible_to],
reachability-solver-component-5.test.ts [A-2.6 vendor_units_used_by]

**A-3 AuthGraph [NEW S90]**
auth-graph-site-enumerator.test.ts [A-3.1],
auth-graph-role-enum-resolution.test.ts [A-3.2],
auth-graph-classifier.test.ts [A-3.3 + W-AUTH-PAGE-INFERRED],
auth-graph-redirect-crossref.test.ts [A-3.4 + I-AUTH-REDIRECT-UNRESOLVED]

**Codegen / Wire Format [NEW S90]**
wire-format-encoder-decoder.test.js [integration], conf-WIRE-FORMAT-DECODER.test.js [conformance]

**A-2 carried forward from S89:**
reachability-solver-scaffold.test.js [A-2.1], reachability-entry-points.test.ts,
reachability-gate-classifier.test.ts, reachability-solver-component-1.test.ts [A-2.2]

**AST / Tokenizer / Parser**
ast-builder-*.test.js, tokenizer-*.test.js, expression-parser.test.js, block-splitter.test.js

**Pipeline Stages**
code-generator.test.js, type-system.test.js, dependency-graph.test.js, protect-analyzer.test.js,
route-inference.test.js, batch-planner.test.js, symbol-table.test.js, binding-registry.test.js,
name-resolver (p1e-name-resolver.test.js), module-resolver.test.js,
dg-markup-read-node-a12.test.js, dg-markup-read-emission-a13.test.js,
dg-markup-read-emission-a14.test.js, dg-markup-read-emission-a15.test.js

**Auth / Session**
session-auth.test.js, state-authority-codegen.test.js, state-authority-parsing.test.js,
stdlib-auth.test.js, stdlib-oauth.test.js, stdlib-oauth-presets.test.js
f-auth-002-export-modifiers.test.js [integration]

**Codegen Emitters**
emit-match.test.js, emit-test.test.js, emit-library.test.js, emit-lift.test.js,
emit-logic.test.js, engine-body-render.test.js, engine-body-children.test.js,
emit-expr-engine-routing-option-a.test.js, match-arm-*.test.js

**Conformance (§34 error codes)**
conf-AUTH-003..005 [S90], conf-CG-001-warn, conf-CG-010, conf-CG-014 [S90],
conf-WIRE-FORMAT-DECODER [S90], conf-INPUT-001..005 [S89], conf-CTRL-011,
conf-ERROR-008, conf-IMPORT-007, conf-LIFECYCLE-015, conf-LOOP-005..007, conf-META-EVAL-002,
conf-TRY-CATCH-IN-SCRML-SOURCE; block-grammar/conf-001..047 (47 files); s32-fn-state-machine/; tab/

**Stdlib**
stdlib-auth.test.js, stdlib-cron.test.js, stdlib-format.test.js, stdlib-fs.test.js,
stdlib-http.test.js, stdlib-oauth.test.js, stdlib-path.test.js, stdlib-process.test.js,
stdlib-redis.test.js, stdlib-regex.test.js, stdlib-router.test.js, stdlib-store.test.js, stdlib-time.test.js

## Fixtures & Factories

| Path | Contents |
|------|----------|
| compiler/tests/fixtures/ | promote-match-canonical.scrml, expr.ts (ExprNode builders), extract-user-fns.js |
| compiler/tests/helpers/ | expr.ts — structured ExprNode test construction utilities |
| compiler/tests/unit/__fixtures__/ | per-test scrml/JS snippet fixtures |
| compiler/tests/unit/_tmp_*/ | temporary snapshot directories (bug regression fixtures) |
| compiler/tests/commands/migrate-program-shape-fixtures/ | 7 bucket-classification fixtures |
| samples/compilation-tests/ | ~311 .scrml fixtures compiled by pretest; dist/ gitignored |
| e2e/ | Playwright: dev-server-fixture.ts; 02-counter, 03-contact-book, 05-multi-step-form, 14-mario, todomvc specs |

## Pattern

Tests use `bun:test` (`describe`, `test`, `expect`). Unit tests for pipeline passes:
1. Construct a minimal scrml source string or AST fragment
2. Run the target stage function directly (`splitBlocks`, `buildAST`, `runDG`, `runAuthGraph`, `computeAuthGatedBoundariesVisibleTo`, etc.)
3. Assert on the returned structure using `expect().toEqual()`, `expect().toContain()`, `expect().toMatchObject()`

Integration tests run `compileScrml()` from `api.js` and assert on output HTML, client JS, and server JS strings. Conformance tests assert that a given input produces a specific SPEC §34 error code from the pipeline error array. Reachability/auth-graph unit tests drive the component functions directly with fabricated DG/RouteMap/AuthGraph inputs.

## Tags
#scrmlts #map #test #bun #conformance #unit #integration #s90 #approach-a2 #approach-a3 #reachability #auth-graph #wire-format #playwright #e2e

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [build.map.md](./build.map.md)
- [error.map.md](./error.map.md)
