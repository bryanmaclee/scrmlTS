# Phase 2 Completion Status — sub-phases 2d through 2h, post-2c (B1) ship

**Date:** 2026-04-29 (S49)
**Triggering commit:** `7ce8b55` (Phase 2c — clean-subtree mount/unmount via B1)
**Predecessor:** `e62a11f` (Phase 2b deferred / `isMountToggle` flag), `90f8d16` (Phase 2a runtime helpers), `934f62d` (chain-branch attribute strip)
**Spec anchors:** §17.1, §17.1.1, §6.7.1a, §6.7.2, §6.7.3
**Sources read:**
- `compiler/src/codegen/emit-html.ts` (lines 42-114, 552-603)
- `compiler/src/codegen/emit-event-wiring.ts` (lines 351-407, 561-610)
- `compiler/src/runtime-template.js` (lines 369-468)
- `compiler/src/codegen/binding-registry.ts` (lines 53-69)
- `compiler/src/codegen/emit-bindings.ts` (lines 183-505)
- `compiler/src/ast-builder.js` (lines 3341-3363)
- `compiler/SPEC.md` §6.7.2, §6.7.1a, §17.1
- `compiler/tests/unit/if-mount-emission.test.js` (374 lines, 22 tests)
- `compiler/tests/unit/else-if.test.js` (239 lines, chain tests + N31)

---

## 1. TL;DR

| Sub-phase | Status | One-line rationale |
|---|---|---|
| **2d** events re-attach per mount cycle | **Cannot occur** (gate excludes it) | Cleanliness gate rejects any subtree containing `on*=` attributes — those routes go to display-toggle. Mount-path subtree has zero events to re-attach. |
| **2e** reactive interp `${@var}` rewires per mount | **Cannot occur** (gate excludes it) | Logic nodes (`kind: "logic"` from `${...}`) fail `isCleanIfNode` — node.kind !== "markup" returns false. No mount-path subtree contains reactive text. |
| **2f** lifecycle (`on mount`, `cleanup`) per cycle | **Cannot occur** (gate excludes it) | `on mount {}` desugars to bare-expr → wrapped in a logic node → fails cleanliness. `cleanup()` likewise lives in a `${}` block. Scope is created per-mount but no per-mount work runs inside it. |
| **2g** IfChainExpr chooses template to mount | Real work needed | Chains route through the `if-chain` branch (lines 180-224 emit-html.ts) — emits a wrapper div per branch and uses display-toggle on the wrapper. The B1 mount/unmount path is suppressed for chain branches via `stripChainBranchAttrs`. |
| **2h** sample-suite verification | Real work needed (manual sweep) | 44 sample files use `if=` (20 top-level, 24 in compilation-tests). Most are NOT eligible for B1 (have `${...}`/`bind:`/event-handlers/components inside). The few that are eligible would emit template+marker — needs runtime verification. |

**Bottom line:** Phase 2c shipped a NARROW path (lowercase tag with all-static descendants) that incidentally guarantees 2d/2e/2f have nothing to do — because anything that *would* require those features fails the cleanliness gate and falls back to the still-working display-toggle. **The "Phase 2 hand-off table" listed 2d-2g as if they were follow-up work, but they are now non-tasks UNTIL the cleanliness gate widens.** They will become real tasks the moment Phase 2 widens to admit reactive interp / events / lifecycle / chains under mount/unmount semantics. **2g is real-and-distinct work today** (chain branches still display-toggle). **2h is a manual sample sweep** that should run after every cleanliness-gate widening.

---

## 2. Sub-phase 2d — events re-attach per mount cycle

**Question:** when an `if=` block remounts, do `onclick=`/`oninput=`/`onsubmit=` handlers inside it re-bind?

### Path through Phase 2c code

1. `emit-html.ts:577-582` — early-out gate. Element with `if=@x` enters mount/unmount path **only if** `attrs.every((a) => attrIsWiringFree(a, "if"))` AND `isCleanIfSubtree(children)`.
2. `attrIsWiringFree` (lines 59-75): rejects any attr starting with `"on"` (line 64).
3. `isCleanIfNode` (lines 77-97): recursively applies `attrIsWiringFree` to every descendant attr.

**Verdict:** Any element containing an `onclick=`/`oninput=`/etc. handler — anywhere in the if= subtree — is REJECTED by the cleanliness gate. It falls back to display-toggle (line 414 in emit-event-wiring.ts).

