# primary.map.md
# project: scrmlts
# updated: 2026-05-30T00:00:00Z  commit: 948d3f2f

## Project Fingerprint
Language:   TypeScript / JavaScript (mixed; Bun runtime)
Framework:  Custom compiler pipeline (no web framework)
Runtime:    Bun >=1.3.13
Type:       CLI compiler + language toolchain (single-file full-stack web language compiler)
Size:       ~1400 source files (852 test + 140 compiler/src + 30 native-parser + stdlib + lsp)
Version:    v0.7.0

## Map Index

| Map                  | Status  | Contents                                                      |
|----------------------|---------|---------------------------------------------------------------|
| structure.map.md     | present | directory layout, entry points, 12-stage pipeline overview    |
| dependencies.map.md  | present | 9 packages (3 runtime root + 2 compiler + 4 devDeps), internal graph |
| schema.map.md        | present | ~45 AST node types, IR shapes, CGError, type-system internals |
| config.map.md        | present | 4 env vars, 3 config files                                    |
| build.map.md         | present | 12 npm scripts, maintenance scripts, pre-commit hook          |
| error.map.md         | present | 373 error codes (E-/W-/I-); CGError class; stream partition   |
| test.map.md          | present | bun:test, 852 test files across 8 categories                  |
| domain.map.md        | present | 12-stage pipeline, 20 domain concepts, business invariants    |
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
| domain concepts (BS/TAB/NR/MOD/CE/PA/RI/TS/META/DG/CG stages) | domain.map.md |
| business invariants (null-not-in-scrml, auth-content-not-gated, etc.) | domain.map.md |

## Key Facts
- Entry point: `compiler/src/cli.js` → subcommand router; public API in `compiler/src/api.js` → `compileScrml()`
- Pipeline: 12 ordered stages BS → TAB → NR → MOD → CE → PA → RI → TS → META → VSS → DG → CG; stage contracts at `compiler/PIPELINE.md` v0.7.2
- Spec: `compiler/SPEC.md` (30,704 lines, 58 sections + appendices); normative per pa.md Rule 4
- Error surface: CGError with `severity: 'error'|'warning'|'info'`; W-*/I-* → result.warnings (non-fatal); all else → result.errors (fatal, CLI exit 1)
- errorBoundary: new in this cycle — `compiler/src/codegen/emit-error-boundary.ts` (+320L, §19.6); typed `!`-error path + host-JS try/catch backstop
- SSE wiring: GITI-025+026 landed in `emit-client.ts` / `emit-server.ts` — server param-bind via `route.query`, reactive `@cell=gen()` per-event callback, named-event `addEventListener`
- Security warning: W-AUTH-CONTENT-NOT-GATED (GITI-027A) — `<auth role="X">` gates JS-mount only, NOT served HTML; fires from `auth-graph.ts:627`
- Parser fix: GITI-024 in `ast-builder.js parseLogicBody` — brace-less `continue`/`break` `tok.line` → `tok.span.line` (always-true label-capture root cause)
- Type system: `type-system.ts` is 15994 lines; the largest single source file; handles TS/engine typing, linear type enforcement, validity-surface synthesis
- Native parser: `compiler/native-parser/` has paired `.js` + `.scrml` bootstrap; activated via `--parser=scrml-native`; M5-swap to replace BS+TAB not yet complete
- Library-mode: SPEC §12.6 landed — body-content-escalated fns suppress `.server.js` HTTP wrapper; explicit `server function`/`route=` retains it
- null/undefined: BOTH do not exist in scrml (`W-ABSENCE-IN-SCRML-SOURCE`); `""` / `0` / `false` ARE defined values (not absence)
- Test count: 852 test files; pre-commit hook runs full suite before every commit; --no-verify is prohibited

## Tags
#scrmlts #map #primary #compiler #bun #v0.7.0

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
