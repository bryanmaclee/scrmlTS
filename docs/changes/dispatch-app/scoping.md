---
status: proposal
target: examples/23-trucking-dispatch/
sized: ~5,500 LOC across ~25 files
purpose: scrml language stress test — surface real friction across full feature surface
---

# Trucking Dispatch App — Scoping Proposal

The 3-5k LOC trucking dispatch example app the user has been pointing to since S48. Domain matches the user's actual operation (northeastern UT, oil and gas, owner-operator who drives one of the trucks). Purpose is **language stress test**, not shipping product — surfaces friction in `auth=`, role-gating, real-time, multi-file, schema/migrations, lin tokens, navigation, server functions, before deferred design questions get re-opened.

## 0. Decisions locked from S50 user input

- **All 3 functional slices integrated:** load tendering + assignment, driver log, customer billing.
- **3 personas:** dispatcher (admin), driver (mobile-first), customer (rate/track).
- **Real-time:** yes — load status, dispatch chat, driver location pings.
- **LOC ceiling:** 5,000+; let the language drive size, don't artificially constrain.
- **Path:** `examples/23-trucking-dispatch/` (next slot after `22-multifile/`).
- **Multi-file mandatory** — single-file 5k LOC is a cruelty unto adopters, and this is a legitimacy test for §21 cross-file imports anyway.

## 1. Domain model — 9 tables (~400 LOC schema)

### `users`
- `id`, `email` (unique), `password_hash`, `role` (enum: `dispatcher` | `driver` | `customer`), `created_at`, `last_login_at`
- Drives `<program auth="required">` + per-route role gating

### `customers`
- `id`, `name`, `contact_name`, `contact_email`, `contact_phone`, `billing_address`, `payment_terms` (net 15 / 30 / 60), `account_status` (active / on_hold / closed)
- `user_id` FK (the customer-portal login)

### `drivers`
- `id`, `name`, `phone`, `cdl_number`, `cdl_state`, `cdl_expires`, `current_status` (off_duty / on_duty / driving / sleeper_berth), `current_location` (string — last reported)
- `user_id` FK (the driver-portal login)

### `tractors`
- `id`, `unit_number`, `year`, `make`, `model`, `vin`, `license_plate`, `current_driver_id` FK nullable, `status` (active / maintenance / out_of_service)

### `trailers`
- `id`, `unit_number`, `type` (dry_van / reefer / flatbed / tanker), `length_ft`, `capacity_lbs`, `current_tractor_id` FK nullable

### `loads`
- `id`, `customer_id` FK, `origin_address`, `origin_city`, `origin_state`, `destination_address`, `destination_city`, `destination_state`
- `pickup_at` (datetime), `deliver_by` (datetime), `commodity` (string), `weight_lbs`, `rate_dollars`
- `status` enum: `tendered` → `booked` → `dispatched` → `loaded` → `in_transit` → `delivered` → `invoiced` → `paid`
- `created_at`, `updated_at`

### `assignments`
- `id`, `load_id` FK, `driver_id` FK, `tractor_id` FK, `trailer_id` FK
- `assigned_at`, `unassigned_at` nullable
- One active per load (history preserved)

### `log_entries`
- `id`, `driver_id` FK, `load_id` FK nullable, `type` enum: `pre_trip` | `post_trip` | `bol_received` | `pod_signed` | `fuel_stop` | `breakdown` | `hos_change`
- `at` (datetime), `payload` (JSON — varies by type)

### `invoices`
- `id`, `load_id` FK, `customer_id` FK, `amount_dollars`, `sent_at`, `due_at`, `paid_at` nullable, `payment_reference` nullable

### `messages`
- `id`, `channel_id` (string — `dispatch-board` / `driver-:id` / `load-:id` / `customer-:id`)
- `from_user_id` FK, `body`, `at`

## 2. Routes — 18 total (3 personas × 6 each)

### Dispatcher (`/dispatch/...`) — 6 routes
- `/dispatch` — board view: 3-column kanban (tendered → in-transit → delivered/invoiced)
- `/dispatch/loads/new` — book a load (tender from customer becomes booked)
- `/dispatch/loads/:id` — load detail + assignment UI (driver/tractor/trailer pickers)
- `/dispatch/drivers` — roster + current_status + current_location
- `/dispatch/customers` — list + detail (account status, payment history)
- `/dispatch/billing` — outbound invoices, paid/unpaid

### Driver (`/driver/...`) — 6 routes
- `/driver` — current load + status picker + quick-actions
- `/driver/loads/:id` — load detail (pickup/delivery, BOL/POD upload, status update)
- `/driver/loads/:id/log` — chronological log of entries on this load
- `/driver/hos` — hours-of-service current cycle + log entries
- `/driver/messages` — chat with dispatcher
- `/driver/profile` — name/phone/CDL info (read-only)

### Customer (`/customer/...`) — 6 routes
- `/customer` — landing — current loads + recent invoices
- `/customer/loads` — list (booked / in-transit / delivered)
- `/customer/loads/:id` — load tracking (status timeline, current location, ETA)
- `/customer/invoices` — list + pay status
- `/customer/quote` — request a rate quote (creates a tender)
- `/customer/profile` — billing info (read-only)

