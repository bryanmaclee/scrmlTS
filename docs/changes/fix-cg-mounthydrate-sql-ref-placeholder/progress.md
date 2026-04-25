# Progress: fix-cg-mounthydrate-sql-ref-placeholder

- [start] Branch `changes/fix-cg-mounthydrate-sql-ref-placeholder` created from local main `7a91068`
- [start] Pre-snapshot in progress
- [committed d711a7f] WIP: pre-snapshot + scan helpers — baseline 7767 pass / 1 empty-arg leak in dist
- [committed c32f98d] fix: emit-logic.ts case "reactive-decl" — short-circuit client-boundary SQL-init
- [committed 049e7b4] test: §11 regression tests (5 new) — 7767 → 7772 pass / 0 fail
- [done] Recompile combined-007-crud — line 55 is now an explanatory comment, no empty-arg
- [done] Full-suite scan: emptyReactiveSet 1 → 0; sqlRefPlaceholder 21 → 21 (sibling intakes untouched)
- [done] Bun.Transpiler.scan parse: 277 pass / 19 fail (unchanged from baseline; combined-007-crud parses)
- [done] SQL test suite: 246 / 246 pass
- [done] Removed apply-edits*.mjs scaffolding per intake "no scaffolding left behind"
- [done] Anomaly report — CLEAR FOR MERGE

## Investigation summary

- The intake's "approach (a)" (wire `@var = ?{...}` into `__mountHydrate`) requires implicit
  promotion of plain `@var` to server-authoritative semantics. Spec §8.11 explicitly scopes
  mountHydrate to `server @var` (`isServer === true` collector at `collect.ts:457`). Promoting
  bare `@var` would be a spec amendment with cascading E-AUTH implications. Out of scope for
  a "low priority / cosmetic" intake.
- Approach (b) selected. emit-logic.ts case "reactive-decl" client-boundary fallthrough now
  short-circuits when `node.sqlNode` is present and emits an explanatory comment instead of
  the broken `_scrml_reactive_set("name", )`. Runtime behavior is identical to current
  (`_scrml_reactive_get("name")` returns `undefined` either way).

## Final diff stats

  compiler/src/codegen/emit-logic.ts                             — +24 / -7
  compiler/tests/unit/reactive-decl-sql-chained-call.test.js     — +113

## Final commit range

  d711a7f..049e7b4 (3 commits)

## Tags
#progress #fix-cg-mounthydrate-sql-ref-placeholder #done

## Links
- pre-snapshot: `docs/changes/fix-cg-mounthydrate-sql-ref-placeholder/pre-snapshot.md`
- anomaly report: `docs/changes/fix-cg-mounthydrate-sql-ref-placeholder/anomaly-report.md`
