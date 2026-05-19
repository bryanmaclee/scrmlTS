---
title: Profile-Guided Optimization — SCOPING + phased chip-away ladder
date: 2026-05-18
session: S102
authority: S101 user direction ("Profile-guided optimization — chip away wherever we can") + S94 perf characterization baseline
baseline_doc: docs/changes/perf-characterization/CLOSURE-ANALYSIS-COST.md (S94, 2026-05-15)
status: SHIPPED S102 — Phase 1 + Phase 2 + Phase 3 ALL CLOSED end-to-end. Cumulative trucking-dispatch pipeline reduction 2326ms → ~880ms median = −62%. Byte-identical output verified across all Phase 3 landings. S94 hypothesis REFUTED (actual hot path = post-fn-name-mangle 58% + detect-runtime-chunks 33% of emit-client, not the predicted emit-bindings + emit-reactive-wiring at 2.6%). v0.3.3 tag (`5815cf6`) carries the wave. See `docs/changes/pgo-phase-2-scoping/` + `docs/changes/pgo-phase-3-scoping/` for sub-wave SCOPINGs (both also SHIPPED).
---

# Profile-Guided Optimization — SCOPING

## What this doc is for

S101 close named **profile-guided optimization** as a user-authorized incremental track: *"chip away wherever we can."* This SCOPING grounds the work in S94's perf-characterization data, structures it into a 3-phase ladder, and names dispatch-ready Phase 1 items.

**Bottom line up front:**

- **CG (codegen) is the elephant** — 908 ms / 78% of pipeline on adopter-scale trucking-dispatch corpus (108 files). Every other stage combined is ~22%.
- **DG (dependency graph) is the super-linear surprise** — per-file Δms grew 8.5× across a 28→108 file sweep. At 108 files only 59 ms, but the slope is the concern at >500-file scale.
- **AG + RS + route-splitter** (the v0.3.0 closure-analysis investment) are NOT bottlenecks — 0.35% + 2.5% respectively. PGO should NOT target them at this time.
- **Per-stage instrumentation exists at api.js level** (`stage()` helper at line 551) but CG and RS have NO sub-stage instrumentation. Phase 1 of PGO is filling that data gap.

Per user direction "chip away wherever we can," Phase 1 is the low-friction infrastructure work that ENABLES future chip-aways. Without Phase 1's data, Phase 2/3 are guesses.

---

## §1. Authority chain

1. **S101 user direction** — *"formFor as the v0.4 anchor → chip away at profile-guided optimization wherever we can."* User-authorized incremental approach.
2. **S94 perf characterization** at `docs/changes/perf-characterization/CLOSURE-ANALYSIS-COST.md` — established the load-bearing baseline numbers. CG = 78%, DG super-linear, RS/AG sub-1%. This SCOPING extends the recommendation surface in §"Recommendations / concerns surfaced" of that doc.
3. **pa.md Rule 3** — right answer beats easy answer. The easy answer is "optimize the first thing that looks slow." The right answer is "instrument first, measure, optimize the actual hotspots." Phase 1 IS the right answer.
4. **PIPELINE.md** at `compiler/PIPELINE.md` — per-stage contracts; line 2336 captures the v0.3 closure-analysis cost expectation (validated by S94 at 0.35%).

---

## §2. Phased ladder

### Phase 1 — Instrumentation infrastructure (THIS SESSION dispatch-ready; ~5-10h)

The data substrate. Without these, Phase 2/3 are stabs-in-the-dark.

#### P1.1 — CG sub-stage timing (PRIMARY TARGET, ~3-5h)

**Problem:** CG is 78% of pipeline cost but only ONE `[CG] Nms` line appears in verbose logs. The per-file inner loop at `codegen/index.ts:322` and `:488` iterates 108 files on trucking-dispatch without per-file or per-emit instrumentation.

**Surface:**
- Extend `compiler/src/codegen/index.ts` with sub-stage timing wrappers around each emit-* call (emit-html / emit-bindings / emit-reactive-wiring / emit-server / emit-validators / emit-engine / emit-form-controls / emit-event-wiring / emit-messages / emit-lift / etc.).
- Sum per-emit timings across the file loop → report aggregate per-emit cost.
- Identify the top-5 per-emit hottest paths.

**Implementation shape:**
- Add a `codegenStage(name, fn)` helper in `codegen/index.ts` that mirrors `api.js:551`'s `stage()` shape.
- Track per-emit running totals in a Map keyed by emit-name.
- At end of file-loop, log aggregated `[CG-EMIT] name: Nms (M%)` lines when `--debug-perf` flag is set.
- DO NOT log unconditionally — adds overhead to every compile.

