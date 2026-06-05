# non-compliance.report.md
# project: scrmlts
# generated: 2026-06-05T20:30:00Z
# scan mode: INCREMENTAL_UPDATE (watermark f11db672 → e947c924, S164-late + S165 native-parser-swap grind)
# prior scans: INCREMENTAL_UPDATE at 97fe2199 (S157-S158); 57edc794 (S154-S156); c665714c (S153); FULL_COLD_START at 948d3f2f (2026-05-30)

## Summary

Total docs scanned (incremental delta — new/modified docs f11db672 → HEAD, excl. handOffs/): 21 new + 4 modified
Compliant (new docs): 19
Non-compliant (new findings): 0
Uncertain / locus-drift flags (new findings): 2
Carried uncertain (Bug 69 / NON-GAP tension): 1 (unchanged — still needs user confirmation)

All new docs in the delta are native-parser-swap dispatch archives (BRIEF.md + progress.md pairs)
under `docs/changes/native-*` plus one triage map. Every key identifier in the LANDED-family BRIEFs
grep-resolves in current source — those are COMPLIANT historical dispatch records. The two flags
below are LOCUS-DRIFT items that a native-parser fix-dispatch agent MUST know before trusting an
older BRIEF or the triage's pointed loci.

## New Docs S164-late + S165 — Compliant (identifiers verified against current source)

All LANDED-family BRIEFs + progress.md grep-resolve their key identifiers:
- `native-f2match-literal-arm-2026-06-05/` — `makeLiteralPattern` (ast-expr.js+translate-expr.js), `MatchArmPatternKind.Literal`, `parseMatchArmPattern` (parse-expr.js). LANDED `2c2e5bb2`.
- `native-promote-each-iterable-field-2026-06-05/` — `makeForStmtCStyle`/`makeForStmtInOf` (translate-stmt.js), `keyExpr`/`elseBody` (ast-stmt.js+parse-stmt.js). LANDED `785f24d1`.
- `native-typed-atcell-decl-2026-06-05/` — `parseTypedAtStateDecl` (parse-stmt.js). LANDED `89912bb9`.
- `native-server-fn-star-2026-06-05/` — `BARE_DECL_RE` (parse-markup.js), `makeYieldStmt` (translate-stmt.js). LANDED `26a24b71`.
- `native-attrvalue-exprnode-population-2026-06-04/` — `populateNativeAttrValueExprNodes` (native-walker/attrvalue-exprnode-walker.ts), `safeParseExprToNodeGlobal` (now EXPORTED from ast-builder.js). LANDED `c1566faa`.
- `native-f1narrow-b2-msgarm-2026-06-04/` — `parseMessageArms` (engine-statechild-parser.ts + native-walker), `acceptsType` (collect-hoisted.js synthEngineDecl). LANDED `7cbad5dd`.
- `native-lift-markup-closetag-span-2026-06-04/` — lex-in-code.js `/`-branch fix. LANDED `649f4ef8`.
- `native-sql-chained-form-f2a-2026-06-04/` — `reconstructChainedSql` (translate-stmt.js). LANDED `7e54f321`.
- `native-tablefor-struct-field-drop-2026-06-04/` — `typeBodyText`/`joinWithNewlines` (parse-stmt.js). LANDED `66301357`.

New test files all grep-resolve (COMPLIANT):
- `compiler/tests/unit/native-attrvalue-exprnode-population.test.js`
- `compiler/tests/unit/native-lift-markup-closetag-span.test.js`
- `compiler/tests/unit/native-sql-chained-form-f2a.test.js`
- `compiler/tests/unit/native-tablefor-struct-field-drop.test.js`

## Uncertain / Locus-Drift Flags (READ BEFORE THE NEXT NATIVE-PARSER FIX DISPATCH)

