# error.map.md
# project: scrmlTS
# updated: 2026-04-17T17:00:00Z  commit: 41e4401

## Custom Error Types
CGError — compiler/src/codegen/errors.ts:11 — codegen errors { code, message, span, severity }
PAError — compiler/src/protect-analyzer.ts — E-PA-* protect analysis errors (field leak + SQLite introspection)
TSError — compiler/src/type-system.ts — type system errors (includes §19 E-ERROR-001/002, §51 E-MACHINE-014, lin, predicates, type mismatch)
TABErrorInfo — compiler/src/types/ast.ts:1051 — AST builder errors { code, message, tabSpan, severity? }
ModuleError — compiler/src/module-resolver.js — E-IMPORT-* codes (bare-import / missing file / etc.)

## Error Code Namespaces (~200 unique codes across compiler source)

### Error classes (E-)
- **E-ATTR-** (001, 002, 010, 011, 013) — attribute parsing
- **E-AUTH-** (002..005) — auth config
- **E-BATCH-** (001, 002) — SQL batching (from batch-planner.ts)
- **E-BPP-001** — body pre-parser
- **E-BS-000** — block splitter
- **E-CG-** (001..014) — codegen
- **E-CHANNEL-001** — channel block validation
- **E-COMPONENT-** (010..034) — component expansion
- **E-CONTRACT-** (001..003) — predicate contracts (001-RT is runtime)
- **E-CTRL-** (001..005, 011) — control-flow
- **E-CTX-** (001..003) — context
- **E-DG-** (001, 002) — dependency graph
- **E-EQ-** (001..004) — §45 equality
- **E-ERROR-** (001..008, gap at 005) — §19 error handling (**E-ERROR-001 now enforced S21**: fail in non-failable fn; E-ERROR-002: unhandled failable result)
- **E-EVAL-001** — rewrite
- **E-FN-** (001..009) — §48 fn purity (E-FN-003: reactive writes inside fn body; **tightened S20/S21**)
- **E-IMPORT-** (001..006) — imports (**E-IMPORT-006 new S21**: missing relative file outside compile set; module-resolver.js:146)
- **E-INPUT-** (001..004) — input state
- **E-LIFECYCLE-** (009, 010, 012, 015, 017, 018) — lifecycle
- **E-LIFT-** (001, 002) — value lift
- **E-LIN-** (001..003) — linear types
- **E-LOOP-** (001..007, no 004) — loop constraints
- **E-MACHINE-** (001, 003..005, 010, 013, 014) — §51 state machines (**E-MACHINE-014 new S21**: duplicate (from,to) transition pair — covers pairs produced by `|` alternation; type-system.ts:1978)
- **E-MARKUP-** (001..003) — markup
- **E-MATCH-012** — match-statement constraint
- **E-META-** (001..003, 005..008) — ^{} meta
- **E-MU-001, E-MW-** (001, 002, 005, 006) — middleware
- **E-PA-** (001..007) — protect analysis (leaks + SQLite introspection)
- **E-PARSE-** (001, 002) — parser
- **E-PROTECT-003** — batch planner protected-field check
- **E-REACTIVE-004** — reactive
- **E-RI-** (001, 002) — route inference
- **E-ROUTE-001** — route conflict
- **E-SCOPE-001, E-SCOPE-010** — scope
- **E-STATE-** (004..006) — state
- **E-STYLE-001** — style
- **E-SYNTAX-** (002, 010, 011, 042..044, 050) — syntax
- **E-TEST-** (001..005) — ~{} test context
- **E-TILDE-** (001, 002) — tilde decl
- **E-TIMEOUT-** (001, 002) — timeouts
- **E-TYPE-** (004, 006, 020, 023..026, 031, 041..043, 045, 050..052, 062, 063, 071, 080, 081) — type system (including §45 equality E-TYPE-042, match-exhaustiveness E-TYPE-026)
- **E-USE-** (001, 002, 005) — use-decl

### Warning classes (W-)
- **W-ASSIGN-001** (double-paren assignment), **W-AUTH-001**, **W-BATCH-001**, **W-CG-001**, **W-COMPONENT-001**, **W-DEPLOY-001**, **W-DERIVED-001**, **W-EQ-001**, **W-LIFECYCLE-** (002, 007), **W-LINT-** (001..010), **W-MATCH-** (001, 003), **W-PROGRAM-001**, **W-SCHEMA-002**

## Error Handling Patterns

### Pipeline stage errors
Each pipeline stage (BS, TAB, CE, BPP, PA, RI, TS, MC, DG, CG) returns its own errors array.
api.js aggregates all errors and reports them after compilation.

### §19 error-handling codegen (S21 rewrite — emit-logic.ts:632-729)
- `fail E.V(data)` → `return { __scrml_error: true, type:"E", variant:"V", data };`
- `?` propagation → `const tmp = expr; if (tmp.__scrml_error) return tmp;` (+ optional `const binding = tmp;`)
- `!{ expr } catch .V { handler }` (inline catch): **value-based check, NOT try/catch** — tests `result.__scrml_error`, matches on `.variant`, binds `.data`, re-returns unhandled variants
- Standalone `!{ body } catch Type [as binding] { handler }`: genuine try/catch using `instanceof` + tag check

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
#scrmlTS #map #error #CGError #PAError #TSError #ModuleError #diagnostics #s21

## Links
- [primary.map.md](./primary.map.md)
- [domain.map.md](./domain.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
