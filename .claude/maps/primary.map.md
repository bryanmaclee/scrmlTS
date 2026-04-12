# primary.map.md
# project: scrmlTS
# updated: 2026-04-12T20:00:00Z  commit: 623aeac

## Project Fingerprint
Language:   JavaScript / TypeScript (mixed — .js and .ts files, Bun runtime)
Framework:  Custom compiler (scrml language compiler)
Runtime:    Bun (no Node.js — bun test, bun run)
Type:       Compiler + CLI tool + LSP server
Size:       ~270 source files (compiler/src ~27 files + codegen 36 files + tests ~240 files)

## Map Index
| Map                      | Status  | Contents                              |
|--------------------------|---------|---------------------------------------|
| structure.map.md         | present | directory layout, 6 entry points      |
| dependencies.map.md      | present | 5 packages, internal module graph     |
| schema.map.md            | present | 42+ AST node types, 19 ExprNode kinds, 8 codegen types |
| config.map.md            | present | 0 env vars, CLI flags, bunfig.toml    |
| build.map.md             | present | 7 npm scripts, 5 CLI subcommands      |
| error.map.md             | present | 4 error types (CGError, PAError, TSError, TABErrorInfo) |
| test.map.md              | present | bun test, ~240 test files, 5,709 pass |
| domain.map.md            | present | compiler pipeline, ExprNode migration, reactivity, lin types |
| api.map.md               | absent  | not applicable (compiler, not web API) |
| state.map.md             | absent  | not detected (no frontend state management) |
| events.map.md            | absent  | EventEmitter in runtime-template only, not architectural |
| auth.map.md              | absent  | not applicable (compiler tool) |
| style.map.md             | absent  | not detected |
| i18n.map.md              | absent  | not detected |
| infra.map.md             | absent  | no Docker/CI/CD found |
| migrations.map.md        | absent  | not detected |
| jobs.map.md              | absent  | not detected |
| non-compliance.report.md | present | 4 non-compliant, 3 uncertain          |

## File Routing
types / interfaces / models           -> schema.map.md
environment variables / config keys   -> config.map.md
test patterns / fixtures              -> test.map.md
build commands / CI stages            -> build.map.md
directory layout / entry points       -> structure.map.md
external packages                     -> dependencies.map.md
business rules / domain models        -> domain.map.md
error types / handling patterns       -> error.map.md

## Key Facts
- Entry point is compiler/src/cli.js (bin: `scrml`); programmatic API is compiler/src/api.js which runs the 10-stage pipeline: BS->TAB->CE->BPP->PA->RI->TS->MC->DG->CG
- The AST type system lives in a single file: compiler/src/types/ast.ts (1,356 lines, 42+ node kinds + 19 ExprNode kinds)
- Phase 3 of the ExprNode migration is complete: emit-expr.ts (379 LOC) handles all 19 ExprNode kinds with escape-hatch fallback to rewrite.ts; 51 dual-path call sites across 6 codegen emitters
- Expression parsing uses acorn with custom @ sigil and :: enum plugins (expression-parser.ts, 1,668 LOC); ESTree ASTs are converted to ExprNode via esTreeToExprNode
- ast-builder.js (5,645 LOC) is the largest single file — the main TAB stage that parses block trees into typed FileAST; populates ExprNode via safeParseExprToNode at 20+ sites
- Codegen is 36 modules totaling ~14,777 LOC in compiler/src/codegen/; the three-phase model is: analyze -> plan (HTML gen populates BindingRegistry) -> emit (CSS + server JS + client JS)
- The authoritative spec is compiler/SPEC.md (18,863 lines, 53 sections); pipeline contracts in compiler/PIPELINE.md (1,569 lines)
- Current escape-hatch rate: 0% across the example corpus (14 files); 5,709 tests passing, ~149 failing

## Tags
#scrmlTS #map #primary #compiler #ExprNode #phase-3

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
