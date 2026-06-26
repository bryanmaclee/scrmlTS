# Approach A — "Feel of Performance" splitter: implementation scoping

**Change-id:** `feel-of-performance-approach-a-impl-2026-06-26` · **Status:** SCOPING (S221) · **Spec anchor:** SPEC §40.9 / PIPELINE Stage 7.6

> The whole-stack-closure splitter (the "minimal playable surface" — ship/prefetch exactly the components +
> reactive cells + server-fns + vendor units reachable from an entry point within N interactions, per role).
> Auto-derived from the reactive graph, NOT dev-annotated. The user's "feel of performance" thread.

## 0. This is NOT a fresh design bet — it's a ratified, spec-anchored, half-built feature

- **Ratified:** Approach A won the 5-voice A-vs-D debate (**Insight 29**, 2026-05-11) → the v0.3 spec-amendment target. Underwritten by the **S84 empirical gate** (reactive graph 99-100% statically resolvable).
- **De-risked on real adopter code (S221):** the OQ#1 probe extended to giti / 6nz / flogence — all clear the 70% gate; the one idiom beyond the curated corpus (6nz's dynamic-key `@arr[i]`, 30 sites) is **splitter-benign** (reads the whole root cell; cell-granularity closure unaffected). Confidence MEDIUM → **HIGH for real-world scrml**. See `scrml-support/docs/diagnostics/reactive-graph-static-resolvability-S84.md` § S221 ADDENDUM.
- **Spec'd:** SPEC §40.9 (closure analysis) + PIPELINE Stage 7.6 (full input/output/precondition/responsibility contract). The `ReachabilityRecord` / `RolePlayableSurface` / `ChunkPlan` / `ChunkContents` shapes are normative.

**So the question is not "should we build A" — it's "finish the remaining waves to make it actually split."**

## 1. Current build status (verified S221)

| piece | status | evidence |
|---|---|---|
| Reachability Solver core (components 1-5 + outer fixpoint + determinism serializer) | ✅ **BUILT** (A-2.x, S86-S91) | `compiler/src/reachability/` (4,399 LOC) + `reachability-solver.ts`; 21 determinism tests; component-1..4 tests |
| `W-AUTH-RUNTIME-FALLBACK` / `E-CLOSURE-001/002` static-vs-runtime instrumentation | ✅ **BUILT** | the diagnostic vocabulary that records conservative fallbacks |
| §40 AuthGraph derivation | ✅ **BUILT** | `compiler/src/auth-graph.ts` + `types/auth-graph.ts` |
| **DG markup-context `reads` edge-lift (§40.9.3)** | ❌ **NOT built** — the "256-edge ceiling" | markup `@`-reads route through `MARKUP_READER_SENTINEL` (dependency-graph.ts); RS aborts/under-approximates without them |
| **Live-pipeline activation** (Stage 7.6 wired active; DG+AuthGraph fed to RS) | ❌ **NOT done** — Stage 7.6 INACTIVE | `--emit-reachability` produces EMPTY closures today (DG+AuthGraph not wired into the emit path) |
| **A-4 codegen splitter** (consume ChunkPlans → emit tiered chunks) | ❌ **NOT built** | `codegen/index.ts:962` "Empty until A-2.2+"; `:190/:201` A-4 wave + feature-flag notes |
| Runtime tiered-chunk loader (initialChunk + prefetchTier1/2/N progressive load) | ❌ **NOT built** | depends on A-4 |

**The headline:** the hard analytical core (the solver + auth-graph + the static-resolvability instrumentation — ~120-240h of the original 300-640h estimate) is DONE. What remains is the **plumbing** (DG edge-lift + activation) and the **payload** (codegen splitter + runtime loader).

## 2. Remaining waves (dependency-ordered; estimates from Insight 29 band)

