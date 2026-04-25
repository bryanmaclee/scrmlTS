# Pre-Snapshot: bun-sql-phase-2

Captured before any Phase 2 changes. Branch: `changes/bun-sql-phase-2`,
rebased onto main `2e6a42d`.

## Test baseline

```
 7578 pass
 40 skip
 0 fail
 27316 expect() calls
Ran 7618 tests across 355 files. [11.72s]
```

Confirmed via two consecutive runs (one had 2 transient ECONNREFUSED
failures from a network-dependent test — flaky, not Phase 2 territory).

## Existing SQL/driver state (Phase 1 landing)

- `_scrml_sql` is the canonical default `dbVar` in:
  - `compiler/src/codegen/context.ts:86` (CompileContext default)
  - `compiler/src/codegen/index.ts:286` (scoped counter prefix `_scrml_sql_<n>`)
  - `compiler/src/codegen/index.ts:363, 432` (compileCtx defaults)
  - `compiler/src/codegen/rewrite.ts:239, 1582, 1652, 1792` (rewriter defaults)
- `?{}` codegen emits `await _scrml_sql\`...\`` (tagged template, driver-agnostic)
- `_scrml_sql.unsafe(rawSql, paramArray)` for IN-list batch and DDL
- `_scrml_sql.unsafe("BEGIN DEFERRED" / "COMMIT" / "ROLLBACK")` for txn envelope
- E-SQL-006 emitted by `rewriteSqlRefs()` for `.prepare()`
- E-SQL-005 (unsupported db prefix) — **NOT YET EMITTED** anywhere

## Existing introspection sites

- `compiler/src/protect-analyzer.ts:274` — `new Database(dbPath, {readonly:true})` for `<db src=>`
- `compiler/src/protect-analyzer.ts:307` — `new Database(":memory:")` for shadow schema
- Both are SQLite-only

## Existing driver-string handling

- `compiler/src/codegen/index.ts:285-287` extracts `db=` value verbatim, stores in `_dbScope.connectionString`
- No prefix parsing, no driver detection — connection string flows through opaque
- `<program db=>` URI is **not validated** anywhere; whatever string the user provides reaches the host runtime

## Existing route-inference patterns

- `compiler/src/route-inference.ts:218` — `new Database(...)` is server-only resource pattern
- No `new SQL(...)` pattern (Bun.SQL constructor is not yet recognized)

## E2E sample compilation state

12 browser-test samples compiled (via `bun run pretest`). 54 total samples in
`samples/compilation-tests/` — Phase 1 noted that `lift ?{...}.method()` examples
(03, 07, 08) had a pre-existing AST builder bug (`fix-lift-sql-chained-call`,
since landed). All sample compilations expected to succeed.

## What Phase 2 will add (intent)

1. New helper: `compiler/src/codegen/db-driver.ts` (or similar) — `resolveDbDriver(uri)` returns `{ driver, connectionString }` or throws E-SQL-005.
2. Wire driver detection at the `<program db=>` annotation site so unsupported prefixes (e.g. `mongodb://`) emit E-SQL-005 at compile time.
3. Add `new SQL(` to route-inference's server-only patterns (defensive — `new SQL` already unreachable from scrml source, but a developer-written `^{}` meta block could use it).
4. protect-analyzer: extend to recognize Postgres URIs in `<db src="postgres://...">`. Use Bun.SQL `information_schema.columns` query for compile-time introspection. Graceful failure (emit E-PA-003 family) when connection fails.
5. Tests: driver-resolution unit tests, compile a Postgres `<program db=>` sample, verify shape.

## Out of scope

- MySQL (Phase 3)
- Runtime smoke against real Postgres
- Changing Phase 1's tagged-template emission shape

## Tags

#phase-2 #pre-snapshot #bun-sql

## Links

- Brief: this dispatch
- Phase 1 anomaly: docs/changes/bun-sql-phase-1/anomaly-report.md
- SPEC §44.2: compiler/SPEC.md:14644
