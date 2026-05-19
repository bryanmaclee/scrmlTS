# error.map.md
# project: scrmlts
# updated: 2026-05-19T14:37:51-06:00  commit: 6616a69

## Error Code System

Errors are structured `CGError` instances (compiler/src/codegen/errors.ts). Runtime errors extend `_ScrmlError` (runtime-template.js). Codes follow the pattern `E-DOMAIN-NNN` (errors), `W-DOMAIN-NNN` (warnings), or `I-DOMAIN-NNN` (info). Authoritative catalog: SPEC.md §34.

## CGError Type  [compiler/src/codegen/errors.ts:11]

```typescript
class CGError {
  code: string
  message: string
  span: CGSpan | object
  severity: 'error' | 'warning' | 'info'   // updated S92: now includes 'info'
}
```

Note: CGError.severity is `'error' | 'warning' | 'info'` (updated S92). Auth-graph and reachability diagnostics carry the same three-way severity through their own `AuthGraphDiagnostic` and `RSError` types (see schema.map.md).

## Runtime Error Classes  [compiler/src/runtime-template.js:1423+]

All extend `_ScrmlError extends Error`.

| Class | When thrown |
|-------|-------------|
| _ScrmlError | Base class; never thrown directly |
| NetworkError | HTTP/network failures from server functions |
| ValidationError | Validator predicate failures |
| SQLError | Database query failures |
| AuthError | Authentication/authorization failures |
| TimeoutError | `<onTimeout>` and `<onIdle>` expiry |
| ParseError | Response parsing failures |
| NotFoundError | 404-equivalent resource absence |
| ConflictError | 409-equivalent resource conflict |

## Compiler Error Code Families (source-confirmed)

