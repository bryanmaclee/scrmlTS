# primary.map.md
# project: scrmlts
# updated: 2026-05-20T00:30:00Z  commit: df1211d

## Project Fingerprint
Language:   JavaScript / TypeScript (mixed .js + .ts); Bun runtime
Framework:  Custom compiler — scrml language compiler + LSP server + native lexer (Mn series)
Runtime:    Bun >= 1.3.13
Type:       Compiler + CLI tool + LSP server + 21-module stdlib + native lexer (M1 ladder complete)
Size:       ~1,870+ source files (excluding node_modules/dist/.git);
            compiler/src ~120 .ts/.js files (includes match-statechild-parser.ts S107 + emit-form-for.ts S102 + emit-table-for.ts S105 + **NEW emit-match.ts S108 (~430L) + const-fold-env.ts S108 (~155L)**);
            compiler/native-parser/ 17 .scrml/.js shadow pairs + README (M1.1-M1.5 complete);
            SPEC.md ~27,900+ lines (**§7.4.2 NEW S108 Bug-5 P3 normative ~60L; §4.17 amended S108 Bug-4 C-narrow cross-ref; §26.4/§26.5 Tailwind full-fix expansion; §41.14.7 Codegen subsection (formFor B5); §34 +1 row W-TAILWIND-UNRECOGNIZED-CLASS**; §34 +1 row E-MATCH-ON-REQUIRED at S107 + §18.0.1 normative bullet; §41.16 tableFor +~210L at S105); SPEC-INDEX.md; PIPELINE.md v0.7.2 (S101);
            samples/compilation-tests: ~311 .scrml fixtures;
            Tests: **723 files** (full pre-push gate) — **16,147 pass / 169 skip / 1 todo / 0 FAIL** (S108 HEAD);
            pre-commit subset: **13,304 pass / 88 skip / 1 todo / 0 fail / 690 files / 44,794 expect**;
            v0.3.3 tag at S102 `5815cf6`; pkg.json at 0.3.3 (no new tag cut S103-S108)

## Key Facts (S108 / post-v0.3.3 era — 2026-05-19, commit df1211d)

**Current shipped version: v0.3.3** (tag `5815cf6` at S102 close). v0.3.0 stable baseline at `13154ba`.

**S108 — 20-commit landing arc closing 5 HIGH/MED-HI adopter surfaces end-to-end (since S107 close `c91fae0`):**

