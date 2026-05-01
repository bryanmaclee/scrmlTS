# Pre-Snapshot — f-null-001-002 (W3)

**Branch base:** `1f640d5` (post-W1 UVB landed)
**Date:** 2026-04-30
**Worktree:** `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a861a966284998192`

## Test baseline (`bun run test`)

```
8265 pass
40 skip
0 fail
391 files
28910 expect() calls
```

Matches PA's authorized baseline.

## Repro state

Five repros under `/tmp/null-repro/`:

| Repro | Expected | Actual | Verdict |
|---|---|---|---|
| `server-fn-null.scrml` (server fn body `if (x != null)`) | E-SYNTAX-042 (per §42) | E-SYNTAX-042 | rejected — correct per §42 |
| `client-fn-null-no-machine.scrml` (client fn body `if (x == null)`) | E-SYNTAX-042 | E-SYNTAX-042 | rejected — correct per §42 |
| `client-fn-null-with-machine.scrml` (same + `<machine>`) | E-SYNTAX-042 | E-SYNTAX-042 | rejected — correct per §42 |
| `markup-null.scrml` (`<div if=(@x != null)>`) | E-SYNTAX-042 | passes silently | **BUG** — asymmetric pass |
| `template-null.scrml` (`${@x == null ? a : b}`) | E-SYNTAX-042 | passes silently | **BUG** — asymmetric pass |
| `template-direct-null.scrml` (`${@x == null}` top-level) | E-SYNTAX-042 | E-SYNTAX-042 | rejected — correct per §42 |
| `declaration-null.scrml` (`@driver = null`) | E-SYNTAX-042 per §42.7 | passes silently | **BUG** — bare `null` literal in value position. **HELD for supervisor** — out of W3 scope. |

## F-NULL-001 + F-NULL-002 reframing

The FRICTION report at M3 said "removing `<machine>` block makes null-checks
compile clean." Empirical re-test at `1f640d5` shows **both** `<machine>`-present
and `<machine>`-absent client-fn bodies fire E-SYNTAX-042 equally. The original
M3 observation appears to have been incidental — possibly the M3 build hadn't
yet wired GCP3 against the full client-fn-body code path, or hos.scrml's
workaround was applied so quickly the observation wasn't re-verified post-fix.

Either way, **F-NULL-001 is structurally equivalent to F-NULL-002**: both are
manifestations of `walkAst` + `forEachEqualityBinary` failing to descend into
markup-attribute expressions and ternary condition expressions. The "machine
presence" trigger never separately existed at the ast-walker level — it was a
correlation, not causation.

The actual bug is **walker incompleteness**: `walkAst` only inspects four
scrml-AST node fields (`condExpr`, `initExpr`, `exprNode`, `argsExpr`) and
`forEachEqualityBinary` only descends through eleven ExprNode keys (using
JS-AST naming `test`, `arguments`, `properties` rather than scrml's
`condition`, `args`, `props`). Net effect: markup `<elem if=(... == null ...)>`
and template `${... == null ? a : b}` both bypass the detector silently.

## Spec position (§42.7)

> `null` and `undefined` SHALL NOT be valid scrml source tokens in value position.
> Comparing against `null` or `undefined` SHALL be compile error E-SYNTAX-042.

The normative position is **rejection everywhere**. The current asymmetry is a
**validation-principle violation** — markup-side null checks should be the same
error as function-body null checks.

## Pre-existing failures

None — clean baseline (0 fail).

## Out-of-scope but surfaced

Bare `null`/`undefined` literal in value position (e.g., `@x = null`, `return null`,
`{ field: null }`) **silently passes** per spec §42.7 violation. This is a
separate widening from F-NULL-001/002 (which target `==` / `!=` comparisons).
Surfacing in `progress.md` for supervisor review; **NOT fixed in W3**.
