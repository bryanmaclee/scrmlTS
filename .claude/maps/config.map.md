# config.map.md
# project: scrmlTS
# updated: 2026-04-10T22:00:00Z  commit: 482373c

## Environment Variables

No `.env.example` or `.env.template` present. No `process.env.*` references found in
compiler source (compiler is a CLI tool — no server runtime config). The LSP and CLI
have no runtime environment variable requirements.

## Config Files

### bunfig.toml (root)
```
[test]
root = "compiler/tests/"
timeout = 10000
```
Configures bun test runner: test root and 10-second per-test timeout.

### compiler/package.json
Workspace member manifest. Dependencies: `acorn`, `astring`. DevDependencies: `@happy-dom/global-registrator`.

### editors/vscode/tsconfig.json
TypeScript compiler config for VS Code extension build. Output: `editors/vscode/out/`.

### editors/vscode/language-configuration.json
VS Code language configuration: bracket pairs, comment syntax, auto-closing pairs for `.scrml` files.

## Feature Flags

None detected. No feature-flag system in source.

## CLI Flags (runtime options, not build config)

| Flag | Command | Effect |
|---|---|---|
| `--self-host` | compile | Load pipeline stages from `compiler/self-host/*.scrml` instead of JS |
| `--timing` | compile | Emit per-stage timing to stderr |
| `-o <dir>` | compile | Output directory |
| `--watch` | dev | Re-compile on file change |
| `--stdio` | lsp | LSP JSON-RPC over stdin/stdout |

## Tags
#scrmlTS #map #config #cli #bun

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
