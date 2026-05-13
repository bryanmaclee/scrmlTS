# primary.map.md
# project: scrmlts
# updated: 2026-05-13T15:00:00Z  commit: 9b98118

## Project Fingerprint
Language:   JavaScript / TypeScript (mixed .js + .ts); Bun runtime
Framework:  Custom compiler — scrml language compiler + LSP server
Runtime:    Bun >= 1.3.13
Type:       Compiler + CLI tool + LSP server + 20-module stdlib
Size:       ~1,775 source files (excluding node_modules/dist/.git); compiler/src ≈ 96 .ts/.js files;
            SPEC.md 26,976 lines; SPEC-INDEX.md ~308 lines; PIPELINE.md v0.7.1;
            samples/compilation-tests: ~288 .scrml fixtures;
            Tests: 590 files — **11,912 pass / 117 skip / 1 todo / 0 FAIL** (S88 close)

## Key Facts (S88 CLOSE — 2026-05-13)

**Current shipped version: v0.2.6 (`efbd1e8`)**
HEAD `9b98118` is NOT tagged — v0.3.0 cut path well-cleared pending Wave 4 adopter content.
Approach A FULL (all 5 sub-waves A-1.1..A-1.5) in v0.3.0 cut per user S88 ratification.

**All 5 LIFT-template codegen bugs CLOSED S88:**
- LIFT-1: `parseLiftTag` paren-attr cursor desync FIXED (ast-builder.js)
- LIFT-2/3/4 bundle: bind:*/if=/event-arg parity inside lift template FIXED (emit-lift.js)
- LIFT-5: if/for children route through container helpers in reconciler factory FIXED (emit-control-flow.ts)

**Approach A wave A-1 COMPLETE S88 (5/5 sub-phases):**
- A-1.2: MarkupReadDGNode kind + createMarkupReadNode factory added to dependency-graph.ts
- A-1.3: 4 high-frequency markup-context read shapes activated (text-interp/attr/bind/if)
- A-1.4: call-ref + for-iterable + lift-template-body edge emission activated
- A-1.5: engine state-child + onTransition/onTimeout/onIdle body edge emission activated (14 tests)

**scrml:host stdlib primitive SHIPPED S88:**
- `compiler/runtime/stdlib/host.js` — safeCall/safeCallAsync/HostError
- `stdlib/host/index.scrml` — scrml:host module declaration
- 44 tests (safe-call.test.js + safe-call-async.test.js)

**Phase 3a stdlib migration (S88): 4 sync sites + 1 async (verifyPassword)**
- 4 sync try-blocks migrated to safeCall (stdlib/crypto/index.scrml)
- verifyPassword async migrated to safeCallAsync (stdlib/auth/password.scrml)
- Remaining async gaps (http/index.scrml: 4 sites) documented for subsequent dispatch

**3 SPEC amendments S88:**
- §4.7: BS-comment-skip softened to MAY-permit `<!-- -->` (matching S87 shipped behavior)
- §18.7: mixed positional+named binding explicitly FORBIDDEN (E-TYPE-021/E-TYPE-022)
- §41.4: `bun:` and `node:` protocol prefixes pass through verbatim (server-context only)

**Bug fix (S88): sql-server-fn-runtime.test.js §1 flake**
- happy-dom Headers pollution isolated with per-test header objects

## Map Index

| Map                      | Status  | Contents                                                                |
|--------------------------|---------|-------------------------------------------------------------------------|
| structure.map.md         | present | directory layout, entry points, S88 new/modified files (87 lines)      |
| dependencies.map.md      | present | 5 root+compiler runtime + 5 dev packages; internal pipeline graph (109 lines) |
| schema.map.md            | present | ~80+ AST node kinds; MarkupReadDGNode [S88 A-1.2]; safeCall/HostError types; IR; CompileContext (214 lines) |
| config.map.md            | present | 2 env vars (SCRML_PORT, PORT); bunfig.toml; CLI flags (53 lines)       |
| build.map.md             | present | 11 npm scripts + e2e scripts; pre-commit hook; CLI subcommands (94 lines) |
| error.map.md             | present | CGError + 9 runtime error classes; LIFT-1..5 FIXED [S88]; HostError [S88]; all E-/W- families (149 lines) |
| test.map.md              | present | bun:test, 590 files, 11,912 pass; S88 new test files; approach-a/safecall/LIFT-fix tests (170 lines) |
| domain.map.md            | present | 40+ domain concepts; v0.3.0 status [Wave 4 remaining]; safeCall/HostError/Approach A concepts [S88] (115 lines) |
| events.map.md            | present | no compiler EventEmitter; channel placement rules; WebSocket pub/sub in compiled output (53 lines) |
| api.map.md               | absent  | not applicable — compiler tool, not web API                             |
| state.map.md             | absent  | not applicable — compiler, not a frontend app                           |
| auth.map.md              | absent  | not applicable — auth lives in stdlib/auth and user .scrml programs     |
| style.map.md             | absent  | not detected                                                            |
| i18n.map.md              | absent  | not detected                                                            |
| infra.map.md             | absent  | no Dockerfile, no .github/workflows, no Terraform, no docker-compose    |
| migrations.map.md        | absent  | per-file `<schema>` blocks (§39) + `scrml migrate` CLI; no migrations dir |
| jobs.map.md              | absent  | stdlib/cron exists but compiler itself does not run jobs                 |

## File Routing

types / interfaces / AST node kinds           → schema.map.md
environment variables / config keys           → config.map.md
test patterns / fixtures / runner             → test.map.md
build commands / CLI subcommands / hooks      → build.map.md
directory layout / entry points               → structure.map.md
external packages / internal pipeline graph   → dependencies.map.md
business rules / pipeline stages / spec       → domain.map.md
error codes / warning codes / diagnostics     → error.map.md
channel / SSE / runtime event wiring          → events.map.md
docs hygiene / superseded artifacts           → non-compliance.report.md

