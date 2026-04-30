# M4 — Customer slice progress log

Append-only timestamped log of M4 progress. Format: `YYYY-MM-DD HH:MM — what was just done / what's next / blockers`.

---

2026-04-29 — M4 dispatch started.

- Worktree baseline: HEAD was a70c6aa (S49 close); reset to main 7de8d79 (post-M3) per kickstarter requirement.
- Test baseline: 8,184 / 40 / 0 / 385 (after `bun install` + `bash scripts/compile-test-samples.sh` to populate dist/).
- Compile baseline: 26 files compile clean (M1: 6 + M2: 14 + M3: 6 = 26). 13 warnings: 11 W-PROGRAM-001 (purefn / type files), 2 W-AUTH-001 (auth pages), and trailing-dot warnings from M3 SQL formatting.
- Read all required docs: kickstarter v1, scoping.md, FRICTION.md (16 entries), M1 (app, schema, models/auth), M2 reference patterns (load-detail, customers, billing, load-new), M3 reference patterns (driver/load-detail, driver/home, driver/profile), helper components (load-card, load-status-badge, customer-card, invoice-card).

Plan locked:
- 6 customer pages, all role="customer", inline auth pattern carried forward.
- Reuse helpers: `formatRate`, `formatPickupAt` (load-card.scrml); `statusBadgeClasses`, `statusLabel` (load-status-badge.scrml); `invoiceStatus`, `invoiceStatusClasses`, `invoiceStatusLabel`, `formatIsoDate` (invoice-card.scrml); `paymentTermsLabel`, `accountStatusLabel`, `accountStatusClasses` (customer-card.scrml).
- Each page: `<program db="../../dispatch.db" auth="required">` opener, `<db>` block with relevant tables, inlined `getCurrentUser(sessionToken)` server fn, role gate `if (!user || user.role != "customer") return { unauthorized: true }`, F-RI-001 anchor + setError indirection on every server-call mutator.
- Quote page (only mutator) writes one `loads` row with status='tendered', rate_dollars=NULL, customer_id from joined `customers` row.
- Invoices page: "mark paid" button per scoping. Demo simplicity per scoping.
- No state machine; customer pages are read-mostly. No <machine> = no F-MACHINE-001/F-NULL-001 friction expected.
- Real-time hookpoints documented but not wired (M5).

Next: write home.scrml first.

---

2026-04-29 (continued) — All 6 pages written and committed.

Per-file LOC + commit sequence:
- home.scrml          (323 LOC) — landing: greeting + account_status + active loads + recent invoices + quote CTA
  Commit: 4b555a6 WIP(m4): pages/customer/home.scrml — landing
- loads.scrml         (253 LOC) — list: customer-scoped table + filter dropdown (all / tendered / active / delivered / invoiced / paid / cancelled)
- load-detail.scrml   (389 LOC) — tracking: header + carrier+equipment + status timeline + invoice link + cross-customer guard
  Commit: af3dad7 WIP(m4): pages/customer/loads.scrml + load-detail.scrml — list + tracking
- invoices.scrml      (302 LOC) — invoice table + filter + mark-paid demo + ?load=:id highlight
  Commit: 9402fc6 WIP(m4): pages/customer/invoices.scrml — list + mark-paid demo
- quote.scrml         (336 LOC) — rate-quote form → tendered load (rate=NULL); account_status='active' guard
- profile.scrml       (196 LOC) — read-only billing info; help link to dispatcher per scoping
  Commit: 906f6b3 WIP(m4): pages/customer/quote.scrml + profile.scrml — quote form + read-only billing

Total: 1,799 LOC (over the ~1,000 target — auth-pattern duplication per F-AUTH-002 inflates each page).

Frictions discovered:
- **F-NULL-002 (NEW, P1):** `!= null` / `== null` in server-fn body fires
  E-SYNTAX-042 in GCP3, no line/column. Distinct from F-NULL-001 (which
  is machine-presence triggered). Markup `if=(... != null)` is fine.
  Repro: 6-line minimal `/tmp/null-test.scrml`. Workaround: truthiness
  `if (x)` instead of `if (x != null)`.
- **F-CONSUME-001 (NEW, P2):** `@var` read inside attribute-string
  template interpolation `class="abc-${@x}"` not recognized as
  consumption — fires E-DG-002. Workaround: lift to `const` in
  logic block before `lift`. Repro: 4-line minimal.
- **F-AUTH-001 / F-AUTH-002 / F-COMPONENT-001 reconfirmations** —
  appended to FRICTION.md; cumulative 18 pages exercise the same
  inline-auth pattern; ~126 LOC of getCurrentUser duplication across
  the app.

Compile-clean verification: `bun compiler/src/cli.js compile examples/23-trucking-dispatch/`
emits 32 files in dist/ (6 M1 + 14 M2 + 6 M3 + 6 M4). Warnings are
pre-existing and benign: trailing-dot SQL warnings, W-PROGRAM-001 on
purefn / type files, W-AUTH-001 on auth pages.

Test suite final: **8,196 pass / 40 skip / 0 fail / 385 files**.
Up from baseline (8,184 pass) — likely from compiled customer dist files
adding fixtures. Zero regressions.

No state machine, no `null` in client-fn bodies (F-NULL-001 not triggered).
F-RI-001 narrow pattern (single mutator with branching) on `markPaid` and
`submit` (quote.scrml); both compile clean with the M2 anchor + setError
indirection pattern.

Real-time hookpoints documented per page:
- `/customer` → subscribe `customer-:id` for paid notifications
- `/customer/loads/:id` → subscribe `load-:id` for status/location pushes
- `/customer/invoices` → subscribe `customer-:id` for paid notifications
- `/customer/quote` → broadcast `dispatch-board` on new tender insert

Smoke-test via dev server is blocked by OQ-2 (pre-existing scrml:auth
bootstrap issue) — not exercised in M4. Dist artifacts compile clean,
which is the validation surface available without OQ-2 fix.

Status: READY FOR MERGE.

Next: final commit (FRICTION.md + progress.md updates).

