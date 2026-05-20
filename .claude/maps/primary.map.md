# primary.map.md
# project: scrmlts
# updated: 2026-05-20T17:07:32-06:00  commit: 87453fb

## Project Fingerprint
Language:   TypeScript + JavaScript (ESM; `.ts` runs directly — no transpile)
Framework:  none (this IS a language toolchain — it has no web framework)
Runtime:    Bun >= 1.3.13 (the only supported runtime)
Type:       compiler / language toolchain (Bun workspace: root + `compiler` member)
Size:       ~3,040 tracked files; 126 compiler/src/ files; 25 native-parser modules; 730 test files

scrmlts is the reference compiler for **scrml** — a single-file, full-stack
reactive web language. One `.scrml` source compiles to plain HTML + CSS + JS;
the compiler splits server from client, wires reactivity, and infers routes.

## Map Index
| Map                  | Status  | Contents                                      |
|----------------------|---------|-----------------------------------------------|
| structure.map.md     | present | directory layout, 8 entry points, parallel-track note |
| dependencies.map.md  | present | 7 external packages, live + native-parser module graphs |
| schema.map.md        | present | live AST union + codegen IR + symbol table + auth/reachability + native-parser Expr AST |
| config.map.md        | present | 2 env vars (SCRML_PORT, PORT), no .env file    |
| build.map.md         | present | 13 npm scripts, 8 CLI subcommands, git hooks   |
| error.map.md         | present | 9 per-stage diagnostic classes, stream partition |
| test.map.md          | present | bun test, 730 files, 8 categories + native-parser conformance + e2e |
| domain.map.md        | present | 18-stage pipeline + native-parser composed-engines front-end |
| api.map.md           | absent  | no HTTP API — compiler, not a web service      |
| state.map.md         | absent  | no client state store                          |
| events.map.md        | absent  | no event bus                                   |
| auth.map.md          | absent  | no web auth (auth-graph.ts is a compiler pass — see domain.map.md) |
| style.map.md         | absent  | no design-token system                         |
| i18n.map.md          | absent  | no localization                                |
| infra.map.md         | absent  | no Dockerfile / CI workflows / cloud config    |
| migrations.map.md    | absent  | no DB-migration tooling (scrml `<schema>` migration is a language feature) |
| jobs.map.md          | absent  | no job/queue system                            |

## File Routing
live AST node shapes / codegen IR / symbol table → schema.map.md
native-parser Expr AST / TokenKind / engines     → schema.map.md
pipeline stages / scrml language concepts          → domain.map.md
native-parser composed-engines front-end           → domain.map.md
diagnostic classes / W-/I- partition / lints        → error.map.md
CLI subcommands / npm scripts / git hooks           → build.map.md
test framework / categories / conformance / fixtures → test.map.md
directory layout / entry points / parallel track     → structure.map.md
external packages / internal module graphs           → dependencies.map.md
environment variables / config files                 → config.map.md
SPEC error codes (E-/W-/I-)                          → compiler/SPEC.md §34 (normative — not mapped)
per-stage contracts / lock map (L1-L22)               → compiler/PIPELINE.md (normative — not mapped)

## Key Facts
- Entry: compiler/src/cli.js routes 8 subcommands; compiler/src/api.js runs the
  full 18-stage compile pipeline (BS→TAB→NR→MOD→CE→UVB→PA→RI→MC→TS→META→VSS→DG→BP→RS→CG)
  and is the single programmatic API consumed by CLI, tests, watch loops, and the LSP.
  The live pipeline (compiler/src/) is UNCHANGED since the prior map (commit 78faa65).
- NEW since 78faa65: compiler/native-parser/ — a scrml-native compiler FRONT-END
  (charter B, S111) — 25 paired `.scrml`/`.js` modules. It is a PARALLEL TRACK:
  compiler/src/ does not import it; only compiler/tests/parser-conformance* test
  files do. It swaps into the pipeline behind `--parser=scrml-native` at milestone
  M5; M6 deletes the live front-end (block-splitter + Acorn + body-pre-parser).
  M-ladder status at this commit: M1 lexer COMPLETE; M2 expression parser + MK1
  markup BlockContext IN FLIGHT (M2.1-M2.3 + MK1.1-MK1.3 landed at S112).
- The native-parser modules are `.scrml` CANONICAL + `.js` EXECUTABLE shadow
  pairs. Tests import the `.js`. The shadow exists because compiler v0.3 strips
  `export function` bodies in `${...}` SPA blocks (native-parser/README.md
  ANOMALY-2); the M4+ swap-in retires the shadow. The `.scrml`↔`.js` files are
  hand-maintained — no rebuild script regenerates them.
- This is a compiler — there is NO HTTP API, NO database, NO event bus, NO client
  state store, NO web auth, NO Docker, NO CI workflows. Conditional-map probes
  return only false positives (compiler code that *processes* routes/auth/events).
- `compiler/src/auth-graph.ts` and `compiler/src/reachability/` are compiler
  analysis passes (domain concepts), NOT a runtime auth or routing system.
- Diagnostics are structured objects, not thrown. Each stage has its own
  `*Error` class (TSError, CGError, ...). api.js:1779 partitions the stream:
  W-*/I- prefix or severity warning/info → non-fatal `result.warnings`;
  everything else → fatal `result.errors` (CLI exit 1). Tests asserting on
  W-*/I- codes MUST check `result.warnings`.
- The normative language definition is compiler/SPEC.md (28,489+ lines, §1-§57);
  the normative pipeline contract is compiler/PIPELINE.md. Per project rule,
  SPEC.md is authoritative over docs, primers, and memory; do not decide from
  summaries. Read the relevant SPEC section in full before spec-relevant changes.
- scrml has no `null` and no `undefined` — `not` is the single absence value.
  `""`/`0`/`false`/`[]`/`{}` are DEFINED values, not absence (SPEC §42).
- Codegen fans out from compiler/src/code-generator.js → compiler/src/codegen/
  (~50 `emit-*.ts` modules); each emits one scrml construct family.

## Tags
#scrmlts #map #primary #compiler #scrml-language #bun #native-parser

## Links
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [structure.map.md](./structure.map.md)
- [dependencies.map.md](./dependencies.map.md)
- [schema.map.md](./schema.map.md)
- [config.map.md](./config.map.md)
- [build.map.md](./build.map.md)
- [error.map.md](./error.map.md)
- [test.map.md](./test.map.md)
- [domain.map.md](./domain.map.md)
- [non-compliance.report.md](./non-compliance.report.md)
