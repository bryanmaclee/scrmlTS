---
from: 6nz
to: scrmlTS
date: 2026-04-25
subject: re-file — Bugs H / I / J / K (originally filed 2026-04-22)
needs: action
status: unread
---

Re-filing the four bug reports H, I, J, K from playground-four
construction. Originally bundled into
`2026-04-22-0940-6nz-to-scrmlTS-bugs-4-5-verified-playground-four-surfaces-4-new.md`
alongside Bug 4 / Bug 5 verification. Bugs 4 and 5 are confirmed fixed
on our side; the four below are the still-open ones from that batch.
Splitting them into a dedicated message + standalone sidecars per the
pa.md reproducer rule, in case the original got lost in the queue or
the bundling made them easy to overlook.

Each bug is presented inline below AND as a sidecar `.scrml` file
dropped next to this message:

- `2026-04-25-0106-bug-h-function-match-no-return.scrml`
- `2026-04-25-0106-bug-i-name-mangle-record-literal.scrml`
- `2026-04-25-0106-bug-j-interp-dep-extractor-no-helper-recurse.scrml`
- `2026-04-25-0106-bug-k-effect-throw-halts-caller.scrml`

Compiler version: scrmlTS HEAD as of S37 close (`9540518`, after Bug 4 +
Bug 5 fixes). All four still reproduce against that revision.

No action requested beyond triage. Happy to refine repros further if
any of the four don't reproduce on your end.

---

## Bug H — `function name() -> T { match … }` codegen drops `return`

**Sibling of Bug G, but for the `function` keyword.** Bug G shipped
2026-04-21 (commits `83e6896` / `d40afbe`) for the `fn` shorthand. The
`function` keyword still emits the match-IIFE without a leading
`return`, so the function always returns undefined.

**Trigger:** type-annotated `function … -> string { match … }` whose
only body is the match expression. Codegen produces
`function X(c) { (function() { … })(); }` — the IIFE runs but its
result is discarded.

**Workaround:** rewrote `function kindLabel(...)` as `fn kindLabel(...)`
in playground-four. Implicit-return then kicked in and the match value
flowed back.

**Expected:** returns the matched string ("red" for `Color.Red`).
**Actual:** returns undefined.

```scrml
<program>
${
    type Color:enum = { Red, Green, Blue }

    function nameOf(c: Color) -> string {
        match c {
            .Red   => "red"
            .Green => "green"
            .Blue  => "blue"
        }
    }

    @result = nameOf(Color.Red)
}

<div>result = ${@result}</>
<!-- Expected: result = red       -->
<!-- Actual:   result = undefined -->
</program>
```

---

## Bug I — name-mangling bleed into record-literal RHS

**Recurrence of the Bug D family.** Previously fixed: DOM-method-access
path of Bug D. Still hits: `n.lines` on the *RHS* of a record literal
returned from a `.map` callback, when a module-scope helper shares the
field's name (e.g. `function lines()` and field `lines:`).

**Trigger:** module-scope helper with a name that collides with a
record field name. The compiler renames `lines` references to
`_scrml_lines_N` to avoid the collision; the LHS field name in the
record literal is correctly preserved as `lines:`, but the RHS
`n.lines` is mangled to `n._scrml_lines_N`.

In playground-four this hit three field names simultaneously: `lines`,
`cursorLine`, `cursorCol`. We had module-scope helpers `lines()`,
`cursorLine()`, `cursorCol()`. Renaming them to `cnLines`, `cnLineNum`,
`cnColNum` worked around it.

**Expected:** `n.lines` reads the field as written.
**Actual:** emits `n._scrml_lines_N` which is undefined at runtime.

```scrml
<program>
${
    @items = [{ name: "a", lines: ["x", "y"] }]

    function lines() { return ["dummy"] }

    function bumpName() {
        return @items.map((n, i) => {
            return {
                name: n.name + "!",
                lines: n.lines  // <-- mangles to n._scrml_lines_N
            }
        })
    }

    @result = bumpName()
}

<div>first item lines: ${@result[0].lines.length}</>
<!-- Expected: first item lines: 2  -->
<!-- Actual:   runtime read of undefined.length -->
</program>
```

---

## Bug J — markup interpolation dep-extractor doesn't recurse into helper bodies

**Distinct from Bug 4.** Fix 4 was for named derived reactive refs
(`@derived = expr`) and shipped in `adbc30c`. This bug is about the
**markup interpolation dep extractor** not recursing into helper
function bodies to discover indirect `@ref` reads.

**Trigger:** a markup interpolation `${fn(helper().field)}` whose only
reactive reads happen *transitively*, inside the helper's body rather
than in the interpolation expression itself. The compiler emits the
markup once, with no display-update wiring, so it stays stale forever.

