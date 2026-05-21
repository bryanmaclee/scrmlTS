# primary.map.md
# project: scrmlts
# updated: 2026-05-21T04:30:00-06:00  commit: e613621

## Project Fingerprint
Language:   TypeScript + JavaScript (ESM; `.ts` runs directly — no transpile)
Framework:  none (this IS a language toolchain — it has no web framework)
Runtime:    Bun >= 1.3.13 (the only supported runtime)
Type:       compiler / language toolchain (Bun workspace: root + `compiler` member)
Size:       ~3,040 tracked files; 126 compiler/src/ files; 27 native-parser modules (.scrml+.js pairs); 731 test files

scrmlts is the reference compiler for **scrml** — a single-file, full-stack
reactive web language. One `.scrml` source compiles to plain HTML + CSS + JS;
the compiler splits server from client, wires reactivity, and infers routes.

## Map Index
| Map                  | Status  | Contents                                      |
|----------------------|---------|-----------------------------------------------|
| structure.map.md     | present | directory layout, 8 entry points, parallel-track note |
| dependencies.map.md  | present | 7 external packages, live + native-parser module graphs |
| schema.map.md        | present | live AST union + codegen IR + symbol table + auth/reachability + native-parser Expr/Stmt AST + TagFrame/BodyMode/DisplayTextLiteral catalogs |
| config.map.md        | present | 2 env vars (SCRML_PORT, PORT), no .env file    |
| build.map.md         | present | 13 npm scripts, 8 CLI subcommands, git hooks   |
| error.map.md         | present | 9 per-stage diagnostic classes, stream partition, native-parser §34 codes |
| test.map.md          | present | bun test, 731 files, 8 categories + 4 native-parser conformance + e2e |
| domain.map.md        | present | 18-stage pipeline + native-parser composed-engines front-end (S113 milestones) |
| api.map.md           | absent  | no HTTP API — compiler, not a web service      |
| state.map.md         | absent  | no client state store                          |
| events.map.md        | absent  | no event bus                                   |
| auth.map.md          | absent  | no web auth (auth-graph.ts is a compiler pass — see domain.map.md) |
| style.map.md         | absent  | no design-token system                         |
| i18n.map.md          | absent  | no localization                                |
| infra.map.md         | absent  | no Dockerfile / CI workflows / cloud config    |
| migrations.map.md    | absent  | no DB-migration tooling (scrml `<schema>` migration is a language feature) |
| jobs.map.md          | absent  | no job/queue system                            |

## File Routing
live AST node shapes / codegen IR / symbol table → schema.map.md
native-parser Expr AST / Stmt AST / TokenKind / engines → schema.map.md
pipeline stages / scrml language concepts          → domain.map.md
native-parser composed-engines front-end           → domain.map.md
diagnostic classes / W-/I- partition / lints        → error.map.md
CLI subcommands / npm scripts / git hooks           → build.map.md
test framework / categories / conformance / fixtures → test.map.md
directory layout / entry points / parallel track     → structure.map.md
external packages / internal module graphs           → dependencies.map.md
environment variables / config files                 → config.map.md
SPEC error codes (E-/W-/I-)                          → compiler/SPEC.md §34 (normative — not mapped)
per-stage contracts / lock map (L1-L22)               → compiler/PIPELINE.md (normative — not mapped)

## Task-Shape Routing (agents — read this section first)

Dispatches against this repo cluster around three task shapes. Each shape lists
2-4 maps in priority order — read them in order until oriented, then read the
named source files. The native-parser arc (charter B) is the dominant task
shape at S113; almost every S113-S114 dispatch is `native-parser-milestone`.

**native-parser-milestone** (the S112-S114 dominant shape — an M4.x / MK4 /
M5 / M6 sub-step landing under `compiler/native-parser/`):
1. `domain.map.md` — composed-engines architecture + current M-ladder status
   (M2/M3/MK2/MK3 ✅, M4.1 ✅, M4.2 next)
2. `schema.map.md` — native-parser Expr/Stmt AST + engine catalog (which
   constructors / state-children / payload fields the new code must extend)
3. `structure.map.md` — file-ownership (which `.scrml`/`.js` pair the
   milestone touches; the M-/MK-step → file map at native-parser/README.md)
4. `test.map.md` — `parser-conformance-{expr,stmt,markup,lexer}.test.js` are
   the gating harnesses; new milestones extend one of these.
   Also read: `compiler/native-parser/README.md` + the IMPLEMENTATION-ROADMAP
   §3-§4.4 (K-ledger). Both are authoritative for the M-ladder.

**live-pipeline-fix** (a bug or change to the existing TS pipeline under
`compiler/src/` — most pre-S111 dispatches were this shape; S113 had ZERO):
1. `domain.map.md` — 18-stage pipeline; pick the affected stage
2. `schema.map.md` — the live AST union in `compiler/src/types/ast.ts` (NOT
   the native-parser Expr AST — those are SEPARATE)
3. `error.map.md` — which `*Error` class the fix routes through; the W-/I-
   non-fatal partition rule
4. `test.map.md` — the test category matching the affected pass
   Also read: `compiler/SPEC.md` for the relevant § (authoritative).

**spec-amendment / language-feature** (a SPEC.md amendment or a new language
feature that crosses multiple stages):
1. `domain.map.md` — the core-concept slot + pipeline pass interactions
2. `schema.map.md` — AST shape additions required
3. `error.map.md` — new E-/W-/I- codes the amendment introduces
   Also read: `compiler/SPEC.md` (the relevant § + §34 catalog) + the spec
   review checklist via `master-list.md`.

