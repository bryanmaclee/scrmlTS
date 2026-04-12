# error.map.md
# project: scrmlTS
# updated: 2026-04-12T20:00:00Z  commit: 623aeac

## Custom Error Types

CGError — compiler/src/codegen/errors.ts:11 — codegen errors with code + message + span + severity
PAError — compiler/src/protect-analyzer.ts:126 — protect analysis errors (field leak detection)
TSError — compiler/src/type-system.ts:342 — type system errors (type mismatches, lin violations)
TABErrorInfo — compiler/src/types/ast.ts:987 — AST builder errors (E-ATTR-*, W-PROGRAM-*)

## Error Code Namespaces
E-TEST-001..005 — Test context errors (nested ~{}, invalid position, unknown type, non-callable, empty block)
E-LIN-* — Linear type errors (unconsumed lin variable, double consumption)
E-ATTR-* — Attribute parsing errors
E-CONTRACT-001-RT — Runtime type predicate check failure
W-PROGRAM-* — Program-level warnings

## Error Handling Patterns

### Pipeline stage errors
Each pipeline stage (BS, TAB, CE, BPP, PA, RI, TS, MC, DG, CG) returns its own errors array.
api.js aggregates all errors and reports them after compilation.

### Codegen dual-path pattern
emit-logic.ts and other emitters use: `node.exprNode ? emitExpr(node.exprNode, ctx) : rewriteExpr(node.stringField)`
When emitExpr encounters an escape-hatch node, it falls back to rewriteExpr/rewriteServerExpr.

### Expression parser tolerant mode
expression-parser.ts parseExpression/parseStatements default to `tolerant: true` — returns { ast: null, error: message } on failure instead of throwing.

### ast-builder.js safeParseExprToNode
Module-level wrapper that catches all exceptions from parseExprToNode. Returns null on failure. Never blocks compilation.

## Global Error Boundaries
No global error boundary middleware — this is a compiler, not a web app.
Compilation errors are accumulated in arrays and reported post-pipeline.

## Tags
#scrmlTS #map #error #CGError #PAError #TSError #diagnostics

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
