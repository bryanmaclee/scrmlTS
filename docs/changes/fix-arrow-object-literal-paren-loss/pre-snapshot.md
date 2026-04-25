# Pre-snapshot: fix-arrow-object-literal-paren-loss (GITI-013)

## Branch
`changes/fix-arrow-object-literal-paren-loss` off `main` at 205602d.

## Test baseline (worktree, pre-change)
Two consecutive runs of `bun run test` from repo root (which runs `pretest` =
`bash scripts/compile-test-samples.sh`, then `bun test compiler/tests/`):

- Run 1: 7824 pass / 40 skip / 2 fail (transient HTTP/race failures, file unidentifiable from
  the streamed output)
- Run 2: **7825 pass / 40 skip / 0 fail** / 27,971 expect() calls / 7,865 tests across 370 files

Treating run 2 as the stable baseline. The cited briefing baseline of "7,836 pass / 40 skip /
0 fail / 371 files at 6ba84be" differs by 11 passes and 1 file — most likely from inbox
triage commits (a71f849, 02aff6e) that landed between 6ba84be and 205602d. No regressions
introduced by my snapshot run.

## Worktree environment notes
- `bun install` had to be run in both repo root and `compiler/` to populate `node_modules`
  (acorn, astring, @happy-dom). Worktrees do not inherit installed deps.
- `samples/compilation-tests/dist/` is built by `pretest`; do not pre-populate.

## Sidecar reproducer
`handOffs/incoming/read/2026-04-25-0728-repro-09-arrow-object-literal.scrml` — confirmed
that current `compiler/src/codegen/emit-expr.ts` produces:
```js
const out = items.map((f) => {path: f.path, kind: f.kind})
```
which `bun --check` rejects with `Expected ";" but found ":"`. Will be re-verified after the
fix.

## Reproducer compile attempt (pre-fix, manual)
Will be re-run as part of regression test post-fix to confirm `bun --check` passes.

## Pipeline impact
- Stage affected: **CG (Stage 8)** — code-generator's expression emitter.
- Files touched: `compiler/src/codegen/emit-expr.ts` (single file, single function).
- Downstream: none — CG is the terminal stage.
- Contracts at risk: arrow-body emission shape. The Bug C (S34, commit 127d35a) BlockStatement
  arrow-body path is in a **different code path** (escape hatch -> rewriteServerExprArrowBody
  / rewriteExprArrowBody), so the structured-expression-body case I'm modifying cannot
  collide with it.

## Tier
T2. Single-file source change but requires NEW regression tests (so not T1).

## Tags
#pre-snapshot #change-fix-arrow-object-literal-paren-loss #giti-013

## Links
- intake: docs/changes/fix-arrow-object-literal-paren-loss/intake.md
- sidecar: handOffs/incoming/read/2026-04-25-0728-repro-09-arrow-object-literal.scrml
- target file: compiler/src/codegen/emit-expr.ts
