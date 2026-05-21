# M3.4 progress — error-recovery engine integration + return-legality + full statement conformance

Per-agent progress file (parallel MK3.2 dispatch may run; do NOT share `progress.md`).
Append-only, timestamped.

## 2026-05-20 — startup + research complete

- Startup verification PASS: worktree `agent-a40273b9c7b98d025`, fast-forward
  merge `main` -> HEAD `3524e69b`, all predecessor files present
  (`parse-stmt` / `ast-stmt` / `parse-mode` / `error-recovery` `.scrml`+`.js`,
  `parser-conformance-stmt.test.js`). `bun install` + `bun run pretest` clean.
- Maps read: primary / structure / dependencies / schema.
- Roadmap §0 + §3.2 (M3.4 row — AUTHORITATIVE scope) read.
- Authority chain read: S98 DD D7 (M3 gating row), D2 (ErrorRecovery engine
  graph), D4 P4 (error-recovery is accept-state-shape — the canonical positive
  STATE example; the engine IS the idiom).
- Predecessor files read in full: `error-recovery.scrml`/.js (the M1 engine
  API), `parse-mode.scrml`/.js, `token-cursor.js`, `token.js`, `parse-stmt.js`
  (full, 2254 lines), `parse-stmt.scrml` (key regions), the M3.1/M3.2/M3.3
  progress files, `parser-conformance-stmt.test.js` structure.

### Key findings

- The M1 `ErrorRecovery` engine (`error-recovery.{scrml,js}`) is a complete
  API: `makeRecovery()` (the state struct — `{ mode, skipped, syncAt }`),
  `isParsingNormally`, `beginRecovery` (-> `.AccumulatingSkipped`),
  `accumulateSkipped(rec, tok)` (self-loop, append to payload), `markResync`
  (-> `.ReSynchronized`), `resumeNormal` (-> `.ParsingNormally`). M3.4 wires
  this into `parseStatementList`'s placeholder forced-advance guard.
- `parseStatementList` line ~250 has the placeholder — a single `advance` when
  `parseStatement` consumed nothing. M3.4 replaces it with the panic-mode
  re-synchronization driven by the `ErrorRecovery` engine.
- `makeParseStmtContext` does NOT currently carry a `recovery` slot — M3.4
  adds one (the engine's live-surface struct) + a `functionDepth` counter.
- Return-legality: `currentParseMode` is a single slot. A `return` in a nested
  `{}` inside a function sees `.InBlock`, not `.InFunctionBody`. M3.4 adds a
  `functionDepth` counter incremented at every function/method body entry
  (`parseFunctionBodyInline`) and seeded to 1 in `parseBlockStubBody` (a
  re-entered BlockStub IS a function/arrow body). `parseReturn` fires
  `E-STMT-RETURN-OUTSIDE-FUNCTION` at depth 0.
- Error codes: the native parser uses an `E-STMT-` / `E-EXPR-` LOCAL
  diagnostic namespace — these are parser-stage codes, NOT SPEC §34 catalog
  codes (verified: zero `E-STMT-` rows in SPEC.md). `E-STMT-RETURN-OUTSIDE-
  FUNCTION` is the M3.3-progress-documented seam name. `E-PARSER-OUT-OF-SUBSET`
  is the one cross-cutting DD-mandated code (OQ6).

### Scope (roadmap §3.2 M3.4 row)

1. Wire statement-level panic-mode recovery into M1's `ErrorRecovery` engine.
2. Return-legality — function-scope depth counter + `E-STMT-RETURN-OUTSIDE-
   FUNCTION` at depth 0.
3. Full statement conformance — Tier 1+2 on the FULL statement subset.
4. S98 D7 M3 mutual-recursion gating clause — report `fn` vs `function` form.

## 2026-05-20 — implementation

- DONE — parse-stmt.js + parse-stmt.scrml (1:1): `recovery` + `functionDepth`
  slots on ctx; `STATEMENT_START_KINDS` + `isStatementStartKind` +
  `resyncStatement` (engine-driven panic-mode resync); `parseStatementList`
  rewired from the M3.1 placeholder forced-advance to ErrorRecovery-engine
  panic-mode; `functionDepth` threading in `parseFunctionBodyInline` +
  `parseBlockStubBody`; `parseReturn` fires `E-STMT-RETURN-OUTSIDE-FUNCTION`
  at depth 0. Commit `2e4f6f9b`.
- DONE — parser-conformance-stmt.test.js: M3.4 test block (+45 tests, 454 ->
  499). FULL_SUBSET_CORPUS (12 mixed-statement-form programs, Tier 1+2 vs
  Acorn) + return-legality describe + panic-mode describe (engine cycle +
  the D7 M3 gating REGRESSION test + resync-point coverage). `nativeExprToEstree`
  gains a `Super` case. Commit `6c135b5d`.
- DONE — declaration-form note in parse-stmt.scrml header (S98 D7
  mutual-recursion gating clause). Commit `8b055d7d`.

## 2026-05-20 — result — M3.4 COMPLETE

- Statement conformance suite: 499 pass / 0 fail (was 454). All native-parser
  conformance suites: 1489 pass / 0 fail.
- S98 D7 M3 mutual-recursion gating clause: SPEC §48.6.4 (`fn` file-scope
  hoisting + mutual recursion) landed S98 + SHIPPED S105 — `fn`-form mutual
  recursion WORKS per SPEC (branch 1 of the OR). The native-parser `.scrml`
  files are uniformly `function`-form (M1/M2 carry-over); the `function` ->
  `fn` refactor is now unblocked + documented as an M-ladder cleanup TODO.
- M3 MILESTONE COMPLETE per S98 D7 — M3.1 (substrate) + M3.2 (control-flow)
  + M3.3 (functions/classes/import-export/try, BPP subsumed) + M3.4
  (error-recovery + return-legality + full statement conformance) all landed.
  D7 M3 gating: conformance Tier 1+2 PASS on the full statement subset; the
  ErrorRecovery engine demonstrably accumulates skipped tokens + re-synchronizes
  on `;` / statement-start keywords / closing braces (panic-mode); function
  bodies parsed IN-LINE (BPP deletes by construction).
