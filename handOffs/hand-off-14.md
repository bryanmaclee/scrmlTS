# scrmlTS — Session 14 Hand-Off

**Date:** 2026-04-14
**Previous:** `handOffs/hand-off-13.md`
**Baseline at start:** 6,130 pass / 15 fail (from S13 end state)
**Baseline at end:** 6,153 pass / 14 fail (+23 pass, -1 fail, zero regressions)

---

## TL;DR for the next PA

S14 was a heavy structural session. Five major threads landed with zero regressions:

1. **Match-as-expression (§18.3)** — `const x = match expr { .A => v }` now works (S13 debate consensus)
2. **Phase 4d** — ExprNode-first migration complete; all string fields deprecated; consumers read `initExpr`/`exprNode`/etc. first with escape-hatch fallback. Dead string-fallback paths retained for backward compat.
3. **`</>` closer fix** — 2026-04-09 spec amendment was incomplete; `collectLiftExpr` still used bare `/`; fixed AST builder + 11 sample files migrated.
4. **`:>` match arrow** — completed codegen support. Both `=>` and `:>` are canonical; `->` is legacy alias. Debate winner: `:>` (TS 29/35, Svelte 29/35).
5. **Lift Approach C Phase 1** — the big one. `parseLiftTag` in ast-builder.js now produces structured `{kind: "markup"}` for 100% of real inline lift markup (was 0%). The fragile re-parse + string-parser paths are dead in production, retained only for legacy test fixtures.

**Context investment this session:** 13 commits, 20 new tests, significant refactoring across compiler + tests.

---

## Next-session priorities (ordered)

### 1. Master push coordination (do first)

Send `needs:push` message to master. This session touched:
- `compiler/src/ast-builder.js` (major: `parseLiftTag`, `</>` closer fix, `</>` in collectLiftExpr)
- `compiler/src/codegen/emit-logic.ts` (match-as-expr decl, `_wrapDeepReactive`, extractReactiveDepsFromExprNode, match arm text preference fix)
- `compiler/src/codegen/emit-control-flow.ts` (`:>` support, ExprNode-first match arms)
- `compiler/src/codegen/emit-lift.js` (Phase 4d ExprNode-first, @deprecated markers)
- `compiler/src/codegen/reactive-deps.ts` (new `extractReactiveDepsFromExprNode` export)
- `compiler/src/type-system.ts` (Phase 4d ExprNode-first at multiple sites)
- `compiler/src/meta-eval.ts`, `meta-checker.ts`, `dependency-graph.ts`, `component-expander.ts` (Phase 4d)
- `compiler/src/types/ast.ts` (string fields deprecated on 20+ interfaces)
- 11 samples migrated to `</>`
- `samples/compilation-tests/match-as-expression.scrml`, `match-colon-arrow.scrml` (new)
- `compiler/tests/unit/lift-approach-c.test.js` (new, 20 tests)
- `compiler/tests/unit/component-ex05-regression.test.js` (updated expectation)

No siblings touched this session. Push just scrmlTS.

### 2. Phase 3 — Legacy test fixture migration (enables deletion)

**What:** ~21 test fixtures in `compiler/tests/unit/emit-lift.test.js`, `value-lift-tilde.test.js`, `emit-match.test.js` hard-code `{kind: "expr", expr: "< li > ... /"}` with bare-`/` closer (old syntax). These are the only callers of the `@deprecated` string path in emit-lift.js.

**Path:** Rewrite the fixtures to use `{kind: "markup", node: <MarkupNode>}` shape. Then delete from emit-lift.js:
- `parseTagExprString` (~60 lines)
- `emitCreateElementFromExprString` (~80 lines)
- `splitChildTagSegments` (~60 lines)
- Re-parse block in `emitLiftExpr` (~50 lines)
- The `expr` branch in `emitLiftExpr` for markup-looking text

