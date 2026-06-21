# Progress: g-nested-each-no-own-subscription

## 2026-06-21T14:14:48Z — start
- Startup verification passed; FF-merged main to 87e0f98a (maps/docs only, no source drift on each path).
- bun install + pretest OK.
- Next: read maps, inspect emit-each.ts + emitted client.js for the nested-each repro.

## SCOPE-FIRST analysis (decision: Approach C)
Bug confirmed empirically: inner each_20 emitted inline with `const _scrml_each_items_8 = _scrml_reactive_get("shared")` read ONCE + IIFE reconcile ONCE; NO `_scrml_each_renderers["each_20"]` reg, NO `_scrml_effect_static`. Outer effect only reads `projects` (inner read is under reconcile's paused tracking) → `shared` change re-renders nothing.

Runtime facts:
- `_scrml_effect`/`_scrml_effect_static` UN-PAUSE tracking around fn() (S139 Bug 11) → a nested effect created during `_scrml_reconcile_list` (which pauses tracking) DOES record its own deps. This is the enabler for per-item text/class effects today.
- `_scrml_reconcile_list` removes items via removeChild; it does NOT dispose per-item effects — they self-guard via `_scrml_resolve_item(...) === null` early-return and go inert. Established/accepted lifecycle.

Approach C chosen: wrap the inner each's item-read + reconcile IIFE in a per-item `_scrml_effect(() => {...})` INSIDE the outer per-item closure. The closure already binds BOTH the outer iter var AND the closure-captured inner mount var. `_scrml_effect` un-pauses → `_scrml_reactive_get("shared")` subscribes; on `shared` change the effect re-runs and re-reconciles THIS instance's mount. Per-item lifecycle identical to existing per-item text/class effects (no new leak class).

Rejected:
- A (unique mount ids + global registry + per-instance effect_static): N global-registry entries per outer item; outer-item removal orphans them → real leak in the global map. Registry designed for stable top-level arm-remount ids.
- B (querySelectorAll all mounts + one top-level subscription): can't resolve the inner source when it depends on the OUTER iter var (`<each in=g.items>`) — that var is bound only inside the per-item closure. Only works for the file-scope-cell case; splitting by inner-source-kind is fragile.

Size: SURGICAL — one branch in renderTemplateChildToJs (the `child.kind==="each-block"` nested branch, emit-each.ts ~603-648). Move the items-read INSIDE the effect (so the reactive-get is tracked) and wrap the reconcile IIFE in `_scrml_effect`.

## Implementation + verification
- emit-each.ts: wrapped the inner source-read + reconcile in `_scrml_effect(() => {...})` in BOTH paths:
  - renderTemplateChildToJs nested-each branch (Tier-1 nested `<each>` in an outer each per-item body).
  - emitNestedEachFromMarkup (Tier-0 `${for…lift}`-nested each, Bug 72 sibling — identical bug class).
  - Mount creation/append stays OUTSIDE the effect (stable DOM node identity); the items-read moved INSIDE so `_scrml_reactive_get(...)` is a tracked dep.
- R26 emit grep (post-fix): inner `each_20` now emits `_scrml_effect(() => { const _scrml_each_items_8 = _scrml_reactive_get("shared"); ... _scrml_reconcile_list(_scrml_each_mount_7, ...) })` — read INSIDE the effect, per-item mount captured.
- happy-dom browser test (NEW compiler/tests/browser/g-nested-each-no-own-subscription.browser.test.js, 6 tests):
  - PRE-FIX (emit-each.ts swapped to 649780ab blob): 4 fail / 2 pass — §1 one-shot detector fails + ALL THREE §2 happy-dom assertions fail (inner lists frozen empty).
  - POST-FIX: 6 pass / 0 fail.
- No regression: each-in-tier0-lift-bug72 + nested-each-in-enclosing-scope still 10/10 pass.
