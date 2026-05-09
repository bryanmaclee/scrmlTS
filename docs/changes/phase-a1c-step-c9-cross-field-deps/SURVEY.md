# C9 SURVEY — Cross-field validator dependencies (L14)

**Phase:** A1c Step C9 (Wave 3, sibling of C10 + C11)
**Date:** 2026-05-08
**Verdict:** **REFINEMENT** (verification + integration tests; indirection works via transitive dirty-prop)
**Estimate:** 3-5h (verification work + integration tests + optional precision improvement)

## §0 TL;DR (after deeper investigation)

Initial survey hypothesized a runtime-correctness bug where cross-field validators
referencing `@compound.field` would fail to re-fire on the cross-field change.
**End-to-end runtime probe disproved the hypothesis.** The current implementation
DOES re-fire correctly via TRANSITIVE dirty propagation: child write → compound
parent (subscribed to child) → validator runner (subscribed to compound parent).

The remaining concerns are PRECISION + COVERAGE, not correctness:

1. **Coverage gap:** C7's unit tests stub the AST with synthetic single-ident
   `@signup.password` — bypassing the real parser shape (`MemberExpr(IdentExpr("@signup"), "password")`).
   No integration tests drive emission through real parser output.
2. **Indirection is undocumented:** the chain "validator subs to compound parent
   → compound parent subs to child" is correct but non-obvious. A code-comment
   anchoring it to SPEC §55.11 + the dirty-prop semantics is owed.
3. **Precision could be tightened:** validator currently re-fires on ANY change
   to ANY field of the parent compound, not just the specific cross-field cell.
   This is correctness-equivalent but spends extra recomputation. Tightening to
   subscribe directly to the qualified path (`signup.password`) is a clear win
   — but optional, and noted in §6 as candidate optimization.

C9 ships: integration tests + comment + (optionally) the precision tightening.
This survey is the verification record; runtime correctness is unaffected.

---

## §1 Scope-shape determination

The C9 dispatch brief identifies three possible shapes:
1. **Refinement / verification** — survey + tests + edge-case fixes
2. **Optimization** — defer; premature for v0.2.0
3. **No-op** — close-as-no-op if C7+B10+C8 cover everything

**Verdict: REFINEMENT**, because survey reveals a real-but-hidden bug.

The brief is correct that:
- **C7 (S73, `f935822`)** wires cross-field reactivity at `emit-validators.ts:178-189` via `forEachIdentInValidatorArg` thunks + `_scrml_derived_subscribe` per dep.
- **B10 Phase 3 (S67)** wires `validator-reads` DG edges at `dependency-graph.ts:1973-2007` (driving E-VALIDATOR-CIRCULAR-DEP).

These work correctly for **bare top-level cell references** like `eq(@password)` (where the parser produces a single `IdentExpr` with `name === "@password"`).

But they have a **silent bug** for **compound-qualified cell references** like `eq(@signup.password)` — the form §55.11's worked example uses, and the form most apps will use.

---

## §2 Why C7's existing tests didn't catch the bug

C7's unit tests (`compiler/tests/unit/c7-per-cell-validator-runner.test.js`) construct AST stubs by calling a `ident("@signup.password")` helper that produces:

```js
{ kind: "ident", name: "@signup.password", span: ... }
```

— a synthetic single-ident node. With this stub, `forEachIdentInExprNode` yields `name === "@signup.password"`, the `@` slice produces `"signup.password"`, and the subscribe is correct.

**The real parser produces a different shape.** Verified directly:

```
parseValidatorArg("eq", "@signup.password", ...) →
{
  kind: "member",
  object: { kind: "ident", name: "@signup", ... },
  property: "password"
}
```

This is canonicalized in `compiler/tests/unit/validator-arg-parsing.test.js:153-159` (§B9.2e), which asserts `node.kind === "member"` and `object.name === "@signup"`. The two test bodies disagree on the AST shape — C7's runtime test is testing a non-canonical shape.

When `forEachIdentInExprNode` walks a `MemberExpr`, it walks `object` only (line 2312-2316 of `expression-parser.ts`) — it yields the BASE ident `@signup`, never seeing `password`. Result: emit-validators line 180-184 collects `valueDeps.add("signup")` instead of `"signup.password"`.

---

## §3 Emission probe + runtime verification

For a `<confirm req eq(@signup.password)>` field, `emitValidatorRunnerSidecar` emits:

```js
_scrml_derived_declare("signup.confirm.errors", () => {
  const value = _scrml_reactive_get("signup.confirm");
  const errors = [];
  {
    const error = _scrml_validator_fire("eq", value,
      () => _scrml_reactive_get("signup").password);    // reads from compound parent
    if (error !== null) errors.push(error);
  }
  return errors;
});
_scrml_derived_subscribe("signup.confirm.errors", "signup.confirm");
_scrml_derived_subscribe("signup.confirm.errors", "signup");        // subscribes to parent
```

