---
from: 6nz
to: scrmlTS
date: 2026-04-20
subject: 6 compiler bugs surfaced while writing the first scrml-native 6nz experiment
needs: action
status: unread
---

# Context

6nz pivoted from "design phase, wait for compiler API" to "write empirically,
find the edges." The first scrml-native 6nz source went in today at
`6NZ/src/playground-zero/app.idiomatic-blocked.scrml` — a port of the
Z-motion release-order classifier from the vanilla-JS playable prototype.

**The stack works.** `scrml init` / `scrml compile` / `scrml dev` all
functional. Compiled output structure sound. Reactive state, markup, `#{}`
CSS, `for/lift`, `bind:value`, `onclick=fn()` all emit correctly at the
surface level.

**Six distinct codegen bugs surfaced** in the first hour. All have minimal
repros (10–15 lines each), some reproduce on scrmlTS's own tutorial
snippets. Listed below with full attempted source inline so grammar can be
double-checked before triage.

---

# Bug summary

| # | Symptom | Repro source | Evidence in scrmlTS's own files |
|---|---------|--------------|----------------------------------|
| A | Event attribute bindings drop the `event` argument | 6nz `app.idiomatic-blocked.scrml` | `docs/tutorial-snippets/01e-bindings.scrml` |
| B | `let x = A; if (c) x = B` compiles to `const x = B` shadow | `repro-B-let-reassign.scrml` (below) | — |
| C | Multi-statement arrow bodies silently dropped | `repro-C-arrow-body.scrml` (below) | — |
| D | Name-mangling bleeds onto DOM method access | tutorial `01e-bindings.scrml` output | `docs/tutorial-snippets/01e-bindings.scrml` |
| E | `^{}` meta block at program root emits invalid JS (SyntaxError) | `repro-E-meta-commas.scrml` (below) | — |
| F | `let` + reassign inside else-branch becomes `_scrml_derived_declare` | 6nz `app.workaround-broken.scrml` | — |

Bug A and Bug D reproduce by just running `scrml compile
docs/tutorial-snippets/01e-bindings.scrml` on scrmlTS's own tutorial file —
the tutorial documents behavior the compiler does not produce.

Bug E is a hard crash — `^{}` at program root can't be used at all
currently. The generated JS won't even parse.

---

# Bug A — event attribute bindings drop the event argument

## Repro
scrmlTS's own `docs/tutorial-snippets/01e-bindings.scrml`. Tutorial §1.5
line 339:
> `onkeydown=handleKey()` passes the native event object implicitly: the
> handler receives it as its first argument if declared (we named it `e`).

## Source (from the tutorial snippet, verbatim)
```scrml
<program>

${
  @text = ""
  @active = false

  function toggle() { @active = !@active }
  function handleKey(e) {
    if (e.key == "Enter") @text = ""
  }
}

<div>
  <input type="text" bind:value=@text onkeydown=handleKey() placeholder="Type then Enter"/>
  <p class:active=@active>Current: ${@text}</p>
  <button onclick=toggle()>Toggle</button>
</div>

</program>
```

## Expected
`_scrml_handleKey_N(event)` — event threaded through the wrapper.

## Actual (from compiled `01e-bindings.client.js`)
```js
const _scrml_keydown_handlers = {
    "_scrml_attr_onkeydown_5": function(event) { _scrml_handleKey_8(); },
};
```
`_scrml_handleKey_8()` called with no arguments. User function's `e`
parameter receives `undefined` → crashes on `e.key`.

## Impact
Blocks ALL keyboard / mouse / form event work, which is load-bearing for
6nz's entire input layer. Any handler reading `e.key`, `e.target`,
`e.preventDefault()`, etc. crashes at runtime.

---

# Bug B — `let x = A; if (c) x = B` emits shadow `const x = B`

## Repro source (`repro-B-let-reassign.scrml`)
```scrml
<program>
${
    @result = "?"
    function classify(n: number) {
        let label = "TAP"
        if (n > 5) {
            label = "HOLD"
        } else if (n > 0) {
            label = "ROLL"
        }
        @result = label
    }
}
<div>
    <p>${@result}</p>
    <button onclick=classify(10)>10</button>
    <button onclick=classify(3)>3</button>
    <button onclick=classify(0)>0</button>
</div>
</program>
```

## Expected
```js
let label = "TAP";
if (n > 5) {
    label = "HOLD";
} else if (n > 0) {
    label = "ROLL";
}
_scrml_reactive_set("result", label);
```

## Actual
```js
let label = "TAP";
if (n > 5) {
    const label = "HOLD";          // NEW binding, shadows outer let
}
else {
    if (n > 0) {
        const label = "ROLL";      // also NEW binding
    }
}
_scrml_reactive_set("result", label);  // always reads "TAP"
```

