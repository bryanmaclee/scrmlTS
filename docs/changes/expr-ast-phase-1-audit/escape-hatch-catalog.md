# Escape-Hatch Catalog: expr-ast-phase-1 corpus audit

Generated: 2026-04-11 (automated from bun test)
Branch: `changes/expr-ast-phase-1-audit`

**NOTE: The catalog summary test passes, but 10 of 14 per-file tests FAIL due to round-trip
invariant violations. See the "Round-Trip Failures" section for full details. This is a
stop-and-report trigger per audit task spec.**

---

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

---

## Per-File Summary

| File | Checked | Escapes | Round-Trip Failures | Error |
|---|---|---|---|---|
| 01-hello.scrml | 0 | 0 | 0 | |
| 02-counter.scrml | 3 | 0 | 0 | |
| 03-contact-book.scrml | 4 | 0 | **1 FAILURE** | |
| 04-live-search.scrml | 3 | 0 | **2 FAILURES** | |
| 05-multi-step-form.scrml | 8 | 0 | **8 FAILURES** | |
| 06-kanban-board.scrml | 7 | 0 | **4 FAILURES** | |
| 07-admin-dashboard.scrml | 4 | 0 | **4 FAILURES** | |
| 08-chat.scrml | 9 | 0 | **8 FAILURES** | |
| 09-error-handling.scrml | 6 | 0 | **3 FAILURES** | |
| 10-inline-tests.scrml | 4 | 0 | 0 | |
| 11-meta-programming.scrml | 2 | 0 | **1 FAILURE** | |
| 12-snippets-slots.scrml | 1 | 0 | 0 | |
| 13-worker.scrml | 10 | 3 | **5 FAILURES** | |
| 14-mario-state-machine.scrml | 21 | 0 | **14 FAILURES** | |

---

## Per-Category Details

### parse-error

Total occurrences: 3
Files: 13-worker.scrml

These escape hatches are from C-style `for` loop headers that the tokenizer stores
in the `iterable` field. These are correctly identified as parse errors since they
contain multiple statements (`let i = 2; i * i <= limit; i++`), not expressions.
This is a known limitation of the current field mapping -- C-style for loops put
their three-part header into `iterable` rather than a structured control-flow node.

Sample source slices (first 3):
- **13-worker.scrml** (`for-stmt` -> `iterable`): `( let i = 2 ; i * i <= limit ; i + + )`
- **13-worker.scrml** (`for-stmt` -> `iterable`): `( let j = i * i ; j <= limit ; j += i )`
- **13-worker.scrml** (`for-stmt` -> `iterable`): `( let i = 2 ; i <= limit ; i + + )`

---

## Unclassified Escape Hatches

None.

---

## ROUND-TRIP FAILURES (Phase 1 correctness issue -- STOP-AND-REPORT)

**STOP-AND-REPORT TRIGGER ACTIVATED.**

Total: 50 failures across 10 files.

The invariant `normalizeWhitespace(emitStringFromTree(exprNode)) === normalizeWhitespace(strField)`
fails universally wherever the string-form field contains multi-token expressions with punctuation.
There are two distinct root causes:

### Root Cause 1: Token-Joiner Spaces vs. AST-Emitted Compact Form

`joinWithNewlines()` in `ast-builder.js` (line 798) joins every token with a space separator
unless the tokens are on different source lines. This means:

| Source code | String field (stored) | Emitted from ExprNode |
|---|---|---|
| `loadContacts()` | `loadContacts ( )` | `loadContacts()` |
| `info.fields` | `info . fields` | `info.fields` |
| `MarioState.Small` | `MarioState . Small` | `MarioState.Small` |
| `( @name == "" )` | `( @name == "" )` | `@name == ""` |
| `[...@messages, msg]` | `[ ... @messages , msg ]` | `[...@messages, msg]` |

`normalizeWhitespace` only collapses whitespace runs to single spaces. It does NOT:
- Remove spaces around `.` and `(` and `)` and `[` and `]` and `,`
- Strip outer parentheses (Acorn parses `(@name == "")` and removes the redundant outer parens)

`emitStringFromTree` correctly emits compact standard JS syntax. The string field has
tokenizer-joined form with spaces around all punctuation. These two forms are semantically
equivalent but not textually equal even after whitespace normalization.

This pattern accounts for approximately 48 of the 50 failures.

### Root Cause 2: Multi-Statement Init Fields

In 2 cases, the `init` field contains multiple JS statements on separate lines (joined with
`\n` by `joinWithNewlines`). `parseExprToNode` only parses the FIRST expression. The emitted
string is a proper prefix of the original but not equal.

Examples:
- **08-chat.scrml**: `init = '""' + '\n' + 'persistMessage ( msg . id , ... )'` -> emitted: `""`
- **14-mario-state-machine.scrml**: `init = 'false' + '\n' + 'updateDisplay ( )'` -> emitted: `false`

These arise when `collectExpr` includes additional statements beyond the first expression
boundary. This is a separate semantic gap: the string field is not a single expression.

---

## Files That Pass Round-Trip (4 of 14)

- **01-hello.scrml** -- 0 expression nodes with both fields present
- **02-counter.scrml** -- 3 checked, all numeric literals (`0`, `1`) -- no punctuation
- **10-inline-tests.scrml** -- 4 checked, simple numeric/literal inits
- **12-snippets-slots.scrml** -- 1 checked, simple literal

The 4 passing files have only simple literal initializers where token-joining and AST emission
produce identical output (no member accesses, calls, parenthesized conditions, or punctuation).

---

## Escape-Hatch Inventory Complete

The 3 actual escape hatches (all `parse-error`, all in `13-worker.scrml`) are C-style
for-loop headers stored in the `iterable` field. They are legitimately unparseable as
expressions and correctly fall back to escape-hatch. No interpolated-template, block-lambda,
or nested-paren-is escape hatches appear in the corpus.

---

## Round-Trip Invariant

FAIL -- 10 of 14 files fail the round-trip invariant.

The invariant as defined in Phase 1 (`normalizeWhitespace` only) cannot hold for any expression
containing `.`, `(`, `)`, `[`, `]`, or `,` because the token joiner puts spaces around all
punctuation, and `normalizeWhitespace` does not remove those.

**Proposed fix for Phase 1.5 (PA decision):** Either:
1. Compare semantically via re-parsing: parse `strField` with Acorn and compare ESTree structural
   equality rather than string equality; or
2. Augment `normalizeWhitespace` to also strip spaces immediately before/after punctuation
   characters `.`, `(`, `)`, `[`, `]`, `,`, `;`; or
3. Change the invariant direction: instead of `emit(parse(strField)) === strField`, assert
   `parse(emit(parse(strField))) deep-equals parse(strField)` (round-trip structural idempotency).

Option 3 is the strongest invariant. Option 2 is easiest but fragile for quoted strings.

---

## Tags
#expr-ast-phase-1 #expr-ast-phase-1-audit #catalog #round-trip-failure

## Links
- [escape-hatch-catalog.json](./escape-hatch-catalog.json)
- [anomaly-report.md](./anomaly-report.md)
- [Phase 1 anomaly report](../expr-ast-phase-1/anomaly-report.md)
