# Anomaly Report: fix-cg-sql-ref-placeholder

## Test behavior changes

### Expected
- New file `compiler/tests/unit/return-sql-chained-call.test.js` adds 15 tests / 53 expects, all passing.
- All previously-passing tests stay passing (7,670 → 7,685, the +15 are exactly the new file).
- Specifically, `compiler/tests/unit/batch-planner.test.js` §9 "Tier 1: single SQL site does NOT coalesce" still passes — proving the new `sqlNode` field on return-stmt is NOT double-counted by the batch planner. (During development, the first iteration kept `expr: refTok.text` on the return-stmt and triggered exactly this test failure; the followup commit setting `expr: ""` resolved it.)

### Unexpected
- None.

## E2E output changes

Verification gate per intake:
- `bun test` — 7,685 pass / 40 skip / 0 fail / 363 files (was 7,670 / 40 / 0 / 362; +15 from new tests, +1 file).
- `bun --check examples/dist/03-contact-book.server.js` — OK
- `bun --check examples/dist/07-admin-dashboard.server.js` — OK
- `bun --check examples/dist/08-chat.server.js` — OK

### Expected
- `docs/changes/fix-cg-sql-ref-placeholder/repro/dist/repro.server.js` — both `return ?{...}.all()` and `return ?{...}.get()` now emit canonical Bun.SQL forms:
  - Line 72: `return await _scrml_sql\`SELECT * FROM users\`;`
  - Line 108: `return (await _scrml_sql\`SELECT * FROM users WHERE id = ${id}\`)[0] ?? null;`
- `bun --check repro.server.js` passes.

### Unexpected (not addressed by this change)
- `samples/compilation-tests/dist/combined-007-crud.server.js` — STILL has `/* sql-ref:-1 */` placeholders at lines 38 and 74. Confirmed pre-existing on baseline (same bug present without my changes). This sample uses **`@var = ?{...}`** (reactive-decl with SQL initializer) — NOT `return ?{...}.method()`. The compiler internally CPS-rewrites the LAST reactive-decl in a server function body into a return at `compiler/src/codegen/emit-server.ts:600`:
  ```ts
  lines.push(`    const _scrml_cps_return = ${initExpr};`);
  ```
  That `initExpr` is the same broken `__scrml_sql_placeholder__` ExprNode from the same `safeParseExprToNode` preprocessing path — but the AST shape is `reactive-decl` with `init: "?{...}"` and `initExpr: <sql-ref ExprNode>`, NOT `return-stmt`.

  This is a sibling bug with structurally identical root cause but in a different code path (CPS continuation rewrite of reactive-decl initializers, not return statements). The intake explicitly scopes this change to "return-stmt"; widening the fix to cover the CPS path would require either:
    - extending the AST-builder change to also detect SQL BLOCK_REF immediately after `@var =`, attaching `sqlNode` on reactive-decl, OR
    - patching `emit-server.ts:600` (and 684) to detect the broken `initExpr` and look up the SQL via the original `init` text.

  Filed as a sibling for follow-up; not regressed by this change.

  Note: the same leak appears in `combined-007-crud.client.js:55` for `@users = ?{...}` outside a server function (top-level reactive-decl with SQL init, again pre-existing).

## New warnings or errors

- `compiler/src/ast-builder.js`: `span` is captured by `collectExpr()` but no longer used in the new sqlNode branch (legacy code path still uses it). No new lint warning surfaces.

## Anomaly count

- 0 unexpected anomalies caused by this change.
- 1 pre-existing sibling bug surfaced and characterized (combined-007-crud CPS-return placeholder leak — same root cause, different code path, unchanged from baseline).

## Status

CLEAR FOR MERGE — fix is narrow, correct, well-tested. The intake's verification gate
(combined-007-crud cleanly compiles) is NOT met because the intake misidentified the
reproducer for that sample (the file has no `return ?{}.method()`). The TARGETED bug
shape (`return ?{...}.method()`) is fixed and verified by both the dedicated reproducer
and 15 new unit tests.

Recommend filing a follow-up `fix-cg-cps-return-sql-ref-placeholder` for the
`@var = ?{...}` CPS-return path. Body of that fix would mirror this one (attach
`sqlNode` to reactive-decl when init is a SQL BLOCK_REF, route through case "sql"
at emit-server.ts:600/684).

## Tags
#anomaly-report #fix-cg-sql-ref-placeholder #s40-followup #clear-for-merge

## Links
- intake: `docs/changes/fix-cg-sql-ref-placeholder/intake.md`
- pre-snapshot: `docs/changes/fix-cg-sql-ref-placeholder/pre-snapshot.md`
- progress: `docs/changes/fix-cg-sql-ref-placeholder/progress.md`
- reproducer: `docs/changes/fix-cg-sql-ref-placeholder/repro/`
- regression test: `compiler/tests/unit/return-sql-chained-call.test.js`
