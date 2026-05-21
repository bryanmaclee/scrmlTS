# M5-swap Unit R4 — SPEC §34 reconciliation plan

**Status:** PLAN PHASE — STOP-GATE artifact. NO §34 catalog rows written, NO
native-parser codes renamed. Awaiting PA ratification of the family-level
approach before execution.
**Date:** 2026-05-21 (S117).
**Authority:** `BRIEF-R4-s34-reconciliation.md` ·
`compiler/native-parser/M5-SWAP-residual-decomposition.md` Unit R4 · DD #27.
**Worktree:** `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-abd4a4f8b521eb4de`

---

## 1. Why R4 exists

The native parser fires diagnostic codes that are not in SPEC §34. Today this is
harmless — the native parser is observability-only (`--parser=scrml-native`
shadow, `I-PARSER-NATIVE-SHADOW`); the codes never reach adopters. **The moment
R5 swaps the pipeline, every routed code with no §34 row becomes a spec-vs-impl
divergence** (SPEC §34 is normative, pa.md Rule 4). R4 closes the gap *before*
R5 lands.

---

## 2. Enumeration — the authoritative live code set

Source: `grep -rohE '"E-[A-Z0-9-]+"' compiler/native-parser/*.js` (the `.js`
tier is the executed tier; `.scrml` is the canonical mirror — see §6 guard).

### 2.1 Already in SPEC §34 — NO action needed (7 codes)

| Code | §34 line | Native-parser fire site | Semantic match? |
|---|---|---|---|
| `E-ASYNC-NOT-IN-SCRML` | 15265 | `parse-expr.js`, `parse-stmt.js` | Exact — §34 row explicitly names the native parser. |
| `E-AWAIT-NOT-IN-SCRML` | 15266 | `parse-expr.js` | Exact. |
| `E-FOR-AWAIT-NOT-IN-SCRML` | 15267 | `parse-stmt.js` | Exact. |
| `E-UNQUOTED-DISPLAY-TEXT` | §4.18.7 / §34 (S111 row) | `display-text-literal.js` | Exact. |
| `E-CTX-001` | 15103 | `parse-seam.js`, `display-text-literal.js` | Consistent — "unterminated context / unclosed logic-escape body". |
| `E-CTX-003` | 15105 | `tag-frame.js` | Consistent — "unclosed context at EOF / before outer closer". |
| `E-MARKUP-002` | 15153 | `tag-frame.js` | Consistent — "explicit closer does not match open tag name". |
| `E-PARSE-001` | 15321 | `display-text-literal.js` | Consistent — "parse error: unexpected token in block structure" generalizes to the malformed-escape fire. |

`E-PARSE-001` is listed in the brief's "already in §34" — confirmed. The brief
counted 7 already-present; the actual list above is 8 (the brief's three named
exemplars plus `E-CTX-001`/`E-CTX-003`/`E-MARKUP-002`/`E-PARSE-001`). No
divergence — the brief's "~66 not in §34" is the residual after these.

### 2.2 NOT in SPEC §34 — require reconciliation (66 codes)

- **`E-EXPR-*` family — 30 codes** (`parse-expr.js`).
- **`E-STMT-*` family — 35 codes** (`parse-stmt.js`).
- **`E-MARKUP-VALUE-UNCLOSED` — 1 code** (`parse-expr.js`, markup-as-value path).

Total **66**, matching the brief's "~66". (The brief's parenthetical "`E-EXPR-*`
~32 / `E-STMT-*` ~34" was an estimate; the exact dedup'd counts are 30 / 35.)

---

## 3. Per-code classification

Each code is classified into one of:
- **(a) NEW §34 row** — a genuine, distinct, adopter-meaningful parse error.
- **(b) MAP to an existing §34 code** — a finer-grained variant; the native
  parser would emit the canonical code instead.
- **(c) internal/transient** — should not reach adopters; rename or fold.

### 3.1 `E-EXPR-*` family (30 codes)

