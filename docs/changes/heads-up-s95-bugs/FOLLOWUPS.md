# Heads-up coding session — S95 bug surface (2026-05-15)

**Filed:** 2026-05-15 (S95)
**Surfaced via:** authoring a triage-board SPA at `/tmp/triage-board.scrml`
**Repro file:** `/tmp/triage-board.scrml` (in-flight; will copy here when stable)
**HEAD at file:** `ec12412`
**PA spec read:** kickstarter v2 + primer §1-§10 + anti-patterns brief + SPEC §5 + §18 + §51.0

The S95 heads-up coding session is exploratory scrml authorship probing the canonical
shape. This file catalogs the compiler / parser / lint gaps the session surfaced. Each
entry has shape + spec authority + expected vs actual + minimal repro hint. Workarounds
are noted where the author found one; bugs without workarounds are flagged as blocking.

The bugs are listed in rough priority order — codegen wrongness first (incorrect output
that compiles cleanly), then parser gaps that block valid syntax, then lint false
positives. State-vs-logic axiom (S94) is NOT load-bearing here — what surfaced is v0.3
wiring incompleteness, not axiom violations.

---

## Bug 1 — Value-return `match` codegen produces malformed JS

**Spec authority:** §18.0 + §18.1+. JS-style `match expr { pattern => expr }` is the
canonical value-return form. Per §18.0, the block-form (`<match for=Type>...</>`) is for
markup-emit context and the JS-style form is for value-return context.

**Shape:**
```scrml
function isDraggingThis(id) {
  return match @dragPhase {
    .Dragging(d) => d == id
    _ => false
  }
}
```

**Expected:** valid JS that returns the payload-bound comparison or `false`.

**Actual (from `/tmp/dist/triage-board.client.js`):**
```js
function _scrml_isDraggingThis_7(id) {
  return (function() { const _scrml_match_8 = _scrml_reactive_get("dragPhase");
  else return d === id _ => false; })();
}
```

The arm separator `=>` and wildcard `_` leak through verbatim. `d` is referenced without
ever being bound. There's a dangling `else` with no preceding `if`. The output is not
parseable JavaScript.

**Workaround used in S95:** rewrite as `if/else` over discriminator string:
```scrml
function isDraggingThis(id) {
  if (@dragPhase == .Dragging && @draggingTaskId == id) return true
  return false
}
```
This requires splitting the payload variant into two cells (see Bug 2 workaround).

**Severity:** blocking for value-return match with payload bindings.

---

## Bug 2 — Variant-with-payload constructor at engine direct-write emits string-as-fn

**Spec authority:** §51.0.F (direct write semantics) + §14 (enum variant constructors).

**Shape:**
```scrml
type DragPhase:enum = {
  Idle
  Dragging(id: number)
}
function startDrag(id) {
  @dragPhase = .Dragging(id)
}
```

**Expected:** the engine direct-write hook receives a constructed variant value, e.g.
`DragPhase.Dragging(id)` which returns `{ variant: "Dragging", data: { id } }`.

**Actual:**
```js
_scrml_engine_direct_set("dragPhase", "Dragging"(id), __scrml_engine_dragPhase_transitions);
```

`"Dragging"(id)` calls the STRING `"Dragging"` as a function. Runtime TypeError.

The same file's enum table (lines 5-10) DOES generate the constructor correctly:
```js
const DragPhase = Object.freeze({ Idle: "Idle", Dragging: function(id) { ... }, ... });
```
But the engine direct-write call site doesn't invoke through `DragPhase.Dragging` — it
emits a string-call instead. Codegen at the engine-write site is mixing the variant-name
string (for the transition-table lookup) with the constructor invocation.

**Workaround used in S95:** split payload-bearing engine variant into two cells —
one no-payload enum + one separate state cell for the id:
```scrml
type DragPhase:enum = { Idle, Dragging }
<draggingTaskId> = 0   // 0 = none
```
Sacrifices the engine's variant-payload guarantee but unblocks compilation.