| Family | Example Codes | Domain |
|--------|--------------|--------|
| E-ATTR-* | 001, 002, 010, 011, 013 | Attribute validation (UVB/VP) |
| E-AUTH-* | 002, 003, 004, 005 | Auth configuration errors |
| E-BATCH-* | 001, 002 | Batch planner (Stage 7.5) |
| E-BPP-* | 001 | Body pre-parser (compat shim) |
| E-BS-* | 000 | Block splitter (Stage 2); S107: errors now carry `filePath` + `file:line:col` prefix per Bug-3 fix (api.js `collectErrors`) |
| E-CG-* | 001, 002, 003, 006, 010, 014, 015 | Codegen (Stage 8) |
| E-CHANNEL-* | 001, 007, 008 | Channel declaration/usage |
| E-CHANNEL-OUTSIDE-PROGRAM | §38.1 | `<channel>` at file-top in file with `<program>` sibling |
| E-CHANNEL-INSIDE-PAGE | §38.1 | `<channel>` inside `<page>` |
| E-CLOSURE-001 | §40.9.1, §40.9.11 | Fixed-point non-termination; fired by outer-fixpoint.ts when iteration cap reached (A-2.7) |
| E-CLOSURE-002 | §40.9.5, §40.9.11 | App uses `<auth role=...>` variant-referencing gates with no app-scope role enum declared; fired by A-2.5 (Component 4) |
| E-COMPONENT-* | 010–035 | Component expansion/definition |
| E-CONTRACT-* | 001–004 | Pipeline contract violations |
| E-CTRL-* | 001–005, 011 | Control flow errors |
| E-CTX-* | 001–003 | Context violations; E-CTX-001 also fires on unclosed raw-content element (§4.17) |
| E-DEBOUNCED-WITH-DERIVED | §6.13 | Debounced attr on derived cell |
| E-DEBOUNCED-WITH-SERVER | §6.13 | Debounced attr on server-context cell |
| E-DG-* | 001, 002 | Dependency graph (Stage 7) |
| E-ENGINE-* | 001, 003, 004, 005, 010, 013 | Engine declaration/transition |
| E-ENGINE-INVALID-TRANSITION | §51.0.F | Direct write violating rule= contract |
| E-ENGINE-PAYLOAD-ON-UNIT-VARIANT | §51.0.B.1 | Payload binding attrs on a unit variant state-child (SHIPPED S99 compiler wiring) |
| E-ENGINE-PAYLOAD-ARITY-MISMATCH | §51.0.B.1 | Binding count != variant payload field count (SHIPPED S99 compiler wiring) |
| E-ENGINE-PAYLOAD-RESERVED-COLLISION | §51.0.B.1 | Payload binding name shadows reserved state-child attribute {rule, effect, history, internal:rule} (SHIPPED S99 compiler wiring) |
| E-ENGINE-STATE-CHILD-MISSING | §34 | Canonical name for engine-exhaustiveness diagnostic (NOT `E-ENGINE-INCOMPLETE-COVERAGE` — that name was never in §34; Bug 6 S107 retired 2 hallucinated refs in docs/website/pages/ to this canonical name) |
| E-ERROR-* | 008 | Error handling surface |
| E-FORMFOR-TYPE-NOT-STRUCT | §41.14.1 | `<formFor for=...>` is missing `for=`, or `for=` is a quoted string, or references unknown type, or references non-struct type; fire-site: type-system.ts §41.14 pass (S102) |
| E-FORMFOR-SLOT-UNKNOWN | §41.14.4 | Slot name not in struct fields or "submit"; fire-site: type-system.ts §41.14 pass (S102) |
| E-FORMFOR-PICK-INVALID-FIELD | §41.14.5 | `pick=` value not an array-of-strings literal, or names unknown field; fire-site: type-system.ts (S102) |
| E-FORMFOR-OMIT-INVALID-FIELD | §41.14.5 | `omit=` value not an array-of-strings literal, or names unknown field; fire-site: type-system.ts (S102) |
| E-FORMFOR-PICK-OMIT-CONFLICT | §41.14.5 | Both `pick=` AND `omit=` attributes present; fire-site: type-system.ts (S102) |
| E-FORMFOR-ONSUBMIT-SIGNATURE | §41.14.3 | onsubmit= handler arg type mismatch or zero args; fire-site: type-system.ts (S102) |
| E-FORMFOR-ERROR-STRATEGY-INVALID | §41.14.6 | `error-strategy=` value not "per-field", "summary", or "both"; fire-site: type-system.ts (S102) |
| E-FORMFOR-NESTED-STRUCT-NO-SLOT | §41.14.8 | Struct-typed field present with no slot override; fire-site: type-system.ts (S102) |
| E-SCHEMAFOR-TYPE-NOT-STRUCT | §41.15.1 | `schemaFor(X)` arg is missing, quoted, unknown, or non-struct; fire-site: type-system.ts §41.15 pass (S104) |
| E-SCHEMAFOR-INVALID-CALL-CONTEXT | §41.15.1 | `schemaFor(...)` interpolation outside `<schema>` body; fire-site: type-system.ts §41.15 Pass B (S104) |
| E-SCHEMAFOR-PICK-INVALID-FIELD | §41.15.4 | `pick:` arg not array-of-strings literal or names unknown field; fire-site: type-system.ts (S104) |
| E-SCHEMAFOR-OMIT-INVALID-FIELD | §41.15.4 | `omit:` arg not array-of-strings literal or names unknown field; fire-site: type-system.ts (S104) |
| E-SCHEMAFOR-PICK-OMIT-CONFLICT | §41.15.4 | Both `pick:` AND `omit:` present; fire-site: type-system.ts (S104) |
| E-SCHEMAFOR-NESTED-STRUCT-NO-FK-V1 | §41.15.7 | Struct-typed field with no v1.0 FK derivation; fire-site: type-system.ts (S104) |
| E-SCHEMAFOR-VARIANT-PAYLOAD-ENUM-V1 | §41.15.6 | Payload-bearing enum field rejected v1.0 (bare-variant only); fire-site: type-system.ts (S104) |
| E-SCHEMAFOR-NO-MAPPING | §41.15.6 | Struct field type has no shared-core lowering; fire-site: type-system.ts (S104) |
| E-TABLEFOR-TYPE-NOT-STRUCT | §41.16.1 | `<tableFor for=X>` is missing `for=`, or `for=` is a quoted string, or references unknown type, or references non-struct type; fire-site: type-system.ts §41.16 pass (S105) |
| E-TABLEFOR-ROWS-MISSING | §41.16.1 | `<tableFor for=T>` missing `rows=` attribute; fire-site: type-system.ts §41.16 pass (S105) |
| E-TABLEFOR-ROWS-WRONG-TYPE | §41.16.1 | `<tableFor rows=@cell>` cell type is not `T[]` matching `for=T`; fire-site: type-system.ts §41.16 pass (S105) |
| E-TABLEFOR-PICK-INVALID-FIELD | §41.16.5 | `pick:` value not array-of-strings literal or names unknown field; fire-site: type-system.ts (S105) |
| E-TABLEFOR-OMIT-INVALID-FIELD | §41.16.5 | `omit:` value not array-of-strings literal or names unknown field; fire-site: type-system.ts (S105) |
| E-TABLEFOR-PICK-OMIT-CONFLICT | §41.16.5 | Both `pick:` AND `omit:` attributes present; fire-site: type-system.ts (S105) |
| E-TABLEFOR-COLUMN-FIELD-UNKNOWN | §41.16.3 | `<column field="X">` names a field absent from struct or excluded by pick/omit; fire-site: type-system.ts (S105) |
| E-TABLEFOR-NESTED-STRUCT-NO-SLOT | §41.16.6 | Struct-typed field present with no `<column field="X">` slot override; fire-site: type-system.ts (S105) |
| E-TABLEFOR-VARIANT-PAYLOAD-ENUM-V1 | §41.16.6 | Payload-bearing enum field rejected v1.0 (bare-variant only); fire-site: type-system.ts (S105) |
| E-TABLEFOR-NO-DISPLAY-MAPPING | §41.16.6 | Struct field type has no default display lowering AND no slot override; fire-site: type-system.ts (S105) |
| E-TABLEFOR-SORTABLE-REQUIRES-CELL-ROWS | §41.16.7 | `<column sortable>` requires `rows=@cell` to be a reactive cell (not a literal); fire-site: type-system.ts (S105) |
| E-TABLEFOR-NO-PRIMARY-KEY | §41.16.8 | `selectable=@cell` with no `id` field on struct AND no `selectedBy=` attribute; fire-site: type-system.ts (S105) |
| E-TABLEFOR-SELECTABLE-CELL-WRONG-TYPE | §41.16.8 | `selectable=@cell` cell is not `T[]` matching `for=T` (deferred to downstream type-checker per SPEC deviation S105) |
| E-MATCH-NOT-EXHAUSTIVE | §18.0.1 | `<match for=T>` is missing arms for one or more variants of T AND no `<_>` wildcard arm; fire-site: symbol-table.ts SYM PASS 20 (S107) |
| E-MATCH-EFFECT-FORBIDDEN | §18.0.2 | `effect=` attribute declared on any `<match>` arm — effect= is engine-only (§51); fire-site: symbol-table.ts SYM PASS 20 (S107) |
| E-MATCH-ONTRANSITION-FORBIDDEN | §18.0.2 | `<onTransition>` element nested inside any `<match>` arm body — onTransition is engine-only (§51); fire-site: symbol-table.ts SYM PASS 20 (S107) |
| E-MATCH-ON-REQUIRED | §18.0.1 | `<match for=T>` with no `on=` attribute AND no in-scope `<engine for=T>` (no auto-implied subject); NEW §34 row per Q-MB-5; fire-site: symbol-table.ts SYM PASS 20 (S107) |
| E-IMPORT-* | 005, 006, 007 | Import violations |
| E-INPUT-* | 001–005 | §36 input device errors |
| E-LIFT-* | 001 | Concurrent lift detection (DG) |
| E-LOOP-* | 005, 006, 007 | Loop/for-expression errors |
| E-META-EVAL-* | 002 | Meta-eval errors |
| E-MONOTONE-* | (see SPEC §34) | Monotonicity analyzer |
| E-NAME-COLLIDES-STATE | §34 | Name collision with state type |
| E-ONTRANSITION-NO-TARGET | §34 | onTransition has no target engine |
| E-PA-* | 002–007 | Protect analyzer |
| E-PAGE-INVALID-ATTR | §4.15 | `<page>` attribute outside allowed set |
| E-PAGE-ROUTE-ATTR-FORBIDDEN | §4.15 | `route=` specifically forbidden on `<page>` |
| E-PARSE-* | 001, 002 | Parse-time errors |
| E-PARSEVARIANT-* | 001 | Variant parsing failures |
| E-PROG-* | 001–005 | `<program>` attribute/context errors |
| E-PURE-001 | §34 | Canonical name for pure-violation diagnostic (NOT `E-PURE-VIOLATION` — that name was never in §34; Bug 6 S107 retired 1 hallucinated ref in docs/website/pages/ to this canonical name) |
| E-REPLAY-* | 001-RT | Runtime: replay index errors |
| E-REACTIVITY-ATTR-CONFLICT | §6.13 | Both debounced + throttled on same cell |
| E-RESET-* | INVALID-TARGET, NO-ARG | Reset keyword errors |
| E-RI-* | 002 | Route inference errors |
| E-SQL-* | 005, 006, 008 | SQL validation errors |
| E-STATE-* | 004, 005, 006, COMPLETE, PINNED-FORWARD-REF, TERMINAL-MUTATION, TRANSITION-ILLEGAL | State/engine errors |
| E-STYLE-* | 001 | CSS validation errors |
| E-SYNTAX-* | 002, 010, 011, 042, 043, 044, 050 | Syntax violations; E-SYNTAX-042 = `null`/`undefined` in scrml source position |
| E-TAILWIND-* | 001 | Tailwind class validation |
| E-TEST-* | 001–006 | Test block violations (§19.13) |
| E-TILDE-* | 001, 002 | Tilde-decl must-use violations |
| E-TIMEOUT-* | 001, 002 | Timeout configuration errors |
| E-TIMER-NAME-DUPLICATE | §51.0.M.1 | Engine state-child declares two `<onTimeout>` with same `name=` value; fire-site: engine-statechild-parser.ts (A5-6 Feature 1, S79) |
| E-TIMER-NAME-INVALID | §51.0.M.1 | `<onTimeout name=...>` value is not identifier-shaped; fire-site: engine-statechild-parser.ts (A5-6 Feature 1, S79) |
| E-TYPE-* | 001, 004, 006, 020–081 | Type system errors (Stage 6 TS) |
| E-TYPE-042 | §42.2.4 | Rewrite guard: `!(x is not)` shape error — "use `x is not` not `!(x is not)`"; fire-site: rewrite.ts _rewriteParenthesizedIsOp (S103) |
| E-USE-* | 001, 002, 005 | Usage analysis errors |
| E-VALIDATOR-* | CIRCULAR-DEP, INLINE-DYNAMIC | Validator graph errors |
| E-VARIANT-AMBIGUOUS | §34 | Variant inference ambiguity |

