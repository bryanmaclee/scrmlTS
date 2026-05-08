# Survey: server-keyword-deprecation-batch-1-2026-05-08

## Scope
Implement Insight 26's load-bearing precondition stack (D1-D5) so Position B
can ship in Batch 2. All 5 deliverables localize to `route-inference.ts` plus
RI test additions.

## Tier classification (per-deliverable + overall)

| Deliv | Surface | Tier | Justification |
|-------|---------|------|---------------|
| D1    | `SERVER_ONLY_SCRML_MODULES` set + 5 entries | T1 | Single-file, additive, no contract change |
| D2    | `SERVER_ONLY_PATTERNS` regex + bun namespace import | T1-T2 | Single-file mostly; namespace-import recognition (D2c) extends `buildImportedServerFnNames` (still single-file) |
| D3    | Caller-context propagation (Step 4 → fixed-point) | **T2** | NEW dataflow direction (forward callee → backward caller); single-file but introduces a new propagation phase. NOT T3 because no AST/contract changes; bounded by existing escalation lattice. |
| D4    | W-DEAD-FUNCTION emission | T2 | Single-file, NEW diagnostic, false-positive risk requires conservative gating |
| D5    | W-DEPRECATED-SERVER-MODIFIER emission | T1 | Single-file, NEW diagnostic, simple gating |

**Overall tier: T2.** All in one file (`route-inference.ts`) plus its test
file. No spec amendments (out of scope for Batch 1). No AST changes. No
PIPELINE contract changes — the RI output shape (`RouteMap`, `FunctionRoute`)
is unchanged; only the `errors` array gains new diagnostic codes.

## D3 (caller-context propagation) — design

**Current behavior** (Step 4, lines 1487-1511): a function's escalation reasons
= its own direct triggers. Calling a server function does NOT escalate the
caller.

**New behavior** (extension): after Step 5 (resolved direct-server set), add a
**Step 5c**: caller-context propagation via fixed-point iteration.

### Algorithm

```
Step 5c (NEW): Caller-context propagation.

Build callerMap: Map<calleeName, Set<callerFnId>>.  // Inverse of callees per fn.

Build markupRefs: Set<fnName>.
  // Functions referenced from any markup attribute value (event handlers,
  // bind:, etc.) — collected from FileAST.markup tree.
  // PHASE-A: not implemented; conservatively treat all functions as
  // potentially markup-referenced (no false positives for D4 because we
  // require BOTH no-callee AND not-server-tainted to fire dead-warn —
  // markup refs only matter for D4, see below).
  //
  // PHASE-B (future): walk markup ASTs to populate this set precisely.

Repeat until fixed point:
  for each fnNodeId in analysisMap:
    if fnNodeId already in resolvedServerFnIds: skip
    if record.directTriggers.length > 0: skip (already handled by Step 5)

    callers = inverseCallerMap.get(fnNodeId) ?? []
    if callers is empty: skip (no propagation evidence)

    // Classify callers
    serverCallerCount = callers filtered by resolvedServerFnIds
    clientCallerCount = callers minus server callers

    if serverCallerCount > 0 and clientCallerCount === 0:
      // ALL callers are server-classified — propagate.
      resolvedServerFnIds.add(fnNodeId)
      record.directTriggers.push({
        kind: "server-only-resource",
        resourceType: "caller-context-propagation",
        span: record.fnNode.span,
      })
      escalationResults.update(fnNodeId, ...)
      changed = true

    // else: AMBIENT (mixed) or client-only — no propagation
```

**Soundness:** caller-context propagation only PROMOTES functions UP the
lattice (client → server). Cannot demote. Once server, stays server. Fixed
point terminates because the lattice is finite and each iteration is
monotonic.

**Cycle handling:** A cycle of functions where NONE has direct triggers and
NONE is called from outside the cycle stays AMBIENT (callers within the
cycle are also unclassified). No infinite loop because each iteration only
adds; no removal.

**Interaction with Step 5b (capture-based taint):** Step 5c runs AFTER Step
5b. Capture-based taint already populated. Caller-context only adds further
escalations; never removes.

### Behavioral consequences

- A function that wraps a server-only call (e.g., `function loadUsers() { return fetchUsersFromDb() }`)
  and is only called from server-classified callers — currently STAYS CLIENT
  (caller stays client, fetch-stub at codegen). Under D3: propagates to
  server (because all callers are server) — eliminates the redundant fetch
  hop.