- **Match block-form Tier 1 case-analysis CLOSED end-to-end (Phases 3+4):** Phase 3 (`ef9d219`) NEW `compiler/src/codegen/emit-match.ts` (~430 LOC) consumer reusing variant-source-agnostic `emit-variant-guard.ts:emitVariantGuardedRender` helper (factored S78 specifically for this future reuse); SPEC §18.0.1 + §18.0.2 + §18.0.3 + §51.0.B.1 normative shapes all realized; on= resolution Shape A subscribe / Shape B effect / auto-implied via in-scope engine; tree-shake on all-empty arms; multiple match-blocks per file → independent dispatchers indexed by AST id; 9 unit tests. Phase 4 (`204b303`) `:`-shorthand body codegen via parseExprToNode + synthesized `logic > bare-expr` AST routed through generateHtml's interpolation case; constants fold via Bug 5 P3; cells emit placeholder + reactive binding; 6 unit tests.
- **Bug 5 `${IDENT}` const-interpolation arc CLOSED end-to-end (Phase 3 + SPEC §7.4.2):** Phase 3 (`811181e`) constant-folding Option γ (canonical adopter shape `const VERSION = "v0.3.0"` + `${VERSION}` folds inline at compile time — zero placeholder + zero JS wiring + zero runtime cost); NEW `compiler/src/codegen/const-fold-env.ts` (~155 LOC, cached env via `partiallyEvaluateExpr`); `_constantFolded` marker threads through `collect.ts` + `emit-reactive-wiring.ts` to suppress orphan literal at file-scope; SPEC §7.4.2 NEW normative section (60 lines) authorizes the optimization; 14 unit tests; closes Bug 5 arc end-to-end (Phase 1+2 S107 + Phase 3 S108).
- **Bug 1 Tailwind FLOOR + FULL fix in 3 waves:** Floor (`0b2a8fe..dce4f06`, agent-dispatched, 5 commits): NEW `W-TAILWIND-UNRECOGNIZED-CLASS` info-level lint at SPEC §34 + §28 + §26.5; firing on any class-name token in `class="..."` that doesn't resolve via the embedded Tailwind registry; suppressible via `compilerSettings.lintTailwindUnrecognizedClass = "off"`; 34 tests. Wave 1 (`37f8f62..e9bd611`, agent-dispatched, 3 commits): grid/flex/aspect families + underscore-as-space + ratio + grid-track CSS functions; 66 unit tests. Wave 2 (`bdb9287`, PA-direct): transition/timing family + cubic-bezier/steps function support + modern individual transform props + outline family; 26 unit tests. Wave 3 (`a40ac64`, PA-direct): `transform-*` shorthand + 9 directional decl-transforms + 14 more function names in VALID_MATH_FUNCTIONS; 23 unit tests.
- **formFor B5 L2 label-store consultation** (`b261274`) — closes wired-but-unconsumed `registerLabels` runtime; emit-form-for.ts buildFieldGroup emits `${(typeof _scrml_label_for === "function" ? _scrml_label_for(...) : "Mechanical Default")}` per `<label>` position; defensive typeof guard for `messages` chunk tree-shake; SPEC §41.14.7 amended with Codegen subsection.
- **Bug 4 `?{` C-narrow** (`eba8ded`) — was catastrophic EOF-cascade when bare `?{` appeared in markup-text body (scrml-about-scrml prose); deep-dive at `scrml-support/docs/deep-dives/bug-4-docs-mode-escape-2026-05-19.md` (530 lines, 11 prior-art systems analyzed, 372 workaround occurrences in adopter corpus, 86% of pages used entity-escapes) ratified Approach C-narrow per SPEC §3.1 + §8.1 conformance ("SQL is a child of Logic, not markup-text"); implementation removed `?{` recognition from block-splitter.js markup-text loop (~1 line + comment block); SPEC §4.17 amended with sibling locus-gating principle cross-ref; 8 dedicated tests + 3 existing block-splitter tests updated to C-narrow semantics.
- **PGO Phase 3 C2 fold compile-time perf** (`1bf2135..ae9bca4`, agent-dispatched, 3 commits) — `detectMarkupForStmtChunkPresence` TAB-time walker caches `hasChunkedMarkupTag` + `hasForStmt` booleans on FileAST; emit-client.ts gates `buildFunctionBodyRegistry` (skip when no for-stmt) + elides markup tag-test per-node when no chunked-markup-tag; mirrors S102 hasResetExpr + S106 hasEqualityExpr Option-2 pattern; 25 unit tests.

**S107 dogfood + match-block-form arc (9 substantive commits since S106 close `c491b12`):**