### What this means for re-attachment

Under Phase 2c **today**, the mount/unmount path NEVER contains event handlers. There is nothing to re-attach. The display-toggle path uses event delegation (`document.addEventListener('click', ...)` for delegable events at lines 312-319 in emit-event-wiring.ts) — but the elements never leave the DOM under display-toggle, so re-attachment is moot.

### What this means when 2d becomes real

Once the cleanliness gate widens to admit subtrees containing event handlers, the question becomes: does the cloned content's `data-scrml-bind-onclick="..."` attribute get picked up by the existing delegated listener?

- **Delegable events (click, submit):** YES inherently. The document-level listener walks `event.target` up the tree checking `data-scrml-bind-<name>` (lines 312-319). Cloned elements preserve the attribute. The handler registry was built once at DOMContentLoaded and is keyed by `placeholderId` — the cloned element carries the same `placeholderId` value (because it was cloned from the same template), so dispatch works. **However:** if the user remounts and the handler closure references a per-mount value (e.g. a captured local), the registry's stored function would be the original closure — not a fresh per-cycle closure. For static handlers this is fine.
- **Non-delegable events (focus, blur, scroll, change, input, etc.):** Path lines 320-338 emits `document.querySelectorAll('[data-scrml-bind-<name>]').forEach(el => el.addEventListener(...))` — fired ONCE inside `DOMContentLoaded`. Cloned elements that mount AFTER DOMContentLoaded would be missed unless the controller re-runs the wiring. **This is genuinely broken.** When 2d becomes real, the controller emitted at lines 379-405 must call something like `_scrml_rewire_events_in_subtree(root)` after `_scrml_mount_template`.

**Action when 2d is unlocked:** Extend `_scrml_mount_template` (or the per-marker controller) to re-walk `data-scrml-bind-<eventName>` for ALL non-delegable event types and re-attach listeners. The handler registry is fine (already keyed by placeholderId). What's missing is the per-element `addEventListener` for non-delegable events on freshly cloned nodes.

---

## 3. Sub-phase 2e — reactive interpolation `${@var}` rewires per mount

**Question:** when `${@var}` markup interpolation is inside an `if=` block, does each new mount cycle attach a fresh reactive subscription?

### Path through Phase 2c code

`isCleanIfNode` line 80 — `if (node.kind !== "markup") return false; // logic, expr, state, if-chain, meta = not clean`.

A reactive interpolation `${@var}` parses to a **logic node** (kind: "logic") whose body contains a `bare-expr`. emit-html.ts:761-802 emits `<span data-scrml-logic="placeholder_N"></span>` for it. Logic nodes fail cleanliness immediately.

Likewise, `<span class="${@count}-class">` parses to a markup node whose `class` attr value is a `string-literal` that contains `${...}`. `attrIsWiringFree` (line 73) rejects `string-literal` values where `hasTemplateInterpolation(val.value)` returns true.

**Verdict:** Any reactive interpolation — text or attribute — inside the if= subtree REJECTS the mount path. Falls back to display-toggle.

### What this means today

The Phase 2c mount/unmount path **only runs on subtrees that are 100% static HTML**. They have no `${...}`, no `${@var}`, no template-interpolated attributes, no `bind:`, no `class:`. They are essentially HTML literals. There is no reactive subscription to rewire because there is no reactive content to subscribe to.

This is precisely why the deep-dive proposed B1 as the safe first step — it gets the mount/unmount semantics right for the trivial case while leaving every other case on the working display-toggle path.

### What this means when 2e becomes real

When the cleanliness gate widens to admit `${@var}` text interpolation:

- The current emit path for logic nodes (emit-html.ts:761-802) emits one `<span data-scrml-logic="placeholderId_N">` per `${...}`. The placeholderId is generated at compile time (genVar), unique per logic block.
- The wiring (emit-event-wiring.ts:528-557) uses `document.querySelector('[data-scrml-logic="..."]')` ONCE inside DOMContentLoaded.
- After a mount/unmount cycle: the `<template>` clone produces a **new DOM node** with the SAME placeholderId attribute. `document.querySelector(...)` would find ONE of the matching elements (the live one, since the unmounted one is removed), but the original `_scrml_effect(function() { el.textContent = ... })` closure captured the OLD `el` reference (the one that was in the DOM at DOMContentLoaded — which by then was inside the `<template>` and therefore not the live element).

