# Clueless-agent experiment — TODO app, 2026-04-25 (S41)

**Hypothesis under test:** scrml's adoption funnel has shifted from "human reads docs" to "LLM gets pasted a prompt." If we run a deliberately uninformed LLM through a typical adopter prompt and catalog its failure modes, the failure list becomes the table of contents for an "LLM kickstarter" — a one-paste context primer that future agents read before writing scrml.

**Method:** Dispatched a `general-purpose` agent on Opus 4.7 with the prompt below. **Forbidden** from reading anything under `/home/bryan-maclee/scrmlMaster/`. Allowed: WebSearch, WebFetch, training data, ~30 min effort. The agent was told the experiment's purpose so it would report candidly.

**User prompt the agent received (verbatim, framed as if pasted into a normal LLM chat):**

> "I want to try this new language called scrml. Build me a small TODO app — let users add todos, mark them complete, see a list. Use SQLite for persistence. Make it server-rendered so it works without much client JS. Try to make it idiomatic."

---

## Finding 0 — scrml has no usable web presence

The agent ran four web searches before writing a line of code:

1. `scrml programming language server-rendered web framework` — zero hits. Top results: Crystal frameworks (Kemal/Lucky/Marten), Leptos.
2. `scrml language syntax example tutorial` — nothing. Search engine "did-you-mean"-corrected to **srcML** (XML representation of source code) and **SML** (Standard ML).
3. `"scrml" sqlite todo app framework` — zero hits.
4. `"scrml" github` — found `github.com/scrml/scrml.github.io`, which is **SCRML = "Self-Contained Resources Markup Language"**, an unrelated math markup language.

Agent's quote: *"My training data has nothing on a web framework called scrml. From this point on, every line below is a guess."*

**Implication:** The kickstarter is the ONLY upstream context an LLM will have. Web research returns false friends (srcML, math-SCRML) which can actively poison an unprimed agent. The kickstarter must be aggressive about asserting "you have not heard of this language; do not pattern-match on the name."

---

## Finding 1 — what the agent built (a chimera)

With no scrml priming, the agent anchored on the framework family the prompt evoked (server-rendered, low-JS) and produced:

- **Astro frontmatter** (`---` fences for server code)
- **Svelte template DSL** (`{#if}` / `{:else}` / `{#each x as y}`)
- **Svelte/JSX hybrid attribute binding** (`class={...}`)
- **Next.js dynamic routes** (`[id]` folder)
- **SvelteKit endpoint convention** (`POST({ request, params })` in `.server.js`)
- **Astro config shape** (`defineConfig`, `adapter: 'node'`, `output: 'server'`)
- **npm-installed `better-sqlite3`** for persistence
- **`scrml dev` / `scrml build` / `scrml start`** CLI

Self-assessed confidence the app would compile + run: **2-5%**.

The full code output is below in §Appendix A.

---

## Finding 2 — failure modes the agent identified for itself

The agent's own ranked recommendations for the kickstarter (verbatim ordering):

> 1. **An LLM with no context will reach for Astro frontmatter first.** Either embrace that and document the delta, or warn loudly against it.
> 2. **Template DSL choice is the single biggest mystery.** Whatever you picked, the LLM will guess Svelte's `{#each}` or JSX `.map()`. State the right answer in the first 10 lines of the kickstarter.
> 3. **Form-mutation story is unknown.** Without guidance, an LLM will invent `.server.js` endpoints with a SvelteKit-shaped `POST` handler. If scrml has server actions / inline handlers / RPC, say so up front.
> 4. **DB integration is unknown.** I bolted on `better-sqlite3` with no idea whether scrml has an idiomatic data layer. If it does, name it.
> 5. **CLI commands and config file shape** were pure invention. List them explicitly.
> 6. **The runtime itself** (Node? Bun? bespoke?) was assumed. State it.

These six bullets ARE the kickstarter's required first-page coverage.

---

## Finding 3 — the eight clarifying questions

The agent listed what it would have asked the user before writing code if it could:

