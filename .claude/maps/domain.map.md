# domain.map.md
# project: scrmlts
# updated: 2026-05-22T00:00:00Z  commit: 5d2003dd

The domain is the scrml COMPILER pipeline. scrml is a single-file, full-stack
reactive web language; the compiler splits server from client, wires reactivity,
routes HTTP, and emits HTML/CSS/JS. Normative authority: compiler/SPEC.md (58
sections) + compiler/PIPELINE.md. Per pa.md Rule 4, SPEC.md is normative.

## Core Concepts
FileAST            — typed AST for one .scrml file; the central data structure
                     (compiler/src/types/ast.ts:1487). Output of TAB.
Pipeline stage     — a discrete transform; each has its own diagnostic class and
                     an optional `selfHostModules` override slot.
selfHostModules    — optional overrides letting compiled-scrml modules replace
                     JS pipeline stages (splitBlocks / buildAST / runPA / runRI /
                     resolveModules / runTS / runMetaChecker / runDG / runCG / bpp).
Native parser      — the scrml-native composed-engines front-end
                     (compiler/native-parser/); replaces BS + Acorn + BPP + the
                     statechild re-tokenizers per charter B (S111). As of C2
                     (S119) it is ROUTED at the TAB seam behind `--parser=scrml-native`.
Build Story        — SPEC §58 (S118). An explicit, committed, content-addressed
                     record of *what "the compiler" is* for a build — a Merkle
                     closure. Spec-ahead: NO compiler implementation exists yet.