**Gate:** `--debug-perf` flag (NEW). Propagates through CLI → compileScrml opts → CG. When unset, no instrumentation overhead.

**Acceptance criteria:**
- `bun scrml compile examples/23-trucking-dispatch --debug-perf` outputs per-emit breakdown.
- Top-5 emit hottest paths identified.
- Zero overhead when flag unset (verified via warm-run delta < 1ms).

#### P1.2 — RS Component timing (~1-2h)

**Problem:** S94 noted *"Per-component RS breakdown could not be measured without instrumenting compiler source."* RS is 3.85 ms on trucking — not a current bottleneck, but the data gap is cheap to close.

**Surface:**
- Extend `compiler/src/reachability-solver.ts` with `performance.now()` wraps around each component-1..5 + outer-fixpoint call.
- Same `--debug-perf` gate.
- Output: `[RS-COMPONENT] N: Nms` for each component.

**Acceptance criteria:**
- `bun scrml compile examples/23-trucking-dispatch --debug-perf` outputs RS component breakdown.
- Numbers sum to within ±1ms of the existing `[RS] Nms` line.

#### P1.3 — DG sub-step timing + per-file growth tracking (~2-3h)

**Problem:** DG is the one stage with super-linear scaling (S94 Δms 0.064 → 0.546 per added file, 8.5× growth). The cause is unknown — edge-emission size growing? Cross-file lookup repetition?

**Surface:**
- Extend `compiler/src/dependency-graph.ts` (or the DG pipeline entry) with per-file iteration timing + cross-file resolution timing as separate categories.
- Sample the per-file iteration time at 4 evenly-spaced points through the file loop (to identify if cost grows AS the corpus is processed, not just AS the corpus gets larger).
- Output: `[DG-PER-FILE] Nms across F files (avg M ms/file, first-quarter avg P ms, last-quarter avg Q ms)`.
- Output: `[DG-CROSS-FILE] Nms`.

**Acceptance criteria:**
- Cost decomposition surfaces whether DG's super-linear slope is (a) per-file work growing as corpus grows OR (b) cross-file resolution doing repeated lookups against a growing structure.

#### P1.4 — Baseline benchmark capture (~1-2h)

**Problem:** S94 measured one machine, one session. No checked-in baseline. Future PGO work needs a "did this regress?" check.

**Surface:**
- NEW `scripts/benchmark-perf-baseline.ts` — runs the 7-corpus harness (hello / counter / remote-data / contact-book / TodoMVC / multifile / trucking-dispatch) with 6 runs each (1 warmup discarded), captures median per-stage timings.
- Output: `benchmarks/perf-baseline.json` with timestamp + commit SHA + per-corpus per-stage medians.
- NEW `scripts/perf-regression-check.ts` — diff current run vs baseline; flag any stage >10% slower as potential regression.
- Pre-push hook integration DEFERRED to Phase 2 — Phase 1 just captures the baseline.

**Acceptance criteria:**
- `bun run scripts/benchmark-perf-baseline.ts` produces `benchmarks/perf-baseline.json` (committed).
- `bun run scripts/perf-regression-check.ts` runs against current main, outputs delta report.

#### P1.5 — `--debug-perf` flag wiring (~0.5-1h, threads through P1.1-P1.3)

**Surface:**
- CLI flag at `compiler/src/cli.ts` (or wherever `bun scrml compile` entry lives) — `--debug-perf` toggles boolean.
- Threads through `compileScrml` opts → all sub-stage instrumentation.
- README + tutorial mention as a power-user feature.

### Phase 2 — Targeted profiling (~5-15h, depends on Phase 1 data)

Once Phase 1 lands, the data tells us which Phase 2 items are highest-leverage.

#### P2.1 — Top-3 CG emit-* deep-dive (data-driven from P1.1)

The S94 recommendations name three likely candidates:
- `emit-bindings.ts` + `emit-reactive-wiring.ts` for per-cell wiring emission (scales with state-cell record count — trucking has 362 across 253 scopes per `[SYM]` verbose log).
- `emit-server.ts` for SQL-batching codegen path.
- `emit-html.ts` for string concatenation hot loops.

P1.1 data will confirm or refute these. **NO optimization work in P2.1 itself** — this is the deep-dive that identifies what P3 optimizes.

#### P2.2 — DG super-linear root-cause investigation (data-driven from P1.3)

