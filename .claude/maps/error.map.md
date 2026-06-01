# error.map.md
# project: scrmlts
# updated: 2026-06-01T00:00:00-06:00  commit: 4e1f9492

scrml's own language error model is values-not-exceptions (SPEC §19.1 — no try/catch, no throw).
The compiler itself surfaces structured CGError objects to the caller; it never throws on bad input.

## Error Class

### CGError  [compiler/src/codegen/errors.ts:11]
code: string; message: string; span: CGSpan | object; severity: 'error' | 'warning' | 'info'
- W-/I- prefix OR severity:warning/info → result.warnings (non-fatal, CLI exits 0)
- All other codes → result.errors (fatal, CLI exits 1)
- Cross-stream helper required when asserting on W-*/I-* codes in tests (see diagnostic-stream-partition memory note)

## Error Code Families (374+ distinct codes in compiler source)

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
| E-DECL-NEEDS-INITIALIZER | 1 | NEW (S152) — non-array typed-decl with no RHS; only `T[]` typed-array decls may omit RHS (default `[]` per §6.2 Shape 4) [ast-builder.js:4236] |
| E-DERIVED-* | 7 | Derived-value errors (circular-dep, engine-no-initial/rules/write, value-mutate) |
| E-DG-* | 2 | Dependency graph errors — E-DG-002 false-positive fix: credits lambda-body @var reads + `<match on=@cell>` block-form headers [dependency-graph.ts] |
| E-EACH-ITER-SHAPE | 1 | Each iteration shape errors: missing-or-both `of`/`in` attrs [ast-builder.js] |
| E-ENGINE-* | ~20 | Engine declaration errors (incl. E-ENGINE-010: `given` guard in type-level transitions block) |
| E-ERRORS-* | 2 | `<errors>` element validation (E-ERRORS-001, E-ERRORS-002) |
| E-EXPR-* | 30 | Native-parser expression grammar codes (§34.1) |
| E-FORMFOR-* | 8 | formFor type validation errors |
| E-HISTORY-* | 1 | Engine history attribute error |
| E-IMPORT-* | 7 | Import resolution errors |
| E-INPUT-* | 5 | Input element errors |
| E-LIFECYCLE-* | ~12 | Lifecycle hook errors |
| E-LIN-* | 2 | Linear-type errors |
| E-MATCH-* | ~6 | Pattern match errors (E-MATCH-ARM-SEPARATOR: stray-comma arm separator §18.2) |
| E-META-* | 7 | Meta check/eval errors |
| E-MW-* | ~6 | Middleware errors |
| E-NAME-* | 1 | Name collision with reserved identifier |
| E-PA-* | ~7 | protect-analyzer errors — E-PA-002 false-positive fix: `extractCreateTableStatements` now generic cycle-safe deep-walk; finds CREATE TABLE in `body`/`?{}` under fn-decl bodies + top-level `${}` logic blocks [protect-analyzer.ts] |
| E-PARSEVARIANT-* | ~3 | parseVariant API errors |
| E-REPLAY-* | 3 | Engine replay errors |
| E-RESET-* | 1 | Reset target errors |
| E-RI-* | ~3 | Route inference errors |
| E-SQL-* | ~8 | SQL context errors |
| E-STMT-* | 43 | Native-parser statement grammar codes (§34.1) |
| E-SWITCH-FORBIDDEN | 1 | `switch` keyword in scrml source |
| E-SYNTAX-* | ~10 | Syntax errors (E-SYNTAX-042..044: null/undefined in source) |
| E-TEST-* | 6 | Test block errors (E-TEST-001..006) |
| E-TIMEOUT-* | 2 | Engine timeout errors |
| E-TYPE-* | ~20 | Type system errors (E-TYPE-001 dormancy fix for object-literal lifecycle, S151 C4) |
| E-USE-* | ~5 | `use` declaration errors |
| E-VALIDATOR-* | ~5 | Validator circular-dep / inline-dynamic |
| E-WRITE-NOT-IN-LOGIC-CONTEXT | 1 | Write attempt outside logic context |
| W-ASSIGN-* | 1 | Assignment warnings |
| W-ATTR-* | 2 | Attribute warnings |
| W-AUTH-* | 5 | Auth warnings: W-AUTH-001, W-AUTH-LOGIN-MISSING, W-AUTH-PAGE-INFERRED, W-AUTH-RUNTIME-FALLBACK |
| W-AUTH-CONTENT-NOT-GATED | 1 | `<auth role="X">` gates JS-mount only, NOT served HTML content [auth-graph.ts:627] |
| W-BATCH-* | 1 | SQL batch warnings |
| W-CG-* | ~10 | Code generator warnings (W-CG-001: top-level suppression; chunk warnings) |
| W-DEPRECATED-* | 2 | Deprecation warnings |
| W-EACH-KEY-001 | 1 | Info-level lint: `<each in=@cell>` has no inferable per-item `.id` key [lint-w-each-key.js] |
| W-EACH-PROMOTABLE | 1 | Info-level lint: `${ for (let x of @cell) { lift ... } }` is promotable to `<each>` form [lint-w-each-promotable.js] |
| W-ENGINE-* | 2 | Engine warnings |
| W-EQ-* | 1 | Equality warnings |
| W-LIFECYCLE-* | 5 | Lifecycle warnings |
| W-LINT-001..024 | 24 | Ghost-pattern lint warnings [lint-ghost-patterns.js] |
| W-MATCH-* | 6 | Match warnings — W-MATCH-ARROW-LEGACY (S147): info-level, arm-context-scoped; W-MATCH-RULE-INERT; W-MATCH-VALUE-UNUSED |
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

