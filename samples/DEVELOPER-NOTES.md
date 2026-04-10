# Developer Notes — scrml Sample App

Written while building login.scrml, dashboard.scrml, and card.scrml.
Each question below is something I hit while actually writing the code,
not a theoretical concern. Grouped by feature area. Each entry includes
my suggested resolution as a developer preference.

---

## 1. Reactivity

**Q: Where can @variable be declared?**
The spec confirms `@variable = value` for reactive bindings but doesn't place
it explicitly. I wrote `@counter = 0` at the top level of a file and
`@errorMessage = ""` at the top level of a state block. I don't know if this
is valid outside a `${}` logic context.

Suggested resolution: `@variable` should be valid anywhere a value assignment
is valid — top of file, top of a state block, inside a function. Scoping
follows the nearest enclosing block. If it must live inside `${}`, that's a
significant restriction that should be stated explicitly.

---

**Q: Must reactive variables be declared before use?**
Inside `loadItems()` I assigned `@loading = true` to a variable I hadn't
declared at the block's top. Does that implicitly create a reactive variable,
or is it a compile error?

Suggested resolution: Declaration required at scope top. Assigning to an
undeclared `@variable` inside a function should be a compile error with a
clear message pointing to where to declare it. The alternative (implicit
`@`-variable creation on first assignment) is too footgun-prone.

---

**Q: Client-only state vs. state block**
The spec says "trivial in-memory counter is NOT state unless count is output
to user." My counter IS output to the user. Does a client-only rendered
counter need to be inside a `< state>` wrapper, or is a top-level
`@counter = 0` sufficient for the compiler to generate the right reactive
wiring?

Suggested resolution: Top-level `@variable` is sufficient for client-only
reactive state. The `< state>` (or `< db>`) wrapper is for state that involves
server resources. Conflating the two would force every counter into a state
block, which is too heavy.

---

## 2. Conditional Rendering

**Q: No markup-level conditional**
There's no `if=` attribute or conditional element in the spec. Every conditional
I needed — showing an error banner, rendering a subtitle only when non-empty,
showing a loading spinner — required a `${}` logic block with a lift inside an
if statement. That's three lines for what should be one.

```scrml
// What I had to write:
${ if (@errorMessage) { lift <div class="error-banner">${@errorMessage}/ } }

// What I wanted to write:
<div class="error-banner" if=@errorMessage>${@errorMessage}/
```

Suggested resolution: Add `if=expr` as a markup-level attribute. When false,
the element is not rendered (not just hidden). This is the most common
conditional pattern in any UI framework and the `${}` + `lift` workaround
is ergonomically painful.

---

## 3. Forms and Events

**Q: Form submission and event object**
The spec documents `onclick=fn()` button wiring but doesn't address `<form>`,
`onsubmit=`, or FormData collection. I assumed `onsubmit=handleLogin()` wires
the same way as `onclick=`, but I don't know if the native event is forwarded
as an argument, or if form fields are automatically serialized into a typed
object the function receives.

Suggested resolution: `onsubmit=fn()` wires to the form's submit event.
The event object is forwarded as the first argument automatically (consistent
with how onclick presumably forwards click events). The developer reads field
values via standard FormData or direct DOM access — the compiler doesn't do
magic serialization unless the form is explicitly wired to a state field.

---

**Q: Boolean HTML attributes (disabled=)**
`disabled=submitting` — when `submitting` is `true`, the attribute should be
present; when `false`, absent. The spec says `attr=name` is a variable
reference, but doesn't specify how boolean attributes work. `disabled="true"`
is wrong HTML. `disabled=submitting` needs the compiler to emit
`element.disabled = submitting` rather than `element.setAttribute("disabled", submitting)`.

Suggested resolution: The compiler checks whether the HTML attribute is a
known boolean attribute (disabled, checked, readonly, etc.) and emits the
correct boolean property assignment rather than setAttribute.

---

## 4. Async / Server Calls

