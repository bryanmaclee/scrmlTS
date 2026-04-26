# Progress: fix-bare-decl-markup-text-lift

## Decomposition (T1 single-file fix)

- Step 1: write 6 regression tests at `compiler/tests/unit/bare-decl-markup-text-no-lift.test.js`, verify they FAIL on unfixed code
- Step 2: apply Option 1 (drop markup-children recursion) in `compiler/src/ast-builder.js` lines 235-260
- Step 3: verify all tests pass + corpus sweep

## Worktree environment notes

- Worktree path: `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a04eafaed62431350/`
- Worktree branch: `worktree-agent-a04eafaed62431350` at commit `f7a485c` (3 docs-only commits behind main `b1ce432`; compiler source is identical between worktree HEAD and intake-recorded baseline SHA).
- Initial Read/Write tool calls accidentally landed in the main checkout (`/home/bryan-maclee/scrmlMaster/scrmlTS/`) rather than the worktree. Files were moved into the worktree before any commit; main checkout left unchanged except `intake.md` (the original contract) is still present in the main copy.
- Worktree compiler had no `node_modules/` — ran `bun install` in `compiler/` before testing (install added acorn, astring, happy-dom).
- Worktree pre-commit hook runs `bun test compiler/tests/` directly, NOT via `bun run pretest`. Sample artifacts in `samples/compilation-tests/dist/` had to be pre-built by hand (`bun run pretest`) for the browser/integration tests to pass.

## Pre-snapshot baseline (worktree, after build)

After `bun run pretest` populated `samples/compilation-tests/dist/`:

- **Worktree baseline (pre-change, no new test file):** 7852 pass / 40 skip / 0 fail across 372 files (same as intake-recorded main baseline minus +20 / -20 minor count drift between sessions; the relevant signal is `0 fail`).
- **Intake-recorded main baseline (`b1ce432`):** 7872 pass / 40 skip / 0 fail. The 20-test difference is consistent with the intake's own note that "the S41 hand-off recorded 7852 pass; the +20 delta is likely from previously-skipped tests becoming unskipped between S41 close and S42 measurement." My worktree (`f7a485c`) sits 3 docs commits behind main and matches the S41 figure.

## Pre-fix corpus baseline (intake-derived)

Before the fix, full top-level samples sweep:
- **24 fail / 275 total** (`samples/compilation-tests/*.scrml`) — matches intake exactly.
- **1 fail / 14 total** (`examples/*.scrml`): `examples/05-multi-step-form.scrml` — pre-existing failure, unrelated to A5.

## Post-fix corpus result

After the fix:
- **23 fail / 275 total** (samples) — `func-007-fn-params.scrml` flips from FAIL → PASS. Inspection: that sample contains `<p>fn with params</>` inside a `<div>`, which pre-fix triggered the same BARE_DECL_RE leak and caused a parse failure. Post-fix, the prose stays as text and compiles. **This is an EXPECTED improvement consistent with the change request — the same bug class.**
- **1 fail / 14 total** (examples) — unchanged (`examples/05-multi-step-form.scrml` still fails for an unrelated pre-existing reason).

No new failures. One existing failure resolved by the fix. No anomalies.

## Decision: Option 1 → Option 2 fallback

**Option 1 (preferred per intake) was attempted first. It failed.**

Cause: dropping the markup-children recursion entirely also dropped the lift for bare top-level declarations inside `<program>`. The BS represents `<program>` as a markup-typed block, so its direct text children (the canonical site for bare decls like `function foo(x) { ... }` and `type Color:enum = { ... }`) were being lifted via that same recursion. Removing the recursion broke 7 tests in `top-level-decls.test.js`:

- `bare type:enum declaration compiles without error`
- `bare type declaration produces a type-decl node`
- `bare type declaration produces a synthetic logic node in program children`
- `bare fn declaration produces a function-decl node in AST`
- `bare server fn produces a function-decl with isServer=true`
- `bare server function produces a function-decl with isServer=true`
- `bare type + explicit fn in logic block both appear in AST`

Per the intake's own fallback instruction, switched to **Option 2 with one refinement**: the flag is renamed `parentType` and tracks the immediate-parent block's structural role:

- `parentType === null` (file root) — lift fires.
- `parentType === "state"` — lift fires (preserves db-block lift).
- `parentType === "markup"` — lift suppressed (text is prose content).
- The `<program>` block is treated as a declaration site: when recursing into its children, `parentType` is set to `"state"` so its direct text children still lift. Any other markup tag (`<p>`, `<div>`, `<style>`, etc.) sets `parentType="markup"` for its descendants, suppressing the lift.

This preserves all 25 existing `top-level-decls.test.js` tests and converts all 5 new leak-mode tests to PASS.

## Steps

