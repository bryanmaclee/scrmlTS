# dependencies.map.md
# project: scrmlTS
# updated: 2026-04-10T22:00:00Z  commit: 482373c

## Runtime Dependencies (root package.json)

| Package | Version | Purpose |
|---|---|---|
| `vscode-languageserver` | ^9.0.1 | LSP protocol server framework (used by lsp/server.js) |
| `vscode-languageserver-textdocument` | ^1.0.11 | TextDocument utility for LSP text sync |

## Runtime Dependencies (compiler/package.json)

| Package | Version | Purpose |
|---|---|---|
| `acorn` | ^8.16.0 | JS parser — used by meta-eval.ts to parse `^{}` meta blocks |
| `astring` | ^1.9.0 | JS AST-to-string printer — companion to acorn in meta-eval |

## Dev / Build Dependencies

| Package | Version | Scope | Purpose |
|---|---|---|---|
| `@happy-dom/global-registrator` | ^20.8.9 | root + compiler | DOM environment for browser tests |
| `happy-dom` | ^20.8.9 | root | Headless DOM for runtime behavior tests |
| `puppeteer` | ^24.40.0 | root | Headless Chrome for benchmarks + browser E2E |

## Workspace Layout

```
scrmlTS (root, bun workspace)
└── compiler/     workspace member — has its own package.json with acorn + astring
```

## Internal Module Graph (major compiler stages)

```
cli.js
  → commands/compile.js → index.js
  → commands/dev.js     → index.js
  → commands/build.js   → index.js
  → commands/serve.js   → index.js
  → commands/init.js    (standalone)

index.js
  → block-splitter.js
  → ast-builder.js
  → body-pre-parser.ts  (runBPP)
  → protect-analyzer.ts (runPA)
  → route-inference.ts  (runRI)
  → type-system.ts      (runTS)
  → dependency-graph.ts (runDG)
  → meta-eval.ts        (runME)
  → meta-checker.ts     (runMC)
  → component-expander.ts (runCE)
  → codegen/index.ts    (runCG)

codegen/index.ts
  → codegen/analyze.ts
  → codegen/context.ts
  → codegen/ir.ts
  → codegen/binding-registry.ts
  → codegen/emit-html.ts → codegen/emit-bindings.ts, emit-css.ts
  → codegen/emit-server.ts
  → codegen/emit-client.ts → emit-functions.ts, emit-bindings.ts,
                              emit-reactive-wiring.ts, emit-overloads.ts,
                              emit-event-wiring.ts, emit-machines.ts,
                              emit-channel.ts, emit-worker.ts,
                              emit-sync.ts, emit-test.ts
  → codegen/source-map.ts
  → codegen/runtime-chunks.ts

lsp/server.js
  → block-splitter.js
  → ast-builder.js
  → body-pre-parser.ts
  → protect-analyzer.ts
  → route-inference.ts
  → type-system.ts
  → dependency-graph.ts
```

## Tags
#scrmlTS #map #dependencies #compiler #lsp #bun

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