## Key New / Changed Codes Since Watermark 09f74bee (S148-S152)

- E-DECL-NEEDS-INITIALIZER — S152 §6.2 Shape 4; fires when a non-array typed-cell decl has no RHS initializer; message includes the correct `<name>: T = ...` form as correction hint [ast-builder.js:4236]
- W-EACH-PROMOTABLE — S130 HU-1; info-level; `${ for (let x of @cell) { lift ... } }` is promotable to `<each>` tier-1 form; fired in Stage 6.4c lint pass [lint-w-each-promotable.js:205]
- W-EACH-KEY-001 — S130 HU-1; info-level; `<each in=@cell>` items have no inferable `.id` key; fired in Stage 6.4d lint pass [lint-w-each-key.js:210]

## Fix Notes

### E-TYPE-001 dormancy (S151 C4 / R28-5)
Object-literal lifecycle contexts in `type-system.ts` were missing E-TYPE-001 emission paths.
Fixed in `type-system.ts` — object-literal construction now correctly triggers lifecycle type checks.

### Source-map line-lie (S149-S150)
Prior implementation emitted `0:0` stubs for all mappings (a lying synthetic source map).
S149 (B2): `build-source-map.ts` now uses `srcmap-provenance.ts` sentinel marks injected by
emit functions to record USE-SITE spans. `srcmapMark()` injects `#scrmlmap#` tokens; `buildSourceMap()`
scans them via `findSrcmapMarks()`, resolves to real source positions, and strips marks via
`stripSrcmapMarks()` before output.
S150 (line-lie close): honest-synthetic validation — synthetic mappings validated at resolution
time; map entries that cannot resolve to a real source line are marked synthetic in the output.

### Inline ?{} SQL CPS-split (S152)
`emit-control-flow.ts` — inline `?{}` SQL inside a conditional branch was not being CPS-split;
the branch body lacked the `await _scrml_sql...` wrapping IIFE. Fixed; coupled match-server-emit
path also corrected (match arms containing SQL on the server side).

### `<each>` render-before-cell-init crash (S152 HIGH)
`emit-each.ts` — `emitEachBodyRenderForFile()` emits a render fn that runs synchronously at
module-init. When the source cell is declared in the same file, `_scrml_reactive_set` runs
AFTER the render fn (module-init order). The bare `_scrml_reconcile_list(_mount, undefined, ...)`
threw `TypeError: ...newItems.length`. Fix: guard `if (!_items) { _mount.replaceChildren(); return; }`
before reconcile; `_scrml_effect_static` subscription re-runs the fn once cell-init fires.

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
#scrmlts #map #error #diagnostics #CGError #compiler #W-MATCH-ARROW-LEGACY #E-PA-002 #E-DG-002 #E-DECL-NEEDS-INITIALIZER #W-EACH #source-map #s152

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [schema.map.md](./schema.map.md)
