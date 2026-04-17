# scrml Tutorial

scrml is a single-file language for building web applications. One `.scrml` file compiles to the HTML, JavaScript, CSS, and server routes that a working app needs. There is no separate "client project" and "server project"; markup and reactive state live next to the database queries and authentication checks that back them up, and the compiler decides which half runs where.

This tutorial teaches the language from the ground up. By the end you will be able to write an interactive UI with reactive state, iterate over typed data, model errors as enum variants, persist to SQLite through inline SQL, push updates over a WebSocket channel, and generate markup at compile time. The middle sections — Layer 1 and Layer 2 — are the heart of the language. The last section is an appendix of less common features that you do not need on day one but will appreciate when you hit the problem they solve.

**Who this is for.** If you have written JavaScript or TypeScript, know a little HTML and CSS, and have used at least one reactive framework (React, Svelte, Vue, Solid) the ideas here will be familiar. scrml borrows liberally from the JSX world, the Svelte world, and the PHP world, and tries to cut the parts it does not need.

**What is different about scrml.** Most full-stack frameworks start from a client framework (React, Vue, Svelte) and bolt a server on, or start from a server framework (Rails, Django, Laravel) and bolt a client on. scrml starts from a single file. Markup, client-side reactive state, server-side database queries, authentication, WebSocket channels, and Web Worker code all live together and compile to separate bundles based on where they need to run. The unit of organization is the program, not the tier.

This has two practical consequences that shape the rest of this tutorial. First, you never write a route file; the shape of a page is the shape of its `.scrml` file. Second, you never write a separate API schema; the data contract between client and server is whatever your program's inferred call graph implies, and any mismatch is a compile error, not a 500 at runtime.

If you have been burned by the "two codebases, one product" mismatch — duplicated types, stale TypeScript interfaces for API responses, refactors that break the wire protocol silently — the rest of this tutorial will feel like a simplification.

**Prerequisites.** Working knowledge of JavaScript syntax, arrow functions, `const`/`let`, template strings, and the DOM event model. A passing acquaintance with SQL helps for Layer 3 but is not required — the examples use only `SELECT` and `INSERT`.

**How to run the samples.** Every code block in this tutorial is an actual `.scrml` file in `docs/tutorial-snippets/`. To compile one, run:

```
bun compiler/bin/scrml.js compile docs/tutorial-snippets/01c-reactive-state.scrml
```

The compiler will emit the built artifacts (HTML, JS, CSS, and, when relevant, a tiny server) and print a summary. You can wire the output into any static or Bun-based server; for this tutorial the compile step alone is enough to check that a sample is well-formed.

When you want the full language reference after working through this tutorial, see `compiler/SPEC.md`. When you want longer, working sample apps, browse `examples/`; those are runnable end-to-end rather than dissected snippet by snippet.

**How this tutorial is organized.** The material is layered: each section builds only on the previous ones, and each layer ends with a checkpoint that names what you can now do. Layer 0 is the hook — two small demos that set the scene. Layer 1 is the core you will use every day. Layer 2 adds types and composition. Layer 3 adds the full-stack story. Layer 4 is an appendix of less common features.

A reader in a hurry can read Layers 0–2 and come back to 3 when they need a database. A reader looking for the quickest introduction to the language's uniqueness should read Layer 0, then skim Layer 3.1–3.3 (where the client/server boundary shows up), then read the rest at leisure.

