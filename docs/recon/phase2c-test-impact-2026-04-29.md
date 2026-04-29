# Phase 2c Test-Impact Recon

**Date:** 2026-04-29
**Recon agent:** scrmlTS recon (read-only)
**Caller:** Phase 2c fix agent (next session)
**Type:** prediction-from-reading (no test runs)

---

## 1. Scope confirmation

### Commit pointers

| Commit | Date | Role |
|---|---|---|
| `90f8d16` | 2026-04-29 10:23 | Phase 2a — runtime helpers + `isMountToggle`/`templateId`/`markerId` fields on `LogicBinding` |
| `e62a11f` | 2026-04-29 10:47 | Phase 2b — emit-html early-out + emit-event-wiring controller, **early-out commented-out and deferred** |

### Comment anchor

`compiler/src/codegen/emit-html.ts:524-572` — the dead block is wrapped in
`// Phase 2b of if/show split — DEFERRED to Phase 2c (2026-04-29 wrap).`
Search anchor: `Phase 2b of if/show split — DEFERRED`.

### Live (display-toggle) path — what runs today

`emit-html.ts:626-672` — for an `if=` / `show=` attribute with kind `variable-ref` or `expr`:

- Emits `<tag ...data-scrml-bind-if="<placeholderId>" ...>`
- Registers `LogicBinding { placeholderId, expr, isConditionalDisplay (or isVisibilityToggle), varName | condExpr/condExprNode/refs, ...transition? }`
- The element keeps its position as a normal child of its parent — children are still emitted inline.

`emit-event-wiring.ts:414-486` — consumes `isConditionalDisplay`/`isVisibilityToggle` bindings and emits:

```js
{
  const el = document.querySelector('[data-scrml-bind-if="<placeholderId>"]');
  if (el) {
    el.style.display = <cond> ? "" : "none";
    _scrml_effect(function() { el.style.display = <cond> ? "" : "none"; });
  }
}
```

(Plus a transition-aware variant when `transitionEnter`/`transitionExit` is set.)

### Dead (mount/unmount) path — what Phase 2c will activate

`emit-html.ts:544-572` — when the if= element passes the cleanliness gate (lower-case tag, all attrs `attrIsWiringFree(_, "if")`, all children pass `isCleanIfNode` recursively):

- Emits `<template id="<templateId>"><tag ...attrs-without-if...>...</tag></template>`
- Followed by `<!--scrml-if-marker:<markerId>-->`
- Registers `LogicBinding { placeholderId: markerId, expr, isMountToggle: true, templateId, markerId, varName | condExpr/condExprNode/refs }` (note: this binding has **no** `isConditionalDisplay` flag; consumers must use `isMountToggle` instead).

`emit-event-wiring.ts:358-407` — already wired (live, but never reached because no emitter sets `isMountToggle` while the dead block is commented out). Emits a controller of the form:

```js
{
  let _scrml_mr_<suffix> = null;
  let _scrml_ms_<suffix> = null;
  function _scrml_if_mount_<suffix>() {
    _scrml_ms_<suffix> = _scrml_create_scope();
    _scrml_mr_<suffix> = _scrml_mount_template("<markerId>","<templateId>");
  }
  function _scrml_if_unmount_<suffix>() {
    if (_scrml_mr_<suffix> !== null) {
      _scrml_unmount_scope(_scrml_mr_<suffix>, _scrml_ms_<suffix>);
      _scrml_mr_<suffix> = null;
      _scrml_ms_<suffix> = null;
    }
  }
  if (<cond>) _scrml_if_mount_<suffix>();
  _scrml_effect(function() {
    if (<cond>) {
      if (_scrml_mr_<suffix> === null) _scrml_if_mount_<suffix>();
    } else {
      if (_scrml_mr_<suffix> !== null) _scrml_if_unmount_<suffix>();
    }
  });
}
```

`<suffix>` is `(placeholderId || markerId).replace(/[^a-zA-Z0-9_]/g, "_")`. Since the dead block sets `placeholderId = markerId`, `<suffix>` is just the markerId (`_scrml_if_marker_N`).

### Cleanliness gate semantics (`emit-html.ts:42-97`)

| Condition | Returns false (NOT clean → display-toggle fallback) |
|---|---|
| Tag starts with uppercase letter | Components have own wiring |
| Any attr name in `if`, `show`, `else`, `else-if`, `protect`, `auth`, `slot` (other than the `allowName`) | Special directives |
| Any attr name starts with `on`, `bind:`, `class:`, `transition:`, `in:`, `out:` | Wiring attrs |
| Any attr value with `kind: "expr"` or `string-literal` containing `${...}` | Reactive interpolation |
| Any attr value `kind: "variable-ref"` whose name starts with `@` | Reactive var ref |
| Child node not in `{text, comment, markup}` | logic, expr, state, if-chain, meta = not clean |
| Any descendant violates the above | Recursive |

### LogicBinding shape diff

Field | Live path | Dead path
--- | --- | ---
`placeholderId` | from `genVar("attr_if")` (e.g. `_scrml_attr_if_3`) | set to `markerId` (e.g. `_scrml_if_marker_4`)
`isConditionalDisplay` | `true` | **absent**
`isMountToggle` | absent | `true`
`templateId` | absent | from `genVar("scrml_tpl")` (e.g. `_scrml_scrml_tpl_3`)
`markerId` | absent | from `genVar("if_marker")` (e.g. `_scrml_if_marker_4`)
`expr` | `@<varName>` or raw | `@<varName>` or raw (`val.raw`)
`condExpr`/`condExprNode`/`refs` | set when expr-kind | set when expr-kind
`varName`/`dotPath` | set when variable-ref-kind | set when variable-ref-kind
`transitionEnter`/`transitionExit` | set when present | **always absent** (transition attrs reject cleanliness)

---

## 2. Test-impact table

The user's "~22 failures" estimate is in that ballpark. My count below: **24 failing assertions** in 5 unit-test files + **1 browser test file** with ~3 failing tests. Detailed breakdown per file. Each row is one expect() call that I predict will flip from PASS to FAIL when the early-out activates.

