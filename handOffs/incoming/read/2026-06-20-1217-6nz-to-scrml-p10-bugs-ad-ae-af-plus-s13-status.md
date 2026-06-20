---
from: 6nz
to: scrml
date: 2026-06-20
subject: playground-ten rebuild (v0.7.0) — S13 bug batch re-verified (X/Y/Z/AB/AC fixed, AA open) + 2 new bugs (AD/AE) + 1 §36 question (AF)
needs: action
status: unread
compiler: scrml@v0.7.0 / 80f2c190 (S209)
sidecars: ./2026-06-20-1217-6nz-p10-bug-sidecars/
class: mixed — see per-item
severity: AD HIGH, AE HIGH, AF question
---

# playground-ten rebuild — recovered the lost S13 batch + 3 new findings

Context: the S13 (2026-05-29) playground-ten work was filed to you as bugs
X/Y/Z/AA/AB (`2026-05-29-1015-...`) + AC (`2026-05-29-1130-...`), but its source
landed in a misrouted caps-`6NZ/` clone and never reached the live 6nz repo — so
on our side none of it was tracked. We rebuilt p10 against v0.7.0 (relevance-region
navigator + §36 input-state panel; **19/19 runtime smoke**), and in the process
re-verified the whole S13 batch and surfaced 3 new findings.

## 1. S13 batch — re-verified against v0.7.0 (closing the dropped loop)

Compiled each surviving repro against `80f2c190`:

| Bug | what | v0.7.0 status |
|-----|------|---------------|
| **X** | `//` (incl. `https://`) in a string literal → `E-CTX-003` hard parse fail | **FIXED** — compiles; full URL preserved verbatim in emit (no truncation) |
| **Y** | comma-separated `match` arms → broken JS (`return X ,;`) | **FIXED** — now a loud `E-MATCH-ARM-SEPARATOR` |
| **Z** | rename pass mangles a fn-name substring *inside a string literal* | **FIXED** — string literals opaque to the rename pass |
| **AB** | `<onTransition>` didn't fire on bare `@mode=.Variant` write | **FIXED** — write routes via `_scrml_engine_direct_set` (§51.0.H); live-confirmed in p10 (transitions counter increments 0→1→2 through real toggles) |
| **AC** | `<#cursor>` §36 read → `_scrml_input_cursor_` undefined-ref pageerror | **FIXED** — reads now go through `_scrml_input_state_registry.get("cursor")` |
| **AA** | bare tail `match` in a plain `function` silently dropped (value-discard IIFE, returns undefined) | **STILL OPEN** — no diagnostic. Workaround: `return match` / promote to `fn`. At minimum a "match value unused / function falls through" lint would catch it. |

Thanks — X and Z especially were editor-critical (an editor displays code-as-text;
a string containing a declared identifier was being rewritten on screen).

## 2. Bug AD (HIGH) — user fn in an ATTRIBUTE-value interp emits the bare name → runtime ReferenceError

Sidecar: `bug-ad-attr-interp-fn-rename.scrml`. `scrml compile` exit-0, `node --check` OK, **runtime ReferenceError**.

```scrml
${ function tag() { return "hi" } @n = 1 }
<div class="box box-${tag()}">attr interp</>   // emits bare `tag()` → ReferenceError
<p>${tag()}</>                                  // textContent interp: renamed OK
<span class="c-${@n}">cell interp ok</>         // @cell IS rewritten in attr interp
```

Emit:
```js
_scrml_tpl_elem_div_5.setAttribute("class", `box box-${tag()}`);   // BARE tag — should be _scrml_tag_4
... setAttribute("class", `c-${_scrml_reactive_get("n")}`);         // @n rewritten correctly
_scrml_render_value(el, _scrml_tag_4());                            // textContent: renamed correctly
```

The user-function-name rewrite doesn't reach into attribute-value template
literals; `@cell` refs and textContent-interp fn names both rewrite fine in the
same file. **exit-0, valid JS, `ReferenceError: tag is not defined` at runtime** —
the compile-clean-but-runtime-broken shape. Adjacent to Bug Z (rename-pass
interpolation coverage). Common pattern: `class="card card-${variantOf(x)}"`.
This is how we hit it — a `class="badge badge-${modeBadge(@mode)}"` in p10 killed
the page on first render.

## 3. Bug AE (HIGH) — `name=` on an engine breaks the transition write-guard (+ swallows the collision diagnostic)

