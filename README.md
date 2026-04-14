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

For recent fixes and work currently in flight, see [`docs/changelog.md`](./docs/changelog.md).



# scrml

**Stop wiring. Start building.**

scrml is a compiled language that replaces your frontend framework, your backend glue, and most of your build toolchain with a single file type. Write markup, logic, styles, and SQL together in `.scrml`. The compiler handles everything else — server/client splitting, reactivity, routing, async scheduling, type safety — and outputs plain HTML, CSS, and JavaScript.

No virtual DOM. No JSX. No separate route files. No node_modules.

```bash
scrml compile hello.scrml -o dist/
```

## Why scrml

**State is first-class.** Reactive variables (`@var`) are language primitives, not library wrappers. The compiler knows every read and write site, enforces mutability contracts statically, and generates minimal DOM updates — no diffing, no proxy overhead, no `useState` ceremony.

**Mutability contracts.** Declare a `<machine>` for an enum type and every legal state transition is explicit — you define the states and transitions, the compiler enforces them. For example, a door lock with `.Locked => .Unlocked` and `.Unlocked => .Locked` means the compiler rejects any assignment that skips a step. Because mutation is fully declared, a `fn` can trigger transitions and read before/after state while remaining provably pure. `lin` enforces exact-once consumption. `server @var` pins state server-side. `protect` excludes fields from the client. All verified statically.

**Full-stack in one file.** Markup, logic, styles, SQL, server functions, error handling, tests — everything lives in `.scrml`. The compiler analyzes your code and splits it across server and client automatically. No API layer to maintain, no route files to keep in sync.

**The compiler eliminates N+1 automatically.** Because scrml owns both the query context and the loop context, a `for (let x of xs) { ?{... WHERE id = ${x.id}}.get() }` pattern is rewritten to one pre-loop `WHERE id IN (...)` fetch plus a keyed `Map` lookup — no DataLoader, no manual batching, no architectural pressure. Independent reads in a `!` handler share one `BEGIN DEFERRED`..`COMMIT` envelope for snapshot consistency. On-mount `server @var` loads across a page coalesce into a single `__mountHydrate` round-trip. Near-miss loops surface as `D-BATCH-001` diagnostics with the exact disqualifier; `?{...}.nobatch()` is the per-site escape hatch. [Measured Tier 2 wins](benchmarks/sql-batching/RESULTS.md): ~2× at N=10, ~3× at N=100, ~4× at N=1000 on on-disk WAL `bun:sqlite`.

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

Measured against React 19, Svelte 5, and Vue 3 on an identical TodoMVC implementation (2026-04-13).

**Bundle size (gzip):**

| Framework | JS | Total | Dependencies | node_modules |
|-----------|---:|------:|---:|---:|
| **scrml** | **14.8 KB** | **15.9 KB** | **0** | **0 bytes** |
| Svelte 5  | 15.9 KB | 17.0 KB | 33 | 29 MB |
| Vue 3     | 26.8 KB | 27.9 KB | 22 | 38 MB |
| React 19  | 62.1 KB | 63.2 KB | 38 | 46 MB |

**Runtime performance (headless Chrome, medians in ms, lower is better):**

| Operation | scrml | React 19 | Svelte 5 | Vue 3 |
|-----------|------:|---------:|---------:|------:|
| Create 1000 | 19.8 | **19.2** | 27.2 | 24.6 |
| Partial update | **0.4** | 3.3 | 2.9 | 9.2 |
| Swap rows | **1.3** | 17.0 | 2.2 | 5.8 |
| Select row | **0.0** | 0.3 | 0.0 | 0.1 |
| Remove row | **1.2** | 2.8 | 2.2 | 6.6 |
| Append 1000 | **19.3** | 21.1 | 35.2 | 29.7 |
| Create 10,000 | 209.5 | **181.9** | 534.9 | 244.0 |

scrml wins 6 of 10 benchmarks. Partial update is 8x faster than React; swap-rows is 13x faster. Full results in [`benchmarks/RESULTS.md`](benchmarks/RESULTS.md).

**Build time (TodoMVC, median of 10):**

| Framework | Build Time |
|-----------|---:|
| **scrml** | **43.7 ms** |
| Svelte 5  | 345 ms |
| Vue 3     | 379 ms |
| React 19  | 506 ms |

## Features

### State and Reactivity

