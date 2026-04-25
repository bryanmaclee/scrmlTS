# Impact Analysis: bun-sql-phase-1

## Change Summary

Migrate the scrml SQL codegen output from a `bun:sqlite`-shaped method-chain
emission (`_scrml_db.query("...").all(...)`) to a Bun.SQL tagged-template
emission (`await _scrml_sql\`...\``), aligning the codegen with SPEC §44 for
the SQLite branch only. Postgres / MySQL come in subsequent phases.

This phase touches the codegen layer only. The public `?{}` source syntax
does not change. SPEC §8 language remains unchanged in this phase (a
follow-up will reconcile §8 ↔ §44 wording).

## Files Directly Modified

- `compiler/src/codegen/rewrite.ts` — `rewriteSqlRefs()` (line 172) is the
  central translation site. Rewrites the chained-call form to a tagged
  template. Adds `.prepare()` → E-SQL-006 emission. Threads `await` through
  emitted expressions where syntactically safe.
- `compiler/src/codegen/emit-logic.ts` — `case "sql"` (line 735) and
  `case "transaction-block"` (line 1053) emit the same shape changes
  through a different path. Both now produce tagged-template output and
  use `sql.unsafe()` for transaction control statements.
- `compiler/src/codegen/emit-control-flow.ts` — `emitHoistedForStmt`
  (line 336) builds a runtime IN-list query. SQLite Bun.SQL does NOT
  support array binding — keep manual `?N` placeholder construction but
  switch from `_scrml_db.query(...).all(...)` to
  `sql.unsafe(dynamicSql, paramArray)`.
- `compiler/src/codegen/emit-server.ts` — implicit per-handler transaction
  envelope at lines 565, 638, 649. Switch `_scrml_db.exec("BEGIN DEFERRED")`
  to `await _scrml_sql.unsafe("BEGIN DEFERRED")`. Same for COMMIT/ROLLBACK.
- `compiler/src/codegen/index.ts` — change `dbVar` default (lines 363, 432)
  from `"_scrml_db"` to `"_scrml_sql"` for grep-clarity. Same scope counter
  rename at line 286.
- `compiler/src/codegen/context.ts` — same `dbVar` default at line 86.

Defensive-only updates (regex/leak guards, not behavior):
- `compiler/src/codegen/emit-client.ts` — line 757: client-side leak guard
  pattern `_scrml_db\.` → must also catch `_scrml_sql` to keep E-CG-006
  protection live for the new identifier.

## Tests Updated

All `compiler/tests/unit/sql-*.test.js` files have expectations rewritten:
- `sql-params.test.js` (305 LOC) — every method-chain expectation rewritten
  to tagged-template form. `.prepare()` cases become E-SQL-006 expectations.
- `sql-write-ops.test.js` (475 LOC) — INSERT/UPDATE/DELETE expectations
  rewritten. `.prepare()` cases removed or converted to E-SQL-006.
- `sql-loop-hoist-rewrite.test.js` (264 LOC) — IN-list batch emission now
  uses `sql.unsafe(template, keys)` instead of `_scrml_db.query(...).all(...keys)`.
- `sql-loop-hoist-detection.test.js` (248 LOC) — likely unaffected (this
  tests the *detection* output of batch-planner, not the rewritten JS), but
  spot-check.
- `sql-batching-envelope.test.js` (188 LOC) — transaction envelope shape
  changed. Update BEGIN/COMMIT/ROLLBACK expectations.
- `sql-nobatch.test.js` (214 LOC) — `.nobatch()` codegen shape changed.
- `sql-client-leak.test.js` (782 LOC) — extends client-side guards to also
  match `_scrml_sql`.
- `sql-batch-5b-guards.test.js` — assertions on SQL shape — review.

## Downstream Stages Affected

Stage 8 (CG) only. Upstream stages (BS / TAB / BPP / PA / RI / TS / DG)
emit nothing different — they still produce `sql` AST nodes with `query`
and `chainedCalls` fields. The rewrite happens entirely in CG.

## Pipeline Contracts At Risk

