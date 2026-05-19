---
title: PGO Phase 3 — Optimizations SCOPING (P3.A + P3.B + P3.C)
date: 2026-05-18
session: S102
authority: PGO Phase 2 findings (P2.1 `c565055` + P2.2 `c79ef54`); supersedes pgo-scoping/SCOPING.md §3 P3.1-P3.5 anticipated candidates
status: SHIPPED S102 — P3.A fnNameMap regex collapse (`efdfcc8` −44% pipeline) + P3.B detect-runtime-chunks fused probe (`b1d3595` −72% cumulative) + P3.B-followup AST-builder `hasResetExpr` flag (`857bf63` −71% additional on residual) + P3.C owner-stack for findOwningRenderDGNode (`8ff11f4` −99.7% on that hotspot). Cumulative wave: 2326ms → ~880ms median = −62% trucking-dispatch pipeline reduction. Below the S94 baseline of 1170ms by ~290ms despite Approach A closure-analysis landing since v0.3.0. Byte-identical output verified across all 4 landings. Two follow-ups DEFERRED (anticipated for future PGO pass): `hasEqualityExpr` flag sibling pattern + markup/for-stmt double-walk fold in detectRuntimeChunks lines 568-570 + 587.
---

# PGO Phase 3 — Optimizations SCOPING

## What this doc is for

Phase 2 produced concrete, measured hot-path data. This SCOPING scopes the three Phase 3 chip-aways that come directly out of that data + their dispatch ordering.

**Wave aggregate:** if all three land at their estimated savings, the pipeline cost on trucking-dispatch drops from ~2326ms to ~1646-1806ms — **22-29% pipeline speedup**.

**Bottom line:**

- **P3.A — fnNameMap regex collapse** (emit-client.ts; ~275-435ms saving)
- **P3.B — detect-runtime-chunks fold into emit walks** (emit-client.ts; ~245ms saving)
- **P3.C — owner-stack for findOwningRenderDGNode** (dependency-graph.ts; ~30ms saving; high importance at >500-file horizon)

Ordering rules:
- P3.A + P3.C dispatched in parallel (different files; no conflict).
- P3.B sequences AFTER P3.A lands (both touch emit-client.ts).

---

## §1. Authority chain

1. **PGO Phase 2.1** (`c565055`) — empirical [CLIENT-EMIT] breakdown on trucking-dispatch identified post-fn-name-mangle + detect-runtime-chunks as 90.7% of emit-client.
2. **PGO Phase 2.2** (`c79ef54`) — empirical [DG-MARKUP-SWEEP] breakdown identified findOwningRenderDGNode (O(n) linear scan) as 42-53% of markup sweep.
3. **PGO Phase 1 P1.4** baseline at `benchmarks/perf-baseline.json` (HEAD `139bbc5`) + `scripts/perf-regression-check.ts` — every Phase 3 commit landing MUST run regression-check against this baseline + record before/after numbers in commit message.
4. **pa.md Rule 3** (right answer beats easy answer) — Phase 3 is data-driven chip-away; the easy answer would be "ship the first idea." The right answer is measure-confirm-measure.

---

## §2. P3.A — fnNameMap regex collapse

### §2.1 Problem

In `compiler/src/codegen/emit-client.ts:generateClientJs`, the `post-fn-name-mangle` post-pass loops over `fnNameMap` and calls `regex.replace` on the joined client buffer for each user function:

```js
fnNameMap.forEach((mangled, original) => {
    const callSiteRegex = new RegExp(`\\b${escapeForRegex(original)}\\s*\\(`, "g");
    clientBuffer = clientBuffer.replace(callSiteRegex, `${mangled}(`);
});
```

(Exact code shape may differ; the agent should locate the actual loop.)

Cost characteristics: O(fnCount × bufferSize) per file × 108 files on trucking-dispatch. Quadratic-effective as both grow with corpus size. P2.1 measured **544.9ms = 58.1% of emit-client = ~25% of total pipeline cost** on trucking.

### §2.2 Proposed fix

**Approach 1 (preferred): single multi-pattern regex.** Build ONE alternation regex with all `original` names + a replacement callback that looks up the matched name in the fnNameMap. Single pass over the buffer instead of N passes.

```js
// Conceptual shape — agent designs the exact form
const allNames = [...fnNameMap.keys()].map(escapeForRegex).join("|");
const combinedRegex = new RegExp(`\\b(${allNames})\\s*\\(`, "g");
clientBuffer = clientBuffer.replace(combinedRegex, (_match, name) => `${fnNameMap.get(name)}(`);
```

**Approach 2 (alternative if Approach 1 hits a wall): proper tokenizer/walker pass.** Walk the buffer once with an identifier-recognizing tokenizer; on each identifier token followed by `(`, check fnNameMap; substitute in place. More code; eliminates regex overhead entirely.

PA recommendation: **start with Approach 1**. If profile shows regex engine itself is the residual cost, switch to Approach 2.

### §2.3 Acceptance criteria

1. `post-fn-name-mangle` [CLIENT-EMIT] time on trucking-dispatch reduced by ≥50% (target ≤272ms vs 545ms baseline).
2. Output is byte-identical to pre-fix (verify via full-suite tests + at least one sample compile with `bun scrml compile` and `diff` against pre-fix output).
3. Pre-commit gate passes (12,660+ / 0 fail).
4. perf-regression-check shows no regression on other stages.
5. Commit message includes before/after numbers measured via `--debug-perf` on trucking-dispatch (median of 3 warm runs).

### §2.4 Risks + mitigations

- **Risk:** Combined regex has a different replacement-priority semantics than per-name loops (e.g., if name A is a prefix of name B, longest-match-first matters). Mitigation: agent must verify alternation ordering OR validate via exhaustive test corpus.
- **Risk:** Edge cases in callSiteRegex (e.g., `await fnName(`, `?fnName(`, member-access). Mitigation: trace existing escapeForRegex usage + brief test cases covering each context.
- **Risk:** Output byte-identical claim fails due to regex semantics change. Mitigation: PA review the diff for at least one trucking-dispatch sample file BEFORE landing.

### §2.5 Cost-class

~6-12h dispatch. Localized to one section of emit-client.ts.

---

## §3. P3.B — detect-runtime-chunks fold

### §3.1 Problem

In `compiler/src/codegen/emit-client.ts`, the `detectRuntimeChunks(fileAST, ctx)` function performs a SEPARATE full AST walk to gate runtime chunk inclusion (derived / lift / timers / animation / reconciliation / utilities / meta / transitions / input / deep_reactive / equality). Runs AFTER the emit-* walks that already touch every node.

P2.1 measured **305.5ms = 32.6% of emit-client = ~13% of total pipeline** on trucking.

### §3.2 Proposed fix

**Tag runtime-chunk-relevance during the existing emit-* walks.** Each emit-* function knows which AST shapes it handles; when it sees a shape that requires a runtime chunk (e.g., emit-reactive-wiring sees a derived cell → tag the `derived` chunk; emit-lift sees a `lift` block → tag the `lift` chunk; etc.), it adds to a `ctx.runtimeChunksUsed: Set<string>` field. After the emit loop, the union of all tagged chunks IS the result — no separate walk needed.

Concretely:
- Extend `CompileContext` with `runtimeChunksUsed: Set<string>` (already present? agent verifies).
- Each emit-* function calls `ctx.runtimeChunksUsed.add("<chunkName>")` at the moment it emits the runtime-chunk-dependent code.
- Remove `detectRuntimeChunks` call from `generateClientJs`.
- Verify the chunk set produced is identical (or strictly superset for safety) to pre-fix.

### §3.3 Acceptance criteria

1. `detect-runtime-chunks` [CLIENT-EMIT] line GONE (or sub-1ms residual).
2. Chunk set produced by emit-tagging is byte-identical (or strict superset — accept extra-conservative) to the pre-fix detectRuntimeChunks output. Verify against trucking-dispatch + every example app.
3. Pre-commit gate passes.
4. `runtimeChunks.json` / scrml-runtime.js content identical pre-fix vs post-fix on at least 5 sample apps.
5. Commit message includes before/after measurements.

### §3.4 Risks + mitigations

- **Risk:** Missed chunk tag in some emit-* function leads to runtime missing-helper error. Mitigation: pre-fix snapshot the chunk set on trucking-dispatch + every example app; verify post-fix produces same-or-superset.
- **Risk:** Tag-during-walk loses the "what shapes does this chunk require" centralized documentation. Mitigation: introduce a `ctx.runtimeChunksUsed.add()` helper with inline JSDoc explaining which chunk is required for which shape; brief audit that the inline doc covers the same shapes detectRuntimeChunks did.
- **Risk:** P3.B + P3.A both touch emit-client.ts → conflict. Mitigation: SEQUENCE — P3.A first, then P3.B. P3.B agent rebases onto P3.A's landing.

### §3.5 Cost-class

~5-10h dispatch. Touches multiple emit-* functions + removes the separate walk.

---

## §4. P3.C — AST-walk-derived owner stack for findOwningRenderDGNode

### §4.1 Problem

In `compiler/src/dependency-graph.ts`, `findOwningRenderDGNode(span)` does an O(n) linear scan over `dgNodes` Map at every markup-read emission site:

```ts
for (const [candidateId, candidate] of dgNodes) {
    if (candidate.kind !== "render") continue;
    // span-containment check
}
```

Cost: O(n) per call × growing calls × growing n = ~quadratic effective. P2.2 measured **31.05ms = 42.2% of markup sweep on trucking**; emitMarkupReadEdge's 33.28ms is 93% sub-call to findOwning.

The JSDoc at `dependency-graph.ts:270-275` already anticipated the fix: *"A-1.3 may replace this with a pre-built interval tree if profiling shows a bottleneck."*

### §4.2 Proposed fix

**AST-walk-derived owner stack.** As the `sweepNodeForAtRefs` recursion descends, track the current enclosing RenderDGNode in a stack. When emitting a markup read, read the stack top instead of running a linear scan.

```ts
// Conceptual shape — agent designs exact form
function sweepNodeForAtRefs(node, ownerStack) {
    if (isRenderDGNodeBoundary(node)) {
        ownerStack.push(renderNodeFor(node));
        // ... recurse ...
        ownerStack.pop();
    } else {
        // ... recurse normally ...
    }
    // emit calls inside the recursion read ownerStack[ownerStack.length-1]
}
```

Eliminates the lookup entirely. Owner-stack maintenance is O(1) per RenderDGNode boundary entered/exited.

### §4.3 Acceptance criteria

1. `findOwningRenderDGNode` [DG-MARKUP-SWEEP] time on trucking-dispatch reduced by ≥80% (target ≤6ms vs 31ms baseline).
2. `emitMarkupReadEdge` time also drops (the 93% sub-call dependency).
3. DG edge graph output byte-identical pre-fix vs post-fix (verify via full-suite tests + diff on the dependency-graph.json output for at least 3 corpora).
4. Pre-commit gate passes.
5. Commit message includes before/after measurements.

### §4.4 Risks + mitigations

- **Risk:** Stack-vs-lookup yields a different owner for some edge case (e.g., orphan node, span-overlap edge case). Mitigation: keep findOwningRenderDGNode as a fallback for the case where stack is empty (which would indicate a missed boundary-push); log a diagnostic if fallback ever fires.
- **Risk:** Need to identify all RenderDGNode-boundary AST shapes to push/pop. Mitigation: agent reads the existing `isRenderDGNodeBoundary` logic OR enumerates the AST shapes that produce render nodes (likely a small set: `if=` blocks, `lift` blocks, `for` blocks, component instances, etc.).
- **Risk:** PA-side conflict with concurrent P3.A or P3.B (different file — no conflict). Confirmed safe to dispatch in parallel with P3.A.

### §4.5 Cost-class

~3-6h dispatch. Localized to the dependency-graph.ts AST walk.

---

## §5. Sequencing + dispatch plan

```
Wave 1 (parallel):
    P3.A — emit-client.ts fnNameMap regex collapse        [scrml-js-codegen-engineer, worktree]
    P3.C — dependency-graph.ts owner-stack                [scrml-js-codegen-engineer, worktree]

Wave 2 (after P3.A lands):
    P3.B — emit-client.ts detect-runtime-chunks fold      [scrml-js-codegen-engineer, worktree]
```

P3.A + P3.C share no files. Parallel-safe. P3.B touches the same file as P3.A but a different region; sequencing prevents the file-delta dance from getting messy.

Each dispatch follows the standard worktree-isolated brief shape (F4 startup verification + S99 path-discipline + S83 commit discipline). Each dispatch's brief includes:
- Reference to this SCOPING + the Phase 2 commit it consumes
- Before/after measurement requirement using `--debug-perf` + `scripts/perf-regression-check.ts`
- Byte-identical output verification (regression-safety)

---

## §6. Open questions BEFORE Wave 1 dispatch

1. **Q-P3-OPEN-1 — Authorize Wave 1 (P3.A + P3.C parallel)?** Both are dispatch-ready per this SCOPING; total ~9-18h walltime if parallel.
2. **Q-P3-OPEN-2 — Approach 1 vs Approach 2 for P3.A.** PA recommends starting with the multi-pattern regex; falling back to a tokenizer if Approach 1 hits a wall. Override if you want the agent to go straight to a tokenizer.
3. **Q-P3-OPEN-3 — Baseline rebase cadence.** Phase 3's measurements are vs `benchmarks/perf-baseline.json` captured at HEAD `139bbc5`. After each P3.* lands, do we rebase the baseline? PA recommends: keep the original baseline as the "before Phase 3" anchor; after all three P3 land, re-baseline and rename `benchmarks/perf-baseline-pre-phase-3.json` for trend tracking.
4. **Q-P3-OPEN-4 — Phase 3 cut as v0.3.3 patch?** All three optimizations land in main → tag v0.3.3 as the "PGO Phase 3" release? PA recommends yes per the v0.3.x patch arc pattern (S101).

---

## §7. Phase 4 anticipated candidates (NOT committed)

After Phase 3 chip-aways land, the remaining Phase 2 surface still includes:

- **P2.3 — Cold-vs-warm startup characterization** (not yet run; harness extension to capture cold-vs-warm deltas per stage).
- **P3.4 — Stdlib parse-cache** (Phase 2.3 dependency).
- **P3.5 — Parallel codegen across files** (largest architectural lift; deferred until Phase 3 lands + Phase 2.3 surfaces remaining hot paths).

Phase 4 SCOPING fires after Phase 3 + P2.3 land.

---

## §8. Tags

#pgo-phase-3 #optimization #post-fn-name-mangle #detect-runtime-chunks #findOwningRenderDGNode #data-driven #parallel-dispatch #measurement-first #s102 #v0.3.3-anchor