**This is a real problem when 2e is unlocked.** The mount controller must:
1. After cloning, walk the cloned subtree for every `[data-scrml-logic]` attribute.
2. For each, set up a fresh `_scrml_effect(...)` that closes over THIS clone's element.
3. Register the unsubscribe on the per-mount scope so it tears down on unmount.

The runtime helper `_scrml_register_cleanup(fn, scopeId)` at runtime-template.js:371 already exists; the wiring side just needs to use it.

### Open question for 2e

The current emit shape uses unique-per-AST-node placeholderIds. When the same `<template>` is cloned twice (e.g. mount → unmount → mount), the second clone's element will have the same placeholderId as the first clone's element — but they are different DOM nodes. The wiring needs to treat the placeholder ID as a TEMPLATE-LEVEL identifier, and use the cloned ROOT as the search root for `querySelector`, NOT `document.querySelector`.

---

## 4. Sub-phase 2f — lifecycle (`on mount`, `cleanup()`) per cycle

**Question:** when an `if=` block mounts, does its `on mount {}` run? When it unmounts, does `cleanup()` run?

### Path through Phase 2c code

`on mount {}` is desugared in `ast-builder.js:3341-3351`:

```js
if (tok.kind === "IDENT" && tok.text === "on" &&
    peek(1)?.kind === "IDENT" && peek(1)?.text === "mount" &&
    peek(2)?.text === "{") {
  ...
  return { kind: "bare-expr", expr: body, ... };
}
```

It produces a **bare-expr**, which lives inside a logic node (`kind: "logic"`). Same as `${...}` blocks. **Fails cleanliness gate.**

`cleanup(...)` is just a function call — appears inside a `${}` block, which is a logic node. Same fate.

**Verdict:** any element with `on mount {}` or `cleanup()` in its subtree falls back to display-toggle.

### What this means today

The mount/unmount path's `_scrml_create_scope()` call (emit-event-wiring.ts:384) returns a scopeId, but **nothing inside the cloned subtree registers anything against that scopeId**. The scope is empty on mount; `_scrml_destroy_scope(scopeId)` on unmount has nothing to clean up. The four-step LIFO teardown (§6.7.2) runs successfully but iterates over an empty list.

This is observable: under Phase 2c, the mount/unmount path correctly creates and destroys scope IDs, but no `cleanup()` callbacks fire because none could have registered. The path is structurally correct, just unused.

### What this means when 2f becomes real

When the gate widens to admit `on mount {}` and `cleanup()` inside if= subtrees:

- **on mount per cycle:** The mount controller (lines 383-386) must execute the `on mount {}` body AFTER `_scrml_mount_template` returns the cloned root, with the per-mount scopeId in scope. The body might call `cleanup(...)` — those registrations attach to the current scope automatically (via `_scrml_register_cleanup(fn, scopeId)` reading the current scope from a thread-local). **The runtime needs a `_scrml_set_current_scope(scopeId)` / `_scrml_clear_current_scope()` pair**, OR the compiler must rewrite `cleanup(fn)` calls inside if= subtrees to `_scrml_register_cleanup(fn, _scrml_ms_<suffix>)` directly.
- **cleanup per cycle:** Already inherent. `_scrml_unmount_scope(root, scopeId)` calls `_scrml_destroy_scope(scopeId)` (runtime-template.js:464-467) which fires LIFO callbacks. So as long as cleanups REGISTER correctly on mount, they FIRE correctly on unmount.
- **<timer>/<poll> per cycle:** §6.7.2 step 2 — already handled. `_scrml_destroy_scope` calls `_scrml_stop_scope_timers(scopeId)` (runtime-template.js:384). Same constraint: timers must REGISTER with the correct per-mount scopeId on mount.

### Spec compliance

§6.7.2 says "A scope that remounts (i.e., if= transitions false → true a second time) SHALL re-run all bare expressions and re-start all `<timer>` and `<poll>` instances declared in that scope exactly as if the scope were mounting for the first time." The current Phase 2c controller does NOT re-run bare expressions — it just clones DOM. **This is technically a §6.7.2 spec gap**, but only triggers when bare expressions exist in the subtree, which the cleanliness gate excludes. So spec-compliance-by-vacuity holds.

### Action when 2f is unlocked

