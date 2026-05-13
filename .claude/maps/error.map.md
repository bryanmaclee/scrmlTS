# error.map.md
# project: scrmlts
# updated: 2026-05-13T15:00:00Z  commit: 9b98118

## Error Code System

Errors are structured `CGError` instances (compiler/src/codegen/errors.ts). Runtime errors extend `_ScrmlError` (runtime-template.js). Codes follow the pattern `E-DOMAIN-NNN` or `W-DOMAIN-NNN` (warnings) or `I-DOMAIN-NNN` (info). Authoritative catalog: SPEC.md §34.

## CGError Type  [compiler/src/codegen/errors.ts:11]

```typescript
class CGError {
  code: string
  message: string
  span: CGSpan | object
  severity: 'error' | 'warning'  // default: 'error'
}
```

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
| E-BS-* | 000 | Block splitter (Stage 2) |
| E-CG-* | 001, 002, 003, 006, 010, 014, 015 | Codegen (Stage 8); E-CG-006 = SQL-to-client leak |
| E-CHANNEL-* | 001, 007, 008 | Channel declaration/usage |
| E-CHANNEL-OUTSIDE-PROGRAM | §38.1 | `<channel>` at file-top when file ALSO has `<program>` (PURE-CHANNEL-FILE shape is exempt) |
| E-CHANNEL-INSIDE-PAGE | §38.1 | `<channel>` inside `<page>` — forbidden |
| E-COMPONENT-* | 010–035 | Component expansion/definition |
| E-CONTRACT-* | 001–004 | Pipeline contract violations |
| E-CTRL-* | 001–005, 011 | Control flow errors |
| E-CTX-* | 001–003 | Context violations |
| E-DEBOUNCED-WITH-DERIVED | §6.13 | Debounced attr on derived cell |
| E-DEBOUNCED-WITH-SERVER | §6.13 | Debounced attr on server-context cell |
| E-DG-* | 001, 002 | Dependency graph (Stage 7) |
| E-ENGINE-* | 001, 003, 004, 005, 010, 013 | Engine declaration/transition |
| E-ENGINE-INVALID-TRANSITION | §51.0.F | Direct write violating rule= contract; self-writes (§51.0.F.1) are NO-OPs, not violations |
| E-ERROR-* | 008 | Error handling surface |
| E-IMPORT-* | 005, 006, 007 | Import violations |
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
| E-REPLAY-* | 001-RT | Runtime: replay index errors |
| E-REACTIVITY-ATTR-CONFLICT | §6.13 | Both debounced + throttled on same cell |
| E-RESET-* | INVALID-TARGET, NO-ARG | Reset keyword errors |
| E-RI-* | 002 | Route inference errors |
| E-SQL-* | 005, 006, 008 | SQL validation errors |
| E-STATE-* | 004, 005, 006, COMPLETE, PINNED-FORWARD-REF, TERMINAL-MUTATION, TRANSITION-ILLEGAL | State/engine errors |
| E-STYLE-* | 001 | CSS validation errors |
| E-SYNTAX-* | 002, 010, 011, 042, 043, 044, 050 | Syntax violations |
| E-TAILWIND-* | 001 | Tailwind class validation |
| E-TEST-* | 001–006 | Test block violations (§19.13) |
| E-TILDE-* | 001, 002 | Tilde-decl must-use violations |
| E-TIMEOUT-* | 001, 002 | Timeout configuration errors |
| E-TYPE-* | 001, 004, 006, 020–081 | Type system errors (Stage 6 TS) |
| E-USE-* | 001, 002, 005 | Usage analysis errors |
| E-VALIDATOR-* | CIRCULAR-DEP, INLINE-DYNAMIC | Validator graph errors |
| E-VARIANT-AMBIGUOUS | §34 | Variant inference ambiguity |
| W-CG-* | 001 | Codegen warnings |
| W-ENGINE-SELF-WRITE-DETECTED | §51.0.F.1 | Info-level: engine self-write detected; runtime NO-OP. Two fire-sites: PASS 16 (inside-state-child) + PASS 12.B (outside-state-child) in symbol-table.ts |
| W-PROGRAM-REDUNDANT-LOGIC | §4.14 | `<program>`/`<page>` body wraps top-level decls in redundant `${}` block |