**Severity:** blocking for payload-bearing engine variants written via direct-write.

---

## Bug 3 — `class:name=fn(arg.with.dot)` rejected as bare identifier

**Spec authority:** §5.5.2 grammar:
```
class-expr ::= '@' identifier
             | identifier '.' identifier
             | '(' expression ')'
             | identifier '(' args ')'
```

The grammar explicitly admits `identifier '(' args ')'` — function calls with arbitrary
expression args.

**Shape:**
```scrml
class:dragging=isDraggingThis(task.id)
```

**Expected:** parser admits this as `identifier '(' args ')'` per grammar; codegen
subscribes to the function call's reactive dependencies.

**Actual:** `E-COMPONENT-021 / E-ATTR-013` cascade — error message says:
> "`isDraggingThis` is a bare identifier — did you mean `@isDraggingThis`?"

The parser is reading `isDraggingThis` as a bare identifier and not consuming the
`(task.id)` call extension. The dotted argument may be the culprit — `class:dragging=fn()`
parses fine but `class:dragging=fn(a.b)` doesn't.

**Workaround:** parens-wrap to fall into the `'(' expression ')'` arm:
```scrml
class:dragging=(isDraggingThis(task.id))
```
This worked in S95.

**Severity:** medium — workaround is clean; parser should accept the direct form per grammar.

---

## Bug 4 — Bare-call event handler passes `event` instead of forwarding args

**Spec authority:** §5.2.1 explicitly: *"The compiler wraps the call in a closure:
`function(event) { fn(...args); }`. Arguments in the parentheses are forwarded to
`fn` as-is."*

**Shape:**
```scrml
<ul ondrop=dropOn(name)>
```
where `name` is a component prop.

**Expected codegen:**
```js
ul.addEventListener("drop", function(event) { dropOn(name); });
```

**Actual:**
```js
_scrml_lift_el_16.addEventListener("drop", function(event) { _scrml_dropOn_10(event); });
```

The closure's body calls `dropOn(event)` — passing the DOM event — instead of the
declared `dropOn(name)` argument. The prop `name` is not closed over.

**Workaround:** use expression-form per §5.2.1 *"closure capture in loops"* clause:
```scrml
<ul ondrop=${() => dropOn(name)}>
```
The `${...}` arrow form correctly captures `name`.

**Severity:** medium — workaround works; bare-form arg passing is broken in component
body / iteration scope. May only affect cases where the arg is a captured-from-outer
variable (vs an inline literal).

---

## Bug 5 — Component `<TaskCard/>` survives to phantom DOM element

**Spec authority:** §15 / §51 / E-COMPONENT-035 in §34 — *"every markup node resolved to
user-component MUST be expanded into HTML markup or rejected with E-COMPONENT-020 at CE
time. The residual reference would otherwise be silently emitted as
`document.createElement("TaskCard")`."*

**Shape:** define `const TaskCard = <li ...props={ task: Task }>...</>` inside `<program>`
body; reference via `<TaskCard task=task/>` from inside `Column`'s body iteration.

**Actual:** compilation succeeds (no E-COMPONENT-020), but emitted JS contains:
```js
const _scrml_lift_el_17 = document.createElement("TaskCard");
_scrml_lift_el_17.setAttribute("task", task);
```

The phantom DOM element ships. The E-COMPONENT-035 post-CE invariant fired in an EARLIER
compile (when TaskCard had a separate parse error); in this compile it didn't fire and
the residual reference was silently emitted.

**Investigation needed:** why CE expanded `Column` (visible in output: `createElement("section")`)
but not `TaskCard`. Both are defined inline in the same `<program>` body in S95's file;
both are referenced from markup; both should be CE-expandable equally.

Possible cause: TaskCard's component definition body contained `<li>` as root AND a `<li>`
nested inside (earlier attempt) — that produced E-COMPONENT-021. The current S95 file
removed the inner `<li>` but TaskCard still doesn't expand. Suggests CE has a recovery
path that lets malformed-but-not-quite-erroring component defs slip through silently.

