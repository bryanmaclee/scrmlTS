# primary.map.md
# project: scrmlts
# updated: 2026-05-14T00:37:04-06:00  commit: ff9be0e

## Project Fingerprint
Language:   JavaScript / TypeScript (mixed .js + .ts); Bun runtime
Framework:  Custom compiler — scrml language compiler + LSP server
Runtime:    Bun >= 1.3.13
Type:       Compiler + CLI tool + LSP server + 21-module stdlib
Size:       ~1,800+ source files (excluding node_modules/dist/.git); compiler/src ~108 .ts/.js files;
            SPEC.md 27,145 lines; SPEC-INDEX.md 320 lines; PIPELINE.md v0.7.1 (2,758 lines);
            samples/compilation-tests: ~311 .scrml fixtures;
            Tests: 617 files — **12,275 pass / ~117 skip / 1 todo / 0 FAIL** (S90 close)

## Key Facts (S90 CLOSE — 2026-05-14, commit ff9be0e)

**Current shipped version: v0.2.6 (`efbd1e8`)**
HEAD `ff9be0e` is NOT tagged — v0.3.0 cut path active; S90 landed 17 substantive commits.

**M-7C-D-12 runtime sentinel wave CLOSED S90 (5 tracks):**
- T1: AST cleanup (ast-builder.js, runtime-template.js)
- T2: §57 wire-format codegen — `wire-format.ts` (228 LOC): `returnTypeAllowsAbsence()` + `SERVER_WIRE_ENCODER_HELPER` + `CLIENT_WIRE_DECODER_HELPER`; `emit-server.ts` now wraps `T | not` return values with `_scrml_wire_encode()`; client decoder is dual-accept (envelope + legacy raw JSON null)
- T3: codegen lint — `lint-undefined-interpolation.ts` (318 LOC); W-CG-UNDEFINED-INTERPOLATION fires post-emission
- T4: SPEC §57 Wire Format added (lines 27051+, ~112 new lines); W-CG-UNDEFINED-INTERPOLATION row added to §34 catalog
- T5: audit closure (docs/changes/m-7c-d-12-runtime-sentinel-scoping/progress.md)

**A-2 Reachability Solver Components 2-5 wired S90:**
- A-2.3 Component 2: `reactive_dep_closure` (`reachability/component-2.ts`, 537 LOC)
- A-2.4 Component 3: `server_fn_reachable_within` + interaction-graph projection (`reachability/component-3.ts`, 1,023 LOC)
- A-2.5 Component 4: `auth_gated_boundaries_visible_to` + per-role ChunkPlan emission + W-AUTH-RUNTIME-FALLBACK + E-CLOSURE-002 (`reachability/component-4.ts`, 558 LOC)
- A-2.6 Component 5: `vendor_units_used_by` (`reachability/component-5.ts`, 451 LOC)
- reachability-solver.ts orchestrator extended with per-role ChunkPlan emission
- Combined new LOC for components 2-5: ~2,569 LOC

**A-3 AuthGraph wave CLOSED S90 (A-3.1 + A-3.2 + A-3.3 + A-3.4):**
- `auth-graph.ts` (1,692 LOC): `runAuthGraph()` + `resolveRoleEnum()` + `classifyGates()` + `crossRefRedirects()`
- `compiler/src/types/auth-graph.ts` (~354 LOC): AuthGraph, AuthGate, RoleEnum, AuthGraphDiagnostic, AuthSiteKind, RoleClassification, AuthGraphOutput types
- `<auth>` element registered in html-elements.js; `<auth role=>` in attribute-registry.js with supportsInterpolation: true (S90 relaxation)
- NOTE: `runAuthGraph()` is NOT yet wired into api.js pipeline at S90 close — function exists, is tested, and RS degrades to all-in for all roles until wiring dispatch

**6 NEW first-fire-sites for diagnostics:**
W-CG-UNDEFINED-INTERPOLATION (lint-undefined-interpolation.ts),
I-AUTH-REDIRECT-UNRESOLVED (auth-graph.ts crossRefRedirects()),
E-AUTH-GRAPH-002 (auth-graph.ts resolveRoleEnum()),
W-AUTH-RUNTIME-FALLBACK (reachability/component-4.ts),
E-CLOSURE-002 (reachability/component-4.ts),
W-AUTH-PAGE-INFERRED (auth-graph.ts classifyGates())

**Severity union extended:** "info" severity now present in AuthGraphDiagnostic.severity and RSError.severity (but NOT in CGError.severity which remains 'error' | 'warning')

**Test suite growth S90:** 11,912 → 12,275 (+363 passing tests across 17 commits; +13 new test files)

## Map Index

