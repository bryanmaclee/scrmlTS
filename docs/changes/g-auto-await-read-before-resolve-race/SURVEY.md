# SURVEY — ss32 item 2: g-auto-await-read-before-resolve-race

**Type:** survey-first (S138 reverse). **Verdict: REPRODUCES (narrowly). PARKED — fix is a PA design ruling.**
**Surveyed by:** sPA ss32 (dev agent `a11c7bfb`, continuation of the item-1 agent). R26 on real compiled source @ `c193797b` (post-item-1) + actual execution + exact-sequence replay. No source changes (survey-only).

## Discriminator answer (both sides witnessed)

**RACE — top-level separate derived cell** `@data = loadData()` then `@derived = @data.value`:
```js
(async () => _scrml_reactive_set("data", await _scrml_fetch_loadData_4()))().catch(...);  // @data set ASYNC (microtask)
_scrml_init_set("data", () => _scrml_fetch_loadData_4());
_scrml_reactive_set("derived", _scrml_reactive_get("data").value);   // BARE one-shot — runs SYNC, reads @data NOW
_scrml_init_set("derived", () => _scrml_reactive_get("data").value);
```
The dependent assignment is a **bare one-shot `_scrml_reactive_set`, NOT wrapped in `_scrml_effect`** → does not subscribe to `@data`; runs synchronously at module-init, before the async IIFE `await` resolves.

**NO-RACE — direct display binding** `${@data.value}` (no separate cell):
```js
_scrml_render_value(el, _scrml_reactive_get("data").value);                                 // initial read
_scrml_effect(function() { _scrml_render_value(el, _scrml_reactive_get("data").value); });  // SUBSCRIBES → re-renders on async set
```

So: **display-binding derivations subscribe/re-derive (safe); top-level `@derived = @data.field` assignments are one-shot snapshots (race).**

## Executed observable behavior (two failure modes)

1. **No initializer** (`@data = loadData()` only): synchronous `_scrml_reactive_get("data").value` reads `undefined` → throws `TypeError: undefined is not an object` at module-init. In a browser this aborts the top-level module script — **the whole page init breaks**, not just `@derived`. **Item-1's `.catch` does NOT cover this** — it sits on the async IIFE, not the synchronous successor statement.

2. **With initializer** (`@data = {value:0}` then `@data = loadData()`): `@derived` computes synchronously to the **initial** value (0); `@data` resolves async to `{value:42}`; `@derived` **stays 0 forever** — replay confirmed `0 subscriptions on @data`.
   ```
   @derived right after sync init: 0
   @data after async resolve     : {"value":42}
   @derived after async resolve  : 0   →  RACE CONFIRMED
   ```

Shapes B (`@total = computeTotal(@data)` — dependent passed to a sync client fn) and D (chained `@b=@data.value; @c=@b+1`) emit identical bare one-shot reads and share the race.

## Shared structural root with item-1 fork (g)

Both are: **the auto-await IIFE defers `@data`'s real `_scrml_reactive_set` to a microtask, while successor top-level statements run synchronously in program order → any successor depending on the async cell observes its pre-resolve state.**
- **Fork (g):** the `!{}` *error-dispatch* successor reads the IIFE **Promise** (`if (_scrml__scrml_result_N.__scrml_error)`) → dead dispatch.
- **Item 2:** the *data-derivation* successor reads the pre-resolve **cell value** → stale/throwing.

Distinct symptoms (error-routing vs data-ordering), shared root. A single data-dependency barrier could subsume both.

## Fix options (CHARACTERIZED, not built — PA decides; blast-radius axis)

1. **Dependency barrier / await-chaining (narrow — the list's framing):** when a top-level statement transitively depends on a cell assigned via an auto-await IIFE, sequence it AFTER the producer resolves (fold the dependent successor into the IIFE `.then(...)` continuation / shared async init scope). Extends the ss22 per-statement isolation to data-DEPENDENT successors. Needs DG to mark transitive dependents of an async-server cell. Minimal semantic change; targets only the async corner.
2. **Reactive derivation (broad):** emit top-level `@derived = expr` as a subscribing effect (`_scrml_effect(() => _scrml_reactive_set("derived", ...))`). Race-free AND live-reactive — but changes top-level derived-cell semantics language-wide from one-shot snapshot to live derivation. Large blast radius.
3. **Hybrid (minimal blast):** only derivations transitively dependent on an async-server cell get the barrier/reactive treatment; purely-synchronous derivations stay one-shot. Same DG async-taint analysis as Option 1.

**Idiomatic-alternative (decision input):** the race is avoidable TODAY by deriving in the display binding (`${@data.value}`) instead of a separate `@derived` cell — display bindings already subscribe. If the language stance is "derive at the read site, not a snapshot cell," this could be a **lint/diagnostic** ("data-dependent derived cell off an async-server assignment is a one-shot snapshot — derive in the binding or guard for absence") rather than a codegen change. Designer-axis call.
