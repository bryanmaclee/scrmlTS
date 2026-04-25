# fix-lift-sql-chained-call — Intake

**Surfaced:** S40 2026-04-24, during Bun.SQL Phase 1 verification.
**Status:** filed, not started.
**Priority:** affects examples 03/07/08 runtime; tests don't exercise the path.

## Symptom

`bun --check examples/dist/03-contact-book.server.js` fails with `Unexpected .` because emit produces:

```js
return null; /* server-lift: non-expr form */
. all ( );
```

The trailing `.all()` is orphaned — emitted as a separate statement after a return.

## Reproducer

`examples/03-contact-book.scrml` contains:
```scrml
@contacts = lift ?{`SELECT * FROM contacts ORDER BY id DESC`}.all()
```

Same pattern in `07-admin-dashboard.scrml` and `08-chat.scrml`.

## Root cause

`compiler/src/ast-builder.js:2245-2251` — the `lift` keyword path that handles `BLOCK_REF` (i.e. `lift ?{...}`) consumes the sql-node child but does NOT consume the trailing chained call (`.all()` / `.get()` / `.run()`). The chained call is left on the token stream, picked up later as an orphan bare-expr, and emitted verbatim after the `return null;` placeholder.

## Confirmed pre-existing

Phase 1 author stashed all Bun.SQL changes, recompiled 03-contact-book on bare `b3c83d3`, and observed identical error at identical line. Unrelated to SQL emission shape — both old (`_scrml_db.query("...").all()`) and new (`await _scrml_sql\`...\``) paths trigger the same orphan `.all()` emission.

## Why tests don't catch it

No fixture exercises `lift ?{...}.method()` in a server function. SQL tests cover the `?{}` rewrite path; lift tests cover lift expressions; nothing covers the intersection.

## Suggested fix scope

- `compiler/src/ast-builder.js:2245-2251` — lift+BLOCK_REF must consume the trailing chained call alongside the sql-node child.
- Add regression test: `lift ?{`SELECT...`}.all()` in a server function should emit a single well-formed expression, not split with orphan tail.
- Recompile examples 03/07/08 + `bun --check` each — should pass.
- Browser smoke via `examples/test-examples.js` to confirm runtime works.

## Tags
#bug #ast-builder #lift #sql #pre-existing #blocks-examples
