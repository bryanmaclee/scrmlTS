# Anomaly Report: fix-component-def-block-ref-interpolation-in-body

## Test Behavior Changes

### Expected
- 15 new tests in `compiler/tests/unit/component-def-void-elements.test.js` — all pass. These are regression tests covering the void-element triggers.
- Net pass count: 7937 → 7952 (+15 from the new test file). 0 regressions in the previously-passing 7937.

### Unexpected (Anomalies)
- None.

## E2E / Sample Corpus Output Changes

### Expected
- `examples/05-multi-step-form.scrml` — all 22 example files compile clean before and after; the 3 components (InfoStep, PreferencesStep, ConfirmStep) now register correctly post-fix (verified via `probe.mjs`: 3 components in AST instead of 1 greedy InfoStep that swallowed the others). The example uses an if-chain dispatch which still doesn't expand components inside if-chain branches — this is a separate, distinct issue (see "Adjacent observations" below) and not a regression of this fix.
- `samples/compilation-tests/` (275 files) — 279 errors / 487 warnings both pre and post fix. No change. The pre-existing failures are unrelated to A7 (E-ATTR-011 unsupported `bind:title` etc.).

### Unexpected (Anomalies)
- None.

## New Warnings or Errors
- None.

## Adjacent Observations (out of A7 scope, but surfaced during trace)

1. **If-chain branches don't expand components.** In `examples/05-multi-step-form.scrml`, the `<InfoStep if=…/> <PreferencesStep else-if=…/> <ConfirmStep else/>` chain produces HTML with literal `<InfoStep …>`, `<PreferencesStep />`, `<ConfirmStep else />` inside if-chain `<div>` wrappers. The component-expander's `walkAndExpand` does not recurse into `if-chain` node `branches` (see `compiler/src/component-expander.ts:1178-1240` — handles `markup`, `state`, `logic`, but not `if-chain`). Fixing this is out of scope for A7 (the bug there is a different downstream concern: registry lookup for if-chain branch elements). Suggest filing as a separate Scope C finding (provisionally A9 — "if-chain branch component refs not expanded").

2. **`<select bind:value=@x>` post-fix.** With A7 in place, `<select>` parses normally because it's NOT a void element — the bug was always the `<input type="checkbox" bind:value=@newsletter>` void element later in the same body. So A8 reduces to "same as A7" — the trace identified them as the same root cause from the start.

3. **A3's element-nesting fix is preserved.** All 6 A3 regression tests in `compiler/tests/unit/component-def-text-plus-handler-child.test.js` continue to pass.

## Anomaly Count: 0
## Status: CLEAR FOR MERGE

## Tags
#anomaly #s44 #a7 #cleared

## Links
- Pre-snapshot: `docs/changes/fix-component-def-block-ref-interpolation-in-body/pre-snapshot.md`
- Tests: `compiler/tests/unit/component-def-void-elements.test.js`
- Fix: `compiler/src/ast-builder.js` (HTML_VOID_ELEMENTS constant + 3 call-sites)
- Adjacent issue (if-chain branch component expansion): suggested follow-up A9 — see `docs/audits/scope-c-findings-tracker.md`
