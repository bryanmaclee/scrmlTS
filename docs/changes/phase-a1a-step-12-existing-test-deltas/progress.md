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

- [HH:MM] Started — branch `phase-a1a-step-12-existing-test-deltas` created from `1e1ac10`.
- [HH:MM] Phase 1 verification grep complete; survivors documented above.
- [HH:MM] Next: Phase 2 — top-level sample REWRITES (3 files) + cosmetic test description updates.
</content>
</invoke>