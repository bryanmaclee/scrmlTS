# Anomaly Report: fix-cg-mounthydrate-sql-ref-placeholder

## Test behavior changes

### Expected
- `compiler/tests/unit/reactive-decl-sql-chained-call.test.js` — 16 → **21** passing tests
  (+5 new tests for §11 client-boundary suppression). Zero regressions.
- Full suite: 7767 → **7772** pass / 40 skip / 0 fail (368 files, expected exact +5).

### Unexpected
- None.

## E2E output changes

### Expected
- `samples/compilation-tests/dist/combined-007-crud.client.js` — line 55:
  - Pre: `_scrml_reactive_set("users", );` (parses, but trailing comma; sets `users` to `undefined`)
  - Post: `// SQL-init for @users — client cannot evaluate _scrml_sql (E-CG-006); declare as `server @users` for mount-hydration (§8.11).`
- `combined-007-crud.server.js` — unchanged (the server-side CPS handlers were already correct via S40 commit `9d65a46`).
- All 14 other `samples/compilation-tests/dist/*.js` files containing pre-existing `/* sql-ref:N */` placeholder leaks — **unchanged**. Those leaks live in `let x = ?{...}` (let-decl) and other shapes outside this fix's scope (sibling intakes `fix-cg-let-decl-sql-ref-placeholder` etc.).

### Empty-arg `_scrml_reactive_set` scan delta (samples/compilation-tests/dist/)

| Metric | Pre-fix | Post-fix | Δ |
|---|---|---|---|
| Files with `_scrml_reactive_set("X", )` empty-arg | 1 | **0** | **-1** |
| Files with `/* sql-ref:N */` (sibling intake scope) | 14 | 14 | 0 |
| Total empty-arg occurrences | 1 | **0** | **-1** |
| Total sql-ref occurrences | 21 | 21 | 0 |

### Bun.Transpiler.scan parse delta (samples/compilation-tests/dist/, 296 .client/.server files)

| Metric | Pre-fix | Post-fix | Δ |
|---|---|---|---|
| Parse pass | 277 | 277 | 0 |
| Parse fail | 19 | 19 | 0 |

The empty-arg form was already parseable (ES2017 trailing-comma rule), so parse counts are unchanged. The 19 failures are pre-existing — same files, same offsets — all from sibling-intake leak shapes. `combined-007-crud.client.js` and `.server.js` continue to parse cleanly.

### Sample compilation
- `compile-all.mjs`: 251 ok / 24 fail / 275 total — identical to baseline. Same 24 pre-existing failures (e.g. `comp-009-dropdown.scrml`), none introduced.

### Pre-existing (out of scope)
- 14 files with `/* sql-ref:N */` placeholder leaks remain unchanged. Sibling intakes:
  - `fix-cg-let-decl-sql-ref-placeholder` — `let x = ?{...}` shape (sql-001..sql-009, combined-004, combined-013, edge-009, gauntlet-r10-* server.js, protect-001 server.js)
- 19 parse failures unchanged (all from the same sql-ref shapes).

## New warnings or errors
- None observed.

## SQL test-suite gate
- All 246 SQL-tagged tests pass (12 files). No regressions in batch-planner, route-inference,
  ast-builder, or codegen for SQL paths.

## Files changed

```
compiler/src/codegen/emit-logic.ts                              — +24 / -7 lines
compiler/tests/unit/reactive-decl-sql-chained-call.test.js      — +113 lines (5 new tests)

docs/changes/fix-cg-mounthydrate-sql-ref-placeholder/
  pre-snapshot.md                                               — created
  progress.md                                                   — created (+ updates)
  anomaly-report.md                                             — this file
  scan-dist.mjs                                                 — scan helper
  compile-all.mjs                                               — compile helper
  parse-check.mjs                                               — parse-check helper
  scan-baseline.json                                            — pre-fix scan snapshot
  scan-postfix.json                                             — post-fix scan snapshot
```

The two `apply-edits*.mjs` audit scripts used during development were deleted before merge per the intake's no-scaffolding-left-behind directive.

## Anomaly count

- 0 unexpected anomalies caused by this change.
- 0 regressions to existing samples or tests.
- 1 pre-existing cosmetic bug fixed (`combined-007-crud.client.js:55` empty-arg reactive_set).
- 14 pre-existing sibling bugs UNCHANGED (sql-ref placeholders in let-decl shapes — out of scope).

## Status

CLEAR FOR MERGE — fix is narrow, well-tested, and matches the intake's approach (b). Runtime semantics are unchanged from current behavior; only the cosmetic empty-arg emission is corrected. The test count delta (+5) matches the new tests added (no unrelated test changes). Parse-pass counts unchanged. SQL test-suite green.

The sibling fix `fix-cg-let-decl-sql-ref-placeholder` (for `let x = ?{...}` shape) remains separate — that path is not this intake's scope.

## Tags
#anomaly-report #fix-cg-mounthydrate-sql-ref-placeholder #s40-followup #clear-for-merge #cps #reactive-decl #sql #client-side #cosmetic

## Links
- intake: `docs/changes/fix-cg-mounthydrate-sql-ref-placeholder/intake.md`
- pre-snapshot: `docs/changes/fix-cg-mounthydrate-sql-ref-placeholder/pre-snapshot.md`
- progress: `docs/changes/fix-cg-mounthydrate-sql-ref-placeholder/progress.md`
- baseline scan: `docs/changes/fix-cg-mounthydrate-sql-ref-placeholder/scan-baseline.json`
- post-fix scan: `docs/changes/fix-cg-mounthydrate-sql-ref-placeholder/scan-postfix.json`
- regression test: `compiler/tests/unit/reactive-decl-sql-chained-call.test.js` (§11)
- parent fix anomaly: `docs/changes/fix-cg-cps-return-sql-ref-placeholder/anomaly-report.md`
- spec §8.11 (mount-hydration coalescing): `compiler/SPEC.md` lines 4879-4893
- spec §52.4.2 (server @var semantics): `compiler/SPEC.md` lines 18901-18909
