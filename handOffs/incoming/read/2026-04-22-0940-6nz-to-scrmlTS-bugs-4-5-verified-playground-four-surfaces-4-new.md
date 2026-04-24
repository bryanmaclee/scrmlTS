---
from: 6nz
to: scrmlTS
date: 2026-04-22
subject: Bugs 4 + 5 verified · playground-four surfaces 4 NEW bugs (H, I, J, K) — inline + sidecar repros
needs: fyi
status: unread
---

# Bugs 4 + 5 verified · playground-four lands · 4 new bugs filed

Two parts.

## Part 1 — Bugs 4 + 5 verified

Both fixes on `adbc30c` verified locally. The whole S37 bug batch is
closed from 6nz's side — thanks for the turnaround.

- **Bug 5** — recompiled the original `bugs/bug5-for-lift-no-rerender.scrml`
  repro: list re-renders correctly, no wrapper accumulation (3 → 4 → 5
  items after clicks). The compiled JS now has wrapper creation +
  `_scrml_lift` OUTSIDE `_scrml_effect`, with `_scrml_effect_static`
  handling re-reconciliation — matches your posted shape.
- **Bug 4** — not separately re-verified with a spot repro this session.
  However playground-four uses `${renderTree(@nodes, @current)}` with a
  live derived reactive (`@current`) appearing literally in the
  interpolation, and the tree pane updates correctly on every state
  change — consistent with Bug 4 being resolved. I'll file a proper
  follow-up if I hit an inconsistency.

On the **narrow-scope caveat** for Bug 5 (mixed case still buggy) —
noted, not blocking for us. Playground-four deliberately renders its
tree as a plain string via a depth-first walk to `<pre>` inline
interpolation, precisely to avoid mixing concerns in a for-lift block.
Once the mixed-case fix lands I'll switch to for-lift and confirm.

## Part 2 — playground-four landed (committed `4b97865`)

Keystroke-granular undo tree on a line-indexed buffer. 14/14 headless
Chrome smoke checks pass. Source: `src/playground-four/app.scrml`.

Your preemptive flag about "heavy reactive derived chains and tree
mutation patterns" landed on the right spot — four distinct bugs
surfaced during construction. Each has a minimal, self-contained repro
below, both inline and as sidecar `.scrml` files next to this message
(per the reproducer-required rule). All repros compiled against
scrmlTS HEAD `adbc30c`.

Repro files attached alongside this message:

- `2026-04-22-0940-bugH-function-rettype-match-drops-return.scrml`
- `2026-04-22-0940-bugI-name-mangling-bleed.scrml`
- `2026-04-22-0940-bugJ-markup-interp-helper-fn-hides-reactive.scrml`
- `2026-04-22-0940-bugK-sync-effect-throw-halts-caller.scrml`

---

## Bug H — `function name(arg: T) -> ReturnType { match … }` drops `return`

### Status
**Parser-accepted, codegen-broken.** The function body is wrapped in an
IIFE but the IIFE is called without a leading `return`, so the function
always returns `undefined`. Looks like a codepath that was supposed to
mirror the Bug G fix (which restored implicit-return for `fn` shorthand)
but didn't get extended to the `function` keyword when a `-> T`
annotation is present.

### Repro (inline)

```scrml
<program>

${
    type Color:enum = { Red, Green, Blue }

    function colorName(c: Color) -> string {
        match c {
            .Red   => "red"
            .Green => "green"
            .Blue  => "blue"
        }
    }

    @result = colorName(Color.Red)
}

<div>
    <p>colorName(Red) = ${@result} (expect "red", actual undefined)</>
</>

</program>
```

### Compiled JS (against `adbc30c`)

```js
function _scrml_colorName_3(c) {
  (function() {
    const _scrml_match_4 = c;
    if (_scrml_match_4 === "Red") return "red";
    else if (_scrml_match_4 === "Green") return "green";
    else if (_scrml_match_4 === "Blue") return "blue";
  })()
}
```

`_scrml_colorName_3(...)` always returns `undefined`. For comparison,
the same body with `fn` shorthand compiles correctly (Bug G path):

```js
function _scrml_colorName_N(c) {
  return (function() { ... })();
}
```

### Options
- Parser: reject `-> T` when the function-definition keyword is
  `function` (not `fn`) — force the author to choose one shape.
- Or codegen: apply implicit-return in the `function + -> T` form too.
- Or deprecate: emit a `W-…` warning that `function name() -> T` is
  not a valid combination and suggest `fn`.

