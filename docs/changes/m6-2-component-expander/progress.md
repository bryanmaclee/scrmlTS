# Progress: m6-2-component-expander

## RESOLVED — S123 R4-U6.b (2026-05-23)

### TL;DR

M6.2b end-to-end CLOSED. The M6.2 wip-patch (route component-expander re-parse through `nativeParseFile`) is now landed (commit `e65b2b43`) with 3 surgical adapters that close the 5 prop-sub regressions surfaced by the R4-U6 RE-STOP. The brief's diagnostic hypothesis ("walker is shape-coupled to live ExprNode; teach it native PascalCase shapes") was **wrong**: the native parser already produces lowercase live-style shapes. The actual gaps are at the synthesis layer — call-ref typed-arg synthesis, hard-keyword binding-name lex, template-literal interpolation collapse — not in `substitutePropsInExprNode` itself.

### What landed

Three adapters inside `reparseSynthesizedFile` (and one new heuristic):

1. **`upgradeNativeCallRefArgExprNodesInFileAST`** — walks the FileAST and, for every `call-ref` AttrValue with `args: string[]` but no `argExprNodes: ExprNode[]`, synthesizes `argExprNodes` via `parseExprToNode` per arg. Best-effort: per-arg parse failure falls back to `escape-hatch`. Closes §1.1 / §1.2 / §1.3.
2. **`sourceNeedsLiveFallback(src)`** — heuristic predicate detecting (a) `(const|let|tilde|lin)\s+(fn|lin|server|pure)\s*[:=]` hard-keyword bindings and (b) `` `[^`]*\${`` template-literal interpolations. When either matches, `reparseSynthesizedFile` falls back to legacy `splitBlocks + buildAST` verbatim for that single call. Correctness over migration progress; common case still flows through native. Closes §3 + §5.
3. **`upgradeNativePropsDeclsInFileAST`** — unchanged from M6.2 wip-patch (raw props-block string → `PropDecl[]`).

### Test deltas

| Suite | Pre-patch (R4-U5) | Patch alone (broken) | R4-U6.b landed |
| --- | --- | --- | --- |
| `bug-5-nested-component-ce-phantom-dom.test.js` | 5/5 | 5/5 | **5/5** |
| `f-component-004-substituteProps-logic-block.test.js` | 6/6 | 4/6 (2 fail) | **6/6** |
| `component-prop-substitution-call-ref.test.js` | 7/7 | 4/7 (3 fail) | **7/7** |
| Full unit+integration+conformance | 13954/14047 | 13949/14047 (5 fail) | **13966/14059** (0 fail) |

The 5 prop-sub failures from the RE-STOP section below are all closed. Full pre-commit gate passes (bun test, pretest, hooks).

### Root cause taxonomy (corrects RE-STOP diagnosis)

The RE-STOP suggested 3 forward paths: (1) R4-U6.b walker-shape extension, (2) R4-U7 sub-tree wiring, (3) M6.2-defer. R4-U6.b landed but the work was **NOT** walker shape extension — the walker is fine. The 5 failures actually decomposed into 3 distinct native-vs-live shape gaps:

1. **call-ref typed-arg synthesis gap** — `tag-frame.js parseCallArgList` emits raw `args: string[]` with no parallel `argExprNodes`. Live `ast-builder.js parseAttributeValue` emits both. `substituteProps` walks `argExprNodes` to do prop substitution; without typed nodes, the substitution path is skipped and the prop ident survives untyped into emit.
2. **Hard-keyword binding-name lex divergence** — `fn` / `lin` / `server` / `pure` are HARD keywords in `lex-in-code.js JS_KEYWORDS`, so `const fn = ...` produces `E-STMT-BINDING-NAME` under native. Acorn (live) admits them as identifiers per ECMAScript. This is a real native-parser semantic divergence; the chosen fix is selective live-fallback for sources matching the pattern. Future native-parser work could relax these to contextual keywords (cf. `type` per P5-9 — see token.js L221-229) but that's deferred to a separate unit.
3. **Template-literal interp source-text loss** — `translate-expr.js translateTemplateLit` (L429) DELIBERATELY collapses every `${...}` to a `${...}` placeholder in `LitExpr.raw`, per the documented "static, no live interpolation" template litType contract. CE's `rewriteTemplateInterpolations` needs the original interp text to substitute prop refs. The selective live-fallback handles this; recovery via span-slicing was attempted and abandoned (native spans on inner expressions are unreliable; see /tmp/probe_template_span.js artifact).

### Architecture decision

The selective live-fallback approach for #2 and #3 is intentionally conservative. The alternatives surveyed:

- **Span-slice recovery** for template lits: native span offsets on inner expressions are wonky (probed: span 17..32 slice gave "nst out = `Hell" instead of the template body). Rejected.
- **Native-side fix** for `translateTemplateLit` to emit-from-tree the inner exprs into the raw: would require importing emit-string into the native parser, breaking the bridge-only contract. Rejected (out of scope, would also widen blast radius).
- **Hard-keyword lex relaxation** for #2: making `fn`/`lin`/`server`/`pure` contextual keywords (like `type` per P5-9) is the long-term right answer but spans many parser sites. Deferred.
- **R4-U7 sub-tree wiring** (the other RE-STOP option): not load-bearing for any of the 5 actual failures, since the walker shapes were OK.

The selective-fallback pattern can be revisited later (consolidate as a `M6-divergence-fallback.md` ledger) once more migrations encounter similar gaps. For now: M6.2b is closed, regressions are zero, native-parser usage progresses where safe.

### Wip-patch obsolescence

`docs/changes/m6-2-component-expander/wip-migration.patch` is now obsolete — the patch contents are landed (plus the three R4-U6.b adapters) in `compiler/src/component-expander.ts` at HEAD `e65b2b43`. Recommend deletion in a follow-up cleanup commit (intentionally NOT deleted here to preserve audit trail through close).

### Cross-refs

- This section supersedes "RE-STOP — S123 R4-U6 attempt" below (which is now historical).
- R4 OUTER wrap surface is CLOSED at `2d72820d` (R4-U5). R4-U6.b closes the M6.2b surface area.
- M6 Wave 1 remaining work: M6.6.b.2..b.6, M6.7, M6.8. M6.2b crossed off.

---

## RE-STOP — S123 R4-U6 attempt (2026-05-23)

### TL;DR

R4-U6 re-applied the M6.2 wip-patch (10,127 bytes / +178/-12 in `component-expander.ts`) against the post-R4 branch (HEAD `2d72820d`, R4-U5 closes the R4 wrap surface; R4-U4 `385c17ea` wired translateExpr at let/const/lin/tilde-decl initExpr sites; M6.2a bridge `9d64ff4c` translates MarkupValue → live MarkupNode). The patch applied cleanly (`git apply --check` passed; +178/-12 exact ballpark from S122 STOP). **Bug-5 reached 5/5 — BUT bug-5 was ALSO 5/5 pre-patch on R4-U5 (R4 work + M6.2a + ancestral fixes already closed bug-5 on the LIVE path). The patch is not load-bearing for bug-5 closure.** Meanwhile **prop-sub regressed 13/13 → 8/13** (5 new failures, all genuine post-patch regressions confirmed via pre/post A/B). Per brief STOP-condition ("prop-sub tests regress below 13/13 either file"), I reverted the patch from the worktree and report.

### Verified test deltas

| Suite | Pre-patch (R4-U5) | Post-patch | Delta |
| --- | --- | --- | --- |
| `bug-5-nested-component-ce-phantom-dom.test.js` | **5/5 PASS** | 5/5 PASS | 0 |
| `f-component-004-substituteProps-logic-block.test.js` | **6/6 PASS** | 4/6 (2 fail) | -2 |
| `component-prop-substitution-call-ref.test.js` | **7/7 PASS** | 4/7 (3 fail) | -3 |
| Full suite (unit+integration+conformance) | 13954/14047 pass, 0 fail | 13949/14047 pass, 5 fail | -5 |

The 5 full-suite failures are exactly the 5 prop-sub failures — no other regressions.

### The 5 specific failures

All in component-prop-substitution / template / lambda surfaces — `substitutePropsInExprNode` not matching IdentExpr prop refs in the post-patch (native) ExprNode shape.

1. **§1.1 `<li ondrop=dropOn(name)>` per-instance handler** — expected `_scrml_dropOn_3("zone-a")`, got `_scrml_dropOn_3(name)`. The prop ref `name` survives unsubstituted into the emitted handler.
2. **§1.2 single-arg prop ref `announce(label)`** — expected `_scrml_announce_2("primary")`, got `_scrml_announce_2(label)`.
3. **§1.3 multi-arg `track("click", label)`** — expected `_scrml_track_2("click", "primary")`, got `_scrml_track_2("click", label)`.
4. **§3 lambda parameter `name` shadows outer `name` prop** — expected `errors.length ≤ 1`, got 26 errors (cascade including `E-COMPONENT-020: Component Wrapper is not defined`).
5. **§5 template literal `` `Hello ${name}` `` interpolation rewrite** — expected substituted `"world"` in output, got literal `` "`Hello ${...}`" `` (interpolation dropped/escaped).

### Likely cause

The brief asserted: *"prop-sub tests should ALSO be 13/13 because component-expander now routes through nativeParseFile which has R4-wired ExprNode shapes."* This assertion is **false** for these 5 cases. The R4 wiring (U1–U5) converts native Expr → live ExprNode for `bare-expr`, `return-stmt`, `throw-stmt`, `for-stmt iterExpr / cStyleParts`, `if/while/do-while condExpr`, `let/const/lin/tilde-decl initExpr`, and `lift-expr (non-MV) / fail-expr / propagate-expr`. **Not yet wired** (or wired but shape-divergent): the expression shapes reached by `substitutePropsInExprNode` traversal — specifically:

- **CallExpr.arguments** carrying `IdentExpr` prop refs — `substitutePropsInExprNode` finds an IdentExpr by `.kind === "IdentExpr"` and `.name === <propName>`. Under native, the shape arrives either with a different kind tag, a wrapped envelope (e.g., `MarkupValue` for interpolated templates), or `.name` lives on a sub-field. The walker walks but doesn't match, so no substitution happens. The literal IdentExpr survives into emit, where the prop name is read as an undeclared local at the emit site.
- **Lambda bodies inside a logic block** (§3) — when a function/arrow body contains markup with prop references AND a parameter shadow, the post-patch path apparently fails to even resolve the outer component reference (`<Wrapper name="outer"/>` cascades to 26 errors including `E-COMPONENT-020: Wrapper is not defined`). This suggests the lambda body's re-parse path emits a FileAST that loses the surrounding component-def context, so the outer component table can't see `Wrapper` when expanding it elsewhere. Possible: `walkLogicBody` re-parse (site 2, L2607) produces a FileAST where the component declaration is dropped or marked differently under native than under LIVE.
- **Template-literal interpolation rewrite** (§5) — backtick template `` `Hello ${name}` `` should rewrite `${name}` → `${"world"}` (a LitExpr after substitution). Post-patch output `` "`Hello ${...}`" `` looks like the template is being collapsed to a placeholder rather than walked. The native TemplateLiteralExpr → live form may produce a different children/quasis shape that `substitutePropsInExprNode`'s TemplateLit branch doesn't traverse, OR an emit-side branch is hitting an unrecognized kind and emitting placeholders.

The common thread: **`substitutePropsInExprNode` traversal handles the LIVE ASTBuilder ExprNode shape, but post-migration the synthesized component-body's expression tree arrives from `nativeParseFile` with subtle shape differences in CallExpr.arguments, lambda body markup, and template-literal interpolations.** This is a downstream effect — R4 wired the OUTER expression slots into live ExprNode, but the INNER traversal (IdentExpr matching, lambda recursion, template-quasi walking) was tuned to the LIVE shape and the patch doesn't add equivalent reshaping for these sub-trees.

### Reproduction record

```
$ git apply --check docs/changes/m6-2-component-expander/wip-migration.patch
# (no output — clean)
$ git apply docs/changes/m6-2-component-expander/wip-migration.patch
# (no output — applied)
$ git diff --stat
#  compiler/src/component-expander.ts | 190 ++++++++++++++++++++++++++++++++++---
#  1 file changed, 178 insertions(+), 12 deletions(-)
$ bun test compiler/tests/integration/bug-5-nested-component-ce-phantom-dom.test.js
# 5 pass / 0 fail
$ bun test compiler/tests/unit/f-component-004-substituteProps-logic-block.test.js compiler/tests/unit/component-prop-substitution-call-ref.test.js
# 8 pass / 5 fail
$ bun test compiler/tests/unit compiler/tests/integration compiler/tests/conformance
# 13949 pass / 5 fail
# (the 5 fails == the 5 prop-sub fails above; no other regressions)
# A/B: pre-patch state (component-expander.ts restored from ffa41f9d):
#   bug-5: 5/5, prop-sub: 13/13, full: 13954 pass / 0 fail
# Post-patch:
#   bug-5: 5/5, prop-sub: 8/13, full: 13949 pass / 5 fail
# Delta = +0 bug-5 (patch not load-bearing), -5 prop-sub (regression)
```

### Recommendation to PA

The wip-patch is structurally correct (FileAST adapter, propsDecl unwrap, native parser drop-in shape) but the downstream substitution walker is shape-coupled to the LIVE ExprNode produced by `splitBlocks` + `buildAST`. **Three forward paths** in increasing scope:

1. **R4-U6.b — extend substitution-walker shape-coverage** — add native-shape recognition to `substitutePropsInExprNode` (CallExpr.arguments traversal, lambda body markup-walk, template-literal quasi handling) so it matches IdentExpr regardless of native vs live source path. Smallest scope; isolates the fix to component-expander.ts; doesn't touch the native parser or bridges. Likely 4-8h. May reveal further shape gaps as it goes.
2. **R4-U7 / further R4 units** — survey which native ExprNode sub-shapes still diverge from the live ASTBuilder shape downstream of the R4-wired slots, and add a second wave of translateExpr wiring at the sub-tree level. Larger; touches translate-expr.js + possibly translate-stmt.js for lift-expr.expr.node sub-fields. Likely 8-15h. Closes a class of issues, not just prop-sub.
3. **M6.2-defer (re-affirmed)** — keep component-expander on the LIVE `splitBlocks` + `buildAST` path until M6.7's flag-flip cohort where bridge-parity gaps get attacked in bulk. The patch stays as a forensic artifact for the future surface owner. Tradeoff: 2-site splitBlocks consumer persists, but bug-5 is already closed on the LIVE path so there's no behavioral motivation for the migration right now — the original M6.2 motivation (close bug-5) was overtaken by R4-U1..U5 + M6.2a closing it independently.

**The bug-5-was-already-5/5-pre-patch finding strongly favors (3)** as a near-term decision: M6.2 is no longer load-bearing for any user-visible behavior, just for the M6 Wave 1 surface-area-reduction goal. PA should re-prioritize M6.2 against the other pending units (M6.6.b.2..b.6, M6.7, M6.8) on the strength of surface-area-reduction motivation alone, and pick (1) or (2) only if R4-U6.b/R4-U7 are independently motivated by other M6 work.

### Worktree state at STOP

- Branch: `worktree-agent-aefd73d3595f2f135`
- HEAD: `ffa41f9d WIP(r4-u6): start at ...` (the patch was applied → tested → reverted via `git reset --hard ffa41f9d`)
- `git status` clean.
- The wip-migration.patch file is **preserved at its original location** (`docs/changes/m6-2-component-expander/wip-migration.patch`) for future re-attempt.

## Plan

Migrate two `splitBlocks` + `buildAST` re-parse sites in `compiler/src/component-expander.ts` to `nativeParseFile` from `compiler/native-parser/parse-file.js`.

### Call-site survey

- **Site 1** — `component-expander.ts:567-568` inside `parseComponentBody(raw, componentName, filePath)`. Synthesized source: tokenized-then-normalized component-def body (markup-plus-logic — may contain `props={...}` blocks, `${expr}` slots, comments, nested elements, **inner `lift <Component/>` references**). Downstream consumer reads `.ast.nodes.filter(kind === "markup")` and `.errors` (filters out warnings + W-PROGRAM-001, maps `tabSpan → span`).
- **Site 2** — `component-expander.ts:2607-2608` inside `walkLogicBody` re-parse path. Synthesized source: tokenized-then-normalized expression-string converted back to markup-only fragment (uppercase-component reference). Downstream consumer reads `.ast.nodes.find(kind === "markup" && isComponent === true)`.

Both sites pass full scrml source (markup + interleaved logic blocks) — `nativeParseFile` is the correct drop-in (not `parseMarkup` alone, which returns block-stream only without the FileAST shape).

### Shared helper

Both sites share the pattern `splitBlocks(path, src) → buildAST(...) → consume .ast.nodes`. They do NOT currently share a helper function. M6.2 introduces a shared helper `reparseSynthesizedFile(filePath, source)` inside component-expander.ts that wraps `nativeParseFile`. Both call-sites use it.

## STOP — surfaced 2026-05-23

### Symptom

After migrating both sites to `nativeParseFile` + adding a `parsePropsBlockRaw` adapter (native produces `props-block.propsDecl: <raw-string>`; live produces `PropDecl[]`), the integration test `compiler/tests/integration/bug-5-nested-component-ce-phantom-dom.test.js` regresses 5/5 → 3/5:

- **5a — nested component inside another component's lift body**: expected `createElement("li")` (TaskCard expansion inside Column); the inner TaskCard reference does NOT expand. CE silently emits Column's expanded `<section>` without TaskCard's `<li>` inside.
- **5b — typo'd nested component name fires E-COMPONENT-035**: expected `errors.length > 0` (the inner `<TaskKard/>` typo should surface as a parse error); got 0 errors. The inner unresolved reference is silently dropped — no phantom DOM, but also no diagnostic.

Pretest GREEN (`bun run pretest` passes). Failure isolated to nested-component-CE-expansion integration tests.

### Root cause

The native A2 expression bridge (`translate-expr.js`) routes the `MarkupValue` ExprKind to `escape-hatch` (documented: translate-expr.js L110, R1 deferred surface). `translate-stmt.js makeLiftExpr` (L382-396) then takes the lift expression's argument — when it's a `MarkupValue` — and wraps it as `{ kind: "markup", node: <raw-MarkupValue> }`. The native MarkupValue carries `{ kind: "MarkupValue", markup: [{ kind: "Markup", name, attrs, children, ... }] }` (PascalCase native node-catalog).

The LIVE BS+TAB path produces `lift-expr.expr.node = { kind: "markup", tag, attrs, isComponent, children, ... }` (lowercase ASTNode shape with `isComponent: true` for uppercase-first-character tags). Component-expander's recursive walk (e.g. `walkLogicBody → walkAndExpand → expandComponentNode`) reads `expr.node` as a `MarkupNode` with `tag`, `attrs`, `isComponent`, `children`. Under native, `expr.node.tag` is `undefined` (native uses `name`), `expr.node.isComponent` is `undefined`, `expr.node.kind === "MarkupValue"` not `"markup"` — so every nested-component lookup inside a `lift <Component/>` inside a component-def body silently misses.

This is a documented bridge-parity gap: native R1 explicitly does not deconstruct MarkupValue into the live MarkupNode shape — see `translate-stmt.js:376-396` header + `M5-divergence-ledger.md`. The proper fix is a native-side translator that converts native `MarkupValue.markup[0]` (a `Markup` block) into the live MarkupNode shape (lowercase kind, `tag`/`isComponent`/`exprNode`-shaped attrs), threading the same idGen and recursively descending into child Markup blocks.

### Scope decision

This is **out of M6.2 scope**. M6.2 was scoped as "2 hard-bound splitBlocks consumers — replace with native equivalents". The fix actually required is at the A2/R1 bridge layer (translate-expr / translate-stmt MarkupValue handling), which is a Tier-B bridge unit owned by the broader M5/M6 native-parser-completion arc (see M5-SWAP-residual-decomposition.md, M5-divergence-ledger.md, and the cutover plan's M6.6 surface).

Per the brief's STOP-condition: "if the 2 call-sites have fundamentally different shapes requiring different native APIs, surface as a possible Unit-split scenario." — the issue isn't a per-call-site shape difference, but a deeper A2/R1 bridge gap that surfaces in BOTH call-sites because both feed downstream consumers expecting the live MarkupNode shape under nested lift-expr contexts. Same conclusion: surface and stop.

### Possible Unit-split paths (PA decides)

1. **M6.2a — A2/R1 MarkupValue bridge** — write `translateMarkupValueToLiveNode(mv, idGen, source)` in translate-expr.js / translate-stmt.js that mirrors `parse-file.js synthMarkupNode` for embedded markup-as-expression contexts (lift-expr arg, render-expr, etc.). Convert `{ kind: "MarkupValue", markup: [Markup] }` → `{ kind: "markup", tag, attrs (lowercase shape), children (recursive), isComponent, span, ... }`. Heavier than M6.2 originally scoped — likely 8-15h on its own. Once landed, M6.2 mechanical site-replacement becomes a 1-2h follow-up.
2. **M6.2-defer — leave component-expander on live BS+TAB until M6.7 flip** — abandon the M6.2 migration; let component-expander keep `splitBlocks` + `buildAST` imports. Defer to M6.6 (engine-statechild-parser arc) or the M6.7 flag-flip cohort where bridge-parity gaps surface in bulk. Tradeoff: keeps a 2-site `splitBlocks` consumer alive through M6.7 (no progress on M6 Wave 1 surface area count, but no false-positive regressions either).
3. **M6.2-bounded — narrow M6.2 to only the safe call-sites if any exist** — survey shows BOTH sites trigger the MarkupValue divergence as soon as a component-def body OR a re-parsed component-ref expression carries a nested `lift <Component/>`. The single-level test (`test 5a — single-level component lift`) PASSES post-migration because it never hits the re-parse path. So path (3) is empty — there is no safe-narrowing surface within these 2 sites.

### Work captured

The migration code is checkpointed on `worktree-agent-ae74239dcd58a8461`:

- `compiler/src/component-expander.ts`:
  - removed `splitBlocks` + `buildAST` imports
  - added `nativeParseFile` import from `../native-parser/parse-file.js`
  - added `splitAtTopLevelCommasCE` helper (mirrors ast-builder L2147)
  - added `parsePropsBlockRaw` helper (mirrors ast-builder L2182)
  - added `upgradeNativePropsDeclsInFileAST` FileAST walker
  - added `reparseSynthesizedFile(filePath, source)` shared helper
  - migrated both call-sites (L567, L2607) to use the shared helper

The propsDecl-shape adapter IS load-bearing and correct — it closes the prop-parsing shape divergence. The MarkupValue divergence is the remaining blocker, owned by a deeper bridge unit.

Net diff: +178/-12 in `compiler/src/component-expander.ts`. Pretest GREEN, unit-test surface OK, integration regression isolated to bug-5-nested-component-ce-phantom-dom.test.js (5/5 → 3/5).

### Recommendation to PA

Choose path (1) M6.2a OR path (2) M6.2-defer. Path (3) is empty.

If (1): the M6.2a unit lifts native MarkupValue handling first; once that lands the M6.2 site-replacement work in this worktree resumes (rebases cleanly).

If (2): revert the changes in this worktree (`git checkout -- compiler/src/component-expander.ts`; remove the progress dir); document in master-list that M6.2 is parked pending M6.6/M6.7 bridge surface.

## Log

- [start] Verified worktree path `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-ae74239dcd58a8461`; pretest GREEN; startup commit `7f086328`.
- [step 1] Surveyed both call-sites + native parser entry point. Confirmed nativeParseFile drop-in shape (`{ filePath, ast, errors }`) matches.
- [step 2] Initial Edits applied to the WRONG path (`/home/bryan/scrmlMaster/scrmlTS/compiler/src/...` — main repo, not worktree). S99 path-discipline leak. Reverted main-repo edits with `git checkout --` and re-applied to worktree path. Lesson: enforce $WORKTREE_ROOT prefix on every Edit. (Counter +1.)
- [step 3] Implemented shared helper `reparseSynthesizedFile(filePath, source)` wrapping `nativeParseFile`. Migrated both sites (L567 parseComponentBody, L2607 walkLogicBody re-parse).
- [step 4] Initial commit attempt failed pre-commit hook with `TypeError: Attempted to assign to readonly property` at L673 `decl.isSnippet = false`. Root cause: native parser emits `props-block.propsDecl: <raw-string>` not `PropDecl[]`. Added `splitAtTopLevelCommasCE` + `parsePropsBlockRaw` + `upgradeNativePropsDeclsInFileAST` adapter; pretest GREEN.
- [step 5] Targeted integration-test run isolated a deeper regression: `bug-5-nested-component-ce-phantom-dom.test.js` 5/5 → 3/5. Both failing tests involve nested component references inside `lift <Component/>` inside a component-def body. Root cause: native A2/R1 bridge routes `MarkupValue` to escape-hatch (translate-expr.js L110, documented), and `makeLiftExpr` (translate-stmt.js L382-396) wraps the raw native MarkupValue inside `lift-expr.expr.node` without converting to the live MarkupNode shape. Component-expander walks `expr.node` as a live MarkupNode (reads `tag`/`isComponent`/`children`) — those fields don't exist on a native MarkupValue.
- [step 6] Concluded STOP per brief. Filed PA action with three Unit-split paths.
