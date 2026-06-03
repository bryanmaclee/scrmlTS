# Bug 64 + R28-1c — per-item content reactivity on reconcile

change-id: bug-64-per-item-content-reactivity-on-reconcile-2026-06-03

## Log (append-only)

- startup: pwd=/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a4a02b593102bb0fc
- S112 merge-startup: base was 1a72c81c; `git merge main` fast-forwarded to 55cf3259 (Bug 72 3707e212 + Bug 60 55cf3259 present). emitNestedEachFromMarkup confirmed present in emit-each.ts.
- bun install OK; bun run pretest OK.
- SURVEY (CURRENT post-merge source, line nums shifted by Bug 72):
  - runtime-template.js _scrml_reconcile_list at ~1237; Fast-path-B2 at ~1306-1319.
  - _scrml_effect at ~2644; _scrml_track/_scrml_trigger at ~2500/2524; _scrml_prop_subscribers WeakMap at 2479.
  - emit-lift.js Tier-0: per-item text createTextNode at ~771 (emitSetContent) + ~1063 (markup logic bare-expr); class: ALREADY _scrml_effect-wrapped at ~650 + ~885. reconcile setup at emitForStmtWithContainer ~1415-1458 (createFn closure over varName; keyFn (item,i)=>item?.id??i).
  - emit-each.ts Tier-1: per-item text createTextNode at ~251/363/886 (STATIC); class: BARE classList.toggle at ~597 (NO effect — sibling-gap #1). reconcile lines emitEachReconcileLines ~1009-1070; keyFn resolveKeyFnBody ~932.

## Plan (ratified hybrid A)
1. runtime: _scrml_reconcile_list builds container._scrml_item_by_key (Map key->item) each pass + _scrml_trigger(container, "_scrml_items") so reused-node effects refresh on array-replace/reorder. Build+trigger BEFORE B2 bail so fast-path preserved (no node re-create). Add _scrml_resolve_item(container, key) resolver that _scrml_track(container, "_scrml_items") then returns the map entry.
2. emit-lift.js Tier-0: per-item interpolated TEXT -> live-keyed _scrml_effect reading via _scrml_resolve_item(wrapper, key). class: already effect — make it live-keyed too.
3. emit-each.ts Tier-1: per-item TEXT + class:/attr -> live-keyed _scrml_effect (closes sibling-gap #1). Unify both tiers on same model.

## Progress (append-only)
- runtime: _scrml_reconcile_list builds container._scrml_item_by_key per pass (newKeys computed ONCE, reused by B2/LIS/bulk-create) + _scrml_trigger(container,"_scrml_items") (skip first pass). _scrml_resolve_item(container,key) tracks item-slot + returns _scrml_deep_reactive(item) (null for missing). Coupled: reconcile-list-same-keys-fast-path §8 keyFn counts updated (5/5).
- Tier-0 (emit-lift.js + emit-control-flow.ts): module-level reconcile-ctx stack; createFn emits key local + push/pop ctx; emitSetContent (mixed text) + bare-expr markup text + BOTH class: sites live-keyed via maybeWrapLiftPerItemEffect. Coupled: GITI-019 §1/§2 assertions -> textContent shape.
- Tier-1 (emit-each.ts): module-level reconcile-ctx stack; emitEachReconcileLines emits key local + push/pop; renderTemplateChildToJs (shorthand textContent + ${} interp) + renderTemplateAttrToJs (class: + expr/var/call attr) live-keyed via maybeWrapEachPerItemEffect. class: was BARE toggle (sibling-gap #1) -> now live-keyed. Coupled: bug72 §2/§4/§5/§6 + R25-Bug-40 §6 assertions -> textContent shape.
- TESTS: each-per-item-reactivity-bug64.browser.test.js (9 happy-dom: both tiers x {array-replace,field-mut,reorder} + handler + no-node-churn x2). per-item-live-keyed-effect-bug64.test.js (2 unit emit-shape).
- KEY MECHANISM: per-item bindings are live-keyed _scrml_effect; resolve item by create-time key from container._scrml_item_by_key (rebuilt each reconcile pass); array-replace/reorder re-fire via _scrml_items trigger; field-mut re-fires via Proxy field subscription (deep-reactive resolver). Fast-path-B2 preserved (map build does NOT re-create nodes; no-op still bails). keyFn O(1) resolve; O(n) map build per pass.
- SIBLING GAP surfaced: scrml `function` body `${ @cell = x }` writes are DROPPED in client output (pre-existing; empty fn bodies). Not Bug 64 scope. Handler test routes through window.__sink instead.
- SIBLING GAP: per-item event handlers close over create-time item (not live-resolved). Display bindings (text/class/attr) are live-keyed; handlers are NOT. Reorder+handler -> handler fires with create-time item. Out of Bug 64 brief scope (brief: "handler still fires").
