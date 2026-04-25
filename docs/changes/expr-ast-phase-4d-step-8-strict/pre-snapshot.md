# Pre-Snapshot: expr-ast-phase-4d-step-8-strict

**Date:** 2026-04-24
**Worktree branch:** worktree-agent-a60d484c5be185e19
**Base commit (rebased onto):** 2e6a42d (`docs(s40): hand-off — A/B/C all landed, follow-ups filed, agent definition fixed`)

## Baseline test state

```
 7578 pass
 40 skip
 0 fail
 27316 expect() calls
Ran 7618 tests across 355 files. [10.69s]
```

## Source state — 7 fallback sites confirmed

`grep -n '(node as any).expr\|(stmt as any).expr' compiler/src/meta-checker.ts`:

| Function | Line | Site |
|---|---|---|
| `bodyUsesCompileTimeApis` | 379-380 | `if exprNode … else if testExpr((any).expr)` |
| `bodyContainsLift` | 460-461 | `if exprNode … else if (any).expr && LIFT_CALL_RE` |
| `bodyContainsSqlContext` | 500-501 | `if exprNode … else if (any).expr && SQL_CONTEXT_RE` |
| `collectReflectArgIdents` | 546 | ternary `(any).exprNode ? … : (any).expr` |
| `bodyMixesPhases` (else branch) | 640 | `if (node.kind === "bare-expr" && (any).expr) exprs.push(...)` |
| `checkNodeForRuntimeVars` (string fallback) | 1093 | `(node.kind === "bare-expr" ? (any).expr : node.init)` |
| `checkReflectCalls` | 1366 | ternary `(any).exprNode ? … : (any).expr` |

Lines 627, 1613, 1614 are also `(node as any).exprNode` reads — these are valid (typed BareExprNode field reads via cast for narrow LogicNode typing) and stay. The intake target is the `.expr` fallback, not all `(any)` casts.

## Synthetic-fixture inventory

- 167 occurrences of `kind: "bare-expr"` across `compiler/tests/`.
- Not all need updating — only fixtures that flow into meta-checker functions matter for the strict cleanup. Other consumers use the runtime `.expr` JS value via duck typing and are out of scope.

Test files most likely to host meta-checker-flowing fixtures:
- `meta-checker.test.js`
- `meta-checker-false-positives.test.js`
- `self-host-meta-checker.test.js`
- `meta-type-registry-emission.test.js`
- `collect-meta.test.js`
- `sql-client-leak.test.js` (calls `isServerOnlyNode` which uses meta-checker helpers — verify)

## Plan

1. Audit which tests construct synthetic bare-expr nodes that flow into meta-checker functions.
2. For each such fixture, also populate `.exprNode` via `parseExprToNode` from `compiler/src/expression-parser.ts`.
3. Remove the `(any).expr` fallback reads from the 7 meta-checker.ts sites.
4. Run `bun test` after each batch.
5. Final `grep` to confirm zero `.expr` fallback reads remain.

## Tags
#tech-debt #phase-4d #ast-cleanup #pre-snapshot

## Links
- intake: `docs/changes/expr-ast-phase-4d-step-8-strict/intake.md`
- predecessor anomaly report: `docs/changes/expr-ast-phase-4d-step-8/anomaly-report.md`
- AST type: `compiler/src/types/ast.ts:707-720`
- Parser entry: `compiler/src/expression-parser.ts:1094`
