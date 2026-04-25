# Progress — fix-bs-string-aware-brace-counter

- [00:00] Branch `changes/fix-bs-string-aware-brace-counter` created from 205602d (worktree pre-existed).
- [00:00] Pre-snapshot written. Sidecar repro confirmed: 2 BS errors at baseline.
- [00:01] Tier classified: T2. Approach selected: B (small string-state lexer in BS for `"..."`, `'...'`, `/* */` block comments). Regex + non-meta backticks deferred with comments.
- [00:02] Plan: edit BS at lines 646-669 to introduce per-frame `_strState` machine; update existing limitation test (1200-1210) to positive assertion; add 4-5 new regression tests including sidecar inline.
- [00:03] Intake copied into worktree (was only on main). Pre-snapshot + progress moved into worktree path.

## Implementation pass 1 — basic state machine
- [00:10] Wrote per-frame `_strState` field + `dq` / `sq` / `bc` arms in main scan loop. Sidecar compiled clean (only the unrelated trailing HTML-comment issue remained).
- [00:12] All 137 BS unit tests passed. Pre-existing "known limitation" test will be updated to positive assertion.
- [00:13] Ran full suite: 146 fails, including bs.scrml self-host. Investigation began.

## Implementation pass 2 — apostrophe-in-word heuristic
- [00:20] Identified bs.scrml self-host failure as backtick-template content with contractions (`don't`) opening SQ state and dragging suppression across many chars. Applied apostrophe-in-word heuristic for `'` openers (only opens SQ if previous char is non-alphanumeric).
- [00:22] bs.scrml passes in isolation. Fail count drops. Other failures investigated.

## Implementation pass 3 — bt state for backtick templates
- [00:30] tab.scrml self-host still fails: backtick template `\`...\`` containing a `"..."` quoted string with unbalanced braces (`c0 == "'"`) corrupts state via `"` opening DQ in template body.
- [00:35] Added `bt` state. Inside backticks: suppress only my new SQ/DQ tracking (NOT brace counting — preserves pre-fix behavior of `${...}` pushing frames).
- [00:36] tab.scrml + meta-checker.scrml (self-host) now pass. Lin-decl test fails: URL `"https://..."` had `//` consumed as comment.

## Implementation pass 4 — // comment guard
- [00:40] `//` comment handler at line 516 didn't respect per-frame string state. Added guard: if `topIsBraceContext()` and frame `_strState` is dq/sq/bc/bt, skip `//` handler.
- [00:42] Lin-decl test passes. Re-ran full suite.

## Final state
- [00:50] Compiler unit tests: 7,766 pass / 8 fail (5 visible (fail) + 1 unhandled-error in self-host bs.test + 2 more bootstrap fails). Baseline was 7,825 / 0 fail.
- [00:51] All 8 fails trace to 3 self-host .scrml files (bs.scrml, ast.scrml, meta-checker.scrml) that were authored against old buggy BS behavior — they have unbalanced REAL braces compensating in-string braces that old BS counted.
- [00:52] Filed follow-up intake: `docs/changes/expr-ast-self-host-bs-bug-l-parity/intake.md`. Per user instructions ("if not [mechanical], file a follow-up intake"), self-host parity is deferred.
- [00:53] Wrote 9 new BS regression tests + updated 1 (the previously-acceptable "known limitation" is now a positive assertion). 147 BS unit tests all pass.
- [00:54] Sidecar reproducer: trimmed body compiles clean; pre-existing HTML-comment-aware-tag issue in trailing comment is unrelated and out of scope.
- [00:55] BLOCKED on commit by pre-commit test hook (`.git/hooks/pre-commit`) — runs full test suite, doesn't differentiate the 5-8 documented self-host regressions from real failures. User authorization required for `--no-verify`, OR self-host scrml files must be updated (non-mechanical, scoped to follow-up intake).
