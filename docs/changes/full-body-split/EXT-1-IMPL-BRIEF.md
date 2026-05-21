---
tags: [implementation-brief, ext-1, multi-batch-cps, body-split, S114, full-body-split]
status: dispatch-ready
date: 2026-05-21
session-opened: S114
audience: PA (orchestration) + scrml-dev-pipeline dispatches
authority_chain:
  - Ext 1+3+2 scope-dive — `scrml-support/docs/deep-dives/ext-1-3-2-full-body-split-scoping-2026-05-21.md`
  - Body-split soundness DD — `scrml-support/docs/deep-dives/body-split-soundness-design-2026-05-08.md` (S1-S5 predicates)
  - Body-split integration DD — `scrml-support/docs/deep-dives/body-split-integration-and-residual-design-2026-05-08.md` (predecessor §3.1 algorithm)
  - S72 ratification (A9 min-viable — Ext 4 + Ext 5 LANDED)
  - S114 user override — "asap and safe to impl"
---

# Ext 1 — multi-batch CPS — implementation brief

Per the Ext 1+3+2 scope-dive (S114, 1109L) §B.1-§B.6. Six sub-steps; 40-50h total; all 5 predicates (S1 atomicity / S2 deterministic-replay / S3 monotonicity-preserving-ordering / S4 failure-mode-preservation / S5 replay safety) CLEAN at every sub-step.

## What Ext 1 is

The A9 min-viable body-split (Ext 4 + Ext 5, S72 ratified) splits a function body into ONE server batch. Ext 1 extends to N batches — a body crosses the seam multiple times, with non-monotone batches in between, where each batch is independently `!`-typed (Ext 4 composition) + independently idempotency-keyed (Ext 5 composition lifted to per-batch via M1.4).

Cross-batch durable write deps that cannot be safely reordered: **statically rejected** with `E-CPS-MULTIBATCH-REORDER`. `<machine>` `.advance()` crossing batch boundaries: **statically rejected** with `E-CPS-MULTIBATCH-MACHINE-CROSSING`. Admissible cross-batch parameter forwarding: marshalled forward (the value rides as a param to the second stub).

## What Ext 1 is NOT

- NOT cross-function (interprocedural CPS) — that's Q7-ratified-deferred to v0.3.0+ at ~200-400h Links territory. Ext 1's body-DG (M1.2) + planner (M1.3) are per-function-scoped. Future cross-function work would compose, not collide.
- NOT a body-split for `^{}` meta blocks — S114 Approach C ratified `^{}` to scrml-native; Ext 1 operates at server-fn-call sites within `fn` bodies, NOT inside `^{}`. Zero interaction surface.
- NOT introducing source-level `async`/`await` — emitted JS keeps the existing Ext 4 wrapper shape; scrml-source-side stays uncolored per §19.9.8 (S114 standing rule).

## Dispatch sequencing — six sub-steps, intra-extension dependency graph

```
M1.1 → M1.2 → M1.3 → M1.4 ∥ M1.5 → M1.6
```

(M1.4 + M1.5 parallelize after M1.3 — different files; M1.6 lands after M1.5 — spec ratifies as-shipped behavior.)

| Sub-step | Description | Est. | Files | Predicate verdict |
|---|---|---|---|---|
| **M1.1** | `CPSSplit` type lift to multi-batch | 3-4h | `route-inference.ts` (extend type only) | CLEAN (structural; no semantic surface) |
| **M1.2** | body-DG builder (NEW FILE) | 7-9h | NEW `body-dg-builder.ts` | CLEAN |
| **M1.3** | multi-batch planner (NEW FILE) | 10-12h | NEW `cps-batch-planner.ts` + `route-inference.ts:2666-2768` | CLEAN |
| **M1.4** | per-batch monotonicity classifier lift | 4-5h | `monotonicity-analyzer.ts:81-86,325,422`; `emit-server.ts:812`; `emit-functions.ts:200-215` | CLEAN (strengthened) |
| **M1.5** | multi-stub emit + client-wrapper multi-await | 10-12h | `emit-server.ts:580-749,801-984`; `emit-functions.ts:295-518` | CLEAN |
| **M1.6** | SPEC §19.9.9 ratification + §19.6.7 forward-ref promotion | 6-8h | `SPEC.md` | CLEAN (spec edit) |

