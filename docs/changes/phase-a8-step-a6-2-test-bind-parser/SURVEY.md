# A8 / A6-2 — `test-bind` parser support — Phase-0 Survey

**Authority chain (Rule 4 priority):**
- SPEC.md §19.12.6 (line 11358) — declaration grammar (NORMATIVE; A6-1 SPEC, S74)
- SPEC.md §19.12.7 (line 11385) — dispatch contract (consumed by A6-3/A6-4, not A6-2)
- SPEC.md §19.12.8 (line 11405) — worked example (informative)
- SPEC.md §47.5 cross-ref (line 18124) — encoded-name surface
- SPEC.md §34 (line 14420-14425) — E-TEST-001..006 catalog rows

**Baseline tests at start (verified):** 10,669 pass / 69 skip / 1 todo / 3 fail. Three pre-existing fails are self-host parity (F-BUILD-002, Bootstrap L3, Self-host tokenizer).

**Worktree:** `/home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-a17b58a67ecc88efc`

---

## Tokenizer behaviour for `test-bind`

`tokenizeLogic` (compiler/src/tokenizer.ts:525) treats identifiers as `[A-Za-z_$][A-Za-z0-9_$]*`. The hyphen in `test-bind` is **not** part of an identifier; bare `-` is not in `MULTI_OPS` (line 780-785) so it falls through to single-char PUNCT (`-`).

**Tokenization of `test-bind fetchUser = expr`:**
```
IDENT("test"), PUNCT("-"), IDENT("bind"), IDENT("fetchUser"), PUNCT("="), <expr tokens>
```

A6-2 must therefore detect the **3-token sequence** `IDENT("test") + PUNCT("-") + IDENT("bind")` at the appropriate parse site. This mirrors how `assert.fails.with` is recognized — sequences of IDENT + PUNCT + IDENT.

