# Progress — phase-2g (chain branches mount/unmount)

Append-only timestamped log.

- [00:00] Started. Branch `changes/phase-2g-chain-mount` created off `a70c6aa`. Worktree clean.
- [00:01] `bun install` at root + `compiler/`. Sample dist compiled via `scripts/compile-test-samples.sh`.
- [00:02] Baseline confirmed: 8094 pass / 40 skip / 0 fail / 8134 ran / 383 files. No pre-existing failures.
- [00:03] Pre-snapshot written: docs/changes/phase-2g/pre-snapshot.md.
- [00:04] Read deep-dive in full. Greenlit design: Approach A + W-keep-chain-only + per-branch mixed-cleanliness dispatch. No new runtime helpers. No spec amendment.
- [00:05] Read all relevant landmarks:
  - emit-html.ts (818 LOC): isCleanIfNode/isCleanIfSubtree/attrIsWiringFree at 42-97; stripChainBranchAttrs at 99-115; chain handler at 179-224; B1 mount/unmount path at 575-603.
  - emit-event-wiring.ts (615 LOC): mount/unmount controller emission at 358-407; chain controller at 561-610.
  - binding-registry.ts (116 LOC): LogicBinding interface at 53-69 (chain fields not yet declared).
  - runtime-template.js: helpers at 408-467 — _scrml_create_scope, _scrml_find_if_marker, _scrml_mount_template, _scrml_unmount_scope. **Reusable verbatim.**
  - else-if.test.js (239 LOC): wrapper assertions at 186-187, 200; "no template/marker in chain" assertions at 221, 223 — these will INVERT under Phase 2g for clean branches.
  - if-mount-emission.test.js (374 LOC): pattern reference for new chain-mount tests.
  - ast-builder.js: chain has `node.branches: [{condition, element}]` and optional `node.elseBranch: MarkupNode`. The element retains its if=/else-if=/else attr at AST level; emit-html strips at emission time.
  - recipe-book.scrml: confirmed mixed-cleanliness chain at 151-159 (clean/clean/dirty for-lift else).

## Plan

