---
title: A1c C1 Phase 0 SURVEY — shape-aware cell emitter
date: 2026-05-08
session: S70 (cross-machine pickup target was S71; survey runs pre-S71)
worktree: agent-ac5b6dcfb8d28d416
branch: worktree-agent-ac5b6dcfb8d28d416
baseline-head: e62bb5a (S70 wrap; post-C0 SHIP at 846d1ef + S70 history-regex fix at 8d0a6f2)
status: SURVEY COMPLETE — verdict SCOPE-AMENDMENT-SUGGESTED
---

## §0 Methodology + worktree state

Read in full: BRIEF.md, SPEC §6.1 / §6.2 / §6.3 / §6.6 (incl. 6.6.16-17) / §6.8, `compiler/src/codegen/emit-logic.ts:540-700` (existing Shape-3 partial dispatch), `compiler/src/codegen/emit-reactive-wiring.ts:1-100,250-345`, `compiler/src/codegen/emit-bindings.ts:1-100`, `compiler/src/codegen/binding-registry.ts` (full), `compiler/src/codegen/emit-html.ts:1-100,860-915`, `compiler/src/symbol-table.ts:200-310,428-596,1430-1560`, `compiler/src/types/ast.ts:420-630`, `compiler/src/codegen/usage-analyzer.ts:90-145`, `compiler/src/runtime-template.js:260-300`, `compiler/src/ast-builder.js:3220-3290`, `compiler/src/codegen/emit-expr.ts:80-100` (current `reset-expr` placeholder), `docs/changes/phase-a1a-step-11-5-fold-derived/progress.md`, `docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md` §3.1 / §4.1 / §4.5 / §4.7 / §4.8, `docs/changes/phase-a1c-codegen/SURVEY.md` (C0 survey).

### Worktree state
- WORKTREE_ROOT: `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-ac5b6dcfb8d28d416`
- AGENT_BRANCH: `worktree-agent-ac5b6dcfb8d28d416`
- HEAD: `e62bb5a` (clean, matches main)
- `bun install`: 114 packages, clean
- `bun run pretest`: 12 samples compiled, 0 errors
- Baseline `bun run test`: **9,733 pass / 64 skip / 1 todo / 5 fail / 33,861 expects**

**Pre-existing fail callout** — 5 failures (3 unique tests; the suite-block double-counts):
1. `F-BUILD-002 §3 generated entry parses without SyntaxError` (integration)
2. `Bootstrap L3: self-hosted API compiles compiler` (integration; beforeEach 5 s timeout)
3. `Self-host: tokenizer parity > compiled tab.js exists` (integration)

These predate C1 — both files (`f-build-002-server-entry-dedup.test.js`, `self-compilation.test.js`, `self-host-smoke.test.js`) last touched at commit `2585a36` and `44c1054` (pre-A1a). They are self-host parity drift; C1 inherits the regression budget from main and will not introduce new fails (test invariant: post-C1 fails ≤ 5).

### Dispatch baseline reference
The BRIEF §6.3 forecasts post-C0 baseline ~9,727 (60 / 1 / 0). Actual is 9,733 (64 / 1 / 5). Net delta +6 (likely A5-2/A5-3 sweep). The "0 fail" was incorrect at brief-draft time — C1 inherits 5 pre-existing fails. Communicate to PA: invariant for C1 is **5-or-fewer fails** post-SHIP, not zero.

---

## §1 Locus confirmation — §4.1 dispatch table vs current HEAD

