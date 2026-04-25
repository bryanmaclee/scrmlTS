# Anomaly Report: fix-lift-sql-chained-call-parallel-sites

**Generated:** 2026-04-24, after refactor + regression tests committed.
**Branch:** `worktree-agent-a5537744e8d9f1cba`.
**Commits:** `856accd` (pre-snapshot) → `e3db1c4` (refactor) → `6a6c59d` (tests).

## Test Behavior Changes

### Expected
- **Total: +6 tests** (7578 → 7584). Matches the +6 new §9 cases added to
  `compiler/tests/unit/lift-sql-chained-call.test.js`. No other test counts changed.
- **`compiler/tests/unit/lift-sql-chained-call.test.js`: 13 → 19 pass.** The 13 original tests
  unchanged. The 6 new tests cover the bare `?{}.method()` paths at both non-lift BLOCK_REF
  sites.
- **All 9 SQL suite files: 189 → 195 pass.** Same as above: +6 new in lift-sql-chained-call,
  others unchanged.

### Unexpected (Anomalies)
None.

## E2E Output Changes

### Expected
- **examples/03-contact-book.scrml**: compiles cleanly (no warnings or errors changed).
  `_scrml_sql` count: 3. `node --check` PASS for both server.js and client.js.
- **examples/07-admin-dashboard.scrml**: compiles cleanly. `_scrml_sql` count: 2. `node --check` PASS.
- **examples/08-chat.scrml**: compiles cleanly. `_scrml_sql` count: 2. `node --check` PASS.
- **No orphan `. (all|get|run) (` lines** in any of the 3 server.js outputs.

These examples exercise the existing `lift ?{...}.method()` path that was already fixed by
S40 — confirming the helper-share refactor preserves behavior for the existing IDENT-method
chains that examples actually use.

### Unexpected (Anomalies)
None.

## New Warnings or Errors

None. `bun test` post-commit hook ran clean. Pre-commit hook ran clean (7584 / 0 fail).
Gauntlet TodoMVC quick check: PASS. Browser validation (CSS/JS): all checks passed.

## Latent Bug Status

The two latent IDENT-only chained-call bugs at `parseOneStatement` BLOCK_REF (~L1958) and
`buildBlock` body-loop BLOCK_REF (~L3460) are now closed:

- Both sites now share the `consumeSqlChainedCalls` helper (defined ~L1910), which accepts
  both IDENT and KEYWORD method-name tokens.
- Net code change: -38 LOC in `ast-builder.js` (two duplicate inline loops removed,
  replaced with single helper calls + clarifying comments).
- New regression coverage at `lift-sql-chained-call.test.js` §9 (6 tests across both sites,
  both IDENT and KEYWORD method names, plus a `.nobatch()` marker check at Site B).

If a real-world file ever introduces bare `?{...}.get()` outside the `lift` keyword (which no
current fixture or example does), it will now parse correctly with the chain attached to the
SQL node, instead of leaving `.get()` orphan in the parent token stream.

## Pre-existing Issues Out of Scope

- `package.json` does not include `acorn` as a dependency, even though
  `compiler/src/expression-parser.ts` imports from it. `bun install` populates `node_modules`
  but that's incidental — a fresh clone without an explicit `bun add acorn` will fail to
  import `acorn`. **Not in scope** for this change. Filed mentally as an intake candidate.

- The `pretest` script (`scripts/compile-test-samples.sh`) is blocked by the agent sandbox and
  must be invoked manually before `bun test` runs the browser tests. **Not in scope**.

## Anomaly Count: 0

## Status: CLEAR FOR MERGE

## Tags

#sql #ast-builder #anomaly-report #latent-bug-closed #refactor

## Links

- Intake: `docs/changes/fix-lift-sql-chained-call-parallel-sites/intake.md`
- Pre-snapshot: `docs/changes/fix-lift-sql-chained-call-parallel-sites/pre-snapshot.md`
- Progress: `docs/changes/fix-lift-sql-chained-call-parallel-sites/progress.md`
- Refactor commit: `e3db1c4`
- Tests commit: `6a6c59d`
- Related S40 commits: `4074ea3`, `baccf56`, `15a0698`
