---
title: Runtime-perf Phase 2 — per-hotspot attribution SCOPING (data-driven)
date: 2026-05-19
session: S103
authority: P1.B runtime instrumentation (`6bc5128`) + P1.C re-measurement (`448fe89`); SCOPING precedent `docs/changes/runtime-perf-scoping/SCOPING.md` §3 Phase 2; PGO Phase 2 SCOPING shape `docs/changes/pgo-phase-2-scoping/SCOPING.md`
baseline: `benchmarks/RESULTS.md` §"Runtime Performance — happy-dom ... 2026-05-19 v0.3.3 + Vanilla baseline" + per-op breakdown
status: OQs RATIFIED S103 (5/5 per PA-lean) — Phase 2.1 PA-DIRECT dispatch-ready; Phase 2.2 sequential after 2.1; Phase 2.3 folds into 2.2; Phase 2/3 strict separation; Real-Chrome validation deferred to post-fix
---

# Runtime-perf Phase 2 — per-hotspot attribution SCOPING

## What this doc is for

Phase 1 produced the data (vanilla-JS baseline + per-op scrml-runtime instrumentation per `__SCRML_DEBUG_PERF`). The data identified four ops with measurable scrml-vs-fastest-framework gaps + named the top-1 or top-2 sub-runtime hotspots driving each gap.

Phase 2's job: walk each hotspot end-to-end. Confirm the attribution against the runtime source. Identify the **specific code path** that dominates the op's wall-clock cost. Surface what change-shape would actually move the per-op number. The output of each Phase 2 sub-dive is a Phase 3 SCOPING ready to dispatch.

Phase 2 is **NOT a fix dispatch.** Phase 2 produces SCOPING(s); Phase 3 is the chip-away dispatches per SCOPING(s).

Bottom line:

- **Phase 2.1 — select-row attribution.** 90% wall in `notify_subscribers` (LEGACY `_scrml_subscribers` O(n) walk). Biggest win potential.
- **Phase 2.2 — partial-update attribution.** 54% wall in `reconcile_list` LIS walk + 44% in `effect_scheduling`.
- **Phase 2.3 — swap-rows attribution.** 62% wall in `effect_scheduling` (both list-render + count-derived effects fire); 36% in `reconcile_list` LIS computation.
- **(Optional) Phase 2.4 — bulk-insert (create-1000/10000) attribution.** 71% wall in `reconcile_list` bulk-insert path; 13% in `dom_write`. May fold into 2.1 since the central-registry pathway is shared.

---

## §1. Authority + Phase 1 data summary

**P1.B + P1.C reference data** (median ms, 2026-05-19, happy-dom, v0.3.3 HEAD `6bc5128`):

| Op | Wall | Top hotspot (exclusive ms / % wall) | Top-2 hotspot |
|---|---|---|---|
| **select-row** | 5.94ms | `notify_subscribers` 5.369 / **90%** | reactive_get 0.074 (1%) |
| partial-update | 1.40ms | `reconcile_list` 0.762 / **54%** | effect_scheduling 0.613 (44%) |
| swap-rows | 1.85ms | `effect_scheduling` 1.146 / **62%** | reconcile_list 0.659 (36%) |
| create-1000 | 52.9ms | `reconcile_list` 37.433 / **71%** | dom_write 7.120 (13%) |
| create-10000 | 527.3ms | (un-instrumented separately; expected to mirror create-1000 at 10×) | — |

vs the comparison field:

| Op | scrml | Vanilla | scrml vs Vanilla |
|---|---|---|---|
| select-row | 5.0ms | 0.012ms | **414×** worse |
| remove-row | 4.4ms | 0.039ms | **113×** worse |
| partial-update | 2.4ms | 0.73ms | 3.2× worse |
| swap-rows | 3.4ms | 0.069ms | 49× worse (Vue at 2.79 — only 1.2× behind nearest framework) |
| create-1000 | 52ms | 28ms | 1.9× worse |

