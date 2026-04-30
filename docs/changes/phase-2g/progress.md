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
- [01:09] Step 3 — emit-event-wiring.ts chain controller rewrite:
  - Extended local LogicBinding interface with Phase 2g chain fields (kind?, chainId?, branchId?, branchIndex?, branchMode?, condition?). Made placeholderId? and expr? optional (chain bindings don't use them).
  - Rewrote `// --- §17.1.1: if-chain wiring ---` block (lines 561-610 of pre-Step-3) to emit the per-branch dispatch controller.
  - Per-branch state declarations:
    - mount-mode: `let _scrml_chain_<branchId>_root = null; let _scrml_chain_<branchId>_scope = null;`
    - display-mode: `const _scrml_chain_<branchId>_wrapper = document.querySelector('[data-scrml-chain-branch="<branchId>"]');`
  - `_update_chain_<chainId>()`:
    - Computes `_next` branchId via condition cascade (existing logic verbatim).
    - Idempotency guard: `if (_next === active) return;`
    - Deactivate previous via switch on active: mount-mode → unmount + null roots; display-mode → wrapper.style.display = "none".
    - Activate next via switch on _next: mount-mode → create_scope + mount_template; display-mode → wrapper.style.display = "".
    - Update `active = _next`.
  - Initial render call + `_scrml_effect(_update_chain_<chainId>)`.
  - Probed all four cases (all-clean, mixed clean+dirty, 3-branch all-clean, all-dirty). HTML + JS shape verified. Generated JS validated with `node --check` — all four files syntactically valid.
  - bun test: 6160 unit + 929 integration + 280 conformance = ALL pass. No regressions.
- [01:10] Committing Step 3.
- [01:11] Step 4 — Tests: new file `chain-mount-emission.test.js`:
  - 31 tests across 8 sections (N1-N31), modeled on the proven if-mount-emission.test.js pattern.
  - §1 HTML emission — all-clean chains (N1-N5).
  - §2 HTML emission — all-dirty chains (today's behavior preserved) (N6-N8).
  - §3 HTML emission — mixed-cleanliness chains (N9-N12).
  - §4 Registry binding shape per branch (N13-N17): branchMode "mount"/"display", templateId/markerId presence, chainId stability, branchIndex 0..N-1 with else absent.
  - §5 Client JS — all-clean controller (N18-N22): per-branch root/scope locals, mount/unmount calls, idempotency guard, _scrml_effect subscription.
  - §6 Client JS — all-dirty controller (N23-N25): querySelector wrapper, NO mount/unmount inside chain block, display-toggle.
  - §7 Client JS — mixed-cleanliness controller (N26-N28): both arms in same switch, per-branch local types match per-branch mode.
  - §8 Round-trip (N29-N31): brace-balance smoke check, condition order respected, standalone if= unaffected.
  - First N24 fix: initially used `<p if=@show>${@status}</>` + `<p else>fallback</>` which is mixed (else is clean text). Replaced both branches with reactive interp to get truly all-dirty.
  - Final test: 31/31 pass. Total unit suite: 6191 pass / 0 fail (was 6160; +31 from new file).
- [01:12] Final test surface:
  - bun test (all): 8125 pass / 40 skip / 0 fail / 28631 expects / 384 files.
  - Baseline was 8094 pass / 40 skip / 0 fail / 28542 expects / 383 files.
  - Net change: +31 tests (chain-mount-emission.test.js) + +89 expects.
  - No regressions. No pre-existing failures masked.
- [01:13] Phase 2g complete. Ready for merge.

## Final state (READY FOR MERGE)

Branch: `changes/phase-2g-chain-mount`

Commits (chronological):
1. `8522b95` — WIP(phase-2g): pre-snapshot — baseline 8094p/0f, greenlit design captured
2. `6bdcea8` — WIP(phase-2g): Step 1 — emit-html.ts chain handler rewrite (per-branch B1 dispatch)
3. `625f232` — WIP(phase-2g): Step 2 — binding-registry.ts LogicBinding interface for chain shape
4. `2a02ffd` — WIP(phase-2g): Step 3 — emit-event-wiring.ts chain controller (per-branch dispatch)
5. `bf64bb4` — test(phase-2g): Step 4 — new chain-mount-emission.test.js (31 tests, N1-N31)

Files touched:
- compiler/src/codegen/emit-html.ts (Step 1)
- compiler/tests/unit/else-if.test.js (Step 1: assertion inversions for Phase 2g shape)
- compiler/src/codegen/binding-registry.ts (Step 2)
- compiler/src/codegen/emit-event-wiring.ts (Step 3)
- compiler/tests/unit/chain-mount-emission.test.js (Step 4: NEW)
- docs/changes/phase-2g/progress.md (this file)
- docs/changes/phase-2g/pre-snapshot.md (baseline doc)

Test counts:
- Pre-Phase-2g baseline: 8094 pass / 40 skip / 0 fail / 28542 expects / 383 files.
- Post-Phase-2g: 8125 pass / 40 skip / 0 fail / 28631 expects / 384 files.
- Delta: +31 tests (chain-mount-emission.test.js), +89 expects, +1 file. No regressions.

Constraints honored:
- ✅ Approach A + W-keep-chain-only + per-branch mixed-cleanliness dispatch.
- ✅ NO new runtime helpers. Phase 2c B1 helpers reused verbatim.
- ✅ NO spec amendments. §17.1.1 line 7533 stays normative-by-implication.
- ✅ NO removal of stripChainBranchAttrs (strip-precursor preserved).
- ✅ NO scope expansion.
- ✅ NO --no-verify on commits. All commits passed pre-commit + post-commit hooks.
- ✅ Validation principle: chain emission gates correctly per branch, controller wiring matches HTML shape, all generated client.js syntactically valid (`node --check`).

OQs surfaced mid-flight:
- **OQ-2H-1**: pre-existing condition emission bug in chain controller for expression conditions
  (e.g., `if=@step == 1`). Both pre-Phase-2g AND Phase 2g controllers emit
  `_scrml_reactive_get("step")` instead of `(_scrml_reactive_get("step") == 1)`.
  Visible in `samples/compilation-tests/gauntlet-s19-phase2-control-flow/phase2-if-else-attr-chain-017.scrml` compiled output. Phase 2g preserves the existing handling
  verbatim — this is NOT a Phase 2g regression. Likely a TAB-stage issue:
  `branch.condition.raw` is not being populated for `@var == literal` expression
  conditions, so the controller falls through to the variable-ref path which only
  encodes the variable name. Route to **Phase 2h** triage (deep-dive §7 noted
  pre-existing fixture issues).

Sample/fixture failures discovered:
- 6 of 6 sample chains (recipe-book, blog-cms, quiz-app, api-dashboard, kanban-r11,
  task-dashboard) fail to compile from upstream pipeline stages (BS / TAB / TS errors).
  All pre-existing — none introduced by Phase 2g. These match the deep-dive §7 / §8
  phase-2h pre-scope warning: "S49 attempt at a sweep test surfaced 12 pre-existing
  fixture failures unrelated to Phase 2c. Phase 2h must triage these BEFORE running
  mount/unmount semantic tests."
- 3 of 4 chain-related compilation-tests fixtures compile cleanly (017, 004, 005).
  4th fixture (099) has E-CTRL-001 — that's the EXPECTED outcome (test name and
  comment confirm it asserts on chain-break behavior). Not a regression.

Status: **READY FOR MERGE**

## Tags
#phase-2g #if-chain #mount-unmount #emit-html #emit-event-wiring #binding-registry #ready-for-merge

## Links
- Deep-dive: /home/bryan-maclee/scrmlMaster/scrml-support/docs/deep-dives/phase-2g-chain-mount-strategy-2026-04-29.md
- Pre-snapshot: docs/changes/phase-2g/pre-snapshot.md
- Phase 2c B1 reference: compiler/src/codegen/emit-html.ts:575-603
- Spec: §17.1.1 — compiler/SPEC.md:7366-7619
- Spec: §6.7.2 — compiler/SPEC.md:2551-2585