- [02:30] Started — branch `worktree-agent-a04eafaed62431350`; read intake end-to-end
- [02:31] Initial baseline run on main: `bun test` shows 7872 pass / 40 skip / 0 fail across 372 files (matches intake exactly). Confirms compiler source unchanged since intake.
- [02:32] Inspected ast-builder.js lines 200-260 — confirms intake source-line analysis
- [02:33] Inspected reference test patterns: `top-level-decls.test.js` (BS+TAB, AST shape), `meta-classifier-emit-raw.test.js` (full pipeline w/ html output via compileScrml)
- [02:35] Wrote regression tests `bare-decl-markup-text-no-lift.test.js`. Initial run on unfixed code: 5 fail / 1 pass — confirms the bug for all 5 leak modes AND confirms sanity test passes.
- [02:38] Discovered files had been written to MAIN checkout, not worktree. Moved test file and progress.md into worktree. Copied intake.md into worktree.
- [02:40] Worktree had no `node_modules/`. Ran `bun install` in `compiler/` (added 224 packages including acorn).
- [02:41] Worktree baseline (pre-fix, with new test file): 7721 pass / 40 skip / 137 fail. The 132 non-new fails were pre-existing unbuilt-sample-artifact failures.
- [02:43] Ran `bun run pretest` to build samples/compilation-tests/dist/. Re-ran full suite: 7853 pass / 40 skip / 5 fail (the 5 fails are exactly the new regression tests on unfixed code).
- [02:46] Applied Option 1 fix (dropped markup-children recursion). Ran new tests: 5 leak-mode tests PASS, but §6 sanity test FAILS — bare top-level `function foo` no longer lifts. Ran top-level-decls.test.js: 7 of 25 existing tests fail. **Option 1 broken** — falling back per intake instruction.
- [02:50] Applied Option 2 fix (`parentType` flag form, with `<program>` carved out as decl-site). Ran tests: top-level-decls.test.js — 25/25 pass. New regression tests — 6/6 pass. Full suite — **7858 pass / 40 skip / 0 fail**. 
- [02:55] Corpus sweep:
  - Pre-fix (with revert): samples 24 fail / 275, examples 1 fail / 14. Matches intake baseline.
  - Post-fix: samples **23 fail / 275** (`func-007-fn-params.scrml` flips PASS — same bug fixed), examples **1 fail / 14** (unchanged pre-existing failure in `05-multi-step-form.scrml`).
  - Diff: -1 sample failure, no new failures, no example regressions. Anomaly status: CLEAR (the resolved sample failure is the same bug class as the intake-described issue).
- [02:58] Updated progress.md with Option 2 fallback rationale and corpus sweep deltas. Cleaning up scratch files.
- [03:02] Committed fix+tests+intake+progress in single commit `088d920`. Pre-commit hook PASS (7858 pass, 0 fail). Post-commit gauntlet PASS (TodoMVC), browser validation PASS.

## Final state

- **Branch:** `worktree-agent-a04eafaed62431350`
- **Final commit:** `088d920`
- **Files modified:** `compiler/src/ast-builder.js` (single function `liftBareDeclarations`, ~28 net lines added including comments)
- **Files added:**
  - `compiler/tests/unit/bare-decl-markup-text-no-lift.test.js` (6 regression tests)
  - `docs/changes/fix-bare-decl-markup-text-lift/progress.md` (this file)
  - `docs/changes/fix-bare-decl-markup-text-lift/intake.md` (copied from main checkout — the original contract)
- **Tests:** 7858 pass / 40 skip / 0 fail (worktree, post-fix). Net delta vs pre-fix worktree baseline: +6 new tests added, all passing; no regressions.
- **Corpus sweep:** -1 sample failure (`func-007-fn-params.scrml` resolved, same bug class). No new failures.
- **Approach used:** Option 2 (intake's fallback) — Option 1 broke top-level-decls.test.js because `<program>` is a markup-typed block at the BS level.

## Tags

#bug #parser #ast-builder #bare-decl-lift #markup-context-leak #silent-corruption #scope-c #stage-3 #t1 #high-priority #fixed

## Links

- Intake (the contract): `docs/changes/fix-bare-decl-markup-text-lift/intake.md`
- Findings tracker: `docs/audits/scope-c-findings-tracker.md` §A5
- Source change: `compiler/src/ast-builder.js` lines 235-282 (`liftBareDeclarations` function)
- New regression tests: `compiler/tests/unit/bare-decl-markup-text-no-lift.test.js`
- Existing tests still passing: `compiler/tests/unit/top-level-decls.test.js`
- Stage 3 audit context: `docs/audits/scope-c-stage-1-2026-04-25.md` §4
- Example originally surfacing the bug: `examples/20-middleware.scrml`
- Sample resolved by the fix: `samples/compilation-tests/func-007-fn-params.scrml`
