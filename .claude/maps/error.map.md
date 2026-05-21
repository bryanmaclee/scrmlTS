# error.map.md
# project: scrmlts
# updated: 2026-05-21T04:30:00-06:00  commit: e613621

This compiler does not `throw` to signal user-facing errors. Each pipeline
stage collects structured *diagnostic* objects (code + message + span +
severity) and returns them. `throw` is reserved for compiler-internal
invariant violations / bugs. The diagnostic *codes* a `.scrml` author sees
(E-*/W-*/I-*) are catalogued in SPEC.md §34 — that catalog is the normative
source, not this map.

## Per-Stage Diagnostic Classes (one per pipeline stage)
All have the same shape: `{ code, message, span, severity }` where
severity ∈ "error" | "warning" | "info". UNCHANGED since commit 78faa65;
re-verified at e613621 (the S113 native-parser arc edited zero compiler/src/ files).

TABError  — compiler/src/ast-builder.js:1232 — Stage 3 (Tokenizer + AST Builder). Extends `Error` (the one diagnostic class that is a real throwable; also used as a collected diagnostic).
PAError   — compiler/src/protect-analyzer.ts:126 — Stage 4 (protect= Analyzer)
RIError   — compiler/src/route-inference.ts:198 — Stage 5 (Route Inferrer)
TSError   — compiler/src/type-system.ts:516 — Stage 6 (Type System)
MetaError     — compiler/src/meta-checker.ts:64 — Stage 6.5 (Meta Check)
MetaEvalError — compiler/src/meta-eval.ts:47 — Stage 6.5 (Meta Eval)
DGError   — compiler/src/dependency-graph.ts:231 — Stage 7 (Dependency Graph)
CGError   — compiler/src/codegen/errors.ts:11 — Stage 8 (Code Generator)
ModuleError — compiler/src/module-resolver.js:33 — Stage 3.1 (Module Resolver)

## Diagnostic Aggregation  [compiler/src/api.js]
Every stage result carries `.errors[]` (and sometimes `.diagnostics[]`).
`api.js` funnels them all through `collectErrors(stageLabel, errors, file)`
at ~20 call sites (one per stage: BS, TAB, MOD, NR, SYM, CE, VP-1/2/3, PA,
RI, TS, MC, ME, DG, BP, AG, RS, CG). The aggregate is then partitioned.

## Diagnostic-Stream Partition  [api.js:1779-1804 — S93 fix]
CRITICAL contract — a single `isNonFatal(e)` predicate splits the stream:

  isNonFatal = code starts with "W-"  OR  code starts with "I-"
               OR  severity === "warning"  OR  severity === "info"

  result.errors   = diagnostics where !isNonFatal  → CLI exits 1
  result.warnings = diagnostics where isNonFatal    → CLI exits 0

Implication for tests: a test asserting on a W-*/I-* code MUST look in
`result.warnings`, not `result.errors`. `result.errors.filter(e => e.code === "W-...")`
silently passes (false negative). Info-level (`I-*` / severity:"info") is
non-fatal since S93 — pre-S93 it fell through to errors and broke
info-only files (07-admin-dashboard, 23-trucking-dispatch).

## scrml-Source Error Handling Constructs (the language, not this codebase)
SPEC §19 defines scrml's *runtime* error model — `fail`, `?` (propagate),
`!` (assert), `errorBoundary`, `renders` clause, the renderable error enum,
implicit per-handler transactions. The compiler *emits* this; these are not
error-handling patterns of the scrmlts repo itself.

## Native-Parser Error Handling  [compiler/native-parser/]
The native-parser front-end models recovery as an `<engine>` — the
`ErrorRecovery` engine (`error-recovery.scrml`, 3 state-children
`.ParsingNormally` / `.AccumulatingSkipped` / `.ReSynchronized`; the DD §D4 P4
canonical positive state example). M3.4 wired statement-level panic-mode
recovery into this engine — accumulate skipped tokens, re-synchronize on `;` /
statement-start keywords / closing braces.

The native parser EMITS diagnostics that target the SPEC §34 catalog (NOT
private codes). Verified at HEAD:

  E-MARKUP-002 — mismatched explicit closer name (tag-frame.js:1131; SPEC §4.4.1)
  E-CTX-001    — unterminated tag / display-text literal / `${...}` interpolation
                 at EOF (tag-frame.js:1179, display-text-literal.js:410/623; SPEC §3.2)
  E-CTX-003    — stray closer with nothing open (tag-frame.js:1117; SPEC §3.2)
  E-UNQUOTED-DISPLAY-TEXT — bare prose in a code-default body that is not valid
                 code (parse-markup.js, display-text-literal.js; SPEC §4.18.7)
  E-PARSE-001 — malformed escape in a display-text literal (per SPEC §4.18.3;
                native-parser implements the 3-escape union; see non-compliance
                report on the §4.18.3 vs §4.18.4 editorial inconsistency)

K7 (M1 lexer prototype-pollution — `JS_KEYWORDS[text]` resolving inherited
Object.prototype names) was FIXED S113 (M3.3) via an own-property guard
(`Object.prototype.hasOwnProperty.call(...)`) in `token.scrml`/.js.

Pre-M3 string / comment / regex scanners TOLERATE EOF / unterminated input and
defer the diagnostic to a later milestone rather than failing — see
native-parser/README.md "M1.4 status". These remain unchanged.

## Dedicated Lint Passes (emit W-*/I-* diagnostics)
compiler/src/lint-ghost-patterns.js — W-LINT-001..015 ghost-pattern detection
compiler/src/lint-i-match-promotable.js — I-MATCH-PROMOTABLE (SPEC §56)
compiler/src/codegen/lint-undefined-interpolation.ts — undefined-interpolation lint
compiler/src/validators/lint-try-catch.ts — try/catch usage lint
compiler/src/validators/lint-async-user-source.ts — async-in-user-source lint
compiler/src/gauntlet-phase1-checks.js, gauntlet-phase3-eq-checks.js — gauntlet lint phases

## Global Error Boundaries
Not applicable — no running application. The compiler's top-level `try`
fallthrough on a thrown internal error is in cli.js / the per-command runners.

## Unhandled Error Risks
`throw new Error(...)` for internal invariants appears across codegen
(emit-machines.ts, emit-reactive-wiring.ts, rewrite.ts, type-encoding.ts),
reachability/outer-fixpoint.ts, meta-checker.ts, and commands/migrate.js.
These surface as raw stack traces if an invariant is violated — that is the
intended "compiler bug" signal, distinct from user-facing diagnostics.

## Tags
#scrmlts #map #error #diagnostics #compiler #lint #native-parser

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [domain.map.md](./domain.map.md)
