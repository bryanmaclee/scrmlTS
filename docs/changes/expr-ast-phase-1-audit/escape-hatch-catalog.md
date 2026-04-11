# Escape-Hatch Catalog: expr-ast-phase-1 corpus audit

Generated: 2026-04-11T23:30:57.661Z
Branch: `changes/expr-ast-phase-1-audit`
Phase: Phase 1.5 audit (idempotency invariant)

## Summary

- Files audited: 14
- Expression nodes checked: 82
- Total escape hatches: 3
- Escape-hatch rate: 3.66%

### By Category

| Category | Count |
|---|---|
| interpolated-template | 0 |
| block-lambda | 0 |
| nested-paren-is | 0 |
| parse-error | 3 |
| conversion-error | 0 |
| unclassified | 0 |

## Per-File Summary

| File | Checked | Escapes | Idempotency | Error |
|---|---|---|---|---|
| 01-hello.scrml | 0 | 0 | PASS |  |
| 02-counter.scrml | 3 | 0 | PASS |  |
| 03-contact-book.scrml | 4 | 0 | PASS |  |
| 04-live-search.scrml | 3 | 0 | PASS |  |
| 05-multi-step-form.scrml | 8 | 0 | PASS |  |
| 06-kanban-board.scrml | 7 | 0 | PASS |  |
| 07-admin-dashboard.scrml | 4 | 0 | PASS |  |
| 08-chat.scrml | 9 | 0 | PASS |  |
| 09-error-handling.scrml | 6 | 0 | PASS |  |
| 10-inline-tests.scrml | 4 | 0 | PASS |  |
| 11-meta-programming.scrml | 2 | 0 | PASS |  |
| 12-snippets-slots.scrml | 1 | 0 | PASS |  |
| 13-worker.scrml | 10 | 3 | PASS |  |
| 14-mario-state-machine.scrml | 21 | 0 | PASS |  |

## Per-Category Details

### parse-error

Total occurrences: 3

Files: 13-worker.scrml

Sample source slices (first 3):

- **13-worker.scrml** (`for-stmt` -> `iterable`): `( let i = 2 ; i * i <= limit ; i + + )`
- **13-worker.scrml** (`for-stmt` -> `iterable`): `( let j = i * i ; j <= limit ; j += i )`
- **13-worker.scrml** (`for-stmt` -> `iterable`): `( let i = 2 ; i <= limit ; i + + )`

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
