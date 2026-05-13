# test.map.md
# project: scrmlts
# updated: 2026-05-13T15:00:00Z  commit: 9b98118

## Test Framework

| Field | Value |
|-------|-------|
| Runner | bun:test (built-in) |
| Config | bunfig.toml (`root = "compiler/tests/"`, `timeout = 10000`) |
| Pretest | `bash scripts/compile-test-samples.sh` — compiles ~288 sample fixtures |
| Run all | `bun test compiler/tests/` |
| Run subset | `bun test compiler/tests/unit` / `compiler/tests/integration` / `compiler/tests/conformance` |
| Run single | `bun test compiler/tests/unit/<file>.test.js` |
| With bail | `bun test ... --bail` (used by pre-commit hook) |
| Coverage | `bun test compiler/tests/ --coverage` |

## Test Counts (S88 close, 2026-05-13)
590 files; **11,912 pass / 117 skip / 1 todo / 0 fail**
Current shipped tag: v0.2.6 (`efbd1e8`). HEAD `9b98118` is on v0.3.0 cut path (untagged).

## New tests since S87 baseline (f1555b4)

**S88 — Approach A / LIFT fixes / safeCall / stdlib Phase 3a:**
- safe-call.test.js: +24 tests (SC-01..SC-24 — safeCall primitive)
- safe-call-async.test.js: +20 tests (safeCallAsync primitive)
- dg-markup-read-node-a12.test.js: A-1.2 MarkupReadDGNode shape + walker (createMarkupReadNode, findOwningRenderDGNode)
- dg-markup-read-emission-a13.test.js: A-1.3 markup-read edge emission (4 high-freq shapes: text-interp/attr/bind/if)
- dg-markup-read-emission-a14.test.js: A-1.4 call-ref + for-iterable + lift-template-body edge emission
- dg-markup-read-emission-a15.test.js: +14 tests — A-1.5 engine state-child + onTransition/Timeout/Idle edge emission
- lift-5-reconciler-ambient.test.js: LIFT-5 fix regression test
- todomvc-fixture-edit-mode.test.js: updated (LIFT-1..4 §B anchor tests now upgraded to assert correct output)
- sql-server-fn-runtime.test.js (integration): harden Bug 3a §1 against happy-dom Headers pollution flake (S88 fix)

## Test Categories

| Category | Path | Approx Count |
|----------|------|--------------|
| Unit | compiler/tests/unit/ | ~427 files |
| Integration | compiler/tests/integration/ | ~39 files |
| Conformance | compiler/tests/conformance/ | ~17 files |
| Browser | compiler/tests/browser/ | 11 files |
| LSP | compiler/tests/lsp/ | 10 files |
| Self-host | compiler/tests/self-host/ | 4 files |
| Commands | compiler/tests/commands/ | 4 files |
| E2E (Playwright) | e2e/tests/ | 5 spec files (3-browser) |

## Unit Test Coverage Highlights

Key test files grouped by domain:

**AST / Tokenizer / Parser**
ast-builder-*.test.js, tokenizer-*.test.js, expression-parser.test.js, block-splitter.test.js,
bs-comment-skip.test.js

**Pipeline Stages**
code-generator.test.js, type-system.test.js, dependency-graph.test.js, protect-analyzer.test.js,
route-inference.test.js, batch-planner.test.js, symbol-table.test.js, binding-registry.test.js,
name-resolver (p1e-name-resolver.test.js), module-resolver.test.js,
dep-graph-call-ref-args.test.js, dg-engine-cell-self-credit.test.js, dg-projected-var-reader-credit.test.js,
dg-markup-read-node-a12.test.js [S88 A-1.2], dg-markup-read-emission-a13.test.js [S88 A-1.3],
dg-markup-read-emission-a14.test.js [S88 A-1.4], dg-markup-read-emission-a15.test.js [S88 A-1.5]

**Codegen Emitters**
emit-match.test.js, emit-test.test.js, emit-library.test.js, emit-lift.test.js,
emit-logic.test.js, emit-logic-nested-fn.test.js, engine-body-render.test.js,
engine-body-children.test.js, emit-expr-engine-routing-option-a.test.js, emit-server-sql-emission.test.js,
method-chain-callback-emission.test.js, match-arm-codegen-bundle-bug-1.6-1.7.test.js,
match-arm-inline-markup-payload.test.js, match-arm-named-binding-parser.test.js,
lift-li-text-template.test.js (§B tests now assert CORRECT output — LIFT-1..4 fixed),
lift-5-reconciler-ambient.test.js [S88 LIFT-5 fix], todomvc-fixture-edit-mode.test.js [S88 upgraded]

**scrml:host / safeCall (NEW S88)**
safe-call.test.js (24 tests), safe-call-async.test.js (20 tests)

**Engine / State Machines**
machine-codegen.test.js, machine-parsing.test.js, machine-guards-integration.test.js,
machine-types.test.js, engine-*.test.js (8 files), computed-delay.test.js, timeout.test.js,
engine-ontimeout-end-to-end.test.js, engine-self-write-option-d.test.js

