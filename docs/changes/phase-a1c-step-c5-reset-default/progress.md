# C5 progress log

## 2026-05-08 — Survey + dispatch

- 12:00 — Worktree verified at `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a8a7d1ff4ebd6226d`. Tree clean. `bun install` ok. `bun run pretest` ok. Baseline: 9,949 pass / 60 skip / 1 todo / 0 fail / 34,438 expects (matches brief).
- 12:30 — Brief, SPEC §6.8.1/§6.8.2/§6.3.5, primer §13.7 B22, primer §11 anti-patterns all read.
- 12:45 — Codegen survey complete. Key findings:
  - C1 already shipped `_scrml_default_set` runtime helper + `_scrml_default_fns` map + `_emitDefaultSidecar` codegen sidecar. Half the C5 substrate is live.
  - `emit-expr.ts:88` has a `case "reset-expr":` STUB emitting `reset(<target>)` — a literal call to a non-existent function, marked Step-9-deferred. C5 lowers it.
  - Primary C5 work: (a) add `_scrml_init_fns`/`_scrml_init_set`/`_scrml_reset` to `compiler/src/runtime-template.js`; (b) add `_emitInitThunkSidecar` peer to `_emitDefaultSidecar` in `emit-logic.ts`; (c) replace `emit-expr.ts:88` stub with real lowering.
  - Brief locus said `compiler/src/codegen/runtime-template.js`; actual is `compiler/src/runtime-template.js`. Minor file-path correction.
  - Brief did not name `emit-expr.ts`; the reset-expr lowering lives there. Scope-augmentation surfaced in SURVEY.
- 12:55 — SURVEY.md written. Implementation plan: 5 incremental commits (runtime helpers → init-thunk sidecar → reset-expr lowering → tests → final verify).

## Implementation

- 13:00 — Commit 1 (`b2e4501`): runtime helpers landed.
  - Added `_scrml_init_fns` storage + `_scrml_init_set` setter to `compiler/src/runtime-template.js`.
  - Added `_scrml_reset` helper with three-arm dispatch (default-wins, init-fallback, compound-walk).
  - Added new tree-shakeable `reset` chunk (`_scrml_reset` only). Storage maps `_scrml_default_fns` / `_scrml_init_fns` stay in `core` so file-init calls always resolve.
  - Wired `RUNTIME_CHUNK_ORDER` (15 chunks now) + chunk marker `§6.8 reset+default runtime (chunk: 'reset')`.
  - Updated `runtime-tree-shaking.test.js` chunk-count assertion 14→15.
  - Wired chunk-detection in `emit-client.ts`: trigger `reset` chunk on (a) any state-decl with `defaultExpr`, or (b) any `reset-expr` ExprNode in the AST.

- 13:30 — Commit 2 (`0fe0331`): emit-logic init-thunk sidecar.
  - Added `_emitInitThunkSidecar` peer to `_emitDefaultSidecar`. Skip rules cover all SURVEY §1 carve-outs (defaultExpr present, derived, markup-typed, compound parent, SQL-init, empty init).
  - Plumbed into the `_appendSidecar` helper so init-thunks emit alongside the main reactive-set in case "state-decl".

