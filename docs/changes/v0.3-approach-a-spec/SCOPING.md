---
title: "v0.3 Approach A — spec-amendment authorization scoping"
date: 2026-05-12
session: S86
status: DRAFT — awaits user authorization to dispatch
scope-authority:
  - scrml-support/docs/deep-dives/smart-app-splitting-feel-of-performance-2026-04-26.md (THE dive — Approach A definition)
  - scrml-support/docs/diagnostics/reactive-graph-static-resolvability-S84.md (99-100% gate PASS)
  - scrml-support/design-insights.md Insight 29 (A ratified for v0.3.0; B deferred to v2; D rejected)
  - scrml-support/docs/deep-dives/perf-feel-debate-plan-2026-05-11.md Phase 2 (post-debate execution)
walltime-band: 20-30h spec-author walltime (single dispatch); analogous to v0.3 Wave 1 program-shape scope
fires-as: ONE scrml-deep-dive or general-purpose spec-author dispatch, worktree-isolated
tags: [v0.3, approach-a, closure-analysis, spec-amendment, playable-surface, insight-29, s86, dispatch-brief]
---

# v0.3 Approach A — spec-amendment authorization

The SPEC anchor for Insight 29's ratified Approach A. Authors the language-level surface for whole-stack reactive-graph + auth + server-fn closure analysis that gates per-route artifact splitting. Compiler implementation (the 300-640h band) follows in later waves; this dispatch is **spec text + diagnostic catalog + PIPELINE.md prose only** — analogous to v0.3 Wave 1 (program-shape spec anchor at `2b7c4df`).

---

## 0. Why now

- Insight 29 ratified at S85 (2026-05-11). Approach A is the v0.3.0 spec-amendment target. Approach B deferred to v2 (no telemetry surface in this amendment). Approach D rejected.
- S84 empirical study at `scrml-support/docs/diagnostics/reactive-graph-static-resolvability-S84.md` measured **99-100% static-resolvable** across trucking-dispatch + 02/06/08/14 — gate PASS by 29 absolute points above the 70% dive threshold.
- v0.3 Wave 2 LANDED at S86 (`885eaa9` + `41a4706` + `2314c8c`) — `bun scrml migrate --program-shape` + TAB + BS-layer extensions all green. Wave 2 was program-shape; this dispatch is the next architectural anchor.
- Per Phase 2 of `perf-feel-debate-plan-2026-05-11.md`: "SPEC amendment proposing the closure-analysis surface (~§N TBD)" is the post-debate action item.

---

## 1. Scope — what the spec amendment authors

Per Insight 29 normative requirements (5 items) + dive H Components 1-5 + Phase 2 plan:

### 1.1 NEW spec section — Closure Analysis ("Minimal Playable Surface")

Likely placement: **NEW §40.9** (after §40.8 v0.3 program shape + §40.8.1 OQ; sits in §40 because middleware + program scope is the natural locus). Alternative: **NEW §57** (standalone section). Spec author picks based on cross-ref density.

Normative content:

1. **`playable_surface(entry_point, N)` formalization.** Per dive H §"The 'Minimal Playable Surface' Formalization". Pseudocode:
   ```
   playable_surface(entry_point, N) :=
     closure(
       initially_rendered_components(entry_point)
       ∪ reactive_dep_closure(initially_rendered_components(entry_point))
       ∪ server_fn_reachable_within(N, initially_rendered_components(entry_point))
       ∪ auth_gated_boundaries_visible_to(entry_point.viewer_role)
       ∪ vendor_units_used_by(initially_rendered_components(entry_point))
     )
   ```

2. **Component 1 — `initially_rendered_components(entry_point)`.** Static determination of which child blocks render given entry-point + initial server state. Conditional render branches gated on runtime-only signals are admitted to the playable surface (worst-case union; per S84 diagnostic, runtime-only branches are functionally empty for the corpus measured).

3. **Component 2 — `reactive_dep_closure(C)`.** Closure over reactive primitive reads/writes/transitive derivations. Anchors on `dependency-graph.ts` Stage 7 output (post-S84 markup-context edge emission fix). Per S84: closure is 99-100% statically resolvable.

4. **Component 3 — `server_fn_reachable_within(N, C_set)`.** Compiler enumerates server-fn calls reachable from C_set within N user interactions (N=0 initial, N=1 direct event, N=2 cascade). Per §52 server-fn boundary.

5. **Component 4 — `auth_gated_boundaries_visible_to(role)`.** §40 auth gates compose into closure. **DEPENDENCY:** §40 must support static-role-analysis depth (see §1.2 below). Components behind auth gates the viewer cannot pass are excluded from the playable surface for that viewer.

6. **Component 5 — `vendor_units_used_by(C_set)`.** Per §41 vendor units + bridge architecture (deep-dive C). Already-declared isolation boundaries; closure is trivial.

