---
title: PGO Phase 2 — emit-client deep-dive SCOPING (data-driven)
date: 2026-05-18
session: S102
authority: PGO P1.1 finding (S102 — `f7ff521`); SCOPING precedent `docs/changes/pgo-scoping/SCOPING.md` §2 Phase 2
baseline: `benchmarks/perf-baseline.json` at HEAD `139bbc5`; refresh-anticipated at HEAD `fb49ced` (P1.3 close) before Phase 2.1 instrumentation lands
status: SHIPPED S102 — P2.1 emit-client sub-decomposition (`c565055`) + P2.2 DG markup-sweep per-call-site characterization (`c79ef54`). KEY FINDING: S94 hypothesis REFUTED — emit-bindings + emit-reactive-wiring combined were only 2.6% of emit-client; actual hot path = post-fn-name-mangle 58% + detect-runtime-chunks 33% = 90.7% of emit-client. The Phase 2 attribution data drove the Phase 3 wave (see `docs/changes/pgo-phase-3-scoping/SCOPING.md`).
---

# PGO Phase 2 — emit-client deep-dive SCOPING

## What this doc is for

S102 PGO Phase 1 (P1.1-P1.5) landed instrumentation across CG / RS / DG sub-stages. Headline finding: **emit-client is 91.4% of CG cost** (~1215ms of 1330ms CG on trucking-dispatch). The next-hottest path (emit-html at 2.3%) is **~38× cheaper**. This SCOPING structures the next chip-away wave per the user-authorized "chip away wherever we can" framing.

**Bottom line:**

- **Phase 2.1 — emit-client sub-decomposition.** Drop one level deeper. emit-client is an umbrella; `generateClientJs` at `compiler/src/codegen/emit-client.ts:650` calls ~15-18 sub-emit functions. Instrument each call site (mirrors P1.1 codegenStage pattern). Identify which sub-emit is the actual hotspot.
- **Phase 2.2 — DG markup AST sweep characterization.** P1.3 surfaced that DG super-linear growth lives in the markup AST sweep loop (~80ms of 103ms). Confirm + isolate the specific Map/Set lookup whose constant factors degrade.
- **Phase 2.3 — Cold-vs-warm startup cost characterization.** S94 noted ~18% warm-up cost; not yet decomposed. Adopter `scrml compile` invocations are cold.

Phase 3 (optimizations) is data-driven from each Phase 2 finding.

---

## §1. Authority + baseline data

P1.1 empirical (trucking-dispatch, 36 input files, post-gather 108 files):

```
[CG-EMIT] emit-client:    1214.8ms (91.4% of CG)
[CG-EMIT] emit-html:        30.5ms ( 2.3% of CG)
[CG-EMIT] emit-server:      30.8ms ( 2.3% of CG)
[CG-EMIT] lint-undefined:   18.1ms ( 1.4% of CG)
[CG-EMIT] emit-tailwind:    10.1ms ( 0.8% of CG)
[CG-EMIT] emit-css:          0.4ms ( 0.0% of CG)
                          ------- ------
                          ~1304ms  98.5% of CG
                            ~20ms   1.5% (un-instrumented: analyze + route-splitter + runtime-union assembly)
```

S94 perf-characterization recommended: *"emit-bindings + emit-reactive-wiring for per-cell wiring emission (scales with state-cell record count — trucking has 362 across 253 scopes per the [SYM] verbose log)."* P1.1 empirically validated emit-client is dominant; Phase 2.1 confirms WHICH sub-emit inside.

emit-client.ts is **1578 lines**; the `generateClientJs(ctx)` entry at line 650 dispatches to:

| Sub-emit | File | LOC | S94 hypothesis |
|---|---|---|---|
| `emitFunctions(ctx)` | emit-functions.ts | ~? | medium |
| `emitBindings(ctx)` | emit-bindings.ts | 763 | **PRIMARY S94 hypothesis** |
| `emitReactiveWiring(ctx)` | emit-reactive-wiring.ts | 1082 | **PRIMARY S94 hypothesis** |
| `emitEventWiring(ctx, fnNameMap)` | emit-event-wiring.ts | ~? | medium |
| `emitEngineSubstrate(fileAST)` | emit-engine.ts | ~? | engine-heavy apps |
| `emitDerivedEngineSubstrateForFile(fileAST)` | emit-engine.ts | ~? | derived-engine apps |
| `emitCrossFileEngineMountsForFile(fileAST, …)` | emit-engine.ts | ~? | cross-file engine mounts |
| `emitEngineHookFiringFunctionsForFile(fileAST)` | emit-engine.ts | ~? | onTransition/onTimeout/onIdle |
| `emitEngineInitialArmsForFile(fileAST)` | emit-engine.ts | ~? | engine init |
| `emitEngineBodyRenderForFile(fileAST, ctx)` | emit-engine.ts | ~? | state-child render |
| `emitDerivedEngineBodyRenderForFile(fileAST, ctx)` | emit-engine.ts | ~? | derived-engine render |
| `emitEnumLookupTables(fileAST)` | emit-enum-*.ts | ~? | enum-heavy apps |
| `emitEnumVariantObjects(fileAST)` | emit-enum-*.ts | ~? | enum-heavy apps |
| `emitDecodeTable(encodingCtx)` | type-encoding.ts | ~? | rare |
| `emitRuntimeReflect(encodingCtx)` | type-encoding.ts | ~? | rare |
| `lines.push(...)` glue | inline | ~? | unlikely hot |

