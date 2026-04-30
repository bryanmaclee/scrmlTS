# Diagnosis — F-RI-001 (server-fn return-value branching escalates client function to server)

Phase 1 read-only diagnosis. Source-of-truth examination + minimal repros + an
RI instrumentation pass to confirm the actual classification of `transition()`
against the canonical F-RI-001 pattern.

## TL;DR

**The F-RI-001 friction as written does NOT reproduce on current main.** The
canonical "client-fn → call server fn → branch on result → assign @var on
error path" pattern compiles clean. The fix that made it work is already in
main — `7462ae0 feat(boundary-security-fix)` from 2026-04-24. That commit
removed callee-based escalation from RI; only direct triggers and
closure-capture-without-call now escalate a function. The `transition()`
function in `examples/23-trucking-dispatch/pages/dispatch/load-detail.scrml`
compiles whether or not the workaround is present.

The dispatch's hypotheses (1, 3, 4) are not what is happening. Hypothesis 2
("direct trigger detection over-broad") is also incorrect for the friction
case — instrumentation shows `transition.directTriggers === []` and
`isServer === false`, so E-RI-002 cannot fire.

The friction was filed on 2026-04-30 (commit `1a9a011`), six days after the
fix landed. The author's mental model in the friction text matches the
older code — "compiler escalated `transition` to server because it calls a
server fn". That was never possible after 2026-04-24.

## What IS broken (related, but distinct from F-RI-001)

A real bug with the same symptom (E-RI-002) exists in CPS eligibility. It
fires only when a function has a *direct* server trigger (e.g. SQL inside
the function body) AND a reactive assignment buried inside an `if`/`while`/
`for` body. See repro4 below.

This is NOT the F-RI-001 case (the friction's `transition` has no direct
triggers). It is a related hazard. We do not fix it in this dispatch — see
"Recommendation" below.

## Files read

- `compiler/src/route-inference.ts` (whole file 1840 lines; targeted reads
  L1-120 header, L198-300 patterns, L520-746 walkBodyForTriggers +
  findReactiveAssignment, L747-983 CPS eligibility, L1233-1502 main entry
  + capture-taint, L1505-1620 finalisation + E-RI-002 emission)
- `examples/23-trucking-dispatch/FRICTION.md` L353-433 (entry F-RI-001)
- `examples/23-trucking-dispatch/pages/dispatch/load-detail.scrml`
  (transition, saveAssignment, setError patterns)
- `compiler/src/codegen/emit-functions.ts` L140-220 (CPS client wrapper)
- `compiler/src/codegen/emit-server.ts` L580-640 (CPS server emission)

## Method

Built four minimal repros, instrumented `route-inference.ts` to log
`directTriggers`, `callees`, `closureCaptures` for any function name passed
via `RI_DIAG=<name>`, plus an E-RI-002 emission trace.

After diagnosis, the instrumentation was removed. The current
`route-inference.ts` is identical to main.

## Repros

### repro1-canonical.scrml (the friction's pattern)

```scrml
function transition(target) {
    const result = transitionStatusServer(@load.id, target)
    if (result.unauthorized) {
        window.location.href = "/login?reason=unauthorized"
        return
    }
    if (result.error) {
        @errorMessage = result.error
        return
    }
}
```

- `RI_DIAG=transition`:
  - `directTriggers: []`
  - `callees: [transitionStatusServer]`
  - `closureCaptures: [transitionStatusServer, load, id, target, location, href, login, reason, unauthorized, error]`
  - capture-taint loop: NOT entered for `transition` because `transitionStatusServer` is in `calleesSet` (and is therefore filtered out of capture-taint propagation — boundary-security-fix line 1465).
  - `isServer: false → boundary: client`
  - **No E-RI-002. Compiles clean.**

- Compile result: `Compiled 1 file in 40.6ms` (no errors, no warnings).

### load-detail.scrml with workaround removed

