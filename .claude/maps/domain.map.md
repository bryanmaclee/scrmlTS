# domain.map.md
# project: scrmlTS
# updated: 2026-04-20T22:05:00Z  commit: d6e8288

## Core Concepts

scrml — A compiled single-file full-stack reactive web language. Source: .scrml files containing markup, logic (${}), SQL (?{}), CSS (#{}), error (!{}), meta (^{}), and test (~{}) contexts.

### Compiler Pipeline (11 stages, single-pass)
BS (Block Splitter) -> TAB (Tokenizer + AST Builder) -> MOD (Module Resolver) -> CE (Component Expander) -> BPP (Body Pre-Parser) -> PA (Protect Analyzer) -> RI (Route Inference) -> TS (Type System) -> ME (Meta Eval) -> MC (Meta Checker) -> DG (Dependency Graph) -> CG (Code Generator)

### Component Definition (SPEC §15.6, PIPELINE §Stage 3.2)
Per SPEC.md:6370: `A const Name = <element ...> declaration at file scope or inside a ${} block defines an inline component`. The RHS **must be markup** for a component-def classification. ast-builder.js:3634 maps a const/let whose name starts with an uppercase ASCII letter (outside meta context) to a `component-def` AST node regardless of whether the RHS is markup. component-expander.ts then re-parses `raw` via splitBlocks+buildAST and emits E-COMPONENT-021 if it fails.

### Known bug — uppercase-const classification (flagged S29, still open at S34)
See primary.map.md Key Facts. Fix surface is narrow at ast-builder.js:3634 (require RHS to start with `<`), but tab.test.js:649-654 encodes bug as expected behavior. S30-S34 focused on other priorities (S30 public pivot, S32-S33 machine purity enforcement, S34 adopter-reported codegen bugs); this bug has not been worked.

### Expression AST (Phase 3+ — current work)
The compiler is migrating from string-based expression handling (rewrite.ts) to structured ExprNode trees (expression-parser.ts + emit-expr.ts). Dual-path pattern: `node.exprNode ? emitExpr(...) : rewriteExpr(...)`. Escape-hatch rate on the example corpus: 0%.

**S34 expression-parser fix (6nz Bug C / commit 127d35a):** CallExpression case now threads `rawSource` down through its argument recursion, and the ArrowFunctionExpression/FunctionExpression case slices `rawSource.slice(node.start, node.end)` for block-body arrows so the escape-hatch carries the original text rather than "". Without this, `.map((n, i) => { if (...) return n*2; return n })` was emitting `.map()` — the arrow silently vanished.

### Reactivity Model
@varName declares reactive state. The compiler rewrites @var references to _scrml_reactive_get("var") (client) or _scrml_body["var"] (server). Derived reactives: const @name = expr. Debounced: @debounced(N) name = expr.

**S34 reactive + server-fn interaction (GITI-001 / commit d23fd54):** `@data = serverFn()` where serverFn is a `server function` now awaits the returned Promise before calling `_scrml_reactive_set`, wrapped in an async IIFE. Previously the unawaited Promise was stored as the value, so readers saw `[object Promise]` or undefined. `<request>` tag without a `url=` attribute now skips its fetch machinery (previously fired `fetch("", ...)` on mount and silently failed).

**S34 markup interpolation of server fn calls (GITI-005 / commit e585dba):** `<p>${loadGreeting()}</p>` where loadGreeting is a server function now compiles to an async IIFE that awaits the call and sets textContent on the placeholder DOM node after await. Previously emitted the call at module top with result dropped and an empty reactive-display-wiring block.

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
- §51.14 replay primitive: `replay(@target, @log [, index])` (S27). Compile-time validation E-REPLAY-001/002 (S27); E-REPLAY-003 rejects cross-machine replay (S28).

### §51.5 Validation Elision (S28)
classifyTransition returns "elidable" | "illegal" | "unknown" for each machine-bound assignment. emitElidedTransition drops validation-only codegen but preserves §51.11 audit push, §51.12 timer arm/clear, §51.3.2 effect block, §51.5.2(5) state commit. SCRML_NO_ELIDE=1 env var / setNoElide() knob gates dual-mode CI. §51.5.1 illegal detection runs BEFORE the no-elide gate.

### §54.6 / §33.6 Machine Purity Enforcement (S32 Phase 4a-4g, closed S33)
- E-STATE-TRANSITION-ILLEGAL at call site (commit 72210e8, §54.6.3)
- E-STATE-TERMINAL-MUTATION on field writes to terminal substates (commit 5de6a2d, §54.6.4)
- Fn-level purity in transition bodies (commit 37f21f7, §33.6)
- 9 gauntlet-s32 tests un-skipped by commit 36eadb9 as Phase 4a-4g coverage caught up

### Module Resolution (S21)
E-IMPORT-006: module-resolver.js:146 — existsSync gate for relative imports outside the compile set. Synthetic paths used by unit tests are skipped.

**S34 import-scope fix (GITI-002 / commit 881b411):** type-system.ts `case "import-decl"` now registers each imported local name into the current scope chain with `kind: "import"`, so checkLogicExprIdents via scopeChain.lookup() no longer emits a false E-SCOPE-001 on uses of imported names elsewhere in the logic block (including inside `server function` bodies).

### Server/Client Split
Functions prefixed with `server` compile to server-side route handlers. The compiler auto-splits into client JS (IIFE with reactive runtime) and server JS (fetch endpoints). `server @var` pins state to the server (compile-time enforced); `protect` hides struct fields from client-visible types.

**S34 boundary cleanup (GITI-003 + GITI-004 / commit e5f5b22):**
- emit-client.ts now runs a post-emit prune pass that drops imports whose local names are not referenced in the client body. Scoped to non-scrml paths to preserve scrml:/vendor:/.client.js imports. Fixes server-only helper imports leaking into .client.js and 500ing page load.
- `lift <expr>` and markup with `boundary: "server"` inside a `server function` body now lowers differently — a plain IIFE/value path — so server handlers no longer reference `document` or `_scrml_lift` (browser-only). Previously the handler returned undefined.

### S34 control-flow + tilde-decl (6nz Bug B + F / commit 70190a7)
emit-control-flow.ts and emit-logic.ts now thread `declaredNames` through IfOpts, forStmt, and whileStmt. `let x = A; if (c) x = B` correctly emits `x = B;` (reassignment) in the branch instead of `const x = B;` (shadow — Bug B) or `_scrml_derived_declare("x", ...)` (spurious reactive — Bug F). Nested branches (if-in-for-in-fn) verified.

### S34 codegen hygiene fixes
- Object.freeze emission missing commas between props — `aa92070` (emit-logic.ts)
- Thread `event` into bare-call event handlers — `eb86d31` (emit-event-wiring.ts)
- Scope-aware mangler with negative-lookbehind for `.` so `classList.toggle(...)` does not get rewritten to `classList._scrml_toggle_7(...)` — `27ed6fe` (emit-client.ts)

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
- Side-effect work on machine transitions (audit, timer, effect, commit) SHALL run on every successful transition — validation elision MAY drop validation-only codegen but NEVER side effects (§51.5.2)
- After CE, no `component-def` node appears at any depth and no markup node with `isComponent: true` remains (PIPELINE §Stage 3.2)
- **S34:** emit-client.ts MUST NOT emit imports whose local bindings are unreferenced in the client body (GITI-003)
- **S34:** emit-client.ts mangler MUST NOT rewrite property-access call sites that happen to share a user-fn name (Bug D)
- **S34:** `server function` bodies emitted for the server bundle MUST NOT reference `document` or `_scrml_lift` (GITI-004)
- **S34:** `declaredNames` MUST be threaded through all nested control-flow emitters so reassignment inside branches does not shadow or spuriously declare-derived (Bugs B, F)

## Domain Events
Runtime event model uses EventEmitter pattern in runtime-template.js and runtime-chunks.ts for reactive subscriptions. Channel nodes emit via WebSocket (channel tag in SPEC section 38). §51.11 audit log entries are the domain-event surface for machine state changes (rule + label on each entry S27).

## Tags
#scrmlTS #map #domain #compiler #ExprNode #reactivity #lin #pattern-matching #s27-replay #s28-elide #s32-purity #s34-adopter-bugs #server-client-boundary

## Links
- [primary.map.md](./primary.map.md)
- [error.map.md](./error.map.md)
- [schema.map.md](./schema.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
