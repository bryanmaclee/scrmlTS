# domain.map.md
# project: scrmlTS
# updated: 2026-04-12T20:00:00Z  commit: 623aeac

## Core Concepts

scrml — A compiled single-file full-stack reactive web language. Source: .scrml files containing markup, logic (${}), SQL (?{}), CSS (#{}), error (!{}), meta (^{}), and test (~{}) contexts.

### Compiler Pipeline (10 stages, single-pass)
BS (Block Splitter) -> TAB (Tokenizer + AST Builder) -> CE (Component Expander) -> BPP (Body Pre-Parser) -> PA (Protect Analyzer) -> RI (Route Inference) -> TS (Type System) -> MC (Meta Checker) -> DG (Dependency Graph) -> CG (Code Generator)

### Expression AST (Phase 3 — current work)
The compiler is migrating from string-based expression handling (rewrite.ts) to structured ExprNode trees (expression-parser.ts + emit-expr.ts). The dual-path pattern `node.exprNode ? emitExpr(...) : rewriteExpr(...)` is the current transition mechanism with 51 call sites.

### Reactivity Model
@varName declares reactive state. The compiler rewrites @var references to _scrml_reactive_get("var") (client) or _scrml_body["var"] (server). Derived reactives: const @name = expr. Debounced: @debounced(N) name = expr.

### Linear Types (lin)
lin declarations enforce single-consumption semantics. The type system tracks lin variable lifetimes across control flow and closures. E-LIN-* errors fire on unconsumed or double-consumed lin variables.

### Pattern Matching
match expr { .Variant => body, else => fallback }. Exhaustiveness checking via the type system. The `is` operator checks enum membership: x is .Active.

### Server/Client Split
Functions prefixed with `server` compile to server-side route handlers. The compiler auto-splits into client JS (IIFE with reactive runtime) and server JS (fetch endpoints).

## Business Invariants
- Every ExprNode tree must round-trip: emitStringFromTree(parseExprToNode(x)) === x (Phase 1 invariant)
- emitExpr(node) must produce identical output to rewriteExpr(stringForm) for all inputs (Phase 3 parity invariant)
- Protected fields (PA stage) must never leak to client JS output
- Lin variables must be consumed exactly once (E-LIN-001 if unconsumed, E-LIN-002 if double-consumed)
- Escape-hatch rate on the example corpus must be 0% (currently met)

## Domain Events
Runtime event model uses EventEmitter pattern in runtime-template.js and runtime-chunks.ts for reactive subscriptions. Channel nodes emit via WebSocket (channel tag in SPEC section 38).

## Tags
#scrmlTS #map #domain #compiler #ExprNode #reactivity #lin #pattern-matching

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
