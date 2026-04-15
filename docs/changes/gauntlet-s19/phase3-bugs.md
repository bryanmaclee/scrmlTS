# S19 Gauntlet Phase 3 — Operators & Expressions bug list

**Run:** 120 fixtures, 82 MATCH / 38 non-match. Independent verify via `scripts/gauntlet-s19-verify.mjs`.

## Triage

### A. Missing diagnostics (spec says error, compiler silent) — 15 candidates

Highest user impact — these are the "first thing a JS-minded user tries, silently accepted" class.

| # | Diagnostic | Fixture | Note |
|---|---|---|---|
| A1 | **E-EQ-004** `===` | `phase3-eq-strict-rewrite-017` | JS strict equality. Most-reflexive error users will hit. |
| A2 | **E-EQ-004** `!==` | `phase3-neq-strict-rewrite-018` | Same class. |
| A3 | **E-EQ-002** `== not` rewrite | `phase3-eq-not-rewrite-019` | Rewriter says "use `is not`". |
| A4 | **E-SYNTAX-042** `== null` | `phase3-eq-null-forbidden-020` | `null` is not a scrml token. |
| A5 | **E-SYNTAX-042** `== undefined` | `phase3-eq-undefined-forbidden-021` | Same. |
| A6 | **E-EQ-001** cross-type eq | `phase3-eq-cross-type-022` | `number == string` |
| A7 | **W-EQ-001** `==` on `asIs` | `phase3-eq-asis-warn-104` | Warning. |
| A8 | **E-EQ-003** `==` on function field | `phase3-eq-function-field-119` | Can't equate functions. |
| A9 | **E-TYPE-041** `not` → non-optional | `phase3-not-assign-to-non-optional-026` | §42 assign. |
| A10 | **E-TYPE-045** `not` as prefix negation | `phase3-not-prefix-negation-027` | `not (flag)` not a boolean `!`. |
| A11 | **E-TYPE-062** `is` on non-enum | `phase3-is-non-enum-004` | `name is .Admin` where `name: string`. |
| A12 | **E-TYPE-063** `is` unknown variant | `phase3-is-unknown-variant-005` | `.NotAVariant`. |
| A13 | **E-SYNTAX-043** legacy `(x) =>` | `phase3-old-presence-guard-097` | Old presence-guard syntax removed. |
| A14 | **E-SYNTAX-044** `given` property path | `phase3-given-property-path-096` | `given (a.b)` illegal. |
| A15 | **E-MATCH-012** match-optional no arms | `phase3-match-optional-no-arms-076` | `T \| not` match missing `not`/`else`. |
| A16 | **W-MATCH-002** literal match no wildcard | `phase3-match-literal-no-wildcard-102` | Warning, not error. |
| A17 | **E-ASSIGN-001** decl-in-expr | `phase3-assign-expr-declaration-083` | `let x = 5` in expr position. |
| A18 | Match arm `=>` trap | `phase3-match-arm-arrow-variant-073` | Dev's UNKNOWN — spec ambiguous. |
| A19 | `is none` keyword | `phase3-is-none-bare-008` | Spec silent. Dev flagged UNKNOWN. |

### B. Wrong diagnostic code — 2

| # | Fixture | Expected | Actual |
|---|---|---|---|
| B1 | `phase3-assign-expr-to-const-081` | E-ASSIGN-004 | E-MU-001 |
| B2 | `phase3-assign-expr-undeclared-082` | E-ASSIGN-003 | E-MU-001 |

### C. False-positives — 3

| # | Fixture | Issue |
|---|---|---|
| C1 | `phase3-assign-expr-double-paren-078` | W-ASSIGN-001 fires on `if ((x = 5))` — spec §50.2.3 says double-paren SUPPRESSES. |
| C2 | `phase3-method-call-sql-088` | W-CG-001 codegen warning on valid sql chain. |
| C3 | `phase3-nullish-with-is-some-107` | **E-SYNTAX-050** on `<p>${a} / ${b}</>` — same bug as Phase 1 C5 (tokenizer misreads `/` between `${}` expressions). Broader impact than just file-top-level `@var`. |

### D. Spec ambiguities (silently accepted, need ruling) — 13

All from dev's `expectedCodes: ["UNKNOWN"]` markers. Same pattern as Phase 1 Cat D.

- `@throttled`-style ambiguities
- `is some` short-circuit narrowing (spec §42.2.2a says no narrow, but idiom expects it)
- `< <= > >=` on strings
- String + number arithmetic coercion
- Template literals (`\`${x}\``)
- Empty array literal `[]` (element type?)
- Object shorthand `{ x, y }`
- Spread in call args `f(...args)`
- `==` inside SQL body
- `is none` keyword
- Regex literals
- `?.()` method call form

---

## Fix log — batch 4 (partial)

| # | Status | Note |
|---|---|---|
| C1 W-ASSIGN-001 double-paren | **FIXED** | Depth-scan verifies outer `(...)` wraps the whole expression (not `(a) \|\| (b = 5)`). Suppresses W-ASSIGN-001 when double-paren detected. |
| A14 E-SYNTAX-044 given dotted | **FIXED** | `given u.name` now rejects at parse time in both given parsers. Skip-past-`.ident` keeps parsing going without cascade. |
| A13 E-SYNTAX-043 legacy `(x) =>` | **DEFERRED** | The isOldPresenceGuardPattern check exists at `ast-builder.js:2393` and `:4534` but the block-splitter's statement-boundary detector rejects the pattern earlier with a bare warning — never reaches parseLogicBody. Needs block-splitter work. |
| A17 E-ASSIGN-001 decl-in-expr | **DEFERRED** | Same root cause — `let b = 2` in expression position isn't tokenized into a valid statement shape. Block-splitter concern. |
| A15 E-MATCH-012 / A16 W-MATCH-002 | **DEFERRED** | `checkExhaustiveness` exists at `type-system.ts:3490` but is never called. Wiring requires subject-type inference on the match-stmt case and arm-pattern extraction from `node.body` entries. Non-trivial; own batch. |
| B1 E-ASSIGN-004 (to const) | **DEFERRED** | Needs tilde-decl semantic ruling (`x = 5` where x is const — is this reassignment or auto-decl?). Language-design-reviewer. |
| B2 E-ASSIGN-003 (undeclared) | **DEFERRED** | Same tilde-decl ruling. |

## Priority fix order

1. **User-reflex gap** — E-EQ-004 (`===`/`!==`), E-SYNTAX-042 (`== null`/`undefined`), E-EQ-002 (`== not`). Tier 1: users hit these first.
2. **`is`/`not` type checks** — E-TYPE-041/045/062/063. Core scrml semantic.
3. **C3 tokenizer** — `<p>${a} / ${b}</>` false-positive (also Phase 1 C5). Block-splitter / markup lexer.
4. **C1 W-ASSIGN-001 false-positive** — double-paren suppression.
5. **B1/B2 wrong code** — assign-expr-to-const, undeclared.
6. **Match** — E-MATCH-012, W-MATCH-002, E-SYNTAX-043/044.
7. **Cat D spec ambiguities** — batch for language-design-reviewer.
