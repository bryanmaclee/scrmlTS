# Progress: fix-meta-effect-loop-var-leak

- [15:50] Started — worktree verified, branch is current. Compiler deps installed.
- [15:51] Pre-snapshot written. Repro confirmed: TWO `_scrml_meta_effect` emissions, both with `it: it` in frozen scope. Primary + bonus bugs both reproduce.
- [15:51] Baseline: 7773 pass / 132 fail (132 fails appeared to be pre-existing DOM-env failures, but turned out to be missing `samples/compilation-tests/dist/` artifacts in the fresh worktree — once dist was generated, baseline became 7906 pass / 0 fail, matching dispatch's stated baseline).
- [15:55] AST inspection confirmed `for-stmt` (var=it) is nested inside markup; the `^{ init() }` produces meta nodes at two locations — `[19].children[3]` (the real one) and `[25]` (a phantom inside the trailing HTML comment text). Bonus bug is a separate BS comment-handling issue, NOT same root cause.
- [15:58] Trace identified `collectRuntimeVars` in `compiler/src/meta-checker.ts` lines 1869-1872 as the leak site. Loop vars added to module-scope `vars` map → fed to `buildCapturedScope` → emitted in `Object.freeze({...})` of meta-effect. Same root-cause shape as the function-decl Bug 6 fix (line 1880).
- [16:02] Fix applied: removed the for-loop variable adders (1869-1872) AND added `if (node.kind === "for-loop" || node.kind === "for-stmt") continue;` after the function-decl `continue` to skip walking into for-loop bodies (parallel to Bug 6 fix; ensures let/const/lin inside for-loop bodies also don't leak).
- [16:03] Re-compiled `bug-o.scrml`: both `_scrml_meta_effect` emissions now show clean captures (`items`, `tick`, `init` — no `it`). Bonus duplicate emission still present (separate BS bug, see `bonus-bug-html-comment-meta-leak.md`).
- [16:04] Verified: `bug-o-no-trailing-comment.scrml` (HTML comment removed) now emits exactly ONE `_scrml_meta_effect` with clean capture.
- [16:05] Compiled `samples/compilation-tests/` to populate dist artifacts (was missing — the integration tests need pre-compiled samples). Full suite: 7906 pass / 0 fail post-fix (matched baseline + zero regressions).
- [16:08] Commit `4a0b27a`: WIP — fix only (no tests yet). Pre-commit hook ran full test suite and passed.
- [16:14] Tests added:
  - 6 new unit tests in `compiler/tests/unit/self-host-meta-checker.test.js` (collectRuntimeVars describe block) covering for-loop var, for-stmt var, index var, let-decl in for-loop body, sibling module-scope decls coexisting with a for-loop, and same-named loop vars in multiple loops.
  - 7 new integration tests in `compiler/tests/integration/bug-o-meta-effect-loop-var-leak.test.js` covering the canonical repro and adjacent shapes (for-lift alone, ^{} alone, multi-^{} + for-lift, renamed loop var, let-in-loop-body, indexed for-loop).
- [16:15] Full suite: 7919 pass / 40 skip / 0 fail / 28180 expects / 7959 tests / 379 files.
- [16:16] Commit `03a5806`: tests added.
- [16:18] Bonus bug documented at `docs/changes/fix-meta-effect-loop-var-leak/bonus-bug-html-comment-meta-leak.md` for a future intake. Not fixed in this commit (would be scope creep — different stage, different root cause).
- [16:20] Wrote anomaly-report.md and post-snapshot. Final commit pending.