| Code | Message | Class | Notes |
|---|---|---|---|
| `E-EXPR-UNEXPECTED` | unexpected token in expression position: `<kind>` | a | Core expression-grammar parse error. |
| `E-EXPR-ARROW-EXPECTED` | expected `=>` in arrow function | a | |
| `E-EXPR-PARAM` | expected a parameter name | a | |
| `E-EXPR-PARAM-LIST` | expected `(` to open a parameter list | a | |
| `E-EXPR-FUNCTION-BODY` | expected `{` to open a function body | a | |
| `E-EXPR-UNCLOSED-BLOCK` | expected `}` to close a function body | a | |
| `E-EXPR-UNCLOSED-PAREN` | expected `)` to close a parenthesized expression | a | |
| `E-EXPR-UNCLOSED-BRACE` | expected `}` to close an object literal | a | |
| `E-EXPR-UNCLOSED-BRACKET` | expected `]` to close an array literal | a | |
| `E-EXPR-MEMBER-NAME` | expected a property name after `.` | a | |
| `E-EXPR-OBJECT-KEY` | expected an object-literal property key | a | |
| `E-EXPR-OBJECT-PROP` | malformed object-literal property | a | |
| `E-EXPR-OBJECT-SHORTHAND` | shorthand object property requires an identifier key | a | |
| `E-EXPR-EXPECTED-COLON` | expected `:` in object-literal property | a | |
| `E-EXPR-TERNARY-COLON` | expected `:` in conditional expression | a | |
| `E-EXPR-TEMPLATE-INTERP` | unterminated template interpolation | a | |
| `E-EXPR-TEMPLATE-CHUNK` | expected a template chunk after interpolation | a | |
| `E-EXPR-UNARY-EXPONENT` | unary operator cannot directly precede `**` | a | Matches a JS grammar restriction scrml inherits. |
| `E-EXPR-NULLISH-MIX` | `??` cannot be combined with `&&`/`\|\|` without parens | a | JS grammar restriction scrml inherits. |
| `E-EXPR-YIELD-STAR-NO-ARG` | `yield*` requires an operand | a | Generators are in scrml (S114 — `yield`/`function*` preserved). |
| `E-EXPR-IS-SUFFIX` | expected `not`/`some`/`given`/`.Variant` after `is` | a | scrml-specific `is` operator (§18.17). |
| `E-EXPR-QUALIFIED-VARIANT` | expected `.`/`::` after the enum-type name | a | scrml-specific qualified-variant grammar. |
| `E-EXPR-FAIL-VARIANT` | expected an error-enum variant after `fail` | a | scrml-specific `fail` (§19.3). |
| `E-EXPR-RENDER-NAME` | expected a snippet name after `render` | a | scrml-specific `render` (snippets). |
| `E-EXPR-RENDER-CALL` | expected `(` to open the `render` argument list | a | scrml-specific `render`. |
| `E-EXPR-MATCH-BRACE` | expected `{` to open the match arms | a | scrml-specific `match` (§18). |
| `E-EXPR-MATCH-ARROW` | expected `=>`/`->` in a match arm | a | scrml-specific `match`. |
| `E-EXPR-MATCH-PATTERN` | expected a match arm pattern | a | scrml-specific `match`. |
| `E-EXPR-MATCH-BINDING` | expected a binding name | a | scrml-specific `match`. |
| `E-EXPR-MATCH-IS-PATTERN` | expected a `.Variant` after `is` in a match arm | a | scrml-specific `match`. |

**`E-EXPR-*` verdict: all 30 → class (a).** Every one is a genuine, distinct,
adopter-meaningful parse error at the expression-grammar layer. None is a
finer-grained variant of an existing §34 code (the existing `E-PARSE-001` is a
*block-structure* token error, not an *expression-grammar* error — folding 30
distinct expression diagnostics into one coarse `E-PARSE-001` would be a
diagnostic-quality regression, pa.md Rule 2 "scrml is not a toy"). The
match/render/fail/`is`/qualified-variant subset are scrml-specific constructs
with no JS analogue at all.

