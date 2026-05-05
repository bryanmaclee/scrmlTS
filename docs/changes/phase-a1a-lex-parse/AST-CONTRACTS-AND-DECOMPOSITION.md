# A1a — AST contracts + task decomposition (REV 2, S59)

**Status:** revised post-parser-audit (`docs/changes/v0next-audit/PARSER-AUDIT-2026-05-05.md`). Original rev (S60 dispatch) targeted `kind: "state"` (markup-tag-style state opener) — wrong. Correct extension target is `kind: "reactive-decl"`, which the audit confirms is the only state-decl-with-RHS form the parser produces today (for `@NAME = init` inside `${...}` blocks).

**Decisions ratified S59 (post-audit):**
- **Architecture: PIECEMEAL migration**, not greenfield rewrite. ~60% of parser is v0.next-compatible already.
- **Acorn STAYS.** Pre-processor extension absorbs new `<NAME> = RHS` syntax above acorn's level.
- **AST kind rename: `reactive-decl` → `state-decl`** (PA-recommended; matches V5-strict pillar naming). Existing field semantics preserved + extended.
- **Foundational pass goes FIRST** (Step 2 in the rev decomposition), before any shape-discriminant work. Without `<NAME>` decl-site recognition, the rest is moot.
- **Test invariant strengthening:** every step's DoD asserts AST shape, NOT just compile-clean. The deceptive-success pattern (17 of 25 v0.next forms compile-clean while parsing as html-fragment) is the central anti-test (per audit §C.1 + §G.1).

**Total estimated A1a wall-time:** **35-55h focused work** (~3x the original 11-19h estimate). Not a single dispatch; per-step decomposition with PA cherry-pick + test-on-main between each.

---

## §1 AST contracts (the A1b/A1c-facing interface)

### §1.1 `kind: "state-decl"` — RENAMED from `reactive-decl` + EXTENDED

**Status:** rename landed in Step 3 (branch `phase-a1a-step-3-rename-state-decl`, parent commit `7aad93a`). All source-code references to the literal `"reactive-decl"` string have been mass-renamed to `"state-decl"`. Historical name preserved in this section for rationale context only.

**Rename premise:** the AST kind formerly called `reactive-decl` represents a state-cell declaration (currently `@NAME = init` form, extended in Steps 4-7 with `<NAME> = init` form). The "reactive-decl" name was pre-V5-strict; under v0.2.0 the canonical concept is "state declaration" — both `<NAME>` and `@NAME` produce the same AST kind, distinguished by a `structuralForm` flag.

**Existing fields preserved** (from `reactive-decl`): `name`, `init` (string form), `initExpr` (ExprNode), `span`, optional `isShared`, `isServer`, type-annotation fields, sql-init flags, etc. (full list per current `ast-builder.js` ~11 construction sites at lines 3001-3160 + 4735+).

**A1a adds:**

| Field | Type | Permitted values | Set by | A1b/A1c consumes |
|---|---|---|---|---|
| `structuralForm` | boolean | `true` if decl used `<NAME>` form; `false` for legacy `@NAME =` | parser, at decl-site | A1b resolver linkage (V5-strict bare-name-as-local enforcement); A1c codegen unchanged for both forms |
| `shape` | string | `"plain"` \| `"decl-with-spec"` \| `"derived"` | parser, after RHS classification | A1b resolver/typer; A1c codegen dispatch |
| `isConst` | boolean | `true` iff `const <x> = ...` form | parser, when `const` modifier seen on the decl | A1b derived-cell wiring; A1b L21 enforcement |
| `validators` | array of `{name: string, args: ExprNode[] \| null, span}` \| null | parser, from bareword-attrs on Shape 2 decls | parsed contextually during Shape 2 attr scan | A1b validator typer; A2 reactive validity surface |
| `defaultExpr` | ExprNode \| null | RHS of `default=` attribute when present | parser, when `default=` attr seen | A1c codegen for `reset(@cell)` lowering |
| `pinned` | boolean | `true` iff `pinned` bareword modifier present | parser, when `pinned` bareword attr seen | A1b forward-ref check; A1c hoisting |
| `renderSpec` | RenderSpecNode \| null | Shape 2 only; the bindable markup RHS | parser, when RHS is a markup element | A1b bindable classifier; A1c bind:* dispatch |

