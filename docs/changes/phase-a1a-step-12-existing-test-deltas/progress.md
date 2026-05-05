# Progress: phase-a1a-step-12-existing-test-deltas

**Tier:** T2 (Standard) — bounded test/sample migration; SURVEY pre-staged with Q1+Q2 ratifications eliminates design ambiguity.

**Branch:** `phase-a1a-step-12-existing-test-deltas` (parented from `1e1ac10`).

**Mission:** Migrate first-appearance/decl-form `@x = init` to V5-strict `<x> = init` in samples (top-level + inside-`${...}`). Leave post-decl writes (`@x = newVal`) alone. 0-regression contract.

---

## Phase 1 — Verification (Step 11.5 cleanup completeness)

Phase 1 grep for `reactive-derived-decl` literal:

### compiler/src/ — 11 hits across 11 files

ALL hits are intentional Step 11.5 deprecation memorials/comments:
- `compiler/src/types/ast.ts:573` — `ReactiveDerivedDeclNode` interface retained as `@deprecated` external-consumer artifact. INTENTIONAL.
- All other src hits: `// Phase A1a Step 11.5 — reactive-derived-decl folded into state-decl` documentation comments (component-expander.ts, route-inference.ts, dependency-graph.ts, codegen/*, ast-builder.js, type-system.ts). INTENTIONAL.

### compiler/tests/ — 12 hits across 12 files

Inspection per file:
- `tests/integration/parse-shapes-v0next.test.js` — POSITIVE anti-fold-regression guards (`expect(retired).toEqual([])`). ASSERT absence. INTENTIONAL.
- `tests/unit/tab.test.js` — same anti-regression pattern. INTENTIONAL.
- `tests/integration/expr-node-corpus-invariant.test.js:90` — comment listing kinds. INTENTIONAL.
- `tests/unit/reactive-derived.test.js`, `tests/unit/derived-reactive-markup-wiring.test.js`, `tests/unit/type-encoding-phase2.test.js`, `tests/unit/code-generator.test.js`, `tests/unit/collectexpr-newline-boundary.test.js`, `tests/unit/dependency-graph.test.js`, `tests/self-host/ast.test.js` — all comment memorials. INTENTIONAL.
- `tests/lsp/analysis.test.js:36` — test description string `it("populates analysis.reactiveVars for 'reactive-derived-decl'", ...)`. COSMETIC; describes what the test checks. Currently uses old kind name. UPDATE recommended (low priority).
- `tests/unit/gauntlet-s24/scope-001-logic-expr.test.js:342` — test description string `test("undeclared ident in reactive-derived-decl init → E-SCOPE-001", ...)`. COSMETIC. UPDATE recommended (low priority).

**Phase 1 disposition:** All `reactive-derived-decl` survivors are intentional — Step 11.5 cleanup IS complete in spirit. Two cosmetic test descriptions in `lsp/analysis.test.js` and `gauntlet-s24/scope-001-logic-expr.test.js` use the old kind name in their `it/test` description strings. These are NOT structural — the tests themselves probe `state-decl{shape:"derived"}` post-fold. Will update the description strings as a courtesy in Phase 2.

---

## Baseline test counts

Before Step 12 work:
- Stable run: **8,878 pass / 44 skip / 0 fail / 8,922 tests across 439 files**.
- One run showed 2 ECONNREFUSED browser-test flakes (intermittent — recoverable).

---

## Plan

- [P1] Started — branch `phase-a1a-step-12-existing-test-deltas` created from `1e1ac10`.
- [P1] Phase 1 verification grep complete; survivors documented above.
- [P2] Phase 2 attempted — Top-level Shape 1 rewrite blocked by parser gap (see below).
- [P2] Phase 2 reverted; the 3 top-level samples cannot be mechanically rewritten in Step 12.
- [P3] Next: Phase 3 — inside-`${...}` rewrites (which DO work per Step 11 implementation).

---

## CRITICAL FINDING — Phase 2 parser gap (top-level Shape 1 not implemented)

**Per dispatch §risk-surface "Sample regression" rule, surfaced before continuing.**

### What was attempted

Per SURVEY §3 step 2 + S61 Q2 ratification, rewrite the following 3 top-level decl-form `@x = init`s to V5-strict `<x> = init`:

1. `samples/compilation-tests/test-002-with-logic.scrml`: `@counter = 0` → `<counter> = 0`
2. `samples/compilation-tests/test-009-test-reactive.scrml`: `@value = 42` → `<value> = 42`
3. `samples/compilation-tests/modern-003-full-app.scrml`: `@users = []` → `<users> = []`, `@filter = "all"` → `<filter> = "all"`

### What broke

ALL THREE rewrites compile-fail with **E-CTX-003 (BS stage)**: "Unclosed 'counter' — opened but never closed before end of file."

Root cause: the BS stage (`compiler/src/block-splitter.js`) treats `<count>` (no whitespace after `<`) as an HTML markup tag opener (per SPEC §4.1, lines 1034-1085). The `<count>` opener pushes a markup context that is never closed → E-CTX-003. The `= 0` after the tag does NOT trigger state-decl recognition at top-level. The legacy `@counter = 0` works at top-level because BS treats the `@`-prefixed line as raw text → ast-builder picks it up later.

### Why this is a parser gap, not a Step 12 bug

Every Shape 1 / V5-strict structural test in the codebase places the form inside a `${...}` logic block:

```scrml
<program>${ <count> = 0 }</program>      // EVERY parse-shapes-v0next.test.js Shape 1 case
```

There is **no test, no sample, anywhere**, exercising top-level (file-level outside `${...}`) Shape 1 form. Step 11.0a (decl-form recognizer) and Step 11.0b (sibling separator) both work inside logic blocks. Top-level structural Shape 1 is **documented in SPEC §6.2 as canonical** (lines 1771-1775 show `<count> = 0` at apparent file-top-level), but the parser implementation only honors it inside `${...}`.

This matches BRIEF §4 risk surface: "If the V5-strict form doesn't compile in a context where `@x = init` did, that's a parser gap that surfaces a follow-up task (likely back to A1a Steps 4 / 11.0a or to A1b territory)."

### Disposition for these 3 files

**Step 12 cannot mechanically rewrite these 3 top-level samples.** Options for follow-up:

- **Option F1** — Future A1a Step (a possible Step 11.0d or A1b work): extend BS to recognize top-level `<NAME> = init` as a state-decl block (parallel to existing inside-`${...}` recognition). Maintains zero-restructure migration story.
- **Option F2** — Restructure the 3 samples to wrap state-decls in `<program>${ ... }</program>`. Substantive sample rewrites; arguably out-of-scope for "test-delta cleanup."
- **Option F3** — Leave the 3 top-level `@x = init` legacy forms alone indefinitely; document that file-top-level decls remain on the legacy `@`-form until parser support catches up.

Reverted my 3 attempted edits. Files restored to legacy form.

### Impact on Step 12 scope

- **Phase 2 (top-level rewrites):** 0 of 3 completed. Surfaces follow-up task (P-FUP-1: top-level structural Shape 1 in BS).
- **Phase 3 (inside-`${...}` rewrites):** Still in scope; inside-`${...}` recognition works per Step 11 work and existing test coverage. Proceeding.
- **Phase 4 (anti-html-fragment guard):** Still in scope on Phase 3 rewrites.
- **Effort delta:** Phase 2 abandoned saves time; Phase 3 dynamic classify still needed.


</content>
</invoke>