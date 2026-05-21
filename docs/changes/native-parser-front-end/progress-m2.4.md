# M2.4 progress — JS scrml-extension expression forms

Per-agent progress file (parallel MK2.1 dispatch may run; do NOT share `progress.md`).
Append-only, timestamped.

## 2026-05-20T18:11 — startup + research complete

- Startup verification PASS: worktree `agent-a3f3d6857a42bf077`, merged main → `7c3d898`,
  all 9 predecessor files present, `bun install` + `bun run pretest` clean.
- Read: roadmap §0/§1, S98 DD (D3/D5/D7), charter README, all native-parser predecessor
  `.js` + `.scrml` files, the conformance test file, `preprocessForAcorn` +
  `replaceSqlBlockPlaceholder` + `<#id>` rewrites in `expression-parser.ts`.
- SPEC read in full per Rule 4: §42 (not/is), §32 (~), §10 (lift), §19.3 (fail),
  §18.0/§18.2/§18.5/§18.7/§18.17 (match + is-pattern), §14.4 (`::` alias), §14.9 (render),
  §14.10 (bare-variant inference), §8.1 (`?{}`), §36 (`<#id>`).

### Key SPEC findings (override the brief's paraphrase where they differ)

- **`not` is NOT a prefix operator.** §42.10 + E-TYPE-045: `not (expr)` is a compile ERROR.
  `not` is the absence VALUE atom only. The brief said "`not` value form AND prefix form" —
  SPEC says prefix `not` is illegal. M2.4 parses `not` as a primary atom; the prefix-misuse
  is a typer concern (E-TYPE-045), not a parser concern. SURFACED TO PA.
- `~` is consumed by READING IT as an expression (§32.2 — `let r = ~`, `process(~)`). It is
  a primary ATOM, not an operator. M1 lexes `~` as `BitNot`; `~x` (bitwise-not) is handled
  by `parseUnary`, so a `BitNot` reaching `parsePrimary` is the standalone `~` accumulator.
- `is` is a POSTFIX operator at relational precedence (band 8, like `instanceof`/`in`).
  Forms: `is .Variant` / `is Type.Variant` / `is Type::Variant` (single-variant check,
  §18.17), `is not` / `is some` / `is given` (alias of some) / `is not not` (§42.2.2/2a/4).
- `match expr { arm+ }` JS-style — arm = pattern (`=>`|`->`) body; body = expression OR
  block (`{ stmt* expr? }`). Block bodies → BlockStub (M3 seam). Concise bodies parse.
- `lift expr` / `fail Type::Variant(args)` / `render name(args)` — keyword-headed forms.
  `lift`/`fail` are statement-shaped but modelled as expression nodes (legacy `ast.ts` has
  `LiftExprNode`/`FailExprNode`); use-site validation (E-SYNTAX-001/002, E-ERROR-001) is
  M3/typer territory.
- `::` is a pure alias for `.` (§14.4). `Type::Variant` → Member node; `::Variant` → bare
  variant. M1 lexes `::` as two `Colon` tokens — re-compose at the parse layer.
- `?{sql}` — M1 already lexes `?{...}` to a `SqlBlock` token (`.raw` payload). `<#id>` —
  M1 does NOT recognize `#`; `<#id>` lexes as `LessThan` (skip `#`) `Ident` `GreaterThan`.
  M2.4 re-composes `< # ident >` at the parse layer (consistent with K3/K4). **NEW M1
  lexer gap — K5 candidate — reported to PA.**

### M2 gating — `preprocessForAcorn` workaround classes enumerated

1. `::` → `.` rewrite (silent STRING-token drop failure mode)
2. `preprocessMatchExprs` — `match expr {}` → `__scrml_match__()` placeholder
3. `rewriteIsPredicates` — `is`/`is not`/`is some`/`is given`/`is .Variant`/`is not not`
4. bare-dot `.Variant` → `__scrml_bare_variant_*__` placeholder
5. `not (expr)` / `not @x` → `!`-rewrite
6. `render name()` → `__scrml_render_*__()`
7. `~` → `__scrml_tilde__` placeholder
8. `?{sql}` → `replaceSqlBlockPlaceholder` bracket-matched scan
9. `<#id>` / `<#id>.send()` → `__scrml_input_*__` / `__scrml_worker_*__` rewrite

One regression test per class — proving the native parser handles the form directly.

## Plan

Commit per form. Files: `ast-expr.{scrml,js}` (new ExprKind variants + constructors),
`parse-expr.{scrml,js}` (parse logic), `parser-conformance-expr.test.js` (regression tests).

