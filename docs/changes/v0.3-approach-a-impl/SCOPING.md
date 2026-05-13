# v0.3 Approach A — Implementation Scoping (master plan + A-1 sub-phases)

**Status:** DRAFT — awaits PA + user OQ ratification before A-1.1 dispatches.
**Authority:** Insight 29 (`scrml-support/design-insights.md` ~line 1827; 5-voice debate verdict 2026-05-11) ratifies Approach A as v0.3.0 spec-amendment-AND-implementation target. SPEC anchor LANDED at `d3deed2` (S86): SPEC.md §40.9 (Closure Analysis / Minimal Playable Surface) + §40.1.1 + §47.5 / §52 / §41.9 cross-refs + PIPELINE.md Stage 7.6. User at S88 reversed the v0.4 deferral: *"I know we talked about deferring A to 0.4, but I am not seeing the reason now, start on those tasks as they are unblocked."* Design = settled; schedule = now.
**Underwriting empirical study:** S84 diagnostic (`scrml-support/docs/diagnostics/reactive-graph-static-resolvability-S84.md`) — 99-100% static-resolvability gate PASS across 501 reactive-graph reads/writes / 33 files; runtime-only catalog functionally empty.
**Total band per Insight 29 compiler-architect:** 300-640h calibrated; 600-1280h under rustc-borrow-checker-trap risk.

---

## Phase 0 — Master plan (Approach A overview)

### 0.1 Five sub-waves per Insight 29 + PIPELINE Stage 7.6

| Wave | Scope | Estimate | Files most touched | Blocks |
|---|---|---|---|---|
| **A-1** | **Markup-context edge emission** — Stage 7 DG extension. Lift the ~256 markup-context `@cell` reads identified by S84 (today crediting only `MARKUP_READER_SENTINEL` at `compiler/src/dependency-graph.ts:1720`) into real `reads` DG edges. Binding requirement of SPEC.md §40.9.3. | **40-80h** | `compiler/src/dependency-graph.ts` (extends `sweepNodeForAtRefs` at 1761-2000); `compiler/src/types/ast.ts` (DG-internal node-kind addition); tests new. | A-2, A-3, A-4, A-5 |
| **A-2** | **Reachability Solver** — new Stage 7.6 per PIPELINE.md lines 2332-2412. Implements `playable_surface(E, N)` fixed-point per SPEC.md §40.9.1; produces `ReachabilityRecord` with `ChunkPlan` per role per entry point; emits `E-CLOSURE-001`. | **120-240h** | NEW `compiler/src/reachability-solver.ts`; NEW `compiler/src/types/reachability.ts`; `compiler/src/index.ts` (pipeline wiring after Stage 7.5 BP, before Stage 8 CG). | A-3, A-4 |
| **A-3** | **§40 auth-graph integration** — derive `AuthGraph` from §40 auth-attribute classification on `<program>` / `<page>` / `<auth role=>` / `<channel auth=>` declarations; consume §40.1.1 app-scope role enum; fire-site for `W-AUTH-RUNTIME-FALLBACK` per SPEC.md §40.9.11. | **40-120h** | NEW `compiler/src/auth-graph.ts`; `compiler/src/route-inference.ts` (extend the existing auth middleware pass at lines 2429-2480); SPEC §34 catalog already-landed. | A-2 (input) |
| **A-4** | **Per-route artifact splitter** — Stage 8 CG consumes `ChunkPlan` from Stage 7.6, emits per-role / per-tier chunks per SPEC.md §40.9.7. `initial_chunk` / `prefetch_tier_1` / `prefetch_tier_2` / `prefetch_tier_N`. | **60-120h** | `compiler/src/codegen/index.ts` (consume `reachabilityRecord` input); NEW `compiler/src/codegen/emit-chunks.ts`; `compiler/src/codegen/scheduling.ts` (currently filters `edge.kind !== "awaits"` at line 220 — additive). | A-5 |
| **A-5** | **Integration tests** — end-to-end: source → Stage 7 with markup edges → Stage 7.6 closure → Stage 8 per-role chunks. Anchor S84 256-edge ceiling + Insight 29 5-voice debate corpus (trucking-dispatch + 22 examples) + content-address determinism (SPEC §40.9.8). | **40-80h** | `compiler/tests/integration/closure-analysis/*.test.ts`; conformance fixtures under `compiler/tests/fixtures/closure-analysis/`. | — |

