# primary.map.md
# project: scrmlts
# updated: 2026-05-22T00:00:00Z  commit: 5d2003dd

## Project Fingerprint
Language:   JavaScript + TypeScript (mixed; .js + .ts source, no tsc build step)
Framework:  none — bespoke compiler; deps acorn + astring
Runtime:    Bun >=1.3.13 (also the test runner, bundler, package manager)
Type:       compiler / language toolchain (monorepo: Bun workspace `["compiler"]`)
Size:       ~3149 git-tracked files
Watermark:  HEAD 5d2003dd (2026-05-22) — package.json v0.6.0

## Map Index
| Map                  | Status  | Contents                                       |
|----------------------|---------|------------------------------------------------|
| structure.map.md     | present | directory layout, entry points, native-parser  |
| dependencies.map.md  | present | 2 root + 2 compiler runtime deps, module graph  |
| schema.map.md        | present | FileAST / ASTNode / native catalogs / assembler |
| config.map.md        | present | 2 env vars, compiler option flags               |
| build.map.md         | present | bun scripts, CLI subcommands, git hooks         |
| error.map.md         | present | 11 stage classes, §34.1 81-code native catalog  |
| test.map.md          | present | bun test, 721 test files, parser-conformance    |
| domain.map.md        | present | 25-stage pipeline, M5 swap seam, native parser  |
| api.map.md           | absent  | no HTTP API surface (compiler, not a server)    |
| state.map.md         | absent  | no app state store (compiler)                   |
| events.map.md        | absent  | no event bus                                    |
| auth.map.md          | absent  | auth is a scrml LANGUAGE feature, not app infra |
| migrations.map.md    | absent  | no DB migration tooling (test *.db throwaway)   |
| jobs.map.md          | absent  | no job/queue scheduler                          |
| infra.map.md         | absent  | no Docker / CI / IaC                            |
| style.map.md         | absent  | no design-token system                          |
| i18n.map.md          | absent  | no i18n                                         |

## File Routing
types / AST shapes / native catalogs   → schema.map.md
pipeline stages / native parser / M5   → domain.map.md
native-parser layout / assembler       → structure.map.md
compiler option flags / env vars       → config.map.md
build commands / CLI / git hooks       → build.map.md
test layout / parser-conformance       → test.map.md
external packages / module graph       → dependencies.map.md
diagnostic classes / error codes       → error.map.md

## Key Facts
- `compileScrml(options)` in compiler/src/api.js is the pipeline orchestrator —
  a 25-stage chain BS→TAB→PRECG→GCP1/3→MOD→NR→SYM→CE→VP→PA→RI→MC→TS→META→DG→BP→AG→RS→CG.
- M5-swap C2 IS LANDED (S119): `--parser=scrml-native` now ROUTES the per-file TAB
  stage through the native parser's `nativeParseFile` (compiler/native-parser/
  parse-file.js) instead of the live `buildAST`. api.js:729-736 is the `_buildAST`
  override; api.js:1857 emits I-PARSER-NATIVE-SHADOW. Strictly opt-in — `parser`
  defaults to `null`; every other caller runs the untouched live BS+TAB path.
- `nativeParseFile` (C1, parse-file.js, ~535 LOC) is the FileAST assembler — the
  drop-in analogue of `buildAST`. It composes `parseMarkupTrace` + the three bridges
  (translate-stmt R1, translate-expr A2, collect-hoisted A3) into the live `FileAST`
  shape, with 11 per-BlockKind synthesizers and one shared `idGen`. `authConfig`/
  `middlewareConfig` set to `null` — PRECG (Stage 3.004) derives them downstream.
- S119 M5 gap-ledger work hardened the native parser: synthStateNode + no-space
  `<db>`/`<schema>` state recognition (parse-state-body.js `STATE_FORM_KEYWORDS`),
  HTML void-element support (tag-frame.js `VOID_ELEMENTS`), engine-in-nodes parity
  (collect-hoisted.js `isEngineBlock`), and the dual-pipeline canary's recursive
  diff axis (compiler/tests/parser-conformance/dual-pipeline-canary.js).
- The central data structure is `FileAST` (compiler/src/types/ast.ts:1487). The
  native catalogs (Stmt[], Expr, Block[]) are PascalCase ESTree-shaped; the live
  FileAST uses lowercase scrml kinds — the bridge does the N×M structural translation.
- scrml SOURCE has no exceptions and no `null`/`undefined` (memory S89); the
  COMPILER has 11 per-stage host-side diagnostic classes plus a runtime
  `_ScrmlError` hierarchy embedded into emitted apps. §34.1 catalogs 81 native-parser
  diagnostics — 79 hard `E-` parse errors + 2 info-level `I-NATIVE-BLOCK-*`
  FileAST-assembler codes (added S119 C2; non-fatal, partition into result.warnings).
- No hosted CI, no Docker — quality gates are local git hooks; pre-commit runs
  unit+integration+conformance, never bypass `--no-verify` without authorization.
- SPEC.md is normative per pa.md Rule 4 (58 sections; §34.1 is the native-parser
  diagnostic catalog; §58 is the Build Story, spec-ahead-of-implementation).

## Tags
#scrmlts #map #primary #compiler #native-parser #m5-swap #pipeline

## Links
- [structure.map.md](./structure.map.md)
- [dependencies.map.md](./dependencies.map.md)
- [schema.map.md](./schema.map.md)
- [config.map.md](./config.map.md)
- [build.map.md](./build.map.md)
- [error.map.md](./error.map.md)
- [test.map.md](./test.map.md)
- [domain.map.md](./domain.map.md)
- [non-compliance.report.md](./non-compliance.report.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
