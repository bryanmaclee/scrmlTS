---
title: "v0.3 Wave 3 — fixture migration sweep — Phase 0 reconnaissance (S87)"
session: S87
status: PHASE-0-COMPLETE
---

# Phase 0 reconnaissance — S87

`bun scrml migrate --program-shape --dry-run --report` corpus-wide.

## Summary table

| Directory | Scanned | Would-change (REWRITE) | Unchanged (NOOP+SKIP+ADVISORY) | Failed safety-harness |
|---|---|---|---|---|
| `examples/` | 60 | 16 reported (+ 23 REWRITE-attempt FAILED) | 21 | 23 |
| `samples/` (no-default-excludes) | 867 | 71 | 736 | 60 |
| `stdlib/` (no-default-excludes) | 44 | 3 reported (+ 8 REWRITE-attempt FAILED) | 33 | 8 |
| `compiler/tests/` (no-default-excludes) | 8 | 3 | 5 | 0 |
| `benchmarks/todomvc/` (no-default-excludes) | 1 | 0 | 1 | 0 |

Note: report's "would change" count = files where rewriting succeeded; "failed" = REWRITE attempt parsed back failed (the file is left untouched).

## Examples — per-bucket detail

### entry bucket (19 files)

NOOP (3): `01-hello.scrml`, `11-meta-programming.scrml`, `12-snippets-slots.scrml`.

SKIP (1): `13-worker.scrml` — close-elision (nested `<program name=...>` worker shape).

REWRITE-SUCCESS (5): `02-counter.scrml`, `06-kanban-board.scrml`, `10-inline-tests.scrml`, `21-navigation.scrml`. (Plus `22-multifile/app.scrml` is REWRITE-FAILED.)

REWRITE-FAILED (11): `03-contact-book.scrml`, `04-live-search.scrml`, `05-multi-step-form.scrml`, `07-admin-dashboard.scrml`, `08-chat.scrml`, `09-error-handling.scrml`, `16-remote-data.scrml`, `18-state-authority.scrml`, `19-lin-token.scrml`, `20-middleware.scrml`, `22-multifile/app.scrml`.

### route bucket (20 files; all under `23-trucking-dispatch/pages/`)

REWRITE-SUCCESS (7): `auth/login`, `auth/register`, `customer/profile`, `dispatch/customers`, `dispatch/drivers`, `driver/load-log`, `driver/profile`. (Plus `driver/hos.scrml` is route-bucket-classified-then-skipped because file-top opener is `<engine>`, not `<program>`.)

REWRITE-FAILED (12): `customer/{home,invoices,load-detail,loads,quote}`, `dispatch/{billing,board,load-detail,load-new}`, `driver/{home,load-detail,messages}`.

### module bucket (19 files)

ADVISORY (15) — no rewrite proposed: `14-mario-state-machine.scrml`, `15-channel-chat.scrml`, `22-multifile/{components,types}.scrml`, `23-trucking-dispatch/channels/{customer-events,dispatch-board,driver-events,load-events}.scrml`, `23-trucking-dispatch/components/{address-form,assignment-picker,customer-card,driver-card,invoice-card,load-card,load-status-badge}.scrml`.

REWRITE-SUCCESS (4): `23-trucking-dispatch/components/status-picker.scrml`, `23-trucking-dispatch/models/auth.scrml`, `23-trucking-dispatch/schema.scrml`, `23-trucking-dispatch/seeds.scrml` — these are `<machine>` → `<engine>` keyword migrations + whitespace normalization (W-DEPRECATED-001 / W-WHITESPACE-001).

### schema-anchor bucket (2 files)

ADVISORY: `17-schema-migrations.scrml`, `23-trucking-dispatch/app.scrml` — both keep `<program db=>` per §39.12.0 v0.3 workaround. No rewrite.

## Failure diagnostic categories

### Category A — channel-outside-program (REAL v0.3 SPEC VIOLATION)

Files with file-top `<channel>` (now outside-of-program after migration). Per SPEC §38.1 v0.3 normative, channels must live INSIDE `<program>`. Fix manually.

**Affected files (12):**