15-16 candidate hot paths. P1.1 lumps all of them as "emit-client." Phase 2.1 separates.

---

## §2. Phase 2.1 — emit-client sub-decomposition (PRIMARY)

### §2.1.1 Surface

Extend `compiler/src/codegen/emit-client.ts:generateClientJs(ctx)` with the same `codegenStage(name, fn)` helper P1.1 added. Wrap each of the ~15 sub-emit calls. When `--debug-perf` set, emit `[CLIENT-EMIT] <name>: <Nms> (<P>% of emit-client)` lines sorted desc by ms.

**Granularity decision:** instrument every `emit*(...)` call site that returns string[]/string; do NOT instrument inline `lines.push(...)` glue or destructure assignments (those are <0.1ms each).

### §2.1.2 Acceptance criteria

1. `bun scrml compile examples/23-trucking-dispatch --debug-perf` outputs a `[CLIENT-EMIT]` breakdown.
2. Sub-emit timings sum to within ±10ms of the existing `[CG-EMIT] emit-client` aggregate.
3. Without flag: zero new output, zero overhead (warm-run delta < 1ms).
4. Pre-commit gate passes (12,660+ tests / 0 fail).
5. Top-3 hottest sub-emits identified — this is the input to Phase 3 chip-away dispatches.

### §2.1.3 Cost-class

~2-4h dispatch shape. Mirrors P1.1 pattern exactly; same helper, same gating, same log channel. Estimated 15 codegenStage wraps + 1 reporter.

### §2.1.4 Dispatch shape

`scrml-js-codegen-engineer` with `isolation: "worktree"`, mirrors P1.1 dispatch shape. The work is structurally identical — one file (emit-client.ts), one helper pattern, one reporter. Phase 2.1 should fire AFTER Phase 1's three landed commits + the P1.4 baseline are pushed (which they are at HEAD `fb49ced`).

### §2.1.5 Anticipated outcomes (predictions, NOT verdicts)

Based on S94 recommendation + LOC heat (emit-reactive-wiring 1082L, emit-bindings 763L, emit-engine.ts ~?L):

- **PRIMARY hypothesis:** `emitReactiveWiring` + `emitBindings` together ≥ 70% of emit-client.
- **SECONDARY hypothesis:** `emitEngine*` family (7 sibling calls) is significant in engine-heavy apps; trucking-dispatch has ~10-15 engines, so combined engine-emit time may be 15-25% of emit-client.
- **NEGATIVE hypothesis:** `emitEnumLookupTables` / `emitEnumVariantObjects` / `emitDecodeTable` / `emitRuntimeReflect` are each < 1% (small data + simple emission).

Phase 2.1 dispatch RESULTS will confirm or refute. Acceptance is data-collection, NOT prediction-correctness.

---

## §3. Phase 2.2 — DG markup AST sweep characterization (SECONDARY)

P1.3 surfaced (`fb49ced`) that DG's super-linear scaling lives in the per-file work loop, NOT cross-file resolution. Specifically: Q1 → Q3 per-file average grows 0.74ms → 5.0ms within a single trucking-dispatch compile (~6.7× growth). DG is currently 4-5% of pipeline; concern is at the >500-file horizon.

### §3.1 Surface