**Caution:** `hasFragmentedLiftBody` and `emitConsolidatedLift` (~430 lines) handle *fragmented* lift bodies — a different scenario from the string path. Verify fragmentation still occurs before deleting. Run `rg "hasFragmentedLiftBody" --count` on a real sample after parsing to see.

**Payoff:** ~250–300 LOC deletion, simpler mental model, faster compile.

### 3. Lin Approach B (multi-session)

User's original vision: discontinuous scoping (not Rust-style linear). Deep-dive at `scrml-support/docs/deep-dives/lin-discontinuous-scoping-2026-04-13.md`. Spec amendments drafted. Multi-session scope. **Read the deep-dive first.**

### 4. Phase 2 reactive effects

Two-level effect separation for if/lift. S13 debate concluded "when needed." No concrete driver yet — let examples surface the need.

### 5. Remaining 14 test failures (low priority, all pre-existing)

| Count | Category | Status |
|---|---|---|
| 8 | TodoMVC happy-dom | Environment issue, not compiler |
| 2 | Self-host | Need `--self-host` build step |
| 2 | type-system importedTypesByFile | Pre-existing |
| 1 | if-as-expression (statement still works) | Pre-existing edge case |
| 1 | reactive-arrays innerHTML vs reconciliation | Codegen choice |

None block beta. Triage if context is cheap.

---

## Session 14 detailed work log (for reference)

### Compiler fix landed: Match-as-expression (§18.3)

`let result = match expr { .Variant => value else => default }` now works. Follows if/for-as-expression pattern: intercepts `match` after `let/const name =`, parses structurally via `parseRecursiveBody`, emits tilde-var assignment.

**Files:** `types/ast.ts` (added `MatchExprNode`, `ForExprNode` + decl fields), `ast-builder.js` (4 insertion sites + `parseOneMatchAsExpr`), `emit-logic.ts` (`emitMatchExprDecl`), `emit-control-flow.ts` (exported shared arm parsing).

### Phase 4d — ExprNode-first migration (5 batches)

**Batch 1** — `condition`, `iterable`, easy `init` sites converted.
**Batch 2** — DG tilde-decl @var detection, TS callee extraction, return-stmt values, meta-eval scope injection.
**Batch 3** — emit-lift, match arms, switch cases, fragment detection.
**Batch 4** — AST builder always populates ExprNode fields (`safeParseExprToNode` returns `EscapeHatchExpr` instead of undefined). Two omissions fixed (`let-decl` no-`=`, `parseOneForStmt`).
**Batch 5** — String fields deprecated + made optional on 20+ AST interfaces.

**Net effect:** String fallback paths are dead code. New consumer code should always use ExprNode fields.

### `</>` closer propagation (Phase 0 of Lift Approach C)

- `collectLiftExpr` line 1107: was `angleDepth--` on bare `/`. Fixed to detect `<` + `/` sequence.
- 11 sample files migrated: 45+ bare `/` → `</>`
- emit-lift.js bare `/` handling is dead in practice; cleanup deferred to Phase 3.

### `:>` match arm arrow

Debate 2026-04-14 at `scrml-support/docs/deep-dives/debate-match-arm-syntax-2026-04-14.md`. Verdict: `:>` (TS/Svelte 29/35, Rust `=>` 21/35). User confirmed "lets go."

**Codegen landed:** `splitMultiArmString` and `parseMatchArm` in both emit-control-flow.ts and rewrite.ts now accept `:>` alongside `=>`. `parser-workarounds.js` treats `:>` as incomplete-expression ending. Doc comments updated. Bonus fix: match arm text preference now correctly prefers string `expr` over `exprNode` (exprNode only captures first parseable chunk of an arm pattern).

### Lift Approach C Phase 1 — the big structural change

**Added `parseLiftTag` in `compiler/src/ast-builder.js`** that walks the token stream and produces a structured `MarkupNode` directly.