**Don't know which** (e.g., open-ended task brief from user):
1. Read `primary.map.md` (this file) in full
2. Read the **Task-Shape Routing** section above and self-classify
3. If the classification is genuinely unclear, surface to PA before consuming further context

## Use feedback loop

When this map's content was load-bearing for a dispatch outcome, the agent's final report should
note **"map content consulted: [list of map files]; load-bearing finding: [one sentence]"**. When
the map content was NOT useful, report **"maps consulted but not load-bearing"** so PA can
diagnose whether the wrong maps were named in the brief OR the map content is at the wrong
granularity (PA-side fix). 3-5 consecutive "not load-bearing" reports on the same task shape
trigger a map-design review.

## Key Facts
- Entry: compiler/src/cli.js routes 8 subcommands; compiler/src/api.js runs the
  full 18-stage compile pipeline (BS→TAB→NR→MOD→CE→UVB→PA→RI→MC→TS→META→VSS→DG→BP→RS→CG)
  and is the single programmatic API consumed by CLI, tests, watch loops, and the LSP.
  The live pipeline (compiler/src/) is UNCHANGED since the prior map (commit 78faa65)
  AND across the S113 13-dispatch arc — `git diff 87453fb..HEAD -- compiler/src/` is empty.
- S113 native-parser arc landed FOUR milestones + M4.1 + K2 with zero regressions
  (full suite 16,840 → 17,812 tests). At HEAD `e613621`:
  - M1 (lexer) — ✅ COMPLETE (S99-S103, M1.5 verified S113)
  - M2 (JS expression parser, M2.1-M2.4) — ✅ COMPLETE (S112-S113)
  - M3 (JS statement parser, M3.1-M3.4; subsumes BPP) — ✅ COMPLETE (S113)
  - M4.1 (async/generator operators) — ✅ COMPLETE (S113)
  - M4.2 (K6 destructuring unification + `noIn` flag) + M4.3 — pending (S114 priority)
  - MK1 (markup BlockContext) — ✅ COMPLETE (S112)
  - MK2 (TagFrame engine, MK2.1-MK2.3) — ✅ COMPLETE (S113)
  - MK3 (BodyMode + DisplayTextLiteral; §4.18 native) — ✅ COMPLETE (S113)
  - MK4 / M5 / M6 — pending (sequential)
- Native-parser file count: 27 paired `.scrml`/`.js` modules (was 25 at the
  prior map — added `body-mode.scrml/js`, `display-text-literal.scrml/js`,
  `tag-frame.scrml/js`, `ast-stmt.scrml/js`, `parse-stmt.scrml/js`,
  `char-classify.scrml/js`; the latter is the K2 leaf-module fix).
- The native-parser modules are `.scrml` CANONICAL + `.js` EXECUTABLE shadow
  pairs. Tests import the `.js`. The shadow exists because compiler v0.3 strips
  `export function` bodies in `${...}` SPA blocks (native-parser/README.md
  ANOMALY-2); the M4+ swap-in retires the shadow. The `.scrml`↔`.js` files are
  hand-maintained — no rebuild script regenerates them.
- K-ledger (IMPLEMENTATION-ROADMAP §4.4) — open follow-ups:
  K3/K4/K5 (M1 lexer maximal-munch gaps; parse-expr-coupled, post-M4),
  K6 (M4.2 scope), K8 (whole-parser `function`→`fn` refactor; K2-unblocked),
  K9 (markup-layer circular import — mirror K2 recipe; pre-M6), K10
  (`ast-expr.scrml` ~L575 `!= not` → `is not`; one-line, post-M4 to avoid
  collision with M4.2/M4.3 edits). The `.js` shadows are unaffected by K8-K10.
- This is a compiler — there is NO HTTP API, NO database, NO event bus, NO client
  state store, NO web auth, NO Docker, NO CI workflows. Conditional-map probes
  return only false positives (compiler code that *processes* routes/auth/events).
- `compiler/src/auth-graph.ts` and `compiler/src/reachability/` are compiler
  analysis passes (domain concepts), NOT a runtime auth or routing system.
- Diagnostics are structured objects, not thrown. Each stage has its own
  `*Error` class (TSError, CGError, ...). api.js:1779 partitions the stream:
  W-*/I- prefix or severity warning/info → non-fatal `result.warnings`;
  everything else → fatal `result.errors` (CLI exit 1). Tests asserting on
  W-*/I- codes MUST check `result.warnings`.
- The normative language definition is compiler/SPEC.md (28,489+ lines, §1-§57);
  the normative pipeline contract is compiler/PIPELINE.md. Per project rule,
  SPEC.md is authoritative over docs, primers, and memory; do not decide from
  summaries. Read the relevant SPEC section in full before spec-relevant changes.
- scrml has no `null` and no `undefined` — `not` is the single absence value.
  `""`/`0`/`false`/`[]`/`{}` are DEFINED values, not absence (SPEC §42).
- Codegen fans out from compiler/src/code-generator.js → compiler/src/codegen/
  (~50 `emit-*.ts` modules); each emits one scrml construct family.

## Tags
#scrmlts #map #primary #compiler #scrml-language #bun #native-parser #charter-b

## Links
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [structure.map.md](./structure.map.md)
- [dependencies.map.md](./dependencies.map.md)
- [schema.map.md](./schema.map.md)
- [config.map.md](./config.map.md)
- [build.map.md](./build.map.md)
- [error.map.md](./error.map.md)
- [test.map.md](./test.map.md)
- [domain.map.md](./domain.map.md)
- [non-compliance.report.md](./non-compliance.report.md)
