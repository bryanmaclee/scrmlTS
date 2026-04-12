# Impact Analysis: expr-ast-phase-2-slice-3

**Change ID:** `expr-ast-phase-2-slice-3`
**Tier:** T3 (touches a parser primitive consumed by every declaration form;
also unblocks Slice 4 deletion of the Pass-2 string-scan fallback in `type-system.ts`)
**Status:** ANALYSIS ONLY — no code changes in this dispatch.
**Branch:** `changes/expr-ast-phase-2-slice-3`
**Base:** main @ 753ecbb (Phase 2 Slice 2 merged + ast-builder gap closure)

---

## 1. Problem restatement

`collectExpr()` in `compiler/src/ast-builder.js` over-collects across newlines when the
RHS of a declaration is a **single value-producing token** (a string literal, numeric
literal, true/false, etc.). For input

```scrml
lin x = "hello"
use(x)
```

the parser emits ONE `lin-decl` whose `init` field is the string `"hello"\nuse(x)`,
fusing two distinct source statements into a single AST node. Acorn's `parseExpression`
on that string only consumes the first sub-expression, so `initExpr` becomes
`LitExpr("hello")` and the structured ExprNode tree never sees the `use(x)` reference.
Slice 2's Pass-2 fallback in `scanNodeExprNodesForLin` (`type-system.ts:4010-4039`) was
introduced specifically to recover the missing identifiers via a parseStatements-based
string scan. Pass 2 is documented as a staging pattern, not a permanent fix.

### Call site map (every site that feeds `collectExpr` a declaration RHS)

`collectExpr()` itself: `compiler/src/ast-builder.js:808-960`.

Declaration call sites that receive a value-producing RHS via `collectExpr()` with no
`stopAt` argument (i.e. all of them are exposed to the over-collection bug):

| Line | Form | Caller code (literal) |
|---|---|---|
| 1236 | `let name = expr` | `const { expr, span } = collectExpr();` (let-decl, with `=`) |
| 1239 | `let name expr` (no `=` form) | `const { expr, span } = collectExpr();` (let-decl, fallback) |
| 1253 | `const @derived = expr` | `const { expr, span } = collectExpr();` (reactive-derived-decl) |
| 1273 | `const name = expr` | `const { expr, span } = collectExpr();` (const-decl) |
| 1297 | `@debounced(N) name = expr` | `const { expr, span } = collectExpr();` (reactive-debounced-decl) |
| 1300 | `@debounced` fallthrough | `const { expr, span } = collectExpr();` (synthesised bare-expr) |
| 1870 | `lin name = expr` | `const { expr } = collectExpr();` (lin-decl) |
| 1886 | `name = expr` (tilde) | `const { expr, span } = collectExpr();` (tilde-decl) |

A second copy of these handlers exists in the meta-context branch (~line 2763–2900 for
`let`, ~3864 for `lin`, ~3891 for `tilde`). They share the same `collectExpr` and
suffer the same bug.

Quoted call site for `lin-decl` (the headline case):

```js
// ast-builder.js:1861
if (tok.kind === "KEYWORD" && tok.text === "lin") {
  const nameTok = peek(1);
  const eqTok = peek(2);
  if (nameTok?.kind === "IDENT" &&
      eqTok?.kind === "PUNCT" && eqTok.text === "=" &&
      peek(3)?.text !== "=") {
    const startTok = consume();          // consume "lin"
    const name = consume().text;         // consume IDENT name
    consume();                           // consume "="
    const { expr } = collectExpr();      // <-- over-collects RHS
    return { id: ++counter.next, kind: "lin-decl", name, init: expr,
             initExpr: safeParseExprToNode(expr, ...), span: ... };
  }
}
```

All eight sites use the **default `collectExpr()` invocation with no `stopAt`** —
none of them post-trim or re-parse to enforce a single-statement RHS. The bug therefore
shows up uniformly across `let`, `const`, `const @`, `lin`, `tilde`, and `@debounced`.

---

## 2. Current stop conditions

`collectExpr` (ast-builder.js:808-960) terminates the collection loop on any of:

1. **`EOF`** (line 821)
2. **`stopAt` text token at depth 0** (line 824) — only used by callers like `for`/`if`
   conditions that pass a `stopAt`. None of the declaration sites do.
3. **`BLOCK_REF` at depth 0 after collecting at least one part** (line 829) — for
   embedded `?{}` / `^{}` / error-effect blocks at statement boundaries.
4. **`;` at depth 0** (line 832) — explicit statement terminator.
5. **`}` at depth 0** (line 836) — closing brace of the enclosing block.
6. **A statement-starting `KEYWORD` at depth 0** (line 843) — `lift`, `function`, `fn`,
   `const`, `let`, `import`, `export`, `use`, `type`, `server`, `for`, `while`, `do`,
   `if`, `return`, `match`, `partial`, `switch`, `try`, `fail`, `transaction`, `throw`,
   `continue`, `break`, `when`, `given` (subject to angle-depth and dot-prefix guards).
7. **`AT_IDENT =` or `IDENT =` (assignment statement boundary)** (lines 853-863) — only
   when the `lastPart` is not a decl keyword and not the literal `=`.
8. **BUG-ASI-NEWLINE guard** (lines 864-893) — newline-as-boundary, value-token to
   statement-token. **This is where the bug lives.** Reproduced verbatim:

```js
if (
  parts.length > 0 &&
  angleDepth === 0 &&
  lastTok !== startTok && // we have actually consumed at least one token
  tok.span.line > lastTok.span.line // current token is on a later line
) {
  const lastKind = lastTok.kind;
  const lastText = lastTok.text;
  // lastTok ends an expression if it's a value-producing token
  const lastEndsValue = (
    lastKind === "IDENT" ||
    lastKind === "NUMBER" ||
    lastKind === "STRING" ||
    (lastKind === "PUNCT" && (lastText === ")" || lastText === "]"))
  );
  // tok starts a new statement if it's an IDENT (function call) or unhandled KEYWORD
  const tokStartsStmt = (
    tok.kind === "IDENT" ||
    (tok.kind === "KEYWORD" && !STMT_KEYWORDS.has(tok.text))
  );
  if (lastEndsValue && tokStartsStmt) break;
}
```

### Why this guard fails for `lin x = "hello"\nuse(x)`

The `lastTok !== startTok` clause is intended to mean "we have consumed at least one
token before applying the newline check." But `peek()` and `consume()` (ast-builder.js:
757-763) both return **the same token object** from the shared `tokens[]` array:

```js
function peek(n = 0) { return i + n < tokens.length ? tokens[i + n] : { kind: "EOF", ... }; }
function consume()   { return i < tokens.length ? tokens[i++] : peek(); }
```

So at the very top of `collectExpr`:

```js
const startTok = peek();   // = tokens[i]
let lastTok = startTok;    // identity-equal to tokens[i]
```

After consuming exactly one token (the STRING `"hello"`), `lastTok = consume()` returns
`tokens[i]` — the same object reference as `startTok`. **Object identity holds.** The
guard `lastTok !== startTok` evaluates to FALSE, the entire newline check is skipped,
and the loop continues consuming `use`, `(`, `x`, `)` from the next line into the same
`parts[]` array. Final `init` string: `"hello"\nuse(x)`.

The guard works correctly for multi-token RHS (e.g. `let variants = reflect(Color).variants`)
because by the time the loop reaches the next-line `emit(...)` token, several tokens
(`reflect`, `(`, `Color`, `)`, `.`, `variants`) have already been consumed and `lastTok`
is no longer object-identical to `startTok`. That is exactly the case the §16 fix in
`meta-eval.test.js:343` was written to cover, and it explains why the bug went undetected
for single-token RHS until lin enforcement made it observable.

In short: **`lastTok !== startTok` is an off-by-one identity check that means "we have
consumed at least TWO tokens," not "at least one."**

---

## 3. Proposed fix

**Minimal change, applied at `collectExpr` itself (not the callers):**