---

## M1.1 — `CPSSplit` type lift to multi-batch

**Replace** the flat `serverStmtIndices: number[]` with `serverBatches: CPSBatch[]` where:

```ts
type CPSBatch = {
  indices: number[];
  monotonicity: MonotonicityVerdict;
  idempotencyTag: string;
};
```

Keep `serverStmtIndices` as a derived getter (flattens batches) for back-compat with callers.

**File ownership:**
- `route-inference.ts:86-110` — extend `CPSSplit` interface + add `CPSBatch` type.
- `route-inference.ts:1155-1250` — `analyzeCPSEligibility` returns single-batch by default (no behavior change yet; the multi-batch planner M1.3 populates multiple batches).
- `monotonicity-analyzer.ts:81-86` — extend `MonotonicityAnalysis` to per-batch (currently per-function).

**Test corpus:** type-system tests verify the back-compat shim. No behavior change yet.

---

## M1.2 — body-DG builder (NEW FILE)

**The load-bearing dive finding.** The existing `dependency-graph.ts` (3160 LOC) is **module-grain** — nodes are functions / reactives / renders / sql-queries / imports / metas / markup-reads. Ext 1 needs **statement-grain** — a DG over a function body's `LogicStatement[]`. Predecessor S72 design dive §3.1 said "reuse `dependency-graph.ts`" but the existing DG is the wrong grain. **NEW body-dg-builder.ts (~400-500 LOC).**

**Input:** `LogicStatement[]` (the `body` field of a `FunctionDeclNode`) + the function's `analyzeCPSEligibility` classification (which statement is server / client / reactive).

**Output:** `BodyDG = { nodes: BodyDGNode[]; edges: BodyDGEdge[] }`.

**Edge construction rules (conservative — over-approximate dependencies):**
- `reads(i, j)` — statement i references an identifier assigned at statement j (state-decl init expression, bare-expr LHS, sql `${}` interpolation).
- `writes(i, j)` — both statements assign to the same `@var` (write-write conflict).
- `awaits(i, j)` — statement i references a value produced by a server call at j (chained CPS).
- `invalidates(i, j)` — statement j is `?{}` non-SELECT and statement i is `?{}` SELECT against the same table (conservative table-name match on the SQL string).
- `control-anchors(i, j)` — statement i is inside the body of an `if` / `match` / `for` at statement j (reorder cannot cross the anchor).

**Tier classification:** each node carries `tier: "server" | "client" | "reactive"` from `analyzeCPSEligibility`.

**File ownership:**
- **NEW** `compiler/src/body-dg-builder.ts` (~400-500 LOC; scale of `monotonicity-analyzer.ts`).
- `compiler/src/codegen/types/body-dg.ts` (or extend `route-inference.ts` exports) — `BodyDGNode` / `BodyDGEdge` interfaces.
- `compiler/src/expression-parser.ts` — reuse `forEachIdentInExprNode` for reads-edge detection (already exposed; no surgery).

**Test corpus (~12-15 fixtures):**
- 3-4 single-statement bodies (trivial cases).
- 3-4 with explicit reads/writes edges (variable cross-references).
- 3-4 with control-flow anchors (if/for).
- 2-3 with sql-invalidates (table-name match heuristic).
- 1-2 with chained server calls (awaits edges).

**Assertions:** for each fixture, exact edge list match against expected DG. Edge-direction errors caught here, not downstream.

