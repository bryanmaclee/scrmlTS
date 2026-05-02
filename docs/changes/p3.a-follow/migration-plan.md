# Migration plan — p3.a-follow

**Goal:** Sweep `examples/23-trucking-dispatch/` per-page channel decls onto the
PURE-CHANNEL-FILE pattern (§38.12.6) shipped by P3.A. F-CHANNEL-003 follow-up.

**Reference:** SPEC §38.12 + canonical example `examples/15-channel-chat.scrml`.

## Inventory

15 channel-decl markup hits across 12 pages, distilled to 4 unique `name=` values.
All bodies for each `name=` are byte-identical (verified by manual diff). No
`topic=` attribute is used anywhere — every channel relies on the default
(topic = name), which sidesteps the §38.12 / SPEC-§6.2-worked-example
consumer-scope-binding pitfall.

| `name=` | Pages declaring | Body (LOC, decl-only) | Status |
|---|---|---|---|
| `dispatch-board` | dispatch/board, dispatch/load-new, dispatch/load-detail, customer/quote, driver/load-detail | 14 | **MIGRATE** — 5 redeclarations |
| `customer-events` | customer/home, customer/loads, customer/invoices, dispatch/billing, driver/load-detail | 16 | **MIGRATE** — 5 redeclarations |
| `load-events` | customer/load-detail, dispatch/load-detail, driver/load-detail | 17 | **MIGRATE** — 3 redeclarations |
| `driver-events` | driver/home, driver/messages | 17 | **MIGRATE** — 2 redeclarations |

Total: **15 channel decls → 4 canonical files; 11 redeclarations eliminated.**

## Per-channel detail

### `dispatch-board` (5 pages)

```scrml
<channel name="dispatch-board">
    ${
        @shared boardEvents = []
        server function publishBoardEvent(eventType, loadId, status) {
            boardEvents = [...boardEvents, {
                type: eventType,
                loadId: loadId,
                status: status,
                at: new Date().toISOString()
            }]
        }
    }
</>
```

Bodies are identical across `pages/dispatch/board.scrml`,
`pages/dispatch/load-new.scrml`, `pages/dispatch/load-detail.scrml`,
`pages/customer/quote.scrml`, `pages/driver/load-detail.scrml`.

LOC reduction: 5 × 14 = 70 LOC (channel decl bodies) → 5 imports + 5 alias-tag
calls = 10 LOC. Net **−60 LOC**.

Canonical file: `examples/23-trucking-dispatch/channels/dispatch-board.scrml`

### `customer-events` (5 pages)

Bodies identical across `pages/customer/home.scrml`,
`pages/customer/loads.scrml`, `pages/customer/invoices.scrml`,
`pages/dispatch/billing.scrml`, `pages/driver/load-detail.scrml`.

LOC reduction: 5 × 16 = 80 → 10. Net **−70 LOC**.

Canonical file: `examples/23-trucking-dispatch/channels/customer-events.scrml`

### `load-events` (3 pages)

Bodies identical across `pages/customer/load-detail.scrml`,
`pages/dispatch/load-detail.scrml`, `pages/driver/load-detail.scrml`.
The customer/load-detail comment notes "subscribe-only role" but the body
itself is byte-identical to the others.

LOC reduction: 3 × 17 = 51 → 6. Net **−45 LOC**.

Canonical file: `examples/23-trucking-dispatch/channels/load-events.scrml`

### `driver-events` (2 pages)

Bodies identical across `pages/driver/home.scrml`,
`pages/driver/messages.scrml`.

LOC reduction: 2 × 17 = 34 → 4. Net **−30 LOC**.

Canonical file: `examples/23-trucking-dispatch/channels/driver-events.scrml`

## Skipped channels

None. Every channel in the dispatch app has at least 2 redeclarations and zero
consumer-scope-bound `topic=` references.

## Sequencing

Migrate one channel at a time, top-down by complexity. After each channel:
re-run `bun test compiler/tests/` and confirm the 8539-pass baseline holds, then
commit.

1. `dispatch-board` (5 pages, simplest body)
2. `customer-events` (5 pages, slightly larger body)
3. `load-events` (3 pages)
4. `driver-events` (2 pages)
5. Final FRICTION update + summary commit

## Import shape

Per §38.12.5, kebab-case channel names use the quoted-name import form. The
local alias is the markup tag name. Pattern:

```scrml
${ import { "dispatch-board" as dispatchBoard } from '../../channels/dispatch-board.scrml' }
<dispatchBoard/>
```

Relative path adjustment per file depth: `../../` from `pages/<role>/<file>.scrml`
to `channels/<topic>.scrml`.

## Expected totals

- 4 channel files created.
- 12 page files modified (15 channel decls removed; one page contains 3 decls,
  one contains 2 — driver/load-detail.scrml has 3, dispatch/load-detail.scrml
  has 2).
- LOC reduction: −60 + −70 + −45 + −30 = **−205 LOC**.
- Channels migrated: **4 of 4** (100%).
- Channels intentionally per-page: **0**.

## Tags

#migration-plan #p3.a-follow #channel #pure-channel-file #f-channel-003

## Links

- SPEC: `compiler/SPEC.md` §38.12 (cross-file inline-expansion)
- FRICTION: `examples/23-trucking-dispatch/FRICTION.md` §F-CHANNEL-003
- Canonical: `examples/15-channel-chat.scrml`
- Pre-snapshot: `docs/changes/p3.a-follow/pre-snapshot.md`
