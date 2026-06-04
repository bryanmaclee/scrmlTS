# Progress — native-each-block-promotion-2026-06-04

## 2026-06-04 — startup
- pwd: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a7df7880a70891f3d
- Merged main (ff-only) -> HEAD 810ce386; bun install + pretest OK.
- Maps read: primary.map.md (confirms M5-swap precondition: native does NOT promote each/match -> structural; lines 148/153).
- Probed native block tree for each fixtures:
  - `<each>` currently tagKind=Html (UNPROMOTED) -> routes to synthMarkupNode.
  - block.attrs carries in/of/as/item/key parsed; `as item` => two absent-valued barewords `as`+`item`.
  - block.children is clean walkable array; `<empty>` is name="empty" markup child.
  - colon-shorthand `<li : @item.name>` => closerForm=null, colonShorthandBody="@item.name", nChildren=0.
  - standalone `<span : @label>` => colonShorthandBody="@label", nChildren=0 (sub-unit d general fix).
  - attr value span-slice recovers complex `in=@items.filter(c => c.active)` raw text faithfully.

## Plan
- (a) register `each:true` in STRUCTURAL_ELEMENTS + isEachBlock predicate + mapOneBlock dispatch branch.
- (b)+(c) synthEachBlockNode: read in/of/as/key attrs, partition children -> templateChildren/emptyChild/bodyChildren, span/bodyRaw/openerHadSpaceAfterLt.
- (d) synthMarkupNode colon-shorthand: map colonShorthandBody -> shorthandBodyRaw + closerForm:"shorthand" (general).
- tests + Phase 3 empirical verify + within-node parity.

## 2026-06-04 — (a)+(b)+(c)+(d) landed
- (a) STRUCTURAL_ELEMENTS += each (tag-frame.js + .scrml mirror); registry comment cites §17.7/§18.5.6 + flags §4.15/§24.4 SPEC-registry GAP (REPORTED to PA).
- (a) isEachBlock predicate (name-based, mirrors isMatchBlock) + mapOneBlock dispatch branch before generic synthMarkupNode fall-through.
- (b)+(c) synthEachBlockNode + helpers readEachIterRaw/readAsName/collectEachBodyRaw. Reads in/of/key span-slices, as-name (two-bareword shape), partitions block.children -> templateChildren/emptyChild/bodyChildren, iterShape tie-break to "in" (live L12010), openerHadSpaceAfterLt from tagKind.
- (d) synthMarkupNode maps block.colonShorthandBody -> closerForm:"shorthand" + shorthandBodyRaw; selfClosing false when shorthand body present. GENERAL (each per-item + standalone <span : @label>).
- Probe FileAST verified: each-block promoted (in/of/empty/colon-shorthand), W-ATTR-001/E-SCOPE-001 GONE, standalone shorthand carries body. node --check clean.
- SPEC cross-check: §4.15 L1067 lists SEVEN (no each); §17.7/§18.5.6 L10458/L10474 name <each> a structural element. Gap = SPEC follow-up (no SPEC edit per brief scope).
- NEXT: tests + Phase 3 empirical + within-node parity.

## 2026-06-04 — tests + each-in-match-arm coupling resolved
- native-each-promotion.test.js: 18 tests (in/of/as/key/empty/colon-shorthand/standalone-shorthand/each-in-match-arm/native-vs-default parity). All pass.
- each-in-match-arm coupling RESOLVED + understood: NEITHER pipeline promotes inner each in match-block.bodyChildren (live collapses arm bodies to raw text + re-parses in match-statechild-parser; native preserves raw native blocks + SAME downstream re-parse promotes). Coupling lives at CODEGEN seam. Empirical: each-in-match-arm native client.js has _scrml_reconcile_list(1) + _scrml_resolve_item(1) matching default; 70-line diff is PURELY node-id offset (match_11 vs match_10, each-mount id ±1) — semantically identical. §8 test rewritten to assert the codegen contract (not the bodyChildren walk).