(Alternative: register `test-bind` as a multi-char keyword in the tokenizer. **Rejected** — no other scrml keyword contains a hyphen, and the multi-token approach localizes the change to the test-block parser without touching the tokenizer's identifier grammar.)

---

## Existing `~{}` test-block parser

**Entry point:** `compiler/src/ast-builder.js` `parseTestBody(tokens, filePath, span, errors)` at line 7952. Called from `buildBlock("test", ...)` at line 9120.

**Returns:**
```js
{ name: string|null, line: number, tests: TestCase[], before: string[]|null, after: string[]|null }
```
Wrapped into the test-block node:
```js
{ id, kind: "test", testGroup: <above>, span }
```

**IR types:** `compiler/src/codegen/ir.ts` lines 148-176 (TestCase, TestGroup).

**Consumers of `node.kind === "test"`:**
- `compiler/src/codegen/analyze.ts` line 92 — collects testGroups for codegen.

**Current `parseTestBody` body-scope dispatch:** while loop over tokens (line 8036+):
- STRING → group name (first only)
- IDENT "before" → before block
- IDENT "after" → after block
- IDENT "test" + STRING + `{...}` → test case
- IDENT "assert" → top-level assert (gathered into implicit anonymous test case)
- else: skip token (unrecognized)

The "skip token" fallthrough at line 8143 is currently the silent escape for tokens that don't match. Today, `test-bind X = expr` would be silently skipped — `test` token would dispatch to the `test "name" {...}` branch, fail to find a STRING, fail to find `{`, and the body-collection loop would consume tokens unpredictably. **Behavior is undefined-but-non-erroring.** A6-2 fixes this.

---

## AST node decisions

### New IR type: `TestBindDecl`

Add to `compiler/src/codegen/ir.ts`:

```typescript
export interface TestBindDecl {
  /** Bound server-fn identifier (LHS of `=`). */
  identifier: string;
  /** Raw RHS expression source (right of `=`). */
  expression: string;
  /** Source line of the `test` keyword that opens the declaration. */
  line: number;
}
```

Rationale: parallel to `AssertStmt` and `TestCase` shape. RHS held as raw string for now (matches how `AssertStmt.raw`, `TestCase.body[]`, and `before/after[]` already hold raw statement strings — A6-3 typer will re-tokenize/typecheck via the existing logic-expression parser at type-check time, same as those siblings).

### Extend `TestGroup`

Add field `testBinds: TestBindDecl[]` (always present, default `[]` — matches the always-present `tests` array). Avoids breaking existing consumers.

### Parser-level node (return shape from parseTestBody)

`parseTestBody` returns `{ name, line, tests, before, after }`. Extend with `testBinds: TestBindDecl[]`.

The wrapped `kind: "test"` node's `testGroup` field carries the `testBinds` array along with `tests`.

---

## Diagnostic-code decisions

**SPEC §34 catalog rows (lines 14420-14425, normative):**
- E-TEST-001 — assertion failed (runtime)
- E-TEST-002 — unexpected error during execution (runtime)
- E-TEST-003 — timeout exceeded (runtime)
- E-TEST-004 — references variable from outer scope (compile)
- E-TEST-005 — **invalid test structure** (compile) ← matches both A6-2 surfaces
- E-TEST-006 — server-fn call without test-bind in scope (runtime, A6-3/A6-4)

**Drift note (surface to PA):** `compiler/src/codegen/errors.ts` lines 30-48 has comment-only documentation for E-TEST-001..005 that uses **different** meanings ("nested ~{}", "~{} in invalid position", "assert.type unknown", "assert.throws non-callable", "empty test block"). Crucially, none of E-TEST-001..006 are actually fired anywhere in `compiler/src/` (verified via grep). The comments are stale/aspirational. SPEC.md §34 is normative per Rule 4. **A6-2 aligns with SPEC §34**, not the stale comment block. The comment-block drift is a separate cleanup; not in A6-2's scope.

**A6-2 diagnostic mapping:**
1. **Context violation** — `test-bind` token sequence appears outside `~{}` body scope (inside `test "..." {...}` case body, inside `${...}`, etc.) → `E-TEST-005` "invalid test structure"
2. **Duplicate identifier** — second `test-bind` for same name in the same `~{}` block → `E-TEST-005` "invalid test structure"
3. **Malformed `test-bind`** — missing identifier, missing `=`, missing RHS → `E-TEST-005` "invalid test structure"

All three slot under the SPEC §34 catalog row's wording. No new code needed.

**Rationale for not introducing E-TEST-007:** SPEC §19.12.6 does not name a code for these violations, the BRIEF flagged a possible new code as an open question, and §34's E-TEST-005 row is verbatim "invalid test structure" — directly applicable. Introducing E-TEST-007 would require SPEC amendment and would split the diagnostic family unnecessarily.

---

## Test corpus location

Create `compiler/tests/unit/test-bind-parser.test.js` modeled after `match-arrow-alias.test.js`:
- Import `splitBlocks` + `buildAST`
- Helper `parseTestBlock(body)` that wraps `~{ ${body} }` and extracts the test-block node
- Sections: positive parse, multiple binds, duplicate-identifier diagnostic, context-violation diagnostics (4 sub-cases per spec), regression on existing test-block parsing.

Test-delta forecast: ~+10 to +13 tests.

---

## Surface area touched

| File | Change | Why |
|------|--------|-----|
| `compiler/src/codegen/ir.ts` | Add `TestBindDecl` interface; add `testBinds: TestBindDecl[]` to `TestGroup` | New AST kind |
| `compiler/src/ast-builder.js` | Extend `parseTestBody`: recognize `test - bind <ident> = <expr>` token sequence at body scope; collect into `testBinds`; fire E-TEST-005 on duplicate; fire E-TEST-005 inside `test "..." {...}` case body | Parser-extension |
| `compiler/tests/unit/test-bind-parser.test.js` | NEW unit-test file | Coverage |

**Out-of-scope context violations:**
- `test-bind` inside `${...}` outside any `~{}`: this would tokenize at the logic-block parser, not `parseTestBody`. The logic-block parser today does not have a "test-bind" recognizer; the tokens (IDENT("test") PUNCT("-") IDENT("bind") IDENT("fetchUsers") PUNCT("=") ...) would parse as `test - bind = ...` (binary minus, then assignment). The parse will likely fall over with a syntax error from acorn, naturally rejecting the construct. **A6-2 explicitly does NOT add a `test-bind` recognizer to logic-block parsers** — `test-bind` is body-scope-only per SPEC §19.12.6 and any non-test-block context naturally rejects via the existing parser.
- `test-bind` at top-level (outside ANY block): same — tokenizer/parser will reject.
- `test-bind` inside a `test "..." {...}` case body: the case-body collector at `parseTestBody` line 8081-8107 currently lumps any non-`assert` tokens into `caseBody`. We extend this loop to detect the `test - bind` 3-token sequence and fire E-TEST-005 there.

---

## Phase 0 verdict

Scope confirmed. No materially-different scope discovered. No spec amendments required. Diagnostic codes consolidated under existing E-TEST-005 catalog row.

Estimated revised effort: **1.0–1.5h** (parser change is small; tests dominate effort).

**Proceeding to Phase 1.**
