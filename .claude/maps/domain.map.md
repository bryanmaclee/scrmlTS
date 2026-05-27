# domain.map.md
# project: scrmlts
# updated: 2026-05-27T04:14:32Z  commit: f6c98ed8

The domain is the scrml COMPILER pipeline. scrml is a single-file, full-stack reactive
web language; the compiler splits server from client, wires reactivity, routes HTTP, and
emits HTML/CSS/JS. Normative authority: `compiler/SPEC.md` (30552 lines, last mod 2026-05-26;
sections through §58 Build Story) + `compiler/PIPELINE.md`. Per pa.md Rule 4, SPEC.md is normative.

## Core Concepts

| Concept | Definition |
|---|---|
| `FileAST` | typed AST for one .scrml file; central data structure (types/ast.ts:1487); output of TAB |
| Pipeline stage | a discrete transform; each has its own diagnostic class and optional `selfHostModules` override |
| Native parser | scrml-native composed-engines front-end (compiler/native-parser/); replaces BS+Acorn+BPP per charter B; routed at TAB seam behind `--parser=scrml-native` since C2 (S119) |
| Native walker | structured walk over native block trees (compiler/src/native-walker/); replaces text-rescanners for structured AST consumers |
| M5 SWAP seam | C2 API routing point; `--parser=scrml-native` swaps `_buildAST` to `nativeParseFile` |
| Iteration (`<each>`) | LANDED S131 (§17.7) — Tier-1 structural-markup iteration. `<each in=@items>` (item) / `<each of=N>` (count); `@.` contextual sigil = current item/index; `<empty>` fallback; inferred `key=`. Tier 0 (`${ for/lift }`, §17.4) stays valid with `W-EACH-PROMOTABLE` nudge |
| `@.` contextual sigil | LANDED S131 (§3.4) — "the value in the current iteration scope"; resolves only inside an `<each>` body; not a reserved name (sigils are not identifiers, so V5-strict-compatible) |
| Lifecycle annotation `(A to B)` | LANDED S130-S131 (§14.3/§14.12) — per-struct-field pre/post-transition type pair; access-before-transition fires `E-TYPE-001`; `transition()` is the compile-time progression marker. Legacy `(A -> B)` glyph still resolves with `W-LIFECYCLE-LEGACY-ARROW` |
| `transition()` | LANDED S131 (§14.12.6.3) — compile-time-only marker built-in; hybrid (presence-discrimination implies it; explicit call required for variant-progression) |
| §6.8.3 `reset × lifecycle` | **SPEC LANDED S134; IMPL LANDED S135** — normative interaction rule: `reset(@cell)` on a lifecycle-annotated cell reverts per-access transition state based on the reset value's type membership (pre-type `A` → revert to "pre"; post-type `B` → maintain/advance "post"). Two trackers in type-system.ts: Tracker 1 (cell-value Shape 1) + Tracker 2 (struct-typed Shape 1 with field lifecycle). Q6-narrow commit `2ffe4f6a`. |
| Shape 1 per-access tracker | B-prereq LANDED S134 (Bug 19 HIGH) — `runCellValueLifecycleAccessCheck` in type-system.ts extends lifecycle E-TYPE-001 tracking to `state-decl` AST nodes (`<state>: (A to B) = init`) at §14.12.10; closes the pre-S134 struct-field + fn-return only gap |
| Source-form lifecycle follow-ups | LANDED S135 — Fix #1 (`findTopLevelArrow` whitespace tolerance for bare-dot variant annotations), Fix #3 (`parseLifecycleReturnAnnotation` qualified-enum stripping + diagnostic text), Fix #3 companion (`TRANSITION_CALL_RE` `@` prefix tolerance). Closes source-form gap for Shape 1 variant-progression lifecycle: `(.Draft to .Published)` + `(Article.Draft to Article.Published)` both work end-to-end from source. |
| §6.6.18 alias-escape gap | CLOSED S134 (A4) — `AliasRecord` interface + PASS 2.c `walkRegisterLocalAliases` in symbol-table.ts extends L21 walker to cover aliased mutation forms (`let local = @cell; local.foo = x`) per SPEC §6.6.18 |
| JS_HOST_FORBIDDEN | NEW S134 (Bug 17) — `meta-checker.ts` set + `checkJsHostGlobals` walker; categorical §22.12 enforcement: JS-host ambient globals (`bun`, `process`, `setInterval`, `fetch`, etc.) are forbidden inside `^{}` regardless of compile-time vs runtime classification |
| `E-STRUCTURAL-ELEMENT-MISPLACED` — `${...}` silent-swallow class | LANDED S135 — `STRUCTURAL_ELEMENT_PLACEMENT` table + `leadingTagName()` in ast-builder.js; 9 structural-declaration elements (`<schema>`, `<engine>`, `<channel>`, `<page>`, `<auth>`, `<errors>`, `<onTransition>`, `<onTimeout>`, `<onIdle>`) inside a `${...}` logic body now fire the diagnostic instead of being silently swallowed as html-fragment raw text. `<match>` (block-form) intentionally excluded — it is markup-as-value and is canonical inside `${...}`. |
| `bun scrml promote --each` | LANDED S134 (Iteration Landing 3, §56.10) — `applyEachRewrite` + `promoteEachOnFile` in promote.js; lifts Tier-0 `${ for (let x of @items) { lift <markup/> } }` → `<each in=@items>...</each>`; `--shorthand` flag auto-applies `:`-shorthand for single-expression-body sites |
| MCP descriptor sidecar | compile-time JSON introspection surface (engines/forms/channels/serverfns) emitted unconditionally to `<outputDir>/` by api.js; read by the `scrml:mcp` runtime helpers; MCP-V0 (A-E LANDED) |
| `<program mcp>` | LANDED S130-S131 (MCP-V0.D) — opt-in attribute; auto-flips `emitPerRoute:true` + injects `scrml:mcp` boot import into `_server.js`; `mode:"dev-only"|"always"` |
| Build Story | SPEC §58; spec-ahead — no implementation exists yet |
| `scrml:compiler` | KNOWN-DEFERRED stdlib family (SPEC §41.17) |

