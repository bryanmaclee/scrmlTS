# Progress: fix-arrow-object-literal-paren-loss (GITI-013)

- [start] Read intake + sidecar repro. Identified target: `compiler/src/codegen/emit-expr.ts:343-364` `emitLambda`.
- [start] Verified bug location: line 360 `${asyncPrefix}(${params}) => ${emitExpr(node.body.value, ctx)}` — when `node.body.value.kind === "object"`, emit returns `{...}` unwrapped, ambiguous with block statement.
- [start] Worktree setup: `bun install` in repo root and `compiler/`. `acorn` was missing.
- [baseline] `bun run test`: 7825 pass / 40 skip / 0 fail / 27,971 expect() calls / 7,865 tests / 370 files. (1 of 2 runs had 2 transient HTTP-race fails.)
- [start] Branch created: `changes/fix-arrow-object-literal-paren-loss`.
- [start] Pre-snapshot written.
