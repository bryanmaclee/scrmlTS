# fix-cg-mounthydrate-sql-ref-placeholder — Intake

**Surfaced:** S40 2026-04-24, by `fix-cg-cps-return-sql-ref-placeholder` agent.
**Status:** filed, not started.
**Priority:** low — output is syntactically valid; semantic equivalent (undefined either way).

## Symptom

In `combined-007-crud.client.js:55`, the top-level `@users = ?{...}` mountHydrate path emits:

- **Pre-CPS-fix:** `_scrml_reactive_set("users", /* sql-ref:-1 */)` (placeholder leak — was visible)
- **Post-CPS-fix:** `_scrml_reactive_set("users", )` (trailing comma — undefined arg)

Both are syntactically valid; semantics identical (`@users` initializes to `undefined`). But the trailing comma is ugly and the missing init isn't intentional — it's just that the client-side mountHydrate path doesn't have a SQL handler.

## Why this is a separate fix

The CPS-fix scope was server-boundary only (`opts.boundary === "server"`). The client-boundary mountHydrate path emits SQL refs through a different emit path that:
1. Cannot emit `_scrml_sql\`...\`` directly — `_scrml_sql` is server-only and emitting it client-side trips E-CG-006 (server-only-pattern guard).
2. Currently emits the placeholder ExprNode literally → empty arg in the reactive_set call.

The "right" fix is one of:
- **(a)** Mount-hydrate path should fetch from `__mountHydrate` route (which IS server-side and would have proper SQL emission). Verify whether the mountHydrate aggregator (§8.11) is already supposed to handle this; if so, this is a wiring bug.
- **(b)** Suppress the bare `_scrml_reactive_set` for SQL-init reactive-decls on the client side entirely; let the mountHydrate fetch populate the value asynchronously.

Investigate which is correct before implementing.

## Reference

- Parent fix: `fix-cg-cps-return-sql-ref-placeholder` (S40 commit `9d65a46`)
- Anomaly report: `docs/changes/fix-cg-cps-return-sql-ref-placeholder/anomaly-report.md`
- Mount-hydrate spec: `compiler/SPEC.md` §8.11 (mount-hydration coalescing)

## Tags
#bug #codegen #sql #client-side #mounthydrate #low-priority #cosmetic