**Q: No async/await model**
Server functions generate fetch() calls internally. The developer writes
synchronous-looking code. But fetch is async — `let result = authenticate(u, p)`
can't work synchronously unless the compiler wraps the entire calling function
in an async context automatically.

Suggested resolution: The compiler should wrap any function containing a server
call in an async IIFE or mark it async automatically. The developer never writes
`await` — the compiler inserts it at every point where a server-generated call
is made. This is consistent with the "compiler handles all wiring" philosophy.
If the developer needs fine-grained async control, that's a power-user case and
can be addressed later.

---

## 5. Server Functions and protect=

**Q: Does protect= exclude fields from server-side functions too?**
`protect="password"` on a `< db>` state block is documented as excluding the
field from the inferred type, which forces a server route. But my `authenticate()`
function needs to SELECT the password column to verify it. If the type excludes
`password` everywhere, even on the server, then authentication becomes impossible
in-language.

Suggested resolution: The `protect=` type exclusion applies to the client-visible
type only. Server-side functions that run inside the same state block — functions
that the compiler itself escalated to a server route because they touch protected
fields — get the full database type including protected fields. This is the only
interpretation that makes `protect=` useful for auth rather than just for hiding
display fields.

---

**Q: No explicit server function annotation**
I relied entirely on the compiler inferring that `authenticate()` must be a server
route because it touches a protected field. If the inference chain has any gap,
the function silently runs client-side and the password hash is exposed.

Suggested resolution: Add a `server` annotation keyword (e.g. `server function name()`)
that explicitly forces server-side execution regardless of inference. Inference
handles the common case; the annotation is the safety net. A compile-time warning
when a function touches protected fields but no server route is inferred would also
help.

---

**Q: Typed error throws and !{} pairing**
I wrote `throw AuthError("message")` inside a server function and caught it with
`| AuthError e ->` in a `!{}` block. The spec confirms `!{}` arm syntax but
doesn't say how errors are thrown or what `AuthError` is — a type, a constructor,
a built-in?

Suggested resolution: `throw TypeName(msg)` constructs and throws a typed error.
The compiler should recognize user-defined error types and allow them as `!{}`
arm patterns. A set of built-in error types (NetworkError, AuthError, DBError,
ValidationError) would cover 90% of cases.

---

## 6. Navigation / Routing

**Q: No navigation API**
I needed `redirect("/dashboard")` after successful login. The spec says route names
are compiler-internal, but the developer still needs a way to navigate between
pages. There's no navigation API in the spec.

Suggested resolution: A built-in `navigate(path)` or `redirect(path)` function that
the compiler wires to the appropriate client-side router push or server-side redirect
(302) depending on context. The path is a developer-defined URL string, not a
compiler-internal route name.

---

## 7. Components and Slots

**Q: Cross-file component import**
No import or module system is defined. `card.scrml` defines a `Card` component.
`dashboard.scrml` wants to use it. How?

Suggested resolution: The compiler auto-discovers all `.scrml` files in the project
and makes their exported components available by their `const Name` or by filename.
For disambiguation in larger projects, an explicit `import Card from "./card"` would
be needed — this is a priority to define before the module surface area grows.

---

**Q: Named slot syntax — element name collision**
The spec says "empty named element in component body = required slot" but never
says how the slot is named. The most natural reading is that the element name IS
the slot name. But `<body>` and `<header>` and `<footer>` are real HTML element
names — using them as slot names creates an ambiguity the parser can't resolve
without context about whether we're inside a component definition or a plain
markup block.

Suggested resolution: Use a dedicated `<slot name="slotname">` element (Web
Components-style) for named slots in component definitions. This is unambiguous,
familiar to web developers, and doesn't collide with any HTML element name. The
spec's current wording ("empty named element = slot") would need to be updated
to use this syntax.

---

**Q: Optional slot that defaults to empty (renders nothing)**
The spec distinguishes:
- Empty element in component body = required slot
- Non-empty element with content = optional slot, content is the default

