# scrmlTS

The working compiler for **scrml** — a single-file, full-stack reactive web language.
This is the TypeScript/JavaScript implementation that compiles `.scrml` source into
HTML, CSS, client JS, and server route handlers in a single pass.

scrml lets you write a complete app in one file: markup, reactive state, scoped CSS,
SQL, server functions, and inline tests — no build config, no separate server file,
no state management library.

## Quick start

```bash
# Install (Bun required)
bun install

# Compile a single file
scrml compile examples/01-hello.scrml -o dist/

# Or use the CLI directly
scrml compile <file|dir>
scrml dev <file|dir>      # watch + serve
scrml build <dir>         # production build
scrml init <dir>          # scaffold a project

# Run the test suite
bun test compiler/tests/
```

## What's in here

- `compiler/` — compiler source, the authoritative `SPEC.md` / `SPEC-INDEX.md` / `PIPELINE.md`, 5,500+ tests, and reference self-host modules
- `examples/` — 14 runnable single-file scrml apps
- `samples/compilation-tests/` — 275 compilation tests covering every accepted construct
- `stdlib/` — 13 stdlib modules
- `benchmarks/` — runtime, build, and full-stack benchmarks vs React / Svelte / Vue
- `editors/vscode/`, `editors/neovim/` — editor integrations
- `lsp/server.js` — language server
- `dist/scrml-runtime.js` — shared reactive runtime

For a full inventory of what exists, what works, and what's open, see [`master-list.md`](./master-list.md).
For agent / contributor directives, see [`pa.md`](./pa.md).



# scrml

**Stop wiring. Start building.**

scrml is a compiled language that replaces your frontend framework, your backend glue, and most of your build toolchain with a single file type. Write markup, logic, styles, and SQL together in `.scrml`. The compiler handles everything else — server/client splitting, reactivity, routing, async scheduling, type safety — and outputs plain HTML, CSS, and JavaScript.

No virtual DOM. No JSX. No separate route files. No node_modules.

```bash
scrml compile hello.scrml -o dist/
```

## Why scrml

**State is first-class.** Reactive variables (`@var`) are language primitives, not library wrappers. The compiler knows every read and write site, enforces mutability contracts statically, and generates minimal DOM updates — no diffing, no proxy overhead, no `useState` ceremony.

**Mutability contracts.** `lin` types enforce exact-once consumption. `server @var` pins state to the server with compile-time enforcement. `protect` excludes fields from client-visible types. The compiler verifies these contracts across all code paths — not at runtime, not by convention, at compile time.

**Full-stack in one file.** Markup, logic, styles, SQL, server functions, error handling, tests — everything lives in `.scrml`. The compiler analyzes your code and splits it across server and client automatically. No API layer to maintain, no route files to keep in sync.

## Quick Example

A reactive counter with increment, decrement, and a step picker — in one file:

```scrml
<program>

@count = 0
@step = 1

<div class="counter">
    <span class="value">${@count}</>

    <select bind:value=@step>
        <option value="1">1</>
        <option value="5">5</>
        <option value="10">10</>
    </select>

    <button onclick=decrement() disabled=atMinimum()>-</>
    <button onclick=reset()>Reset</>
    <button onclick=increment()>+</>
</div>

${
    function increment() { @count = @count + @step }
    function decrement() {
        if (@count - @step >= 0) { @count = @count - @step }
    }
    function reset() { @count = 0 }
    function atMinimum() { return @count - @step < 0 }
}

#{
    .counter { text-align: center; font-family: system-ui; }
    .value { font-size: 4rem; font-weight: 700; }
}

</>
```

Markup, logic, and styles live together. `@count` is reactive — changing it re-renders every element that reads it. `bind:value` keeps the select and `@step` in sync. The compiler generates direct DOM manipulation code with no runtime framework.

## Full-Stack in One File

A contact book with a database, server functions, and a reactive UI — no API layer, no ORM, no route files:

```scrml
<program db="contacts.db">

    @name = ""
    @email = ""

    <form onsubmit=addContact()>
        <input bind:value=@name placeholder="Name"/>
        <input bind:value=@email placeholder="Email"/>
        <button type="submit">Add Contact</>
    </form>

    <ul>
        ${
            for (let c of ?{`SELECT name, email FROM contacts`}.all()) {
                lift <li>${c.name} — ${c.email}</>
            }
        }
    </ul>

    ${
        server function addContact() {
            ?{`INSERT INTO contacts (name, email) VALUES (${@name}, ${@email})`}.run()
            @name = ""
            @email = ""
        }
    }

</>
```