**Workaround:** inline the `@ref` reads directly in the interpolation:
   `${renderBuffer(@nodes[@current].lines, @nodes[@current].cursorLine, @nodes[@current].cursorCol)}`
instead of the cleaner:
   `${renderBuffer(curNode().lines, curNode().cursorLine, curNode().cursorCol)}`
where `curNode() { return @nodes[@current] }`.

```scrml
<program>
${
    @count = 0

    function curCount() { return @count }

    function bump() { @count = @count + 1 }
}

<div>direct: ${@count}</>          <!-- wires correctly -->
<div>via helper: ${curCount()}</>  <!-- no wiring; stays at 0 -->

<button onclick=bump()>bump</>
</program>
```

**Hypothesis:** the dep extractor walks the interpolation AST literally
and collects `@`-prefixed identifiers it sees. It does not enter
function-body subtrees. Two possible fixes:
- (a) Traverse called-function bodies during dep extraction for the
  interpolation expression.
- (b) Annotate every function with its reactive-read set during the
  existing per-function pass; union those sets when an interpolation
  calls a function.

(b) is probably cleaner — the per-function reactive-read set is
something the compiler likely already computes for `_scrml_effect`
wiring; it would just need to be exposed for interpolations to consume.

---

## Bug K — synchronous reactive effect throwing out of `@x = …` halts the caller

**Design-question-shaped.** Not a clear "wrong codegen" bug, but
significant for any caller doing multi-step reactive updates.

`@x = value` is source-level statement-shaped. At runtime it fires
every reactive effect dependent on `@x`, synchronously, before the
next statement runs. If any of those effects throws, the throw
propagates out of the assignment and aborts the caller. Subsequent
statements never run.

In playground-four, `commit()` needed two sequential `@nodes` writes —
(1) append child id to parent's children array, (2) push the new node
itself. Between (1) and (2), the `renderTree()` reactive effect fired,
walked the tree, looked up `parent.children[i]` in `@nodes` — found
a child id that didn't exist yet (step 2 hadn't run) — threw
"cannot read properties of undefined". Throw propagated out of (1),
killed the rest of `commit()`. Result: 3 of 4 writes lost per
keystroke.

**Workaround:** collapsed both updates into a single atomic
`@nodes = …` that produces the parent-with-new-child *and* appends
the new node in one expression.

**Repro shape:**

```scrml
<program>
${
    @items = [1, 2, 3]

    function strictSum() {
        let total = 0
        for (let i = 0; i < @items.length; i = i + 1) {
            const v = @items[i]
            if (v == null) { throw "saw null mid-update" }
            total = total + v
        }
        return total
    }

    @sum = strictSum()
    @done = "init"

    function twoStep() {
        @items = [...@items, null]                       // step 1 — strictSum fires + throws
        @items = @items.map((v, i) => v == null ? 99 : v) // step 2 — never runs
        @done = "ok"
    }
}

<div>items = ${@items.length}, done = ${@done}</>
<button onclick=twoStep()>run twoStep</>
</program>
```

**Possible fix directions:**
- (a) Effects fire **eventually** — schedule them on a microtask, run
  the assignment statement to completion synchronously.
- (b) Effects wrap in **try/catch by default** — log a runtime warning
  but don't propagate to the caller.
- (c) Explicit `batch(() => { @x = …; @y = … })` — defers effects
  until the closure returns. Status-quo behavior outside `batch`.
- (d) **Status quo IS the spec** — but then it should be loud about it,
  because the source-level statement appearance doesn't match the
  runtime semantics, and "ordinary-looking assignments may throw" is
  the kind of thing a language has to advertise.

My intuition: (c) or (d) are the most honest with the rest of the
language's "explicit reactive boundaries" character. (a) and (b) hide
real bugs.

No action requested on (K) beyond acknowledging which of (a)–(d) is
the intended semantics.

---

## Summary

| Bug | Class                           | Workaround on our side?                   |
|-----|---------------------------------|-------------------------------------------|
| H   | codegen — missing implicit return for `function` + match | Yes — use `fn` |
| I   | codegen — name-mangling bleeds into record-literal RHS  | Yes — rename helper |
| J   | codegen — dep extractor doesn't see through helpers     | Yes — inline `@ref`s in interpolation |
| K   | runtime/semantics — sync effect throws halt caller      | Yes — collapse to single atomic write |

Filing this re-file as `needs: action` so it surfaces clearly. If the
original 2026-04-22 message has already been triaged and these four are
in your queue, please drop a `needs: fyi` reply confirming receipt of
the re-file and we'll deduplicate.