## Auth-Graph Diagnostic Codes (A-3, typed separately from CGError)

Fire-site: `compiler/src/auth-graph.ts` + `compiler/src/reachability/component-4.ts`

| Code | Severity | When fired | Fire-site |
|------|----------|-----------|-----------|
| E-AUTH-GRAPH-001 | error | role-enum declared but malformed | A-3.2 resolveRoleEnum() |
| E-AUTH-GRAPH-002 | error | multiple role enums in same compilation unit | A-3.2 resolveRoleEnum() |
| E-AUTH-GRAPH-003 | error | `<auth role="X">` references variant not in enum | A-3.3 classifyGates() |
| E-AUTH-GRAPH-004 | error | `<auth>` block without `role=` AND without `check=` | A-3.3 classifyGates() |
| I-AUTH-REDIRECT-UNRESOLVED | info | gate redirect target path does not match any RouteMap.pages URL | A-3.4 crossRefRedirects() |
| W-AUTH-PAGE-INFERRED | info | `<page>` lacks explicit `auth=` AND enclosing `<program auth=required>` present | A-3.3 classifyGates() |
| W-AUTH-LOGIN-MISSING | warning | auth gates present + no login page at configured loginRedirect path; two-tier severity; fires once per compilation | auth-graph.ts checkLoginMissing() |
| W-AUTH-RUNTIME-FALLBACK | info | auth gate uses async-only check; static role classification impossible; gated component shipped eagerly | A-2.5 component-4.ts |
| E-CLOSURE-002 | error | application uses auth-role-block gates but declares no app-scope role enum | A-2.5 component-4.ts |

