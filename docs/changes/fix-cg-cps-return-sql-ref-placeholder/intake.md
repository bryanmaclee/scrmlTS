# fix-cg-cps-return-sql-ref-placeholder — Intake

**Surfaced:** S40 2026-04-24, by `fix-cg-sql-ref-placeholder` agent.
**Status:** filed, not started.
**Priority:** medium — same severity as the parent fix; affects `@var = ?{...}` (reactive-decl with SQL initializer).

## Symptom

`combined-007-crud.scrml` server.js compiles successfully but `bun --check` fails with `/* sql-ref:-1 */` placeholder leaks at lines 38 and 74. Same placeholder string as the bug fixed in `15a0698`/`2a05585` (S40), but a different code path.

## Root cause

Per the parent fix's anomaly report (`docs/changes/fix-cg-sql-ref-placeholder/anomaly-report.md`):

> **Different code path: CPS rewrite of `@var = ?{...}`** (reactive-decl with SQL initializer) at `compiler/src/codegen/emit-server.ts:600`. Structurally identical to the return-stmt bug — sql-ref ExprNode emitted as a comment placeholder by `emit-expr.ts:403` — but flows through `reactive-decl` not `return-stmt`.

So:
- **S40 fixed:** `lift ?{...}.method()` (S40 commits `4074ea3`..`baccf56`)
- **S40 fixed:** `return ?{...}.method()` (commit `2a05585`)
- **STILL BROKEN:** `@var = ?{...}` (reactive-decl initializer in CPS-rewritten server context)

Three `?{}` parent contexts; two fixed; one remaining.

## Reproducer

`samples/compilation-tests/combined-007-crud.scrml` — has `@var = ?{}` shapes that exercise this path.

Or write minimal:

```scrml
<program db="./test.db">

< db tables="users">

  ${
    server function loadUser(id) {
      @user = ?{`SELECT * FROM users WHERE id = ${id}`}.get()
      return @user
    }
  }
</>
```

Compile, look at server.js — expect placeholder leak around the `@user = ...` site.

## Suggested fix

Mirror the `2a05585` fix pattern but extended:
1. Detect SQL BLOCK_REF in `reactive-decl` initializer at parse time (similar to where return-stmt was extended)
2. Build a structured `sqlNode` field on the reactive-decl
3. In `emit-server.ts:600` (the `_scrml_cps_return = ${initExpr}` site), check for `sqlNode` and emit `await _scrml_sql\`...\`` instead of the placeholder ExprNode emission

The pattern is well-established now from the lift+SQL and return+SQL fixes.

## Verification

- Reproducer compiles + `bun --check` passes
- `combined-007-crud.scrml` compiles + `bun --check` passes
- Add regression test (parallel to `return-sql-chained-call.test.js`)
- No regressions in existing SQL tests

## Reference

- Parent fix: commit `2a05585` (return path), `15a0698` (lift path)
- Parent anomaly report: `docs/changes/fix-cg-sql-ref-placeholder/anomaly-report.md`
- Sibling pattern: `consumeSqlChainedCalls` helper in ast-builder.js (S40)

## Tags
#bug #codegen #sql #reactive-decl #cps #pre-existing #medium-priority
