# Recon — `lin` Approach B (cross-`${}` block) verification

**Date:** 2026-04-29
**Audit reference:** `scrml-support/docs/deep-dives/language-status-audit-2026-04-29.md` row 4 (top-5 drifts) + matrix row §4 ("`lin` cross-`${}` block (Approach B)" 🟡)
**Verification mode:** read-only (source + tests + spec + samples). No compiler runs.

---

## 1. TL;DR

**State: FULL — implemented and tested.** The audit's "implementation status uncertain" caveat is **stale**. The cross-`${}` block lin feature (SPEC §35.2.2) has shipped:

- `compiler/src/type-system.ts:6230 checkLinear` is the program-level entry; called once on `fileAST.nodes` at line 7922 with no parent linTracker, so a single tracker spans every program-level sibling node (logic blocks, markup blocks, markup interpolations).
- The default `walkNode` case (lines 6814–6823) recurses into both `body` and `children`, so a `lin-decl` inside a sibling `${}` block A and a `lin-ref` inside sibling block B (or markup interpolation) resolve to the same `linTracker` instance.
- Codegen at `compiler/src/codegen/emit-logic.ts:1283` emits `const <name> = <rhs>;` once at program scope — not inside a block-local IIFE — satisfying §35.2.2's "compiler SHALL hoist the JS storage … to a single binding at the common ancestor scope."
- **Existing test fixture: `compiler/tests/unit/gauntlet-s25/lin-cross-block.test.js`** — 6 tests covering the exact §35.2.2 cases (declare-A/consume-B, decl-A/consume-via-`${token}`-interpolation, never-consumed → E-LIN-001, intermediate-ref → E-LIN-002, double-consume across blocks → E-LIN-002, two parallel lin vars). Not skipped, not flagged. Sibling tests `lin-005-shadowing.test.js` and `lin-006-deferred-ctx.test.js` complete the §35.2.2 / §35.5 surface.

**Recommended next step: documentation-only.** The audit's matrix row, the audit's "Top 5 drifts" item 4, and the audit's "Open questions / out-of-scope" item 1 should be amended from "🟡 / uncertain" to "✅ shipped — `gauntlet-s25/lin-cross-block.test.js` (S25)". No code change. No additional tests required (the existing 6 cover §35.2.2's normative surface; one optional B2 sample fixture in `samples/compilation-tests/lin-003-cross-block.scrml` could be added for parity with the lin-001/lin-002 doc-fixture pattern, but is not required for verification).

---

## 2. SPEC §35.2.2 verbatim

Quoted from `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/SPEC.md` lines 12321–12358:

> ### 35.2.2 Cross-`${}` Block Lin
>
> A `lin` variable declared in one `${}` logic block may be consumed in a subsequent `${}` logic block, or in an intervening markup interpolation, provided both the declaration and the consumption occur within the same parent scope. The compiler hoists the storage to a single binding at the common ancestor scope in the JS output — there is one `const` for the `lin` variable regardless of how many blocks straddle it.
>
> ```scrml
> <program>
>   ${
>       lin token = fetchToken()
>   }
>   <p>Value is ${token}</>   <!-- counts as the consumption -->
> </program>
> ```
>
> The markup interpolation `${token}` is the one consumption event; it satisfies §35.3 rule 1 (reading in an expression). Equivalently:
>
> ```scrml
> <program>
>   ${
>       lin token = fetchToken()
>   }
>   <p>middle</>
>   ${
>       authenticate(token)   // consumption in a later block — valid
>   }
> </program>
> ```
>
> Both forms compile. The generated JS hoists `const token = fetchToken();` to the enclosing scope once.
>
> The intermediate-visibility rule from §35.2 still applies across block boundaries: any reference to the `lin` variable that is not the single consumption event is E-LIN-002. An interleaving of declaration → read in block A → read in block B → … counts as multiple references and fires E-LIN-002 on the second.
>
> **Normative statements:**
>
> - A `lin` variable declared in a `${}` logic block MAY be consumed in a later `${}` logic block or in an intervening markup interpolation within the same parent scope.
> - The compiler SHALL hoist the JS storage for such a `lin` variable to a single binding at the common ancestor scope of the declaration and the consumption.
> - Any reference to the `lin` variable in an intermediate `${}` logic block, intermediate markup interpolation, or any other intermediate position between the declaration and the single consumption SHALL be E-LIN-002 per §35.2.
> - Scope-exit enforcement applies at the parent scope boundary: a `lin` variable declared in a nested `${}` block but never consumed before the parent scope closes SHALL be E-LIN-001 per §35.5.