### 3.2 `E-STMT-*` family (35 codes)

| Code | Message | Class | Notes |
|---|---|---|---|
| `E-STMT-UNEXPECTED-TOKEN` | unexpected token — no statement begins here | a | Core statement-grammar parse error. |
| `E-STMT-MISSING-SEMICOLON` | expected `;` or a newline to end the statement | a | |
| `E-STMT-UNCLOSED-BLOCK` | expected `}` to close a block statement | a | |
| `E-STMT-STRAY-ELSE` | `else` with no matching `if` | a | |
| `E-STMT-BINDING-NAME` | (binding-name expected) | a | |
| `E-STMT-PATTERN-PROPERTY` | (destructuring pattern property) | a | |
| `E-STMT-PATTERN-COLON` | (destructuring pattern `:`) | a | |
| `E-STMT-UNCLOSED-PATTERN` | (unclosed destructuring pattern) | a | |
| `E-STMT-UNCLOSED-COMPUTED-KEY` | expected `]` to close a computed member name | a | |
| `E-STMT-EXPECT-LPAREN` | expected `(` after `<ctxLabel>` | a | `if`/`while`/`for` head. |
| `E-STMT-EXPECT-RPAREN` | expected `)` to close the `<ctxLabel>` head / `catch` binding | a | |
| `E-STMT-EXPECT-WHILE` | expected `while` after the body of a `do` loop | a | |
| `E-STMT-FOR-NONBINDABLE-LHS` | this property cannot appear in a for-in/of binding LHS | a | |
| `E-STMT-FOR-BINDING-INIT` | a for-in/of binding may not have an initializer | a | |
| `E-STMT-FOR-DECL-COUNT` | a for-in/of declaration must declare exactly one binding | a | |
| `E-STMT-FOR-SEMICOLON` | expected `;` after the `for` init / test clause | a | |
| `E-STMT-RETURN-OUTSIDE-FUNCTION` | `return` outside of a function | a | |
| `E-STMT-FUNCTION-NAME` | expected a name after `function` | a | |
| `E-STMT-FUNCTION-BODY` | expected `{` to open a function body | a | |
| `E-STMT-UNCLOSED-FUNCTION-BODY` | expected `}` to close a function body | a | |
| `E-STMT-MODULE-SOURCE` | expected a module-specifier string | a | `import`/`export` (§21). |
| `E-STMT-EXPECT-FROM` | expected `from` in an import / re-export | a | |
| `E-STMT-EXPECT-AS` | expected `as` in a namespace import | a | |
| `E-STMT-IMPORT-NAME` | expected an imported name / identifier in import binding | a | |
| `E-STMT-UNCLOSED-IMPORT` | expected `}` to close an import clause | a | |
| `E-STMT-EXPORT-NAME` | expected an exported name / after `as` | a | |
| `E-STMT-EXPORT-DECL` | expected a declaration after `export` | a | |
| `E-STMT-UNCLOSED-EXPORT` | expected `}` to close an export clause | a | |
| `E-STMT-CLASS-NAME` | expected a name after `class` | a* | See §3.3 — `class` is not scrml vocabulary. |
| `E-STMT-CLASS-BODY` | expected `{` to open a class body | a* | See §3.3. |
| `E-STMT-UNCLOSED-CLASS-BODY` | expected `}` to close a class body | a* | See §3.3. |
| `E-STMT-CLASS-MEMBER` | expected `(` after a class method head | a* | See §3.3. |
| `E-STMT-CLASS-MEMBER-NAME` | expected a class member name | a* | See §3.3. |
| `E-STMT-TRY-NO-HANDLER` | a `try` needs a `catch` or a `finally` | a* | See §3.3 — `try`/`catch` is not scrml vocabulary. |
| `E-STMT-THROW-NO-ARGUMENT` | `throw` must be followed by an expression | a* | See §3.3 — `throw` is not scrml vocabulary. |