But there's no way to say "optional slot, default is nothing." An empty slot is
required. A non-empty slot has default content. I want a third case: overridable,
but defaults to not rendering anything.

Suggested resolution: Add a `slot` attribute to mark an element as an optional
empty slot: `<footer slot="actions" optional/>`. Or: any `<slot>` element with
no children defaults to rendering nothing (empty is the default, overridable by
caller). The distinction between "required" and "optional-empty" should be
explicit.

---

**Q: Slot filling syntax at the call site**
I assumed `<child slot="name">content</child>` fills a named slot, borrowed from
Web Components. The spec doesn't specify the call-site syntax for named slots.

Suggested resolution: Adopt `<element slot="slotname">` as the call-site slot
filler. The `slot=` attribute is consumed by the component machinery and not
rendered as an HTML attribute. Consistent with Web Components — lowers the
learning curve.

---

**Q: fixed attribute scope**
The spec confirms `fixed` makes content non-overridable. I applied it as an
attribute directly to a `<div>`: `<div class="card__footer" fixed>`. But the
spec doesn't say whether `fixed` applies to a single element or to a subtree,
and whether it can appear anywhere in the component or only at the root.

Suggested resolution: `fixed` applies to the element it's placed on and its
entire subtree. It can appear on any element inside a component body. Caller
providing slot content that targets a `fixed` element = compile error.

---

## 8. CSS Variables

**Q: CSS variable syntax with hyphenated property names**
`border-color: card-border #e2e8f0;` — the scrml CSS variable syntax is
`prop: varname fallback`. But `border-color` is itself hyphenated. The parser
needs to read `border-color` as the property name, then `card-border` as the
variable name, then `#e2e8f0` as the fallback. This works in theory but depends
on the parser correctly tokenizing `border-color:` as a complete property name
before switching to var-name mode.

Suggested resolution: This should work as written. The property name is
everything before the `:`, which is standard CSS tokenization. A test case
with hyphenated properties and hyphenated variable names would confirm it.

---

**Q: Component-scoped CSS**
Two components both using `.card__title` in their style blocks will collide in
the global stylesheet. There's no scoping mechanism in the spec.

Suggested resolution: The compiler should support component-scoped styles — either
via a `scoped` attribute on `<style>`, CSS Modules-style hashed class names, or
Shadow DOM. Until this exists, developers are responsible for unique class naming.
BEM naming (`.componentname__element`) is the pragmatic workaround.

---

## 9. Lifecycle

**Q: On-mount / initialization**
I needed to fetch items when the dashboard page loads. The spec says "bare
expression = executes immediately on render." I used `${ loadItems() }` as
a fire-on-render idiom. But "on render" is ambiguous — does it re-fire on every
reactive re-render, or only on initial mount?

Suggested resolution: Define explicit lifecycle semantics. "Bare expression executes
once at initial render (mount)." Re-execution on reactive updates is opt-in via a
`watch=@variable` attribute or similar. A `once` modifier on the `${}` context
(`$once{ loadItems() }`) would make the intent explicit.

---

## 10. bun.eval() in Markup

**Q: bun.eval() inside markup interpolation**
I wanted `© ${ bun.eval("new Date().getFullYear()") }` for a compile-time year.
The spec says `bun.eval()` is compile-time only. If it's valid inside a `${}`
markup interpolation, the compiler should evaluate it at compile time and inline
the result (e.g., `2026`). If `${}` is always a runtime context, this wouldn't
work.

Suggested resolution: `bun.eval()` should be valid inside `${}` interpolations.
The compiler recognizes the call, evaluates it at compile time, and substitutes
the result as a literal. The developer gets compile-time constants inline in
markup without needing a separate constant declaration.

---

*These notes written while building login.scrml, dashboard.scrml, and card.scrml
on 2026-03-24. Compiler version: v8 bootstrap.*