`SUFFIX = _scrml_if_marker_<N>` (var-counter is monotonic per compile, IDs depend on call order — these are illustrative).

### 2.1  `compiler/tests/unit/if-expression.test.js` (16 failing assertions, 12 distinct tests)

| # | Test (line) | Current asserted output | Predicted new output | Change type |
|---|---|---|---|---|
| 1 | §8 "expr if= emits data-scrml-bind-if placeholder" (343) | `html.toContain("data-scrml-bind-if=")` | New html contains `<template id="..."><div>content</div></template><!--scrml-if-marker:...-->`. No `data-scrml-bind-if=` substring. | **UPDATE** assertion to check for `<template id=` + `scrml-if-marker:` in html. |
| 2 | §8 "if= expr does NOT emit if= as an HTML attribute" (355) | `html.not.toContain(' if="')` and `not.toContain(" if=")` | Still passes — but assertion is now redundant (the early-out path also strips `if`). | **KEEP** as-is (semantically still valid). |
| 3 | §9 "binding is recorded with isConditionalDisplay = true" (371) | `binding.isConditionalDisplay === true` (find by `b => b.isConditionalDisplay`) | No binding has `isConditionalDisplay`; find returns undefined. | **DELETE** or **SPLIT** into two: (a) clean-subtree → assert `isMountToggle === true`; (b) non-clean subtree (add a child with onclick) → assert `isConditionalDisplay === true`. See §3 below — this is one of the locks. |
| 4 | §9 "binding has condExpr with the raw expression text" (382) | `binding.condExpr === "!@active"` (found via `b => b.isConditionalDisplay`) | Find by `b.isMountToggle` instead; condExpr field is still `"!@active"` on the new binding. | **UPDATE** the find predicate to `b => b.isMountToggle`. |
| 5 | §9 "binding has refs array from expression" (392) | `binding.refs.toContain("a")` etc. (found via isConditionalDisplay) | Same as above — find via `isMountToggle`. | **UPDATE** find predicate. |
| 6 | §10 "@a && @b — subscribes to both 'a' and 'b'" (409) | `clientJs.toContain('_scrml_effect')` | Still passes — controller has `_scrml_effect`. | **KEEP**. |
| 7 | §10 "!@active — subscribes to 'active'" (419) | `clientJs.toContain('_scrml_effect')` | Still passes. | **KEEP**. |
| 8 | §10 "@count > 5 — subscribes to 'count'" (429) | `clientJs.toContain('_scrml_effect')` | Still passes. | **KEEP**. |
| 9 | §11 "!@active → !_scrml_reactive_get('active') in wiring" (445) | `clientJs.toContain('_scrml_reactive_get("active")')` and `'!_scrml_reactive_get("active")'` | Still passes — controller still uses `(!_scrml_reactive_get("active"))` as condition. | **KEEP**. |
| 10 | §11 "@a && @b → _scrml_reactive_get('a') && _scrml_reactive_get('b')" (456) | `_scrml_reactive_get("a")`, `_scrml_reactive_get("b")`, `&&` | Still passes. | **KEEP**. |
| 11 | §11 "conditional display uses el.style.display toggle" (468) | `clientJs.toContain('el.style.display')` AND `'"none"'` | **el.style.display NO LONGER EMITTED** for clean-subtree. `"none"` may still appear elsewhere (transitions, if-chain) but not in this single-node test. | **DELETE**. The new path uses mount/unmount, not display-toggle. Replace with assertion on `_scrml_mount_template`. |
| 12 | §12 "if=!@active: element hidden when active is truthy" (485) | `'!_scrml_reactive_get("active")'` AND `'"none"'` | First assertion still passes; `'"none"'` no longer in compiled output. | **SPLIT**: keep first, delete second; add `_scrml_unmount_scope` assertion. |
| 13 | §13 "@a && @b — both 'a' and 'b' trigger re-evaluation" (503) | `clientJs.toContain('_scrml_effect')` | Still passes. | **KEEP**. |
| 14 | §14 "@a \\|\\| @b — both 'a' and 'b' trigger re-evaluation" (520) | `_scrml_effect`, `\|\|` | Still passes. | **KEEP**. |
| 15 | §15 "if=@active still emits data-scrml-bind-if placeholder" (537) | `out.html.toContain("data-scrml-bind-if=")` | No `data-scrml-bind-if=`; html contains `<template id="...">` + marker comment. | **UPDATE** to `<template id=` and `scrml-if-marker:`. |
| 16 | §15 "if=@active subscribes to 'active' and uses simple display toggle" (547) | `_scrml_effect` AND `el.style.display` | `_scrml_effect` still passes; `el.style.display` does not. | **SPLIT**: keep first, delete second, add `_scrml_mount_template` assertion. |
| 17 | §15 "if=@active wiring uses _scrml_reactive_get('active')" (558) | `_scrml_reactive_get("active")` | Still passes. | **KEEP**. |
| 18 | §16 "if=@obj.prop — emit-html generates data-scrml-bind-if placeholder" (654) | `html.toContain("data-scrml-bind-if")` | No `data-scrml-bind-if`; html has `<template id=`. | **UPDATE** to assert `<template id=` AND `scrml-if-marker:`. |

**Notes for §1, §2, §3, §4 (lines 121-240):** These are tokenizer-level tests. They do not call `compile()` or `generateHtml()`. **Unaffected** by Phase 2c.
**Notes for §5, §6, §7 (lines 246-336):** AST-builder-level tests. **Unaffected**.
**Notes for §16 §17-§20 (lines 638-789):** Mostly tokenizer + AST-builder. The single emit-html test in §16 (line 654) is row 18. The rest are unaffected.

### 2.2  `compiler/tests/unit/allow-atvar-attrs.test.js` (4 failing assertions, 4 distinct tests)