The runtime gap is concentrated on **per-row reactive-write fan-out** (select-row, remove-row) and **list-reconciliation cost** (partial-update, swap-rows, create-N).

**Phase 1 hypothesis from `docs/changes/runtime-perf-scoping/SCOPING.md` §3 status:** ALL anticipated hypotheses CONFIRMED by Phase 1 data. Phase 2 is now empirically anchored.

---

## §2. Phase 2.1 — select-row attribution (PRIMARY)

### §2.1.1 Hotspot

`notify_subscribers` cumulative time = 5.369ms exclusive (90% of select-row wall).

The path: `_scrml_reactive_set` → walks `_scrml_subscribers[varName]` (a global registry mapping `varName` → `Set<subscriber-callback>`) → fires each subscriber.

The select-row op writes `@editingId = rowId` against a compound cell. The TodoMVC fixture has 1000 rows; the subscriber set for `editingId` contains entries that walk the full visible list to re-render the "is row N currently editing?" classList toggle on each row. O(n) per write.

### §2.1.2 What Phase 2.1 produces

A SCOPING doc at `docs/changes/runtime-perf-phase-3-select-row/SCOPING.md` covering:

1. **Confirmed pathway** — the exact source-file + line numbers in `compiler/src/runtime-template.js` where `_scrml_subscribers` is populated, walked, and fired. Catalog every subscriber-fan-out site.
2. **Per-subscriber-call characterization** — what % of the 1000 entries are actually doing meaningful work vs. doing a no-op classList toggle (was-not-editing AND is-not-editing → no change). Subscribed-but-skipped work is pure overhead.
3. **Narrowing candidates** — code paths where the subscribed cell IS known to have a single subscriber site (the common case per SCOPING §4 candidate "signal-style direct subscription"). Catalog by call-site.
4. **Phase 3 candidate ranking** — at minimum, decide between:
   - **(a) Direct-subscribe-on-decl** — when a cell has exactly one subscriber-call site (parser/codegen can detect this statically), emit a direct function-call from the writer to the subscriber bypassing the central registry. Solid.js precedent. Anticipated saving: 30-60% on select-row.
   - **(b) Per-row reactive scope** — replace the central registry for `for`-loop body cells with per-row scoped registries. Eliminates the "all subscribers" lookup cost. Solid.js + Vue 3 precedent. Anticipated saving: large on select-row + partial-update.
   - **(c) Effect-deduplication** — when a single write would fire multiple subscribers that have identical effects, dedupe to fire once. Anticipated saving: variable.
5. **Risk register** — byte-identity invariant (per S102 PGO discipline), compile-time complexity, V5-strict access semantic preservation, runtime ABI back-compat.

### §2.1.3 Acceptance criteria

1. Phase 3 candidate ranking has at least 2 candidates with concrete cost-class estimates + estimated saving range.
2. The Phase 3 SCOPING is dispatch-ready (a scrml-js-codegen-engineer agent could pick it up + know what to do).
3. The pathway analysis includes line-number references for every `_scrml_subscribers` reference in `runtime-template.js` (current state: 5-10 sites by quick grep estimate; the SCOPING resolves these).

**Cost-class:** ~6-10h dispatch (deep characterization of subscriber pathways; runtime source archaeology; potentially small instrumentation tweaks to count subscribed-but-skipped work).

---

## §3. Phase 2.2 — partial-update attribution

### §3.1 Hotspot

`reconcile_list` cumulative time = 0.762ms exclusive (54% of partial-update wall) + `effect_scheduling` = 0.613ms (44%).

The path: `_scrml_reconcile_list` runs LIS over all 1000 nodes even when only 100 entries changed. Then the effect scheduling fan-out fires both the list-rendering effect AND the count-derived (`activeCount` / `completedCount`) effects.

### §3.2 What Phase 2.2 produces

A SCOPING at `docs/changes/runtime-perf-phase-3-partial-update/SCOPING.md` covering:

1. **LIS characterization** — when is the full LIS scan necessary vs. when can a fast-path (same-keys-in-same-order) detect "no reorder needed, just per-row property updates"? Catalog the call patterns.
2. **Effect-scheduling cascade** — why do count-derived effects fire on a partial update? Are the derived dependencies actually changing, or is the dependency-tracking over-firing? Catalog upstream-deps for `activeCount` + `completedCount` against the partial-update mutation set.
3. **Phase 3 candidate ranking**:
   - **(a) Same-keys-in-same-order fast-path in `_scrml_reconcile_list`** — skip LIS entirely when the new key sequence == old. React/Svelte precedent. Anticipated saving: ~50% on partial-update.
   - **(b) Batched reconciliation at microtask boundary** — when multiple `@cell = ...` writes happen in the same synchronous turn, batch the reconciliation pass. Vue 3 next-tick precedent. Anticipated saving: 20-40% on partial-update; large on Select row indirectly.
   - **(c) Derived-dep tracking precision** — narrow the dep set on count-derived effects to only fire when the count actually changes. Anticipated saving: moderate.

### §3.3 Acceptance + cost

Same shape as Phase 2.1.

**Cost-class:** ~4-6h dispatch.

---

## §4. Phase 2.3 — swap-rows attribution

### §4.1 Hotspot

`effect_scheduling` = 1.146ms exclusive (62% of swap wall) + `reconcile_list` = 0.659ms (36%).

