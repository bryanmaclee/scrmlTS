# structure.map.md
# project: scrmlts
# updated: 2026-05-27T04:14:32Z  commit: f6c98ed8

## Entry Points

`compiler/bin/scrml.js` — CLI executable shim; re-exports src/cli.js.
`compiler/src/cli.js` — subcommand router; dispatches compile/dev/build/migrate/promote/generate/init/serve; falls through to compile when arg 0 is a .scrml file or directory.
`compiler/src/api.js` — programmatic compiler API; `compileScrml(options)` runs the full BS→TAB→PRECG→GCP1/3→MOD→NR→SYM→CE→VP→PA→RI→MC→TS→META→DG→BP→AG→RS→CG pipeline; the M5 native-parser swap seam (`--parser=scrml-native` routes per-file TAB through `nativeParseFile`). MCP-V0.A: emits four descriptor sidecars unconditionally during the output write loop (`buildMcpDescriptors(tabResults)` writes engines/forms/channels/serverfns .json). MCP-V0.D (S130-S131): `<program mcp>` opt-in auto-flips `emitPerRoute:true` + surfaces `mcpAutoActivated`/`mcpMode` on the result (api.js:622). GITI-018 (S127): `rewriteStdlibImports` rewrites ALL `scrml:` import specifiers in `--mode library`.
`compiler/native-parser/parse-file.js` — `nativeParseFile(filePath, source)` — the C1 FileAST assembler; 1280 LOC (+243 S127-S129 M6.5/M6.7 D-class); per-BlockKind synth* builders + native→live FileAST translation; imported by meta-eval.ts, codegen/emit-match.ts, component-expander.ts.
`lsp/server.js` — Language Server Protocol entry.
`docs/build.ts` — docs-site builder.
`compiler/runtime/stdlib/mcp.js` (~860L) — secondary runtime entry: `startMcpServer(config)` boots a long-lived stdio MCP server (MCP-V0.C). Not invoked by the compile pipeline; called by the compiler-generated `<program mcp>` boot code (MCP-V0.D LANDED — auto-injected into `_server.js` by commands/build.js when the attribute is present).

## README Positioning (S135)

`README.md` (741L) — L5 positioning: **"A complete compiler for the web."** (updated S135; was a more qualified formulation). Demonstrates the language; confirms the README shows nominal language, not necessarily compiler-current (see known-gaps.md + changelog.md for spec-vs-impl drift).

## Directory Ownership