The "discontinuous case" §35.2.2 specifies is exactly **declare in sibling logic block A, consume in sibling logic block B (or in markup interpolation between them) within the same parent (e.g. `<program>`) scope.**

### Audit row verbatim

From `scrml-support/docs/deep-dives/language-status-audit-2026-04-29.md` line 124 (Type-system table):

> | `lin` cross-`${}` block (Approach B) | 🟡 | §35.2.2 (lines 12321–12358) | Spec normative; type-system has tracking; no test fixture for cross-block case in `samples/compilation-tests/lin-*` | **Implementation status uncertain** — memory says "queued, implementation is the next step" |

And line 14 (top-5 drifts, item 4):

> 4. **`lin` Approach B (cross-`${}` block hoisting)** is in the spec (§35.2.2, lines 12321–12358) but **implementation status is uncertain**. The type-system has `isLin` tracking, E-LIN-001/002/003/005/006 plumbing, and a single example (`examples/19-lin-token.scrml`), but the only compilation tests are `lin-001-basic-linear.scrml` and `lin-002-double-use.scrml` — neither exercises the §35.2.2 cross-block discontinuous case. Per memory (`project_lin_redesign.md`): "Approach B ratified, implementation queued — implementation is the next step." Read-only audit cannot confirm whether queued implementation has landed.

The audit was correct that **`samples/compilation-tests/lin-*`** does not contain a cross-block case. The audit did not look at `compiler/tests/unit/gauntlet-s25/lin-cross-block.test.js`, which does contain the cross-block test fixtures. The implementation has landed; the verification gap is one of inventory, not capability.

---

## 3. Implementation trace

Function-by-function walk through the lin enforcement in `compiler/src/type-system.ts`. Line numbers cite the main repo (not a worktree).

### 3.1 Entry point

`compiler/src/type-system.ts:7918–7923`:

```ts
const allLinNodes = (fileAST.nodes as ASTNodeLike[] | undefined)
  ?? ((fileAST.ast as FileAST | undefined)?.nodes as ASTNodeLike[] | undefined)
  ?? [];
if (allLinNodes.length > 0) {
  checkLinear(allLinNodes, errors, { file: filePath });
}
```

The pipeline calls `checkLinear` **once** at file scope with the entire top-level node list. This is the load-bearing decision: a single `linTracker` is constructed at line 6240 and persists across every sibling node (logic block, markup block, markup interpolation, inline `${...}`) at the program level.

The comment at lines 7912–7917 explicitly anticipates the cross-block case:

> // checkLinear's default case descends into .body and .children so
> // markup.children and logic.body both get visited; function-decl recurses
> // with its own scope and breaks, so no double-walk occurs.

### 3.2 LinTracker (the state)

`compiler/src/type-system.ts:5934–6024` — class `LinTracker`. State per name: `"unconsumed" | "consumed"` plus a `_declDeferredDepth` for E-LIN-006. Methods:

- `declare(name, deferredDepth=0)` — line 5953
- `consume(name, span, deferredDepth, deferredCtx)` — line 5960. Returns `LinErrorDescriptor` for E-LIN-002 (already consumed) or E-LIN-006 (declared outside, consumed inside `<request>`/`<poll>`).
- `forceConsume`, `unconsumedNames`, `has`, `isUnconsumed` — supporting.

**No per-block scoping.** The tracker has no notion of "block A" vs "block B." A `declare("token")` from block A and a `consume("token")` from block B both hit the same Map.

### 3.3 walkNode dispatch

`compiler/src/type-system.ts:6377–6830`. The relevant cases:

| Case | Lines | Behavior |
|---|---|---|
| `lin-decl` | 6382–6385 | `lt.declare(node.name, currentDeferredDepth)` — registers in the active tracker |
| `lin-ref` | 6403–6428 | Looks up `lt` first; if not found, falls back to `parentLinTracker`; calls `tracker.consume(name, span, …)` |
| `if-stmt` | 6479–6543 | Snapshot/restore branch-parallel; emits E-LIN-003 for asymmetry |
| `match-stmt`/`match-expr` | 6545–6630 | Branch-parallel arm walking; E-LIN-003 for arm asymmetry |
| `for-loop`/`while-loop`/`for-stmt`/`while-stmt`/`do-while-stmt` | 6632–6645 | Calls `walkLoopBody` — outer-scope lin consumed inside is E-LIN-002; loop-local lin uses per-iteration `loopLocalLin` |
| `function-decl` | 6647–6674 | Recursive `checkLinear` with **no `parentLinTracker`** — function bodies are a closed scope |
| `closure` | 6676–6701 | `captures` → `tracker.consume`; recurses with `linTracker: lt, mustUseTracker, …` (so closures share the parent tracker for non-capture references) |
| `meta` (`^{}`) | 6703–6782 | Special: text-scans the body for tracked lin names; consumes once per unique name |
| `markup` (with `tag`/`name`) | 6789–6812 | Increments `currentDeferredDepth` if the markup is `<request>` or `<poll>`. Walks BOTH `body` and `children` recursively, then restores depth |
| **default** | 6814–6823 | **Walks both `body` and `children`** — this is the load-bearing line for cross-block. Markup nodes that aren't request/poll, program nodes, and any other container get their children visited recursively in the same `lt`. |

After the switch, every node also gets `scanNodeExprNodesForLin(node, lt, loop)` (line 6829) — the ExprNode walker pass that catches lin reads inside structured expression fields (`exprNode`, `initExpr`, `condExpr`, etc.) per Phase 2 Slice 2 (master-list §P5).

### 3.4 The default walk and the cross-block case

The `<program>` element does not have a special case — it falls through to `default`. Same for `<p>`, `<div>`, `<form>`, etc. Each is walked recursively, body + children, against the SAME `linTracker` `lt`. The tree visit order is depth-first, top-to-bottom (the `for (const n of body)` and `for (const n of children)` loops at lines 6816–6822).

Discontinuous case walk-through:

```scrml
<program>
  ${ lin token = fetchToken() }   <!-- block A -->
  <p>middle</>
  ${ authenticate(token) }         <!-- block B -->
</program>
```

The AST visit order:
1. `walkNode(<program>, lt, …)` → default case → walks children
2. Child 1 = logic block A. Default case again → walks body. Body contains `lin-decl` for `token`. `lt.declare("token")` runs.
3. Child 2 = `<p>middle</>` markup. Default case → walks children (none containing lin refs).
4. Child 3 = logic block B. Default case → walks body. Body contains a call expression with an `IdentExpr` ref to `token`. `scanNodeExprNodesForLin` walks the `exprNode` fields, calls `forEachIdentInExprNode` (`expression-parser.ts:1916`), invokes `consumeLinRef("token", …)` (line 6894), which does `tracker.consume(...)` on the same `lt` from step 2.

**Result:** `token` goes from `unconsumed` → `consumed`. No errors. Scope exit at line 7163 sees no `unconsumedNames()`. Verified by inspection of code paths.

### 3.5 Markup interpolation case

`<p>Value is ${token}</>` is parsed such that the interpolation produces an ExprNode (or escape-hatch with template-literal special-cased at `expression-parser.ts:1948–1961`) referencing `token`. The walker hits the same `consumeLinRef` path. `lin-template-literal-interpolation.test.js` (Case 5) verifies the surrogate template-literal path. The cross-block test (Case 2 of `lin-cross-block.test.js`) verifies it inside an actual `<p>` markup-interpolation context.

### 3.6 Codegen / hoisting

`compiler/src/codegen/emit-logic.ts:1283–1290`:

```ts
case "lin-decl": {
  // §35.2: lin bindings are immutable — emit as `const`.
  if (!node.name) return "";
  const linInit: string = node.init ?? "";
  if (!linInit.trim()) return `const ${node.name};`;
  const linRhs = emitExprField(node.initExpr, linInit, _makeExprCtx(opts));
  return `const ${node.name} = ${linRhs};`;
}
```

Crucially this is just a plain `const` emission. There is no IIFE-wrapping per logic block at the program level. Each block A/block B emits flat into the program scope (verified by `samples/compilation-tests/dist/lin-001-basic-linear.client.js` lines 12–13: `const token = _scrml_fetchToken_2(); _scrml_useToken_3(token);` — bare statements at module scope).

