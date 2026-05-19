---
title: Phase 3.B chip-away — partial-update + swap-rows attribution + candidates
date: 2026-05-18
session: S104
authority: Phase 2 SCOPING `docs/changes/runtime-perf-phase-2-scoping/SCOPING.md` §3 + §4 (Q-RT2-OPEN-3 ratified fold — swap absorbs into partial-update SCOPING); P1.B+P1.C data (`6bc5128` + `448fe89`); Phase 3 select-row precedent at `docs/changes/runtime-perf-phase-3-select-row/SCOPING.md`
phase_parent: docs/changes/runtime-perf-phase-2-scoping/SCOPING.md
status: SCOPING DRAFTED — OQs surfaced for user ratification; not yet dispatched
---

# Phase 3.B chip-away — partial-update + swap-rows

## Headline

Two ops, two hotspots, four candidates. Per Phase 2 SCOPING §3 + §4 (ratified fold):

| Op | happy-dom wall | Chrome wall (v0.3.3) | vs Vanilla (Chrome) | Hotspot ms / % wall |
|---|---:|---:|---:|---|
| **partial-update** | 1.40ms | **1.00ms** | **scrml WINS** (Vanilla 2.60ms) | `reconcile_list` 0.762ms (54%) + `effect_scheduling` 0.613ms (44%) |
| **swap-rows** | 1.85ms | 2.20ms | Vanilla 1.00ms — 2.2× slower | `effect_scheduling` 1.146ms (62%) + `reconcile_list` 0.659ms (36%) |

**Counter-intuitive Chrome result for partial-update:** scrml is the OUTRIGHT WINNER on partial-update in real Chrome (1.00ms vs Vanilla 2.60ms, React 4.65ms, Svelte 4.10ms, Vue 11.20ms). The happy-dom slowness was an environment artifact — Chrome's optimized array methods + DOM mutations expose less of the LIS overhead. **Phase 3.B's partial-update candidates are happy-dom-anchored; deploying them may save happy-dom wall but the Chrome win is already real.**

**swap-rows is the genuine remaining gap:** 2.20ms vs Vanilla 1.00ms in Chrome = 2.2× the floor. This is the next-largest cumulative recovery opportunity after Phase 3.A select-row.

## §1. Authority + Phase 2 attribution recap

**P1.C reference data** (happy-dom, v0.3.3 HEAD `6bc5128`, TodoMVC 1000 rows):

- partial-update: 100 items have `.completed` toggled. ONE `@todos = newArray` write (or per-item `.completed` writes) fires effect chain.
- swap-rows: indices 1 and 998 of `@todos` are swapped. TWO Proxy `set` writes fire on indices "1" + "998" + "length".

The hotspots:

- **`_scrml_reconcile_list` (runtime-template.js:1237-1376)** — keyed list reconciliation. Fast paths exist for empty target + bulk-create-from-empty. NO fast path for "same keys in same order." NO fast path for "small number of moves."
- **`_scrml_trigger` (runtime-template.js:2382-2403)** — per-prop precise subscription dispatch via `_scrml_prop_subscribers` WeakMap. Each fire iterates subscriber set (allocated via `[...effects]`); each effect wrapped in try/catch.

## §2. End-to-end pathway walks

### §2.1 partial-update — happy-dom 1.40ms

**Op shape:** TodoMVC `.partialUpdate()` mutates `.label` on every 10th item across 1000 rows. The bench API uses a per-item proxy write: `@todos[i].label = "X"` (~100 writes) OR sometimes `@todos = newArray` (one whole-array swap). Specific shape depends on bench-scrml's `__bench` implementation (verify in survey).

**Pathway A (per-item proxy writes — likely):**

1. Each `@todos[i].label = newValue` fires the Proxy `set` trap on the per-item Proxy (`runtime-template.js:2463+`).
2. `Reflect.set` writes through. `oldValue !== newValue` → `_scrml_trigger(itemTarget, "label")`.
3. `_scrml_trigger` looks up `_scrml_prop_subscribers.get(itemTarget)` → `Map(prop → effects)`. Gets effect set for "label". For TodoMVC, the per-row text-binding effect is subscribed.
4. `[...effects]` array-spread to copy. Iterate; invoke each with try/catch.
5. Per-row text-bind effect re-runs → updates `<span>`'s text content via `textContent = item.label`.
6. ALSO: the list-render effect's deps include `item.label` (because reconcile_list walks createFn → which reads `.label` to render). HOWEVER `_scrml_tracking_paused` was set during reconcile_list's createFn invocation, so `.label` read inside reconcile_list does NOT register a dep. List-render effect is NOT subscribed to per-item `.label`. **Net: only the per-row text-bind effect fires. Reconcile-list does NOT fire.**

