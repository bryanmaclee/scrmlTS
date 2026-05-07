---
title: A1b B7 (derived-cell dep tracking) — Rule 4 spec-faithfulness audit
date: 2026-05-07
session: S66
authority: PA-direct read of `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md` §4.2 B7 row against `compiler/SPEC.md` §6.6.10, §31.4, §31.5, §34. Driver: pa.md Rule 4.
status: AUDIT — flags drift before B7 dispatch fires
---

# A1b B7 — Rule 4 audit (pre-dispatch)

## §0 Scope

B7 = "Derived-cell dep tracking — for `const <name> = expr`, walk `expr` collecting `@cell` references; build derived → upstream DAG; cycle detection (E-DERIVED-CIRCULAR-DEP)" (SCOPE §4.2 row B7, est 4-6h).

This audit reads the spec sections that govern derived-cell dependency tracking and flags any drift from the SCOPE row's framing, BEFORE the B7 dispatch encodes the SCOPE wording into a brief.

## §1 Findings

### §1.1 [SUBSTANTIVE — SCOPE UNDERSPECIFIES] Transitive function-call dependencies

**SCOPE B7 row claim:** "walk `expr` collecting `@cell` references"

**SPEC §31.5** (line 13695, "Derived-state expression dependency tracking"):
> "Function calls inside derived-state expressions: a function call's dependencies are the union of all reactive cell reads transitively reachable through the call. Pure functions (`fn`, §48) have no implicit reactive dependencies; reactive functions inherit their callees' dependencies."

**Drift analysis:** the SCOPE row implies direct cell reads only. SPEC §31.5 mandates **transitive cell reads through function calls** as load-bearing for the dep graph. Worked example:

```scrml
fn formatCount(n) -> string { return `count: ${n}` }   // pure (§48 fn)
function reactiveLog(n) {                              // reactive (regular fn)
  console.log("read", @lastSeen)                       // reads @lastSeen
  return n
}

<count>     = 0
<lastSeen>  = 0
const <fmt1>  = formatCount(@count)        // dep: @count only (formatCount is pure)
const <fmt2>  = reactiveLog(@count)        // dep: @count + @lastSeen (reactiveLog reads @lastSeen)
```

B7 walking only direct `@cell` references would miss `@lastSeen` in the `fmt2` case. When `@lastSeen` changes, `fmt2` would NOT recompute — silent staleness bug.

**Required B7 implementation expansion:**
1. For each `@cell` directly read in the RHS expression: dep edge.
2. For each function call in the RHS:
   - If callee is `fn` (pure, per §48): no implicit dep.
   - If callee is regular `function`: union of all reactive cell reads transitively reachable through the call. Recursive walk through callee bodies needed (or computed at type-check time alongside other transitive analysis).

**Cost impact:** B7's 4-6h estimate may grow. The transitive walker is non-trivial. **Survey-first finding, must flag in dispatch brief.**

### §1.2 [SPEC NAMING INCONSISTENCY] §6.6.10 still uses old name `E-REACTIVE-005`

**§6.6.10 (line 2684) header:** "Circular Derived Dependencies — E-REACTIVE-005"

**§34 catalog row (line 14233):** "E-DERIVED-CIRCULAR-DEP — §31.5, §6.6 — ... (Stage 0b D4)"

**§31.5 (line 13702):** uses E-DERIVED-CIRCULAR-DEP.

**Drift analysis:** §6.6.10 was not renamed when D4 (S58) consolidated the error catalog. The catalog (§34) and the cross-cutting dep-tracker section (§31.5) both use E-DERIVED-CIRCULAR-DEP; only the older §6.6.10 prose retains E-REACTIVE-005.

**Sibling precedent:** §6.6.8 had the same staleness for E-REACTIVE-002 → E-DERIVED-WRITE; documented at line 2650 ("All references to `E-REACTIVE-002` for the derived-cell-reassignment case SHALL be read as `E-DERIVED-WRITE`"). §6.6.10 needs the same patch.

**B7 implementation guidance:** fire E-DERIVED-CIRCULAR-DEP (matches §34 + §31.5; the canonical name).