**Severity:** high — silent phantom-DOM emission is exactly what E-COMPONENT-035 is
supposed to prevent. The invariant has a hole.

---

## Bug 6 — `#{ ... }` CSS block inside `<program>` body — **CLOSED S96 as misclassification**

**Original framing (preserved for forensic reference):** The CSS file `triage-board.css` was reported as a 0-byte emit, with the conclusion that the BS layer was dropping the `#{` token after markup in `<program>` body.

**S96 verification (commit pending):** the file is **NOT** 0 bytes. Triage-board's `25-triage-board.css` emits **867 bytes** containing all 9 CSS rules from the source `#{...}` block (`body` + 8 utility classes). CSS extraction works correctly through the BS / ast-builder.js (`kind: "css-inline"` produced at line 10151) / collect.ts / emit-css.ts pipeline.

**Root cause of the misclassification:** the original `wc -l` (line count) returned `0` because the emitted CSS is minified-style — all rules on a single line with no trailing newline. `wc -c` (byte count) reveals 867 bytes. The "0-byte file" claim was a measurement-method artifact, not a real bug.

**Cosmetic follow-on (out of scope here):** the emitted CSS has no trailing newline. Possibly worth aligning with the conventional shape (one rule per line) for adopter readability, but the FUNCTIONALITY is correct.

**Severity:** none. No code change required. Catalog updated S96.

---

## Bug 7 — W-DEAD-FUNCTION false-positives on functions called from component-body markup

**Acknowledged by the lint itself:** *"RI does not yet track all markup reference
patterns; if this is a false positive, export the function or add an explicit caller."*

**Shape:** functions called from event handlers inside component bodies (e.g.,
`ondragstart=startDrag(task.id)` inside `const TaskCard = <li ...>...</>`).

**Severity:** low — lint, not error. But noisy and undermines the lint's signal value.
Fix: extend RI's markup-reference tracer to descend into component body ASTs.

---

## Bug 8 — W-LINT-007 false-positives on `type X:struct = {…}`, `type X:enum = {…}`, and canonical `props={…}`

**Spec authority:** kickstarter v2 §3 (compound state literal shape) + §12 (component
definitions). `props={...}` is the canonical component-prop declaration shape — see
`examples/12-snippets-slots.scrml:18` + `examples/23-trucking-dispatch/components/*`.

**Lint regex:** matching `={` indiscriminately. The lint's intent (catch `<Comp prop={val}>`
Vue/JSX shorthand) does NOT extend to:
- Type literal RHS: `type X:struct = { ... }`
- Enum variant body: `type X:enum = { ... }`
- Component prop declarations: `props={ name: string }`

**Severity:** low — informational lint, but every type / enum / component decl trips it.
Fix: tighten the lint regex to exclude these positions.

---

## Bug 9 — W-LINT-013 false-positives on function-body `@cell = .Variant(…)`

**Lint message:** *"Found '@click=...' (Vue event shorthand)"*

**Shape:** function bodies containing engine direct-writes like `@dragPhase = .Dragging(id)`
or general state writes `@count = increment(id)`.

**Pattern likely matched:** `@<word>(<args>)` — but the lint should only fire on
attribute-position usage (e.g., `@click="handler"` in HTML attribute namespace), not on
expression-position state writes.

**Severity:** low — informational lint. Fix: gate the regex to attribute positions only.

---

## Bug 10 — `class:` directive tokenizer rejects Tailwind-style class names with digits

**Spec authority:** §5.5.2 grammar:
```
class-name ::= [a-zA-Z][a-zA-Z0-9_-]*
```
So `opacity-40` (letter, then alphanumeric + hyphens) IS in-grammar.

**Shape:**
```scrml
class:opacity-40=(isDraggingTask(task.id, @dragPhase, @draggingTaskId))
```

**Actual codegen:** the attribute tokenizes as 5 separate setAttribute calls:
```js
el.setAttribute("class", "");
el.setAttribute(":", "");
el.setAttribute("opacity", "");
el.setAttribute("-", "");
el.setAttribute("40", "( ... )");
```

