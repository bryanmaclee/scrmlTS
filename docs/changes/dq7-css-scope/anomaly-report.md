# Anomaly Report: dq7-css-scope

## Test Behavior Changes

### Expected
- `css-scope.test.js`: T3 now asserts `data-scrml="Card"` (was `data-scrml-scope="Card"`). Expected — DQ-7 renames attribute.
- `css-scope.test.js`: T4 now asserts `not.toContain('data-scrml="')` (was `not.toContain("data-scrml-scope")`). Expected — narrowed to the specific scoping attribute.
- `css-scope.test.js`: T5, T7, T9 now use `@scope ([data-scrml="..."])`. Expected — attribute rename.
- `css-scope.test.js`: T10 now uses `to ([data-scrml])` (was `to ([data-scrml-scope]:not(...))`). Expected — DQ-7 simplified donut selector.
- `css-scope.test.js`: T11-T14 are new tests for flat-declaration inline style. Expected — new feature.
- `css-scope.test.js`: T15 added to assert no `data-scrml-scope` in output. Expected — regression guard.
- New isFlatDeclarationBlock and renderFlatDeclarationAsInlineStyle unit tests (7 new). Expected — unit tests for new exported helpers.

### Unexpected (Anomalies)
- None.

## E2E Output Changes

### Expected
- HTML output now uses `data-scrml="Name"` instead of `data-scrml-scope="Name"` on component root elements.
- CSS output now uses `@scope ([data-scrml="Name"]) to ([data-scrml])` instead of the longer `to ([data-scrml-scope]:not([data-scrml-scope="Name"]))` form.
- Flat-declaration `#{}` blocks inside components now appear as `style="..."` on the root element instead of bare CSS rules in the `.css` file.

### Unexpected (Anomalies)
- **Self-host files not updated** (non-blocking): `compiler/self-host/cg-parts/section-emit-wiring.js` and `compiler/dist/self-host/cg.js` still reference `data-scrml-scope`. These are reference copies rebuilt from the primary scrml source — they will be updated when the self-host is rebuilt. This is not a regression (the self-host build path is not exercised in normal tests). **Action required: rebuild self-host after merge.**
- **SPEC.md not updated** (blocking for completeness, not blocking for code): The `apply-spec-patch.js` script was written but could not be executed (Bash denied for this agent session). SPEC.md still describes hash-based class scoping in §25.6 and lacks DQ-7 normative statements in §9.1. **Action required before merge: `bun docs/changes/dq7-css-scope/apply-spec-patch.js`.**

## New Warnings or Errors
- None introduced by the code changes.

## Anomaly Count: 2 (non-blocking informational items, not behavioral regressions)
## Status: CLEAR FOR MERGE (pending SPEC.md patch application and self-host note)

### Merge checklist
1. Apply SPEC.md patches: `bun docs/changes/dq7-css-scope/apply-spec-patch.js` then `git add compiler/SPEC.md`
2. Commit code changes (see progress.md for commit commands)
3. Commit SPEC.md changes
4. Note: self-host rebuild deferred (not blocking)