| # | Test (line) | Current asserted output | Predicted new output | Change type |
|---|---|---|---|---|
| 19 | §2 "if=@visible produces data-scrml-bind-if" (144) | `out.html.toContain("data-scrml-bind-if=")` | html has `<template id="..."><div>text</div></template><!--scrml-if-marker:N-->`. | **UPDATE** to check for `<template id=` + `scrml-if-marker:`. |
| 20 | §2 "if=@visible wires reactive subscription" (153) | `clientJs.toContain('_scrml_effect(')` AND `clientJs.toContain("el.style.display")` | First passes; second does NOT. | **SPLIT**: keep `_scrml_effect`; replace `el.style.display` with `_scrml_mount_template`. |
| 21 | §2 "if=@visible does not strip the @ prefix" (163) | `not.toContain('if="visible"')` AND `toContain("data-scrml-bind-if=")` | First passes; second does NOT. | **SPLIT**: keep first; replace second with `<template id=`. |
| 22 | §7 "if=@visible + show=@count — both reactive (Phase 1)" (314) | `toContain("data-scrml-bind-if=")` AND `toContain("data-scrml-bind-show=")` AND `not.toContain('show="count"')` AND `not.toContain('if="visible"')` | The element has BOTH `if=` AND `show=`. `attrIsWiringFree` rejects `show` as not wiring-free (not equal to allowName "if"). So this element fails cleanliness gate → falls through to display-toggle → all four assertions still pass. | **KEEP**. |
| 23 | §8 "if=@user.loggedIn keeps @ behavior (reactive binding)" (347) | `toContain("data-scrml-bind-if=")` AND `not.toContain('if="user.loggedIn"')` | First does NOT pass (clean subtree → template path); second still passes. | **SPLIT**: replace first with `<template id=`; keep second. |

**§1 / §3 / §4 / §5 / §6** assertions are about `show=`, `bind:value`, `bind:checked`, tokenizer, and AST-builder. **Unaffected** because:
- `show=` does not pass through the dead block (only `if=` triggers the early-out check).
- `bind:` is not on an if= element — but even when `bind:` and `if=` coexist (none in this file), the cleanliness gate rejects bind: (see §1 row).

### 2.3  `compiler/tests/unit/if-is-variant.test.js` (5 failing assertions, 3 distinct tests)

| # | Test (line) | Current asserted output | Predicted new output | Change type |
|---|---|---|---|---|
| 24 | §3 "if={state is .Loading} — HTML contains data-scrml-bind-if" (170) | `html.toContain("data-scrml-bind-if=")` | Element children: `<text "Loading...">` only. Tag is `<div>`. Subtree clean. → `<template id=...><div>Loading...</div></template><!--scrml-if-marker:N-->`. | **UPDATE** assertion. |
| 25 | §3 "if={state is .Loading} — binding registered in registry" (180) | `b => b.isConditionalDisplay` finds binding | New binding has `isMountToggle === true` instead. | **UPDATE** find predicate. |
| 26 | §4 "condExpr is set to raw 'state is .Loading' expression" (197) | `b.condExpr === "state is .Loading"` (found via isConditionalDisplay) | condExpr field is still set on the new binding; find predicate must use `isMountToggle`. | **UPDATE** find predicate. |
| 27 | §4 "refs is empty array for non-reactive is .Variant expr" (208) | `b.refs.toEqual([])` (via isConditionalDisplay) | Same as above. | **UPDATE** find predicate. |
| 28 | §5 "is .Variant compiles to === 'Variant' in client JS" (224) | `clientJs.toContain('=== "Loading"')` (and similar) | Still passes — the condition expression still appears verbatim in the new mount/unmount controller. | **KEEP**. |
| 29 | §6 "if={state is .Loading} — client JS contains el.style.display" (261) | `clientJs.toContain("el.style.display")` | Does NOT pass (clean subtree → mount/unmount). | **DELETE** (or replace with `_scrml_mount_template` assertion). |
| 30 | §6 "if={state is .Loading} — client JS contains _scrml_effect" (271) | `clientJs.toContain("_scrml_effect")` | Still passes. | **KEEP**. |
| 31 | §6 "if={state is .Loading} — client JS contains '\\\"none\\\"' for display-off branch" (281) | `clientJs.toContain('"none"')` | Does NOT pass — no display-toggle in clean-subtree path. | **DELETE** (mount/unmount has no `"none"` literal). |
| 32 | §7 "if={@state is .Loading} — client JS contains _scrml_reactive_get" (297) | `_scrml_reactive_get("state")` | Still passes. | **KEEP**. |
| 33 | §7 "if={@state is .Loading} — client JS contains === 'Loading'" (307) | `=== "Loading"` | Still passes. | **KEEP**. |
| 34 | §7 "if={@state is .Loading} — client JS contains el.style.display toggle" (317) | `el.style.display` AND `'"none"'` | Both fail. | **DELETE** or **REPLACE** with mount/unmount assertions. |
| 35 | §8 "HTML placeholder and client JS wiring both emitted" (334) | `html.toContain("data-scrml-bind-if=")` AND `'=== "Loading"'` AND `el.style.display` | First fails; second passes; third fails. | **SPLIT**: replace first with `<template id=`; keep second; delete or replace third. |
| 36 | §9 "HTML placeholder emitted with reactive condition" (360) | `html.toContain("data-scrml-bind-if=")` AND `_scrml_reactive_get("state")` AND `=== "Active"` | First fails; rest pass. | **SPLIT**: replace first; keep rest. |

(Tests in §1, §2 are tokenizer + AST-builder. **Unaffected**.)

### 2.4  `compiler/tests/unit/event-delegation.test.js` (1 failing assertion)

| # | Test (line) | Current asserted output | Predicted new output | Change type |
|---|---|---|---|---|
| 37 | "conditional display still uses per-element querySelector" (381) | `out.toContain('document.querySelector(\'[data-scrml-bind-if="_scrml_if_60"]\'')` | This test calls `emitEventWiring` directly with a hand-crafted `LogicBinding { isConditionalDisplay: true, varName: "visible" }`. **Unaffected** — bypasses emit-html. The dead block in emit-html.ts doesn't change emit-event-wiring's display-toggle code path; the `isConditionalDisplay` branch (lines 414-486) is still reachable. | **KEEP**. |

`event-delegation.test.js` is constructing the `LogicBinding` directly and exercises the **legacy** `isConditionalDisplay` path of `emit-event-wiring.ts`. Since that path is still there (only emit-html stops emitting `isConditionalDisplay` for clean subtrees), this test passes unchanged.

