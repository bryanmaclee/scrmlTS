# phase-b1-examples-rewrite — progress

Change-id: phase-b1-examples-rewrite (sPA ss11 item 7)
Worktree: .claude/worktrees/agent-a0cca34eb398790fc
Base SHA: 0a605d3e

Canonical-form pass over `examples/` (29 top-level + `22-multifile` + `23-trucking-dispatch`).
Goal: drive deprecation warnings to zero WITHOUT changing what each example demonstrates.

## 2026-06-20 — startup + baseline scan

- F4 startup verification PASS (worktree, own branch, base 0a605d3e, clean tree).
- `bun install` + `bun run pretest` done.
- Baseline deprecation scan across ALL examples (compile-with-warnings to a temp dir):

### Item 1 — arm separators (`=>`/`->` -> `:>`)
- Corpus-wide `W-MATCH-ARROW-LEGACY` count: **0**. NO-OP. Corpus already canonical.

### Item 2 — null/undefined -> `not`
- Grepped all `.scrml` sources for `null`/`undefined`. EVERY hit is either:
  - SQL DDL `... text not null` / `integer not null` (SQL syntax, NOT scrml absence), or
  - a comment documenting the no-null rule (`// 'null' literal eliminated`, etc.).
- No genuine null/undefined value or comparison (`== null`, `return null`, `: null`, etc.). NO-OP.

### Item 3 — drop redundant file-top `${...}` (`W-PROGRAM-REDUNDANT-LOGIC`)
- Top-level 01-31: **0** firings. Already canonical.
- `22-multifile/app.scrml`: **1** firing (line 25 `${`).
  - Author comment (lines 18-24) claims unwrapping -> `E-SCOPE-001` on imported `UserRole`
    and calls the lint a "false-positive (tracked compiler gap)".
  - EMPIRICAL TEST: that compiler gap is FIXED — unwrapping now compiles clean
    (only residual `W-PROGRAM-SPA-INFERRED`, acceptable). So the wrapper IS now redundant.
  - Action: unwrap + delete the stale "false-positive / compiler gap" comment.
- `23-trucking-dispatch`: **18** firings, one redundant top-level `${...}` per page/model file.
  - Files: pages/{customer,dispatch,driver}/* (18 total). Must verify each unwraps clean.

## Plan
- Per-file: unwrap the flagged top-level `${...}` wrapper, recompile, confirm 0 `E-` + warning gone.
- Commit per-file or per-small-batch. Update this file after each step.

## 2026-06-20 — execution

- `22-multifile/app.scrml`: unwrapped redundant top-level `${ import ... }` wrapper +
  deleted the stale "false-positive / compiler gap" comment (gap is fixed; unwrap compiles
  clean). Also fixed a now-dangling "outer team wrapper" comment reference.
  Committed. Residual: `W-PROGRAM-SPA-INFERRED` only.
- `23-trucking-dispatch`: all 18 page files (pages/{dispatch,driver,customer}/*) carried a
  redundant top-level `${ import ... }` wrapper inside `<page>`. Unwrapped all 18 (imports
  auto-lift under v0.3 default-logic mode, §40.8). Full-dir compile after: 0 `E-`, 0
  `W-PROGRAM-REDUNDANT-LOGIC`, 0 `W-MATCH-ARROW-LEGACY`, 0 `W-DEPRECATED-*`.
  - models/auth.scrml: NO redundant wrapper (export decls already bare at file-top); the
    earlier `:50:12`/`:92:12` anchors were unrelated `-->` markers in the dir-compile stream.
- COUPLED TEST (S113): `compiler/tests/integration/trucking-dispatch-smoke-integration.test.js`
  asserts an aggregate diagnostic baseline that LOCKED `W-PROGRAM-REDUNDANT-LOGIC: 18`.
  Canonical rewrite removes all 18 -> entry REMOVED from EXPECTED_BASELINE (aggregate 74 -> 56).
  This file unwrap + baseline update land as ONE logical unit (no transiently-red window).
  Local run: 13 pass / 0 fail.

## Residual (acceptable) warning set across examples/
- Only non-deprecation lints remain: W-PROGRAM-SPA-INFERRED, W-TAILWIND-UNRECOGNIZED-CLASS,
  W-AUTH-001, W-ATTR-001, W-SQL-ROW-UNTYPED, W-PROGRAM-001, I-FN-PROMOTABLE,
  W-ENGINE-SERVER-SOURCE-NOT-AUTHORITATIVE, W-EACH-PROMOTABLE, W-DEAD-FUNCTION,
  W-AUTH-LOGIN-MISSING, I-AUTH-REDIRECT-UNRESOLVED, W-ENGINE-SELF-WRITE-DETECTED (mario/29).
- ZERO deprecation warnings (W-MATCH-ARROW-LEGACY / W-PROGRAM-REDUNDANT-LOGIC / W-DEPRECATED-*)
  corpus-wide.

## Items 1 & 2 — confirmed NO-OP
- Item 1 (arm separators -> `:>`): 0 W-MATCH-ARROW-LEGACY corpus-wide. Already canonical.
- Item 2 (null/undefined -> `not`): all `null`/`undefined` hits are SQL DDL (`text not null`)
  or comments. No genuine absence value. Already canonical.

## ACCEPTANCE — final scan
- All 29 top-level + both multifile dirs: 0 `E-`, 0 deprecation `W-`
  (W-MATCH-ARROW-LEGACY / W-PROGRAM-REDUNDANT-LOGIC / W-DEPRECATED-*).
- git diff touches only `.scrml` sources + the coupled smoke test + VERIFIED.md note
  + this progress.md. No `dist/`, no `.db`.
- VERIFIED.md: appended a "needs re-verify after canonical rewrite" note to rows 22 and 23
  (Notes column only). NO checkbox / Verified-at column touched (all rows remain `[ ]`).

## DONE.
