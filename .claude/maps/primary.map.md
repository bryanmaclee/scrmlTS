# primary.map.md
# project: scrmlTS
# updated: 2026-04-17T17:00:00Z  commit: 41e4401

## Project Fingerprint
Language:   JavaScript / TypeScript (mixed — .js and .ts files, Bun runtime)
Framework:  Custom compiler (scrml language compiler)
Runtime:    Bun (no Node.js — bun test, bun run)
Type:       Compiler + CLI tool + LSP server
Size:       ~270 source files (compiler/src ~27 top-level + codegen 36 files; ast.ts 1,420 LOC; ast-builder.js 6,360 LOC; SPEC.md 19,045 lines)

## Map Index
| Map                      | Status  | Contents                                       |
|--------------------------|---------|------------------------------------------------|
| structure.map.md         | present | directory layout, 6 entry points, S20 dirs     |
| dependencies.map.md      | present | 5 packages + §19/§51/E-IMPORT-006 graph edges  |
| schema.map.md            | present | ~55 AST node kinds, 19 ExprNode kinds, §19 nodes |
| config.map.md            | present | 0 env vars, CLI flags, bunfig.toml, pretest hook |
| build.map.md             | present | 8 npm scripts, 5 CLI subcommands, migration scripts |
| error.map.md             | present | ~200 codes; E-MACHINE-014, E-IMPORT-006, E-ERROR-001 enforced |
| test.map.md              | present | bun test, 273 files, 6,824 pass / 10 skip / 2 fail |
| domain.map.md            | present | pipeline, §19 rewrite, §51 alternation, E-IMPORT-006 |
| api.map.md               | absent  | not applicable (compiler, not web API)         |
| state.map.md             | absent  | not detected (no frontend state management)    |
| events.map.md            | absent  | EventEmitter in runtime-template only          |
| auth.map.md              | absent  | not applicable (compiler tool)                 |
| style.map.md             | absent  | not detected                                   |
| i18n.map.md              | absent  | not detected                                   |
| infra.map.md             | absent  | no Docker/CI/CD found                          |
| migrations.map.md        | absent  | not detected                                   |
| jobs.map.md              | absent  | not detected                                   |
| non-compliance.report.md | present | refreshed S21 — see report for items           |

## File Routing
types / interfaces / models           -> schema.map.md
environment variables / config keys   -> config.map.md
test patterns / fixtures              -> test.map.md
build commands / CI stages            -> build.map.md
directory layout / entry points       -> structure.map.md
external packages                     -> dependencies.map.md
business rules / domain models        -> domain.map.md
error types / codes / handling        -> error.map.md

## Key Facts
- Entry point is compiler/src/cli.js (bin: `scrml`); programmatic API is compiler/src/api.js running BS->TAB->CE->BPP->PA->RI->TS->MC->DG->CG
- §19 error handling was rewritten in S21 (commit 37049be): `fail` emits a tagged return object, `?` propagation emits a value check + return, `!{}` inline catch uses `result.__scrml_error` (NOT try/catch). Codegen lives in emit-logic.ts:632-756. E-ERROR-001 is now reachable and enforced.
- §51 machines gained `|` alternation in S21 (commit eef7b5e): `variant-ref-list ::= variant-ref ('|' variant-ref)*`. `expandAlternation` at type-system.ts:1902 produces the cross-product; E-MACHINE-014 fires on duplicate `(from, to)` pairs. Example: `examples/14-mario-state-machine.scrml`.
- E-IMPORT-006 was added in S21 (commit 86b5553): module-resolver.js checks `existsSync` for relative imports outside the compile set (module-resolver.js:146).
- The AST type system lives in compiler/src/types/ast.ts (1,420 lines, ~55 node kinds + 19 ExprNode kinds). The largest single file is ast-builder.js (6,360 LOC).
- Test baseline is 6,824 pass / 10 skip / 2 fail across 273 files (S21). Two persistent self-host failures are deferred per user.
- docs/tutorial.md now holds the former V2 content (V1 retired 2026-04-17); snippets at docs/tutorial-snippets/ (renamed from tutorialV2-snippets).

## Tags
#scrmlTS #map #primary #compiler #ExprNode #s21 #error-handling #machine-alternation

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