**Initial concern:** subscribing to `"signup"` (the parent), not `"signup.password"`,
appears wrong because `_scrml_reactive_set("signup.password", ...)` propagates
dirty along `_scrml_derived_downstreams["signup.password"]`.

**Verified end-to-end** (real runtime, real emission):

```
Initial errors (eq passes): []
Set signup.password = "different":
After: [{"tag":"EqFailed","expected":"different"}]
```

Cross-field reactivity DOES work. Why: the compound parent is itself a derived
cell that subscribes to every child:

```js
_scrml_derived_declare("signup", () => ({ password: _scrml_reactive_get("signup.password"), confirm: _scrml_reactive_get("signup.confirm") }));
_scrml_derived_subscribe("signup", "signup.password");    // <-- key edge
_scrml_derived_subscribe("signup", "signup.confirm");
```

The dirty-propagation BFS in `_scrml_propagate_dirty` walks downstreams iteratively:
write `signup.password` → dirty propagates to `signup` → BFS continues, picks up
`signup` → propagates to `signup.confirm.errors` (the validator runner). Validator
re-fires correctly.

The same pattern works for **cross-compound** references (`<formB.checkpw eq(@formA.password)>`):
formA is its own compound parent that subs to its children, and the validator
subs to formA — write formA.password → dirty(formA) → dirty(formB.checkpw.errors).
Verified empirically.

## §3.5 Precision concern (NOT correctness)

Currently the validator subscribes to `signup` (parent). That means:
- Writing `signup.password` re-fires the validator. ✓ Correct (intended).
- Writing `signup.confirm` ALSO re-fires the cross-field validator on `signup.confirm`. ✓ Correct (it's the cell's own value).
- Writing **any other field of signup** (e.g., `signup.email`) ALSO re-fires the
  `signup.confirm.errors` derivation. ✗ Wasteful — `signup.email` is not actually
  a dep of `signup.confirm`'s validator.

For wide compounds with many fields, this is O(N) waste per cross-field validator.
Tightening: subscribe directly to `signup.password` instead of `signup`. That's a
2-line change — collect the qualified path from the MemberExpr chain at the
ident-walk callsite. **Decision: include in C9** — it's a cheap precision win
that ALSO eliminates an entire class of "why does this validator re-fire on
unrelated change" debugging confusion.

---

## §4 Affected sites (all driven by `forEachIdentInExprNode`'s member-expr handling)

### §4.1 emit-validators.ts:178-184 — C7's `valueDeps` collection

```ts
forEachIdentInValidators(validators as any, (ident) => {
  if (typeof ident.name === "string" && ident.name.startsWith("@")) {
    valueDeps.add(ident.name.slice(1));   // <-- yields "signup", not "signup.password"
  }
});
```

**Fix:** instead of relying on `forEachIdentInExprNode` (which only yields base-idents on member-exprs), walk the validator-arg ExprNode tree and collect FULLY QUALIFIED `@compound.field` paths. The existing `expression-parser.ts` distinguishes ident vs member, so the walker can stitch `<base>.<prop>.<prop>...` chains back into qualified names.

### §4.2 emit-validators.ts:330-336 — `lowerOneArg` thunk wrapping

The thunk emission wraps the WHOLE expression `() => _scrml_reactive_get("signup").password`. The reactive-get call within reads from the wrong key. The thunk fix is the same as §4.1: rewrite `MemberExpr(IdentExpr("@A"), "B")` to `_scrml_reactive_get("A.B")` instead of `_scrml_reactive_get("A").B`.

This rewrite logic likely already lives in `emit-expr.ts` for the cell-emit path (since `@signup.password` reads in regular code work correctly). Check that path; if so, C9's fix is applying that existing logic to validator-args lowering. If not, C9's fix wires the missing transformation.

### §4.3 dependency-graph.ts:1980-1999 — B10 Phase 3 validator-reads edges

```ts
forEachIdentInValidators(validators, (ident) => {
  const name = (ident as any).name;
  if (typeof name !== "string" || !name.startsWith("@")) return;
  const targetVarName = name.slice(1);                  // <-- "signup" for @signup.password
  const toNodeId = reactiveVarNodeIds.get(targetVarName);
  ...
});
```