Wait — if list-render doesn't fire on per-item mutations, why is `reconcile_list` 0.762ms (54%) of partial-update's wall? Two possibilities:

- **(a)** TodoMVC partial-update DOES `@todos = newArray` rebuilds (whole-array replacement). Then `_scrml_reactive_set("todos", newArray)` fires the LEGACY subscriber walk (per Phase 3.A LEGACY-system architectural finding — there are TWO subscriber systems, and `@todos` is a top-level reactive cell registered via LEGACY). The list-render effect IS subscribed via LEGACY → fires → reconcile_list walks all 1000 with same-keys-same-order (after Phase 3.A landed) BUT triggers full LIS pipeline (no fast path).
- **(b)** The Proxy on `@todos` array fires `set(target, "length", newValue)` or similar on whole-array replacement, triggering the list-render effect via `_scrml_prop_subscribers` for `"length"` (which list-render subscribed to during initial render via createFn loop walking `.length`).

**Survey at dispatch time:** instrument the partial-update path under `__SCRML_DEBUG_PERF` to count how many `_scrml_trigger` fires vs how many `_scrml_reactive_set` fires on the LEGACY path. The data discriminates (a) vs (b).

**Either way, the LIS pipeline at lines 1293-1376 runs for partial-update.** The same-keys-same-order fast-path (Phase 2 candidate (a)) is the highest-leverage candidate.

### §2.2 swap-rows — happy-dom 1.85ms

**Op shape:** `[arr[1], arr[998]] = [arr[998], arr[1]]` — destructuring swap. Per ES2015 semantics this expands to ~3 Proxy writes (read arr[1], read arr[998], write arr[1]=tmp998, write arr[998]=tmp1).

**Pathway walk:**

1. Two Proxy `set` writes fire — `set(target, "1", row998)` + `set(target, "998", row1)`.
2. Each `_scrml_trigger(target, "1")` and `(target, "998")` runs. Looks up subscribers for index strings "1" + "998". **These are EMPTY in TodoMVC** — no effect subscribes to specific array indices. Subscriber-set lookup returns undefined → fast bail at `if (!effects) return;` (line 2386).
3. ALSO each write fires `_scrml_trigger(target, "length")` (regex match at line 2469). The list-render effect IS subscribed to `"length"` (during initial render). Effect fires twice (once per swap-write).
4. Each list-render effect call runs `_scrml_reconcile_list(container, @todos, keyFn, createFn)` — the full pipeline. **Two reconcile_list calls per swap op.**

Wait — that means swap-rows runs reconcile_list TWICE. With reconcile_list at 0.659ms total cumulative, each call is ~0.33ms. The whole-array reconcile (1000 keys with ONE LIS move) at 0.33ms is fast — but doing it twice doubles cost. And there's the effect_scheduling overhead per fire.

**Candidate B3 (batched microtask reconcile) is highly leveraged here:** if the two writes batched into a single reconcile call at microtask flush, swap-rows wall would halve.

### §2.3 Count-derived effects — activeCount + completedCount

TodoMVC computes `activeCount = @todos.filter(t => !t.completed).length` and analogous `completedCount`. These derive cells:
- Subscribe to every per-item `.completed` (via the filter walk during dep tracking)
- Subscribe to `@todos` itself (for array-length deps via createFn loop)

For partial-update toggling `.completed` on 100 items: each mutation fires `_scrml_trigger(itemTarget, "completed")` → fires BOTH per-row checkbox effect AND BOTH count-derived effects (which re-walk `@todos.filter()` from scratch — O(N) per fire). 100 items × 2 count-derived re-fires = 200 N-walks of 1000 items each = 200,000 ops just for count derives.

**Candidate B4 (derived-dep tracking precision) is critical for partial-update count-derivation:** if counts only re-compute on whole-array writes (not per-item .completed writes), the cost collapses.

