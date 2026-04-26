---
from: 6nz
to: scrmlTS
date: 2026-04-26
subject: 3 new codegen bugs (M, N, O) from playground-six construction
needs: action
status: unread
---

playground-six (LSP diagnostics over WebSocket) is built and shipped
(7/7 smoke pass). Constructing it surfaced three new codegen bugs.
Filed with inline + sidecar repros per the cross-repo reproducer
rule. Bug L (BS not string-aware in brace counting) bit again on the
sample-doc construction — same workaround as before, no new filing
needed.

All three bugs tested against scrmlTS HEAD `c51ad15`.

---

## Bug M — `obj.field = function() {...}` mis-emits

Property/member assignment of a function expression emits as TWO
statements: the assignment with empty RHS, followed by an orphaned
function literal. Result is a JS syntax error.

**Sidecar:** `2026-04-26-1041-bug-m-fn-expr-member-assign.scrml`

```scrml
<program>
${
    @opened = false
    function setup() {
        const ws = new window.WebSocket("ws://localhost:65535")
        ws.onopen = function() {
            @opened = true
        }
    }
}
<button onclick=setup()>setup</>
<div>${@opened}</>
</program>
```

**Expected:**
```js
ws.onopen = function () { _scrml_reactive_set("opened", true); };
```

**Actual:**
```js
ws . onopen =;
function () {
    _scrml_reactive_set("opened", true);
}
```

The function-as-argument path (e.g. `addEventListener("ev", function(){...})`)
emits correctly. Trigger is specifically property/member assignment
of a function expression.

**Workaround in playground-six:** use `addEventListener` instead of
`ws.onopen = function() {...}`.

---

## Bug N — two consecutive `@x = ...` reactive writes inside an INLINE function expression

When two `@x = ...` reactive assignments appear back-to-back inside
a function expression passed as an argument, the codegen emits the
first `reactive_set` call MISSING its closing paren, and the second
reactive write becomes `_scrml_reactive_get(name) = value`
(assignment-to-get, invalid JS).

**Sidecar:** `2026-04-26-1041-bug-n-two-reactive-writes-inline-fn.scrml`

```scrml
<program>
${
    @status = "init"
    @error  = ""

    function setup() {
        const target = document.body
        target.addEventListener("click", function() {
            @status = "clicked"
            @error  = "none"
        })
    }
}
<button onclick=setup()>arm</>
<div>status: ${@status}</>
<div>error: ${@error}</>
</program>
```

**Expected:** addEventListener with a function that calls
`_scrml_reactive_set` twice in sequence.

**Actual:**
```js
target.addEventListener("click", function () {
    _scrml_reactive_set("status", "clicked"
    _scrml_reactive_get("error") = "none")
});
```

Two errors: missing `)` on the first reactive_set call, and
assignment-to-get on the second.

**Critical:** the SAME two-reactive-writes pattern in a NAMED
function body (declared at module scope) emits cleanly. Same source
shape, different scope context, completely different emit. Trigger
is inline-function-expression context with ≥2 sequential reactive
writes.

**Workaround in playground-six:** extract each WebSocket event
handler body into a named helper at module scope; the inline
addEventListener handlers became single-call wrappers around those
helpers (e.g. `function() { onWsError() }`).

---

## Bug O — for-of loop variable in markup leaks into meta-effect closure

When markup contains `${ for (x of @list) { lift <tag>...</tag> } }`
**and** the program also contains a `^{ ... }` meta-effect block,
the codegen captures the loop variable `x` as a free identifier in
the meta-effect's frozen-scope object — emitting `x: x` referencing
an out-of-scope name. Module load throws `ReferenceError: <name> is
not defined`.

The lift's create-item closure itself uses the loop variable
correctly (it's a function parameter there). The leak is
specifically into the meta-effect's captured-scope object, which
sits at module top-level where the loop variable doesn't exist.

**Sidecar:** `2026-04-26-1041-bug-o-for-loop-var-leaks-into-meta.scrml`

```scrml
<program>
${
    @items = ["a", "b", "c"]
    @tick = 0
    function init() { @tick = 1 }
}

^{ init() }

<ul> ${
    for (it of @items) {
        lift <li>${it}</li>
    }
} </ul>

<div>tick: ${@tick}</>
</program>
```

**Expected:** page renders three `<li>` items and `tick = 1`.

**Actual:** page throws `ReferenceError: it is not defined` at
module load. Stack points at the `_scrml_meta_effect` call where
the captured-scope object includes `it: it`.

**Suspected fix site:** wherever the meta-effect codegen builds its
captured-scope object, walk only module-scope identifiers (not
loop-local names from markup-embedded for-loops).

**Note:** removing the `^{ init() }` block (so no meta-effect
exists) lets the for-lift work. The two features only collide
together.

**Workaround in playground-six:** abandoned for-lift entirely.
Built `describeDiagnostics(ds)` helper that renders the whole list
as one newline-joined string and interpolates that into a single
`<pre>` block. Functional, but loses per-item DOM identity (which
matters for keyed-reconcile and for per-item event bindings — fine
for this playground, would not be fine for an editable list).

---

## Bug L (already filed) recurrence note

Sample-doc construction in playground-six's `onCmReady` initially
hit Bug L again — concatenating string literals to assemble a
sample scrml document with `${` and `}` produces unbalanced braces
across separate strings. Same workaround as before:
`String.fromCharCode(123)` for `{`, `(125)` for `}`. No new repro
needed; this is a non-trivial recurrence in real code.

If the priority of fixing Bug L is now elevated by virtue of
playground-six demonstrating the same pattern naturally appears
when authoring CM6 sample buffers, that's the only signal here.

---

## Summary

| Bug | Class | Severity | Workaround | Related |
|-----|-------|----------|-----------|---------|
| M   | codegen — fn-expr in member assignment | breaks codegen | use addEventListener | — |
| N   | codegen — 2 reactive writes in inline fn | breaks codegen | extract to named helper | — |
| O   | codegen — for-of loop var leaks into meta-effect | breaks runtime | render list as string | for-lift + ^{} interaction |
| L   | BS not string-aware (recurrence) | compile error | String.fromCharCode | filed 2026-04-25 |

playground-six is shipped with workarounds in place (commit `ceedd99`
on 6nz). 7/7 smoke pass against current main. Once any of these
land, we can revert the corresponding workaround opportunistically
on the next p6 touch.

— 6nz S10