- **Bug 5 Phase 1+2 SHIPPED (S107 `c70176e` + `a7fbfa8`)** — closed dogfood Bug 5 HIGH-severity `${IDENT}` non-reactive interpolation. **Phase 1**: `emit-event-wiring.ts:928` missing-else-branch fix adds one-shot textContent write at DOMContentLoaded for non-reactive identifiers (const-folded); 19 unit tests + tilde-guard; 17 regressions surfaced + fixed via kind-guard restriction. **Phase 2**: closed Anomalies B + C — phantom `<span data-scrml-logic>` from decl-only logic bodies + orphan `IDENT;` / `_scrml_reactive_get("count");` no-op JS at file-scope. `emit-html.ts:1672` `stmtContainsRenderableLogic` classifier (gates synth-span emission on body content) + `emit-reactive-wiring.ts:389` orphan-filter regex (matches `IDENT;` / `IDENT.path;` / `_scrml_reactive_get("x");` pure-read shapes); 7 tests + 4 brittle pre-existing tests fixed (engine-event-handler-writes `_scrml_attr_onclick_2` hardcoding → regex).
- **Match block-form Phase 1+2 SHIPPED (S107 `82c48fd` + `c91fae0`)** — closes SPEC §18.0 silent acceptance gap (entire `<match>` block-form was opaque html-fragment pass-through). **Phase 1**: structured AST node — one-line BS fix added `<match>` to `COMPOUND_LIFT_EXEMPT_TAGS` (`block-splitter.js:140`); `ast-builder.js:10521+` produces `kind: "match-block"` AST node with `forType` + `onExprRaw` + `armsRaw`; 9 unit tests. **Phase 2**: full structural validation + 5 diagnostics — NEW `compiler/src/match-statechild-parser.ts` (530 lines) recognizing 3 body forms (self-closing / `:`-shorthand / bare-body) + wildcard `<_>` + parenthesized payload bindings + `STRUCTURAL_RAW_BODY_ELEMENTS` BS gate (raw-body capture mirrors `<pre>`/`<code>` precedent; `</match>` explicit closer) + NEW SYM PASS 20 in `symbol-table.ts:8952+` firing 5 diagnostics (W-MATCH-RULE-INERT / E-MATCH-EFFECT-FORBIDDEN / E-MATCH-ONTRANSITION-FORBIDDEN / E-MATCH-NOT-EXHAUSTIVE / E-MATCH-ON-REQUIRED) + SPEC §34 +1 row + §18.0.1 normative bullet; 18 unit tests; `:`-shorthand limitation closed. **Match-block-form arc status:** Phases 1+2 SHIPPED; Phase 3 codegen render dispatch queued (~3-5h); Phase 4 bare-variant inference + payload-binding type-system integration queued (~2-3h); Phase 5 samples + tests + docs queued (~2-3h).
- **Bug 3 SHIPPED (S107 `2e9f9c3`)** — closes dogfood Bug 3 (MED, internal-consistency): `[BS]` + `[TAB]` diagnostics now carry `file:line:col` prefix matching `[W-LINT-*]` shape. `api.js:570+` `collectErrors` enriched with optional `filePath` parameter + `bsSpan→span` normalization; `dev.js` + `build.js` formatters mirror W-LINT-* `path:line:col` shape; 6 unit tests at NEW `bug-3-diagnostic-file-paths.test.js`.
- **Bug 6 SHIPPED (S107 `c4d1114`)** — closes dogfood Bug 6 (MED, DOC-DRIFT): 2 hallucinated error-code references in `docs/website/pages/` retired to canonical SPEC §34 names (E-ENGINE-INCOMPLETE-COVERAGE → E-ENGINE-STATE-CHILD-MISSING + E-PURE-VIOLATION → E-PURE-001). Methodology validated Rule 4 — canonical catalog had the answers; predicted-drift list was based on prior-mental-model.
- **Match-block-form SCOPING (S107 `b4a8db1`)** — README `rule=` clarification investigation traced silent acceptance to opaque html-fragment fallthrough; SCOPING.md authored with 5-phase plan (~12-19h aggregate) + 10 OQs (4 ratified S107: Q-MB-1 new `match-block` AST kind / Q-MB-3 reuse §51.0.B.1 parenthesized payload parser / Q-MB-5 new E-MATCH-ON-REQUIRED §34 row / Q-MB-7 cut-over with no migration window — pre-flight grep confirmed zero adopter usage); README `rule=` clarification + Tier-ladder table row updates bundled in same commit.
- **Known gaps surface (S107 `a3629fe`)** — NEW `docs/known-gaps.md` adopter-direct curated list of spec-vs-impl drift (severity legend HIGH/MED-HI/MED/LOW-MED; status `spec'd`/`scoping`/`in-impl`/`blocked`). Initial entries: 4 open (match block-form HIGH `in-impl` + Bug 5 Phase 3 HIGH `scoping` + Bug 1 Tailwind MED-HI `spec'd` + Bug 2 phantom E-SYNTAX-050 MED-HI `spec'd` + Bug 4 docs-mode escape LOW-MED `spec'd`) + 3 closed-in-S107 for reference. README current-state blockquote adds "Known gaps" paragraph naming match block-form inline + linking to the file.
- **README "A note from the designer" (S107 `f5d35b6`)** — user-authored personal note inserted between tagline + v0.3.0 STABLE blockquote (~96% AI-written disclosure + 3-years-of-compiler-self-study backstory + closing "are the ideas any good?" question); docs-only, no compiler.

