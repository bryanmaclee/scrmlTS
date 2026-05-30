# config.map.md
# project: scrmlts
# updated: 2026-05-30T00:00:00Z  commit: 948d3f2f

No .env.example or .env.template found in repo root.

## Environment Variables (referenced in compiler/src source)

| Key | Where used | Notes |
|-----|-----------|-------|
| NODE_ENV | compiler/src/ | runtime environment detection |
| PORT | compiler/src/ | HTTP server port |
| SCRML_PORT | compiler/src/ | scrml dev-server port override |
| SCRML_MCP_WATCH | compiler/src/ | enables MCP file-watch mode |

## Feature Flags
No runtime feature-flag system detected. The native-parser is activated at CLI level
via `--parser=scrml-native` flag (canary mode; not an env var).

## Config Files

### bunfig.toml  [repo root]
Bun workspace configuration; test timeout and preload settings for happy-dom.

### compiler/src/unit-cc-exemption-list.json
List of unit-test files exempted from code-coverage enforcement.

### compiler/tests/parser-conformance-within-node-allowlist.json
Allowlist of within-node parser parity test cases that are permitted to diverge
between the live pipeline and the native parser (maintained per GITI-024 shape change).

## Tags
#scrmlts #map #config #environment

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [build.map.md](./build.map.md)
