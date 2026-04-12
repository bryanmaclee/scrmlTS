# scrml Tutorial

A step-by-step introduction. By the end you'll have built a working app with reactive state, server functions, a database, scoped styles, and inline tests — all in one file.

## Prerequisites

Install [Bun](https://bun.sh):

```bash
curl -fsSL https://bun.sh/install | bash
```

Clone the repo and install:

```bash
git clone <repo-url> scrmlTS
cd scrmlTS
bun install
```

## 1. Hello World

Create `hello.scrml`:

```scrml
<h1>Hello, scrml!</>
```

Compile and open:

```bash
scrml compile hello.scrml -o dist/
open dist/hello.html
```

That's it. scrml compiles markup directly to HTML. The `</>` closer works for any tag — no need to repeat the tag name.

## 2. Reactive State

Add a counter. The `@` sigil makes a variable reactive — any element that reads it re-renders when it changes.

```scrml
<program>

@count = 0

<div>
    <h1>${@count}</>
    <button onclick=${@count = @count + 1}>+1</>
    <button onclick=${@count = 0}>Reset</>
</>

</>
```

`<program>` is the root element. It configures your app (database connections, protection rules, etc.). For simple apps it's optional, but it's good practice.

`${@count}` interpolates the reactive variable into the DOM. When `@count` changes, only the `<h1>` updates — the compiler generates targeted DOM mutations, not a full re-render.

## 3. Logic Blocks

Move logic into a `${}` block for more complex behavior:

```scrml
<program>

@count = 0
@step = 1

${
    function increment() { @count = @count + @step }
    function decrement() {
        if (@count - @step >= 0) { @count = @count - @step }
    }
    function reset() { @count = 0 }
}

<div>
    <h1>${@count}</>
    <button onclick=decrement()>-</>
    <button onclick=reset()>Reset</>
    <button onclick=increment()>+</>
</>

</>
```

Functions inside `${}` are plain JavaScript with one addition: they can read and write `@` variables directly. The compiler wires up the reactivity.

## 4. Two-Way Binding

Use `bind:value` to keep an input and a reactive variable in sync:

```scrml
<program>

@name = ""

<div>
    <input bind:value=@name placeholder="Your name"/>
    <p>Hello, ${@name}!</>
</>

</>
```

As you type, `@name` updates, which updates the `<p>`. No event handlers, no `onChange` — `bind:value` handles it.

## 5. Scoped CSS

Add styles with `#{}`:

```scrml
<program>

@name = ""

#{
    .greeting {
        font-family: system-ui;
        text-align: center;
        padding: 2rem;
    }
    input {
        font-size: 1.2rem;
        padding: 0.5rem;
        border: 2px solid #ddd;
        border-radius: 4px;
    }
}

<div class="greeting">
    <input bind:value=@name placeholder="Your name"/>
    <p>Hello, ${@name}!</>
</>

</>
```

Styles in `#{}` are scoped to this file via native CSS `@scope`. They won't leak into other components or pages.

## 6. Iteration and Lists

Use `for` loops with `lift` to render lists:

```scrml
<program>

@items = ["Apple", "Banana", "Cherry"]
@newItem = ""

${
    function addItem() {
        if (@newItem != "") {
            @items = [...@items, @newItem]
            @newItem = ""
        }
    }
}

<div>
    <input bind:value=@newItem placeholder="Add item"/>
    <button onclick=addItem()>Add</>

    <ul>
        ${
            for (let item of @items) {
                lift <li>${item}</>
            }
        }
    </ul>
</>

</>
```

`lift` takes a markup expression and inserts it into the DOM. The compiler generates an efficient LIS-based reconciler for list updates.

## 7. Enums and Pattern Matching

Define enums and match on them exhaustively:

```scrml
<program>

type Status:enum = { Loading, Ready, Error }
@status = Status.Loading

${
    function load() {
        @status = Status.Ready
    }
    function fail() {
        @status = Status.Error
    }
}

<div>
    ${
        match @status {
            .Loading => lift <p>Loading...</>
            .Ready   => lift <p>Ready!</>
            .Error   => lift <p>Something went wrong</>
        }
    }

    <button onclick=load()>Load</>
    <button onclick=fail()>Fail</>
</>

</>
```

The compiler enforces that every variant is handled. If you add a new variant to `Status` and forget to handle it, you get a compile error.

## 8. Derived Values

Use `~` (tilde) to declare values that recompute when their dependencies change:

```scrml
<program>

@items = ["Apple", "Banana", "Cherry"]
@filter = ""

~filtered = @items.filter(i => i.toLowerCase().includes(@filter.toLowerCase()))
~count = @filtered.length

<div>
    <input bind:value=@filter placeholder="Filter..."/>
    <p>${@count} items</>
    <ul>
        ${
            for (let item of @filtered) {
                lift <li>${item}</>
            }
        }
    </ul>
</>

</>
```

`~filtered` recomputes whenever `@items` or `@filter` change. `~count` recomputes whenever `@filtered` changes. The compiler tracks the dependency graph automatically.

## 9. Server Functions and SQL

Add a database. The compiler splits your code into server and client automatically:

```scrml
<program db="myapp.db">

    @name = ""

    <form onsubmit=addPerson()>
        <input bind:value=@name placeholder="Name"/>
        <button type="submit">Add</>
    </form>

    <ul>
        ${
            for (let p of ?{`SELECT name FROM people`}.all()) {
                lift <li>${p.name}</>
            }
        }
    </ul>

    ${
        server function addPerson() {
            ?{`INSERT INTO people (name) VALUES (${@name})`}.run()
            @name = ""
        }
    }

</>
```

`<program db="myapp.db">` connects to a SQLite database. `?{}` is the SQL context — the compiler generates parameterized queries. `server function` runs on the server; the compiler generates the route, the fetch call from the client, and the serialization. You write one function — it works across the network boundary.

## 10. Error Handling

Use `!{}` for typed error contexts:

```scrml
<program>

${
    server function fetchData() {
        !{
            let result = ?{`SELECT * FROM data`}.all()
            return result
        } catch {
            .NotFound => return []
            .DatabaseError(msg) => {
                console.error(msg)
                return []
            }
        }
    }
}

</>
```

Error arms are pattern-matched. The compiler ensures every error variant your code can produce is handled.

## 11. Compile-Time Meta

Use `^{}` for compile-time code generation:

```scrml
<program>

type UserFields:struct = { name:string, email:string, age:number }

^{
    const fields = reflect(UserFields)
    for (const [name, type] of Object.entries(fields)) {
        emit(`<label>${name}</label>`)
        emit(`<input type="${type === 'number' ? 'number' : 'text'}" placeholder="${name}"/>`)
    }
}

</>
```

`^{}` blocks run at compile time. `reflect()` inspects your types; `emit()` outputs markup. The generated markup is spliced into the AST before codegen — it's as if you wrote it by hand.

## 12. Inline Tests

Use `~{}` to write tests next to the code they verify:

```scrml
<program>

${
    function add(a, b) { return a + b }
    function multiply(a, b) { return a * b }
}

~{
    test("add works") {
        assert(add(2, 3) == 5)
        assert(add(-1, 1) == 0)
    }
    test("multiply works") {
        assert(multiply(3, 4) == 12)
    }
}

</>
```

Run tests with `scrml test`. They're stripped from production builds — zero cost.

## Next Steps

- Browse the [examples/](../examples/) directory for more complete apps
- Read the [Language Specification](../compiler/SPEC.md) for the full formal spec
- See [DESIGN.md](DESIGN.md) for the rationale behind scrml's design choices