The class-directive `class:opacity-40` got split into bare tokens at `:` and `-` boundaries, AND the trailing `40` is being read as a separate attribute name. The expression value got attached to the `40` attribute.

**Severity:** medium. **Workaround:** use single-word class names without digits (`class:dragging=…`). Common Tailwind utility class names (`opacity-40`, `text-2xl`, `bg-gray-100`, etc.) are blocked from the `class:` directive form.

---

## Bug 11 — `${(e) => fn(e)}` expression-form event handler arrow not invoked

**Spec authority:** §5.2.1: *"`onclick=${(e) => handler(e, arg)}` — Full closure with access to the event object. … the `${}` expression is used directly as the event handler."*

**Shape:**
```scrml
<ul ondragover=${(e) => e.preventDefault()}>
```

**Expected codegen:** the `${...}` expression IS the event handler:
```js
ul.addEventListener("dragover", (e) => e.preventDefault());
```

**Actual:**
```js
ul.addEventListener("dragover", function(event) { (e) => e.preventDefault(); });
```

The arrow function is emitted as an expression-statement inside a wrapper that ignores it. The arrow body never runs.

**Severity:** high — the spec-endorsed escape hatch for "I need the event object" doesn't work. Combined with Bug 4 (bare-call drops args), this leaves NO working path for event handlers that need both the event AND a captured loop variable.

---

## Bug 12 — `${...}` event handler inside `${ for ... lift ... }` iteration breaks BS-layer balancing

**Shape:**
```scrml
${ for (let task of @tasks...) {
    lift <li
        class="..."
        ondragstart=${() => startDrag(task.id)}
        ondragend=${() => endDrag()}
    >${task.title}</>
} }
```

**Actual codegen:**
```js
el.addEventListener("dragstart", function(event) { ${() =; });
el.appendChild(document.createTextNode(`_scrml_startDrag_5(task.id)}
  ondragend = ${() => _scrml_endDrag_6()}
  > ${task.title} < / >`));
```

The BS-layer mis-balanced the nested `${...}` inside the attribute value when the surrounding context was another `${...}` (the iteration). Mid-attribute parse failed (`${() =;`), and the rest of the markup spilled into a template-string text node.

**Severity:** high — closure-capture in iteration via expression-form is the §5.2.1 spec-endorsed pattern, and it doesn't survive the iteration wrapper.

