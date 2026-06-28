# BRIEF — g-reactive-map-set-control-flow-2026-06-28 (dispatched S229)

Agent: scrml-js-codegen-engineer · isolation:worktree · opus · background · id afb458f19e9abc36b
Worktree base: 2e681e16 · gap: g-reactive-map-set-method-in-control-flow-raw-emit (MED→resolved)

---

# TASK — fix g-reactive-map-set-method-in-control-flow-raw-emit (MED, change-id: g-reactive-map-set-control-flow-2026-06-28)

A REACTIVE value-native map/set method/property/index access — `@m.insert(k,v)` / `@m.size` / `@m.has(k)` / `@m[k]` / `@s.add(x)` / set `.union`/`.intersect`/`.difference` — that sits INSIDE a control-flow construct (an `if`/`else` body, a `for`/`while`/`do-while` body, an `if` condition, a `for` iterable, or a `while` condition) emits RAW `_scrml_reactive_get("m").insert(...)` / `.size` because the expr/body emit ctx built by `emit-control-flow.ts` never carried the reactive `mapVarNames`/`setVarNames`/`orderedMapVarNames` sets. The HAMT runtime object has no `.insert` method / `.size` property → **runtime `TypeError`**. It COMPILES CLEAN and passes `node --check` (valid JS syntax) → the failure is SILENT until the code RUNS.

This is PRE-EXISTING (predates ss52; not introduced by it). At TOP level of a function body the reactive lowering fires correctly — the gap is ONLY inside control-flow constructs.

## THE FIX IS A MIRROR — this is the key

ss52 (commit `5ebdbce3` — `fix(ss52): non-reactive local map/set method lowering`) solved the IDENTICAL problem for NON-REACTIVE LOCAL maps/sets. It threaded the NEW `localMapVarNames`/`localSetVarNames` sets into the same control-flow emit ctxs — but DELIBERATELY left the reactive sets out (its remit was non-reactive locals + the brief mandated reactive byte-identity). Your job: thread the REACTIVE `mapVarNames`/`setVarNames`/`orderedMapVarNames` sets ALONGSIDE the `local*` siblings ss52 already wired, at the SAME sites.

FIRST: `git show 5ebdbce3 -- compiler/src/codegen/emit-control-flow.ts compiler/src/codegen/emit-logic.ts` to read the exact `local*` threading ss52 added. Your change is symmetric — wherever ss52 added a `localMapVarNames`/`localSetVarNames` into a ctx-opts object, add the reactive `mapVarNames`/`setVarNames`/`orderedMapVarNames` siblings the same way.

## OWNED BLOCKS (your lane — ingestion-disjoint; do NOT stray outside without reporting)

- `compiler/src/codegen/emit-control-flow.ts`: `_emitIfStmtInner` [~327-427] (the if-condition `_ifExprCtx` + the if-stmt `bodyOpts`), `emitForStmt`/`_emitForStmtInner` [~428-662] + `emitHoistedForStmt` [~736-828] (the for condition/iterable/body ctxs), `emitWhileStmt` [~829-857] + `emitDoWhileStmt` [~858-879] (the while/do-while condition + body ctxs), and the `emitLogicBody` partial-opts.
- `compiler/src/codegen/emit-logic.ts`: the control-flow dispatch that builds + passes the body/expr ctx into the above.

Likely you do NOT need to touch `reactive-deps.ts` (the reactive `mapVarNames`/`setVarNames` sets already exist + are populated upstream; the gap is purely that they aren't THREADED into the control-flow ctx). CONFIRM this by tracing where the reactive sets are populated and where `emit-expr.ts`'s 4 `@`-gated map/set dispatch sites read them — if the reactive sets are already on the parent ctx, you're just propagating them into the child control-flow ctx. If you find you must touch another file, STOP and report before doing so.

The 4 `@`-gated dispatch sites in `emit-expr.ts` are ALREADY correct for reactive `@m` at top level — do NOT change reactive dispatch logic. You are changing ONLY what the control-flow ctx CARRIES, so the existing dispatch fires inside control-flow too.

## THIS CHANGES REACTIVE OUTPUT (raw → lowered) — the intended fix

Today a reactive `@m.insert(k,v)` inside an `if` body emits `_scrml_reactive_get("m").insert(...)` (raw, broken). After your fix it emits the lowered `_scrml_map_insert(_scrml_reactive_get("m"), k, v)` form (the same lowering top-level reactive already produces). That is the CORRECT, INTENDED change. Existing e2e map/set fixtures that exercise reactive maps inside control flow WILL change emitted output — verify the new output is the lowered form + RUNS correctly.

## MANDATORY VERIFICATION (this bug is a silent RUNTIME failure — compile-clean is NOT enough)

### Phase 3 — R26 RUNTIME verification (do NOT mark DONE without this passing)
Build a NEW integration test `compiler/tests/integration/reactive-map-set-control-flow-<change-id>.test.js` MIRRORING `compiler/tests/integration/nonreactive-local-map-set-ss52.test.js` — but for REACTIVE `@`-cells inside control flow. For each shape, the test must **compile → `node --check` the emitted JS → actually RUN it and assert correct runtime behavior** (the ss52 test is your template — it runs the emitted JS). Cover at minimum:
- `@m.insert(k,v)` / `@m.size` / `@m.has(k)` / `@m[k]` inside an `if` body AND in an `if` condition.
- inside a `for` body, a `for` iterable, a `while` body, a `while` condition, a `do-while` body.
- reactive `@s.add(x)` + set `.union`/`.intersect`/`.difference` inside control flow.
- an `@ordered` map inside control flow (the `orderedMapVarNames` path).
- a nested control-flow case (map op inside an `if` inside a `for`).
Each must RUN without `TypeError` and produce the expected values. Before your fix these RUN-crash; after, they pass.

### S215 adversarial (constructed edges, not just the happy path)
- map op in an `else` branch (not just the `if` branch); map op in a `for` that also declares a NON-reactive local map (both must lower — yours + ss52's); a reactive map AND a reactive set in the same control-flow body; an `@m[k]` index-WRITE vs index-READ inside a loop. Confirm none regress and all RUN.

### Full suite + within-node parity re-baseline (MANDATORY — you changed reactive emit)
Run the FULL `bun run test` (NOT just the pre-commit subset — the within-node parity canary + browser/lsp live only in the full suite). Because your fix shifts reactive emitted output for control-flow map/set fixtures, the within-node parity test may print `[within-node] OVER-BUDGET <relpath>: {CLASS:{raw,allow,residual}}`. If it does, re-baseline the M6.5.b.0 allowlist for that fixture IN THE SAME LANDING: set the allowlist entry's per-class values to the printed `raw`, in-place, preserving key order (NOT a whole-file json re-dump). Re-run full suite to confirm green. 0 fail is the contract.

### Flip the gap token
In `docs/known-gaps.md`, flip `<!-- @gap id=g-reactive-map-set-method-in-control-flow-raw-emit sev=MED status=open -->` → `status=resolved` and update the prose to RESOLVED with the fix summary. Do NOT run `state.ts --write` (the §0 rollup regen is PA-owned at landing).

(F4 startup-verification + path-discipline + commit-discipline + final-report blocks per the standing dispatch template — included verbatim in the dispatched prompt.)