**L22 family roster at S107 close (unchanged from S105):** parseVariant ✓ S65 · formFor ✓ S102-S103 · schemaFor ✓ S104 · serialize ✗ STASHED S103 (§53.14.4 Gate 2 synonym-risk) · tableFor ✓ S105 · variantNames / reflective planned. Discipline-health datum: 3 debate-05 rejections + 1 STASHED vs 4 advancements — §53.14.4 filter empirically working.

**All Approach A sub-waves remain FULLY CLOSED (v0.3.0 baseline):**
- A-2 Reachability Solver (S91), A-3 AuthGraph (S91), A-4 Per-Route Splitter (S91), A-5 Integration Tests (S92). Q-OPEN-4/5/6 closed S92.

## Map Index

| Map                      | Status  | Contents |
|--------------------------|---------|----------|
| structure.map.md         | present | directory layout, entry points; **emit-match.ts (NEW S108, ~430L) + const-fold-env.ts (NEW S108, ~155L)** + match-statechild-parser.ts (S107) + emit-form-for.ts + emit-table-for.ts (S105) + emit-schema-for.ts (S104) + PGO P3 file changes + 723 test files (163 lines) |
| dependencies.map.md      | present | 5 runtime + 5 dev packages; pipeline graph with full A-2/A-3/A-4 wiring (128 lines) — NOT REGENERATED (deps unchanged S104-S108) |
| schema.map.md            | present | ~85+ AST node kinds; **kind:"match-block" routed end-to-end via emit-match.ts (S108); `_constantFolded` marker on bare-expr/logic stmts (S108 Bug 5 P3); FileAST.hasForStmt + hasChunkedMarkupTag (S108 PGO C2)**; FormForExpansion/FieldInfo/FormForValidator; SchemaForExpansion + 5 helpers; TableForExpansion + TableForColumnInfo + TableForSelectionInfo (S105); MatchArmEntry / MatchArmAttr / MatchParseDiagnostic (S107); FunctionDeclNode.isPinned (S105); FileAST.hasResetExpr (PGO P3) + hasEqualityExpr (S106 C1); RewriteContext; AuthGraph/RoleEnum; reachability types; ChunkKey/ChunkOutput; native-parser Token/TokenKind catalog |
| config.map.md            | present | 2 env vars (SCRML_PORT, PORT); bunfig.toml; CLI flags including --emit-per-route + --chunk-size-budget + **lintTailwindUnrecognizedClass off/info S108**; generate subcommand options (64 lines) — NOT REGENERATED (config unchanged) |
| build.map.md             | present | 13 npm scripts; pre-push hook (S102 release-tag README gate); PGO tooling scripts; --chunk-size-budget flag; `scrml generate auth` subcommand; pre-commit hook; CLI subcommands (127 lines) — NOT REGENERATED |
| error.map.md             | present | CGError + 9 runtime error classes; **W-TAILWIND-UNRECOGNIZED-CLASS S108 floor lint (Bug 1)** + 5 match-block diagnostics (W-MATCH-RULE-INERT + 4 E-MATCH-* at SYM PASS 20, S107); bug-3 file:line:col carry on BS+TAB errors (S107); 13 E-TABLEFOR-* (§41.16, S105); 8 E-SCHEMAFOR-* (§41.15, S104); 8 E-FORMFOR-* (§41.14, S102); PASS 19 pinned-fn-forward-ref (S105); W-CG-CHUNK-* family; full E-/W-/I- families (307 lines) |
| test.map.md              | present | bun:test, **723 files (full pre-push)**; **16,147 pass / 169 skip / 1 todo / 0 fail** (S108); pre-commit subset **13,304 / 690 files / 44,794 expect**; **match-block-phase3-codegen + match-block-phase4-shorthand + bug-5-phase-3-const-fold + bug-1-tailwind-unrecognized-class + bug-1-tailwind-arbitrary-value-emit + bug-1-tailwind-minor-families + bug-1-tailwind-transform-shorthand + bug-4-docs-mode-escape + pgo-c2-markup-forstmt-fold (NEW S108)**; match-block-parser-phase1 + match-block-phase2 + bug-3-diagnostic-file-paths + bug-5-const-interpolation (S107); tableFor + pinned-fn-parser + pinned-fn-forward-ref + reactive-bool-attrs (S105) |
| native-parser.map.md     | present | M1.x ladder status (M1.1-M1.5 COMPLETE); file catalog; TokenKind catalog; §51.0.Q.1 NESTED-ENGINE exemplar; D4 P3 heuristic; conformance test (101 lines) — NOT REGENERATED (no native-parser work S108) |
| domain.map.md            | present | 40+ domain concepts; **match block-form Phases 3+4 SHIPPED end-to-end via emit-match.ts (S108) + Bug 5 P3 const-fold + SPEC §7.4.2 + Bug 1 floor + 3-wave full-fix + Bug 4 `?{` C-narrow (SPEC §4.17) + formFor B5 L2 label-store (§41.14.7 Codegen) + PGO C2 fold (S108)**; match-block-form (§18.0.1) + 5 SYM PASS 20 diagnostics + match-statechild-parser.ts + STRUCTURAL_RAW_BODY_ELEMENTS BS gate (S107); tableFor + REACTIVE_BOOL_ATTRS + PASS 19 (S105); schemaFor (S104); formFor + PGO Phase 3; v0.3.3 status |
| events.map.md            | present | no compiler EventEmitter; channel placement rules; WebSocket pub/sub; A-4 chunk prefetch signals (74 lines) — NOT REGENERATED (events unchanged S108) |
| non-compliance.report.md | present | updated S108 — match-block-form-scoping CLOSED (Phases 1-4 shipped); Bug 5 P3 scoping closed; Bug 1 floor + full landed; Bug 4 C-narrow deep-dive in scrml-support; known-gaps.md rotated 4× S108 |
| api.map.md               | absent  | not applicable — compiler tool, not web API |
| state.map.md             | absent  | not applicable — compiler, not a frontend app |
| auth.map.md              | absent  | not applicable — auth lives in stdlib/auth and user .scrml programs |
| style.map.md             | absent  | not detected |
| i18n.map.md              | absent  | not detected |
| infra.map.md             | absent  | no Dockerfile, no .github/workflows, no Terraform, no docker-compose |
| migrations.map.md        | absent  | per-file `<schema>` blocks (§39) + `scrml migrate` CLI; no migrations dir |
| jobs.map.md              | absent  | stdlib/cron exists but compiler itself does not run jobs |