P1.3 data answers the (a) vs (b) question. Investigation surfaces the actual sub-component growing super-linearly.

#### P2.3 — Cold-vs-warm startup cost characterization

S94 noted warm runs are ~18% faster than cold. Adopter `scrml compile` invocations are cold. This is a v0.4+-relevant cost (long-running `scrml dev` amortizes).

**Surface:**
- Measure: which stages have hot path-caching vs cold path-recomputing?
- Candidates: stdlib auto-gather (~72 files extra on trucking; cold-parsed every time?), Acorn parse cache, type-registry build.

### Phase 3 — Optimizations (data-driven; revised post-P2.1+P2.2 — S102)

> **Post-P2 reordering (S102, supersedes the prior anticipated candidates).** P2.1's empirical breakdown of emit-client REFUTED the S94 hypothesis that emit-bindings + emit-reactive-wiring were the hot paths (combined 2.6% of emit-client). P2.2 isolated `findOwningRenderDGNode` (O(n) linear scan) as the DG super-linear culprit, refuting the V8 hash-rehash hypothesis. Phase 3 candidates re-ranked by measured impact.
>
> **Detailed Phase 3 SCOPING + dispatch plan lives at:** `docs/changes/pgo-phase-3-scoping/SCOPING.md` (S102).

**Re-ranked candidates by measured impact:**

- **P3.A** — Collapse fnNameMap rewrites into a single multi-pattern regex (or proper tokenizer pass). Target: `post-fn-name-mangle` (~545ms, 58.1% of emit-client on trucking). Anticipated saving: 50-80% of that = **~275-435ms** = ~12-19% of total pipeline. Highest absolute leverage.
- **P3.B** — Tag runtime-chunk-relevance during existing emit walks (eliminate the separate `detectRuntimeChunks` second-pass walk). Target: `detect-runtime-chunks` (~306ms, 32.6% of emit-client). Anticipated saving: ~80% = **~245ms** = ~11% of total pipeline.
- **P3.C** — AST-walk-derived owner stack for `findOwningRenderDGNode` (eliminate the per-emission O(n) linear scan; track current enclosing RenderDGNode in a stack during the existing `sweepNodeForAtRefs` recursion). Target: ~31ms findOwning + ~33ms emitMarkupReadEdge (93% sub-call to findOwning). Anticipated saving: ~30ms on trucking = ~40% of markup sweep = **~18% of DG total**. At >500-file horizon this slope is what kills DG.

**Combined Phase 3 chip-away potential: ~520-680ms of trucking-dispatch's 2326ms pipeline = 22-29% speedup if all three land.**

**Retired candidates (no longer Phase 3 priorities, per P2 data):**

- ~~P3.1 — String-builder pattern for emit-* concatenation~~ → emit-html is 2.3% of CG; not hot enough to chase.
- ~~P3.2 — Memoize per-cell emit-bindings/emit-reactive-wiring~~ → combined 2.6% of emit-client (S94 hypothesis refuted).
- ~~P3.3 — Index DG cross-file lookups~~ → cross-file is 6% of DG; the slope source is per-file work (P2.2 finding).
- **Still on the long-horizon list (not retired, just not v0.4-anchor):**
  - P3.4 — Stdlib parse-cache (Phase 2.3 not yet run; cold-vs-warm characterization pending).
  - P3.5 — Parallel codegen across files (largest architectural lift; deferred until at least P3.A + P3.B + P3.C land + show whether single-thread is fast enough at adopter scale).

**Discipline (unchanged):** every P3 item lands with a before/after benchmark vs `benchmarks/perf-baseline.json` (P1.4 baseline). No "felt faster" PGO work without measurement.

---

## §3. Risks + mitigations

- **Risk: instrumentation overhead leaks into production builds.** Mitigation: hard gate on `--debug-perf` flag; default OFF; warm-run delta check < 1ms before commit.
- **Risk: Phase 1 instrumentation breaks existing test counts.** Mitigation: Phase 1 dispatches isolated to instrumentation-only files; pre-commit test gate catches regressions; rollback path is single revert.
- **Risk: P1.4 benchmark machine variance.** Mitigation: baseline JSON includes machine fingerprint (CPU model, RAM, OS); regression-check has tolerance band (~10%) calibrated to observed warm-run jitter.
- **Risk: Profiling reveals nothing surprising — i.e., already-known emit-bindings is hot, no architectural fix.** Mitigation: this is FINE. Negative profiling result is valuable signal that the hot path is the existing structure, not an algorithmic bug. P3 still has chip-away surface (string-builder pattern, memoization).
- **Risk: User changes priority mid-Phase-1.** Mitigation: each P1.* item is self-contained with isolated commit cluster; partial Phase 1 still produces partial-but-useful data.

