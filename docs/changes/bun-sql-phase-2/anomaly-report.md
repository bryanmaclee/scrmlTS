# Anomaly Report: bun-sql-phase-2

Captured after Phase 2 implementation is complete. Baseline reference:
`2e6a42d` with 7,578 pass / 40 skip / 0 fail / 355 files.

## Test Behavior Changes

### Expected — net +47 tests, all green

```
Before:  7578 pass / 40 skip /  0 fail / 355 files
After:   7625 pass / 40 skip /  0 fail / 358 files
                                          (+47 tests, +3 files)
```

#### Per-file additions

| New file | Tests | Purpose |
|---|---|---|
| `compiler/tests/unit/db-driver.test.js` | 23 | resolveDbDriver() prefix matrix (sqlite, postgres, mysql, mongodb negative, typo, redis, http, empty, passthrough) |
| `compiler/tests/unit/pa-postgres-uri.test.js` | 10 | protect-analyzer Postgres / MySQL URI src= shadow-DB path (validation, errors, multi-table, protect=) |
| `compiler/tests/unit/program-db-driver-resolution.test.js` | 14 | runCG()-level driver detection through full pipeline (E-SQL-005 emission, _dbScope.driver tagging, dbVar counter) |
| **Total** | **47** | |

#### Per-file pre-existing tests — no changes

No existing test file's expectations were modified. Verified via:

```
git diff main..HEAD -- compiler/tests/unit/sql-*.test.js
git diff main..HEAD -- compiler/tests/unit/nested-program-*.test.js
git diff main..HEAD -- compiler/tests/unit/protect-analyzer.test.js
```

All return empty diffs. Phase 1's `sql-*` and `nested-program-db` test
expectations remain authoritative; Phase 2 is additive only.

### Unexpected (Anomalies)

**None.**

## Compile-Pipeline Behavior Changes

### Expected

1. **`<program db="postgres://...">` now compiles cleanly.** Previously the
   URI flowed through opaquely; now `resolveDbDriver()` classifies it as
   `postgres` and tags `_dbScope.driver = "postgres"`. Emitted server JS is
   unchanged from Phase 1 (driver-agnostic tagged-template form).

2. **`<program db="mongodb://...">` now emits E-SQL-005.** Previously it
   would have silently flowed through. The diagnostic message points at
   `^{}` for non-SQL data sources.

3. **`<program db="postgress://...">` (typo) emits E-SQL-005.** Previously
   would have silently flowed through. Message echoes the typo'd scheme
   and lists supported schemes.

4. **`<db src="postgres://...">` no longer touches the filesystem.** Per
   Phase 2 design, driver URIs in state-block `src=` skip path resolution
   and route to shadow-DB construction. The shadow DB itself is still
   bun:sqlite. Without a CREATE TABLE statement in some `?{}` block,
   E-PA-002 fires with a Phase-2-specific message ("Driver URI ...
   cannot be introspected at compile time yet").

5. **stderr Note when shadow DB used for driver URI** —
   `Note(PA): Driver URI 'postgres://...'. Using in-memory schema from ?{} blocks for compile-time validation.`
   Different phrasing from the file-missing case but same channel
   (process.stderr).

### Unexpected (Anomalies)

**None caused by Phase 2.**

## Sample Compile Verification

`samples/compilation-tests/postgres-program-driver.scrml`:

- Compiled in ~50ms with no errors and no warnings.
- Server JS contains: `await _scrml_sql\`INSERT INTO hits (when_ts) VALUES (${Date.now()})\``
- Client JS contains: button onclick wiring (no SQL leak — server-only resource).
- HTML contains: `<button onclick="..._scrml_post('/_scrml/__ri_route_recordHit_1', ...)`
- No leftover `_scrml_db.*`, no `/* sql-ref:-N */` placeholders, no client-side SQL.

A regression check confirmed the existing SQLite path still produces the
same emission shape (verified with a temp `<program db="./local.db">` sample
that emitted `await _scrml_sql\`INSERT INTO hits ...\`` identically).

## Pre-Existing Issues (NOT Phase 2 regressions)

### `return ?{...}.all()` emits `/* sql-ref:-1 */` placeholder

When a `server function` does `return ?{...}.all()` (or `.first()`), the
emitted server JS contains a `/* sql-ref:-1 */` placeholder instead of the
actual SQL. This affects multiple existing samples (e.g.
`combined-007-crud.scrml` emits `const _scrml_cps_return = /* sql-ref:-1 */;`
even at baseline `2e6a42d`).

Verified pre-existing by checking out the baseline (no Phase 2 changes) and
recompiling — same `/* sql-ref:-1 */` placeholder appears.

This is a pre-existing CG / lift integration bug that Phase 2 did not
introduce and does not fix. It is independent of the Postgres support;
SQLite-using `<program db=>` samples hit it too. Suggested follow-up:
file as `fix-cg-sql-ref-placeholder` or similar.

The Phase 2 sample (`postgres-program-driver.scrml`) intentionally avoids
the `return ?{}.all()` pattern (uses a fire-and-forget INSERT instead) so
it compiles to clean server JS and demonstrates the driver-agnostic
emission shape clearly.

### Stash from prior agent sessions

A `git stash pop` mid-implementation surfaced a stash from
`bug-h-rettype-fix` (a prior agent session). It contained unrelated
changes to `.claude/maps/`, deleted `giti-009-import-fix` files, and an
unmerged `hand-off.md`. Recovered with `git checkout HEAD --`. None of
the stash content reached any commit on this branch.

## New Warnings or Errors

- E-SQL-005 is now emitted by CG. New code path; no previous occurrences.
- E-PA-002 message text changed for driver URIs (extended phrasing).
  Existing E-PA-002 tests were unaffected (they cover the file-missing
  path which still uses the original message).

## Anomaly Count

**0 unexpected anomalies caused by Phase 2.**

Two pre-existing issues documented for context (return-?{}.all() placeholder
and the stash-pop mishap) — neither is a regression.

## Status

**CLEAR FOR MERGE** — All 7,625 tests green. Phase 2 driver URI resolution
+ Postgres URI shadow-DB support land cleanly. Existing SQLite behavior
preserved (Phase 1 emission shape unchanged). Sample
`postgres-program-driver.scrml` demonstrates end-to-end driver-agnostic
codegen.

## Tags

#phase-2 #anomaly-report #bun-sql #clear-for-merge

## Links

- Pre-snapshot: docs/changes/bun-sql-phase-2/pre-snapshot.md
- Progress log: docs/changes/bun-sql-phase-2/progress.md
- Phase 1 anomaly: docs/changes/bun-sql-phase-1/anomaly-report.md
- SPEC §44.2: compiler/SPEC.md:14644
- Sample: samples/compilation-tests/postgres-program-driver.scrml
- Driver helper: compiler/src/codegen/db-driver.ts
- Tests: compiler/tests/unit/db-driver.test.js, compiler/tests/unit/pa-postgres-uri.test.js, compiler/tests/unit/program-db-driver-resolution.test.js