Reverted `transition()` in the live dispatch example to the original failing
form (no `@errorMessage = ""` before the server call, with `if (result.error)
{ @errorMessage = result.error }`). Compiled the file directly.

- `RI_DIAG=transition`:
  - `directTriggers: []`
  - `callees: [getSessionToken, transitionStatusServer, refresh]`
  - `closureCaptures: [getSessionToken, transitionStatusServer, load, id, target, location, href, login, reason, unauthorized, error, refresh]`
- Compile result: clean (only the pre-existing E-DG-002 unused `@user`
  warning, which is unrelated). **No E-RI-002.**

### repro4.scrml (related real bug — DIFFERENT from F-RI-001)

This pattern hits a real CPS eligibility miss:

```scrml
function transition(target) {
    const tok = ?{`SELECT 1 AS x`}.get()    // direct trigger → server-escalated
    const result = checkAuth()               // server fn callee
    if (result.error) {                       // top-level "neither"
        @errorMessage = result.error          // reactive — INSIDE if-stmt body
        return
    }
}
```

- `RI_DIAG=transition`:
  - `directTriggers: [{kind: "server-only-resource", resourceType: "sql-query", ...}]`
  - `cpsResult: null`
  - `E-RI-002 fires`

Why: `analyzeCPSEligibility` only inspects top-level statements. It sees:
- s0 = let-decl with SQL init → server
- s1 = let-decl with server callee → server
- s2 = if-stmt → "neither" (not reactive at top level, not server at top level)

`hasReactive = false`, so CPS returns `null`. Then `findReactiveAssignment`
RECURSES into the if-stmt body and DOES find the buried `@errorMessage =
result.error`. Mismatch → E-RI-002 fires.

This is the bug pointed at by the dispatch's hypothesis 1 ("CPS-applicability
check has a bug"), but applies only when the function has a real direct
trigger — i.e. it is genuinely server-bound — not the friction case where
the function has no direct trigger.

## Architecture confirmation

`route-inference.ts` line 1392-1396:
```ts
function resolveEscalation(fnNodeId: string): EscalationReason[] {
  const record = analysisMap.get(fnNodeId);
  if (!record) return [];
  return [...record.directTriggers];   // ← direct triggers only, no transitive callee inheritance
}
```

The doc at L34-40 mentions "purely-transitively-escalated" suppression case
(b). That case is vestigial — after `boundary-security-fix` removed
transitive callee inheritance, "purely transitive" can no longer escalate a
function. There IS no escalated function with `directTriggers === []` —
because direct triggers ARE the only way to become server-escalated (plus
capture-taint, which adds an entry to `directTriggers` directly).

The doc text is misleading. Suppression case (b) is not really a
"suppression" — it's that the function is never classified as server in the
first place, so the E-RI-002 path is never reached. (See lines 1539-1578 —
E-RI-002 is gated on `if (isServer)`.)

## Why the friction was real WHEN FILED

Two possibilities:

1. **The friction author was reasoning from the older mental model.** The
   text says "the compiler escalated `transition` to server because it calls
   a server fn" — that pattern of reasoning matches the pre-fix RI. The
   workaround documented (`@errorMessage = ""` before the server call) only
   makes sense if you believe the assignment-position is what triggers
   escalation; it doesn't actually do anything in the current RI.

2. **There may be a transient state between commits where the boundary-
   security-fix wasn't fully effective for this exact pattern.** I cannot
   reproduce that today. `bun test compiler/tests/` is 8165p / 0f / 384
   files on a fresh main; the friction-pattern compiles clean.

The workaround in load-detail.scrml today is therefore harmless but
unnecessary. (We do NOT remove it in this dispatch — that is M2 cleanup,
not RI compiler work.)

## Recommendation

**Apply a minimal, defensive fix** that is appropriate for the case the
friction author cared about and meaningful for future regressions:

