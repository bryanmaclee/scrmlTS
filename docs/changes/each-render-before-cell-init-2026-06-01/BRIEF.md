# BRIEF — `<each>` render emitted before cell-init → runtime crash

> Archived per pa.md S136 (verbatim). Dispatched S152 2026-06-01, `isolation:worktree` + `run_in_background`, scrml-js-codegen-engineer (opus). Agent `a8e6393c0cbc2352e`. HIGH runtime crash surfaced by the Shape-4 agent + the req.scrml/req2.scrml dogfood; user chose "fix it first" before wrap. Verbatim `prompt:` below.

---

# TASK: `<each>` render emitted before cell-init → runtime crash (change-id: `each-render-before-cell-init-2026-06-01`)

**HIGH runtime crash, broad scope, confirmed.** The auto-generated `<each>` render fn is CALLED synchronously at module-init BEFORE the `<each>`'s source cell is initialized → the first render hits an uninitialized cell → `_scrml_reconcile_list(undefined)` → `TypeError: ...newItems.length`. The compiled JS parses fine (so `node --check` / `vm.Script` pass) — it crashes at RUNTIME on first render. This is very likely the root of an adopter's "scrml dev shows nothing" (compile-clean, runtime-dead).

## CONFIRMED EVIDENCE (PA, HEAD `46f9bb55`)
Two emitted-JS samples, each-render call BEFORE the cell-init `_scrml_reactive_set`:
- Minimal `<program>` + `<items>: I[] = [{...}]` + `<ul><each in=@items key=@.id>…</each></ul>` →
  `_scrml_each_render_7()` at line **26**, but `_scrml_reactive_set("items", _scrml_deep_reactive([...]))` at line **30**. The render runs at L26 against undefined `items`.
- req2.scrml (engine variation): `_scrml_each_render_89()` at L101; `_scrml_reactive_set("todos", _scrml_deep_reactive([]))` at L239.
The Shape-4 agent ALSO confirmed the crash via happy-dom on `<todos>: Todo[] = []` + `<each>`. **It is NOT Shape-4-specific** — hits the explicit `= []` form, the untyped `<x> = []` form, and non-empty initials alike. Any `<each in=@cell>` where `@cell` is declared in the same program.

## PHASE 0 (confirm breadth + locate; report before building if it balloons)
1. Build the minimal repro (above) IN your worktree; confirm at RUNTIME (happy-dom, mirroring `compiler/tests/browser/*`) that mounting it throws `_scrml_reconcile_list(undefined)` / `newItems.length`.
2. **Reconcile the test blind spot:** the #7 `<each>` happy-dom tests (`compiler/tests/browser/each-body-interactivity-landing2.browser.test.js`) PASS — figure out WHY (do they set the cell before invoking the render, or bypass the module-init statement order?). Your new test MUST exercise the REAL module-init order (load the emitted client.js as-is and run it), or it'll have the same blind spot.
3. Locate the module-init statement ordering: where the each-render call (`_scrml_each_render_NN()`) is emitted vs where cell-init `_scrml_reactive_set(...)` statements are emitted (likely `compiler/src/codegen/index.ts` module-body assembly + `compiler/src/codegen/emit-each.ts` for the render-call placement) + the `_scrml_reconcile_list` impl in `compiler/src/runtime-template.js` (the undefined-handling).
- If the fix needs more than statement-reordering and/or a defensive `_scrml_reconcile_list` guard, STOP and report.

## THE FIX (pick the robust combination; both are legitimate)
- **Root (ordering):** emit the cell-init `_scrml_reactive_set(...)` statements BEFORE the module-init each-render calls, so the initial render sees the real value. Be careful not to break the reactive-wiring order that other emit paths depend on (engines, derived cells, the `_scrml_effect_static` subscriptions). Verify no regression in the broader suite.
- **Guard (defensive):** make `_scrml_reconcile_list` (and/or the each-render) tolerate an undefined / not-yet-initialized collection — treat it as `[]` (render empty), so the `_scrml_effect_static` subscription then re-renders correctly when the cell-init fires. This is belt-and-suspenders even if the ordering is fixed.
Prefer doing BOTH if clean (ordering = correct first render; guard = robustness). At minimum the guard must stop the crash; the ordering makes the first render correct.

## MAPS — REQUIRED FIRST READ
`.claude/maps/primary.map.md` in full; §"Task-Shape Routing" for codegen + runtime. Maps reflect `09f74bee`; verify against HEAD `46f9bb55` (emit-each.ts / index.ts / type-system.ts moved this session — S152).

## CRITICAL — STARTUP + PATH DISCIPLINE (S99/S126)
1. `pwd` MUST start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`; else STOP (S90). Save WORKTREE_ROOT. 2. `git rev-parse --show-toplevel`==WORKTREE_ROOT. 3. `git status --short` clean. 4. `git merge main` if base stale (base should be `46f9bb55`). 5. `bun install`. 6. `bun run pretest`.
- ALL edits via Bash (perl/python/heredoc) on WORKTREE_ROOT-absolute paths incl. the `.claude/worktrees/agent-<id>/` segment — NOT Edit/Write tools (they leak to MAIN). Echo path before each write; `git diff` after. NEVER `cd` into main; use `git -C "$WORKTREE_ROOT"`, `bun --cwd "$WORKTREE_ROOT"`.
- First commit msg includes verbatim `pwd`: `WIP(each-init-order): start at <pwd>`. Commit per-step; `git status` clean before DONE; write `docs/changes/each-render-before-cell-init-2026-06-01/progress.md` per step.

## VERIFICATION (R26 — pa.md S138; this is a RUNTIME crash so happy-dom is MANDATORY)
1. **Minimal repro** mounts in happy-dom WITHOUT crashing + renders the item(s); a subsequent `@items = [...]` re-renders. Load the emitted client.js AS-IS (real module-init order) — do NOT hand-order state-before-render in the test.
2. **req.scrml + req2.scrml** (`/home/bryan-maclee/scrmlMaster/req.scrml`, `req2.scrml`) compile AND mount in happy-dom without the `_scrml_reconcile_list` crash (the list renders; for req2 the engine boots into Browsing and the list shows).
3. **#7 each tests still pass** (the existing `each-body-interactivity-landing2.browser.test.js` + `each-block.test.js`), and the empty-array case (`<todos>: Todo[] = []` + `<each>` + `<empty>`/no-empty) renders without crash.
4. Full pre-commit subset — 0 regressions. If you touch `index.ts` module-assembly or `runtime-template.js`, run the broader suite (engine + derived + each + browser tests are sensitive to init ordering).

## TESTS
- NEW happy-dom test that loads a compiled `<each>`-over-same-program-cell client.js in REAL module-init order and asserts it mounts + renders without crashing (the test that would have caught this — closes the #7 blind spot). Cover: empty initial `[]`, non-empty initial, and populate-on-write. If you fixed ordering, assert the cell-init precedes the each-render call in the emit (codegen unit).

## REPORT
- WORKTREE_PATH + BRANCH + FINAL_SHA. FILES_TOUCHED.
- Phase-0: the confirmed trigger breadth + WHY the #7 tests missed it + the chosen fix (ordering / guard / both) + why.
- R26 results (the 4 checks; happy-dom mount evidence for minimal + req + req2).
- Test counts before/after + new tests. Maps feedback.
- Any path-discipline incident (self-report).