**Why CLEAN under S1-S5:** DG construction is observation, not transformation. Statement count unchanged; per-statement semantics unchanged. The DG is the substrate the reorder algorithm (M1.3) uses to preserve ordering — this sub-step just records the edges.

---

## M1.3 — multi-batch planner (NEW FILE)

**The substantive Ext 1 algorithm.** Given a body-DG with tier-classified nodes, produce a multi-batch plan.

**Algorithm (per predecessor §3.1):**
1. Topologically sort the DG, preferring orderings that group contiguous server runs.
2. Coalesce contiguous server runs into batches.
3. Detect irreducible cross-batch durable write dependencies (write→client-read→write pattern across batches).
4. Detect `<machine>` transitions crossing batch boundaries (§3.6.E case).
5. If any irreducible dep: return `{ status: "reject", offendingEdge, diagnostic: "E-CPS-MULTIBATCH-REORDER" }`. Otherwise: return `{ status: "ok", batches: CPSBatch[] }`.

**Coalescing rule:** two server statements i, j with i < j (in topological order) coalesce into the same batch iff no client-tier statement exists between them in the topological order. (Otherwise, the client statement forces a wait for batch i to commit before batch j can start — a new batch boundary.)

**Cross-batch dep handling:** statement i in batch B writes value V durably; client statement k (k > i) reads V; statement j in batch B' (B' > B) reads V again. Two sub-cases:
- V is a `@reactive` cell + the second batch reads it via parameter passing → **admissible** (marshalled forward as a parameter to the second stub).
- V is a SQL-row identity needing transactional consistency → **reject with E-CPS-MULTIBATCH-REORDER**.

