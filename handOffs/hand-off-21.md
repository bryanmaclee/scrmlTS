# scrmlTS — Session 21 Hand-Off

**Date:** 2026-04-16
**Previous:** `handOffs/hand-off-20.md`
**Baseline at start:** 6,802 pass / 10 skip / 2 fail (25,319 expects across 270 files)
**Current:** 6,813 pass / 10 skip / 2 fail (25,344 expects across 271 files)
**Status:** Open — §19 codegen batch complete

---

## Context carried forward from S20

S20 ran gauntlet phases 5-12, fixed 5 compiler bugs, documented 11 for future batch treatment. Full detail in `handOffs/hand-off-20.md`.

## S21 priorities (from S20 wrap)

1. **§19 error handling codegen** — `fail`/`?`/`!{}` need real codegen (biggest user-facing gap)
   - `fail` compiles to bare `fail;` — needs return-with-error-value codegen
   - E-ERROR-001 not enforced (fail in non-failable functions)
   - `?` propagation emits as literal `?;` — not compiled
   - `!{}` inline catch uses try/catch but fail doesn't throw — mismatch
2. **Phase 5 deferred meta bugs**
   - lin + ^{} capture not counted as consumption (§22.5.3)
   - Phase separation detected at eval-time, not checker-time
   - DG pass false-positive for @var via meta.get()/meta.bindings
   - Nested ^{} in compile-time meta crashes eval
3. **Missing diagnostics** — E-SCOPE-001 undeclared vars, E-IMPORT-001 missing modules
4. Phase 11 (integration apps) if Track B dev work desired

## Backlog (deprioritized S18)

- P3 self-host completion + idiomification
- P5 TS migrations (ast-builder, block-splitter)
- P5 ExprNode Phase 4d + Phase 5
- Full Lift Approach C Phase 2
- `lin` redesign (queued)
- Async loading stdlib helpers
- DQ-12 Phase B
- 2 remaining self-host test failures

## Inbox

No unread messages.

## Session log

### §19 error handling codegen — DONE (commit 37049be)

Fixed the four deferred §19 bugs from S20:

- `fail` inside nested bodies (if/for/function) was parsed as bare-expr and
  emitted literal `fail;`. Added `fail` dispatch to parseOneStatement.
- Canonical `.` separator was not accepted — only `::` alias worked.
  parseFailStmt now accepts both.
- `fail E.V` (no args) emitted `data: ` (JS syntax error) — fixed to emit
  `data: undefined`.
- `?` propagation inside nested bodies emitted literal `?;`. Added `?` suffix
  detection to parseOneStatement's let-decl and bare-expr paths.
- `!{}` inline catch used try/catch, but `fail` returns a tagged object
  (§19.3.2). Rewrote guarded-expr codegen to check `result.__scrml_error`,
  match on `.variant`, bind `.data`, and return unhandled variants up to the
  enclosing failable function.
- E-ERROR-001 now fires (was unreachable while `fail` never parsed in bodies).

Updated emit-logic-s19-error-handling.test.js (14 tests) to the new model.
Added gauntlet-s20/error-handling-codegen.test.js (11 tests).


## Tags
#session-21 #open