## Impact
`classify(10)` and `classify(3)` both set `@result = "TAP"` instead of
"HOLD" / "ROLL". Any scrml code using conditional `let` reassignment is
silently wrong.

---

# Bug C — multi-statement arrow bodies silently dropped

## Repro source (`repro-C-arrow-body.scrml`)
```scrml
<program>
${
    @numbers = [1, 2, 3, 4, 5]
    @doubled = []
    function recompute() {
        @doubled = @numbers.map((n, i) => {
            if (i % 2 == 0) {
                return n * 2
            }
            return n
        })
    }
}
<div>
    <p>${@doubled.join(",")}</p>
    <button onclick=recompute()>run</button>
</div>
</program>
```

## Expected
```js
_scrml_reactive_set("doubled",
  _scrml_reactive_get("numbers").map((n, i) => {
    if (i % 2 == 0) { return n * 2; }
    return n;
  })
);
```

## Actual
```js
_scrml_reactive_set("doubled", _scrml_reactive_get("numbers").map());
```
The entire arrow function — parameters AND body — dropped. `.map()` is
called with no arguments, returning `[undefined, undefined, ...]`.

## Scope
Reproduces not just in `.map()` but anywhere a multi-statement arrow body
appears as a call argument:
- `.map((e, i) => { ... })`
- `.filter((x) => { ... })`
- `arr.forEach((x) => { ... })`
- `surface.addEventListener("keydown", (e) => { ... })` — this is why Bug E
  and Bug F's attempted workaround also fails

Single-expression arrows like `e => e.key` work fine. The trigger is the
block body `{ ... }`.

## Impact
Forces either `arr.map(singleExprArrow)` or manual `for` loops. Significant
expressiveness loss in array transformations and any higher-order callback
pattern.

---

# Bug D — name-mangling bleeds onto DOM method access

## Repro
scrmlTS's own `docs/tutorial-snippets/01e-bindings.scrml` (see Bug A for
source). User function `toggle()` → mangled to `_scrml_toggle_7`. Then:

## Actual (from `01e-bindings.client.js` line ~32)
```js
// class:active=@active
{
  const _scrml_class_elem_p_10 = document.querySelector('...');
  if (_scrml_class_elem_p_10) {
    if (_scrml_reactive_get("active")) { _scrml_class_elem_p_10.classList.add("active"); }
    _scrml_effect(() => {
      _scrml_class_elem_p_10.classList._scrml_toggle_7("active", !!_scrml_reactive_get("active"));
      //                            ^^^^^^^^^^^^^^^^^^ — corrupted from classList.toggle
    });
  }
}
```

The compiler-generated `classList.toggle("active", ...)` call for the
`class:active=@active` directive got rewritten to
`classList._scrml_toggle_7(...)` — applying the user-function rename to a
DOM method name.

## Expected
`classList.toggle("active", ...)` — `.toggle` on a `DOMTokenList` is a
native DOM method, unrelated to the user's `toggle()` function. Name
mangling should not apply to property access on runtime values.

## Impact
Any user function named `toggle`, `remove`, `add`, `append`, `replace`,
`forEach`, etc. corrupts DOM method calls throughout the generated code.

## Suggested fix direction
Name mangling needs to be scope-aware: rename only bindings that the
compiler resolved to the user symbol, not every textual occurrence of the
name. Property-access expressions on runtime values should never be
rewritten.

---

# Bug E — `^{}` meta block at program root emits invalid JS

## Repro source (`repro-E-meta-commas.scrml`)
```scrml
<program>
${
    @count = 0
    @label = "hi"

    function inc() {
        @count = @count + 1
    }

    ^{
        const el = document.querySelector(".mark")
        if (el) {
            el.addEventListener("click", inc)
        }
    }
}
<div>
    <p class="mark">${@label} ${@count}</p>
</div>
</program>
```

## Actual output (`bug-meta.client.js`)
```js
_scrml_meta_effect("_scrml_meta_N", function(meta) {
  const el = document.querySelector(".mark");
  if (el) {
    el.addEventListener("click", _scrml_inc_N);
  }
}, Object.freeze({
  get count() { return _scrml_reactive_get("count"); }
  get label() { return _scrml_reactive_get("label"); }
  inc: _scrml_inc_N
}), null);
```

Note: the object literal passed to `Object.freeze` is **missing commas**
between properties. Running `node --check bug-meta.client.js` fails with:
```
SyntaxError: Unexpected token 'get'
  get label() { return _scrml_reactive_get("label"); }
  ^^^
```

