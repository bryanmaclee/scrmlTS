---
title: Phase 3 select-row chip-away — eliminate LEGACY `_scrml_subscribers` O(n) fan-out on per-row binds
date: 2026-05-19
session: S103
authority: Phase 2.1 attribution dive (PA-direct, S103); P1.B+P1.C data (`6bc5128` + `448fe89`); runtime-perf-scoping/SCOPING.md §4 anticipated candidates
phase_parent: docs/changes/runtime-perf-phase-2-scoping/SCOPING.md
status: OQs RATIFIED S103 (3/3 per PA-lean) — Candidate A dispatch authorized; STRICTEST predicate-shape detection scope (`EXPR == @CELL` / `@CELL == EXPR` with const-folded EXPR, equality only); LEGACY system cleanup DEFERRED to post-impl proposal
---

# Phase 3 select-row chip-away

## Headline

select-row is 5.0ms wall vs Svelte 0.036ms (**~138× worse**) vs Vanilla 0.012ms (**~414× worse**). 90% of scrml's wall-clock is in `_scrml_reactive_set`'s LEGACY `_scrml_subscribers` fan-out loop (runtime-template.js:463-472). Every per-row class-toggle binding registers a separate callback in the LEGACY central registry; writing `@editingId = newId` walks all 1000 of them; ~99.8% do no-op classList work (998 rows: was-not-editing AND still-not-editing → no change).

**Fix target: the per-row bind sites in `emit-lift.js` register to LEGACY `_scrml_reactive_subscribe` (lines 467, 649). Migrate to the NEW `_scrml_prop_subscribers` system OR introduce value-indexed registration so the dispatcher fires only the OLD-value's row + NEW-value's row, not all rows. Anticipated saving: 50-80% on select-row + analogous wins on per-row-bind ops (remove-row, partial-update partial).**

---

## §1. Authority + Phase 2.1 attribution

**Data (P1.C @ commit `448fe89`, happy-dom, TodoMVC 1000 rows):**

| Path | ms | % wall | calls |
|---|---:|---:|---:|
| `notify_subscribers` exclusive | 5.369 | **90%** | 1 |
| reactive_get | 0.074 | 1% | 2001 |
| reactive_set | 0.030 | 1% | 1 |

**Wall: 5.94ms median.** The 5.369ms is spent inside the loop body at `runtime-template.js:465`:

```js
for (const fn of _scrml_subscribers[name]) {
  try { fn(value); } catch(e) { console.error("scrml subscriber error:", e); }
}
```

Where `name === "editingId"` and `_scrml_subscribers["editingId"].length === 1000` (one entry per TodoMVC row from the for-loop body re-instancing at hydration time).

---

## §2. Architectural finding — TWO subscriber systems coexist

scrml's runtime carries TWO independent reactive-subscription systems:

### §2.1 LEGACY `_scrml_subscribers` (lines 137, 435-444, 463-472, 533-542)