1. What is the actual file extension and project layout?
2. Is the runtime Node, Bun, Deno, or a custom one?
3. Does scrml have a built-in DB layer, or do I bring my own?
4. What is the idiomatic way to handle form mutations?
5. Template syntax — Svelte-style? JSX-style? EJS-style? Bespoke?
6. Is there a component model and how does it look?
7. CSRF / form validation / flash messages?
8. Does scrml have its own type system, or does it use TS, or neither?

**Implication:** Every one of these eight questions must be answered explicitly in the kickstarter, ideally in the first ~2k tokens. They are exactly the questions every adopter LLM will silently guess wrong on.

---

## What the agent got accidentally right

A small amount of luck:

- **`.scrml` file extension** — guessed correctly from the language name.
- **SQLite via something** — would compile, just with the wrong driver. Could be salvaged by replacing `better-sqlite3` with `?{}` blocks.
- **Progressive enhancement / form-POST** — philosophically aligned with scrml's boundary model, even though the mechanism was wrong (`.server.js` endpoint files vs. scrml's `server fn` declarations).
- **303 See Other after POST** — correct HTTP semantics, would work unchanged.
- **CSS in a separate file** — would work; scrml prefers `#{}` scoped CSS but external stylesheets are valid.

---

## What the agent got catastrophically wrong (compile blockers)

- **No `<program>` root element.** Scrml requires it; without it, BS emits W-PROGRAM-001 immediately.
- **No `${ ... }` logic blocks.** All server-side logic was in Astro frontmatter (`---`). Scrml's logic blocks are `${ ... }` *inside* a `<program>`.
- **No `@var` reactive declarations.** Every state value the agent emitted was plain JS. Scrml's reactivity is opt-in via `@`.
- **No `?{}` SQL blocks.** SQL went through `better-sqlite3` with `db.prepare(...).all()` — a `.prepare()` call is now an explicit E-SQL-006 in scrml as of §44 (Bun.SQL phase 1).
- **No `<state>` blocks** for the todos schema. Agent imported types implicitly via the SQL driver; scrml would expect the schema to drive the type system via §39.
- **`{#if}` / `{#each}` Svelte directives** — scrml's markup uses `${...}` interpolation + `<for>` / `<if>` tags, not Svelte braces.
- **`[id]` Next-style dynamic routes** — scrml has its own routing model (§20).
- **`.server.js` co-located endpoints** — scrml has `server fn` inside `<program>`, not separate JS files for endpoints.
- **`scrml.config.js` with `defineConfig`** — pure invention; scrml uses different config shape.
- **`import 'scrml/config'`** — npm package likely doesn't exist as named.

If the agent's output were handed to the scrml compiler, the first error would be `W-PROGRAM-001` followed by `E-CTX-003 Unclosed 'logic'` cascades. Not a single page would render.

---

## Inferred kickstarter shape

From the data, the kickstarter MUST cover, in this rough order:

1. **Identity assertion.** "scrml is a new language, not srcML, not SCRML-the-math-markup, not SML. Don't search for it on the open web; this primer is the canonical context."
2. **One-screen syntax tour.** A complete `<program>` with `${ ... }` logic, `@var`, `<state>`, `<for>`, `<if>`, server fn, `?{}` SQL, `#{}` CSS — annotated. ~50 lines.
3. **Anti-pattern table.** "If you'd write X in React/Vue/Svelte/Astro, write Y in scrml." Mirrors the existing `BRIEFING-ANTI-PATTERNS.md` already used for internal dev agents.
4. **The eight questions, answered up front.** File extension, runtime (Bun), DB integration (`?{}`), form mutations (`server fn`), template syntax, component model (`const Card = <article>...</>` + `props={...}`), CSRF (compiler-enforced + automatic mint-on-403), type system (independent, §14 + §53 inline predicates).
5. **CLI catalog.** `scrml dev`, `scrml build`, `scrml init`, `scrml serve` — exact subcommands, exact flags.
6. **Stdlib catalog.** 13 modules, one-line each. Tells the LLM not to npm-install bcrypt/zod/lodash because the stdlib has the equivalent.
7. **A complete worked TODO-app example.** ~80 lines of working scrml that the LLM can reference shape-by-shape. The agent's chimera output is the negative; this is the positive.
8. **Known traps.** "Don't use `.prepare()`. Don't use `==` without thinking about server fn boundary. Don't import from `scrml/config` — there's no such module."

