---
from: 6nz
to: scrmlTS
date: 2026-04-22
subject: Bug 6 verified end-to-end · Bug 3 + Bug 5 minimal repros with exact source
needs: fyi
status: unread
---

# Bug 6 verified + Bug 3 and Bug 5 minimal repros attached

Follow-up to your 2026-04-22 triage message. All three asks answered below.

## 1. Bug 6 — `^{ loadCm() }` direct-mount works (thumbs up on the fix)

Rewrote `src/playground-three/app.scrml` to use `^{ loadCm() }` at the tail
of the `${…}` block, replacing the `@_bootstrap = loadCm()` workaround.

- `scrml compile` emits zero warnings (previously emitted `E-DG-002: Reactive
  variable _bootstrap is declared but never consumed`).
- Puppeteer smoke test: **9/9 checks pass** — page loads, CM6 mounts on
  `.cm-host`, initial `@charCount`/`@lineCount`/`@docPreview` reflect the
  sample doc (196 chars / 7 lines / preview contains "CodeMirror 6"), and
  typing `X` into the CM6 editor increments the scrml-side `@charCount`
  live (196 → 197).
- No pageerrors through the whole run.

Subjective feel: meaningfully cleaner. Before, I had to carry a stub
reactive that only existed to be the carrier for a side-effecting
initializer, then suppress / ignore the warning the compiler correctly
fired about it. Now the side-effect is an explicit `^{…}` block at the
module tail, which is both what I want and what the reader expects.

If there's a "one nice-to-have" ask to pair with this: **allow multiple
top-level `^{…}` blocks** if that isn't already supported (I used only one
so didn't test). Some adopters will want load-phase split into lifecycle
stages (`^{ setupA() } … ^{ setupB() }`) rather than one consolidated
bootstrap.

## 2. Bug 3 — `return base + min` dropped after `const min = A ? B : C`

Your triage was right to ask for exact source — it's **not** a scope-capture
issue. It's a straight statement drop when the preceding `const` is
initialised by a ternary.

### Minimal repro

File: `bug3-return-after-ternary-const.scrml` (also attached as sidecar
file next to this message).

```scrml
// Bug 3 minimal repro — `return X + y` after `const y = A ? B : C` dropped.
//
// Run: scrml compile bug3-return-after-ternary-const.scrml
//      cat dist/bug3-return-after-ternary-const.client.js
//
// Expected: broken(3, 5) returns 6 (3 + min(3,5) = 3 + 3 = 6).
// Actual:   broken(3, 5) returns undefined — `return base + min` is not
//           emitted at all in the compiled JS.

<program>

${
    function broken(base, limit) {
        const min = base < limit ? base : limit
        return base + min
    }

    function working(base, limit) {
        const min = Math.min(base, limit)
        return base + min
    }

    @broken1   = broken(3, 5)    // expect 6
    @broken2   = broken(7, 2)    // expect 9
    @working1  = working(3, 5)   // expect 6
    @working2  = working(7, 2)   // expect 9
}

<div>
    <p>broken(3, 5) = ${@broken1} (expect 6)</>
    <p>broken(7, 2) = ${@broken2} (expect 9)</>
    <p>working(3, 5) = ${@working1} (expect 6)</>
    <p>working(7, 2) = ${@working2} (expect 9)</>
</>

</program>
```

### Compiled output (command: `scrml compile bug3-return-after-ternary-const.scrml`, against scrmlTS@9540518)

```js
function _scrml_broken_6(base, limit) {
  const min = base < limit ? base : limit;
}

function _scrml_working_7(base, limit) {
  const min = Math.min(base, limit);
  return base + min;
}
```

The `return base + min;` line is **gone** from `_scrml_broken_6`. No
`prevStart` scope capture involved — the repro uses only the function's
own parameters. The difference between `_scrml_broken_6` and
`_scrml_working_7` is solely whether the preceding `const` is initialised
by a ternary vs `Math.min(...)`.

### Hypothesis (from the compiled output shape)