## Chunk Lint Codes (A-4.7 + Q-OPEN-6 — fired from route-splitter.ts:emitChunkLints)

| Code | Severity | When fired |
|------|----------|-----------|
| W-CG-CHUNK-EMPTY | warning | entry-point produces zero non-empty chunks across all roles |
| W-CG-CHUNK-LARGE | warning | initial chunk payloadJs exceeds soft size budget (default 100,000 bytes; configurable via `--chunk-size-budget=N`) |
| W-CG-CHUNK-NO-PREFETCH | info | multi-route app AND entry-point has NO internal `<a href>` links at all (Q-OPEN-6 case 1) |
| W-CG-CHUNK-PREFETCH-UNRESOLVED | warning | multi-route app AND internal-shaped `<a href>` links exist but NONE resolved to RouteMap.pages (Q-OPEN-6 case 2) |
| W-CG-CHUNK-MISSING-ROLE | warning | `<auth role="X">` references a role with no ChunkPlan in reachability record |

W-CG-CHUNK-NO-PREFETCH and W-CG-CHUNK-PREFETCH-UNRESOLVED are mutually exclusive per Q-OPEN-6: `hasInternalLinks` (ctx field) discriminates case 1 (info) vs case 2 (warning). All five codes in SPEC §34 + §40.9.11 catalog.

