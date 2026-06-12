# TASK — fix TWO confirmed bugs from the S184 lifecycle arc (Bug 1 + Bug 2)

Change-id: `lifecycle-doublefire-and-w-lint-007-2026-06-11`. SCOPE at `docs/changes/lifecycle-doublefire-and-w-lint-007-2026-06-11/SCOPE.md`. Two distinct, independent bugs in two files. Do both.

(MAPS-first-read block, F4 startup-verification + S99/S126 Bash-edit path discipline, S136/S138/S83 discipline — same template as the comment-leak brief.)

## BUG 1 — E-TYPE-001 double-fire (type-system.ts)
Single pre-transition read of a lifecycle struct-FIELD through a `<state>`-cell emits 2 identical E-TYPE-001 (span-less). Cell-value-typed case correct (1).
Reproducers: `<u>: User = {…}` (User has `passwordHash: (not to string)`) + `@u.passwordHash` → 2 (top-level AND fn-body); `<st>: (not to User) = not` + `@st.name` → 1 (correct, don't regress).
Root cause (verify by tracing): pipeline ~17290-17334 runs overlapping passes — Pass 1 struct-field `checkLifecycleFieldAccess` + Pass 3 S134 B-prereq cell-value `buildCellValueLifecycleMap`/`checkLifecycleBindingAccess` which ALSO covers struct-typed-Shape-1-with-lifecycle-field → re-covers pass 1 → double-fire. Landing-1 unit tests pass toBe(1) because they invoke ONE walker on a synthesized AST; double-fire is PIPELINE-level.
Fix: make coverage DISJOINT (pass 3 only handles cells whose own TYPE is `(A to B)`, not struct-field-lifecycle cells). Verify struct-field-on-cell→1, cell-value→1, two-read→2 linear, all lifecycle tests exact counts.

## BUG 2 — W-LINT-007 ghost false-positive (lint-ghost-patterns.js)
`<u>: User = { id: 1, … }` fires W-LINT-007. Regex ~line 623 `/(?<!:\w*)(?<!type )\b(?!value\b|props\b)(\w+)\s*=\s*(?<!\$)\{(?!\{)/g` matches `User = {`; `(?<!:\w*)` can't bridge the `: ` space.
Fix: extend exclusion/skipIf so a typed-cell-decl object-literal RHS doesn't fire, WITHOUT regressing the genuine `<Comp prop={val}>` JSX catch (read the purpose comment + S96 Bug 8 / R25 Bug 44 history ~481-625 first). Verify the real JSX catch still fires.

## SCOPE GUARD
ONLY Bug 1 + Bug 2. Do NOT touch ast-builder.js (landed comment-leak fix). Do NOT chase inline-struct-real-fn-field (NOT-REPRODUCED — all 3 fn-type forms fire E-STRUCT-FUNCTION-FIELD in inline position). Bug-1 changes only the COUNT, Bug-2 narrows fire conditions only.

## TESTS
Bug 1 — PIPELINE-level (full compile) regression: exactly 1 E-TYPE-001 struct-field-on-cell; 1 cell-value; 2 for 2 reads (cross-stream helper per S92). Bug 2 — typed-cell struct-literal no W-LINT-007; real `<Comp prop={val}>` still fires. Full suite 0 regressions.

## R26 (before DONE)
struct-field-on-cell→1 E-TYPE-001; cell-value→1; W-LINT-007 false-positive form→0; real JSX→still fires.

## FINAL REPORT
WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED, BRANCH; Bug-1 overlap+fix+counts; Bug-2 exclusion+catch-still-fires; test counts; R26; maps line; deferrals.

---
NOTE: This archived copy is abridged from the verbatim Agent prompt for length; the full dispatched prompt carried the complete MAPS / F4 / S99-S126 / S138 / S83 boilerplate blocks (identical template to docs/changes/lifecycle-field-comment-leak-2026-06-11/BRIEF.md).
