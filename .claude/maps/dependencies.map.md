# dependencies.map.md
# project: scrmlts
# updated: 2026-05-30T00:00:00Z  commit: 948d3f2f

## Runtime Dependencies (root package.json — v0.7.0)
@modelcontextprotocol/sdk@1.29.0 — MCP server SDK for scrml MCP integration
vscode-languageserver@^9.0.1 — LSP server protocol implementation
vscode-languageserver-textdocument@^1.0.11 — LSP text document utilities

## Dev / Build Dependencies (root package.json)
@happy-dom/global-registrator@^20.8.9 — DOM environment for browser tests
happy-dom@^20.8.9 — fast in-process DOM for Bun unit tests
marked@^14.1.3 — Markdown parser used by docs/build.ts
puppeteer@^24.40.0 — headless browser for e2e / Playwright support
@playwright/test@^1.49.0 — Playwright test framework for e2e tests

## Runtime Dependencies (compiler/package.json — compiler workspace)
acorn@^8.16.0 — JS parser used for escape-hatch expression parsing in ast-builder
astring@^1.9.0 — JS AST-to-source printer; used with acorn for re-serializing escape-hatch nodes

## Dev Dependencies (compiler/package.json)
@happy-dom/global-registrator@^20.8.9 — DOM environment for compiler browser tests

## Runtime Engine
bun>=1.3.13 — required runtime; no Node support (Bun-specific APIs used throughout)

## Internal Module Graph (major imports, compiler/src/)

| Module | Imports from |
|--------|-------------|
| cli.js | commands/compile.js, commands/dev.js, commands/build.js, commands/migrate.js, commands/promote.js |
| api.js | block-splitter.js, ast-builder.js, code-generator.js, module-resolver.js, component-expander.ts, type-system.ts |
| code-generator.js | codegen/index.ts (all emit-*), dependency-graph.ts, auth-graph.ts, route-inference.ts |
| codegen/emit-client.ts | codegen/emit-*.ts, codegen/runtime-chunks.ts, codegen/context.ts |
| codegen/emit-server.ts | codegen/emit-*.ts, codegen/emit-channel.ts |
| codegen/emit-error-boundary.ts | block-splitter.js, ast-builder.js (re-parse pipeline) |
| auth-graph.ts | types/ast.ts, symbol-table.ts |
| type-system.ts | types/ast.ts, dependency-graph.ts, protect-analyzer.ts |
| reachability/*.ts | types/reachability.ts, types/ast.ts |
| native-parser/*.js | (self-contained; no compiler/src imports) |

## Tags
#scrmlts #map #dependencies #bun #acorn #lsp #mcp

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
