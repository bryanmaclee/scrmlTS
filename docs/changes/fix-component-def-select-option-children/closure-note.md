# A8 Closure Note — fix-component-def-select-option-children

**Date:** 2026-04-26 (S44)
**Status:** RESOLVED AS SIDE-EFFECT OF A7
**Resolving change:** `changes/fix-component-def-block-ref-interpolation-in-body` (A7)
**Resolving commit:** `51bfacc fix(fix-component-def-block-ref-interpolation-in-body): handle HTML void elements in collectExpr/collectLiftExpr/parseLiftTag`

## Disposition

A8 ("`<select><option>` children + `bind:value=@x`") was hypothesised to be a separate parser shape from A7. The S44 dispatch agent's bisect proved otherwise:

The actual trigger in PreferencesStep was NOT `<select><option>` (those non-void elements with proper closers parse fine), but rather the `<input type="checkbox" bind:value=@newsletter>` later in the same body — a void element with no closer.

The same root cause as A7: the angle-tracker in `collectExpr` incremented `angleDepth` on `<TAG` opens but had no decrement path for HTML void elements (which have no closer in idiomatic scrml). After PreferencesStep's `</div>`, `angleDepth` was still > 0 (leaked by the void `<input>`), defeating the IDENT-`=` boundary guard for the next sibling.

## Verification

A regression test for the A8 shape is included in the A7 fix's test suite:
- `compiler/tests/unit/component-def-void-elements.test.js` →
  `test("ex 05 PreferencesStep shape — <select><option>...</option></select> + <input type=checkbox bind:value=@x>", ...)`

This test exercises the full PreferencesStep body (select + options + checkbox input) followed by a sibling component, confirms both components register, and asserts no E-COMPONENT-020.

## Action

- This intake is closed.
- Tracker entry §A8 should be marked RESOLVED with reference to A7's commit.
- No separate A8 dispatch is needed.

## Tags
#a8 #closure #side-effect-of-a7 #resolved

## Links
- A7 intake: `docs/changes/fix-component-def-block-ref-interpolation-in-body/intake.md`
- A7 progress: `docs/changes/fix-component-def-block-ref-interpolation-in-body/progress.md`
- A7 anomaly report: `docs/changes/fix-component-def-block-ref-interpolation-in-body/anomaly-report.md`
- Test that covers A8 shape: `compiler/tests/unit/component-def-void-elements.test.js`
