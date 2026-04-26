# Pre-snapshot: fix-w-lint-013-tilde-range-exclusion

**Captured:** 2026-04-25, before any code changes.
**Compiler SHA at snapshot:** `e619abb` (HEAD of `worktree-agent-ab8f226275fef21ce`).
**Tier:** T1 (single source file + one new test file).

## Test suite baseline

```
7889 pass
40 skip
0 fail
28113 expect() calls
Ran 7929 tests across 375 files
```

(One ECONNREFUSED stack trace is a side-effect of an unrelated test exercising network paths
and is not a test failure.)

## Example 10 lint baseline

`examples/10-inline-tests.scrml`:
- Total lint diagnostics: **8**
- W-LINT-013 count: **8** (all the misfires on `@var = N` reactive assignments inside `~{}`)
- Lines flagged: 42, 43, 49, 50, 56, 62, 71, 72

After fix, expected: **0** W-LINT-013 lints in this file (all 8 are inside `~{}` test sigil).

## Pipeline state

- A1+A2 already landed (commit `9a07d07`): comment-range exclusion + `(?!=)` equality lookahead.
- Fix builds on the established `buildLogicRanges` / `buildCssRanges` / `buildCommentRanges`
  pattern by adding a parallel `buildTildeRanges`.
- W-LINT-013's skipIf currently uses `(offset, logicRanges, _cssRanges, commentRanges)`; will
  extend to a 5-arg signature with `tildeRanges`.