**`E-STMT-*` verdict: 28 → class (a); 7 → class (a*)** (a "with a cross-unit
flag"; see §3.3). No code is a class-(b) finer-grained variant of an existing
§34 row, and no code is class-(c) internal — every one is adopter-visible parse
friction when the native parser is routed.

### 3.3 The `class` / `try` / `throw` cross-unit flag (the (a*) codes)

7 `E-STMT-*` codes parse JS constructs that are **not scrml vocabulary**:

- `class` — scrml has no `class`. `E-CLASS-*` is not a scrml feature.
- `try` / `catch` / `finally` — forbidden vocabulary (pa.md, S88 try/catch
  precedent; scrml's error model is `fail`/`?`/`!`/`<errorBoundary>`, §19).
- `throw` — forbidden vocabulary (scrml uses `fail`, §19.3).

The native parser today **fully parses these as ESTree-shaped statements** and
fires `E-STMT-CLASS-*` / `E-STMT-TRY-NO-HANDLER` / `E-STMT-THROW-NO-ARGUMENT`
**only on a *malformed* such construct** — there is no parse-layer
"`class`/`try`/`throw` is not in scrml" rejection (unlike `async`/`await`,
which DO get an `E-*-NOT-IN-SCRML` rejection).

**This is a genuine divergence** — but it is **NOT R4's to fix**. Whether
`class`/`try`/`throw` statement *kinds* survive the native `Stmt[]` →
`LogicStatement[]` bridge, and whether they earn an `E-CLASS-NOT-IN-SCRML` /
`E-TRY-NOT-IN-SCRML` / `E-THROW-NOT-IN-SCRML` rejection (mirroring
`E-ASYNC-NOT-IN-SCRML`), is **R1's statement-catalog-bridge decision** — R1's
brief explicitly calls out "`Throw` → (scrml has no throw — must reconcile
against the forbidden-vocabulary rule)". R4 reconciles *diagnostic codes*, not
*statement-kind admission*.

**R4's disposition of the 7 (a*) codes:** catalog them as class (a) NEW §34
rows with their current names and current (malformed-construct) fire condition,
**and add a cross-ref note** on each row pointing at the open R1 question. The
codes are correct *as diagnostics* — a malformed `try` IS a parse error. If R1
later decides `try`/`throw`/`class` get a hard parse-layer rejection, those
NEW `E-*-NOT-IN-SCRML` codes are a *separate, additive* §34 amendment in R1's
landing — they do not retro-invalidate the 7 (a*) rows (a malformed `try`
written by an adopter still benefits from the specific message before the
broader rejection fires). **Surfaced to PA as cross-unit item X1 (§7).**

### 3.4 `E-MARKUP-VALUE-UNCLOSED` (1 code)

| Code | Message | Class | Notes |
|---|---|---|---|
| `E-MARKUP-VALUE-UNCLOSED` | markup-as-value never closes: no matching `/>` or `</...>` | a | Distinct from `E-CTX-003` (logic-context unclosed) and `E-MARKUP-002` (closer-name mismatch) — this is a markup-valued expression that never closes. Genuine, distinct, adopter-meaningful. |

**Verdict: class (a) NEW §34 row.** Considered (b)-mapping to `E-CTX-003`
("unclosed context") — rejected: `E-CTX-003` fires in `tag-frame.js` on the
*block-tier* tag-context stack; `E-MARKUP-VALUE-UNCLOSED` fires in
`parse-expr.js` on a markup-as-value *expression*. Different layer, different
recovery, different blame span. Folding them would lose the
expression-position specificity.

### 3.5 Classification summary

| Class | Count | Codes |
|---|---|---|
| Already in §34 — no action | 8 | §2.1 |
| (a) NEW §34 row | 66 | all of `E-EXPR-*` (30) + `E-STMT-*` (35) + `E-MARKUP-VALUE-UNCLOSED` (1) |
| (b) MAP to existing code | 0 | — |
| (c) internal/transient | 0 | — |

**Zero (b), zero (c).** Every native-parser parse-error code is a genuine,
distinct, adopter-meaningful diagnostic. The native parser was authored with a
deliberately fine-grained diagnostic surface — that is a *quality asset*, not a
catalog-bloat liability, and pa.md Rule 2 forbids "ship the smaller surface"
reasoning. None of the 66 is a duplicate or a transient.

---

## 4. Family-level approach recommendation

**The structural SPEC question:** do the 66 codes get 66 individual §34 rows
interleaved into the existing flat table, OR a new §34 sub-section grouping the
native-parser parse-error family, OR a fold into `E-PARSE-*` / `E-SYNTAX-*`?

### Rejected — fold into `E-PARSE-*` / `E-SYNTAX-*`

`E-PARSE-001`/`E-PARSE-002` are *block-structure* errors; `E-SYNTAX-*` is a
grab-bag of unrelated syntax rejections (`lift` placement, `null` literal,
`given` shape). Folding 66 fine-grained expression/statement diagnostics into
2-3 coarse codes destroys the diagnostic quality the native parser was built
for. Rejected on pa.md Rule 2 grounds.

### Rejected — 66 rows interleaved into the flat §34 table

§34 is already a 560-line flat table. Interleaving 66 more rows by rough
code-prefix locality (the table is only loosely sorted) buries the
native-parser parse-error family with no navigational handle. An adopter who
hits `E-EXPR-MATCH-ARROW` has no anchor to discover the sibling
`E-EXPR-MATCH-*` codes.

### RECOMMENDED — a new §34 sub-section: §34.1 "Native-parser parse diagnostics"

Add **one new sub-section** `### 34.1 Native-Parser Parse Diagnostics` at the
end of §34 (before §35), containing the 66 rows as **three grouped sub-tables**:
`E-EXPR-*` (30), `E-STMT-*` (35), and the single `E-MARKUP-VALUE-UNCLOSED`. The
sub-section gets a short normative prologue:

> *These codes are emitted by the native parser
> (`compiler/native-parser/`) — the recursive-descent front-end that replaces
> the legacy block-splitter + Acorn pipeline at the M5 swap. They are
> expression- and statement-grammar parse errors. Each is a hard error;
> severity is carried by the `E-` prefix per the §34 diagnostic-stream
> convention. The `Section` column references the scrml construct whose
> grammar the code guards.*

**Why a sub-section, not flat rows:**
1. **Navigational** — an adopter (or LSP) lands on the whole native-parser
   family at once. The three grouped tables make `E-EXPR-MATCH-*` siblings
   visible together.
2. **Provenance** — the prologue states *which front-end* emits them, so the
   reader is not confused by overlap with `E-PARSE-*` (legacy block-splitter).
3. **M5/M6-aligned** — when M6 deletes the legacy pipeline, §34.1 is already
   the natural home of the surviving parse-diagnostic family; the legacy
   `E-PARSE-001/002` rows can later be cross-ref'd or retired without
   disturbing the 66.
4. **Precedent** — §34 already nests `#### Error Code Summary`-style
   sub-groupings elsewhere in SPEC (e.g. §22.11, §18.15); a `### 34.1` is the
   same shape, just promoted to a numbered sub-section because the family is
   large and tied to a named compiler component.
5. **Low line-shift blast radius** — appending §34.1 at 15660 (before §35)
   shifts every section below by the sub-section's length (~80 lines) but does
   not perturb the existing 560-line flat table or its line anchors within
   §34. The flat table stays byte-stable; only the SPEC-INDEX §34 row
   line-count and the §35+ ranges move.

### `Section` column for the 66 rows

The native-parser codes do not each have a dedicated SPEC prose section. The
`Section` column will reference the **scrml construct the grammar guards**:
- `E-EXPR-MATCH-*` → §18 (pattern matching)
- `E-EXPR-FAIL-VARIANT` → §19.3 (`fail`)
- `E-EXPR-RENDER-*` → §16 / snippets section
- `E-EXPR-IS-SUFFIX` / `E-EXPR-QUALIFIED-VARIANT` → §18.17 / §14.5
- `E-STMT-IMPORT-*` / `E-STMT-EXPORT-*` / `E-STMT-MODULE-SOURCE` → §21
- `E-STMT-FOR-*` → §49 (loops)
- generic expression/statement-grammar codes → §4 (the front-end / block model),
  matching how `E-PARSE-001/002` already cite `§4`.
- the 7 (a*) `class`/`try`/`throw` codes → §19 with the cross-ref note from §3.3.

Exact per-row `Section` assignment is execution-phase work; the recommendation
here is the *column convention*, not the 66 individual cells.

---

## 5. Execution plan (POST-RATIFICATION ONLY — not done in this phase)

Once PA ratifies the §34.1-sub-section approach:

1. **`compiler/SPEC.md`** — insert `### 34.1 Native-Parser Parse Diagnostics`
   before line 15661 (`## 35.`), with the prologue + three grouped sub-tables
   (66 rows). Message text taken verbatim from the native-parser source (this
   doc §3 has the strings).
2. **`compiler/SPEC-INDEX.md`** — update the §34 row: line-count (564 → ~644)
   and summary (add an "S117 +66 — §34.1 native-parser parse diagnostics"
   note); regenerate downstream line ranges via
   `bun run scripts/regen-spec-index.ts`.
3. **Code renames** — **NONE.** Classification produced zero (b)-class codes,
   so no native-parser code is renamed and no `.scrml` mirror is touched.
   The `.scrml` canonical-mirror predicate guard (brief §6) is therefore
   **not triggered** by R4 — no `.scrml` file is edited. (Stated here so PA
   does not expect a `.scrml`-guard grep result in the execution report.)
4. **Conformance tests** — no code-name updates needed (no renames). If the
   conformance suite has tests asserting "code X is in §34", a new
   parser-conformance test may be added asserting the 66 codes resolve to
   §34.1 rows — execution-phase decision, scoped small.

**Execution touches exactly 2 files: `compiler/SPEC.md` +
`compiler/SPEC-INDEX.md`.** This keeps R4 minimal and (post-ratification) still
nearly file-disjoint from R1/R2/R3 — only the SPEC-INDEX line-range regen could
overlap a sibling SPEC landing, resolved by running `regen-spec-index.ts` last.

---

## 6. STOP-GATE escalation to PA

R4's plan phase is complete. **This dispatch has touched exactly one file** —
this plan doc — keeping R4 file-disjoint from the parallel R1/R2 dispatches
through the gate.

**The decision PA must ratify:** the family-level approach.
**Recommendation: a new `### 34.1` sub-section** ("Native-Parser Parse
Diagnostics") holding all 66 codes as three grouped sub-tables, with a
normative prologue. All 66 codes classify as (a) NEW §34 row — zero (b)-maps,
zero (c)-internal — so the execution phase adds 66 rows and renames **nothing**.
Execution touches only `compiler/SPEC.md` + `compiler/SPEC-INDEX.md`.

**Cross-unit item X1 (also for PA):** the 7 (a*) codes
(`E-STMT-CLASS-*` ×5, `E-STMT-TRY-NO-HANDLER`, `E-STMT-THROW-NO-ARGUMENT`)
expose that the native parser *parses* JS `class`/`try`/`throw` without a
parse-layer "not in scrml" rejection. R4 catalogs them as-is with a cross-ref
note; the *statement-kind admission* question belongs to **R1** (its brief
already flags `Throw`). PA should ensure R1's scope covers whether
`class`/`try`/`throw` earn an `E-*-NOT-IN-SCRML` rejection mirroring
`E-ASYNC-NOT-IN-SCRML`. That would be a separate additive §34 amendment in
R1's landing — it does not retro-invalidate R4's 7 (a*) rows.

**PA re-dispatches R4 via SendMessage** with the ratified approach to execute
the §34 amendment.

---

## 7. Tags

#scrmlts #m5-swap #unit-r4 #s34-reconciliation #native-parser
#spec-amendment #stop-gate #s117
