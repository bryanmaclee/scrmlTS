# Pre-snapshot: m6.2a-markupvalue-bridge

- HEAD: $(git rev-parse HEAD)
- bug-5 baseline: 5 pass / 0 fail (default parser; LIVE BS+TAB)
- M6.2 wip-migration.patch present at docs/changes/m6-2-component-expander/wip-migration.patch (231 lines)
- M6.2 STOP-doc analysis (commit a30c2b17) identifies fix locus:
  * compiler/native-parser/translate-stmt.js:382-396 — makeLiftExpr leaves raw native MarkupValue inside lift-expr.expr.node
  * compiler/native-parser/translate-expr.js:269-270 — native MarkupValue routed to escape-hatch

## Bridge design (decided after reading)
- A live MarkupNode has shape `{ id, kind:"markup", tag, attrs:AttrNode[], children:ASTNode[], selfClosing:bool, closerForm:string, isComponent:bool, span }` (ast.ts:214-244)
- The native MarkupValue `arg.markup` field holds an ARRAY of native Markup blocks (parse-expr.js:2104 — `trace.ctx.nodes.slice(0, 1)`). It is the same shape parse-markup.js produces top-level.
- parse-file.js already has `synthMarkupNode` (lines 326-343) that does this conversion. Its dependencies are: `mapBlocksToNodes` (recursion), `stampId`, `isUpperInitial`.
- The cleanest bridge: EXPORT `synthMarkupNode` + `mapBlocksToNodes` + `stampId` + `isUpperInitial` from parse-file.js so makeLiftExpr can call them. This reuses the existing converter end-to-end and avoids duplicating the BlockKind dispatch (state/engine/etc.) inside translate-stmt.

## Risk / scope
- The conversion lazily-imports parse-file.js to avoid a circular dep (translate-stmt is imported by parse-file).
- Counter sharing: makeLiftExpr currently uses `counter` (the per-file id allocator). parse-file's `idGen` shape is also `{ next }` — same shape. Pass `counter` through.
- Fallback shape: if the MarkupValue carries a token-range fallback (no source path; parse-expr.js:2184 `kind: "MarkupTokenRange"`), the conversion is best-effort empty (token-range MarkupValue is not a Markup block — return a stub markup node so component-expander does not crash, or pass through to escape-hatch).
- The MarkupValue `markup` field MAY be either an ARRAY of Block[] (source-available path) OR a single MarkupTokenRange object (source-unavailable path) — handle both.