- A function called from BOTH server AND client callers stays AMBIENT
  (currently: client; under D3: still effectively client because dual-call
  context, with codegen handling).

This is a behavioral change at the byte-output level. May reclassify some
functions in samples. Documented as expected in OUTPUT_STABILITY_DIFF.

## D4 (W-DEAD-FUNCTION) — design

A function is "dead" iff:
1. It has NO callers anywhere in the project (body-callee analysis only)
2. It is NOT exported (would be consumable from another file)
3. It is NOT explicitly server-annotated (`isServer === true`)
4. It is NOT a route handler (would be reached by client via fetch)

**Limitation: markup event-handler references are NOT tracked by RI.**
A function called only from `<button onclick={handleClick}>` would currently
appear dead via this analysis. To avoid false positives:
- Gate W-DEAD-FUNCTION behind a conservative check: emit ONLY if the
  function name does not appear as an identifier ANYWHERE in any FileAST's
  raw text (markup-text-search heuristic). Cheap and conservative.

PHASE-B (future, not in this batch): walk markup ASTs precisely.

PHASE-A approach for this batch: the heuristic + emit at info-severity for
warnings (per `route-inference.ts` warning conventions).

**Spec note:** §34 row + W-DEAD-FUNCTION definition is Batch 2 spec amendment;
in Batch 1 we implement the diagnostic with the W- prefix and a minimal
description.

## D5 (W-DEPRECATED-SERVER-MODIFIER) — design

Fires when:
- Function declaration has `isServer === true` (Trigger 4) AND
- Body has any other trigger (T1/T2/T3) OR caller-context propagation (D3) classifies as server

Does NOT fire when:
- `isServer === true` is the SOLE escalation signal (i.e., body has no
  triggers and caller-context is empty) — keyword is still load-bearing here.

**Implementation:** in Step 6 finalization (where we already iterate
`analysisMap` to build `FunctionRoute`), after determining `isServer` and
escalation reasons:

```ts
if (record.fnNode.isServer === true) {
  // Find non-explicit-annotation reasons.
  const nonExplicitReasons = deduped.filter(r => r.kind !== "explicit-annotation");
  if (nonExplicitReasons.length > 0) {
    // Keyword is redundant — fire warning.
    const firstReason = nonExplicitReasons[0];
    const triggerDesc = describeReason(firstReason);
    errors.push(new RIError(
      "W-DEPRECATED-SERVER-MODIFIER",
      `W-DEPRECATED-SERVER-MODIFIER: 'server' modifier is redundant on \`${record.fnNode.name ?? "<anonymous>"}\` ` +
      `— function body already escalates to server via ${triggerDesc}. ` +
      `The 'server' keyword is deprecated; remove from new code.`,
      record.fnNode.span,
    )).severity = "warning";
  }
}
```

## File-touch summary

| File | Change |
|------|--------|
| `compiler/src/route-inference.ts` | All 5 deliverables (regex set, modules set, propagation, dead-warn, deprecated-warn) |
| `compiler/tests/unit/route-inference.test.js` | New test sections — §26 D1, §27 D2, §28 D3, §29 D4, §30 D5 |

No other source files. No spec changes. No PIPELINE contract change.

## Risk register

| Risk | Mitigation |
|------|-----------|
| D3 reclassifies functions in stdlib that get exposed to client (samples) | Document in OUTPUT_STABILITY_DIFF; expected per Insight 26 |
| D4 false positives on markup-only-referenced fns | Heuristic: skip emit when fn-name appears as literal identifier in any file's raw markup attrs |
| D5 fires on stdlib `server function` declarations and breaks --strict CI | W-prefix (warning, not error). Documented as expected; stdlib cleanup in Batch 2 |
| Cycle in caller graph | Algorithm is monotonic-only; cycles stay AMBIENT |

## Test plan

Per-deliverable test sections in route-inference.test.js:

- §26 (D1): import from each new server-only module → callee escalates
- §27 (D2): each new regex pattern → bare-expr escalates; namespace import
  `import * from "bun"` recognized as server-only-import signal
- §28 (D3): server-caller chain escalates callee; mixed-caller stays ambient;
  client-only stays client; cycle case stays ambient
- §29 (D4): dead function (no callers, no markup ref, no export) → fires
  W-DEAD-FUNCTION; called function does NOT fire; markup-referenced does NOT
  fire; exported does NOT fire
- §30 (D5): `server function f() { return process.env.X }` → fires
  W-DEPRECATED; `server function f() {}` (sole-signal) → does NOT fire

Estimated +30 to +50 new test cases.
