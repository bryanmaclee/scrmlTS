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
   `export <Name attrs>{body}</>`. **Deferred — see Outcome below.**

### Approach

Text-substitution + sanity-check parse. After applying regex rewrites, parse the rewritten
source via `compileScrml({ write: false })` to verify it's still valid scrml. If parse fails,
leave the file unmodified and report.

### Files created/modified

- `compiler/src/commands/migrate.js` (NEW) — CLI subcommand handler, ~570 lines
- `compiler/src/cli.js` — registered `migrate` subcommand
- `compiler/tests/unit/scrml-migrate.test.js` (NEW) — 25 tests across 12 sections
- `docs/changes/p4-scrml-migrate/progress.md` — this file

## Log

- [start] Branch `changes/p4-scrml-migrate` created from main (5c8eab0).
- [start] node_modules and samples/compilation-tests/dist symlinked from main repo for tests.
- [baseline] bun test: 8551 pass / 0 fail / 40 skip / 425 files. Matches expected.
- [scaffold] migrate.js created with applyMigrations + sanityCheckParse + migrateFile + runMigrate.
- [scaffold] cli.js wired to dispatch the `migrate` subcommand.
- [smoke] manual smoke-test against examples/14-mario-state-machine.scrml: 3 whitespace + 1 machine migrations correctly identified, sanity-parse passes.
- [tests] 25 tests across 12 sections; all pass on first iteration after fixture-fix.
- [final] bun test: 8576 pass / 0 fail / 40 skip / 426 files. 25 new tests, 1 new test file. Zero regressions.

## Outcome

### Migrations Shipped

- **Migration 1 (W-WHITESPACE-001):** rewrites `< KEYWORD<boundary>` → `<KEYWORD<boundary>`
  for the 14 known scrml lifecycle/structural keywords. Restricted to KNOWN_KEYWORDS to
  prevent false-positives on user identifiers, HTML tags, and bareword text.
- **Migration 2 (W-DEPRECATED-001):** rewrites `<\s*machine` (opener) → `<\s*engine`. The
  trailing-boundary check (`\s | > | /`) prevents false-matching `<machineState>` and similar.

Both migrations run together: Migration 1 normalizes whitespace first, then Migration 2
catches `<machine` openers in the now-normalized form. Order-independent — both regexes
target distinct patterns.

### Migration 3: Deferred

Form 2 → Form 1 component desugaring (`export const Name = <markup>...</>` →
`export <Name>{markup}</>`) was **deferred** because:

1. The transformation requires handling the surrounding `${ ... }` block boundary. If
   `export const X = <markup>...</>` is the only declaration in its block, we'd need to
   strip the `${` `}` wrapper. If it shares a block with other declarations, we'd need to
   either split the block or leave the wrapper in place — the latter changes semantics
   because Form 1 is top-level only.
2. Text-substitution can't safely handle nested markup with arbitrary attribute splitting
   between the inner element and the outer `export <Name ...>` wrapper.
3. Per spec §21.2: Form 2 desugars to a Form-1-byte-equivalent AST internally — both forms
   produce identical export records. Form 2 remains supported (transitional sugar). There
   is no compile-time pressure to migrate.
4. T1-small tier doesn't accommodate the complexity of an AST-level rewriter; the SAFE
   approach is text-substitution + sanity-parse, and that approach has limits here.

Tracked for **P5 or later** when an AST round-trip rewriter is available.

### Tests

- `compiler/tests/unit/scrml-migrate.test.js` — 25 tests across 12 sections covering:
  - §1-3: Migration 1 — known keywords, unknown idents untouched, close tags untouched
  - §4-5: Migration 2 — basic rewrite, boundary check (no false-match on `<machineState>`)
  - §6: combined migrations
  - §7: --dry-run preserves disk
  - §8: --check signals would-change without writing
  - §9: sanity-parse failure leaves file untouched
  - §10: in-place rewrite writes the file
  - §11: unchanged file reported correctly
  - §12: default excludes (samples/ + tests/)

Final test count: **8576 pass / 0 fail / 40 skip / 426 files** (was 8551 / 0 / 40 / 425).

## Known Issues / Notes

### `scrml migrate` name collision with §39.8

The hand-off specified `scrml migrate <file|dir>` for source rewriting. SPEC §39.8 ALREADY
reserves `scrml migrate` for SQL schema migration (`<db-path>.migration.sql` → live database).
The deprecation warning text in name-resolver.ts says `scrml-migrate` (with hyphen) — likely
the spec author noticed the collision and intended a separate command name.

Currently in this branch, `scrml migrate` dispatches ONLY to source-rewrite. The §39.8 SQL
migration command is spec'd but not yet implemented (no command handler in
`compiler/src/commands/`). When §39.8 ships, this collision MUST be resolved — options:
1. Mode flag: `scrml migrate --mode=source|db` (default: db, since that's the spec's intent)
2. Subcommand split: `scrml migrate-source` + `scrml migrate-db`
3. Auto-detect: if positional arg is a `.scrml` file/dir, source-rewrite; if `.db`, schema migrate

This collision is **deferred** for the user to resolve. Current implementation works as
specified by the hand-off; no functional regression introduced.

### Default excludes

By default, `scrml migrate` skips paths containing `/samples/` or `/tests/` since those
exercise deprecation paths intentionally. `--no-default-excludes` overrides this.

### False positives in string literals

Text-substitution can't disambiguate context. If `<machine>` or `< db>` appears verbatim
inside a string literal or comment that survives parsing, it WILL be rewritten. The
sanity-parse check catches cases where the rewrite would break the file, but rewrites
inside semantically-irrelevant strings (e.g., a doc comment) will be applied silently.

This is a known limitation of the text-substitution approach. Mitigation: --dry-run lets
the user preview before applying.

## Reporting Summary

- Final commit hashes (last 5):
  - `185dfc6` WIP(p4-scrml-migrate): scaffold migrate.js + cli.js wire-up — Migrations 1+2
  - `e62457b` test(p4-scrml-migrate): 25 tests across 12 sections
  - (final) WIP(p4-scrml-migrate): progress.md final close-out
- Final test count: 8576 pass / 0 fail / 40 skip / 426 files
- Migrations shipped: 1 (whitespace), 2 (machine→engine). 3 (Form 2 → Form 1) deferred.
- Files modified: 3 (2 NEW, 1 modified) + progress.md
- Branch state: ahead-of-main count: 4 commits (will be 5 after final close-out)
- FF-mergeable: yes (no conflicts; branch from main 5c8eab0)