- **Reactive state (`@var`)** — prefix any variable with `@` to make it reactive. Changes re-render dependent elements automatically. No wrappers, no hooks, no signals library.
- **Derived values (`~var`)** — tilde-prefixed variables recompute when their dependencies change. The compiler tracks the dependency graph.
- **Two-way binding (`bind:value`)** — keep form inputs and reactive variables in sync without boilerplate.
- **Absence value (`not`)** — a unified null/undefined replacement. `@result = not` means "no value yet." Check presence with `is some`, absence with `is not`. The compiler catches `== not` misuse at compile time (use `is not` instead).
- **Mutability contracts** — `server @var` pins state server-side. `protect` hides fields from the client. The compiler enforces these at compile time, not runtime.

### Linear Types

- **Exact-once consumption (`lin`)** — values that must be used exactly once. The compiler verifies this statically across all code paths, including branches and loops.
- **Site-agnostic** — a `lin` value can be created at one site, passed through function calls, and consumed at a completely different site. No manual threading through intermediate stages. If you need the value more than once, assign it to a `const` at the consumption site.

### Type Safety

- **`asIs` (not `any`)** — scrml has no `any` type. There is no "turn off the type checker" escape hatch. `asIs` accepts any type but forces you to resolve it to a concrete type before use or return — analogous to TypeScript's `unknown`, not `any`. Component bare props follow `asIs` rules: the compiler infers the concrete type from how you use the prop.

### Runtime Type Validation (replaces Zod)

scrml has built-in runtime type validation. The type annotation IS the validation schema — no separate schema library, no `z.object()` wrappers, no `z.infer<typeof>` indirection.

```scrml
@price: number(>0 && <10000) = userInput
@email: string(email) = formValue
@password: string(.length > 7 && .length < 255) = rawInput

type Invoice:struct = {
    amount: number(>0 && <10000)
    recipient: string(email)
}

fn process(amount: number(>0 && <10000)) {
    // amount is proven valid here — zero runtime checks inside the function
    let discounted = amount * 0.9
    let safe: number(>0 && <10000) = discounted  // boundary check emitted
}
```

The compiler uses a **three-zone enforcement model** (derived from SPARK/Ada):

| Zone | When | Cost |
|------|------|------|
| **Static** | Compiler can prove the value satisfies the constraint (e.g. literals) | Zero — no runtime code emitted |
| **Boundary** | Value comes from an unproven source (user input, API response, arithmetic) | One boolean check at assignment site |
| **Trusted** | Value was already checked in the current scope | Zero — compiler remembers the proof |

Boundary checks emit a single synchronous predicate test; on failure the compiler throws `E-CONTRACT-001-RT` labeled with the assignment site. Named shapes available today: `email`, `url`, `uuid`, `phone`, `date`, `time`, `color`. Composable predicates (`number(>0 && <10000)`, `string(.length > 7)`) cover the same ground as Zod schemas — with zero dependencies, zero bundle cost in proven code paths, and no separate schema language to keep in sync with your types.

### Free HTML Validation

The same predicate powers browser-native form validation. On `bind:value` inputs, the compiler derives the matching HTML attributes — `string(email)` emits `type="email"`, `number(>0 && <100)` emits `min="0" max="100"`, `string(uuid)` emits `pattern=...`, `string(.length > 7 && .length < 255)` emits `minlength="8" maxlength="254"`. One predicate, three enforcement points: server-side boundary check, client-side boundary check, browser-native pre-submit validation. You never write the HTML attrs by hand, and they never drift from the type.

### Variable Renaming

The compiler renames JavaScript bindings in the compiled output using a deterministic, type-derived encoding. `@shoppingCart` of type `Cart` becomes `_s7km3f2x00` — underscore prefix, kind character (`s` = struct, `p` = primitive, `e` = enum, and so on), an 8-character base36 FNV-1a hash of the canonical type string, and a per-scope sequence char. Two bindings of the same type share the hash; the sequence char disambiguates.

Because the name carries the type, runtime `reflect()` can recover the full type descriptor from a variable alone — without shipping any unused type metadata. The decode table is tree-shaken entirely when no `^{}` meta blocks reference runtime state, so most apps ship zero reflection bytes. Debug builds append `$originalName` so stack traces and DevTools stay readable; production builds reject that flag as a hard error.

This isn't bundler-style single-letter renaming — the names are longer than `a`, `b`, `c`. The wins are different: collision-free across scopes, type-introspectable at runtime, and protected fields can never leak into a client-side encoded name (the client schema view excludes them by construction, verified again at emit).

### Server/Client