- **Shape:** flat dict `{ [name]: [callback, ...] }`.
- **Registration API:** `_scrml_reactive_subscribe(name, fn)` (line 532) returns an unsubscribe closure.
- **Dispatch:** linear walk on every write to `name` (the `for (const fn of ...)` loop above).
- **Granularity:** per-name. ALL subscribers fire on every write, even if the new value doesn't matter to most of them.
- **Use sites in compiler/src/codegen/** (grep'd S103):
  - `emit-lift.js:439` — bind-pattern in lift-template bodies (for-loop bodies live here)
  - `emit-lift.js:467` — class:NAME bind in lift bodies
  - `emit-lift.js:626` — bind-pattern duplicate fire-site
  - `emit-lift.js:649` — class:NAME bind duplicate
  - `emit-event-wiring.ts:719` — generic bind wiring
  - `emit-sync.ts:107` — server-cell sync (`<x server>`)
  - `emit-variant-guard.ts:830` — engine state-child variant dispatcher

### §2.2 NEW `_scrml_prop_subscribers` (lines 2201+)

- **Shape:** `WeakMap<targetObject, Map<prop, Set<effectFn>>>`.
- **Registration API:** auto-tracking via `_scrml_track(target, prop)` inside an `_scrml_effect_stack` push (the `_scrml_effect` API).
- **Dispatch:** `_scrml_trigger(target, prop)` (line 2246) walks ONLY the effects that read THAT prop of THAT target.
- **Granularity:** per-prop, per-target. Precise dependency tracking.
- **Use sites:** modern reactive code paths emitted post-Approach-A — derived cells, deep-reactive proxies, `_scrml_effect`-wrapped reactive blocks. The deep-reactive proxy (`_scrml_deep_reactive`) routes per-property reads through `_scrml_track` and per-property writes through `_scrml_trigger`.

### §2.3 The select-row hot path uses LEGACY exclusively

When the TodoMVC for-loop body emits `class:editing=(@todo.id == @editingId)` (or whatever the canonical bind shape is), `emit-lift.js:467` emits:

```js
_scrml_reactive_subscribe("editingId", function() { /* recompute class */ });
```

— per row. 1000 rows = 1000 registrations to `_scrml_subscribers["editingId"]`. The NEW `_scrml_prop_subscribers` system is **not consulted** on this path.

This is the optimization opportunity.

---

## §3. Subscribed-but-skipped work characterization

For the select-row op (`@editingId = newId`):

- **Old value:** `editingId` was either `null` (no row in edit mode) or `rowM` (some specific row).
- **New value:** `editingId` becomes `rowN` (the row just clicked).
- **Per-subscriber work:** each row's bind function recomputes `(rowId == @editingId)` for THIS row's `rowId`. If the result didn't change, classList toggle is a no-op.

| Row | Was editing? | Is editing? | classList work |
|---|---|---|---|
| rowM | yes | no | REMOVE class (1 real change) |
| rowN | no | yes | ADD class (1 real change) |
| all 998 others | no | no | classList unchanged (no-op recompute + no-op toggle) |

**~99.8% of the 1000 subscriber calls do no meaningful work.** This is the irreducible cost being paid.

(Side note: even the no-op classList toggles probably hit `Element.classList.toggle`'s internal "is this class present?" check — happy-dom + real-Chrome may handle this differently; real-Chrome may short-circuit faster. Hence the deferred Real-Chrome validation per Phase 2 SCOPING §8 Q-RT2-OPEN-5.)

---

## §4. Phase 3 candidate ranking

Three candidate fixes ranked by **expected saving × likelihood-of-effective × cost-to-implement**.

### §4.1 Candidate A — value-indexed subscription for predicate binds (RECOMMENDED)

**What:** When a per-row bind has the shape `(rowFixedValue OP @cellName)` — where `rowFixedValue` is statically known per row at hydration time — register the subscriber in a value-indexed sub-registry keyed by `rowFixedValue` and the predicate kind. At write time, the dispatcher fires:

1. Subscribers whose registered value matches the OLD value of `@cellName` (forces re-eval of "was true → maybe false now").
2. Subscribers whose registered value matches the NEW value (forces re-eval of "maybe true now").

For `class:editing=(@todo.id == @editingId)`: row M's subscriber registers under `editingId-equals-rowMid`. When `@editingId = rowN`, only the subscribers for `rowMid` (old) + `rowN` (new) fire. **O(2) per write instead of O(N).**

**Touch points:**
- `compiler/src/runtime-template.js` — new sub-registry shape `_scrml_value_indexed_subscribers: { [name]: { [valueKey]: [fn, ...] } }`; new registration API `_scrml_reactive_subscribe_when(name, valueKey, fn)`; modify `_scrml_reactive_set` to fan out old-value + new-value entries.
- `compiler/src/codegen/emit-lift.js:467, 649` — when the bind expression is `(STATIC == @CELL)` or `(@CELL == STATIC)`, emit `_scrml_reactive_subscribe_when` with the STATIC value as `valueKey`. Otherwise fall back to LEGACY `_scrml_reactive_subscribe`.
- Possible: `emit-event-wiring.ts:719` if the same shape occurs there.

**Cost-class:** 8-12h dispatch (new runtime API + emit-lift.js predicate-shape detection + tests + byte-identity verification for the LEGACY-fallback path).

**Anticipated saving on select-row:** **70-85%** (5.0ms → ~0.8-1.5ms). Brings scrml within ~20× of Svelte and ~80× of vanilla — still not parity but a real chunk-away.

**Anticipated saving elsewhere:**
- **remove-row:** large (~50-70%) — same per-row-class-toggle pattern.
- **partial-update:** moderate (~20-40%) — partial-update writes 100 separate `@todo.completed` toggles; each fan-out narrows from 1000 subscribers to ~few per write.
- **clear-all (toggle):** large, similar pattern.

**Risks:**
- Predicate-shape detection at codegen complexity. Edge cases: nested compound nav (`(@todo.id == @editingId.targetId)`), operator variations (`!=` / `in` / `includes`). Mitigation: tight initial detection scope (only `EXPR == @CELL` or `@CELL == EXPR` where EXPR is constant-folded statically known), fall back to LEGACY for any other shape. Conservative.
- Byte-identity invariant from S102 PGO Phase 3 — this IS intended bundle-shape change for files using the predicate-bind pattern. Document explicitly in commit.
- Subscription leak — value-indexed registrations need the same cleanup-on-unmount that LEGACY has. Reuse the unsubscribe-closure pattern.

### §4.2 Candidate B — per-row reactive scope (Solid.js precedent)

**What:** Replace the central registry for for-loop body cells with per-row scoped registries. Each row instantiation creates its own mini-registry; cell writes against `@editingId` (which is OUTER scope) become broadcasts that the per-row registry filters via its registered predicate.

**Touch points:**
- Substantial runtime refactor (introduces a scope model into the reactive system).
- emit-lift.js + emit-control-flow.ts changes to wrap for-loop bodies in scope-entering/exiting code.

**Cost-class:** 20-30h dispatch (architectural shift; multi-pass touch on emit-lift + emit-control-flow + runtime; substantial test surface).

**Anticipated saving on select-row:** similar to Candidate A (70-85%), arrived at via different mechanism.

**Why ranked SECOND:** Candidate A achieves a similar win with ~1/3 the implementation cost. Candidate B has broader long-term shape benefits (cleaner reactive model, useful for nested loops + dynamic row addition), but Candidate A is the chip-away; Candidate B is a wave.

### §4.3 Candidate C — migrate LEGACY → NEW (`_scrml_prop_subscribers`) wholesale

**What:** Stop using `_scrml_reactive_subscribe` in `emit-lift.js`. Emit `_scrml_effect`-wrapped bind functions that auto-track via `_scrml_prop_subscribers`. The NEW system's per-prop granularity narrows fan-out automatically.

**Touch points:**
- `emit-lift.js` rewriting; `emit-event-wiring.ts` rewriting; possibly `emit-sync.ts` rewriting.
- `_scrml_state[name]` writes need to dispatch to `_scrml_prop_subscribers.get(_scrml_state)?.get(name)` — already happens via `_scrml_trigger(_scrml_state, name)` at line 474. So the bridge exists.
- The narrowing only helps if subscribers are registered through the NEW system's `_scrml_track` (i.e., via `_scrml_effect`). Wrapping bind callbacks in `_scrml_effect` would cost an effect-tracking overhead per bind.

**Issue:** the NEW system narrows BY PROP, not BY VALUE. For `class:editing=(@todo.id == @editingId)`, all 1000 row binds still READ `@editingId` — they'd all register via the NEW system AND all fire when the prop changes. **No narrowing.** Same O(n) cost.

**Conclusion: Candidate C does not solve select-row.** It would help in patterns where each row reads a DIFFERENT prop (e.g., `class:done=(@todo.completed)` — each row reads ONLY ITS OWN `todo.completed`), but select-row's predicate-on-shared-cell is exactly the pattern the NEW system can't narrow. **Drop C.**

---

## §5. Recommended chip-away

**Candidate A — value-indexed subscription for predicate binds.** Best $/expected-impact. 8-12h dispatch. 70-85% saving on select-row + analogous wins on remove-row, partial-update, clear-all. Aligns with `docs/changes/runtime-perf-scoping/SCOPING.md` §4 "signal-style direct subscription on hot paths" candidate.

The same chip-away may also unblock create-1000 + create-10000 gains (the bulk-insert bind registration cost is paid 1000 times AND each subscriber dispatch is paid on every subsequent write).

---

## §6. Sequencing

```
Phase 3.A (this SCOPING) — value-indexed subscription chip-away
   ↓
   measure delta on select-row + remove-row + partial-update + create-N
   ↓
   IF delta is meaningful (>50%): close this chip; queue Phase 2.2 (partial-update) next
   IF delta is smaller than expected: revisit Candidate B (per-row scope) as the bigger-hammer follow-on
