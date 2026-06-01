# progress — each-render-before-cell-init-2026-06-01

## 2026-06-01 — Phase 0 (confirm breadth + locate)
- Startup verified: worktree = .claude/worktrees/agent-a8e6393c0cbc2352e; ff-merged main to 46f9bb55; bun install + pretest OK.
- Built minimal repro (non-empty `<items>: Item[] = [{...}]` + `<each>` NO `<empty>`).
  CONFIRMED crash at RUNTIME in happy-dom:
    `TypeError: undefined is not an object (evaluating 'newItems.length')`
    at _scrml_reconcile_list <- _scrml_each_render_10 (module-init).
  Emitted order: `_scrml_each_render_10()` (L26) BEFORE `_scrml_reactive_set("items",...)` (L30).
- BLIND-SPOT ROOT CAUSE (why existing #7 each tests PASS):
  Their reproducers ALL include an `<empty>` block. emit-each.ts emits an
  `if (!_items || _items.length === 0) { ...render empty...; return; }` guard
  ONLY when `node.emptyChild` is present. That `!_items` check shields the
  undefined-at-init case. WITHOUT `<empty>`, codegen goes straight into
  `_scrml_reconcile_list(_mount, _items, ...)` with `_items === undefined` -> crash.
  Confirmed empirically: L2 source (with `<empty>`) does NOT throw; minimal (no `<empty>`) DOES.
- Located:
  - emit-each.ts:856-869 — empty-state guard (only when node.emptyChild).
  - emit-each.ts:880-896 — unguarded _scrml_reconcile_list call.
  - emit-client.ts:1409-1421 — dispatchers (_scrml_each_render_NN() + effect_static) emitted EARLY.
  - emit-client.ts:1565-1566 — reactiveLines (the _scrml_reactive_set cell-init) emitted AFTER dispatchers.
  - runtime-template.js:1237-1240 — _scrml_reconcile_list reads newItems.length unguarded.

## Fix plan (BOTH, clean + contained)
1. emit-each.ts — add `if (!_items)` empty-render guard to the NO-`<empty>` path (clear mount, return).
2. runtime-template.js — _scrml_reconcile_list tolerate undefined/non-array newItems as [] (belt-and-suspenders).
3. emit-client.ts — emit the EACH dispatchers AFTER reactiveLines (correct first render); leave engine/match dispatchers in place (avoid engine boot reorder).

## 2026-06-01 — Fix landed + R26 verification
- Committed fix (fdde9cae): emit-each guard + runtime-template guard + emit-client each-dispatcher deferral.
- Committed regression test (49e6d5f4): each-render-before-cell-init.browser.test.js — 8/8 PASS post-fix; verified 7/8 FAIL on pre-fix source (genuinely bug-catching).
- Full pre-commit suite green on both commits (HEAD advanced; hook aborts on any fail).

### R26 happy-dom results
1. MINIMAL repro (non-empty `<items>=[{...}]`, NO `<empty>`): pre-fix THREW
   `TypeError: undefined is not an object (newItems.length)` at module-init.
   Post-fix: MOUNT OK; FIRST render shows initial items (Alpha, Beta — ordering fix);
   populate-on-write re-renders (3 items). Empty-initial: 0 rows, no crash; populate -> 1 row.
2. req2.scrml: compiles clean; MOUNT OK — NO `_scrml_reconcile_list` crash at module-init
   (pre-fix the each-render at L101 ran before cell-init at L239 -> crash). Cell-init
   (`_scrml_reactive_set("todos", deep_reactive([]))` L239) now precedes the deferred each
   dispatcher (`_scrml_each_render_89()` L244). Engine boots into Loading without crashing.
3. #7 each tests (each-body-interactivity-landing2) still 10/10 PASS.

### OUT-OF-SCOPE DISCOVERIES (surfaced, NOT fixed — per brief STOP-and-report)
- req.scrml does NOT compile: 3 PRE-EXISTING errors at PASS/RI/SCOPE stages, unrelated to
  this CG bug: E-RI-002 (server-fn `run` assigns @reactive), E-SCOPE-001 (`listTodos`
  declared inside a match-arm, out of scope), E-CODEGEN-INVALID-JS (downstream). My changes
  only touch CG (emit-each/emit-client/runtime-template) and cannot affect RI/SCOPE — these
  predate my work. req.scrml never reaches the each-render CG stage. (Brief check-2 expected
  req.scrml to compile+mount; it can't, for reasons orthogonal to this bug.)
- req2.scrml engine-each: after the engine swaps in the Browsing variant DOM (which contains
  the `each_89` mount), the list does NOT populate even when @todos changes. ROOT CAUSE: the
  each render fn's `if (!_mount) return;` (L55) fires BEFORE `_scrml_reactive_get("todos")`
  (L56) at module-init (engine in Loading -> no each-mount yet), so `_scrml_effect_static`
  records NO dependency on `todos`; the effect never re-fires on todos change. SEPARATE bug —
  effect dependency-tracking is defeated for each-blocks whose mount is engine-variant-gated.
  NOT the module-init crash fixed here. Recommend follow-up: (a) read the source cell BEFORE
  the `!_mount` early-return so the dep is always tracked, or (b) re-run each dispatchers on
  engine variant-swap. Beyond this brief's stated fix (statement-reorder + guard).