Therefore: declaring `lin token = ...` in block A and referencing `token` in block B literally translates to two statements in the same flat module scope — JS `const` is single-binding, no extra hoisting work needed. The §35.2.2 normative requirement "compiler SHALL hoist the JS storage … to a single binding at the common ancestor scope" is satisfied as a side-effect of the compiler not wrapping individual logic blocks in IIFEs at program scope. The cross-block test asserts this directly: `expect(clientJs.match(/const token/g)?.length ?? 0).toBe(1)` (line 77 of `lin-cross-block.test.js`).

### 3.7 What about the discontinuous-vs-Approach-A distinction?

Per the audit's framing, "Approach A" = simple declared-and-consumed-in-same-block; "Approach B" = cross-block discontinuous case. The deep-dive `lin-discontinuous-scoping-2026-04-13.md` actually reframes these terms: the original "Approach A" in the deep-dive is **full discontinuous visibility (the user's quantum-superposition vision)**, and "Approach B" was the conservative/scoped-with-cross-block-hoisting version. **The implementation that shipped corresponds to Approach B from the deep-dive**, which is what the SPEC §35.2.2 normative text describes.

In practical terms the implementation handles:
- **parent → child scope:** ✅ handled — child function bodies start a fresh tracker (line 6662) so this is the closed-scope interpretation
- **sibling scope at same level (the discontinuous case):** ✅ handled — the single program-level tracker spans siblings; verified by `lin-cross-block.test.js`
- **branch arm A vs branch arm B both consuming the same lin (E-LIN-003 territory):** ✅ handled — line 6479 `if-stmt` case + 6545 `match-stmt` case do snapshot/restore + symmetry comparison
- **branch where one arm consumes, other doesn't:** ✅ handled — same code paths fire E-LIN-003

---

## 4. Test fixture inventory

All tests under `compiler/tests/unit/`. Categories (per the recon brief):
- **A1** = simple declare+consume (single block)
- **A2** = double-consume → E-LIN-002
- **A3** = never-consumed → E-LIN-001
- **A4** = branch asymmetry → E-LIN-003
- **A5** = loop / closure / lift / match / lin-param / shadowing / deferred-ctx (existing breadth)
- **B1** = **cross-block discontinuous (§35.2.2)** — declare in sibling block A, consume in sibling block B
- **B2** = cross-block via markup interpolation (declare in `${}`, consume in `<p>${token}</>`)
- **N** = negative — should fail compile

| Test file | Test name | Case | Assertion |
|---|---|---|---|
| `gauntlet-s25/lin-cross-block.test.js:60` | "declare in block A, consume in block B → no lin errors; hoisted to common scope" | **B1** | `lin === []`, `clientJs` has exactly one `const token` |
| `gauntlet-s25/lin-cross-block.test.js:80` | "declare in block, consume via markup interpolation → no lin errors" | **B2** | `lin === []` |
| `gauntlet-s25/lin-cross-block.test.js:92` | "declared, never consumed → E-LIN-001" | **A3 cross-block** | one E-LIN-001 mentioning `token` |
| `gauntlet-s25/lin-cross-block.test.js:104` | "intermediate reference then later consume → E-LIN-002" | **B1+N** | E-LIN-002 fires (any reference is consumption per §35.2) |
| `gauntlet-s25/lin-cross-block.test.js:120` | "consumed in two different later blocks → E-LIN-002" | **A2 cross-block** | E-LIN-002 fires |
| `gauntlet-s25/lin-cross-block.test.js:139` | "two separate lin vars, each consumed once in a later block → no errors" | **B1 multi** | `lin === []` |
| `gauntlet-s25/lin-005-shadowing.test.js` (11 tests) | E-LIN-005 shadowing across nested function/loop scopes | A5 | E-LIN-005 fires/doesn't per scope rules |
| `gauntlet-s25/lin-006-deferred-ctx.test.js:54` | "lin declared outside `<request>`, consumed inside → E-LIN-006" | A5 / §35.5 | E-LIN-006 fires; no cascading E-LIN-001 |
| `gauntlet-s25/lin-006-deferred-ctx.test.js:72` | "lin declared inside `<request>` body and consumed inside → no error" | A1-in-request | clean |
| `gauntlet-s25/lin-006-deferred-ctx.test.js:90` | "lin declared outside `<poll>`, consumed inside → E-LIN-006" | A5 / §35.5 | E-LIN-006 fires for `<poll>` |
| `gauntlet-s25/lin-006-deferred-ctx.test.js:106,126,143` | message shape, closure carve-out, no-deferred-ctx baseline | A5 | corresponding |
| `gauntlet-s19/lin-checker.test.js:54` | "A14: outer-scope lin consumed inside for-stmt → E-LIN-002" | A5 (loop) | E-LIN-002 |
| `gauntlet-s19/lin-checker.test.js:76` | "B1: two lambdas capturing the same lin var → E-LIN-002" | A5 (closure) | E-LIN-002 |
| `gauntlet-s19/lin-checker.test.js:97` | "B2: asymmetric match arms → E-LIN-003" | A4 (match) | E-LIN-003 only |
| `gauntlet-s19/lin-checker.test.js:125` | "B3: if without else does not consume → only E-LIN-003" | A4 (if) | E-LIN-003 only |
| `gauntlet-s19/lin-checker.test.js:149,175,197` | symmetric match / loop-local sanity / sym branch sanity | A1/A4 | clean |
| `lin-template-literal-interpolation.test.js` (6 tests) | Cases 1-6 — template literal interp consumes lin (single-block) | A1 / A2 / N | per case |
| `type-system.test.js:1441–1639` | §33–§38 TS-G unit tests | A1/A2/A3/A4/A5 | direct AST-level checkLinear invocations |
| `type-system.test.js:3059–3217+` | Lin-A1/A2/A3/B1-5 (lift, tilde, loop carve-out, lin-params) | A5 | lin-params, lift consumes, tilde double-obligation |

