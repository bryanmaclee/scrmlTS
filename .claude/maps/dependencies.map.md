# dependencies.map.md
# project: scrmlTS
# updated: 2026-04-20T22:05:00Z  commit: d6e8288

## Runtime Dependencies

### Root package.json
vscode-languageserver@^9.0.1 — LSP server protocol implementation
vscode-languageserver-textdocument@^1.0.11 — LSP text document model

### compiler/package.json
acorn@^8.16.0 — JavaScript parser (ESTree AST); powers expression-parser.ts for structured ExprNode parsing
astring@^1.9.0 — ESTree-to-JavaScript code generator; used for AST-to-source serialization

## Dev / Build Dependencies
@happy-dom/global-registrator@^20.8.9 — DOM shim for bun test (browser tests)
happy-dom@^20.8.9 — Virtual DOM implementation for unit/integration tests
puppeteer@^24.40.0 — Headless Chrome for browser E2E tests

## Internal Module Graph
cli.js -> commands/{compile,dev,build,init,serve}.js
api.js -> block-splitter.js, ast-builder.js, component-expander.ts, protect-analyzer.ts, route-inference.ts, type-system.ts, meta-checker.ts, dependency-graph.ts, code-generator.js, meta-eval.ts, module-resolver.js, lint-ghost-patterns.js, gauntlet-phase1-checks.js, gauntlet-phase3-eq-checks.js
ast-builder.js -> tokenizer.ts, expression-parser.ts
  owns `const Name = ...` → component-def classification at line 3634 (BUG still present S34: triggers on ANY uppercase-const regardless of RHS)
module-resolver.js -> fs (existsSync gate for E-IMPORT-006 on relative imports outside compile set)
expression-parser.ts -> acorn, astring, types/ast.ts
  **S34 fix (commit 127d35a):** CallExpression case threads `rawSource` into arg recursion; ArrowFunctionExpression/FunctionExpression case slices arrow substring from rawSource via node.start/end so block-body arrows carry their source text on the escape-hatch.
  now 2,029 LOC
type-system.ts -> types/ast.ts
  owns §51 machine `expandAlternation()` (line 1902) + E-MACHINE-014 duplicate-transition check (line 1975)
  owns §51.14 replay validation + reverse auditTarget→machineName map (S28 E-REPLAY-003)
  owns §51.13 projection-machine type/scope (phase 1-7)
  owns §2a E-SCOPE-001 walk of logic-context ExprNode (S24); S28 extends to guarded-expr arm.handlerExpr
  **S34 fix (commit 881b411):** `case "import-decl"` binds each imported local name (kind: "import") into the scope chain so checkLogicExprIdents no longer false-flags imports (GITI-002)
  owns §54.6/§33.6 machine purity enforcement (S32 Phase 4a-4g, commits 72210e8, 5de6a2d, 37f21f7)
  now 8,712 LOC (+786 since S29 snapshot)
component-expander.ts -> block-splitter.js, ast-builder.js, expression-parser.ts
  parseComponentDef (line 359) — re-parses component-def.raw via splitBlocks+buildAST; E-COMPONENT-021 fires when raw does not parse back to markup
codegen/index.ts -> codegen/{analyze,emit-html,emit-css,emit-server,emit-client,emit-library,emit-test,emit-worker,emit-machines,emit-machine-property-tests,binding-registry,var-counter,utils,errors,source-map,type-encoding,collect,context,runtime-chunks,scheduling,ir}.ts
codegen/emit-logic.ts -> codegen/{rewrite,emit-expr,emit-control-flow,emit-lift,reactive-deps,emit-predicates,emit-machines,var-counter,type-encoding}.ts, codegen/compat/parser-workarounds.js
  owns §19 codegen (fail / ? / !{} value-based rewrite, emit-logic.ts:632-756)
  **S34 fixes:** Object.freeze comma separators (aa92070); declaredNames threaded through tilde-decl reassignment paths (70190a7); boundary:"server" lift lowering for server-fn bodies (e5f5b22)
codegen/emit-control-flow.ts -> codegen/{var-counter,rewrite,emit-expr,emit-logic,emit-lift,emit-machines}.ts
  **S34 fix (70190a7):** IfOpts / forStmt / whileStmt now accept and thread `declaredNames` so bare `x = expr` in a nested branch emits reassignment, not shadow or derived-declare (6nz Bugs B + F)
codegen/emit-event-wiring.ts -> codegen/{rewrite,emit-expr,emit-control-flow,type-encoding,context}.ts
  **S34 fixes:** thread `event` into bare-call handlers (eb86d31, Bug A); server-fn detection + async IIFE DOM wiring for `${serverFn()}` in markup (e585dba, GITI-005)
codegen/emit-reactive-wiring.ts
  **S34 fix (d23fd54, GITI-001):** `@var = serverFn()` wraps in async IIFE that awaits before calling _scrml_reactive_set; `<request>` with no url= skips fetch machinery
codegen/emit-client.ts
  **S34 fixes:**
    - mangler regex uses negative lookbehind for `.` so property-access call sites (e.g. classList.toggle) are not rewritten to user-fn names (27ed6fe, Bug D)
    - post-emit prune pass drops imports whose local names have no client body usage (e5f5b22, GITI-003; scoped to non-scrml paths to preserve scrml:/vendor:/.client.js)
    - skip empty-url `<request>` fetch machinery (d23fd54, GITI-001)
    - awaited reactive-set for server-fn (d23fd54)
  now 1,058 LOC (+~180 S34)
codegen/emit-server.ts
  **S34 fix (e5f5b22, GITI-004):** `lift <expr>` and markup with boundary:"server" inside a `server function` body now lowers to a plain IIFE without `document` or `_scrml_lift` references
codegen/emit-html.ts -> codegen/{var-counter,utils,reactive-deps,rewrite,errors,binding-registry,emit-css,context}.ts
codegen/emit-lift.js -> codegen/{rewrite,emit-expr,emit-logic,var-counter,utils}.ts
codegen/emit-library.ts — Skips component-def ONLY if `(stmt.template || stmt.props)` (line 235); recovers name span looking back for `const`/`let`
codegen/emit-machines.ts -> codegen/{rewrite,errors}.ts
  S28: classifyTransition + emitElidedTransition + `_machineCodegenErrors` buffer + `_noElide` env gate
codegen/emit-machine-property-tests.ts — phase 1-7 projection/guard property-test generator
codegen/emit-expr.ts -> types/ast.ts, codegen/rewrite.ts (escape-hatch fallback)
  **S34 touch (127d35a):** presence-guard bypass + arrow-block-body preservation cooperation
codegen/rewrite.ts -> expression-parser.ts (rewriteReactiveRefsAST), codegen/var-counter.ts
  **S34 touch (127d35a):** cooperates with expression-parser rawSource threading for block-body arrow preservation
  now 1,767 LOC

## Tags
#scrmlTS #map #dependencies #acorn #astring #bun #s27 #s28 #s32-purity #s34-adopter-bugs #emit-machines

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