### 2.5  `compiler/tests/unit/binding-registry.test.js` (0 failing assertions)

Pure data-structure tests on the BindingRegistry class. No emission. **Unaffected**.

### 2.6  `compiler/tests/unit/type-encoding-phase2.test.js` (0 failing assertions)

The single conditional-display test (line 380) constructs a LogicBinding directly and exercises emit-event-wiring's encoding path. **Unaffected** — bypasses emit-html.

### 2.7  Browser tests — `compiler/tests/browser/browser-forms.test.js` (3 failing assertions across 3 tests)

The `combined-003-form-validation.scrml` sample has `<div class="success" if=@submitted><p>Registration successful!</></div>`. This subtree IS clean (only `class=` static attr on the if= div, only a static `<p>` child). When Phase 2c activates, the compiled HTML will contain `<template id="..."><div class="success"><p>Registration successful!</p></div></template><!--scrml-if-marker:N-->` instead of `<div class="success" data-scrml-bind-if="...">`.

| # | Test (line) | Current asserted output | Predicted new output | Change type |
|---|---|---|---|---|
| 38 | "success div is hidden initially" (74) | `document.querySelector('[data-scrml-bind-if]')` non-null AND `successDiv.style.display === "none"` | querySelector returns null (no element with that attribute exists; the element only mounts when `@submitted === true`). | **UPDATE** test logic: assert `querySelector('.success')` is **null** (not yet mounted) instead. |
| 39 | "success div stays hidden when validation fails" (104) | querySelector returns div, `display === "none"` | querySelector still returns null (still unmounted because `@submitted` stays false). | **UPDATE** to assert `.success` is null after failed submit. |
| 40 | "success div becomes visible after valid submit" (143) | querySelector returns div, `display === ""` | After valid submit, `.success` mounts. querySelector('.success') returns a div but `[data-scrml-bind-if]` does NOT match. | **UPDATE** to query `.success` (not `[data-scrml-bind-if]`); assert non-null and `style.display !== "none"` (or just non-null). |

[INFERRED] If happy-dom does not implement `<template>` `.content` correctly, the runtime helper `_scrml_mount_template` may fail at the `tpl.content instanceof DocumentFragment` check. Worth confirming in Phase 2c by running browser-forms after activation. happy-dom's `HTMLTemplateElement` claims standard `.content` support per their docs, but verify.

**Note:** `browser-todomvc.test.js` lines 159-168 query `.main[data-scrml-bind-if]` and `.footer[data-scrml-bind-if]`. Both `.main` and `.footer` in `benchmarks/todomvc/app.scrml` have non-clean subtrees (children with `onclick=`, `${expr}`, `<input>` with `onclick`, lift, etc.). They will continue to take the display-toggle path. **Unaffected**.

**Note:** `browser-transitions.test.js` uses `transition-001-basic.scrml` whose `<p if=@visible transition:fade>` etc. fail the cleanliness gate (transition: attrs reject). **Unaffected**.

**Note:** `runtime-behavior.test.js` uses `combined-001-counter.scrml` which has no if=. **Unaffected**.

### 2.8  Failing-assertion total

- if-expression.test.js: 16 distinct expects (some tests have 2+ expects, total tests with at least one failure: 11)
- allow-atvar-attrs.test.js: 4 expects (4 tests)
- if-is-variant.test.js: 5 expects (3 tests)
- browser-forms.test.js: 3 expects (3 tests)

**Grand total: 28 expects across 21 tests**, in 4 files. The "~22 failing tests" estimate from the deferral commit was likely test-counts (21-23). [INFERRED] Some tests fail multiple expects but bun-test reports each test as one failure regardless, so the "22" count is consistent.

---

## 3. Tests that should DELETE not UPDATE

These tests assert ON the OLD display-toggle semantics specifically. Updating them would just reword the obsolete behavior. The fix agent should delete or fundamentally rewrite them, not chase the "data-scrml-bind-if" string.

### 3.1  Hard deletes (whole test obsolete)

| File | Test (line) | Why DELETE |
|---|---|---|
| `if-expression.test.js` | §11 "conditional display uses el.style.display toggle" (468) | This test exists specifically to lock in the display-toggle codegen. Phase 2c removes that path for clean subtrees. The test's purpose is voided. |
| `if-is-variant.test.js` | §6 "if={state is .Loading} — client JS contains el.style.display" (261) | Asserts display-toggle. Same reasoning. |
| `if-is-variant.test.js` | §6 "if={state is .Loading} — client JS contains '\\\"none\\\"' for display-off branch" (281) | Asserts display-toggle literal `"none"`. Voided. |

### 3.2  Soft deletes (assertion line within otherwise-good test)

These tests check multiple aspects; only the display-toggle-specific assertion is obsolete. Delete the line, keep the test.

| File | Test (line) | Line(s) to delete |
|---|---|---|
| `if-expression.test.js` | §12 "if=!@active: element hidden when active is truthy" (485) | Line 494: `expect(out.clientJs).toContain('"none"');` |
| `if-expression.test.js` | §15 "if=@active subscribes to 'active' and uses simple display toggle" (547) | Line 555: `expect(out.clientJs).toContain('el.style.display');` |
| `allow-atvar-attrs.test.js` | §2 "if=@visible wires reactive subscription" (153) | Line 160: `expect(out.clientJs).toContain("el.style.display");` |
| `if-is-variant.test.js` | §7 "if={@state is .Loading} — client JS contains el.style.display toggle" (317) | Lines 324-325 (both el.style.display AND `"none"` lines). |
| `if-is-variant.test.js` | §8 round-trip (334) | Line 351: `expect(out.clientJs).toContain("el.style.display");` |

### 3.3  Find-predicate deletes (the predicate is wrong, not the assertion)

These find a binding via `b => b.isConditionalDisplay` but the field is renamed/replaced for the new path. Update the predicate, not the assertion target.

