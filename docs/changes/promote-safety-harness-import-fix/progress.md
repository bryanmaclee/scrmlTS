# promote-safety-harness-import-fix — progress

Port S86 migrate.js Option β safety-harness fix (commit 95bd7f9) to promote.js
`sanityCheckParse` (compiler/src/commands/promote.js:442).

## 2026-05-12

- 2026-05-12T00:00Z  Startup verification clean (pwd / git rev-parse / status clean).
                     bun install OK; bun run pretest OK (12 samples compiled).
                     HEAD on branch tip = 7a00b1b.
- 2026-05-12T00:01Z  Maps consulted: primary.map.md (task-shape = compiler-source bug fix CLI),
                     structure.map.md (compiler/src/commands/ inventory).
- 2026-05-12T00:02Z  Read migrate.js template (sanityCheckParse :1162-1245).
                     Read promote.js pre-fix (sanityCheckParse :442-462).
                     Pre-fix shape: mkdtempSync→writeFileSync→compileScrml({stagedPath, gather:false}).
                     Migrate Option β shape: readFileSync backup → try-finally write-in-place
                     → compileScrml({originalPath, gather:true}) → ALWAYS restore.
- 2026-05-12T00:03Z  Plan: apply same pattern + matching docstring; preserve error-shape
                     (read-failure / write-failure / compile-crash / restore-failure throws).
- 2026-05-12T00:08Z  Applied Option β to compiler/src/commands/promote.js:
                     - Removed unused imports (mkdtempSync, tmpdir, sep).
                     - Replaced sanityCheckParse with transactional in-place rewrite + restore.
                     - Exported sanityCheckParse + promoteMatchOnFile for targeted tests
                       (mirrors migrate.js#migrateFile export pattern).
                     - Existing 7-test promote-match suite passes unchanged.
- 2026-05-12T00:09Z  Next: add tests for cross-file-import scenarios + crash recovery.
- 2026-05-12T00:12Z  WORKTREE LOSS: harness pruned my worktree mid-session after the first
                     commit (f343113) landed. Recovered by recreating worktree at f343113.
                     The base Option β fix was preserved in the git object store; only the
                     uncommitted test file + fixture pair was lost. Re-created both.
- 2026-05-12T00:14Z  Added fixture pair compiler/tests/fixtures/promote-multi-file-app/
                     (pages/dashboard.scrml + models/labels.scrml). Smoke-tested:
                     compileScrml gather:true on the importer = 0 errors;
                     compileScrml gather:false on a staged tmp copy = E-IMPORT-006
                     (confirms the pre-fix bug reproduces).
- 2026-05-12T00:16Z  Added compiler/tests/unit/promote-safety-harness.test.js
                     (7 tests, 31 expect calls):
                     §1 (1) — single-file regression guard
                     §2 (2) — multi-file cross-file imports (THE FIX) + dry-run invariant
                     §3 (4) — crash recovery:
                              (a) unclosed-block rewrite → ok:false + file restored
                              (b) broken-import rewrite (E-IMPORT-006) → ok:false + restored
                              (c) read-only file (synthetic staging-write-failure) →
                                  ok:false OR restore-failure throws; content preserved
                              (d) nonexistent path (read-failure) → ok:false + no file created
                     Test (3c) covers the brief's "synthetic write-failure mid-stage"
                     requirement via chmod 0444. compileScrml-throw synthetic was
                     replaced with unclosed-block rewrite — same semantic (compile fails)
                     but reliably reproducible across pipeline versions.
- 2026-05-12T00:18Z  bun test compiler/tests/unit/promote-safety-harness.test.js:
                     7 pass / 0 fail / 31 expect calls.
                     bun run test (full suite):
                     11600 pass / 114 skip / 1 todo / 0 fail / 564 files.
                     Baseline was 11593/114/1/0/563 → delta +7 tests, +1 file, 0 regressions.
                     Matches brief target.
