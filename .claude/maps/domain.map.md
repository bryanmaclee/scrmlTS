# domain.map.md
# project: scrmlTS
# updated: 2026-04-19T22:00:00Z  commit: 74303d3

## Core Concepts

scrml — A compiled single-file full-stack reactive web language. Source: .scrml files containing markup, logic (${}), SQL (?{}), CSS (#{}), error (!{}), meta (^{}), and test (~{}) contexts.

### Compiler Pipeline (11 stages, single-pass)
BS (Block Splitter) -> TAB (Tokenizer + AST Builder) -> MOD (Module Resolver) -> CE (Component Expander) -> BPP (Body Pre-Parser) -> PA (Protect Analyzer) -> RI (Route Inference) -> TS (Type System) -> ME (Meta Eval) -> MC (Meta Checker) -> DG (Dependency Graph) -> CG (Code Generator)

### Component Definition (SPEC §15.6, PIPELINE §Stage 3.2)
Per SPEC.md:6370: `A const Name = <element ...> declaration at file scope or inside a ${} block defines an inline component`. The RHS **must be markup** for a component-def classification. ast-builder.js:3634 maps a const/let whose name starts with an uppercase ASCII letter (outside meta context) to a `component-def` AST node regardless of whether the RHS is markup. component-expander.ts then re-parses `raw` via splitBlocks+buildAST and emits E-COMPONENT-021 if it fails. Separately, ast-builder.js:5697-5711 attaches sibling nodes as `defChildren` to every component-def until it hits a barrier (another component-def, import-decl, export-decl, or type-decl).

### Known bug — uppercase-const classification (flagged S29)
**Minimal repro (15 lines):** place `const UPPER = 42;` (or any PascalCase/UPPER_SNAKE_CASE const with non-markup RHS) in a `${}` logic block with subsequent declarations. Those subsequent declarations are silently vacuumed into `defChildren` of a phantom component-def. E-COMPONENT-021 may fire on component expansion (if `raw` fails to re-parse as markup) but the error surface is a parse error, not "this isn't a component." Subsequent declarations still ride along as defChildren.

**Impact surface (all call sites that depend on `kind === "component-def"`):**
- **ast-builder.js:3634** — classifier (root cause).
- **ast-builder.js:5697-5711** — defChildren attach: walks body, attaches subsequent siblings until the next component-def/import-decl/export-decl/type-decl. Marks consumed siblings; filters them from body.
- **ast-builder.js:6170** — logic-body collector; pushes any component-def into ast.components.
- **component-expander.ts:472** — registry builder iterates `componentDefs` and calls parseComponentDef; skips non-`component-def` kinds.
- **component-expander.ts:1181, 1319** — AST walkers skip component-def nodes (CE consumes them).
- **component-expander.ts:461** — parseComponentDef returns `defChildren: defChildren || []`; the siblings roll forward.
- **component-expander.ts:879-887** — extended usage injects `defChildren` as finalChildren prefix when expanding component at a call site.
- **emit-library.ts:235** — already partially aware: skips component-def ONLY if `(stmt.template || stmt.props)`. In library mode, uppercase consts that CE did not resolve as components get emitted as plain JS. This guard does NOT exist in the main emit path.
- **emit-library.ts:286-293** — recovery code looks backward from span.start for `const`/`let` to capture the declarator keyword when treating component-def as a JS statement.
- **meta-checker.ts:1665** — iterates `fileAST.components` to register.
- **type-system.ts:3810** — case "component-def" in type resolver (passes through as tAsIs).
- **gauntlet-phase1-checks.js:279** + **gauntlet-phase3-eq-checks.js:461** — walkers that descend into `defChildren`.
- **self-host/ast.scrml** + **self-host/ts.scrml** + **self-host/meta-checker.scrml** + **self-host/cg-parts/section-assembly.js** — mirror the src logic.

**Fix surface — narrow vs wide:** The fix is narrow at the classifier (ast-builder.js:3634 — require RHS to start with markup `<` before classifying as component-def). The wide risk is that tab.test.js:649-654 **explicitly tests** `const MyComponent = 42;` as kind `component-def`, so that test must be updated/removed as part of the fix. Downstream code (component-expander.ts) already defensively handles parseComponentDef returning null when raw doesn't parse; emit-library.ts guards with `(stmt.template || stmt.props)`. No evidence that codegen other than library-mode depends on `kind === "component-def"` for non-component statements. Self-host modules carry the same heuristic and need mirror updates to stay in sync.

### Expression AST (Phase 3+ — current work)
The compiler is migrating from string-based expression handling (rewrite.ts) to structured ExprNode trees (expression-parser.ts + emit-expr.ts). Dual-path pattern: `node.exprNode ? emitExpr(...) : rewriteExpr(...)`. Escape-hatch rate on the example corpus: 0%.

### Reactivity Model
@varName declares reactive state. The compiler rewrites @var references to _scrml_reactive_get("var") (client) or _scrml_body["var"] (server). Derived reactives: const @name = expr. Debounced: @debounced(N) name = expr.

### Linear Types (lin)
lin declarations enforce single-consumption semantics. The type system tracks lin variable lifetimes across control flow and closures. E-LIN-* errors fire on unconsumed, double-consumed, shadowed (E-LIN-005 S24), or request/poll-body (E-LIN-006 S25) lin variables.

### Pattern Matching
match expr { .Variant => body, else => fallback }. Exhaustiveness checking via the type system (E-TYPE-026). The `is` operator checks enum membership: x is .Active.

### §19 Error Handling
- `fail E.V(data)` emits a tagged return object: `return { __scrml_error: true, type, variant, data }`.
- `?` propagation emits a value check + return; binding is optional.
- Inline `!{}` catch is a value-based check against `result.__scrml_error`, NOT try/catch.
- Standalone `!{}` remains a true try/catch for genuine JS throws.
- E-ERROR-001 fires on `fail` in a non-failable function.
- S28: GuardedExprNode arm.handlerExpr now walked by scope-checker (E-SCOPE-001 fires on undeclared identifiers; caught-error binding pushed into scope).
- Codegen: emit-logic.ts:632-756.

### §51 State Machines
- Grammar: `variant-ref-list ::= variant-ref ('|' variant-ref)*`. `|` alternation expands to the cross-product via `expandAlternation` (type-system.ts:1902). E-MACHINE-014 fires on duplicate `(from, to)` pairs.
- `< machine Name attribute-form>` is the current opener (§51.3.2, S25 migration); pre-S25 `< machine Name for Type>` sentence form emits E-MACHINE-020.
- Machines govern enums and structs (Approach C). Struct machines use `* => *` wildcard rules with `given (self.*)` guards that fire after every mutation.
- §51.11 audit: `audit @varName` on `< machine>` captures completeness including timer transitions + freeze (S27); audit entry shape extended with `rule` + `label` fields (S27).
- §51.12 temporal: `.From after Ns => .To` (S25).
- §51.13 projection machines: 6 phases shipped (S26); phase 7 guarded projection property tests (S28); phase 8 (runtime parity) deferred.
- §51.14 replay primitive: `replay(@target, @log [, index])` (S27). Compile-time validation E-REPLAY-001/002 (S27); E-REPLAY-003 rejects cross-machine replay (S28, reverse map auditTarget → machineName).

### §51.5 Validation Elision (S28)
classifyTransition returns "elidable" | "illegal" | "unknown" for each machine-bound assignment. emitElidedTransition drops variant extraction + matched-key resolution + rejection throw but preserves side-effect work (§51.11 audit push, §51.12 timer arm/clear, §51.3.2 effect block, §51.5.2(5) state commit — all spec-normative on every successful transition). Coverage: Cat 2.a/2.b (literal unit-variant against unguarded wildcard with no specific shadow), Cat 2.d (payload constructors via balanced-paren scanner), Cat 2.f (trivially-illegal → compile-time E-MACHINE-001). Slice 4 adds `SCRML_NO_ELIDE=1` env var / `setNoElide()` knob for CI dual-mode parity. §51.5.1 illegal detection runs BEFORE the no-elide gate (normative obligation).

### Module Resolution (S21)
E-IMPORT-006: module-resolver.js:146 — existsSync gate for relative imports outside the compile set. Synthetic paths used by unit tests are skipped.

### Server/Client Split
Functions prefixed with `server` compile to server-side route handlers. The compiler auto-splits into client JS (IIFE with reactive runtime) and server JS (fetch endpoints). `server @var` pins state to the server (compile-time enforced); `protect` hides struct fields from client-visible types.

### Mutability Contracts
Opt-in, layerable: value predicates, presence lifecycle (`not`/`is some`/`is not`/`lin`), and state-machine transitions. A `fn` may mutate through any of these contracts while remaining provably pure. No runtime fee for unused contracts.

## Business Invariants
- Every ExprNode tree must round-trip: emitStringFromTree(parseExprToNode(x)) === x (Phase 1)
- emitExpr(node) must produce identical output to rewriteExpr(stringForm) for all inputs (Phase 3)
- Protected fields (PA stage) must never leak to client JS output
- Lin variables consumed exactly once (E-LIN-001 if unconsumed, E-LIN-002 if double-consumed)
- Escape-hatch rate on the example corpus must be 0% (currently met)
- A machine body SHALL NOT be empty (E-MACHINE-005) and SHALL NOT contain duplicate `(from, to)` pairs after `|` expansion (E-MACHINE-014)
- `fail` SHALL appear only in failable functions (E-ERROR-001)
- Relative imports SHALL resolve to an existing file on disk unless pointing into the compile set (E-IMPORT-006)
- Side-effect work on machine transitions (audit, timer, effect, commit) SHALL run on every successful transition — validation elision MAY drop validation-only codegen but NEVER side effects (§51.5.2 amended S28)
- After CE, no `component-def` node appears at any depth and no markup node with `isComponent: true` remains (PIPELINE §Stage 3.2)

## Domain Events
Runtime event model uses EventEmitter pattern in runtime-template.js and runtime-chunks.ts for reactive subscriptions. Channel nodes emit via WebSocket (channel tag in SPEC section 38). §51.11 audit log entries are the domain-event surface for machine state changes (rule + label on each entry S27).

## Tags
#scrmlTS #map #domain #compiler #ExprNode #reactivity #lin #pattern-matching #s27-replay #s28-elide #component-def-bug

## Links
- [primary.map.md](./primary.map.md)
- [error.map.md](./error.map.md)
- [schema.map.md](./schema.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