## File Routing
types / interfaces / AST node kinds              → schema.map.md
formFor types (FormForExpansion/FieldInfo)        → schema.map.md
schemaFor types (SchemaForExpansion + helpers)    → schema.map.md
tableFor types (TableForExpansion / TableForColumnInfo / TableForSelectionInfo) → schema.map.md
**match-block parser types (MatchArmEntry / MatchArmAttr / MatchParseDiagnostic; NEW S107)** → schema.map.md + domain.map.md
FunctionDeclNode.isPinned field (S105 pinned-fn parser) → schema.map.md + domain.map.md
native-parser TokenKind / Token / QuoteKind      → schema.map.md + native-parser.map.md
auth-graph types (AuthGraph/AuthGate/RoleEnum)    → schema.map.md
reachability types (RSInput/RSOutput/ChunkPlan)   → schema.map.md
per-route splitter types (ChunkKey/ChunkOutput)   → schema.map.md
hasInternalLinks / hasPrefetchableLinks flags     → schema.map.md + domain.map.md
hasResetExpr cache field (PGO P3.B-followup)      → schema.map.md + domain.map.md
formFor AST expansion (expandFormFor)             → schema.map.md + domain.map.md + error.map.md
schemaFor AST expansion (expandSchemaFor)         → schema.map.md + domain.map.md + error.map.md
tableFor AST expansion (expandTableForElement)    → schema.map.md + domain.map.md + error.map.md
**match-block AST node (kind: "match-block" with forType + onExprRaw + armsRaw)** → schema.map.md + domain.map.md + error.map.md
fnv1a-hash primitive (FNV_OFFSET/FNV_PRIME)       → schema.map.md
getCompilerIdentity() / chunks.json `compiler`    → schema.map.md + domain.map.md
environment variables / config keys               → config.map.md
CLI flags (--emit-per-route, --emit-reachability, --chunk-size-budget) → config.map.md + build.map.md
generate subcommand options                       → config.map.md
test patterns / fixtures / runner / formFor tests / tableFor tests / **match-block tests** → test.map.md
native-parser M1.x ladder / file catalog         → native-parser.map.md
native-parser conformance test infrastructure    → test.map.md + native-parser.map.md
build commands / CLI subcommands / hooks          → build.map.md
PGO tooling scripts / perf-baseline.json          → build.map.md
directory layout / entry points                   → structure.map.md
external packages / internal pipeline graph       → dependencies.map.md
business rules / pipeline stages / spec           → domain.map.md
error codes / E-FORMFOR-* / E-SCHEMAFOR-* / E-TABLEFOR-* / **E-MATCH-* / W-MATCH-RULE-INERT** / warning families → error.map.md
**`[BS]` / `[TAB]` diagnostic file:line:col carry (S107 bug-3)** → error.map.md
event bus / channel placement / chunk prefetch    → events.map.md
null/absence migration tasks                      → domain.map.md (Task-Shape Routing)
Approach A continuation status                   → domain.map.md (FULLY CLOSED S92)
§4.17 raw-content elements                        → domain.map.md + error.map.md (E-CTX-001)
§26.6 Tailwind typography plugin                  → domain.map.md
§41.14 formFor spec + impl                        → domain.map.md + error.map.md + schema.map.md + test.map.md
§41.15 schemaFor spec + impl                      → domain.map.md + error.map.md + schema.map.md + test.map.md
§41.16 tableFor spec + impl (S105)                → domain.map.md + error.map.md + schema.map.md + test.map.md
**§18.0.1 / §18.0.2 match block-form spec + impl (S107 Phases 1+2)** → domain.map.md + error.map.md + schema.map.md + test.map.md + docs/changes/match-block-form-scoping/SCOPING.md
§51.0.B.1 payload-binding on state-children      → domain.map.md + error.map.md
§51.0.M.1 named timers / cancelTimer             → domain.map.md + error.map.md
§48.6.4 fn mutual-recursion / pinned fn (SHIPPED S105) → domain.map.md + schema.map.md (isPinned field) + error.map.md (PASS 19)
REACTIVE_BOOL_ATTRS dispatch (disabled/readonly/required; S105) → error.map.md + domain.map.md + test.map.md
paren-form `is not`/`is some` fix (S103)          → domain.map.md + error.map.md + test.map.md
PGO Phase 3 (S102)                               → domain.map.md + structure.map.md + schema.map.md
Phase 3 select-row chip-away (S103; -98% wall)   → domain.map.md
Phase 3.B partial-update + swap-rows (SCOPING S104; OQs ratified S105; B2 SHIPPED S106) → docs/changes/runtime-perf-phase-3-partial-update-and-swap/
**Bug-5 `${IDENT}` non-reactive interpolation (Phases 1+2 SHIPPED S107)** → domain.map.md + structure.map.md + test.map.md
**Known gaps adopter-direct ledger (NEW S107)** → docs/known-gaps.md (project-root) + domain.map.md (Task-Shape Routing row)