| File | Test (line) | Current predicate | New predicate |
|---|---|---|---|
| `if-expression.test.js` | §9 (371, 382, 392) | `b.isConditionalDisplay` | `b.isMountToggle` |
| `if-is-variant.test.js` | §3 (180), §4 (197, 208) | `b.isConditionalDisplay` | `b.isMountToggle` |

(Note: tests at if-expression.test.js §9 lines 371, 382, 392 and at if-is-variant.test.js §3-§4 — there is a question of whether this is 1 test or 3 tests. Whichever, the fix is mechanical: swap field name in the find predicate.)

---

## 4. New test cases the fix agent should ADD

The Phase 2c emission has zero direct unit-test coverage today. Even the existing 28 broken assertions only check coarse strings (`data-scrml-bind-if=`, `el.style.display`). The new path needs targeted coverage.

### 4.1  HTML emission shape (NEW group, suggested file: `compiler/tests/unit/if-mount-emission.test.js`)

| # | Test name | Asserts |
|---|---|---|
| N1 | "clean if= emits `<template id="...">` wrapping the element" | html contains `<template id="_scrml_scrml_tpl_<N>">` |
| N2 | "template content is the element with if= attr stripped" | html contains `<template id="..."><div>text</div></template>` (no `if=` and no `data-scrml-bind-if=` inside template) |
| N3 | "marker comment appears immediately after the template" | html contains `</template><!--scrml-if-marker:_scrml_if_marker_<N>-->` |
| N4 | "non-clean if= falls back to display-toggle" | element with onclick child → html contains `data-scrml-bind-if=` (no `<template>`) |
| N5 | "if= on uppercase tag (component) falls back to display-toggle" | `<MyComp if=@x>` → fallback path |
| N6 | "if= on element with bind:value falls back" | element with `bind:value=@y` → fallback |
| N7 | "if= on element with onclick child falls back" | child with onclick → fallback |
| N8 | "if= on element with reactive interpolation in attribute falls back" | child with `class="${...}"` → fallback |
| N9 | "if= on element with state-opener child falls back" | child with `<#id>` opener → fallback |
| N10 | "transition:fade on if= element falls back" | `<p if=@v transition:fade>` → fallback (transitions retained on display-toggle path) |
| N11 | "if= with show= on same element falls back" | `<div if=@a show=@b>` → fallback (show is not wiring-free) |

### 4.2  Registry binding shape (extends §9 in if-expression.test.js)

| # | Test name | Asserts |
|---|---|---|
| N12 | "clean-subtree if= registers binding with isMountToggle: true" | registry has binding `{ isMountToggle: true, templateId, markerId }` |
| N13 | "clean-subtree if= binding has condExpr/condExprNode/refs for expr kind" | binding.condExpr, condExprNode, refs.includes("active") |
| N14 | "clean-subtree if=@var binding has varName/dotPath" | binding.varName === "obj", binding.dotPath === "obj.prop" |
| N15 | "non-clean if= binding has isConditionalDisplay: true (regression)" | sanity check that fallback still works |

### 4.3  Client JS emission shape (extends §10/§11)

| # | Test name | Asserts |
|---|---|---|
| N16 | "clean if= emits _scrml_create_scope, _scrml_mount_template, _scrml_unmount_scope calls" | clientJs contains all three identifiers |
| N17 | "clean if= controller wraps in `{` block scope" | clientJs contains `let _scrml_mr_<suffix> = null;` |
| N18 | "initial mount emitted when condition truthy on first render" | clientJs contains `if (<cond>) _scrml_if_mount_<suffix>();` (before the `_scrml_effect`) |
| N19 | "mount-cycle re-evaluates inside _scrml_effect" | clientJs contains `_scrml_effect(function() { if (<cond>) {...} else {...} });` |
| N20 | "unmount path destroys scope and clears refs" | clientJs contains `_scrml_unmount_scope(_scrml_mr_<suffix>, _scrml_ms_<suffix>);` then `_scrml_mr_<suffix> = null; _scrml_ms_<suffix> = null;` |
| N21 | "non-clean if= still emits el.style.display (regression)" | sanity check fallback still works |

### 4.4  Round-trip via runCG / full-pipeline

| # | Test name | Asserts |
|---|---|---|
| N22 | "<div if=@visible>text</div> through full pipeline produces template+marker html" | full source → out.html has template+marker, out.clientJs has mount/unmount controller |
| N23 | "<MyComp if=@a> uses fallback (component if=)" | full source → out.html has `data-scrml-bind-if=` |
| N24 | "if=@user.loggedIn dot-path mount-toggle controller" | controller condition reads `_scrml_reactive_get("user").loggedIn` |

### 4.5  Browser/integration (likely follow-up)

| # | Test name | Asserts |
|---|---|---|
| N25 | "compiled output of <div class="ok" if=@v> mounts a div on transition false→true" | DOM has 0 `.ok` divs initially when @v=false; setting @v=true causes 1 `.ok` div to appear next to the marker |
| N26 | "transition true→false removes the mounted div from DOM" | After @v=true→false, `.ok` count returns to 0 |
| N27 | "remount fires bare expressions inside the if= body again" | inside the if= body, a `${counter++}` expression should re-run on each remount |

[INFERRED] N25-N27 may need actual browser/happy-dom infrastructure that doesn't exist in unit tests. They could be added to `tests/browser/`. The deferral commit talks about Phase 2h "sample-suite verification (15+ files using if=)" — N25-N27 are smaller-scope precursors.

### 4.6  Marker comment semantics (RUNTIME contract)

| # | Test name | Asserts |
|---|---|---|
| N28 | "_scrml_find_if_marker locates a comment with matching needle" | given `document.body.innerHTML` containing `<!--scrml-if-marker:foo-->`, returns the Comment node |
| N29 | "_scrml_mount_template inserts cloned template content before marker" | DOM mutation observable, returns first element child of cloned fragment |
| N30 | "_scrml_unmount_scope removes mounted root from parent" | DOM mutation observable; scope cleanup invoked |

[INFERRED] These are runtime-helper tests; may already be partly covered by N25-N27. Worth checking whether `compiler/tests/runtime/` already has a runtime-helper test suite.

---

## 5. Risk inventory

### 5.1  LATENT BUG — if-chain branches with retained `if=` attribute