- `examples/23-trucking-dispatch/pages/customer/home.scrml` — `<channel name="customer-events">`
- `examples/23-trucking-dispatch/pages/customer/invoices.scrml` — `<channel name="customer-events">`
- `examples/23-trucking-dispatch/pages/customer/load-detail.scrml` — `<channel name="load-events">`
- `examples/23-trucking-dispatch/pages/customer/loads.scrml` — `<channel name="customer-events">`
- `examples/23-trucking-dispatch/pages/customer/quote.scrml` — `<channel name="dispatch-board">`
- `examples/23-trucking-dispatch/pages/dispatch/billing.scrml` — `<channel name="customer-events">`
- `examples/23-trucking-dispatch/pages/dispatch/board.scrml` — `<channel name="dispatch-board">`
- `examples/23-trucking-dispatch/pages/dispatch/load-detail.scrml` — `<channel name="dispatch-board">` + `<channel name="load-events">`
- `examples/23-trucking-dispatch/pages/dispatch/load-new.scrml` — `<channel name="dispatch-board">`
- `examples/23-trucking-dispatch/pages/driver/home.scrml` — `<channel name="driver-events">`
- `examples/23-trucking-dispatch/pages/driver/load-detail.scrml` — `<channel name="dispatch-board">` + `<channel name="customer-events">` + `<channel name="load-events">`
- `examples/23-trucking-dispatch/pages/driver/messages.scrml` — `<channel name="driver-events">`

**Disposition:** These channel imports are CROSS-FILE imports from `23-trucking-dispatch/channels/{customer-events,dispatch-board,driver-events,load-events}.scrml`. The page-level files have `<channel name="X">` declarations at file-top that are intended as CROSS-FILE REFERENCES (a re-declaration / aliasing pattern). Per v0.3, the inside-program direction is normative.

Two possible fixes per file:
- (a) Remove the file-top `<channel>` re-declarations entirely and rely on the channel being defined in the entry file (`app.scrml`) which mounts the channels into the program once. The page files just consume `@channelStateCell` from app-scope.
- (b) Move the file-top `<channel>` inside the page's `<program>` body. This is mechanical but adds redundancy.

Per the brief: real v0.3 spec violation → fix manually per SPEC §38.1 v0.3 normative. Going with approach (a) — channels at app entry, pages consume cross-file via shared cells. **Inspection needed:** check whether app.scrml mounts these channels OR whether the pages need their own per-page channel mount. The 4 `23-trucking-dispatch/channels/*.scrml` module files declare the channels; the pages currently re-declare them at file top (legacy v0.2 cross-file-channel pattern).

### Category B — unwrap-inside-db (TOOL GAP — Wave 3.5)

The migrate tool's `${...}` unwrapper currently triggers on `${...}` blocks regardless of whether the enclosing container is `<program>`/`<page>`. When a `${...}` block sits inside `<db src=...>`, unwrapping leaves bare `<name> = ""` decls inside `<db>` body — the BS-layer's state-decl auto-lift (per `2314c8c`) only covers `<program>` and `<page>` bodies, NOT `<db>`. Result: E-CTX-001/E-CTX-003 on parse.

**Affected files (5):**

- `examples/03-contact-book.scrml` — `${state}` inside `<db>` block
- `examples/07-admin-dashboard.scrml` — same shape
- `examples/08-chat.scrml` — same shape
- `examples/16-remote-data.scrml` — `${state}` block with embedded `<db>` sibling
- `examples/18-state-authority.scrml` — same shape

**Disposition:** TOOL GAP. Surface as Wave 3.5 follow-up — extend migrate's body-unwrap to only fire when the enclosing container is `<program>` or `<page>` body, NOT inside `<db>` (or any other structural container). Do NOT extend migrate.js in this dispatch per brief §2.2 step 3.

**Workaround:** for the in-dispatch sweep, restructure source manually if needed (move `${state}` block out of `<db>` and into `<program>` body, or leave as-is if pre-migration shape is acceptable).

### Category C — unwrap-loses-local-scope (TOOL GAP — Wave 3.5)

When `${...}` block contains a `lin` or `let`/`const` local that's referenced elsewhere in the block, unwrapping the block changes scoping. Bare top-level `function` bodies don't see the local. Result: E-SCOPE-001 / E-LIN-001.

**Affected files (4):**

- `examples/04-live-search.scrml` — local `p` undeclared after unwrap
- `examples/09-error-handling.scrml` — `email`/`reason` local refs
- `examples/19-lin-token.scrml` — `lin ticket` consumption
- `examples/20-middleware.scrml` — `resolve`/`request` middleware locals

**Disposition:** TOOL GAP. The migrate tool's classifier currently treats `${...}` as "all top-level declarations" if every parsed statement looks like a top-level decl, but doesn't account for cross-reference scoping. Surface as Wave 3.5 follow-up.

### Category D — match-in-markup (TOOL GAP — Wave 3.5)

After unwrap, `match expr {...}` ends up at markup position; should be wrapped in `${...}`. E-TYPE-026 / E-TYPE-031.

**Affected files (1):**

