# Progress: bun-sql-phase-1

Append-only timestamped log. Updated after each meaningful step.

- [00:00] Started — worktree rebased onto main `b3c83d3`. Baseline confirmed: 7562 pass / 40 skip / 0 fail.
- [00:05] `bun install` run — fixed missing acorn / happy-dom / puppeteer.
- [00:10] Bun.SQL API probed via `scripts/_probe_sql*.js` — confirmed tag-function shape, no `.query/.all/.get/.run/.prepare/.exec` methods, SQLite array binding unsupported, `sql.unsafe(rawSql, paramArray)` available for dynamic SQL.
- [00:15] Wrote impact-analysis.md and pre-snapshot.md.

## Decomposition Plan

Phase 1 emission migration is a single architectural sweep. Decomposed
into ordered steps so each step is independently committable:

- Step 1 — Update `rewriteSqlRefs()` in `compiler/src/codegen/rewrite.ts`
  (the core inline rewrite). Add E-SQL-006 emission for `.prepare()`.
  WIP commit after rewrite.ts changes.
- Step 2 — Update `case "sql"` and `case "transaction-block"` in
  `compiler/src/codegen/emit-logic.ts`. WIP commit.
- Step 3 — Update `emitHoistedForStmt` in `compiler/src/codegen/emit-control-flow.ts`.
  WIP commit.
- Step 4 — Update transaction envelope in `compiler/src/codegen/emit-server.ts`.
  WIP commit.
- Step 5 — Rename `dbVar` default `_scrml_db` → `_scrml_sql` in
  `compiler/src/codegen/context.ts` and `compiler/src/codegen/index.ts`.
  Extend client leak guard regex in `compiler/src/codegen/emit-client.ts`.
  WIP commit.
- Step 6 — Update test expectations for `sql-params.test.js`. WIP commit.
- Step 7 — Update test expectations for `sql-write-ops.test.js`. WIP commit.
- Step 8 — Update test expectations for `sql-loop-hoist-rewrite.test.js`.
  WIP commit.
- Step 9 — Update test expectations for `sql-batching-envelope.test.js`,
  `sql-nobatch.test.js`, `sql-client-leak.test.js`, `sql-batch-5b-guards.test.js`.
  WIP commit.
- Step 10 — Run `bun run test`, fix any drift in non-SQL tests, recompile
  examples 03, 07, 08, write anomaly report. Final commit.

## Commit cadence

Each step ends with a `WIP(bun-sql-phase-1): <step>` commit. The branch
is the checkpoint.
