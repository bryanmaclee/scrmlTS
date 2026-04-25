# Anomaly Report: fix-cg-cps-return-sql-ref-placeholder

## Test behavior changes

### Expected
- New `compiler/tests/unit/reactive-decl-sql-chained-call.test.js` — 16 tests / 66 expects, all passing.
- Pre-existing tests: 7,714 → 7,730 (exactly +16 from the new file). Zero regressions across the full suite (7,730 pass / 40 skip / 0 fail / 365 files; was 7,714 / 40 / 0 / 364).
- `compiler/tests/unit/return-sql-chained-call.test.js` — still 15 / 15 passing.
- `compiler/tests/unit/lift-sql-chained-call.test.js` — still passing.
- All 98 SQL-tagged tests under `compiler/tests/` still pass.
- Specifically, batch-planner Tier-1 single-site test still passes — confirming the new `sqlNode` field on reactive-decl is NOT double-counted by the batch planner. (The fix sets `init: ""` so the string scanner finds nothing; the structured walk sees the SQL node once.)

### Unexpected
- None.

## E2E output changes

### Expected
- `samples/compilation-tests/dist/combined-007-crud.server.js` — both CPS-return sites now emit canonical Bun.SQL forms instead of `/* sql-ref:-1 */` placeholder leaks:
  - Line 38: `const _scrml_cps_return = await _scrml_sql.unsafe("SELECT id, name, email FROM users");`
  - Line 74: `const _scrml_cps_return = await _scrml_sql.unsafe("SELECT id, name, email FROM users");`
- Both `samples/compilation-tests/dist/combined-007-crud.server.js` and `combined-007-crud.client.js` now parse cleanly via `Bun.Transpiler.scan` (was: server.js failed with "Unexpected ;" syntax error).
- `examples/dist/03-contact-book.server.js` — clean (parses).
- `examples/dist/07-admin-dashboard.server.js` — clean (parses).
- `examples/dist/08-chat.server.js` — clean (parses).

### Pre-existing — characterized but out of scope
13 other samples in `samples/compilation-tests/dist/` still contain pre-existing `/* sql-ref:N */` placeholder leaks. **These are NOT regressions caused by this change** — they were present in the baseline pre-fix and remain unchanged post-fix. They exercise different code paths than this fix targets:

| Sample | Likely path |
|---|---|
| sql-001-basic-select | top-level `let x = ?{...}` (not reactive-decl) |
| sql-002-where, sql-003-join, sql-004-count, sql-008-order-limit, sql-009-multiple | similar `let x = ?{...}` in client init blocks |
| edge-009-nested-sql-in-logic | nested SQL in logic block — different parser entry |
| combined-004-data-table, combined-013-blog | client `@x = ?{...}` mountHydrate top-level path (the sibling bug noted in the intake) |
| gauntlet-r10-elixir-chat, -rails-blog, -go-contacts | gauntlet samples with various `?{...}` shapes outside the reactive-decl-CPS path |
| protect-001-basic-auth | server-protect block + SQL — separate emit path |

Sibling intake recommendations:
- `fix-cg-mounthydrate-sql-ref-placeholder` — top-level `@x = ?{...}` on the client side (combined-007-crud.client.js was characterized in the prior anomaly report; same root cause for combined-004/-013).
- `fix-cg-let-decl-sql-ref-placeholder` — `let x = ?{...}` shape (sql-001..sql-009).

### Gauntlet delta (compile + Bun.Transpiler.scan on 275 samples)

| Metric | Pre-fix | Post-fix | Δ |
|---|---|---|---|
| Files with sql-ref leaks | 14 | 13 | **-1** (combined-007-crud cleared) |
| Server.js parse failures | 5 | 4 | **-1** (combined-007-crud cleared) |
| Client.js parse failures | 15 | 15 | 0 (no regression) |
| Compile OK | 275 / 275 | 275 / 275 | 0 |

Net effect: **the intake's primary success criterion is met** — combined-007-crud.scrml now compiles cleanly (server.js + client.js both parse). Zero regressions; one pre-existing leak resolved.

## New warnings or errors

- None observed.

## Files changed

  compiler/src/ast-builder.js                         — +71 lines (helper + 8 site changes)
  compiler/src/codegen/emit-server.ts                 — +21 lines (2 CPS-site SQL handlers)
  compiler/src/codegen/emit-logic.ts                  — +33 lines (server-boundary case "reactive-decl" SQL handler)
  compiler/src/route-inference.ts                     — +21 lines (sqlNode-aware trigger detection in 2 sites)
  compiler/tests/unit/reactive-decl-sql-chained-call.test.js — +504 lines (new — 16 regression tests)

  docs/changes/fix-cg-cps-return-sql-ref-placeholder/ — pre-snapshot, progress, anomaly report, apply-edits scripts, repro
  
## Anomaly count

- 0 unexpected anomalies caused by this change.
- 0 regressions to existing samples or tests.
- 1 pre-existing bug fixed (combined-007-crud server.js sql-ref placeholder leak).
- 13 pre-existing sibling bugs UNCHANGED (same baseline behavior, characterized for follow-up intake).

## Status

CLEAR FOR MERGE — fix is narrow, well-tested, mirrors the established pattern from prior return-stmt + lift-expr SQL fixes (S40 commits `2a05585`, `4074ea3..baccf56`). The intake's primary verification gate (`combined-007-crud.scrml` compiles + parses cleanly) is met. Test count matches expected delta (+16 from the regression suite, 0 unrelated changes).

## Tags
#anomaly-report #fix-cg-cps-return-sql-ref-placeholder #s40-followup #clear-for-merge #cps #reactive-decl #sql

## Links
- intake: `docs/changes/fix-cg-cps-return-sql-ref-placeholder/intake.md`
- pre-snapshot: `docs/changes/fix-cg-cps-return-sql-ref-placeholder/pre-snapshot.md`
- progress: `docs/changes/fix-cg-cps-return-sql-ref-placeholder/progress.md`
- regression test: `compiler/tests/unit/reactive-decl-sql-chained-call.test.js`
- apply-edits scripts: `docs/changes/fix-cg-cps-return-sql-ref-placeholder/apply-edits*.mjs` (audit trail of every text substitution)
- gauntlet check: `docs/changes/fix-cg-cps-return-sql-ref-placeholder/gauntlet-check.mjs`
- parent fix (return-stmt path): commit `2a05585`
- parent fix (lift-expr path): commits `4074ea3`..`baccf56`
- parent anomaly report: `docs/changes/fix-cg-sql-ref-placeholder/anomaly-report.md`
