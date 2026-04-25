# Progress: fix-lift-sql-chained-call-parallel-sites

- [00:01] Started — rebased worktree onto main `2e6a42d`. Worktree branch: `worktree-agent-a5537744e8d9f1cba`.
- [00:02] Read intake, oriented in ast-builder.js — confirmed helper at line 1910 (parseLogicBody scope), inline duplicates at sites A (1958-1981) and B (3482-3505) both have IDENT-only check.
- [00:03] Installed deps; pre-existing missing `acorn` in package.json (kept node_modules, reverted package.json — not in scope).
- [00:04] Compiled 12 browser-test samples manually (pretest script blocked by sandbox).
- [00:05] Baseline test run: 7578 pass / 40 skip / 0 fail / 27316 expects / 355 files. Matches intake.
- [00:06] Wrote pre-snapshot. Decision: keep helper at `parseLogicBody` scope (not module scope as intake suggested) — closure over peek/consume; only 4 callers all inside parseLogicBody; module-scope refactor would add noise without value.
- [00:07] Refactored both bare-BLOCK_REF inline IDENT-only loops to call `consumeSqlChainedCalls`. -38 LOC. All 4 BLOCK_REF chained-call sites now use the shared (KEYWORD-aware) helper.
- [00:08] Test re-run after refactor: 7578 pass / 40 skip / 0 fail — identical to baseline. SQL suites (9 files, 189 tests) all pass. lift-sql-chained-call.test.js (13 cases) all pass.
- [00:09] Committed refactor (e3db1c4).
- [00:10] Probed actual codegen for the 4 cases — confirmed Site A (in server function) produces canonical `await _scrml_sql\`...\`` for `.all()` and `(await ...)[0] ?? null` for `.get()`. Site B (top-level `${}`) has no server-route codegen path (no surrounding function), so AST shape is the only observable for those.
- [00:11] Added §9 regression tests: 6 new tests (5 AST-shape across both sites x both IDENT/KEYWORD methods, plus 1 codegen check for Site A `.get()`, plus 1 nobatch-marker test at Site B). All 19 lift-sql-chained-call tests pass (13 original + 6 new).
- [00:12] Verified: full SQL suite 195/195 pass (was 189; +6); full bun test 7584/40/0 (was 7578/40/0; +6 expected). Examples 03/07/08 compile cleanly; node --check passes for all 6 server+client outputs; no orphan `. (all|get|run)(` lines.
- [00:13] Wrote anomaly report (CLEAR FOR MERGE, 0 anomalies). Deleted 4 dev scaffolding files (`_apply-fixes.mjs`, `_append-tests.mjs`, `_probe.mjs`, `_replace-95.mjs` — none tracked in git). Committing anomaly report.
- [00:14] Done.