For swap-rows: counts are INVARIANT (swap doesn't change counts). The two writes still trigger count re-fire → wasted work entirely.

**Candidate B4 is also load-bearing for swap-rows.**

## §3. Candidate ranking

| ID | Candidate | Target op | Anticipated saving | Cost-class | Confidence |
|---|---|---|---:|---:|---|
| **B2** | **Same-keys-in-same-order fast-path in `_scrml_reconcile_list`** | partial-update (primary) + swap-rows (low-leverage; 998/1000 in LIS already) | happy-dom partial: ~30-50% | ~2-3h | HIGH |
| **B4** | **Count-derived dep precision — narrow subscription to whole-array writes** | partial-update (PRIMARY) + swap-rows (high) | partial happy-dom: ~30-50%; swap: ~20-40% | ~3-5h | MED-HIGH (depends on how derive-dep tracking infra extends) |
| **B3** | **Batched microtask reconciliation — coalesce multiple writes in same sync turn** | swap-rows (PRIMARY) | swap-rows: ~40-50% (halves the 2x reconcile fires) | ~4-6h | MEDIUM (microtask scheduling is invasive; behavior change observable) |
| **B1** | **Array-reorder fast-path in Proxy `set` trap** | swap-rows (secondary) | swap: ~5-15% (the index-write triggers are already fast-bailing on empty subscribers) | ~2-3h | LOW (not a clear win after pathway walk) |

### §3.1 B2 — Same-keys-in-same-order fast-path (RECOMMENDED top-1)

**Where:** `_scrml_reconcile_list` at runtime-template.js:1237. After the empty/bulk-create fast paths (lines 1240-1291), insert a third fast path:

```js
// Fast path: same keys in same order — common partial-update case
// Check newKeys[i] === childAt(i)._scrml_key for all i; if true, skip LIS + DOM moves
let sameOrder = newItems.length === container.childNodes.length;
if (sameOrder) {
  let i = 0;
  for (const child of container.childNodes) {
    if (keyFn(newItems[i], i) !== child._scrml_key) { sameOrder = false; break; }
    i++;
  }
}
if (sameOrder) {
  // No LIS, no DOM moves — partial-update happy path.
  // (Per-row effects fired separately via per-prop subscriber dispatch.)
  return; // also bumps perf counter
}
```

**Anticipated saving:** for partial-update with N=1000 same-keys (the canonical case), bypasses ~0.7ms of LIS pipeline + node placement. Probably halves partial-update's happy-dom wall.

**Risks:** correctness — must preserve the keyFn read pattern + `_scrml_tracking_paused` guard. Mitigation: instrument the fast-path with a counter; verify reconcile_list still produces correct DOM under the existing test suite + TodoMVC happy-path.

### §3.2 B4 — Count-derived dep precision (RECOMMENDED top-2)

**Where:** the derived-cell dep-tracking subsystem. Current behavior — count-derived effect subscribes to every per-item `.completed` because `.filter()` walks each item during dep tracking. Each `.completed` write retriggers the derived effect even when the count is invariant.

**Fix shape:** memoize derived value; on dep-trigger fire, re-compute IF deps changed shape (not just deps changed value). For count-derived specifically, check whether the new computed count !== cached count; if same, suppress downstream fan-out.

**Alternative:** lazier dep tracking — track ONLY `@todos` (array identity) for count-derives, not per-item `.completed`. Subscribers list shrinks dramatically. Loses precision for "compute on per-item change" pattern but matches count-shape (only triggers when array changes, which includes per-item mutations through the deep proxy `set` trap).

**Risks:** dep-tracking precision tradeoff. Wrong-shape narrow may silently break count derives on edge cases (compound array filters, etc.). Mitigation: dedicated unit + integration tests for derived-cell update semantics.

### §3.3 B3 — Batched microtask reconciliation (RECOMMENDED top-3, gated on B2+B4 measured saving)

**Where:** `_scrml_trigger` at runtime-template.js:2382. Instead of fire-immediately, push effects into a per-microtask-queue; queueMicrotask flushes at next microtask boundary.

**Effect:** for swap-rows two-write sequence, both writes happen in one synchronous turn → both subscribed effects queued → flushed once at microtask end → reconcile_list runs ONCE not TWICE.

**Risks:**
- BEHAVIOR CHANGE: developers observing `@cell` value immediately after a write see the new value but DOM may not have updated until microtask. This is the Vue 3 `nextTick` model. Adopters who write synchronous-DOM-assert tests would need `await Promise.resolve()` or similar.
- TEST SUITE IMPACT: many compiler tests assert post-write DOM state synchronously. Microtask deferral breaks those without migrating test helpers.
- Bug K-style throw-from-effect interactions become harder to reason about (errors fire at microtask boundary, not at write site).

**Gate:** ratify B2 + B4 first; measure post-fix swap-rows wall; if still >2× Vanilla, consider B3. The cost-class jump (from 2-3h to 4-6h + test-suite migration) is significant.

### §3.4 B1 — Array-reorder fast-path in Proxy set trap (DEFER)

After pathway walk: the per-index `_scrml_trigger` fires for swap-rows ARE fast-bailing on empty subscribers. The actual cost is the list-render effect re-fire via `"length"` subscription, not the per-index lookups. B1 would optimize a path that's already fast.

**Disposition:** DEFER unless a real per-array-index-subscription use case surfaces.

## §4. Sequencing recommendation

```
B2 — Same-keys-same-order fast-path                     [HIGH confidence; clean win]
   ↓ measure: post-fix partial-update wall (happy-dom + Chrome)

B4 — Count-derived dep precision                         [MED-HIGH; clean win]
   ↓ measure: post-fix partial-update + swap-rows walls

(optional) B3 — Batched microtask reconciliation         [GATED on B2+B4 measured residual]
   ↓ requires test-suite migration if pursued

B1 — Array-reorder fast-path                             [DEFER unless use case surfaces]
```

**Per Q-RT2-OPEN-4 ratified strict-separation:** each candidate is its own Phase 3.B-N dispatch. B2 ships → measure → B4 ships → measure → B3 decision.

**Aggregate Phase 3.B cost** (B2 + B4): ~5-8h dispatches. Significantly lighter than Phase 3.A select-row (which carried the LEGACY-system surgical-migration weight).

## §5. Risks + mitigations

- **Risk:** Chrome partial-update is already the winner. Optimizing for happy-dom may move happy-dom numbers but produce zero Chrome wall improvement. **Mitigation:** treat happy-dom as the test-environment baseline; Chrome wins are the user-facing metric. Validate post-B2 + post-B4 in Chrome via Playwright bench.
- **Risk:** B2's same-keys-same-order detection has false positives if `keyFn` mutates or has side effects (it shouldn't, but defensive). **Mitigation:** B2 uses the same keyFn invocation that LIS uses — identical semantics; no new failure mode.
- **Risk:** B4's derived-dep narrowing breaks per-item count-shape semantics for adopter apps using deep-property filters. **Mitigation:** dedicated unit tests for derived-cell deep-dep tracking; conservative narrowing — fall back to current behavior on shape-ambiguity.
- **Risk:** byte-identity invariant (S102 PGO discipline) — B2 + B4 + B3 all change runtime emit shape. **Mitigation:** document the bundle-shape diff explicitly in each commit message; verify full test suite green.
- **Risk:** the "100 .completed mutations in TodoMVC partial-update" assumption may not match bench-scrml's actual implementation. **Mitigation:** Step 0 of any B2/B4 dispatch instruments + verifies bench-scrml's partial-update path.