## Task-Shape Routing

When a dev agent receives a task, the agent reads `primary.map.md` first then consults the maps below per shape:

| Task shape | Read these maps |
|------------|-----------------|
| Codegen bug-fix (HTML/CSS/JS emit) | structure.map.md + domain.map.md + error.map.md |
| **Match block-form Phase 3 (codegen render dispatch)** | docs/changes/match-block-form-scoping/SCOPING.md + match-statechild-parser.ts (530L) + ast-builder.js `kind: "match-block"` site + emit-html.ts (pattern reference: engine emit) |
| **Match block-form Phase 4 (bare-variant inference + payload-binding type-system)** | docs/changes/match-block-form-scoping/SCOPING.md + symbol-table.ts SYM PASS 20 + payload-binding §51.0.B.1 implementation as precedent |
| **Match block-form follow-on / SYM PASS 20 extension** | error.map.md (5 E-MATCH-* / W-MATCH-RULE-INERT) + match-statechild-parser.ts + domain.map.md |
| tableFor follow-on (v1.next or v1.0 bugfix) | schema.map.md (TableForExpansion shape) + error.map.md (13 E-TABLEFOR-*) + domain.map.md (§41.16 concept) + test.map.md |
| pinned-fn follow-on / SYM pass extension | schema.map.md (FunctionDeclNode.isPinned) + error.map.md (PASS 19) + domain.map.md |
| Reactive Boolean attr extension (checked/selected/hidden) | error.map.md (REACTIVE_BOOL_ATTRS Set + dispatch site) + domain.map.md + test.map.md |
| schemaFor follow-on | schema.map.md (SchemaForExpansion) + error.map.md (8 E-SCHEMAFOR-*) + domain.map.md + test.map.md |
| formFor follow-on | schema.map.md (FormForExpansion) + error.map.md (8 E-FORMFOR-*) + domain.map.md + test.map.md |
| Phase 3.B B4 count-derived dep precision | docs/changes/runtime-perf-phase-3-partial-update-and-swap/SCOPING.md + dep graph instrumentation |
| OQ-TF-13 helper extraction (validateTypeArgument) | schema.map.md (callers: formFor/schemaFor/tableFor/parseVariant) + L22 family-vocabulary refactor pattern (extracted S106 `6faf7a6`) |
| Native parser M2 expression parser | native-parser.map.md + DD §D7 §D8 |
| Self-host bootstrap broken-import | compiler/scripts/build-self-host.js + compiler/self-host/meta-checker.scrml |
| SPEC amendment | SPEC-INDEX.md FIRST, then SPEC.md offset+limit; Rule 4 mandates spec text wins over derived docs |
| Stage contract change (PIPELINE.md) | PIPELINE.md FIRST, then per-stage README in compiler/src/ |
| **Adopter-facing gap audit / "what's known to not work?"** | docs/known-gaps.md (NEW S107) → linked impl SCOPINGs under docs/changes/ |