**Validators / Type System**
validator-catalog.test.js, validator-arg-parsing.test.js, validator-type-check.test.js,
type-encoding.test.js (4 files), type-system.test.js

**SQL / Database**
db-driver.test.js, sql-batching-*.test.js, sql-batch-*.test.js, sql-params.test.js,
sql-write-ops.test.js, reactive-decl-sql-chained-call.test.js,
emit-server-sql-emission.test.js, sql-server-fn-runtime.test.js (integration)

**Auth / CSRF**
csrf-baseline.test.js, csrf-bootstrap.test.js, session-auth.test.js, stdlib-auth.test.js, stdlib-oauth.test.js

**Channels / SSE / WebSockets**
channel.test.js, server-function-sse.test.js, p3a-*.test.js (channel cross-file, 8+ files),
channel-placement-shared-b19.test.js, p3a-pure-channel-file.test.js

**Stdlib**
stdlib-cron.test.js, stdlib-format.test.js, stdlib-fs.test.js, stdlib-http.test.js,
stdlib-path.test.js, stdlib-process.test.js, stdlib-redis.test.js, stdlib-regex.test.js,
stdlib-router.test.js, stdlib-store.test.js, stdlib-time.test.js,
stdlib-canonical-form-cleanup.test.js (28 guards for Phase 1 sweep)

**Reactivity**
reactive-arrays.test.js, reactive-deps.test.js, reactive-derived.test.js, runtime-reactivity.test.js

**Components**
component-expander.test.js, component-tags.test.js, cross-file-components.test.js, snippet-slot.test.js

**Lint**
lint-ghost-patterns.test.js, lint-i-match-promotable.test.js, lint-w-lint-013-*.test.js

**CSS**
css-at-rules.test.js, css-scope.test.js, css-variable-bridge.test.js, css-brace-stripping.test.js

**Meta**
meta-checker.test.js, meta-eval.test.js, meta-effect.test.js, meta-integration.test.js

**Migrate / Promote**
scrml-migrate.test.js, migrate-program-shape.test.js, migrate-program-shape-wave-3.5-bundle.test.js,
promote-match.test.js, promote-safety-harness.test.js

## Conformance Tests

Located in `compiler/tests/conformance/`. Test SPEC §34 error codes.

conf-AUTH-003.test.js, conf-AUTH-004.test.js, conf-AUTH-005.test.js,
conf-CG-001-warn.test.js, conf-CG-010.test.js, conf-CG-014.test.js,
conf-CTRL-011.test.js, conf-ERROR-008.test.js, conf-IMPORT-007.test.js,
conf-LIFECYCLE-015.test.js, conf-LOOP-005.test.js, conf-LOOP-006.test.js, conf-LOOP-007.test.js,
conf-META-EVAL-002.test.js

Subdir conformance: `s32-fn-state-machine/` (with REGISTRY.md), `tab/`, `block-grammar/`

## Fixtures & Factories

| Path | Contents |
|------|----------|
| compiler/tests/fixtures/ | promote-match-canonical.scrml, expr.ts (ExprNode builders), extract-user-fns.js |
| compiler/tests/helpers/ | expr.ts — structured ExprNode test construction utilities |
| compiler/tests/unit/__fixtures__/ | per-test scrml/JS snippet fixtures |
| compiler/tests/unit/_tmp_*/ | temporary snapshot directories (bug regression fixtures) |
| compiler/tests/commands/migrate-program-shape-fixtures/ | 7 bucket-classification fixtures for migrate --program-shape |
| samples/compilation-tests/ | ~288 .scrml fixtures compiled by pretest; dist/ output gitignored |
| e2e/ | Playwright e2e suite: fixtures/dev-server-fixture.ts; tests/02-counter.spec.ts, 03-contact-book.spec.ts, 05-multi-step-form.spec.ts, 14-mario.spec.ts, todomvc.spec.ts |

## Pattern

Tests use `bun:test` (`describe`, `test`, `expect`). Unit tests for pipeline passes typically:
1. Construct a minimal scrml source string or AST fragment
2. Run the target stage function directly (e.g. `splitBlocks(src)`, `buildAST(blocks)`, `runDG(input)`)
3. Assert on the returned structure using `expect().toEqual()`, `expect().toContain()`, `expect().toMatchObject()`

Integration tests run the full `compileScrml()` API from `api.js` on a .scrml source string and assert on:
- The output HTML string (structure, data attributes)
- The output client JS string (reactive wiring, event delegation)
- The output server JS string (route handlers, SQL)

Conformance tests assert that a given scrml input produces a specific error code from the pipeline error array.

scrml:host tests (safe-call.test.js, safe-call-async.test.js) import the runtime shim directly and exercise throw/resolve/reject paths.

## Tags
#scrmlts #map #test #bun #conformance #unit #integration #s88 #lift-fixes-complete #approach-a #safecall #playwright #e2e

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [build.map.md](./build.map.md)
- [error.map.md](./error.map.md)