**Same bug shape, weaker consequences.** B10's edges drive E-VALIDATOR-CIRCULAR-DEP cycle detection. Edge `confirm → signup` (instead of `confirm → signup.password`) is **partially correct** — it would still detect the cycle `<a.x eq(@b.y)> + <b.y eq(@a.x)>` at the parent level. But it would also **falsely flag** non-cyclic patterns like `<form.a eq(@form.b)> + <form.b eq(@form.a)>` — both edges resolve to `form → form`, which is a self-loop in DG and fires the self-cycle path (`E-VALIDATOR-CIRCULAR-DEP: Validator on @form references the cell itself`).

NOTE: this latter is itself a real bug, but `reactiveVarNodeIds` is keyed on top-level decl names, so `signup.password` would not be a registered node anyway — the edge gets silently DROPPED in B10. False-positive cycle detection only triggers when both base names ARE registered top-level cells (rare for compound children, but possible).

The fix: B10 should look up `reactiveVarNodeIds.get("signup.password")` first, and only fall back to `"signup"` if the qualified key isn't registered. (Better: register compound-child node IDs under their qualified path, so the lookup just works.)

### §4.4 The shared root cause

`forEachIdentInExprNode`'s member-expr handler intentionally walks ONLY the base. That's correct for general reactive-dep tracking — `obj.foo + bar` should track `obj` not `obj.foo`. But for `@-prefixed` member-expressions (the cross-field cell-reference form), the FULL qualified path is the intended target, not the base.

**C9's fix is at the validator-arg seam.** Don't change `forEachIdentInExprNode`; instead, add a validator-arg-specific walker that recognizes the `IdentExpr(@X) | MemberExpr(IdentExpr(@X), prop, [prop...])` pattern and yields the qualified `@X.prop.prop` path. Both the codegen subscribe-loop (§4.1) and the lowering thunk (§4.2) consume this. The dep-graph edge wiring (§4.3) does the same.

---

## §5 Existing test coverage assessment

| Coverage | Status |
|---|---|
| `eq(@password)` top-level | ✅ COVERED (parse-shapes-v0next.test.js §S5.10; C7 §C7.6 first test) |
| `eq(@signup.password)` member-expr (worked example §55.11) | ❌ NO RUNTIME TEST against real parser output. C7 §C7.6 tests a stub-shape that doesn't match real parser output. |
| `gte(@form.startDate.plus(1, "day"))` non-bare | ❌ NO TEST |
| Cross-compound `<a.x eq(@b.y)>` | ❌ NO TEST (worked at most accidentally — see §4.3) |
| Outside-compound deps `eq(@globalMax)` | ⚠️ DEPENDS — top-level case works; `@compound.field` doesn't |
| Self-reference `<a eq(@a)>` E-VALIDATOR-CIRCULAR-DEP | ✅ COVERED (validator-circular-dep.test.js §B-V-CIR.1.0) |
| Bidirectional cycle `<a eq(@b)>+<b eq(@a)>` | ✅ COVERED (validator-circular-dep.test.js §B-V-CIR.2.0) |
| Multi-hop cycle | ✅ COVERED |
| Multiple cross-field args wired separately | ✅ COVERED via stub (synthetic ident); not via real parse |

Bottom line: the unit tests cover the SURFACE — but stub-mode AST inputs let the bug hide. The fix MUST add tests that drive emission FROM REAL PARSE OUTPUT.

---

## §6 IN-scope items

1. **Add precision: qualified-cell-ref extractor** for validator-arg dep collection.
   Targets emit-validators.ts:178-184 — replace the `forEachIdentInValidators`
   ident-walk with a walker that recognizes `@X` and `@X.Y.Z` shapes (single
   IdentExpr with `@`-prefix and standalone, OR ident under member chain) and
   yields the FULL qualified path. The subscribe edge then uses the precise
   key — wakes the validator on the specific cell, not the whole compound.
   This is **purely precision**; runtime correctness already works via dirty
   propagation through the compound parent.
2. **Decide on thunk read-key.** The thunk currently emits `() => _scrml_reactive_get("signup").password`.
   This works (compound parent's lazy-pull derivation reads child via
   `_scrml_reactive_get("signup.password")`), but the direct form `_scrml_reactive_get("signup.password")`
   is more robust to compound-parent-not-registered edge cases AND
   semantically matches the §55.11 worked example. Decision: **include in C9**
   — same walker output that fixes (1) provides the qualified key for the read.
3. **Add cross-field deps integration tests** that drive emission through the
   REAL parser (`parseValidatorArg`) and assert correct subscribe + read targets:
   - `eq(@signup.password)` → subscribe to `signup.password`, read via `_scrml_reactive_get("signup.password")`
   - `gte(@form.startDate)` → subscribe to `form.startDate`, read via `_scrml_reactive_get("form.startDate")`
   - `gte(@form.startDate.plus(1, "day"))` → subscribe to `form.startDate`, callee chain stays as-is (only the @-rooted member chain is lifted)
   - `lt(@form.maxScore - 1)` → subscribe to `form.maxScore`
   - `oneOf([@form.allowed, @form.altAllowed])` → both deps wired
   - End-to-end runtime: real-parse → emit → run → assert validator re-fires
