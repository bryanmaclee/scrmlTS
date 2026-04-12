# scrmlTS — Session 10 Hand-Off

**Date:** 2026-04-12
**Previous:** `handOffs/hand-off-9.md`
**Baseline at start:** 6,000 pass / 146 fail across 6,146 tests (main @ `8b4b961`)

---

## Session 10 — in progress

### Work log

1. **Fix: `_scrml_eq` → `_scrml_structural_eq`** — emit-expr.ts emitted wrong runtime function name for `==`/`!=` operators. Also improved runtime chunk detection in emit-client.ts: ExprNode-valued field scanning + `logic.body` recursion for `--embed-runtime` mode.

2. **Phase 4d Slice 2 — ExprNode walker utilities** — 7 new helpers in expression-parser.ts:
   - `exprNodeContainsCall(node, calleeName?)` — replaces `extractCalleesFromExpr`, `LIFT_CALL_RE`, `includes("(")`
   - `exprNodeCollectCallees(node)` — replaces `extractCalleesFromExpr`
   - `exprNodeContainsReactiveRef(node)` — replaces `/@[A-Za-z_$]/` regex
   - `exprNodeContainsAssignment(node)` — replaces assignment-in-condition detection
   - `exprNodeContainsMemberAccess(node, props[])` — replaces DOM manipulation regex
   - `exprNodeMatchesIdent(node, name, exact?)` — replaces string identity checks
   - `classifyLiteralFromExprNode(node)` — replaces `extractInitLiteral`

3. **Phase 4d Slice 3 — Semantic pass migration** — Added ExprNode-first guards with string fallback across 6 files (~25 sites):
   - **meta-checker.ts** — LIFT_CALL_RE → `exprNodeContainsCall(exprNode, "lift")`
   - **meta-eval.ts** — `/@[A-Za-z_$]/` → `exprNodeContainsReactiveRef(exprNode)`
   - **dependency-graph.ts** — reactive ref detection, callee extraction, lift-expr refs, markup sweep
   - **route-inference.ts** — all 6 `extractCalleesFromExpr` sites → `extractCalleesFromNode` helper
   - **type-system.ts** — `extractInitLiteral` → `classifyLiteralFromExprNode`, `includes("(")` → `exprNodeContainsCall`
   - **component-expander.ts** — `expr === "children"` / `"..."` → `exprNodeMatchesIdent`

### State

| Metric | S9 End | S10 Current |
|--------|--------|-------------|
| Tests | 6,000 / 146 fail | **6,000 / 146 fail** (no change) |
| ExprNode coverage | 99.0% | 99.0% |
| Semantic passes on ExprNode | 0 | **6 files migrated** (~25 sites) |

### Not migrated (deferred)
- `bodyUsesCompileTimeApis` — regex with negative lookbehind too nuanced for simple walker
- `checkExprForReflect` — extracts reflect() arguments, needs purpose-built ExprNode walker
- `SQL_CONTEXT_RE` — `?\{` is syntactic, not expressible as ExprNode
- `render SlotName()` pattern — non-standard two-word form, not parseable as JS
- `detectServerOnlyResource`, `bareExprAccessesField`, `declDestructuresField` — string pattern matching on domain-specific syntax

### README gaps (user-identified)
- Missing: runtime meta docs, `<program>` in examples, lin agnostic-site semantics, Tailwind support, mutability contracts + state-as-first-class
- Dead links: tutorial, benchmarks, lang overview, API ref, design notes
- Stale benchmarks

### Next up
1. **Phase 4d Slice 4** — make ExprNode required, drop string fields (big-bang, feature branch)
2. **Fix TodoMVC E-SCOPE-001** — scope checker needs to handle `@var.prop` in attributes
3. **README overhaul** — fix dead links, add missing sections, update benchmarks
4. **Machine transition guards** — wire guard emission (T2)
5. **Other master-list items** — unblock giti/6nz

---

## Tags
#session-10 #in-progress #phase-4d-slice2 #phase-4d-slice3 #semantic-pass-migration #readme-gaps

## Links
- [handOffs/hand-off-9.md](./handOffs/hand-off-9.md) — S9 final
- [pa.md](./pa.md)
- [master-list.md](./master-list.md)