- `examples/05-multi-step-form.scrml` — `match` form at file top after unwrap

**Disposition:** TOOL GAP. Surface as Wave 3.5.

### Category E — cross-file-component-shape (KNOWN F-COMPONENT-001 follow-up)

**Affected files (1):**

- `examples/22-multifile/app.scrml` — E-COMPONENT-035 on `<UserBadge>` post-unwrap

This is the known F-COMPONENT-001-FOLLOW (nested PascalCase in exported component bodies) per kickstarter §7 known-limitation note. Pre-existing surface; orthogonal to this sweep. Surface as deferred follow-up.

## Stdlib failures (NOT in active scope for this sweep)

8 stdlib files fail REWRITE — these are pre-existing scrml source issues (E-EQ-004 `===`/`!==`, E-CTX-001 unclosed tags around type-name-as-element, E-IMPORT-005 bare npm import, E-ERROR-006 `throw` keyword usage) exposed by `${...}` unwrap:

- `stdlib/data/index.scrml` — many `===`/`!==`
- `stdlib/oauth/{google,index,microsoft,pkce}.scrml` — `===`/`!==`/`throw`/`try`/type-element-confusion
- `stdlib/redis/index.scrml` — type-name-as-element parse error
- `stdlib/store/index.scrml` — `!==` + `bun:sqlite` bare import
- `stdlib/test/index.scrml` — type-name-as-element parse error

These are pre-existing stdlib-source-cleanup items (also surfaced in the S78 `spec-conformance-2026-05-10.md` audit per `master-list.md`). Out of scope here; surface in progress.md. The 3 stdlib REWRITES that succeeded (data/parse, store/kv etc) are also at risk of exposing the same pre-existing source bugs if hand-tested. Recommendation: **skip stdlib in Phase 1** until the underlying source-side cleanup ships.

## Samples corpus

867 .scrml files in `samples/` — most are intentional-fail fixtures for compilation-tests, gauntlets, and lints. Per SCOPING brief §1, samples are MOSTLY OUT OF SCOPE except `gauntlet-s20-channels/`.

The 60 failures + 71 would-change are distributed across compilation-tests + gauntlet-* directories; vast majority of "would change" are W-DEPRECATED-001 (`<machine>` keyword) migrations on benign fixtures + W-WHITESPACE-001 normalization. Out of scope per brief.

## Compiler/tests/

Only 8 files (the migrate-program-shape-fixtures from Wave 2 item (a) at `compiler/tests/commands/migrate-program-shape-fixtures/`). These are INPUTS to migrate tests — **leaving them untouched**. The classifications are correct (entry/route/module/schema-anchor) but actual migration would invalidate the test fixtures.

## Benchmarks/todomvc/

1 file (`app.scrml`) classified as `module` (no file-top `<program>`). No migration needed.

## gauntlet-s20-channels re-classification scope

Per SCOPING brief §2.2, this directory had fixtures that intentionally fired E-CHANNEL-INSIDE-PROGRAM (retired in v0.3). Per recon, need to inspect each fixture for invert/delete/archive disposition. Handled in Phase 3.

## Phase 1 plan

Given the recon findings, Phase 1 will be tightly scoped:

1. Run migrate on `examples/` — 16 REWRITE-success files will be migrated (5 entry + 7 route + 4 module). Remaining 23 leave untouched (safety-harness blocks them).
2. Run migrate on `benchmarks/todomvc/` — 0 changes expected.
3. SKIP `stdlib/` — pre-existing source issues are out of scope.
4. SKIP `compiler/tests/` — fixtures for migrate's own tests.

Phase 2 will manually fix the 12 trucking-page channel-outside-program failures (Category A — real spec violation).

Phase 3 will re-classify gauntlet-s20-channels.

Phase 4 will skip (no selective compiler/tests/ or samples/ work needed given recon).

## Surfaced findings (TOOL GAPS — Wave 3.5 candidates)

1. **`${...}` unwrap should be container-aware** — only unwrap when enclosed by `<program>` or `<page>` body, not `<db>` or other structural containers. (Categories B + arguably some C overlap.)
2. **`${...}` unwrap should preserve cross-reference scoping** — if any local in the block is referenced elsewhere within the same block, do not unwrap. (Category C.)
3. **`match` and other non-declaration statements** — already detected per the report's "info: a `${...}` block was left wrapped (contains non-declaration content)" notes. The tool seems to selectively unwrap; the failure mode is when post-unwrap structure still has `match` at top-level. (Category D.)
4. **Cross-file component import nested-PascalCase** — F-COMPONENT-001-FOLLOW (Category E) known issue from kickstarter §7.