`compiler/src/` — JS+TS compiler pipeline stages (BS, TAB, CE, PA, RI, MC, TS, META, DG, BP, AG, RS, CG) plus lints and validators. S130-S131 lints: `lint-w-each-key.js` (W-EACH-KEY-001, 218L) + `lint-w-each-promotable.js` (W-EACH-PROMOTABLE, 213L).
`compiler/src/codegen/` — Stage 8 code generation; ~56 emit-* modules + index.ts (runCG), route-splitter, IR, source-map, runtime-chunks, rewrite (2304L); `mcp-descriptors.ts` (MCP-V0.A descriptor sidecar extractor); `code-segments.ts` (S125 shared regex/comment/string fence leaf); `emit-each.ts` (NEW S131, 618L) — `<each in=>` / `<each of=N>` codegen (collectEachBlocks + emitEachMountHtml + emitEachBodyRenderForFile).
`compiler/src/codegen/compat/` — parser-workaround shims (BPP-override compatibility layer).
`compiler/src/commands/` — CLI subcommand implementations (compile, dev, build, migrate, promote, generate, init, serve). `build.js` (+94 S130-S131): MCP-V0.D `<program mcp>` boot-import auto-injection + dev-only NODE_ENV gate. **`promote.js` (now 1649L; +large S134): `--each` Iteration Landing 3 LANDED — `applyEachRewrite` + `rewriteOneIteration` + `promoteEachOnFile` + `--shorthand` flag; `--engine` Tier C remains deferred stub.**
`compiler/src/types/` — TypeScript type declarations: `ast.ts` (all AST node shapes, incl. `each-block`), `auth-graph.ts`, `reachability.ts`.
`compiler/src/reachability/` — Reachability Solver sub-components (component-1..5, entry-points, gate-classifier, outer-fixpoint).
`compiler/src/native-parser-canary/` — M6.5/M6.7 within-node divergence classifier (`within-node-classifier.ts`); 7-class taxonomy for parity testing.
`compiler/src/native-walker/` — Native-pipeline AST walkers; `engine-statechild-walker.ts` (M6.6.b.2) — walks native engine block child stream → live `EngineStateChildEntry[]`, replacing legacy `parseEngineStateChildren` text-rescanner in SYM PASS 11.
`compiler/src/validators/` — Post-CE validators: attribute-allowlist, attribute-interpolation, post-ce-invariant, lint-try-catch, lint-async-user-source, ast-walk.
`compiler/native-parser/` — Self-hosted scrml native parser (`.scrml` sources + compiled `.js` outputs); M5 SWAP target; M6 Wave 1 consumer migrations active. CHANGED S127-S129 (M6.5.b.2.1/b.3/b.4/b.5/b.6 + M6.7 C/D-class): parse-stmt.js +412, parse-expr.js +230, parse-file.js +243, translate-stmt.js +112 — new productions: `server @var`, `given` guard, `-> ReturnType` fn annotation, `:>` match-arm, null/undefined primary, string-literal import specifier.
`compiler/runtime/` — Hand-written ES-module runtime shims; copied into emitted output as `_scrml/*.js`.
`compiler/runtime/stdlib/` — Per-module runtime shims: 18 top-level + oauth/ providers + compiler/ 13-shim family + `mcp.js` (MCP-V0.B/C/D, ~860L) — `scrml:mcp` runtime READ helpers + full 11-tool surface + `startMcpServer`/`shutdownMcpServer` stdio boot.
`compiler/self-host/` — From-scratch scrml self-host compiler prototype (`.scrml` sources); separate post-v1.0 effort.
`compiler/self-host/cg-parts/` — CG sub-unit scrml sources.
`compiler/tests/unit/` — Unit tests (566 files at HEAD); `bun:test` framework. +3 files S135: `lifecycle-shape1-reset.test.js` (25 tests, Q6-narrow §6.8.3) + `lifecycle-shape1-source-form.test.js` (17 tests, source-form follow-ups) + `structural-in-logic-body.test.js` (19 tests, E-STRUCTURAL-ELEMENT-MISPLACED `${...}` class).
`compiler/tests/integration/` — Integration tests (88 files).
`compiler/tests/conformance/` — Conformance tests (105 files): block-grammar suite + S32 fn-state-machine suite + tab.
`compiler/tests/browser/` — Browser runtime tests (12 files); happy-dom sandbox.
`compiler/tests/commands/` — CLI command tests (6 files).
`compiler/tests/lsp/` — LSP integration tests (10 files).
`compiler/tests/parser-conformance/` — Parser conformance canary tests; plus top-level `parser-conformance-*.test.js` files (10 at compiler/tests root) including `parser-conformance-within-node.test.js`.
`compiler/tests/self-host/` — Self-host compiler smoke tests (4 files).
`compiler/tests/helpers/` — Test helper utilities: `expr.ts`, `extract-user-fns.js`, `mcp-sidecar-compile.js` (`makeSidecarTmpRoot`/`cleanupSidecarTmpRoot`/`compileAndReadSidecars` for MCP-V0.A tests).
`compiler/tests/fixtures/` — Test fixtures: promote-match-canonical.scrml, promote-multi-file-app, MCP-V0.E multi-page app fixture (S131).
`compiler/tests/unit/__fixtures__/structural-in-logic-body/` — S135 fixture dir for structural-in-logic-body tests.
`samples/compilation-tests/` — ~318 compilation test sample directories (counted only, not enumerated).
`samples/gauntlet-r*/` — Gauntlet round samples (r11, r13–r15, r18–r19); regression anchors.
`stdlib/` — scrml stdlib module SOURCE stubs (auth, compiler, cron, crypto, data, format, fs, host, http, oauth, path, process, redis, regex, router, store, test, time) + `mcp/index.scrml` (`scrml:mcp` source stub exporting `startMcpServer`/`shutdownMcpServer`; compiler-internal, adopters opt in via `<program mcp>`).
`examples/` — 23 canonical scrml example apps (01-hello through 23-trucking-dispatch).
`benchmarks/` — Performance benchmarks: browser, fullstack-react, fullstack-scrml, llm-efficiency, per-route-roles, sql-batching, todomvc variants.
`lsp/` — Language server (vscode-languageserver); entry at `lsp/server.js`.
`editors/neovim/` — Neovim editor plugin.
`e2e/` — Playwright end-to-end test suite.
`scripts/` — Utility scripts + git-hooks (pre-commit runs unit+integration+conformance; pre-push runs full suite).
`docs/` — PA-SCRML-PRIMER (**S135: Phase-1c catch-up — all 26 F-XXX audit gaps CLOSED**), tutorial, known-gaps (**S135: Bugs 21–27 filed**), lin, changelog, changes/, audits/, heads-up/, adopter/, articles/ (**S135: kickstarter-v2 Phase-1c catch-up**), website/.
`docs/changes/` — Per-change SCOPING, BRIEF, and progress tracking documents (133+ subdirs).
`docs/heads-up/` — Running heads-up logs (iteration-design, lifecycle-annotation-extension, spec-consolidation, const-deep-freeze-2026-05-26 — S130-S135).