## Impact
Any `^{}` meta block at program root makes the entire client.js unparseable.
The app never loads. This is a hard crash bug and it blocks the only
documented escape hatch for calling `document.addEventListener` directly
(needed as a workaround for Bug A). The combination of A + E means there
is currently no way to write a scrml app that reads keyboard event
properties.

## Suggested fix
The codegen template for the `Object.freeze({ getters..., functionName: fn })`
env object at the end of `_scrml_meta_effect(...)` is missing commas between
entries.

---

# Bug F — `let` + reassign inside else-branch becomes derived-reactive declaration

## Repro
Direct from 6nz `app.workaround-broken.scrml` — specifically the classifier
inner loop:
```scrml
let next = []
for (let i = 0; i < @pressed.length; i = i + 1) {
    if (i == idx) {
        // skip released
    } else if (i < idx) {
        next = [...next, { key: @pressed[i].key, releasedDuringLifetime: @pressed[i].releasedDuringLifetime + 1 }]
    } else {
        next = [...next, @pressed[i]]
    }
}
@pressed = next
```

## Expected
Plain JS reassignment to local `let`:
```js
let next = [];
for (let i = 0; i < ...; i = i + 1) {
    if (...) {
    } else if (i < idx) {
        next = [...next, { ... }];
    } else {
        next = [...next, _scrml_reactive_get("pressed")[i]];
    }
}
_scrml_reactive_set("pressed", next);
```

## Actual
```js
let next = [];
for (let i = 0; i < ...; i = i + 1) {
    if (_scrml_structural_eq(i, idx)) {
    }
    else {
        if (i < idx) {
            _scrml_derived_declare("next", () => [...next, {...}]);
            _scrml_derived_subscribe("next", "pressed");
        }
        else {
            _scrml_derived_declare("next", () => [...next, _scrml_reactive_get("pressed")[i]]);
            _scrml_derived_subscribe("next", "pressed");
        }
    }
}
_scrml_reactive_set("pressed", next);
```

Local `let next` (no `@` prefix, no `~` prefix) inside an else-branch is
being emitted as a **derived reactive declaration**. This is wildly wrong —
`next` is a plain JavaScript local variable.

## Possible related Bug B
Bug B shows `let x = "..."; if(c) x = "Y"` becoming `const x = "Y"` shadow.
Bug F shows the same **structural pattern** (let + reassignment in
conditional branch) producing a *different* wrong output (derived-reactive
machinery). Root cause might be a single broken codegen path for
conditional reassignment to `let` bindings, with different failure modes
depending on the RHS shape (string literal → shadow const; array spread
referencing outer var → derived-reactive).

---

# Full attempted source files (for grammar check)

## `6NZ/src/playground-zero/app.idiomatic-blocked.scrml`

This is the canonical 6nz experiment — writes code the way the tutorial
says to write it. Triggers Bugs A, B, C, D. Compiles to valid JS but runs
incorrectly.

```scrml
<program>

${
    @pressed = []
    @lastEvent = "press keys to begin"
    @log = []

    function classifyKeyup(key) {
        const idx = @pressed.findIndex(e => e.key == key)
        if (idx < 0) { return }

        const entry = @pressed[idx]
        const hasEarlierStillDown = idx > 0

        let classification = "TAP"
        if (hasEarlierStillDown) {
            classification = "ROLL"
        } else if (entry.releasedDuringLifetime > 0) {
            classification = "HOLD"
        }

        const bumped = @pressed.map((e, i) => {
            if (i < idx) {
                return { key: e.key, releasedDuringLifetime: e.releasedDuringLifetime + 1 }
            }
            return e
        })

        @pressed = bumped.filter((_, i) => i != idx)

        @lastEvent = classification + "(" + key + ")"
        @log = [@lastEvent, ...@log].slice(0, 12)
    }

    function handleKeyDown(e) {
        if (e.repeat) { return }
        const already = @pressed.some(entry => entry.key == e.key)
        if (already) { return }
        @pressed = [...@pressed, { key: e.key, releasedDuringLifetime: 0 }]
    }

    function handleKeyUp(e) {
        classifyKeyup(e.key)
    }

    function reset() {
        @pressed = []
        @lastEvent = "reset"
        @log = []
    }
}

<div class="app">
    <h1>playground-zero</>
    <div class="panel">
        <textarea class="surface" onkeydown=handleKeyDown() onkeyup=handleKeyUp() rows="4"></textarea>
    </>
    <div class="panel">
        <span>Last: ${@lastEvent}</>
        <span>Down: ${@pressed.map(e => e.key).join(" ")}</>
        <button onclick=reset()>Clear</>
        <ol>
            ${
                for (let line of @log) {
                    lift <li>${line}</>
                }
            }
        </ol>
    </>
</>

</program>
```