**Note:** `initExpr` field already exists on `reactive-decl` for the `@NAME = expr` form. Repurposed for both forms post-rename. Compound parents (Variant C) carry `initExpr: null` — children are the structural payload.

**Invariant:** exactly one of `renderSpec` / `initExpr` is non-null on a non-compound-parent state-decl node.

**`shape` discriminant rule:**
- `shape: "plain"` ↔ `isConst === false` AND `renderSpec === null` AND has `initExpr` AND no children-of-state-decl-shape (i.e., not Variant C compound parent).
- `shape: "decl-with-spec"` ↔ `isConst === false` AND `renderSpec !== null` AND `initExpr === null`.
- `shape: "derived"` ↔ `isConst === true` AND `initExpr !== null` AND `renderSpec === null`.
- Variant C compound parent: `shape: "plain"`, `initExpr: null`, `children` populated. Children are themselves `state-decl` nodes with their own `shape`.

### §1.2 `kind: "render-spec"` — NEW

```
{
  kind: "render-spec",
  element: MarkupNode,       // the bindable markup AST node (input/textarea/select)
  span
}
```

Used as the value of `renderSpec` on a Shape-2 state-decl node. Wraps the existing markup AST node so A1b/A1c have a stable type-tag for "this markup is a render-spec for a state cell," distinct from "this markup is a value being assigned to a state cell."

### §1.3 `kind: "reset-expr"` — NEW (in expression-parser)

```
{
  kind: "reset-expr",
  target: ExprNode,    // must be @cell or @compound.field; A1b validates the shape
  span
}
```

Parser-level invariant: `reset` keyword followed by `(` followed by exactly one expression argument, followed by `)`. Zero-arg form fires `E-RESET-NO-ARG`.

### §1.4 `kind: "import-item"` — extended

Add `pinned: boolean` field. Set when `pinned` bareword modifier appears in the import-list item (`import { foo pinned } from '...'`).

### §1.5 Expression nodes — shape preservation only

`MemberCall`, `MemberAssignment` (with `op` field), `UnaryDelete` already exist (verified S59 Step 8 path; need to confirm `op` field present). A1a confirms they survive the v0.next changes; no new fields added. A1b uses these to fire L21 (E-DERIVED-VALUE-MUTATE).

---

## §2 Lexer contracts

### §2.1 Reserved keyword additions — STATUS

- `reset` — **DONE S59 Step 1** (`9cd7779`). KEYWORDS set in `tokenizer.ts` line 71 (within "scrml built-in functions / modifiers" group).
- `pinned` — **NOT** added to global `KEYWORDS`. Contextual bareword. Parser recognizes inside attribute lists of state-decl + import-item only.
- `default` — already in `KEYWORDS` (line 58). Parser recognizes `default=` form contextually.
- `req` — **NOT** a reserved keyword. Bareword-attribute on Shape 2 decls. Parser recognizes contextually.
- `not` — already in `KEYWORDS` (line 78). No A1a work.

### §2.2 No-op verification

`<ident>` (structural decl-site / markup-tag) and `@ident` (canonical access) tokenize unchanged. Smoke-test with kickstarter v2 §3 examples.

---

## §3 Task decomposition (REV 2 — sequential per-step dispatches)

Each step is a focused sub-agent on its own per-step branch with PA cherry-pick to main between steps.