## Native-Parser Layout

Front-end flow: lex → parse-stmt/parse-expr → parse-markup → bridge layer → nativeParseFile → live FileAST.

| Sub-system | Files |
|---|---|
| Lexing | lex.js + lex-mode.js + 7 lex-in-* dispatchers; token.js, token-cursor.js, cursor.js |
| Statements | parse-stmt.js (~3900L; M6.7-D1/D2/D7/D8a-i — null/undefined primary, server/pure on `function`, `given` guard, `-> ReturnType` annotation; M6.5.b.2 structural-decl), ast-stmt.js (StmtKind incl. `StateDecl` + `given` node), parse-ctx.js, parse-mode.js, parse-seam.js, block-context.js, body-mode.js |
| Expressions | parse-expr.js (M6.7-D3 `:>` colon-arrow match-arm separator; M6.5.b.1 match-arm newline + Dot+UpperIdent pattern), ast-expr.js (40 ExprKind variants) |
| Markup | parse-markup.js, tag-frame.js, display-text-literal.js, parse-css-body.js, parse-sql-body.js, parse-state-body.js, parse-error-body.js, delegation-frame.js |
| Bridge | translate-stmt.js (R4 COMPLETE; M6.5.b.2 `makeStateDeclNode` StateDecl arm; +112 D-class); translate-expr.js (A2 complete S118); collect-hoisted.js (A3) |
| Assembler | parse-file.js — `nativeParseFile` (1280L; M6.5.b.5/b.6 native→live FileAST shape Class F + span.file Class G) |
| Support | span.js, bracket-stack.js, error-recovery.js, char-classify.js |
| Docs | README.md, M5-ast-bridge-scoping.md, M5-divergence-ledger.md, M5-SWAP-residual-decomposition.md, M6.6-CONTRACT-DERIVATION.md (540L cookbook) |

## Key Module — Iteration Codegen (LANDED S131)

`compiler/src/codegen/emit-each.ts` (618L) — Tier-1 `<each>` structural-iteration codegen. Imported by `emit-html.ts` (mount slot) + `emit-client.ts` (body render); `type-system.ts` mirrors its `@.`→iter-var conversion comment for the lifecycle access scan.

| Exported fn | Output | Notes |
|---|---|---|
| `collectEachBlocks(fileAST)` | `EachBlockAstNode[]` | one pass; gathers all `kind:"each-block"` nodes |
| `emitEachMountHtml(node, ctx)` | HTML string | mount-slot HTML; tree-shaken when no template + no `<empty>` |
| `emitEachBodyRenderForFile(...)` | client render fn | per-item render closure (`@.`/`as name` binding) + `<empty>` fallback |

Iteration source surface (per SPEC §17.7 + §3.4 + §56.10):
- `<each in=@items>` — item-iteration; `@.` is the current item, `@.field` member access.
- `<each of=N>` — count-iteration; `@.` is the current index (0..N-1); defaults `key=@.`.
- `@.` contextual sigil (§3.4) — resolves ONLY inside an `<each>` body; outside → `E-SYNTAX-064` (queued, not yet emitted).
- `as name` — optional bareword iteration-variable alias (`name` and `@.` are aliases in body scope).
- `key=expr` — optional; null → inferred from item-type `.id` field (§17.7.5); `W-EACH-KEY-001` info-lint when inference fails.
- `<empty>...</empty>` — optional sub-element rendered when the iterable is empty; SHALL NOT reference `@.`.
- `<li : @.name>` — `:`-shorthand body application via existing §4.14 mechanism (no new shorthand).

