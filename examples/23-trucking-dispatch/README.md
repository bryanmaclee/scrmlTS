# Trucking Dispatch — example 23

A multi-file scrml example app for an NE Utah oil-and-gas trucking dispatcher.
Built as a **language stress test** — its purpose is to surface real friction
across scrml's full-stack feature surface (auth, schema/migrations, multi-file
imports, real-time channels, lin tokens, state machines, role gating).

> **Status: Milestone 1 of 6 (schema + auth scaffold).** M2-M6 add the
> dispatcher / driver / customer slices, real-time integration, lin tokens,
> and polish. See `../../docs/changes/dispatch-app/scoping.md` for the full
> roadmap.

## Scope statement (M1)

M1 ships the foundation only:

- **Schema** — all 9 tables (`users`, `customers`, `drivers`, `tractors`,
  `trailers`, `loads`, `assignments`, `log_entries`, `invoices`, `messages`)
  declared via `< schema>` (§39) so M2-M6 don't have to migrate.
- **Auth scaffold** — `<program auth="required">` global gate; `/login` and
  `/register` pages with `auth="optional"` overrides; password hashing via
  `scrml:auth` (Argon2id); session cookie + KV store via `scrml:store`.
- **Seeds** — 3 customers + 3 customer logins, 4 drivers + 4 driver logins,
  1 dispatcher login, 3 tractors, 4 trailers, 8 loads in varying statuses.
  All seeded users share password `demo`.
- **Friction findings** — see `FRICTION.md`. M1 surfaced 6 entries
  (4 P0/P1, 2 P2).

## File layout

```
examples/23-trucking-dispatch/
├── README.md                  this file
├── FRICTION.md                friction log (load-bearing output)
├── app.scrml                  <program> root + <schema> + <db> + nav shell
├── schema.scrml               shared enum types + DDL reference comment
├── seeds.scrml                runSeeds() — INSERT-with-conflict-skip dataset
├── models/
│   └── auth.scrml             cookie helpers + role helpers + constants
├── pages/
│   └── auth/
│       ├── login.scrml        /login form
│       └── register.scrml     /register customer-self-signup form
└── dispatch.db                bootstrap SQLite (schema applied, no rows)
```

## Run instructions

```bash
# 1. Compile the example dir to dist/
bun ./compiler/src/cli.js compile examples/23-trucking-dispatch/

# 2. Or use dev mode for hot-reload + a local server on :3000
bun ./compiler/src/cli.js dev examples/23-trucking-dispatch/

# Then visit:
#   http://localhost:3000/login    — sign in with seeded credentials
#   http://localhost:3000/register — self-register as a new customer
```

## Seeded credentials

All seeded accounts share password `demo`:

| Role | Email |
|---|---|
| Dispatcher | `dispatcher@dispatch.example` |
| Driver | `doyle.briggs@dispatch.example` |
| Driver | `lupe.fontes@dispatch.example` |
| Driver | `ada.king@dispatch.example` |
| Driver | `moses.tate@dispatch.example` |
| Customer | `ops@basinenergy.example` |
| Customer | `dispatch@uintahfield.example` |
| Customer | `billing@vernalops.example` |

After login, users are redirected by role:
- Dispatchers → `/dispatch` (M2)
- Drivers → `/driver` (M3)
- Customers → `/customer` (M4)

M2-M4 hadn't shipped at M1 close — those routes 404 until the corresponding
milestone lands.

## Friction surface — what M1 already showed

The `< schema>` + auth scaffold was the smallest possible slice that touches
multi-file imports, schema declaration, password hashing, session storage,
and Tailwind 3 utility CSS. Even at this scope, M1 surfaced:

- **F-AUTH-001** (P0): `auth="role:X"` is silently inert — adopters get no
  diagnostic that the per-route role gate they wrote does nothing.
- **F-AUTH-002** (P0): cross-file `server function` with `?{}` SQL access
  hits E-SQL-004 — adopters can't factor login into a shared module.
- **F-SCHEMA-001** (P1): `< schema>` doesn't satisfy E-PA-002 — adopters
  must pre-create the DB file before the compiler will validate `?{}`
  against the schema they declared.
- **F-EXPORT-001** (P1): `export server function` is silently unrecognized.
- **F-AUTH-003** (P2): W-AUTH-001 fires even when `auth=` IS explicit.
- **F-DESTRUCT-001** (P2): array destructuring inside `for-of` may confuse
  type-scope.

See `FRICTION.md` for full entries with code samples and suggested fixes.

## Constraints (per scoping doc §10)

- Tailwind 3 utility classes only (no custom theme, no `class={expr}`).
- bun:sqlite only (no Postgres) — single-file `dispatch.db` next to source.
- Multi-file imports per §21 (working syntax only — no novel features).
- No `--no-verify` on commits (every commit passes the test suite).
- No new compiler features during the build — work around gaps, log them.

## What's next (M2-M6)

| # | Slice | LOC est. |
|---|---|---|
| **M2** | Dispatcher routes (`/dispatch/*` — board, load detail, drivers, customers, billing) | ~1,500 |
| **M3** | Driver routes (`/driver/*` — current load, log, HOS, messages) + HOS state machine | ~1,200 |
| **M4** | Customer routes (`/customer/*` — landing, loads, invoices, quote) | ~1,000 |
| **M5** | Real-time integration (`<channel>` × 4: dispatch-board, driver-:id, load-:id, customer-:id) | ~600 |
| **M6** | Polish + lin tokens (rate confirmation, BOL submission) + final friction sweep | ~500 |

## Links

- [Scoping doc](../../docs/changes/dispatch-app/scoping.md) — full roadmap
- [LLM kickstarter v1](../../docs/articles/llm-kickstarter-v1-2026-04-25.md) — required brief for any scrml-writing dispatch
- [Multi-file precedent](../22-multifile/) — closest precedent for §21 imports
- [Schema example](../17-schema-migrations.scrml) — `< schema>` reference
- [Compiler SPEC.md](../../compiler/SPEC.md) — §21 imports, §35 lin, §38 channels, §39 schema, §44 SQL
