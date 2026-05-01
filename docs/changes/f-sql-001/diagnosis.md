# F-SQL-001 — Root Cause Diagnosis

## Symptom

Per W0b's smoke-test report, dispatch-app pages exercising `?{}` SQL templating with embedded `${}` interpolations emit the parser warning:

```
[scrml] warning: statement boundary not detected — trailing content would be silently dropped: "..."
```

The compiler proceeds, producing potentially invalid downstream output. This is **opposite of S49** ("if the compiler is happy, the program should be good"). The dispatch directive flagged this as a P0 silent-failure to convert into a hard error.

## Root cause — single regex on a single line

`compiler/src/expression-parser.ts:137`:

```ts
processed = processed.replace(/\?\{[^}]*\}/g, "__scrml_sql_placeholder__");
```

Identical defective regex on `compiler/src/expression-parser.ts:169` (inside `parseStatements`):

```ts
processed = processed.replace(/\?\{[^}]*\}/g, "__scrml_sql_placeholder__");
```

### Why the regex is wrong

The regex `\?\{[^}]*\}` consumes:
- literal `?`
- literal `{`
- any sequence of non-`}` characters
- literal `}`

For a SQL template that contains a `${...}` interpolation:
```
?{`SELECT * FROM users WHERE id = ${userId}`}.all()
```
…the regex stops at the **first `}`** — which is the `}` closing `${userId}`, not the `}` closing the SQL block. The match is:
```
?{`SELECT * FROM users WHERE id = ${userId}
```
…replaced with `__scrml_sql_placeholder__`, leaving a residual:
```
__scrml_sql_placeholder__`}.all()
```
…which is invalid JS (a backtick where acorn expects an operator) → acorn parse fails → `parseExprToNode` returns an `escape-hatch` node.

Worse, in the multi-line case (Case 3 from the trace):
```
?{`
  SELECT * WHERE user_id = ${user.id}
    AND status IN ('a', 'b')
  LIMIT 5
`}.all()
```
acorn's `parseExpressionAt` succeeds on the first valid expression — the placeholder `Identifier` — and the rest (`'AND status...LIMIT 5\`}.all()'`) becomes "trailing content" that the existing soft warning at line 1182 reports. The compiler proceeds.

### Repro evidence

`/tmp/sql001-trace.js` (worktree-local):

| Case | Shape | AST | Trailing |
|------|-------|-----|----------|
| 1 | `?{\`SELECT * FROM users\`}.all()` | `CallExpression` | none — works |
| 2 | `?{\`...${userId}\`}.all()` | `undefined` (parse fail → escape-hatch) | none |
| 3 | multiline `?{\`...${user.id}...\`}.all()` | `Identifier` (just the placeholder) | `"AND status IN..."` (silent data loss) |
| 4 | `?{\`...${userId}\`}.all()` + newline + statement | `undefined` | none |

## Why TAB and BS are unaffected

`compiler/src/tokenizer.ts:tokenizeSQL` (~line 908) and `compiler/src/block-splitter.js` (~line 302–319) DO handle `?{}` correctly with proper bracket-depth tracking:

```js
// block-splitter.js
if (braceDepth > 0) {
  if (c === "{") braceDepth++;
  else if (c === "}") braceDepth--;
  ...
}
```

This means the BS / TAB path correctly walks `?{...${...}...}` and produces a well-formed SQL block. The bug is **isolated to the regex preprocessing** in `expression-parser.ts`, which is a **legacy shortcut** that predates the structured walker. It is used at expression-parser entry to make embedded `?{}` invisible to acorn during JS expression parsing — but it does so naively.

## Where `nodeId: -1` comes from

`compiler/src/expression-parser.ts:712`:

```ts
if (name === "__scrml_sql_placeholder__") {
  return { kind: "sql-ref", span, nodeId: -1 } satisfies SqlRefExpr;
}
```

This is **not** the bug — it's a deliberate sentinel. When the expression parser sees the placeholder identifier (after the regex stripped the actual SQL), it emits a `sql-ref` ExprNode with `nodeId: -1` because at this point in parsing the parser does not know which SQLNode in the file this ref belongs to. Codegen later resolves this via various paths (e.g., `emit-server.ts:606` routes through `stmt.sqlNode` when the AST builder attached one).

