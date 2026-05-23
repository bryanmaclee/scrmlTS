# Progress: m6.2a-markupvalue-bridge

- Started at /home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-abe00a907ae95c0ba
- Branch: worktree-agent-abe00a907ae95c0ba
- Goal: write translateMarkupValueToLiveNode in translate-stmt.js + wire into makeLiftExpr; re-apply wip-migration.patch; verify bug-5 5/5

## Steps

- [start] Verified worktree path, merged main (8 commits ahead — includes the M6.2 STOP wip-migration.patch). pretest GREEN. Initial WIP commit 70d609a8.
- [step 1] Read root-cause sites:
  - compiler/native-parser/translate-stmt.js:382-396 (makeLiftExpr)
  - compiler/native-parser/translate-expr.js:268-270 (MarkupValue → escape-hatch)
  - compiler/native-parser/parse-expr.js:2054-2186 (parseMarkupValue producer)
  - compiler/native-parser/ast-expr.js:449-462 (makeMarkupValue)
  - compiler/src/types/ast.ts:214-244 (live MarkupNode shape)
  - compiler/src/types/ast.ts:195-197 (LiftTarget shape)
  - compiler/native-parser/parse-file.js:314-343 (synthMarkupNode — the precedent)
  - Consumer survey: 14 consumer sites of `lift-expr.expr.node` (see below).