**`<machine>` crossing:** any `<machine>` `.advance()` call that crosses batch boundaries is a guard-violation candidate. **Reject with E-CPS-MULTIBATCH-MACHINE-CROSSING** (new error code, ride-along with E-CPS-MULTIBATCH-REORDER's diagnostic).

**File ownership:**
- **NEW** `compiler/src/cps-batch-planner.ts` (~500-700 LOC — substantial algorithm).
- `compiler/src/route-inference.ts:2666-2768` — call site for the planner (after `analyzeCPSEligibility` succeeds).
- SPEC §19.9.9 (new sub-section, M1.6) — ratifies the algorithm + diagnostic shape.
- §34 error catalog — register E-CPS-MULTIBATCH-REORDER + E-CPS-MULTIBATCH-MACHINE-CROSSING (lands at M1.6).

**Test corpus (~18-22 fixtures):**
- 4-5 single-batch (current behavior; planner returns 1 batch).
- 4-5 two-batch admissible (planner returns 2 batches with correct membership).
- 3-4 three-batch admissible.
- 3-4 cross-batch-dep reject cases (E-CPS-MULTIBATCH-REORDER).
- 2-3 machine-crossing reject cases (E-CPS-MULTIBATCH-MACHINE-CROSSING).
- 2-3 parameter-passing forward (V threaded as param; not a reject).

**Assertions:** exact batch membership per fixture; exact error code + offending-edge identification for reject cases.

**Why CLEAN under S1-S5 (S3 is the load-bearing one):**
- S1 atomicity: each batch in the plan is its own transactional envelope server-side. Per-batch atomicity preserved per Q6 verdict (single-process serialization per request). Cross-batch atomicity explicitly NOT promised — this IS the multi-batch shape; §19.6.7 already documents.
- **S3 monotonicity-preserving-ordering: CLEAN UNDER REORDER VERDICT.** The reorder step is observationally equivalent to the unsplit form IF AND ONLY IF the DG edges are conservative. The body-DG (M1.2) is conservative-over-approximate by construction; the topological scheduler respects all edges; the produced schedule observationally equals the source order at every observable cut point. Any topological sort of a data-dependency DAG produces the same observable result (Lam/Wegman list-scheduling). **CLEAN.**
- S4: admissible cases have independent batches; pathological cases statically rejected. Per CPS stub `!`-wrapped via Ext 4 composition.
- S5: each batch independently idempotency-keyed per per-batch monotonicity (M1.4 lift).

---

## M1.4 — per-batch monotonicity classifier lift

**Lift** `monotonicity-analyzer.ts:467 analyzeMonotonicity` from per-function to per-batch. Currently produces `verdicts: Map<functionNodeId, MonotonicityVerdict>`; extend to `Map<functionNodeId, MonotonicityVerdict[]>` (one verdict per batch in source order).

**File ownership:**
- `compiler/src/monotonicity-analyzer.ts:81-86` (`MonotonicityAnalysis` interface) — extend `verdicts` to per-batch.
- `compiler/src/monotonicity-analyzer.ts:325 classifyFunctionMonotonicity` — split into `classifyBatchMonotonicity` (per-batch) + a wrapper returning the function-level verdict for back-compat.
- `compiler/src/route-inference.ts:90-110` — `CPSSplit.monotonicity` (currently `?: "monotone" | ...`) → `CPSSplit.serverBatches[].monotonicity` (per-batch field).
- `compiler/src/codegen/emit-functions.ts:200-215` (Ext 5 idempotency-key emit) — gate on per-batch verdict.
- `compiler/src/codegen/emit-server.ts:812 _ext5Dedup` — gate on per-batch verdict.

**Test corpus (~10-12 fixtures):**
- 3-4 single-batch (verdict unchanged).
- 3-4 two-batch with mixed monotonicity (e.g. batch 0 monotone, batch 1 non-monotone).
- 2-3 two-batch with machine-intrinsic (batch bounded by `.advance()`).
- 1-2 D-CPS-MONOTONE diagnostic per-batch (verbose-only).

**Assertions:** per-batch verdict matches expected; idempotency-key envelope emitted iff batch's verdict is non-monotone.

**Why CLEAN (and STRENGTHENED at S5):** per-function classification was conservative — one verdict gated the whole function. Per-batch classification is strictly finer-grain — monotone batches in a function with at least one non-monotone batch no longer pay the idempotency-key tax. Strictly improves cost without weakening replay safety.

---

## M1.5 — multi-stub emit + client-wrapper multi-await

**emit-server.ts changes:**
- Currently emits one stub per `route` where `route.cpsSplit` is non-null (`emit-server.ts:580-749`).
- Extend to emit `route.cpsSplit.serverBatches.length` stubs, named `_scrml_cps_<fn>_batch_<i>`.
- Each stub gets its own `!`-wrap (Ext 4 composition; per-stub).
- Each non-monotone stub gets its own idempotency-key dedup middleware (Ext 5 per-batch composition).

**emit-functions.ts changes:**
- Currently emits one `await` per CPS function (`emit-functions.ts:295-518`).
- Extend to emit N awaits in topological order, interleaving client statements between them (in source order, modulo the topo-sort applied by the planner).
- Each await wrapped in its own try/catch; per-batch error envelope produces a tagged `__scrml_error` shape (matches existing Ext 4 envelope).

**File ownership:**
- `compiler/src/codegen/emit-server.ts:580-749` — multi-stub emission loop.
- `compiler/src/codegen/emit-functions.ts:295-518` — multi-batch client wrapper emission.
- `compiler/src/codegen/emit-server.ts:801-984` — Ext 4 `!`-wrap (per-stub; mechanical replication).
- `compiler/src/codegen/emit-server.ts:812-984` — Ext 5 dedup middleware (per-stub gating, lifted from per-function per M1.4).

**Test corpus (~15-18 fixtures):**
- 4-5 two-batch emit (verify N=2 stubs emitted; verify wrapper sequences awaits correctly).
- 3-4 three-batch emit.
- 3-4 mixed monotonicity per batch (verify only non-monotone batches get idempotency-key envelope).
- 3-4 error-envelope correctness (force batch K failure; verify caller's `<errorBoundary>` sees tagged error variant with batch identifier).
- 2-3 cross-batch parameter forwarding (admissible cross-batch param-passing per M1.3).

**Assertions:** exact emitted JS shape matches expected; per-batch error envelope contains correct batch index + function name; idempotency-key emitted iff batch verdict is non-monotone.

**Why CLEAN under S1-S5:** per-batch atomicity preserved (each emitted stub is one server request → one transactional envelope per §8.9). Per-batch try/catch in the wrapper catches each batch's failure independently. Earlier-batch commits stand on later-batch failure (predecessor Q3 verdict, §19.6.7).

---

## M1.6 — SPEC §19.9.9 + §19.6.7 enforcer ratification

**Add SPEC §19.9.9** "Multi-Batch CPS — Reorder + Static Reject". Document:
- body-DG construction rules (per M1.2).
- topological-scheduling algorithm (per M1.3).
- cross-batch-dep rejection criteria (E-CPS-MULTIBATCH-REORDER).
- machine-crossing rejection (E-CPS-MULTIBATCH-MACHINE-CROSSING).
- diagnostic shapes + one worked example.

**Promote** §19.6.7's forward-reference to E-CPS-MULTIBATCH-REORDER from "future code" → "implemented in §19.9.9".

**File ownership:**
- `compiler/SPEC.md` — new §19.9.9 (after §19.9.7); ~150-200 lines of spec text + 1 worked example.
- `compiler/SPEC.md:11385-11397` — §19.6.7 forward-reference promotion.
- `compiler/SPEC.md:11697` — §19.9.6 cross-references add §19.9.9.
- `compiler/SPEC.md:15037+` — §34 catalog: register E-CPS-MULTIBATCH-REORDER + E-CPS-MULTIBATCH-MACHINE-CROSSING.
- `compiler/SPEC-INDEX.md` — §19 row note about §19.9.9 addition.

**Test corpus:** N/A (spec edit). Conformance tests are at M1.3.

---

## Dispatch logistics — every sub-step uses this protocol

Each sub-step gets its own `scrml-dev-pipeline` dispatch with `isolation: "worktree"` + `model: "opus"`. The dispatch brief follows the standard 7 mandatory clauses (current as of S114):

1. **F4 startup-verification block** (`pwd` / `git rev-parse --show-toplevel` / `git status --short` / `bun install` / `bun run pretest`).
2. **`git merge main --no-edit`** at startup (S112 — sync to live HEAD).
3. **Predecessor-file check** — `git log --oneline -10 -- <file>` before editing each target.
4. **Coupled-code+test = ONE logical unit** (S113 — commit code + coupled test together; no `--no-verify`).
5. **`isolation: "worktree"`** explicit on the Agent() call (S88).
6. **Path-discipline reminder** + S99 incident counter prefix.
7. **MAPS — REQUIRED FIRST READ** with current commit-SHA + date.

Plus per-sub-step:
- Reference this brief at `docs/changes/full-body-split/EXT-1-IMPL-BRIEF.md`.
- Reference the dive at `scrml-support/docs/deep-dives/ext-1-3-2-full-body-split-scoping-2026-05-21.md` §B.<sub-step>.
- Reference the relevant SPEC sections (§19.9.x neighborhood; §19.6.7 forward-ref).
- Note Ext 4 + Ext 5 are already shipped + compose freely.
- Note `^{}` orthogonality (S114 Approach C — Ext 1 does NOT enter `^{}` bodies).
- Note async/await envelope preserved (S114 §19.9.8 — Ext 1 emits async/await only in compiled JS, existing CPS wrapper shape).

## Soundness predicate gate (every dispatch reaffirms)

Per body-split soundness DD §3.4 + this dive's §B.1-§B.6: each sub-step has a documented S1-S5 verdict (all CLEAN at Ext 1's surface). Dispatch briefs MUST include the per-sub-step verdict line + the agent verifies during implementation that nothing in the actual code regresses the predicate. Sub-steps surface anomalies (e.g. unexpected DG-edge construction) where they touch a predicate's reasoning.

## Estimate roll-up

- M1.1: 3-4h
- M1.2: 7-9h (body-DG builder — the dive's load-bearing surprise)
- M1.3: 10-12h (multi-batch planner — substantive algorithm)
- M1.4: 4-5h
- M1.5: 10-12h (multi-stub emit + client-wrapper multi-await)
- M1.6: 6-8h (SPEC §19.9.9)

**Ext 1 total: ~40-50h.**

Predecessor S72 design dive §5.1 estimated 38h. Expansion +2 to +12h driven primarily by the body-DG builder unaccounted in the predecessor's "reuse `dependency-graph.ts`" framing. Within the S114 "safe to impl" budget — the surprise was structural (the existing DG is module-grain), not behavioral.

## Ratification status — ratified S114

- **Ext 1 prioritization** — S114 user override pulling forward from S72-deferral-to-v0.next+1. *"asap and safe to impl."*
- **S4 amendment** — ratified S114 (the §8.9-transactional-envelope equivalence class for write-in-loop patterns; covered at Ext 2 M2.3, not Ext 1 — but the ratification is the safety gate for the family).
- **^{} Approach C** — ratified S114; Ext 1 doesn't enter that surface.
- **No-async/await language-wide (SPEC §19.9.8)** — ratified S114; Ext 1 preserves the envelope.

## Hand-off — what the next-step PA needs

1. **Dispatch M1.1 first.** Type lift only; should be a clean ~3-4h landing.
2. After M1.1 lands: dispatch M1.2 (the body-DG builder — the load-bearing piece; allocate the 7-9h budget honestly).
3. After M1.2 lands: dispatch M1.3 (the planner).
4. After M1.3 lands: dispatch M1.4 and M1.5 IN PARALLEL (different files; M1.4 = monotonicity; M1.5 = emit).
5. After M1.4 + M1.5 both land: dispatch M1.6 (SPEC ratification).

**Crash-recovery anchor:** the body-DG builder (M1.2) is the substantive new file. If a dispatch stalls on M1.2, the work salvages cleanly — incremental commits per the standard discipline (after every edit, commit immediately).

**Open questions queued for resolution at dispatch time (per dive §I):**
- M1.3's machine-crossing detection precision — false-positive risk on `<machine>` `.advance()` calls within a single batch's serial execution. May need a "machine-crossing only if batch boundary intervenes" refinement at implementation time. Surface to user if the false-positive rate is high enough to be load-bearing.
- M1.5's stub-naming convention — `_scrml_cps_<fn>_batch_<i>` chosen by analogy to existing `_scrml_*` prefix; verify uniqueness against §47 content-addressing collision rules.

## Cross-references

- Ext 3 (conditional-tier emission) — depends on Ext 1 M1.1/M1.2/M1.4; brief queued at `docs/changes/full-body-split/EXT-3-IMPL-BRIEF.md` (not yet authored).
- Ext 2 (loop-aware splitting) — depends on Ext 1 M1.1/M1.2/M1.4 + Ext 3; brief queued at `docs/changes/full-body-split/EXT-2-IMPL-BRIEF.md` (not yet authored).
- Body-split soundness DD §3.4 — S1-S5 predicate framework.
- Body-split integration DD — predecessor §3.1 algorithm sketch + Q1-Q4 verdicts.
- SPEC §19.9.3 (CPS Preservation); §19.9.5 (Auto-`!`-Wrap of CPS Server Stubs — Ext 4); §19.9.6 (Static Monotonicity Classification + Idempotency-Key Replay — Ext 5); §19.9.7 (`.idempotent()` modifier).
- Ext 1+3+2 scope-dive — `scrml-support/docs/deep-dives/ext-1-3-2-full-body-split-scoping-2026-05-21.md` — the authoritative decomposition + per-predicate walk.
