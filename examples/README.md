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
| `<var> = init` / `@var` | anywhere | Reactive state — `<var> = init` declares (V5-strict); `@var` reads/writes |
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
| `02-counter.scrml` | Reactive state with `<count> = 0` (V5-strict decl), `@count` access, `bind:value`, bare-call `onclick=fn()` |
| `03-contact-book.scrml` | Full-stack in one file: a typed `Contact` struct + `?{}` SQL + server-classified functions (auto-inferred via body content) + form binding, with the contact rows rendered via the Tier-1 `<each in=@contacts key=@.id>`/`<empty>` shape over a reactive `Contact[]` collection (no auth — this is the CRUD/persistence demo; `protect=` is shown in 07/23) |
| `04-live-search.scrml` | Reactive filtering via a derived `const <filtered>` cell + Tier-1 `<each>`/`<empty>` over a reactive typed collection — the filter lives in a named reactive cell, not inline in the render |
| `05-multi-step-form.scrml` | Wizard UI as an `<engine for=Step>`: `rule=` state-children per step + decl-coupled validators gating Next/Submit via `@signup.isValid` + `<errors of=>` (§51 + §55) |
| `06-kanban-board.scrml` | Per-card status is multi-instance, so NOT an engine: derived per-status columns (`const <todo>`/`<inProgress>`/`<done>` filtered from a typed `Card[]`, §6.6.2) rendered with Tier-1 `<each>`/`<empty>` + per-direction id-only move handlers, CSS grid |
| `07-admin-dashboard.scrml` | `^{}` meta block + `reflect(User)` — table headers generated from the type |
| `08-chat.scrml` | Single-user message log: typed `Message[]` feed rendered with Tier-1 `<each>`/`<empty>` + optimistic update + DB persistence (NOT real-time — see 15) |
| `09-error-handling.scrml` | Errors-as-states: failable functions + `!{}` route each failure into a `Phase` enum's `.Failed(err)`; `<match for=Phase>` renders the held error — the failure mode lives in the type, no boolean error flags (§19) |
| `10-inline-tests.scrml` | `~{}` inline tests — compile-time assertions, stripped from production |
| `11-meta-programming.scrml` | `^{}` meta blocks, `emit()`, `reflect()` — the compiler as a programmable tool |
| `12-snippets-slots.scrml` | Named content slots in components — `slot=`, `${render slotName()}`, snippet props |
| `13-worker.scrml` | `<program name="worker">` — web workers as nested programs with typed messaging |
| `14-mario-state-machine.scrml` | Enum state machine: `type:enum`, payload destructuring, derived machines (§51.9) |
| `15-channel-chat.scrml` | Real-time chat — `<channel>` inside `<program>` for WebSocket sync (Insight 30 placement; auto-sync from being inside channel body — `@shared` modifier removed v0.next) (§38) |
| `16-remote-data.scrml` | Async loading as a typed Phase enum rendered with the Tier-1 `<match for=ContactsPhase>` block (Idle / Loading / Loaded / Failed), `<each>`/`<empty>` rows, failure routed into `.Failed` via `!{}`; promote to `<engine>` when transitions need enforcing — the Tier ladder (§18 + §17.7 + §19) |
| `17-schema-migrations.scrml` | `<schema>` declarative DB schema — compiler diffs + generates migration SQL (§39) |
| `18-state-authority.scrml` | `<x server>` server-authoritative state (§52 Tier 2, scaffold) |
| `19-lin-token.scrml` | `lin` linear types — exactly-once consumption guarantee (§35) |
| `20-middleware.scrml` | `<program>` middleware attrs + `handle()` escape hatch (§40) |
| `21-navigation.scrml` | `navigate()` + `route` — page transitions, route params (§20) |
| `22-multifile/` | `import`/`export` across .scrml files — pure-type files + component reuse (§21) |
| `23-trucking-dispatch/` | Multi-page reference app (logistics dispatch) — multiple `<page>` files under `routes/`, full-stack with auth + DB + per-page server functions; canonical adopter-scale shape |
| `24-tilde-pipeline.scrml` | `~` last-unbound-expression carry-forward — bare-call + next-line consume; function-body pipelines; no naming intermediates used once (§32) |
| `25-triage-board.scrml` | Drag-and-drop triage board — the §51.0.S engine-message-dispatch worked example: a board-singleton `<engine for=DragPhase accepts=DragMsg>` owns its transitions via `(state × message)` arms + `.advance(.Msg)`; the drag glue collapses into the engine |
| `26-type-derived-schema.scrml` | `schemaFor(StructType)` — `<schema>` DB DDL generated from a struct (L22 type-as-argument family, §41.15) |
| `27-type-derived-table.scrml` | `tableFor(StructType, rows)` — an admin `<table>` generated from a struct + rows (L22 family, §41.16) |
| `28-flux.scrml` | **Flux** — a shifting-labyrinth game: a derived ASCII board, fog-of-war, per-cell re-roll ("flux"), 2-tier memory locking, and level/vision/XP progression. Canonical-scrml dog-food (§6.6 derived cells, §48 pure `fn`, §17/§18). Will replace `14-mario` as the flagship game example. |

---

Start with `01-hello.scrml` if you want the syntax walkthrough. Start with `03-contact-book.scrml`
if you want the "wait, that's the whole app?" moment.

The interesting examples are 05-08. That's where scrml stops looking like a nicer JSX and starts
looking like a different idea about what a web framework is.

15-18 cover the more advanced patterns — real-time WebSocket sync, async loading state,
declarative schemas, and server-authoritative state. Each demonstrates a single spec section's
canonical pattern.