### Auth roots (3 routes outside personas)
- `/login` — common
- `/logout` — common
- `/register` — limited; customers can self-register, drivers/dispatchers seeded

## 3. File layout — multi-file (~25 files, ~5,500 LOC)

```
examples/23-trucking-dispatch/
├── README.md
├── app.scrml                      app shell + <program> + auth
├── schema.scrml                   <db> with all 9 tables + migrations
├── models/
│   ├── load.scrml                 status state machine + transitions
│   ├── driver.scrml               HOS state machine + transitions
│   └── auth.scrml                 user role helpers + login server fns
├── components/
│   ├── load-card.scrml            list-item shape
│   ├── load-status-badge.scrml    pill rendering load.status
│   ├── driver-card.scrml
│   ├── driver-status-badge.scrml
│   ├── customer-card.scrml
│   ├── invoice-card.scrml
│   ├── timeline-entry.scrml       for load history
│   ├── message-thread.scrml       real-time chat surface
│   ├── address-form.scrml         shared address fields
│   ├── status-picker.scrml        dispatcher load-status changer
│   ├── assignment-picker.scrml    driver/tractor/trailer pickers
│   └── file-upload.scrml          BOL / POD photo upload
├── pages/
│   ├── dispatch/
│   │   ├── board.scrml            /dispatch
│   │   ├── load-new.scrml         /dispatch/loads/new
│   │   ├── load-detail.scrml      /dispatch/loads/:id
│   │   ├── drivers.scrml
│   │   ├── customers.scrml
│   │   └── billing.scrml
│   ├── driver/
│   │   ├── home.scrml
│   │   ├── load-detail.scrml
│   │   ├── load-log.scrml
│   │   ├── hos.scrml
│   │   ├── messages.scrml
│   │   └── profile.scrml
│   ├── customer/
│   │   ├── home.scrml
│   │   ├── loads.scrml
│   │   ├── load-detail.scrml
│   │   ├── invoices.scrml
│   │   ├── quote.scrml
│   │   └── profile.scrml
│   └── auth/
│       ├── login.scrml
│       └── register.scrml
└── seeds.scrml                    sample data: 3 customers, 4 drivers, 3 tractors, 4 trailers, 8 loads
```

LOC estimate (rough): schema 400 + models 600 + components 1,500 + pages 2,500 + auth 200 + seeds 300 = **~5,500 LOC**. Could grow to 6,500 if real-time + HOS state machine eat more than estimated.

## 4. Real-time channels — 4 channels

- **`dispatch-board`** — every load status change broadcast; subscribed by dispatcher board + customer load-detail pages
- **`driver-:id`** — direct messages from dispatcher + load assignment notifications
- **`load-:id`** — status timeline updates + driver location pings (subscribed by dispatcher load-detail + driver load-detail + customer load-detail when active)
- **`customer-:id`** — invoice updates + load arrival notifications

Each channel exercises §38 `<channel>` runtime + WebSocket bootstrap.

## 5. Auth + role gating

- `<program auth="required">` at root → forces login on all `/dispatch`, `/driver`, `/customer` routes.
- **Per-route role gate uses Option A:** `auth="role:dispatcher"` / `auth="role:driver"` / `auth="role:customer"` syntax declared on `<page>` or per-route component.
- **Critical:** Option A is NOT a working compiler feature today. Compiler accepts the attribute as a generic HTML attribute with NO role-gating effect. App must layer a server-side role-check fallback so it actually behaves correctly. Pseudo:
  ```scrml
  <page route="/dispatch" auth="role:dispatcher">
    ^{
      const user = getCurrentUser()
      if (user.role != "dispatcher") {
        return redirect("/login?reason=unauthorized")
      }
    }
    ...
  </page>
  ```
- The redundancy IS the friction-surface — adopter writes `auth="role:X"` AND a server-side check because the compiler doesn't enforce. This is the gap the user wanted exposed before re-opening multi-value `auth=` design.
- Log the gap in `FRICTION.md` as F-AUTH-001 (P0): "compiler accepts `auth="role:X"` and emits no error, no diagnostic, no runtime effect — adopter must hand-roll the role check, contradicts S49 validation principle."

## 6. Lin tokens — where they fit

- Every load has a single-use **acceptance token** when tender → booked transition fires (customer signs the rate confirmation). One driver can claim it via `<rate-confirmation>` form. `lin` ensures it can't be double-spent.
- BOL submission token: driver uploads BOL once per load. `lin` prevents re-upload.
- Optional: invoice payment token (if simulating customer payment — single-use idempotency key)

This exercises §35.2 lin-decl, §35.2.1 lin-params, §35.2.2 cross-block consumption.

## 7. State machines — the load status flow

Use `<machine>` for `load.status`:

```
tendered → booked → dispatched → loaded → in_transit → delivered → invoiced → paid
                                                              ↘ cancelled (terminal)
```

