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
bun compiler/src/cli.js compile examples/01-hello.scrml -o dist/

# Or use the CLI directly
bun run compiler/src/cli.js compile <file|dir>
bun run compiler/src/cli.js dev <file|dir>      # watch + serve
bun run compiler/src/cli.js build <dir>         # production build
bun run compiler/src/cli.js init <dir>          # scaffold a project

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
bun compiler/src/cli.js compile hello.scrml -o dist/
```

## Quick Example

A reactive counter with increment, decrement, and a step picker — in one file:

```scrml
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
```

Markup, logic, and styles live together. `@count` is reactive — changing it re-renders every element that reads it. `bind:value` keeps the select and `@step` in sync. The compiler generates direct DOM manipulation code with no runtime framework.

## Full-Stack in One File

A contact book with a database, server functions, and a reactive UI — no API layer, no ORM, no route files:

```scrml
< db src="contacts.db" protect="password_hash" tables="contacts">

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

The `< db>` block declares a state object with database access. (You can also use `<program db="...">` to attach a database to the program root -- see the [tutorial](docs/tutorial.md) for that form.) `protect="password_hash"` excludes that field from client-visible types. The `server` keyword ensures the function runs server-side. The compiler generates the route, the fetch call, and the serialization. You never see any of it.

## Benchmarks

Measured against React 19, Svelte 5, and Vue 3 on an identical TodoMVC implementation:

**Bundle size (gzip):**

| Framework | Total |
|-----------|------:|
| **scrml** | **11.4 KB** |
| Svelte 5  | 16.4 KB |
| Vue 3     | 27.1 KB |
| React 19  | 61.6 KB |

**Runtime performance (selected operations):**

| Operation | scrml | React 19 | Svelte 5 | Vue 3 |
|-----------|------:|---------:|---------:|------:|
| Add 1000 items | 57.7ms | 84.8ms | 37.4ms | 69.3ms |
| Select row | 0.013ms | 5.54ms | 0.065ms | 0.045ms |
| Replace 1000 | 63.2ms | 88.1ms | 44.3ms | 64.2ms |
| Create 10,000 | 527ms | 817ms | 396ms | 556ms |

scrml beats React on 8 of 11 benchmarks and is competitive with Svelte and Vue across the board. Full results in [`docs/m1-benchmark-results.md`](docs/m1-benchmark-results.md).

## Features

- **Reactive state (`@var`)** — prefix any variable with `@` to make it reactive. Changes re-render dependent elements automatically.
- **Server/client auto-split** — the compiler analyzes your code and decides what runs where. Protected fields force server-side execution.
- **SQL passthrough (`?{}`)** — query SQLite directly inside logic blocks. The compiler generates parameterized queries and handles serialization.
- **Components with props and slots** — `const Card = <div>` defines a component. Props are attributes; slots are named placeholders.
- **Two-way binding (`bind:value`)** — keep form inputs and reactive variables in sync without boilerplate.
- **Enums and pattern matching** — Rust-style enums with exhaustive `match`. The compiler enforces that every variant is handled.
- **Linear types (`lin`)** — values that must be consumed exactly once. The compiler verifies this statically across all code paths.
- **Metaprogramming (`^{}`)** — compile-time code generation with type reflection. Inspect your types and emit markup at compile time.
- **Scoped CSS (`#{}`)** — styles live next to the markup they apply to. The compiler handles scoping via native `@scope`.
- **Error handling (`!{}`)** — typed error contexts with pattern-matched arms. Error propagation is inferred automatically.
- **No npm — stdlib first** — scrml ships its own standard library. No package manager, no dependency trees, no node_modules.

## Language Contexts

scrml uses sigil-delimited contexts to separate concerns within a single file:

| Context | Sigil | Purpose |
|---------|-------|---------|
| Markup  | `<tag>` | HTML elements and components |
| State   | `< name>` | Server-persisted state blocks (note the space) |
| Logic   | `${}` | JavaScript expressions and functions |
| SQL     | `?{}` | Database queries (bun:sqlite passthrough) |
| CSS     | `#{}` | Scoped styles |
| Error   | `!{}` | Typed error handling |
| Meta    | `^{}` | Compile-time code generation |
| Test    | `~{}` | Inline tests (stripped from production) |

## Getting Started

### Prerequisites

Install [Bun](https://bun.sh):

```bash
curl -fsSL https://bun.sh/install | bash
```

### Compile a file

```bash
bun compiler/src/cli.js compile hello.scrml -o dist/
```

This produces `dist/hello.html`, `dist/hello.client.js`, and `dist/hello.css`. Open the HTML file in a browser.

### Development with hot reload

```bash
bun compiler/src/cli.js dev
```

`dev` starts a dev server with hot reload. Write `.scrml` files and see results immediately.

### Build for production

```bash
bun compiler/src/cli.js build
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
| [14-mario-state-machine](examples/14-mario-state-machine.scrml) | Enum state machine with structs and nested match |

## Documentation

- [Tutorial](docs/tutorial.md) — step-by-step introduction
- [Language Overview](docs/language-overview.md) — working mental model, no spec-reading required
- [API Reference](docs/api-reference.md) — quick-reference for syntax and error codes
- [Language Specification](compiler/SPEC.md) — full formal spec
- [Design Notes](DESIGN.md) — rationale and philosophy

## Status

scrml is in closed beta under a proprietary license. We are sharing it with a small group of developers to refine the language before a broader release.

**The plan:** scrml will be released as MIT open source after the beta period. We want to get the language right first.

The compiler runs on [Bun](https://bun.sh). Compiled output is plain JavaScript that runs in any browser or JavaScript runtime.
