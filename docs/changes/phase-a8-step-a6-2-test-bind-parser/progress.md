# A8 / A6-2 — `test-bind` parser support — Progress Log

**Session:** S75. Date: 2026-05-09.
**Worktree:** `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-a17b58a67ecc88efc`
**Branch:** `main` (worktree-as-scratch per S67).

---

## Phase 0 — Survey ✅ COMPLETE

- Read SPEC §19.12.6 (line 11358), §19.12.7 (line 11385), §19.12.8 (line 11405), §47.5 (line 18124), §34 catalog (lines 14420-14425).
- Mapped existing `~{}` test-block parser (`compiler/src/ast-builder.js` `parseTestBody` at line 7952; called from `buildBlock` at line 9120).
- Mapped IR shape (`compiler/src/codegen/ir.ts` lines 132-176).
- Mapped consumers (`compiler/src/codegen/analyze.ts` line 92).
- Verified tokenizer behavior: `test-bind` is 3 tokens (IDENT, PUNCT-, IDENT).
- Verified diagnostic-code reuse: E-TEST-005 "invalid test structure" per SPEC §34 (no new code needed).
- Discovered drift: `compiler/src/codegen/errors.ts` lines 30-48 has stale/aspirational comments for E-TEST-001..005 that diverge from SPEC §34 normative meanings; codes are not actually fired anywhere. Surfaced for PA awareness; not in A6-2 scope.

**Survey written:** `docs/changes/phase-a8-step-a6-2-test-bind-parser/SURVEY.md`.

**Baseline tests:** 10,669 / 69 / 1 / 3.

---

## Phase 1 — IR + parser ✅ COMPLETE

### IR (compiler/src/codegen/ir.ts)
- Added `TestBindDecl` interface — `{ identifier, expression, line }`.
- Extended `TestGroup` with `testBinds: TestBindDecl[]` (always present, default `[]`).

### Parser (compiler/src/ast-builder.js)
- Added `isTestBindSeq(idx)` helper — detects 3-token sequence IDENT("test") + PUNCT("-") + IDENT("bind").
- Added `parseTestBindDecl()` — full parse of `test-bind <ident> = <expr>` at body scope.
- Added `skipToNextStatement()` recovery helper.
- Hooked into `parseTestBody`'s main loop BEFORE the `IDENT "test"` branch (since they share the leading `test` keyword).
- Hooked into the `test "..." {...}` case-body collector — fires E-TEST-005 if `test-bind` appears there.
- Updated `collectAssertTokens` to break on `test-bind` sequence at depth 0 (prevents the test-bind being absorbed into a preceding assert expression).
- Updated return shape to include `testBinds: TestBindDecl[]`.

### Self-host parity (compiler/self-host/ast.scrml)
- Mirrored all of the above changes in the self-hosted scrml implementation.
- The self-host AST parity test (`compiler/tests/self-host/ast.test.js > test block`) passes.

### Diagnostics
- All E-TEST-005 emissions per SPEC §34 row "invalid test structure":
  - duplicate identifier in same `~{}` block
  - `test-bind` inside `test "..." {...}` case body
  - missing identifier
  - missing `=` separator
  - missing RHS expression
- No new error code introduced.

## Phase 2 — Tests ✅ COMPLETE

Created `compiler/tests/unit/test-bind-parser.test.js`:
- §1 Positive parse (3 tests)
- §2 Multiple declarations (2 tests)
- §3 Function-form RHS / brace-balanced bodies (3 tests)
- §4 Literal / identifier RHS (3 tests)
- §5 Duplicate identifier diagnostic (2 tests)
- §6 Context violation in case body (3 tests)
- §7 Malformed declarations (3 tests)
- §8 Regression — existing `~{}` parsing (4 tests)
- §9 `testBinds` default empty array (2 tests)

**Total: 25 tests, all passing.**

## Final test count

10,694 pass / 69 skip / 1 todo / 3 fail. Delta: +25 tests, 0 regressions. The 3 pre-existing fails are unchanged self-host parity issues (F-BUILD-002, Bootstrap L3, tokenizer parity) — not introduced by A6-2.

## Deferred for A6-3 (typer)

- RHS-shape discrimination (function-typed assignable to bound server-fn signature → handler form; otherwise → return-stub form). Per S74 hand-off item 178, the typer makes this call at compile time.
- RHS expression re-parsing — A6-2 stores the RHS as raw token-text (matching how `assert` and `before/after` already store their bodies). The typer will re-parse via the existing logic-expression parser at type-check time.
- Resolution of the LHS identifier against §47-encoded server-fn names (SPEC §19.12.6).
- Validation that `test-bind` declarations bind only to `server fn` (not arbitrary values). Phase A6-3.
- OQ-test-bind-concurrency (block-local table isolation primitive) — A6-3 / A6-4 territory per SPEC §19.12.7 OQ footnote.

## Deferred for A6-4 (codegen)

- Test-mode dispatch hook emission per SPEC §19.12.7.
- Block-local dispatch table keyed by §47-encoded names.
- Production binary 0-byte cost (dead-code-elimination when `output.testMode` is disabled).
- E-TEST-006 runtime fail-fast emission when call-site server-fn lacks a `test-bind` in scope.

## Spec amendments

NONE. SPEC §19.12.6/.7/.8 were sufficient to encode the parser support without changes.

## Drift surfaced (not fixed in A6-2)

`compiler/src/codegen/errors.ts` lines 30-48 has stale comment-only documentation for E-TEST-001..005 with meanings that diverge from SPEC §34 normative rows. None of E-TEST-001..006 are actually fired anywhere in `compiler/src/` (verified via grep before A6-2). My new E-TEST-005 emissions align with SPEC §34's "invalid test structure" wording. PA may want to clean up the stale comment block separately (out of A6-2 scope).