- **PIPELINE.md CG contract** — the `?{}` runtime helper interface
  changes shape. Any host runtime that supplies `_scrml_db` (a
  `bun:sqlite` Database) must now supply `_scrml_sql` (a `new SQL(...)`
  instance). This is a runtime ABI change. The host integration is out
  of scope for the compiler — but this is recorded as an intentional
  change.
- **§44 contract** — methods `.all()`, `.get()`, `.run()` are all that
  remain. `.first()` (which existed in §8) is no longer in §44 — must
  decide whether to keep `.first()` as a back-compat alias for `.all()`
  + `[0]` semantics, or drop it entirely. Decision: keep `.first()` →
  same emission as `.get()` for back-compat, since gauntlet/example code
  uses it.

## Spec Changes Required

None for Phase 1. SPEC §44 already mandates the target shape. SPEC §8
contains conflicting language about `.query().all()` etc. — PA will
reconcile §8 ↔ §44 in a follow-up after Phase 1 lands. The brief
explicitly says "leave conflicting language alone".

## Tests That Must Pass

- All non-SQL unit tests must remain green (~7,200 of 7,562)
- All SQL unit tests must pass with rewritten expectations (~360)
- Browser/E2E sample compilation must still succeed (54 samples in
  samples/compilation-tests)

## New Tests Required

- E-SQL-006 emission test in `sql-params.test.js` or `sql-write-ops.test.js`
- (Optional) `sql.unsafe()` emission test for static DDL paths
- (Optional) Bun.SQL identifier-rename test asserting `_scrml_sql` appears
  in emitted server JS, not `_scrml_db`

## Expected Behavioral Changes

1. Server JS shape change: `_scrml_db.query("SELECT ...").all(...)` →
   `await _scrml_sql\`SELECT ...\``
2. Identifier rename: `_scrml_db` → `_scrml_sql` everywhere in emitted JS
3. `.prepare()` is now a compile error (E-SQL-006), no longer emits a
   `Statement` reference
4. Static DDL: `_scrml_sql_exec("CREATE TABLE ...")` → `await _scrml_sql.unsafe("CREATE TABLE ...")`
5. Auto-`await` insertion: every emitted SQL call site is now an `await`
   expression
6. Transaction envelope: `_scrml_db.exec("BEGIN DEFERRED")` →
   `await _scrml_sql.unsafe("BEGIN DEFERRED")` (deferred to §44.6 future
   work; uses `.unsafe()` for now since `.begin()` requires a callback
   structure that doesn't fit the current per-handler envelope)

## Must Not Change (Invariants)

- `?{}` source syntax — unchanged (only the codegen output changes)
- `${}` interpolation security — every interpolation MUST be a bound
  parameter, never string interpolation (§44.5)
- Server-only enforcement — `?{}` stays server-only; client leak guards
  must catch the new `_scrml_sql` identifier
- IN-list bind safety — runtime-built placeholder lists for §8.10 must
  still pass values as bound params (§44.5 + §8.2)
- Per-handler transaction semantics (§19.10.5) — BEGIN/COMMIT/ROLLBACK
  ordering preserved; only the executor shape changes
- protect-analyzer compile-time `bun:sqlite` Database introspection
  unchanged (out of scope per brief)
- stdlib/store/kv.scrml unchanged (out of scope per brief)

## API Verification (from Bun.SQL probe)

Confirmed via `scripts/_probe_sql*.js` against Bun 1.3.0:

- `new SQL(":memory:")` returns a callable tag function
- `sql\`SELECT ${x}\`` returns a thenable; `await` produces an array with
  extra props `count`, `command`, `lastInsertRowid`, `affectedRows`
- `sql.unsafe(rawSql, paramArray)` for dynamically-built SQL
- `sql.begin(callback)` for transactions (deferred to §44.6)
- **No `.all()`, `.get()`, `.first()`, `.prepare()`, `.exec()`, `.query()`** on `sql`
- Single-row pattern: `(await sql\`...\`)[0] ?? null`
- For SQLite: array binding (`${arr}`) is **not supported** — `sql.array()`
  errors with "SQLite doesn't support arrays". Manual `?N` placeholder
  construction is required for IN-lists, then bind via `sql.unsafe()`.