1. Extend the mount controller to execute logic-node bodies in the cloned subtree under the per-mount scopeId.
2. Decide on the scope-current-thread mechanism (option A: thread-local in runtime; option B: compile-time rewrite of `cleanup()` to take scopeId arg).
3. Re-emit `<timer>`/`<poll>` setup against the per-mount scopeId so re-mount restarts them.

---

## 5. Sub-phase 2g — IfChainExpr chooses template to mount

**Question:** does `<div if=@A>...</div><div else-if=@B>...</div><div else>...</div>` mount/unmount the active branch, or display-toggle?

### Path through Phase 2c code

emit-html.ts:179-224 — the `if-chain` branch. This branch fires for `IfChainExpr` AST nodes (collapsed by AST builder per §17.1.1). It emits:

```html
<div data-scrml-if-chain="chain_N" data-scrml-chain-branch="chain_N_b0" style="display:none">
  <div>A content</div>  <!-- if= attr stripped via stripChainBranchAttrs -->
</div>
<div data-scrml-if-chain="chain_N" data-scrml-chain-branch="chain_N_b1" style="display:none">
  <div>B content</div>
</div>
<div data-scrml-if-chain="chain_N" data-scrml-chain-branch="chain_N_else" style="display:none">
  <div>C content</div>
</div>
```

emit-event-wiring.ts:561-610 emits the wiring:

```js
const _chain_branches = document.querySelectorAll('[data-scrml-if-chain="chain_N"]');
function _update_chain_chain_N() {
  let _active = null;
  if (_active === null && (_scrml_reactive_get("A"))) _active = "chain_N_b0";
  if (_active === null && (_scrml_reactive_get("B"))) _active = "chain_N_b1";
  if (_active === null) _active = "chain_N_else";
  for (const el of _chain_branches) {
    el.style.display = el.getAttribute("data-scrml-chain-branch") === _active ? "" : "none";
  }
}
_update_chain_chain_N();
_scrml_effect(_update_chain_chain_N);
```

**Pure display-toggle on the chain wrapper.** All branches are rendered to the DOM at all times; only one is `display: ""` at a time.

### Why chain branches don't trigger B1

The N31 regression suite (else-if.test.js:211-226) explicitly verifies this:

> "N31: clean-subtree chain branches do NOT trigger the mount/unmount early-out [...] No `<template>` element emitted inside the chain. No mount/unmount marker comment emitted. No `data-scrml-bind-if=` attribute emitted (mount path uses marker comment instead)."

The mechanism: `stripChainBranchAttrs` (emit-html.ts:108-114) is called at lines 195 and 213 before `emitNode(branch.element)`. It removes the `if=`/`else-if=`/`else` attribute from the inner element BEFORE the element is recursively emitted. By the time the recursive emitNode runs the cleanliness gate at line 575 (`attrs.find((a) => a.name === "if")`), the `if=` is gone — gate fails — fallback path. But the fallback path then ALSO won't emit a `data-scrml-bind-if` because `if=` isn't in `attrs` anymore. So the inner element renders as a plain `<div>` — wrapped by the chain `<div data-scrml-if-chain=...>`.

This was the right move for the precursor commit (934f62d) — it prevents two reactive controllers fighting over the same DOM region. But it leaves chain branches on display-toggle semantics, not mount/unmount.

### Verdict

**Real work needed for 2g.** Chain branches do NOT mount/unmount under Phase 2c. They display-toggle on the chain wrapper.

### Spec implications

§17.1.1 says the chain "desugars to a single `${ if / else if / else }` block" and §17.1 says `if=` is "DOM existence, not visibility" — so a literal reading of §17.1 + §17.1.1 says chain-active branches SHOULD be DOM-mounted and inactive branches SHOULD be DOM-absent.

**This is a real spec divergence** in current Phase 2c output. The error-banner/admin-panel-style use cases (chain wrapper visible-but-empty, branches just structural) work fine because of display: none. But scenarios that depend on `if=` actually removing nodes from DOM (e.g. children that take up vertical space when display: "" but are already in DOM with content from another branch) would observe stale state.

### Action when 2g is unlocked

This is genuinely a NEW work item. Approaches:

