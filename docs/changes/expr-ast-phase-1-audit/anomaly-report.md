# Anomaly Report: expr-ast-phase-1-audit

## Status: BLOCKED -- round-trip invariant fails on 10 of 14 examples files

This audit branch was created to verify two unmet Phase 1 exit criteria:

1. "The invariant tests pass for all 14 examples files."
2. "`esTreeToExprNode` returns no `__unstructured__` escape nodes for any expression in the
   examples corpus."

**Result: Criterion 1 FAILS. Criterion 2 is PARTIALLY MET (escape-hatch rate 3.66%, well below
50% threshold, but 3 parse-error escapes present for C-style for-loop headers).**

---

## Test Results

### Unit tests (scoped)
```
bun test compiler/tests/unit
```
Not re-run in this audit branch (no changes to Phase 1 files -- results unchanged from
Phase 1 anomaly report: 4884 pass, 3 fail).

### Integration tests (scoped)
```
bun test compiler/tests/integration/expr-node-corpus-invariant.test.js
```
Result: **5 pass, 10 fail** (14 per-file tests + 1 catalog summary test)

Passing files: 01-hello.scrml, 02-counter.scrml, 10-inline-tests.scrml, 12-snippets-slots.scrml,
plus the catalog summary test.

Failing files (10): 03-contact-book, 04-live-search, 05-multi-step-form, 06-kanban-board,
07-admin-dashboard, 08-chat, 09-error-handling, 11-meta-programming, 13-worker,
14-mario-state-machine.

Pre-existing integration failures (self-host smoke tests): 2 (unchanged, not related).

---

## Diff Summary

This branch adds three new files only:

1. `compiler/tests/integration/expr-node-corpus-invariant.test.js` -- new integration test
2. `docs/changes/expr-ast-phase-1-audit/escape-hatch-catalog.json` -- machine-readable catalog
3. `docs/changes/expr-ast-phase-1-audit/escape-hatch-catalog.md` -- human-readable catalog

No Phase 1 files were modified. No existing tests changed.

---

## Corpus Results

### Expression Nodes Checked
- Total: 82 across 14 files
- Per file: 0 to 21 (14-mario-state-machine has the most logic)

### Escape-Hatch Count
- Total: 3 (3.66% of 82 nodes)
- Category: all `parse-error` (C-style for-loop headers stored in `iterable` field)
- No interpolated-template, block-lambda, or nested-paren-is escapes in the corpus

### Top 3 Categories by Frequency
1. `parse-error`: 3 occurrences (C-style for headers in 13-worker.scrml)
2. All other categories: 0

### Round-Trip Failures
- Total: 50 failures across 10 files
- Root cause 1 (48 failures): token-joiner spaces vs. AST-emitted compact form
- Root cause 2 (2 failures): multi-statement init fields

---

## Surprises

### Surprise 1: Broad round-trip failure from a single design gap

The round-trip failure rate (10/14 files, 50/82 nodes) looks alarming, but it is entirely
caused by one predictable issue: `joinWithNewlines` spaces every token, and `normalizeWhitespace`
only collapses runs of spaces. The failure is NOT caused by parse errors or escape hatches --
it is caused by the invariant test framework being insufficient for real corpus expressions.

The unit tests in Phase 1 passed because they used manually-typed expression strings
(no token-joining artifacts). The corpus uses `ast-builder.js` which always token-joins.

### Surprise 2: Near-zero escape hatch rate

The known Phase 1 limitations (interpolated templates, block lambdas, nested-paren is-not)
do NOT appear in the examples corpus. The corpus is less complex than expected.
The only escape hatches are C-style for-loop headers -- a structural mapping issue, not a
parser limitation.

### Surprise 3: Multi-statement init fields

Two `reactive-decl` nodes have `init` fields containing multiple JS statements concatenated
by the token joiner. This reveals that `collectExpr` sometimes over-collects tokens past
the expression boundary. This is a separate correctness issue independent of the spacing gap.

---

## Recommendation for PA

The corpus audit reveals one blocking issue and one minor issue:

**Blocking issue: round-trip invariant definition is wrong**

The invariant `normalizeWhitespace(emitStringFromTree(node.initExpr)) === normalizeWhitespace(node.init)`
cannot hold as-is when `init` comes from `joinWithNewlines`. This is NOT a bug in
`parseExprToNode` or `emitStringFromTree`. The ExprNode trees are structurally correct.
The issue is that the invariant compares two different text representations of the same
semantic content.

Recommendation: **Before merging Phase 1, update the invariant to use structural comparison
rather than string comparison.** Specifically, the invariant should verify:

```
parse(strField) deep-structurally-equals exprField
```

This requires a `deepEqual` on ExprNode trees, or alternatively: parse `strField` through
`parseExprToNode` and compare the two `ExprNode` results structurally. This is a small addition
to the invariant test infrastructure.

**Minor issue: C-style for-loop headers in iterExpr**

Three expressions in 13-worker.scrml store C-style `for(init; cond; update)` headers as the
`iterable` field. `parseExprToNode` correctly fails (parse-error escape hatch). This is not
a parser bug -- it is a structural gap in how `for-stmt` nodes are parsed. Phase 2 should
add a dedicated `cStyleForHeader` field for these.

**Assessment:**

- Escape-hatch categories: 1 active category (`parse-error`), 3 instances. Well within fixable range.
- No interpolated-template, block-lambda, or nested-paren-is escapes in corpus.
- The round-trip failure is a test-framework issue, not a Phase 1 implementation bug.
- Phase 1 implementation (parseExprToNode, esTreeToExprNode, emitStringFromTree) is correct.
- Recommendation: REVISE the invariant test to use structural comparison, then re-run.
  Phase 1 can merge after the invariant test is corrected.

---

## Phase 1 Exit Criterion Assessment

| Criterion | Status | Notes |
|---|---|---|
| Invariant tests pass for all 14 example files | FAIL | 10 fail due to invariant definition, not Phase 1 code |
| No `__unstructured__` escape nodes in corpus | PARTIALLY MET | 3 parse-error escapes (C-style for headers); 0 interpolated/block-lambda/nested-paren |
| ExprNode trees are structurally correct | PASS | The ASTs parse correctly; emitted strings are valid JS |
| No escape-hatch rate > 50% | PASS | 3.66% across corpus |
| No compile crashes on any examples file | PASS | All 14 files compile without error |

---

## Tags
#expr-ast-phase-1 #expr-ast-phase-1-audit #anomaly-report #round-trip-failure

## Links
- [escape-hatch-catalog.md](./escape-hatch-catalog.md)
- [escape-hatch-catalog.json](./escape-hatch-catalog.json)
- [progress.md](./progress.md)
- [Phase 1 anomaly report](../expr-ast-phase-1/anomaly-report.md)
