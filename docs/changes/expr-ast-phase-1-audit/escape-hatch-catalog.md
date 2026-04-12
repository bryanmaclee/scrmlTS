# Escape-Hatch Catalog: expr-ast-phase-1 corpus audit

Generated: 2026-04-12T01:54:59.694Z
Branch: `changes/expr-ast-phase-1-audit`
Phase: Phase 1.5 audit (idempotency invariant)

## Summary

- Files audited: 14
- Expression nodes checked: 145
- Total escape hatches: 29
- Escape-hatch rate: 20.00%

### By Category

| Category | Count |
|---|---|
| interpolated-template | 0 |
| block-lambda | 0 |
| nested-paren-is | 0 |
| parse-error | 29 |
| conversion-error | 0 |
| unclassified | 0 |

## Per-File Summary

| File | Checked | Escapes | Idempotency | Error |
|---|---|---|---|---|
| 01-hello.scrml | 0 | 0 | PASS |  |
| 02-counter.scrml | 3 | 0 | PASS |  |
| 03-contact-book.scrml | 12 | 4 | PASS |  |
| 04-live-search.scrml | 7 | 2 | PASS |  |
| 05-multi-step-form.scrml | 10 | 0 | PASS |  |
| 06-kanban-board.scrml | 13 | 3 | PASS |  |
| 07-admin-dashboard.scrml | 14 | 5 | PASS |  |
| 08-chat.scrml | 16 | 3 | PASS |  |
| 09-error-handling.scrml | 9 | 0 | PASS |  |
| 10-inline-tests.scrml | 4 | 0 | PASS |  |
| 11-meta-programming.scrml | 4 | 1 | PASS |  |
| 12-snippets-slots.scrml | 8 | 3 | PASS |  |
| 13-worker.scrml | 13 | 3 | PASS |  |
| 14-mario-state-machine.scrml | 32 | 5 | PASS |  |

## Per-Category Details

### parse-error

Total occurrences: 29

Files: 03-contact-book.scrml, 04-live-search.scrml, 06-kanban-board.scrml, 07-admin-dashboard.scrml, 08-chat.scrml, 11-meta-programming.scrml, 12-snippets-slots.scrml, 13-worker.scrml, 14-mario-state-machine.scrml

Sample source slices (first 3):

- **03-contact-book.scrml** (`bare-expr` -> `expr`): `. all ( )`
- **03-contact-book.scrml** (`bare-expr` -> `expr`): `< / span >
< span class = "email" >`
- **03-contact-book.scrml** (`bare-expr` -> `expr`): `< / span >
< span class = "phone" >`

## Unclassified Escape Hatches

None.

## Round-Trip Idempotency Invariant

PASS -- all 14 files pass the idempotency invariant.

The invariant `deepEqualExprNode(node, parse(emit(node)))` holds for
all 82 expression nodes across the 14 examples files.

## Multi-Statement Init Fields (Phase 2 flag)

Two reactive-decl nodes in 08-chat.scrml and 14-mario-state-machine.scrml
have `init` fields containing multiple JS statements concatenated by
joinWithNewlines. These are NOT idempotency failures (parse only sees the
first expression and both checks pass), but they indicate collectExpr
over-collection. Flagged for Phase 2 investigation.

## Tags
#expr-ast-phase-1 #expr-ast-phase-1-audit #catalog #phase-1-5

## Links
- [escape-hatch-catalog.json](./escape-hatch-catalog.json)
- [anomaly-report.md](./anomaly-report.md)
- [Phase 1 anomaly report](../expr-ast-phase-1/anomaly-report.md)