---

## §4. Decomposition — Phase 1 dispatch ordering

If user authorizes Phase 1 dispatch, recommended order:

1. **P1.5 — `--debug-perf` flag wiring FIRST** (small, threads through all others).
2. **P1.1 — CG sub-stage timing** (highest-data-value; CG is 78% of pipeline).
3. **P1.4 — Baseline benchmark capture** (low-friction; produces shippable artifact regardless).
4. **P1.2 — RS component timing** (small, closes S94 data gap).
5. **P1.3 — DG sub-step timing** (lowest priority within Phase 1 because DG is currently 4% of pipeline; super-linear concern only at >500 files).

**Parallelizability:** P1.5 is the precondition for P1.1/P1.2/P1.3. After P1.5 lands, P1.1+P1.2+P1.3 can dispatch in parallel (different files, no merge conflicts likely). P1.4 is independent.

**Anticipated commit count:** 5 commits (one per P1.*).

**Anticipated test deltas:** zero (Phase 1 is instrumentation-only, no behavior changes; existing 12,660 tests should pass).

---

## §5. Open questions to surface to user BEFORE Phase 1 dispatch

1. **Q-PGO-OPEN-1 — Dispatch authorization.** Authorize Phase 1 (~5-10h aggregate) to run via dev-agent dispatches in parallel? Or PA-direct work on the smaller items (P1.4 + P1.5 are PA-direct shape; P1.1 / P1.2 / P1.3 are dispatch shape)?
2. **Q-PGO-OPEN-2 — `--debug-perf` naming.** Is `--debug-perf` the right flag name? Alternatives: `--profile`, `--perf`, `--bench`, `--timings`. (PA recommends `--debug-perf` — explicit + matches existing `--verbose` shape + doesn't conflict with future `--profile-import` shape.)
3. **Q-PGO-OPEN-3 — Phase 2 trigger threshold.** When does Phase 1 data say "enough; let's start Phase 2"? Default: complete the Phase 1 dispatch wave, surface the data, user decides on Phase 2 scope. Or set a numeric trigger (e.g., if P1.1 surfaces a single emit-* >30% of CG time, P2.1 fires immediately)?
4. **Q-PGO-OPEN-4 — Cross-with-formFor sequencing.** formFor SCOPING (sibling doc this session) has its own deep-dive recommendation. Do formFor + PGO run truly parallel (different work tracks), or sequence (PGO Phase 1 lands first, then formFor deep-dive, then PGO Phase 2)? PGO Phase 1 is instrumentation-only with zero behavior change — should compose with any other work track.
5. **Q-PGO-OPEN-5 — Baseline rebase cadence.** P1.4 captures a baseline at current HEAD. Future commits will introduce expected changes (formFor will add codegen cost). When does the baseline get rebased? PA recommends: rebase on every release tag (v0.X.Y bump = baseline rebase), with the prior baseline retained in `benchmarks/perf-baseline-vNNN.json` for trend analysis.

---

## §6. Anticipated SPEC delta surface

**Phase 1: ZERO SPEC deltas.** Instrumentation is implementation-only.

**Phase 2: ZERO SPEC deltas.** Profiling is implementation-only.

**Phase 3: ZERO TO MINIMAL SPEC deltas.** Most P3 candidates (memoization, indexing, parallel codegen) are implementation. The one possible SPEC touch is if P3.5 (parallel codegen) surfaces an order-dependence that needs normative ordering language at PIPELINE.md or §47 (output naming). Low risk; data-driven.

---

## §7. Family-precedent — none yet

PGO is not a family with members. It's an open-ended "chip away" track. The Phase 1/2/3 ladder is the convention; future PGO chip-aways should follow the same shape:

1. Measure first (instrumentation).
2. Identify hot path (profiling).
3. Optimize the hot path (data-driven implementation).
4. Verify the optimization (benchmark vs baseline).
5. Commit + rebase baseline.

This SCOPING is the canonical reference for PGO methodology going forward. Future PGO dispatches cite this doc + the S94 perf-characterization doc as authority.

---

## §8. Tags

#pgo #profile-guided-optimization #s101-user-authorized #s94-perf-characterization-baseline #phase-1-instrumentation #phase-2-profiling #phase-3-optimization #cg-78-percent #dg-super-linear #debug-perf-flag #incremental-chip-away