## 2026-05-20T18:39 — M2.4 COMPLETE

- `ast-expr.{scrml,js}` — 9 new ExprKind variants (NotValue / Tilde / Sql /
  InputStateRef / IsCheck / Match / Render / Lift / Fail) + IsCheckOp +
  MatchArmPatternKind sub-enums + 15 make* constructors. Commit 80d1af0.
- `parse-expr.{scrml,js}` — all 11 forms parse. Commits 939234e (.js) + cc753da (.scrml mirror).
  - `parsePrimary` atoms: `not` (NotValue) / `~` (Tilde — disambiguated from
    bitwise-`~` by source-adjacency of an operand) / `?{sql}` (Sql, M1's
    SqlBlock token) / `<#id>` (InputStateRef — parse-layer recompose of the
    `< # ident >` token run, since M1 skips `#`) / `::Variant` (BareVariant
    via the `::` alias).
  - `parseBinary` — `is` is a postfix predicate wrap on every parseUnary
    operand (`maybeWrapIsCheck`); binds tighter than all binary operators
    (matches the legacy LHS-scan-stops-at-operator behavior). Suffixes:
    `not` / `not not` / `some` / `given` / `.Variant` / `Type.Variant` /
    `Type::Variant`.
  - `parsePostfix` — keyword heads `match` / `render` / `lift` / `fail`.
  - `parsePostfixChain` — `Type::Variant` member alias + `~.member` recompose.
  - `match expr {}` — full JS-style form (§18.2): variant / wildcard / is
    patterns, positional + named payload bindings, `=>`/`->` separators,
    block arm bodies → BlockStub (M3 seam), concise arm bodies parse.
- `parser-conformance-expr.test.js` — +70 tests; file now 578 pass / 0 fail.
  The M2-gating block has 1 regression test per `preprocessForAcorn`
  workaround class (9 classes) proving the native parser handles each form
  directly.

### M3 SEAMS documented (forward-references to M3's statement parser)

- `match` block-form arm bodies (`.A => { ... }`) — captured as `BlockStub`
  via `parseBlockStub` (the M2.3 extension point, reused). M3 re-enters the
  token range. Seam noted in `parseMatchArm` + the file SCOPE header.
- `lift expr` / `fail Type::V` are statement-shaped (use-site validity —
  E-SYNTAX-001/002, E-ERROR-001 — is M3/typer territory). M2.4 parses the
  SURFACE into Lift/Fail expression nodes (matches legacy ast.ts
  LiftExprNode/FailExprNode). Noted in the constructor doc comments.

### Verification

- Full `bun run test`: 16901 pass / 0 fail / 169 skip / 1 todo.
  Baseline `7c3d898`: 16840 / 0 / 169 / 1. Net +61 pass, ZERO new failures.
- Pre-commit gate subset (unit+integration+conformance --bail): 13362 / 0 /
  88 / 1 — identical to baseline.
- parser-conformance-{expr,lexer,markup}: 784 pass / 0 fail.

### NEW K-class issue for PA (roadmap §4.4)

**K5 — M1 lexer does not recognize `#` / `<#`.** `lex-in-code` has no `#`
branch; `#` falls to the "Unknown — skip" path (emits no token). So `<#id>`
lexes as `LessThan Ident GreaterThan` with a one-char span gap. M2.4
re-composes at the parse layer (`isInputStateRefAhead` — span-gap check),
same shape as K3/K4. ALSO surfaced: M1 lexes a standalone `~` as `BitNot`
(M2.4 recomposes to Tilde) and `::` as two `Colon` tokens (M2.4 recomposes).
The standalone-`~` and `::` recompositions overlap K3's "M1 maximal-munch
gap" theme. Canonical fix: M1 lexing `<#`-recognition + a standalone-`~`
Tilde token + a `::` DoubleColon token. Non-blocking (parse-layer
re-composition verified). NOT edited into the roadmap by this dispatch —
reported to PA per the brief.

### Brief-vs-SPEC discrepancy surfaced (per pa.md Rule 4)

The brief listed `not` as "value form AND prefix form". SPEC §42.10 +
E-TYPE-045: `not` in PREFIX position (`not (expr)`) is a compile ERROR — the
boolean negation operator is `!`. M2.4 parses `not` ONLY as the absence-VALUE
atom; there is no `not`-as-prefix-operator parse form. A prefix `not` in the
token stream parses as a NotValue atom followed by a separate expression
(surfacing the misuse to a later stage), rather than the legacy `!`-rewrite.

_(Final commit verified through the full pre-commit gate.)_