| # | Step | Files | Est | Status |
|---|---|---|---|---|
| 1 | Lexer: reserve `reset` | `tokenizer.ts:55-85` + `tokenizer-reset-keyword.test.js` (4-6 tests) | 1 h | ✅ DONE S59 (`9cd7779`) |
| 2 | Foundational: `<NAME>` decl-site recognition in block-splitter + body-pre-parser | `block-splitter.js` + `body-pre-parser.ts` — emit a new pre-AST signal when `<IDENT>` appears at expression-statement-start position followed by `>` (or attrs `>`) followed by `=` or `:` (typed) or `{` (compound block); body-pre-parser extracts the decl form before acorn sees it | 10-15 h (actual: ~21min — depth-of-survey discount) | ✅ DONE S59 (`d28f6f7`) |
| 3 | AST kind rename: `reactive-decl` → `state-decl` | `ast-builder.js` (~11 construction sites) + all consumer sites (~100+ across resolver, typer, codegen) — mechanical rename | 3-5 h | ✅ DONE S59 (`8fa26e1`) |
| 4 | Parser: state-decl `shape` discriminant + `isConst` + `initExpr` for Shapes 1 + 3 + `structuralForm` | `ast-builder.js` only — extend `state-decl` builder to set new fields based on Foundation Step 2's pre-AST signal | 3-4 h | ✅ DONE S59 (`96dbe92`) |
| 5 | Parser: Shape 2 `renderSpec` + bareword validators + `req` | `ast-builder.js` only — when RHS is markup, wrap in `kind: "render-spec"`; attr scan collects bareword validators (incl. `length(>=2)`-style call-form) into `validators[]` | 3-4 h | ✅ DONE S59 (`505531f`) |
| 6 | Parser: `default=` attribute + `pinned` bareword on state-decl | `ast-builder.js` only — extend attr scan to extract `default=expr` → `defaultExpr`, and `pinned` bareword → `pinned: true` | 1-1.5 h | ✅ DONE S60 (`2754940`) |
| 7 | Parser: `pinned` on import items | `ast-builder.js` only — extend import-decl parser to recognize `pinned` bareword inside `{ name pinned, ... }` import lists | 0.5-1 h | ✅ DONE S60 (`556de93`) |
| 8 | E-RESERVED-IDENTIFIER trigger | `ast-builder.js` + `init.js` rename | 0.5 h | ✅ DONE S59 (`af4a0da`) |
| 9 | Expression parser: `reset(@cell)` keyword + `E-RESET-NO-ARG` | `expression-parser.ts` — recognize `keyword(reset)` `(` `expr?` `)` → `kind: "reset-expr"`; emit `E-RESET-NO-ARG` on zero-arg form | 1-2 h | ✅ DONE S60 (`fded36a`, +8 tests; full tree-walk surfacing) |
| 10 | Expression parser: shape verification for `MemberCall` / `MemberAssignment` (incl. compound-assign ops) / `UnaryDelete` | `expression-parser.ts` — verify; `op` field already present (esTreeToExprNode boundary) | 1-2 h | ✅ DONE S60 (`226a2dd`, +10 tests; ZERO source changes — depth-of-survey discount #8) |
| 11 | Compound (Variant C) verification + render-by-tag verification + kickstarter v2 §3 smoke tests | new test file additions only — likely no source changes | 1-1.5 h | ✅ DONE S60 (`bcca1e6`, +23 tests; 3 deferred divergences surfaced) |
| 11.0a | Variant C compound recognizer | `ast-builder.js` `tryParseStructuralDecl` L2912 + `scanStructuralDeclLookahead` L3070 + `collectExpr` L1784; ~127 LOC + 14 LOC types | 2-3 h | ✅ DONE S60 (`6d51d00`, +8 tests; 2 TODO[step-11.0a] memorials flipped) |
| 11.0b | Newline-as-statement-separator | `ast-builder.js` `collectExpr` L1985-2030 ASI-NEWLINE branch (~30 LOC); free side-benefit: fix at `collectExpr` not `parseLogicBody` so it fires universally for all ASI gaps | 1-2 h | ✅ DONE S60 (`a7dd96a`, +11 tests; 1 TODO[step-11.0b] memorial flipped) |
| 11.0c | Typed-decl recognizer | `ast-builder.js` `tryParseStructuralDecl` L3115 + `scanStructuralDeclLookahead` L3293 (~48 LOC); reused existing `collectTypeAnnotation()` at L2671 (100% reusable; absorbs refinement-type forms via existing paren-depth tracking) | 2-3 h | ✅ DONE S60 (`92af2ca`, +10 tests; 2 TODO[step-11.0c] memorials flipped) |
| **11.5** | **Fold `reactive-derived-decl` into `state-decl{shape:"derived",isConst:true}`** (ADR Option A) | `ast-builder.js` (legacy `const @x = expr` parser path) + 10 src consumers + LSP handler + 7 test files + types kind-enum cleanup | **3-5 h** | ✅ DONE S61 (`a020ea1`, T2 tier; +4 pass / +1 skip / +5 total; byte-output preserved; 1 hidden coupling resolved at emit-logic.ts; 1 dep-graph dedup resolved with `isFoldedDerived` filter; self-host parity deferred per Steps 4-7 policy; pre-existing Shape 3 V5-strict codegen gap surfaced + deferred to A1c) |
| 12 | Existing-test deltas: rewrite + drop | enumerate in `progress.md`; per S59 pre-authorization freely rewrite tests baking in pre-v0.next access patterns | 4-8 h | ⏸ |
| 13 | Final commit + CHANGELOG draft | aggregate; final commit per brief §7.4 template | 0.5 h | ⏸ |

**Total: 30-45 h focused work** + 3-5h Step 11.5 (ADR S60, landed S61) + 5-8h Steps 11.0a/b/c (Step 11 escalation S60). With Steps 1-11 + 11.0a/b/c + 11.5 landed (S59 + S60 + S61), remaining is **~4.5-8.5 h** across Steps 12, 13.

**Sequencing rationale:**
- **Step 2 (the original bottleneck) finished in ~21min via depth-of-survey discount** — block-splitter already preserved raw `<` content correctly; intervention was one helper in ast-builder.js, not multi-subsystem rework. The audit's 10-15h estimate was 28-43× over actual.
- **Step 3 (rename)** landed before Steps 4-7 so they extend the renamed `state-decl` kind.
- **Steps 9, 10, 11** are independent of Steps 4-7 (touch different files); PA leans serial for cleaner integration.
- **Step 11.5 (ADR Option A FOLD)** sequenced AFTER Step 11 BEFORE Step 12 — Step 11's smoke verifies use-site behavior with two AST kinds; then fold; then Step 12 cleans tests under unified AST. Spec coherence: §6.6 models derived as a state-decl shape, not a separate kind. L21 enforcement substrate: one walker on a unified kind, not two.
- **Step 12** is the long-tail cleanup, simpler under unified AST post-11.5.
- **Step 13** is wrap.

---

## §4 What this dispatch agent (S60 + S59) committed

1. Branch `phase-a1a-lex-parse` created at `3c9748e` (S60 baseline survey).
2. Step 1 ✅ landed S59 (`9cd7779`).
3. Step 8 ✅ landed S59 (`af4a0da`).
4. Audit + scope-map + article-truthfulness audit + master-list dashboard + README banner + scrml.dev draft committed S59.
5. This document (rev 2) drafted S59.

## §5 What this dispatch agent (S60 + S59) did NOT do — and why

S60 dispatch agent did not begin Step 2 implementation because Steps 2-7 + 9-11 are blocked on the audit-driven rewrite. **Reason:** the original Step 2 target (`kind: "state"` at `ast-builder.js:7398-7407`) was the wrong AST node — that's the markup-tag-style state opener path, not the state-decl-with-RHS path. The correct extension target is `reactive-decl` (renamed to `state-decl` here), which lives at lines 3001-3160 + 4735+. Plus the prerequisite foundational `<NAME>` decl-site recognition pass didn't exist. Without that, no field extension makes sense.

This rev 2 corrects both: introduces foundational Step 2 + correct AST target.

## §6 Recommendation to PA (next steps)

Dispatch **Step 2 (foundational)** next. PRE-BRIEF should reference:
- This document §1 (AST contracts) + §2 (lexer contracts) + §3 row 2.
- `compiler/src/block-splitter.js` (full file — ~3-5k LOC; agent surveys structure first).
- `compiler/src/body-pre-parser.ts` (354 LOC).
- `docs/changes/v0next-audit/PARSER-AUDIT-2026-05-05.md` §A.2 + §A.3 + §5.3 (foundational pass description + acorn-stays argument).
- New test file path: `compiler/tests/integration/parse-shapes-v0next.test.js` (already exists from Step 8 — extend it).

Step 2 is the largest single step (10-15h estimate). Likely needs to be sub-decomposed into:
- **2a:** survey block-splitter + body-pre-parser; document the pre-AST signal contract; produce ONLY a new internal AST debug/intermediate signal (no behavior change).
- **2b:** wire the signal so `<NAME> = RHS` no longer collapses to `html-fragment` text; produce the v0.next-shape AST nodes (still `reactive-decl` kind pre-rename).
- **2c:** smoke tests confirming AST shape (the deceptive-success-pattern anti-tests).

If Step 2 sub-decomposition is needed at dispatch time, the agent can surface that and we re-plan. Per S60 precedent: doctrine is correct to halt-and-surface when the pre-brief turns out to be wrong scale.

After Step 2 lands, dispatch Step 3 (rename). Then Steps 4-7 in parallel-ish sequence (4 must land before 5, 6, 7 to anchor the field semantics).

## §7 Test invariant strengthening (per audit §G.1)

Every Step's DoD includes BOTH:
1. `bun run test` green at expected count.
2. **AST-shape assertions** for every v0.next-form fixture: assert that the AST contains `kind: "state-decl"` with the correct `shape` / `isConst` / `validators` / etc., AND that **NO `html-fragment` node contains the source text** (the deceptive-success-pattern anti-test).

Sample AST-shape test pattern:

```js
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

function parse(src) {
  const bs = splitBlocks("test.scrml", src);
  return buildAST(bs);
}

function findKind(ast, kind) {
  const out = [];
  function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.kind === kind) out.push(n);
    for (const k of Object.keys(n)) walk(n[k]);
  }
  walk(ast);
  return out;
}

function assertNoHtmlFragmentMatching(ast, regex) {
  const fragments = findKind(ast, "html-fragment");
  for (const f of fragments) {
    expect(f.content || "").not.toMatch(regex);
  }
}

test("Shape 1 plain: <count> = 0 produces state-decl, not html-fragment", () => {
  const { ast } = parse(`<program>\${<count> = 0}</program>`);
  const decls = findKind(ast, "state-decl");
  expect(decls.length).toBe(1);
  expect(decls[0].name).toBe("count");
  expect(decls[0].shape).toBe("plain");
  expect(decls[0].isConst).toBe(false);
  expect(decls[0].structuralForm).toBe(true);
  // The deceptive-success anti-test:
  assertNoHtmlFragmentMatching(ast, /< count >/);
});
```

Every Step 4-11 sub-agent prompt must include this test pattern explicitly.

---

## §8 Cross-references

- **PARSER-AUDIT (companion):** `docs/changes/v0next-audit/PARSER-AUDIT-2026-05-05.md`
- **SCOPE-MAP (master inventory):** `docs/changes/v0next-inventory/SCOPE-MAP-2026-05-05.md`
- **DISPATCH-A1A-BRIEF:** `docs/changes/phase-a1a-lex-parse/DISPATCH-A1A-BRIEF.md` (rev3 — needs corresponding rev4 update post-this-rewrite)
- **PA-SCRML-PRIMER:** `docs/PA-SCRML-PRIMER.md`
- **SPEC engineering target:** `compiler/SPEC.md` §1 / §3 / §6 / §11 / §34
- **L21 lock landed S59:** SPEC.md §6.6.18 + §34 entry
- **Master-list dashboard:** `master-list.md` §0
- **Step 1 progress:** `docs/changes/phase-a1a-lex-parse/progress.md` (Step 1 section)
- **Step 8 progress:** `docs/changes/phase-a1a-step-8-reserved-ident/progress.md`

---

## §9 Tags

#dispatch-a1a #ast-contracts #task-decomposition #phase-a1 #context-discipline #rev-2 #v0next #state-decl-rename
