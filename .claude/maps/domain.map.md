# domain.map.md
# project: scrmlts
# updated: 2026-05-13T15:00:00Z  commit: 9b98118

## Core Concepts

| Concept | Definition |
|---------|------------|
| scrml | Single-file, full-stack reactive web language: one .scrml file contains markup, CSS, logic, server functions, SQL, and state — the compiler splits it into HTML + client JS + server JS |
| Pipeline | 12 ordered stages (BS → TAB → NR → MOD → CE → UVB → PA → RI → TS → META → DG → CG) producing HTML, server JS, client JS, and optional CSS per compiled file |
| Reactive cell (@var) | Mutable reactive variable declared with `@name = expr` or `<name> = expr` (structural form); all subscriptions update on set |
| Derived cell | Const-derived reactive variable (`const <name> = expr`); recomputed when deps change; shape:"derived" in AST |
| State-decl (Shape 1/2/3) | Shape 1: plain cell with initExpr; Shape 2: render-spec (bound input element); Shape 3: derived expression |
| Engine | State machine over a reactive cell (`<engine>` tag); governs legal transitions via rule= attributes; variant-guarded markup rendering via emit-variant-guard.ts |
| State child | AST node inside an `<engine>` body representing a named variant (`<Idle>`, `<Showing>`, etc.); body is walkable AST |
| Variant-guarded render | Per-variant conditional HTML rendering dispatched by `emitVariantGuardedRender()`; dispatcher swaps innerHTML on variant change; arm wire functions re-attach reactive wiring |
| Engine self-write (§51.0.F.1) | Assigning `@var = .CurrentVariant` where `.CurrentVariant` is currently-active state is a runtime NO-OP. Compile-time info lint `W-ENGINE-SELF-WRITE-DETECTED` fires when statically detectable. |
| Match block | Pattern-match expression (`match expr { .A => ..., .B => ... }`); also match-as-expression and match-block-form |
| Logic block (${ }) | Imperative code block in a .scrml file; contains let/const/reactive decls, function defs, SQL blocks, control flow |
| Meta block (^{ }) | Compile-time code execution block; evaluated at CG Stage 8; `meta.emit()` inserts HTML at the block's DOM position |
| Error-effect block (!{ }) | Pattern-matched error handler; arms match on error type (NetworkError, ValidationError, etc.) |
| SQL block (?{ }) | Inline SQL query with chained method (`.all()`, `.get()`, `.run()`); compiled to server-only prepared statement |
| Tilde-decl (~name) | Must-use variable; compiler tracks consumption; E-TILDE-001 if dropped |
| Lin-decl (lin name) | Immutable linear-type variable; must be consumed exactly once (§35.2) |
| Server function | `server function name(params)` — compiled to an HTTP route handler on the server; called from client via auto-generated fetch |
| Component | Reusable markup definition (`const Comp = <element...>`); expanded at Stage 3.2 CE |
| Channel | Real-time pub/sub topic (`<channel>` tag or file-level channel decl); WebSocket/SSE backed |
| Channel placement (v0.3) | Channels inside `<program>` are canonical; PURE-CHANNEL-FILE (file-top channel, no program) is also canonical via engine-parity dispensation. E-CHANNEL-OUTSIDE-PROGRAM fires only for sibling-to-program channel. |
| PURE-CHANNEL-FILE | A .scrml file containing one or more `<channel>` declarations at file top and NO `<program>`. Canonical placement per §38.12.6. Enables cross-file channel imports. |
| Validator | Predicate attached to a state cell (`req`, `length(>=2)`, `pattern(/.../)`); synthesizes validity surface properties (@x.isValid, @x.errors, @x.touched, @x.submitted) |
| Batch Planner | Stage 7.5; coalesces SQL calls within a logic block into batched queries to reduce round-trips |
| Protect Analyzer | Stage 4 PA; identifies protected fields requiring write guards |
| Route Inference | Stage 5 RI; infers HTTP method + path for server functions and channels from AST shape |
| Dependency Graph | Stage 7 DG; builds reactive cell dependency graph; detects cycles; annotates hasLift. S88: MarkupReadDGNode added (A-1.2); A-1.3/A-1.4/A-1.5 edge emission activated. |
| MarkupReadDGNode (A-1.2) | NEW S88: per-interpolation markup-context read node. Each site where a reactive var is read from markup context gets its own node. Enables §40.9.3 closure analysis with per-interpolation reachability precision. |
| Approach A (v0.3) | Wave A implementation plan for Approach A (full 5 sub-waves A-1.1 through A-1.5). A-1.3 (4 high-freq shapes) + A-1.4 (call-ref/for-iterable/lift-template) + A-1.5 (engine surface) all activated at S88. |
| Binding Registry | Contract between HTML emit (analysis) and JS emit (client-side wiring); holds EventBinding + LogicBinding records |
| TAB | Typed AST Builder (Stage 3); produces the AST from block-split source; ExprNode population |
| NR | Name Resolver (Stage 3.05); stamps resolvedKind/resolvedCategory on MarkupNodes; routes engine/channel/component calls |
| MOD | Module Resolver (Stage 3.1); builds import graph, detects circular imports, produces export registry |
| CE | Component Expander (Stage 3.2); expands component call sites using same-file and cross-file registries |
| UVB | Unified Validation Block (Stage 3.3); runs VP-1 (attribute allowlists, interpolation, post-CE invariant) + ast-walk channel-placement pre-check |
| TS | Type System (Stage 6); type-checks the full AST; produces type registry, validator-arg deps, synthesized validity cells |
| META | Meta Checker + Eval (Stage 6.5); validates phase separation + reflect() calls; evaluates ^{} blocks |
| Lint passes | Pre-Stage-2: lint-ghost-patterns.js; post-TAB: gauntlet-phase1-checks.js, gauntlet-phase3-eq-checks.js |
| SCRML_RUNTIME | The compiled runtime JS embedded or linked in client output; 18 named chunks (core, reset, validators, derived, lift, scope, timers, animation, reconciliation, utilities, meta, transitions, errors, input, equality, deep_reactive, messages, engine) |
| Self-host | Compiler compiled with itself; dist artifacts in compiler/dist/self-host/ (gitignored); rebuilt locally |
| Tier system | Tier 1 (basic reactive): if/for/match; Tier 2 (engines): state machines; Tier 3 (positional sugar): compound state shorthand |
| scrml:host (NEW S88) | Stdlib module declaring `safeCall`, `safeCallAsync`, and `HostError`. The try/catch lives ONLY in `compiler/runtime/stdlib/host.js` — never in scrml source. Bridge between JS-host throw semantics and the scrml failable-function error model (§19). |
| safeCall (NEW S88) | `safeCall(thunk) → value | HostError shape` — synchronous JS-host throw containment primitive. Wraps any synchronous JS call that may throw; catches and returns `HostError::Thrown(message, name)` variant shape. |
| safeCallAsync (NEW S88) | `safeCallAsync(thunk) → Promise<value | HostError shape>` — async sibling of safeCall. For wrapping `await someHostApi()` calls that may reject. First `await safeCallAsync`, then use `!{}` handler on result. |
| Phase 3a stdlib migration (S88) | Migrate stdlib try/catch blocks to safeCall/safeCallAsync. Completed: 4 sync try-blocks + `verifyPassword` async (stdlib/auth/password.scrml). Documented gaps: stdlib/http async fetch calls (4 sites) deferred until safeCallAsync was available. |
| LIFT-1..5 fixes (S88) | All 5 LIFT-template codegen bug families closed at S88. LIFT-1: `parseLiftTag` paren-attr cursor desync. LIFT-2/3/4: bind:*/if=/event-arg parity in lift template. LIFT-5: if/for children route through container helpers in reconciler factory (emit-control-flow.ts). |
| §4.7 BS-comment-skip amendment (S88) | SPEC §4.7 softened to MAY-permit `<!-- -->` skip at BS-layer (matching shipped S87 behavior). Per S86 "BS-layer over SPEC retreat" — implementation was correct, SPEC catches up. |
| §18.7 mixed binding amendment (S88) | SPEC §18.7 clarified: mixed positional+named binding in match variant destructuring is FORBIDDEN (E-TYPE-021 / E-TYPE-022 already in catalog). Spec makes the existing code-level enforcement explicit. |
| §41.4 bun:/node: protocol prefixes (S88) | SPEC §41.4 extended: `bun:` and `node:` prefixed import specifiers pass through verbatim to runtime resolver. Addresses stdlib authors' need to use `import { SQL } from "bun"`, `import { Database } from "bun:sqlite"` etc. Server-context-only; E-IMPORT-007 preserves client-output security invariant. |
| Adopter override surface | `<program>` attributes that override compiler-emitted defaults: `idempotency-store`, `idempotency-ttl`, `batch-in-list-cap`, `cors-max-age`, `channel-reconnect`. All raw strings on MiddlewareConfig; parsed at codegen time by per-field helpers. |