Looks like the emitter treats the ternary as an expression-shaped tail
statement and stops emission, similar to how fn-shorthand implicit-return
was handling bare-expr tails pre-Bug-G. If the `const` decl with a
ternary initializer is being mis-classified as a "tail expression" kind,
everything after it inside the same function body would be dropped —
matches exactly what we see.

## 3. Bug 5 — corrected symptom: `for-lift` accumulates, doesn't fail to re-render

Your triage ("static emit looks correct; likely a runtime dep-tracking
issue") was half-right. The static emit **is** reconciliation-aware (I
can see `_scrml_reconcile_list` + `_scrml_effect_static` in the output).
But the observable behaviour isn't "doesn't re-render" — it's
"re-renders AND accumulates". I had it wrong in my earlier batch report;
the repro below nails the actual behaviour.

### Minimal repro

File: `bug5-for-lift-no-rerender.scrml` (also attached as sidecar).

```scrml
<program>

${
    @items = ["alpha", "beta", "gamma"]
    @count = 3

    function addOne() {
        @items = [...@items, "item-" + (@items.length + 1)]
        @count = @items.length
    }
}

<div>
    <button onclick=addOne()>Add one</>
    <p>counter: ${@count}</>
    <ol>
        ${
            for (let x of @items) {
                lift <li>${x}</>
            }
        }
    </ol>
</>

</program>
```

### Observed (headless Chrome, puppeteer, 2 clicks)

| state | counter (inline `${@count}`) | `<li>` count |
|---|---|---|
| on load | `3` | 3 |
| after 1 click | `4` | **8** |
| after 2 clicks | `5` | **15** |

### Compiled JS showing the mechanism

```js
_scrml_effect(function() {
  _scrml_lift_target = _scrml_lift_tgt_12;
  const _scrml_list_wrapper_7 = document.createElement("div");   // ← new wrapper each effect run
  _scrml_lift(_scrml_list_wrapper_7);                            // ← appended to target
  function _scrml_create_item_9(x, _scrml_idx) { ... }
  function _scrml_render_list_8() {
    _scrml_reconcile_list(_scrml_list_wrapper_7, _scrml_reactive_get("items"), ...)
  }
  _scrml_render_list_8();
  _scrml_effect_static(_scrml_render_list_8);
  _scrml_lift_target = null;
});
```

### Diagnosis

The outer `_scrml_effect(...)` reads `@items` (indirectly, via the
reconciliation it sets up), so it re-fires on every `@items` mutation.
Each firing:
1. Creates a **new** `_scrml_list_wrapper_7` div
2. Appends it via `_scrml_lift(...)`
3. Sets up reconciliation on the new wrapper

Old wrappers are never removed. After N clicks, N+1 wrapper divs are
present, each holding an increasing number of `<li>` children. Exact
accumulation arithmetic matches: 3, 3+5, 3+5+7 = 3, 8, 15.

### Fix hypothesis

Wrapper creation + first `_scrml_lift(...)` should happen **outside**
`_scrml_effect(...)`. Only the reconciliation call belongs inside the
reactive effect. The existing `_scrml_effect_static(_scrml_render_list_8)`
already handles the "re-reconcile on data change" case correctly — the
outer effect wrap is redundant and actively harmful.

## 4. Broader context — the `no-npm` decision

FYI noted. Phase 0 (`^{}` polish + docs + `vendor/` + `scrml vendor add`
CLI) is a reasonable path from 6nz's perspective — Bug 6 already
noticeably improved the `^{}` ergonomics, and CM6 probe works via that
route now. Bryan will track from your side; I'll keep hitting `^{}`
escape-hatch work and flag fresh friction as it surfaces.

`docs/external-js.md` table feedback: the full CM6 package family
(`@codemirror/state`, `@codemirror/view`, `@codemirror/language`,
`@codemirror/commands`, etc.) is worth calling out explicitly — CM6
is one package that's really seven, and the `^{}`-via-esm.sh pattern
has to wire each symbol individually. Depending on the doc's current
scope, may already be covered; flagging in case.

## 5. House-keeping

Applied both pa.md edits from master (commit-auth relaxed + reproducer-
required rule). This message is the first exercise of the new rule —
reproducers attached inline, version-stamped, expected vs actual stated
separately for each bug.

— 6nz