## Warning Codes (W-*)

| Code | Severity | Domain |
|------|----------|--------|
| W-ABSENCE-IN-SCRML-SOURCE | info | `null` or `undefined` in scrml source (S89 renamed from W-NULL-IN-SCRML-SOURCE) |
| W-CG-UNDEFINED-INTERPOLATION | warning | Bare `undefined` JS keyword found in compiled output (M-7C-D-12 Track 3; fires from `lint-undefined-interpolation.ts`) |
| W-CG-CHUNK-EMPTY | warning | entry-point produces zero non-empty chunks (A-4.7, route-splitter.ts) |
| W-CG-CHUNK-LARGE | warning | initial chunk exceeds size budget (A-4.7; Q-OPEN-5 configurable threshold, route-splitter.ts) |
| W-CG-CHUNK-NO-PREFETCH | info | multi-route app, no internal links at all (Q-OPEN-6 case 1, route-splitter.ts) |
| W-CG-CHUNK-PREFETCH-UNRESOLVED | warning | internal-shaped links exist but none resolve to RouteMap.pages (Q-OPEN-6 case 2, route-splitter.ts) |
| W-CG-CHUNK-MISSING-ROLE | warning | `<auth role=X>` role not in reachability record (A-4.7, route-splitter.ts) |
| W-AUTH-LOGIN-MISSING | warning | auth gates present but no login page at loginRedirect path (A-3.5, auth-graph.ts) |
| W-ENGINE-SELF-WRITE-DETECTED | info | Engine self-write detected; runtime NO-OP (two fire-sites: symbol-table.ts PASS 12.B + PASS 16) |
| W-INPUT-001 | warning | §36 input device warning |
| W-MATCH-RULE-INERT | warning | `rule=` attribute declared on any `<match>` arm — `match` is a case-analysis Tier 1 locus; rule= is engine-only (§51) and is INERT here (the compiler accepts but does not enforce). SPEC §18.0.2 line 9625; fire-site: symbol-table.ts SYM PASS 20 (S107) |
| W-PROGRAM-REDUNDANT-LOGIC | warning | Redundant `${}` block in program/page body |
| W-TRY-CATCH-IN-SCRML-SOURCE | warning | Try/catch in scrml source (Stage 3.007; fires on stdlib/http lines 65/264) |