Each transition validates source state + may have side effects (insert log_entry, broadcast on `dispatch-board`).

Driver HOS as a second machine:
```
off_duty ⇄ on_duty ⇄ driving
            ⇣
         sleeper_berth
```

Per FMCSA-ish rules (simplified): max 11 hours driving in 14-hour duty window; this is rough enough for the language to exercise but not regulatory accurate.

## 8. Milestones — 6 dispatches

| # | Slice | LOC est. | Output |
|---|---|---|---|
| M1 | Schema + auth scaffold | ~700 | `app.scrml`, `schema.scrml`, `models/auth.scrml`, `pages/auth/{login,register}.scrml`, `seeds.scrml` |
| M2 | Dispatcher slice | ~1,500 | `pages/dispatch/*` (6 pages) + relevant components |
| M3 | Driver slice | ~1,200 | `pages/driver/*` (6 pages) + HOS state machine + log entries |
| M4 | Customer slice | ~1,000 | `pages/customer/*` (6 pages) + invoices |
| M5 | Real-time integration | ~600 | `<channel>` setup + per-channel subscribers wired into existing pages |
| M6 | Polish + lin tokens + README + manual run | ~500 | lin tokens for acceptance/BOL, README with run instructions, surface friction findings |

Each milestone is a separate dispatch:
- **scrml-dev-pipeline** is for compiler work; this is application writing → use **Agent (general-purpose with model=opus)** with kickstarter v1 brief per pa.md
- Worktree-isolation block + path discipline per pa.md F4 finding
- Each dispatch reads the prior milestone's output and the scoping doc
- Friction findings recorded in `examples/23-trucking-dispatch/FRICTION.md` (running log, replaces hand-off ad-hoc tracking)

## 9. Friction findings format

Each milestone's dispatch is required to maintain `examples/23-trucking-dispatch/FRICTION.md` with entries:

```markdown
## F-NN — short title

**Surfaced in:** M2 dispatcher load-detail page
**What I tried:** [verbatim adopter intent]
**What didn't work:** [error / unexpected behavior]
**Workaround used:** [if any — specific syntax]
**Suggests:** [feature gap / spec ambiguity / DX bug]
```

This is the load-bearing output of the entire 5k LOC exercise. The app exists to produce this file.

## 10. Constraints

- **No new compiler features** during the build. If a feature is missing, work around it and log the friction. The point is to find gaps, not pre-implement them.
- **Tailwind 3 only** (custom theme deferred per S49 — row 183).
- **No real auth provider** — passwords are SHA-256 hashed in-app for the demo (real auth out of scope; security comments in code).
- **No real GPS** — driver location is a string field updated manually.
- **No real payment** — invoice "paid" is a button click in customer portal.
- **bun:sqlite database** — single-file `dispatch.db`; seeds.scrml runs on `init`. No Postgres for v1.
- **Validation principle in force** (S49): if compiler accepts → app should run. Any silent runtime failure is a P0 friction finding.

## 11. Decisions locked (S50 user input)

1. **Path:** `examples/23-trucking-dispatch/` ✅
2. **Auth role-gate:** **Option A** — `auth="role:dispatcher"` / `auth="role:driver"` / `auth="role:customer"` syntax. **This is currently NOT a working compiler feature** — only `auth="required"` is recognized today. Adopters using Option A will get the value through to HTML as a generic attribute with no compile-time error and no runtime role-gating effect. **The app must work anyway** — layer the actual role check server-side as fallback. Document the gap in `FRICTION.md` as P0: *"compiler accepts `auth="role:X"` but does nothing with it — silent failure violates S49 validation principle."* This is the deliberate friction surface the user wanted: see the gap before designing multi-value `auth=` semantics.
3. **Customer self-register:** YES — `/register` is open; new customer signups create a `customers` row with `account_status='active'`.
4. **HOS realism:** simple 11/14 rule.
5. **Domain choices:** as proposed.
6. **Milestone dispatch model:** 6 sequential dispatches via `Agent` (subagent_type: general-purpose, model: opus, isolation: worktree). Each reads prior outputs + this scoping doc + kickstarter v1 brief.
7. **App writer agent:** general-purpose with explicit kickstarter v1 brief per dispatch. Forging deferred — if friction emerges across milestones, forge on M3+.

## Tags
#dispatch-app #language-stress-test #scoping #5500-loc #3-personas #real-time #multi-file #lin-tokens #state-machine #auth-required #role-gating #friction-discovery #examples-23

## Links
- pa.md (this repo) — dev dispatch + briefing rules
- `docs/articles/llm-kickstarter-v1-2026-04-25.md` — required brief for any scrml-writing dispatch
- `examples/22-multifile/` — closest precedent for multi-file structure
- `examples/15-channel-chat.scrml` — `<channel>` reference
- `examples/19-lin-token.scrml` — lin reference
- `examples/14-mario-state-machine.scrml` — `<machine>` reference
- `compiler/SPEC.md` — §21 imports/exports, §35 lin, §38 channels, §40 middleware/`<program>`, §44 SQL, §52 auth/state-authority, §54 state-local transitions
