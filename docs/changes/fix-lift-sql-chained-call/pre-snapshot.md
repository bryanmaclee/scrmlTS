# pre-snapshot — fix-lift-sql-chained-call

**Captured:** 2026-04-24
**Branch base:** main `74881ea` (rebased)
**Worktree branch:** worktree-agent-adca4eaa03112695b

## Test baseline

```
 7565 pass
 40 skip
 0 fail
 27275 expect() calls
Ran 7605 tests across 354 files. [10.49s]
```

(Note: the `bun test` exit reports an ECONNREFUSED before the summary — that's a pre-existing,
unrelated network test artifact, not a regression.)

## Examples — `bun --check` state

After fresh recompile of 03/07/08 on `74881ea`:

| Example | bun --check | Symptom |
|---|---|---|
| examples/dist/03-contact-book.server.js | FAIL | `return null; /* server-lift: non-expr form */` then `. all ( );` orphan |
| examples/dist/07-admin-dashboard.server.js | FAIL | Same shape, `. all ( );` orphan |
| examples/dist/08-chat.server.js | FAIL | Same shape, `. all ( );` orphan |

All other example dist files were not recompiled (timestamps from Apr 10).

## AST shape (probed via probe.mjs)

For example 03 `loadContacts`:

```json
[
  { "kind": "lift-expr",
    "expr": { "kind": "markup",
              "node": { "kind": "sql",
                        "query": "SELECT id, name, email, phone FROM contacts ORDER BY name",
                        "chainedCalls": [] } } },
  { "kind": "bare-expr", "expr": ". all ( )", ... }
]
```

Two confirmed bugs in ast-builder.js:2243-2253 (`lift KEYWORD + BLOCK_REF` branch):

1. SQL block child wrapped as `expr.kind === "markup"` (lies about content kind — SQL is not markup).
2. Trailing `.method()` chain not consumed; falls into the parent token stream as a bare-expr sibling.

## Emit-logic.ts behaviour for the buggy AST

```
=== boundary: server ===
return null; /* server-lift: non-expr form */

=== boundary: client ===
_scrml_lift(() => {
  const _scrml_lift_el_1 = document.createElement("div");
  return _scrml_lift_el_1;
});
```

(Server-boundary path at emit-logic.ts:696-704 emits the diagnostic comment;
client-boundary path falls through to emit-lift.js which builds an empty `<div>`.)

## Pre-existing failures unrelated to this change

- `bun test`: 0 fail (clean baseline).
- ECONNREFUSED log noise from a network test: pre-existing, not a regression target.

## Tags
#scrmlTS #pre-snapshot #lift #sql #ast-builder

## Links
- [intake.md](./intake.md)
- [progress.md](./progress.md)