Drop one more level into `compiler/src/dependency-graph.ts` — instrument WITHIN the markup AST sweep loop (per-file loop #4 per P1.3 agent's analysis, ~80ms of 103ms). Identify specific call site(s) growing super-linearly:

P1.3 agent's candidate-list (most likely):
- `creditReader(...)` — Map lookup against `functionNameToNodeId`
- `emitMarkupReadEdge(...)` — multiple Maps + Set updates
- `findOwningRenderDGNode(...)` — walks node registry

All three are inside the markup sweep; each does Map lookups whose constant factors degrade non-linearly under V8 hash-table-rehash heuristics as the Maps fill across file iterations.

### §3.2 Acceptance criteria

1. `--debug-perf` adds a `[DG-MARKUP-SWEEP]` breakdown: per-call-site cumulative ms + per-file growth slope (Q1-Q4 split same shape as P1.3).
2. Identify which of the 3 candidates (or another) has the steepest growth slope.
3. NO optimization in Phase 2.2 — this is the diagnostic that scopes the Phase 3 chip-away.

### §3.3 Cost-class

~2-4h dispatch.

### §3.4 Anticipated outcomes

P1.3 agent's PRIMARY hypothesis: `creditReader` + `emitMarkupReadEdge` together grow 5-7× from Q1 to Q4. Cross-Map cache-coherence + V8 hash-rehash explain most of the slope. Phase 3 candidate: a per-file scratch arena (clear-on-file-boundary) that isolates per-file bookkeeping from the global accumulating state.

---

## §4. Phase 2.3 — Cold-vs-warm startup characterization (TERTIARY)

S94 observed: *"First (warmup) run on trucking was 1402-1435 ms; warm runs settled to 1128-1198 ms (≈18% faster). Reported medians exclude the warmup. Adopters running `scrml compile` cold (CI, fresh terminal) will experience the warmup cost on every invocation."*

Decompose the 18% delta. Candidates per S94:
- Stdlib auto-gather (~72 files extra; cold-parsed every invocation?)
- Acorn parse cache (warm V8 vs cold V8)
- Type-registry build

### §4.1 Surface

Modify the perf-baseline harness (`scripts/benchmark-perf-baseline.ts`) to ALSO measure cold-vs-warm per stage. Per-corpus output gets a second column: cold median (run 1, NOT discarded) vs warm median (runs 2-N).

### §4.2 Acceptance criteria

1. `benchmarks/perf-baseline.json` schema extended: `coldMs` per stage + `warmMs` per stage + `coldWarmDeltaPct` per stage.
2. Identify which stages have the largest cold-vs-warm delta — these are V8 JIT warmup candidates.
3. If a stage has cold-vs-warm delta > 30%, flag for Phase 3 cache investigation.

### §4.3 Cost-class

~2-3h PA-direct (extend the harness PA already authored). Could also dispatch.

---

## §5. Sequencing

Phase 2.1 (emit-client) → 2.2 (DG markup sweep) → 2.3 (cold-vs-warm).

Phase 2.1 is the load-bearing decision: it produces the data that scopes Phase 3.1 (the first real OPTIMIZATION chip-away). Phase 2.2 and 2.3 are parallelizable AFTER 2.1's data lands.

Parallel-dispatch shape:
- **Phase 2.1** → dispatch immediately if user authorizes.
- **Phase 2.2** → parallel-dispatchable; doesn't depend on 2.1 data (different file, different finding).
- **Phase 2.3** → PA-direct; small harness extension.

If running 2.1 + 2.2 in parallel: same precondition (P1.5 plumbing landed at `139bbc5`); both isolation:worktree; no file conflicts (codegen/emit-client.ts vs dependency-graph.ts).

---

## §6. Open questions to surface BEFORE Phase 2.1 dispatch

1. **Q-PGO-PHASE-2-OPEN-1 — Authorize Phase 2.1?** Mirror of P1.1 dispatch shape; ~2-4h; one file (emit-client.ts) + one helper pattern.
2. **Q-PGO-PHASE-2-OPEN-2 — Parallel 2.1 + 2.2?** Both are dispatch-ready + non-overlapping. ~5-7h total walltime if parallel vs serial.
3. **Q-PGO-PHASE-2-OPEN-3 — Phase 2.3 PA-direct or dispatch?** Small enough for PA-direct (~2-3h) which composes with later session work; dispatch trades context for parallelism.
4. **Q-PGO-PHASE-2-OPEN-4 — Phase 3 trigger threshold.** Once Phase 2.1 names the top-3 hotspots, what's the "fire" criterion for Phase 3 chip-aways? Default: each hotspot ≥ 10% of CG gets its own SCOPING + dispatch. Alternative: only fire on hotspots ≥ 20%.

---

## §7. Phase 3 — anticipated chip-away candidates (NOT committed)

Listed for awareness. Each is gated on Phase 2 data confirming the candidate is the actual hotspot.

| Candidate | Trigger | Estimated saving | Anticipated cost |
|---|---|---|---|
| **P3.1 — String-builder vs array.push() in emit-client** | Phase 2.1 confirms a string-concat-heavy sub-emit dominates | ~10-30% on that sub-emit | ~4-8h |
| **P3.2 — Memoize per-cell emission output** | Phase 2.1 names emitBindings or emitReactiveWiring as hot | ~20-40% on per-cell wiring | ~6-12h |
| **P3.3 — Per-file scratch arena for DG** | Phase 2.2 confirms growing-Map hypothesis | ~30-50% of DG | ~5-10h |
| **P3.4 — Stdlib parse-cache** | Phase 2.3 confirms stdlib cold-parse is significant | ~5-10% of total pipeline | ~6-12h |
| **P3.5 — Parallel CG across files** | All Phase 2 lands; embarrassingly-parallel structure | 2-4× on multi-core machines | ~15-30h (concurrency primitives + ordering invariants) |

P3.5 is the largest but also the highest-leverage if CG truly is the dominant cost — Bun's Worker API is mature. Sequenced LAST because the architectural cost is high.

---

## §8. Tags

#pgo-phase-2 #emit-client-target #s102-p1-1-finding #91-4-percent-of-cg #data-driven-scope #parallel-dispatch-ready #s94-recommendation-validation
