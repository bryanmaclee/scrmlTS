# Pre-snapshot: fix-fn-expr-member-assign

Worktree HEAD: `8d1e07f docs(s43): wrap — hand-off close, master-list S43 update, changelog S43 entry`

## Test baseline (this worktree, this sandbox)

```
7774 pass
40 skip
132 fail
27952 expect() calls
Ran 7946 tests across 378 files
```

All 132 failures share root cause: ENOENT on `samples/compilation-tests/dist/*.html` /
`*.client.js`. These are pre-baked compilation artifacts that the worktree (and the
intake's reported baseline of `7906 pass / 40 skip / 0 fail`) presumably had pre-built.
They are sandbox/environment failures unrelated to bug-m. Fix verification will
compare pass-count and ensure the **same** 132 failures (and only those) remain after
the fix — no new failures, no regressions.

Sources:
- 132x ENOENT on `samples/compilation-tests/dist/*.html` (browser-conditionals,
  browser-todo, browser-form-state, etc. — all "load pre-baked sample" tests).
- 6 occurrences of ECONNREFUSED in stderr from a network-touching test that still
  passes (no `(fail)` for it).

## Bug repro (current — broken)

Input: `/tmp/fix-fn-expr-member-assign/bug-m.scrml`

Compile output of `setup()` body (worktree HEAD):

```js
function _scrml_setup_4() {
  const ws = new window.WebSocket("ws://localhost:65535");
  ws . onopen =;
  function () {
  _scrml_reactive_set("opened", true);
}
}
```

`bun build` (used in lieu of `node --check`, which the sandbox blocks):

```
error: Unexpected ;
    at /tmp/fix-fn-expr-member-assign/dist/bug-m.client.js:7:16
```

## Trace (root cause)

Trigger is upstream of codegen — in TAB / `collectExpr` (compiler/src/ast-builder.js).

1. `parseOneStatement` enters bare-expr collection at token `ws`.
2. `collectExpr` consumes `ws . onopen =`.
3. Next token is `function` (KEYWORD). `STMT_KEYWORDS.has("function")` is true and
   `parts.length > 0`, so the collector breaks (line 1189). `lastPart === "="`, but
   the existing guard only excludes `lastPart === "."`.
4. The truncated string `"ws . onopen ="` becomes a bare-expr; expression-parser
   marks it `escape-hatch / ParseError`.
5. The next iteration of `parseOneStatement` sees the `function` keyword and (line
   2862-2920) builds a `function-decl` with empty `name`, swallowing the function
   body as a top-level statement.

The codegen layer never sees the assignment as a single AssignmentExpression with a
FunctionExpression RHS — it sees a malformed bare-expr followed by an orphan
function-decl.

## Secondary defect (Bug C — recurrence in AssignmentExpression)

Even if `collectExpr` is fixed to keep the full expression as one bare-expr, the
expression-parser's `esTreeToExprNode` AssignmentExpression branch (line 859-864
of compiler/src/expression-parser.ts) does NOT thread `rawSource` to the recursive
calls for `node.left` and `node.right`. Function-expression children with block
bodies fall back to `escape-hatch` with `raw: ""` (no source slice), which the
emitter then drops.

CallExpression's branch was already patched for this (Bug C, 2026-04-20) at line
940-952 by threading `rawSource`. AssignmentExpression has the same hole.

## Fix scope (T2)

1. **compiler/src/ast-builder.js** — `collectExpr` STMT_KEYWORD guard: when next
   token is `function` or `fn` and `lastPart` is an operator/punctuation that
   places us in expression-RHS context (e.g., `=`, `(`, `,`, `[`, `:`, `=>`, `:>`,
   `?`, `&&`, `||`, `??`, `!`, `+`, `-`, `*`, `/`, `%`, `<`, `>`, `<=`, `>=`,
   `==`, `!=`, `return`, `throw`, `yield`, `await`, `new`), do NOT break.

2. **compiler/src/expression-parser.ts** — `esTreeToExprNode` AssignmentExpression
   branch: thread `rawSource` to both `node.left` and `node.right` recursive calls,
   mirroring the CallExpression / Bug C fix.

3. Regression tests covering: `obj.x = function() {...}`, `obj.x = function() {
   return ... }`, `obj.x = fn() {...}`, multi-statement-fn-body,
   `arr[0] = function() {...}`, return-of-fn-expr, `let x = function() {...}` (sanity).
