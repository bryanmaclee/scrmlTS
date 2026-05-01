# F-SQL-001 — Pre-snapshot

**Worktree:** `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a3a8d6756b5a7af04`
**Branch:** `worktree-agent-a3a8d6756b5a7af04` (rebased onto main `e69ecac`)
**Pre-baseline test:** `8329 pass / 40 skip / 0 fail / 395 files / 29000 expect()` (2026-04-30)
  - Note: a transient first run showed 8328 pass / 2 fail, but second run cleaned to 8329/0 — flake, not signal. Locked second-run as authoritative baseline.
**Pre-baseline gauntlet:** N/A (this dispatch is parser-stage; gauntlet not part of F-SQL-001 acceptance)

**Pre-existing E2E failures (unchanged from main):**
- `examples/23-trucking-dispatch/pages/dispatch/billing.scrml` — fails with `E-SYNTAX-042` (null token, W3.1+W3.2 sweep target — not F-SQL-001 territory). 4 errors, 5 warnings.
- `examples/23-trucking-dispatch/pages/customer/home.scrml` — fails with multiple `E-SYNTAX-042` errors (null tokens). Also emits `[scrml] warning: statement boundary not detected` warnings (← THIS IS F-SQL-001 SYMPTOM).
- `examples/23-trucking-dispatch/pages/customer/invoices.scrml` — fails with E-SYNTAX-042 + same boundary warning.
- `examples/23-trucking-dispatch/pages/dispatch/load-detail.scrml` — fails for similar null-token reasons.

The dispatch-app pages are Plan-B-parked. They demonstrate the F-SQL-001 bug **at the parser warning level** (warnings emitted from `expression-parser.ts:1182`). The compiler proceeds despite the warning, producing potentially invalid output downstream. Per S49 ("if the compiler is happy, the program should be good"), this silent-bad-output → must become a hard error.

## Repro evidence — `/tmp/sql001-trace.js`

Direct call to `parseExpression()` with four `?{}` shapes:

| Case | Input | AST Type | Trailing Content |
|------|-------|----------|------------------|
| 1 | simple `?{}` no interp | `CallExpression` | (none) — works |
| 2 | `?{...${userId}...}.all()` single interp | `undefined` | (none) — parse fail |
| 3 | multiline `?{...${user.id}...IN(...)...}` | `Identifier` (placeholder only) | `"AND status IN ('active', 'paused')\n  LIMIT 5\n\`}.all()"` — silent data loss |
| 4 | `?{...${userId}...}.all()\nconst x = 1` | `undefined` | (none) — parse fail |

## Root cause — single line

`compiler/src/expression-parser.ts:137`:
```js
processed = processed.replace(/\?\{[^}]*\}/g, "__scrml_sql_placeholder__");
```

The regex `\?\{[^}]*\}` is non-greedy in the wrong way for our purpose: `[^}]*` stops at the **first `}`**. Any `?{` SQL template containing a `${...}` interpolation has its inner `}` close the regex prematurely. The `?{` prefix and embedded interpolation get replaced with `__scrml_sql_placeholder__` plus residual SQL text, which then either:
- fails to parse (most cases), or
- parses as the placeholder identifier with the rest treated as "trailing content" (which `parseExprToNode` warns about but does NOT hard-error on).

Identical defective regex on line 169 (`parseStatements`).

The TAB stage (`tokenizer.ts:tokenizeSQL`) and BS stage (`block-splitter.js`) DO handle `?{}` correctly with proper brace-depth tracking. The bug is **isolated to the regex preprocessing in `expression-parser.ts`**.

## Fix shape — defaulting to (C)

Per dispatch directive:
- **(A) ergonomic fix**: replace the regex with a proper bracket-matched scan that consumes `?{...}` regardless of inner `${}` interpolation. This makes the common dispatch-app patterns parse correctly.
- **(B) hard-error fix**: when the parser cannot match a balanced `?{...}` (e.g., truly unterminated), emit a hard error (`E-SQL-007`) at compile time. Convert the existing soft warning at line 1182 into a hard error.
- **(C) both**: ship (A) AND (B). Default per dispatch.

Implementation will be (C):
1. Replace the regex with a scanner that respects balanced braces (function `replaceSqlBlockPlaceholder()`).
2. Convert the existing trailing-content warning to a hard error with code `E-SQL-007`.

## Files expected to touch
- `compiler/src/expression-parser.ts` — replace regex on lines 137 and 169 with bracket-matched scan; convert warning to error (or relocate gating).
- New error code `E-SQL-007` registered in `compiler/SPEC.md` error catalog.
- `compiler/SPEC.md` §44 — note that `?{...}` may contain template-literal `${}` interpolations; parser must respect bracket nesting.
- `compiler/tests/integration/sql-001-bracket-matched.test.js` (new) — regression fixtures.
- `examples/23-trucking-dispatch/FRICTION.md` — F-SQL-001 RESOLVED.

## Anti-pattern alignment
This is **opposite of S49** validation: silent-bad-output. The fix shape (C) restores S49: either correct compilation OR hard error.
