# domain.map.md
# project: scrmlts
# updated: 2026-05-19T14:37:51-06:00  commit: 6616a69

## Core Concepts

| Concept | Definition |
|---------|------------|
| scrml | Single-file, full-stack reactive web language: one .scrml file contains markup, CSS, logic, server functions, SQL, and state — the compiler splits it into HTML + client JS + server JS |
| Pipeline | 12+ ordered stages (BS → TAB → NR → MOD → CE → UVB → PA → RI → TS → META → DG → BP → RS → CG) plus Stage 3.007 LINT-TRY-CATCH + Stage 3.105 STDLIB-EXPORT-SEED + Stage 7.55 AuthGraph + Stage 7.6 Reachability Solver |
| Reactive cell (@var) | Mutable reactive variable declared with `@name = expr`; all subscriptions update on set |
| Derived cell | Const-derived reactive variable (`const <name> = expr`); recomputed when deps change; shape:"derived" in AST |
| Engine | State machine over a reactive cell (`<engine>` tag); governs legal transitions via rule= attributes; variant-guarded markup rendering |
| State child | AST node inside an `<engine>` body representing a named variant; body is walkable AST; may carry payload binding per §51.0.B.1 (SHIPPED S99) |
| Payload binding on state-child | §51.0.B.1: three forms — bare-attribute, named, parenthesized; positional + named semantics inherit from §18.7; reserved-name precedence rule; unit-variant rejection. SPEC S98; compiler wiring CLOSED S99. |
| Match block | Pattern-match expression (`match expr { .A => ..., .B => ... }`); match-as-expression and **match-block-form (Tier-1 markup-locus)** |
| Match block-form (§18.0.1) | **Tier-1 case-analysis markup-locus — SHIPPED Phases 1+2 S107**. `<match for=Type [on=expr]> <Variant attrs>...</> ... </>` is a Tier-1 case-analysis container — the middle rung of the §17.0 Tier 0/1/2 ladder (between booleans and engines). Each arm is a `<Variant>` child element with three legal body forms (self-closing / `:`-shorthand / bare-body) + optional parenthesized payload binding `<Variant(field1, field2)>` (per Q-MB-3 reuse of §51.0.B.1 parser). Wildcard `<_>` matches any remaining variant. `rule=` is INERT here (engine-only; W-MATCH-RULE-INERT lint surfaces it); `effect=` + `<onTransition>` are FORBIDDEN here (E-MATCH-EFFECT-FORBIDDEN + E-MATCH-ONTRANSITION-FORBIDDEN). Auto-implied `on=` only legal when an `<engine for=T>` is in scope (E-MATCH-ON-REQUIRED otherwise — NEW §34 row per Q-MB-5). Exhaustiveness over `for=Type` variants required (E-MATCH-NOT-EXHAUSTIVE unless `<_>` wildcard). Carry-forward: Phase 3 codegen render dispatch (~3-5h) · Phase 4 bare-variant inference + payload-binding type-system (~2-3h) · Phase 5 samples + tests + docs (~2-3h). |
| match-block AST node | `kind: "match-block"` produced directly by ast-builder.js (NOT via the markup pipeline). Fields: `forType` (bareword struct/enum ident from `for=`) + `onExprRaw` (raw text of `on=` or null) + `armsRaw` (raw body text between opener and explicit `</match>` / `</>` closer). Phase 2's match-statechild-parser.ts re-tokenizes `armsRaw` into structured `MatchArmEntry[]`. |
| STRUCTURAL_RAW_BODY_ELEMENTS | NEW S107 — BS-layer Set in `compiler/src/block-splitter.js:123-125` gating raw-body capture for STRUCTURAL containers whose body needs downstream re-tokenization (different from `RAW_CONTENT_ELEMENTS` which is for `<pre>`/`<code>` where body is author-text for display). Currently `{"match"}`. `</match>` explicit closer required (in addition to scrml's `</>` shortcut). Eliminates `:`-shorthand vs bare-body shape-confusion that would otherwise fire E-CTX-003 on arm-children. |
| MatchArmEntry | TypeScript interface in `compiler/src/match-statechild-parser.ts`. Fields: `variantName` (PascalCase ident or `"_"` for wildcard) + `isWildcard` + `payloadBindingsRaw` + `attrs: MatchArmAttr[]` + `bodyForm: "self-closing" \| "shorthand" \| "bare-body"` + `bodyRaw` + local span offsets (`spanStart` / `spanEnd` / `openerStart`). |
| SYM PASS 20 | NEW S107 — `compiler/src/symbol-table.ts:8952+`. Walks `match-block` AST nodes; re-tokenizes via match-statechild-parser; fires 5 diagnostics in sequence: (1) E-MATCH-ON-REQUIRED (`on=` missing + no in-scope `<engine for=T>`); (2) E-MATCH-NOT-EXHAUSTIVE (variants missing + no `<_>`); (3) W-MATCH-RULE-INERT (`rule=` on any arm); (4) E-MATCH-EFFECT-FORBIDDEN (`effect=` on any arm); (5) E-MATCH-ONTRANSITION-FORBIDDEN (`<onTransition>` element in any arm body). |
| Logic block (${ }) | Imperative code block; contains let/const/reactive decls, function defs, SQL blocks, control flow |
| Meta block (^{ }) | Compile-time code execution block; evaluated at CG Stage 8; `meta.emit()` inserts HTML at the block's DOM position |
| Error-effect block (!{ }) | Pattern-matched error handler; arms match on error type |
| SQL block (?{ }) | Inline SQL query with chained method; compiled to server-only prepared statement |
| Server function | `server function name(params)` — compiled to HTTP route handler; called from client via auto-generated fetch |
| Component | Reusable markup definition; expanded at Stage 3.2 CE |
| Channel | Real-time pub/sub topic (`<channel>` tag); WebSocket/SSE backed |
| PURE-CHANNEL-FILE | A .scrml file containing `<channel>` at file top and NO `<program>`. Canonical per §38.12.6 |
| Validator | Predicate on a state cell; synthesizes validity surface (@x.isValid, @x.errors, @x.touched, @x.submitted) |
| Batch Planner | Stage 7.5 BP; coalesces SQL calls within a logic block into batched queries |
| Protect Analyzer | Stage 4 PA; identifies protected fields requiring write guards |
| Route Inference | Stage 5 RI; infers HTTP method + path for server functions and channels; produces RouteMap |
| Dependency Graph | Stage 7 DG; builds reactive cell dependency graph; detects cycles; all A-1 edges (markup-read etc.) active |
| MarkupReadDGNode (A-1.2) | Per-interpolation markup-context read node (S88 A-1.2); enables §40.9.3 closure analysis |
| AuthGraph | Stage 7.55: derived AFTER RI (needs RouteMap), BEFORE RS. Output: `gates: Map<MarkupNodeId, AuthGate>`, `roleEnum`, `gateToEntryPoint`, `redirectTargets`, `errors`. Four sub-phases A-3.1..A-3.4 CLOSED S90; wired into api.js pipeline at A-3.5 (S91). Full set: runAuthGraph() + resolveRoleEnum() + classifyGates() + crossRefRedirects() + checkLoginMissing() |
| `<auth>` element | `<auth role="admin">...</auth>` — sub-page component gate (SPEC §40.9.9). Registered in html-elements.js; `role=` attribute registered with supportsInterpolation: true |
| AuthSiteKind | "program-auth" \| "page-auth" \| "auth-role-block" \| "channel-auth" — four gate declaration sites |
| RoleClassification | Per-gate: closed_form (gated_for_role: Set<RoleVariant>) or runtime-fallback (gate_expr) |
| Reachability Solver | Stage 7.6 RS; five-component union + per-role ChunkPlan emission. A-2.1..A-2.8 ALL CLOSED at S91. Outer fixed-point operator (A-2.7) + canonical JSON serialization (A-2.8) complete |
| ChunkPlan | Per-(entry-point, role) chunk decomposition: initialChunk + prefetchTier1 + prefetchTier2 + prefetchTierN |
| Per-Route Artifact Splitter | A-4 wave FULLY CLOSED S91. route-splitter.ts orchestrates per-(EP, role, tier) chunk emission from ChunkPlan atoms. Output: per-file `<route>/<Role>.<tier>.<8-char-hash>.js` + `chunks.json` manifest |
| ChunkKey | (entryPointId, role, tier) tuple uniquely identifying one emitted JS chunk artifact |
| ChunkOutput | One emitted chunk: payloadJs (atom-composed JS), chunkHash (FNV-1a base36 8-char, SPEC §47.5), filename, byteSize |
| getCompilerIdentity() | Reads scrmlTS package.json `version` lazily, returns `"scrml-" + V` (e.g. `"scrml-0.3.3"`); cached after first call; fallback `"scrml-unknown"` on read failure. Populates `chunks.json` `compiler` field (Q-OPEN-4, CLOSED S92) |
| FNV-1a hash | Shared 32-bit base36 hash primitive at `codegen/fnv1a-hash.ts` (SPEC §47.1.3 normative). Two call sites: per-binding type-encoding (§47.1.2) and per-chunk content-addressing (§47.5). Pure-PURE; deterministic |
| Tier-1 idle prefetch | `_scrml_prefetch_tier1(chunkUrl)`: requestIdleCallback browser-side + setTimeout(fn,1) Safari fallback; wired in IIFE tail when (EP,role) admits non-empty tier-1 |
| Tier-2 hover prefetch | `_scrml_prefetch_tier2(routePath, role)`: mouseenter+focus once-listeners on `[data-scrml-prefetch]` anchors; `<a href="/internal">` wiring injects data-scrml-prefetch for exact RouteMap.pages matches |
| Tier-N on-demand dispatch | `_scrml_fetch_chunk(epId, role, tier)`: returns Promise<string> for registered tuples, JS null for unregistered; structural-scaffolding only in v0.3 |
| augmentHtmlForChunks | emit-html.ts ~295 LOC: injects `_SCRML_CHUNKS` inline manifest + `<link rel="modulepreload">` + role-detection bootstrap (localStorage > cookie > `<meta scrml-role>` > `"_anonymous"`) into each route's HTML file |
| W-CG-CHUNK-* lint family | Five warning codes fired by route-splitter.ts emitChunkLints(): W-CG-CHUNK-EMPTY + W-CG-CHUNK-LARGE + W-CG-CHUNK-NO-PREFETCH + W-CG-CHUNK-PREFETCH-UNRESOLVED + W-CG-CHUNK-MISSING-ROLE |
| Q-OPEN-5 chunkSizeBudgetBytes | Soft byte budget for W-CG-CHUNK-LARGE. Default 100,000 bytes. Configurable via `--chunk-size-budget=N` CLI flag (CLOSED S92) |
| Q-OPEN-6 prefetch split | W-CG-CHUNK-NO-PREFETCH (Info, case 1: no internal links) vs W-CG-CHUNK-PREFETCH-UNRESOLVED (Warning, case 2: internal-shaped links present but unresolved). Discriminated by `ctx.hasInternalLinks` flag. CLOSED S92 |
| `scrml generate auth` | CLI subcommand: scaffolds adopter-owned `stdlib/auth/templates/login.scrml` into project at configured loginRedirect path. Resolution path for W-AUTH-LOGIN-MISSING. Never overwrites existing adopter edits |
| Wire Format (§57) | scrml absence (`not`) encodes as `{"__scrml_absent": true}` over the wire for `T | not` return types. Dual-decoder: accepts envelope + raw JSON null. Clean-break at v1.0 |
| null / undefined eradication | ABSOLUTE. `null` and `undefined` do NOT exist in scrml. `""` / `0` / `false` are DEFINED values. Canonical absence: `not`. SPEC §42 + §42.1.1 normative |
| Tier system | Tier 1 (basic reactive): if/for/**match block-form**; Tier 2 (engines): state machines; Tier 3 (positional sugar): compound state shorthand. The §17.0 ladder; match block-form is the Tier-1 case-analysis rung (SHIPPED S107) |
| Self-host | Compiler compiled with itself; dist artifacts gitignored. Self-host is a from-scratch rewrite SHOWCASING scrml advantages — not a mechanical TS port. Post-v1.0 timeline |
| scrml:host | Stdlib module: `safeCall`, `safeCallAsync`, `HostError`. try/catch lives ONLY in compiler/runtime/stdlib/host.js — never in scrml source |
| Raw-content elements (§4.17) | `<pre>` and `<code>` — bodies are a single text run. scrml tokens (`${...}`, `<TagName>`, brace sigils) NOT recognized inside. `RAW_CONTENT_ELEMENTS` Set in block-splitter.js. S101 landing, companion §24.3.1 cross-ref |
| Tailwind typography plugin (§26.6) | `prose` / `prose-{color}` / `prose-{size}` / `not-prose` opt-out. §26.6.1 base prose styling with `:where()`+`:not(:where([class~="not-prose"] *))` selectors. §26.6.2 color variants (slate/gray/zinc/neutral/stone). §26.6.3 size variants (sm/base/lg/xl/2xl). Implemented in tailwind-classes.js +415 LOC (S100) |
| fn mutual recursion / hoisting (§48.6.4) | `fn` declarations at file scope hoist per §6.9, mirroring `function`; mutual recursion supported without source-order constraints; `pinned fn` opt-out **SHIPPED end-to-end S105** — parser recognition `dc3c460` (AST `FunctionDeclNode.isPinned?: boolean`, 6 form variants) + SYM PASS 19 forward-ref enforcement `7910162` (E-STATE-PINNED-FORWARD-REF; readPos < declSpan.start). 30 unit tests |
| SYM PASS 19 — `pinned fn` forward-ref check | `compiler/src/symbol-table.ts` line ~8390/8930: walks every CallExpr in every ExprNode payload; fires E-STATE-PINNED-FORWARD-REF when readPos < declSpan.start AND target FunctionDeclNode has `isPinned=true`. **Distinct from B4 cell+import pinned-forward-ref** (B4 uses `declSpan.end`; A4 uses `declSpan.start` because fn semantics admit self-recursion AND fn-decl spans overlap with next statement via ast-builder's `spanOf(startTok, peek())` peek-end anchor) |
| REACTIVE_BOOL_ATTRS dispatch (S105) | `compiler/src/codegen/emit-html.ts:41` — `REACTIVE_BOOL_ATTRS = new Set(["disabled", "readonly", "required"])`. Dispatch at `:1508` routes boolean-shape reactive attrs through `_scrml_effect` setAttribute/removeAttribute toggle (vs literal `attr=value` interpolation). Closes §41.14 formFor follow-on B1 (synth submit button `disabled=!@<cellName>.isValid` was silently dropping). Extension candidates: `checked`, `selected`, `hidden`, `open`, `multiple`, `loop`, `muted` — deferred until adopter friction surfaces. 13 unit tests at `compiler/tests/unit/reactive-bool-attrs.test.js` |
| tableFor (§41.16) | **FOURTH L22 family member — SHIPPED S105**. Type-driven `<table>` rendering from struct definition + rows cell. Markup-element form `<tableFor for=StructType rows=@cell pick:=[...] omit:=[...]>` per OQ-TF-1 synthesis-mode verdict 53/60 (vs Form B function-call 34/60 vs Form C block-attribute 29/60; 19-pt margin). Source-level expansion at type-system stage: walks struct fields + pick/omit filter + slot dispatch + per-cell type-driven default rendering. Opt-in `<column sortable>` per-column with auto-synth `@<varName>.sortedBy: TableSort | not` state cell. Opt-in `selectable=@cell` outer attribute with mechanical `id`-field PK derivation + `selectedBy=` override. `<empty>` slot for empty-state. 13 E-TABLEFOR-* error codes. SPEC §41.16 + emit-table-for.ts (NEW) + collectTableForImports + walkAndExpandTableForNodes + 84 tests. stdlib re-export `stdlib/data/table-for.scrml` + `TableSort:struct` type. 3 documented SPEC deviations + 7 v1.next follow-ups |
| TableSort | Stdlib struct type for tableFor sort surface: `TableSort:struct = { field: string, dir: SortDir }` + `SortDir:enum = .Asc | .Desc`. Auto-synthesized state cell `@<varName>.sortedBy: TableSort | not` is `not` until first column header click; column header click handler writes a TableSort variant. v1.next: explicit state-decl form |
| schemaFor (§41.15) | **THIRD L22 family member — SHIPPED S104**. Type-driven SQL DDL generation. FUNCTION-CALL form `${ schemaFor(StructType) }` interpolated inside `<schema>` block per OQ-SCH-1 debate verdict (Form B 50/60). Closes the §39+L4 vocabulary-unification loop waiting since L4 landed S58. Flagship value-add OQ-SCH-12: enum-typed struct fields auto-lower to `text req oneOf([variant-names...])` (closes enum-knowledge-loss-at-DB-boundary gap). emit-schema-for.ts 386L + collectSchemaForImports + walkAndExpandSchemaForCalls two-pass + 8 E-SCHEMAFOR-* codes + 62 tests |
| L22 family roster | parseVariant ✓ S65 · formFor ✓ S102-S103 · schemaFor ✓ S104 · serialize ✗ STASHED S103 (§53.14.4 Gate 2 synonym-risk) · tableFor ✓ S105 · variantNames / reflective planned. Discipline-health datum: 3 debate-05 rejections + 1 STASHED vs **4** advancements — §53.14.4 filter empirically working |
| Phase 3 select-row chip-away (S103) | Runtime-perf Phase 2 attribution dive identified LEGACY `_scrml_subscribers` O(n) walk as 90% wall on select-row. Candidate A (`91fcc72`) value-indexed predicate-bind subscription -80% wall + `!=` detector extension follow-on (`47d3bb8`) cumulative -98% wall. select-row 4.97ms → **0.12ms happy-dom + 0.30ms Chrome** (vs 168.2ms v0.3.0 STABLE = **561× faster**). Average vs React 6.1× faster (was 3.1× at P1.C) |
| Phase 3.B B2 same-keys-fast-path (SHIPPED S106) | `_scrml_reconcile_list` runtime-template.js fast-path landing AFTER empty + bulk-create fast paths, BEFORE LIS pipeline. Single forward pass; bails on first key mismatch; allocates nothing on hit. Per Q-RT3B-OPEN-1..5 ratified S105. Bench validation: partial-update 2.28ms → 1.34ms = **-42%** (in SCOPING-anticipated 30-50% band — hypothesis VALIDATED); swap-rows 3.59ms → 2.45ms = -32% (bonus). 11 new unit tests. |
| PGO C1 hasEqualityExpr (SHIPPED S106) | NEW `detectEqualityExprPresence` walker in `ast-builder.js` (throw-sentinel short-circuit DFS; `kind === "binary" && (op === "==" || op === "!=")` test); result cached on `FileAST.hasEqualityExpr`. emit-client.ts consumes the flag: when `true`, pre-activate `chunks.add("equality")`; when `false`, gate `needEquality` in the in-walk probe to skip equality-side scanning. Sibling Option-2 pattern to S102's hasResetExpr P3.B-followup. 15 new unit tests. |
| OQ-TF-13 helper extraction (S106) | `_resolveAndCheckL22TypeName` helper in type-system.ts (commit `6faf7a6`). Handles sub-case-3 (unknown type) + sub-case-4 (wrong kind) across the L22 type-as-argument family (parseVariant §41.13 / formFor §41.14 / schemaFor §41.15 / tableFor §41.16). Sub-cases 1 + 2 (missing arg / wrong-shape arg) remain caller-specific because they vary by surface form. Net +9 lines (76 ins / 67 del); pure refactor; error message bytes preserved exactly. Positions future variantNames + reflective family members to inherit the helper. |
| Phase 3.B candidate set (S104 SCOPED) | Partial-update + swap-rows targets per `docs/changes/runtime-perf-phase-3-partial-update-and-swap/SCOPING.md`. B2 SHIPPED S106. B4 count-derived dep precision (MED-HIGH; ~30-50% partial + ~20-40% swap; agent-dispatched ~3-5h; QUEUED). B3 batched microtask reconcile (GATED on B2+B4 residual). B1 array-reorder fast-path (DEFER — already fast-bailing). |
| Playwright Chrome bench port (S103) | Q-RUNTIME-OPEN-2 closed via `129fcbe` — replaces Puppeteer (legacy) with project-standard Playwright. Vanilla 5th baseline + new dated Chrome row at `benchmarks/RESULTS.md`; v0.3.0 STABLE row preserved as Historical. Chrome validates Phase 3 work: scrml wins 1/10 outright (partial-update); within 5-25% of Vanilla on every bulk-DOM op; beats React on 5/10; beats Vue on 9/10. |
| Bug-18 happy-dom env reset (G1, S105) | Test-isolation failure root cause: runtime IIFE effect leak across closures. Fix: GlobalRegistrator.unregister + register at top of bug-18 §5 (`5a7441b`). **v0.4 follow-up filed: structural cleanup of browser-test effect-leak pattern**. |
| Native parser (Mn series) | `compiler/native-parser/` — bottom-up scrml-native JS lexer replacing Acorn pre-v1.0. M1.1 (S99) + M1.2 (S100) + M1.3 (S102) + M1.4 (S103) + M1.5 (S102). M1 LADDER COMPLETE: all 7 LexMode state-children have substantive body dispatchers. |
| §51.0.Q.1 nested engine | SPEC-canonical pattern for composite state-children containing an inner `<engine>` over the same type. `var=innerLexMode` is the canonical disambiguation. |
| Named timers (§51.0.M.1) | `<onTimeout name=IDENT after=DURATION to=.Variant>` — addressable timer; `cancelTimer("IDENT")` from event-handler inside same state-child body. E-TIMER-NAME-DUPLICATE + E-TIMER-NAME-INVALID. SHIPPED S79 A5-6 Feature 1 |
| MPA shell-composition $& fix | S100 `01eeda9` + S101 `d77a60d`: `String.prototype.replace` second argument dollar-sign backreferences silently substituted; fixed by converting to function-form replace. |
| PIPELINE.md | v0.7.2 (S101 2026-05-18) — adds Stage 2 (BS) v0.next addendum for §4.17 raw-content elements. **NOTE: BS-layer S107 STRUCTURAL_RAW_BODY_ELEMENTS extension is sibling to the §4.17 mechanism but operates on STRUCTURAL containers (downstream re-tokenization required) rather than display text; no PIPELINE.md update needed yet — the pattern is recorded in block-splitter.js header docs.** |
| formFor (§41.14) | FLAGSHIP L22 family member — SHIPPED S102. `<formFor for=StructType onsubmit=fn pick=[...] />` markup-element. Source-level expansion at type-system stage. 8 error codes (E-FORMFOR-*). +58 tests |
| formFor source-level expansion | expandFormFor() in emit-form-for.ts produces AST nodes consumed identically to hand-authored Shape 2 + `<form>`. DG / VSS / CG stages receive it as ordinary scrml AST — no codegen-stage changes. Approach A: "Pillar-5 invariant — emitted output is standard scrml" |
| PGO Phase 3 (S102) | Profile-Guided Optimization wave: P3.A regex collapse (−44% pipeline) + P3.B detect-runtime-chunks fused probe (−72% cumulative) + P3.B-followup hasResetExpr (−71% additional on residual) + P3.C owner-stack (−99% findOwningRenderDGNode). Trucking-dispatch: 2326ms → ~880ms = −62% reduction. v0.3.3 tag cut at S102 `5815cf6`. **S106 follow-on: C1 hasEqualityExpr** (Option-2 sibling pattern; +15 tests). |
| hasResetExpr cache field | PGO P3.B-followup (S102): `FileAST.hasResetExpr` boolean cached at TAB time; enables O(1) gate in emit-client detectRuntimeChunks. |
| hasEqualityExpr cache field | PGO C1 (S106): `FileAST.hasEqualityExpr` boolean cached at TAB time; enables O(1) pre-activate or skip of equality runtime chunk in emit-client. Sibling to hasResetExpr. |
| owner-stack DG optimization | PGO P3.C (S102): AST-walk-derived owner-stack replaces per-call O(n) findOwningRenderDGNode scan. 99.7% reduction on findOwningRenderDGNode hotspot |
| paren-form `is not` / `is some` fix (S103) | `(expr) is not` / `(expr) is some` / `(expr) is not not` — rewrite.ts _rewriteParenthesizedIsOp no longer interposes `_scrml_tmp_N = (expr)` tmpvar. |
| runtime-perf SCOPING | CLOSED S103-S105. Phase 1 (Playwright bench port) + Phase 2 (attribution dive) + Phase 3 (select-row chip-away) SHIPPED. Phase 3.B partial-update + swap-rows scoped at sibling SCOPING; B2 SHIPPED S106; B4 queued S107. |
| **Bug-5 `${IDENT}` non-reactive interpolation (Phases 1+2 SHIPPED S107)** | Markup-as-value pillar misfire on simplest shape. **Phase 1** (`c70176e`): emit-event-wiring.ts:928 missing-else-branch fix adds one-shot textContent write at DOMContentLoaded for non-reactive (const-folded) identifiers; 19 tests; 17 regressions surfaced + fixed via kind-guard restriction. **Phase 2** (`a7fbfa8`): Anomaly B closed at emit-html.ts:1672 (stmtContainsRenderableLogic classifier gates phantom `<span data-scrml-logic>` from decl-only logic bodies) + Anomaly C closed at emit-reactive-wiring.ts:389 (orphan-filter regex elides `IDENT;` / `_scrml_reactive_get("count");` no-op JS at file-scope); 7 tests + 4 brittle pre-existing engine-event-handler-writes tests fixed. **Phase 3 carry-forward**: SPEC §7.4.2 normative section + constant-folding optimization + tilde-context threading + multi-binding placeholder dedup (~5-8h). |
| **Bug-3 `[BS]` / `[TAB]` file:line:col carry (SHIPPED S107 `2e9f9c3`)** | Closes adopter dogfood Bug 3 MED-severity internal-consistency drift: `[BS]` + `[TAB]` diagnostics now mirror `[W-LINT-*]` `path:line:col` shape. api.js `collectErrors(stageName, errors, filePath = null)` enriched with optional filePath + bsSpan→span normalization (legacy BS errors used bsSpan to avoid spread-collision). dev.js + build.js formatters mirror the lint shape. 6 unit tests. No new diagnostic codes — pure presentation-layer fix. |
| **docs/known-gaps.md (NEW S107)** | Adopter-direct curated list of spec-vs-impl drift at project root. Severity legend HIGH/MED-HI/MED/LOW-MED; status `spec'd`/`scoping`/`in-impl`/`blocked`. Initial 4 open entries (match block-form HIGH `in-impl` + Bug 5 Phase 3 HIGH `scoping` + Bug 1 Tailwind MED-HI `spec'd` + Bug 2 phantom E-SYNTAX-050 MED-HI `spec'd` + Bug 4 docs-mode escape LOW-MED `spec'd`) + 3 closed-in-S107 for reference. Closes mouth-to-reality framing the user surfaced ("v0.3.0 stable was overclaimed if 'stable' means every spec'd surface implemented"). README current-state blockquote adds "Known gaps" paragraph naming match block-form inline + linking to this file. |

## v0.3.x Status (HEAD 6616a69, 2026-05-19)

**v0.3.3** — cut at S102 tag `5815cf6`. v0.3.3 = PGO Phase 3 wave + formFor impl + runtime-perf SCOPING. pkg.json at 0.3.0 (no new tag cut S103-S107 despite substantive landings; tag/bump pairing per S94 versioning rule will fold at v0.4 release point).

**CLOSED at S107 (post-v0.3.3 patch — dogfood-bug triage cascade + match-block-form arc):**
- §18.0.1 match block-form Phases 1+2 SHIPPED end-to-end (NEW `match-statechild-parser.ts` 530L + `kind: "match-block"` AST node + STRUCTURAL_RAW_BODY_ELEMENTS BS gate + SYM PASS 20 with 5 diagnostics + SPEC §34 +1 row E-MATCH-ON-REQUIRED + §18.0.1 normative bullet; 27 unit tests) ✓
- Bug-5 Phases 1+2 SHIPPED (`${IDENT}` non-reactive interpolation; emit-event-wiring.ts:928 + emit-html.ts:1672 + emit-reactive-wiring.ts:389; 26 tests + 4 brittle pre-existing fixes; Phase 3 carry-forward) ✓
- Bug-3 SHIPPED (`[BS]` + `[TAB]` carry file:line:col; api.js collectErrors enriched; 6 tests) ✓
- Bug-6 SHIPPED (2 hallucinated error-code references retired to canonical SPEC §34 names; methodology validated Rule 4) ✓
- Match block-form SCOPING + 10 OQs (4 ratified S107 by PA-direct) ✓
- Known gaps surface NEW (`docs/known-gaps.md`; adopter-direct ledger) ✓
- README "A note from the designer" + rule= clarification + Tier-ladder table row updates ✓

**CLOSED at S106 (post-v0.3.3 patch — AFK 4-commit arc):**
- Phase 3.B B2 same-keys-in-same-order fast-path SHIPPED (`b267d36`; -42% partial-update wall; 11 new tests) ✓
- OQ-TF-13 helper extraction `_resolveAndCheckL22TypeName` SHIPPED (`6faf7a6`; shared across 4 L22 family callers; +9 LOC net; pure refactor) ✓
- PGO C1 hasEqualityExpr SHIPPED (`c491b12`; sibling to hasResetExpr Option-2 pattern; 15 new tests) ✓
- Maps incremental refresh S105 → S106 (6 maps) + 2 non-compliance fixes (runtime-perf-scoping status flip + SPEC §48.6.4 implementation-pending → SHIPPED) ✓
- 16 stale worktree-agent-* branches cleaned ✓
- Origin pull: website content sweep (50 stub pages + dark theme + 9 page flesh-outs + 2 articles + 5 error-code reference pages) ✓
- 6 dogfood bug reports filed to handOffs/incoming/ from side-session ✓

**CLOSED at S105 (post-v0.3.3 patch — multi-track):**
- §41.16 tableFor SPEC + impl SHIPPED end-to-end (FOURTH L22 family member; 84 tests) ✓
- §48.6.4 pinned fn parser-recognition (`dc3c460`) + SYM PASS 19 forward-ref enforcement (`7910162`); 30 tests ✓
- REACTIVE_BOOL_ATTRS dispatch (B1 close); 13 tests ✓
- G1 bug-18 happy-dom env reset ✓

**CLOSED at S104 (post-v0.3.3 patch — schemaFor SHIPPED):**
- §41.15 schemaFor SPEC + impl SHIPPED end-to-end (THIRD L22 family member; 62 tests) ✓
- Phase 3.B SCOPING + 4 candidates ranked ✓
- 5 non-compliance derefs → scrml-support/archive ✓

**CLOSED at S103 (post-v0.3.3 patch — runtime-perf + L22 + Playwright):**
- Phase 3 select-row chip-away (-98% wall; 561× Chrome) ✓
- Playwright Chrome bench port (Q-RUNTIME-OPEN-2 closed) ✓
- paren-form `is not` / `is some` codegen fix ✓

**CLOSED at S102 (v0.3.3):**
- PGO Phase 3: P3.A + P3.B + P3.C + P3.B-followup ✓
- §41.14 formFor SPEC + impl ✓
- M1.5 template-mode tracking ✓

**Pending (post-v0.3.3, mid-tier carry-forward at S108 open):**
- **Match block-form Phase 3 codegen render dispatch (~3-5h; HIGH priority)**
- **Match block-form Phase 4 bare-variant inference + payload-binding type-system (~2-3h)**
- **Match block-form Phase 5 samples + tests + docs (~2-3h)**
- **Bug-5 Phase 3 polish (SPEC §7.4.2 normative + constant-folding + tilde-context + multi-binding placeholder dedup; ~5-8h)**
- **Bug 1 Tailwind arbitrary-value classes** (HIGH; floor lint fix small, full fix medium)
- **Bug 2 phantom E-SYNTAX-050** (MED-HI; needs bisecting reducer first)
- **Bug 4 docs-mode escape** (LOW-MED; needs deep-dive on design space)
- Phase 3.B B4 count-derived dep precision (agent-dispatched ~3-5h; OQs ratified S105)
- formFor v1.next: B2 registerRenderer / B3 @label / B4 auto-recurse / B5 L2 label-store (~12-22h aggregate)
- PGO Phase 3 follow-ons C2/C3/C4 (~8-14h aggregate; C1 SHIPPED S106)
- 7 newly-surfaced tableFor v1.next follow-ups
- M2: expression parser in scrml
- Self-host bootstrap broken-import-path investigation (S102 carry; unaddressed)
- v1.0 follow-up: structural cleanup of browser-test effect-leak pattern
- stdlib/http async migration (4 try-catch sites)
- engine `:`-shorthand follow-up (orthogonal; same shape as match Phase 2 fix; same BS-layer trap but engine state-children have additional structural needs)
- formFor + schemaFor + tableFor combined sample app + scrml.dev refresh → v0.4 anchor (DEFER unless raised)

## Business Invariants

- No SQL execution calls may appear in client JS output (E-CG-006)
- No server-environment access (process.env, Bun.env) may appear in client JS output
- Engine transitions must match a declared rule= arm or throw E-ENGINE-001-RT at runtime
- Exception (§51.0.F.1): engine self-writes are runtime NO-OPs — no E-ENGINE-INVALID-TRANSITION
- Lin-declared variables must be consumed exactly once; unconsumed or double-consumed raises E-LIN-* at compile time
- Tilde-declared variables must be used; E-TILDE-001 on drop
- Batch Planner excludes .nobatch() SQL nodes from all coalescing candidate sets (§8.9.1)
- `null` / `undefined` are NOT valid scrml tokens in any context (SPEC §42, E-SYNTAX-042)
- `""` / `0` / `false` / `[]` / `{}` are DEFINED values — NOT absence (SPEC §42.1.1)
- `===` / `!==` are NOT valid in scrml source (E-EQ-004)
- `bun:` and `node:` prefixed imports are server-context-only (E-IMPORT-007)
- Server-function return types `T | not` encode absence as `{"__scrml_absent": true}` wire envelope (SPEC §57)
- `<auth>` blocks without `role=` AND without `check=` are malformed gates (E-AUTH-GRAPH-004)
- Apps using `<auth role=...>` variant-referencing gates with no app-scope role enum get E-CLOSURE-002
- Chunk hash MUST NOT equal CHUNK_HASH_PLACEHOLDER ("00000000") at chunk surface — regression-guard invariant (A-4.6 assertion)
- Two builds of the same source MUST produce byte-identical chunk payloads AND byte-identical chunk hashes (§40.9.8 determinism normative)
- W-CG-CHUNK-NO-PREFETCH and W-CG-CHUNK-PREFETCH-UNRESOLVED are mutually exclusive per Q-OPEN-6 (hasInternalLinks discriminator)
- `<pre>` and `<code>` bodies are NOT parsed for scrml tokens — they are raw-content text runs (§4.17)
- Engine state-child payload-binding MUST NOT shadow reserved attribute names {rule, effect, history, internal:rule} — E-ENGINE-PAYLOAD-RESERVED-COLLISION (§51.0.B.1)
- Engine state-child payload binding on a UNIT variant (no payload fields) raises E-ENGINE-PAYLOAD-ON-UNIT-VARIANT (§51.0.B.1)
- `<formFor for=StructType>` requires `for=` to be a bare struct-type ident; quoted strings / unknown types / non-struct types all fire E-FORMFOR-TYPE-NOT-STRUCT (§41.14.1)
- `<formFor pick=[...] omit=[...]>` cannot specify BOTH pick= AND omit= — fires E-FORMFOR-PICK-OMIT-CONFLICT (§41.14.5)
- `(expr) is not` / `(expr) is some` codegen must NOT interpose undeclared tmpvar — single-evaluation intrinsic to paren form (S103 fix)
- **`<match for=Type>` is a Tier-1 case-analysis locus; `rule=` on arms is INERT (W-MATCH-RULE-INERT), `effect=` is FORBIDDEN (E-MATCH-EFFECT-FORBIDDEN), `<onTransition>` is FORBIDDEN (E-MATCH-ONTRANSITION-FORBIDDEN). Engine semantics (§51) DO NOT apply at match locus.**
- **`<match for=Type>` requires `on=` attribute UNLESS an `<engine for=Type>` is in scope to provide auto-implied subject; otherwise E-MATCH-ON-REQUIRED fires (NEW §34 row per Q-MB-5 S107).**
- **`<match for=Type>` arm-set must cover every variant of Type OR include a `<_>` wildcard arm; otherwise E-MATCH-NOT-EXHAUSTIVE fires (§18.0.1 normative; SYM PASS 20).**
- **`<match>` block-form body MUST close with explicit `</match>` (not just `</>`) per STRUCTURAL_RAW_BODY_ELEMENTS BS gate (NEW S107).**

## Diagnostic First-Fire-Sites (S90-S107)

| Code | Severity | File | Description | Session |
|------|----------|------|-------------|---------|
| W-CG-UNDEFINED-INTERPOLATION | warning | codegen/lint-undefined-interpolation.ts | Bare `undefined` in compiled JS (M-7C-D-12 Track 3) | S90 |
| I-AUTH-REDIRECT-UNRESOLVED | info | auth-graph.ts crossRefRedirects() | Gate redirect target not in RouteMap.pages (A-3.4) | S90 |
| E-AUTH-GRAPH-002 | error | auth-graph.ts resolveRoleEnum() | Multiple role enums in same compilation unit (A-3.2) | S90 |
| W-AUTH-RUNTIME-FALLBACK | info | reachability/component-4.ts | Async-only auth check; static classification impossible (A-2.5) | S90 |
| E-CLOSURE-002 | error | reachability/component-4.ts | Auth-role-block gates with no app-scope role enum (A-2.5) | S90 |
| W-AUTH-PAGE-INFERRED | info | auth-graph.ts classifyGates() | Page lacks explicit auth= with program auth=required (A-3.3) | S90 |
| E-CLOSURE-001 | error | reachability/outer-fixpoint.ts | Fixed-point non-termination; iteration cap reached (A-2.7) | S91 |
| W-AUTH-LOGIN-MISSING | warning | auth-graph.ts checkLoginMissing() | Auth gates present but no login page at loginRedirect path; two-tier severity (A-3.5) | S91 |
| W-CG-CHUNK-EMPTY | warning | codegen/route-splitter.ts emitChunkLints() | Entry-point produces zero non-empty chunks (A-4.7) | S91 |
| W-CG-CHUNK-LARGE | warning | codegen/route-splitter.ts emitChunkLints() | Initial chunk exceeds soft size budget (A-4.7, Q-OPEN-5 configurable) | S91 |
| W-CG-CHUNK-NO-PREFETCH | info | codegen/route-splitter.ts emitChunkLints() | Multi-route app, no internal links at all — Info (Q-OPEN-6 case 1) | S91/S92 |
| W-CG-CHUNK-PREFETCH-UNRESOLVED | warning | codegen/route-splitter.ts emitChunkLints() | Internal-shaped links present but unresolved — Warning (Q-OPEN-6 case 2) | S92 |
| W-CG-CHUNK-MISSING-ROLE | warning | codegen/route-splitter.ts emitChunkLints() | `<auth role=X>` role not in reachability record (A-4.7) | S91 |
| E-ENGINE-PAYLOAD-ON-UNIT-VARIANT | error | type-system.ts §51.0.B.1 pass | Payload binding on a unit-variant state-child | S99 (wired) |
| E-ENGINE-PAYLOAD-ARITY-MISMATCH | error | type-system.ts §51.0.B.1 pass | Binding count != variant payload field count | S99 (wired) |
| E-ENGINE-PAYLOAD-RESERVED-COLLISION | error | type-system.ts §51.0.B.1 pass | Payload binding name shadows reserved state-child attribute | S99 (wired) |
| E-FORMFOR-TYPE-NOT-STRUCT | error | type-system.ts §41.14 pass | `for=` missing/quoted/unknown/non-struct (4 sub-cases) | S102 |
| E-FORMFOR-SLOT-UNKNOWN | error | type-system.ts §41.14 pass | Slot name not in struct fields or "submit" | S102 |
| E-FORMFOR-PICK-INVALID-FIELD | error | type-system.ts §41.14 pass | pick= not array-of-strings or unknown field | S102 |
| E-FORMFOR-OMIT-INVALID-FIELD | error | type-system.ts §41.14 pass | omit= not array-of-strings or unknown field | S102 |
| E-FORMFOR-PICK-OMIT-CONFLICT | error | type-system.ts §41.14 pass | Both pick= and omit= present | S102 |
| E-FORMFOR-ONSUBMIT-SIGNATURE | error | type-system.ts §41.14 pass | Handler arg type mismatch or zero args | S102 |
| E-FORMFOR-ERROR-STRATEGY-INVALID | error | type-system.ts §41.14 pass | error-strategy= not "per-field"/"summary"/"both" | S102 |
| E-FORMFOR-NESTED-STRUCT-NO-SLOT | error | type-system.ts §41.14 pass | Struct-typed field with no slot override | S102 |
| E-SCHEMAFOR-TYPE-NOT-STRUCT | error | type-system.ts §41.15 pass | `schemaFor(X)` arg missing/quoted/unknown/non-struct | S104 |
| E-SCHEMAFOR-INVALID-CALL-CONTEXT | error | type-system.ts §41.15 Pass B | `schemaFor(...)` outside `<schema>` body | S104 |
| E-SCHEMAFOR-PICK-INVALID-FIELD | error | type-system.ts §41.15 pass | pick: not array-of-strings or unknown field | S104 |
| E-SCHEMAFOR-OMIT-INVALID-FIELD | error | type-system.ts §41.15 pass | omit: not array-of-strings or unknown field | S104 |
| E-SCHEMAFOR-PICK-OMIT-CONFLICT | error | type-system.ts §41.15 pass | Both pick: and omit: present | S104 |
| E-SCHEMAFOR-NESTED-STRUCT-NO-FK-V1 | error | type-system.ts §41.15 pass | Struct-typed field with no v1.0 FK derivation | S104 |
| E-SCHEMAFOR-VARIANT-PAYLOAD-ENUM-V1 | error | type-system.ts §41.15 pass | Payload-bearing enum field rejected v1.0 | S104 |
| E-SCHEMAFOR-NO-MAPPING | error | type-system.ts §41.15 pass | Struct field type has no shared-core lowering | S104 |
| E-TABLEFOR-TYPE-NOT-STRUCT | error | type-system.ts §41.16 pass | `for=` missing/quoted/unknown/non-struct | S105 |
| E-TABLEFOR-ROWS-MISSING | error | type-system.ts §41.16 pass | `<tableFor for=T>` missing `rows=` attr | S105 |
| E-TABLEFOR-ROWS-WRONG-TYPE | error | type-system.ts §41.16 pass | `rows=@cell` not `T[]` matching `for=T` | S105 |
| E-TABLEFOR-PICK-INVALID-FIELD | error | type-system.ts §41.16 pass | pick: not array-of-strings or unknown field | S105 |
| E-TABLEFOR-OMIT-INVALID-FIELD | error | type-system.ts §41.16 pass | omit: not array-of-strings or unknown field | S105 |
| E-TABLEFOR-PICK-OMIT-CONFLICT | error | type-system.ts §41.16 pass | Both pick: and omit: present | S105 |
| E-TABLEFOR-COLUMN-FIELD-UNKNOWN | error | type-system.ts §41.16 pass | `<column field="X">` field unknown to struct or excluded by pick/omit | S105 |
| E-TABLEFOR-NESTED-STRUCT-NO-SLOT | error | type-system.ts §41.16 pass | Struct-typed field with no `<column>` slot override | S105 |
| E-TABLEFOR-VARIANT-PAYLOAD-ENUM-V1 | error | type-system.ts §41.16 pass | Payload-bearing enum field rejected v1.0 | S105 |
| E-TABLEFOR-NO-DISPLAY-MAPPING | error | type-system.ts §41.16 pass | Struct field has no default display lowering AND no slot | S105 |
| E-TABLEFOR-SORTABLE-REQUIRES-CELL-ROWS | error | type-system.ts §41.16 pass | `<column sortable>` requires `rows=@cell` reactive cell | S105 |
| E-TABLEFOR-NO-PRIMARY-KEY | error | type-system.ts §41.16 pass | `selectable=@cell` with no `id` field + no `selectedBy=` | S105 |
| E-TABLEFOR-SELECTABLE-CELL-WRONG-TYPE | error | type-system.ts §41.16 pass | `selectable=@cell` cell wrong type (deferred to downstream) | S105 |
| E-STATE-PINNED-FORWARD-REF | error | symbol-table.ts SYM PASS 19 | Call to `pinned fn` before its declaration source-position | S105 |
| **E-MATCH-ON-REQUIRED** | **error** | **symbol-table.ts SYM PASS 20** | **`<match for=T>` missing `on=` AND no in-scope `<engine for=T>` (NEW §34 row per Q-MB-5)** | **S107** |
| **E-MATCH-NOT-EXHAUSTIVE** | **error** | **symbol-table.ts SYM PASS 20** | **`<match for=T>` arm-set missing variants AND no `<_>` wildcard** | **S107** |
| **W-MATCH-RULE-INERT** | **warning** | **symbol-table.ts SYM PASS 20** | **`rule=` declared on any `<match>` arm — rule= is engine-only** | **S107** |
| **E-MATCH-EFFECT-FORBIDDEN** | **error** | **symbol-table.ts SYM PASS 20** | **`effect=` declared on any `<match>` arm — effect= is engine-only** | **S107** |
| **E-MATCH-ONTRANSITION-FORBIDDEN** | **error** | **symbol-table.ts SYM PASS 20** | **`<onTransition>` element inside any `<match>` arm body — onTransition is engine-only** | **S107** |

## Domain Events (Compiler Pipeline)

| Event | When | Where |
|-------|------|-------|
| CompileContext populated | After analysis, before emission | codegen/index.ts |
| BindingRegistry seal | After HTML emit, before client JS emit | codegen/index.ts |
| `pushArmContext / popArmContext` | Around each engine state-child body emit | emit-variant-guard.ts |
| `drainMachineCodegenErrors` | After all machine emission | codegen/emit-machines.ts |
| channel placement pre-check | UVB Stage 3.3 | validators/ast-walk.ts |
| LINT-TRY-CATCH walk | Stage 3.007 | validators/lint-try-catch.ts |
| STDLIB-EXPORT-SEED | Stage 3.105 | api.js |
| wire-format encoder injection | Post-server-JS emit, if return type includes `| not` | codegen/emit-server.ts |
| lint-undefined-interpolation scan | Post-CG emission, before output write | codegen/lint-undefined-interpolation.ts |
| emitPerRouteChunks | Post-emit phase, when emitPerRoute=true | codegen/index.ts → route-splitter.ts |
| emitChunkLints | Post-per-route-emission, per entry-point | codegen/route-splitter.ts |
| augmentHtmlForChunks | Post-emit, when emitPerRoute=true + chunks manifest ready | codegen/emit-html.ts |
| raw-content element passthrough | BS Stage 2: RAW_CONTENT_ELEMENTS.has(lowerTagName) — body becomes text run | block-splitter.js |
| **structural raw-body passthrough (NEW S107)** | **BS Stage 2: STRUCTURAL_RAW_BODY_ELEMENTS.has(lowerTagName) — body captured as single text run for downstream re-tokenization** | **block-splitter.js** |
| §41.14 formFor expansion | Type-system stage §41.14 pass — expandFormFor() produces synth AST nodes in-place | type-system.ts → emit-form-for.ts |
| **§18.0.1 match-block SYM walk (NEW S107)** | **Symbol-table SYM PASS 20 — re-tokenizes match-block.armsRaw via match-statechild-parser; fires 5 diagnostics** | **symbol-table.ts → match-statechild-parser.ts** |
| assembleRuntime deferred | PGO P3.B: runtime assembly deferred to post-emit phase; runtime placeholder spliced in | emit-client.ts |
| Bug-3 collectErrors filePath stamp | api.js: per-file stage error collection enriches with filePath (S107) | api.js |

## Aggregates

| Aggregate | File | Owns |
|-----------|------|------|
| FileAST | compiler/src/types/ast.ts | All ASTNodes for one .scrml file; hasResetExpr cache field (PGO P3.B-followup); **hasEqualityExpr (PGO C1 S106)** |
| CompileContext | compiler/src/codegen/context.ts | BindingRegistry, FileAnalysis, EncodingContext, error list, hasPrefetchableLinks, hasInternalLinks |
| BindingRegistry | compiler/src/codegen/binding-registry.ts | EventBinding[], LogicBinding[] |
| FileAnalysis | compiler/src/codegen/analyze.ts | Pre-computed AST slices |
| AuthGraph | compiler/src/types/auth-graph.ts | gates Map, roleEnum, gateToEntryPoint, redirectTargets, errors — Stage 7.55 output |
| ReachabilityRecord | compiler/src/types/reachability.ts | closures Map<EntryPointId, RolePlayableSurface> — Stage 7.6 output |
| ChunksManifest | compiler/src/codegen/route-splitter.ts | Map<ChunkKey, ChunkOutput> + compiler identity field — per-route artifact index |
| FormForExpansion | compiler/src/codegen/emit-form-for.ts | Pipeline-input contract; built by type-system §41.14 pass; consumed by expandFormFor() |
| **MatchArmEntry[]** | **compiler/src/match-statechild-parser.ts** | **Phase 2 output; consumed by SYM PASS 20 (5 diagnostics) and future Phase 3 codegen. Each entry has variantName / isWildcard / payloadBindingsRaw / attrs / bodyForm / bodyRaw + local span offsets** |

## Task-Shape Routing

| Task shape | Where to look |
|------------|---------------|
| A-2 Reachability Solver | FULLY CLOSED S91 — reachability-solver.ts + reachability/ submodule (8 files) |
| A-3 AuthGraph | FULLY CLOSED S91 — auth-graph.ts; types/auth-graph.ts |
| A-4 per-route artifact splitter | FULLY CLOSED S91 — codegen/route-splitter.ts + atom-emitter.ts + fnv1a-hash.ts + emit-html.ts augmentHtmlForChunks + runtime-template.js + runtime-chunks.ts |
| A-5 integration tests | FULLY CLOSED S92 |
| Q-OPEN-4/5/6 | CLOSED S92 |
| §51.0.B.1 payload-binding | SPEC landed S98 (Track 1); compiler wiring (Track 2) CLOSED S99 |
| §51.0.M.1 named timers + cancelTimer | SHIPPED S79 A5-6 Feature 1 |
| §26.6 typography plugin | CLOSED S100 |
| §4.17 raw-content elements | CLOSED S101 — block-splitter.js RAW_CONTENT_ELEMENTS Set + PIPELINE.md v0.7.2 + SPEC §24.3.1 cross-ref |
| §48.6.4 fn mutual recursion / hoisting | SHIPPED end-to-end S105 |
| §41.14 formFor | SHIPPED S102 |
| §41.15 schemaFor | SHIPPED S104 |
| §41.16 tableFor | SHIPPED S105 |
| REACTIVE_BOOL_ATTRS dispatch | SHIPPED S105 |
| **§18.0.1 + §18.0.2 match block-form** | **SHIPPED Phases 1+2 S107** — block-splitter.js (STRUCTURAL_RAW_BODY_ELEMENTS + COMPOUND_LIFT_EXEMPT_TAGS extension) + ast-builder.js `kind: "match-block"` dispatch + NEW match-statechild-parser.ts (530L) + symbol-table.ts SYM PASS 20 (5 diagnostics) + SPEC §34 +1 row + §18.0.1 normative bullet + 27 unit tests. **Phases 3+4+5 carry-forward**: codegen render dispatch (~3-5h) + bare-variant inference + payload-binding type-system (~2-3h) + samples/tests/docs (~2-3h) |
| Phase 3 select-row chip-away | CLOSED S103 (-98% wall; 561× Chrome) |
| Phase 3.B B2 same-keys fast-path | SHIPPED S106 (-42% partial-update; 11 tests) |
| Phase 3.B B4 count-derived dep precision | QUEUED — `docs/changes/runtime-perf-phase-3-partial-update-and-swap/SCOPING.md`; Q-RT3B-OPEN-1..5 ratified S105 |
| PGO C1 hasEqualityExpr | SHIPPED S106 — sibling Option-2 pattern to hasResetExpr |
| OQ-TF-13 helper extraction | SHIPPED S106 `6faf7a6` — `_resolveAndCheckL22TypeName` in type-system.ts; shared across formFor/schemaFor/tableFor/parseVariant callers |
| Playwright Chrome bench | CLOSED S103 |
| MPA shell-composition $& fix | CLOSED S100/S101 |
| Native parser M1 ladder | M1.1-M1.5 COMPLETE (S99-S103); M2 expression parser pending |
| PGO Phase 3 | CLOSED S102 (P3.A+P3.B+P3.B-followup+P3.C); follow-on C1 SHIPPED S106 |
| paren-form `is not` codegen fix | CLOSED S103 |
| **Bug-3 `[BS]` / `[TAB]` file:line:col carry** | **CLOSED S107 — api.js collectErrors + dev.js + build.js formatters; 6 tests; no new codes** |
| **Bug-5 Phases 1+2 `${IDENT}` non-reactive interpolation** | **CLOSED S107 — emit-event-wiring.ts + emit-html.ts + emit-reactive-wiring.ts; 26 tests + 4 brittle pre-existing fixes; Phase 3 polish carry-forward** |
| **Bug-6 hallucinated error-code references** | **CLOSED S107 — docs/website/pages/ 2 retired-rename fixes to canonical SPEC §34 names (E-ENGINE-STATE-CHILD-MISSING + E-PURE-001); Rule 4 methodology validated** |
| stdlib/http async migration | stdlib/http/index.scrml lines 65/264 (W-TRY-CATCH fires) |
| null/absence migration | docs/changes/null-eradication-*, undefined-eradication-*, stdlib-phase-1-5-null-sweep |
| Chunk content-addressing | codegen/fnv1a-hash.ts + route-splitter.ts |
| **Adopter-facing gap audit / "what's known to not work?"** | **docs/known-gaps.md (NEW S107) → linked impl SCOPINGs under docs/changes/** |
| runtime-perf SCOPING | CLOSED S105 — Phase 1+2+3 SHIPPED S103-S105. Phase 3.B sibling SCOPING active |

## Tags
#scrmlts #map #domain #concepts #pipeline #engine #reactive #s107 #v0.3.3 #formfor #spec-41-14 #schemafor #spec-41-15 #tablefor #spec-41-16 #l22-4-of-6 #TableSort #pinned-fn-shipped #spec-48-6-4 #sym-pass-19 #sym-pass-20 #match-block #spec-18-0-1 #spec-18-0-2 #e-match-not-exhaustive #w-match-rule-inert #e-match-on-required #structural-raw-body-elements #bug-3-file-line-col #bug-5-const-interpolation #bug-6-retired-codes #known-gaps #reactive-bool-attrs #phase-3-select-row #phase-3b-b2-shipped #pgo-c1-shipped #oq-tf-13-shipped #playwright-bench #561x-chrome #approach-a #approach-a2 #approach-a3 #approach-a4 #approach-a5 #reachability #auth-graph #wire-format #null-eradication #route-splitter #fnv1a-hash #chunk-prefetch #generate-auth #q-open-4 #q-open-5 #q-open-6 #native-parser #m1-5 #m1-ladder-complete #raw-content #typography #payload-binding #named-timers #spec-51-0-b-1 #spec-4-17 #spec-26-6 #pgo-phase-3 #hasResetExpr #hasEqualityExpr #paren-form-fix #dq-12 #runtime-perf #g1-bug-18 #dogfood-bugs

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [error.map.md](./error.map.md)
- [schema.map.md](./schema.map.md)
- [test.map.md](./test.map.md)