`<program db="contacts.db">` declares the app root with a database connection. `protect` on fields excludes them from client-visible types. The `server` keyword ensures the function runs server-side. The compiler generates the route, the fetch call, and the serialization. You never see any of it.

## Benchmarks

Measured against React 19, Svelte 5, and Vue 3 on an identical TodoMVC implementation (2026-04-05).

**Bundle size (gzip):**

| Framework | JS | Total | Dependencies | node_modules |
|-----------|---:|------:|---:|---:|
| **scrml** | **13.4 KB** | **14.5 KB** | **0** | **0 bytes** |
| Svelte 5  | 15.9 KB | 17.0 KB | 41 | 29 MB |
| Vue 3     | 26.8 KB | 27.9 KB | ~30 | ~25 MB |
| React 19  | 62.2 KB | 63.3 KB | 65 | 46 MB |

**Runtime performance (headless Chrome, medians in ms, lower is better):**

| Operation | scrml | React 19 | Svelte 5 | Vue 3 |
|-----------|------:|---------:|---------:|------:|
| Create 1000 | 19.3 | **18.4** | 26.5 | 23.4 |
| Partial update | **0.4** | 3.3 | 2.9 | 9.4 |
| Swap rows | **1.3** | 17.7 | 2.2 | 6.1 |
| Select row | **0.0** | 0.3 | 0.0 | 0.0 |
| Remove row | **1.1** | 2.7 | 2.1 | 6.6 |
| Append 1000 | **19.1** | 20.3 | 34.1 | 28.0 |
| Create 10,000 | 201.6 | **183.6** | 532.1 | 230.8 |

scrml wins 6 of 10 benchmarks. Partial update is 8x faster than React; swap-rows is 14x faster. Full results in [`benchmarks/RESULTS.md`](benchmarks/RESULTS.md).

**Build time (TodoMVC, median of 10):**

| Framework | Build Time |
|-----------|---:|
| **scrml** | **30.9 ms** |
| Svelte 5  | 330 ms |
| Vue 3     | 359 ms |
| React 19  | 473 ms |

## Features

### State and Reactivity

- **Reactive state (`@var`)** — prefix any variable with `@` to make it reactive. Changes re-render dependent elements automatically. No wrappers, no hooks, no signals library.
- **Derived values (`~var`)** — tilde-prefixed variables recompute when their dependencies change. The compiler tracks the dependency graph.
- **Two-way binding (`bind:value`)** — keep form inputs and reactive variables in sync without boilerplate.
- **Mutability contracts** — `server @var` pins state server-side. `protect` hides fields from the client. The compiler enforces these at compile time, not runtime.

### Linear Types

- **Exact-once consumption (`lin`)** — values that must be used exactly once. The compiler verifies this statically across all code paths, including branches and loops.
- **Site-agnostic** — a `lin` value can be created at one site, passed through function calls, and consumed at a completely different site. No manual threading through intermediate stages. If you need the value more than once, assign it to a `const` at the consumption site.

### Server/Client

- **Auto-split** — the compiler analyzes your code and decides what runs where. Protected fields and `server` functions force server-side execution.
- **SQL passthrough (`?{}`)** — query SQLite directly inside logic blocks. The compiler generates parameterized queries and handles serialization.
- **No API boilerplate** — server functions are called like local functions. The compiler generates routes, fetch calls, CSRF tokens, and serialization.

### Components and Patterns

- **Components with props and slots** — `const Card = <div>` defines a component. Props are attributes; slots are named placeholders.
- **Enums and pattern matching** — Rust-style enums with exhaustive `match`. The compiler enforces that every variant is handled.
- **State machines** — declare `< machine>` with transition rules. The compiler prevents illegal state transitions.

### Metaprogramming

- **Compile-time meta (`^{}`)** — code that runs at compile time. Use `reflect()` to inspect types, `emit()` to generate markup, `compiler.*` to register macros. Meta blocks execute during compilation and produce source that's spliced into the AST.
- **Runtime meta** — meta blocks that reference `@var` reactive state run at runtime instead of compile time. The compiler classifies each block automatically based on what it references.

### Styles

