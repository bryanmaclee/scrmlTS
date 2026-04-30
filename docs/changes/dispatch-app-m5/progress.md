# Trucking Dispatch — M5 Real-time channels — Progress

Append-only timestamped log of M5 work.

---

## 2026-04-29 — Startup + baseline

- Worktree reset to main HEAD (6e75073).
- Baseline `bun test`: 1444 pass / 8 skip / 420 fail / 283 errors (NOT
  the 8,196 / 40 / 0 / 385 expected by the kickstarter — main appears to
  be in a different state. Goal: don't make this worse.)
- Baseline `bun compiler/src/cli.js compile examples/23-trucking-dispatch/`
  succeeds: **32 files compiled clean**, 13 warnings (W-PROGRAM-001 +
  W-AUTH-001 + W-SQL statement-boundary warnings — all carryover from
  M1-M4).
- Example 15 (channel chat) compiles clean — the canonical reference
  shape for `<channel>` works.

## 2026-04-29 — Plan

**Channel mechanism understood (from example 15 + kickstarter §7):**
The scrml channel pattern is:
```scrml
<channel name="topic-name">
  ${
    @shared messages = []                        // sync'd across clients

    server function postMessage(...) {
      messages = [...messages, { ... }]          // any client write propagates
    }
  }
</>
```
- The channel auto-creates a WebSocket endpoint at `/_scrml_ws/<name>`.
- `@shared` is a declaration modifier; outside the channel body, the
  variable is read as `@messages` (with the sigil).
- Server fns inside the channel scope mutate the @shared var; the
  infrastructure broadcasts.
- This is NOT classic pub/sub with explicit publish/subscribe calls —
  the @shared pattern handles broadcast implicitly.

**Scoping doc named the 4 channels (dispatch-board, driver-:id, load-:id,
customer-:id) in pub/sub terms.** The actual scrml mechanism is shared
state. Adapting:

- `dispatch-board` — `@shared boardEvents = []` sync'd to all
  dispatchers. Publishers append events with timestamp + payload.
  Subscribers (the board page) iterate the shared list and refresh
  affected loads.
- `driver-:id` (per-driver) — `@shared driverEvents = []` sync'd between
  the driver and their dispatcher. Per-driver scoping is achieved by
  using `${driverId}` in the channel name attribute.
- `load-:id` (per-load) — `@shared loadEvents = []` sync'd between
  driver, dispatcher, and customer of that load.
- `customer-:id` (per-customer) — `@shared customerEvents = []` sync'd
  between customer and their dispatcher.

**Risk:** does scrml support attribute interpolation in channel names?
e.g. `<channel name="driver-${driverId}">`? If not, all "per-id" channels
collapse to broadcast channels OR we need server-side filtering. Will
test early.

**File-level changes (additive integration):**
- `pages/dispatch/board.scrml` → subscribe `dispatch-board`, refresh
  on event. ~30 LOC.
- `pages/dispatch/load-detail.scrml` → publish `dispatch-board` +
  `load-:id` on status change. Subscribe `load-:id` for cross-actor.
  ~30 LOC.
- `pages/dispatch/load-new.scrml` → publish `dispatch-board` on tender
  creation. ~10 LOC.
- `pages/driver/load-detail.scrml` → publish `dispatch-board` +
  `load-:id` on status. ~20 LOC.
- `pages/driver/messages.scrml` → REPLACE server-rendered chat with
  `driver-:id` real-time channel. ~80 LOC delta (likely net reduction).
- `pages/driver/home.scrml` → subscribe `driver-:id` for badge. ~20 LOC.
- `pages/customer/load-detail.scrml` → subscribe `load-:id`. ~30 LOC.
- `pages/customer/loads.scrml` → subscribe `customer-:id`. ~20 LOC.
- `pages/customer/invoices.scrml` → subscribe `customer-:id`. ~20 LOC.
- `pages/customer/home.scrml` → subscribe `customer-:id`. ~20 LOC.
- `pages/customer/quote.scrml` → publish `dispatch-board` on quote
  create. ~10 LOC.

**Estimate:** ~290 LOC. Within the ~600 budget; leaves headroom for
friction findings + extra wiring on per-id channels.

**Plan ordering:**
1. Test channel name interpolation on a tiny throwaway file.
2. Wire `dispatch-board` (broadcast scope, simplest).
3. Wire `driver-:id` (per-id, includes messages chat refactor).
4. Wire `load-:id` (per-id, three subscribers).
5. Wire `customer-:id` (per-id, customer + dispatcher subs).
6. Final compile-clean verification.
7. FRICTION.md updates.

## 2026-04-29 — Channel name interpolation test

**Result: F-CHANNEL-001 — silently inert.** `<channel name="driver-${id}">`
compiles clean but the emitted WebSocket URL mangles the interpolation
to a literal underscore-string. ALL "per-id" channels collapse to a
single broadcast topic. Documented as P0 in FRICTION.

Pivot: replace per-id channels with single broadcast channels +
payload-side filtering (`targetDriverId`, `targetCustomerId`,
`payload.loadId`).

## 2026-04-29 — Wire complete

- Commit `272e49a` — dispatch-board on board.scrml + load-detail +
  load-new (publishers + subscribers).
- Commit `5595c6b` — driver-events on driver/messages + home;
  load-events publisher on driver/load-detail (transitions +
  one-shot location ping).
- Commit `f79beea` — customer-events on customer/loads, invoices,
  home (subscribers); customer/load-detail load-events subscriber;
  customer/quote dispatch-board publisher; customer/invoices markPaid
  publishes invoice-paid.
- Commit `<latest>` — billing.scrml customer-events publisher;
  driver/load-detail customer-events publisher on delivery transition.

## 2026-04-29 — Friction findings

Six new entries appended to FRICTION.md:
- **F-CHANNEL-001** (P0) — name interpolation silently inert.
- **F-CHANNEL-002** (P1) — no on-change effect hook for @shared.
- **F-CHANNEL-003** (P1) — channels per-page, not cross-file
  (~180 LOC of boilerplate across 12 pages).
- **F-CHANNEL-004** (P2) — undocumented channel-scope ↔ page-scope
  rules.
- **F-CHANNEL-005** (P1) — per-channel auth scoping not declarative;
  WebSocket endpoint open-broadcast at the wire level.
- **F-CHANNEL-006** (P2) — channel-internal @shared decls fire
  E-DG-002 if not also read in markup.

Plus reconfirmations:
- F-AUTH-001 — same fallback pattern reused in 12 more pages.
- F-AUTH-002 — ~144 LOC of channel-publish helpers inline-duplicated.
- F-COMPONENT-001 — zero cross-file components in the new code.
- F-IDIOMATIC-001 — zero `is not` / `is some` in the new code.

## 2026-04-29 — Final compile + status

Compile: 32/32 files clean, 13 warnings (same as baseline).
LOC delta: +620 / -33 = +590 net (within ~600 budget).
Test suite: baseline-preserving (no compiler changes).

