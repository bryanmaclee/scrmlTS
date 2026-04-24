# Impact Analysis: boundary-security-fix

## Change Summary

Extend the scrml compiler's server/client boundary enforcement to handle indirect references through closures, callbacks, and helper functions. The current taint-propagation model (RI stage, route-inference.ts) only handles direct anchors (explicit `server` annotation, `?{}` SQL blocks, `protect=` field access, server-only resources). This leaves four security gaps:

1. Closures capturing server-tainted variables are not themselves tainted
2. Functions passed as props to components are not detected as boundary crossings
3. Reactive dependency extraction does not recurse into helper function bodies (Bug J)
4. `_ensureBoundary` defaults to "client" with a console.warn instead of failing (NC-4)

The fix adds a `closureCaptures` map, prop-passed function detection, call-graph-transitive reactive dep extraction, fixed-point capture taint propagation, and fail-closed boundary enforcement. Zero new syntax. Zero developer-facing API changes.

## Files Directly Modified

- `compiler/src/route-inference.ts` (1,495 lines): Add `closureCaptures` map construction (Step 1), prop-passed function reference detection in callee extraction (Step 2), capture-based fixed-point taint propagation (Step 4). This is the primary change.
- `compiler/src/codegen/reactive-deps.ts` (294 lines): Extend `extractReactiveDeps` with call-graph BFS to recurse into helper function bodies for transitive reactive dependency extraction (Step 3, Bug J fix).
- `compiler/src/codegen/emit-logic.ts` (1,706 lines): Convert `_ensureBoundary` (line 318) from fail-open (console.warn + default to "client") to fail-closed (throw CompilerError) (Step 5, NC-4 fix).

## Downstream Stages Affected

- Stage 6 TS (type-system.ts): No direct changes. TS consumes RouteMap but does not inspect closureCaptures. No impact expected.
- Stage 7 DG (dependency-graph.ts): Consumes RouteMap boundaries. If more functions are now server-tainted, the dependency graph may have different server/client edges. This is expected and correct behavior.
- Stage 8 CG (code-generator.ts and sub-modules): CG reads `boundary` from RouteMap to decide which emit path to use. More functions classified as server will route through emit-server.ts instead of emit-client.ts. The `_ensureBoundary` change (Step 5) will cause compilation failures for any codegen path that currently calls `emitLogicNode` without a boundary — these must be identified and fixed if they exist. The current codebase always passes `boundary: "client"` as default in the opts, so this is unlikely to break existing code but needs verification.

## Pipeline Contracts At Risk

- PIPELINE.md RI stage contract: The `AnalysisRecord` interface gains a `closureCaptures` field. This is additive — no existing fields change.
- The `resolveEscalation` function (line 1134) currently returns only `directTriggers`. After Step 4, it will also return capture-derived triggers. Downstream consumers of `FunctionRoute.escalationReasons` will see additional reasons. This is correct behavior but could change test assertions.
- The `_ensureBoundary` change (Step 5) converts a warning to an error. Any codegen path that relies on the default-to-client behavior will now throw. This is intentional — it surfaces compiler bugs instead of silently misclassifying functions.

## Spec Changes Required

None required for the implementation. The spec at SPEC.md section 15.11.6 (line 6995) already mandates this behavior: "Route Inference SHALL detect server functions passed as props." The implementation is catching up to the spec.

Section 12 (line 5474) does not need changes — the escalation triggers listed there remain the same. The closure capture taint is an implementation detail of HOW those triggers propagate, not a new trigger type.

## Tests That Must Pass

- All existing 7,476 passing tests (baseline at session start)
- `compiler/tests/unit/route-inference.test.js` — existing RI tests
- `compiler/tests/unit/reactive-deps.test.js` — existing reactive deps tests (if present)
- `compiler/tests/integration/` — integration tests

## New Tests Required

- Closure capturing server var results in server-tainted function
- Closure capturing pure var stays pure
- Transitive capture (closure A captures closure B which captures server var)
- Prop-passed server function detected as boundary crossing
- Call-graph BFS reactive deps: `${helperFn(@var)}` correctly extracts `@var`
- Bug J reproducer: helper function wrapping reactive read generates display-wiring
- `_ensureBoundary` throws on missing boundary instead of warning
- Fixed-point iteration terminates (cycle guard test with mutually-recursive closures)

## Expected Behavioral Changes

- Functions that capture server-tainted variables will now be classified as server-side (previously client-side)
- Reactive display-wiring will be emitted for interpolations that use helper functions wrapping reactive reads (Bug J fix)
- Missing boundary in `emitLogicNode` will now throw instead of warn (NC-4 fix)

## Must Not Change (Invariants)

- Functions with only direct triggers must produce identical RouteMap entries
- Client functions that CALL server functions (via fetch stubs) must remain client-side — this is the deliberate design decision from RI Step 4 (line 1117)
- CPS transformation eligibility must not change
- Pure functions (no server triggers, no closures over server vars) must remain classified as client
- All existing test assertions that pass today must continue to pass
- The 40 skipped tests must remain skipped (not newly failing)

## Tags
#boundary-security-fix #T3 #route-inference #reactive-deps #emit-logic #closure-capture #taint-propagation

## Links
- [deep-dive](../../deep-dives/boundary-security-indirect-refs-2026-04-24.md)
- [route-inference.ts](../../compiler/src/route-inference.ts)
- [reactive-deps.ts](../../compiler/src/codegen/reactive-deps.ts)
- [emit-logic.ts](../../compiler/src/codegen/emit-logic.ts)
- [Bug J reproducer](../../handOffs/incoming/2026-04-22-0940-bugJ-markup-interp-helper-fn-hides-reactive.scrml)
