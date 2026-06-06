# Bug B — structural-compound deep-set codegen mistarget (HIGH, OPEN)

**Filed:** S167 (2026-06-06). Surfaced by the Bug A dispatch (`high-deepset-write-loss-2026-06-06`) as a deferred finding; PA-confirmed independently.

**Severity:** HIGH (silent lost mutation, default pipeline, no diagnostic — same class as Bug A but a distinct root).

## Symptom

A dotted-path deep-set `@a.ref = value` where `a` is a **structural-compound** cell (declared with structural children, `<a> <ref> = "" </>`) writes the **derived composite** `a` instead of the **leaf** `a.ref`. The derived recompute then immediately overwrites it from the unchanged leaf, so the write is clobbered. **Fails at runtime even for a SINGLE deep-set** (independent of Bug A's multi-statement position bug).

## Reproducer (HEAD `75431e9e`, post-Bug-A)

```scrml
<a>
    <ref> = ""
</>
<c> = 0
function multi() {
    @c = 1
    @a.ref = "p"
    @c = 2
    @a.ref = "q"
}
<button onclick=multi()>go</button>
<p>${@c} ${@a.ref}</p>
```

Emitted `_scrml_multi_*()` (post-Bug-A — the deep-set NODES now survive, that's Bug A fixed):
```js
function _scrml_multi_4() {
  _scrml_reactive_set("c", 1);
  _scrml_reactive_set("a", _scrml_deep_set(_scrml_reactive_get("a"), ["ref"], "p"));   // ← targets "a"
  _scrml_reactive_set("c", 2);
  _scrml_reactive_set("a", _scrml_deep_set(_scrml_reactive_get("a"), ["ref"], "q"));   // ← targets "a"
}
```
But `a` is declared as a DERIVED composite reading the leaf:
```js
_scrml_reactive_set("a.ref", "");
_scrml_derived_declare("a", () => ({ ref: _scrml_reactive_get("a.ref") }));   // a = f(a.ref)
```
So `_scrml_reactive_set("a", …)` writes the composite, which the next read of `a` recomputes from the unchanged `a.ref` → **the write is lost.** Expected emit: `_scrml_reactive_set("a.ref", "p")` (write the leaf).

## Contrast — the flat-object case works (Bug A end-to-end correct)

```scrml
<a> = { ref: "" }     // PLAIN reactive cell, not a derived composite
```
Here `a` is `_scrml_reactive_set("a", _scrml_deep_reactive({ref: ""}))` (plain cell), and the deep-set `_scrml_reactive_set("a", _scrml_deep_set(get("a"), ["ref"], "q"))` sticks → `@a.ref` ends at `"q"`. node --check clean. So Bug A's parser fix is correct end-to-end; Bug B is isolated to the **structural-compound → derived-composite** lowering.

## Root (hypothesis — for the fix dispatch to confirm)

The deep-set codegen (`emit-logic.ts:3003`, `reactive-nested-assign`) emits `_scrml_reactive_set(<target>, _scrml_deep_set(get(<target>), <path>, <value>))` with `target = "a"` (the cell name) regardless of whether `a` is a plain cell or a **derived composite** whose fields are backed by separate leaf cells (`a.ref`). When the target is a derived composite, the write must be **retargeted to the leaf cell** the path resolves to (`a.ref`) — i.e. `_scrml_reactive_set("a.ref", value)` for a single-segment path, or the deepest backing leaf for a multi-segment path. The symbol-table knows the structural-compound → leaf-cell mapping (it synthesized `a.ref` + the `a` derived rollup); the codegen needs to consult it to pick the write target.

Likely fix locus: `emit-logic.ts` `reactive-nested-assign` case (3003) — detect when `target` is a structural-compound-derived cell and retarget the write to the backing leaf cell for the path; OR upstream in the resolver annotation that should mark the nested-assign's true write target.

## Severity accounting

The S166-filed HIGH "multi-statement deep-set write-loss" decomposed into TWO roots:
- **Bug A (parser over-consumption):** RESOLVED at `75431e9e` (this session).
- **Bug B (structural-compound codegen mistarget):** OPEN — replaces the original as the open HIGH.

Net known-gaps HIGH count: **stays 1** (Bug B is the open HIGH; Bug A closed).

## Cross-refs

- Bug A fix: `75431e9e` (`compiler/src/ast-builder.js`). BRIEF + tests in this change dir.
- The agent's deferred-finding #1 (`a53e5e892b211dfe0` final report) is the original surfacing.
- Related deferred: native parser folds `@obj.path =` / `@arr.method()` in function bodies to bare-expr (native swap-grind parity item, separate from Bug B which is the LIVE codegen).
