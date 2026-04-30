# Dispatch App M6 — Progress

## 2026-04-29 — startup verification + baseline

- Worktree: `agent-a71cdd71cd96fed29`. Reset to main HEAD `eb5cf2a`.
- Test baseline (after `bun run test` with pretest): 8196/40/0/385. Matches expected.
- M1-M5 outputs read: 20 page files (~6,530 LOC), schema, app.scrml, seeds, models/auth, 8 components.
- FRICTION.md: 25+ entries. Last: F-COMPILE-001.

## Plan

3 lin token uses per scoping §6:

1. **Acceptance token** — issued when dispatcher books load (tendered → booked). Consumed when customer signs rate confirmation (status: booked → dispatched). Page touches: dispatch/load-detail.scrml (mint), customer/load-detail.scrml (consume).
2. **BOL token** — issued when driver marks load loaded. Consumed when driver uploads BOL (creates `bol_received` log entry). Page touches: driver/load-detail.scrml.
3. **Payment token** — issued when invoice sent. Consumed when customer marks paid. Page touches: dispatch/billing.scrml (mint), customer/invoices.scrml (consume).

### Schema delta

Add `lin_tokens` table:

```sql
CREATE TABLE IF NOT EXISTS lin_tokens (
    token TEXT PRIMARY KEY,
    load_id INTEGER NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('acceptance', 'bol', 'payment')),
    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    consumed_at DATETIME,
    consumed_by INTEGER REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_lin_tokens_load_kind ON lin_tokens(load_id, kind);
```

Update `app.scrml` `< schema>` block + `< db>` tables list. Bootstrap dispatch.db with new schema.

### Files to amend

1. `app.scrml` — add `lin_tokens` table to `< schema>` + `tables="..."` list.
2. `pages/dispatch/load-detail.scrml` — mint acceptance token on tendered → booked.
3. `pages/customer/load-detail.scrml` — render Sign Rate Confirmation button + consume token.
4. `pages/driver/load-detail.scrml` — mint BOL token on dispatched → loaded; consume on BOL upload.
5. `pages/dispatch/billing.scrml` — mint payment token when sending invoice.
6. `pages/customer/invoices.scrml` — Mark Paid button consumes payment token.
7. `seeds.scrml` — add `lin_tokens` to schema bootstrap if needed.
8. `README.md` — final run instructions, persona credentials, friction pointer.
9. `FRICTION.md` — final summary section.

### Constraints

- No cross-file component imports (F-COMPONENT-001 carryforward).
- Inline server fns with SQL (F-AUTH-002).
- F-RI-001 workaround: setError() helper; @errorMessage = "" pre-server-call anchor.
- Tailwind 3 only.
- Per F-AUTH-002, lin token mint/consume helpers can't live cross-file (SQL access).
  Inline both into each page that needs them.
- The `lin` keyword is a TYPE-SYSTEM enforcement — single-consumption within a function.
  The DB-side `lin_tokens` table provides the durable single-use guard
  (UPDATE ... WHERE consumed_at IS NULL — affected rows = 0 means already consumed).

## 2026-04-29 — lin tokens 1, 2, 3 wired

- **Schema** — lin_tokens table added to app.scrml < schema> + < db tables=> list. Bootstrapped in dispatch.db.
- **Use 1 (acceptance)** — dispatch/load-detail mints on tendered → booked. Customer/load-detail consumes on Sign Rate Confirmation; advances load to dispatched.
- **Use 2 (BOL)** — driver/load-detail mints on dispatched → loaded; uploadBolServer takes `lin token: string`, consumes via DB UPDATE. Upload BOL button disables post-consume.
- **Use 3 (payment)** — dispatch/billing ensureInvoicesServer mints per new invoice. customer/invoices markPaidServer consumes via lin param. Mark Paid button disabled when no active token.

### F-LIN-001 (new finding, M6)
SQL `?{}` interpolation does NOT count as `lin` consumption per §35.3 rule 1, even though template-literal `${ticket}` does in example 19. Workaround: copy lin var into template literal first (`consume:${token}`), then `.substring(8)` back into the SQL. Adds 1 LOC + 1 cognitive step per consume site (3 sites total).

### W-DG-002 / underscore-prefix-suppress observation
The compiler suggests prefixing unused @vars with `_` to suppress E-DG-002, but `@_acceptanceIssuedAt` still fires the warning ("Consider … prefix with `_` (e.g., `@__acceptanceIssuedAt`)" — recursion!). Workaround: just delete the unused var.

## 2026-04-29 — M6 close

- **Test suite:** 8196 / 40 / 0 / 385 (matches baseline)
- **Compile:** 32 source files → 17 HTML / 28 client.js / 17 server.js (F-COMPILE-001 baseline preserved)
- **Files modified:**
  - `app.scrml` — schema delta + tables list
  - `pages/dispatch/load-detail.scrml` — mint acceptance token + display pending pill
  - `pages/customer/load-detail.scrml` — Sign rate confirmation button + consume
  - `pages/driver/load-detail.scrml` — mint BOL token + uploadBolServer takes lin token
  - `pages/dispatch/billing.scrml` — mint payment tokens per invoice
  - `pages/customer/invoices.scrml` — Mark paid passes lin token; consume server-side
  - `README.md` — final run instructions + persona walkthrough + lin semantics
  - `FRICTION.md` — F-LIN-001 + F-DG-002-PREFIX + 5 M6 reconfirmations + final summary section
  - `dispatch.db` — lin_tokens table bootstrapped
  - `docs/changes/dispatch-app-m6/progress.md` — this file
- **New findings:**
  - F-LIN-001 (P1) — SQL `?{}` interpolation does NOT count as `lin` consume per §35.3 rule 1
  - F-DG-002-PREFIX (P2) — `@_var` underscore-prefix doesn't suppress E-DG-002 despite warning text
- **Commits (newest first):**
  - `bef43d1` WIP(m6): FRICTION.md — final summary + 2 new findings + 5 reconfirmations
  - `24dc261` WIP(m6): README — final run instructions
  - `a643401` WIP(m6): payment lin token (use 3)
  - `77fbc81` WIP(m6): acceptance + BOL lin tokens (uses 1+2)
  - `2526ba5` WIP(m6): schema + bootstrap

- **Status:** READY FOR MERGE.