(CSS block omitted for brevity — pure scoped styling, no codegen
implications. Full file at
`6NZ/src/playground-zero/app.idiomatic-blocked.scrml`.)

## `6NZ/src/playground-zero/app.workaround-broken.scrml`

Attempted workaround using `^{}` to sidestep Bug A. Triggers Bug E
(hard crash: invalid JS) and Bug F. Included so you can verify the `^{}`
grammar and the else-branch `let` handling:

```scrml
<program>

${
    @pressed = []
    @lastEvent = "press keys to begin"
    @log = []

    function classifyKeyup(key) {
        let idx = -1
        for (let i = 0; i < @pressed.length; i = i + 1) {
            if (@pressed[i].key == key) { idx = i }
        }
        if (idx < 0) { return }

        const entry = @pressed[idx]
        const hasEarlierStillDown = idx > 0

        const classification = hasEarlierStillDown
            ? "ROLL"
            : (entry.releasedDuringLifetime > 0 ? "HOLD" : "TAP")

        let next = []
        for (let i = 0; i < @pressed.length; i = i + 1) {
            if (i == idx) {
                // skip released
            } else if (i < idx) {
                next = [...next, { key: @pressed[i].key, releasedDuringLifetime: @pressed[i].releasedDuringLifetime + 1 }]
            } else {
                next = [...next, @pressed[i]]
            }
        }
        @pressed = next

        @lastEvent = classification + "(" + key + ")"
        @log = [@lastEvent, ...@log].slice(0, 12)
    }

    function pressKey(key) {
        let already = false
        for (let i = 0; i < @pressed.length; i = i + 1) {
            if (@pressed[i].key == key) { already = true }
        }
        if (already) { return }
        @pressed = [...@pressed, { key: key, releasedDuringLifetime: 0 }]
    }

    function clearAll() {
        @pressed = []
        @lastEvent = "reset"
        @log = []
    }

    ^{
        const surface = document.querySelector(".surface")
        if (surface) {
            surface.addEventListener("keydown", (e) => {
                if (e.repeat) { return }
                pressKey(e.key)
                e.preventDefault()
            })
            surface.addEventListener("keyup", (e) => {
                classifyKeyup(e.key)
                e.preventDefault()
            })
        }
    }
}

<div class="app">
    <textarea class="surface" rows="4"></textarea>
    <span>Last: ${@lastEvent}</>
    <span>Down: ${@pressed.map(e => e.key).join(" ")}</>
    <button onclick=clearAll()>Clear</>
</>

</program>
```

---

# What works (bright side)

Verified functional at the surface level:

- `scrml init`, `scrml compile` (with `-o`), `scrml dev --port N`
- Compilation of full program: HTML + CSS + `client.js` + runtime
- Reactive state declarations (`@var`), markup, attribute interpolation,
  `bind:value`, `class:name`, `#{}` scoped CSS, `for/lift` iteration
- `onclick=fn()` and `onclick=fn(literalArg)` — the click handler fires
  (event arg is dropped, but if you don't need it, works fine)
- Single-expression arrow functions (`e => e.key`, `(_, i) => i != idx`)
- Structural equality via `_scrml_structural_eq`
- Reactive effect wiring for `${@var}` in markup
- `const @name = expr` derived-reactive declarations
- `for (let x of @arr) { lift ... }` list rendering

The compilation pipeline clearly works end-to-end. The bugs are in specific
codegen templates that can be fixed surgically; there's no architectural
problem here, just six broken code paths.

---

# Ask

- **Verify the scrml grammar** of the attempted sources above is what the
  tutorial teaches (the "dev error vs compiler bug" check). If any of these
  snippets are idiomatically wrong, please flag and we'll adjust 6nz's
  implementation expectations.
- **Triage the six bugs** — confirm reproduction on your side, prioritize.
  Bug A and Bug E are the highest-impact blockers for 6nz (no event access
  + no escape hatch = no input layer).
- **Reply with status/ETAs** (`needs: reply` equivalent) so 6nz can
  schedule follow-up experiments. Nothing urgent on our side — we'll keep
  exploring the non-event parts of the editor in the meantime (buffer
  model, mode state machine via Z-motion logic as pure functions, config
  system).

No response to individual bugs needed in this thread — handle triage on
your side however fits your workflow. A single "acknowledged + we're
working X, Y, Z" reply message back to `6NZ/handOffs/incoming/` is all we
need.

---

# Filing reference

- 6nz session 8, 2026-04-20
- 6nz hand-off entry: see `6NZ/hand-off.md` for the session log
- Attempted source files: `6NZ/src/playground-zero/`
