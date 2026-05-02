# Progress: p4-scrml-migrate

## Plan

Implement `scrml migrate <file|dir>` CLI subcommand that automates source rewrites for the
deprecation/migration patterns introduced in S52+S53.

### Migrations

1. **Whitespace-after-`<`** (W-WHITESPACE-001): `< db>` → `<db>` etc. Applies only to known
   scrml lifecycle keywords (db, schema, channel, engine, machine, timer, poll, request,
   errorBoundary, page, program, body, lin) and protected against false matches.
2. **`<machine>` keyword** (W-DEPRECATED-001): `<machine` → `<engine`.
3. **Legacy export-const-of-markup** (Form 2 → Form 1): `export const Name = <markup>...</>` →
   `export <Name attrs>{body}</>`. **Deferred if too complex for T1-small** — the
   text-substitution approach has limits with attribute splitting.

### Approach

Text-substitution + sanity-check parse. After applying regex rewrites, parse the rewritten
source via `compileScrml({ write: false })` to verify it's still valid scrml. If parse fails,
leave the file unmodified and report.

### Files to create

- `compiler/src/commands/migrate.js` — CLI subcommand handler
- `compiler/tests/unit/scrml-migrate.test.js` — ~10 unit tests
- Edit: `compiler/src/cli.js` — register `migrate` subcommand
- Edit: `compiler/SPEC.md` §21.2 — note `scrml migrate` as Form 2 → Form 1 tool (if shipped)

### Steps

- [ ] Step 1: Set up branch, baseline tests, write progress.md
- [ ] Step 2: Implement migrate.js (Migrations 1 + 2 first; assess Migration 3)
- [ ] Step 3: Wire up cli.js to register the subcommand
- [ ] Step 4: Write tests
- [ ] Step 5: Decide on Migration 3 (ship or defer)
- [ ] Step 6: Update SPEC §21.2 if Migration 3 shipped
- [ ] Step 7: Final test pass + commit

## Log

- [start] Branch `changes/p4-scrml-migrate` created from main (5c8eab0).
- [start] node_modules and samples/compilation-tests/dist symlinked from main repo for tests.
- [baseline] bun test: 8551 pass / 0 fail / 40 skip / 425 files. Matches expected.