4. **B10 dep-graph wiring:** the existing `validator-reads` edge wiring uses
   the same ident-walk and resolves to the BASE name (`signup` not `signup.password`).
   Per §4.3, this resolves edges to compound-parent NODES if registered, and
   silently drops them if not. **Decision: defer B10 changes to a follow-up.**
   Rationale: `reactiveVarNodeIds` is keyed on local names (compound children
   have `name === "x"`, so `reactiveVarNodeIds.get("signup.password")` returns
   undefined regardless). Fixing B10 properly requires changing how compound
   children are indexed in DG — that's a B-step concern (architectural), not
   C9 (codegen). Existing E-VALIDATOR-CIRCULAR-DEP tests pass; the cycle
   detection works at compound-parent granularity, which is sufficient for
   v0.2.0. Document the limit as a known boundary in PA-PRIMER §13.7.

## §7 OUT-of-scope items

- Editing `emit-html.ts` (C11)
- Editing `runtime-template.js` (C10 likely; C9 should not need runtime changes — the existing `_scrml_propagate_dirty` is correct, only the COMPILED subscribe/get key is wrong)
- 4-level error message resolution (C10)
- `<errors of=>` element (C11)
- New runtime helpers
- Editing SPEC.md
- New stdlib (C10)

## §8 Coordination with siblings (C10, C11)

C9's edits touch:
- `compiler/src/codegen/emit-validators.ts` (sole owner, no conflict)
- `compiler/src/dependency-graph.ts` (B10's territory; surgical fix to existing block, no overlap with C10/C11)
- `compiler/tests/unit/` (new test file, no conflict)

No overlap with C10's `runtime-template.js` / `emit-messages.ts` / `scrml:data` paths. No overlap with C11's `emit-html.ts` / `attribute-registry.js`.

If C9 needs to add a helper to `validator-arg-parser.ts` (a `forEachQualifiedCellRef` walker), that's adds-only.

---

## §9 Risks

- **Existing C7 tests assume the buggy stub shape.** Fix could superficially appear to break C7 tests. Reality: C7 tests use synthetic AST so they STILL PASS after the fix (because the synthetic ident `@signup.password` is treated correctly under the new walker too — a single-ident `@X.Y.Z` IS still recognized as the qualified path `X.Y.Z`).
- **B10 dep-graph changes may surface previously-hidden cycles.** If `reactiveVarNodeIds` is currently keyed by top-level name only, adding qualified-path lookup may newly resolve edges that were previously dropped. Run full test suite to verify.
- **Cycle direction for compound-fields.** Need to decide whether `<form.a eq(@form.b)> + <form.b eq(@form.a)>` is a cycle. Per SPEC §55.11 it IS — same compound, both directions. The fix should preserve detection.

---

## §10 Plan

1. Create test file `compiler/tests/unit/c9-cross-field-deps.test.js` with
   tests that drive emission through the REAL `parseValidatorArg` (TDD: write
   tests with the desired post-fix shape; they will fail against current code).
2. Add `forEachQualifiedCellRef` helper to `validator-arg-parser.ts` (adds-only,
   no overlap with siblings) — recognizes `@X` and `@X.Y.Z...` chain rooted at
   `@`-prefixed ident, yields the qualified path string (`"signup.password"`).
3. Update emit-validators.ts:178-184 (`valueDeps` collection) to use the walker.
4. Update emit-validators.ts:`lowerOneArg` thunk lowering: when the arg is a
   member-chain rooted at `@`-ident, emit `_scrml_reactive_get("<qualified.path>")`
   directly instead of leaning on `emitMember`'s `_scrml_reactive_get("X").Y` form.
   Edge case: when the @-rooted chain is the OBJECT of a CallExpr (like
   `@startDate.plus(1, "day")`), the chain MUST collapse to the qualified path
   AND the call args/method-name stay as JS — emit `_scrml_reactive_get("startDate").plus(1, "day")`,
   so we use the qualified-path read for the BASE only when the whole expr IS
   the chain. For `(member|call)` outer-shapes, fall back to existing behavior.
5. Run full test suite: confirm 10176 pass + new C9 tests pass + 0 regressions.
6. Optionally update C7 unit tests to use real-parse-shaped AST nodes (bring
   the synthetic stubs in line with reality, future-proof). Audit whether any
   of those tests would break under the new walker output.
7. Update PA-SCRML-PRIMER §13.7 to document C9 + the B10-dep-graph limitation
   as a known boundary.

Estimated: 3-5h (matches brief estimate).
