# A1b Step B21 — Phase 0 Survey

**Date:** 2026-05-08
**Author:** dev-pipeline substitute (general-purpose)
**Spec authority:** §53 (entirety), §53.4 three-zone, §53.10, §53.11, §34 catalog rows 14181-14185.

## TL;DR — depth-of-survey-discount confirmed

**Existing infrastructure for §53 refinement-type predicates is substantially MORE complete than the brief implied.** The static-zone literal-conformance check is fully wired into `let-decl` and `state-decl`; the boundary-zone runtime-hook recording mechanism (`predicateCheck` AST annotation) exists AND the A1c codegen consumer that emits `E-CONTRACT-001-RT` boundary checks ALSO exists in `compiler/src/codegen/emit-predicates.ts` + `emit-logic.ts`. Tests `compiler/tests/unit/three-zone.test.js` (25 sections, ~70 tests) + `predicate-types.test.js` (~25 sections) cover the core `classifyPredicateZone` / `predicateImplies` / `extractInitLiteral` / `checkPredicateLiteral` functions extensively.

**Net B21 work:**

1. **Annotation surface gap (RECORDING):** Today only `boundary` zone records `predicateCheck` on the AST node. Static (passing) and trusted (implied) classifications are silently dropped. Per audit §4.2 brief #3 — "Record three-zone classification on each refinement predicate". B21 should annotate ALL three zones so A1c codegen / future tooling can read the classification per locus.
2. **`predicated` SourceInfo never reachable from real code.** `classifyLiteralFromExprNode` returns only `literal | arithmetic | unconstrained`; the `predicated` branch (the trusted-zone path via `predicateImplies`) is unreachable from let-decl/state-decl in real code today — only direct unit-test calls hit it. B21 should extend the source classifier to detect when the RHS is an `IdentExpr` resolving to a predicated-typed binding in scope, so trusted-zone fires from real code.
3. **Static-zone "pass" still emitting boundary annotation in source paths?** Verify: `classifyPredicateZone` returns "static" when literal evaluates to `true` (passing). Per existing code path, `predicateCheck` is set only on `boundary` — static pass / static fail / trusted all skip the annotation. No regression. But B21's three-zone "RECORD" mandate means we should ALSO annotate static + trusted for completeness (audit §4.2 brief #3).
4. **No regressions for E-CONTRACT-001 / -002 / -003.** All three error codes already fire via `checkPredicateLiteral`. Existing tests cover them. No new fire-sites needed for §53.4 ratified subset (per audit §4.2 brief #4: B21 fires at compile-time for static-zone violations only).

**Out of scope confirmation (per BRIEF + audit):**
- E-CONTRACT-001-RT runtime emission — DONE in A1c codegen (already implemented; not a B21 deferral).
- Trusted-zone elision marker — would be RECORDED in B21; A1c emits OR optimizes. Currently A1c just doesn't emit when `zone !== "boundary"`; recording the marker doesn't change behavior today but enables future optimization.
- Function param / return three-zone enforcement — present `function-decl` walker DOES NOT call `classifyPredicateZone`. This is part of "per-locus extension". DEFERRED per audit §4.2 brief #2 (the brief explicitly notes "what's already exercised; B21 gap-fills" — gap is locus extension; deferred to A1c boundary check expansion).
- Bare-expr reassignment three-zone — `bare-expr` walker doesn't classify predicates on `@x = expr` reassignments. Same locus-extension class; defer to A1c with rest of locus expansion.
- E-CONTRACT-004-WARN bind:value attribute conflict — A1c codegen concern (HTML emitter, not type system).

## §1. Existing infrastructure inventory

### 1.1 `compiler/src/type-system.ts` — predicate machinery

| Symbol | Line | Purpose | Coverage |
|---|---|---|---|
| `parsePredicateExpr` | 718 | Parse predicate strings → `PredicateExpr` AST. Sets `hasExternalRef:true` on `@`-refs. | Comparison, property, named-shape, AND/OR/NOT, parens — comprehensive. |
| `evaluatePredicateOnLiteral` | 909 | Static eval of predicate against numeric/string literal. | Comparisons + property `.length` for strings + AND/OR/NOT compositions. Returns `true`/`false`/`null` (null = needs runtime). |
| `formatPredicateExpr` | 1405 | Pretty-print predicate for error messages. | Covers all `kind` variants. |
| `checkPredicateLiteral` | 1431 | Validate literal value against predicated type at compile time. | Fires E-CONTRACT-001 (static fail), E-CONTRACT-002 (unknown shape), E-CONTRACT-003 (external @ref). |
| `predicateImplies` | 1585 | T-PRED-4 implication: source predicate ⇒ target predicate? | Numeric tighter-or-equal, named-shape exact match, AND-conjunct extraction, OR target distribution. |
| `SourceInfo` (type) | 1499 | Tagged union: `literal \| predicated \| unconstrained \| arithmetic`. | All four variants. |
| `extractInitLiteral` | 1511 | Conservative regex parse of init string into SourceInfo. | Numeric/string literals + arithmetic detection (`+ - * /`); else unconstrained. |
| `classifyPredicateZone` | 1629 | §53.4 zone classifier: `static \| trusted \| boundary`. | All four SourceInfo cases handled; literal → static (calls checkPredicateLiteral); predicated → trusted-or-boundary (via predicateImplies); arithmetic/unconstrained → boundary. |

### 1.2 Type system call sites for `classifyPredicateZone`

| Line | Context | What's annotated |
|---|---|---|
| 3997 | `let-decl` / `const-decl` with predicated annotation | `n.predicateCheck = { predicate, zone: "boundary" }` ONLY when zone === "boundary" |
| 4131 | `state-decl` with predicated annotation | Same shape, same condition |

**Sites NOT covered (gap inventory):**
- `function-decl` parameters (line 3808). Predicated param types are bound but no zone classification at callsite when call is invoked.
- `return-stmt` (line 4806). Return-type-annotated functions don't classify return-value zone.
- `bare-expr` reassignment to predicated state-decl (`@x = expr`). Walker line 2148 detects assignment for projection but no zone classification.
- `reactive-nested-assign` (line 4887). Nested reassignment lacks zone classification.

### 1.3 `compiler/src/expression-parser.ts:classifyLiteralFromExprNode` — the SourceInfo hole

Line 2721. Returns `literal | arithmetic | unconstrained` ONLY — never `predicated`. This means the trusted-zone path is ONLY reachable in unit-test direct invocations of `classifyPredicateZone`. In real code, an `IdentExpr` referring to a predicated-typed local always classifies as `unconstrained` → boundary. Today this is conservative (over-checks) but breaks T-PRED-4 in practice.

### 1.4 A1c codegen consumer — already done

`compiler/src/codegen/emit-predicates.ts` provides:
- `emitRuntimeCheck(predicate, varName, label)` — emits E-CONTRACT-001-RT runtime boundary check.
- `predicateToJsExpr(pred, valueExpr)` — serialize predicate to JS boolean expression.
- `NAMED_SHAPE_RUNTIME` table — runtime regex/URL.canParse/etc. for the 7 built-in shapes.
- `NAMED_SHAPE_HTML` table — HTML attr derivation table for §53.7 (not yet wired into emit-html?).
- `emitServerParamCheck` — server-side boundary check (§53.9.4).

`compiler/src/codegen/emit-logic.ts` consumes `node.predicateCheck` at:
- 477 (let-decl with `initExpr` fast path)
- 496 (let-decl fallback)
- 674 (state-decl with `initExpr` fast path)
- 689 (state-decl fallback)

All four sites emit `_scrml_chk_*` temp variables, run `emitRuntimeCheck`, then assign. Boundary-zone runtime emission is FULLY WIRED.

### 1.5 Existing test coverage

`compiler/tests/unit/three-zone.test.js` (517 lines, 25 sections):
- §1-2 static zone (literal pass/fail)
- §3-4 boundary zone (unconstrained, arithmetic)
- §5-8 trusted zone (predicated, named-shape match/mismatch)
- §9-15 `predicateImplies` direct
- §16-20 `extractInitLiteral` direct
- §21-25 zone behavioral invariants (annotation, no-error, error fire)

`compiler/tests/unit/predicate-types.test.js` (~25 sections):
- E-CONTRACT-001 numeric, range, boundary
- E-CONTRACT-002 unknown named shape
- E-CONTRACT-003 external @ref
- `parsePredicateExpr`, `evaluatePredicateOnLiteral`, `checkPredicateLiteral` direct

`compiler/tests/unit/predicate-parsing.test.js` — predicate parser smoke.

**Coverage gaps for B21:**
- No test covers the `predicated` branch via REAL AST (let `x: number(>0) = y` where `y: number(>0 && <100)` is bound) — only via direct test calls.
- No test verifies `predicateCheck` is annotated for static/trusted (because it's currently NOT annotated for those cases — a gap).
- No test exercises §53.10 interaction with `protect=` (orthogonal).

## §2. Gap analysis vs. ratified B21 scope

Per BRIEF: **"static-zone literal-conformance check; boundary-zone runtime hook recorded; trusted-zone elision marker"**.

| Sub-feature | Status | B21 needed |
|---|---|---|
| Static-zone literal-conformance fire | DONE | Verify; tests already cover. |
| Static-zone literal-conformance pass | DONE silently (no annotation) | Decision: annotate or not? Audit §4.2 brief #3 says RECORD. **B21 should record.** |
| Boundary-zone runtime hook recording | DONE for boundary case | No new work. |
| Boundary-zone runtime emission | DONE in A1c codegen (out-of-scope but verified existing) | No new work. |
| Trusted-zone elision marker recording | NOT DONE — silently no-ops | **B21 should record.** |
| Trusted-zone path reachable from real AST | NOT DONE — `classifyLiteralFromExprNode` doesn't emit `predicated` | **B21 should extend** the source classifier to check scope-bound predicated idents. |
| E-CONTRACT-001 (static literal violation) | DONE | No new work. |
| E-CONTRACT-002 (unknown named shape) | DONE | No new work. |
| E-CONTRACT-003 (external @ref in predicate) | DONE | No new work. |
| E-CONTRACT-001-RT (runtime check) | DONE in A1c | No B21 work (it's A1c codegen). |
| E-CONTRACT-004-WARN (bind:value HTML attr) | TBD A1c | Not B21 scope. |

## §3. Concrete B21 work plan

### 3.1 Extend `classifyLiteralFromExprNode` (or create a new wrapper) to detect predicated-typed idents

`classifyLiteralFromExprNode` lives in `expression-parser.ts` and operates over `ExprNode` only — no scope chain. Best approach: keep `classifyLiteralFromExprNode` pure (literal/arithmetic/unconstrained over syntax), and ADD a thin wrapper in `type-system.ts` that:
- Calls `classifyLiteralFromExprNode` first.
- If result is `unconstrained`, AND the ExprNode is a single `IdentExpr`, AND `scopeChain.lookup(name)` returns `{ kind: "variable", resolvedType: { kind: "predicated", ... } }` → upgrade the SourceInfo to `{ kind: "predicated", predType: ... }`.
- Else fall through with original result.

This makes T-PRED-4 trusted-zone reachable from real `let-decl` / `state-decl` code.

### 3.2 Annotate three-zone classification on let-decl + state-decl uniformly

Currently only boundary writes `predicateCheck`. B21 should also write annotations for static (pass + fail) and trusted, so A1c consumers / IDE tooling / future optimizers can read the classification.

Proposed shape extension (additive — does not break A1c which only reads `zone === "boundary"`):
```ts
n.predicateCheck = {
  predicate: PredicateExpr,
  zone: "static" | "trusted" | "boundary",
  // Optional: source kind for diagnostics
  sourceKind?: "literal" | "predicated" | "arithmetic" | "unconstrained",
}
```

Since A1c codegen already gates on `zone === "boundary"`, adding static/trusted annotations is non-breaking.

### 3.3 Tests

Add `compiler/tests/unit/refinement-three-zone-b21.test.js` covering:
- Real-AST trusted-zone: `let x: number(>0) = y` where `y: number(>0 && <100)` is bound — zone === "trusted", predicateCheck present.
- Real-AST boundary-zone: `let x: number(>0) = z` where `z` is unconstrained — zone === "boundary", predicateCheck present (regression).
- Real-AST static-zone pass: `let x: number(>0) = 5` — zone === "static", predicateCheck present (NEW: was previously silent).
- Real-AST static-zone fail: `let x: number(>0) = -1` — zone === "static", E-CONTRACT-001 fires, predicateCheck present.
- E-CONTRACT-003 fire-site test through full TS pass (real AST, not direct `checkPredicateLiteral` call).
- State-decl variants of all the above.
- Cross-decl: `let a: number(>0 && <100) = 50; let b: number(>0) = a;` — verifies trusted-zone propagation.

### 3.4 Out of scope (deferred items)

- Function-parameter zone classification (`function-decl` walker, line 3808) — would need callsite walker. Deferred to A1c.
- Return-stmt zone classification (line 4806) — deferred to A1c.
- Bare-expr reassignment to predicated state-decl — deferred to A1c.
- Reactive-nested-assign predicate classification — deferred to A1c.
- HTML attr generation from predicates (`emit-html.ts`) — A1c codegen.
- Named shape registry extension (custom shapes via meta blocks) — open SPEC-ISSUE.

## §4. Risk assessment

**Low risk.** All changes are additive to existing well-tested infra. Boundary-zone behavior unchanged (zone === "boundary" still fires the runtime check). Static-zone error fire path unchanged. New static/trusted annotations are SETTING fields A1c doesn't read.

**Trusted-zone source-classifier extension** is the only behavioral change — converting some `boundary` classifications to `trusted` for `IdentExpr` RHS pointing at a predicated-typed binding. This MAY cause some existing tests/snapshots that rely on a runtime-check being emitted on a predicated-source RHS to flip to elide. Mitigation: run full suite; investigate any new pass/fail flips.

**Test count delta target:** +15-25 new tests. No regressions expected.
