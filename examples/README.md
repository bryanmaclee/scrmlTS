# scrml examples

Stop wiring. Start building.

These are runnable scrml apps — one file each. No build config, no separate server file, no
route definitions, no state management library. Just `.scrml`.

Each example is chosen to show something that takes real work in React or Vue but falls out
naturally from how scrml is designed.

## Quick start

```bash
# Compile any example
bun compiler/src/cli.js compile examples/01-hello.scrml -o dist/

# Output: dist/01-hello.html, dist/01-hello.client.js, dist/01-hello.css
# Open dist/01-hello.html in a browser.
```

## Sigil cheatsheet

| Sigil | Context | Meaning |
|-------|---------|---------|
| `@var` | anywhere | Reactive variable — changes trigger re-render |
| `${}` | markup | Logic block — JS expressions, control flow, declarations |
| `?{}` | logic | SQL passthrough — direct database access |
| `#{}` | markup | Scoped CSS — styles for this file only |
| `^{}` | logic | Meta block — compile-time code generation |
| `~{}` | logic | Inline test — stripped from production builds |
| `!{}` | logic | Error handler — exhaustive error matching |

---

| File | What it shows |
|------|---------------|
| `01-hello.scrml` | Bare markup and the three closer forms — the syntax in ten lines |
| `02-counter.scrml` | Reactive state with `@var`, `bind:value`, and scoped `#{}` CSS |
| `03-contact-book.scrml` | Full-stack in one file: `protect=` state, `?{}` SQL, `server` functions, form binding |
| `04-live-search.scrml` | Reactive filtering with `for`/`lift`, `class:active=`, no derived-state boilerplate |
| `05-multi-step-form.scrml` | Wizard UI: enum steps, `match`, components, `lin` one-shot submit token |
| `06-kanban-board.scrml` | Enum-driven columns, `match` dispatch, reusable `Card` component, CSS grid |
| `07-admin-dashboard.scrml` | `^{}` meta block, `reflect(User)`, `emit()` — compile-time table headers from a type |
| `08-chat.scrml` | Reactive message list, optimistic update, `server` persistence, chat bubble CSS |
| `09-error-handling.scrml` | `!{}` exhaustive error matching, enum error types with `renders` clauses |
| `10-inline-tests.scrml` | `~{}` inline tests — compile-time assertions, stripped from production |
| `11-meta-programming.scrml` | `^{}` meta blocks, `emit()`, `reflect()` — the compiler as a programmable tool |
| `12-snippets-slots.scrml` | Named content slots in components — `slot=`, `render`, snippet props |
| `13-worker.scrml` | `<program name="worker">` — web workers as nested programs with typed messaging |
| `14-mario-state-machine.scrml` | Enum state machine: `type:enum`, `type:struct`, nested `match`, struct spread |

---

Start with `01-hello.scrml` if you want the syntax walkthrough. Start with `03-contact-book.scrml`
if you want the "wait, that's the whole app?" moment.

The interesting examples are 05-08. That's where scrml stops looking like a nicer JSX and starts
looking like a different idea about what a web framework is.