**Sequencing diagram:**

```
A-1 (markup edges) ─┬──> A-2 (RS) ─┬──> A-4 (per-route split) ──> A-5 (E2E tests)
                    │              │
                    └─> A-3 (auth) ─┘
```

A-3 is parallelizable with A-2's first sub-phases (AuthGraph derivation does not depend on RS). PA may dispatch A-3 concurrently with A-2 once A-1 lands. A-4 and A-5 are strictly sequential post-A-2/A-3.

### 0.2 Cumulative spec / code surface

**Files NEW (~5):**
- `compiler/src/reachability-solver.ts` (A-2)
- `compiler/src/types/reachability.ts` (A-2)
- `compiler/src/auth-graph.ts` (A-3)
- `compiler/src/codegen/emit-chunks.ts` (A-4)
- Test directory `compiler/tests/integration/closure-analysis/` (A-5)

**Files EXTENDED (~6):**
- `compiler/src/dependency-graph.ts` (A-1, primary)
- `compiler/src/types/ast.ts` or new `compiler/src/types/dg.ts` (A-1, DG-internal node kind addition)
- `compiler/src/route-inference.ts` (A-3)
- `compiler/src/codegen/index.ts` + `compiler/src/codegen/context.ts` (A-4)
- `compiler/src/index.ts` (pipeline wiring; Stage 7.6 insertion)
- `compiler/cli/scrml.ts` (CLI flag for `--emit-reachability` per PIPELINE Stage 7.6 line 2396)

**Files DELIBERATELY NOT TOUCHED:**
- `compiler/SPEC.md` — already-landed at `d3deed2` (S86). All normative text exists.
- `compiler/PIPELINE.md` — already-landed at `d3deed2`. Stage 7.6 SPEC ANCHOR is the contract.
- §34 error-code catalog — `E-CLOSURE-001` + `W-AUTH-RUNTIME-FALLBACK` already cataloged.

### 0.3 Risks per wave (master-level)

| Wave | Risk | Mitigation |
|---|---|---|
| A-1 | New DG edges may surface in EXISTING DG consumers (codegen/scheduling, batch-planner). | **VERIFIED safe by audit:** `codegen/scheduling.ts:220` filters `edge.kind !== "awaits"`; new `reads` edges silently skipped. `batch-planner.ts:614` consumes `depGraph.nodes` (not edges). Additive change is safe. A-1.6 catalogs full consumer list as guard. |
| A-1 | E-DG-002 (reactive-var-no-readers) currently uses `MARKUP_READER_SENTINEL`. Lifting reads into real edges may break this check. | A-1.5 keeps sentinel credit AS WELL AS new edges (additive); E-DG-002 logic unchanged. Verify in A-1.7 test. |
| A-2 | Fixed-point convergence — `E-CLOSURE-001` is defensive but real corpus may surface convergence gaps. | Test corpus from A-5 incorporates the §40.9.9 worked example + S84 corpus + trucking-dispatch. Initial implementation may use bounded-iteration with iteration-cap diagnostic; tighten in A-2.N. |
| A-3 | §40 today provides middleware auth (`route-inference.ts:2429-2480`) but no `AuthGraph` derivation. Role-enum consumption (§40.1.1) requires a new analysis pass. | Scope A-3.1 to enumerate auth sites; A-3.2 to derive the AuthGraph; A-3.3 to classify role-predicate as closed-form vs. async-fallback. |
| A-4 | Codegen currently emits per-file outputs. Per-role + per-tier chunks is a NEW output structure. | A-4 reuses Stage 8 emit-* primitives; only the chunking layer is new. CLI `--emit-reachability` (PIPELINE 7.6 line 2396) provides debug visibility before A-4 ships. |
| A-5 | S84's 99-100% gate was measured at S84 corpus state. S87 corpus shifted (Wave 3.6 migrated 12 trucking pages; 5 LIFT codegen bug families surfaced). | A-5.1 first action: re-measure 256-edge ceiling at current HEAD against the post-A-1 DG. If LIFT codegen bugs LIFT-1..5 reshape lift-template AST, A-1.4 (lift-template body sub-phase) may need re-scoping. |

### 0.4 Test budget (cumulative across waves)

