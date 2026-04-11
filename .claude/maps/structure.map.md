# structure.map.md
# project: scrmlTS
# updated: 2026-04-10T22:00:00Z  commit: 482373c

## Entry Points

`compiler/src/cli.js` — top-level binary (`scrml`); routes compile / dev / build / serve / init subcommands
`compiler/src/index.js` — programmatic compiler API; exported for direct use (LSP, tests)
`lsp/server.js` — LSP server entry; launched with `--stdio` for editor integration

## Directory Ownership

```
scrmlTS/
├── compiler/
│   ├── src/               Compiler source: all pipeline stages + codegen (~24,739 LOC)
│   │   ├── codegen/       34-module code generator (~14,135 LOC); see codegen/README.md
│   │   │   └── compat/    Parser bug workaround shims (1 file)
│   │   ├── commands/      CLI subcommand handlers (compile, dev, build, serve, init)
│   │   └── types/         TypeScript type definitions (ast.ts — 933 lines, discriminated unions)
│   ├── tests/             5,542 test cases across 6 categories
│   │   ├── unit/          147 files — per-module unit tests
│   │   ├── integration/   2 files — self-compilation + self-host smoke
│   │   ├── self-host/     4 files — self-host stage tests (bs, tab, bpp, ast)
│   │   ├── conformance/   2 dirs — block-grammar + tab grammar conformance suites
│   │   ├── browser/       11 files — happy-dom runtime tests (Puppeteer)
│   │   └── commands/      2 files — CLI command tests (init, build-adapters)
│   ├── self-host/         11 .scrml + dist/ — reference copy of scrml-to-scrml bootstrap modules
│   └── scripts/           build-self-host.js
├── stdlib/                13 modules: auth, compiler, crypto, data, format, fs, http, path, process, router, store, test, time
├── examples/              14 single-file .scrml apps (01–14); 12 compile clean, 2 have known bugs
├── samples/
│   └── compilation-tests/ 275 .scrml test files (do not enumerate individually)
├── benchmarks/
│   ├── todomvc/           scrml TodoMVC benchmark app
│   ├── todomvc-react/     [framework comparison — not scrml code]
│   ├── todomvc-svelte/    [framework comparison — not scrml code]
│   ├── todomvc-vue/       [framework comparison — not scrml code]
│   ├── fullstack-scrml/   scrml full-stack benchmark app
│   └── fullstack-react/   [framework comparison — not scrml code]
├── editors/
│   ├── vscode/            VS Code extension: TextMate grammar, LSP client, language config
│   └── neovim/            NeoVim: syntax highlight (.vim/.lua), tree-sitter queries
├── lsp/                   LSP server (966 lines, runs all pipeline stages in-process)
├── scripts/               24 utility scripts (verify, benchmark, spec tools, migration helpers)
├── dist/                  scrml-runtime.js (452 lines, generated; included in compiled output)
└── handOffs/              Historical hand-off docs (out-of-scope for maps)
```

## Ignored / Generated Paths

`node_modules/`, `dist/`, `.git/`, `handOffs/`, `editors/vscode/out/`
`benchmarks/todomvc-react/`, `benchmarks/todomvc-svelte/`, `benchmarks/todomvc-vue/`, `benchmarks/fullstack-react/`

## Tags
#scrmlTS #map #structure #compiler #pipeline

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
