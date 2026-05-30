# error.map.md
# project: scrmlts
# updated: 2026-05-30T00:00:00Z  commit: 948d3f2f

scrml's own language error model is values-not-exceptions (SPEC §19.1 — no try/catch, no throw).
The compiler itself surfaces structured CGError objects to the caller; it never throws on bad input.

## Error Class

### CGError  [compiler/src/codegen/errors.ts:11]
code: string; message: string; span: CGSpan | object; severity: 'error' | 'warning' | 'info'
- W-/I- prefix OR severity:warning/info → result.warnings (non-fatal, CLI exits 0)
- All other codes → result.errors (fatal, CLI exits 1)
- Cross-stream helper required when asserting on W-*/I-* codes in tests (see diagnostic-stream-partition memory note)

## Error Code Families (373 distinct codes in compiler source)

| Family | Count | Description |
|--------|-------|-------------|
| E-ATTR-* | ~15 | Attribute validation errors |
| E-AUTH-* | ~8 | Auth graph + role resolution errors |
| E-AUTH-GRAPH-* | 4 | Auth graph structural errors (E-AUTH-GRAPH-001..004) |
| E-BATCH-* | 2 | SQL batch planner errors |
| E-BS-* | 1 | Block-splitter sentinel (E-BS-000) |
| E-CG-* | ~15 | Code generator errors (E-CG-001..015) |
| E-CHANNEL-* | ~10 | Channel declaration errors |
| E-CLOSURE-* | 2 | Closure scope errors |
| E-COMPONENT-* | ~15 | Component definition/usage errors |
| E-CONTRACT-* | 4 | Server-fn contract errors |
| E-CPS-* | 6 | CPS async planner errors (idempotency, multibatch reorder/machine-crossing) |
| E-CTRL-* | 6 | Control flow errors |
| E-CTX-* | 2 | Context errors (E-CTX-001: unclosed block; E-CTX-003: shorthand confusion) |
| E-DERIVED-* | 7 | Derived-value errors (circular-dep, engine-no-initial/rules/write, value-mutate) |
| E-DG-* | 2 | Dependency graph errors |
| E-ENGINE-* | ~20 | Engine declaration errors |
| E-ERRORS-* | 2 | `<errors>` element validation (E-ERRORS-001, E-ERRORS-002) |
| E-EXPR-* | 30 | Native-parser expression grammar codes (§34.1) |
| E-FORMFOR-* | 8 | formFor type validation errors |
| E-HISTORY-* | 1 | Engine history attribute error |
| E-IMPORT-* | 7 | Import resolution errors |
| E-INPUT-* | 5 | Input element errors |
| E-LIFECYCLE-* | ~12 | Lifecycle hook errors |
| E-LIN-* | 2 | Linear-type errors |
| E-MATCH-* | ~6 | Pattern match errors |
| E-META-* | 7 | Meta check/eval errors |
| E-MW-* | ~6 | Middleware errors |
| E-NAME-* | 1 | Name collision with reserved identifier |
| E-PARSEVARIANT-* | ~3 | parseVariant API errors |
| E-PROTECT-* | ~3 | protect= attribute errors |
| E-REPLAY-* | 3 | Engine replay errors |
| E-RESET-* | 1 | Reset target errors |
| E-RI-* | ~3 | Route inference errors |
| E-SQL-* | ~8 | SQL context errors |
| E-STMT-* | 43 | Native-parser statement grammar codes (§34.1) |
| E-SWITCH-FORBIDDEN | 1 | `switch` keyword in scrml source |
| E-SYNTAX-* | ~10 | Syntax errors (E-SYNTAX-042..044: null/undefined in source) |
| E-TEST-* | 6 | Test block errors (E-TEST-001..006) |
| E-TIMEOUT-* | 2 | Engine timeout errors |
| E-TYPE-* | ~20 | Type system errors |
| E-USE-* | ~5 | `use` declaration errors |
| E-VALIDATOR-* | ~5 | Validator circular-dep / inline-dynamic |
| E-WRITE-NOT-IN-LOGIC-CONTEXT | 1 | Write attempt outside logic context |
| W-ASSIGN-* | 1 | Assignment warnings |
| W-ATTR-* | 2 | Attribute warnings |
| W-AUTH-* | 5 | Auth warnings: W-AUTH-001, W-AUTH-LOGIN-MISSING, W-AUTH-PAGE-INFERRED, W-AUTH-RUNTIME-FALLBACK |
| W-AUTH-CONTENT-NOT-GATED | 1 | NEW (GITI-027A) — `<auth role>` gates JS-mount only, NOT served HTML content [auth-graph.ts:627] |
| W-BATCH-* | 1 | SQL batch warnings |
| W-CG-* | ~10 | Code generator warnings (W-CG-001: top-level suppression; chunk warnings) |
| W-DEPRECATED-* | 2 | Deprecation warnings |
| W-EACH-* | 2 | Each/iteration warnings |
| W-ENGINE-* | 2 | Engine warnings |
| W-EQ-* | 1 | Equality warnings |
| W-LIFECYCLE-* | 5 | Lifecycle warnings |
| W-LINT-001..024 | 24 | Ghost-pattern lint warnings [lint-ghost-patterns.js] |
| W-MATCH-* | 5 | Match warnings (W-MATCH-RULE-INERT, W-MATCH-VALUE-UNUSED) |
| W-PROGRAM-* | 4 | Program-level warnings |
| W-PURE-REDUNDANT | 1 | Redundant `pure` modifier |
| W-STDLIB-* | 2 | stdlib shim/compiler-deferred warnings |
| W-TAILWIND-* | 2 | Tailwind class warnings |
| W-TRY-CATCH-IN-SCRML-SOURCE | 1 | try/catch used in scrml source |
| I-ASYNC-USER-SOURCE | 1 | Info: async pattern in user source |
| I-AUTH-REDIRECT-UNRESOLVED | 1 | Info: auth redirect target unresolved |
| I-FN-PROMOTABLE | 1 | Info: function eligible for promotion |
| I-MATCH-PROMOTABLE | 1 | Info: match eligible for engine promotion (§56) |
| I-PARSER-NATIVE-SHADOW | 1 | Info: native parser shadows live-pipeline result |

## Key New Codes This Cycle (since watermark 9ab7aa38)
- W-AUTH-CONTENT-NOT-GATED — GITI-027A; `<auth role="X">` is NOT a content gate; fires once per auth-role site [auth-graph.ts:627]
- W-MATCH-VALUE-UNUSED — S144 Bug Y; unused match discriminant value
- E-MATCH-ARM-SEPARATOR — S144 Bug AA; malformed match arm separator

## Error Handling Patterns
- All compile errors returned as CGError[] in result.errors or result.warnings
- Caller checks result.errors.length to determine if compilation succeeded
- No exceptions thrown for source-level errors; exceptions only for internal compiler bugs
- `compileScrml()` in api.js is the single error-surface boundary

## Global Error Boundaries
No client-level JS error boundaries in the compiler itself.
The emitted scrml app gets `errorBoundary` support via `emit-error-boundary.ts` (§19.6).
errorBoundary compile support: `compiler/src/codegen/emit-error-boundary.ts` (320L) — extracts
fallback markup + per-variant renders; paired with host-JS try/catch backstop (§19.6.8 C-hybrid).

## Tags
#scrmlts #map #error #diagnostics #CGError #compiler

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [schema.map.md](./schema.map.md)