- 14:00 — Commit 3 (`9f03d04`): emit-expr reset-expr lowering + insideFunctionBody plumbing.
  - Replaced the Step-9 stub `reset(<target>)` with proper `_scrml_reset("name")` / `_scrml_reset("a.b.c")` lowering.
  - Discovered TodoMVC tests failing: init-thunks were leaking into function-body reassignments, clobbering the canonical declaration-time init thunk.
  - Added `EmitLogicOpts.insideFunctionBody` flag. Threaded through:
    - `case "function-decl"` (emit-logic.ts:1714 — the main path).
    - `emit-functions.ts` CPS wrapper + fnKind-shortcut bodies.
    - `scheduling.ts scheduleStatements` (function-body emission with server calls).
    - `case "if-stmt"` / `"for-stmt"` / `"while-stmt"` (control-flow nesting).
    - `emitIfStmt` / `emitForStmt` / `emitWhileStmt` body emission.
  - Also skip init-thunk on server boundary (server cells use `_scrml_body[...]`, not reactive_set).
  - Updated `browser-todomvc.test.js` to expose `_scrml_default_set` / `_scrml_init_set` / `_scrml_reset` to window. (Other browser tests use single-IIFE pattern and don't need this.)

- 14:30 — Commit 4 (`c6cd816`): C5 tests.
  - Added `compiler/tests/unit/c5-reset-default.test.js` with 34 tests / 51 expect calls covering 19 sections (§C5.1-§C5.19): codegen, runtime, chunk wiring.
  - Final test count: 9,983 pass / 60 skip / 1 todo / 0 fail / 34,491 expects.
  - Delta from baseline: +34 pass / +53 expects (+51 new C5 expects, +2 from runtime-tree-shaking chunk-count update).

## Status: SHIPPED

All §scope IN items per BRIEF §scope:
1. Runtime helper `_scrml_reset` ✓
2. Codegen lowering `reset-expr` → runtime call (three target shapes) ✓
3. Default-expr stamping (already C1; init-thunk peer added by C5) ✓
4. `default=null` literal evaluation works ✓
5. Cross-cell `default=@otherCell` re-evaluates at reset time ✓
6. Tests: Shape 1/2 reset, derived defensive skip, compound walk, multi-level nav, cross-cell default reactivity ✓

OUT-of-scope deferrals respected:
- No validity-surface reset wiring (C8 territory) ✓
- No engine-state reset (C12-C15 territory) ✓
- No validators-on-reset (Wave 3 territory) ✓

## Hookpoints for C8 (validity-surface reset wiring)

C8 will need to integrate reset semantics with the auto-synth validity surface (`@form.touched`, `@form.submitted`, etc., per L11 / §55.5-§55.7). Suggested integration points:

1. **`_scrml_reset` runtime helper** (`runtime-template.js`): currently dispatches default-thunk → init-thunk → compound-walk. C8 can extend with a fourth case for synth-cell reset semantics — e.g., "if name is `${compound}.touched` or `${compound}.submitted`, reset to false; if name is `${compound}.errors`, reset to empty object". Alternatively, C8 can post-process `_scrml_reset` calls and ALSO clear synth cells in the same call.

2. **Compound reset prefix-walk** (in `_scrml_reset`'s third arm): when `_scrml_reset("form")` is called, the prefix walk visits every key starting with `form.`. C8 will need to decide whether synth cells (`form.touched`, `form.submitted`, `form.errors`, `form.isValid`) should be SWEPT by this prefix walk OR explicitly reset by C8's own logic. The current implementation walks ANY key with a thunk in the registry — synth cells without registered thunks are silently skipped, which is the right default for now.

3. **`_emitInitThunkSidecar` skip rules**: currently skips compound parents. If C8 emits init-thunks for synth cells (e.g., `_scrml_init_set("form.touched", () => ({}))`), they will participate in the compound walk automatically — a clean compositional fit.

4. **`emit-expr.ts` reset-expr lowering**: emits `_scrml_reset("name")` for any canonical target. No changes expected; C8 lives entirely in the runtime helper + the synth-cell init thunks.

## Files-touched-vs-brief-expected diff

| File | Brief | Actual |
|---|---|---|
| `compiler/src/codegen/emit-logic.ts` | YES | YES |
| `compiler/src/codegen/runtime-template.js` | YES (path corrected to `compiler/src/runtime-template.js`) | YES |
| `compiler/src/codegen/emit-expr.ts` | NOT in brief | YES (necessary — Step-9 stub replacement) |
| `compiler/src/codegen/runtime-chunks.ts` | NOT in brief | YES (new `reset` chunk) |
| `compiler/src/codegen/emit-client.ts` | NOT in brief | YES (chunk detection) |
| `compiler/src/codegen/emit-functions.ts` | NOT in brief | YES (insideFunctionBody plumbing) |
| `compiler/src/codegen/emit-control-flow.ts` | NOT in brief | YES (insideFunctionBody plumbing) |
| `compiler/src/codegen/scheduling.ts` | NOT in brief | YES (insideFunctionBody plumbing) |
| `compiler/tests/unit/c5-reset-default.test.js` | YES | YES |
| `compiler/tests/unit/runtime-tree-shaking.test.js` | NOT in brief | YES (chunk-count update 14→15) |
| `compiler/tests/browser/browser-todomvc.test.js` | NOT in brief | YES (window expose) |
| `docs/changes/phase-a1c-step-c5-reset-default/{SURVEY,progress}.md` | YES | YES |

The expansion beyond the brief's named files is mostly mechanical — `insideFunctionBody` plumbing through 3 helper modules and 1 test fixture update. Each addition is justified by the SHIPPED test results (TodoMVC tests went from 5 fail → 0 fail).