**SPEC follow-up (separate from B7 dispatch):** rename §6.6.10's header + body references to E-DERIVED-CIRCULAR-DEP, OR add a §6.6.10 footnote analogous to §6.6.8's S59 rename note. Small spec-prose commit; not blocking B7 implementation.

### §1.3 [SPOT-CHECK PASS] Cycle detection algorithm

**SCOPE row:** "build derived → upstream DAG; cycle detection"

**SPEC §6.6.10 (line 2697):** "The compiler SHALL run cycle detection on the derived dependency sub-graph during the dependency graph construction pass (Stage 7, §30). Cycle detection uses a depth-first traversal of the derived node set."

**Match.** DFS-based cycle detection on the derived subset of the dep graph. SCOPE row's "DAG + cycle detection" matches.

Self-reference noted as degenerate cycle: `const <x> = @x + 1` is E-DERIVED-CIRCULAR-DEP (line 2712). B7 must cover this edge case.

### §1.4 [REUSABILITY NOTE] Validator-arg dep tracking shares machinery (§31.4)

**SPEC §31.4** (line 13670+): cross-field validation predicate-arg deps use "the same machinery as the standard reactive dependency tracker." Cross-ref §6.6 explicitly.

**B7 implementation guidance:** design B7's dep-graph walker as REUSABLE for validator-arg tracking (B10/B11/B12 will need it), NOT as a derived-cell-specific shape. The downstream B10/B11/B12 dispatches will be cleaner if B7 produces a generic dep-edge structure.

This isn't drift — it's a forward-looking design constraint discovered by reading spec broadly.

### §1.5 [REUSABILITY NOTE] Derived-engine cycle detection (B16)

**SPEC §31.5** (line 13702-13703): mentions `E-DERIVED-ENGINE-CIRCULAR` for derived engines. B16 will fire this; B7's dep-graph SHOULD support engine-derived edges so B16 can reuse the same machinery.

Not B7 scope to fire E-DERIVED-ENGINE-CIRCULAR. But B7's data structure should accommodate engine-derived nodes if architecturally cheap.

### §1.6 [§51.0.J cross-ref] Engine derived semantics

§31.5 mentions "Derived engines `<engine for=T derived=expr>` (§51.0.J)" — engine variant reactively recomputed from cell expression. This is L20 territory (B16). Out of B7 scope; mentioned for context.

---

## §2 B7 dispatch brief — required additions

When PA writes the B7 dispatch brief, the following MUST be in the brief beyond the SCOPE row's wording:

1. **Transitive function-call deps** — RHS walker must recurse through non-pure function calls; pure `fn` calls have no implicit deps. Per §31.5 + §48.
2. **E-DERIVED-CIRCULAR-DEP is canonical name** — §6.6.10's E-REACTIVE-005 is stale; §34 + §31.5 use the new name. Fire the canonical.
3. **Reusability** — design dep-edge structure to be consumable by B10/B11/B12 (validator-arg tracking) + B16 (engine-derived). Don't build a derived-cell-specific shape.
4. **Self-reference** — `const <x> = @x + 1` is degenerate cycle; covered by tests.
5. **Survey gate** — survey at Phase 0 must verify (a) §31 dep-graph machinery exists today and is extendable, (b) `fn` purity recognition exists in type-system, (c) function-body recursive walker is feasible at A1b stage (not blocked on A1c codegen).

## §3 Cost impact

SCOPE estimate: 4-6h. With transitive-walker requirement:
- If §31 + `fn`-purity machinery exists and is extendable: maybe 5-7h (small expansion).
- If transitive walker requires substantial new infra: 8-12h (T2/T3 boundary).

**Survey-first per primer §12** — Phase 0 confirms which path before per-step decomposition locks in.

## §4 Spec follow-up flagged (separate, non-blocking)

§6.6.10 header rename: `E-REACTIVE-005` → `E-DERIVED-CIRCULAR-DEP`. Add S59-style rename footnote OR rename in place. Small spec-prose commit. Not blocking B7 dispatch.

---

## §5 Tags

#a1b-b7 #rule-4-audit #derived-cell-dep-tracking #transitive-function-call-deps #spec-naming-drift-§6.6.10 #pre-dispatch-survey-gate #s66