- **Auto-split** — the compiler analyzes your code and decides what runs where. Protected fields and `server` functions force server-side execution.
- **SQL passthrough (`?{}`)** — query SQLite directly inside logic blocks. The compiler generates parameterized queries and handles serialization.
- **Automatic N+1 elimination (Tier 2).** A `for` loop whose body does `?{...WHERE id = ${x.id}}.get()` is rewritten to one pre-loop `WHERE id IN (?,?,?,...)` fetch plus a keyed `Map` lookup. No DataLoader, no manual batching. Measured ~2×/3×/4× at N=10/100/1000 on on-disk WAL `bun:sqlite` — see [benchmarks/sql-batching/RESULTS.md](benchmarks/sql-batching/RESULTS.md).
- **Implicit transaction envelopes (Tier 1).** Independent reads in a `!` handler share one `BEGIN DEFERRED`..`COMMIT` for snapshot consistency under concurrent writers. Explicit `transaction { }` blocks are left alone; a `W-BATCH-001` warning fires if the two would conflict.
- **Mount-hydration coalescing.** Multiple on-mount `server @var` loads on the same page are folded into a single `__mountHydrate` round-trip (§8.11) instead of one request per variable.
- **Opt-out per call site.** `?{...}.nobatch()` disables rewriting when you need an exact query shape — useful for `EXPLAIN`, stored-procedure calls, or measured hot paths.
- **Diagnostics, not silent magic.** `D-BATCH-001` flags near-miss loops that *almost* batch but don't (mutation in body, non-`.get()` chain, etc.), with the exact disqualifier. `E-BATCH-001` rejects `.nobatch()` composition with batched siblings; `E-BATCH-002` guards against the 32 766 `SQLITE_MAX_VARIABLE_NUMBER` ceiling at runtime.
- **No API boilerplate** — server functions are called like local functions. The compiler generates routes, fetch calls, CSRF tokens, and serialization.

### Components and Patterns

- **Components with props and slots** — `const Card = <div>` defines a component. Props are attributes; slots are named placeholders.
- **Enums and pattern matching** — Rust-style enums with exhaustive `match`. The compiler enforces that every variant is handled.
- **State machines** — declare `< machine>` with transition rules. The compiler prevents illegal state transitions.

### Metaprogramming

- **Compile-time meta (`^{}`)** — code that runs at compile time. Use `reflect()` to inspect types, `emit()` to generate markup, `compiler.*` to register macros. Meta blocks execute during compilation and produce source that's spliced into the AST.
- **Runtime meta** — meta blocks that reference `@var` reactive state run at runtime instead of compile time. The compiler classifies each block automatically based on what it references.

### Pure Functions

- **`fn` — compiler-enforced purity.** `fn` is not shorthand for `function` — it declares a pure function. The compiler statically verifies five prohibitions: no SQL access, no DOM mutation, no reactive writes, no `fetch`/network calls, no `<request>` boundaries. Use `function` for general-purpose callables; use `fn` for deterministic computations, state factories, predicates, and transformations.

### Styles

- **Scoped CSS (`#{}`)** — styles live next to the markup they apply to. The compiler handles scoping via native `@scope`.
- **Built-in Tailwind engine** — the compiler embeds a Tailwind utility registry. Use utility classes directly in markup; the compiler scans your HTML, resolves classes from the embedded registry, and emits only the CSS rules actually used. No Tailwind CLI, no PostCSS, no purge step.

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
| SQL     | `?{}` | Database queries (bun:sqlite passthrough); auto-batched N+1 + envelope |
| CSS     | `#{}` | Scoped styles |
| Error   | `!{}` | Typed error handling |
| Meta    | `^{}` | Compile-time (or runtime) code generation |
| Test    | `~{}` | Inline tests (stripped from production) |
| Foreign | `_{}` | Inline foreign code *(specced, not yet implemented)* |

## Specced but Not Yet Implemented

These features are fully designed in the [language spec](compiler/SPEC.md) but not yet available in the compiler. They are listed here so you know what's coming and don't try to use them yet.

| Feature | Spec Section | Description |
|---------|-------------|-------------|
| **Foreign code contexts (`_{}`)**  | S23 | Embed non-JS code inline with level-marked braces (`_{}`/`_={...}=`). Enables inline Rust, Python, SQL extensions, or any language with a registered compiler. The foreign block is opaque to scrml — it passes through to an external toolchain. |
| **WASM call-char sigils** | S23.3 | Single-character sigils (`r{}`, `c{}`, `z{}`) for invoking compiled WASM functions from Rust, C, Zig, etc. Paired with `extern` declarations for type-safe FFI. |
| **Sidecar process declarations** | S23.4 | `use foreign:name { fn }` for declaring server-side sidecar processes (HTTP/socket services) that scrml routes to automatically. |
| **`RemoteData` enum** | S13.5 | Built-in `Loading / Loaded(T) / Failed(Error)` enum for modeling async fetch state. Pattern-matchable with exhaustive checking. |

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
| [14-mario-state-machine](examples/14-mario-state-machine.scrml) | User-defined enum states + `<machine>` transition enforcement |

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
