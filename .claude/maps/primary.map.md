# primary.map.md
# project: scrmlTS
# updated: 2026-04-20T22:05:00Z  commit: d6e8288

## Project Fingerprint
Language:   JavaScript / TypeScript (mixed — .js and .ts files, Bun runtime)
Framework:  Custom compiler (scrml language compiler)
Runtime:    Bun (no Node.js — bun test, bun run)
Type:       Compiler + CLI tool + LSP server
Size:       ast-builder.js 6,489 LOC; type-system.ts 8,712 LOC (+786 since S29); expression-parser.ts 2,029 LOC; types/ast.ts 1,420 LOC; SPEC.md 20,439 lines; PIPELINE.md 1,630 lines; codegen/ 37 modules (emit-client.ts 1,058 / emit-logic.ts 1,630 / rewrite.ts 1,767 / emit-control-flow.ts 1,200); 338 test files

## Map Index
| Map                      | Status  | Contents                                                       |
|--------------------------|---------|----------------------------------------------------------------|
| structure.map.md         | present | directory layout, 6 entry points, S34 codegen + test LOC bumps |
| dependencies.map.md      | present | 5 packages, internal graph + S34 codegen fix annotations       |
| schema.map.md            | present | ~55 AST node kinds, 19 ExprNode kinds (not refreshed S34)      |
| config.map.md            | present | 1 env var (SCRML_NO_ELIDE), CLI flags, bunfig.toml             |
| build.map.md             | present | 8 npm scripts, 5 CLI subcommands, dual-mode testing            |
| error.map.md             | present | ~200+ codes; E-STATE-TRANSITION-ILLEGAL / E-STATE-TERMINAL-MUTATION (S32); import-decl scope bind (S34) |
| test.map.md              | present | bun test, 338 files, 7,373 pass / 40 skip / 2 fail (S34 close) |
| domain.map.md            | present | pipeline, §19, §51 machines, §51.5 elision, §54.6 purity, S34 codegen fixes |
| non-compliance.report.md | present | refreshed S34 close — carries master-list 12-session staleness + GITI-006 follow-up |
| api.map.md               | absent  | not applicable (compiler, not web API)                         |
| state.map.md             | absent  | not detected (no frontend state management)                    |
| events.map.md            | absent  | EventEmitter in runtime-template only                          |
| auth.map.md              | absent  | not applicable (compiler tool)                                 |
| style.map.md             | absent  | not detected                                                   |
| i18n.map.md              | absent  | not detected                                                   |
| infra.map.md             | absent  | no Docker/CI/CD found                                          |
| migrations.map.md        | absent  | not detected                                                   |
| jobs.map.md              | absent  | not detected                                                   |

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
S34 adopter-bug codegen fixes         -> domain.map.md + dependencies.map.md (per-file annotations)

## Key Facts
- Entry point is compiler/src/cli.js (bin: `scrml`); programmatic API is compiler/src/api.js running BS->TAB->MOD->CE->BPP->PA->RI->TS->MC->DG->CG.
- **S34 close (commit d6e8288) — 11 adopter bugs fixed across 10 commits** in 7 codegen surfaces: Object.freeze comma (emit-logic aa92070), bare-call `event` threading (emit-event-wiring eb86d31), mangler negative-lookbehind (emit-client 27ed6fe), import-decl scope bind (type-system 881b411, GITI-002), declaredNames threading through if/else/for/while (emit-control-flow + emit-logic 70190a7, 6nz Bugs B+F), arrow-block-body preservation via rawSource threading (expression-parser + rewrite + emit-expr 127d35a, 6nz Bug C), `${serverFn()}` markup DOM wiring (emit-event-wiring e585dba, GITI-005), server/client boundary cleanup — unused-import prune + boundary:"server" lift lowering (emit-client + emit-server + emit-logic e5f5b22, GITI-003+GITI-004), awaited reactive-set for server-fn + skip empty-url `<request>` (emit-client + emit-reactive-wiring d23fd54, GITI-001).
- **S34 test baseline — 7,373 pass / 40 skip / 2 fail / 338 files / 11.56s.** +51 new tests across 8 new test files (all under compiler/tests/unit/), zero regressions versus S33 close (7,322 pass), 2 persistent self-host smoke failures deferred per user.
- S32 Phase 4a-4g closed S33 — §54.6/§33.6 machine purity enforcement landed: E-STATE-TRANSITION-ILLEGAL (72210e8), E-STATE-TERMINAL-MUTATION (5de6a2d), fn-level purity in transition bodies (37f21f7). 9 gauntlet-s32 tests un-skipped by commit 36eadb9.
- S28 shipped §51.5 validation elision end-to-end + SCRML_NO_ELIDE=1 env gate. S27 shipped §51.14 replay primitive + §51.11 audit completeness + guarded wildcard fixes.
- **Open component-def bug (flagged S29, still present at S34):** ast-builder.js:3634 classifies ANY uppercase-named `const/let` as component-def regardless of RHS. tab.test.js:649-654 explicitly encodes bug as policy (expects `const MyComponent = 42;` to produce kind "component-def"). S30-S34 focused on other priorities (public pivot / machine purity / adopter-reported codegen bugs). Fix surface remains narrow at the classifier — require RHS to begin with `<` — but tab.test.js:649-654 must flip sign and self-host modules (ast.scrml, ts.scrml, meta-checker.scrml, cg-parts/section-assembly.js) carry mirror logic.
- The AST type system lives in compiler/src/types/ast.ts (1,420 lines, ~55 node kinds + 19 ExprNode kinds). ComponentDefNode at line 535-541.
- **S34 known follow-up (GITI-006, low-priority):** markup `${@var.path}` emits a module-top bare read that throws on async-initialized reactives (pre-existing emission shape).
- Working-tree carry-over items: master-list.md 12 sessions stale (S23-era header claiming 6,889 pass / 278 files — to be refreshed this session separately); docs/SEO-LAUNCH.md uncommitted 12 sessions; benchmarks/fullstack-react/CLAUDE.md out of place; §48.9 stale.

## Tags
#scrmlTS #map #primary #compiler #ExprNode #s29 #s32-purity #s33 #s34 #adopter-bugs #codegen #component-def-bug

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