```

The dispatch shape: scrml-js-codegen-engineer, isolation:worktree, ~8-12h cost class. The brief should include this SCOPING + the touch points + the conservative-narrowing-predicate constraint.

---

## §7. Risks

- **Predicate-shape detection breadth.** Initial scope: only `EXPR == @CELL` or `@CELL == EXPR` where EXPR is statically constant-foldable. Conservative reject for other shapes (fall back to LEGACY). Future expansion (`in` / `includes` / compound nav) is its own follow-on. **Mitigation:** explicit detector predicate at emit-lift; comprehensive unit tests for accepted vs rejected shapes.
- **Byte-identity invariant** (S102 PGO discipline) — this dispatch IS an intentional bundle-shape change for files using predicate binds. Document in commit; verify per-op correctness via TodoMVC + full pre-commit subset.
- **Unsubscribe / cleanup leaks** — value-indexed registrations need parity unsubscribe path. Reuse closure pattern.
- **Subscriber-set ordering** — LEGACY fires in registration order; new system must preserve that for any consumer who depends on it. Audit for ordering-dependent subscribers (unlikely but verify).
- **`<errors of=>` / validity-surface interaction** — the auto-synth validity surface (§55) registers subscribers; if any of those use predicate-shape binds, they'd also be migrated. Audit + verify.

---

## §8. Open questions — RATIFIED S103 (3/3 per PA-lean)

User ratified all 3 OQs per the recorded PA-leans (S103, 2026-05-19). Each OQ closed below.

1. **Q-RT3-SR-OPEN-1 — Authorize Candidate A dispatch.** **RATIFIED: YES.** 8-12h cost class; scrml-js-codegen-engineer isolation:worktree. Phase 2.1 attribution data + SCOPING anchor Candidate A as the highest-impact chip with bounded blast radius.
2. **Q-RT3-SR-OPEN-2 — Initial scope of predicate-shape detection.** **RATIFIED: STRICTEST.** Detector accepts ONLY `EXPR == @CELL` / `@CELL == EXPR` where `EXPR` is const-folded statically known; equality only (no `!=` / `in` / `.includes()` in the initial scope). Conservative reject for any other shape (fall back to LEGACY `_scrml_reactive_subscribe`). Broader shapes are follow-ons if post-impl data justifies. The strict version covers TodoMVC select-row exactly; remove-row's `!=` variant is a 1-line extension reserved for follow-on.
3. **Q-RT3-SR-OPEN-3 — Cleanup of LEGACY `_scrml_subscribers` system.** **RATIFIED: DEFER.** This dispatch does NOT decide. Once Candidate A lands, the implementing agent surfaces post-impl data on remaining `_scrml_reactive_subscribe` usage fraction; PA evaluates as a separate cleanup proposal (likely v0.4+ if usage drops below ~10%).

**Operational consequence:** dispatch is dispatch-ready; brief embeds the strictest predicate-shape detector spec + the conservative fallback rule.

---

## §9. Tags

#runtime-perf #phase-3 #select-row #value-indexed-subscription #signal-style #legacy-subscribers #per-row-bind #emit-lift #s103 #pa-direct-attribution #candidate-A
