# Progress: bun-sql-phase-2

Branch: `changes/bun-sql-phase-2` (rebased onto main `2e6a42d`)

## Plan

Decomposition (single-file dispatches, ordered by dependency):

1. Add `compiler/src/codegen/db-driver.ts` — pure helper: `resolveDbDriver(uri)` returns `{driver, connectionString}` or throws/returns error info for E-SQL-005.
2. Add `compiler/tests/unit/db-driver.test.js` — unit tests for prefix resolution (positive + negative cases).
3. Wire driver detection in `compiler/src/codegen/index.ts` at `annotateDbScopes` — call `resolveDbDriver` per `<program db=>`, attach `driver` to `_dbScope`, emit E-SQL-005 on unsupported prefix.
4. Extend `compiler/src/route-inference.ts` — add `new SQL(` server-only pattern (defensive).
5. protect-analyzer Postgres path — when `<db src="postgres://...">` is detected, use Bun.SQL `information_schema.columns` for introspection. Graceful E-PA-003 on connection failure.
6. Tests — `nested-program-db.test.js` add Postgres URI cases; new `protect-analyzer-postgres.test.js` (mocked or skipped if no Postgres).
7. Sample: `samples/compilation-tests/postgres-program-driver.scrml` — minimal Postgres-using `<program db>`, verify clean compile + correct emission shape.
8. Anomaly report.

## Log

- [start] Rebased onto main 2e6a42d. Branch created. Pre-snapshot written.
  Baseline 7578 pass / 0 fail / 355 files. Compiler deps installed (acorn).
  Pretest run, samples compiled.