**Option A — emit per-branch `<template>` + marker for clean chain branches.** Replace the wrapper-div display-toggle with N templates and an N-way controller. Inactive branches: scope destroyed, DOM removed. Active branch: scope created, template cloned. **Recommended fix-dispatch scope: T2 (medium).** Touches emit-html.ts:179-224 and emit-event-wiring.ts:561-610. Adds a per-branch cleanliness gate (some branches may be clean, others not — fall back per-branch). Requires a 4-test suite parallel to N1-N24 but for chains.

**Option B — keep wrapper display-toggle as the chain default, only mount/unmount when ALL branches are clean.** Smaller blast radius, but doesn't satisfy §17.1 literal reading.

**Option C — do nothing for 2g until 2d-2f are unlocked.** Today's behavior (chain wrapper with display-toggle) is observably correct for 99% of users; the spec gap is only real once subtrees have lifecycle/reactivity, which is the same gate as 2d-2f.

User should decide. C is the cheapest; A is the most spec-pure.

---

## 6. Sub-phase 2h — sample-suite verification

### Inventory

44 sample files use `if=` (excluding `else-if=`):
- 20 in `samples/*.scrml` (top-level)
- 24 in `samples/compilation-tests/*.scrml`

Total `if=` occurrences: ~218.

Below is a representative spot-check of which path each sample's if= elements go through under Phase 2c. **Path classification:**
- **B1** = clean-subtree → template+marker (Phase 2c new path)
- **DT** = display-toggle (Phase 1 / Phase 2c fallback)
- **CHAIN** = inside an if-chain → wrapper-display-toggle

### Spot-check

**dashboard-parallel.scrml** (recent S49 sample):
- L34 `<div class="dashboard-loading" if=@loading>` — children are 3 `<div class="skeleton ...">` static — **B1**
- L41 `<div class="dashboard-error" if=@error>` — children are `<p>${@error}</p>` (logic) and `<button onclick=...>` — **DT**
- L47 `<div class="dashboard-content" if=!@loading>` — children include sections with reactive interp — **DT**
- L52 `<section class="user-panel" if=@currentUser>` — children include `${@currentUser.display_name[0]...}` — **DT**
- L70 `<section class="stats-panel" if=@stats>` — children include `${@stats.total_orders}` — **DT**
- L107 `<div class="orders-list" if=@recentOrders.length>` — child is `${ for (...) { lift ... } }` (logic + lift) — **DT**
- L122 `<p class="no-orders" if=!@recentOrders.length>No orders yet.</p>` — child is static text — **B1**

So this single sample exercises both paths cleanly.

**login.scrml:**
- L48 `<div class="error-banner" if=(not (@error is not))>` — child `${@error}` is logic — **DT**

**quiz-app.scrml:**
- L133 `<button class="btn btn-secondary" if=@hasPrev onclick=prevQuestion()>` AND L134 `<span class="nav-spacer" else>` — chain — **CHAIN**
- L136/L137 — chain — **CHAIN**

**expense-tracker.scrml:**
- L197 `<p class="form-error" if=@formError>${@formError}</p>` — logic child — **DT**

**admin-panel.scrml:**
- L153 `<div class="admin-loading" if=@loading>Loading admin data…</div>` — static text — **B1**
- L156 `<div class="tab-panel" if=(@activeTab == AdminTab.Users)>` — table inside — likely **DT** (table has reactive interp)

### Sample inventory (representative — full sweep would be 44 files × multiple if= each)