- **W1 — DG markup-context `reads` edge-lift (§40.9.3).** ~40-80h. **THE prerequisite — RS aborts without it.** Today the DG counts markup `@`-reads (`${@x}`, `bind:value=@x`, `if=@x`, `for(... of @x)` in markup) only via the `MARKUP_READER_SENTINEL` for E-DG-002 accounting; it does NOT emit them as real `reads` edges. Lift them into the edge list so the `reactive_dep_closure` is complete. **First buildable. Self-contained (DG-only). Verifiable** (the S84 probe's "implicit markup reads" count becomes edge-shaped; RS stops aborting). Largest single risk-reducer.
- **W2 — live-pipeline activation + wiring.** Smaller than the original ~40-120h (the AuthGraph pass already exists). Wire Stage 7.6 active after Stage 7.5; feed the post-W1 DG + AuthGraph + RouteMap + RoleEnum into `runReachabilitySolver`; make `--emit-reachability` produce REAL closures (today empty). Re-run the trucking probe → non-empty per-role ChunkPlans = W2 done.
- **W3 — A-4 codegen splitter.** ~60-120h. The payload wave. Codegen consumes the per-(EP, role) ChunkPlans → emits actual per-tier chunk files + the manifest. Behind a feature flag, default-on at the v0.3.0 cut.
- **W4 — runtime tiered-chunk loader.** Client-side progressive load of initialChunk → prefetchTier1/2/N (idle/interaction-triggered). May fold into W3. This is where "feel of performance" becomes observable.
- **W5 — integration tests + the flagship demo.** ~40-80h. End-to-end TTI measurement on a real app (trucking / flux MMORPG) under both split + no-split; the empirical "is it user-perceptible" study (the dive's OQ#2).

## 3. Decisions that need a ruling (before/during build)

1. **Sequencing vs the v0.2.0 backlog.** This is a v0.3 multi-session arc (~180-400h remaining). The dive's brutal counter-argument still stands: *"whether scrml can build it before Qwik/Marko/Solid catch up is an engineering question."* Fork: (a) start W1 now as a parallel arc, (b) finish the v0.2.0 backlog first then this, (c) interleave (W1 is self-contained, fits between adopter-bug waves). **Recommend (c)** — W1 is a clean, bounded, high-value DG fix that doesn't block the backlog.
2. **Approach B (telemetry-PGO) in or out.** The dive deferred B to "future extension, not v1." User S83 voice: *"I strongly lean A + B."* Recommend: **A fully first (W1-W5), B as a follow-on arc** once A ships + we have real TTI numbers to PGO against.
3. **`<switch>` / runtime-conditional render worst-case (dive OQ#5).** Runtime-conditional branches go to worst-case union (ship both arms). Trucking + 6nz use heavy `<match>`/`<engine>`. Likely fine (union is bounded + correct), but: ruling on whether W3 optimizes it or accepts the union for v1. **Recommend accept-union for v1** (correctness over payload-optimality; revisit if a real app's union dominates).
4. **Recoverability coupling (dive OQ#8).** Does the build-story / comp-time shape need to capture the solver's split decisions (for R4 reproducibility)? Defer to the build-story arc unless W3 surfaces a hard coupling.

## 4. Proposed first step

**W1 — the DG markup-context `reads` edge-lift.** Self-contained, ~40-80h, the prerequisite everything else needs, and independently verifiable (re-run the S84 probe → the markup reads become edge-shaped; RS stops aborting on trucking). Dispatch shape: a focused `scrml-js-codegen-engineer` worktree dispatch against `dependency-graph.ts` (the `MARKUP_READER_SENTINEL` site + the §40.9.3 contract), with the S84 diagnostic + Stage 7.6 input contract as the brief, and the probe as the acceptance test.

## Links
- SPEC §40.9 · PIPELINE Stage 7.6 (`compiler/PIPELINE.md` ~L2350) · Insight 29 (`~/.claude/design-insights.md`)
- Source dive: `scrml-support/archive/deep-dives/smart-app-splitting-feel-of-performance-2026-04-26.md` (status: superseded — fed the ratification)
- Empirical gate + adopter extension: `scrml-support/docs/diagnostics/reactive-graph-static-resolvability-S84.md`
- Solver: `compiler/src/reachability/` + `reachability-solver.ts` · AuthGraph: `compiler/src/auth-graph.ts`
