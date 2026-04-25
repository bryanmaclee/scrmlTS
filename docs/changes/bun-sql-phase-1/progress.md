# Progress: bun-sql-phase-1

Append-only timestamped log. Updated after each meaningful step.

- [00:00] Started — worktree rebased onto main `b3c83d3`. Baseline confirmed: 7562 pass / 40 skip / 0 fail.
- [00:05] `bun install` run — fixed missing acorn / happy-dom / puppeteer.
- [00:10] Bun.SQL API probed via `scripts/_probe_sql*.js` — confirmed tag-function shape, no `.query/.all/.get/.run/.prepare/.exec` methods, SQLite array binding unsupported, `sql.unsafe(rawSql, paramArray)` available for dynamic SQL.
- [00:15] Wrote impact-analysis.md and pre-snapshot.md.

## Decomposition Plan

Phase 1 emission migration is a single architectural sweep. Decomposed
into ordered steps so each step is independently committable. Pre-commit
hook requires green tests, so test updates are paired with their source
changes in a single commit per logical step.

- Step 1 — Update `rewriteSqlRefs()` in `compiler/src/codegen/rewrite.ts`
  (the core inline rewrite). Add E-SQL-006 emission for `.prepare()`.
- Step 2 — Update `case "sql"` and `case "transaction-block"` in
  `compiler/src/codegen/emit-logic.ts`.
- Step 3 — Update `emitHoistedForStmt` in `compiler/src/codegen/emit-control-flow.ts`.
- Step 4 — Update transaction envelope in `compiler/src/codegen/emit-server.ts`.
- Step 5 — Rename `dbVar` default `_scrml_db` → `_scrml_sql` in
  `compiler/src/codegen/context.ts` and `compiler/src/codegen/index.ts`.
  Extend client leak guard regex in `compiler/src/codegen/emit-client.ts`.
- Step 6 — Update test expectations for `sql-params.test.js`.
- Step 7 — Update test expectations for `sql-write-ops.test.js`.
- Step 8 — Update test expectations for `sql-loop-hoist-rewrite.test.js`.
- Step 9 — Update test expectations for `sql-batching-envelope.test.js`,
  `sql-nobatch.test.js`, `sql-client-leak.test.js`, `nested-program-db.test.js`.

## Commit cadence

- [16:30] Commit 6e21f76 — baseline artifacts + API probes.
- [18:30] All Steps 1-9 implemented. Source patches and test expectations
  updated in lockstep. SQL-test suite: 176/176 pass. Full suite: 7565 pass /
  40 skip / 0 fail (baseline +3 net tests).
- [18:50] Recompiled examples 03, 07, 08 — verified Bun.SQL emission shape
  (`await _scrml_sql\`...\``, no `_scrml_db` references, no `_scrml_sql_exec`).
- [18:55] Discovered pre-existing `lift ?{...}.method()` ast-builder issue
  (orphan `.all()` after `return null;`) — confirmed pre-existing in baseline
  via `git stash` round-trip. Documented in anomaly report as out-of-scope.
- [19:00] Wrote anomaly-report.md and design-review.md.
- [19:05] Bundled all source + test changes into a single Phase 1 commit
  (pre-commit hook requires green; bundling preserves green at every commit).

## Status

**COMPLETE** — Phase 1 (SQLite branch) Bun.SQL emission migration landed.
SPEC §44 alignment for SQLite is in place. Postgres/MySQL deferred to
Phase 2/3 per brief.

Final test state: 7565 pass / 40 skip / 0 fail / 7605 tests / 354 files.

## Pre-existing issues NOT addressed in Phase 1

- `lift ?{...}.method()` in server function emits orphan `.method()` after
  `return null; /* server-lift: non-expr form */`. Affects examples 03, 07, 08.
  Root cause: `compiler/src/ast-builder.js:2245-2251` consumes the BLOCK_REF
  for the SQL child but does not consume the trailing chained call. Should
  be filed as `fix-lift-sql-chained-call` for separate handling.