## LIFT-template Codegen Bug Families (S88 STATUS)

| ID | Status | Description |
|----|--------|-------------|
| LIFT-1 | FIXED S88 | `parseLiftTag` returns null for paren-wrapped attr values — cursor desync FIXED; `class:NAME=(parens-expr)` no longer elides parent element |
| LIFT-2/3/4 BUNDLE | FIXED S88 | `bind:*` two-way wiring / `if=` conditional display / event-arg parity inside lift template — all three wired in emit-lift.js |
| LIFT-5 | FIXED S88 | `if (cond) { lift ... }` inside `for` — `if/for` children now route through container helpers in reconciler factory (emit-control-flow.ts) |

All 5 LIFT families closed at S88. Anchor tests in `lift-li-text-template.test.js` + `todomvc-fixture-edit-mode.test.js` + `lift-5-reconciler-ambient.test.js` now pass.

## scrml:host HostError Type (NEW S88)

HostError is NOT a subclass of _ScrmlError. It is a variant-constructor object matching the scrml enum variant shape:
```
{ variant: "Thrown", data: { message: string, name: string } }
```
Used by `safeCall` / `safeCallAsync` return values when a JS-host throw is caught. Sentinel field `__scrml_error: true` distinguishes error shapes from success values.

## Error Handling Patterns

| Pattern | Where used |
|---------|------------|
| `errors.push(new CGError(...))` | Accumulated during pipeline stages; surfaced at CLI output |
| `throw new Error("E-ENGINE-001-RT: ...")` | Runtime guard in compiled output — illegal state transition |
| `throw new Error("E-REPLAY-001-RT: ...")` | Runtime guard in compiled output — replay index out of bounds |
| `try/catch` in pipeline orchestration | api.js wraps each stage; errors collected, not re-thrown |
| `!{}` error-effect blocks | Compiled user error handlers (pattern-matched on error type) |
| `safeCall(() => ...)` | S88: JS-host throw containment in stdlib; returns HostError shape instead of throwing |
| `await safeCallAsync(() => ...)` | S88: async variant of safeCall for async-throwing JS-host APIs |

## Global Error Boundaries

| Name | File | Scope |
|------|------|-------|
| CGError accumulator | codegen/index.ts → api.js | Per-file compilation errors; returned to caller |
| _scrml_error_boundary | runtime-template.js | Per-server-function HTTP handler; catches and serializes errors |
| `!{}` arm dispatch | emit-html.ts + emit-event-wiring.ts | User-authored match-on-error reactive blocks |

## Diagnostic Walkers (Post-TAB)

| File | What it checks |
|------|----------------|
| compiler/src/gauntlet-phase1-checks.js | Post-TAB diagnostics for Stage 1 issues |
| compiler/src/gauntlet-phase3-eq-checks.js | Post-TAB equality and Phase 3 semantic checks |
| compiler/src/lint-ghost-patterns.js | Pre-Stage-2 lint for ghost/phantom patterns |
| compiler/src/lint-i-match-promotable.js | Lint for promotable i-match patterns |
| compiler/src/validators/ast-walk.ts | Shared read-only walker; channel placement pre-check (E-CHANNEL-OUTSIDE-PROGRAM) |
| compiler/src/symbol-table.ts PASS 12.B | `walkEngineSelfWriteOutside` — W-ENGINE-SELF-WRITE-DETECTED outside-state-child |
| compiler/src/symbol-table.ts PASS 16 | Inside-state-child W-ENGINE-SELF-WRITE-DETECTED fire-site |

## Tags
#scrmlts #map #error #diagnostics #runtime-errors #error-codes #s88 #lift-fixes-complete #safecall #host-error

## Links
- [primary.map.md](./primary.map.md)
- [master-list.md](../../master-list.md)
- [pa.md](../../pa.md)
- [schema.map.md](./schema.map.md)
- [domain.map.md](./domain.map.md)