**Step 1 — emit-html.ts** (chain handler rewrite):
  - Compute per-branch cleanliness via `isCleanBranchElement(branch.element)` — same logic as `isCleanIfNode`/`isCleanIfSubtree` but applied AFTER stripping if=/else-if=/else (since those are AST-level metadata that the gate would otherwise reject).
  - Emit the chain wrapper `<div data-scrml-if-chain="N">` around all branches.
  - For each branch:
    - If clean: emit `<template id="..."><inner-element></template><!--scrml-if-marker:...-->`.
    - If dirty: emit `<div data-scrml-chain-branch="K" style="display:none"><inner-element></div>` (today's per-branch wrapper, retained as the dirty fallback shape).
  - Same for elseBranch.
  - Register richer LogicBinding per branch: include `branchMode: "mount" | "display"`, `templateId?`, `markerId?`, `branchWrapperId?` for downstream controller.

**Step 2 — binding-registry.ts**:
  - Extend LogicBinding interface to include the chain fields it currently accepts as `as any`. Add `kind`, `chainId`, `branchId`, `branchIndex`, `condition`, `branchMode`, `templateId`, `markerId`. Keep backwards compat.

**Step 3 — emit-event-wiring.ts** (chain controller rewrite):
  - The controller emits a function `_update_chain_<chainId>()` that:
    - Computes `_next` branchId by evaluating conditions in source order (existing logic).
    - Uses a `_active` state variable holding the current branchId.
    - Keeps a small map of per-branch state: `{ mode, marker, template, scope, root, wrapper }`.
    - On change, dispatches per-branch:
      - For previous active (if mount-mode): `_scrml_unmount_scope(root, scope); root = null; scope = null;`. For display-mode: set `wrapper.style.display = 'none'`.
      - For new active (if mount-mode): `scope = _scrml_create_scope(); root = _scrml_mount_template(markerId, templateId);`. For display-mode: `wrapper.style.display = '';`.
  - Initial render: same logic, `_active = null` initially.

**Step 4 — Tests**:
  - else-if.test.js: invert assertions for clean-branch chains (lines 221/223) — clean chains now DO emit `<template>` and `scrml-if-marker`. The wrapper assertions at 186/187/200 stay (W-keep-chain-only retains the chain wrapper). The N31 anti-leak (189-191, 202-204) stay — strip-precursor unchanged.
  - New file chain-mount-emission.test.js: ~10-15 tests covering all-clean, all-dirty (no change), mixed-cleanliness, controller wiring, initial render, branch swap.

- [00:06] Next: implement Step 1 (emit-html.ts).

## RESUME — picking up after timeout

- [01:00] New agent picked up worktree. Verified `git status --short` shows only `M emit-html.ts` + `M progress.md` (the in-flight Step 1 work). All checks pass.
- [01:01] Read pre-snapshot.md + full deep-dive (753 LOC). Confirmed greenlit design: Approach A + W-keep-chain-only + per-branch dispatch.
- [01:02] Reviewed in-flight Step 1 diff (+130/-33 in emit-html.ts):
  - `isCleanChainBranch()` helper added — strips chain attrs then defers to `isCleanIfNode`. Correct.
  - Single chain wrapper `<div data-scrml-if-chain="N">` emitted around all branches. W-keep-chain-only honored.
  - Per-branch dispatch on `isClean`:
    - Clean: `<template id="..."><inner></template><!--scrml-if-marker:...-->` — no per-branch wrapper, B1 shape verbatim.
    - Dirty: `<div data-scrml-chain-branch="K" style="display:none"><inner></div>` — pre-Phase-2g shape retained as fallback.
  - `stripChainBranchAttrs` applied in BOTH paths. Strip-precursor preserved.
  - LogicBinding annotated with `branchMode: "mount" | "display"`, `templateId?`, `markerId?`. Cast `as any` because LogicBinding interface (Step 2) hasn't been formalized yet.
  - Else branch mirrored correctly.
- [01:03] Decision: **Step 1 diff is sound and complete**. Greenlit design implemented faithfully. Commit as-is and proceed to Step 2.
- [01:04] Sanity check: `bun test else-if.test.js` shows 13 pass / 2 fail. The 2 fails are EXPECTED — they're the assertions at lines 187/221 that will be inverted in Step 4 (clean chains now emit `<template>` + marker). Output confirms emit shape matches deep-dive §9 example exactly:
  ```
  <div data-scrml-if-chain="_scrml_if_chain_1"><template id="_scrml_scrml_chain_tpl_2"><div>A</div></template><!--scrml-if-marker:_scrml_scrml_chain_marker_3--><template id="_scrml_scrml_chain_tpl_4"><div>B</div></template><!--scrml-if-marker:_scrml_scrml_chain_marker_5--></div>
  ```
- [01:05] Probed mixed/all-dirty cases — confirmed dirty branches still get per-branch wrappers + display-toggle, registry sets branchMode correctly.
- [01:06] Decision deviation from plan: pre-commit hook enforces tests-pass. Need to either (a) bundle Step 1 + Step 4-partial (else-if assertion inversions) into one commit so pre-commit passes, or (b) bypass with --no-verify (forbidden). Going with (a). Updated else-if.test.js N31 chain-shape assertions for Phase 2g (kept N31 anti-leak invariants). bun test → 6160/6160 unit + post-commit ran 8094/0f. Step 1 committed: `6bdcea8`.
- [01:07] Step 2 — binding-registry.ts LogicBinding interface formalization:
  - Added `kind?: "if-chain-branch" | "if-chain-else"` discriminator (optional — absent on conventional bindings, set on chain bindings).
  - Made `placeholderId?` and `expr?` optional (chain bindings don't use them).
  - Added chain-specific fields: `chainId?`, `branchId?`, `branchIndex?`, `branchMode?: "mount" | "display"`, `condition?`, `refs?`.
  - Updated docstring with Phase 2g addition section explaining the discriminator + chain shape.
  - Removed 4 `as any` casts on the chain emit sites in emit-html.ts. The 2 remaining `as any` at lines 694/696 are pre-existing Phase 2c B1 (use varName/dotPath/condExpr/condExprNode — not in scope for Phase 2g).
  - bun test 6160/6160 unit pass. No regressions.
- [01:08] Next: Step 3 (emit-event-wiring.ts chain controller rewrite).