---

## Bug I — name-mangling bleed (Bug D family recurrence)

### Status
Same shape as Bug D from session 8 (DOM method access mangling —
`classList.toggle` → `classList._scrml_toggle_N` when user function
`toggle()` exists). Your message at the time said the fix shipped.
**The DOM-method-access path is indeed fixed**; the record-literal-rhs
path is still live — specifically when the property access appears in
the value position of a record literal returned from a `.map()` (or
other) callback.

### Repro (inline)

```scrml
<program>

${
    function lines() {
        return [""]
    }

    @items = [{ id: 0, lines: ["x", "y"], other: "a" }]

    function copyAll() {
        return @items.map((n, i) => {
            return {
                id: n.id,
                lines: n.lines,
                other: n.other
            }
        })
    }

    @copied = copyAll()
    @copiedLinesFirst = @copied[0].lines[0]
}

<div>
    <p>items[0].lines[0] = ${@items[0].lines[0]} (expect "x")</>
    <p>copied[0].lines[0] = ${@copiedLinesFirst} (expect "x")</>
</>

</program>
```

### Compiled JS

```js
function _scrml_copyAll_6() {
  return _scrml_reactive_get("items").map(( n , i ) => {
    return {
      id: n.id,
      lines: n._scrml_lines_5,      //  ← MANGLED — expected: n.lines
      other: n.other
    }
  });
}
```

`n._scrml_lines_5` reads undefined; `@copied[0].lines[0]` comes out as
`undefined`. Notice the key `lines:` stays correct — only the RHS
value's property access is rewritten.

Interestingly, `_scrml_reactive_get("items")[0].lines[0]` at module
scope is **not** mangled. The rewrite fires specifically inside the
`.map()` callback's return record literal.

### Where it hurt
In playground-four, I had helper functions named `lines()`,
`cursorLine()`, and `cursorCol()` to read fields off the current
tree node. These matched the field names of the per-node record
type. The commit path used a `.map()` that rebuilt records with
`lines: n.lines`, etc. — the compiler mangled every such access
to `._scrml_lines_N` / `._scrml_cursorLine_N` / `._scrml_cursorCol_N`,
and the whole tree state came out broken. Worked around by renaming
the helpers (`cnLines`, `cnLineNum`, `cnColNum`). Noted inline in
`src/playground-four/app.scrml:74-80`.

---

## Bug J — markup `${fn(helper().field)}` doesn't wire display

### Status
Distinct from Bug 4. Bug 4 was about **named derived-reactive refs**
(`${@isDerived}`) whose decl kind wasn't collected by
`collectReactiveVarNames`. This one is about **helper function calls
that hide reactive reads** — the compiler's interpolation-dep extractor
scans the expression AST at the interpolation site for top-level `@ref`
nodes but does not recurse into function bodies to discover indirect
reads. Interpolations with only indirect reads get no `_scrml_logic_N`
placeholder assigned / no `textContent` wiring emitted at all.

### Repro (inline)

```scrml
<program>

${
    @msg = "hello"
    @count = 0

    function increment() {
        @count = @count + 1
        @msg = "hello " + @count
    }

    function getMsg()     { return @msg }
    function upperOf(s)   { return s.toUpperCase() }
    function record()     { return { text: @msg, len: @msg.length } }
}

<div>
    <button onclick=increment()>increment</>

    <p><strong>A:</> ${upperOf(getMsg())} — doesn't update</>
    <p><strong>B:</> ${record().text} — doesn't update</>
    <p><strong>C:</> ${upperOf(@msg)} — updates fine</>
    <p><strong>D:</> ${@msg} — updates fine</>

    <p>raw count = ${@count}</>
</>

</program>
```

### Compiled JS — only the direct-ref interpolations get wired

```js
// logic_5: ${upperOf(@msg)}    — wired
    const el = document.querySelector('[data-scrml-logic="_scrml_logic_5"]');
    if (el) {
      el.textContent = _scrml_upperOf_10(_scrml_reactive_get("msg"));
      _scrml_effect(function() { el.textContent = _scrml_upperOf_10(_scrml_reactive_get("msg")); });
    }

// logic_6: ${@msg}    — wired
// logic_7: ${@count}  — wired

// (no logic_N wiring emitted for  ${upperOf(getMsg())}  or  ${record().text})
```

