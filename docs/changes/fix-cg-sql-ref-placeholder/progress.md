# Progress: fix-cg-sql-ref-placeholder

- [t0] Started — verified worktree at agent-a0962950f82395d66, on `worktree-agent-a0962950f82395d66` branch at base `e1827e6`.
- [t0] Repo state confirmed: tests baseline 7670 pass / 40 skip / 0 fail / 362 files.
- [t0] Pre-snapshot written. Reproducer compiles and shows both bug shapes (`/* sql-ref:-1 */.all()` and `await sql.unsafe(...) . get ( )`).
- [t1] Plan: mirror lift-expr SQL fix (S40 commits 4074ea3..baccf56) in two ast-builder return-stmt sites + emit-logic case "return-stmt" — attach `sqlNode` to return-stmt when expr is a `?{...}` BLOCK_REF, route through `case "sql"`.
- [t2] Applied 3-edit script: ast-builder.parseOneStatement, ast-builder.buildBlock-body, emit-logic.case-return-stmt. Reproducer now emits canonical `return await _scrml_sql\`...\`;` and `return (await _scrml_sql\`...\`)[0] ?? null;`.
- [t3] First test run: 7668 pass / 2 fail. Failures: §9 Tier-1 single-SQL-site coalescing tests in batch-planner. Diagnosis: my `expr: refTok.text` (raw `?{...}` text) was being scanned by the batch planner string-SQL scanner AND the structured walk was visiting `sqlNode.kind:"sql"` — double counting (1 site → 2 sites → triggers Tier-1 coalescing).
- [t4] Fixup: changed `expr: refTok.text` → `expr: ""` at both ast-builder sites. Tests: 7670 pass / 0 fail (back to baseline). Reproducer still emits correctly.
- [t5] Committed implementation (765248b). Wrote regression suite `compiler/tests/unit/return-sql-chained-call.test.js` mirroring `lift-sql-chained-call.test.js`: 15 tests / 53 expects, all passing. Final test count: 7685 pass / 40 skip / 0 fail / 363 files.
- [t6] Committed regression tests (f98513f). Verification gates:
  - examples 03/07/08 compile cleanly + `bun --check` passes — OK
  - reproducer (`docs/changes/.../repro/dist/repro.server.js`) compiles + checks — OK
  - combined-007-crud STILL has `/* sql-ref:-1 */` leaks — pre-existing CPS-return bug at `emit-server.ts:600` (different code path; intake misidentified this sample as a `return ?{}` reproducer when it actually uses `@var = ?{}`). Documented in anomaly report.
- [t7] Anomaly report written. Status: CLEAR FOR MERGE.