## Error Handling Patterns

| Pattern | Where used |
|---------|------------|
| `errors.push(new CGError(...))` | Accumulated during CG pipeline stages; surfaced at CLI output |
| `throw new Error("E-ENGINE-001-RT: ...")` | Runtime guard in compiled output |
| `throw new Error("E-REPLAY-001-RT: ...")` | Runtime guard in compiled output |
| `try/catch` in pipeline orchestration | api.js wraps each stage; errors collected, not re-thrown |
| `!{}` error-effect blocks | Compiled user error handlers (pattern-matched on error type) |
| `safeCall(() => ...)` | JS-host throw containment in stdlib; returns HostError shape |
| `await safeCallAsync(() => ...)` | Async variant; W-TRY-CATCH-IN-SCRML-SOURCE fires on stdlib/http remaining try-catch sites |

## Global Error Boundaries

| Name | File | Scope |
|------|------|-------|
| CGError accumulator | codegen/index.ts → api.js | Per-file compilation errors; returned to caller |
| _scrml_error_boundary | runtime-template.js | Per-server-function HTTP handler; catches and serializes errors |
| `!{}` arm dispatch | emit-html.ts + emit-event-wiring.ts | User-authored match-on-error reactive blocks |

## Diagnostic Walkers and Passes

| File / Pass | What it checks |
|-------------|----------------|
| compiler/src/gauntlet-phase1-checks.js | Post-TAB diagnostics for Stage 1 issues |
| compiler/src/gauntlet-phase3-eq-checks.js | Post-TAB equality and Phase 3 semantic checks |
| compiler/src/lint-ghost-patterns.js | Pre-Stage-2 lint for ghost/phantom patterns |
| compiler/src/lint-i-match-promotable.js | Lint for promotable i-match patterns |
| compiler/src/validators/ast-walk.ts | Shared read-only walker; channel placement pre-check |
| compiler/src/validators/lint-try-catch.ts | Stage 3.007 W-TRY-CATCH-IN-SCRML-SOURCE |
| compiler/src/validators/lint-async-user-source.ts | Async user-source lint pass |
| compiler/src/symbol-table.ts PASS 12.B | W-ENGINE-SELF-WRITE-DETECTED outside-state-child |
| compiler/src/symbol-table.ts PASS 16 | W-ENGINE-SELF-WRITE-DETECTED inside-state-child |
| compiler/src/codegen/lint-undefined-interpolation.ts | W-CG-UNDEFINED-INTERPOLATION post-emission scan |
| compiler/src/auth-graph.ts classifyGates() | W-AUTH-PAGE-INFERRED + E-AUTH-GRAPH-* |
| compiler/src/auth-graph.ts crossRefRedirects() | I-AUTH-REDIRECT-UNRESOLVED |
| compiler/src/auth-graph.ts checkLoginMissing() | W-AUTH-LOGIN-MISSING |
| compiler/src/reachability/component-4.ts | W-AUTH-RUNTIME-FALLBACK + E-CLOSURE-002 |
| compiler/src/reachability/outer-fixpoint.ts | E-CLOSURE-001 |
| compiler/src/codegen/route-splitter.ts emitChunkLints() | W-CG-CHUNK-* family + W-CG-CHUNK-PREFETCH-UNRESOLVED |
| compiler/src/engine-statechild-parser.ts | E-TIMER-NAME-DUPLICATE + E-TIMER-NAME-INVALID (§51.0.M.1) |
| compiler/src/match-statechild-parser.ts | **NEW S107** — re-tokenizes `armsRaw` from `match-block` AST nodes into structured `MatchArmEntry[]` (530 lines). Recognizes 3 body forms (self-closing / `:`-shorthand / bare-body) + wildcard `<_>` + parenthesized payload bindings. Span tracking is local byte-offsets within `armsRaw`; SYM PASS 20 absolutizes via `match-block.span.start`. Parse-time diagnostics carry `E-MATCH-PARSE-*` shape (Phase 2 internal; not in §34) |
| compiler/src/type-system.ts §41.14 pass | E-FORMFOR-* (8 codes; S102) |
| compiler/src/type-system.ts §41.15 pass | E-SCHEMAFOR-* (8 codes; S104) — `collectSchemaForImports` + `walkAndExpandSchemaForCalls` two-pass (Pass A inside `<schema>` body; Pass B everywhere-else fires E-SCHEMAFOR-INVALID-CALL-CONTEXT) |
| compiler/src/type-system.ts §41.16 pass | E-TABLEFOR-* (13 codes; S105) — `collectTableForImports` + `walkAndExpandTableForNodes` (mirror of formFor + schemaFor pattern) |
| compiler/src/symbol-table.ts SYM PASS 19 | E-STATE-PINNED-FORWARD-REF for `pinned fn` (S105) — walks every CallExpr in every ExprNode payload; fires when readPos < declSpan.start. **Distinct from B4 cell+import pinned-forward-ref check** (which uses `declSpan.end` because non-fn pinned forms forbid self-reference); A4 fn-pinned uses `declSpan.start` because fn semantics admit self-recursion |
| **compiler/src/symbol-table.ts SYM PASS 20 (NEW S107)** | 5 match-block diagnostics per SPEC §18.0.1 + §18.0.2. Sequence (in fire order): **(1) E-MATCH-ON-REQUIRED** — `on=` missing AND no in-scope `<engine for=T>` (per Q-MB-5 ratification, new §34 row). **(2) E-MATCH-NOT-EXHAUSTIVE** — variants missing AND no `<_>` wildcard arm. **(3) W-MATCH-RULE-INERT** — `rule=` on any arm. **(4) E-MATCH-EFFECT-FORBIDDEN** — `effect=` on any arm. **(5) E-MATCH-ONTRANSITION-FORBIDDEN** — `<onTransition>` element in any arm body. Walks `match-block` AST nodes (ast-builder S107 Phase 1 produces `kind: "match-block"` with `forType` + `onExprRaw` + `armsRaw`); re-tokenizes via `match-statechild-parser.ts` |
| compiler/src/codegen/rewrite.ts _rewriteParenthesizedIsOp | E-TYPE-042 for `!(x is not)` shape (S103 paren-form rewrite) |