## Task-Shape Routing (agents — read this section first)

**Compiler-source bug fix** (parser / typer / codegen / runtime emit / boundary inference):
1. `domain.map.md` — locate the pipeline stage that owns the symptom (12-stage pipeline)
2. `structure.map.md` — confirm the file path under `compiler/src/`
3. `error.map.md` — if symptom is a diagnostic, locate the fire-site
4. `schema.map.md` — if the bug touches AST shape

**Approach A implementation** (waves A-2 through A-5 per SCOPING.md):
1. `domain.map.md` — read "Approach A (v0.3)", "MarkupReadDGNode (A-1.2)", and "Dependency Graph" entries
2. `schema.map.md` — MarkupReadDGNode shape + DGEdgeKind (markup-read edge)
3. `test.map.md` — dg-markup-read-emission-a13/a14/a15 tests; run as integration spec

**scrml:host / safeCall / safeCallAsync work:**
1. `domain.map.md` — read "scrml:host", "safeCall", "safeCallAsync", "Phase 3a stdlib migration" entries
2. `schema.map.md` — HostError type + safeCall/safeCallAsync signatures
3. `structure.map.md` — files: `compiler/runtime/stdlib/host.js`, `stdlib/host/index.scrml`
4. `test.map.md` — safe-call.test.js, safe-call-async.test.js

**New language feature implementation** (new AST kind / new error code / new SPEC section):
1. `domain.map.md` — confirm the feature lives in an existing pipeline stage
2. `schema.map.md` — register the new AST node kind (canonical home: `compiler/src/types/ast.ts`)
3. `error.map.md` — register the new error code if any
4. `test.map.md` — locate the right test directory and conformance hooks

**Test authoring** (unit / integration / conformance / browser):
1. `test.map.md` — runner, fixtures, current test counts, per-directory conventions
2. `error.map.md` — if writing conformance tests for an error code

**Spec amendment** (SPEC.md edit / new normative statement / SPEC-INDEX refresh):
1. `domain.map.md` — confirm spec text matches the code reality being amended
2. `error.map.md` — if the amendment adds / renames / deletes an error code
3. `non-compliance.report.md` — check if the amendment closes any flagged drift

**Migrate / promote command work:**
1. `structure.map.md` — `compiler/src/commands/migrate.js` (~1,940 LOC)
2. `domain.map.md` — "migrate --program-shape" + "BS comment-skip" entries
3. `test.map.md` — migrate test files

**Channel architecture work:**
1. `domain.map.md` — "Channel placement (v0.3)" + "PURE-CHANNEL-FILE" entries
2. `events.map.md` — Channel Placement Rules section
3. `error.map.md` — E-CHANNEL-OUTSIDE-PROGRAM + E-CHANNEL-INSIDE-PAGE entries

**Audit / diagnostic** (read-only):
1. `non-compliance.report.md` — first stop for hygiene findings PA can act on
2. `domain.map.md` — for behavioral / pipeline-stage analysis

**Don't know which:**
1. Read `primary.map.md` (this file) in full
2. Self-classify using Task-Shape Routing above
3. If genuinely unclear, surface to PA before consuming further context

## Use feedback loop

When map content was load-bearing for a dispatch outcome, the agent's final report should note
**"map content consulted: [list]; load-bearing finding: [one sentence]"**.
When maps were not useful, report **"maps consulted but not load-bearing"** so PA can diagnose.
3-5 consecutive "not load-bearing" on the same task shape triggers a map-design review.

## Key Facts

- **Entry points:** CLI is `compiler/bin/scrml.js`; programmatic API is `compiler/src/api.js`; LSP server is `lsp/server.js --stdio`. Pipeline: BS → TAB → NR → MOD → CE → UVB → PA → RI → TS → META → DG → BP → CG (12+ stages).

- **v0.3.0 remaining blocker:** Wave 4 adopter content (examples + tutorial updates). All compiler blockers closed (LIFT-1..5, Approach A A-1, safeCall, Phase 3a sync).

- **AST authority:** `compiler/src/types/ast.ts` (1,828 LOC). All nodes carry `id: number` and `span: Span`. `kind: "state-decl"` for reactive decls. `MarkupReadDGNode` (kind: "markup-read") added S88 for Approach A DG edges.

- **scrml:host:** New S88. `compiler/runtime/stdlib/host.js` provides safeCall/safeCallAsync/HostError. `stdlib/host/index.scrml` declares the module. try/catch lives ONLY in the JS shim — never in scrml source.

- **Database:** Bun.SQL only. Schemas declared per-file via `<schema>` (§39). `_scrml_sql` declarations hoisted by emit-server.ts (Bug 3a fix, S87). Schema diffing via `compiler/src/schema-differ.js`.

- **Self-host:** `compiler/dist/self-host/*.js` and `compiler/self-host/dist/tab.js` are gitignored. Rebuild gate: `scripts/rebuild-self-host-dist.ts` exits 1 on any non-warning error.

- **Pre-commit hook:** `scripts/git-hooks/pre-commit` — runs `bun test unit + integration + conformance --bail`. Must be activated per-machine.

- **E2E (Playwright):** `e2e/` suite with `playwright.config.ts` (3-browser). 5 spec files: 02-counter, 03-contact-book, 05-multi-step-form, 14-mario, todomvc. All LIFT-related ACs now unblocked.

## Tags
#scrmlts #map #primary #compiler #s88 #v0.3 #lift-fixes-complete #approach-a-a1-shipped #safecall #stdlib-host #spec-amendments #wave-4-remaining #bun #pipeline

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