## §6. Open questions for user

1. **Q-RT3B-OPEN-1 — Ratify Phase 3.B candidate ranking?** B2 → B4 → (gated) B3 → defer B1. PA lean: ratify ranking as proposed. **Recommend RATIFY.**

2. **Q-RT3B-OPEN-2 — Phase 3.B dispatch shape — PA-direct or scrml-js-codegen-engineer?** Both B2 and B4 are bounded runtime-template.js edits + targeted test additions. Cost-class ~2-3h + ~3-5h. Could be PA-direct (especially B2 — surgical) or could be agent-dispatched. PA lean: **PA-direct for B2** (small surgical change; immediate feedback loop on perf measurement); **agent-dispatched for B4** (derived-dep tracking is more invasive; agent's worktree isolation + commit discipline preserves rollback if dep-tracking narrowing breaks something).

3. **Q-RT3B-OPEN-3 — schemaFor finish line vs B2/B4 sequencing.** schemaFor is currently in flight in worktree (~12-18h). Should B2 dispatch fire AFTER schemaFor lands (sequential), or PARALLEL (different code paths — schemaFor in type-system/codegen, B2 in runtime)? PA lean: **sequential** to keep main's git history clean + ease cherry-pick / file-delta review at each landing. B2 starts after schemaFor cleanup. **Recommend RATIFY sequential.**

4. **Q-RT3B-OPEN-4 — B3 microtask reconciliation — defer or ratify-now-as-conditional?** PA lean: **defer.** Microtask reconciliation is a behavior change with test-suite migration cost; only justified if B2+B4 leave swap-rows above 2× Vanilla in Chrome. **Recommend DEFER unless measured-residual demands it.**

5. **Q-RT3B-OPEN-5 — Real-Chrome validation timing.** Per Q-RT2-OPEN-5 (Phase 2 ratification) — Chrome validation is post-fix. PA lean: re-measure Chrome bench after EACH of B2 + B4 lands (not batched). Two Playwright bench runs ~10min each; cheap signal. **Recommend RATIFY per-fix Chrome validation.**

## §7. Tags

#runtime-perf #phase-3 #phase-3-b #partial-update #swap-rows #reconcile-list #effect-scheduling #same-keys-fast-path #count-derived-precision #microtask-reconcile-deferred #s104