**What you will not find in this tutorial.** Build systems, CI pipelines, deployment recipes, design system patterns, state-management libraries — none of these are part of scrml. The language aims to be complete enough that you do not reach for most of them. When you do need them (for example, when integrating a scrml app with an existing organization's infrastructure), conventional tooling works: Bun for the runtime, your preferred hosting for deployment, your preferred observability stack on top.

**Conventions in this document.** Every code block is labeled with its snippet filename in the first-line comment (for example, `// 00a — The hook, client-only.`). You can find the unabbreviated source at `docs/tutorial-snippets/<name>.scrml` in this repository and compile it directly. Inline code — short phrases like `@count` or `const @doubled` — is `code-formatted`. A few sections flag errors you are likely to see while learning; those are marked with the `E-XXX-NNN` convention the compiler uses, so you can recognize them by name when you hit them.

---

## Layer 0 — The Hook

The fastest way to explain what scrml is doing is to show you the same app written two ways.

### Client-only: a todo list

Here is a small todo list. It runs entirely in the browser. State lives in two `@vars`; two plain functions mutate them; a `for` loop inside the markup renders the list.

```scrml
// 00a — The hook, client-only. A 3-item todo list with reactive state,
// event wiring, and for/lift iteration. No backend anywhere.

<program>

${
  @items = ["Write", "Compile", "Ship"]
  @draft = ""

  function add() {
    if (@draft == "") return
    @items = [...@items, @draft]
    @draft = ""
  }

  function remove(i) {
    @items = @items.filter((_, idx) => idx != i)
  }
}

<div class="max-w-md mx-auto mt-8 p-6">
  <h1 class="text-2xl font-bold">Todos</h1>

  <form onsubmit=add() class="flex gap-2 my-4">
    <input type="text" bind:value=@draft class="flex-1 p-2 border rounded" placeholder="What's next?"/>
    <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded">Add</button>
  </form>

  <ul class="flex flex-col gap-1">
    ${
      for (let item of @items) {
        lift <li class="flex justify-between p-2 border-b">
          <span>${item}</span>
          <button onclick=remove(0) class="text-red-600">x</button>
        </li>
      }
    }
  </ul>
</div>

</program>
```

Three things are worth naming now. The `${ ... }` brace at the top holds a *logic block* — declarations, functions, and any imperative setup. Anything prefixed with `@` is reactive state: write to `@draft` and every DOM node that reads it updates. Inside markup a second `${ ... }` introduces an expression slot; `for`/`lift` inside a slot produces repeated nodes. The shape of the file will not change much across this tutorial.

Look at the `add` function. Writing `@items = [...@items, @draft]` replaces the entire array reactive with a new array — there is no `@items.push(...)`. This is deliberate: scrml tracks reassignments, not mutations of the underlying object, which keeps the reactivity model simple and predictable. The `@draft = ""` that follows re-renders the input because it is two-way bound.

Look at the `remove` function. The same functional-update pattern: `filter` to a new array, reassign the variable. If you have written React or Solid, this is the standard idiom; if you come from Vue, you give up nothing by writing this way and gain a lot of static-analysis clarity.

Look at the form. `<form onsubmit=add()>` — the handler is a *call expression*, not a string. The browser's default submit behavior is prevented for you; you don't need `e.preventDefault()`. Click the button, the form submits, `add()` runs, and the result is the same as typing in a React controlled-input app: one new item in the list, input cleared.

### Full-stack: the same todo list, backed by SQLite

Now here is the same app again, but instead of keeping todos in a JavaScript array in the browser, we persist them to a SQLite database on the server.

```scrml
// 00b — The same app, full-stack.
// Only the `<db>` block and two server functions were added. Markup is unchanged.

<program>

<db src="demo.db" tables="todos">

  ${
    @items = []
    @draft = ""

    server function loadTodos() {
      lift ?{`SELECT id, body FROM todos ORDER BY id`}.all()
    }

    server function persistTodo(body) {
      ?{`INSERT INTO todos (body) VALUES (${body})`}.run()
    }

    function add() {
      if (@draft == "") return
      persistTodo(@draft)
      @items = loadTodos()
      @draft = ""
    }

    if (@items.length == 0) {
      @items = loadTodos()
    }
  }

  <div class="max-w-md mx-auto mt-8 p-6">
    <h1 class="text-2xl font-bold">Todos</h1>

    <form onsubmit=add() class="flex gap-2 my-4">
      <input type="text" bind:value=@draft class="flex-1 p-2 border rounded" placeholder="What's next?"/>
      <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded">Add</button>
    </form>

    <ul class="flex flex-col gap-1">
      ${
        for (let row of @items) {
          lift <li class="p-2 border-b">${row.body}</li>
        }
      }
    </ul>
  </div>

</>

</program>
```

Compare the two files side by side. The markup is identical. The form is identical. The iteration is identical. What changed is that the `<program>` now wraps its body in a `<db src="demo.db" ...>` block, and two of the functions inside `${ ... }` are prefixed with the word `server`. Those two functions — `loadTodos` and `persistTodo` — run on the server. Everything else runs in the browser.

Nothing about this boundary was declared. There is no `"use server"` directive. There are no separate files. The compiler reads the program, notices that `?{ ... }` SQL blocks cannot run in a browser, and walks the call graph from there: any function that calls into a server function, through the client, becomes an RPC call. Authentication checks, CSRF tokens, payload serialization, and route generation are produced for you.

This is the pitch of the whole language. You write the markup once; the boundary between client and server is *inferred*, not *declared*. The rest of this tutorial is a patient walk through the primitives that make that boundary work.

Read the full-stack version one more time, and notice the symmetry with the client-only one. The state block is still `${ ... }`. The `@items` and `@draft` are still reactive. The `for`/`lift` iteration is still exactly the same. There is no new concept for "fetch data"; the call to `loadTodos()` inside `add` is an ordinary function call that happens to compile to an RPC. There is no new concept for "save data"; the call to `persistTodo(@draft)` is also just a function call. The `if (@items.length == 0) @items = loadTodos()` at the bottom of the logic block is the program's one-time load on first render — it runs once because `@items` is written after that, and the condition becomes false.

The *mental model* here is: "write the program as if everything ran locally; let the compiler move server-only operations to the server." You can verify this is working by running the compiler on `00b-hook-fullstack.scrml` and looking at what comes out — two bundles, one for the browser and one for the server process, with a small route table that wires them together.

> **Note:** The closer `</>` — a forward slash with nothing after it — closes the most recently opened tag. You can also write the full `</div>` or `</program>`; scrml accepts both. We will use `</>` when the surrounding tag is obvious.

One more observation before we leave the hook. If you look at the two snippets and mentally diff them, the change from "runs only in the browser" to "runs against a persistent database on a server" is purely *additive*: a wrapping `<db>` element, a `server function` prefix, and a `?{ ... }` SQL block. No refactor, no file split, no "client-side API layer." This additivity is the headline property of scrml. A feature can grow from client-only to full-stack without rewriting the parts that already worked, and the reverse is equally true — prototype an app as a client-only UI, wire it up to a database later.

Compare this to the common alternative: start a project with a React frontend and an Express backend, then realize you need a database, then realize you want real-time, then realize your client-server contract is brittle. Each step adds a file, a build step, a potential skew. In scrml, each of these is a small additive change inside a single file.

That is the whole pitch. The rest of this tutorial is the craft of working inside it.

---

## Layer 1 — Primitives

Layer 1 covers the things you use in every scrml file: the top-level `<program>`, the `${}` logic block, reactive `@vars`, derived values, attribute bindings, and styling. If you finish Layer 1 you can build a real client-side app.

### 1.1 `<program>` and markup

Every scrml file is a single `<program>` element. Markup inside `<program>` is HTML with a handful of extensions. Elements close with `</tagname>`, with the shorthand `</>`, or with a trailing `/` on a void element.

```scrml
// 01a — Minimal <program>. Shows the three closer forms:
// explicit </h1>, trailing / on </>, and bare <br/>.

<program>

<h1>Hello</h1>
<p>Second paragraph with a trailing closer.</>
<br/>
<p>Done.</p>

</program>
```

There is no extra boilerplate. No `<html>`, no `<head>`, no `<body>` — the compiler wraps what you write in a proper document shell and injects the runtime. Anything outside `<program>` is an error; comments (`// ...` and `/* ... */`) are allowed anywhere.

The tag names themselves are the ones you already know — `<div>`, `<p>`, `<form>`, and so on. A few tags (`<program>`, `<db>`, `<channel>`, `<errorBoundary>`) are built-in *language* elements that the compiler treats specially. Everything else is plain HTML plus any components you define yourself.

A scrml file is self-contained: one file, one program, one deliverable. You do not need to set up a project scaffold, configure a bundler, or create a `pages/` directory. Compile `hello.scrml` and you get `hello.html` plus the JavaScript, CSS, and (for full-stack programs) server artifacts to run it. That is the whole conceptual footprint of the language at the file level.

Attributes inside markup mostly behave like regular HTML. The few that do not are the scrml extensions you will meet across Layer 1: `bind:value`, `class:name`, `onclick` (and other event names), `if=`, `show=`, `slot=`, `protect=`, and `auth=`. Every one of them is a plain attribute-looking name with a scrml-specific compile-time meaning.

### 1.2 The `${}` logic block

Markup and logic are separated by the `${ ... }` block. Inside this block you write JavaScript-shaped statements: `const` bindings, `function` declarations, `import`s, `type` declarations, and top-level expressions. Outside a logic block, inside markup, `${expression}` is an interpolation slot that substitutes the expression's value.

```scrml
// 01b — Logic block with a file-scope const + interpolation.

<program>

${
  const name = "scrml"
  const year = 2026
}

<h1>Hello from ${name}</h1>
<p>It is ${year}.</p>

</program>
```

Notice that the same `${ ... }` punctuation does two different jobs, and context disambiguates them. At file scope (between markup elements, or before any) it is a logic block — a multi-statement brace. Inside an attribute or inside a text node it is an interpolation — a single expression.

> **Error you might hit:** E-SCOPE-001 — a naked `@var` outside `${ ... }` is an error. File-scope state declarations must always sit inside a logic block. This is the single most common mistake when learning scrml, which is why the next few sections lean on it.

The reason this error exists — rather than just "we could figure it out" — is that `${ ... }` is the compiler's marker for "this is code, not markup." Without that marker at declaration time, scrml cannot tell whether `@count = 0` is a declaration you want to run at startup, or a piece of attribute syntax that happens to look like assignment. Requiring the logic block makes the boundary unambiguous and keeps the parser simple.

You will write logic blocks several places in a single program. The top of the file is the usual home for declarations (types, state, functions, imports). Inside markup, a logic block handles loops, branches, and bits of imperative setup that emit nodes. Inside a component body, a logic block is where you declare the component's local helpers. The scope of a logic block is the smallest enclosing `<program>`, `<db>`, `<channel>`, or component; variables do not leak out.

Expressions are a subset of this: an `${expression}` *inside markup* interpolates — it must be a single expression that evaluates to a value, and its value is substituted into the surrounding text or attribute. If the expression's value is a primitive (string, number, boolean), the compiler stringifies it. If it is a DOM node or snippet, the compiler attaches it directly.

### 1.3 Reactive state with `@`

State is prefixed with `@`. An assignment to `@count` inside a logic block creates a reactive variable; every subsequent write to that variable re-runs every part of the markup that read it.

```scrml
// 01c — Reactive state + a function + button. The classic counter.

<program>

${
  @count = 0

  function inc() { @count = @count + 1 }
}

<p>Count: ${@count}</p>
<button onclick=inc()>+</button>

</program>
```

`@count` is declared simply by assigning to it inside `${ ... }`; the compiler registers the name as a reactive variable for the rest of the file. Reading `@count` inside markup (`${@count}`) subscribes the surrounding DOM to that variable. Writing `@count = @count + 1` inside `inc` triggers a re-render of that subscribed text node — and *only* that text node.

The `onclick=inc()` attribute is a scrml event binding. Unlike plain HTML, the attribute value is treated as an expression; `inc()` is a *call* to run on click, not a string to eval. The parentheses are mandatory, so that the difference between "pass the function" and "call the function" is never ambiguous.

> **Note:** scrml `@vars` are file-scoped. A single program is one scope; they are not global. If you want isolated state, put the work inside a component (Section 2.6).

There are a few things worth understanding about how reactivity actually works at compile time. When the compiler sees `${@count}` inside markup, it generates a tiny *effect*: a function that updates that text node and that the runtime registers as a subscriber to `@count`. When you later write `@count = @count + 1`, the runtime looks up the subscribers of `@count` and re-runs just those effects. The surrounding `<button>` is untouched; the rest of the page is untouched.

This matters because it tells you why certain idioms work: reassigning `@items = [...@items, x]` is efficient because only the list's render block re-runs, not the whole page. It also tells you why certain idioms do *not* work: mutating a field like `@items[0].name = "new"` does not trigger re-render, because the compiler only sees *assignments to `@vars`* as reactive triggers. If you want reactivity on nested fields, reassign the top-level `@var` or, as we will see in Section 2.2, model the data with struct types and replace the whole record.

The pattern for "update one field of a record" is therefore:

```
@user = { ...@user, name: "new" }
```

This copies the record, overrides one field, and reassigns the top-level `@var`. It is the same idiom you use in React for setState with an object — scrml did not invent it, but the language is deliberately built around it.

### 1.4 Derived values with `const @`

A derived value is a `const @` declaration whose right-hand side is an expression over other reactive state. The compiler re-computes the expression whenever any of its inputs change.

```scrml
// 01d — Derived value. `const @doubled` recomputes whenever @count changes.

<program>

${
  @count = 0
  const @doubled = @count * 2

  function inc() { @count = @count + 1 }
}

<p>Count: ${@count}</p>
<p>Doubled: ${@doubled}</p>
<button onclick=inc()>+</button>

</program>
```

`const @doubled = @count * 2` reads: "whenever `@count` changes, recompute `@count * 2` and store it as `@doubled`." There is no `$derived()` function call; the `const @` form is the language-level spelling. You cannot assign to `@doubled` — it is read-only by construction.

> **Hazard:** some early design notes floated a `~x = expr` shorthand for derived values. That form is **not supported**. The only way to write a derived reactive is `const @name = expression`.

Derived values can depend on other derived values. You can write `const @isEven = @doubled % 4 == 0` and it will recompute whenever `@doubled` recomputes, which in turn happens whenever `@count` changes. The dependency graph is tracked automatically; you never list dependencies explicitly.

One subtlety: the expression on the right of `const @ =` must be *pure* in the sense of "a function of its reactive inputs." Side effects (calling a function that logs, setting something external, mutating shared state) should not live here. Use a `function` or a `when` handler if you need to *do* something in response to a change; use `const @` only to *compute* something from state.

In practice, reach for derived values whenever you see yourself writing the same expression in multiple places in markup, or whenever you would otherwise need a helper function to compute something from state. A derived value is a single named piece of state with a declared meaning — it makes later readers' lives easier.

### 1.5 Bindings, classes, and event handlers

Interactive apps need three kinds of attribute extension: two-way bindings on form controls (`bind:value`), conditional class attachments (`class:active`), and event handlers (`onclick`, `onkeydown`, and so on).

```scrml
// 01e — Attribute bindings: bind:value, class:active, onclick, onkeydown.

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

`bind:value=@text` is two-way: typing in the input updates `@text`, and writing to `@text` from elsewhere (for example, `@text = ""`) updates the input. This is one of the places scrml visibly borrows from Svelte.

`class:active=@active` adds or removes the CSS class `active` based on the truthiness of `@active`. It leaves the rest of the `class` attribute alone — if you combine `class="card"` with `class:active=@expanded`, the card is either `"card"` or `"card active"` depending on `@expanded`.

`onkeydown=handleKey()` passes the native event object implicitly: the handler receives it as its first argument if declared (we named it `e`). This is another area where plain HTML's string-based event attributes are extended to first-class function calls.

Every DOM event name works the same way: `onclick`, `oninput`, `onchange`, `onsubmit`, `onkeyup`, `onkeydown`, `onfocus`, `onblur`, `onmousedown`, `onmouseup`, `onmouseover`, and so on. If the name exists in the DOM, scrml accepts the attribute. Pointer events, composition events, animation events — all wired the same way.

You can pass arguments explicitly, too. Instead of `onclick=toggle()` you could write `onclick=toggleSection("header")`. Arguments are ordinary scrml expressions; they can reference `@vars`, local consts inside a loop, or anything else in scope. Inside a `for` iteration, this is how you pass the current item to a handler: `onclick=remove(item.id)`.

The `bind:` namespace has more than just `value`. On a `<select>` it binds the selected value; on `<input type="checkbox">` it binds a boolean; on `<input type="radio">` it binds the selected radio's value. On a contenteditable element it binds the text content. The family is consistent: `bind:name=@var` means "keep `@var` and the DOM attribute `name` in sync."

For `class:`, you can attach multiple conditional classes on the same element: `<p class="note" class:active=@active class:error=@hasError>`. Each one is independent, and the resulting class list is computed dynamically.

### 1.6 Styling: scoped `#{}` CSS

A program can carry its own CSS in a `#{ ... }` block. Selectors inside the block are scoped to the program — the compiler rewrites class names and wraps bare tag selectors so they cannot leak.

```scrml
// 01f — Scoped styles via #{} block. Class names are rewritten per-component.

<program>

<div class="card">
  <h1>Scoped</h1>
  <p>This card's styles only apply inside this program.</p>
</div>

#{
  .card {
    max-width: 360px;
    margin: 2rem auto;
    padding: 1.5rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-family: sans-serif;
  }
  h1 { color: #2563eb; }
}

</program>
```

You can mix `#{ ... }` with regular stylesheets and with inline `style=` attributes. A `#{ ... }` block may appear at the top or bottom of the program; by convention it goes at the bottom, next to the component it styles, so the markup stays near the top.

Scoping works by class-name rewriting: the compiler takes every `.card` selector in `#{ ... }` and rewrites both the selector and the corresponding `class="card"` attribute to a unique hashed class name such as `card-a91b`. The program's styles are therefore guaranteed not to collide with styles defined in other programs, even if every file uses the same class names. This is the same technique Svelte and CSS Modules use — but here it is built into the file, not a separate tooling choice.

Bare tag selectors (`h1 { ... }`) are also scoped: they match only elements inside this program. You can reach "outside" the scope with a `:global(...)` wrapper when you really need to, but that is the exception rather than the rule.

Rules of thumb: use `#{ ... }` for one-off bespoke styling that belongs to a single program. Use Tailwind (Section 1.7) for common utilities shared across a design system. Use a separate imported stylesheet only when you have a third-party CSS file (a reset, a vendor framework) that you do not want to rewrite.

### 1.7 Styling: Tailwind utilities

scrml also ships with first-class Tailwind support. When you use utility classes directly on elements, the compiler reads them at build time and produces exactly the CSS the program needs — no separate `tailwind.config.js` build step and no unused utilities in the output.

```scrml
// 01g — Same app, Tailwind utility classes instead of #{}.

<program>

<div class="max-w-sm mx-auto mt-8 p-6 border border-gray-200 rounded-lg font-sans">
  <h1 class="text-blue-600 text-2xl font-bold">Tailwind</h1>
  <p class="text-gray-700 mt-2">Utility classes are compiled at build time.</p>
</div>

</program>
```

This is the same visual result as the scoped `#{ ... }` version. Which one you reach for is a matter of taste; some teams prefer `#{ ... }` for one-off presentational work and Tailwind for shared design-system utilities. The two can live together in a single file without conflict.

Because the compiler scans class attributes at build time, the Tailwind CSS it emits contains only the utilities the program actually uses. A small program that uses ten Tailwind utilities ships exactly those ten utilities' worth of CSS, not the entire framework. The hook example back in Section 0.1 uses Tailwind throughout — if you look at its compiled output you will see a couple of kilobytes of CSS, not the full Tailwind bundle.

You can combine the two styling approaches freely: Tailwind utilities for layout and spacing (`flex`, `gap-2`, `p-4`), `#{ ... }` blocks for anything fiddly that utilities cannot express naturally (complex selectors, keyframes, pseudo-elements). Neither is "better"; the two cover complementary needs.

### Checkpoint

At this point you have seen enough to write a client-side scrml app. You can declare state, write derived values, bind form inputs, handle events, and style elements. The todo list in Section 0.1 uses exactly these primitives and nothing else — go re-read it now; every line should make sense.

What you cannot yet do: iterate over typed data with named fields, branch exhaustively on a value's variant, split the UI into reusable components, or separate pure computation from impure mutation. That is Layer 2.

Before moving on, it is worth sitting with Layer 1 for a moment. The primitives here — `<program>`, `${ ... }`, `@var`, `const @ =`, `bind:`, `class:`, event attributes, `#{ ... }`, Tailwind — are the language's small but complete core. Most scrml code spends most of its time in exactly these constructs. If you internalize this layer, the later layers will feel less like new ideas and more like sensible extensions:

- Layer 2 adds *structure* to the values you were already handling (struct/enum types) and *composition* to the markup you were already writing (components, slots).
- Layer 3 adds *persistence* without changing the shape of the code (the todo example in 0.1 and 0.2 is proof).
- Layer 4 adds *distribution* — workers, channels, compile-time codegen — for specific needs.

Everything stacks on Layer 1. When you hit a weird bug later on, nine times out of ten the misunderstanding is a Layer 1 thing: a `@var` read outside `${ ... }`, a `@count` mutated instead of reassigned, a derived value written as `~` instead of `const @`, an event handler that forgot its parentheses. Re-read this layer until the small rules are reflex, and the rest of the tutorial becomes concrete rather than abstract.

---

## Layer 2 — Composition

Layer 2 introduces the tools for scaling a single file past a simple demo: typed iteration, sum types, exhaustive `match`, reusable components, and the split between pure `fn`s and stateful `function`s.

### 2.1 Iteration with `for` / `lift`

Inside an interpolation slot, a `for` loop iterates. To emit markup from the loop body you use the `lift` keyword — it says "lift this node into the surrounding markup."

```scrml
// 02a — Iteration. for/lift inside ${} inside <ul>.

<program>

${
  @items = ["apple", "banana", "cherry"]
}

<ul>
  ${
    for (let x of @items) {
      lift <li>${x}</li>
    }
  }
</ul>

</program>
```

The `${ ... }` inside `<ul>` is a logic block because its body is a multi-statement `for`. Each iteration's `lift <li>...</li>` produces a new sibling child of `<ul>`. The word `lift` is there because, without it, `<li>...</li>` inside a logic block would just be an unused expression; `lift` is what marks an expression as something to attach to the surrounding DOM tree.

> **Note:** scrml `for` is the normal JavaScript `for (let x of ...)`. `forEach` and `map` work too, but `for`/`lift` reads cleaner in markup context.

A subtle but important property: the `for` block reacts to changes in `@items`. If you push a new item (by reassigning `@items = [...@items, newItem]`), the loop re-evaluates and the new `<li>` is added without re-rendering the whole list from scratch. scrml diffs the produced nodes by identity where it can; for a flat list of strings, pushes and removes are cheap. For larger lists with stable identity, the conventional idiom is to have a struct with an `id` field and key on that.

Inside a `for`, any `lift` expression is attached as a child of the element containing the logic block. If you `lift` multiple things from a single iteration — say a header and a body — they all attach in order:

```
for (let group of @groups) {
  lift <h2>${group.title}</h2>
  lift <ul>${ for (let x of group.items) { lift <li>${x}</li> } }</ul>
}
```

Nested `for`/`lift` composes. The outer loop produces header-and-list pairs; the inner loop produces list items inside each group's list. The nesting is exactly what you would write in imperative DOM building, and the compiler keeps all of it reactive.

### 2.2 Struct types

scrml has a simple structural type system. A `type Foo:struct = { ... }` declaration names a record shape with typed fields. Instances are plain object literals — there are no constructors.

```scrml
// 02b — Struct type used as a typed array.

<program>

${
  type Person:struct = { name: string, age: number }

  @people = [
    { name: "Ada",  age: 36 },
    { name: "Alan", age: 41 },
  ]
}

<ul>
  ${
    for (let p of @people) {
      lift <li>${p.name} (${p.age})</li>
    }
  }
</ul>

</program>
```

The syntax `type Name:struct = {...}` reads "the type `Person` is a *struct* whose fields are..." The `:struct` qualifier distinguishes record types from other kinds; the next section shows `:enum` for sum types. Field types are any of the primitive types (`string`, `number`, `boolean`), arrays, other named types, or inline object types.

scrml types are structural: a value is a `Person` if it has the right-shape fields, not because of a class declaration. An object literal `{ name: "Ada", age: 36 }` is a valid `Person` without any constructor call. This makes types lightweight and cheap to add: declare one when you want the compiler to check a shape, skip one when the shape is obvious or local.

You can nest structs, arrays, and optional fields. An optional field is written with `?` after the name:

```
type User:struct = {
  id:    number,
  name:  string,
  email: string?,
  tags:  string[],
}
```

Optional fields can be missing from a value — the type checker will force you to check presence before reading. That check uses the `is some` / `is not not` operators from Section 2.8.

### 2.3 Enum types

An enum is a sum type: a value is exactly one of the listed variants. Variants are written one per line inside `{ ... }` as bare names — no leading `.`. A variant can carry payload fields, which makes an enum a *tagged union* rather than just a set of constants.

```scrml
// 02c — Multi-line enum type. Variants on separate lines inside { ... } braces.

<program>

${
  type Status:enum = {
    Todo
    InProgress
    Done
  }

  // The type annotation on the reactive lets `match` downstream see it as
  // a Status-typed subject (otherwise the type system widens to asIs and
  // match rejects with E-TYPE-025).
  @status: Status = Status.Todo
}

<p>
  ${
    match @status {
      .Todo       => { lift "Not started" }
      .InProgress => { lift "Working on it" }
      .Done       => { lift "Complete" }
    }
  }
</p>

</program>
```

The leading `.` appears only on the *reference* side (inside `match` arms, `is .Variant` checks). In the declaration body the names are bare.

To *read* an enum value you use `match` (next section). Variants without payload are constructed as `Status.Todo`; variants with payload are constructed as `Shape.Circle(10)` — the payload shape follows the variant name in parentheses. We return to payload variants in the next section.

> **Note:** newline separation of variants is the canonical style. Commas between variants are also accepted (`{ Todo, InProgress, Done }` fits on one line when the set is small), but one-per-line reads better for anything more than a handful.

Enums shine for UI state. A loading-then-success-or-error request is a four-variant enum:

```
type Request:enum = {
  Idle
  Loading
  Success(data: Row[])
  Failure(msg: string)
}
```

Every place in your code that reads the request has to handle all four variants — including the data payload that `Success` carries and the message that `Failure` carries. You cannot accidentally render `data.length` when the request is still `Loading`, because the `Loading` variant has no `data` field and the type checker knows that. This is the main reason scrml treats enums as first-class: they are the right shape for "one of several possible states" and the compiler will not let you forget a state.

### 2.4 `match` — exhaustive, uses `=>`

`match` is how you destructure an enum. Each arm matches one variant and runs its block; the compiler checks at build time that every variant has an arm, and fails the build if you forget one.

```scrml
// 02d — Exhaustive match. Picks an icon/label per enum variant.

<program>

${
  type Status:enum = {
    Todo
    InProgress
    Done
  }

  @status: Status = Status.InProgress

  function advance() {
    match @status {
      .Todo       => { @status = Status.InProgress }
      .InProgress => { @status = Status.Done }
      .Done       => { @status = Status.Todo }
    }
  }
}

<div>
  <p>
    ${
      match @status {
        .Todo       => { lift "[ ] Todo" }
        .InProgress => { lift "[~] In progress" }
        .Done       => { lift "[x] Done" }
      }
    }
  </p>
  <button onclick=advance()>Advance</button>
</div>

</program>
```

The arm separator is `=>` — canonical per the spec (§18.2). `->` is accepted as an alias and `:>` compiles for now but is not the style to teach. Blocks use ordinary `{ ... }`. A match used in markup context — inside an interpolation slot — uses `lift` inside each arm to emit that arm's output.

`match` is exhaustive. If you add a fourth variant to `Status` later, every `match` in your program that branched on `Status` becomes a compile error until you add a handling arm for the new variant. This is the main benefit of enums-plus-match over "string constants and if/else": the compiler forces you to update call sites. A migration that would be a bug-hunt in weakly-typed code is a guided list of compile errors in scrml.

**Payload variants and destructuring.** A variant declared with a parenthesized field list carries that payload when constructed, and a `match` arm can bind those fields to local names.

```
type Request:enum = {
  Idle
  Loading
  Success(data: Row[])
  Failure(msg: string)
}

match @req {
  .Idle          => { lift "Click to load" }
  .Loading       => { lift "Loading..." }
  .Success(data) => { for (let r of data) { lift <li>${r.name}</li> } }
  .Failure(msg)  => { lift <p class="err">${msg}</p> }
}
```

Positional bindings (`.Success(data)`) bind against the declared field order. Named bindings (`.Success(data: rows)`) destructure by field name and let you rename locally. A `_` in any position is an explicit discard. Arity mismatch — `.Rectangle(w)` for a `Rectangle(width, height)` variant — is `E-TYPE-021`; use either the full positional list or the named form with a subset.

Construction mirrors this: `Shape.Circle(10)` returns a tagged object you can compare, pass around, or match on. Unit variants (no payload) are still plain strings under the hood: `Status.Todo === "Todo"`. The runtime normalizes both shapes so `match` arms dispatch uniformly.

**Match subject typing.** The subject of `match` must be a typed value — enum, union, or primitive. If the compiler can only infer `asIs`, it rejects with `E-TYPE-025`. The safest way to keep a reactive's type visible is to annotate it at declaration: `@status: Status = Status.Todo`. A function parameter's type annotation does not yet carry into the body for match-narrowing (a known limitation); until that is fixed, route through a typed reactive or use a file-scope `let`.

Match also works on non-enum values — you can match on numbers, strings, or booleans — but the exhaustiveness check is most useful on enums, because only enums have a finite known set of cases.

### 2.5 Control flow: `if=`, `show=`, ternary

For conditional markup scrml gives you three tools, each with a different trade-off. `if=` mounts or un-mounts an element entirely; `show=` keeps it in the DOM but toggles its visibility; a ternary inside an interpolation substitutes one of two expressions.

```scrml
// 02e — Control flow: if= (mount/unmount), show= (toggle visibility),
// and a ternary inside interpolation.

<program>

${
  @loggedIn = true
  @verbose  = false
}

<div>
  <p if=@loggedIn>Welcome back.</p>
  <p show=@verbose>Extra diagnostic info.</p>
  <p>Status: ${@loggedIn ? "online" : "offline"}</p>
</div>

</program>
```

Use `if=` when you need the absence: an element with `if=@x` that evaluates falsey is not in the tree at all. Use `show=` when you need fast toggling and the element's state should persist (form inputs, media elements). The ternary is for when you just want a different bit of text.

The distinction between `if=` and `show=` is the same one that exists in Vue and a few other frameworks, and the trade-offs are identical. `if=` is cheaper when the element is usually absent, because no DOM is created unless needed. `show=` is cheaper when the element toggles frequently, because the DOM is built once and then its `display` is flipped. Pick the one that matches how the element is used.

You cannot use `if=` on `<program>`, `<db>`, `<channel>`, or `<errorBoundary>` — these are language-level elements that must always be present. You can use it freely on any ordinary HTML tag and on any user component.

For "either-or" blocks, a two-`if=` pattern works: `<p if=@loading>Loading...</p><div if=(not @loading)>...</div>`. For anything more elaborate (three or more branches), reach for `match` on an enum; it will read better than a chain of `if=`s.

### 2.6 Inline components

A component in scrml is a `const` bound to an element expression inside a logic block. It is invoked by name in markup, like a custom element. Children — the content between the open and close tags at the call site — are substituted into the component body via `${children}`.

```scrml
// 02f — Inline component. Declare inside ${}, invoke in markup.
// Components receive children via ${children} spread in the body.

<program>

${
  const Card = <div class="card">
    ${children}
  </div>
}

<Card>
  <h2>Hello</h2>
  <p>Inside a card.</p>
</Card>

#{
  .card {
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 6px;
  }
}

</program>
```

The convention is that component names are capitalized (`Card`, `Panel`, `UserBadge`) so the parser can distinguish them from lowercase HTML tags.

Because a component is just a value assigned to a `const`, you can pass it around, put it in an array, return it from a function, or declare one inside another. There is no separate "component definition" step; components are a naming convention on top of scrml expressions.

A component can take props. Props are declared on the component's root element via a `props={...}` attribute:

```
const Badge = <span class="badge" props={ label: string, kind: "info" | "warn" | "err" }>
  ${label}
</span>

<Badge label="Saved" kind="info"/>
```

Each prop has a typed name; inside the component body, the prop is available as a local `const`. Props can be primitives, structs, enums, arrays, or — for advanced composition — `snippet` values (Section 2.7). Calling a component with a missing required prop is a compile error; calling it with the wrong type is a compile error.

Props and `${children}` work together. A component can take named slot-children (via `snippet` props) and positional children (via `${children}`) at the same time. The common pattern is: simple wrappers use `${children}` only, structured panels declare `snippet` props for each region.

Each component instance has its own `@var` scope. Two `<Counter/>` tags render two independent counters, each with its own `@count`. This is what "put the work inside a component" means from the Section 1.3 note on state scope: components are the unit of state isolation.

### 2.7 Slots

When a component needs more than one kind of child — say, a header and a body — it declares named *slots* using a `props` attribute with type `snippet`, and the caller assigns children to slots with `slot="name"`.

```scrml
// 02g — Named slots. A Panel component with header + body snippet props.
// Children are assigned to slots via `slot="name"` on direct children.

<program>

${
  const Panel = <section class="panel" props={
    header: snippet,
    body:   snippet,
  }>
    ${children}
    <div class="panel__header">
      ${render header()}
    </div>
    <div class="panel__body">
      ${render body()}
    </div>
  </section>
}

<Panel>
  <h2 slot="header">Settings</h2>
  <p slot="body">Adjust your preferences here.</p>
</Panel>

#{
  .panel { border: 1px solid #ddd; border-radius: 6px; margin: 1rem 0; }
  .panel__header { background: #f5f5f5; padding: 0.5rem 1rem; font-weight: 600; }
  .panel__body { padding: 1rem; }
}

</program>
```

`props={ header: snippet, body: snippet }` declares that this component accepts two snippet props — `header` and `body` — which the caller will fill with `slot="header"` and `slot="body"` children respectively. Inside the component body, `${render header()}` renders the snippet passed for `header`. Snippets are small typed functions over markup; they are first-class values, so you can pass them between components, store them in arrays, and call them multiple times.

Because snippets are callable, they can take arguments, too. A table component might declare a `row: snippet(item: Row)` prop and call it inside an iteration:

```
const Table = <table props={ rows: Row[], row: snippet(item: Row) }>
  <tbody>
    ${ for (let r of rows) { lift <tr>${render row(r)}</tr> } }
  </tbody>
</table>
```

The caller supplies a snippet that receives each row and produces the cells. This is the scrml shape of "render prop" or "scoped slot" from other frameworks.

For most components, though, `${children}` alone is enough. Reach for named `snippet` slots when a component has clearly distinct regions (header/body/footer, title/content, input/preview) and you want the consumer to fill each region separately.

### 2.8 Presence checks: `is not not`, `is some`, `not`

JavaScript's mental model for "missing" values is a mess — `null`, `undefined`, and falsy-but-present values all look alike. scrml has three dedicated operators for talking about presence. Each must be parenthesized inside an attribute, because the unparenthesized `!` and `==` cases are ambiguous with other uses.

```scrml
// 02h — Presence checks. `is not not`, `is some`, `not @var`. Always parenthesized.

<program>

${
  @user     = { name: "Ada" }
  @email    = "ada@example.com"
  @loggedIn = true
}

<div>
  <p if=(@user is not not)>User is present.</p>
  <p if=(@email is some)>Email is provided.</p>
  <p if=(not @loggedIn)>Please sign in.</p>
</div>

</program>
```

`x is not not` reads "x is defined" — the double negation is the point; it distinguishes presence (`is not not`) from truthiness. `x is some` is an alias for the same check with different emphasis. `not x` is logical negation — the boolean complement, equivalent to JavaScript's `!x`.

You will write `is not not` and `is some` most often when guarding a block against null values; you will write `not` most often when you want a boolean flip of a boolean.

The reason scrml has three spellings rather than one is that all three read cleanly in different contexts:

- `if (@user is some)` reads naturally as "if a user is present."
- `if (@config.option is not not)` reads as "if the option is defined at all."
- `if (not @loggedIn)` reads as "if not logged in."

Each is the right grammar for a different question. Pick whichever reads closest to what the condition means in natural language, and be consistent across your program.

The parentheses requirement is a parser rule: inside attribute positions, the parser cannot easily tell where a scrml operator ends and the next attribute begins without them. You do not need parentheses in pure expression positions (inside `${ }` interpolations or logic blocks), only in attribute values like `if=(...)`.

### 2.9 Pure functions with `fn`

There are two flavors of function declaration in scrml: `function` (for stateful work that can touch `@vars`) and `fn` (for pure computation that cannot). A `fn` is typed — parameters and return type are declared — and is statically checked to be free of side effects. Use `fn` for anything you would test in isolation.

```scrml
// 02i — Pure `fn` declaration. Typed, used in markup.

<program>

${
  fn formatName(first: string, last: string) -> string {
    return first + " " + last
  }
}

<p>${formatName("Grace", "Hopper")}</p>

</program>
```

The signature `fn formatName(first: string, last: string) -> string` reads: "pure function `formatName` taking two strings, returning a string." A `fn` cannot read or write `@vars`, call a client-side DOM API, or perform I/O. It is a value, compilable to either side of the client/server boundary without ceremony.

The rule of thumb: reach for `fn` whenever you can, and fall back to `function` only when you must mutate state. Pure code is easier to reason about, easier to test with `~{ ... }` (Section 3.6), and portable across the boundary.

A pure `fn` declared at program scope is automatically available on both sides of the client/server boundary. The compiler either inlines it into the client bundle, or, if it is only called from server code, ships it only there. You never think about "which environment does this code need?" for a pure function — its purity means it can run anywhere.

The `fn` declaration also participates in the type system. The return type after `->` is checked against every `return` in the body. Parameter types are checked at every call site. This catches the full set of small typos (passing a string where a number is expected, returning nothing from a function that should return a value) at compile time. For quick experiments you can omit the return type and scrml will infer it, but explicit is usually clearer at code-review time.

Finally, a `fn` can be marked failable with `!` (see Section 3.5). A failable `fn` returns either its normal value or fails with a typed error variant. The caller either pattern-matches the error with `!{ ... }` or propagates the failure up to an `<errorBoundary>`. Because this is all at the type level, there is no hidden "might throw" to worry about: if a function can fail, its signature says so.

### 2.10 State machines

An enum plus a match takes you most of the way to "one of several possible states." A state *machine* goes one step further: it declares which transitions between those states are legal, so the compiler and runtime will reject illegal ones instead of silently accepting them. scrml spells this as a top-level `< machine>` block bound to an enum type.

```scrml
// 02j — State machine. `< machine Name for EnumType>` declares the legal
// transitions for a reactive bound to that machine. Writes that are not
// in the rule set are rejected at runtime.

<program>

${
  type OrderState:enum = { Draft, Submitted, Paid, Shipped, Delivered, Cancelled }

  // The machine annotation on the reactive is what wires runtime guarding.
  // Assignments to @order are validated against OrderMachine's rule set.
  @order: OrderMachine = OrderState.Draft

  function submit()  { @order = OrderState.Submitted }
  function pay()     { @order = OrderState.Paid }
  function ship()    { @order = OrderState.Shipped }
  function deliver() { @order = OrderState.Delivered }
  function cancel()  { @order = OrderState.Cancelled }
}

< machine OrderMachine for OrderState>
  .Draft     => .Submitted | .Cancelled
  .Submitted => .Paid | .Cancelled
  .Paid      => .Shipped | .Cancelled
  .Shipped   => .Delivered
</>

<div>
  <p>Order: <b>${@order}</b></p>
  <button onclick=submit()>Submit</button>
  <button onclick=pay()>Pay</button>
  <button onclick=ship()>Ship</button>
  <button onclick=deliver()>Deliver</button>
  <button onclick=cancel()>Cancel</button>
</div>

</program>
```

Two pieces wire the machine to a reactive. The enum (`OrderState`) lists the states. The `< machine OrderMachine for OrderState>` block lists the legal transitions — each rule has a *from* variant on the left and one or more *to* variants on the right, separated by `=>`. The `|` alternation on the right lets a single from-state fan out to several legal destinations. Finally, the reactive's type annotation (`@order: OrderMachine`) is what binds the two together: writes to `@order` go through the machine guard instead of the default setter.

Try the example. `.Draft → .Paid` will be rejected at runtime — it is not in the rule set. `.Draft → .Submitted` succeeds. The rules themselves are also enforced by the type system: misspelling a variant (`.Draftt => .Submitted`) is a compile-time E-MACHINE-004, not a silent wrong-path at runtime.

**Why machines over plain enum state?** Three wins over raw `@state = Status.X` writes. First, the compiler tells you exactly what the legal transitions are, in one block, where you'd otherwise have to hunt through every write site to reason about state flow. Second, the runtime guards against a whole class of sequencing bugs (the cancelled order that somehow gets shipped, the draft post that appears published without going through review). Third, once the machine exists, it is the single source of truth for "what are the next legal actions?", which is often exactly what the UI wants to ask ("which buttons should be enabled right now?").

**Payload variants in transitions (§1b).** If the enum has payload variants, machine rules can bind the payload with a guard. A `.Charging(n) => .Firing given (n > 50)` rule reads as "from Charging(n) to Firing, provided n > 50." The `given` clause is a boolean expression over the bound payload fields. Unguarded siblings after a guarded rule act as the fallback. This is how you write "you can only fire if the power bank is more than half full, otherwise you fall back to discharged."

**Derived machines — one enum projected onto another (§51.9).** Sometimes the natural thing is not a new machine but a *read-only view* of an existing one. A pipeline state might drive a UI mode (editable / read-only / terminal); an auth state might drive a permissions enum. Write this as a `derived from` machine:

```scrml
// 02l — Derived (projection) machine. A derived machine projects one enum
// onto another at read time. Writes to the projected reactive are rejected
// at compile time (E-MACHINE-017) — the projection is read-only and
// auto-updates whenever the source changes.

<program>

${
  type OrderState:enum = { Draft, Submitted, Paid, Shipped, Delivered, Cancelled }
  type UIMode:enum     = { Editable, ReadOnly, Terminal }

  @order: OrderMachine = OrderState.Draft
}

< machine OrderMachine for OrderState>
  .Draft     => .Submitted | .Cancelled
  .Submitted => .Paid | .Cancelled
  .Paid      => .Shipped | .Cancelled
  .Shipped   => .Delivered
</>

< machine UI for UIMode derived from @order>
  .Draft                             => .Editable
  .Submitted | .Paid | .Shipped      => .ReadOnly
  .Delivered | .Cancelled            => .Terminal
</>

<p>Mode: <b>${@ui}</b></p>

</program>
```

The derived machine `UI` projects the source `@order` into `UIMode` variants. The projected reactive's name is derived from the machine name with the leading uppercase run lowercased — `UI` → `@ui`, `OrderStatus` → `@orderStatus`. You never declare `@ui` directly; the compiler materializes it for you, and writes to it are rejected at compile time (`E-MACHINE-017` — "projected variables are read-only"). Whenever `@order` changes, the runtime marks `@ui` dirty and re-evaluates on the next read; the markup interpolation `${@ui}` re-renders automatically.

**When to reach for each.** A plain enum plus match is enough when the state is small and every write site is obviously in the same few functions. Add a `< machine>` once the transition story matters — to document legal paths, to gate invalid ones, or to ask "what's next from here?" programmatically. Add a `derived` machine once the UI (or any other downstream reactive) has a derivable view of a state machine's output: it is cheaper than a manual `const @` derivation, and it gives you a single named enum type to match on in the UI instead of a chain of conditions over the source.

The snippets `02j-machine.scrml`, `02k-payload-variants.scrml`, and `02l-derived-machine.scrml` in `docs/tutorial-snippets/` are the working programs for this section. Compile them and flip states through the buttons to see the runtime guarding and the derived projection in action.

### Checkpoint

With Layer 2 in hand you can build non-trivial client-side UIs. You can iterate typed collections, destructure enums exhaustively, decompose the UI into components with slots, and separate pure code from impure code. Every subsequent section layers features on top of these primitives.

A few patterns are worth noticing because they will recur in the rest of the tutorial. First, the enum-plus-match pattern for "one of several possible states" is universal: UI views (idle/loading/success/failure), validation outcomes (ok/EmptyName/TooShort), and server error responses all take this shape. Whenever you reach for a string constant to represent "what kind of thing this is," step back and ask whether an enum with match would be clearer. Usually it is.

Second, the `fn`-then-`function` discipline pays for itself surprisingly quickly. Pure `fn`s are trivially testable with `~{ ... }`, portable across the client/server boundary, and cheap to reason about. Client `function`s are where state changes, and there are usually only a handful of them per program. Keeping those two kinds of code visually and syntactically distinct makes the program easier to read months later.

Third, components — even tiny ones — are the unit of reuse. If a markup fragment appears twice in a program, promote it to a component; you get independent state scope, typed props, and a name that documents what the thing is. The friction of creating a component is `const Name = <...>`; it is cheap enough that you should do it whenever there is a reason.

If any of Layer 2 felt fuzzy, compile the snippets and poke at them. The snippet files in `docs/tutorial-snippets/` are each a working program you can modify: change `Status` to have a fourth variant and watch the compiler flag the match; change a prop's type and watch the call site complain. The learning loop is fast.

---

## Layer 3 — Full-stack

Layer 3 turns your program into a full-stack app. In this layer you will connect to SQLite with `<db>`, write parameterized SQL with `?{ ... }`, mark functions as server-side, guard routes with `protect=`, handle failures as typed enum variants, and write inline tests.

### 3.1 The `<db>` state block

The `<db>` element opens a database connection that the program's server functions can use. It takes a `src` pointing to a SQLite file (paths are relative to the program), and a `tables` list naming the tables this program is allowed to touch.

```scrml
// 03a — Full `<db>` block wrapping a minimal todo UI.

<program>

<db src="tasks.db" tables="tasks">

  ${
    @tasks = []

    server function loadTasks() {
      lift ?{`SELECT id, title FROM tasks ORDER BY id`}.all()
    }

    if (@tasks.length == 0) {
      @tasks = loadTasks()
    }
  }

  <div>
    <h1>Tasks</h1>
    <ul>
      ${
        for (let t of @tasks) {
          lift <li>${t.title}</li>
        }
      }
    </ul>
  </div>

</>

</program>
```

The entire UI — its logic block, its markup, everything — is nested *inside* the `<db>` block. This is intentional: the nesting makes the scope of database access visually obvious. Outside a `<db>` element, `?{ ... }` blocks are a compile error, because there is no connection in scope.

> **Hazard:** an early design sketch spelled this `<program db="tasks.db">`. That form is **wrong**; the correct spelling is a nested `<db src="..." ...>` state block. If you see the attribute form anywhere, it is out of date.

The `tables` attribute is a safety fence. Listing a table there says "this program is allowed to query this table." Queries against other tables fail to compile. This is not authentication (that is `auth=` and `protect=` — coming up in Section 3.4) but architectural hygiene: it prevents one page of your app from accidentally poking at another page's data.

You can open more than one `<db>` block in a single program. Each block contains its own set of server functions and SQL queries. A reporting page might read from `orders.db` and `customers.db` in side-by-side `<db>` blocks; the compiler treats them as independent connections with independent prepared-statement pools.

The `<db>` element is a state block, not a component — it does not render visible UI. It exists at compile time to wrap its contents in the connection scope, and at run time to open the actual connection. The markup inside renders normally; the `<db>` boundary itself produces no DOM.

### 3.2 SQL with `?{}`

A `?{ ... }` block holds a parameterized SQL statement. The content is a backtick-delimited string; JavaScript template interpolation (`${var}`) is used for parameters, and the compiler turns those into prepared-statement placeholders, so user input never becomes concatenated SQL.

```scrml
// 03b — ?{} SQL. Backtick strings. .all() for SELECT, .run() for INSERT.

<program>

<db src="tasks.db" tables="tasks">

  ${
    @tasks = []
    @draft = ""

    server function loadTasks() {
      lift ?{`SELECT id, title FROM tasks ORDER BY id`}.all()
    }

    server function addTask(title) {
      ?{`INSERT INTO tasks (title) VALUES (${title})`}.run()
    }

    function submit() {
      if (@draft == "") return
      addTask(@draft)
      @tasks = loadTasks()
      @draft = ""
    }

    if (@tasks.length == 0) {
      @tasks = loadTasks()
    }
  }

  <form onsubmit=submit()>
    <input type="text" bind:value=@draft/>
    <button type="submit">Add</button>
  </form>
  <ul>
    ${ for (let t of @tasks) { lift <li>${t.title}</li> } }
  </ul>

</>

</program>
```

A `?{ ... }` expression produces a prepared-statement value. Its two common methods are `.all()` (run a `SELECT` and return rows) and `.run()` (run an `INSERT`, `UPDATE`, or `DELETE` for side effect). The interpolated `${title}` in the insert is a bound parameter — even if `title` contains quotes or semicolons, it is treated as data, not SQL.

There is no escape hatch for string-concatenated SQL. Every value you want to mention inside a `?{ ... }` backtick string must go through an `${ ... }` interpolation, and every such interpolation is a bound parameter. Column and table names cannot be parameterized the same way — if you need dynamic schema (pick a column based on user input), you structure that with a `match` in scrml code that selects one of a finite set of fully literal queries. Injection is impossible by construction.

`.all()` returns an array of rows typed against the schema of the `SELECT`. If the columns are `id, title`, each row has `.id` and `.title`, with types inferred from the table. `.run()` returns a small metadata object (`{ changes, lastInsertRowid }`) that you can use when you need the new row's id immediately.

A third method, `.get()`, returns the first row of a `SELECT` or `null` if there are no rows. Use it for "fetch by id" queries where at most one row is expected. As with the other methods, the compiler types the return based on the query text.

Inside a server function, the `lift` keyword in `lift ?{ ... }.all()` marks the return value as the one to send back over the wire. Without `lift`, the statement is executed for its side effect and the function returns nothing. The idiom in the snippet (`server function loadTodos() { lift ?{...}.all() }`) is therefore "run this query on the server and ship the rows back to the caller."

### 3.3 Server functions and the boundary

A function prefixed with `server` runs on the server. It can call `?{ ... }` blocks, read server-only modules, and do I/O. It is called from the client the same way any local function is called — by name, with arguments — and the compiler wires the transport.

The one rule that distinguishes server functions from client functions is that **server functions must not assign to `@vars`**. State transitions belong on the client; the server's job is to fetch and persist. A client function can (and routinely does) call a server function for data, then update state with the result.

```scrml
// 03c — Division of labor.
// Client function owns @state transitions.
// Server function persists only — it must NOT assign @vars (E-RI-002).

<program>

<db src="tasks.db" tables="tasks">

  ${
    @tasks = []
    @draft = ""

    // Server: persistence only. No @state assignments here.
    server function persistTask(title) {
      ?{`INSERT INTO tasks (title) VALUES (${title})`}.run()
    }

    server function loadTasks() {
      lift ?{`SELECT id, title FROM tasks ORDER BY id`}.all()
    }

    // Client: owns @state.
    function addTask() {
      if (@draft == "") return
      persistTask(@draft)
      @tasks = loadTasks()
      @draft = ""
    }

    if (@tasks.length == 0) {
      @tasks = loadTasks()
    }
  }

  <form onsubmit=addTask()>
    <input type="text" bind:value=@draft/>
    <button type="submit">Add</button>
  </form>

</>

</program>
```

Notice the shape: `persistTask` and `loadTasks` are `server` — they work with the database. `addTask` is plain `function` — it owns `@draft` and `@tasks` transitions and calls the server functions between them. This is the grain of the language: server code persists, client code drives the UI, and the boundary between them is a function call.

> **Error you might hit:** E-RI-002 — a server function that assigns to an `@var`. The error message will point at the line; the fix is always the same: move the assignment into the calling client function.

The reason for the rule is pragmatic. Server functions run on the server, in response to an RPC. They do not share memory with the client's `@var` store; a write to `@var` on the server would update a copy that no one else ever sees, leaving the real client-side state stale. Rather than papering over this with silent semantics, the compiler forbids the write outright.

This pattern is worth internalizing because it scales cleanly. Servers fetch and persist; clients own the UI's state machine. Server functions are small, composable, and can be called from anywhere on the client side. Client functions orchestrate: call the server, update state, clear inputs, advance the view. When you find yourself writing a server function that looks complicated, it is usually because some of its logic should have been on the client.

Calling a server function from a client function is a normal call. The arguments are serialized, shipped over HTTP, and the return value is shipped back. Errors propagate normally — a thrown exception on the server becomes a rejected call on the client, which bubbles to the nearest `<errorBoundary>` (Section 3.5). The network transport is invisible to your code, but you still need to think about latency: a call that would be instant locally might take 50–500ms over the wire.

> **Note:** `server function` is the declaration form. You can also mark a single function as server-only with an `@server` prefix in some older snippets; prefer the `server function` form in new code, which is the canonical spelling.

### 3.4 `protect=`

Some columns — password hashes, API keys, private user fields — must never be sent to the browser, regardless of whose code is doing the sending. `<db protect="...">` tells the compiler which columns are server-only. A `SELECT` that includes a protected column is rejected *in the client bundle*: the query can still be issued from server code, but any attempt to compile code that ships that column to the browser is a hard error.

```scrml
// 03d — protect=. Columns listed in protect="..." are server-only:
// the compiler refuses to ship them to any client bundle. Use for
// password hashes, API keys, anything the browser must never see.

<program auth="required">

<db src="users.db" protect="password_hash" tables="users">

  ${
    @users = []

    server function loadUsers() {
      // We SELECT without password_hash — protected column isn't pulled to client.
      lift ?{`SELECT id, email FROM users ORDER BY id`}.all()
    }

    if (@users.length == 0) {
      @users = loadUsers()
    }
  }

  <ul>
    ${ for (let u of @users) { lift <li>${u.email}</li> } }
  </ul>

</>

</program>
```

Two things to note. First, `<program auth="required">` at the top requires that every request to this page be authenticated; unauthenticated visitors see the auth fallback. Second, the query in `loadUsers` deliberately does *not* select `password_hash` — a defensive measure — but `protect=` is the compile-time enforcement that would catch a mistake if someone added `password_hash` to the `SELECT` later.

You can list multiple protected columns: `protect="password_hash, totp_secret, api_key"`. Any query that pulls any of these into a client-reachable code path is rejected. Server-to-server work — hashing the password during login, for instance — can still read them freely, because that code path does not cross the client boundary.

`auth="required"` interacts with the rest of the program. Inside a protected program you have access to the authenticated user's identity through a `@@user` global (the double-`@` marks it as a framework-provided reactive). A login program would write `@@user` on successful authentication; a logout would clear it. The details of what an authenticated user looks like — fields, session lifetime, refresh behavior — are covered in the SPEC; for the purposes of this tutorial, `auth="required"` is a switch you flip when the page must be behind login.

The pair of `auth=` and `protect=` gives you the two halves of web security that are easy to get wrong: who can see the page, and which fields leave the server. Both are compile-time enforced, so a refactor cannot silently violate them.

### 3.5 Error handling: `renders`, `fail`, `!{}`, `<errorBoundary>`

scrml models errors as enum variants. A variant can carry a `renders` clause that says how to display itself in the UI. A function that can fail is declared with `!` after its parameter list and the error type after the return arrow. Callers handle each variant with `!{ ... }`; unhandled failures bubble up to the nearest `<errorBoundary>`, which renders the variant's `renders` markup in place.

```scrml
// 03e — Errors as types. Enum variants with `renders` clauses display themselves.
// A failable function `fail`s a variant. The caller uses !{} to handle each arm.
// Unhandled failures bubble up to the nearest <errorBoundary>.

<program>

${
  type Err:enum = {
    EmptyName
      renders <p class="text-red-600">Name required.</>
    TooShort(n: number)
      renders <p class="text-red-600">Needs at least ${n} chars.</>
  }

  @name = ""

  function validate()! -> Err {
    if (@name == "")          fail Err::EmptyName
    if (@name.length < 3)     fail Err::TooShort(3)
  }

  function save() {
    validate() !{
      | ::EmptyName    -> { }
      | ::TooShort n   -> { }
      | _              -> { }
    }
  }
}

<errorBoundary>
  <div>
    <input type="text" bind:value=@name/>
    <button onclick=save()>Save</button>
  </div>
</>

</program>
```

Several pieces are doing work here. `type Err:enum = { EmptyName renders ... TooShort(n: number) renders ... }` declares a two-variant error type; each variant's `renders` clause is markup parameterized over its payload (the `TooShort` variant can read its `n` inside its own markup).

`function validate()! -> Err` declares that `validate` can fail with an `Err`. Inside the body, `fail Err::EmptyName` and `fail Err::TooShort(3)` raise a specific variant.

At the call site, `validate() !{ | ::EmptyName -> { } | ::TooShort n -> { } | _ -> { } }` pattern-matches each variant: the `::EmptyName` arm handles the no-payload variant, the `::TooShort n` arm binds the payload number to `n`, and `_` is the catch-all. If the arm blocks are empty (as above), the error bubbles; the surrounding `<errorBoundary>` catches it and renders the variant's own `renders` markup at the boundary's location.

This pattern makes error messages a piece of the type system rather than a string-concatenation afterthought. A new variant with a new `renders` clause is a new branch in every `!{ ... }` that matches the type, and the compiler tells you where the holes are.

Three idioms cover most real-world use. First, "handle everything inline": every arm does something specific, the catch-all is absent or sets state. Second, "handle one, let the rest bubble": one arm is the case you know how to fix here, everything else falls through to the boundary. Third, "handle none, let the boundary render": `validate() !{ | _ -> { } }` catches the failure at the call site but does no work, which triggers the boundary's default rendering behavior.

`<errorBoundary>` can wrap any subtree. You can nest them: an inner boundary around a risky widget catches that widget's errors, an outer boundary catches anything the inner one missed. Each boundary renders the error at its own location in the DOM, which gives you control over where the UI degrades when something fails. A shopping cart's "checkout" button can have its own `<errorBoundary>` so a payment error shows next to the button, not at the page root.

Beyond the client-side story, errors work across the client/server boundary. A server function that `fail`s a variant propagates that failure through the RPC back to the calling client function. The `!{ ... }` on the client handles it the same way as a local failure — the network transport is invisible. This is the one place you will notice, though, that network latency is real: a `fail` from the server round-trips before you see it, which is one more reason to keep validation logic on the client when you can.

### 3.6 Inline tests with `~{}`

A `~{ ... }` block holds inline tests. Tests are stripped from production builds entirely — they are not shipped to the browser and not compiled into the server bundle. Inside a `~{ ... }` block, `test "name" { ... }` declares a single case, and `assert` checks a condition.

```scrml
// 03f — Inline tests. ~{} blocks are stripped from production builds.

<program>

${
  @count = 0
  function inc() { @count = @count + 1 }
}

<button onclick=inc()>+ ${@count}</button>

~{ "counter"
  test "increments by one" {
    @count = 0
    inc()
    assert @count == 1
  }
}

</program>
```

Tests live next to the code they test, which makes them easy to find and easy to delete when the code they cover is refactored. They are most useful for pure `fn`s (Section 2.9), but they can also drive client functions — a test is allowed to read and write `@vars` directly, which simulates a user action.

The string after `~{` (here, `"counter"`) is the test group's name. You can have multiple groups in a single file and multiple `test` cases in a single group. `assert condition` fails the test if the condition is false; `assert condition, "message"` includes a message in the failure.

The run command is `bun compiler/bin/scrml.js test <file>.scrml`, which compiles the file in test mode (tests included) and runs every `test` case it finds. Because `~{ ... }` blocks are stripped from production builds, you pay nothing for having them in your source; you can leave hundreds of tests inline and the deployed JavaScript will not grow by a byte.

For testing server functions, the idiom is to write a pure `fn` that does the computation and a thin `server function` wrapper that does only the I/O. The `fn` gets the unit tests; the wrapper gets integration coverage from end-to-end tests. This matches the discipline of separating pure from impure code that Section 2.9 argued for.

### Checkpoint

You can now build a full-stack scrml app. You can declare a database connection, write parameterized SQL, split persistence from UI transitions, protect columns from the client, model errors as types, and test inline. The rest of the tutorial is optional — features that solve real problems but that you only reach for when you need them.

A full-stack app in scrml has a recognizable shape by now. At the top, a `<program>` with any required `auth=` setting. Inside, a `<db>` block declaring the connection and protected columns. Inside that, a `${ ... }` logic block with: types (including an `Err` enum if the program can fail), `@vars` for UI state, pure `fn`s for validation, server functions for persistence and load, and client functions that orchestrate. Below the logic block, the markup: forms bound to `@vars`, lists iterated by `for`/`lift`, feedback rendered by `match` on the error or status enums, all wrapped in an `<errorBoundary>`. Next to the markup, a `#{ ... }` block or Tailwind utilities for styling. At the bottom, a `~{ ... }` test block covering the validators and at least one client flow.

That shape is the idiomatic scrml file. Once it feels natural, the language is no longer doing anything new at you — you are just combining primitives you already know.

A practical note on performance. The compiler generates efficient reactive code: only the nodes that subscribe to a changed `@var` re-render, not the whole tree. Server functions are served from a lightweight router that knows which functions each page might call, so cold-path overhead is minimal. SQLite via the Bun runtime is extremely fast for the sizes most web apps actually have. The defaults are good enough that you can ship production apps without profiling; optimize only when a real measurement says you need to.

A practical note on deployment. A compiled scrml program is a small bundle: one JavaScript file for the client, one for the server, a CSS file, and an HTML shell. The server bundle runs under Bun; any host that can run a Bun process can run a scrml app. For static-only programs (no `<db>`, no server functions), the output is a static site — there is no server at all.

---

## Layer 4 — Appendices

Everything in Layer 4 is a tool for a specific situation. You can skim these and come back when you hit the problem each one solves.

### 4.1 Compile-time metaprogramming with `^{}` and `emit()`

A `^{ ... }` block runs at *compile time*, not at run time. Inside it, `emit(markupString)` splices the string's content into the AST at the block's location. Use this to generate repetitive markup from a data source without paying for it at runtime.

```scrml
// 04a — Compile-time meta. ^{} runs at build; emit() splices markup into the AST.

<program>

${
  const colors = [
    { name: "blue",  hex: "#2563eb" },
    { name: "green", hex: "#16a34a" },
    { name: "red",   hex: "#dc2626" },
  ]
}

<div class="palette">
  ^{
    for (const c of colors) {
      emit(`<div class="chip" style="background:${c.hex}">${c.name}</div>`)
    }
  }
</div>

</program>
```

The output HTML contains three plain `<div class="chip">` elements with the colors baked in. There is no runtime iteration — the loop disappears at build time. This is useful for palettes, icon sets, enumerated tables of constants, and anywhere else that the data is known statically and the repetition is boilerplate.

> **Note:** `^{ ... }` is a cousin of `${ ... }` but inverted: runtime-logic versus build-time-logic. A mnemonic is that `^` points up at the compiler.

Use cases for `^{ ... }`: generating a color palette from a design token file; building a table of form fields from a schema; producing a list of sample items from a fixture; unrolling an enumeration into a series of static links. Anywhere you would write a code generator in another stack, you can usually write a `^{ ... }` block in scrml instead.

The data you iterate over inside `^{ ... }` has to be available at compile time. A literal array as in the example works. Reading a JSON file at compile time through `import` works. Reading a runtime value (a `@var`, or a server function's return) does *not* work — those do not exist yet when the compiler runs. If you need runtime iteration, reach for `for`/`lift` inside `${ ... }` (Section 2.1), which runs in the browser.

> **Note on match syntax:** `=>` is canonical per `SPEC.md` §18.2, `->` is an accepted alias, and `:>` still compiles today but is not the style to teach. This tutorial and the in-repo examples use `=>`.

### 4.2 Reflecting types at compile time

The build-time `reflect(TypeName)` function hands you a structural description of a type — its fields, variants, payload shapes — that you can iterate inside `^{ ... }`. This is scrml's answer to runtime reflection: you do the work at build time, not at render time.

```scrml
// 04b — reflect() for compile-time type introspection.

<program>

${
  type Token:struct = {
    id:     number,
    value:  string,
    expiry: number,
  }
}

<table>
  <thead><tr><th>Field</th><th>Type</th></tr></thead>
  <tbody>
    ^{
      const info = reflect(Token)
      for (const f of info.fields) {
        emit(`<tr><td>${f.name}</td><td>${f.type}</td></tr>`)
      }
    }
  </tbody>
</table>

</program>
```

The resulting HTML has one `<tr>` per field, with the field name and type baked into static text. If you change the `Token` struct and recompile, the table updates. This pattern scales well for admin panels, schema documentation, and typed form generators.

`reflect(TypeName)` returns a structural description that differs by the type's kind. For a struct, the description has a `fields` array. For an enum, it has a `variants` array, and each variant has a name and a payload shape. For a union or type alias, it has the constituents. See the SPEC for the exact shape, but in general: anything the compiler knows about a type is queryable through `reflect()` at build time.

A common second use is form generation. Given a struct `User:struct = { name: string, email: string, age: number }`, you can iterate its fields in `^{ ... }` and emit an `<input>` per field with the correct `type` attribute. The result is a boilerplate-free form that stays in sync with the type — add a field to the struct and the form gains a new input on next recompile.

### 4.3 Web Workers via nested `<program name=>`

A nested `<program name="...">` inside another `<program>` compiles to a separate Web Worker. The parent talks to it via `<#name>.send(...)` and `when message from <#name> (data) { ... }`. Inside the worker, `when message(data) { ... }` receives the message and `send(...)` replies.

```scrml
// 04c — Web worker via nested <program>. Parent sends a number,
// worker squares it, parent receives the result.

<program>

<program name="squarer">
  ${
    when message(data) {
      send({ input: data.n, result: data.n * data.n })
    }
  }
</>

${
  @n      = 7
  @result = { input: 0, result: 0 }

  function compute() {
    <#squarer>.send({ n: @n })
  }

  when message from <#squarer> (data) {
    @result = data
  }
}

<div>
  <input type="number" bind:value=@n/>
  <button onclick=compute()>Square</button>
  <p if=(@result.result != 0)>
    ${@result.input}^2 = ${@result.result}
  </p>
</div>

</program>
```

The nested program is a full scrml program in miniature — it has its own logic block, its own variables, and its own `when` handlers. The compiler emits it as a separate JavaScript file bundled as a worker, and stitches in the message-passing glue so that the `.send` call at the parent and the `when message` handler at the worker are ends of the same wire.

This is the scrml spelling of "move heavy computation off the main thread." It costs one extra nested block and gives you non-blocking UI.

The parent references the worker as `<#squarer>`, a name-based handle. You can have multiple workers in a program, each named distinctly; each produces its own bundle and its own message channel. Messages are structured-clone-copied — JSON-compatible shapes are the safe bet, same as ordinary Web Worker communication.

`when message(data) { ... }` inside the worker is a *handler*: it runs each time a message arrives. Inside the handler, `send(value)` replies to the parent. `when message from <#name> (data) { ... }` on the parent side is the matching subscription: it runs each time the worker sends something back.

Use workers for CPU-bound work that would otherwise block input: image processing, heavy iteration, parsing large files, running a language-model inference, crunching a regular-expression over megabytes of text. For I/O-bound work, server functions are usually the better fit — they run on the server, not in the browser at all.

### 4.4 Real-time with `<channel>`

A `<channel name="...">` opens a WebSocket connection shared between every client viewing the page. Inside the channel, `@shared` variables are replicated: a write from any connected client propagates to all the others. This is the scrml spelling of "live presence" — chat rooms, multiplayer cursors, real-time dashboards.

```scrml
// 04d — WebSocket channel. <channel name="..."> opens a live connection
// shared between all connected clients. @shared vars propagate automatically.

<program>

${
  @draft = ""
}

<div>
  <h1>Live Room</h1>

  <channel name="room">
    ${
      @shared tick = 0
    }
  </>

  <p>Tick: ${@tick}</p>
  <input type="text" bind:value=@draft/>
</div>

</program>
```

The `@shared tick = 0` declaration inside the channel creates a reactive variable that is *replicated* across every client joined to the `"room"` channel. Writing `@tick = @tick + 1` on any client propagates to every other client within a single event loop turn. The transport, reconnection, and fan-out are the compiler's job.

`<channel>` is the heaviest feature in this tutorial, operationally — it requires a running WebSocket server — but the syntax is about as small as it could be. If your app does not need multi-client state, skip it.

The naming of a channel is a namespace. Two programs that use `<channel name="room">` share the same room; two programs with `<channel name="room-42">` share a different room. Typical patterns: one channel per chat room, one channel per document being co-edited, one channel for a site-wide presence indicator. Channel names can be dynamic — `<channel name=@roomId>` binds the reactive `@roomId` — in which case the program rejoins the new room whenever `@roomId` changes.

`@shared` is the only new reactive qualifier. A `@shared tick = 0` behaves exactly like a normal `@var` to read it and write it, with the extra property that its value is replicated to other clients. Non-`@shared` `@vars` inside the channel remain local — each client has its own copy. Mix and match freely: shared cursor positions, local input drafts.

For message-level control (sending a payload to all other clients without going through a shared variable), there is an imperative API analogous to the Web Worker one; see the SPEC for channel methods. In most apps, `@shared` is enough, and the framework handles the transport for you.

### 4.5 Multi-file: `import` and `use`

Once a program grows past a comfortable single-file size, you split it. A helper `.scrml` module can `export` functions and values from its logic block; a main program `import`s them by path.

Here is a helper module that exports a single `fn`:

```scrml
// 04e-helper — sibling module. Exports a fn used by 04e-import.scrml.

${
  export fn greet(name: string) -> string {
    return "Hello, " + name + "!"
  }
}
```

And here is the program that imports it:

```scrml
// 04e-import — imports a fn from a sibling .scrml file and uses it in markup.

<program>

${
  import { greet } from './04e-helper.scrml'
}

<p>${greet("world")}</p>

</program>
```

Imports use ordinary ES-module syntax — named imports, relative paths, `.scrml` extension required. A helper module does *not* need a `<program>` element; it is a bag of exports. Types, `fn`s, `function`s, and `const`s can all be exported.

For larger projects, the idiomatic split is: one program per route, helper modules for shared types, shared validators, and shared server functions. The `use` keyword (analogous to `import` for language-level modules) extends the same idea to community packages; see `SPEC.md` for the full rules.

A few practical tips for multi-file projects. Types exported from a helper module can be used on both sides of the client/server boundary; scrml tracks where each export is referenced and ships it only where needed. A shared `fn` that is imported by both a client function and a server function is emitted into both bundles — you do not duplicate the source, the compiler handles it. An imported `server function` stays on the server, regardless of which program called it.

Circular imports are a compile error, same as in any ES-module stack. If you find yourself wanting a cycle, the right move is usually a third module that holds the shared types or the shared helper that both sides need.

Import paths are relative. An `import { greet } from './util/format.scrml'` inside `pages/home.scrml` resolves against `pages/`, giving `pages/util/format.scrml`. There is no implicit module resolution rule beyond what ES modules already do — if you have used any modern JavaScript bundler, you know the rules.

### 4.6 A small gallery of combinations

Before the closing section, here is a short tour of patterns that combine primitives from multiple layers. Each is a sketch rather than a full program — the goal is to show you how the pieces fit when you reach for them together.

**Optimistic update with rollback on server failure.** A client function updates `@items` immediately, calls a server function, and rolls back if the server returns an error. The client function does the state transitions; the server function does the persistence; the error enum handles the rollback branch.

```
function addOptimistic(text) {
  const snapshot = @items
  @items = [...@items, { id: "tmp", body: text }]
  persistTodo(text) !{
    | ::DbBusy -> { @items = snapshot }
    | _        -> { @items = loadTodos() }
  }
}
```

**Derived UI state from a loaded collection.** A `const @` reads reactive state (loaded `@todos`) and produces filtered views. The derived values stay in sync with the underlying collection automatically; no manual refresh call is needed.

```
${
  @todos  = []
  @filter = "all"
  const @visible = @filter == "all"
    ? @todos
    : @todos.filter(t => t.done == (@filter == "done"))
}
```

**Shared counter across clients.** Inside a `<channel>`, a `@shared count` reactive is incremented on click. Every connected client sees every click.

```
<channel name="lobby">
  ${ @shared count = 0 }
</>

<button onclick="@count = @count + 1">Clicked ${@count} times</button>
```

**Schema-driven form.** A `reflect()` call inside `^{ ... }` iterates a struct's fields, producing one input per field at compile time. The runtime handler picks up the values from a `@form` reactive whose shape matches the struct.

```
${ type Post:struct = { title: string, body: string, author: string } }
<form>
  ^{
    for (const f of reflect(Post).fields) {
      emit(`<input name="${f.name}" bind:value=@form.${f.name}/>`)
    }
  }
</form>
```

**Worker-computed derived value.** A heavy computation is delegated to a worker, and the result is stored in a reactive on the parent. The parent's UI reads the reactive as if it were a normal derived value, but the work happens off the main thread.

```
<program name="worker">
  ${ when message(data) { send(heavyCompute(data.input)) } }
</>

${
  @input  = ""
  @result = null
  function compute() { <#worker>.send({ input: @input }) }
  when message from <#worker> (data) { @result = data }
}
```

Each of these uses three to five primitives from this tutorial in combination. The language does not have special "hooks" for optimistic updates or schema-driven forms or worker-backed derivations; you build them from the basic pieces. The result is fewer rules to remember and more freedom in how you combine them.

### 4.7 Where to go next

You now know the language. From here:

- **Longer runnable apps** — see `examples/` in this repository; each is a single-file program that you can compile and run. They demonstrate the primitives from this tutorial in combinations: a chat app, a kanban, a small admin panel, and so on.
- **Full language reference** — see `compiler/SPEC.md`. It documents every primitive, every error code, and the exact grammar. This tutorial covered the common 80%; the SPEC covers the edges.
- **Error codes** — when the compiler flags an error, the code (`E-SCOPE-001`, `E-RI-002`, and so on) is your best search term. Each code has a dedicated section in the SPEC explaining the rule that was violated and the usual fix.

### Frequently-asked questions

**Why a new file format instead of TypeScript plus a framework?** Because the framework part and the server-vs-client part are exactly the piece most full-stack setups get wrong. A single file where the compiler sees the whole program eliminates the tier-split at the source level — no separate build for the client, no separate build for the server, no out-of-sync types describing an API between the two. It is a small re-arrangement at the file-format level that opens up a lot of simplification downstream.

**How big can a single `.scrml` file get before I have to split?** There is no hard limit; the compiler handles large files fine. The practical limit is reader comfort — around a few hundred lines of logic-and-markup before scrolling starts to hurt. Split into helper modules (Section 4.5) earlier if a file is doing two distinct things.

**Does scrml work with my existing database?** `<db src="...">` currently wraps a SQLite file. Other databases will follow; in the meantime, for non-SQLite databases, use server functions that call whatever client library you prefer and return results the client can consume. The `?{ ... }` ergonomics are SQLite-specific today; the rest of the language does not care.

**What's the story for server-side rendering?** Every scrml page renders server-side by default; the initial HTML that reaches the browser is fully-populated markup, and the client-side JavaScript hydrates it in place. The client/server boundary is separate from the render-side question — server functions are RPCs, server-side rendering is a render-time operation. You get both without configuring either.

**Can I use React components?** Not directly. React components assume a React runtime that scrml does not provide; the two reactivity models are distinct. If you have a React component you want to reuse, the usual path is to write a thin scrml component that wraps it with a web-component or portal. For most cases, rewriting the component in scrml is shorter than wrapping it.

**Is scrml typed strongly enough to replace TypeScript?** The type system is strong for its built-in primitives (`string`, `number`, `boolean`, struct, enum, union, optional, array). It is more focused than TypeScript: it does not do structural-subtyping gymnastics, conditional types, or mapped types. For a web app's domain modeling, this is usually enough; for library authors exposing an API, TypeScript's flexibility is sometimes useful. You can mix the two when needed.

**How does hot-reload work?** The compiler's dev server watches the source file and recompiles on save. The browser reconnects automatically and re-applies state where it can. `@vars` persist across edits when their declarations have not changed; styles update in place without a full reload; markup changes replace only the affected subtree. For most small edits, the effect is Svelte-like: change the source, see the result, state intact.

**What happens when I break the rules — for example, write to `@var` from a server function?** The compiler rejects the program with an error code (`E-RI-002` in this case), points at the offending line, and suggests the fix. These errors are the language's main teaching mechanism: if a rule exists, the compiler knows about it, and you find out at compile time rather than at runtime.

**Should I use `#{ ... }` or Tailwind?** Whichever fits the team's existing habits. There is no performance difference that matters, no idiomatic preference that the language enforces. Pick one, be consistent across a project, and reach for the other when it genuinely fits better for a specific case.

**How does testing work beyond `~{ ... }`?** Inline tests cover pure functions and small client-side flows. For browser-level end-to-end testing, the compiled output is a normal web app; any framework (Playwright, Puppeteer) works. For server-function testing, write a test that calls the function directly from inside a `~{ ... }` block and asserts the database state afterwards. The two styles cover the two ends; most projects use some of each.

---

## Glossary of primitives

A fast reference for the keywords and sigils you met in this tutorial. Each line is a pointer back to the section that explains it in context.

- `<program>` — the top-level element wrapping everything in a scrml file. Section 1.1.
- `${ ... }` — logic block (in statement position) or interpolation (in expression position). Section 1.2.
- `@var` — reactive state. Assignment creates it; reads subscribe; writes re-run subscribers. Section 1.3.
- `const @name = expr` — derived reactive, recomputed when any input changes. Section 1.4.
- `bind:attr=@var` — two-way binding on form inputs and similar. Section 1.5.
- `class:name=@var` — conditional class attachment. Section 1.5.
- `on<event>=expr` — event handlers as call expressions, not strings. Section 1.5.
- `#{ ... }` — scoped CSS, rewritten per-program. Section 1.6.
- `for (...) { lift <li>...</li> }` — iteration in markup via `for` + `lift`. Section 2.1.
- `type Name:struct = { ... }` — structural record type. Section 2.2.
- `type Name:enum = { A, B(n: number), ... }` — tagged sum type. Section 2.3.
- `match expr { .A => {...} .B(n) => {...} }` — exhaustive destructuring with positional payload binding. Section 2.4.
- `< machine Name for EnumType>` / `@var: Name = EnumType.First` — machine-governed reactive state. Section 2.10.
- `< machine P for ProjEnum derived from @source>` — projected read-only reactive. Section 2.10.
- `if=expr` / `show=expr` — mount vs. toggle-visibility. Section 2.5.
- `const Name = <...>` — component declaration as a const expression. Section 2.6.
- `${children}` — the caller's positional children inside a component body. Section 2.6.
- `props={ name: type, ... }` — typed props on a component. Sections 2.6/2.7.
- `snippet` / `slot="name"` / `${render name()}` — named slot children. Section 2.7.
- `is some`, `is not not`, `not x` — presence and negation operators. Section 2.8.
- `fn` — pure, typed function. Section 2.9.
- `function` — impure function; can mutate `@vars`. Section 1.3.
- `<db src="..." tables="..." protect="...">` — database connection scope. Sections 3.1/3.4.
- `?{ `...` }.all()` / `.run()` / `.get()` — parameterized SQL. Section 3.2.
- `server function` — a function that runs on the server. Section 3.3.
- `auth="required"` — page-level authentication gate. Section 3.4.
- `renders <...>` — per-variant rendering markup on an enum. Section 3.5.
- `function name()! -> Err { ... fail Err::Variant ... }` — failable function. Section 3.5.
- `caller() !{ | ::Variant -> {...} | _ -> {...} }` — error destructuring at call sites. Section 3.5.
- `<errorBoundary>` — catches unhandled failures; renders the variant's `renders` markup. Section 3.5.
- `~{ "group" test "..." { ... assert ... } }` — inline tests, stripped from production. Section 3.6.
- `^{ ... emit(\`...\`) ... }` — compile-time metaprogramming. Section 4.1.
- `reflect(TypeName)` — compile-time type introspection. Section 4.2.
- `<program name="...">` + `<#name>.send(...)` + `when message ... { ... }` — Web Worker. Section 4.3.
- `<channel name="..."> ${ @shared var = ... } </>` — real-time shared state. Section 4.4.
- `import { x } from './file.scrml'` / `export fn ...` — multi-file composition. Section 4.5.

If you spot a sigil in someone else's scrml code that is not in this list, the authoritative reference is `compiler/SPEC.md`. The tutorial covers the primitives you need; the SPEC covers the ones you might occasionally see.

## Footnotes and hazards

- `lin` (linear type) was sketched in early drafts of scrml as a Rust-style affine type. The concept is **queued for redesign**; the current implementation does not match the intended semantics. Do not teach, use, or rely on `lin` until the redesign lands.
- Match arm separator is `=>` (canonical per `SPEC.md` §18.2). `->` is an accepted alias; `:>` still compiles but is deprecated and should not appear in new code.
- Derived values use `const @name = expression`. The form `~name = expression` is **not supported** — if you see it in older material, treat it as an early sketch and translate to `const @`.
- Database access uses a **nested `<db src="...">` block**, not a `db=` attribute on `<program>`. The attribute form does not compile.

---

*Tags: tutorial, scrml, language introduction, full-stack, reactive, SQLite, WebSocket, Web Worker, compile-time metaprogramming.*

*For the full language reference: `compiler/SPEC.md`. For runnable apps: `examples/`. For the hook showing all of this in action: Section 0, top of this tutorial.*
