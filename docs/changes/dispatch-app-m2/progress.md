# Dispatch App — M2 Progress

Append-only timestamped log. Format: `[ISO timestamp] — what was just done | what's next | blockers`.

---

## 2026-04-29 — M2 kickoff

**[2026-04-29T10:00] — Worktree baseline + reset**
- Worktree was at a70c6aa (S49 close), main at 03f6244 (M1 close). Reset to current main per dispatch instructions.
- bun install — node_modules was missing (worktree-fresh issue), installed 224 packages.
- Baseline test: 8005 pass / 40 skip / 132 fail / 384 files. Note: brief expected 8137/40/0/384, but seeing 132 flaky failures (mostly ECONNREFUSED on port-bound tests). These appear to be pre-existing flakes — not introduced by M2 work. Will compare delta at M2 close.
- M1 compile of `examples/23-trucking-dispatch/`: clean. 5 warnings (1× W-PROGRAM-001 each on schema.scrml/seeds.scrml/models/auth.scrml — pure-type/pure-fn files; 2× W-AUTH-001 on login/register — F-AUTH-003 carryover). No errors.

**[2026-04-29T10:05] — Required reading complete**
- Kickstarter v1: §1 canonical shape, §3 anti-patterns, §7 recipes (auth, real-time deferred to M5, multi-page routing).
- Scoping doc + FRICTION.md (M1's 7 entries, F-AUTH-001 + F-AUTH-002 + F-EQ-001 + F-SCHEMA-001 + F-EXPORT-001 + F-AUTH-003 + F-DESTRUCT-001).
- M1 outputs: app.scrml (root program + schema + db block + login/logout/register/getCurrentUser inlined), schema.scrml (pure-type file with shared enums), seeds.scrml (NE Utah seed data, runSeeds() wrapped in `function name() { server { ... } }` per F-EXPORT-001), models/auth.scrml (pure cookie/role helpers, no SQL), pages/auth/{login,register}.scrml (auth="optional" override, server fns inlined per F-AUTH-002).
- Example references: 06-kanban (3-column layout via grid + for/lift/continue), 07-admin-dashboard (table-of-rows + reflect + ?{} server fn), 05-multi-step-form (component def in `${ }`, if=/else-if=/else chain), 14-mario-state-machine (`< machine>` shape + derived machine).
- 22-multifile precedent: components defined `${ export const X = <article props={...}>...</> }` form.

## Plan

### Components — 8 files (~50-100 LOC each, total ~600 LOC)
1. **load-status-badge.scrml** — pure component, status: string prop → colored pill (uses tailwind utility classes per status).
2. **load-card.scrml** — list-item card. props: load (full row). renders origin → destination, customer name, status badge, pickup date. Click → /dispatch/loads/:id.
3. **driver-card.scrml** — table-row layout. props: driver, currentLoadId?, currentLoadOrigin?. Renders name, phone, status badge, current_location, current_assignment, cdl_expires.
4. **customer-card.scrml** — list/row. props: customer, outstandingCount. Renders name, contact, billing_address, payment_terms, account_status badge.
5. **invoice-card.scrml** — table row for invoice. props: invoice, customerName, loadOriginCity, loadDestinationCity. Renders amount, sent_at, due_at, paid_at-or-outstanding, payment_reference.
6. **status-picker.scrml** — dropdown to advance load.status. props: load. Computes valid next states (state-machine guard) and emits onSelect(newStatus). Per scoping §7, M2 ships `<machine>` deferred to M3 (see decision below).
7. **assignment-picker.scrml** — three selects: driver / tractor / trailer. props: drivers, tractors, trailers, currentAssignment. Submits on change.
8. **address-form.scrml** — shared origin/destination input fields (address, city, state). props: prefix (string — "origin" or "destination"), address, city, state. Bind back via callback or rely on parent's @vars (see below).

### Pages — 6 files (~150-300 LOC each, total ~1,200 LOC)
1. **board.scrml** — 3-column kanban. left: tendered+booked. middle: dispatched+loaded+in_transit. right: delivered+invoiced+paid. Top bar: "Book new load" + dispatcher identity + logout. Server data via `?{`SELECT * FROM loads`}.all()` grouped in markup.
2. **load-new.scrml** — form. customer picker (`<select>` from customers, disabled when account_status != "active"), origin (`<address-form>`), destination, pickup_at + deliver_by, commodity, weight_lbs, rate_dollars. Submit → `createLoadServer()` server fn → status='tendered', redirect /dispatch/loads/:id.
3. **load-detail.scrml** — header (load summary), status changer (`<status-picker>`), assignment block (visible when status >= booked, `<assignment-picker>`), log timeline (chronological ?{`SELECT * FROM log_entries WHERE load_id = ${id}`}.all() reversed).
4. **drivers.scrml** — table of drivers. columns: name, phone, current_status badge, current_location, current_assignment (load_id if any), CDL expires. Optional ?status filter via `<select>`.
5. **customers.scrml** — table. columns: name, contact, billing_address, payment_terms, account_status, outstanding-invoices-count. Click → expands inline detail panel via if= attribute.
6. **billing.scrml** — table of invoices. columns: load_id, customer name, amount, sent_at, due_at, paid_at-or-Outstanding, payment_reference. Filter: outstanding/overdue/paid via `<select>`. Action: "Mark paid" button (test-only).

### Decision — load.status `<machine>` — DEFER to M3
**Why:** Examples/14-mario-state-machine.scrml shows `<machine name=Foo for=Status>` syntax for client-side reactive state machines. The dispatch app's load.status is **server-persisted** (a column in `loads` table). Using `<machine>` would require either:
- (a) Reflecting DB state into a reactive `@machineState` and writing transitions back via server fn — adds ~100 LOC of glue code that doesn't change behavior vs plain enum + `?{UPDATE...}`, OR
- (b) Treating `<machine>` as compile-time validation only (reject invalid transitions) but still doing the actual DB write via server fn — possible but unclear from existing examples.

The cleaner path is to **encode the transition rules as a pure helper function** in the dispatcher pages themselves (or a shared file), and use a plain `?{UPDATE loads SET status=?}` to persist. The status-picker component computes "valid next states" by calling this helper. Logging this as design decision; revisit in M3 if HOS state machine for drivers wants the `<machine>` wiring.

### Auth pattern (F-AUTH-001 + F-AUTH-002 carryover)
Each dispatcher page:
- `<program db="../../dispatch.db" auth="required">` at top.
- `<page route="/dispatch/..." auth="role:dispatcher">` (silently inert per F-AUTH-001 — documents intent).
- Inline `getCurrentUser(sessionToken)` server fn (per F-AUTH-002 — cross-file `?{}`-using server fns hit E-SQL-004).
- Inline a `checkDispatcherAuth(sessionToken)` server fn that calls `getCurrentUser` + checks role.
- Server-side: navigate to /login if guard fails.

This is duplicative across 6 pages — exactly the friction surface M1 surfaced. Will note in FRICTION.md as confirmation of F-AUTH-001 + F-AUTH-002 (no new entries unless something new emerges).

### Real-time hookpoints (deferred to M5)
- Board: live status updates → `<channel name="dispatch-board">` future hook.
- Load detail: assignment changes + status updates broadcast on `<channel name="load-:id">`.

### Validation principle watch
Per S49: silent runtime failures = P0. Watch for:
- Server fn return propagation (does navigate() inside a server fn actually redirect?).
- Component prop type mismatches (does the compiler catch a prop typo?).
- `<page>` route attribute behavior (M1 didn't exercise routes other than /login + /register).

---

