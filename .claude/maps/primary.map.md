# primary.map.md
# project: scrmlts
# updated: 2026-06-01T00:00:00-06:00  commit: 4e1f9492

## Project Fingerprint
Language:   TypeScript / JavaScript (mixed; Bun runtime)
Framework:  Custom compiler pipeline (no web framework)
Runtime:    Bun >=1.3.13
Type:       CLI compiler + language toolchain (single-file full-stack web language compiler)
Size:       ~1400 source files (852+ test + 140+ compiler/src + 30 native-parser + stdlib + lsp)
Version:    v0.7.0

## Map Index

| Map                  | Status  | Contents                                                      |
|----------------------|---------|---------------------------------------------------------------|
| structure.map.md     | present | directory layout, entry points, S148-S152 source changes (engine-graph, source-map subsystem, each crash fix, _scrml_modules, dev watcher, Shape 4) |
| dependencies.map.md  | present | 9 packages (3 runtime root + 2 compiler + 4 devDeps), internal graph (engine-graph.ts added S149) |
| schema.map.md        | present | ~45 AST node types + armArrow field (S147), IR shapes, CGError, PA types, type-system internals |
| config.map.md        | present | 4 env vars, 3 config files                                    |
| build.map.md         | present | 12 npm scripts, maintenance scripts, pre-commit hook          |
| error.map.md         | present | 374+ error codes (E-/W-/I-); E-DECL-NEEDS-INITIALIZER new (S152); W-EACH-PROMOTABLE + W-EACH-KEY-001 documented; source-map line-lie fix (S150); each cell-init crash fix (S152) |
| test.map.md          | present | bun:test, 852+ test files across 8 categories                 |
| domain.map.md        | present | 12-stage pipeline + sidecar, 24+ domain concepts: _scrml_modules, engine-graph, source-map provenance, Shape 4, each cell-init order, per-file watcher |
| api.map.md           | absent  | no HTTP route handlers in compiler source                     |
| state.map.md         | absent  | no client state management (compiler is a pure function)      |
| events.map.md        | absent  | no EventEmitter/pubsub detected in compiler source            |
| auth.map.md          | absent  | auth is a COMPILED FEATURE (auth-graph.ts), not compiler auth |
| style.map.md         | absent  | no design tokens or CSS framework in compiler source          |
| i18n.map.md          | absent  | no i18n detected                                              |
| infra.map.md         | absent  | no Dockerfile, CI workflows, or IaC detected                  |
| migrations.map.md    | absent  | no database migrations (runtime DBs are user-app concerns)    |
| jobs.map.md          | absent  | no job scheduler in compiler source                           |

## File Routing

| Query | Map |
|-------|-----|
| types / interfaces / AST node shapes | schema.map.md |
| error codes / CGError / diagnostic stream | error.map.md |
| environment variables / config keys | config.map.md |
| test patterns / fixtures / conformance | test.map.md |
| build commands / pre-commit hook | build.map.md |
| directory layout / entry points / pipeline stages | structure.map.md |
| external packages (acorn, astring, MCP SDK, vscode-languageserver) | dependencies.map.md |
| domain concepts (BS/TAB/NR/MOD/CE/PA/RI/TS/META/DG/CG stages, engine-graph, source-map) | domain.map.md |
| business invariants (null-not-in-scrml, auth-content-not-gated, arm-separator, Shape 4, etc.) | domain.map.md |

## Key Facts
- Entry point: `compiler/src/cli.js` → subcommand router; public API in `compiler/src/api.js` → `compileScrml()`; `--emit-engine-graph` flag (S149) writes `<base>.engine-graph.json` sidecar
- Pipeline: 12 ordered stages BS → TAB → NR → MOD → CE → PA → RI → TS → META → VSS → DG → CG; stage contracts at `compiler/PIPELINE.md` v0.7.2; engine-graph sidecar runs after CG via lazy getter in compile result
- Spec: `compiler/SPEC.md` (30,704+ lines, 58 sections + appendices); normative per pa.md Rule 4
- Error surface: CGError with `severity: 'error'|'warning'|'info'`; W-*/I-* → result.warnings (non-fatal); all else → result.errors (fatal, CLI exit 1)
- Source-map: `build-source-map.ts` + `srcmap-provenance.ts` (S149 B2 / S150 line-lie close); emit fns inject `#scrmlmap#` sentinel marks; `buildSourceMap()` resolves to real use-site spans; honest-synthetic validation strips lying 0:0 stubs
- Cross-file CLIENT modules: `_scrml_modules` registry (S152 §21.3, known-gaps #6); `moduleRegistryKey()` derives stable dist-relative key; exporter appends `_scrml_modules[key] = { ... }` footer via `buildModuleRegistryFooter()`; runtime-template.js declares the idempotent global
- `<each>` cell-init crash (S152 HIGH): render fn guarded against undefined `_items` at module-init; `_scrml_effect_static` subscription re-runs after cell-init fires — compile-clean / runtime-dead class closed
- Shape 4 (S152 §6.2): `<name>: T[]` with no RHS defaults to `[]`; non-array typed decl with no RHS → E-DECL-NEEDS-INITIALIZER; engine opener `effect=` (S148 §51.0.H Form 3): boot-only init effect per engine emitted by `emitEngineOpenerEffect()` in emit-engine.ts
- `scrml dev` watcher (S152): per-file `fs.watch` (not recursive-dir); avoids `fs.inotify.max_user_watches` exhaustion; degrades gracefully on ENOSPC; entry-preference fix eliminates stale-serve
- Match arm separator: `:>` is canonical (SPEC §18.2 / §34, S147-S148); `=>` / `->` are deprecated aliases; `given` guard standalone form also uses `:>` (Insight-33 extension, S148); `bun scrml migrate --fix` (AST-driven) rewrites deprecated arms
- Type system: `type-system.ts` is 15994 lines; largest single source file; handles TS/engine typing, linear type enforcement, validity-surface synthesis; E-TYPE-001 dormancy fix for object-literal lifecycle (S151 C4)
- Native parser: `compiler/native-parser/` has paired `.js` + `.scrml` bootstrap; activated via `--parser=scrml-native`; M5-swap to replace BS+TAB not yet complete
- null/undefined: BOTH do not exist in scrml (`W-ABSENCE-IN-SCRML-SOURCE`); `""` / `0` / `false` ARE defined values (not absence)
- C1 self-demo website: `docs/website-viewer/` (S151); scrml app that dissects another scrml app; serves via `scrml dev docs/website-viewer/`; uses real compiler-emitted `.js.map` for hover-provenance

## Tags
#scrmlts #map #primary #compiler #bun #v0.7.0 #s148 #s149 #s150 #s151 #s152

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