**Severity: HIGH. Will corrupt if-chain emission when Phase 2c activates.**

`emit-html.ts:163-196` (if-chain branch) wraps each branch in a `data-scrml-if-chain` div, then calls `emitNode(branch.element)` where `branch.element` is the original `<div if=@a>...</>` element with `if=` attribute STILL ATTACHED. The if-chain visibility is controlled by the wrapper divs' `data-scrml-chain-branch="active"` logic — not by the inner element's `if=`.

When the dead block reactivates in Phase 2c, the inner element's `if=` attribute will trigger the early-out check (line 544: `attrs.find(a => a.name === "if")`). If the branch element is also a clean subtree (lowercase tag, no events/binds/class:/transition:/expr children), it will emit:

```html
<div data-scrml-if-chain="..." data-scrml-chain-branch="..." style="display:none">
  <template id="...">
    <div>branch content</div>
  </template>
  <!--scrml-if-marker:...-->
</div>
```

…and register a SECOND mount-toggle binding that the chain controller doesn't know about. Two reactive controllers (chain + mount) will fight over the same DOM region. Behavior: undefined — possibly the inner div mounts inside a `display:none` wrapper, possibly the chain logic's `el.style.display = ""` exposes a marker comment with no element.

**Fix recommended for Phase 2c:** before the early-out check, also reject if the element is a member of an if-chain. Easiest signal: when emitting an if-chain branch, strip the `if=` / `else-if=` attribute from `branch.element` before calling `emitNode(branch.element)`, OR pass a flag to short-circuit the early-out for chain children.

[INFERRED] The deferral commit doesn't mention this. The verification was done against `control-if-mount-basic.scrml` which presumably has no chain. Phase 2c MUST add a regression test for if-chain + clean-subtree branches.

**Test to add:**

| # | Test name | Asserts |
|---|---|---|
| N31 | "if/else chain with clean-subtree branches uses display-toggle on chain wrapper, not mount/unmount" | `<div if=@a>A</><div else>B</>` → html has `data-scrml-if-chain` wrappers; inner elements do NOT have template+marker emission |

### 5.2  Broader codebase grep — silent dependencies

Grepped patterns:

| Pattern | Hits | Concern |
|---|---|---|
| `data-scrml-bind-if` | 8 unit + 3 browser test files (listed §2) | Already enumerated. |
| `data-scrml-bind-show` | 0 in unit tests beyond `allow-atvar-attrs.test.js` and `if-expression.test.js` (which only mention `if=`); show= tests in allow-atvar-attrs all stay display-toggle (Phase 1 of show= is display-toggle). | No additional risk. |
| `mountToggle` / `isMountToggle` | 5 files: emit-html.ts, emit-event-wiring.ts, binding-registry.ts, runtime-template.js, hand-off-49.md. No tests reference yet. | **Coverage gap.** Section 4 above. |
| `_scrml_mount_template` / `_scrml_unmount_scope` / `_scrml_create_scope` | Only runtime-template.js and emit-event-wiring.ts. Zero test references. | **Zero unit test coverage** of the new runtime helpers. Section 4.6 above. |
| `scrml-if-marker` | Only emit-html.ts (commented), emit-event-wiring.ts (in placeholder strings), runtime-template.js (the lookup needle), hand-off-49.md. Zero tests. | Same gap. |
| `_scrml_if_marker` (the var-counter prefix from `genVar("if_marker")`) | Only the emit-html.ts dead block. | Low risk. |
| `if-chain` | astbuilder, emit-html, emit-event-wiring, else-if.test.js. Else-if tests don't assert codegen — only AST shape. | Latent bug surfaced in §5.1. |
| `<template id=` in tests | None. | Need to ADD assertions on this string. |

### 5.3  SPEC ambiguity

§17.1 SPEC text (line 7351): "When `expr` evaluates to false, the element is NOT rendered. It does not exist in the DOM."

§6.7.2 (line 2553-2574): mount/unmount semantics, LIFO cleanup, depth-first teardown, remount re-runs bare expressions.

The spec is consistent — Phase 2c implements what the spec already says. **No SPEC changes needed.**

However, the SPEC does not specify a `<template>` + marker-comment emission strategy explicitly. This is an implementation choice. Phase 2c is inheriting that choice from the dead block — which is fine, but should be documented somewhere (an §A.X non-normative implementation note?). [INFERRED]

### 5.4  Marker-comment leak (HTML pre-Hydration visibility)

The dead block emits `<!--scrml-if-marker:N-->` directly in the HTML body. Comments are invisible to users and to most CSS, BUT:

- Server-rendered HTML before client JS executes will contain `<template id="...">` and a comment. The `<template>` content does NOT render (templates are inert per HTML spec). So users see NOTHING in the if= region until the client runs. **This is a regression vs. display-toggle**, where the if= div was rendered (with `style="display:none"` initially via `el.style.display = ...` in the effect — but the el is in DOM so initial layout includes it).
- For a server-side initial-true-condition render, this is FCP-bad: the user sees nothing in the if= region until the client effect runs and mounts.

[INFERRED] The deferral commit didn't flag this. Phase 2c may want to:
- Have the HTML emit the `<template>` AND a "shadow" rendered copy (whose presence is decided by SSR — but scrml has no SSR yet, so initial state needs to be reflected in the static HTML).
- OR only emit the template path post-page-load (i.e., the very first render uses display-toggle, subsequent toggles use mount/unmount). But that defeats the point.

**Recommend:** confirm with user that initial-render flicker (one paint of empty if= region before client JS mounts) is acceptable for Phase 2c. If not, the strategy needs revision. The simplest fix: emit the element BOTH in a `<template>` AND inline (with a `<!--scrml-if-render-state-->` marker) so the page loads "looking right", and the client JS detaches/reattaches as needed. **This is a real architectural decision the fix agent must surface.**

### 5.5  `placeholderId === markerId` collision

The dead block (line 566) sets `placeholderId: markerId, markerId, templateId`. So the binding's `placeholderId` field equals its `markerId` field. emit-event-wiring's `<suffix>` is `placeholderId.replace(...)`. That's fine.