Token budget estimate: 8-12k tokens for a tight first version. Easy single-paste.

---

## Reproducibility

The experiment can and should be re-run with different prompt shapes to map the failure surface:

- TODO app (this run) — server-rendered + persistence
- Auth flow — login/signup/sessions
- Real-time — WebSocket chat or live counters
- Admin CRUD — multi-page with components
- Form-heavy — multi-step wizard with validation
- Reactive UI — counter, debounced search, derived state

Each run produces a new failure-mode set. After ~5 runs, the union should converge on a stable kickstarter scope.

---

## Appendix A — full agent output

The agent could not write to disk in its sandbox. Files are reproduced here verbatim for provenance.

### `package.json`

```json
{
  "name": "scrml-todo",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "scrml dev",
    "build": "scrml build",
    "start": "scrml start"
  },
  "dependencies": {
    "scrml": "latest",
    "better-sqlite3": "^11.0.0"
  }
}
```

### `scrml.config.js`

```js
import { defineConfig } from 'scrml/config';

export default defineConfig({
  output: 'server',
  adapter: 'node',
  server: { port: 3000 },
});
```

### `src/lib/db.js`

```js
import Database from 'better-sqlite3';

const db = new Database('todos.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    title  TEXT NOT NULL,
    done   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export const listTodos   = ()        => db.prepare('SELECT * FROM todos ORDER BY id DESC').all();
export const addTodo     = (title)   => db.prepare('INSERT INTO todos (title) VALUES (?)').run(title);
export const toggleTodo  = (id)      => db.prepare('UPDATE todos SET done = NOT done WHERE id = ?').run(id);
export const deleteTodo  = (id)      => db.prepare('DELETE FROM todos WHERE id = ?').run(id);
```

### `src/pages/index.scrml`

```
---
import { listTodos } from '../lib/db.js';

const todos = listTodos();
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>scrml todos</title>
    <link rel="stylesheet" href="/style.css" />
  </head>
  <body>
    <main>
      <h1>Todos</h1>

      <form method="post" action="/todos/create">
        <input name="title" placeholder="What needs doing?" required />
        <button type="submit">Add</button>
      </form>

      {#if todos.length === 0}
        <p class="empty">Nothing here yet.</p>
      {:else}
        <ul class="todo-list">
          {#each todos as todo}
            <li class={todo.done ? 'done' : ''}>
              <form method="post" action={`/todos/${todo.id}/toggle`}>
                <button type="submit" aria-label="toggle">
                  {todo.done ? '☑' : '☐'}
                </button>
              </form>
              <span>{todo.title}</span>
              <form method="post" action={`/todos/${todo.id}/delete`}>
                <button type="submit" aria-label="delete">✕</button>
              </form>
            </li>
          {/each}
        </ul>
      {/if}
    </main>
  </body>
</html>
```

### `src/pages/todos/create.server.js`

```js
import { addTodo } from '../../lib/db.js';

export async function POST({ request }) {
  const form = await request.formData();
  const title = String(form.get('title') ?? '').trim();
  if (title) addTodo(title);
  return Response.redirect('/', 303);
}
```

### `src/pages/todos/[id]/toggle.server.js` and `delete.server.js`

(Same shape as `create.server.js` with the corresponding `toggleTodo` / `deleteTodo` import.)

### `public/style.css`

(Trivial — system-ui sans-serif, max-width 36rem, struck-through `.done` items. Would work unchanged in scrml.)

---

## Tags
#experiment #llm-kickstarter #adoption-funnel #clueless-agent #failure-modes #s41