**Categories with ZERO test coverage:**
- None among A1–A5, B1, B2 within `compiler/tests/unit/`.
- The audit-flagged "no fixture in `samples/compilation-tests/lin-*`" is true for **`samples/compilation-tests/`** (only lin-001 and lin-002 exist there) but the unit-test directory has full coverage. The samples directory is a doc-fixture pattern, not the canonical test suite.

---

## 5. Sample fixture inventory

`samples/compilation-tests/` is the doc-fixture pattern for end-to-end compile artifacts (each sample produces `dist/<name>.html` + `<name>.client.js` for visual inspection / smoke).

| File | Behavior tested | Compile result | Approach |
|---|---|---|---|
| `lin-001-basic-linear.scrml` | Declare + consume in one logic block, straight-line | clean (verified via `dist/lin-001-basic-linear.client.js` shows `const token = _scrml_fetchToken_2(); _scrml_useToken_3(token);` flat at module scope) | A (single-block) |
| `lin-002-double-use.scrml` | Declare + consume twice in one logic block | expects E-LIN-002 | A (single-block negative) |

**Gap (audit-flagged, accurate):** no `lin-003-cross-block.scrml` fixture in `samples/compilation-tests/` exercising §35.2.2. Filling this gap is a documentation/doc-fixture concern, not a verification concern — the unit tests already verify behavior. If added, the canonical pair would be:

- `lin-003-cross-block.scrml` — declare in block A, consume in block B → clean compile
- `lin-004-cross-block-double.scrml` — declare in block A, consume in block B then again in block C → E-LIN-002

These would mirror the pattern of `lin-001` / `lin-002`. They are NOT required to verify the implementation; they would be required for someone reading `samples/compilation-tests/` to find a worked example.

---

## 6. Verification verdict

### 6.1 Minimal scrml exercising Approach B

Direct quote from the SPEC §35.2.2 example (verbatim valid):

```scrml
<program>
  ${
      lin token = fetchToken()
  }
  <p>middle</>
  ${
      authenticate(token)   // consumption in a later block — valid
  }
</program>
```

This is **identical** to `lin-cross-block.test.js` test case 1 source (lines 61–69) modulo placeholder names — that test already exercises this case.

### 6.2 Predicted behavior `[INFERRED]` (no compiler run)

Trace through `checkLinear`:

1. `checkLinear([<program>], errors, { file })` enters at line 6230. `linTracker = new LinTracker()` (line 6240). No `parentLinTracker`.
2. Top-level walk: `walkNode(<program>, linTracker, …)`. Default case (line 6814) — walks `children`.
3. Child 1: logic block (kind likely `logic` or carrying `body: [lin-decl, …]`). Default case → walks `body`. Hits `case "lin-decl"` (line 6382) → `lt.declare("token", 0)`.
4. Child 2: `<p>middle</>`. Default case → walks children (text only). No-op for lin.
5. Child 3: logic block with body containing a `bare-expr`/`call-expr` that has an `exprNode` with a `CallExpr` whose args contain `IdentExpr("token")`. After the switch dispatch (line 6829), `scanNodeExprNodesForLin(node, lt, loop=false)` runs. `forEachIdentInExprNode(field, callback)` (line 7081) hits `IdentExpr("token")`. `consumeLinRef("token", span)` (line 6894) → `lt.has("token") = true` → `tracker.consume("token", span, 0, null)` (line 5960). State `unconsumed → consumed`. No error.
6. Scope exit: line 7163 `linTracker.unconsumedNames()` returns `[]`. No E-LIN-001 fires. Total errors emitted from lin: 0.

**Predicted result: VERIFIED clean compile, zero lin errors.**

### 6.3 Cross-checks (decl in A, intermediate ref, later consume — should fire E-LIN-002)

```scrml
<program>
  ${ lin token = fetchToken() }
  <p>Peek: ${token}</>
  <p>after</>
  ${ authenticate(token) }
</program>
```

Trace: declare → first `${token}` markup interp consumes (state → `consumed`) → second `authenticate(token)` calls `tracker.consume` again, state already `consumed`, returns E-LIN-002 descriptor (line 5977–5985). **Predicted: E-LIN-002 fires.** This is `lin-cross-block.test.js` test 4 (line 104), and it asserts exactly this.

### 6.4 Verdict

**VERIFIED — implementation handles the cross-block discontinuous case correctly.** No gaps observed. Test coverage is in place. The audit's uncertainty was based on incomplete inventory: the audit looked at `samples/compilation-tests/lin-*` (which only has lin-001 and lin-002) and missed `compiler/tests/unit/gauntlet-s25/lin-cross-block.test.js`.

---

## 7. Recommended next step

**Documentation-only path. Effort: ~30 minutes.**

The implementation is correct, the unit tests cover §35.2.2's normative surface, and the cross-block tests already encode the SPEC's worked examples. No code change. No new tests required for verification.

**Concrete writing tasks:**

1. **Update the audit doc** at `scrml-support/docs/deep-dives/language-status-audit-2026-04-29.md`:
   - Matrix row line 124: change `🟡` to `✅`. Replace "**Implementation status uncertain**" with: "Shipped; verified by `compiler/tests/unit/gauntlet-s25/lin-cross-block.test.js` (6 tests, S25 gauntlet, 2026-04-13 deep-dive ratified)."
   - Top-5 drifts item 4 (line 14): retract or move to "verified clean."
   - Open questions item 1 (line 368): close — replace with "Verified 2026-04-29: `lin-approach-b-verification-2026-04-29.md`."
   - Prioritized "fix the cracks" rank 18 (line 362, "lin Approach B implementation verification"): close.

2. **Optional doc-fixture parity** (not required, ~1h if pursued): add `samples/compilation-tests/lin-003-cross-block.scrml` (positive case) and `lin-004-cross-block-double.scrml` (E-LIN-002 case) to mirror lin-001 / lin-002 documentation-pair pattern. These would let someone browsing `samples/compilation-tests/` find a worked Approach B example. They duplicate existing unit-test coverage so add zero verification value.