| # | Source form | Detection (per A1b) | Current emission locus | Verdict |
|---|---|---|---|---|
| 1 | `<count> = 0` (Shape 1 plain) | `shape:"plain"` AND `_cellKind:"plain"` AND `renderSpec === null` AND `children === undefined` | `emit-logic.ts:654-695` (legacy fallthrough — `_emitReactiveSet`) | **WORKING** today; C1 keeps as-is |
| 2 | `<userName req length(>=2)> = <input/>` (Shape 2 decl-with-spec) | `shape:"decl-with-spec"` AND `_cellKind:"bindable"` AND `renderSpec !== null` | `emit-logic.ts:654-695` (same fallthrough — `init` is `""` from null initExpr; emits `_scrml_reactive_set("userName", undefined);`) | **PARTIAL GAP** — emits a default-`undefined` reactive cell. The binding HOOK (cell value flowing to/from the bound `<input>`) is wired downstream by `emit-html.ts` + `emit-event-wiring`. Shape 2 declares the cell only; the bindable-input itself appears at use-site `<userName/>` per L16 (C3's territory). **C1 minimal-touch: declare the cell with `undefined` (or equivalent) initial value.** Confirmed by inspection: the legacy `init` field for a renderSpec-only Shape 2 falls back to `"undefined"` (line 655), so byte-output today is `_scrml_reactive_set("userName", undefined);` — that's the right shape for cell-init when the bound input hasn't typed anything. |
| 3 | `const <doubled> = @count * 2` (Shape 3 derived plain) | `shape:"derived"` AND `isConst:true` AND `structuralForm:true` AND `_cellKind:"plain"` | `emit-logic.ts:654-695` (legacy fallthrough — emits `_scrml_reactive_set` instead of `_scrml_derived_declare`) | **GAP — closes with C1** per S61 11.5 explicit deferral; routes through extended branch at line 572-602 by relaxing the `structuralForm === false` check |
| 4 | `const <badge> = <span>${@x}</span>` (Shape 3 markup-typed derived) | `shape:"derived"` AND `isConst:true` AND `_cellKind:"markup-typed"` AND `renderSpec !== null` | `emit-logic.ts:654-695` (legacy fallthrough — emits `_scrml_reactive_set`); the markup RHS is in `renderSpec.element` not `initExpr`, so `init: ""` and emission is `_scrml_reactive_set("badge", undefined);` | **GAP** — never emitted correctly today. C1 must read `renderSpec.element` and synthesize the markup-as-value initExpr (or route through a markup-aware derived emitter). See §5 below for the disposition. |
| 5 | Variant C compound `<formRes><name>=""</></>` | `_cellKind:"compound-parent"` AND `Array.isArray(children)` | **NO HANDLER** in `emit-logic.ts` today — falls through to legacy fallthrough at line 654-695. `init` is `""`/`undefined` since compound parents have neither `initExpr` nor `renderSpec`. Emits `_scrml_reactive_set("formRes", undefined);` AND child decls are NEVER walked (the case "state-decl" handler returns and never recurses on `node.children`). | **CRITICAL GAP** — Variant C compound is structurally unemittable today. Even if the parent is given a `_scrml_reactive_set`, child cells (`<name> = ""`, `<email> = ""`) are silently dropped. **C1 must handle compound-parent and recursively emit children.** See §3 below. |
| 6 | Tier 3 predefined-shape compound `<userInfo>: UserInfo = ("alice", 30, true)` | `shape:"plain"` (not flagged at A1a/A1b as Tier 3 specifically) AND `typeAnnotation` is set AND `initExpr.kind === "sequence-expression"` | `emit-logic.ts:654-695` (legacy fallthrough) — emits `_scrml_reactive_set("userInfo", (a, b, c));`. JS comma-operator semantics mean the cell value is `true` (last operand). | **DEFERRED** — Tier 3 positional sugar requires desugar from SequenceExpression → typed object literal `{name: a, age: b, active: c}`. No A1a/A1b desugar exists; A1c codegen is the natural locus, but **per A1c SCOPE §4.5 row C21** Tier 3 / Variant C / markup-typed-derived emission is its own step. The BRIEF folds two of those three (Variant C + markup-typed) into C1 but is silent on Tier 3. **Recommend: Tier 3 stays out of C1; survey-confirmed deferral to a later step (likely C21 or a new C1.5).** No regressions because no current sample/test exercises Tier 3 codegen. |

**§4.1 row §3.1 best-guesses (BRIEF §3.1):** `emit-logic.ts:565-579` (Shape 3 partial dispatch lines) — actual measured range is `:572-602` post-A5-2 sweep. Functionally identical; the 8-line drift doesn't affect implementation strategy.

**Engine cells (§4.2):** `_cellKind:"engine"` decls. The auto-declared engine variable is registered via B14, but its declaration site is the `<engine for=...>` markup element, not a `state-decl` AST node — so the case in `emit-logic.ts` is never reached for engine cells. Confirmed: no special skip-clause needed in C1; engine cells naturally bypass via AST kind discrimination. The brief's §4.2 instruction is satisfied by AST shape, not by guard.

---

## §2 Refactor decision

**Recommendation: extend `emit-logic.ts` `case "state-decl"` in place; add one early-route arm and one new arm.**

Decomposed:

1. **Shape 3 V5-strict route** — relax the existing `structuralForm === false` guard at line 572-602 to admit `structuralForm === true` (i.e. drop the `=== false` check; both forms now route to `_scrml_derived_declare`). This is the S61 11.5 closure (estimated +0 LOC; signature unchanged).
2. **Shape 3 markup-typed route** — when `_cellKind === "markup-typed"` AND `isConst === true`, route through derived-declare with the markup wrapped as the init expression. ~30 LOC: synthesize a `() => <markup-tree>` body. The markup tree is in `renderSpec.element`. The C2 step (closure semantics) makes this reactive; C1 emits the declaration.
3. **Variant C compound route** — when `_cellKind === "compound-parent"` AND `Array.isArray(children)`, emit a parent-cell skeleton (e.g., `_scrml_reactive_set("formRes", _scrml_compound({}));` — see §3 for the runtime contract) and recursively call `emitLogicNode` on each child decl with a name-rewrite hook so child names are resolved as `<parent>.<child>`. ~40 LOC.
4. **Default-expr storage** — when `defaultExpr !== null`, emit a sibling line that registers the default with the cell descriptor (e.g., `_scrml_default_set("count", () => null);` — see §6 for the contract). ~10 LOC; orthogonal to shape.

Total dispatch logic projected: ~80 LOC. **Below the 150 LOC threshold the BRIEF cites for in-place vs extract.** Stay in place.

**Single-line audit-trail comment block** at the head of `case "state-decl"` describing the dispatch order:

```
// C1 shape dispatch (SPEC §6.2 / §6.3 / §6.6.17 / §6.8):
//   1. compound-parent (children !== undefined)        → recursive child walk
//   2. derived markup-typed (_cellKind === "markup-typed")
//   3. derived plain (shape === "derived" && isConst)  → _scrml_derived_declare
//   4. plain reactive (Shape 1 + Shape 2)              → _scrml_reactive_set
//   5. default= sidecar (orthogonal; emit if defaultExpr !== null)
```

The legacy SQL handlers (lines 617-653) remain as early-exits BEFORE the shape dispatch — they handle a different invariant (server-side SQL initialization) and shouldn't reorder.

---

## §3 Variant C compound emission

### §3.1 Recursion entry

The `walkClassifyCells` walker in `symbol-table.ts:1518-1559` already recurses through `decl.children`. So at codegen time, every nested child has a `_cellKind` annotation. The C1 emit-logic dispatch must mirror this: when handling a compound parent, walk `node.children` and call `emitLogicNode(child, opts)` on each, with the inner emit aware of the parent context.

### §3.2 Name resolution

Per spec §6.3.2 + §6.3.5: child cells are accessed as `@parent.child`. The B1 `StateCellRecord.qualifiedPath` field carries the dotted path (`"formRes.name"`). For codegen, child cells must be registered against their qualified path so `_scrml_reactive_get("formRes.name")` and `_scrml_reactive_set("formRes.name", value)` resolve correctly. **Survey-recommended approach:** thread the qualified-path prefix through `EmitLogicOpts` (new field `compoundPathPrefix: string | null`); when set, `_emitReactiveSet` and `case "state-decl"` use `${compoundPathPrefix}.${node.name}` as the encoded key.

### §3.3 Runtime contract — `_scrml_compound` + dotted-path keys

C1 has a choice:

- **Option A (dotted-path keys, FLAT registry):** Child cells live in the same `_scrml_reactive_cells` registry as top-level cells; the key IS the dotted path (e.g., `"formRes.name"`, `"formRes.email"`). The compound parent itself is also a cell whose value is a getter-proxy that materializes `{name: get("formRes.name"), email: get("formRes.email")}` on read. Bare `@formRes` reads this proxy.
- **Option B (nested registry):** Compound parents own a child sub-registry; child reads/writes go through a path-aware accessor.

**Recommendation: Option A** — it minimizes runtime surface (existing `_scrml_reactive_set`/`get` carry it through verbatim; only the parent proxy is new). The BRIEF mentions "nested reactive proxy with field paths" — Option A delivers this with the parent proxy, while Option B requires runtime restructuring.

**New runtime helpers (one or two; C2 may extend):**

- `_scrml_compound_declare(parentName, childNames)` — registers the parent cell with a getter-proxy that returns `{[ch]: _scrml_reactive_get(`${parentName}.${ch}`) for ch in childNames}`. Counted as ZERO new helpers per BRIEF §4.3 IF the parent is encoded directly as a closure passed to `_scrml_reactive_set("formRes", () => ...)` — but that conflates value-cells with computation, semantically wrong (the parent IS a value-cell, but the value is reconstructed on every read). Cleaner to add `_scrml_compound_declare`.
- The BRIEF says "ZERO new runtime helpers" (§4.3). The cleanest path is to add `_scrml_compound_declare` — **flag this as a SURVEY-AMENDMENT to the BRIEF: one new runtime helper is needed** (or accept slight overlap by reusing `_scrml_derived_declare` for the parent-proxy, which is a misuse but plausibly works).

**Variant: re-use `_scrml_derived_declare` for the parent-proxy.** A compound parent IS a "derived" cell whose value is `{name: @signup.name, email: @signup.email, ...}` — this works structurally with `_scrml_derived_declare` IF the proxy is a closure that reads each child via `_scrml_reactive_get`. This re-uses existing infrastructure with zero new helpers, and C1 stays clean. **PA-decision needed:** this approach mixes the "compound parent" semantic with the "derived" semantic. Spec doesn't forbid it; it's economical. **Recommend Option A-prime (re-use `_scrml_derived_declare`)** unless PA prefers a dedicated helper.

### §3.4 In-compound derived (§6.6.16, L15)

Per spec §6.6.16, `const <derived> = expr` inside a compound block follows the same shape dispatch as top-level `const <derived>`. The path in the StateCellRecord is `<parent>.<derivedName>` (e.g., `signup.displayName`). C1's recursive dispatch handles this naturally — when the recursion hits a child decl with `_cellKind === "plain"` AND `isConst === true`, it routes through the derived-declare arm (Shape 3 plain) using the qualified path.

---

## §4 Tier 3 predefined-shape compound — disposition

Per BRIEF §5 deliverable #4: does C1 handle Tier 3, or is it pre-lowered?

**Findings:**

1. **A1a Step 11.0c parses Tier 3 form correctly** — `<userInfo>: UserInfo = ("alice", 30, true)` produces a state-decl with `typeAnnotation: "UserInfo"`, `shape: "plain"`, `initExpr: SequenceExpression(...)`. Confirmed at `compiler/src/ast-builder.js:3220-3290`.
2. **No A1b desugar exists** — A1b annotates `_cellKind` ("plain" for Tier 3 since it has initExpr + no children + no renderSpec + isConst:false). The SequenceExpression remains intact in initExpr.
3. **Current codegen would emit junk** — `_scrml_reactive_set("userInfo", (a, b, c));` evaluates to the last operand `true` per JS comma-operator semantics.
4. **No test today exercises Tier 3 codegen** — searched `samples/compilation-tests/*.scrml` and `compiler/tests/` — zero hits on `userInfo`/`formRes`/Tier 3 positional + type annotation. The bug is structurally present but unobserved; C1 is not the locus that surfaces it.

**Disposition:** Tier 3 is **OUT OF SCOPE for C1.** Per A1c SCOPE §4.5 row C21, Tier 3 (and Variant C compound) was originally bundled with markup-typed derived in step C21. The BRIEF folds Variant C + markup-typed into C1; Tier 3 stays at C21 (or a new C1.5 step). The pre-existing latent bug is documented here but NOT closed by C1.

**Action:** SCOPE-AMENDMENT to A1c SCOPE §4.5 — strike Variant C + markup-typed-derived from C21's row (now in C1); leave Tier 3 in C21 (which becomes a smaller step ~2-3 h instead of ~5-7 h). See §10 below.

---

## §5 Markup-typed derived emission

### §5.1 How `${@cell}` interpolation routes today

`emit-html.ts:881-897` walks markup nodes; for any `logic` node containing a `bare-expr` with reactive deps, it generates a placeholder span and registers a `LogicBinding`. The downstream client-JS emitter wires `_scrml_reactive_get(name)` (or `_scrml_derived_get(name)` per `runtime-template.js:181`) and calls `_scrml_lift` to insert the result.

**Critical detail:** the runtime template line 181 says: `if (_scrml_derived_fns[name]) return _scrml_derived_get(name);`. So once `_scrml_derived_declare` registers a derived cell with name `"badge"`, `_scrml_reactive_get("badge")` automatically routes to lazy-pull derived-get. **No new code path in `emit-html.ts` is needed for markup-typed derived consumption.** The interpolation `${@badge}` lowers identically; the runtime returns the markup tree (or a markup-rendering closure — C2's job).

### §5.2 What C1 needs to emit at the DECLARATION site

The state-decl for `const <badge> = <span class="badge">${@x}</span>` has:
- `shape: "derived"`, `isConst: true`, `_cellKind: "markup-typed"`, `structuralForm: true`
- `renderSpec.element`: the `<span>` MarkupNode
- `initExpr`: **NULL or absent** (per ast-builder, markup goes to `renderSpec`, not `initExpr`)

**Verification needed at implementation time:** does `ast-builder` set `initExpr` on a markup-typed derived, or is the markup ONLY in `renderSpec.element`? Per `cell-classifier.ts` comment line 1473 ("ast-builder routes the markup into `renderSpec` today"), the markup is in `renderSpec.element` exclusively. C1 must:

1. Read `renderSpec.element` (the markup tree).
2. Synthesize a closure body that produces the markup at evaluation time. Two options:
   - **(a)** Emit `_scrml_derived_declare("badge", () => /* markup-builder code from emit-html */)`. The markup-builder code is what `emit-html.ts` would emit for that markup tree. C1 invokes a sub-emit on the markup AST node. **Substantial coupling between emit-logic and emit-html.**
   - **(b)** Defer markup-emit to C2 — C1 emits a placeholder declaration (`_scrml_derived_declare("badge", _scrml_markup_factory_N)`) and a separate top-level function `_scrml_markup_factory_N` that builds the markup. The factory function is emitted by walking the renderSpec subtree.

**Recommendation: Option (b).** It cleanly separates the declaration (C1) from the closure body (C2 — which ALSO owns the dep-tracking via B7's DAG). C1 emits the factory function shell + the declaration; C2 wires reactive dep-tracking inside the factory.

**However, Option (b) defers the full closure emission to C2.** This is consistent with BRIEF §1: "C1 emits the declaration; C2 wires the dep-tracking." The factory function shell IS the declaration; the dep-tracking IS C2.

**SCOPE-AMENDMENT-LITE:** acknowledge in the BRIEF that markup-typed derived has a markup-emit dependency that's partially shared with C2. C1 emits the placeholder shape; C2 fills the body. This is consistent but worth flagging.

### §5.3 §6.6.17 normative compliance

Per spec §6.6.17 line 3030: "`${@derivedMarkupCell}` in markup body SHALL expand the markup tree at that position — the same as interpolating any markup value." This is satisfied by the runtime template line 181 routing `_scrml_reactive_get` to `_scrml_derived_get` for derived names. **Confirmed: no `emit-html.ts` change for use-site interpolation.**

The use-site `<badge/>` (bare tag) is **E-CELL-NO-RENDER-SPEC** per §6.6.17 line 3031 — A1b's B6 walker fires this. C1 doesn't touch it.

---

## §6 `default=` storage shape — runtime contract

### §6.1 Spec requirement

Per §6.8.1 (lines 4837-4842): `default=` stores the EXPRESSION (not a snapshot); evaluated at reset time. Applies to all shapes. `default=` on `const` derived is E-DERIVED-WRITE (A1b/B22 fires; C1 inherits).

### §6.2 Storage design

C5 will lower `reset(@cell)` to a runtime call that reads the stored default expression and evaluates it. C1 must store the expression as a closure on the cell descriptor.

**Proposed runtime API:**

```js
// Sidecar function emitted by C1 alongside the cell declaration:
_scrml_default_set(cellName, defaultFn)
// where defaultFn is a () => value closure synthesized from defaultExpr.
//
// Example: <startTime default=null> = Date.now()
//   emits:
//     _scrml_reactive_set("startTime", Date.now());
//     _scrml_default_set("startTime", () => null);
```

Storage location: the existing `_scrml_reactive_cells` map's value-record (or a parallel `_scrml_default_fns` map). Either works — survey-recommended is a parallel map (`_scrml_default_fns`) to preserve `_scrml_reactive_cells` shape stability.

### §6.3 ZERO-new-runtime-helpers tension

BRIEF §4.3 says "ZERO new runtime helpers." `_scrml_default_set` IS a new runtime helper. **SURVEY-AMENDMENT:** one new helper is required for default-expr storage. Alternative: skip the runtime helper and emit the closure into a side-table that C5 reads from compile-time (i.e., the closure is generated at compile time as a JS module-level constant). That works too, but increases complexity. **Recommend ONE new helper: `_scrml_default_set`.**

### §6.4 Compound default-expr

Per §6.8.2 (lines 4854-4864): `reset(@compound)` recursively resets every field. So compound parents themselves don't carry a `default=` (the spec is silent on this case but the recursive semantic implies fields carry their own defaults). C1's compound recursion naturally handles this — each child's `defaultExpr` is registered via `_scrml_default_set` at the child's qualified path.

### §6.5 `default=` on derived cell

Per §6.8.1 line 4843: E-DERIVED-WRITE. A1b/B22 fires this BEFORE codegen. C1 will never see a derived cell with `defaultExpr !== null` in a well-formed AST. Defensive: emit a comment-out line if encountered (`// SHOULD NOT REACH — A1b should have rejected`).

---

## §7 S61 11.5 gap closure — diff envelope

### §7.1 The gap

Per `docs/changes/phase-a1a-step-11-5-fold-derived/progress.md` line 79: "Shape 3 derived emits `_scrml_reactive_set` instead of `_scrml_derived_declare`. The `case "state-decl"` in emit-logic.ts has no `shape === "derived"` branch today, so Step 4's shape-population is observable in the AST but not honored by codegen." Confirmed at `emit-logic.ts:572-602` — the existing branch is gated on `structuralForm === false`, leaving Shape 3 V5-strict (`structuralForm === true`) on the legacy `_scrml_reactive_set` path.

### §7.2 The fix

**One-line change:** at line 575, drop the `structuralForm === false` check. The branch becomes:
```ts
if ((node as any).shape === "derived" && (node as any).isConst === true) {
  // ... existing derived-declare emission ...
}
```

### §7.3 Byte-output diff envelope

For every Shape 3 V5-strict declaration `const <doubled> = @count * 2`:

**Before C1:**
```js
_scrml_reactive_set("doubled", _scrml_reactive_get("count") * 2);
```

**After C1:**
```js
_scrml_derived_declare("doubled", () => _scrml_reactive_get("count") * 2);
_scrml_derived_subscribe("doubled", "count");
```

This is the EXPECTED + INTENTIONAL diff. It restores spec correctness — derived cells now lazily re-evaluate on dirty per §6.6.3 instead of being eagerly snapshot at declaration time.

### §7.4 Affected samples + tests

A grep for `^const <` in `compiler/tests/integration/*.test.js` and `samples/compilation-tests/*.scrml` is required at implementation time to enumerate the affected fixtures. **Estimated affected tests: 5-15** (based on the 6 file sweep at S61 11.5 + new derived cells added since). Each test that asserts on the byte-output of a Shape 3 V5-strict declaration needs its expectation updated to the new shape. **Estimated test-fixture update labor: 30-45 min.**

---

## §8 Output-stability test scope

### §8.1 TodoMVC + kickstarter v2 §3 corpus

Per BRIEF §6.2:
- TodoMVC byte-output diff: expected to be MINIMAL — TodoMVC uses Shape 1 (plain) cells dominantly. If it has any `const <derived>` declarations, those will diff per §7.3. Otherwise byte-identical.
- Kickstarter v2 §3 corpus: same — predominantly Shape 1; any Shape 3 entries diff per §7.3.

### §8.2 Compound + markup-typed-derived corpus

If the existing corpus has ANY Variant C compound or markup-typed derived examples, those samples currently emit broken JS (per §1 row 5 + §1 row 4). Post-C1 they emit correct JS. **Survey grep recommended at implementation time** to enumerate; if zero exist, C1 adds new samples in `samples/compilation-tests/` to cover the surface.

**Action item for implementation:** before WIP-1, run:
```
grep -l "<formRes\|<signup\|<form>\|const <[a-z][a-zA-Z]* = <" samples/compilation-tests/*.scrml compiler/tests/integration/*.test.js
```

### §8.3 Diff-envelope summary

| Diff source | Cause | Expected magnitude |
|---|---|---|
| Shape 3 V5-strict `_scrml_reactive_set` → `_scrml_derived_declare` + subscribe | S61 11.5 gap closure | 5-15 sample/test fixtures, mostly 2-line changes |
| Variant C compound now emits child decls | Was structurally unemittable | New emissions for any compound sample (likely zero today; new test coverage adds samples) |
| Markup-typed derived now emits factory + declare | Was emitting `_scrml_reactive_set("badge", undefined)` | Same — likely zero today; new tests add coverage |
| `default=` storage sidecar lines | Was silently dropped | One new line per cell with `default=` attribute |
| Shape 2 cell decl unchanged | Already emits `_scrml_reactive_set("name", undefined)` | None |
| Shape 1 plain unchanged | Working today | None |

---

## §9 Cost decomposition + sub-step boundaries

BRIEF estimates 4-6 h. Survey breaks down:

| WIP | Sub-step | Est | Notes |
|---|---|---|---|
| WIP-1 | Pre-existing fixture audit + corpus grep | 30 min | Enumerate Shape-3 V5-strict + compound + markup-typed samples; baseline test snapshot |
| WIP-2 | Shape 3 V5-strict gap closure (drop `structuralForm === false`) | 30 min | One-line change + test-fixture sweep (~10 fixtures). S61 11.5 deferred work. |
| WIP-3 | `default=` storage sidecar (`_scrml_default_set`) + runtime-template addition | 60 min | New runtime helper + emit logic + tests. |
| WIP-4 | Markup-typed derived placeholder declaration (no body emission) | 60 min | C1 emits `_scrml_derived_declare(name, _scrml_markup_factory_N)` + factory shell; full body is C2. Tests assert declaration shape only. |
| WIP-5 | Variant C compound parent + recursive child emission | 90 min | Re-use `_scrml_derived_declare` for parent-proxy (§3.3 Option A-prime); thread `compoundPathPrefix` through opts; recursive `emitLogicNode` on children. Tests cover Shape 1/3 + bindable children inside compound. |
| WIP-6 | New unit-test suite (`c1-shape-aware-cell-emit.test.js`) | 60 min | Sections §C1.1 - §C1.10 per BRIEF §4.5; ~25-35 tests. |
| WIP-7 | Output-stability validation + commit-cadence wrap | 30 min | TodoMVC + kickstarter byte-output diff confirmed against §8.3 envelope. |

**Total: ~6 h** (upper end of BRIEF estimate). Reasonable.

**WIP-commit boundaries:** each row is one commit `WIP(c1): <topic>`. The sequence keeps tests passing throughout (each WIP touches one feature area; tests for that area added in the same WIP).

---

## §10 SCOPE corrections (per pa.md Rule 4)

### §10.1 BRIEF §4.3 "ZERO new runtime helpers" — CONTRADICTED by reality

The BRIEF asserts no new runtime helpers, but C1's compound emission and `default=` storage both require new helpers IF cleanly designed:

1. **`_scrml_default_set(name, fn)`** — for `default=` storage (or alt: re-use `_scrml_reactive_set` with a magic key prefix; ugly). Recommend NEW helper.
2. **`_scrml_compound_declare(name, childNames)`** — OR re-use `_scrml_derived_declare` for the parent-proxy (Option A-prime in §3.3). The latter avoids a new helper but mixes semantic categories.

**Recommendation:** accept ONE new runtime helper (`_scrml_default_set`); re-use `_scrml_derived_declare` for compound-parent proxy. Total: **+1 runtime helper, not zero.** SURVEY-AMENDMENT.

### §10.2 A1c SCOPE §4.5 row C21 — overlaps with C1 per BRIEF folding

A1c SCOPE-AND-DECOMPOSITION §4.5 row C21: "Variant C compound + markup-typed derived emission" (5-7 h). The BRIEF folds Variant C + markup-typed into C1. **C21 needs revision:**

- Remove "Variant C compound" — covered by C1.
- Remove "markup-typed derived" — declaration covered by C1; closure body covered by C2.
- C21 retains: **Tier 3 predefined-shape compound positional sugar** (`<userInfo>: UserInfo = (a,b,c)` → typed object literal). This is a smaller surface (~2-3 h).

**Recommend:** rename C21 to "Tier 3 predefined-shape compound emission (positional sugar lowering)" with reduced estimate. Or: defer C21 entirely until parseVariant Phase 2 lands (Tier 3 shares the typed-positional-binding semantic with parseVariant per BRIEF §13.7).

### §10.3 BRIEF §6.3 baseline — outdated

BRIEF §6.3 forecasts post-C0 baseline ~9,727 (60 / 1 / **0**). Actual is 9,733 (64 / 1 / **5**). Three pre-existing fails. **Test invariant for C1: 5-or-fewer fails post-SHIP, not zero.**

### §10.4 BRIEF §3.5 "C1 does NOT read C0's bitmap" — confirmed correct

Per A1c SCOPE §4.7, C1 emits L1/L2/L3/L15 unconditionally. C0's bitmap is for downstream emitters that need to elide (C5/C6/C8/etc). C1 is structural, not optional. NO CHANGE — the BRIEF is correct.

### §10.5 `pinned` modifier — confirmed no codegen change

Per BRIEF §4.1: `pinned` is parse-time + B4 forward-ref check. Confirmed `compiler/src/codegen/` has zero references to `pinned`. NO CHANGE — the BRIEF lean is correct.

### §10.6 Engine cells skip — naturally satisfied

Per BRIEF §4.2: `_cellKind:"engine"` skipped. Confirmed: engine cells are declared via `<engine for=...>` MARKUP elements, not `state-decl` AST nodes. The `case "state-decl"` handler is never reached for engines. NO CHANGE — naturally satisfied by AST kind discrimination.

---

## §11 Verdict

**SCOPE-AMENDMENT-SUGGESTED.**

C1 is structurally feasible and the BRIEF is mostly correct, but three amendments are needed before implementation:

1. **Accept ONE new runtime helper** (`_scrml_default_set`) — BRIEF §4.3's "ZERO new helpers" is unachievable with clean design. Compound-parent proxy can re-use `_scrml_derived_declare` to keep the new-helper count to one.
2. **Update A1c SCOPE §4.5 row C21** — reduce scope (Variant C + markup-typed move to C1; only Tier 3 positional sugar remains, ~2-3 h) and confirm with PA before C21 dispatches.
3. **Update test invariant** — accept 5 pre-existing fails as the baseline; C1 invariant is "no NEW fails," not "zero fails total."

**Depth-of-survey discount caught:**
- Shape 1 plain emission is already working — C1 keeps the legacy fallthrough verbatim (zero LOC change for Shape 1). DISCOUNT.
- Shape 2 cell-declaration is already working — C1 also keeps the fallthrough; the bind:* dispatch is C4 not C1 (the `<input>` element appears at use-site `<userName/>` per L16, which is C3's render-spec expansion). DISCOUNT — Shape 2 is mostly satisfied today, with the actual binding glue deferred to C3+C4.
- Markup-typed derived consumption (`${@badge}` interpolation) routes through existing `emit-html.ts` infrastructure unchanged — runtime template line 181 routes `_scrml_reactive_get` → `_scrml_derived_get` automatically once `_scrml_derived_declare` registers the cell. DISCOUNT.

**Honest counter-weight (no discount, GAP):**
- Variant C compound is structurally unemittable today — child decls silently dropped. C1 must add the recursive walk + parent-proxy + qualified-path threading. ~90 min of new code.
- Markup-typed derived declaration synthesis is non-trivial — C1 emits the placeholder, but the markup-emit coupling needs a clean factory shell. ~60 min.
- `default=` storage requires new runtime helper + emit logic + tests. ~60 min.

**Net cost:** BRIEF estimate of 4-6 h holds — discounts (~30 min on Shape 1/2 reuse) offset by genuinely new compound work. Stay with 4-6 h estimate.

**Surprises:**
- Variant C compound is structurally unemittable today (zero handler in `emit-logic.ts case "state-decl"`). Existing AST + B5 classifier are correct; the codegen-side gap is wider than the BRIEF flagged.
- Tier 3 predefined-shape compound has a latent codegen bug (SequenceExpression emits as JS comma-operator, value = last operand). Unobserved because no current sample exercises it.
- The runtime template (`runtime-template.js:181`) already routes `_scrml_reactive_get` → `_scrml_derived_get` for any derived-registered name. This is a key infrastructure assist that simplifies C1's markup-typed-derived path significantly.

---

## §12 References

- BRIEF: `docs/changes/phase-a1c-step-c1-shape-aware-cell-emit/BRIEF.md`
- A1c SCOPE: `docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md` §3.1 / §4.1 / §4.5 / §4.7 / §4.8
- C0 SURVEY: `docs/changes/phase-a1c-codegen/SURVEY.md`
- S61 11.5 progress: `docs/changes/phase-a1a-step-11-5-fold-derived/progress.md` (line 79 — Shape 3 deferred gap)
- SPEC: `compiler/SPEC.md` §6.1 / §6.2 / §6.3 / §6.6 (incl. 6.6.16-17) / §6.8 / §14.11
- Existing codegen: `compiler/src/codegen/emit-logic.ts:540-700` (Shape 3 partial dispatch); `emit-reactive-wiring.ts`, `emit-bindings.ts`, `binding-registry.ts`, `emit-html.ts`
- A1b annotation contracts: `compiler/src/symbol-table.ts:200-310, 428-596, 1430-1560`; `compiler/src/types/ast.ts:420-630`
- A1c C0 (FeatureUsage): `compiler/src/codegen/usage-analyzer.ts:90-145`
- Runtime API: `compiler/src/runtime-template.js:180-300`

---

## §13 Tags

#a1c #c1 #phase-0 #survey-complete #scope-amendment-suggested #shape-aware-cell-emit #variant-c-compound #markup-typed-derived #default-storage #s61-11-5-gap-closes #depth-of-survey-discount-caught