## Pipeline Stages — orchestrated by `compileScrml` in compiler/src/api.js
The full chain (api.js stage labels in brackets):

  Auto-gather pre-pass — expand inputFiles to transitive .scrml import closure (§21.7)
  Ghost-lint pre-pass  — lintGhostPatterns + Tailwind class lints (non-fatal)
  Stage 2  [BS]        — Block Splitter; .scrml → Block[]            (block-splitter.js)
  Stage 3  [TAB]       — Typed AST Builder; Block[] → FileAST        (ast-builder.js + tokenizer.ts).
                         C2 — when `--parser=scrml-native` is set the `_buildAST`
                         override routes the per-file parse through the native
                         parser's `nativeParseFile` (parse-file.js) INSTEAD.
  Stage 3.004 [PRECG]  — computePGOFlags + computeProgramConfig; mutates FileAST
                         with has* flags + authConfig + middlewareConfig
  Stage 3.005 [GCP1]   — Gauntlet Phase 1 checks (§21/§41/§7.6)
  Stage 3.006 [GCP3]   — Gauntlet Phase 3 equality checks (§45)
  Stage 3.007 [LINT-TRY-CATCH] — W-TRY-CATCH-IN-SCRML-SOURCE guard
  Stage 3.008 [LINT-ASYNC-USER-SOURCE] — I-ASYNC-USER-SOURCE info lint
  Stage 3.1  [MOD]     — Module Resolution; importGraph + exportRegistry  (module-resolver.js)
  Stage 3.105 [STDLIB-EXPORT-SEED] — seed exportRegistry from stdlib .scrml
  Stage 3.05 [NR]      — Name Resolution (shadow mode in P1)         (name-resolver.ts)
  Stage 3.06 [SYM]     — Symbol Table; state-cell scope tree         (symbol-table.ts)
  Stage 3.2  [CE]      — Component Expander; expands component markup (component-expander.ts)
  Stage 3.3  [VP-2/VP-3/VP-1] — Post-CE validators (invariant / attr-interp / allowlist)
  Stage 4  [PA]        — Protect Analyzer; db-block analysis         (protect-analyzer.ts)
  Stage 5  [RI]        — Route Inference; RouteMap                   (route-inference.ts)
  Stage 5.5 [MC]       — Monotonicity Classifier (§19.9.6) + E-CPS-* (monotonicity-analyzer.ts)
  Stage 6  [TS]        — Type System; cross-file type registry       (type-system.ts)
  Stage 6.4 [LINT]     — I-MATCH-PROMOTABLE info lint                (lint-i-match-promotable.js)
  Stage 6.5 [MC]/[ME]  — Meta Check + Meta Eval                      (meta-checker.ts / meta-eval.ts)
  Stage 7  [DG]        — Dependency Graph (post-meta AST)            (dependency-graph.ts)
  Stage 7.5 [BP]       — Batch Planner (§8.9-§8.11)                  (batch-planner.ts)
  Stage 7.55 [AG]      — Auth Graph derivation (§40)                 (auth-graph.ts)
  Stage 7.6 [RS]       — Reachability Solver; per-EP per-role ChunkPlans (reachability-solver.ts)
  Stage 8  [CG]        — Code Generator; emits server/client/HTML/CSS (code-generator.js → codegen/index.ts)
  Stdlib bundling      — copy runtime shims into <out>/_scrml/*.js
  Output write loop    — F-COMPILE-001 Option A preserved source tree; per-route chunk writes

## The M5 Pipeline-Swap Seam (C2 — routed)
- Live front-end: BS (block-splitter.js) + TAB (ast-builder.js + tokenizer.ts) + BPP
  + Acorn-driven `parseExprToNode`. Output: `TABOutput { filePath, ast: FileAST, errors }`.
- `--parser=scrml-native` (C2, S119) ROUTES the per-file TAB stage through the native
  parser's `nativeParseFile` (parse-file.js) instead of the live `buildAST`. The flag
  is strictly OPT-IN (`parser` defaults to `null`); every other caller runs the
  untouched live BS+TAB path. api.js also emits one I-PARSER-NATIVE-SHADOW info
  diagnostic per native-routed compile (api.js:1857). BS still runs (its `bsResults`
  feed the GCP1 raw-block-tree check); the native path simply re-parses from source.
- `nativeParseFile` returns the SAME `{ filePath, ast: FileAST, errors }` shape, so
  every downstream stage (PRECG / GCP1 / GCP3 / NR / RI / AG / CG) runs unchanged.
- The native parser produces SEPARATE catalogs (Token[], Stmt[] 20 kinds, Expr 40
  ExprKinds, Block[]). The bridge layer + C1 assembler compose them into the FileAST:
    - translate-stmt.js (R1)  — native Stmt[] → live LogicStatement[].
    - translate-expr.js (A2)  — native Expr → live ExprNode.
    - collect-hoisted.js (A3) — native Block[] → imports/exports/typeDecls/components/
      machineDecls/channelDecls/hasProgramRoot; SYNTHESIZES declaration node shapes.
      Exports isEngineBlock + synthEngineDecl.
    - parse-file.js (C1)      — `nativeParseFile` — composes parseMarkupTrace + the
      three bridges into the live FileAST; 11 per-BlockKind synth* builders; one
      shared `idGen`.
- Stage 3.004 (PRECG) was relocated S115 out of TAB precisely so a swapped-in native
  parser does not have to learn codegen-optimizer caches: computePGOFlags +
  computeProgramConfig run pipeline-agnostically against the top-level node stream.
- Dual-pipeline canary (compiler/tests/parser-conformance/dual-pipeline-canary.js) —
  the C2 proof instrument: runs LIVE and NATIVE on a source, structurally diffs the
  two FileASTs along the top-level + RECURSIVE node-kind sequences + 6 hoist counts +
  hasProgramRoot + diagnostic streams. Tags EXACT / DIFF-top-seq / DIFF-deep-seq /
  DEFERRAL-* classes.
- M5 swap scope docs: compiler/native-parser/M5-ast-bridge-scoping.md (divergence
  inventory + cost estimate), M5-divergence-ledger.md (clean-parse coverage),
  M5-SWAP-residual-decomposition.md (re-scoped residual unit decomposition).
- C2 gap-ledger: docs/changes/m5-c2-gap-ledger/investigation-2026-05-22.md sizes the
  two dominant native-vs-live divergence classes; Phase 4 fix dispatches target the
  native parser + collect-hoisted.js hoist-fold path.

## v0.7 M5-swap progress (S117-S119)
- R1 (S117) — statement-catalog bridge landed.
- R4 (S117) — SPEC §34.1 native-parser parse-diagnostics catalog seeded (66 codes).
- A2 (S118) — expression-catalog bridge landed.
- F4 (S118) — SpanTable retired (zero-consumer dead structure).
- B1-B7 (S118) — native-parser scrml-extension + core-keyword productions: B1 `?`
  propagate, B2 `!{}` guarded-expr, B3 `~`-decl, B4 `lin`, B5 `type`, B6
  `fn`/`server`/`pure` modifiers, B7 `throw`/`try` forbidden-vocab rejection.
  §34.1 grew 66→79 diagnostic codes.
- A3 (S119) — declaration/hoist synthesis landed; `typeDecls`/`components`/
  `machineDecls` synthesized by collect-hoisted.
- C1 (S119) — `nativeParseFile` FileAST assembler landed (parse-file.js).
- C2 (S119) — native-parser ROUTING swap: `--parser=scrml-native` routes the TAB
  stage through `nativeParseFile`; dual-pipeline canary landed; §34.1 +2 info codes
  (`I-NATIVE-BLOCK-DROPPED` / `I-NATIVE-BLOCK-UNMAPPED`) → 81 codes.
- M5 gap-ledger (S119) — synthStateNode (P1), segmentation fixes + engine-in-nodes
  (P3), HTML void-element support (tag-frame VOID_ELEMENTS), recursive-diff canary
  axis, no-space `<db>`/`<schema>` state recognition (STATE_FORM_KEYWORDS).

## Native Parser Charter (charter B, S111)
Replaces the WHOLE front-end — block-splitter, Acorn layer, BPP, statechild
re-tokenizers. M-ladder: M1 (lexer, COMPLETE) → M2 (expr) → M3 (stmt) →
M4 (full JS subset) → MK1-MK4 (markup) → M5 (pipeline swap behind
`--parser=scrml-native` — C1/C2 landed S119) → M6 (joint retirement; BS+Acorn+BPP
deleted). Composed-engines architecture: every state-shape construct points to an
`<engine>` (Pillar 5b discipline). .scrml files carry canonical SHAPE; 1:1 .js
shadow files carry the executable surface (M4+ swap-in concession).

## Business Invariants
- scrml SOURCE has no exceptions / no try-catch (§19.1) — values-not-exceptions.
  The native parser's B7 production REJECTS `throw`/`try` with E-THROW-NOT-IN-SCRML /
  E-TRY-NOT-IN-SCRML; translate-stmt.js treats `Throw`/`Try` as forbidden-vocab kinds.
- `null` and `undefined` do not exist in scrml; both map to `not`. `""` / `0` /
  `false` / `[]` / `{}` are DEFINED values, not absence (memory S89, absolute).
- Production builds are bit-identical with testMode disabled (§19.12.7 0-byte cost).
- The native parser is NOT a port and NOT the v1.0 self-host; Acorn is the
  conformance ORACLE, never the design template.
- Native FileAST id discipline: `nativeParseFile` threads ONE `idGen` `{ next }`
  counter through every synthesizer + collectHoisted + every translateStmtList call —
  globally-unique node ids in the file (the live ast-builder discipline).
- §58 Build Story: given the same `(source, buildStory)` pair, any party can
  reconstruct the exact compiler and produce a bit-identical artifact. SPEC-AHEAD —
  no implementation exists; §58.12 enumerates the unproven `*` guarantees.

## Aggregates / Key Modules
api.js               — pipeline orchestrator; `compileScrml`
codegen/index.ts     — Stage 8 sub-pipeline; `runCG` → ~55 emit-* modules
reachability-solver.ts — Stage 7.6; delegates to reachability/component-1..5
native-parser/lex.js — composed-engines lexer entry; 7 LexMode dispatchers
native-parser/parse-stmt.js / parse-expr.js / parse-markup.js — the three parsers
native-parser/{translate-stmt,translate-expr,collect-hoisted}.js — native→live bridge
native-parser/parse-file.js — `nativeParseFile` — the C1 FileAST assembler

## Tags
#scrmlts #map #domain #pipeline #native-parser #m5-swap #compiler #build-story

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [structure.map.md](./structure.map.md)
- [schema.map.md](./schema.map.md)