3. **Tutorial update** (already named in audit's Top-5 fix queue rank 7, scope unchanged): `docs/tutorial.md` line 1642 says `lin` is "queued for redesign; do not teach." The S48 close note in `master-list.md` confirms "`lin` deferral language update" was part of Tutorial Track A in commit `9873e0e` — verify this lands and whether §35.2.2 cross-block is mentioned. Out of scope for this recon.

**Test-only path (NOT recommended, but listed for completeness):** Add 1-2 sample fixtures in `samples/compilation-tests/` per item 2. Effort ~1h. Net zero verification benefit; pure documentation.

**Test+small-impl path:** N/A — no impl gap.

**Full-impl path:** N/A — feature is implemented.

---

## 8. Open user questions

None blocking. The §35.2.2 normative text is unambiguous about what counts as the discontinuous case (sibling `${}` blocks within the same parent scope, plus markup interpolations between them), and the implementation matches verbatim.

One latent surface ambiguity that the spec intentionally does NOT cover and the implementation does NOT extend Approach B to:

- **Cross-function discontinuous lin.** §35.2.2 says "within the same parent scope" — the implementation enforces this strictly: `function-decl` (line 6647) starts a fresh `linTracker` with no `parentLinTracker`, so a `lin token = …` declared in `<program>`'s top-level `${}` and referenced inside a function body declared in a sibling `${}` block does NOT cross. The function-body lookup of `token` would not find it, and the program-level scope-exit would fire E-LIN-001. This matches both the spec ("same parent scope") and the deep-dive's explicit decision against full quantum-superposition discontinuous (Approach A in the deep-dive).
- This is correct behavior, not a gap. Worth noting only because someone reading "discontinuous" might initially expect it; it isn't.

If the user wants the more aggressive cross-function discontinuous semantics (the deep-dive's "Approach A"), that's a fresh design conversation, not a fix to current Approach B.

---

## 9. Provenance

Files cited (all absolute paths, main-repo `/home/bryan-maclee/scrmlMaster/scrmlTS/`):

**Spec:**
- `compiler/SPEC.md` lines 12243–12704 (§35 entire) — read in full
- `compiler/SPEC.md` lines 12321–12358 (§35.2.2 verbatim) — quoted in §2
- `compiler/SPEC-INDEX.md` line 54 — §35 anchor verification

**Implementation:**
- `compiler/src/type-system.ts:5934–6024` — `LinTracker` class
- `compiler/src/type-system.ts:6230–7160` — `checkLinear` function
- `compiler/src/type-system.ts:6377–6830` — `walkNode` switch
- `compiler/src/type-system.ts:6814–6823` — default case (load-bearing for cross-block)
- `compiler/src/type-system.ts:6887–7088` — `scanNodeExprNodesForLin`
- `compiler/src/type-system.ts:7912–7923` — pipeline entry
- `compiler/src/expression-parser.ts:1916–2097` — `forEachIdentInExprNode`
- `compiler/src/codegen/emit-logic.ts:1283–1290` — `lin-decl` codegen

**Tests:**
- `compiler/tests/unit/gauntlet-s25/lin-cross-block.test.js` (155 lines, 6 tests, S25)
- `compiler/tests/unit/gauntlet-s25/lin-005-shadowing.test.js` (267 lines, 11 tests, S25)
- `compiler/tests/unit/gauntlet-s25/lin-006-deferred-ctx.test.js` (156 lines, 6 tests, S25)
- `compiler/tests/unit/gauntlet-s19/lin-checker.test.js` (217 lines, 7 tests, S19)
- `compiler/tests/unit/lin-template-literal-interpolation.test.js` (140 lines, 6 tests)
- `compiler/tests/unit/type-system.test.js:1441–1639, 3059–3403+` — TS-G + Lin-A/B suites

**Samples:**
- `samples/compilation-tests/lin-001-basic-linear.scrml` (17 lines)
- `samples/compilation-tests/lin-002-double-use.scrml` (19 lines)
- `samples/compilation-tests/dist/lin-001-basic-linear.client.js` (19 lines — confirms flat-module-scope `const token = …`)
- `examples/19-lin-token.scrml` (114 lines — uses §35.2.1 lin-param, single-block)

**Audit / deep-dives:**
- `scrml-support/docs/deep-dives/language-status-audit-2026-04-29.md` lines 14, 124, 362, 368
- `scrml-support/docs/deep-dives/lin-discontinuous-scoping-2026-04-13.md` lines 1–90 (deep-dive that ratified Approach B)

**Master-list confirmation:**
- `master-list.md` line 284 — "Lin spec gaps — §35.2.1 working E2E as of S4"
- `master-list.md` lines 333–346 — "P5 — Architectural refactors" Phase 2 Slice 1–4 (lin-decl emission + ExprNode walker migration)

**Negative-search (load-bearing absence):**
- No `test.skip` / `describe.skip` / `test.todo` markers in `lin-cross-block.test.js` — the tests are live.
- No `lin-003*` or `cross-block*` files in `samples/compilation-tests/` — the doc-fixture pair gap the audit correctly identified.