| Wave | Unit tests | Integration tests | Conformance fixtures | Comments |
|---|---|---|---|---|
| A-1 | ~30-50 | ~5 | 0 | Per-AST-shape coverage: interpolation / attr-value / call-ref / variable-ref / expr / if-condition / for-iterable / engine-cell-self-read / engine state-child body / lift-template body / channel body. Test gate: re-measure 256-edge ceiling post-A-1 → ~256 new `reads` edges visible in DG. |
| A-2 | ~40-60 | ~8 | ~5 | Per-component coverage of `playable_surface`; fixed-point convergence test; role-enum-variant cross product; E-CLOSURE-001 defensive fire test. |
| A-3 | ~20-30 | ~4 | ~3 | AuthGraph derivation; W-AUTH-RUNTIME-FALLBACK fire-site; role-enum-missing error. |
| A-4 | ~25-40 | ~6 | ~10 | Per-tier chunk emission; content-address stability (SPEC §40.9.8); per-role chunk variance (Driver vs Admin vs Anonymous from §40.9.9 worked example). |
| A-5 | 0 | ~15-25 | ~10 | End-to-end: SPEC.md §40.9.9 worked example as test fixture; trucking-dispatch + TodoMVC + kanban as corpus; same-source-same-content-address determinism check. |
| **Total** | **~115-180** | **~38-58** | **~28** | Suite-cumulative; current S87 baseline is 11,153 pass / 554 files. |

---

## Phase 1 — A-1 sub-phase decomposition (LOAD-BEARING)

A-1's 40-80h band is dispatch-too-big as a single unit. Decompose into 8 ordered sub-phases.

**Foundational fact** (verified in source at `compiler/src/dependency-graph.ts`):
- The DG today already has `RenderDGNode` keyed by `markupNodeId` (lines 78-81, created at lines 1217-1227).
- `sweepNodeForAtRefs` (lines 1761-2000) already discovers EVERY markup-context `@cell` read across interpolations, attribute values, engine state-child bodies, meta bodies, raw-text fragments.
- **The gap is purely the lift step:** discovered reads credit `MARKUP_READER_SENTINEL` (line 1720) instead of pushing `edges.push({ from: <markup-context-source>, to: <reactive-node>, kind: "reads" })`.
- **Pre-existing parallel walker** at `compiler/src/route-inference.ts:2070` (`walkMarkupContext`) enumerates the same AST surface for `markupReferencedNames` — AST-shape catalog already authored; A-1 can model after it.

### A-1.1 — Source-node catalog + DG-internal node-kind decision (3-5h)

**Scope:** Determine WHICH DG node is the `from` of each new `reads` edge.

Two options:

- **Option X — single source per markup block.** All markup-context `@cell` reads in markup block M emit `reads` from M's RenderDGNode. Coarse-grained; minimal AST surface change. A-2 over-approximates: M reads `@a` ∪ `@b` together.
- **Option Y — per-interpolation source nodes.** Each `${@x}` / attr-value-with-`@x` / `if=@x` becomes a new DG node kind. Closure analysis is precise; AST/DG surface grows.

**Recommendation: Option X for v0.3.0, with extensibility to Y in v0.4.** Per SPEC.md §40.9.3 (line 17649-17653), the binding requirement is granularity-unconstrained. The S84 measurement counts READS not source nodes. A-2's closure operates on cell SETs; per-block grouping does not affect set membership.

**Estimate:** 3-5h.
**AST surface:** None (reuses `RenderDGNode`).
**Dispatch readiness:** Yes — design decision dispatch (no code yet).
**OQ #2 (PA must ratify Option X before A-1.1 dispatch).**

### A-1.2 — Walker extension scaffolding (4-6h)

**Scope:** Add a `markupContextEmitEdges` mode to `sweepNodeForAtRefs` — when enabled, push `reads` edges in parallel with existing `creditReader` sentinel credit. New helper `findOwningRenderDGNode(astNode, nodes): NodeId | null`.

**Estimate:** 4-6h.
**Walker placement:** Inside `dependency-graph.ts:1761`.
**Dependencies:** A-1.1 closed.

### A-1.3 — Per-AST-shape edge emission — interpolation + simple attr-value + bind:value + if-condition (8-12h)