## Bug-3 Diagnostic File-Path Carry (S107 `2e9f9c3`)

**Problem (pre-S107):** `[BS]` (block-splitter) + `[TAB]` (tree-AST-builder) compiler diagnostics omitted the `path:line:col` prefix that the sibling `[W-LINT-*]` lint stream carried. Adopter dogfood Bug 3 surfaced this as MED-severity internal-consistency drift — error messages were hard to act on without a file reference.

**Fix sites:**
- `compiler/src/api.js:570+` — `collectErrors(stageName, errors, filePath = null)` enriched with optional `filePath` arg; lifts `bsSpan` → `span` (older BS errors used `bsSpan` per legacy spread-collision avoidance); stamps `enriched.filePath` and `enriched.span.file` from the per-file path when present
- `compiler/src/commands/dev.js` — diagnostic formatter mirrors W-LINT-* `path:line:col` shape
- `compiler/src/commands/build.js` — same mirror

**Tests:** `compiler/tests/unit/bug-3-diagnostic-file-paths.test.js` — 6 unit tests covering BS error / TAB error / mixed-stream stability.

**No new diagnostic codes.** This is a presentation-layer fix on existing E-BS-* / E-PARSE-* / E-CTX-* / etc. The codes themselves are unchanged.

## Reactive Boolean Attribute Dispatch (S105)

