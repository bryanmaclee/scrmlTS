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