## 2026-06-04 — Phase 3 + sub-unit (d) standalone body-child synthesis
- Phase 3 (8 shapes, native vs default client.js): 5 IDENTICAL (each-in-collection, each-of-count, each-colon-shorthand[@.name], standalone-colon-shorthand) + each-in-match-arm id-offset-only (semantically identical). W-ATTR-001=0, E-SCOPE-001=0 everywhere. node --check clean all.
- 3 shapes (each-as-name, each-empty, each-key) 8L-diff = `${item}`/`${@.name}` text-interpolation "// each: empty logic interpolation skipped". ROOT CAUSE: emit-each.ts L342-345 reads stmt.expr (native bridge sets expr:"" + populates exprNode per translate-stmt.js L420-425 documented contract "codegen prefers exprNode"). emit-html L1015-1016 reads exprNode correctly (plain interp IDENTICAL). => emit-each CODEGEN gap, OUT OF SCOPE per brief ("NO codegen edits... STOP and report"). DEFERRED.
- sub-unit (d) STANDALONE completion: setting shorthandBodyRaw alone left <span : @label> rendering EMPTY under native (emit-html iterates children; none present). Added body-child synthesis in synthMarkupNode mirroring LIVE S159 R1 (ast-builder.js L12238-L12340): parseLogicBodyBestEffort(bodyRaw) + translateStmtList -> synthetic logic child carrying bare-expr.exprNode. Guards: lowercase HTML (!isUpperInitial), non-void (!isVoidElementName), children empty, NOT @.-sigil (each per-item owned by emit-each). Imports: parseLogicBodyBestEffort + isVoidElementName.
- Result: standalone <span : @label> now BYTE-IDENTICAL native-vs-default. @.name each per-item correctly skips child (children:0 matching LIVE). <li : @item.name> named-var synthesizes child matching LIVE (1 child). 116 existing each tests pass (0 regression).
- Unit tests: 22 pass (added §10 standalone body-child synthesis + @. skip + void guard).

## 2026-06-04 — directive-attr guard + crash-fix + within-node rebump
- WITHIN-NODE PARITY (S125): standalone synthesis initially crashed examples/27 + examples/07 (PARSE-FAILURE) — parseLogicBodyBestEffort(null ctx) deref'd ctx.diagnostics. FIX: pass throwaway ctx {diagnostics:[]} + defensive try/catch (mirrors live R1 _synthErrors discard).
- ROOT CAUSE of residual increase: native tag-frame mis-captured `<column :let={(user) => ...}/>` (tableFor §41.16 slot callback) as a phantom colonShorthandBody (the space-preceded `:let` looked like `: expr`). LIVE BS treats it as a self-closing directive opener (closerForm "self-closing", NOT shorthand; column has rendersToDom:false). My (d) synthesis then mis-rendered the callback. FIX: colonIntroducesDirectiveAttr guard in tag-frame.js recognizer (+ .scrml mirror) — `:` + simple-attr-name + `=` (not `==`/`=>`) is a directive attr, not shorthand. Mirrored both .js + .scrml (S115 drift-prevention; bool-negation via `!` not `is not given`).
- POST-FIX within-node delta (per file, examples/27 + examples/07): COUNT-LENGTH 3->2 (-1, IMPROVEMENT — column child-count now matches live), SPAN-COORD +2 (newly-aligned column-children nodes' spans differ from live). Net structurally better. Allowlist rebumped: 27 {COUNT-LENGTH 3->2, SPAN-COORD 66->68}, 07 {COUNT-LENGTH 3->2, SPAN-COORD 111->113}. Total 100636 -> 100638 (+2). PARSE-FAILURE 0. within-node test GREEN 1005 pass/0 fail.
- Verified: baseline-native AST spans == head-native AST spans for these files (my change only affects the :let column shape). standalone <span : @label> still byte-identical. @.name each per-item still skips child. 116 existing each tests pass.
- Unit tests: 24 pass (added §11 :let directive guard + control real-shorthand).