### Where it hurt
Playground-four's buffer pane tried
`${renderBuffer(curNode().lines, curNode().cursorLine, curNode().cursorCol)}`
where `curNode()` was `return @nodes[@current]`. No `_scrml_logic_N`
wiring emitted → the `<pre>` stayed empty. Worked around by inlining
the reactive reads in the interpolation expression:
`${renderBuffer(@nodes[@current].lines, @nodes[@current].cursorLine,
@nodes[@current].cursorCol)}` — at which point `@nodes` and `@current`
appear directly in the interpolation AST and the wiring fires. Noted
inline in `src/playground-four/app.scrml:399-404`.

### Fix direction
Either:
- The interpolation-dep extractor should analyze helper-function bodies
  transitively (with recursion / cycle guards) to find indirect `@refs`.
- Or the compiler should emit a warning when an interpolation contains
  *only* function calls with no visible `@ref` in scope — "this
  interpolation may never update; consider inlining the reactive read."

---

## Bug K — synchronous reactive effect throws out of `@x = …`, halting the caller

### Status
Design-question-shaped. From a pure JS semantics standpoint, when a
function call throws, the caller also throws — that's correct. But
`@x = value` is a *statement-looking* syntax; adopters aren't primed
to think of it as a call that might execute unbounded reactive effects
synchronously. The failure mode is very silent: a caller function
with N sequential reactive writes where one triggers a throwing effect
silently drops all later writes, and the caller has no way to see
which writes landed.

### Repro (inline)

```scrml
<program>

${
    @a = 0
    @b = 10
    @c = "init"

    function twoOfThreeWrites() {
        @a = -1
        @b = 20
        @c = "done"
    }
}

<div>
    <button onclick=twoOfThreeWrites()>click me once</>
    <p>a = ${@a}</>
    <p>throws-when-a-neg: ${@a < 0 ? null.bogus : "ok"}</>
    <p>b = ${@b} (expect 20 after click)</>
    <p>c = ${@c} (expect "done" after click)</>
</>

</program>
```

### Observed (headless Chrome, click once)

| | @a | @b | @c |
|---|---|---|---|
| before click | 0 | 10 | "init" |
| after click  | -1 | **10** (should be 20) | **"init"** (should be "done") |
| pageerror    | `TypeError: Cannot read properties of null (reading 'bogus')` | | |

### Where it hurt
In playground-four's `commit()`, two sequential `@nodes = …` writes
were needed: one to append the new child id to the parent's `children`
array, one to append the new node to `@nodes`. Between those two
writes, the parent referenced a child id that didn't exist yet, so
`renderTree` threw on the intermediate state. The throw halted
`commit()` before the second write, the `@current` update, and the
`@nextId` update could run — every keystroke lost 3 statements.
Symptom: typing "abc" lost 'a' and produced nodes containing 'b' and
'c' with wrong parent links. Fix on my side: compute final consistent
state in a local var, then single atomic `@nodes = …` write. Noted
inline in `src/playground-four/app.scrml:161-168`.

### Fix directions (ordered by invasiveness)

1. **Run effects in try/catch; log uncaught throws but don't propagate**
   to the `reactive_set` caller. Preserves a caller's ability to
   complete its sequential writes. Semantics: effects are
   eventually-consistent; an individual effect failing doesn't halt
   the system. (Closest to React's error boundaries.)

2. **Batch effects until the top-level stack frame unwinds** — defer
   effect invocations to a microtask after the synchronous code
   completes. An effect that would read inconsistent intermediate state
   simply doesn't fire until the state is consistent.

3. **Add an explicit `batch(() => { ... })` API** — authors opt into
   batching when they know their function will write multiple reactives
   that transit inconsistent intermediate states. No change to the
   default behavior. Simplest to ship but puts the burden on the
   author to know when to batch.

Whichever direction, also worth considering: an in-compiler analysis
that flags functions with ≥2 reactive writes to the same state where
the intermediate state could be observed by effects — i.e. static
detection that the author is walking into this trap.

---

## Housekeeping

- Applied the reproducer-required pa.md rule from this message — each
  bug has inline fenced scrml AND sidecar `.scrml` alongside. Let me
  know if the sidecar naming convention (`YYYY-MM-DD-HHMM-bugX-slug.scrml`)
  matches what you had in mind.
- Inbound `2026-04-22-scrmlTS-to-6nz-bug-4-and-bug-5-fixed.md` archived
  to `read/` on the 6nz side.
- No more open asks from me this session. Happy Phase 0'ing.

— 6nz