**Combined impact of Bugs 4 + 11 + 12:** there is currently no working way to wire an event handler that needs (a) a loop-captured variable AND (b) the event object. The only working shape is bare-call with literal-only args (Mario's pattern).

---

## Bug 13 — `class:name=(expr)` emits literal HTML attribute instead of reactive class wiring — **CLOSED S95 commit `a6e17e6`**

**Closure:** Bug was specific to the `${ for ... lift ... }` template codepath in `compiler/src/codegen/emit-lift.js`. The top-level non-lift codepath in `emit-bindings.ts` already had all four §5.5.2 grammar arms wired correctly. Fix added `class:NAME` branches in both `emitSetAttrs` (string-attrs path) and `emitCreateElementFromMarkup` (AST-attrs path), each emitting `_scrml_effect(() => el.classList.toggle("NAME", !!(expr)))`. 7 regression tests added. Reactive class toggle now works in iteration bodies.

**Brief-quality note:** PA's original minimal repro was non-discriminating — it didn't include the lift+for-loop context required to reproduce the bug. The bug exists; the reproducer needed iteration. Surfaced as future bug-write discipline.

---

## Bug 13 — original entry (preserved for forensic reference)

**Spec authority:** §5.5.2 explicitly:
> *"A `class:` attribute is NOT emitted as a literal HTML attribute. The compiler substitutes a `data-scrml-class-name` marker attribute that client-side wiring uses as a querySelector anchor. The `class:` form does NOT appear in the HTML output."*

The grammar also explicitly admits the parens form:
```
class-expr ::= '@' identifier
             | identifier '.' identifier
             | '(' expression ')'              ← parenthesized arbitrary boolean expression
             | identifier '(' args ')'
```

**Shape:**
```scrml
class:dragging=(isDraggingTask(task.id, @dragPhase, @draggingTaskId))
```

**Expected:** subscribe to each `@var` in the expression; emit `data-scrml-class-name` marker; client-side wiring calls `classList.toggle("dragging", !!result)` on every dep change.

**Actual codegen:**
```js
el.setAttribute("class:dragging", String(_scrml_isDraggingTask_9(task.id, ...) ?? ""));
```

Treated as a literal attribute with name `class:dragging` — meaningless to the browser. No reactive wiring. The class never toggles.

**Severity:** high — eliminates the most natural per-iteration reactive class pattern. Combined with Bug 10 (hyphenated Tailwind class names) and Bug 3 (dotted args), the `class:` directive surface is currently very narrow in practice.

---

## Bug 14 — bare-call `fn()` with zero args passes `event` as a stray argument

**Spec authority:** §5.2.2 table row 1:
> *"`onclick=fn()` Auto-wrapped as `function(event){ fn(); }`. `fn` called on click, not at render."*

**Shape:**
```scrml
<li ondragend=endDrag()>
```

**Expected wrapper body:** `function(event) { endDrag(); }`

**Actual:**
```js
el.addEventListener("dragend", function(event) { _scrml_endDrag_5(event); });
```

The event object IS passed despite the source-level zero-args `fn()`. Harmless in practice if the handler ignores extras (JS arity is lax), but technically incorrect per spec — and would surprise an adopter who relies on `arguments.length` or has a typed-arg handler.

**Severity:** low — symptom is hidden by JS's permissive arity. Fix: tighten the auto-wrap to honor source-level arg count exactly.

---

## Bug 15 — `fn`-body parser false-fires E-FN-001 on ternary with object-literal true-arm

**Spec authority:** §48 (`fn` keyword — pure function form). E-FN-001 is meant to fire when a `fn` body contains a `?{}` SQL access (purity violation). Ternary expressions are not SQL.

**Shape:**
```scrml
fn taskMovedTo(tasks: Task[], id: number, toColumn: string) -> Task[] {
    tasks.map(t => t.id == id
        ? { ...t, column: toColumn, order: nextOrderIn(tasks, toColumn) }
        : t
    )
}
```

**Actual:**
```
error [E-FN-001]: `fn taskMovedTo` body contains a `?{}` SQL access.
`fn` is a pure function and may not perform database operations.
Move the `?{}` query outside `fn` and pass the result as a parameter.
```

The parser is reading `?` followed by ` {` (a ternary true-arm with an object literal) as the `?{}` SQL block opener. The exact same pattern compiles fine inside a `function` body — confirms the false-positive is specifically in the `fn`-body scanner.

**Severity:** medium. Effect: writers can't use ternary-with-object-literal patterns inside `fn` — they have to either extract a sub-function OR use if-statement form. Either workaround is structurally fine but the parser shouldn't force the rewrite.

**Workaround:** extract a helper fn whose body uses `if`/`return` instead of ternary:
```scrml
fn updateIfMatched(t: Task, id: number, column: string, order: number) -> Task {
    if (t.id == id) return { ...t, column: column, order: order }
    return t
}
```

This is the v0.4-axiom-friendlier shape anyway (small composable pure fns over inline conditional expressions), but the spec admits ternary; the parser should match.

---

## Bug 16 — `import` outside `${}` in v0.3 logic-default body silently corrupts subsequent type resolution

**Spec authority:** §21 Module and Import System + §40.8 `<program>` logic-default mode + W-PROGRAM-REDUNDANT-LOGIC lint message.

The v0.3 `W-PROGRAM-REDUNDANT-LOGIC` lint states verbatim:
> *"Under v0.3, `<program>` body parses in default-logic mode — bare top-level declarations auto-lift to the logic context without explicit `${...}` wrapping."*

Per §21, `import` statements are top-level declarations. By the lint's stated rule they should auto-lift.

**Shape:**
```scrml
<program title="Triage Board">

    import { sortBy } from 'scrml:data'

    type Task:struct = { ... }
    type DragPhase:enum = { Idle, Dragging }

    <engine for=DragPhase initial=.Idle>
        ...
    </>
    ...
</program>
```

**Expected:** import auto-lifts per the v0.3 logic-default rule; `sortBy` is in scope; subsequent type and state declarations resolve normally.

**Actual:** the import statement parses but seemingly disrupts the surrounding parse context. ALL subsequent type declarations become invisible. Compilation fails with a cascade:

```
E-ENGINE-004: Machine 'dragPhase' references unknown type 'DragPhase'
E-TYPE-025:   Cannot match on `asIs`-typed subject
E-VARIANT-AMBIGUOUS: Bare variant `.Dragging` has no type context
E-VARIANT-AMBIGUOUS: Bare variant `.Idle` has no type context
E-VARIANT-AMBIGUOUS: Bare variant `.Idle` has no type context
... (continues)
```

**None of the 8 cascading errors mentions imports or `${ }` placement.** The root cause is invisible from the diagnostic output. An adopter hitting this has no path from the errors to the fix — they'd be left believing their type declarations are somehow broken, or that the engine declaration was wrong.

**Two bugs in one:**

1. **The cascade itself is a bug.** Even if imports SHOULD require explicit `${ }` (i.e., the auto-lift carve-out is intentional), the diagnostic should fire AT the import statement with a clear message: *"`import` cannot appear in v0.3 logic-default body — wrap in `${ }` block."* The current behavior — silent parse-context corruption followed by 8 downstream errors — is a diagnostics failure regardless of the underlying language rule.

2. **The auto-lift carve-out probably shouldn't exist.** The v0.3 lint message stated rule is "top-level declarations auto-lift." Imports are top-level declarations per §21. If the parser is intentionally treating imports differently, either:
   - The lint message is wrong (overpromising the auto-lift scope), OR
   - The parser is wrong (under-implementing the lint's stated scope)

Either way, an adopter reading the lint expects imports to auto-lift and currently gets silent failure. The principled fix is to make imports auto-lift identically to other declarations.

**Workaround:** wrap every import in `${ }`:
```scrml
${ import { sortBy } from 'scrml:data' }
```

This matches the canonical idiom at `examples/23-trucking-dispatch/pages/dispatch/customers.scrml:15-21` and other corpus files.

**Severity:** high. The adopter friction is severe — the 8-error cascade is one of the worst diagnostics-failure shapes possible (the actual cause is not in any of the 8 messages). Adopter would likely surrender or guess-and-check for a long time before finding the workaround.

**Reclassification note:** initially filed during S95 as a "doc gap." That framing was wrong — the diagnostic-quality issue is unambiguously a bug regardless of the auto-lift question. Reclassified as Bug 16.

---

## Bug 17 — Tailwind utility scanner doesn't descend into `${ for ... lift ... }` iteration bodies

**Spec authority:** §26 Tailwind Utility Classes. The Tailwind scanner is supposed to find class names in markup and emit their utility CSS rules. §26.1: *"the compiler scans the source for class names and emits a CSS rule for each Tailwind utility class it finds."*

**Shape:**
```scrml
<div class="flex gap-4 p-4 font-sans bg-gray-50 min-h-screen">
    ${ for (let col of columns) {
        lift <section class="flex-1 bg-white rounded-lg p-3 shadow-sm">
            <header class="font-semibold mb-2 text-gray-700">${col}</>
            <ul class="list-none p-0 m-0 min-h-32">
                ${ for (let task of @tasks.filter(...)) {
                    lift <li class="bg-gray-100 rounded p-2 mb-2 cursor-grab">${task.title}</>
                } }
            </>
        </>
    } }
</>
```

**Expected:** the scanner finds ALL Tailwind utility class names in ALL markup positions — including those inside `${ for ... lift ... }` iteration bodies — and emits CSS rules for every one.

**Actual:** the emitted `.css` file contains only the 5 utilities used on the OUTER `<div>` (`flex`, `gap-4`, `p-4`, `bg-gray-50`, `min-h-screen`). The 14+ utility classes used inside the `lift <section ...>` body and below are NOT in the output. Inner classes render as inert (browser sees `class="flex-1 bg-white rounded-lg p-3 shadow-sm"` with NO CSS rules for any of those names — the styling is silently missing).

Mario emits 54 lines of CSS for the same Tailwind utility shape because Mario uses inline markup — no `${ for ... lift ... }` iteration. That confirms the gap is specifically the scanner's traversal of lifted iteration bodies, not the scanner itself.

**Severity:** high. Any non-trivial UI (which means almost any real app) iterates over data. Adopters using Tailwind utilities inside iteration get silently-broken styling. The diagnostic surface is zero — no warning, no error, just inert classes at runtime.

**Workarounds:**

1. **Hoist representative class usage outside iteration.** Add a hidden / off-screen `<div class="...">` listing every iteration-internal class. The scanner visits it; the utility rules emit. Ugly hack.
2. **Use `#{}` block with explicit CSS.** Bypass Tailwind utilities entirely for iteration-internal styling; write the rules directly. Works but defeats the point of Tailwind integration.
3. **Use static classes on a CSS-rule basis.** Define `.task` / `.column` / `.task-list` in a `#{}` block; reference those on the iteration-internal elements. Trades utility-class density for stable class names.

Workaround 3 is closest to the canonical scrml shape (matches `examples/06-kanban-board.scrml` which uses `#{}` with custom class names).

---

## Bug 18 — `scrml:NAME` capability imports emit as unresolved ES module imports, breaking at runtime

**Spec authority:** §41 Import System — `use scrml:NAME` and value `import { x } from 'scrml:NAME'` are capability/value imports from the scrml stdlib. The compiler is supposed to resolve these at build time.

**Shape:**
```scrml
<program title="Triage Board">

    ${ import { sortBy } from 'scrml:data' }

    // ... use sortBy(...) somewhere
</program>
```

**Compiles cleanly** (0 errors).

**Emitted `.client.js` top:**
```js
// Requires: scrml-runtime.0189idcs.js


import { sortBy } from "scrml:data";

// --- enum toEnum() lookup tables (compiler-generated) ---
...
```

**Emitted `.html` script tags:**
```html
<script src="scrml-runtime.0189idcs.js"></script>
<script src="25-triage-board.client.js"></script>
```

**Browser console at runtime:**
```
Uncaught SyntaxError: import declarations may only appear at top level of a module
25-triage-board.client.js:4:1
```

**Two compounded failures:**

1. The bare specifier `"scrml:data"` is not resolvable by browsers. The compiler should either (a) inline the stdlib function into the output, or (b) rewrite the import to a real URL pointing at a built stdlib bundle, or (c) bundle the stdlib into `scrml-runtime.*.js` and rewrite the import to a JS expression that pulls from there.
2. Even if the specifier WERE resolvable, the `<script>` tag lacks `type="module"`, so the browser refuses to parse the ES import syntax at all. Either the codegen should not emit ES module imports OR the HTML should emit `<script type="module">`.

**Severity:** high — blocks any scrml app from using stdlib value-imports in client code. Compilation passes; runtime fails immediately on script load. White screen with console error.

**Workaround:** don't use stdlib value-imports in client-shipped code. Either inline a local copy of the needed function OR use vanilla JS equivalents (`tasks.sort((a,b) => a.k - b.k)` instead of `sortBy(tasks, "k")`).

**Adopter-impact note:** the stdlib catalog (kickstarter §9) actively encourages reaching for `scrml:data` / `scrml:format` / `scrml:time` / `scrml:regex` etc. — but any of these used client-side will produce the white-screen failure. This shape is currently incompatible with client-side scrml usage despite the documentation suggesting otherwise.

**Investigation needed:** which scrml: stdlib modules CAN be used client-side (if any)? Is there a server-side-only restriction documented but unenforced? Or is this a build-pipeline gap that affects all `scrml:*` imports uniformly?

---

## Doc-corpus gap — stdlib transforms read as Array methods

**NOT a compiler bug — a documentation gap surfaced at runtime in S95 heads-up coding.**

The kickstarter v2 §9 stdlib catalog lists `scrml:data` exports including `sortBy`, `pick`, `omit`, `groupBy`, `indexBy`, `unique`, `flatten`, `chunk` as "transforms" — without disambiguating that these are FUNCTIONS that take a list as first argument, NOT methods on Array. A writer accustomed to lodash-as-prototype or to Array.prototype style will reflexively write `tasks.sortBy(t => t.order)` and get a runtime TypeError. (S95 triage board did exactly this.)

Compounding: `max`, `min`, `sum` are NOT in `scrml:data` at all — they're plain JS Math globals (`Math.max(...arr)` per App.D JS stdlib access). A writer might reach for `arr.max()` expecting either a JS Array method (doesn't exist) or a stdlib helper (doesn't exist). Two different not-existing-shapes for one mental model.

**Recommended kickstarter / primer edit:** the `scrml:data` row in the stdlib catalog should add a one-line note distinguishing function-form vs method-form, with a worked example showing the correct shape:

```scrml
// ✅ Correct — sortBy is a function:
import { sortBy } from 'scrml:data'
const sorted = sortBy(tasks, t => t.order)

// ❌ Wrong — sortBy is NOT a method on Array:
const sorted = tasks.sortBy(t => t.order)   // runtime TypeError

// ✅ For numeric Array operations, use JS Math via App.D:
const maxOrder = Math.max(...orders)

// ❌ Wrong — .max() is not a JS Array method:
const maxOrder = orders.max()
```

**Anti-pattern table candidate:** add a row to the kickstarter §7 anti-pattern table:

| You're about to write… | …because of (framework) | Use this in scrml |
|---|---|---|
| `tasks.sortBy(fn)`, `users.pick(...)`, `items.groupBy(...)` | Lodash-as-prototype habit; underscore.js | `import { sortBy } from 'scrml:data'` then `sortBy(tasks, fn)` — these are stdlib functions, not Array methods |

**Severity:** documentation / corpus skew. Friction grows with adopter base — every adopter coming from lodash/underscore/JS reflexes will hit this. Cheap to fix at the kickstarter level.

---

## Workaround stack for the S95 triage board

Given Bug 1 + Bug 2 + Bug 4 + Bug 6, a minimal working triage board needs:

1. Drop payload variants from DragPhase enum; store id in a separate cell
2. Use `if`/`else` instead of `match expr {}` value-return form
3. Use `${() => fn(arg)}` expression-form event handlers when args are captured
4. Parens-wrap `class:` directive function calls with dotted args
5. Accept missing CSS for now (or place inline `style=` attributes if Bug 6 doesn't resolve quickly)

The architectural shape (engine + component) survives — only the surface needs adjustment.
The state-vs-logic axiom holds: nouns stay in `<cell>`s, verbs are pure `function`s.

---

## Cross-references

- **Spec sections cited:** §5 (attributes), §15 (components), §17 (Tier ladder),
  §18 (match), §51.0 (engines), §9 (CSS), §34 (error codes)
- **Kickstarter:** `docs/articles/llm-kickstarter-v2-2026-05-04.md`
- **Primer:** `docs/PA-SCRML-PRIMER.md` (S92 / v0.3.0 STABLE snapshot)
- **Anti-patterns brief:** `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md`
- **Repro file:** `/tmp/triage-board.scrml` (in-flight at S95)

## Tags

#s95-heads-up #compiler-bugs #codegen-malformed #parser-incomplete #lint-false-positive
#match-value-return #variant-constructor #class-directive #event-handler-args
#component-expansion #css-empty #w-dead-function #w-lint-007 #w-lint-013