But the LogicBinding interface convention is that `placeholderId` is the data-scrml-bind-* attribute id — used to find the element via `document.querySelector('[data-scrml-bind-if="..."]')`. In the new path, there is no element with that attribute. If any downstream code does `querySelector('[data-scrml-bind-if="' + placeholderId + '"]')` on a binding that has `isMountToggle`, it will return null. Today this is only `emit-event-wiring.ts:419` — guarded by the `isConditionalDisplay || isVisibilityToggle` check, so it's fine. But the `placeholderId` reuse is fragile and could trip up future code. [INFERRED]

**Recommend:** rename `placeholderId` to something like `bindingId` (a generic id), OR document explicitly in `binding-registry.ts:LogicBinding` that for `isMountToggle: true` bindings, `placeholderId === markerId` and there is no DOM attribute lookup.

### 5.6  Var-counter ID drift in tests

Several tests use `resetVarCounter()` in beforeEach AND then assert specific IDs (e.g. `event-delegation.test.js:398` asserts `"_scrml_if_60"`). The dead block calls `genVar("scrml_tpl")` and `genVar("if_marker")` BEFORE the existing `genVar("attr_<name>")` for the placeholder (which is now skipped for clean subtrees). For tests that don't reset between cases or assume specific counter values, ID drift will cascade. [INFERRED]

A scan found only `event-delegation.test.js:398` asserting a hard-coded ID. That one is in the legacy `isConditionalDisplay` path (the test injects the binding directly), so the counter isn't advanced. Should be fine.

### 5.7  HTML escape semantics for `<template>` content

`escapeHtmlAttr` is called on attribute values, not on element content. The template's inner HTML is generated by recursive `emitNode`, which already handles escaping. But the **template id** (`templateId`) is a generated `_scrml_scrml_tpl_<N>` — no special chars, no escape needed. The dead block does NOT escape `templateId` or `markerId` in the `id="..."` attribute. Safe today, but if id-generation ever changes to allow user-influenced strings, escape. [INFERRED — low priority]

### 5.8  emit-event-wiring placeholder in `data-scrml-bind-if` selector

Line 419: `const el = document.querySelector('[data-scrml-bind-if="${placeholderId}"]');`. This is hard-coded to `data-scrml-bind-if`. For show= bindings (`isVisibilityToggle`), `dataAttr` is set correctly to `data-scrml-bind-show` — no issue. For mountToggle bindings, this code path is skipped (continue at line 406). All good.

### 5.9  Multiple if= on same element — disambiguation

Not possible: HTML attribute parsing dedupes. AST-builder sees one `if=` per element. No risk.

### 5.10  `else-if=`/`else` inside chain — handled separately

The if-chain logic runs BEFORE the markup branch, so chain branches never reach the dead block via the normal path. Risk only via the `branch.element` recursion (§5.1).

---

## 6. Estimated commit shape

**Recommendation: ONE disciplined commit.** This matches the user's bias as stated in `e62a11f`.

### What goes in the commit

1. Uncomment the dead block at `emit-html.ts:544-572`.
2. Add the if-chain guard (§5.1) — short-circuit the early-out if the element is a chain branch. Easiest: in the if-chain handler at line 169, before `emitNode(branch.element)`, strip the `if=` / `else-if=` attribute from a shallow-cloned element.
3. Update the 21 broken tests in 4 files (28 expects), per §2. Mix of UPDATE / DELETE / SPLIT.
4. Add the new tests from §4 — at minimum N1-N4, N12-N14, N16-N20, N22-N24, N31. The runtime-helper tests (N25-N30) can be deferred to Phase 2d if they need browser harness work.
5. Update `binding-registry.ts:LogicBinding` JSDoc to document the `isMountToggle` flag and the `placeholderId === markerId` convention.

### What does NOT go in the commit

- Phase 2d (events inside if=) — explicitly out of scope.
- Phase 2e (reactive interp) — out of scope.
- Phase 2f (lifecycle) — out of scope.
- Phase 2g (if-chain mount template) — out of scope; today's if-chain stays display-toggle.
- Sample-suite verification (Phase 2h) — out of scope.

### Why ONE commit not split

- The 28 expects fail simultaneously when the early-out activates. Splitting "uncomment block" from "fix tests" leaves main broken. Avoid.
- The if-chain guard (§5.1) is a logical part of activating the block — without it, activation has a latent bug. Bundle.
- New tests (§4) document the new behavior in the same context as the old tests being deleted. Same diff lets reviewers see both sides.
- A single commit message can carry the full Phase 2c intent: "Phase 2c: activate emit-html mount/unmount path + 21-test churn + if-chain guard + 14 new mount-toggle tests."

### What if the commit is too big to review

If the diff exceeds ~600 lines (test churn alone could push it there), split as:

- Commit 1: emit-html.ts uncomment + if-chain guard + minimum-required test updates so suite is green.
- Commit 2: new test cases (§4) in a follow-up.

But ONE-COMMIT is the goal. The if-chain bug discovery (§5.1) is the only thing that might force a split — if the fix agent finds the chain guard requires more invasive AST-builder changes, isolate that into its own commit.

### Checklist for the fix agent

- [ ] Uncomment `emit-html.ts:544-572`.
- [ ] Add if-chain guard (strip `if=` from branch.element OR pass a flag).
- [ ] Update 16 expects in `if-expression.test.js` (rows 1-18 in §2.1, minus the 4 that pass unchanged).
- [ ] Update 4 expects in `allow-atvar-attrs.test.js` (rows 19-22).
- [ ] Update 5 expects in `if-is-variant.test.js` (rows 24-36, minus the ones that pass unchanged).
- [ ] Update 3 expects in `browser-forms.test.js` (rows 38-40).
- [ ] Add ~14 new tests from §4 (or split into 2 commits; minimum N1-N4, N12, N16, N22, N31).
- [ ] Update `binding-registry.ts:LogicBinding` JSDoc.
- [ ] Run full test suite: target green except the 2 pre-existing failures (Bootstrap L3 + tokenizer self-host).
- [ ] Verify no new failures in browser-todomvc.test.js or browser-transitions.test.js (predicted unaffected).
- [ ] [DEFERRED to Phase 2d-2h] Sample-suite verification on 15+ if= files.
- [ ] [DECISION POINT] Confirm with user: initial-render flicker on if= region is acceptable (§5.4)?