| Map                      | Status  | Contents |
|--------------------------|---------|----------|
| structure.map.md         | present | directory layout, entry points, S90 new/modified files (112 lines) |
| dependencies.map.md      | present | 5 runtime + 5 dev packages; pipeline graph with Components 2-5 + auth-graph wiring (122 lines) |
| schema.map.md            | present | ~80+ AST node kinds; NEW AuthGraph/AuthGate/RoleEnum types; reachability types; wire-format exports; IR; CompileContext (220 lines) |
| config.map.md            | present | 2 env vars (SCRML_PORT, PORT); bunfig.toml; CLI flags (45 lines) |
| build.map.md             | present | 11 npm scripts; pre-commit hook; CLI subcommands (83 lines) |
| error.map.md             | present | CGError + 9 runtime error classes; 6 new diagnostic codes S90; full E-/W-/I- families (160 lines) |
| test.map.md              | present | bun:test, 617 files, 12,275 pass; S90 new test files enumerated (130 lines) |
| domain.map.md            | present | 30+ domain concepts; S90: M-7C-D-12 closed, A-2.3..A-2.6 wired, A-3.1..A-3.4 closed; Task-Shape Routing (135 lines) |
| events.map.md            | present | no compiler EventEmitter; channel placement rules; WebSocket pub/sub in compiled output; wire format sync messages (57 lines) |
| api.map.md               | absent  | not applicable — compiler tool, not web API |
| state.map.md             | absent  | not applicable — compiler, not a frontend app |
| auth.map.md              | absent  | not applicable — auth lives in stdlib/auth and user .scrml programs |
| style.map.md             | absent  | not detected |
| i18n.map.md              | absent  | not detected |
| infra.map.md             | absent  | no Dockerfile, no .github/workflows, no Terraform, no docker-compose |
| migrations.map.md        | absent  | per-file `<schema>` blocks (§39) + `scrml migrate` CLI; no migrations dir |
| jobs.map.md              | absent  | stdlib/cron exists but compiler itself does not run jobs |
| non-compliance.report.md | present | 4 non-compliant; 3 uncertain; 110 compliant (S90 scan) |

## File Routing

types / interfaces / AST node kinds           → schema.map.md
auth-graph types (AuthGraph/AuthGate/RoleEnum) → schema.map.md
reachability types (RSInput/RSOutput/ChunkPlan) → schema.map.md
wire-format types + helpers                   → schema.map.md
environment variables / config keys           → config.map.md
CLI flags                                     → config.map.md + build.map.md
test patterns / fixtures / runner             → test.map.md
build commands / CLI subcommands / hooks      → build.map.md
directory layout / entry points               → structure.map.md
external packages / internal pipeline graph   → dependencies.map.md
business rules / pipeline stages / spec       → domain.map.md
error codes / warning families / handlers     → error.map.md
event bus / channel placement / input devices → events.map.md
null/absence migration tasks                  → domain.map.md (Task-Shape Routing)
Approach A continuation (A-2.7+, A-4, A-5)   → domain.map.md (Task-Shape Routing)

## Key Facts
- Entry point is `compiler/src/cli.js` → `compiler/src/api.js` which orchestrates 14+ pipeline stages (BS→TAB→NR→MOD→CE→UVB→PA→RI→TS→META→DG→BP→RS→CG plus Stage 3.007 LINT-TRY-CATCH + Stage 3.105 STDLIB-EXPORT-SEED)
- SPEC.md (27,145 lines) is normative; SPEC-INDEX.md (320 lines) is the navigation index; PIPELINE.md (v0.7.1, 2,758 lines) is the implementation contract. SPEC §57 Wire Format added S90.
- Test suite: 617 files, 12,275 pass / ~117 skip / 1 todo / 0 fail at S90 close (ff9be0e); pre-commit hook gates on unit+integration+conformance subsets
- `null` and `undefined` do NOT exist in scrml at any level — SPEC §42 + §42.1.1 normative; `""` / `0` / `false` are DEFINED values; canonical absence is `not`; wire encoding of absence is `{"__scrml_absent": true}` (SPEC §57)
- AuthGraph (A-3, auth-graph.ts) is COMPLETE at S90 but NOT YET WIRED into api.js — runAuthGraph() exists standalone; RS degrades to all-in until wiring dispatch
- Reachability Solver Components 1-5 all wired at S90 (A-2.2..A-2.6); A-2.7 outer fixed-point operator is the remaining gap before the solver produces real per-role ChunkPlans
- Six new diagnostic codes landed S90: W-CG-UNDEFINED-INTERPOLATION, I-AUTH-REDIRECT-UNRESOLVED, E-AUTH-GRAPH-002, W-AUTH-RUNTIME-FALLBACK, E-CLOSURE-002, W-AUTH-PAGE-INFERRED

## Tags
#scrmlts #map #primary #s90 #v0.3 #approach-a #approach-a2 #approach-a3 #wire-format #auth-graph #null-eradication #reachability #m-7c-d-12

## Links
- [structure.map.md](./structure.map.md)
- [dependencies.map.md](./dependencies.map.md)
- [schema.map.md](./schema.map.md)
- [config.map.md](./config.map.md)
- [build.map.md](./build.map.md)
- [error.map.md](./error.map.md)
- [test.map.md](./test.map.md)
- [domain.map.md](./domain.map.md)
- [events.map.md](./events.map.md)
- [non-compliance.report.md](./non-compliance.report.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