## v0.3.0 Status (as of S88 close)

**Blockers CLOSED at S88:**
- LIFT-1 (catastrophic parens-attr cursor desync) ✓
- LIFT-2/3/4 bundle (bind:*/if=/event-arg lift template parity) ✓
- LIFT-5 (if-inside-for reconciler-factory ambient state gap) ✓
- Approach A wave A-1 DG edges (5/5 sub-phases A-1.1..A-1.5 activated) ✓
- safeCall/safeCallAsync stdlib primitives ✓
- Phase 3a stdlib migration (4 sync sites + 1 async) ✓
- 3 SPEC amendments (§4.7, §18.7, §41.4) ✓

**Remaining v0.3.0 items:**
- Wave 4 adopter content (examples + tutorial updates) — v0.3.0 cut blocker per user S88 ratification
- Approach A waves A-2 through A-5 (full FULL Approach A per S88 scope)

## Business Invariants

- No SQL execution calls may appear in client JS output (E-CG-006)
- No server-environment access (process.env, Bun.env) may appear in client JS output
- Engine transitions must match a declared rule= arm or throw E-ENGINE-001-RT at runtime
- Exception (§51.0.F.1): engine self-writes (target = current variant) are runtime NO-OPs — no E-ENGINE-INVALID-TRANSITION
- Lin-declared variables must be consumed exactly once; unconsumed or double-consumed raises E-LIN-* at compile time
- Tilde-declared variables must be used; E-TILDE-001 on drop
- Batch Planner excludes .nobatch() SQL nodes from all coalescing candidate sets (§8.9.1)
- `null` / `undefined` are NOT valid scrml tokens in any context (SPEC §42, E-SYNTAX-042)
- `===` / `!==` are NOT valid in scrml source (E-EQ-004). Canonical forms: `==` / `!=`
- `bun:` and `node:` prefixed imports are server-context-only (E-IMPORT-007 enforces client output security)