7. **Per-tier output structure (normative):**
   - `initial_chunk(entry_point)` := `minimize_payload(playable_surface(entry_point, N=0))`
   - `prefetch_tier_1(entry_point)` := `playable_surface(entry_point, N=1) − initial_chunk(entry_point)` — idle-prefetched after initial render
   - `prefetch_tier_2(entry_point)` := `playable_surface(entry_point, N=2) − playable_surface(entry_point, N=1)` — hover/focus prefetched
   - `prefetch_tier_N` (N≥3) := on-demand fetched

8. **Determinism preservation (anchors §47 + dive A R1-R4).** All inputs to the closure analysis are static (source + spec semantics only). No telemetry input in v1; deterministic-from-source-only. Same source → same splits → same content addresses per §47. Compatible with dive A R1-R4 reproducibility readings.

### 1.2 §40 amendment — static-role-analysis depth (resolves OQ #3 from Insight 29)

Per Insight 29 YELLOW item: §40 must support enough static-role-analysis to classify "viewer with role R can reach component C" at compile time. The amendment must specify:

1. **Static role-classification requirement.** Auth gates that depend on synchronous role checks (e.g., `@user.role == "admin"` against a statically-known role enum) ARE statically resolvable.
2. **Async backend gates fall back to runtime.** Auth gates that depend on async backend checks (e.g., `await checkPermission(user, resource)`) fall back to runtime gating — the closure analysis treats the gated component as runtime-only and ships it eagerly (matches Next.js-style today's behavior for that subset).
3. **New diagnostic — `W-AUTH-RUNTIME-FALLBACK`?** Info-level lint warning when an auth gate uses an async-only check that prevents static-role-classification. Optional — author may surface as PA discussion point during dispatch.

This is the load-bearing OQ from Insight 29. The amendment can EITHER bind the answer (recommend: synchronous role checks via static enum) OR explicitly defer with a follow-up surface (recommend: bind now; the dive's framing + S84 diagnostic both support synchronous as the canonical shape).

### 1.3 §47 amendment — content-addressing language

Likely small addition to §47 (Output Name Encoding). Spec text:
- All inputs to `playable_surface` are static; closure output is deterministic-from-source-only.
- §47 content addresses incorporate the closure-analysis pass output without modification (same source → same closure → same chunks → same addresses).
- Approach B's telemetry-version axis is OUT OF SCOPE for v0.3 (v2 extension; spec defers).

### 1.4 §52 cross-ref — server-fn-reachability semantics

§52 already defines the server-fn boundary. Amendment is light:
- Cross-reference Component 3 of §40.9 (or wherever the new section lands).
- Possibly a small clarification that "server-fn reachability" is a derived analysis on top of §52's static boundary determination.

### 1.5 §41 cross-ref — vendor units / bridge architecture

§41 already provides vendor unit isolation. Amendment is light:
- Cross-reference Component 5 of §40.9.
- Cross-link to deep-dive C bridge architecture conclusions.

### 1.6 PIPELINE.md amendment — new analysis pass placement

PIPELINE.md describes the 12-stage compiler pipeline. The closure-analysis pass placement (per Insight 29):

- **Stage 7.5 OR post-DG sub-pass.** Runs AFTER Dependency Graph (Stage 7) — DG provides reactive_dep_closure foundation. Runs BEFORE Codegen (Stage 8/whatever it is in current PIPELINE.md numbering — verify against current PIPELINE.md).
- Name: **`Reachability Solver`** (working title; spec author may rename).
- Output: per-entry-point closure record + per-tier chunk assignment plan.
- Inputs: DG output + §40 auth-graph + §52 server-fn-boundary + §41 vendor-unit declarations + entry-point list (one per route file under v0.3 program-shape).

The PIPELINE.md amendment authors:
1. New §<Stage 7.5> section: inputs / outputs / failure modes.
2. Cross-ref to §40.9 (or wherever §1.1 lands).
3. Integration Failure Mode Catalog entries (per existing PIPELINE.md convention).

### 1.7 §34 catalog additions — new diagnostic codes

Likely new codes:
- **`E-CLOSURE-001`** (or similar) — closure analysis fails to terminate (cycle in reachability graph). Defensive; should not fire in practice.
- **`W-AUTH-RUNTIME-FALLBACK`** (per §1.2) — info-level lint when an auth gate cannot be statically role-classified.
- Possibly additional codes surfaced during authoring; spec author proposes.

### 1.8 SPEC-INDEX regen

Mechanical. Auto-handled by `bun run scripts/regen-spec-index.ts` post-amendment. PA-side; not part of dispatch scope.

---

## 2. Out of scope (deferred to later waves)

- **Compiler implementation** of the closure analysis pass (the 300-640h band per Insight 29). Implementation comes in subsequent waves; this dispatch is spec-only.
- **Markup-context edge emission Stage-7 extension** (per S84 diagnostic flag — 256 implicit markup reads not yet lifted into DG edge form). The amendment specifies this as a requirement; the implementation lands in compiler implementation waves.
- **Approach B telemetry-PGO surface** — Insight 29 deferred to v2. Spec text in §1.3 explicitly defers; no telemetry schema in this amendment.
- **Approach C `^{}` overrides** — gated on deep-dive E (`compiler.*` phantom + `^{}` determinism). Not in v0.3 scope.
- **`<program spa>` boolean OQ** (SPEC §40.8.1) — DEFERRED per existing OQ; do NOT pre-commit either side.
- **Per-route artifact splitter implementation** — compiler-impl wave.
- **Recoverability integration (dive A R1-R4)** — referenced as constraint, not as a new spec section in this amendment.

---

## 3. Walltime band + dispatch shape

**Walltime band:** 20-30h spec-author walltime. Anchored on v0.3 Wave 1 program-shape spec anchor (similar surface — 14 sections / ~390 LOC / 20-30h band per implementation-plan recalibration). Approach A surface is comparable: 1 new section (§40.9 / §57) + 5 cross-ref amendments + PIPELINE.md amendment + diagnostic catalog.

**Dispatch shape:** ONE dispatch, worktree-isolated, single spec-author. Background-firable.

Recommended agent: `general-purpose` (per pa.md note for spec-rewrite work; `scrml-deep-dive` is also viable but optimized for research not authoring).

**File targets:**
- `compiler/SPEC.md` — primary; §40.9 (new) + §40 / §47 / §52 / §41 / §34 amendments
- `compiler/PIPELINE.md` — new Stage 7.5 section + Integration Failure Mode entries

---

## 4. Risk surface

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| OQ #3 (§40 auth-depth) requires user ratification before spec-author commits to synchronous-role-classification answer | MEDIUM | Spec author either escalates or commits | §1.2 explicitly flags this — author MUST surface to PA / user when reached; default lean is synchronous-only |
| Spec-author commits to a §40.9 placement (vs §57) that creates cross-ref churn | LOW | Cosmetic; minor rewrite | Place where cross-ref density is highest (§40 territory); easy to re-locate |
| Closure-analysis formalization disagrees with current DG / §52 / §41 capabilities | LOW | Implementation-time fix lands in compiler-impl wave | S84 diagnostic verified 99-100% closure-resolvable; gap items already cataloged |
| Approach B / C content leaks into the amendment by author misreading Insight 29 | LOW | Out-of-scope creep | Brief explicitly enumerates out-of-scope (§2) + cites Insight 29 deferral |
| `<program spa>` OQ pre-commit | LOW | Spec drift | Brief explicitly forbids touching the OQ (§2) |

---

## 5. Open questions to surface BEFORE dispatch

1. **§40 auth-depth resolution (OQ #3).** Should the amendment commit to synchronous-role-classification as the static-resolvability requirement (PA lean: yes; matches S84 diagnostic + simpler implementation surface), OR surface to user for explicit ratification during dispatch? PA-recommended: COMMIT in the brief, surface only if spec-author finds a structural obstacle.

2. **Section placement.** §40.9 (extends §40) vs new §57 standalone. PA-recommended: §40.9 (cross-ref density favors it; §40 is already the middleware + program-scope locus where prefetch policy naturally lives).

3. **Diagnostic code identifiers.** `E-CLOSURE-001` / `W-AUTH-RUNTIME-FALLBACK` are working names. PA-recommended: spec-author picks final identifiers per §34 convention.

4. **Markup-context edge emission requirement language.** Should the amendment language be "the implementation MUST lift markup-context reads into DG edges" (binding) or "SHOULD" (advisory)? PA-recommended: MUST — S84 diagnostic explicitly flagged this as the closure-resolvability ceiling; binding language ensures compiler-impl wave delivers.

---

## 6. PA action requested

- **AUTHORIZE the dispatch** as scoped above, with PA-leans on §5 OQ resolutions OR surface objections.
- Approve the §40.9 placement (vs §57 standalone) OR provide alternative.
- Confirm the OQ #3 default-lean (synchronous-role-classification) OR escalate for explicit ratification.
- Approve fire-after-approval shape (background dispatch via `general-purpose`, isolation=worktree, model=opus) OR specify different agent / foreground.

---

## Tags

#v0.3 #approach-a #closure-analysis #playable-surface #spec-amendment-scoping #insight-29 #s86 #dispatch-brief #20-30h-walltime #spec-anchor-only #compiler-impl-deferred

## Links

- Dive H — `scrml-support/docs/deep-dives/smart-app-splitting-feel-of-performance-2026-04-26.md`
- Empirical study S84 — `scrml-support/docs/diagnostics/reactive-graph-static-resolvability-S84.md`
- Insight 29 — `scrml-support/design-insights.md` (line 1827, 2026-05-11)
- Phase 2 execution plan — `scrml-support/docs/deep-dives/perf-feel-debate-plan-2026-05-11.md` §"Phase 2"
- v0.3 Wave 1 precedent — `2b7c4df` SPEC amendments + walker inversion
- Wave 2 dispatch brief precedent — `docs/changes/v0.3-wave-2/DISPATCH-BRIEF.md`
- Current SPEC §40 — `compiler/SPEC.md:17098`
- Current SPEC §40.8 program shape — `compiler/SPEC.md:17458`
- Current SPEC §47 — `compiler/SPEC.md:18466`
- Current PIPELINE.md — `compiler/PIPELINE.md`
