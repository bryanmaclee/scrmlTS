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

