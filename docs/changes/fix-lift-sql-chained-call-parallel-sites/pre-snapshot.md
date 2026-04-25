# Pre-Snapshot: fix-lift-sql-chained-call-parallel-sites

**Captured:** 2026-04-24, T2 dispatch.
**Branch:** `worktree-agent-a5537744e8d9f1cba` (rebased onto main `2e6a42d`).

## Test baseline

`bun test` (run twice; second run was clean of intermittent network noise):

```
 7578 pass
 40 skip
 0 fail
 27316 expect() calls
Ran 7618 tests across 355 files. [10.98s]
```

Matches the intake-stated baseline (7,578 / 40 / 0 / 355).

A first run produced 2 transient failures attributable to the same pre-existing intermittent
network/effect-error issues seen in the gauntlet (`ECONNREFUSED` from a synthetic effect, and
a similar one). They re-passed on the second run with no source changes. Treated as
pre-existing flake — NOT a regression introduced by this change.

## Targeted SQL test files

```
compiler/tests/unit/lift-sql-chained-call.test.js   — 13 cases, all passing (S40 fix coverage)
compiler/tests/unit/sql-batch-5b-guards.test.js
compiler/tests/unit/sql-batching-envelope.test.js
compiler/tests/unit/sql-client-leak.test.js
compiler/tests/unit/sql-loop-hoist-detection.test.js
compiler/tests/unit/sql-loop-hoist-rewrite.test.js
compiler/tests/unit/sql-nobatch.test.js
compiler/tests/unit/sql-params.test.js
compiler/tests/unit/sql-write-ops.test.js
```

## Examples 03/07/08 baseline

These exercise the existing lift-path that was fixed in S40 (4074ea3 / baccf56). After this
change, they should continue to compile without regression. Will re-verify after the change.

## Key code points

`compiler/src/ast-builder.js` (7021 lines):
- L1910 — `consumeSqlChainedCalls(sqlNode)` helper at `parseLogicBody` scope (closure over `peek`/`consume`).
  Accepts BOTH `IDENT` and `KEYWORD` method names. Handles `.nobatch()` correctly.
- L1958-1981 — Site A: `parseOneStatement` BLOCK_REF inline loop. **IDENT-only check (line 1962)** — buggy.
- L2304 — Existing call to helper from lift+BLOCK_REF (parseOneStatement lift handler).
- L3482-3505 — Site B: `buildBlock` body-loop BLOCK_REF inline loop. **IDENT-only check (line 3486)** — buggy.
- L4140 — Existing call to helper from lift+BLOCK_REF (buildBlock body-loop lift handler).

Both sites A and B duplicate the same body that the helper already encapsulates — and both have
the original IDENT-only bug that the helper has since been fixed for (KEYWORD-aware).

## Plan

1. Replace the inline IDENT-only loop at site A (lines 1958-1981) with a call to
   `consumeSqlChainedCalls(childNode)`. Behavior change: now also consumes KEYWORD method
   names like `.get()` (latent fix — no current test exercises this path).
2. Replace the inline IDENT-only loop at site B (lines 3482-3505) with a call to
   `consumeSqlChainedCalls(childNode)`. Same latent fix.
3. Add 4 new regression tests to `compiler/tests/unit/lift-sql-chained-call.test.js` in a new
   §9 section ("Bare ?{} chained-call — non-lift sites"), covering both sites x both
   IDENT/KEYWORD method names.
4. Re-verify SQL test suites and 03/07/08 examples.
5. Anomaly report.

## Decision: helper stays at `parseLogicBody` scope (NOT module scope)

The intake suggests "module scope", but the helper closes over `peek`/`consume`, which are
per-call closures inside `parseLogicBody`. Hoisting to module scope would require
parameterizing those accessors at every call site — that's noise without benefit because the
ONLY consumers are 4 sites all inside `parseLogicBody`. Function-scope inside parseLogicBody
already gives all 4 sites a single shared helper. Sticking with that structural choice.

The intake's user-facing requirement ("apply at all 3 sites") is fully met by using the
existing helper at sites A and B. The "module scope" wording was a structural recommendation
that, on closer look, would add complexity without value. Logging this decision rather than
mechanically following the wording.

## Tags

#sql #ast-builder #pre-snapshot #latent-bug #refactor

## Links

- Intake: `docs/changes/fix-lift-sql-chained-call-parallel-sites/intake.md`
- Original fix: commits `4074ea3`, `baccf56`, `15a0698`
- Existing tests: `compiler/tests/unit/lift-sql-chained-call.test.js`
