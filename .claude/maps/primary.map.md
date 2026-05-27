# primary.map.md
# project: scrmlts
# updated: 2026-05-27T04:14:32Z  commit: 27e14c66

## Project Fingerprint

Language:   JavaScript + TypeScript (mixed; .js + .ts source, no tsc build step)
Framework:  none — bespoke compiler; deps acorn + astring + @modelcontextprotocol/sdk (lazy)
Runtime:    Bun >=1.3.13 (also the test runner, bundler, package manager)
Type:       compiler / language toolchain (monorepo: Bun workspace `["compiler"]`)
Size:       ~3300 git-tracked files
Watermark:  HEAD f6c98ed8 (2026-05-27) — S135. Major landings since 3a660c7c (S134 close): **Q6-narrow §6.8.3 `reset × lifecycle` IMPL LANDED (S135 — `RESET_CALL_RE` + reset-aware pass in `processStatementText`, type-system.ts now 15601L, +25 tests in `lifecycle-shape1-reset.test.js`; closes §6.8.3 SPEC-ahead bullet)**; **Source-form lifecycle follow-ups LANDED (S135 — Fix #1 `findTopLevelArrow` whitespace tolerance + Fix #3 `parseLifecycleReturnAnnotation` qualified-enum stripping + TRANSITION_CALL_RE `@` prefix tolerance; +17 tests in `lifecycle-shape1-source-form.test.js`)**; **E-STRUCTURAL-ELEMENT-MISPLACED `${...}` silent-swallow class LANDED (S135 — `STRUCTURAL_ELEMENT_PLACEMENT` + `leadingTagName()` in ast-builder.js 13103L; 9 structural elements now fire; `<match>` excluded; +19 tests in `structural-in-logic-body.test.js`)**; **Phase-1c PRIMER + kickstarter catch-up LANDED (S135 — 7 clusters N/M/K/J/H/I/L; all 26 F-XXX audit gaps CLOSED)**; **Bugs 21–27 filed in known-gaps.md (7 LOW/heuristic/cleanup)**; **README L5 positioning updated to "A complete compiler for the web."**

## Map Index

| Map | Status | Contents |
|---|---|---|
| structure.map.md | present | directory layout, entry points, native-parser, stdlib, codegen (incl. emit-each), iteration/lifecycle/MCP-V0 key modules, ast-builder structural-placement guard (NEW S135), milestone status (updated S135) |
| dependencies.map.md | present | 3 root + 2 compiler runtime deps, internal module graph, native-parser graph, stdlib shim layout |
| schema.map.md | present | FileAST / ASTNode (12-member union) / synthesized each-block + match-block nodes / lifecycle registry types + Shape 1 tracker (S134) + Q6-narrow reset-aware tracker (NEW S135) + source-form fixes (NEW S135) / STRUCTURAL_ELEMENT_PLACEMENT table (NEW S135) / AliasRecord (S134) / META_BUILTINS narrow + JS_HOST_FORBIDDEN (S134) / MCP descriptor shapes / native catalogs |
| config.map.md | present | env vars (+ NODE_ENV MCP gate) + compiler option flags + McpConfig program-config struct |
| build.map.md | present | bun scripts, CLI subcommands (promote --each LANDED S134, promote --engine deferred), git hooks, MCP-V0.D build behavior |
| error.map.md | present | 11 stage classes, §34.1 81-code catalog (STABLE), lifecycle + W-EACH codes, Q6-narrow reset-aware E-TYPE-001 (NEW S135), E-STRUCTURAL-ELEMENT-MISPLACED now emitted `${...}` class (NEW S135), source-form fixes (NEW S135), Shape 1 tracker + JS_HOST_FORBIDDEN + alias E-DERIVED-VALUE-MUTATE (S134) |
| test.map.md | present | bun test, 801 test files (566/88/105 unit/integ/conf), +3 new unit files S135 (lifecycle-shape1-reset + lifecycle-shape1-source-form + structural-in-logic-body), lifecycle + iteration + snapshot + MCP-D/E + M6.5/M6.7 D-class suites |
| domain.map.md | present | pipeline stages + iteration/lifecycle/MCP-V0 stages, S133-S135 landings (Q6-narrow + source-form follow-ups + structural-placement), M6.5/M6.7 status, full invariant set (updated S135) |
| api.map.md | absent | no HTTP API surface (compiler). NB: the MCP stdio server is a tool surface, not HTTP — documented in structure.map.md |
| state.map.md | absent | no app state store (compiler) |
| events.map.md | absent | no event bus |
| auth.map.md | absent | auth is a scrml LANGUAGE feature, not app infra |
| migrations.map.md | absent | no DB migration tooling (test *.db throwaway) |
| jobs.map.md | absent | no job/queue scheduler |
| infra.map.md | absent | no Docker / CI / IaC (.github holds only FUNDING.yml) |
| style.map.md | absent | no design-token system |
| i18n.map.md | absent | no i18n |

## File Routing

| Task | Map |
|---|---|
| types / AST shapes / each-block + match-block nodes / lifecycle registry + Shape 1 tracker + Q6-narrow reset-aware + source-form fixes / STRUCTURAL_ELEMENT_PLACEMENT / AliasRecord / MCP descriptor shapes | schema.map.md |
| pipeline stages / iteration + lifecycle stages / S133-S135 landings / Q6-narrow + structural-placement / native parser / M6.5/M6.7 / MCP impl status | domain.map.md |
| native-parser layout / emit-each / lint-w-each / ast-builder structural-placement guard (NEW S135) / MCP-V0.D-E modules / stdlib shim layout / promote-each LANDED | structure.map.md |
| compiler option flags / env vars / McpConfig program-config | config.map.md |
| build commands / CLI / promote --each LANDED / promote --engine deferred / git hooks / MCP-V0.D build behavior | build.map.md |
| test layout / S135 new suites (lifecycle-shape1-reset + source-form + structural-in-logic-body) / iteration + lifecycle + snapshot + MCP-D/E + D-class suites | test.map.md |
| external packages / module graph / shim catalog / mcp-sdk dep | dependencies.map.md |
| diagnostic classes / error codes / Q6-narrow reset-aware E-TYPE-001 / E-STRUCTURAL-ELEMENT-MISPLACED `${...}` class / source-form fixes / Shape 1 E-TYPE-001 / alias E-DERIVED-VALUE-MUTATE / JS_HOST_FORBIDDEN / lifecycle + W-EACH codes / V-kill / ~snapshot fix | error.map.md |

## Task-Shape Routing (agents — read this section first)

**Q6-narrow reset × lifecycle / §6.8.3 work** (`RESET_CALL_RE`, `processStatementText` reset pass, `classifyWriteAgainstSpec`, §6.8.3 SPEC):
1. `domain.map.md` (Lifecycle Annotation — Implementation Status; Q6-narrow LANDED; §6.8.3 SPEC-ahead bullet CLOSED)
2. `schema.map.md` (Shape 1 per-access lifecycle tracker section — Q6-narrow `RESET_CALL_RE` + Tracker 1/2; heuristic limitations Bug 21/22)
3. `error.map.md` (Q6-narrow — reset-aware E-TYPE-001 section)
4. `test.map.md` (S135 NEW: `lifecycle-shape1-reset.test.js` 25 tests)

**Source-form lifecycle follow-ups (Fix #1 + Fix #3 + companion):**
1. `schema.map.md` (Lifecycle Annotation Types — S135 Fix #1/Fix #3/companion detail; `findTopLevelArrow` word-boundary rule; `parseLifecycleReturnAnnotation` extractBareVariant; `TRANSITION_CALL_RE`)
2. `error.map.md` (Source-form follow-ups section)
3. `test.map.md` (S135 NEW: `lifecycle-shape1-source-form.test.js` 17 tests)

**E-STRUCTURAL-ELEMENT-MISPLACED `${...}` class / structural placement:**
1. `error.map.md` (S135 New Emitted Diagnostic Surface — full table of 9 elements; `<match>` exclusion; fire sites)
2. `schema.map.md` (STRUCTURAL_ELEMENT_PLACEMENT table section; `leadingTagName()`)
3. `structure.map.md` (Key Module — ast-builder.js structural-placement guard)
4. `test.map.md` (S135 NEW: `structural-in-logic-body.test.js` 19 tests)

**Iteration / `<each>` work** (emit-each.ts codegen, lint-w-each-*, `@.` sigil, `<empty>`, key= inference, **`promote --each` CLI LANDED S134**):
1. `structure.map.md` (Key Module — Iteration Codegen + Key Module — `promote --each`; each-block node shape + emit-each exports; promote.js LANDED)
2. `domain.map.md` (Iteration — Implementation Status; Landings 1+2+3 ALL LANDED; Landing 4 kickstarter PENDING)
3. `schema.map.md` (EachBlockNode synthesized shape — NOT in ASTNode union; collectEachBlocks walk)
4. `error.map.md` (W-EACH-KEY-001 / W-EACH-PROMOTABLE emitted; E-SYNTAX-064 / E-EACH-ITER-SHAPE queued, NOT emitted)

**Lifecycle annotation work** (`(A to B)` registry, E-TYPE-001, transition() marker, Shape 1 tracker, **Q6-narrow §6.8.3 LANDED S135**, **source-form fixes LANDED S135**):
1. `domain.map.md` (Lifecycle Annotation — Implementation Status; all landings + Q6-narrow + source-form follow-ups)
2. `error.map.md` (E-TYPE-001 / E-TYPE-LIFECYCLE-* / W-LIFECYCLE-LEGACY-ARROW; Q6-narrow section; source-form section)
3. `schema.map.md` (Lifecycle Annotation Types — full type catalog + Shape 1 tracker + Q6-narrow + Fix #1/Fix #3)
4. `structure.map.md` (Key Module — Lifecycle Annotation; type-system.ts LOC now 15601)

**§6.6.18 alias-escape / A4 work** (`AliasRecord`, PASS 2.c, L21 alias-mutation extension):
1. `schema.map.md` (AliasRecord type shape + chain-break rules; Scope.aliasProvenanceRecords; symbol-table.ts LOC 10445)
2. `domain.map.md` (§6.6.18 alias invariant; Stage 3.06 SYM A4 note)
3. `error.map.md` (E-DERIVED-VALUE-MUTATE alias fire path section)
4. `structure.map.md` (Key Symbol Table Modules; PASS 2.c walkRegisterLocalAliases)

**Bug 17 JS_HOST_FORBIDDEN / §22.12 meta categorical work**:
1. `schema.map.md` (JS_HOST_FORBIDDEN set; META_BUILTINS narrow; checkJsHostGlobals)
2. `error.map.md` (JS_HOST_FORBIDDEN E-META-001 fire path section; Bug 17)
3. `domain.map.md` (§22.12 JS_HOST_FORBIDDEN invariant; Stage 6.5 MC note; meta-checker.ts LOC 2262)
4. `structure.map.md` (Key Module — Meta Checker)

**MCP `<program mcp>` / V0.D-E work** (compute-program-config McpConfig, build.js boot injection, e2e):
1. `structure.map.md` (Key Module — MCP-V0; compute-program-config + build.js injection)
2. `domain.map.md` (MCP V0 — Implementation Status; Sub-units A-E ALL LANDED)
3. `config.map.md` (McpConfig program-config struct + NODE_ENV dev-only gate + emitPerRoute auto-flip)
4. `test.map.md` (mcp-program-attr + mcp-v0-e2e suites)

**MCP descriptor-extractor work** (mcp-descriptors.ts engines/forms/channels/serverfns):
1. `structure.map.md` (Key Module — MCP-V0)
2. `schema.map.md` (MCP Descriptor Shapes — compoundKeys nested + cellKey; encoding caveat)
3. `test.map.md` (mcp-descriptors-* suites + compileAndReadSidecars helper)

**MCP runtime / server work** (mcp.js 11-tool surface, startMcpServer/shutdownMcpServer stdio boot):
1. `structure.map.md` (Key Module — MCP-V0; the 11 LOCKED tool names + boot sequence)
2. `dependencies.map.md` (@modelcontextprotocol/sdk lazy-import site + zod)
3. `error.map.md` (MCP shim plain-Error guards + tool isError-wrap)

**Codegen correctness / expression-emission** (emit-expr precedence, code-segments fence, rewrite.ts, ~snapshot orphan-sigil):
1. `structure.map.md` (Key Codegen Modules + ~snapshot Bug 15 fix sites)
2. `schema.map.md` (BinaryExpr precedence printer tables + Code-Segment Fence + orphan-~ fallback)
3. `error.map.md` (Silent-Correctness Bugs — Bug W / GITI-* / 6nz-S / ~snapshot Bug 15 / E-STRUCTURAL-ELEMENT-MISPLACED silent-swallow class)
4. `test.map.md` (tilde-snapshot-codegen-fix / bug-w / giti-019 tests)

**Native-parser bug fix** (M6.5/M6.7 D-class parity, within-node, match-arm, structural-decl, FileAST synthesis):
1. `structure.map.md` (Native-Parser Layout — M6.5/M6.7 productions)
2. `domain.map.md` (M5 swap seam + M6 Wave 1 / M6.5/M6.7 status; D4 EMPTY)
3. `schema.map.md` (FileAST + native StateDecl + Stmt/Expr catalogs; `:>` match-arm, null/undefined primary)
4. `test.map.md` (m65-b* + m67-c*/m67-d* + parser-conformance)

**symbol-table.ts change** (SYM PASS modifications, scope-chain, AliasRecord A4):
1. `domain.map.md` (Stage 3.06 [SYM] + Aggregates)
2. `structure.map.md` (Key Symbol Table Modules + A4 PASS 2.c)
3. `schema.map.md` (AliasRecord + SYMInput/SYMResult/Scope; EngineStateChildEntry)

**V-kill / Unit CC change** (E-STATE-UNDECLARED / E-WRITE-NOT-IN-LOGIC-CONTEXT, exemption list):
1. `error.map.md` (V-kill + Unit CC codes)
2. `domain.map.md` (Stage 3.06 [SYM] + Business Invariants)
3. `schema.map.md` (ReactiveAssignNode + LogicStatement union)

**Spec amendment** (SPEC.md §X.Y, §34 catalog row):
1. `domain.map.md` (Core Concepts + Business Invariants)
2. `error.map.md` (if the amendment touches a code family)
3. `schema.map.md` (if the amendment touches a node shape)

**Don't know which** (open-ended task brief):
1. Read `primary.map.md` (this file) in full
2. Self-classify via Task-Shape Routing above
3. If genuinely unclear, surface to PA before consuming further context

## Use Feedback Loop

When this map's content was load-bearing for a dispatch outcome, the agent's final report should note **"map content consulted: [list of map files]; load-bearing finding: [one sentence]"**. When not useful, report **"maps consulted but not load-bearing"** so PA can diagnose wrong-map or wrong-granularity issues. 3–5 consecutive "not load-bearing" reports on the same task shape trigger a map-design review.

## Key Facts

- `compileScrml(options)` in `compiler/src/api.js` is the pipeline orchestrator — a ~25-stage chain BS→TAB→PRECG→GCP1/3→MOD→NR→SYM→CE→VP→PA→RI→MC→TS→META→DG→BP→AG→RS→CG, followed by stdlib bundling + MCP descriptor-sidecar emission + the output write loop. `<program mcp>` (MCP-V0.D) auto-flips `emitPerRoute:true` and surfaces `mcpAutoActivated`/`mcpMode` (api.js:622).
- **§6.8.3 reset × lifecycle FULLY LANDED (S135)**: Q6-narrow `RESET_CALL_RE` + reset-aware pass in `processStatementText` (`type-system.ts` now **15601L**) recognizes `reset(@cell)` / `reset(@cell.field.path)` calls; routes through `classifyWriteAgainstSpec`; reverts per-access transition state when reset value satisfies pre-type `A`; maintains/advances to "post" for post-type `B`. Tracker 1 (cell-value Shape 1) + Tracker 2 (struct-typed Shape 1). Closes §6.8.3 SPEC-ahead bullet from S134. Heuristic limits: Bug 21 (deep multi-level) + Bug 22 (cross-cell `default=`).
- **Source-form lifecycle follow-ups LANDED (S135)**: `findTopLevelArrow` now uses word-boundary rule (Fix #1) — bare-dot variant annotation `(.Draft to.Published)` detects lifecycle glyph after parser whitespace-collapse. `parseLifecycleReturnAnnotation` strips both `.Variant` and `Enum.Variant` forms (Fix #3). `TRANSITION_CALL_RE` accepts `@` prefix (Fix #3 companion). Both `(.Draft to .Published)` and `(Article.Draft to Article.Published)` now work end-to-end from source.
- **E-STRUCTURAL-ELEMENT-MISPLACED `${...}` class LANDED (S135)**: `STRUCTURAL_ELEMENT_PLACEMENT` + `leadingTagName()` in `ast-builder.js` (**13103L**) fire the diagnostic at both html-fragment fallback sites in `parseLogicBody`. 9 structural-declaration elements covered; `<match>` (block-form) excluded — it is markup-as-value and canonical inside `${...}`. Pre-fix: silent swallow with zero diagnostic.
- **Iteration FULLY LANDED (S131-S134)**: `codegen/emit-each.ts` (618L) emits the Tier-1 `<each in=@items>` / `<each of=N>` structural-iteration surface; `@.` is the contextual current-item/index sigil (§3.4); `<empty>` is the empty-state fallback; `key=` auto-infers from the item-type `.id` field (`W-EACH-KEY-001` when inference fails). **`bun scrml promote --each` CLI (§56.10) is Landing 3 — LANDED S134** (`applyEachRewrite` + `promoteEachOnFile` + `--shorthand` in promote.js 1649L). `E-SYNTAX-064` (`@.` outside `<each>`) is queued in SPEC but NOT yet emitted.
- **Lifecycle annotation LANDED S130-S134**: a struct field typed `(A to B)` carries a pre/post-transition pair; `type-system.ts` (now **15601L**) builds a sparse `LifecycleRegistry` and fires `E-TYPE-001` when a post-transition (`B`) member is accessed before `transition()` (§14.12.6.3). **Shape 1 per-access tracker (B-prereq S134 Bug 19 HIGH)** extends E-TYPE-001 to plain reactive cells per §14.12.10. Legacy `(A -> B)` glyph resolves with `W-LIFECYCLE-LEGACY-ARROW`. **Q6-narrow + source-form follow-ups LANDED S135.**
- **§6.6.18 alias-escape CLOSED (S134 A4)**: `AliasRecord` interface + PASS 2.c `walkRegisterLocalAliases` in `symbol-table.ts` (now **10445L**); E-DERIVED-VALUE-MUTATE now fires for aliased mutation forms (`let local = @cell; local.foo = x`).
- **§22.12 JS_HOST_FORBIDDEN CATEGORICAL (S134 Bug 17)**: `meta-checker.ts` (now **2262L**) has `JS_HOST_FORBIDDEN` set + `checkJsHostGlobals` walker — fires E-META-001 for JS-host ambient globals regardless of compile-time vs runtime classification. Separate from the existing `META_BUILTINS` E-META-001 path.
- **MCP V0 series COMPLETE (S130-S131)**: all five Sub-units LANDED — A (descriptor extractor) + B (runtime read helpers) + C (11-tool surface + stdio boot) + D (`<program mcp>` opt-in) + E (e2e + adopter docs + multi-page fixture). The 11 LOCKED tool names in `mcp.js` are a public-API contract.
- The central data structure is `FileAST` (`compiler/src/types/ast.ts:1513`). The `ASTNode` union has 12 members; synthesized `each-block` and `match-block` nodes are NOT union members — walked via generic child-array recursion.
- scrml SOURCE has no exceptions, no `null`/`undefined`, no async/await (standing rules). §34.1 catalogs 81 native-parser diagnostics — **STABLE through S135**. SPEC.md is 30552 lines. §6.8.3 `reset × lifecycle` IMPL LANDED S135.
- No hosted CI, no Docker — quality gates are local git hooks; pre-commit runs unit+integration+conformance; never bypass `--no-verify` without authorization.

## Tags
#scrmlts #map #primary #compiler #native-parser #m5-swap #m6-wave1 #m6-7-dclass #pipeline #iteration #each #at-dot-sigil #lifecycle #to-glyph #transition-marker #lifecycle-shape1-tracker #lifecycle-reset-aware #alias-escape #js-host-forbidden #structural-in-logic-body #e-structural-element-misplaced #promote-each-landed #mcp-v0 #mcp-program-attr #mcp-descriptors #mcp-server #snapshot-fix #v-kill #unit-cc #code-segments #s131 #s133 #s134 #s135

## Links
- [structure.map.md](./structure.map.md)
- [dependencies.map.md](./dependencies.map.md)
- [schema.map.md](./schema.map.md)
- [config.map.md](./config.map.md)
- [build.map.md](./build.map.md)
- [error.map.md](./error.map.md)
- [test.map.md](./test.map.md)
- [domain.map.md](./domain.map.md)
- [non-compliance.report.md](./non-compliance.report.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