## Key Facts
- Entry point is `compiler/src/cli.js` → `compiler/src/api.js` which orchestrates 15+ pipeline stages (BS→TAB→NR→MOD→CE→UVB→PA→RI→TS→META→DG→BP→AuthGraph→RS→CG plus Stage 3.007 LINT-TRY-CATCH + Stage 3.105 STDLIB-EXPORT-SEED); PIPELINE.md v0.7.2 is the implementation contract
- SPEC.md (~27,800+ lines) is normative; §41.16 tableFor S105 (~210L) + §41.15 schemaFor S104 (~170L) + §41.14 formFor S102 (~638L); §18.0.1 match block-form normative bullet + §34 catalog +1 row `E-MATCH-ON-REQUIRED` (S107). §34 catalog includes 5 match-block diagnostics + 13 E-TABLEFOR-* + 8 E-SCHEMAFOR-* + 8 E-FORMFOR-* + W-CG-CHUNK-* + E-ENGINE-PAYLOAD-* + E-TIMER-NAME-*
- `null` and `undefined` do NOT exist in scrml at any level — SPEC §42 + §42.1.1 normative; `""` / `0` / `false` are DEFINED values; canonical absence is `not`; wire encoding is `{"__scrml_absent": true}` (SPEC §57)
- All Approach A sub-waves FULLY CLOSED: A-2 (S91) + A-3 (S91) + A-4 (S91) + A-5 (S92). v0.3.0 STABLE; v0.3.3 tag at S102 `5815cf6`
- `compiler/native-parser/` — bottom-up scrml-native JS lexer, M1 LADDER COMPLETE through M1.5 (S103). 17 .scrml/.js shadow pairs. 97 conformance tests pass
- PGO Phase 3 trucking-dispatch: 2326ms → ~880ms (−62%); P3.A regex collapse + P3.B detect-runtime-chunks fused + P3.C owner-stack + P3.B-followup hasResetExpr — all CLOSED S102; S106 PGO C1 hasEqualityExpr (Option-2 sibling pattern)
- Phase 3 select-row chip-away (S103): -98% wall on select-row; 4.97ms → 0.12ms happy-dom + 0.30ms Chrome; 561× faster than v0.3.0 STABLE. Phase 3.B B2 same-keys-fast-path SHIPPED S106 (-42% partial-update)
- §41.14 formFor SHIPPED S102; §41.15 schemaFor SHIPPED S104; §41.16 tableFor SHIPPED S105: type-system.ts §41.16 pass + emit-table-for.ts expandTableForElement() + 13 E-TABLEFOR-* codes + 84 tests; stdlib re-export `stdlib/data/table-for.scrml` + `TableSort:struct` type
- §48.6.4 pinned fn SHIPPED end-to-end S105: AST `FunctionDeclNode.isPinned?: boolean` + parser recognition `dc3c460` + SYM PASS 19 forward-ref enforcement `7910162` + 30 unit tests
- REACTIVE_BOOL_ATTRS dispatch S105: `disabled` / `readonly` / `required` use setAttribute/removeAttribute toggle via `_scrml_effect`; closes §41.14 formFor follow-on; +13 tests
- **§18.0.1 match block-form Phases 1+2 SHIPPED S107**: BS-layer one-line fix added `<match>` to `COMPOUND_LIFT_EXEMPT_TAGS` + new `STRUCTURAL_RAW_BODY_ELEMENTS` Set gating raw-body capture; ast-builder produces `kind: "match-block"` AST node with `forType` + `onExprRaw` + `armsRaw`; NEW `compiler/src/match-statechild-parser.ts` (530L) re-tokenizes `armsRaw` into structured `MatchArmEntry[]` with 3 body forms (self-closing / `:`-shorthand / bare-body) + wildcard `<_>` + parenthesized payload bindings; NEW SYM PASS 20 fires 5 diagnostics (W-MATCH-RULE-INERT / E-MATCH-EFFECT-FORBIDDEN / E-MATCH-ONTRANSITION-FORBIDDEN / E-MATCH-NOT-EXHAUSTIVE / E-MATCH-ON-REQUIRED). 27 unit tests. Phases 3-5 carry-forward (~7-10h aggregate)
- **Bug 3 SHIPPED S107**: `[BS]` + `[TAB]` diagnostics now carry `file:line:col` prefix matching `[W-LINT-*]` shape; api.js `collectErrors(stage, errors, filePath)` enriched with optional `filePath` + `bsSpan→span` normalization; dev.js + build.js formatters mirror lint shape
- **Bug 5 Phases 1+2 SHIPPED S107**: `${IDENT}` non-reactive interpolation no longer no-ops — one-shot textContent write at DOMContentLoaded for non-reactive identifiers (Phase 1); phantom `<span data-scrml-logic>` + orphan `IDENT;` no-op JS at file-scope closed (Phase 2). Phase 3 polish (SPEC §7.4.2 normative section + constant-folding + tilde-context + multi-binding placeholder dedup) carry-forward to v0.4

