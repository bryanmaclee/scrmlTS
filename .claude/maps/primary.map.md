# primary.map.md
# project: scrmlTS
# updated: 2026-04-10T22:00:00Z  commit: 482373c

## Project Fingerprint

| Field | Value |
|---|---|
| Language | JavaScript / TypeScript (mixed: .js + .ts compiler source) |
| Runtime | Bun (required; no Node.js compatibility layer) |
| Framework | None — compiler CLI tool + LSP server |
| Primary dep | vscode-languageserver (LSP), acorn + astring (meta-eval) |
| Type | Language compiler — CLI tool + Language Server |
| Size | ~24,739 LOC compiler src; ~14,135 LOC codegen; 933 lines AST types |

## Map Index

| Map | Status | Contents |
|---|---|---|
| structure.map.md | present | directory layout, entry points, 3 top-level entries |
| dependencies.map.md | present | 5 packages (2 runtime, 3 dev), internal module graph |
| schema.map.md | present | AST discriminated union (933 lines), 9 compiler error types, 8 runtime error classes |
| config.map.md | present | no env vars; bunfig, CLI flags, vscode tsconfig |
| build.map.md | present | bun scripts, git hooks (not versioned), vscode extension build |
| error.map.md | present | 9 compiler error types, 8 runtime error classes, collect-not-throw pattern |
| test.map.md | present | bun:test, 168 test files, 5,542 tests pass |
| domain.map.md | present | 11 pipeline stages, 13 domain concepts, output artifact types |
| api.map.md | absent | no REST/GraphQL endpoints (LSP is JSON-RPC stdio, not HTTP) |
| state.map.md | absent | no state management library (CLI tool) |
| events.map.md | absent | no event bus / pub-sub (emit refs are codegen functions, not event system) |
| auth.map.md | absent | no auth in compiler itself (auth is generated into compiled scrml apps) |
| style.map.md | absent | no design tokens / theme system (compiler has no UI) |
| i18n.map.md | absent | no i18n |
| infra.map.md | absent | no CI/CD, no Docker, no cloud infra |
| migrations.map.md | absent | no migrations (compiler has no database) |
| jobs.map.md | absent | no background jobs / queues |

## File Routing

| When you need to know... | Go to |
|---|---|
| Directory layout, where things live | structure.map.md |
| Pipeline stage order and contracts | domain.map.md + compiler/PIPELINE.md |
| AST node shapes / compiler error types | schema.map.md |
| CLI scripts and build commands | build.map.md |
| External package purposes | dependencies.map.md |
| Test organization and assertion style | test.map.md |
| Error collection pattern | error.map.md |
| Environment / config keys | config.map.md |
| Non-compliance findings | non-compliance.md |

## Key Facts

- Entry point is `compiler/src/cli.js` (bin: `scrml`); all pipeline stages run through `compiler/src/index.js`
- Pipeline has 11 stages: BS → TAB → BPP → PA → RI → TS → DG → ME → MC → CE → CG; all working
- Tests run with `bun test compiler/tests/`; 5,542 pass, 2 skip, 0 fail
- Self-host flag (`--self-host`) loads 11 .scrml bootstrap modules from `compiler/self-host/`; primary copies live in `~/scrmlMaster/scrml/`
- Most pipeline stages collect errors into a returned array rather than throwing — CLI presents all errors before halting
- `shared/` directory was deleted S2 (it was a fictional README describing nonexistent files)
- Git hooks exist in `.git/hooks/` but are not versioned — fresh clones need manual installation
- The scrml language spec (18,753 lines) lives at `compiler/SPEC.md` and is authoritative

## Tags
#scrmlTS #map #primary #compiler #bun #lsp #cold-run

## Links
- [structure.map.md](./structure.map.md)
- [dependencies.map.md](./dependencies.map.md)
- [schema.map.md](./schema.map.md)
- [config.map.md](./config.map.md)
- [build.map.md](./build.map.md)
- [error.map.md](./error.map.md)
- [test.map.md](./test.map.md)
- [domain.map.md](./domain.map.md)
- [non-compliance.md](./non-compliance.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [compiler/SPEC.md](../../compiler/SPEC.md)
- [hand-off.md](../../hand-off.md)