**Scope:** High-frequency markup-context reads first:
- `${@x}` text interpolation (~40% of the 256 ceiling per fixture inspection)
- `attr=@x` simple variable-ref attribute (`valObj.kind === "variable-ref"`)
- `bind:value=@x` two-way binding (same shape)
- `if=@x` / `if=(expr)` condition (`valObj.kind === "expr"`)

**Estimate:** 8-12h.
**Test plan:** 10-15 unit tests; re-measure DG edge count; expect ~150-200 of 256 closed.
**Dependencies:** A-1.2.
**RECOMMENDED FIRST CODE-DISPATCH after A-1.1.**

### A-1.4 — Per-AST-shape edge emission — call-ref + for-iterable + lift-template body (8-14h)

**Scope:**
- **call-ref attribute values** (`onclick=fn(@x)`, `onsubmit=submit(@form)`) — Bug 4.5 / S87 fix already walks call-ref args; A-1.4 reuses + emits edges.
- **for-iterable markup** (`<li for (item of @items)>`)
- **Lift-template bodies** — `lift <Component prop=@x/>` inside `for` body. **5 LIFT codegen bug families open (S87).** If LIFT-2..5 reshape lift-template AST during their fix, A-1.4 may need re-scoping. **OQ #3 below.**

**Estimate:** 8-14h. Wide band conditional on LIFT codegen stability.
**Dependencies:** A-1.3 + OQ #3 resolution.
**Conditional dispatch readiness.**

### A-1.5 — Engine state-child + onTransition/onTimeout/onIdle body edge emission (6-10h)

**Scope:**
- Engine state-child bodies — structurally parsed by `engine-statechild-parser.ts`.
- `<onTransition>` / `<onTimeout>` / `<onIdle>` bodies — **OQ #1: markup-context or function-body?**
- Engine-cell self-read — lift to `reads` edge from engine's RenderDGNode to its engine-cell ReactiveDGNode.

**Estimate:** 6-10h.
**Dependencies:** A-1.3 + A-1.4 + OQ #1 closure.

### A-1.6 — DG consumer audit + regression guard (4-6h)

**Audit findings (already verified during scoping):**
- `codegen/scheduling.ts:219-225` — filters `edge.kind !== "awaits"`; **safe**.
- `batch-planner.ts:614+` — consumes `depGraph.nodes` only; **safe**.
- `buildReadsAdjacency` at line 753 / `buildValidatorReadsAdjacency` / `buildEngineDerivedReadsAdjacency` — new edges WILL appear in `buildReadsAdjacency`; **MUST verify** no false cycles (e.g., a derived cell whose body has markup interpolation reading itself — should be impossible, but verify).

**Estimate:** 4-6h.
**Test plan:** Full suite at 11,153 pass / 0 fail post-A-1.6.

### A-1.7 — S84 ceiling re-measurement + ceiling-closed validation (3-5h)

**Scope:** Re-run S84 inspector against post-A-1 DG. Target: 256 ceiling drops to ~0 (residual ≤ 10 of statically-irreducible cases). Total `reads` edge count grows by ~256.

**Estimate:** 3-5h.

### A-1.8 — Documentation + cross-ref update (2-4h)

Update DG-internal doc comments at `dependency-graph.ts:1-32`; PIPELINE.md Stage 7 cross-ref; master-list.md Phase progress.

**Estimate:** 2-4h.

### A-1 sub-phase total

| Sub-phase | Estimate (h) | Dependency |
|---|---|---|
| A-1.1 design decision | 3-5 | — |
| A-1.2 scaffold | 4-6 | A-1.1 |
| A-1.3 interp + attr + bind + if | 8-12 | A-1.2 |
| A-1.4 call-ref + for + lift | 8-14 | A-1.3 + OQ #3 |
| A-1.5 engine state-child + onTransition/Timeout/Idle | 6-10 | A-1.4 + OQ #1 |
| A-1.6 consumer audit | 4-6 | A-1.3..5 |
| A-1.7 S84 re-measurement | 3-5 | A-1.6 |
| A-1.8 docs | 2-4 | A-1.7 |
| **Total** | **38-62** | Within Insight 29's 40-80h band. |

---

## Phase 2 — A-2 / A-3 / A-4 / A-5 master-level decomposition

### A-2 — Reachability Solver (120-240h)

Major sub-phase categories:

1. **A-2.1** Type-surface + module scaffold — author `compiler/src/types/reachability.ts` matching PIPELINE.md Stage 7.6 output contract.
2. **A-2.2** Component 1 — `initially_rendered_components(E)` per SPEC §40.9.2.
3. **A-2.3** Component 2 — `reactive_dep_closure(C)` fixed-point traversal of DG `reads` edges.
4. **A-2.4** Component 3 — `server_fn_reachable_within(N, C_set)`.
5. **A-2.5** Component 4 — `auth_gated_boundaries_visible_to(role)` (consumes A-3).
6. **A-2.6** Component 5 — `vendor_units_used_by(C_set)` (consume §41 MOD).
7. **A-2.7** Outer `closure(...)` fixed-point operator; E-CLOSURE-001.
8. **A-2.8** ChunkPlan emission + `--emit-reachability` CLI flag.

**Sequencing:** A-2.2..A-2.6 parallel after A-2.1; A-2.7 + A-2.8 after all five components green.

### A-3 — §40 Auth-Graph Integration (40-120h)

Major sub-phase categories:

1. **A-3.1** Auth-site enumeration.
2. **A-3.2** Role enum resolution (§40.1.1).
3. **A-3.3** Role predicate classification → W-AUTH-RUNTIME-FALLBACK fire-site.
4. **A-3.4** AuthGraph derivation.

**Sequencing:** A-3.1 + A-3.2 parallel; A-3.3 + A-3.4 after.

### A-4 — Per-Route Artifact Splitter (60-120h)

Major sub-phase categories:

1. **A-4.1** `ReachabilityRecord` consumption in `codegen/index.ts`.
2. **A-4.2** `initial_chunk(E)` emission per role per entry point.
3. **A-4.3** `prefetch_tier_1` / `tier_2` emission.
4. **A-4.4** `prefetch_tier_N` on-demand machinery.
5. **A-4.5** Content-addressing integration (SPEC §40.9.8 / §47.5).
6. **A-4.6** Per-role chunk variance (Driver vs Admin vs Anonymous per §40.9.9).

### A-5 — Integration Tests (40-80h)

Major sub-phase categories:

1. **A-5.1** SPEC §40.9.9 worked-example fixture.
2. **A-5.2** Corpus replay — trucking-dispatch + TodoMVC + kanban.
3. **A-5.3** Determinism check — same source → same content addresses across two builds.
4. **A-5.4** Empty-role / Anonymous-redirect path.
5. **A-5.5** S84 ceiling re-validation.

---

## Phase 3 — Risk register

### 3.1 Spec ambiguity risks

- **AMB-A1-1:** Source-node granularity not normatively constrained (Option X recommended via A-1.1).
- **AMB-A1-2:** `<onTransition>` / `<onTimeout>` / `<onIdle>` body classification — markup-context or function-body? OQ #1.

### 3.2 Cross-pass coupling risks

- **CPL-A1-1:** `codegen/scheduling.ts:220` filters `edge.kind !== "awaits"`. **VERIFIED safe.**
- **CPL-A1-2:** `batch-planner.ts:614+` consumes `depGraph.nodes` only. **VERIFIED safe.**
- **CPL-A1-3:** `buildReadsAdjacency` at line 753 — must verify no false cycles introduced.
- **CPL-A1-4:** `E-DG-002` "reactive variable has no readers" — `MARKUP_READER_SENTINEL` kept (additive). **VERIFIED safe.**

### 3.3 Performance budget

A-1 perf impact ~5-15% Stage 7 walltime increase. Stage 7 budget per `dependency-graph.ts:30` is ≤20ms; post-A-1 should remain ≤22ms.

### 3.4 Test corpus risks

- **CRP-A1-1:** S84 gate measured at S84 corpus state. S87 corpus shifted. A-1.7 first action: re-measure at current HEAD.
- **CRP-A1-2:** LIFT-2/3/4/5 codegen bugs open. A-1.4 may need re-scoping post-LIFT-fix. See OQ #3.
- **CRP-A1-3:** S87 BRIEF-overclaim rule — sub-phase dispatches MUST verify SPEC text against current SPEC.md before quoting.

---

## Phase 4 — Open questions to surface BEFORE A-1 dispatch

**OQ #1 — `<onTransition>` / `<onTimeout>` / `<onIdle>` body classification.**
Markup-context (A-1.5) or function-body (already covered by Stage 7 function-body scan)? SPEC §40.9.3 binding clause vs SPEC §51.0.H phrasing. Recommend markup-context for consistency with engine-cell-self-read pattern. **Required before A-1.5 dispatch.**