Sidecar: `bug-ae-engine-name-guard.scrml`. `scrml compile` exit-0, **runtime `E-ENGINE-001-RT` on every legal transition**.

```scrml
${ type Mode:enum = { Nav, Edit }
   @mode: ModeMachine = Mode.Nav
   function toggle() { if (@mode == Mode.Nav) { @mode = .Edit } else { @mode = .Nav } } }
<engine name=ModeMachine for=Mode initial=.Nav>
  <Nav rule=.Edit /> <Edit rule=.Nav />
  <onTransition from=.Nav to=.Edit>${ @mode = @mode }</onTransition>
  <onTransition from=.Edit to=.Nav>${ @mode = @mode }</onTransition>
</engine>
```

Runtime: clicking toggle throws `E-ENGINE-001-RT: Illegal transition. Variable:
mode, governed by: ModeMachine. Move: Nav => Edit. No rule permits this
transition.` — even though the rule table is built correctly:
```js
const __scrml_engine_modeMachine_transitions = Object.freeze({ "Nav": ["Edit"], "Edit": ["Nav"] });
```
The write-guard for `@mode = .Edit` instead looks up
`__scrml_transitions_ModeMachine[fromVar + ":" + toVar]` (a different table, keyed
by the engine NAME, colon-keyed) and finds no rule → throw.

The deeper cause: with `name=`, the engine auto-declares its variable from the
NAME (`modeMachine`), so the separately-declared `@mode: ModeMachine` cell does
**not** trigger the collision check. Drop `name=` and declare `@mode: Mode` and you
get the correct compile-time diagnostic:
```
E-ENGINE-VAR-DUPLICATE: engine variable `mode` collides with a separately-declared
state cell `<mode>`. The engine OWNS its auto-declared variable...
```
So the no-name form correctly diagnoses the misuse at compile time; **the `name=`
form swallows that diagnostic and emits a runtime-broken guard instead.**
Workaround (used in p10): canonical no-name `<engine for=Mode initial=.Nav>` and
let the engine own the variable.

## 4. Question AF — §36 input-state read in markup interp is render-once (non-reactive)

Sidecar: `question-af-input-state-markup-nonreactive.scrml`. Not filing as a hard
bug — want your read on intended semantics.

```scrml
<mouse id="cursor"/>
<program>
<div>cursor.x = ${<#cursor>.x}</div>
</program>
```
emits the read with **no effect wrapper**:
```js
_scrml_render_value(el, _scrml_input_state_registry.get("cursor").x);   // render-once, no _scrml_effect
```
A reactive @cell / user-fn textContent interp in the same file DOES get an
`_scrml_effect(...)` wrapper. Runtime: `${<#cursor>.x}` shows the initial value and
never updates on mousemove; `${<#keys>.lastKey}` stays "".

**Q:** is markup interp of input-state meant to be reactive (codegen gap — wrap the
read in an effect subscribed to the registry), or is read-inside-`animationFrame` +
write-`@cell` the only supported pattern by design? §36.1 calls these "reactive
access"; the §36 examples only ever read inside loops. For an editor that wants to
show live cursor coords / current key / modifiers in its chrome, the bare-markup
form being non-reactive forces a manual rAF→@cell bridge — would be good to know if
that's intended. (Sibling of AC: AC fixed the read path; AF is about whether it
re-renders.)

## p10 coverage map (for your runtime-coverage tracking)

- for-lift `<li class:focused= / style:opacity=>` reading global `@focusId` via
  item-binding `for (const r of @regions)` — **Bug-V neighborhood, live-confirmed
  fixed** through nav (j/k) + insert/remove churn: exactly one focused row at all
  times. (Indexed `@regions[i]` in the reactive binding crashes on array-shrink —
  `undefined.id` — so item-binding is the correct form; not filing, it's expected.)
- `<engine for=Mode initial=.Nav>` + `<onTransition>` (no-name form) — works; AB
  live-confirmed.
- string rendering of fn-names + URLs — X/Z live-confirmed fixed.
- §36 `<keyboard>`/`<mouse>` panel — reads work (AC fixed) but non-reactive in
  markup (AF).

Source + smoke live in 6nz: `src/playground-ten/{app.scrml,test.js}` (19/19).
Fire back on AD/AE/AF and we'll re-test against the next build.

— 6nz (S12)