Three boolean HTML attrs use setAttribute/removeAttribute toggle via `_scrml_effect` rather than literal `attr=value` interpolation:

| File / Site | Purpose |
|-------------|---------|
| compiler/src/codegen/emit-html.ts:41 | `REACTIVE_BOOL_ATTRS = new Set(["disabled", "readonly", "required"])` — Set membership gate |
| compiler/src/codegen/emit-html.ts:1508 | Dispatch site — boolean-shape attributes route through reactive effect emit; runtime calls setAttribute(name,"") on true, removeAttribute(name) on false |
| compiler/runtime/scrml-runtime.js _scrml_effect | Runtime toggle target |
| compiler/tests/unit/reactive-bool-attrs.test.js | 13 unit tests (S105) — happy-path each attr + interaction with @cell + interaction with formFor follow-on case |

Closes §41.14 formFor follow-on: `disabled=!@<cellName>.isValid` on the synthesized submit button was silently dropping prior to S105. Extension candidate set: `checked`, `selected`, `hidden`, `open`, `multiple`, `loop`, `muted` (deferred — extend the Set when adopter friction surfaces).

## Bug-5 `${IDENT}` Non-Reactive Interpolation Codegen Fix (S107)

**Problem:** Bug 5 HIGH severity — `${VERSION}` and similar non-reactive const interpolations were emitting empty placeholders + orphan `IDENT;` no-op JS statements at file-scope. Markup-as-value pillar misfired on its simplest shape.

**Fix sites (Phases 1 + 2 SHIPPED S107):**
- **Phase 1** `compiler/src/codegen/emit-event-wiring.ts:928` — missing-else branch in interpolation dispatch: when the identifier is non-reactive (const-folded), emit a one-shot `textContent` write inside the DOMContentLoaded callback. Closes the headline symptom.
- **Phase 2** `compiler/src/codegen/emit-html.ts:1672` — new `stmtContainsRenderableLogic(node)` classifier gates synth-span emission on body content; closes phantom `<span data-scrml-logic>` Anomaly B (decl-only logic bodies were producing empty spans).
- **Phase 2** `compiler/src/codegen/emit-reactive-wiring.ts:389` — orphan-filter regex matches pure-read shapes (`IDENT;` / `IDENT.path;` / `_scrml_reactive_get("x");`) and elides them from file-scope output; closes Anomaly C (orphan no-op JS).

**Tests:** `compiler/tests/unit/bug-5-const-interpolation.test.js` — 26 unit tests (19 Phase 1 + 7 Phase 2). Existing `engine-event-handler-writes.test.js` had 4 brittle assertions on `_scrml_attr_onclick_2` hardcoded counter; refactored to regex pattern.

**Phase 3 carry-forward:** SPEC §7.4.2 normative section + constant-folding optimization + tilde-context threading + multi-binding placeholder dedup (~5-8h aggregate). Filed in `docs/known-gaps.md` HIGH section.

**No new diagnostic codes.** Pure codegen fix.

## Tags
#scrmlts #map #error #diagnostics #runtime-errors #error-codes #s107 #v0.3.3 #formfor #e-formfor #schemafor #e-schemafor #tablefor #e-tablefor #pinned-fn #pass-19 #pass-20 #match-block #e-match-not-exhaustive #e-match-effect-forbidden #e-match-ontransition-forbidden #e-match-on-required #w-match-rule-inert #spec-18-0-1 #spec-18-0-2 #bug-3-file-line-col #bug-5-const-interpolation #bug-6-retired-codes #e-engine-state-child-missing #e-pure-001 #reactive-bool-attrs #wire-format #auth-graph #w-cg-undefined #closure #auth-runtime-fallback #w-cg-chunk #w-auth-login-missing #route-splitter #q-open-6 #payload-binding #named-timers #raw-content #paren-form-fix

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [schema.map.md](./schema.map.md)