Replace the identity guard with a count-based guard that tracks "have we consumed at
least one token." The simplest correct form is to seed `lastTok = null` instead of
`lastTok = startTok`, and check `lastTok !== null`:

```js
// before
let lastTok = startTok;
// ...
lastTok !== startTok && // we have actually consumed at least one token
// ...

// after
let lastTok = null;
// ...
lastTok !== null && // we have consumed at least one token
// ...
```

This requires three small downstream adjustments inside `collectExpr` because `lastTok`
is also used to compute the returned `span` and the `joinWithNewlines` partLines array
already tolerates `parts.length > 0`:

1. The `span` return at line 958 currently computes `spanOf(startTok, lastTok)` —
   when `parts.length === 0`, lastTok was `startTok`; with the change, that case must
   use `spanOf(startTok, startTok)`. The existing ternary already handles the empty
   case (`parts.length > 0 ? spanOf(startTok, lastTok) : spanOf(startTok, startTok)`),
   so once `lastTok` is non-null whenever `parts.length > 0`, the existing branch is
   correct without modification.
2. The `lastTok.span.line` reference inside the guard must be safe — already gated by
   `lastTok !== null`.
3. Any other `lastTok` reference outside the guard (e.g. line 956 returned `span`)
   must tolerate `lastTok === null` only when `parts.length === 0`, which the existing
   ternary handles.

**Equivalently safe alternative:** keep `lastTok = startTok` and replace the guard with
`parts.length > 0` (which already appears as the FIRST clause of the same `if` — making
the identity check entirely redundant once you realise `parts.length > 0` is the
authoritative "have we consumed something" signal). This is the **minimum diff** form
and is preferred:

```js
// minimum-diff form
if (
  parts.length > 0 &&        // already present, sufficient to mean "consumed >= 1"
  angleDepth === 0 &&
  // (deleted: lastTok !== startTok)
  tok.span.line > lastTok.span.line
) { ... }
```

This is a one-line deletion. `parts.length > 0` is already in the predicate — the
identity check was redundant defence the original author added without realising the
two clauses overlap. Removing the identity check restores the intended semantics.

**Recommended fix: delete the `lastTok !== startTok` clause.** One line removed.
No additional state, no caller changes, no span-handling adjustments.

**Why fix at `collectExpr`, not callers:**

The over-collection is a property of the collector, not of any specific caller. Every
declaration site, every meta-context site, every condition site that calls `collectExpr`
inherits the bug. Patching callers would require a coordinated change across 8+ sites
plus the meta-context duplicates, plus a contract for "what does an RHS-only collectExpr
look like." Patching the collector once is the minimal, complete, symmetric fix.

**Out of scope for the minimal fix (deferred):**

- Tightening `collectExpr` to also break on lone newlines between value tokens that do
  NOT happen to be followed by an IDENT/KEYWORD (e.g. `x = 1\n+ 2` — currently glued,
  arguably should remain glued since the next line begins with an operator). The existing
  guard already handles this correctly via `tokStartsStmt`.
- Rewriting `collectExpr` to a true expression parser. That's a Phase 3+ direction and
  is what the ExprNode migration is incrementally working toward.

---

## 4. Symmetry audit

Each form below was tested by reading the parser branch directly. All call `collectExpr()`
with no `stopAt`, all flow through the same buggy guard, all exhibit the same over-collection.

| Form | Source line | Buggy? | Notes |
|---|---|---|---|
| `let x = "hello"\nuse(x)` | 1236 | **YES** | Identical bug — single STRING RHS, identity guard fails |
| `let x = 42\nuse(x)` | 1236 | **YES** | Single NUMBER RHS, same failure |
| `const x = "hello"\nuse(x)` | 1273 | **YES** | Same as let-decl |
| `const @derived = "x"\nuse(@derived)` | 1253 | **YES** | reactive-derived-decl, same call site |
| `lin x = "hello"\nuse(x)` | 1870 | **YES** | The headline case (Slice 2 Pass-2 motivation) |
| `x = "hello"\nuse(x)` (tilde) | 1886 | **YES** | tilde-decl, same call site |
| `@debounced(300) x = "hello"\nuse(x)` | 1297 | **YES** | reactive-debounced-decl, same call site |
| Meta-context `lin x = ...\n...` | 3870 | **YES** | The meta-branch lin-decl handler shares `collectExpr` |
| Meta-context `let x = ...\n...` | 2763 | **YES** | Same — duplicate handler, same `collectExpr` |
| Meta-context tilde | 3891 | **YES** | Same |