### docs/changes/native-sql-body-server-fn-f2-2026-06-04/BRIEF.md — STALE LOCUS POINTER (in-flight family)
**Reason:** locus-drift — the BRIEF's "Locus (triage-pointed; confirm)" names
`compiler/native-parser/parse-sql-body.js` as where native drops the `?{}` SQL body in `server function`
bodies. The S164 TRIAGE (docs/changes/native-swap-triage-s164/TRIAGE.md) **CORRECTED this**:
`parse-sql-body.js` handles markup/block-position `?{}` fine; the real loci are `translate-stmt.js`
(chained form — F2a, since LANDED `7e54f321`) and `translate-expr.js translateSql` (sql-ref nodeId:-1).
The F2 family also hit a PHASE-0 SURVEY-STOP and was DECOMPOSED into 3 roots; this BRIEF has NO progress.md
(it stopped at survey). `parse-sql-body.js` is UNTOUCHED since 2026-05-21 (not changed in this delta).
**Detail:** F2 status at S165: F2a chained-form CLOSED (`7e54f321`); F2-generator `server function*` SQL
PARTIALLY addressed by S165 server-fn-star lift (`26a24b71` — the `function*` now lifts + yield translates,
which was the gating sub-root). Remaining F2 OPEN sub-roots: top-level server-fn `?{}` body-drop and
assign-RHS `@x = ?{}.all()` (state-decl-routed, E-RI-002).
**Suggested disposition:** KEEP (it's an in-flight family record), but a fix-dispatch agent targeting F2
MUST read the TRIAGE's corrected decomposition + re-run the flip harness, NOT trust this BRIEF's
parse-sql-body.js pointer. The maps (domain "Native-Parser Swap Orientation" F2 row + structure
File Table) now carry the corrected loci.

### docs/changes/native-engine-message-arm-b2-2026-06-04/BRIEF.md — SUPERSEDED (earlier framing of LANDED work)
**Reason:** this is an earlier standalone B2-only framing that was rolled into the combined
`native-f1narrow-b2-msgarm-2026-06-04` dispatch (which carries progress.md + landed `7cbad5dd`). No
progress.md of its own. Its identifiers all resolve; it accurately describes work that LANDED.
**Detail:** harmless historical duplicate. Its "Map currency: maps reflect HEAD `154a1799`" and "flag
B2 as THE NEXT DISPATCH" lines are now stale (B2 CLOSED S164) — but that is internal-to-the-BRIEF
historical context, not a live map.
**Suggested disposition:** KEEP as historical dispatch record; no action. Map prose is now accurate
(B2 marked LANDED/CLOSED in primary/structure/domain).

## Cross-cutting note for the fix-dispatch agent (LOCUS-RELIABILITY)

`docs/changes/native-swap-triage-s164/TRIAGE.md` itself records a **LOCUS-RELIABILITY NOTE**: the triage's
pointed loci have been WRONG twice (F2 → pointed parse-sql-body.js, fix was translate-stmt.js;
lift-closetag → pointed parse-expr span, fix was lex-in-code.js). The reliable signal is the EMPIRICAL
SYMPTOM (default exit-0 vs `--parser=scrml-native` fail/miscompile + the byte-diff), NOT the locus
pointer. The maps now propagate this: the native-parser-swap task-shape routing in primary.map.md and the
domain orientation block both instruct the agent to RE-RUN the flip harness to re-rank the remaining 451
before picking a family, and treat any locus pointer (BRIEF or triage) as a hypothesis to verify in Phase 0.

This matches the global memory lesson: cookbook/SCOPING/triage claims may be empirically wrong;
cross-reference against an empirical probe BEFORE encoding into a dispatch brief.

## Modified Docs in Delta — Compliant

- `docs/changelog.md`, `hand-off.md`, `master-list.md` — session-tracking docs; S165 WRAP entries match landed commits.
- `.claude/maps/{primary,structure,domain}.map.md` — refreshed THIS pass to e947c924 (the subject of this report).

## Uncertain Docs — Carried (unchanged)

### hand-off.md (Bug 69 / NON-GAP tension)
**Reason:** Map-level inconsistency between two authoritative documents (carried since S156).
**Detail:** user said "fold Bug 69 in too" (tableFor §41.16.6 subset reach) at S156; the S156 CLOSE DONE
block classified Bug 69 as "NON-GAP (display-subset-irrelevant for v1.0)." Maps written consistent with
the DONE block (batch 5 not scheduled).
**What to check:** Confirm with user whether (d)-A batch 5 (Bug 69 / tableFor subset reach in
`emit-table-for.ts` `_processTableForNode`) runs, or Bug 69 is retired NON-GAP.

### docs/heads-up/spec-consolidation-2026-05-25.md — UNCERTAIN (carried)
**Reason:** frontmatter `status: in-progress`; Phase 2 amendment TBD landings (§6.10, §52.4, §55) not executed.
**What to check:** whether the open TBD landings are scheduled or deferred-indefinitely.

## Prior FULL_COLD_START Non-compliant (at 948d3f2f — unchanged; dispositions still pending PA action)

- compiler/native-parser/M5-SWAP-residual-decomposition.md — content-heuristic + spec-draft (`status: superseded`) → deref to scrml-support/archive/
- compiler/native-parser/M5-ast-bridge-scoping.md / M5-divergence-ledger.md — UNCERTAIN: the S153 "does NOT promote each/match" precondition these docs encode is CLOSED (S162); each/match-no-structural-promotion is RESOLVED. The live divergence is now the ~5-family flip set at 451 (S165), NOT each/match promotion. These M5 docs predate every S162-S165 native landing and describe a stale bridge contract. Verify/refresh-or-deref.
- compiler/native-parser/M6.6-CONTRACT-DERIVATION.md — verify M6.6.b.1 contract is current (predates S163-S165 substrate + parity-closer landings)
- docs/changes/v0next-inventory/{SCOPE-MAP,SCOPE-SUPPLEMENT,ARTICLE-TRUTHFULNESS-AUDIT} — content-heuristic + location → deref to scrml-support/archive/
- docs/audits/* (articles-currency-table, wave-3-7-corpus-ouroboros, scrml-support-currency-sweep, self-host-spec-conformance, scrml-dev-content-spec-fidelity, spec-consolidation-inventory, spec-corroboration-canons-pipeline, spec-feature-canon-coverage) — location (belong in scrml-support/docs or /archive)
- docs/changes/{match-block-form-scoping,serialize-scoping,v0.3.x-spa-tree-shake,schemaFor-impl,tilde-codegen,tilde-gaps-567,v0.3-approach-a-spec}/SCOPING/SURVEY — planning/closed arcs → verify-or-deref

(Full per-doc dispositions retained from the 948d3f2f FULL_COLD_START scan — see git history of this file.)

## Infra Note — map header-commit drift

### .claude/maps/{dependencies,config,build,error,schema}.map.md — HEADER STALE (content current-but-unverified)
The S164-S165 delta touched ONLY native-parser `.js` + native-walker `.ts` + api.js routing + the
2-line ast-builder.js export. It added NO new error codes (native now emits EXISTING codes correctly —
E-ENGINE-ACCEPTS-NOT-ENUM no longer mis-fires post-B2; E-EXPR-MATCH-PATTERN no longer fires on string-lit
arms), NO new live `ast.ts` AST shapes (native node-shape changes are translated to existing live shapes by
`translate-*.js`; `EngineDeclNode.acceptsType` was already in schema.map at S154 and is now merely POPULATED
by the native walker), NO manifest/config/build changes. So error/schema/dependencies/config/build CONTENT
is accurate; their headers were intentionally NOT re-stamped (a header stamp implies the content was
re-verified at that commit). primary/structure/domain/test were content-refreshed to e947c924.
**Suggested disposition:** at the next FULL_COLD_START, re-stamp all map headers to a single watermark.

## Tags
#non-compliance #project-mapper #cleanup #scrmlts #s165 #native-parser-swap #locus-drift #f2-sql #b2-message-arm

## Links
- [primary.map.md](./primary.map.md)
- [structure.map.md](./structure.map.md)
- [domain.map.md](./domain.map.md)
- [project master-list](../../master-list.md)
- [project pa.md](../../pa.md)
- [scrml-support archive convention](../../../scrml-support/pa.md)
