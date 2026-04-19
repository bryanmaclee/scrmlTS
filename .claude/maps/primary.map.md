# primary.map.md
# project: scrmlTS
# updated: 2026-04-19T22:00:00Z  commit: 74303d3

## Project Fingerprint
Language:   JavaScript / TypeScript (mixed — .js and .ts files, Bun runtime)
Framework:  Custom compiler (scrml language compiler)
Runtime:    Bun (no Node.js — bun test, bun run)
Type:       Compiler + CLI tool + LSP server
Size:       ast-builder.js 6,489 LOC; type-system.ts 7,926 LOC; types/ast.ts 1,420 LOC; SPEC.md 20,071 lines; codegen/ 37 modules; 315 test files

## Map Index
| Map                      | Status  | Contents                                       |
|--------------------------|---------|------------------------------------------------|
| structure.map.md         | present | directory layout, 6 entry points, gauntlet-s27/s28 dirs |
| dependencies.map.md      | present | 5 packages + §51 machine-codegen graph, component-def call sites |
| schema.map.md            | present | ~55 AST node kinds, 19 ExprNode kinds, ComponentDefNode bug note |
| config.map.md            | present | 1 env var (SCRML_NO_ELIDE), CLI flags, bunfig.toml |
| build.map.md             | present | 8 npm scripts, 5 CLI subcommands, dual-mode testing |
| error.map.md             | present | ~200+ codes; E-MACHINE-001 compile-time (S28), E-REPLAY-001/002/003 (S27-S28) |
| test.map.md              | present | bun test, 315 files, 7,183 pass / 10 skip / 2 fail (S29 open) |
| domain.map.md            | present | pipeline, §19, §51 machines, §51.5 elision, §51.13 projection, §51.14 replay, component-def bug surface |
| api.map.md               | absent  | not applicable (compiler, not web API)         |
| state.map.md             | absent  | not detected (no frontend state management)    |
| events.map.md            | absent  | EventEmitter in runtime-template only          |
| auth.map.md              | absent  | not applicable (compiler tool)                 |
| style.map.md             | absent  | not detected                                   |
| i18n.map.md              | absent  | not detected                                   |
| infra.map.md             | absent  | no Docker/CI/CD found                          |
| migrations.map.md        | absent  | not detected                                   |
| jobs.map.md              | absent  | not detected                                   |
| non-compliance.report.md | present | refreshed S29 — see report                     |

## File Routing
types / interfaces / models           -> schema.map.md
environment variables / config keys   -> config.map.md
test patterns / fixtures              -> test.map.md
build commands / CI stages            -> build.map.md
directory layout / entry points       -> structure.map.md
external packages                     -> dependencies.map.md
business rules / domain models        -> domain.map.md
error types / codes / handling        -> error.map.md
component-def classification          -> domain.map.md (bug note) + schema.map.md

## Key Facts
- Entry point is compiler/src/cli.js (bin: `scrml`); programmatic API is compiler/src/api.js running BS->TAB->MOD->CE->BPP->PA->RI->TS->MC->DG->CG.
- S27 closed every runtime-correctness gap the §51 machine cluster was silently carrying: unit-variant transition crash fix, guarded wildcard rule firing, effect-body @-ref rewriting, §51.11 audit timer+freeze+rule+label extension, §51.14 replay primitive with E-REPLAY-001/002 + compile-time validation.
- S28 shipped §51.5 validation elision end-to-end (4 slices) + 5 adjacent fixes: classifyTransition/emitElidedTransition in emit-machines.ts (719 LOC), payload-enum comma-split fix, multi-statement effect body preservation, phase-7 guarded projection property tests, E-REPLAY-003 cross-machine guard, centralized extract-user-fns helper, error-arm handler-body scope check. Spec §51.5.2 amended to distinguish validation-work (elidable) from side-effect work (always runs). SCRML_NO_ELIDE=1 env var gates dual-mode CI.
- S29 commit 74303d3: compiler/self-host/bpp.scrml self-host port of parser-workarounds.js — structural ${} wrap + broken regex fix (232 LOC vs 265 LOC JS).
- **S29 mid-diagnosis flagged parser bug** at ast-builder.js:3634 — the `name[0] === name[0].toUpperCase()` heuristic classifies ANY uppercase-named `const/let` as component-def regardless of whether the RHS is markup. This silently vacuums subsequent declarations into phantom `defChildren` at ast-builder.js:5697-5711. tab.test.js:649-654 explicitly encodes the bug as policy (expects `const MyComponent = 42;` to produce kind "component-def"). Fix surface appears NARROW at the classifier — require RHS to begin with `<` — but the test at 649-654 must flip sign, and self-host modules (ast.scrml, ts.scrml, meta-checker.scrml, cg-parts/section-assembly.js) carry mirror logic that must update in lockstep. Downstream call sites (component-expander.ts:472, emit-library.ts:235) already have defensive guards. SPEC.md:6370 and PIPELINE.md both document the RHS-must-be-markup contract.
- The AST type system lives in compiler/src/types/ast.ts (1,420 lines, ~55 node kinds + 19 ExprNode kinds). ComponentDefNode at line 535-541.
- Test baseline is 7,183 pass / 10 skip / 2 fail across 315 files (S29 open at 74303d3). Two persistent self-host failures deferred per user.
- One uncommitted file entering S29: `docs/SEO-LAUNCH.md` (5 sessions running without touch).

## Tags
#scrmlTS #map #primary #compiler #ExprNode #s27 #s28 #s29 #validation-elision #machine-cluster #component-def-bug

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