`each-block` AST node shape (ast-builder.js:11204) — `{ kind:"each-block", iterShape:"in"|"of"|null, inExprRaw, ofExprRaw, asName, keyExprRaw, bodyChildren, templateChildren, emptyChild, bodyRaw, span }`. Block-splitter registers `each` as a Tier-1 structural container (block-splitter.js:128-170); html-elements.js registers `<empty>` as the each/tableFor empty-state slot.

## Key Module — `bun scrml promote --each` (LANDED S134, Iteration Landing 3)

`compiler/src/commands/promote.js` (1649L) — CLI driver for `--match` (SHIPPED S66), **`--each` (LANDED S134)**, `--engine` (Tier C deferred stub).

| Function | Purpose |
|---|---|
| `applyEachRewrite(source, sites, targetLine, opts)` | Descending-offset loop; calls `rewriteOneIteration` per site; returns `{ rewritten, count, skipped }` |
| `rewriteOneIteration(source, site, opts)` | Rewrites one Tier-0 `${ for (let x of @items) { lift <markup/> } }` → `<each in=@items>...</each>`; `opts.shorthand` applies `:`-shorthand for single-expression templates |
| `promoteEachOnFile(filePath, targetLine, opts, cwd)` | File-level driver: parse promotable sites via `findPromotableChains`, call `applyEachRewrite`, write in-place or print diff |

`--shorthand` flag: auto-applies §4.14 `:`-shorthand when the per-item template is a single-expression-shaped element opener. `--dry-run` prints unified diff without writing. `--check` exits non-zero if any promotion would occur (CI-friendly). `--exclude=<glob>` excludes files by substring match.

## Key Module — Lifecycle Annotation (LANDED S130-S135)

`compiler/src/type-system.ts` (GROWN to **15601 LOC**; was 15205; +396 S135 Q6-narrow + source-form fixes) — Stage 6 TS; §14.3 lifecycle-annotation registry + access-before-transition scan.

| Mechanism | Detail |
|---|---|
| Lifecycle registry | `buildLifecycleFieldRegistry` (type-system.ts:2097) — per-struct map of `(A to B)`-annotated fields; sparse (non-lifecycle fields absent) |
| `E-TYPE-001` | access-before-transition fire — post-transition field accessed before the variant-discriminating `transition()` (SPEC §14.3); emitted at type-system.ts + emit-logic.ts |
| `transition()` marker | §14.12.6.3 compile-time-only built-in; hybrid mechanism (Landing 2.5) — presence-discrimination implies the marker; explicit `transition()` required for variant-progression |
| `E-TYPE-LIFECYCLE-ON-ENGINE-CELL` | lifecycle annotation on an engine-cell position (Landing 2; not a struct field) |
| `E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED` | variant-progression missing `transition()` (type-system.ts) |
| `W-LIFECYCLE-LEGACY-ARROW` | legacy `(A -> B)` glyph detected (§14.12.5); migrate to `(A to B)` |
| `runCellValueLifecycleAccessCheck` | **NEW S134 (B-prereq Bug 19)** — extends E-TYPE-001 coverage to Shape 1 plain reactive cells (`<state>: (A to B) = init`) per §14.12.10; type-system.ts:15088 |
| Q6-narrow — §6.8.3 reset × lifecycle | **LANDED S135** — `RESET_CALL_RE` + reset-aware Pass recognizes `reset(@cell)` calls; routes through `classifyWriteAgainstSpec`; reverts per-access state per §6.8.3; Tracker 1 (cell-value) + Tracker 2 (struct-typed). Closes SPEC-ahead bullet. |
| Source-form Fix #1 | **LANDED S135** — `findTopLevelArrow` word-boundary rule; bare-dot variant annotation `(.Draft to.Published)` now detects lifecycle glyph after parser whitespace-collapse |
| Source-form Fix #3 | **LANDED S135** — `parseLifecycleReturnAnnotation` `extractBareVariant` strips both `.Variant` and `Enum.Variant`; diagnostic text shows correctly-stripped names |
| Fix #3 companion | **LANDED S135** — `TRANSITION_CALL_RE` accepts `@` prefix: `transition(@phase)` recognized in V5-strict source form |