- **Scoped CSS (`#{}`)** — styles live next to the markup they apply to. The compiler handles scoping via native `@scope`.
- **Tailwind utility classes** — first-class support for Tailwind. Use utility classes directly in markup; the compiler passes them through to the output.

### Error Handling and Testing

- **Error handling (`!{}`)** — typed error contexts with pattern-matched arms. Error propagation is inferred automatically.
- **Inline tests (`~{}`)** — write tests next to the code they verify. Stripped from production builds.

### Tooling

- **No npm — stdlib first** — scrml ships its own standard library. No package manager, no dependency trees, no node_modules.
- **`<program>` root** — configure database connections, protection rules, HTML spec version, and program-wide settings from a single root element.

## Language Contexts

scrml uses sigil-delimited contexts to separate concerns within a single file:

| Context | Sigil | Purpose |
|---------|-------|---------|
| Program | `<program>` | App root — database, protection, config |
| Markup  | `<tag>` | HTML elements and components |
| State   | `< name>` | Server-persisted state blocks (note the space) |
| Logic   | `${}` | JavaScript expressions and functions |
| SQL     | `?{}` | Database queries (bun:sqlite passthrough) |
| CSS     | `#{}` | Scoped styles |
| Error   | `!{}` | Typed error handling |
| Meta    | `^{}` | Compile-time (or runtime) code generation |
| Test    | `~{}` | Inline tests (stripped from production) |

## Getting Started

### Prerequisites

Install [Bun](https://bun.sh):

```bash
curl -fsSL https://bun.sh/install | bash
```

### Compile a file

```bash
scrml compile hello.scrml -o dist/
```

This produces `dist/hello.html`, `dist/hello.client.js`, and `dist/hello.css`. Open the HTML file in a browser.

### Development with hot reload

```bash
scrml dev
```

`dev` starts a dev server with hot reload. Write `.scrml` files and see results immediately.

### Build for production

```bash
scrml build
```

The compiler produces optimized HTML, CSS, and JavaScript. No runtime framework ships to the browser.

## Examples

The [`examples/`](examples/) directory contains curated examples that show what scrml can do:

| Example | What it shows |
|---------|---------------|
| [01-hello](examples/01-hello.scrml) | Bare minimum — compiles to pure HTML |
| [02-counter](examples/02-counter.scrml) | Reactive state, binding, scoped CSS |
| [03-contact-book](examples/03-contact-book.scrml) | Full-stack with DB, server functions, SQL |
| [04-live-search](examples/04-live-search.scrml) | Reactive filtering, derived state |
| [05-multi-step-form](examples/05-multi-step-form.scrml) | Components, enums, pattern matching |
| [06-kanban-board](examples/06-kanban-board.scrml) | Enum-driven UI, reusable components |
| [07-admin-dashboard](examples/07-admin-dashboard.scrml) | Metaprogramming, type reflection |
| [08-chat](examples/08-chat.scrml) | Reactive lists, server persistence |
| [09-error-handling](examples/09-error-handling.scrml) | Exhaustive error matching with `!{}` |
| [10-inline-tests](examples/10-inline-tests.scrml) | `~{}` inline tests, stripped from production |
| [11-meta-programming](examples/11-meta-programming.scrml) | `^{}` meta blocks, `emit()`, `reflect()` |
| [12-snippets-slots](examples/12-snippets-slots.scrml) | Named content slots in components |
| [13-worker](examples/13-worker.scrml) | Web workers as nested programs with typed messaging |
| [14-mario-state-machine](examples/14-mario-state-machine.scrml) | Enum state machine with machine binding |

## Documentation

- [Tutorial](docs/tutorial.md) — step-by-step introduction, zero to full-stack
- [Design Notes](DESIGN.md) — rationale and philosophy — why scrml is what it is
- [Language Specification](compiler/SPEC.md) — full formal spec (~18,000 lines)
- [Spec Quick-Lookup](compiler/SPEC-INDEX.md) — find any section fast
- [Pipeline Contracts](compiler/PIPELINE.md) — stage-by-stage compiler pipeline

## Status

scrml is in closed beta under a proprietary license. We are sharing it with a small group of developers to refine the language before a broader release.

**The plan:** scrml will be released as MIT open source after the beta period. We want to get the language right first.

The compiler runs on [Bun](https://bun.sh). Compiled output is plain JavaScript that runs in any browser or JavaScript runtime.
