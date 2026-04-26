# Progress: fix-component-def-block-ref-interpolation-in-body (A7)

- [10:00] Started — branch created (`changes/fix-component-def-block-ref-interpolation-in-body`), worktree clean
- [10:05] Baseline test suite: 7937 pass / 40 skip / 0 fail / 380 files
- [10:10] Bun deps installed, samples compiled (pretest hook)
- [10:15] Tried proposed minimal repro from intake (`<dl><dt><dd>${@x}</dd>` form) — DID NOT REPRODUCE the registration failure
- [10:20] Probed ex 05 directly via BS+TAB pipeline — found InfoStep's `raw` is 1441 chars (greedy) and contains `const PreferencesStep =` + `const ConfirmStep =` literally inside it
- [10:25] Bisected:
  - Single-component file with `${@x}` BLOCK_REF in `<dd>` — no bug
  - Multi-component file (Foo+Bar) with `<input bind:value=@x>` in Foo — Bar gets swallowed
  - Multi-component file (Foo+Bar) with `<br>` in Foo (no other content) — Bar gets swallowed
  - Multi-component file (Foo+Bar) with `<p>x</p>` in Foo (no void elements) — both register correctly
  - **Trigger: HTML void elements (`<br>`, `<input>`, `<img>`, `<hr>`) inside a wrapper, with sibling components after**
- [10:30] Root cause: in `compiler/src/ast-builder.js` `collectExpr` (lines 1289-1341), the angle-tracker A3 fix increments `angleDepth` on `<` IDENT/KEYWORD opens, decrements on `</` close-tags or `/>` self-close. HTML void elements (`<br>`, `<input>`) are opened with `<TAG` (increment) but have no closer — `</br>` and `<br/>` are not idiomatic; HTML semantics auto-close them. So angleDepth permanently leaks +1 per void element, bypassing the IDENT-`=` boundary guard for sibling component declarations.
- [10:35] Fix approach v1: skip angleDepth increment for void tags. Implemented + tested. **REGRESSED 2 callback-props tests** because skipping the increment for `<input/>` self-close form breaks attribute parsing inside the open tag.
- [10:40] Fix approach v2 (final): increment angleDepth normally for void tags so attribute tokens are inside-markup; introduce a `pendingVoidClose` flag that decrements on the next bare `>` (the open-tag closer). `/>` self-close cancels `pendingVoidClose` and uses the existing decrement path. Applied in `collectExpr`, `collectLiftExpr`, and `parseLiftTag` (which also needed a void-element no-children case to avoid mismatched-closer-bail).
- [10:45] All test suites pass: 7952 pass / 40 skip / 0 fail / 381 files (net +15 from new test file).
- [10:50] New regression suite committed: `compiler/tests/unit/component-def-void-elements.test.js` — 15 tests.
- [10:55] Sample-corpus sweep: pre-fix 279 errors / 487 warnings; post-fix same. No regressions in samples.
- [11:00] Examples sweep: all 22 example files compile clean. ex 05 components register correctly post-fix (3 component-defs in AST instead of 1 greedy InfoStep).
- [11:05] **Adjacent observation**: `examples/05-multi-step-form.scrml`'s if-chain dispatch (`<InfoStep if=…/> <PreferencesStep else-if=…/> <ConfirmStep else/>`) doesn't expand the components inside the if-chain branches. The component-expander's `walkAndExpand` does not recurse into `if-chain` node `branches`. Suggested follow-up filing — see anomaly-report.md "Adjacent observations" section.
- [11:10] **A8 disposition**: SIDE-EFFECT-FIXED. The trace at [10:25] showed A7 + A8 share the same root cause — A8's PreferencesStep contains `<input type="checkbox" bind:value=@newsletter>` (void element) earlier in the body, which is the actual trigger. The fix resolves both. A8 intake should be closed with reference to A7.
- [11:15] Anomaly report written. Status: CLEAR FOR MERGE.

## Tags
#progress #s44 #a7 #a8-side-effect-fixed #complete

## Links
- Pre-snapshot: `docs/changes/fix-component-def-block-ref-interpolation-in-body/pre-snapshot.md`
- Intake: `docs/changes/fix-component-def-block-ref-interpolation-in-body/intake.md`
- A8 intake (resolved as side-effect): `docs/changes/fix-component-def-select-option-children/intake.md`
- Anomaly report: `docs/changes/fix-component-def-block-ref-interpolation-in-body/anomaly-report.md`
- Tests: `compiler/tests/unit/component-def-void-elements.test.js`
- Fix: `compiler/src/ast-builder.js` (HTML_VOID_ELEMENTS + 3 call-sites)