**Multi-token RHS forms (already work correctly):**

- `let variants = reflect(Color).variants\nemit(...)` — works (§16 test in meta-eval).
- `let x = a + b\nuse(x)` — works (4 tokens before newline).
- `let x = arr[0]\nuse(x)` — works (`]` is value-ending and there are 4 tokens).

**Conclusion:** Every declaration form that accepts a value RHS via `collectExpr()` has
the same bug, triggered identically by single-token RHS. The fix is uniform across all
forms by virtue of fixing the collector once. This is a **purely symmetric** failure —
no form is special-cased.

A second observation: forms that pass `stopAt` to `collectExpr` (e.g. `for (... of ...)` at
1522, `if (... ) {` at 1564, `match (...) {` at 1726) are **not** affected by this bug,
because their stop condition fires deterministically on the matching closing token long
before the newline guard becomes relevant.

---

## 5. Ripple surface

### Tests likely to be affected

**A. Tests that *currently pass because of* the over-collection (negative dependencies):**

The Slice 2 Pass-2 fallback exists precisely so these tests pass despite the
over-collection. Once the over-collection is fixed, Pass 1 alone should resolve them.
Pass 2 must be retained until Slice 4.

- `compiler/tests/integration/lin-enforcement-e2e.test.js`
  - **Scenario 1** (line 94): `lin x = "hello"\nconsole.log(x)` — currently relies on
    Pass 2 to find the `x` reference inside the over-collected `init` string. After the
    fix, Pass 1 will see two separate nodes (`lin-decl` and a `bare-expr` containing
    `console.log(x)`), and Pass 1's ExprNode walk will resolve the consume directly.
    **Should keep passing.**
  - **Scenario 2** (line 113): `lin x = "hello"\nconsole.log(x)\nconsole.log(x)` — the
    Slice 2 anomaly report (lines 100-104) explicitly notes that with newlines only,
    `extractIdentifiersExcludingLambdaBodies` deduplicates and E-LIN-002 should NOT
    fire — yet the test currently expects E-LIN-002. There is a contradiction between
    the anomaly note and the test code. After Slice 3, the contradiction resolves: the
    parser will produce three separate nodes (lin-decl, bare-expr, bare-expr), Pass 1
    on each bare-expr will issue separate `consumeLinRef("x", ...)` calls, and the
    cross-node double-consume will fire E-LIN-002 correctly. **Implementation must
    re-run this test under the fix and confirm the expected behaviour.**
  - **Scenario 3-7**: Should all keep passing for the same reason — the parser becomes
    more accurate, Pass 1 has more to walk, and Pass 2 (still present until Slice 4)
    is redundant but harmless.
  - **Exit criterion test** (line 268): `lin x = "hello"\nconsole.log(x)` — same as
    Scenario 1. Should keep passing.

- `compiler/tests/integration/lin-decl-emission.test.js` — touches lin-decl emission;
  must re-verify that the post-fix lin-decl `init` string is just `"hello"` (not the
  fused multi-line string), and that any downstream emit / serializer accepts the
  shorter form.

**B. Tests that *currently pass because of* multi-line-string-collection in declarations
(positive dependencies):**

- `compiler/tests/unit/meta-eval.test.js:343` (`§16 multi-statement body`) — explicitly
  exists to verify the existing ASI guard works for `let variants = reflect(Color).variants
  \nemit(...)`. Multi-token RHS, **not** affected by Slice 3 (the existing guard already
  handles it). Should keep passing unchanged.

**C. Tests that may *legitimately rely on* the buggy multi-line collection:**