**OQ #2 — Source-node granularity (Option X vs Option Y).**
Per-markup-block (Option X, recommended) vs per-interpolation (Option Y). Option X is smaller delta, matches existing `RenderDGNode`; Option Y is more precise for A-2 but expands AST/DG surface. **Recommendation: Option X for v0.3.0; v0.4 escape hatch.** PA ratify before A-1.1 dispatch.

**OQ #3 — A-1.4 sequencing vs. LIFT-2/3/4/5 codegen fix.**
Three options:
- **(a)** Fire A-1.4 NOW against current AST shape; absorb rework if LIFT fix changes shape.
- **(b)** Fire A-1.3 + A-1.5 + A-1.6 + A-1.7 + A-1.8 NOW; defer A-1.4 (lift-template) until LIFT-2..5 ship.
- **(c)** Fire LIFT codegen fixes FIRST, then A-1 in full.

**Recommendation: (b)** — A-1 partial close at A-1.3+A-1.5+A-1.6+A-1.7+A-1.8 (covers ~85% of 256-edge ceiling), then A-1.4 lift-template sub-case after LIFT codegen stabilizes.

**OQ #4 — Role-enum-missing-with-auth-gates behavior** (Insight-29 OQ-3 residual). Required before A-3.2 dispatch (does NOT block A-1).

**OQ #5 — Validator-reads + engine-derived-reads as markup-context candidates.** Recommend A-1 emits uniform `kind: "reads"`; A-2 composes. Does NOT block A-1.1.

---

## Critical Files for Implementation

- `compiler/src/dependency-graph.ts` (A-1 primary — lines 1217-1227 RenderDGNode creation, 1720 MARKUP_READER_SENTINEL, 1761-2000 walker, 753-814 reads-adjacency consumers)
- `compiler/src/route-inference.ts` (A-3 primary — lines 2070-2188 walkMarkupContext AST-shape catalog precedent, lines 2429-2480 existing auth-middleware pass)
- `compiler/src/types/ast.ts` (A-1 AST surface check; 1828 LOC reference)
- `compiler/SPEC.md` (normative contract — §40.9 at lines 17593-17860; §40.1.1 at lines 17118-17133)
- `compiler/PIPELINE.md` (Stage 7.6 SPEC ANCHOR at lines 2332-2412)

---

## Final report

**Executive summary:** Approach A's 300-640h surface decomposes into 5 sub-waves per Insight 29. A-1 is the foundation; all downstream waves gated on it. A-1's 40-80h decomposes into 8 ordered sub-phases (A-1.1 through A-1.8) totaling 38-62h — within Insight-29's band. Source audit confirms mechanical shape: `sweepNodeForAtRefs` already discovers every markup-context `@cell` read but credits a sentinel instead of emitting edges; A-1 is purely additive over existing walker output. Cross-consumer audit (codegen/scheduling, batch-planner, internal reads-adjacency) confirms new `reads` edges are additive-safe.

**Recommended FIRST DISPATCH:** **A-1.1 (source-node catalog + design decision, 3-5h).** Design-decision dispatch with no code output — ratifies Option X vs Option Y for source-node granularity (OQ #2). PA + user confirmation of Option X unblocks A-1.2 (scaffolding) and A-1.3 (~60% of ceiling). Sequencing: A-1.1 → A-1.2 → A-1.3 (high-frequency shapes).

**Blocker OQs that must resolve before A-1 starts:**
- **OQ #2 (source-node granularity)** — close before A-1.1 dispatch.
- **OQ #3 (A-1.4 sequencing vs LIFT-2..5)** — close before A-1.4 dispatch. Does NOT block A-1.1-A-1.3 or A-1.5-A-1.8. Recommendation: defer A-1.4 via Option (b); fire the rest.

**Non-blocker OQs** (must close before downstream waves, not A-1): OQ #1 (before A-1.5), OQ #4 (before A-3.2), OQ #5 (before A-2.3).

## Tags

#v0.3 #approach-a #closure-analysis #insight-29 #spec-anchor-d3deed2 #stage-7-extension #stage-7.6-new #s88-scoping #insight-29-deferral-reversed