The `sql-ref:-1` in emitted JS is not a SyntaxError — it's `/* sql-ref:-1 */`, a JS comment. So strictly speaking, even when the placeholder leaks all the way to codegen, the emitted JS is syntactically valid. But it is **semantically wrong** — the SQL call is gone.

The dispatch's reference to `sql-ref:-1` was a slight mis-statement of the actual symptom. The real symptom is:
1. Parser regex incorrectly truncates `?{...${}...}` blocks.
2. Either parsing fails (escape-hatch) or partially succeeds with silent data loss (warning).
3. In the silent-data-loss case, the SQL ref *might* be lost entirely from the AST, and downstream codegen has nothing to emit for that statement.

## Validation principle alignment

Per S49: "if the compiler is happy, the program should be good." The current behavior:
- compiler emits a `console.warn` (not a structured error)
- compiler exits 0
- emitted code may be missing SQL calls or have invalid JS

This is **opposite of S49**. The fix must restore the principle.

## Fix shape (C) — both ergonomic and hard-error

### (A) Ergonomic — replace the regex with a bracket-matched scanner

Both line 137 and line 169 of `expression-parser.ts` need a scanner that:
1. Finds `?{` openings.
2. Walks the body counting `{`/`}` (with template-literal awareness so `${}` is consumed correctly).
3. Replaces the entire `?{...}` (including balanced inner braces) with `__scrml_sql_placeholder__`.

This makes ALL the dispatch-app `?{}` patterns (with interpolation, multiline, JOIN, IN clauses) parse correctly — they produce valid `sql-ref` ExprNodes (with `nodeId: -1` sentinel which downstream codegen handles).

### (B) Hard error — convert silent warning to E-SQL-007

The existing soft warning on `expression-parser.ts:1180–1183`:

```ts
if (estree && trailingContent && trailingContent.includes("\n") && /[a-zA-Z_$@]/.test(trailingContent)) {
  const preview = ...;
  console.warn(`[scrml] warning: statement boundary not detected — trailing content would be silently dropped: ...`);
}
```

…must convert to a hard error. After fix (A), trailing content from `?{}` shapes should not occur — but defensively, ANY case where `parseExpressionAt` produces trailing content with newline + identifier-like residue is a silent-data-loss bug. Hard-error it.

The error code `E-SQL-007` is reserved (existing catalog has E-SQL-001..E-SQL-006). The error must include source location (file + offset) and a clear message about which `?{}` shape failed.

### Implementation plan

1. Add a small helper `replaceSqlBlockPlaceholder(input: string): string` in `expression-parser.ts` that does proper bracket-matched scanning (template-literal-aware).
2. Replace both regex calls (lines 137, 169) with this helper.
3. Convert line 1180–1183 warning into a thrown `Error` carrying code `E-SQL-007` + offset + preview. `parseExprToNode` callers (in `ast-builder.js`) need to catch this and surface it as a structured compile error (route into the existing error pipeline).
4. Register `E-SQL-007` in `compiler/SPEC.md` error catalog.
5. Note in SPEC §44 that `?{}` shapes containing `${}` interpolations are first-class supported.

### Test plan

New file `compiler/tests/integration/sql-001-bracket-matched.test.js`:
- Positive control: `?{\`SELECT 1\`}.all()` parses to a `sql-ref` ExprNode (existing behavior preserved).
- Single interpolation: `?{\`...${id}\`}.all()` parses to `sql-ref` (was broken before, now works).
- Multi-clause WHERE + IN list: dispatch-app pattern parses to `sql-ref`.
- LEFT JOIN + multi-line: dispatch-app `recentInvoices` pattern parses to `sql-ref`.
- Truly unterminated `?{` (no matching `}`): hard-errors with E-SQL-007.
- Existing tests for non-SQL `?{}` shapes continue to pass.

Pre-baseline 8329 pass must hold after fix; new tests add to the count.

## Estimated change size

- `expression-parser.ts`: ~30 line additions (helper) + 2 regex replacements + warning→error conversion (~10 lines).
- `SPEC.md`: 1 row in error catalog + 1 short paragraph in §44.
- `tests/integration/sql-001-bracket-matched.test.js`: new file, ~150 lines.
- Total touched files: 3 source + 1 test + 1 spec + 1 friction = 6 files.

Tier remains T2 — under the T3 threshold (no new AST node types, no new contracts, no new pipeline stages, no spec semantics change).