I searched for fixtures that intentionally embed value-then-newline-then-identifier in
declaration RHS via `grep -rn 'let .* = ".*"' compiler/tests/unit/`. The hits all use
explicit semicolons or single-line values, so I found **no fixture that legitimately
depends on the over-collection of a single-token RHS.** The closest neighbours are:

- `compiler/tests/unit/inline-function-bodies.test.js` — uses inline `let` declarations
  inside function bodies, single-line.
- `compiler/tests/unit/for-as-expression.test.js` — `for-as-expression` uses a separate
  collector (`parseOneForStmt`), not the bare `collectExpr` path.
- `compiler/tests/unit/stdlib-router.test.js`, `stdlib-auth.test.js` — stdlib smoke
  tests; declaration RHS are single-line.

**D. Sample fixtures (`samples/` and `compiler/tests/conformance/`):**

The grep for `let .* = "` across `samples/` returned ~30 files. Spot-check showed every
hit was either single-line (terminated by `;` or `}` on the same line) or uses an
expression that already contains multiple tokens (`= reflect(Color).variants`, `= a + b`).
None appear to depend on a single-token RHS being fused with the next line.

**E. Self-host smoke (`compiler/tests/integration/self-host-smoke.test.js`):**

This compiles compiler source through the compiler. There are 2 pre-existing failures
documented in the Slice 2 anomaly report. Slice 3 must verify it does not introduce new
failures. The compiler source itself uses semicolons heavily, so I expect no impact, but
this is the highest-uncertainty surface and must be verified by running the test.

### Concrete evidence of the staging contract

Slice 2 anomaly report, lines 240-251 (post-merge addendum):

> Pass 2 intentionally NOT removed
>
> The Pass 2 string-scan fallback in `scanNodeExprNodesForLin` (`type-system.ts`) remains
> in place. A previous follow-up attempt to delete Pass 2 alongside these additions
> regressed 3 e2e tests because of a deferred `collectExpr` over-collection bug — a
> single multi-statement `collectExpr()` emission fuses several statements into one
> `bare-expr.expr` string, and Pass 1 on its `exprNode` only sees the first parseable
> expression. Pass 2 on the raw string still catches the trailing identifiers.
> Retiring Pass 2 requires fixing `collectExpr` first.
>
> Path to Pass 2 deletion
>
> 1. Slice 3 fixes `collectExpr` over-collection so each statement becomes its own node.
> 2. Once Slice 3 lands, Pass 2 becomes provably unnecessary.
> 3. Slice 4 deletes Pass 2 and the `extractIdentifiersExcludingLambdaBodies` helper.

This dispatch is Slice 3 step 1 of 2. Slice 4 is a separate change-id.

---

## 6. Risk classification — T3

### Riskiest scenario

**A real-world fixture that *intentionally* glues a string-typed expression across a
newline into a single declaration RHS — for example, a long multi-line message constant
where the developer relies on the parser to keep collecting after a closing `"`.**

Example shape that would break:

```scrml
let banner = "line 1"
              + " continuation"
              + " more"
```

Would the existing ASI guard catch the `+`-continuation? Yes — `tokStartsStmt` evaluates
to FALSE for `OPERATOR` tokens like `+`, so the guard would NOT break. The over-collection
of the continuation lines is **intentional** and must continue. ✅ Safe.

What if the continuation is on the next line but begins with an identifier?

```scrml
let title = "Result: "
            + count + " items"
```

Here line 2 starts with `+` (still safe), then `count` (IDENT) — but `count` is not on
a "new line relative to lastTok" because lastTok at that point would be `+` (line 2),
and `count` is also on line 2. ✅ Safe.

What about this pathological-but-legal form?

```scrml
let x = "hello"
y = use(x)
```

Here line 1 declares `x`, line 2 is a tilde-decl `y = use(x)`. After the fix, the parser
will correctly emit two nodes (`let-decl x` and `tilde-decl y`). Before the fix it emits
one node with `init = '"hello"\ny = use(x)'`, which Acorn would reject anyway. **The
fix produces strictly better behaviour.** ✅ Safe.