**Handles:**
- `<tag ...>` with attributes (string-literal, variable-ref, call-ref, BLOCK_REF expr, absent boolean)
- Self-closing `<tag .../>`
- Closers `</>` inferred and `</tagname>` explicit
- Nested tags via recursion
- BLOCK_REF `${expr}` → logic child node
- Compound attr names: `bind:value`, `class:active`, `aria-label`, `data-id`
- Bare component refs `<ComponentName>` (no closer, for match-arm body use)

**Falls back** to `collectLiftExpr` string path for unrecognized patterns (safe rollback maintained).

**Verification:**
- 100% of lift-exprs in `examples/06-kanban-board.scrml`, `examples/05-multi-step-form.scrml`, `samples/todo-list.scrml` now produce `{kind: "markup"}` (previously 0%).
- Diagnostic instrumentation confirmed zero hits on the markup-re-parse path across all 14 examples + all 275 samples.
- ex05 regression test updated: components lifted inside match arms now properly expand.
- 20 new tests at `compiler/tests/unit/lift-approach-c.test.js` lock in the new behavior.

### Lift Approach C Phase 2 (partial) — deprecation docs

Added `@deprecated` JSDoc to `parseTagExprString` and `emitCreateElementFromExprString`. The re-parse path in `emitLiftExpr` is documented as reached only by legacy test fixtures. Actual deletion blocked on Phase 3 test migration.

### Commits (13 this session)

1. `16ff533` — feat(compiler): match-as-expression — §18.3 debate consensus
2. `c6baf63` — refactor(compiler): Phase 4d — migrate condition, iterable, init to ExprNode-first
3. `4e11433` — refactor(compiler): Phase 4d batch 2
4. `7ba7649` — refactor(compiler): Phase 4d batch 3
5. `09ba5a5` — refactor(compiler): Phase 4d batch 4 — ExprNode fields always populated
6. `31d4929` — refactor(compiler): Phase 4d batch 5 — deprecate string fields on AST types
7. `aa5226d` — fix(parser,samples): `</>` closer propagation
8. `f16c8a2` — docs: S14 hand-off update (interim)
9. `80c7d5d` — feat(compiler): complete `:>` codegen support
10. `63e86cb` — docs: user-voice S14 entries + pa.md policy sync
11. `7eda079` — feat(compiler): Lift Approach C Phase 1
12. `86f971b` — docs(compiler): Lift Approach C Phase 2 — document deprecation
13. `e701553` — test(compiler): add Lift Approach C test suite — 20 tests

---

## Queued work (long-lived)

- **Lin Approach B** — discontinuous scoping. Multi-session. Deep-dive at `scrml-support/docs/deep-dives/lin-discontinuous-scoping-2026-04-13.md`.
- **Phase 2 reactive effects** — two-level effect separation for if/lift (when needed).
- **Phase 4d final cleanup** — delete deprecated string fields + dead fallback code (safe after test fixture migration).
- **`:>` in SPEC.md** — formalize. Currently implemented but not specced.
- **Spec sync** — SPEC.md may need updates for match-as-expression, `:>`, Lift Approach C changes.

---

## Environment notes

- User-voice is now **repo-local** at `user-voice.md` (policy change 2026-04-14). Historical shared log at `../scrml-support/user-voice-archive.md`.
- Examples 01–13 compile clean; ex14 (mario) fails on pre-existing must-use errors (not blocking).
- Kanban onclick handlers verified working (S14 — structured markup path emits full call-ref args correctly).
- `scrml dev` hot reload functional.

---

## Tags
#session-14 #completed #match-as-expression #phase-4d #closer-fix #colon-arrow #lift-approach-c

## Links
- [handOffs/hand-off-13.md](./handOffs/hand-off-13.md) — S13 final
- [pa.md](./pa.md)
- [master-list.md](./master-list.md)
- [user-voice.md](./user-voice.md) — S14 entries
- `scrml-support/docs/deep-dives/debate-match-arm-syntax-2026-04-14.md` — `:>` debate
- `scrml-support/docs/deep-dives/lin-discontinuous-scoping-2026-04-13.md` — Lin Approach B pre-brief
