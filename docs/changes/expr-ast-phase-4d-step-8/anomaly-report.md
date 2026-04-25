# Anomaly Report: expr-ast-phase-4d-step-8

## Test Behavior Changes

### Expected (matches Step 8 intent)
None — Step 8 is a pure refactor / TS-surface cleanup. The expected outcome
was zero behavioral change, and that is what was observed.

### Unexpected (anomalies)
None.

## Test Counts

| Stage | bun test (full) | bun test (unit only) |
|---|---|---|
| Pre (worktree baseline after rebase) | 7565 / 0 / 40 | 5818 / 0 / 0 |
| Step 2 (emit-lift cleanRenderPlaceholder) | 7565 / 0 / 40 | 5818 / 0 / 0 |
| Step 3 (component-expander render slot) | 7565 / 0 / 40 (after escape-hatch fix) | 5818 / 0 / 0 |
| Step 4 (meta-checker hybrid migration) | 7565 / 0 / 40 | 5818 / 0 / 0 |
| Step 5 (route-inference comment refresh + 1 fix) | 7565 / 0 / 40 | 5818 / 0 / 0 |
| Step 7 (4 codegen files) | 7565 / 0 / 40 | 5818 / 0 / 0 |
| Step 8 (ast.ts field deletion + body-pre-parser) | 7565 / 0 / 40 | 5818 / 0 / 0 |

Net regression: **0**.

## E2E Compilation Changes

### Pre-existing failures (unaffected by Step 8)
- `examples/03-contact-book.server.js`: fails `bun build` with
  `error: Unexpected . at line 88` — pre-existing lift+sql chained-call AST
  bug (parallel agent assigned via `docs/changes/fix-lift-sql-chained-call/`).
  **Identical error and column on both main `74881ea` and Step-8 worktree.**
- `examples/07-admin-dashboard.server.js`: same lift+sql bug, line 50.
- `examples/08-chat.server.js`: same lift+sql bug, line 38.

### Confirmed clean (Step 8 did not regress)
- `examples/01-hello.client.js`: builds cleanly.
- `examples/02-counter.client.js`: builds cleanly.
- `examples/04-live-search.client.js`: builds cleanly.
  (No `.server.js` emitted — sample has no SQL or server-only code.)

## Stray .expr Reads in TS Files (Verification Gate)

Per directive: "Search for any remaining `node.expr` reads in TS files that
should now use `exprNode`."

**Result: 63 hits remain. All are intentional, sorted into three categories:**

### Category A — `(node as any).expr` runtime fallbacks (TS-safe after deletion)
Synthetic test nodes (15+ test files use `{ kind: "bare-expr", expr }` plain
object literals with no `.exprNode`) need a runtime fallback. These sites
explicitly cast to `any` and read `.expr` only when `.exprNode` is missing.

  - `body-pre-parser.ts:222` — `(bareExprNode as any).expr ?? ""`
  - `route-inference.ts:1130` — `(node as any).expr ?? ""`
  - `meta-checker.ts:380, 461, 501, 640, 1093` — five sites
  - `emit-client.ts:256, 258` — two sites in detectRuntimeChunks

### Category B — Reads on locally-typed nodes (not BareExprNode)
The TypeScript types here are local `Record<string, unknown>` aliases or
local interface definitions, not the global `BareExprNode`. The deletion
does not affect them.

  - `meta-eval.ts:301, 334` — `n: Record<string, unknown>`
  - `collect.ts:372` — local `Node` interface declares its own `expr?: string`
  - `scheduling.ts:61, 102, 126` — `(stmt as ASTNode)` with `ASTNode = Record<string, unknown>`
  - `reactive-deps.ts:382, 396` — `n: ASTNode` with local `ASTNode = Record<string, unknown>`
  - `emit-control-flow.ts:1017` — `child: any` (function param: `node: any`)
  - `emit-logic.ts:398, 639, 681` — `node: any` (function param)

