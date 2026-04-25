# Progress: bun-sql-phase-2

Branch: `changes/bun-sql-phase-2` (rebased onto main `2e6a42d`)

## Plan

Decomposition (single-file dispatches, ordered by dependency):

1. Add `compiler/src/codegen/db-driver.ts` — pure helper: `resolveDbDriver(uri)` returns `{driver, connectionString}` or returns error info for E-SQL-005.
2. Add `compiler/tests/unit/db-driver.test.js` — unit tests for prefix resolution (positive + negative cases).
3. Wire driver detection in `compiler/src/codegen/index.ts` at `annotateDbScopes` — call `resolveDbDriver` per `<program db=>`, attach `driver` to `_dbScope`, emit E-SQL-005 on unsupported prefix.
4. Extend `compiler/src/route-inference.ts` — add `new SQL(` server-only pattern (defensive).
5. protect-analyzer Postgres path — when `<db src="postgres://...">` is detected, route to shadow-DB construction (CREATE TABLE harvested from `?{}` blocks). Real connection-time introspection deferred (would require making PA async).
6. Tests — new `pa-postgres-uri.test.js` (10 tests) + new `program-db-driver-resolution.test.js` (14 tests).
7. Sample: `samples/compilation-tests/postgres-program-driver.scrml` — minimal Postgres-using `<program db>`, verify clean compile + correct emission shape.
8. Anomaly report.

## Log

- [start] Rebased onto main 2e6a42d. Branch created. Pre-snapshot written.
  Baseline 7578 pass / 0 fail / 355 files. Compiler deps installed (acorn).
  Pretest run, samples compiled.

- [step 1+2] db-driver.ts created (148 LOC). resolveDbDriver() classifies
  URI prefix into sqlite | postgres | mysql, returns Result<info, error>.
  isSupportedDbUri() convenience added. db-driver.test.js: 23 tests pass.
  Commit: `0abfd23`.

- [step 3] index.ts annotateDbScopes() patched: imports resolveDbDriver,
  classifies the db= value, attaches driver to _dbScope, pushes E-SQL-005
  CGError on unsupported prefix. On error we still annotate the scope so
  downstream codegen does not crash. Tests: 7601 / 0. Commit: `f0c6d1a`.

- [step 4] route-inference.ts: added `new SQL(` and `new Bun.SQL(`
  server-only patterns. Defensive — scrml source doesn't normally write
  these, but ^{} meta blocks could. Tests: 7601 / 0. Commit: `ad65a0c`.

- [step 5] protect-analyzer.ts: added isPostgresUri / isMysqlUri / isDriverUri
  helpers. processDbBlock() now skips filesystem resolution for driver URIs;
  the URI itself is the cache key. resolveDb() takes a srcIsDriverUri flag
  that forces shadow-DB construction. E-PA-002 message is driver-aware.
  Tests: 7601 / 0; PA suite 43 / 0. Commit: `aef06bc`.

- [step 6] Two new test files:
    pa-postgres-uri.test.js — 10 tests. Coverage: §A postgres:// shadow,
      §B postgresql:// alias, §C mysql:// symmetry, §D no-CREATE-TABLE
      → E-PA-002 with Phase-2 message, §E no FS touch, §F multi-table
      multi-?{} aggregation, §G protect= against driver-URI shadow.
    program-db-driver-resolution.test.js — 14 tests. Coverage: §A-§G
      same as db-driver.test.js but exercised through the full runCG()
      pipeline; §H _dbScope counter increments + named-worker exclusion.
  Tests: 7625 / 0. Commit: `3ad22ca`.

- [step 7] Sample postgres-program-driver.scrml created. Compiled cleanly
  (1 file in ~50ms). Verified emission shape:
    `await _scrml_sql\`INSERT INTO hits (when_ts) VALUES (\${Date.now()})\``
  Identical to SQLite emission — Phase 1 made the shape driver-agnostic.
  Negative path verified manually: mongodb:// emits E-SQL-005 with ^{}
  pointer, postgress:// (typo) emits E-SQL-005 echoing the bad scheme.
  Cleaned up scratch test scrml files. Commit: `496f304`.

- [step 8] Anomaly report — see anomaly-report.md.

## Working-tree mishap (recovered)

Mid-step-7 a `git stash pop` (intended to verify pre-existing api-dashboard
behavior) brought back an OLD stash from prior agent sessions
(`bug-h-rettype-fix`). It contained .claude/maps changes, deleted
giti-009 fix files, and an unmerged hand-off.md. I recovered with
`git checkout HEAD --` for the affected paths. The stash was dropped.
None of the stash content reached any commit on this branch.

## Final test count

7625 pass / 40 skip / 0 fail / 358 files. Net +47 tests over baseline 7578.
(All 47 are new Phase 2 coverage; no regressions.)