1. **Add regression tests** that pin down the canonical F-RI-001 pattern as
   compile-clean. This is the load-bearing protection — if anyone later
   re-introduces transitive callee escalation (or breaks the closure-capture
   call-vs-capture distinction), these tests will catch it.

2. **Update the doc comment at lines 34-40** to reflect the current
   architecture. The current text invites the same misreading the friction
   author made: "purely-transitively-escalated function" sounds like a
   classification that exists, but doesn't anymore. Re-word as "transitive
   callees do not escalate the caller — direct triggers and closure-capture
   are the only escalation paths" so future readers don't make the same
   mental-model mistake.

3. **Add a regression test for the genuine E-RI-002 case.** A function with
   a real direct trigger AND a top-level `@var = result` MUST still fire
   E-RI-002. This protects the security boundary.

4. **Add a regression test for a CPS-applicable case.** `@x = ?{...}` and
   `@x = serverFn()` must still split.

5. **DO NOT widen CPS recursion to nested control-flow.** That is the
   "related real bug" in repro4 above. Fixing it requires extending the
   CPS protocol to track multiple server-side intermediates and pass them
   to the client (currently only one `_scrml_server_result`). That is an
   architectural change, not a conservative fix. Surface as a follow-up.

This matches the dispatch's "Conservative fix" constraint exactly.

## Proposed precise changes (Phase 2)

### change 1: doc comment correction (cosmetic but useful)

`compiler/src/route-inference.ts` lines 34-40 — replace the "suppressed when
(b)" wording with language that reflects the post-7462ae0 architecture.

Replace:
```
 *             NOTE: E-RI-002 is suppressed when (a) CPS transformation is applicable — CPS splits
 *             the function at the server/client boundary so reactive assignments stay client-side,
 *             or (b) the function has no DIRECT server triggers (it is escalated only by calling
 *             other server functions). A purely-transitively-escalated function is a client function
 *             that uses fetch stubs — it executes on the client and can mutate reactive state.
 *             E-RI-002 is only emitted when CPS cannot split AND direct triggers are present.
```
With:
```
 *             E-RI-002 only fires when a function is server-escalated (direct triggers OR
 *             non-call closure capture of a server-tainted function — see Step 5b) AND the
 *             function contains a `@`-assignment AND CPS cannot split the body. Calling a
 *             server function does NOT escalate the caller (§12 escalation rules) — the call
 *             site lowers to a fetch stub at codegen, so a client function may freely call
 *             a server function and assign reactive state on its result.
```

### change 2: regression tests

`compiler/tests/unit/ri-f-ri-001-canonical-client-fn.test.ts` — new file with three suites:

a. **Canonical F-RI-001 pattern compiles clean** — the friction case.
b. **Genuine E-RI-002 case still fires** — function with direct ?{} trigger
   AND top-level reactive assignment.
c. **CPS-applicable case (`@x = ?{}.method()`) still emits a CPS split** —
   non-null `cpsSplit` on the route entry.

These tests run RI directly via `runRI(input)` with hand-built FileAST
fixtures (no need to compile a full scrml file). This keeps them fast and
self-contained in the unit-tests directory.

## Tags

- pipeline-stage: RI
- error-code: E-RI-002
- friction-id: F-RI-001
- root-cause: stale-friction-already-fixed-by-7462ae0
- adjacent-bug-found: cps-eligibility-skips-nested-control-flow

## Links

- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aa63ef2454c21549e/examples/23-trucking-dispatch/FRICTION.md` (entry F-RI-001 at L353)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aa63ef2454c21549e/compiler/src/route-inference.ts` (E-RI-002 doc L34-40, emission L1585)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aa63ef2454c21549e/examples/23-trucking-dispatch/pages/dispatch/load-detail.scrml`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aa63ef2454c21549e/docs/changes/f-ri-001/repro1-canonical.scrml`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aa63ef2454c21549e/docs/changes/f-ri-001/repro4.scrml`
- Commit `7462ae0 feat(boundary-security-fix)` (2026-04-24)
