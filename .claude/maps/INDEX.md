# INDEX.md — scrmlTS Map Index
# generated: 2026-04-10T22:00:00Z  commit: 482373c
# refreshed: 2026-04-12  commit: S6 main (post Slice 4 + self-host resync merge)
# mode: INCREMENTAL (S6)

Maps generated for scrmlTS (working TypeScript/JavaScript scrml compiler).
All maps are in `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/maps/`.

## Generated Maps

| Map | Lines | Purpose |
|---|---|---|
| primary.map.md | 60 | Project fingerprint, map index, key facts, file routing guide |
| structure.map.md | 61 | Directory layout, entry points, ignored/generated paths |
| dependencies.map.md | 88 | Runtime + dev packages with purpose annotations; internal module import graph |
| schema.map.md | 80 | AST discriminated union types; compiler error type shapes; runtime error classes |
| config.map.md | 50 | CLI flags; build config files; no env vars in this project |
| build.map.md | 55 | bun scripts; git hooks (pre/post-commit, pre-push); VS Code extension build |
| error.map.md | 66 | 9 compiler error types; collect-not-throw pattern; 8 runtime error classes; known bug codes |
| test.map.md | 70 | bun:test framework; 249 test files; 5,719 pass / 137 fail; assertion style sample |
| domain.map.md | 69 | 11 pipeline stages (BS→CG); 14 domain concepts (+ ExprNode); output artifact types; business invariants |
| non-compliance.md | 59 | Non-compliance scan: 11 docs + docs/changes/ (30 files); `docs/changes/` flagged for deref review |

## Skipped Maps (not applicable)

| Map | Reason |
|---|---|
| api.map.md | No REST/GraphQL endpoints. LSP uses JSON-RPC stdio, not HTTP routes. |
| state.map.md | No state management library (CLI tool, not a UI app). |
| events.map.md | No event bus or pub-sub. `emit` references in source are codegen functions. |
| auth.map.md | Compiler itself has no auth. Auth is generated into compiled scrml apps. |
| style.map.md | No design token system. VS Code grammar is TextMate syntax, not a theme system. |
| i18n.map.md | No i18n. |
| infra.map.md | No CI/CD, Dockerfile, or cloud infra. |
| migrations.map.md | No database, no migrations. |
| jobs.map.md | No background jobs or queues. |

## Authoritative Source Docs

| Doc | Path | Role |
|---|---|---|
| Language spec | compiler/SPEC.md | 18,753 lines, 53 sections. Authoritative. |
| Spec index | compiler/SPEC-INDEX.md | Quick-lookup by section with line ranges. |
| Pipeline contracts | compiler/PIPELINE.md | 1,569 lines. Stage-by-stage I/O contracts. |
| Project inventory | master-list.md | Live inventory (sections A–P). Current truth. |
| Session state | hand-off.md | Latest session carry-overs and completed work. |
| Agent directives | pa.md | Scope, rules, session-start checklist. |

## Tags
#scrmlTS #map #index #cold-run #project-mapper #current-truth-only

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [compiler/SPEC.md](../../compiler/SPEC.md)
- [hand-off.md](../../hand-off.md)
