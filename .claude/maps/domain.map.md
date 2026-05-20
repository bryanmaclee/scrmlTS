# domain.map.md
# project: scrmlts
# updated: 2026-05-20T17:07:32-06:00  commit: 87453fb

The domain of this repo is *compiling the scrml language*. scrml is a
single-file, full-stack reactive web language: one `.scrml` source compiles to
plain HTML + CSS + JS, with the compiler splitting server from client, wiring
reactivity, and inferring HTTP routes. The "core concepts" below are the
compiler's pipeline stages and the language constructs they process.

## The Compilation Pipeline  [compiler/PIPELINE.md — normative stage contracts]
A `.scrml` file flows through 18 numbered stages. Each stage takes a well-typed
input, performs a bounded transformation, and hands a well-typed output to the
next. Stages 1–CE are per-file parallel (one Bun worker each); MOD and the
cross-file stages are project-wide synchronization points.
Hard target: a 4000-line project compiles from scratch in under 1 second.
The live pipeline (compiler/src/) is UNCHANGED since commit 78faa65.

| # | Stage | Abbrev | Source file(s) |
|---|---|---|---|
| 1   | Preprocessor | PP | (in block-splitter / api.js pre-pass) |
| 2   | Block Splitter | BS | src/block-splitter.js |
| 3   | Tokenizer + AST Builder | TAB | src/tokenizer.ts, src/ast-builder.js, src/expression-parser.ts |
| 3.05| Name Resolution | NR | src/name-resolver.ts, src/symbol-table.ts |
| 3.1 | Module Resolver | MOD | src/module-resolver.js |
| 3.2 | Component Expander | CE | src/component-expander.ts (+ Phase 2 channel expansion) |
| 3.3 | Unified Validation Bundle (VP-1/2/3) | UVB | src/validators/{attribute-allowlist, attribute-interpolation, post-ce-invariant}.ts |
| 4   | protect= Analyzer | PA | src/protect-analyzer.ts |
| 5   | Route Inferrer | RI | src/route-inference.ts |
| 5.5 | Monotonicity Classifier | MC | src/monotonicity-analyzer.ts |
| 6   | Type System | TS | src/type-system.ts |
| 6.5 | Meta Check + Eval | META | src/meta-checker.ts, src/meta-eval.ts |
| 6.7 | Validity Surface Synthesis | VSS | (TS sub-passes B11/B12/B17) |
| 7   | Dependency Graph Builder | DG | src/dependency-graph.ts |
| 7.5 | Batch Planner | BP | src/batch-planner.ts |
| 7.6 | Reachability Solver | RS | src/reachability-solver.ts, src/reachability/* (SPEC-anchored; impl deferred) |
| 8   | Code Generator | CG | src/code-generator.js → src/codegen/* (~50 emit-*.ts modules) |

Auxiliary cross-file pass: AuthGraph (src/auth-graph.ts) — auth-site
enumeration + role-enum resolution + per-gate classification, feeding the
Reachability Solver.

## The Native-Parser Front-End  [compiler/native-parser/ — charter B, S111]
A SECOND, scrml-native compiler front-end built in parallel with the live
pipeline above. It is NOT a port and NOT the post-v1.0 from-scratch self-host —
it is a composed-engines front-end that, under charter B, replaces the WHOLE
live front-end (the heuristic block-splitter, the Acorn JS layer, the
body-pre-parser, and the statechild re-tokenizers).

Status (parallel track — see structure.map.md):
- NOT wired into the api.js pipeline. compiler/src/ does not import it.
  Consumed only by `compiler/tests/parser-conformance*` test files.
- Swaps in behind `--parser=scrml-native` at milestone M5; M6 deletes the live
  front-end stages (BS + Acorn + BPP) and retires the flag.
- Each module is a `.scrml` CANONICAL source + `.js` EXECUTABLE shadow.

### Composed-engines architecture (DD §D2)
The front-end is a stack of trampoline loops, each dispatching by an `<engine>`:

JS layer:
- M1 — LEXER. `lex(source): Token[]` (lex.scrml) is a loop dispatching by the
  `LexMode` engine. 7 lex modes (InCode + 6 sub-modes for strings, templates,
  comments, regex). COMPLETE (M1.1-M1.4, S99-S103).
- M2 — EXPRESSION PARSER. `parse-expr` consumes M1's Token[] through
  `token-cursor` and emits `Expr` AST (ast-expr) via precedence-climbing,
  dispatching by the `ParseMode` engine. IN FLIGHT — M2.1 primary expressions +
  M2.2 operator expressions + M2.3 call/member/arrow heads landed at S112.
- M3 — STATEMENT PARSER. Subsumes the body-pre-parser. Pending.
- M4 — full bounded JS subset. Pending.

Markup layer:
- MK1 — CONTEXT GRID. `parse-markup` is a trampoline dispatching by the
  `BlockContext` engine — recognizes the 7 block-opener sigils + the `<ident`
  markup-tag boundary, producing a typed block-stream. IN FLIGHT — MK1.1-MK1.3
  landed at S112. MK1 does NOT build the `<tag>` tree.
- MK2 — `TagFrame` engine: the tag tree, 3 closer forms, `TagKind`. Pending.
- MK3 — `BodyMode` + `DisplayTextLiteral`: §4.18 native quoted-text. Pending.
- MK4 — markup↔JS seam; re-tokenizer-scaffolding deletion. Pending.

### Native-parser engines (state-shape; Pillar 5b)
LexMode       — JS-lexer context (which lexing mode is active right now).
BracketStack  — bracket depth + opener-frame stack.
ErrorRecovery — parse-error recovery (ParsingNormally / AccumulatingSkipped / ReSynchronized).
ParseMode     — JS expression/statement parsing context.
BlockContext  — markup-layer context grid (which scrml context the cursor is in).
BodyMode      — markup-tag body mode (free-text vs code-default, §4.18).
(Engine state-child catalog: see schema.map.md.)

### Authority
Native-parser design lives in scrml-support (deep-dives), NOT this repo:
`scrml-native-parser-design-2026-05-17.md` (S98 DD) and
`scrml-native-parser-front-end-charter-2026-05-20.md` (charter B).
In-repo working artifact: `docs/changes/native-parser-front-end/IMPLEMENTATION-ROADMAP.md`.

## Core Language Concepts (what the compiler processes)
V5-strict access model — two declaration forms; `<x> = init` declares, `@x` reads/writes a reactive cell (SPEC §6, §1.6).
Reactive cell — `@`-sigil state; three RHS shapes: plain, decl-coupled-with-render-spec, derived (`const <name> = expr`).
Compound state — `@compound.field` access; Variant C (SPEC §6.3).
Markup-as-value — markup is a first-class value usable in logic-context expressions (SPEC §1.4, the L1 pillar).
Context model — logic `{}`, SQL `?{}`, CSS `#{}`, meta `^{}`, foreign `_{}`; stack rules + coercion (SPEC §3, §7-§9, §22-§23).
Tier ladder — control-flow promotion: Tier 0 `if=`, Tier 1 `<match>`, Tier 2 `<engine>` (SPEC §17.0, §51.0).
`<engine>` / `<machine>` — state machine governing an enum or struct; rule= transitions, effect=, <onTransition> (SPEC §51).
`<channel>` — file-level WebSocket sync; V5-strict body auto-syncs (SPEC §38).
Route inference — server/client split + HTTP route inferred from file structure; escalation triggers (SPEC §12).
`not` — the single unified absence value; `is some` / `is not` / `given x =>` / `T | not`. null/undefined do NOT exist in scrml (SPEC §42).
`lift` keyword — value coercion / accumulation across contexts (SPEC §10).
`lin` — linear types: exactly-once consumption (SPEC §35).
`~` keyword — pipeline accumulator / lin-variable / context boundary (SPEC §32).
`fn` vs `function` — `fn` is a constrained pure function ≡ `pure function`; `function` is unconstrained (SPEC §33, §48).
Validators + auto-synthesized validity surface — 14 universal-core predicates (`req`/`length`/`pattern`/`min`/`max`/...); per-compound `isValid`/`errors`/`touched`/`submitted` (SPEC §55).
Inline type predicates — refinement types `number(>0 && <10000)`, `string(email)`; SPARK zones (SPEC §53).
Type-as-argument family (L22) — `parseVariant` / `formFor` / `schemaFor` / `tableFor` — types passed as values (SPEC §41.13-§41.15, §53.14).
`<schema>` + migrations — SQL DDL, column types, migration diff (SPEC §39).
§4.18 quoted-text model — native display-text literal; in-flight arc (docs/changes/quoted-text-model/).
Output name encoding — emitted JS var names use kind prefixes + a hash scheme (SPEC §47).

## Compiler Analysis Concepts (passes that classify, not transform)
AuthGraph — enumerates auth sites, resolves role enums, classifies each gate as
  closed-form vs gated-for-role; cross-refs auth redirects (src/auth-graph.ts, SPEC §40).
Reachability Solver — per-role playable-surface analysis + chunk planning;
  drives tree-shaking and per-route artifact splitting (src/reachability/, SPEC §40.9).
Monotonicity Classifier — classifies state cells for batch-planning safety (src/monotonicity-analyzer.ts).
Batch Planner — plans coalesced reactive updates / SQL batching (src/batch-planner.ts).
Dependency Graph — derives-from / validator-arg / engine-derives edges + cycle detection (src/dependency-graph.ts).
protect= Analyzer — server/client boundary + protected-data audit (src/protect-analyzer.ts).

## Promotion Ergonomics
`I-MATCH-PROMOTABLE` info-lint fires when an if-chain over an enum could become
a `<match>`; `bun scrml promote --match` rewrites it. `--engine` (Tier 1→2) is
CLI-locked, rewrite impl pending (SPEC §56).

## Self-Hosting Track
Two distinct scrml-authored efforts exist; do not conflate them:
- `compiler/native-parser/` — the charter-B native-parser FRONT-END (M-ladder
  above). Ships into the scrmlTS pipeline behind `--parser=scrml-native`.
- `compiler/self-host/` — earlier self-host modules (ast/bs/bpp/cg/dg/ri/ts/tab.scrml
  + dist). The post-v1.0 from-scratch hand-built compiler is a SEPARATE later effort.
The TypeScript compiler (compiler/src/) is the temporary scaffold.

## Authoritative Sources
SPEC.md (compiler/SPEC.md, 28,489+ lines, §1-§57 + appendices) — normative language spec.
SPEC-INDEX.md — section navigation map.
PIPELINE.md (compiler/PIPELINE.md) — normative stage contracts + lock map (L1-L22) + failure-mode catalog.

## Tags
#scrmlts #map #domain #compiler #pipeline #scrml-language #native-parser #composed-engines

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [structure.map.md](./structure.map.md)
- [schema.map.md](./schema.map.md)
- [error.map.md](./error.map.md)