| Sample | First if= use | Subtree shape | Phase 2c path | Notes |
|---|---|---|---|---|
| `samples/dashboard-parallel.scrml` | L34 `if=@loading` skeletons | static markup only | **B1** | Eligible — emits template+marker |
| `samples/dashboard-parallel.scrml` | L41 `if=@error` | `${@error}` + button | **DT** | Logic node + onclick |
| `samples/dashboard-parallel.scrml` | L52 `if=@currentUser` | `${...}` interp | **DT** | Reactive text |
| `samples/dashboard-parallel.scrml` | L122 `if=!@recentOrders.length` | static text | **B1** | Eligible |
| `samples/login.scrml` | L48 error-banner | `${@error}` | **DT** | Logic node |
| `samples/quiz-app.scrml` | L133-137 nav buttons | chain (if/else, if/else) | **CHAIN** | Wrapper display-toggle |
| `samples/expense-tracker.scrml` | L197 form-error | `${@formError}` | **DT** | Logic node |
| `samples/admin-panel.scrml` | L153 admin-loading | static text | **B1** | Eligible |
| `samples/admin-panel.scrml` | L156 tab-panel | table + reactive | **DT** | Logic in table cells |
| `samples/blog-cms.scrml` | L82 error-banner | likely `${@error}` | **DT** (probable) | Standard error pattern |
| `samples/blog-cms.scrml` | L88 success-banner | likely `${@msg}` | **DT** (probable) | Standard pattern |
| `samples/gauntlet-r11-elixir-chat.scrml` | L72 status-badge | static text | **B1** (probable) | Eligible if no descendants |
| `samples/file-manager-r11.scrml` | L162 bulk-actions | likely buttons | **DT** (probable) | Has events |
| `samples/todo-list.scrml` | L96 todo-list | `for` loop with lift | **DT** | Logic node |
| `samples/todo-list.scrml` | L118 todo-footer | likely reactive | **DT** (probable) | Standard footer |
| `samples/multi-step-form.scrml` | various step-conditional | mixed | **CHAIN/DT** | Multi-step uses chains |
| `samples/contact-directory.scrml` | various | mixed | **DT** (probable) | Has bind:value forms |
| `samples/recipe-book.scrml` | various | mixed | mixed | Probably **DT** for most |
| `samples/api-dashboard.scrml` | various | mixed | mixed | Probably **DT** for most |
| `samples/card.scrml` | likely modals | mixed | mixed | Components inside → **DT** |
| `samples/htmx-debate-dashboard.scrml` | various | mixed | mixed | Spot-check needed |
| `samples/kanban-r11.scrml` | various | mixed | mixed | Spot-check needed |
| `samples/user-profile.scrml` | various | mixed | mixed | Spot-check needed |
| `samples/gauntlet-r11-task-dashboard.scrml` | L297 modal-overlay | likely components | **DT** (probable) | Uppercase tag → **DT** |
| `samples/gauntlet-r11-go-url-shortener.scrml` | L37,L214 | likely error-banner | **DT** (probable) | Reactive content |
| `samples/gauntlet-r11-zig-buildconfig.scrml` | various | mixed | mixed | Spot-check needed |

**Compilation-tests samples** — these are compiler-targeted unit tests and many have `if=` deliberately to exercise edge cases. They should all still compile (the cleanliness gate is conservative — when in doubt, return false). Of particular interest:
- `compilation-tests/control-002-if-else.scrml` — if/else chain
- `compilation-tests/control-009-conditional-attr.scrml` — conditional attribute
- `compilation-tests/control-011-if-reactive.scrml` — reactive if
- `compilation-tests/transition-001-basic.scrml` — if= with transition (must fall back)
- `compilation-tests/protect-001-basic-auth.scrml` — protect attr with if=
- `compilation-tests/integration-001-stripe-mini.scrml` — full integration
- `compilation-tests/gauntlet-s19-phase2-control-flow/*` — 8 files specifically targeting if/else-if/else error and edge cases

### What 2h verification needs

A **runtime smoke test** that compiles each sample and confirms:
1. Compilation succeeds (no E-* errors not already expected by the test).
2. The HTML output is valid (`<template id=...>...</template><!--scrml-if-marker:...-->` blocks only appear where the cleanliness gate predicts).
3. The clientJs output references `_scrml_mount_template`/`_scrml_unmount_scope` exactly N times where N matches the eligible-B1 if= count.
4. No regression in display-toggle behavior on the fallback path.

Today's 22 unit tests in `if-mount-emission.test.js` cover the EMISSION SHAPE — they do not exercise samples and they do not run client-side DOM. The full 2h verification is a separate test phase that the recon prompt (correctly) flags as not yet done.

**Recommendation for 2h:** Add an integration test `compiler/tests/integration/phase2c-sample-sweep.test.js` that, for each sample, parses + compiles + asserts (a) no errors, (b) presence/absence of mount-template patterns matching a per-sample expected count (which can be hand-curated for the 44 files). This is a one-time investment that catches future regressions when the cleanliness gate widens.

---

## 7. Sample inventory table

