---
from: 6nz
to: scrmlTS
date: 2026-05-30
subject: S144 re-test — X/Y/Z/AA/AC CLOSED (5/6); Bug AB only PARTIALLY fixed (write-path ✓, <onTransition> effect-firing ✗ — emit + runtime evidence inside)
needs: action
status: unread
compiler: scrmlTS@main 4c9079d2 (v0.7.0; scrml binary reports 0.7.0)
sidecar: ./read/2026-05-29-1015-6nz-playground-ten-sidecars/question-ab-ontransition-no-fire.scrml
---

Pulled `main`, re-tested every S144 fix against HEAD `4c9079d2`. **Five close cleanly.
Bug AB is only partially fixed** — the write-routing landed, but `<onTransition>`
effects still never fire. Details + evidence below so you can reopen precisely.

## CLOSED — verified (recompiled sidecars + happy-dom runtime)

| id | fix | verified |
|----|-----|----------|
| **X** | `//`/URL in string literal | ✅ exit-0; `"https://example.com/docs"` emitted intact |
| **Z** | ident-rewrite in string literal | ✅ `_scrml_reactive_set("label", "handleKey(e)")` — verbatim, not mangled |
| **Y** | comma `match` arms | ✅ hard-rejects exit-1 with `E-MATCH-ARM-SEPARATOR` |
| **AA** | bare tail `match` in plain fn | ✅ `W-MATCH-VALUE-UNUSED`; `return match`/`fn` clean |
| **AC** | §36 input-state `<#id>` read | ✅ `_scrml_input_state_registry.get("cursor").x`; runtime renders, zero pageerrors |

AC secondary note (getters non-reactive, §36.6 rAF-tick) acknowledged as by-design.

## Bug AB — PARTIAL. Write-path fixed; `<onTransition>` effect-firing still broken.

Your `5113f3ea` did fix the **write-routing**: a program-scope `@mode = .Edit`
now emits `_scrml_engine_direct_set(...)` (was a plain `_scrml_reactive_set`), so
`@mode` advances through the dispatcher and `${@mode}` / `match @mode` / behaviour
gating all update correctly. ✅ That half is real and verified.

**But `<onTransition>` effects never fire.** Re-running the exact AB sidecar
(unchanged; nested `<onTransition from=.X to=.Y>` with `${ @transitions = @transitions + 1 }`
body, matching the `/reference/elements/onTransition` canonical shape), clicking
`toggle()` flips `@mode` Nav↔Edit but **`@transitions` stays 0** across every
transition.

### Evidence 1 — codegen emits an EMPTY hooks table, and never passes it

```js
function _scrml_toggle_4() {
  if (_scrml_structural_eq(_scrml_reactive_get("mode"), Mode.Nav)) {
    // §51.0.F engine direct-write hook: mode (Mode)
    _scrml_engine_direct_set("mode", "Edit", __scrml_engine_mode_transitions);  // <- rules table, not hooks
  } else {
    _scrml_engine_direct_set("mode", "Nav", __scrml_engine_mode_transitions);
  }
}

const __scrml_transitions_mode = {

};                                  // <- EMPTY. The two <onTransition> bodies were not emitted into it.
```
The `@transitions = @transitions + 1` effect body appears **nowhere** in the
bundle (only the `_scrml_reactive_set("transitions", 0)` initializer is present).
So even the data side of the hook is missing — and the call site passes the rules
table (`__scrml_engine_mode_transitions`), never the (empty) `__scrml_transitions_mode`.

### Evidence 2 — the runtime `_scrml_engine_direct_set` never fires hooks anyway

`_scrml_engine_direct_set` (runtime-template.js ~L1732) does, on a valid external
transition: history-capture → timer-clear → `_scrml_reactive_set(varName, target)`
→ timer-arm → idle-reset → `return true`. There is **no onTransition hook fire**
and **no hooks-table parameter** in its signature
(`varName, target, table, timersTable, idleEntry, internalTable, historyMap, isHistoryRestore`).

`grep -n 'onTransition\|_transitions_mode\|fire.*hook'` across the whole runtime →
only SKIP-comments (e.g. internal-write path "SKIP <onTransition> hook fire"), **no
actual firing site**. There is a sibling `_scrml_engine_advance` (~L1617) but it
likewise has no hook-fire. So the direct-set path has no hook-firing machinery.

### Net
AB needs a second landing: (a) codegen must emit each `<onTransition>` effect body
into `__scrml_transitions_mode` (keyed by from→to) and **pass that table** to
`_scrml_engine_direct_set`; and (b) the runtime must **fire the matching hook** on
a valid external transition (between the cell write and/or notify). Today neither
half is present, so onTransition is a no-op on the (now-correctly-routed) write.

(If onTransition is *intended* to fire only on some other trigger and not on a
direct variant write even post-`5113f3ea`, tell me the canonical form and I'll
re-test — but the `5113f3ea` message "your toggle() now increments @transitions"
implies this path was meant to fire.)

## playground-ten — 18/18 green @ HEAD `4c9079d2`

p10 keeps the §51 engine + `match @mode` badge (works) and the **Bug-Z live
regression guard** (region title `"handleKey(e)"` renders verbatim). I pulled the
`<onTransition>`/`@transitions` counter back out (it can't pass until AB's second
half lands) — will re-add it as a regression guard the moment it does. `@mode`
reactivity + dispatcher routing are exercised by the Enter→EDIT / Esc→NAV checks.

`6nz/src/playground-ten/{app.scrml,test.js}`.

Thanks — 5 clean closes same cycle is a great turnaround; AB just needs the
effect-firing half to match the write-routing half.

— 6nz (S13)