## Domain Events (Compiler Pipeline)

| Event | When | Where |
|-------|------|-------|
| CompileContext populated | After analysis, before emission | codegen/index.ts |
| BindingRegistry seal | After HTML emit, before client JS emit | codegen/index.ts |
| `pushArmContext / popArmContext` | Around each engine state-child body emit | emit-variant-guard.ts |
| `drainMachineCodegenErrors` | After all machine emission, before CG output | codegen/emit-machines.ts |
| `detectRuntimeChunks` | Before runtime assembly | emit-client.ts |
| channel placement pre-check | UVB Stage 3.3, before codegen | validators/ast-walk.ts |

## Aggregates

| Aggregate | File | Owns |
|-----------|------|------|
| FileAST | compiler/src/types/ast.ts | All ASTNodes for one .scrml file |
| CompileContext | compiler/src/codegen/context.ts | BindingRegistry, FileAnalysis, EncodingContext, error list |
| BindingRegistry | compiler/src/codegen/binding-registry.ts | EventBinding[], LogicBinding[] |
| FileAnalysis | compiler/src/codegen/analyze.ts | Pre-computed AST slices (fnNodes, markupNodes, topLevelLogic, etc.) |

## Tags
#scrmlts #map #domain #concepts #pipeline #engine #reactive #s88 #v0.3 #approach-a #lift-fixes-complete #safecall #stdlib-host #spec-amendments

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [schema.map.md](./schema.map.md)
- [error.map.md](./error.map.md)
