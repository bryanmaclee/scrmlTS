# domain.map.md
# project: scrmlTS
# updated: 2026-04-17T17:00:00Z  commit: 41e4401

## Core Concepts

scrml — A compiled single-file full-stack reactive web language. Source: .scrml files containing markup, logic (${}), SQL (?{}), CSS (#{}), error (!{}), meta (^{}), and test (~{}) contexts.

### Compiler Pipeline (10 stages, single-pass)
BS (Block Splitter) -> TAB (Tokenizer + AST Builder) -> CE (Component Expander) -> BPP (Body Pre-Parser) -> PA (Protect Analyzer) -> RI (Route Inference) -> TS (Type System) -> MC (Meta Checker) -> DG (Dependency Graph) -> CG (Code Generator)

### Expression AST (Phase 3+ — current work)
The compiler is migrating from string-based expression handling (rewrite.ts) to structured ExprNode trees (expression-parser.ts + emit-expr.ts). The dual-path pattern `node.exprNode ? emitExpr(...) : rewriteExpr(...)` is the current transition mechanism. Escape-hatch rate on the example corpus: 0%.

### Reactivity Model
@varName declares reactive state. The compiler rewrites @var references to _scrml_reactive_get("var") (client) or _scrml_body["var"] (server). Derived reactives: const @name = expr. Debounced: @debounced(N) name = expr.

### Linear Types (lin)
lin declarations enforce single-consumption semantics. The type system tracks lin variable lifetimes across control flow and closures. E-LIN-* errors fire on unconsumed or double-consumed lin variables.

### Pattern Matching
match expr { .Variant => body, else => fallback }. Exhaustiveness checking via the type system (E-TYPE-026). The `is` operator checks enum membership: x is .Active.

### §19 Error Handling (S21 codegen rewrite — commit 37049be)
**Error value model:** `fail E.V(data)` no longer throws. It emits a tagged return object: `return { __scrml_error: true, type, variant, data }`. A failable function's normal result or its error both flow through the same return value.
**Propagation:** `?` suffix on a call or let-binding emits a value check, not a JS-level rethrow: `const tmp = callFailable(); if (tmp.__scrml_error) return tmp;` then optionally `const binding = tmp;`. Now parses correctly inside nested bodies (if, for, function) — previously emitted literal `?;`.
**Inline catch `!{}`:** `let x = !{ expr } catch .V [as binding] { ... }` rewrote from try/catch to a return-value check against `result.__scrml_error` + `result.variant`. Unhandled variants re-return to the enclosing failable function.
**Standalone `!{}`:** remains a true try/catch (for genuine JS throws).
**E-ERROR-001 now fires** (was unreachable while `fail` never parsed in bodies): using `fail` in a non-failable function.
**Codegen site:** compiler/src/codegen/emit-logic.ts:632-756. AST-builder parses `fail`/`?` dispatch added to parseOneStatement.

### §51 State Machines (2026-04-17 amendment — commit eef7b5e)
Grammar: `variant-ref-list ::= variant-ref ('|' variant-ref)*` — `|` alternation permitted on either side of `=>`. `A | B => C | D` desugars to the cross-product of single-pair rules before type checking. Any `given` guard or effect block on the rule applies to every expanded pair.
**Expansion site:** compiler/src/type-system.ts:1902 (`expandAlternation`) called from `parseMachineRules` at :1966. Deduplication fires E-MACHINE-014 on any duplicate `(from, to)` pair — within a line or across lines. Reference example: `examples/14-mario-state-machine.scrml` (machine `MarioMachine for MarioState` with `.Fire | .Cape => .Small`).
Machines now govern struct types too (Approach C, 2026-04-08): `* => *` wildcard rules with `given (self.*)` guards fire after every mutation; failures emit E-MACHINE-001-RT.

### Module Resolution (S21 — commit 86b5553)
**E-IMPORT-006:** module-resolver.js now checks `existsSync(absSource)` for relative imports that are NOT in the compile set. If the target file doesn't exist and isn't a `.js` import, the resolver emits E-IMPORT-006 with the resolved absolute path. Synthetic paths used by unit tests are skipped (importer must exist on disk).

### Server/Client Split
Functions prefixed with `server` compile to server-side route handlers. The compiler auto-splits into client JS (IIFE with reactive runtime) and server JS (fetch endpoints). `server @var` pins state to the server (compile-time enforced); `protect` hides struct fields from client-visible types.

### Mutability Contracts (README §Why scrml, re-framed 2026-04-17)
Opt-in, layerable: value predicates, presence lifecycle (`not`/`is some`/`is not`/`lin`), and state-machine transitions. A `fn` may mutate through any of these contracts while remaining provably pure. No runtime fee for unused contracts.

## Business Invariants
- Every ExprNode tree must round-trip: emitStringFromTree(parseExprToNode(x)) === x (Phase 1 invariant)
- emitExpr(node) must produce identical output to rewriteExpr(stringForm) for all inputs (Phase 3 parity invariant)
- Protected fields (PA stage) must never leak to client JS output
- Lin variables must be consumed exactly once (E-LIN-001 if unconsumed, E-LIN-002 if double-consumed)
- Escape-hatch rate on the example corpus must be 0% (currently met)
- A machine body SHALL NOT be empty (E-MACHINE-005) and SHALL NOT contain duplicate `(from, to)` pairs after `|` expansion (E-MACHINE-014)
- `fail` SHALL appear only in functions declared with the failable marker (E-ERROR-001)
- Relative imports SHALL resolve to an existing file on disk unless they point into the compile set (E-IMPORT-006)

## Domain Events
Runtime event model uses EventEmitter pattern in runtime-template.js and runtime-chunks.ts for reactive subscriptions. Channel nodes emit via WebSocket (channel tag in SPEC section 38).

## Tags
#scrmlTS #map #domain #compiler #ExprNode #reactivity #lin #pattern-matching #s21-error-handling #s21-machine-alternation #s21-import-resolution

## Links
- [primary.map.md](./primary.map.md)
- [error.map.md](./error.map.md)
- [schema.map.md](./schema.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
