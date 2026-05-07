# Phase A1b Step B11 — Phase 0 Survey

Per primer §12 (survey-first), confirms the dispatch's 5 survey items before locking implementation.

## (a) B5's `_cellKind` annotation reliability

**Verified.** `compiler/src/symbol-table.ts:1151-1161` — `classifyStateDecl` first checks `Array.isArray(decl.children)` and returns `"compound-parent"` unconditionally. PASS 4 (`walkClassifyCells`) walks every state-decl reachable from `ast.nodes` in the recursion shape used by PASS 1, so every registered compound parent is annotated. No drift observed across the corpus (tests at `tests/unit/cell-classifier.test.js §B5.8` confirm compound-parent classification).

**Implication for B11:** the trigger predicate is sound — walk every state-decl with `getCellKind(decl) === "compound-parent"`.

## (b) Symbol table API supports adding entries to a compound's scope post-B5

**Verified.** `tests/integration/symbol-table.test.js §B1.15` (`re-entrancy invariant — B11 simulation`, lines 417-456) explicitly demonstrates injecting a synth `StateCellRecord` into the compound's `_scope.stateCells` map post-`runSYM`, and `lookupQualifiedStateCell` recovers it correctly. The `Scope.stateCells` field is a `Map`, and registration is `.set()` based — no freezing.

**Implication for B11:** synth records can be created and `_scope.stateCells.set()`-ed directly; lookup-via-qualified-path Just Works.

## (c) B7's dep-graph public API supports B11 emitting edges

**Partially verified — adjustment needed.** `compiler/src/dependency-graph.ts:765-780` defines `buildValidatorArgsAdj` filtering by `kind === "validator-reads"`. The B10 Phase 3 emission pattern (`emitValidatorArgEdgesForFile`, line 1784-1839) is the canonical emit-edges-into-DG path; B11 mirrors it.

**Two paths considered:**

1. **Emit into the same `validator-reads` adjacency** — natural since the rollup IS a validator-arg-style dep (compound's `isValid` reads each field's `isValid` which reads each field's value). But synth cells DO NOT have DG nodes (`reactiveVarNodeIds` is keyed on physical-cell `varName`s only).

2. **Emit a virtual rollup at the compound DGNode** — when the compound parent has any validated field, emit `validator-reads` edges from the compound DGNode (which exists, because the compound parent is a state-decl) to each field. This gives the right reactivity contract: a write to any field's value reactively propagates to the compound's `isValid`.

**Decision:** Path 2. The compound parent is a registered reactive cell (gets its own DGNode); its `isValid` synth-cell shares the compound's reactivity entry-point. Cross-field predicate-arg reads are ALREADY emitted by B10 Phase 3 — B11 needs only the rollup edges from compound to each child.

**However:** the canonical reactivity story for synth cells is mostly an A1c codegen concern. B11's job at the SYM/DG level is:
- Register synth-cell records in the symbol table (so future `@form.isValid` lookups find them).
- Annotate the synth records with their dep-graph contract (which fields they roll up over) for A1c to consume.
- Cross-field deps via predicate args were ALREADY wired by B10 Phase 3.

**Implication:** B11 emits NO new DG edges in this step — the cross-field reactivity is already complete via B10 Phase 3, and the rollup-edge emission is essentially a logical consequence of the synth records' annotations (an A1c codegen concern). B11 records the rollup contract on the SynthCellRecord; future codegen wires the actual subscription.

This narrows B11's DG-level surface to ZERO new edges. Saves ~30-60min from estimate.

## (d) §34 catalog has E-SYNTHESIZED-WRITE row

**Verified.** `compiler/SPEC.md:14218`:
```
| E-SYNTHESIZED-WRITE | §6.11 | Assignment to an auto-synthesized property (e.g., `@signup.isValid = false`). Synthesized validity surface properties are read-only. See §55 for full validity surface specification. | Error |
```

No spec amendment needed.

**Implication for B11:** fire `E-SYNTHESIZED-WRITE` directly using the existing catalog row's wording.

## (e) Test-corpus coverage of case shapes

**Verified.** Existing fixtures already cover:
- `<formRes><name>="" <email>=""</>` — compound-with-no-validators (used in §B1.4 etc.).
- `<form><name req length(>=2)>...</>` — compound-with-validators (used in B10 tests).
- `<count req>` — single-value Tier-1 (used in §B5 tests).
- `<confirm req eq(@signup.password)>` — cross-field via eq (used in B10 Phase 3 cycle tests).

**Implication for B11:** test fixtures can be authored inline using these shapes — no new ast-builder support needed.

## Depth-of-survey discount + scope expansion

The Phase 0 survey reveals one **scope contraction**: per finding (c), B11 emits NO new DG edges (the cross-field machinery is already complete via B10 Phase 3, and rollup edges are A1c codegen concerns). Net B11 surface:

1. PASS 8 (new) — `walkRegisterSynthSurface` registers synth-cell records on every compound-parent's `_scope`.
2. PASS 6 extension — extend B8's `walkDerivedValueMutate` with a fourth dispatch path for synth-property writes at compound scope. Renamed effectively to "value-mutate-OR-synthesized-write" but kept under same walker for cohesion (per audit §1.3).
3. Tests — synth-cell-registration + E-SYNTHESIZED-WRITE diagnostic + boundary cases.

Original 5-7h estimate likely realistic at the lower bound; PASS 8 is the bulk of the work (synth-cell `StateCellRecord`-shaped construction + the SynthCellRecord extension fields per dispatch §5).
