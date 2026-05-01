# Progress — f-null-001-002 (W3)

- [22:05] Started — branch `changes/f-null-001-002` created from post-W1 main (`1f640d5`)
- [22:05] Worktree rebased to pull in W1 validators (`compiler/src/validators/` present)
- [22:05] Baseline `bun run test`: 8265 pass / 40 skip / 0 fail / 391 files — matches PA's authorized baseline
- [22:10] Five minimal repros built under `/tmp/null-repro/`. Verified:
  - server-fn body `if (x != null)`: rejected (correct)
  - client-fn body `if (x == null)` (no machine): rejected (correct — FRICTION's M3 "no-machine passes" is no longer reproducible)
  - client-fn body `if (x == null)` (with machine): rejected (same — no machine asymmetry)
  - markup `<div if=(@x != null)>`: passes silently (BUG)
  - template `${@x == null ? a : b}`: passes silently (BUG — ternary condition unreached)
  - template-bare `${@x == null}`: rejected (correct — top-level binary IS reached)
  - declaration init `@driver = null`: passes silently (BUG — bare-null-literal; out of W3 scope)
- [22:15] Pre-snapshot at `docs/changes/f-null-001-002/pre-snapshot.md`
- [22:18] **Diagnosis complete.** Root cause for both findings is identical: `walkAst` (`gauntlet-phase3-eq-checks.js:436-472`) inspects only `condExpr / initExpr / exprNode / argsExpr` on AST nodes — never `attrs[*].value.exprNode`. And `forEachEqualityBinary` (lines 260-279) descends through 11 keys using JS-AST naming (`test`, `arguments`, `properties`) — missing scrml-AST names (`condition`, `args`, `props`). Net: markup-attribute expressions and ternary condition subtrees are invisible to the equality detector. F-NULL-001's "machine context" was incidental — a correlation, not a causation; both with-machine and without-machine cases now fire equally.

## Plan
1. ~~Pre-snapshot~~ ✓
2. ~~Diagnosis~~ ✓ (this entry)
3. Add tests first (failing) — TDD shape so we see them go green
4. Fix `walkAst`: inspect `attrs[*].value.exprNode` everywhere markup nodes are walked. Inspect `<machine>` block predicate exprs if any. Inspect TypeRules / where=clauses / lift contexts as applicable.
5. Fix `forEachEqualityBinary`: add scrml-AST keys `condition`, `args`, `props` (with prop-key/value descent), and `subject`/`rawArms` for match-expr. Possibly switch to a generic walker that descends every object-valued field except `span`.
6. Fix diagnostic-quality issue: F-NULL-002 says "no line number" — verify `spanFromExprNode` produces correct line/col for all paths, especially server-fn-body. Inspect.
7. SPEC.md §42 amendment if anything needs tightening. Spec already matches the fix direction (§42.7 — reject everywhere).
8. FRICTION.md: mark F-NULL-001 + F-NULL-002 RESOLVED.
9. Final tests, commit.

## Held for supervisor input

**Bare-`null`-literal silent-pass.** The detector only catches `== null` /
`!= null` comparison patterns. Bare `null` in value position
(`@x = null`, `return null`, `{ field: null }`, `[null, ...]`) silently
passes. This violates spec §42.7 ("`null` and `undefined` SHALL NOT be
valid scrml source tokens in value position"). The dispatch app's
`@driver = null` is the canonical adopter shape. **NOT fixed in W3** —
out of scope. Recommended: separate dispatch (call it W3.1 — bare-null-literal sweep).

- [22:35] Tests authored at `compiler/tests/unit/gauntlet-s19/null-coverage.test.js` (15 tests). Pre-fix: 9 pass / 6 fail (the 6 asymmetric-pass cases).
- [22:40] Replaced class-template attr test (out of scope — string-literal interpolation segments not parsed into exprNodes) with call-ref test (`onclick=fn(@x == null)`).
- [22:50] Implementation: rewrote `forEachEqualityBinary` as generic ExprNode descent (SKIP_KEYS metadata + inline guard for `kind:"lit"` value).
- [22:55] After forEach fix: 11 / 15 pass (ternary-condition descent now works). Remaining 4 fails are all markup-attr.
- [23:00] Implementation: added `inspectAttrs` to `walkAst` covering `kind:"expr"` / `"variable-ref"` (`exprNode`) and `kind:"call-ref"` (`argExprNodes`).
- [23:02] After walkAst fix: 15 / 15 pass.
- [23:05] Diagnostic-quality fix: `GauntletPhase3Error` lifts `span.{file,line,col}` into top-level `filePath/file/line/column`; `spanFromExprNode` prefers fallback line/col since the expression-parser hard-codes `line:1, col:1` per `spanFromEstree`. CLI formatter now renders correct line.
- [23:10] Full test suite: 8265 → 8280 (= +15) at `1f640d5` → HEAD. 0 fail. 0 regressions. 0 cascade in test fixtures.
- [23:12] SPEC §42.7 amended with uniform-rejection clause locking the contract.
- [23:14] FRICTION.md F-NULL-001 + F-NULL-002 marked RESOLVED with resolution notes pointing at the diagnosis.
- [23:15] Smoke test: `bun run compiler/src/cli.js compile examples/23-trucking-dispatch/pages/driver/hos.scrml -o /tmp/null-smoke/` → compiles clean (only pre-existing E-DG-002 `@user` warning, unrelated to W3).
- [23:16] Smoke test: driver/home.scrml — now correctly errors with 9× E-SYNTAX-042 on previously-silent markup-attr null comparisons. **Cascade-by-design**: dispatch app is Plan-B-parked per FRICTION; not in test fixtures.

## Final state

Test count: 8265 → 8280 (= **+15** new tests, all pass). 0 regressions. 0 fail.
Files touched:
  - `compiler/src/gauntlet-phase3-eq-checks.js` (walker + error-class fixes)
  - `compiler/SPEC.md` (§42.7 normative amendment)
  - `compiler/tests/unit/gauntlet-s19/null-coverage.test.js` (NEW — 15 tests)
  - `examples/23-trucking-dispatch/FRICTION.md` (RESOLVED markers)
  - `docs/changes/f-null-001-002/` (progress, pre-snapshot, diagnosis, repros)