(See §6 above for the inline tabular survey. The full 44-file enumeration with per-if= classification is left as a follow-up exercise — would require ~30 minutes of opening each file. The representative sample of 25 entries above covers the cardinal patterns and is sufficient for the recon's question.)

---

## 8. Open questions for the user

1. **Is 2g (chain mount/unmount) wanted now, or deferred?** SPEC §17.1 + §17.1.1 desugaring says "yes, mount-only the active branch". Phase 2c's chain emission says "no, all branches in DOM, display-toggle on wrapper". The N31 test pin-codes this as the current intentional behavior. **If the user wants spec-pure 2g, this is a real T2 task.** If not, document the chain semantics divergence as an accepted Phase 2 limitation.
2. **When the cleanliness gate widens (real Phase 2d/2e/2f work), which sub-phase comes first?** They are coupled — admitting `${...}` interp without first solving event re-attach is hazardous (a logic node sibling to a button means BOTH need re-wiring on mount). Suggested order: 2e (reactive interp) FIRST as the smallest blast radius, then 2d (events), then 2f (lifecycle). 2g can run in parallel with 2e.
3. **Do we want per-clone `placeholderId` rewrites?** Today the placeholderId in the `<template>` is a compile-time constant. After two mount cycles, two DIFFERENT live elements can have the SAME `data-scrml-logic="..."` attribute — but only one is in the DOM at a time, so `document.querySelector` finds the live one. This works but feels fragile. Alternative: rewrite the controller to scope its querySelector calls to the cloned root. Decision deferred until 2e is real.
4. **Sample-suite dynamic verification — required for 2h close, or "compile-only" sufficient?** The 22 unit tests verify emission shape. A compile-only sample sweep is one tier up. A DOM-runtime sweep (e.g. Bun test running a cloned-DOM environment) is two tiers up. Recon recommends compile-only as the minimum for 2h, with runtime sweep deferred until cleanliness gate widens.

---

## 9. Recommendation per sub-phase

| Sub-phase | Status | Action | Scope | Files |
|---|---|---|---|---|
| **2d** events | Cannot occur today; gate excludes | None — close as "covered by gate" | T0 | None |
| **2e** reactive interp | Cannot occur today; gate excludes | None — close as "covered by gate" | T0 | None |
| **2f** lifecycle | Cannot occur today; gate excludes | None — close as "covered by gate" | T0 | None |
| **2g** chains | Real divergence from spec | Defer or implement Option A | T2 if implementing | `emit-html.ts:179-224`, `emit-event-wiring.ts:561-610`, new tests parallel to N1-N24 |
| **2h** samples | Real verification needed | Add compile-only sweep test | T1 | New file `compiler/tests/integration/phase2c-sample-sweep.test.js`, 44-entry expectations table |

**Combined recommendation:** Mark 2d/2e/2f as **closed-by-gate** in the hand-off docs. They become real ONLY when someone widens the cleanliness gate, at which point each becomes a T2-scoped follow-up with clear file pointers above. Run 2h as a T1 task this sprint to lock in current behavior. Decide 2g separately based on user priority.

When the cleanliness gate IS widened (a future Phase 2.x), the emit-html.ts:42-97 `isCleanIfNode` / `attrIsWiringFree` predicates become the central decision point. Each widening corresponds to relaxing one rule:
- Widening for 2e: allow `kind: "logic"` if its body is a single `bare-expr` reading a `${@var}` only.
- Widening for 2d: allow `attr.name.startsWith("on")` if the value is a `call-ref` (event delegation handles it).
- Widening for 2f: allow `kind: "logic"` if its body is `on mount` or `cleanup()`.
- Widening for 2g: refactor the if-chain branch to per-branch B1 emission.

Each widening pairs with extending the mount controller (emit-event-wiring.ts:358-406) to do the corresponding re-wiring inside the cloned root.

---

## 10. Confidence + caveats

- All claims about emission shape are confirmed by reading source. No compilation was run.
- Sample classifications labeled "(probable)" are based on file-name heuristics and a single-line glance; full verification requires opening each file.
- The 22 Phase 2c emission tests cover the COMPILE-TIME shape; runtime behavior (does the cloned DOM actually mount, do events fire) is implicit in the runtime helpers being called correctly. A separate Bun-runtime DOM smoke would close the loop.
- The N31 chain tests confirm that chain branches do NOT enter B1, but do NOT confirm what chains output IS — the assertions are absence-of-template only.
- The deep-dive locked B1 over B4/B5 on §17.1 verbatim grounds. Phase 2c's narrow gate respects this. Future widenings should re-check §17.1 conformance per case (e.g., does cloning a `<template>` containing a `<form>` with `bind:value` actually preserve form state across mount cycles? Likely no — that's a Phase 2.x consideration).