**The genuine risk:** a fixture where the test author *intended* a single-line declaration
but the test source happens to span multiple lines for formatting, e.g.

```scrml
let result =
  fetchData()
```

Here `result` is on line 1, `=` on line 1, then `fetchData()` starts on line 2. With the
fix, the guard will trigger: lastTok would be `=` (PUNCT, NOT lastEndsValue), so the
guard NEVER fires regardless of identity. ✅ Safe (the value-ending check protects this
formatting style).

What about:

```scrml
let result = fetchData()
  .then(parse)
```

Here lastTok is `)` (PUNCT, lastEndsValue=true), tok is `.` (PUNCT, NOT IDENT, NOT
KEYWORD, so tokStartsStmt=false). ✅ Safe — method chaining preserved.

**After this analysis I cannot construct a regression case that the fixed guard would
break that the buggy guard would not also fail on differently.** The fix is strictly
more accurate for the bug case and equivalent for all other cases.

### Detection plan for regressions

1. Run the full test suite (`bun test` from `compiler/`) before and after the fix.
   Diff the failure list. Any new failure is a regression candidate.
2. Run `compiler/tests/integration/lin-enforcement-e2e.test.js` specifically. All 9
   scenarios must pass. Pay special attention to Scenario 2 (the contradiction noted
   above).
3. Compile every file in `samples/` and `samples/compilation-tests/` and diff the JS
   output against the pre-fix baseline. Any change in output is investigated.
4. Run `compiler/tests/integration/self-host-smoke.test.js` and verify the existing 2
   failures are the only failures.
5. Run `compiler/tests/unit/meta-eval.test.js §16` specifically — multi-token RHS ASI.
6. Search for any test that uses the literal pattern `init: '...\\n'` (handcrafted AST
   nodes that bake in the over-collected string) and verify they still represent valid
   parser output post-fix.

### Risk classification rationale

This is T3 because:

- It modifies a parser primitive consumed by **every single declaration form** in scrml
  (let, const, lin, tilde, reactive-derived, debounced, plus all meta-context twins).
- It modifies the contract for what an `expr` field on a decl node may contain (after the
  fix, single-statement only — strictly tighter than before).
- It unblocks Slice 4 deletion of Pass 2, which is a downstream type-system simplification.
- The blast radius reaches every `compileScrml()` call in production.

It is **NOT** higher than T3 because:

- The change is one line (deletion).
- There is no spec change.
- There is no new AST node, no new stage, no new field.
- The fix is provably more accurate (no regression case identified).
- A specialist parser-architecture reviewer is available (`scrml-parser-architecture-reviewer`).

---

## 7. Implementation plan

This is the plan for the **NEXT** dispatch. PA must approve before implementation begins.

### Files that change

1. **`compiler/src/ast-builder.js`** — single one-line deletion in `collectExpr`
   (line 875). Remove the `lastTok !== startTok && // we have actually consumed at least one token`
   clause from the BUG-ASI-NEWLINE guard. The redundant `parts.length > 0` clause
   already enforces "at least one token consumed."
   - **Optionally**: update the inline comment to record what was wrong with the
     identity check (one-line note for future readers).
2. **No changes to `type-system.ts`.** Pass 2 stays in place as a safety net for this
   slice; Slice 4 deletes it.
3. **No changes to `expression-parser.ts`.** `safeParseExprToNode` already does the right
   thing for a single-statement string.

### Tests added

