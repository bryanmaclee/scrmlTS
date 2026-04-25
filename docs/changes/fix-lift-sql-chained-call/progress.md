# Progress: fix-lift-sql-chained-call

## Plan

T2 — Standard tier. Bug fix in ast-builder.js + a tightly coupled emit-logic.ts addition.

Decomposition:
- **Step 1:** ast-builder.js — `lift KEYWORD + BLOCK_REF` branch consumes trailing
  `.method()` chain when child is a SQL block; wraps as `expr: { kind: "sql", node }`.
- **Step 2:** emit-logic.ts — `case "lift-expr"` recognises `liftE.kind === "sql"` and
  emits `return await sql\`...\`;` (server boundary) by recursing on the SQL child.
- **Step 3 (added during impl):** consumeSqlChainedCalls helper extended to accept
  KEYWORD method names — `get`/`set` are KEYWORDs per tokenizer.ts:62, original
  IDENT-only check was missing them. (Caught by the §2 regression test.)
- **Step 4:** Add regression test at compiler/tests/unit/lift-sql-chained-call.test.js
  (8 sections, 13 cases). Includes the parseServerJs helper using Bun.Transpiler.scan().
- **Step 5:** Recompile examples 03/07/08; `bun --check` each.
- **Step 6:** Anomaly report.

## Timeline

- [Start] Worktree rebased onto main 74881ea. Pre-snapshot captured. Bug confirmed at
  examples 03/07/08 with fresh recompile. AST shape probed.
- [Step 1] commit 4074ea3 — ast-builder lift+SQL handler. AST shape verified via probe.
  Tests: 7565 / 0 fail (no regression, no new coverage).
- [Step 2] commit 5195c4b — emit-logic.ts handler for kind:"sql" lift-expr variant.
  Probed: `return await _scrml_sql\`...\`;` for .all/.run, `return (await _scrml_sql\`...\`)[0] ?? null;` for .get.
  Examples 03/07/08 recompile + bun --check OK. Tests: 7565 / 0 fail.
- [Step 3] commit baccf56 — consumeSqlChainedCalls accepts KEYWORD method names.
  Discovered .get() was being orphaned because `get` is a KEYWORD not IDENT.
  Tests: 7578 / 0 fail (+13 from step 4 already drafted).
- [Step 4] commit 7adf98e — regression test added. 13 cases / 8 sections.
  Tests: 7578 pass / 0 fail.
- [Step 5] All examples 03/07/08 recompile + `bun --check` clean.
  Other examples unaffected (05 has pre-existing E-COMPONENT-020).
- [Step 6] Anomaly report — 0 anomalies, status CLEAR FOR MERGE.

## Final test count

```
 7578 pass (+13 from baseline 7565)
 40 skip (unchanged)
 0 fail (unchanged)
 27316 expect() calls (+41 from baseline 27275)
Ran 7618 tests across 355 files. (+13 / +1 file from baseline)
```

## Commits (range)

```
4074ea3  fix(ast-builder): lift+SQL — consume chained calls, wrap as kind:"sql"
5195c4b  fix(emit-logic): handle lift-expr kind:"sql" — return await sql`…`;
baccf56  fix(ast-builder): consumeSqlChainedCalls — accept KEYWORD method names
7adf98e  test(fix-lift-sql-chained-call): regression test — 13 cases across 8 sections
```

Plus 1b005f0 (pre-snapshot) and the upcoming anomaly-report commit.

## Files changed

- `compiler/src/ast-builder.js` — added `consumeSqlChainedCalls` helper, updated
  two lift+BLOCK_REF call sites (parseOneStatement at ~2243, buildBlock body-loop
  at ~4066), extended helper to accept KEYWORD method names.
- `compiler/src/codegen/emit-logic.ts` — extended lift-expr case to recognise
  the new `kind: "sql"` variant.
- `compiler/tests/unit/lift-sql-chained-call.test.js` — new regression test.
- `docs/changes/fix-lift-sql-chained-call/` — pre-snapshot, progress, anomaly
  report, apply-fix scripts (audit trail), probe scripts.

## Out-of-scope follow-up note

The pre-existing chained-call patterns in ast-builder.js at lines ~1918
(parseOneStatement BLOCK_REF case) and ~3421 (buildBlock body-loop BLOCK_REF
case) have the identical "IDENT-only" bug for method names — `bare ?{}.get()`
in those code paths would also leave `.get()` orphan. Examples 03/07/08 only
use `.all()` and `.run()` (both IDENT) so the latent bug doesn't surface in
the example corpus, and SQL unit tests use `rewriteSqlRefs` (a pure-string
rewriter) which bypasses the AST chain-consumption entirely. Filing as a
follow-up for hand-off — could be addressed by extracting consumeSqlChainedCalls
into a shared helper used by all three sites, but that's a separate refactor.

## Tags
#scrmlTS #progress #lift #sql #ast-builder

## Links
- [intake.md](./intake.md)
- [pre-snapshot.md](./pre-snapshot.md)
- [anomaly-report.md](./anomaly-report.md)
