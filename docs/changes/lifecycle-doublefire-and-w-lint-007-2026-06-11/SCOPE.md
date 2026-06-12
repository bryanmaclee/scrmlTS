# SCOPE — two confirmed incidentals from the S184 lifecycle arc

**Filed:** S184 (2026-06-11). **Authorized:** user "fix em all" (of the 3 candidates; #3 dropped — see below).

## Bug 1 — E-TYPE-001 double-fire on a struct-field-on-cell read

A single pre-transition read of a lifecycle struct-FIELD through a `<state>`-cell emits **2** identical
`E-TYPE-001` errors (the errors are also span-less). The cell-value-typed case is correct (1 fire).

**Empirical (PA, S184) — `bun compiler/bin/scrml.js compile`:**
- `<u>: User = {…}` (User has `passwordHash: (not to string)`) + `@u.passwordHash` read → **2** E-TYPE-001 (top-level AND fn-body).
- `<st>: (not to User) = not` + `@st.name` read → **1** E-TYPE-001 (correct — cell-value path).

**Root cause (PA survey):** the pipeline (`type-system.ts` ~17290-17334) runs TWO overlapping passes that
both fire on the struct-field-on-cell case:
- Pass 1 — struct-field `checkLifecycleFieldAccess` (Landing-1).
- Pass 3 — S134 B-prereq cell-value `buildCellValueLifecycleMap` + `checkLifecycleBindingAccess` (Sub-Pass 2.b)
  — which per the §5 known-gaps table "covers BOTH struct-typed Shape-1 with lifecycle in struct-field AND
  cell-value-typed Shape-1." That "struct-typed" coverage RE-covers pass 1's domain → double-fire.
The cell-value-only case (1C) matches only pass 3 → fires once (correct).
NB the Landing-1 unit tests (`lifecycle-shape1-tracker.test.js` Test 13 `toBe(1)`) pass because they invoke
ONE walker directly on a synthesized AST; the double-fire is PIPELINE-level (two passes), invisible to a
single-walker unit test.

**Fix direction:** make the two passes' coverage DISJOINT — pass 3 (cell-value) should NOT re-cover cells
whose lifecycle lives in a struct FIELD (pass 1 owns those); it should only handle cells whose own TYPE is
`(A to B)`. (Alternative: dedupe emitted E-TYPE-001 by binding+field+position before adding — less clean.)
Trace the actual `buildCellValueLifecycleMap` collection to confirm before fixing. **Verify after:** struct-
field-on-cell → 1; cell-value-typed → 1; ALL existing lifecycle tests keep exact counts; multi-read /
multi-cell cases scale linearly (N reads → N fires, not 2N).

## Bug 2 — W-LINT-007 ghost false-positive on V5-strict typed-cell struct-literal decls

`<u>: User = { id: 1, … }` fires `W-LINT-007` ("Found '<Comp prop={val}>'") — the regex matches `User = {`.

**Root cause:** `lint-ghost-patterns.js` ~line 623, regex `/(?<!:\w*)(?<!type )\b(?!value\b|props\b)(\w+)\s*=\s*(?<!\$)\{(?!\{)/g`.
A V5-strict typed-cell decl `<u>: User = { … }` has `User = {`; "User" is preceded by `: ` (colon-SPACE),
which the `(?<!:\w*)` lookbehind can't bridge (the space breaks `:\w*`), so the `:struct`/`type X`
exclusions don't catch it. False-positive on a canonical, common scrml shape.

**Fix direction:** extend the exclusion / skipIf so a typed-cell-decl object-literal RHS does NOT fire,
WITHOUT regressing the genuine `<Comp prop={val}>` JSX catch (load-bearing anti-pattern lint). Candidate
signals: the match is a `Ident = { ident: … }` object-literal (key-colon shape) vs a JSX `prop={expr}`;
or the line is a V5-strict typed-cell decl (`<ident>: TypeName = {`). Trace the existing exclusion +
markup-value exemption first; mirror their shape.

## SCOPE GUARD
- DO: fix Bug 1 + Bug 2 + regression tests for each.
- Bug 1 — ADD a PIPELINE-level (full-compile) regression test asserting exactly 1 E-TYPE-001 for the
  struct-field-on-cell read (the unit tests miss it). Keep all existing lifecycle tests green at exact counts.
- Bug 2 — ADD tests: the typed-cell struct-literal decl does NOT fire W-LINT-007; a real `<Comp prop={val}>`
  STILL fires (no regression of the catch).
- DO NOT touch the landed comment-leak fix (`ast-builder.js`).
- DO NOT chase the dropped candidate #3 (inline-struct real-fn-field) — it is NOT-REPRODUCED (all 3 fn-type
  forms `() -> void` / `(x) => string` / `fn()` DO fire E-STRUCT-FUNCTION-FIELD in inline position).
- Full suite (`bun run test`) 0 regressions. Record before/after counts.
