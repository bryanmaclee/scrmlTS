# Anomaly Report: fix-lift-sql-chained-call

**Captured:** 2026-04-24
**Pre-snapshot:** 7565 pass / 40 skip / 0 fail / 354 files
**Post-fix:** 7578 pass / 40 skip / 0 fail / 355 files

## Test behavior changes

### Expected
- **+13 new tests** in `compiler/tests/unit/lift-sql-chained-call.test.js` — all pass.
  Covers the AST shape (§1-§3), emit-logic emission (§4-§6), full-pipeline E2E (§7),
  and the no-orphan negative assertion (§8). 354 -> 355 test files.

### Unexpected (Anomalies)
**None.** No pre-existing test changed pass/fail status.

## E2E output changes (examples/dist/*.server.js)

### Expected
- **examples/03-contact-book.server.js** `loadContacts`: now emits
  `return await _scrml_sql\`SELECT id, name, email, phone FROM contacts ORDER BY name\`;`
  (was: `return null; /* server-lift: non-expr form */` + orphan `. all ( );`).
  `bun --check` now passes.
- **examples/07-admin-dashboard.server.js** `fetchUsers`: now emits a clean
  `return await _scrml_sql\`SELECT ...\`;` form for the multi-line SELECT with parameters.
- **examples/08-chat.server.js** `loadMessages`: same shape, now compiles cleanly.

### Unexpected (Anomalies)
**None.**

## New warnings or errors
**None.** Linter output and warning counts unchanged across the compiled corpus.

## Pre-existing issues NOT touched

- `examples/05-multi-step-form.scrml` continues to fail compilation with
  `E-COMPONENT-020: Component 'InfoStep' is not defined`. Verified pre-existing
  on bare main `74881ea` — unrelated to this change.

## Bug discovered & fixed during implementation (Step 3, commit baccf56)

The first iteration of the fix (commits 4074ea3 + 5195c4b) handled `.all()` and
`.run()` correctly but missed `.get()`. Root cause: the helper
`consumeSqlChainedCalls` checked `peek().kind === "IDENT"` for the method-name
token, but `get` and `set` are tokenized as KEYWORD per tokenizer.ts:62.

Caught by the §2 test (`.get() chained call is captured`). Fix: extended the
guard to `peek().kind === "IDENT" || peek().kind === "KEYWORD"`.

The pre-existing chained-call patterns at ast-builder.js lines ~1918 and ~3421
have the identical bug (they also only check IDENT). Examples 03/07/08 happen
to only use `.all()` and `.run()` — both IDENT — so the latent bug never
surfaced in practice. **Out of scope** to fix the pre-existing patterns in
this change; filing as a follow-up note for the hand-off.

## Anomaly Count: 0
## Status: CLEAR FOR MERGE

## Tags
#scrmlTS #anomaly-report #lift #sql #ast-builder

## Links
- [intake.md](./intake.md)
- [pre-snapshot.md](./pre-snapshot.md)
- [progress.md](./progress.md)