## Pipeline Stages — orchestrated by `compileScrml` in compiler/src/api.js

| Stage | Label | File | Notes |
|---|---|---|---|
| Auto-gather pre-pass | — | api.js | expand inputFiles to transitive .scrml import closure (§21.7) |
| Ghost-lint pre-pass | — | lint-ghost-patterns.js + lints | non-fatal; W-LINT-013 scope-gate (S122) |
| Stage 2 | BS | block-splitter.js | Block[] from .scrml; Unit CC: `TOPLEVEL_AT_WRITE_RE` lifts bare `@x = expr`; `each` registered as Tier-1 structural container (S131) |
| Stage 3 | TAB | ast-builder.js | Block[] → FileAST; C2: `--parser=scrml-native` routes through `nativeParseFile`; each-block dispatch (S131, ast-builder.js:10969) — produces `kind:"each-block"` node from `<each in=/of=>` markup (+293); **S135: `STRUCTURAL_ELEMENT_PLACEMENT` + `leadingTagName()` added; E-STRUCTURAL-ELEMENT-MISPLACED now fires at parseLogicBody html-fragment fallback sites (ast-builder.js 13103 LOC total)** |
| Stage 3.004–3.008 | PRECG/GCP1/GCP3/LINT-* | api.js | PGO flags, gauntlet checks, lint-try-catch, lint-async-user-source |
| Stage 3.1 | MOD | module-resolver.js | module resolution; S122 aliased imports |
| Stage 3.05 | NR | name-resolver.ts | name resolution; `spec.local` |
| Stage 3.06 | SYM | symbol-table.ts | symbol table; 21 PASSes; V-kill E-STATE-UNDECLARED + Unit CC E-WRITE-NOT-IN-LOGIC-CONTEXT; PASS 11 uses `engine-statechild-walker.ts` (M6.6.b.2); **A4 S134: PASS 2.c `walkRegisterLocalAliases` + `AliasRecord` closes §6.6.18 alias-escape gap; symbol-table.ts now 10445 LOC (+659)** |
| Stage 3.2 | CE | component-expander.ts | M6.2b LANDED: `reparseSynthesizedFile` → `nativeParseFile` (progressive) |
| Stage 3.3 | VP | validators/ | post-CE invariant, attr-interp, allowlist (W-ATTR-002) |
| Stage 4 | PA | protect-analyzer.ts | protect analyzer |
| Stage 5 | RI | route-inference.ts | route inference |
| Stage 5.5 | MC | monotonicity-analyzer.ts | monotonicity classifier (§19.9.6) + E-CPS-* |
| Stage 6 | TS | type-system.ts | cross-file type registry; §14.3 lifecycle-annotation registry + access-before-transition scan (E-TYPE-001 / E-TYPE-LIFECYCLE-ON-ENGINE-CELL / E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED / W-LIFECYCLE-LEGACY-ARROW); **B-prereq S134 (Bug 19 HIGH): `runCellValueLifecycleAccessCheck` adds Shape 1 per-access tracker (§14.12.10); Q6-narrow S135: `RESET_CALL_RE` + reset-aware Pass in `processStatementText` closes §6.8.3 (SPEC-ahead bullet CLOSED); source-form fixes S135 (Fix #1 + Fix #3 + companion); type-system.ts now 15601 LOC (+396 S135)** |
| Stage 6.4 | LINT | lint-i-match-promotable.js / lint-i-fn-promotable.js / lint-w-each-key.js / lint-w-each-promotable.js (S131) | I-MATCH-PROMOTABLE + I-FN-PROMOTABLE + W-EACH-KEY-001 + W-EACH-PROMOTABLE |
| Stage 6.5 | MC/ME | meta-checker.ts / meta-eval.ts | M6.1 LANDED: meta-eval → nativeParseFile; **S133: `META_BUILTINS` narrow (bun.eval retirement); S134 Bug 17: `JS_HOST_FORBIDDEN` set + `checkJsHostGlobals` walker (categorical §22.12); meta-checker.ts now 2262 LOC (+160)** |
| Stage 7 | DG | dependency-graph.ts | dependency graph; E-DG-002 has-readers accounting (each-block consumers, +50) |
| Stage 7.5 | BP | batch-planner.ts | batch planner (§8.9–§8.11) |
| Stage 7.55 | AG | auth-graph.ts | auth graph derivation (§40) |
| Stage 7.6 | RS | reachability-solver.ts | reachability solver (5 components) |
| Stage 8 | CG | code-generator.js → codegen/index.ts | HTML/CSS/server JS/client JS; M6.3 emit-match → nativeParseFile; each-block codegen via emit-each.ts (S131); ~snapshot orphan-sigil fix Bug 15 (S131); **rewrite.ts now 2304 LOC** |
| Stdlib bundling | — | api.js `bundleStdlibForRun` | copy runtime shims into `<out>/_scrml/*.js`; scrml:mcp bundles only on `<program mcp>` opt-in |
| MCP sidecar emission | — | api.js (output write loop) | MCP-V0.A: `buildMcpDescriptors(tabResults)` → writes engines/forms/channels/serverfns .json unconditionally |
| MCP boot injection | — | commands/build.js | MCP-V0.D (S130-S131): when `<program mcp>` present, inject `scrml:mcp` boot import into `_server.js` (dev-only NODE_ENV gate or always) |
| Output write loop | — | api.js | F-COMPILE-001 Option A preserved source tree |

## The M5 Pipeline-Swap Seam (C2 — routed, S119)

- `--parser=scrml-native` routes per-file TAB through `nativeParseFile` (parse-file.js). Strictly OPT-IN. BS still runs; every downstream stage runs unchanged.
- Bridge layer (native → live FileAST):
  - `translate-stmt.js` (R1) — native Stmt[] → live LogicStatement[]. R4 COMPLETE. M6.5.b.2 `makeStateDeclNode` StateDecl arm. +112 S127-S129 (D-class: server/pure modifier on `function`, `given` guard, `-> ReturnType` annotation translation).
  - `translate-expr.js` (A2) — native Expr → live ExprNode. Complete S118.
  - `collect-hoisted.js` (A3) — M6.4a P2-Form1 + cross-file shapes.
  - `parse-file.js` (C1) — `nativeParseFile`; 1280L (+243); M6.5.b.5/b.6 native→live FileAST shape (Class F) + span.file (Class G); M6.5.b.4 bare `?{}` → kind:"sql" promotion (closes server-SQL-to-client leak).
- Dual-pipeline canary (`parser-conformance-canary.test.js`) — M6.7 STOP; phase-A flag flip reverted; C/D-class parity fixes landed.

## M6 Wave 1 + M6.5/M6.7 Status (HEAD f6c98ed8)

| Milestone | Status |
|---|---|
| M6.1 meta-eval / M6.2a/b / M6.3 emit-match / M6.4a | LANDED |
| M6.5 no-op proof | PROVEN |
| M6.5.b.0 within-node canary | LANDED |
| M6.5.b.1 match-arm newline + Dot-UpperIdent | LANDED (S125) |
| M6.5.b.2 structural-decl `<ident>` LHS | PARTIAL (Option B) |
| **M6.5.b.2.1 newline-as-stmt-separator** | **LANDED (S127) — consecutive structural state-decl boundary** |
| **M6.5.b.3 hoist-recursion regression-lock** | **LANDED (S127) — Class C gap already CLOSED** |
| **M6.5.b.4 bare `?{}` → kind:"sql"** | **LANDED (S127) — closes M6.7-STOP server-SQL-to-client leak** |
| **M6.5.b.5/b.6 native→live FileAST shape (Class F) + span.file (Class G)** | **LANDED (S127) — within-node -48022** |
| M6.6.b.1/b.1.5/b.2/b.3 | LANDED |
| M6.7 phase-A flag flip | STOP — REVERTED |
| **M6.7-C1/C2 component + codegen output parity** | **LANDED (S128) — same-file E-COMPONENT-020 + mount-hydrate flip clusters** |
| **M6.7-D1/D2/D3/D6/D7/D8a-i parity-completeness** | **LANDED (S128-S129) — null/undefined primary, server/pure on `function`, `:>` match-arm, string-literal import, `given` guard, `-> ReturnType` annotation** |
| **M6.7-D4 object-literal bucket** | **EMPTY at HEAD (STOP-and-report; 5th stale label)** |
| M6.6.b.4..b.6, M6.8 | PENDING |

## Iteration — Implementation Status (S131-S134, §17.7)

The Tier-1 `<each>` structural iteration surface. HU-1 (`docs/heads-up/iteration-design-2026-05-25.md`) ratified 8-of-8 questions; Phase 2 amendment scope = 5 landings.

| Landing | Status | Surface |
|---|---|---|
| Landing 1 — compiler-source impl | **LANDED (S131, commit 23db318c)** | `emit-each.ts` (618L) + `lint-w-each-key.js` + `lint-w-each-promotable.js` + ast-builder.js each-block dispatch + `@.` + `<empty>` + key= inference |
| Landing 2 — SPEC catch-up | **LANDED (S131)** | SPEC §17.7 NEW + §17.4 Tier-0 marking + §3.4 `@.` sigil + §56.10 `promote --each` CLI spec + SPEC-INDEX regen |
| Landing 3 — `bun scrml promote --each` CLI | **LANDED (S134, commit 3a660c7c)** | `applyEachRewrite` + `rewriteOneIteration` + `promoteEachOnFile` in promote.js (1649L); `--shorthand` flag; `--dry-run`, `--check`, `--exclude` all supported |
| Landing 4 — kickstarter amendment | PENDING (Q8 scope) | |

`@.` outside an `<each>` body → `E-SYNTAX-064` (queued in SPEC §34; NOT yet emitted). `E-EACH-ITER-SHAPE` (missing-or-both `in=`/`of=`) is SPEC-row/comment-only at HEAD. The corpus 113-site Tier-0→Tier-1 migration is gradual (the `W-EACH-PROMOTABLE` sunset path).

## Lifecycle Annotation — Implementation Status (S130-S135, §14.3/§14.12)

`(A to B)` per-struct-field lifecycle annotation. HU (`docs/heads-up/lifecycle-annotation-extension-2026-05-25.md`) ratified all 7 questions; Approach C (source-cascade).

| Landing | Status | Surface |
|---|---|---|
| Landing 1 — E-TYPE-001 access-before-transition | **LANDED (S130, commit 5bc1a2e4)** | closes the SPEC §14.3 6+ week gap; emitted at type-system.ts + emit-logic.ts |
| Landing 2 — Approach C ext + engine-cell fire + glyph migration | **LANDED (S131, commit 3840e07d)** | `E-TYPE-LIFECYCLE-ON-ENGINE-CELL` fire + `(A -> B)` → `(A to B)` glyph migration (`W-LIFECYCLE-LEGACY-ARROW`) |
| Landing 2.5 — fn-return transition-marker | **LANDED (S131, commit ea7c44d5)** | hybrid (e) presence + (a) variant-progression; `transition()` built-in (§14.12.6.3); `E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED` |
| B-prereq — Shape 1 per-access tracker | **LANDED (S134, commit fd58893e)** | `runCellValueLifecycleAccessCheck` in type-system.ts closes Bug 19 HIGH; §14.12.10 coverage |
| Q6-narrow — §6.8.3 reset × lifecycle impl | **LANDED (S135, commit 2ffe4f6a)** | `RESET_CALL_RE` + reset-aware Pass in `processStatementText`; Tracker 1 (cell-value Shape 1) + Tracker 2 (struct-typed Shape 1); +355/-10 type-system.ts; closes §6.8.3 SPEC-ahead-of-impl bullet; 25 tests in `lifecycle-shape1-reset.test.js` |
| Source-form follow-ups | **LANDED (S135)** | Fix #1 `findTopLevelArrow` whitespace tolerance; Fix #3 `parseLifecycleReturnAnnotation` qualified-enum stripping; Fix #3 companion `TRANSITION_CALL_RE` `@` tolerance; 17 tests in `lifecycle-shape1-source-form.test.js`; 3 new LOW bugs filed (Bug 23/24/25) |

## S133-S135 New Landings

| Item | Status | Surface |
|---|---|---|
| A4 — §6.6.18 alias-escape gap | **LANDED S134** | `AliasRecord` + PASS 2.c `walkRegisterLocalAliases` in symbol-table.ts; L21 walker covers aliased mutation forms |
| Bug 17 — JS_HOST_FORBIDDEN categorical walker | **LANDED S134** | `JS_HOST_FORBIDDEN` set + `checkJsHostGlobals` in meta-checker.ts (2262L); §22.12 categorical E-META-001 |
| §6.8.3 + §14.12.10 normative statements | **SPEC LANDED S134** | SPEC.md +75L; reset × lifecycle interaction |
| `META_BUILTINS` narrow / rewriteBunEval retire | **LANDED S133** | `bun.eval()` user-facing surface retired; Approach C (§22.12) subsumes it |
| Q6-narrow reset × lifecycle impl | **LANDED S135** | type-system.ts +396L; closes §6.8.3 SPEC-ahead bullet; 25 new tests |
| Source-form lifecycle follow-ups | **LANDED S135** | 3 surgical fixes in type-system.ts; 17 new source-form tests |
| E-STRUCTURAL-ELEMENT-MISPLACED `${...}` class | **LANDED S135** | ast-builder.js `STRUCTURAL_ELEMENT_PLACEMENT` + `leadingTagName()`; 9 structural elements now fire instead of silent-swallow; 19 new tests; `<match>` excluded (markup-as-value) |
| Bugs 21–27 filed | **S135** | 7 new LOW/heuristic/cleanup items in `docs/known-gaps.md` |
| Phase-1c PRIMER + kickstarter catch-up | **LANDED S135** | 7 clusters N/M/K/J/H/I/L; all 26 F-XXX audit gaps closed; `docs/PA-SCRML-PRIMER.md` + kickstarter-v2 updated |

## MCP V0 — Implementation Status (S125-S131; Sub-units A-E ALL LANDED)

The 11-tool MCP DevTools surface is FULLY IMPLEMENTED (the MCP V0 series is COMPLETE).

| Sub-unit | Status | Surface |
|---|---|---|
| A — descriptor extractor | **LANDED + TESTED** — `codegen/mcp-descriptors.ts` (922L); A↔B contract fixed (compoundKeys nested, cellKey emitted) | engines/forms/channels/serverfns .json sidecars |
| B — runtime read helpers | **LANDED** — `runtime/stdlib/mcp.js` | `install`/`loadSidecars`/`getCurrentVariant`/`getFormStatus`/`getChannelState` |
| C — 11-tool surface + stdio boot | **LANDED** — `mcp.js` (~860L) | `TOOL_NAMES` (11 LOCKED) + `startMcpServer`/`shutdownMcpServer` |
| D — `<program mcp>` opt-in wiring | **LANDED (S130-S131)** — `compute-program-config.ts` McpConfig + api.js auto-`emitPerRoute` + build.js boot-import injection | `mode:"dev-only"\|"always"` |
| E — E2E + adopter docs + fixture | **LANDED (S131, commit 152797ee)** — `integration/mcp-v0-e2e.test.js` + multi-page app fixture + `docs/adopter/mcp-setup.md` | series complete |

Authority: `docs/changes/mcp-v0-devtools-scoping/SCOPING.md`. The 11 LOCKED tool names are a public-API contract — any doc enumerating them must match `TOOL_NAMES` in `mcp.js` exactly.

## Native-Walker Pattern (M6.6.b.2 precedent)

1. Author `compiler/src/native-walker/<walker>.ts` with structured walk over native block stream.
2. Discriminated branch at the call site: native path when block stream available; legacy text-rescanner as fallback for synthetic ASTs.
3. Import `parseRuleAttrValue` (canonical rule= parser) from legacy module verbatim — reused, not replaced.
4. Dual-pipeline parity test in `compiler/tests/unit/m66-b2-engine-statechild-walker.test.js`.

## Business Invariants

- scrml SOURCE has no exceptions / no try-catch (§19.1) — values-not-exceptions.
- `null` and `undefined` do not exist in scrml; both map to `not`. `""` / `0` / `false` / `[]` / `{}` are DEFINED values (memory S89, absolute).
- No async/await in scrml SOURCE; `!{}` is the call-site error handler.
- Native FileAST id discipline: ONE `idGen` threaded through all synthesizers.
- §58 Build Story: given `(source, buildStory)`, bit-identical artifact. SPEC-AHEAD.
- **V-kill invariant (S123)**: `@name = expr` inside fn/function/user `${...}` is a WRITE; no phantom cells; E-STATE-UNDECLARED on miss.
- **Unit CC invariant (S123)**: bare `@name = expr` at default-logic body-top fires E-WRITE-NOT-IN-LOGIC-CONTEXT; exemption via `unit-cc-exemption-list.json`.
- **Iteration invariant (S131)**: `<each>` is Tier 1; Tier 0 (`${ for/lift }`) stays valid (additive promotion, never deprecating). `@.` is a contextual sigil legal only inside an `<each>` body; `<each of=N>` defaults `key=@.`. `<empty>` SHALL NOT reference `@.`.
- **Lifecycle invariant (S130-S135)**: a `(A to B)` field's post-transition (`B`) members SHALL NOT be accessed before the variant-discriminating `transition()` — E-TYPE-001. Lifecycle annotation is undefined on engine-cell positions (E-TYPE-LIFECYCLE-ON-ENGINE-CELL). Legacy `->` glyph resolves identically to `to` (W-LIFECYCLE-LEGACY-ARROW info-lint). **S134**: Shape 1 plain reactive cells (`<state>: (A to B) = init`) are covered by the per-access tracker per §14.12.10. **S135**: `reset(@cell)` on a lifecycle-annotated cell REVERTS per-access state when the written value satisfies the pre-type `A`; stays/advances to "post" when it satisfies post-type `B` (§6.8.3, Q6-narrow LANDED).
- **§6.6.18 alias invariant (S134)**: in-place mutation of a `const`-derived cell is forbidden whether via `@cell.foo = x` (L21 PASS 6 original) or through a local alias (`let local = @cell; local.foo = x`) (PASS 2.c AliasRecord extension).
- **§22.12 JS_HOST_FORBIDDEN invariant (S134)**: JS-host ambient globals (`bun`, `process`, `setInterval`, `fetch`, and family) SHALL fire E-META-001 inside `^{}` blocks regardless of compile-time vs runtime classification.
- **`${...}` structural-placement invariant (S135)**: structural-declaration elements (`<schema>`, `<engine>`, `<channel>`, `<page>`, `<auth>`, `<errors>`, `<onTransition>`, `<onTimeout>`, `<onIdle>`) SHALL NOT appear inside a `${...}` logic body — E-STRUCTURAL-ELEMENT-MISPLACED fires instead of silent-swallow. `<match>` (block-form) is excluded — it is markup-as-value and canonical inside `${...}`.
- **~snapshot invariant (S131 Bug 15)**: an orphan `~` (no preceding `~ IDENT = expr` initializer) SHALL NOT leak the sigil into emitted JS — the bare-expr Phase 3 fast path skips it; emitIdent has a defensive `null` fallback.
- **MCP V0 invariant**: descriptor sidecars are emitted UNCONDITIONALLY; empty-app graceful degradation (`[]`). `dispatchable:false` is PERMANENT v0 (read-only enumeration). `<program mcp>` is zero-cost for non-adopters (null config → no compile-time effect).
- **M6.7 STOP invariant**: the phase-A flag flip was attempted but reverted; C/D-class parity-completeness fixes landed independently of the flip. M6.7-D4 (object-literal bucket) is EMPTY at HEAD.

## Aggregates / Key Modules

| Module | Notes |
|---|---|
| `compiler/src/api.js` | pipeline orchestrator; `compileScrml`; MCP sidecar emission + `<program mcp>` auto-`emitPerRoute` |
| `compiler/src/type-system.ts` | **15601 LOC** (was 15205; +396 S135 Q6-narrow + source-form fixes); lifecycle-annotation registry + access-before-transition scan + Shape 1 per-access tracker + **Q6-narrow `RESET_CALL_RE` + reset-aware pass (§6.8.3)** + **Fix #1/Fix #3/Fix #3-companion (source-form follow-ups)** |
| `compiler/src/symbol-table.ts` | **10445 LOC** (was 9786; +659 S134 A4); 21 PASSes; PASS 11 native-walker; **PASS 2.c `walkRegisterLocalAliases` + `AliasRecord` closes §6.6.18 alias-escape gap** |
| `compiler/src/ast-builder.js` | **13103 LOC**; each-block dispatch (+293); each-block node synthesis; **S135: `STRUCTURAL_ELEMENT_PLACEMENT` + `leadingTagName()` + E-STRUCTURAL-ELEMENT-MISPLACED fire at parseLogicBody html-fragment fallback sites** |
| `compiler/src/meta-checker.ts` | **2262 LOC** (was ~2100; +160 S133-S134); `META_BUILTINS` narrow; **`JS_HOST_FORBIDDEN` set + `checkJsHostGlobals` (Bug 17, §22.12 categorical)** |
| `compiler/src/meta-eval.ts` | 665 LOC; M6.1 LANDED: meta-eval → nativeParseFile; S133: rewriteBunEval path retired |
| `compiler/src/commands/promote.js` | **1649 LOC** (new: +large S134); `--match` SHIPPED (S66); **`--each` LANDED S134 (Iteration Landing 3)** — `applyEachRewrite` + `promoteEachOnFile` + `--shorthand`; `--engine` Tier C deferred stub |
| `compiler/src/codegen/emit-each.ts` | LANDED S131 (618L) — `<each>` iteration codegen |
| `compiler/src/codegen/rewrite.ts` | 2304 LOC; `rewriteNotKeyword` delegates to `rewriteCodeSegments` (GITI-017); ~snapshot fix Bug 15; 6nz-S guards |
| `compiler/src/lint-w-each-key.js` / `lint-w-each-promotable.js` | LANDED S131 — W-EACH-KEY-001 / W-EACH-PROMOTABLE |
| `compiler/src/compute-program-config.ts` | McpConfig `<program mcp>` extraction (+69) |
| `compiler/src/commands/build.js` | MCP boot-import injection (+94) |
| `compiler/src/codegen/mcp-descriptors.ts` | MCP-V0.A — 4 descriptor extractors |
| `compiler/runtime/stdlib/mcp.js` | MCP-V0.B/C/D — read helpers + 11-tool surface + stdio boot |
| `compiler/native-parser/parse-stmt.js` | M6.7-D class — null/undefined primary, server/pure on function, given guard, return-type annotation (+412) |
| `compiler/native-parser/parse-expr.js` | M6.7-D3 `:>` match-arm; M6.5.b.1 match-arm (+230) |
| `compiler/native-parser/parse-file.js` | C1 assembler (1280L; +243) |
| `codegen/rewrite.ts` / `emit-logic.ts` / `emit-expr.ts` | ~snapshot orphan-sigil fix Bug 15 (S131) |

## Tags
#scrmlts #map #domain #pipeline #native-parser #m5-swap #m6-wave1 #m6-7-dclass #compiler #build-story #v-kill #unit-cc #iteration #each #at-dot-sigil #lifecycle #to-glyph #transition-marker #lifecycle-shape1-tracker #lifecycle-reset-aware #alias-escape #js-host-forbidden #structural-in-logic-body #e-structural-element-misplaced #promote-each-landed #mcp-v0 #mcp-descriptors #mcp-program-attr #snapshot-fix #s131 #s133 #s134 #s135

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [structure.map.md](./structure.map.md)
- [schema.map.md](./schema.map.md)