A swap reuses 998 of 1000 keys but still walks the full LIS pipeline. Effect scheduling fires both list-render AND count-derived (which shouldn't actually change on a swap — the counts are invariant). Over-firing.

### §4.2 What Phase 2.3 produces

A SCOPING at `docs/changes/runtime-perf-phase-3-swap-rows/SCOPING.md`. Mostly overlaps with Phase 2.2 candidates (a) + (b) + (c). May fold into Phase 2.2's SCOPING as a parallel section rather than its own doc.

**Cost-class:** ~4-6h dispatch (may collapse into 2.2).

---

## §5. (Optional) Phase 2.4 — bulk-insert attribution

### §5.1 Hotspot

`reconcile_list` = 37.433ms exclusive (71% of create-1000 wall) + `dom_write` = 7.120ms (13%).

Bulk-insert dominated by reconcile pipeline + DOM construction. Vanilla baseline (27.8ms) is the per-row DOM mutation floor; scrml at 52ms is ~1.9× the floor — substantial but not catastrophic.

### §5.2 Disposition

**May fold into Phase 2.1** — bulk-insert subscriber wiring uses the same central registry as select-row. If Phase 3 chip-away (a) "direct-subscribe-on-decl" lands, bulk-insert benefits proportionally without a separate dispatch.

DEFERRED until 2.1 lands + measured impact assessed.

---

## §6. Sequencing

```
Phase 2.1 — select-row attribution               [PA-direct OR scrml-js-codegen-engineer dispatch]
   ↓ produces docs/changes/runtime-perf-phase-3-select-row/SCOPING.md

Phase 2.2 — partial-update attribution           [parallel-OK with 2.1; different runtime paths]
   ↓ produces docs/changes/runtime-perf-phase-3-partial-update/SCOPING.md

Phase 2.3 — swap-rows attribution                [SEQUENCES after 2.1 since effect_scheduling
                                                  changes may compose with 2.1's notify fix;
                                                  candidate fold into 2.2 SCOPING]
   ↓ produces docs/changes/runtime-perf-phase-3-swap-rows/SCOPING.md OR folds into 2.2

(optional) Phase 2.4 — bulk-insert characterization   [DEFERRED until 2.1 lands]
```

**Aggregate Phase 2 cost: ~10-16h** (or 6-10h if 2.4 folds + 2.3 collapses into 2.2).

After Phase 2 lands, each Phase 3 chip-away is its own dispatch (per SCOPING produced).

---

## §7. Risks + mitigations

- **Risk:** byte-identity invariant from S102 PGO Phase 3 work is incompatible with the proposed Phase 3 chip-aways (signal-style direct subscription + per-row reactive scope would change the emit shape). Mitigation: Phase 3 candidates ARE intended bundle-shape changes per the runtime-perf track; document the bundle-shape diff explicitly in each Phase 3 commit message; verify per-op correctness end-to-end (TodoMVC + all unit + integration tests pass).
- **Risk:** narrowing predicates (when can we skip the central registry?) are wrong on some edge case + the fix breaks reactivity for that case. Mitigation: Phase 2 attribution explicitly catalogs single-subscriber-site cells; any cell not statically provably single-subscriber falls back to the central registry. Conservative narrowing.
- **Risk:** happy-dom measurements don't match real-Chrome profile. Q-RUNTIME-OPEN-2 (Playwright real-Chrome path) was deferred-to-data per S103 ratification; if Phase 2.1's attribution turns up a hotspot that's known to behave differently in real browsers (e.g., classList toggle cost), re-trigger that OQ.
- **Risk:** the win from any single Phase 3 chip-away is small (≤10%) + the cumulative cost-class is large. Mitigation: rank Phase 3 candidates by expected saving × likelihood-of-effective; do top-1 first; measure post-fix delta; gate next chip-away on demonstrated impact.

---

## §8. Open questions — RATIFIED S103 (5/5 per PA-lean)

User ratified all 5 OQs per the recorded PA-leans (S103, 2026-05-19). Each OQ closed below; the ratification is load-bearing for sequencing + dispatch shape.

1. **Q-RT2-OPEN-1 — Phase 2.1 dispatch shape.** **RATIFIED: PA-direct.** Runtime source archaeology + write-up; no code changes needed except possibly tiny instrumentation. Engineer dispatch over-shaped for this; reserved for Phase 3 fix work.
2. **Q-RT2-OPEN-2 — Phase 2.1 + 2.2 sequencing.** **RATIFIED: sequential.** Phase 2.1 first; first attribution dive establishes the SCOPING shape that subsequent dives follow.
3. **Q-RT2-OPEN-3 — Phase 2.3 fold into Phase 2.2.** **RATIFIED: fold.** Swap-rows attribution covered as a parallel section inside the Phase 2.2 partial-update SCOPING. Simpler structure; Phase 3 chip-aways will likely land as a single dispatch covering both ops.
4. **Q-RT2-OPEN-4 — Phase 2 + Phase 3 dispatch boundary.** **RATIFIED: strict separation.** Phase 2 produces SCOPING only; Phase 3 fixes are separate dispatches. Preserves methodology rigor + lets user review Phase 3 SCOPING before authorizing fix work.
5. **Q-RT2-OPEN-5 — Real-Chrome validation timing.** **RATIFIED: defer to post-fix.** Happy-dom attribution is sufficient signal for Phase 3 design; Playwright real-Chrome validation runs after at least one Phase 3 chip-away lands.

**Operational consequences:**

- Phase 2.1 starts as PA-direct work (no Agent dispatch). Output: `docs/changes/runtime-perf-phase-3-select-row/SCOPING.md`.
- Phase 2.2 starts AFTER Phase 2.1 lands. Output: `docs/changes/runtime-perf-phase-3-partial-update-and-swap/SCOPING.md` (single SCOPING covering both ops per §3 fold).
- Phase 2.3 absorbed into Phase 2.2; no separate dispatch.
- Phase 3 dispatches require their own user authorization at SCOPING-readiness time (one per chip-away).
- Real-Chrome P1.D-style dispatch is NOT pre-authorized; will surface as a separate ratification once Phase 3 lands.

---

## §9. Tags

#runtime-perf #phase-2 #attribution #select-row #partial-update #swap-rows #notify-subscribers #legacy-subscribers #reconcile-list #effect-scheduling #data-driven #s103 #p1c-confirmed