- [step 2] Implemented `translateMarkupValueToLiveNode(markupValue, counter)` in translate-stmt.js — a local function that mirrors `synthMarkupNode` but lives in the bridge module. Handles BOTH the source-available path (markup is Block[]) AND the token-range fallback (markup is MarkupTokenRange — emits a defensive empty stub). Recurses into nested Markup children. Commit 75974e80.
- [step 3] Initial recursion handled only Markup children — non-Markup children (LogicEscape / Text / Comment) were passed through verbatim. Refactored: added `mapBlocksToNodesForBridge` export to parse-file.js + lazy-require dispatch in translate-stmt.js (mirrors parse-expr.js's parseMarkupViaLazyRequire pattern). Non-Markup children now route through the full synth* dispatch tree. Commit 58984a81.
- [step 4] Added +12 unit tests: 7 in translate-stmt-bridge.test.js §5b + 5 in new m6-2a-markupvalue-bridge-source-aware.test.js. All 14004 tests pass (was 13992 baseline; +12 new tests, 0 regressions). Commit c135f4c7.
- [step 5] Applied wip-migration.patch from docs/changes/m6-2-component-expander/wip-migration.patch. Patch applied cleanly (no reshape needed).
- [step 6] Ran bug-5: 4/5 passing (was 3/5 in the original M6.2 STOP-baseline). Improvement: the 5b typo-detection test now passes (E-COMPONENT-035 fires correctly), and the 5a phantom-DOM checks (createElement) all pass. The remaining failure is `expect(clientJs).toContain("task.title")` — the inner `${task.title}` text-node interpolation is emitted as `String( ?? "")` (empty expression).
- [step 7] Root-cause analysis of the remaining failure: codegen's `emit-logic.ts:914` calls `emitStringFromTree(logicChild.exprNode)`. The `bare-expr.exprNode` from native carries the PascalCase ESTree shape (`kind:"Member"`, `property: { kind: "Ident", name: "title" }`). Live consumers expect the lowercase scrml shape (`kind:"member"`, `property: "title"` as a string). `emitStringFromTree`'s `case "member"` arm at expression-parser.ts:2071-2074 never matches; falls through, returns empty. This is the **expression catalog reconciliation gap** explicitly documented in translate-expr.js:30-38 + the M5 divergence ledger as the R4 / M6.6.b.1 surface — OUT OF M6.2a SCOPE.
- [step 8] Per the brief's STOP-condition ("if the live MarkupNode shape has fields not derivable from native MarkupValue, STOP and surface"), the MarkupNode shape IS fully derivable post-M6.2a. The blocker for the 5/5 invariant is a DIFFERENT bridge layer (expression catalog). Reverted the wip-migration application (component-expander.ts back to live BS+TAB) — landing the migration with a known-failing integration test would block the pre-commit hook on every subsequent commit, so the migration re-apply is deferred to M6.2b post-R4-equivalent.

## Bridge function — final shape

`translateMarkupValueToLiveNode(markupValue, counter): MarkupNode | null` in compiler/native-parser/translate-stmt.js. Returns null on non-MarkupValue input. Defaults to a defensive empty MarkupNode on the source-unavailable MarkupTokenRange fallback. On the source-available path, picks the first Markup block from `markupValue.markup` (an array), then synthesizes a live MarkupNode with `id`, `kind:"markup"`, `tag` (from `block.name`), `attrs`, recursively-converted `children` (via lazy-require to parse-file.js's `mapBlocksToNodesForBridge`), `selfClosing`, `closerForm`, `isComponent` (uppercase-initial gate), `span`.

## makeLiftExpr wiring change

BEFORE (translate-stmt.js:385-386):
```
if (arg && arg.kind === "MarkupValue") {
    target = { kind: "markup", node: arg };       // raw native MarkupValue stored
}
```

AFTER:
```
if (arg && arg.kind === "MarkupValue") {
    const liveNode = translateMarkupValueToLiveNode(arg, counter);
    target = { kind: "markup", node: liveNode };  // live MarkupNode stored
}
```

## bug-5 regression

- Baseline (this branch, default parser, no migration): 5/5
- M6.2 STOP commit a30c2b17 baseline (migration applied without M6.2a): 3/5
- This branch (M6.2a bridge alone, no migration): 5/5 (default parser unaffected)
- This branch (M6.2a bridge + wip-migration.patch applied): 4/5

The 4/5 result represents real progress (3/5 → 4/5). The remaining failure (task.title text-interpolation) requires expression-catalog reconciliation, NOT another MarkupNode bridge layer. M6.2a's scope is closed.

## M6.2 wip-patch re-apply: DEFERRED to M6.2b

The patch applied cleanly (no reshape needed). It is NOT being landed in M6.2a because:
1. The pre-commit hook runs bug-5 and blocks any commit that leaves a known-failing integration test in tree.
2. The remaining failure is owned by a DIFFERENT bridge layer (expression catalog — R4 / M6.6.b.1).
3. Landing the migration prematurely would block all subsequent compiler commits behind a hook failure.

**M6.2b re-apply path:** once the expression catalog reconciliation lands (or once codegen / emitStringFromTree learns to read PascalCase native exprNodes), simply `git apply docs/changes/m6-2-component-expander/wip-migration.patch` and verify bug-5 5/5. Estimated 1-2h.

## Tests added

- compiler/tests/unit/translate-stmt-bridge.test.js §5b — 7 unit tests covering converter shape, isComponent derivation, defensive folds, token-range fallback, recursive children.
- compiler/tests/unit/m6-2a-markupvalue-bridge-source-aware.test.js — 5 integration smoke tests covering the source-available path via nativeParseFile.

## Test pre/post counts

- Pre: 13992 tests across 709 files passing
- Post: 14004 tests across 710 files passing (+12 bridge tests, 0 regressions)

## Other consumers of `lift-expr.expr.node` (survey)

Beyond component-expander, consumers found via grep:

- compiler/src/name-resolver.ts:375 — walks `anyN.expr.node` recursively when `expr.kind === "markup"`.
- compiler/src/dependency-graph.ts:2704, 2729 — destructures LiftTarget + recurses into markup body.
- compiler/src/codegen/emit-lift.js:1321, 1743 — emits structured `{kind:"markup"}` nodes for inline lift markup.
- compiler/src/codegen/emit-table-for.ts:320, 328 — both producer + downstream reader.
- compiler/src/symbol-table.ts:1205, 1327 — walks `lift-expr.expr.node` for markup tree.
- compiler/src/component-expander.ts:2497, 2533 — the canonical consumer (the one that prompted M6.2a).
- compiler/src/codegen/collect-class-names.ts:45 — doc comment, walks the same shape.

All these consumers receive the LIVE MarkupNode shape post-M6.2a (when fed from native-parser via lift-expr). Without M6.2a they would all silently miss on `expr.node.tag` / `.children` / `.isComponent`.

## Maps load-bearing finding

The maps were stale at the start of this session — `primary.map.md` referenced commit a8904945 (S121), but main was at a30c2b17 (S122 post-M6 wave). The merge brought 8 commits in. The maps did not block work (the navigation was done directly via grep + file reads), but if relying on `domain.map.md` line ranges for ast.ts / native-parser modules, those would have been off by recent edits. Recommend a `primary.map.md` Updated: timestamp refresh post-M6.2a.

## Deferred items

1. **M6.2b — re-apply wip-migration.patch**: blocked on expression-catalog reconciliation. Patch preserved at docs/changes/m6-2-component-expander/wip-migration.patch (231 lines, applies cleanly).
2. **Expression-catalog reconciliation (R4 / M6.6.b.1)**: native produces PascalCase ESTree-shaped expression nodes (Member/Ident/Call/Binary/...) but downstream consumers (emit-logic.ts → emitStringFromTree, expression-parser.ts case statements) expect lowercase scrml shapes. translate-expr.js:30-38 documents this as a separate unit.
3. **synthMarkupNode → translateMarkupValueToLiveNode shared-helper extraction**: M6.2a duplicates the live-MarkupNode synthesis logic in translate-stmt.js to avoid a top-level circular import with parse-file.js. The lazy-require pattern handles non-Markup children; the top-level Markup-block conversion is local. A future cleanup could unify via a third module (e.g. synth-markup-node.js). NOT done here — out of scope.