## Tags
#scrmlts #map #primary #s107 #v0.3.3 #approach-a #approach-a2 #approach-a3 #approach-a4 #approach-a5 #wire-format #auth-graph #null-eradication #reachability #route-splitter #fnv1a-hash #generate-auth #chunk-prefetch #q-open-4 #q-open-5 #q-open-6 #native-parser #m1-5 #m1-ladder-complete #raw-content #typography #payload-binding #spec-51-0-b-1 #spec-4-17 #spec-26-6 #spec-48-6-4 #pinned-fn-shipped #formfor #spec-41-14 #e-formfor #schemafor #spec-41-15 #e-schemafor #tablefor #spec-41-16 #e-tablefor #l22-4-of-6 #reactive-bool-attrs #pgo-phase-3 #hasResetExpr #paren-form-fix #phase-3-select-row #phase-3b-b2-shipped #dq-12 #perf-baseline #pre-push #runtime-perf #561x-chrome #match-block #spec-18-0-1 #spec-18-0-2 #e-match-not-exhaustive #e-match-on-required #w-match-rule-inert #sym-pass-20 #bug-3-file-line-col #bug-5-const-interpolation #known-gaps #dogfood-bugs

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
- [native-parser.map.md](./native-parser.map.md)
- [non-compliance.report.md](./non-compliance.report.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
