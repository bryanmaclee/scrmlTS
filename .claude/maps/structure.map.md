# structure.map.md
# project: scrmlts
# updated: 2026-05-29T07:47:36-06:00  commit: feab1207

## Entry Points

`compiler/src/cli.js` — primary CLI; routes compile / dev / build / serve / generate / migrate / promote / init subcommands; falls through to `compileScrml` for `.scrml` file args directly.
`compiler/src/index.js` — legacy thin wrapper; parses args, calls `compileScrml()` from `api.js`; preserved for `bun run compiler/src/index.js` backward compat.
`compiler/src/api.js` — programmatic API module; exports `compileScrml(options)` — the full pipeline orchestrator (BS→TAB→CE→NR→SYM→PA→RI→MC→TS→META→DG→BP→AG→RS→CG); also exports `scanDirectory`, `computeOutputBaseDir`, `bundleStdlibForRun`, `rewriteRelativeImportPaths`, `rewriteStdlibImports`.
`compiler/bin/scrml.js` — npm bin entry; delegates to `cli.js`.

## Directory Ownership

`compiler/src/` — TypeScript + JS source for every pipeline stage, linters, validators, and the code generator
`compiler/src/codegen/` — emit-* modules (one per language feature), IR types, `CompileContext`, `scheduling.ts`, `cps-batch-planner.ts` (Bug 9 L2), `body-dg-builder.ts` (Bug 56), `source-map.ts`, `route-splitter.ts`, `type-encoding.ts`, `mcp-descriptors.ts`, `reactive-deps.ts` (collectDerivedVarNames + collectSynthCellKeys)
`compiler/src/commands/` — CLI subcommand handlers: compile.js, dev.js, build.js, serve.js, generate.js, migrate.js, promote.js, init.js
`compiler/src/validators/` — post-CE validation passes: attribute-allowlist, attribute-interpolation, post-ce-invariant, lint-try-catch, lint-async-user-source, ast-walk
`compiler/src/types/` — canonical TypeScript type definitions: `ast.ts` (complete AST node discriminated union), `reachability.ts`, `auth-graph.ts`
`compiler/native-parser/` — scrml-native composed-engines front-end parser (M5 arc); `.scrml` + `.js` side-by-side per module; shipped behind `--parser=scrml-native`; M5 M6.6 arc in progress
`compiler/self-host/` — scrml-authored `.scrml` mirrors of compiler stages (bs, tab, ast, bpp, pa, ri, ts, dg, cg, module-resolver, meta-checker, cg-parts); post-v1.0 self-host target
`compiler/runtime/` — hand-written stdlib shims (`runtime/stdlib/*.js`) copied into `<outputDir>/_scrml/` at compile time; `idempotency.js` for server idempotency
`compiler/tests/` — 828 test files across unit (588+), conformance (105), integration (88), browser (12), self-host (4), lsp (10), commands (6); root-level parser-conformance tests
`compiler/tests/fixtures/` — shared `.scrml` test fixture source files
`compiler/tests/helpers/` — test utility modules (compileScrml wrappers, happy-dom setup, cross-stream diagnostic helpers)
`stdlib/` — scrml standard library source by namespace: auth, compiler, cron, crypto, data, format, fs, host, http, mcp, oauth, path, process, redis, regex, router, store, test, time
`dashboard/` — `app.scrml` + `app.db`; the project's own scrml dashboard (demonstrates Bug 56 CPS fix; uses const-decl CPS pattern + pure `statusesFrom` helper)
`samples/` — 804 `.scrml` compilation-test inputs under `compilation-tests/`; gauntlet suites under `gauntlet-r11/r13/r14/r15/r18/r19/` and `gauntlet-s19-phase4/`
`examples/` — named example apps: `22-multifile/`, `23-trucking-dispatch/`
`lsp/` — Language Server Protocol implementation: `server.js`, `handlers.js`, `workspace.js`, `l4.js`
`editors/` — editor integrations: `vscode/` (grammar + extension), `neovim/` (highlights.scm)
`docs/` — changelog.md, known-gaps.md, PA-SCRML-PRIMER.md, tutorial.md; `articles/`, `heads-up/`, `curation/`, `audits/`, `changes/`, `adopter/`, `website/` subdirs
`e2e/` — Playwright end-to-end tests (`tests/`, `fixtures/`); `playwright.config.ts` + `playwright.docs.config.ts`
`scripts/` — build helpers, spec-index regen (`regen-spec-index.ts`), git hooks, benchmark runners
`benchmarks/` — benchmark suites and framework comparisons (todomvc-{react,vue,svelte,vanilla}, fullstack-{react,scrml}, sql-batching, llm-efficiency, per-route-roles, browser)
`scratch/` / `.scratch-p42/` — transient scratch work; not mapped

## Ignored / Generated Paths

node_modules, dist, build, .git, compiler/dist, compiler/native-parser/dist, compiler/self-host/dist, samples/compilation-tests/dist, handOffs

## Tags
#scrmlts #map #structure #compiler #cli #pipeline #native-parser

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
