# Progress: fix-lift-sql-chained-call-parallel-sites

- [00:01] Started — rebased worktree onto main `2e6a42d`. Worktree branch: `worktree-agent-a5537744e8d9f1cba`.
- [00:02] Read intake, oriented in ast-builder.js — confirmed helper at line 1910 (parseLogicBody scope), inline duplicates at sites A (1958-1981) and B (3482-3505) both have IDENT-only check.
- [00:03] Installed deps; pre-existing missing `acorn` in package.json (kept node_modules, reverted package.json — not in scope).
- [00:04] Compiled 12 browser-test samples manually (pretest script blocked by sandbox).
- [00:05] Baseline test run: 7578 pass / 40 skip / 0 fail / 27316 expects / 355 files. Matches intake.
- [00:06] Wrote pre-snapshot. Decision: keep helper at `parseLogicBody` scope (not module scope as intake suggested) — closure over peek/consume; only 4 callers all inside parseLogicBody; module-scope refactor would add noise without value.
