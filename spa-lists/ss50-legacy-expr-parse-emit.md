# ss50 — legacy expression parse/emit correctness — VERIFY-FIRST

**Fill-note:** two MED expression-level correctness gaps on the LIVE legacy pipeline (Acorn-backed; native parser is FROZEN per the compiler-reimagining RULING). Both produce wrong/truncated JS from a legal expression — one at the PARSE stage, one at the EMIT stage. Clustered by the expression-pipeline ingestion. **VERIFY-FIRST** + **S215 adversarial** (paren/precedence + SQL-position edge shapes).

**Shared ingestion:** the legacy expression pipeline — the expression parser (arrow-body parse / `?{}` capture) + `emit-expr` operator serialization (precedence-paren emission). The sPA needs the expr-parse → emit-expr path for both.

**coreFiles:** the legacy expression parser (`ast-builder.js` / the `?{}`-capture path) · `compiler/src/codegen/emit-expr.ts` (operator serialization + precedence parens). NOT the frozen native parser.

**Brief reminders:** VERIFY-FIRST per gap (compile the real repro + `node --check` the emitted JS — invalid JS is the symptom for both). `node --check` exit-0 is the hard gate. R26 + full `bun run test`; re-baseline within-node parity if fixtures shift. Item 1 **unblocks #12's full fix** (ss47) — coordinate if ss47 is in flight.

## Items

1. **g-arrow-expr-body-sql-parser-truncate** (MED) `[status=landed-on-branch spa/ss50 @ 2fca8075]` **VERIFY-FIRST · gates #12**
   - An expression-body arrow `(x) => ?{…}` truncates the `?{}` at the PARSER (the SQL is destroyed pre-codegen) → #12's full fix is gated on this. Distinct from ss47's codegen half (E-CODEGEN-INVALID-JS): this is the parse-stage twin.
   - Fix = the expression-body arrow parse must capture the full `?{}` form (don't truncate at the arrow boundary). Adversarial: block-body vs expr-body arrow; `?{}` with/without `.run()`/`.all()`; nested.
   - Footprint: expression-parser `?{}`-capture in arrow-expr-body position. Surfaced ss19 (#12-adjacent).

2. **g-unary-of-exponent-arg-no-paren** (MED) `[status=landed-on-branch spa/ss50 @ 4490b96a]` **VERIFY-FIRST**
   - `emitUnary` drops the parens needed around a `**` ARGUMENT (e.g. `-(2 ** 3)` / `(-2) ** 3` precedence) → emitted JS is wrong/`SyntaxError`. Surfaced ss31 (out-of-scope discovery).
   - Fix = `emitUnary` must emit precedence-preserving parens around an exponent operand (JS `**` has special precedence-with-unary rules — `-2 ** 3` is a SyntaxError in JS, so the paren placement is load-bearing). Adversarial: unary-of-exponent, exponent-of-unary, chained, mixed precedence.
   - Footprint: `emit-expr.ts` `emitUnary` / the `**` precedence handling.