## Key Module — ast-builder.js structural-placement guard (LANDED S135)

`compiler/src/ast-builder.js` (**13103 LOC**) — Stage 3 TAB. S135 addition: `STRUCTURAL_ELEMENT_PLACEMENT` table (ast-builder.js:183) + `leadingTagName()` helper (ast-builder.js:214) + two fire sites in `parseLogicBody` (ast-builder.js:6529 + 9744).

- Fires `E-STRUCTURAL-ELEMENT-MISPLACED` when the html-fragment fallback collects an expression whose leading tag-name matches a structural-declaration element.
- 9 structural elements in the table: `schema`, `engine`, `channel`, `page`, `auth`, `errors`, `onTransition`, `onTimeout`, `onIdle`.
- `<match>` intentionally excluded (markup-as-value; canonical in `${...}` promote-match output).
- html-fragment node is still emitted so downstream shapes stay stable; diagnostic rides alongside.

## Key Module — Symbol Table (S134 A4 extension)

`compiler/src/symbol-table.ts` (**10445 LOC**; was 9786; +659 S134 A4) — Stage 3.06 SYM orchestrator; 21 PASSes.
- PASS 11 (`validateEngineStateChildrenAndRules`) — M6.6.b.2 LANDED: calls `walkEngineStateChildren` from `native-walker/engine-statechild-walker.ts`; legacy fallback retained.
- M6.6.b.3 LANDED: `isLegacyArrowRulesBody` + `scanForOnIdleEntries` migrated to native walker.
- V-kill: PASS 3 fires E-STATE-UNDECLARED + E-WRITE-NOT-IN-LOGIC-CONTEXT.
- Per-file exemption: `compiler/src/unit-cc-exemption-list.json`.
- **A4 S134: PASS 2.c `walkRegisterLocalAliases` (symbol-table.ts:1881) + `AliasRecord` interface (symbol-table.ts:820) — extends PASS 6 L21 walker to cover aliased mutation forms; closes §6.6.18 alias-escape gap.**

## Key Module — Meta Checker (S133-S134 changes)

`compiler/src/meta-checker.ts` (**2262 LOC**; was ~2100; +160 S133-S134) — Stage 6.5 MC.
- `META_BUILTINS` narrow (S133): `bun.eval()` user-facing surface removed; Approach C (§22.12) subsumes it.
- **`JS_HOST_FORBIDDEN` set (meta-checker.ts:188, S134 Bug 17)** — categorical set of JS-host ambient globals forbidden in `^{}` per §22.12.
- **`checkJsHostGlobals` walker (meta-checker.ts:1168, S134 Bug 17)** — walks `^{}` bodies recursively; fires E-META-001 for any `JS_HOST_FORBIDDEN` identifier.

## Key Module — MCP-V0 (Sub-units A-E all LANDED at HEAD)

`compiler/src/codegen/mcp-descriptors.ts` (922L) — compile-time extractor producing four read-only descriptor surfaces (`buildMcpDescriptors`); `collectEngine/Form/Channel/ServerFnDescriptors`; FormDescriptor nests rollup keys under `compoundKeys`; EngineDescriptor emits `cellKey`. Local emit-chain mirrors avoid circular import.
`compiler/runtime/stdlib/mcp.js` (~860L) — `scrml:mcp` shim: B-helpers (read) + C-surface (11 LOCKED tools + `startMcpServer`/`shutdownMcpServer` stdio boot). Lazy `import()` of `@modelcontextprotocol/sdk` + `zod` only at boot.
`compiler/src/compute-program-config.ts` (+69 S130-S131) — `McpConfig` struct (`mode:"dev-only"|"always"`); `<program mcp>` bare-present → "dev-only" (boolean-attribute idiom). When non-null, api.js auto-flips `emitPerRoute:true`; build.js injects the `scrml:mcp` boot import into `_server.js`.