### Category C — Reads on different `.expr` fields (other AST node types)
These access the `.expr` field of nodes other than BareExprNode:

  - `LiftExprNode.expr` (lift target wrapper):
    - `component-expander.ts:1328, 1329, 1347, 1348, 1456, 1457`
    - `dependency-graph.ts:1136, 1537, 1549, 1550`
    - `emit-logic.ts:681`
  - `ReturnStmtNode.expr` / `ThrowStmtNode.expr` (still has `expr?: string`):
    - `emit-logic.ts:639`
    - `meta-eval.ts:317`
  - `CSSReactiveRef.expr`:
    - `collect.ts:288`
  - `CSSReactiveBridge.expr`:
    - `emit-reactive-wiring.ts:542`
  - `ExportedDecl.expr`:
    - `emit-server.ts:753`
  - `ESTree node.expression` (parser internal):
    - `emit-expr.ts:380`
    - `expression-parser.ts:857, 1308, 1516, 1722, 1866`

**Conclusion: zero stray reads on the deleted `BareExprNode.expr` field.**
Every remaining `.expr` is either an explicit runtime fallback, a different
node type's field, or a local `Record<string, unknown>` access.

## Notable Decisions / Anomalies in Implementation

### Decision: hybrid (any).expr fallback in 7 of 10 files
The reference commit `fca0899` removed `.expr` fallback branches outright.
Doing the same on current main produced 30+ test regressions in
meta-checker test suites that build synthetic bare-expr nodes (only `.expr`,
no `.exprNode`). Since the directive says "ast-builder.js dead writes
preserved — runtime `.expr` JS values still exist for JS consumers via
duck typing," the runtime fallback is correct. Implementation cast all
such reads to `(node as any).expr` so the TypeScript surface is clean (the
field truly is removed from the type) but synthetic test nodes still work.

This is a slight departure from the reference commit's literal strategy
but preserves the directive's underlying invariant ("only TS type is
deleted") and protects 30+ tests.

### Decision: `${...}` spread detection via escape-hatch.raw === "..."
The `${...}` token is invalid JS, so the AST builder emits a bare-expr
with `exprNode: { kind: "escape-hatch", raw: "..." }` rather than a
parseable ExprNode. The original code's `node.expr.trim() === "..."`
check no longer works after field deletion. New detection in
`component-expander.ts:isSpreadSlot` matches the escape-hatch raw text.
Verified by `tests/unit/snippet-slot.test.js` — was failing transiently
during Step 3, fixed before commit.

### Decision: `${render name(...)}` detection via __scrml_render_NAME__ unwrap
Per design from reference commit `4a5bbf1`. The S39 expression preprocessor
(commit `1e304c8`) rewrites `render name(args)` to `__scrml_render_name__(args)`
so the structural ExprNode parser produces a regular call node. Step 3
unwraps that pattern in `component-expander.ts:_injectChildrenWalk`.

### Decision: type-system.ts had no functional changes
After grepping all `.expr` sites, every read in type-system.ts goes through
`(stmt as ASTNodeLike)` with `ASTNodeLike = Record<string, unknown>`.
Since `Record<string, unknown>.expr` is `unknown` (not bound to the
BareExprNode type), these reads survive the field deletion unchanged.
No commit was made for type-system.ts in this series.

## Status: CLEAR FOR MERGE

Tests: 7565 pass / 0 fail / 40 skip — identical to pre-snapshot baseline.
E2E: pre-existing lift+sql failures unchanged on 03/07/08; 01/02/04 build cleanly.
TS surface: BareExprNode.expr deleted; only legitimate runtime / non-BareExpr
`.expr` reads remain.

## Tags
#scrmlTS #change #anomaly-report #expr-ast-phase-4d-step-8 #cleared-for-merge

## Links
- [pre-snapshot.md](./pre-snapshot.md)
- [impact-analysis.md](./impact-analysis.md)
- [progress.md](./progress.md)
