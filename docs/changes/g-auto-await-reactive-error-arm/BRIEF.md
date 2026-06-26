# BRIEF — ss32 item 1: g-auto-await-reactive-server-no-error-arm (MED)

**Dispatched by:** sPA ss32 · **Branch to land on:** `spa/ss32` · **Agent:** scrml-js-codegen-engineer, `isolation:"worktree"`, model opus.

## Goal (one sentence)
The per-statement auto-await IIFE that wraps a reactive-server assignment is **catch-less** — a rejected fetch/CPS stub becomes a browser-level `unhandledrejection` (silent drop, NO scrml error surface). Give the IIFE an **error arm**: route the rejection through the statement's `!{}` handler **if present**, else to the **scrml-level uncaught-error surface** (NOT a silent drop). This is the flogence S15 residual.

## The exact emit site (this is the whole bug surface)
`compiler/src/codegen/emit-client.ts`, the `post-server-fn-iife-wrap` string-rewrite stage (~`:1990`–`2068`). The emitted wrap is **line 2064**:
```js
(async () => _scrml_reactive_set(${nameArg}, await ${mangledName}(${args})))()${hadTrailingSemi ? ";" : ""}
```
That bare `()` floating promise is the catch-less drop. (Note: the SSE branch at `:2087` is a DIFFERENT mechanism — out of scope. Only the fetch/CPS `_scrml_(fetch|cps)_` wrap at `:1990` is in scope, gated by the regex at `:1992`.)

## PHASE 0 — SURVEY + WITNESS + FEASIBILITY (STOP-report before building)
R26 empirical, BOTH directions (S138). Build a **real flogence-shaped repro** and compile it — do not reason from source alone:
1. **Witness the no-`!{}` case:** `@data = serverFn(args)` where `serverFn` can fail. Compile, read the emitted client JS, CONFIRM the catch-less IIFE at `:2064` and that a rejection escapes to `unhandledrejection`. This is the bug.
2. **Witness the `!{}` case:** `@data = serverFn(args) !{ ::NetworkError :> ... }`. Compile and determine the emitted shape: **does the `!{}`-carrying statement even reach this `:1990` wrap, or does the `!{}` failable path emit differently (envelope-returning, not rejecting)?** This decides whether "route through `!{}`" is a real branch here or a no-op because `!{}` is already handled upstream.
3. **Reuse-survey (do NOT reinvent):**
   - `emit-logic.ts:471`/`:510` already **scan an emitted block-body string for a TOP-LEVEL (depth-0) `!{` failable handler** and re-split it as an error-effect — this is the prior-art for associating a `!{}` handler at a string stage. Determine whether you can reuse it (or its helper) to find this statement's `!{}` handler at the `:1990` stage.
   - The unified error envelope is `{ __scrml_error, type, variant, data }` (emit-logic.ts §19.4.3, ~`:579`). The caller's `?` / `!{}` / `<errorBoundary>` all "observe one shape" (emit-functions.ts:332).
   - The scrml-level uncaught surface is `_scrml_error_boundary_uncaught(envelope)` (runtime-template.js:2580) + `_scrml_error_boundary_log` (2551). The `else` arm (no `!{}`) should surface through this typed path — NOT `console.error`, NOT a silent drop.
4. **STOP-report** if: (a) the `!{}` association is NOT recoverable at the `:1990` stage without moving the fix earlier in the pipeline (that's a bigger structural change — surface it as a fork, don't force it), or (b) the `!{}` case already routes correctly upstream so only the no-`!{}` default arm needs the fix (then say so — the fix narrows to just the `.catch`→uncaught-surface arm).

Report which case (a)/(b) holds + your chosen routing BEFORE building.

## PHASE 1 — BUILD (only after Phase 0)
- Give the IIFE a rejection handler. Minimal shape: `(async () => ...)().catch(e => <route>)`.
  - **`!{}` present + recoverable at this stage:** route `e` (normalized to the `{ __scrml_error, ... }` envelope) through that handler — mirror the existing failable-arm machinery, do not hand-roll a parallel path.
  - **else (default):** route through `_scrml_error_boundary_uncaught(...)` (normalize a raw rejection into the typed envelope first — match how the rest of the pipeline normalizes a thrown/rejected value into the scrml error shape; reuse the existing normalizer, do not invent one).
- Preserve the S84 statement-vs-expression `hadTrailingSemi` logic exactly (the `await ((async()=>...)();)` `;)` hazard at `:2053`-`:2061`). The `.catch(...)` must sit on the IIFE call, valid in BOTH statement and expression position.

## VERIFICATION (mandatory)
- **R26 on real compiled source** (not synthesized AST): recompile the repro from Phase 0; confirm a rejected reactive-server assignment now surfaces a scrml error (envelope → `!{}` or uncaught-surface), NOT an `unhandledrejection`. Confirm the happy path (resolve) is byte-unchanged except the added `.catch`.
- **Regression test:** add a codegen/integration test asserting the wrapped emit now carries the error arm for BOTH the no-`!{}` and (if applicable) `!{}` shapes, and that the expression-position wrap stays valid (no `;)`).
- **Full suite:** `bun run test` MUST be fully green. ALSO run the TRUE full `bun test compiler/tests/` (the pre-commit hook scope EXCLUDES top-level `compiler/tests/parser-conformance-*.test.js`; a fixture-adding test can pass the hook but trip the within-node/corpus gate — re-baseline only if you ADD a `.scrml` fixture, and report it). Pre-existing stdlib "statement boundary not detected" warnings are known noise.

## COMMIT DISCIPLINE
- Work in YOUR isolation worktree. **Commit INCREMENTALLY** (Phase-0 findings → fix → tests) — your branch + commits are the crash-recovery anchor.
- Do NOT bypass the pre-commit hook (`--no-verify`). Do NOT touch `main`. Do NOT push. The sPA lands your branch onto `spa/ss32`.
- If Phase 0 hits a STOP fork, commit the findings doc and report — don't force a structural change.

## RETURN (final message = structured data for the sPA)
(a) Phase-0 verdict: case (a)/(b) + the witnessed emit shapes for both no-`!{}` and `!{}`; (b) chosen routing + why; (c) files changed (full paths); (d) your branch + tip SHA; (e) full-suite result (hook scope AND true `compiler/tests/`); (f) the before/after emitted JS for the repro; (g) any STOP/park.
