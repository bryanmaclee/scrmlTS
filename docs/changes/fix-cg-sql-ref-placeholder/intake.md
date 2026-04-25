# fix-cg-sql-ref-placeholder — Intake

**Surfaced:** S40 2026-04-24, by Bun.SQL Phase 2 agent.
**Status:** filed, not started.
**Priority:** medium — affects `return ?{...}.all()` from server functions.

## Symptom

When a `server function` does `return ?{...}.all()` (or `.get()`), the emitted server JS contains a `/* sql-ref:-1 */` placeholder comment instead of the rewritten Bun.SQL tagged-template call.

## Confirmed pre-existing

Phase 2 agent verified on baseline `2e6a42d` by recompiling `samples/compilation-tests/combined-007-crud.scrml` — same placeholder appears. NOT a Phase 1 or Phase 2 regression.

## Reproducer (suggested)

Write a minimal scrml:

```scrml
<program db="./test.db">

< db tables="users">

  ${
    server function getAll() {
      return ?{`SELECT * FROM users`}.all()
    }
  }
</>
```

Compile, inspect emitted server.js. Expected: `return await _scrml_sql\`SELECT * FROM users\`;`. Actual: `return /* sql-ref:-1 */;` or similar placeholder.

`samples/compilation-tests/combined-007-crud.scrml` already triggers it; that's a starting reproducer.

## Why this matters

`return ?{...}.method()` is the canonical way to expose query results from a server function. The Phase 1 + lift+sql work covered the `lift ?{...}.method()` path inside server functions, but **bare `return`** at the function-return position appears to take a different codegen path that wasn't migrated.

Phase 2's sample (`postgres-program-driver.scrml`) deliberately uses fire-and-forget INSERT to avoid this orthogonal bug.

## Root cause hypothesis (unverified)

The `return` statement parser may be capturing the `?{}` BLOCK_REF as a placeholder reference (sql-ref index lookup) and emitting it without applying `rewriteSqlRefs`. Likely lives in the codegen path that handles `return` statements containing SQL contexts, possibly `emit-server.ts` or `emit-logic.ts` near the `case "return-stmt"` branch.

## Suggested fix scope

1. Trace `/* sql-ref:` markers in codegen output — find the emission site
2. Apply the same Bun.SQL tagged-template rewrite (via `buildTaggedTemplate` or `rewriteSqlRefs`) at that site
3. Add regression test: `return ?{`SELECT...`}.all()` from server fn → emits `await _scrml_sql\`...\``
4. Recompile combined-007-crud, verify clean `bun --check`

## Reference

- Bun.SQL Phase 2 anomaly report (commit `9ef0ccb`)
- `fix-lift-sql-chained-call` (`15a0698`) — fixed the parallel `lift ?{}.method()` path
- `samples/compilation-tests/combined-007-crud.scrml` — existing reproducer

## Tags
#bug #codegen #sql #return-stmt #pre-existing #medium-priority