The 11 LOCKED tool names (public API — adopter agent configs depend on these): `get_app_topology`, `list_engines`, `get_engine`, `list_forms`, `get_form_status`, `list_routes`, `get_route_chunks`, `list_server_functions`, `list_channels`, `get_channel_state`, `get_reachable_server_fns`. All read-only; the two server-fn tools enumeration-only (`dispatchable:false`). STDIO discipline: stdout is JSON-RPC only; diagnostics → stderr.

## Key Codegen Modules (Stage 8)

`codegen/emit-each.ts` (LANDED S131, 618L) — `<each>` iteration codegen (see Key Module above).
`codegen/code-segments.ts` (S125, ~206L) — shared regex/comment/string fence (`rewriteCodeSegments`, `regexAllowedAfter`); leaf module, NO project imports.
`codegen/rewrite.ts` (**2304 LOC**; +46 S131) — string-rewrite helpers; `rewriteNotKeyword` delegates to `rewriteCodeSegments` (GITI-017); 6nz-S `[ \t]+` + keyword-exclusion; ~snapshot fix (S131 Bug 15): bare-`~`-replacement is word-boundary-aware (`(?<![A-Za-z0-9_$])~(?![A-Za-z0-9_$])`).
`codegen/emit-expr.ts` (+33 S131) — `emitBinary` Bug W precedence-paren re-insertion; ~snapshot Bug 15 (S131): defensive orphan-`~` fallback in emitIdent (emit-expr.ts:277) — bare `~` reaching emitIdent emits `null /* ~ orphaned */` instead of leaking the sigil.
`codegen/emit-logic.ts` (+23 S131) — Phase 3 fast-path orphan-`~` skip at statement position (emit-logic.ts:1182) — the bare-expr fast path skips an orphan `~` (no preceding initializer); closes ~snapshot Bug 15 leak.
`codegen/emit-html.ts` (+65 S131) — each-block mount slot (emit-html.ts:1884) — lazy `require("./emit-each.ts")` for `emitEachMountHtml`.
`codegen/emit-client.ts` (+17 S131) — each-block body render wiring.
`codegen/runtime-chunks.ts` — runtime chunk detection; 6nz Bug P `CHUNK_DEPENDENCIES = { scope: ['timers','animation'] }`.
`codegen/mcp-descriptors.ts` — MCP-V0.A descriptor extractor.
`compiler/src/expression-parser.ts` — `preprocessForAcorn` routes `not`-lowering through `rewriteCodeSegments` (S125) with 6nz-S guards.

## Compiler Spec / Pipeline References

`compiler/SPEC.md` — normative scrml language spec; **30552 lines** (was 30477; +75 S133-S134: §6.8.3 NEW + §14.12.10 normative statements + §22.12 JS_HOST_FORBIDDEN scope note; §6.8.3 + §34 E-STRUCTURAL-ELEMENT-MISPLACED row updated S135 with `${...}` silent-swallow class); last modified 2026-05-26 (commit 3a660c7c). §58 Build Story is the highest-numbered section (spec-ahead). §34 catalog STABLE at 81 native-parser codes. §6.8.3 `reset × lifecycle` IMPL LANDED S135.
`compiler/SPEC-INDEX.md` — navigation map into SPEC.md (380L; regenerated S131).
`compiler/PIPELINE.md` — pipeline-stage reference (+24 S129-S131; last modified 2026-05-25).
`docs/PA-SCRML-PRIMER.md` — adopter-side primer; **S135: Phase-1c catch-up (clusters N/M/K/J/H/I/L; all 26 F-XXX audit gaps CLOSED)**.
`docs/articles/llm-kickstarter-v2-2026-05-04.md` — LLM kickstarter v2 (1941L); **S135: Phase-1c catch-up**.
`docs/known-gaps.md` — spec-vs-impl gap registry; **S135: Bugs 21–27 filed (7 new LOW/heuristic/cleanup)**.

## Milestone Status at HEAD (f6c98ed8 — S135)