1. **`compiler/tests/unit/collectExpr-newline-boundary.test.js`** — new file targeting
   the parser primitive directly. Cases:
   - `lin x = "hello"\nuse(x)` → two nodes: lin-decl, bare-expr
   - `let x = 42\nuse(x)` → two nodes: let-decl, bare-expr
   - `const x = "y"\nuse(x)` → two nodes: const-decl, bare-expr
   - `tilde: x = "y"\nuse(x)` → two nodes: tilde-decl, bare-expr
   - **Negative case:** `let x = "a"\n+ "b"` → ONE node, init = `"a"\n+ "b"` (operator
     continuation must remain glued).
   - **Negative case:** `let variants = reflect(Color).variants\nemit(...)` (multi-token
     RHS, the §16 case) → two nodes (parser already does this; verify behaviour preserved).
   - **Negative case:** `let result =\n  fetchData()` (decl with newline after `=`) →
     ONE node (lastTok `=` is not value-ending; guard doesn't fire).
   - **Negative case:** `let chain = a\n  .then(b)` (method chain across newline) →
     ONE node (`.` is not statement-starting).
2. **`compiler/tests/integration/lin-enforcement-e2e.test.js`** — re-run all 9 scenarios.
   No new tests needed; Scenario 2 must be re-verified to confirm E-LIN-002 fires via the
   intended cross-node mechanism (not via Pass 2 dedup quirk).

### Tests re-examined

1. `compiler/tests/integration/lin-enforcement-e2e.test.js` — all 9 scenarios.
2. `compiler/tests/integration/lin-decl-emission.test.js` — verify lin-decl `init` string
   is single-statement after fix.
3. `compiler/tests/unit/meta-eval.test.js §16, §16b` — multi-token RHS ASI must still work.
4. `compiler/tests/integration/self-host-smoke.test.js` — same 2 pre-existing failures, no new.
5. `compiler/tests/conformance/tab/conf-TAB-003.test.js` — multi-line attribute list test;
   uses a different collector path (collectBracedBody), should be unaffected, verify.

### Step sequence (for implementation dispatch)

1. Branch `changes/expr-ast-phase-2-slice-3` (already created).
2. Pre-snapshot: capture current `bun test` results, current `samples/` E2E compile
   output. Write to `pre-snapshot.md`. Commit.
3. Apply the one-line deletion in `ast-builder.js:875`. Commit.
4. Add unit test file `collectExpr-newline-boundary.test.js`. Run it against the new
   parser. Commit.
5. Re-run `lin-enforcement-e2e.test.js`. If Scenario 2 still passes (now via cross-node
   E-LIN-002 instead of Pass 2 dedup), commit. If not, investigate before continuing.
6. Re-run full `bun test`. Compare against pre-snapshot. Any new failure is a blocker.
7. Re-run E2E samples compile, diff outputs. Any change is investigated.
8. Run `lint-ghost-patterns.js` against the changed file. (Sanity check — this won't
   trigger anti-pattern lints, but run for completeness.)
9. Write `anomaly-report.md`. Commit.
10. Stop and present to PA for merge approval.

### Slice 4 follow-up (NOT this dispatch)

After Slice 3 merges, Slice 4 deletes the Pass 2 string scan in `type-system.ts:4010-4039`
and the `extractIdentifiersExcludingLambdaBodies` helper in `expression-parser.ts`. Slice 4
is its own change-id (`expr-ast-phase-2-slice-4`).

### Reviewer routing

Per the routing table, this change touches `ast-builder.js` and parser logic, so the
reviewer is **`scrml-parser-architecture-reviewer`**. Dispatch the design review with this
impact analysis attached, before implementation begins.

---

## Tags
#scrmlTS #expr-ast #phase-2 #slice-3 #collectExpr #ast-builder #parser #lin-enforcement #ASI #impact-analysis

## Links
- [Slice 2 anomaly report](../expr-ast-phase-2-slice-2/anomaly-report.md) — explains why Pass 2 exists
- [progress.md](./progress.md)
- [Phase 0 design](../../../../scrml-support/docs/deep-dives/expression-ast-phase-0-design-2026-04-11.md)
- `compiler/src/ast-builder.js:808-960` — collectExpr definition
- `compiler/src/ast-builder.js:864-893` — BUG-ASI-NEWLINE guard (the bug)
- `compiler/src/ast-builder.js:757-763` — peek/consume (proves identity bug)
- `compiler/src/type-system.ts:3942-4040` — scanNodeExprNodesForLin (Pass 1 + Pass 2)
- `compiler/tests/integration/lin-enforcement-e2e.test.js` — primary regression surface
- `compiler/tests/unit/meta-eval.test.js:343` — §16 multi-token ASI test (must not regress)
