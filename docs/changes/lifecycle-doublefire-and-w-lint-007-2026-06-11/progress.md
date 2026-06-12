# Progress — lifecycle-doublefire-and-w-lint-007-2026-06-11

## 2026-06-11 — startup
- [done] Startup verification: pwd in worktree, toplevel matches, tree clean, HEAD 32b9a4a7, bun install + pretest OK.
- [done] Read primary.map.md (compiler-source bug fix route). SCOPE.md not in worktree (uncommitted in main, same HEAD) — read from main read-only; matches brief.
- [next] Trace Bug 1 in type-system.ts ~17290-17334 + buildCellValueLifecycleMap.

## 2026-06-11 — baseline + Bug 1 trace
- [done] Baseline `bun run test`: 23866 pass / 221 skip / 1 todo / 2 fail. The 2 fails are PRE-EXISTING TodoMVC browser tests (benchmarks/todomvc/dist not populated by pretest) — unrelated.
- [done] Reproducers confirm: bug1a=2, bug1b=2, bug1c=1 (correct), bug1d=4 (scales 2N).
- [finding] buildCellValueLifecycleMap collects NOTHING for bug1a (struct-field case) — only collects bug1c's `st` (explicit `(not to User)`). So pass 3 is NOT the bug1a double-source. The struct-field msg matches the SINGLE push at type-system.ts:18891 (pass 1). Double-fire = pass 1 invoked/walking twice. Tracing next.

## 2026-06-11 — Bug 1 DONE
- [done] Root cause: NOT pass1/pass3 overlap (PA hypothesis). Actual: statementText() in checkLifecycleFieldAccess deduped fragments via EXACT-string Set; emitStringFromTree renders `@u.passwordHash` (no spaces) vs raw node.init `@u . passwordHash` (spaces) -> distinct keys -> both joined -> extractAccesses (`\s*\.\s*` tolerant) matches twice -> 2 fires.
- [done] Fix: whitespace-normalized dedup key in statementText (commit 12e122e3). Counts: 1a 2->1, 1b 2->1, 1c stays 1, 1d 4->2 (linear).
- [done] Pipeline-level regression test compiler/tests/integration/lifecycle-etype001-doublefire.test.js (4 tests, all pass) — commit 01477150. Uses S92 cross-stream findDiagnostic.
- [done] All 177 lifecycle unit tests green; full suite 0 fail.
- [next] Bug 2 — W-LINT-007 false-positive on `<u>: User = {`.

## 2026-06-11 — Bug 2 DONE
- [done] Root cause confirmed: `<u>: User = {` — `User` (cell TYPE) preceded by `: ` (colon-SPACE); `(?<!:\w*)` lookbehind can't bridge the space.
- [done] Fix: new isTypedCellDeclObjectLiteral helper requires BOTH (1) type-annotation position `<ident> : Type = {` (a `:`-then-`>` left) AND (2) object-literal RHS `{ key: ... }`; wired as extra skipIf disjunct on Pattern 7. Commit b6a00132.
- [done] Verified: bug2fp 1->0; genuine JSX <Card title={myTitle}> stays 1; object-valued JSX <Card style={ {k:v} }> stays 1 (signal 1 fails); empty {} + string-key exempt. 337 ghost/lint tests green.
- [done] Regression tests added to lint-ghost-patterns.test.js §7 (6 new) — commit pending.
- [next] R26 empirical re-verify both fixes on post-fix baseline + full-suite regression check.

## 2026-06-11 — R26 + final
- [done] Final full suite `bun run test`: 23877 pass / 221 skip / 1 todo / 0 fail (exit 0). Baseline was 23866 pass / 2 fail (the 2 fails were TodoMVC browser tests with an unpopulated dist — pretest-timing artifact, now 0 fail). +11 pass = 4 Bug-1 + 6 Bug-2 + 1 browser. ZERO new failures.
- [done] R26 empirical re-verify (final state): Bug1 1a=1 1b=1 1c=1 1d=2; Bug2 false-positive=0, genuine JSX=1. ALL targets pass.
- [done] Removed .repro scratch dir.
- COMPLETE. 4 commits: 12e122e3 (B1 fix) / 01477150 (B1 test) / b6a00132 (B2 fix) / 8e7f73fe (B2 test).
