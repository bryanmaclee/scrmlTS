# dependencies.map.md
# project: scrmlTS
# updated: 2026-04-12T20:00:00Z  commit: 623aeac

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
api.js -> block-splitter.js, ast-builder.js, component-expander.ts, protect-analyzer.ts, route-inference.ts, type-system.ts, meta-checker.ts, dependency-graph.ts, code-generator.js, meta-eval.ts, module-resolver.js, lint-ghost-patterns.js
ast-builder.js -> tokenizer.ts, expression-parser.ts
expression-parser.ts -> acorn, astring, types/ast.ts
codegen/index.ts -> codegen/{analyze,emit-html,emit-css,emit-server,emit-client,emit-library,emit-test,emit-worker,binding-registry,var-counter,utils,errors,source-map,type-encoding,collect,context,runtime-chunks}.ts
codegen/emit-logic.ts -> codegen/{rewrite,emit-expr,emit-control-flow,emit-lift,reactive-deps,emit-predicates,var-counter,type-encoding}.ts, codegen/compat/parser-workarounds.js
codegen/emit-expr.ts -> types/ast.ts, codegen/rewrite.ts (escape-hatch fallback)
codegen/emit-control-flow.ts -> codegen/{var-counter,rewrite,emit-expr,emit-logic,emit-lift,emit-machines}.ts
codegen/emit-event-wiring.ts -> codegen/{rewrite,emit-expr,emit-control-flow,type-encoding,context}.ts
codegen/emit-html.ts -> codegen/{var-counter,utils,reactive-deps,rewrite,errors,binding-registry,emit-css,context}.ts
codegen/emit-lift.js -> codegen/{rewrite,emit-expr,emit-logic,var-counter,utils}.ts
codegen/rewrite.ts -> expression-parser.ts (rewriteReactiveRefsAST), codegen/var-counter.ts

## Tags
#scrmlTS #map #dependencies #acorn #astring #bun

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