| Milestone | Status |
|---|---|
| M6.1..M6.4a | LANDED |
| M6.5 no-op proof | PROVEN |
| M6.5.b.0 within-node canary | LANDED |
| M6.5.b.1 match-arm newline + Dot-UpperIdent | LANDED (S125) |
| M6.5.b.2 structural-decl `<ident>` LHS | PARTIAL (Option B) + M6.5.b.2.1 newline-as-stmt-separator |
| M6.5.b.3 hoist-recursion regression-lock | LANDED |
| M6.5.b.4 bare `?{}` → kind:"sql" promotion (server-SQL leak fix) | LANDED |
| M6.5.b.5/b.6 native→live FileAST shape + span.file | LANDED |
| M6.6.b.1/b.1.5/b.2/b.3 | LANDED |
| M6.7 flag flip | STOP (phase-A flag flip reverted; C/D-class parity fixes landed S127-S129) |
| M6.7 C1/C2 component + codegen parity | LANDED |
| M6.7 D1/D2/D3/D6/D7/D8a-i parity-completeness | LANDED |
| M6.7-D4 object-literal bucket | EMPTY at HEAD (STOP-and-report; stale label) |
| M6.6.b.4..b.6, M6.8 | PENDING |
| MCP V0 Sub-unit A (descriptor extractor) | LANDED + TESTED |
| MCP V0 Sub-unit B (runtime read helpers) | LANDED |
| MCP V0 Sub-unit C (11-tool surface + stdio boot) | LANDED |
| MCP V0 Sub-unit D (`<program mcp>` opt-in wiring) | LANDED (S130-S131) |
| MCP V0 Sub-unit E (E2E + adopter docs + fixture) | LANDED (S131 — series complete) |
| Iteration Landing 1 (`<each>` codegen + W-EACH lints) | LANDED (S131) |
| Iteration Landing 2 (SPEC §17.7 + §3.4 + §56.10) | LANDED (S131 — SPEC catch-up) |
| Iteration Landing 3 (`bun scrml promote --each` CLI) | LANDED (S134) |
| Lifecycle Landing 1 (E-TYPE-001 access-before-transition) | LANDED (S130) |
| Lifecycle Landing 2 (Approach C ext + E-TYPE-LIFECYCLE-ON-ENGINE-CELL + `->`→`to` glyph) | LANDED (S131) |
| Lifecycle Landing 2.5 (fn-return transition-marker) | LANDED (S131) |
| B-prereq (Shape 1 per-access lifecycle tracker, Bug 19 HIGH) | LANDED (S134) |
| A4 (§6.6.18 alias-escape gap, PASS 2.c AliasRecord) | LANDED (S134) |
| Bug 17 (JS_HOST_FORBIDDEN categorical walker, §22.12) | LANDED (S134) |
| META_BUILTINS narrow (bun.eval() retirement) | LANDED (S133) |
| §6.8.3 `reset × lifecycle` SPEC | SPEC LANDED (S134) |
| **Q6-narrow — §6.8.3 `reset × lifecycle` IMPL** | **LANDED (S135)** |
| **Source-form lifecycle follow-ups (Fix #1 + Fix #3 + companion)** | **LANDED (S135)** |
| **E-STRUCTURAL-ELEMENT-MISPLACED `${...}` silent-swallow class** | **LANDED (S135)** |
| **Phase-1c PRIMER + kickstarter catch-up (all 26 F-XXX gaps CLOSED)** | **LANDED (S135)** |
| **Bugs 21–27 filed (LOW/heuristic)** | **S135** |

## Ignored / Generated Paths

`node_modules/`, `compiler/node_modules/`, `compiler/dist/`, `compiler/native-parser/dist/`,
`compiler/self-host/dist/`, `stdlib/*/dist/`, `samples/dist/`, `benchmarks/*/dist/`,
`.git/`, `.claude/`, `archive/`, `handOffs/`

## Monorepo Note

`package.json` declares a Bun workspace `["compiler"]`. `compiler/package.json` is the sub-package manifest (acorn + astring). Single map set covers the whole repo.

## Tags
#scrmlts #map #structure #compiler #native-parser #pipeline #m5-swap #m6-wave1 #m6-7-dclass #stdlib-shims #native-walker #mcp-v0 #mcp-descriptors #mcp-server #code-segments #emit-each #iteration #each #lifecycle #to-glyph #lifecycle-shape1-tracker #lifecycle-reset-aware #alias-escape #js-host-forbidden #structural-in-logic-body #e-structural-element-misplaced #promote-each-landed #snapshot-fix #s131 #s133 #s134 #s135

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [build.map.md](./build.map.md)
- [dependencies.map.md](./dependencies.map.md)
- [domain.map.md](./domain.map.md)