---

## Appendix A: Hand-compiled emission shape (from hand-off-49.md §6)

For verification — the dead block's predicted emission for a clean if= subtree.

Source: `<div if=@visible>Welcome back!</div>`.

HTML output:
```html
<template id="_scrml_scrml_tpl_1"><div>Welcome back!</div></template>
<!--scrml-if-marker:_scrml_if_marker_2-->
```

(Note: the actual var-counter values depend on emission order; `_scrml_scrml_tpl_<N>` and `_scrml_if_marker_<N+1>` if no other genVar calls intervene.)

Client JS (suffix = `_scrml_if_marker_2`):

```js
{
  // if= mount/unmount controller — marker _scrml_if_marker_2, template _scrml_scrml_tpl_1
  let _scrml_mr__scrml_if_marker_2 = null;
  let _scrml_ms__scrml_if_marker_2 = null;
  function _scrml_if_mount__scrml_if_marker_2() {
    _scrml_ms__scrml_if_marker_2 = _scrml_create_scope();
    _scrml_mr__scrml_if_marker_2 = _scrml_mount_template("_scrml_if_marker_2","_scrml_scrml_tpl_1");
  }
  function _scrml_if_unmount__scrml_if_marker_2() {
    if (_scrml_mr__scrml_if_marker_2 !== null) {
      _scrml_unmount_scope(_scrml_mr__scrml_if_marker_2, _scrml_ms__scrml_if_marker_2);
      _scrml_mr__scrml_if_marker_2 = null;
      _scrml_ms__scrml_if_marker_2 = null;
    }
  }
  if (_scrml_reactive_get("visible")) _scrml_if_mount__scrml_if_marker_2();
  _scrml_effect(function() {
    if (_scrml_reactive_get("visible")) {
      if (_scrml_mr__scrml_if_marker_2 === null) _scrml_if_mount__scrml_if_marker_2();
    } else {
      if (_scrml_mr__scrml_if_marker_2 !== null) _scrml_if_unmount__scrml_if_marker_2();
    }
  });
}
```

The double-underscore in the suffix (`_scrml_mr__scrml_if_marker_2`) is correct per the regex `[^a-zA-Z0-9_]` not stripping underscores. [INFERRED] The fix agent may want to clean this up (e.g., strip a leading `_scrml_` from the suffix to make var names shorter), but it's not required for correctness.

---

## Appendix B: File inventory (absolute paths)

### Read during recon (reference)

- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/codegen/emit-html.ts` (788 lines; dead block at 524-572)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/codegen/emit-event-wiring.ts` (615 lines; mount-toggle controller at 358-407)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/codegen/binding-registry.ts` (117 lines; LogicBinding interface lines 53-69)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/codegen/var-counter.ts` (26 lines)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/runtime-template.js` (1784 lines; mount/unmount helpers at 390-467)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/ast-builder.js` (if-chain handling at 6914-7058)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/SPEC.md` (§17.1 at 7343, §6.7.2 at 2551)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/handOffs/hand-off-49.md` (verified emission shape at line 146)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/samples/compilation-tests/transition-001-basic.scrml`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/samples/compilation-tests/combined-003-form-validation.scrml`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/benchmarks/todomvc/app.scrml` (lines 147, 165 use if=@todos.length)

### Tests with failing assertions (will need edits)

- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/tests/unit/if-expression.test.js` (790 lines; 16 expects affected)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/tests/unit/allow-atvar-attrs.test.js` (356 lines; 4 expects affected)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/tests/unit/if-is-variant.test.js` (379 lines; 5 expects affected)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/tests/browser/browser-forms.test.js` (~3 expects affected, lines 74, 104, 143)

### Tests verified UNAFFECTED (no edits expected)

- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/tests/unit/event-delegation.test.js` (constructs LogicBinding directly; bypasses emit-html)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/tests/unit/binding-registry.test.js` (data structure only)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/tests/unit/type-encoding-phase2.test.js` (constructs LogicBinding directly)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/tests/unit/else-if.test.js` (AST-shape only, no codegen assertions)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/tests/unit/lint-ghost-patterns.test.js` (lint diagnostics, no codegen)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/tests/browser/browser-transitions.test.js` (transition: rejects cleanliness gate)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/tests/browser/browser-todomvc.test.js` (.main, .footer have non-clean subtrees: events, lift, expr children)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/tests/browser/runtime-behavior.test.js` (no if= in samples used)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/tests/self-host/ast.test.js` (line 408 uses if/else chain — chain path unchanged, IF the §5.1 guard is added)
- `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/tests/unit/gauntlet-s26/machine-property-tests-phase6.test.js` (no if= references)

---

## Appendix C: Why the dead block's emission is correct

Hand-traced for `<div class="ok" if=@visible>hello</div>`:

1. emit-html sees the markup. Cleanliness gate:
   - Tag `div` (lowercase) → pass.
   - Attrs: `class="ok"` (string-literal, no template) → wiring-free; `if=@visible` (variable-ref) → wiring-free *under allowName="if"*. Pass.
   - Children: text node `"hello"` → clean. Pass.
   - → gate passes; route to early-out.
2. genVar("scrml_tpl") → `_scrml_scrml_tpl_1`.
3. genVar("if_marker") → `_scrml_if_marker_2`.
4. Emit `<template id="_scrml_scrml_tpl_1">`.
5. Inner emit: clone node with attrs filtered to drop `if`; that's `<div class="ok">`. Emit `<div class="ok">hello</div>`.
6. Emit `</template>`.
7. Emit `<!--scrml-if-marker:_scrml_if_marker_2-->`.
8. Register binding `{ placeholderId: "_scrml_if_marker_2", expr: "@visible", isMountToggle: true, templateId: "_scrml_scrml_tpl_1", markerId: "_scrml_if_marker_2", varName: "visible" }`.

Emit-event-wiring sees the binding and emits the controller per Appendix A. Correct.

---

End of report.
