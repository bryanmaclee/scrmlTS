# scrmlTS — Session 26 Hand-Off

**Date opens:** TBD (whenever S26 starts)
**Previous:** `handOffs/hand-off-25.md` (the S25 starting brief)
**Baseline at S25 wrap:** **6,969 pass / 10 skip / 2 fail** (25,651 expects across 287 files) at commit `5ab63ac`.

---

## 0. Cold-start state

### Unpushed at S25 wrap (6 commits)

- `c5e41b3` — `feat(§51.11)`: audit @varName clause on `< machine>` for replay/time-travel (S24 carryover).
- `6f5b90c` — `feat(§35.5)`: E-LIN-005 — reject let/const/lin shadowing an enclosing lin.
- `b6c4f5d` — `fix(§35.5)`: push scope for while-stmt so E-LIN-005 fires in while bodies.
- `3556b22` — `fix(§51)`: emit effect blocks for rules without a `given` guard.
- `0e52306` — `docs(§35.1/§35.2)`: Approach-B wording — restricted intermediate visibility.
- `5ab63ac` — `feat(§2a)`: push scope for match-arm-block body.

S26 needs either one-time push auth or a `needs: push` message to master.

### Untracked at S25 wrap

- `docs/changes/expr-ast-phase-1-audit/` — `escape-hatch-catalog.{json,md}` dated 2026-04-18. Pre-existing artifact, not touched this session. Decide keep-and-commit vs. gitignore vs. delete.
- `docs/dfas` — empty file. Likely accidental; delete on confirmation.

### Incoming messages

- `handOffs/incoming/`: empty (only `read/` archive).

### scrmlTSPub status

Retirement message sent to master 2026-04-17-1804. Still pending at S25 wrap; prod if no action.

---

## 1. S25 session summary

### Work done (5 slices, 6 commits including S24 carryover)

- **§2h lin redesign, slice 1.** E-LIN-005 reject let/const/lin shadowing. `ScopeEntry.isLin` carries through to let/const/lin-decl binding sites; `checkLinShadowing` fires when a new binding resolves via the scope chain to an isLin entry in a strictly enclosing scope. Same-scope rebinding explicitly out of scope — not hierarchical shadowing. 10 new gauntlet tests. SPEC §35.5 amended.

- **§2h lin redesign, slice 1b (while-stmt scope).** Pre-existing gap surfaced: visitNode had a combined `while-stmt / if-stmt` case (for the W-ASSIGN-001 check) that walked the body without scope push, shadowing a later scope-pushing case for while-stmt. Merged the cases; `while-stmt` body now pushes a scope (if-stmt untouched — that's a separate concern). Re-added the nested-while-shadow case to lin-005 tests.

- **Effect-block emission fix.** Pre-existing bug from S24. `emitTransitionGuard` took pre-filtered `guardRules` from both callers and filtered that subset again for effect emission — effect-only rules lost their effect body. Fix: pass full `binding.rules`; compute guard-filter and effect-filter independently inside. 4 new gauntlet tests.

- **§2h lin redesign, slice 4 (spec wording).** Pure docs. §35.1 now explicitly names "restricted intermediate visibility"; §35.2 adds a normative statement that any reference is a consumption and a second reference — even read-only — is E-LIN-002. Aligns the spec with existing compiler behavior.

- **§2a, match-arm-block scope push.** `.Variant => { ... }` arm bodies were walked by the default-case recursion in visitNode without scope push, so arm-local `let`/`const` leaked to sibling arms and the enclosing scope, and E-LIN-005 didn't fire inside arms. Added a dedicated `match-arm-block` case that pushes a scope around the body walk. 5 new gauntlet tests.

### Blocked slices (recorded, not executed)

- **E-LIN-006** (lin in deferred-execution context). Deep-dive text conflicts with §35.6 "capture-as-consumption" — every closure capture is already a synchronous consumption event, so E-LIN-006 as written is either vacuous (closure body references aren't consumption) or overrides §35.6 (tightening semantics). Needs user resolution on which interpretation is intended.

- **§35.2.2 cross-`${}` block hoisting.** Blocked on a broader gap: program-level `${}` blocks do NOT run `checkLinear` today. A `lin x = 1` at program level is never flagged unconsumed. Fixing the program-level enforcement is a prerequisite; both together are multi-session scope.

### Suite trajectory

6,949 → 6,969 pass (+20), 25,619 → 25,651 expects (+32), 284 → 287 files (+3). Same 2 pre-existing self-host fails. Zero regressions.

### Incidental discoveries (not fixed)

- **match-arm expression-only form (`.Variant => singleExpr` without `{ }`).** S24 hand-off estimated this at 30–60 min, but on inspection it requires `collectExpr` stop-condition changes in the AST builder to delimit arms without braces. Larger than expected — queued for S26 with a more realistic scope estimate.

---

## 2. Queued for S26

### §2h lin redesign — remaining work

- **E-LIN-006 — needs user resolution.** Either (a) narrow E-LIN-006 to `<request>`/`<poll>` markup bodies only (skip closure case since §35.6 already handles it), or (b) override §35.6 for the deferred-closure case. Once resolved, implementation is straightforward.
- **§35.2.2 cross-`${}` block hoisting.** Requires program-level checkLinear enforcement first. Both together: ~2 slices.

### §2a remaining coverage

- **match-arm expression-only form** (`.Variant => singleExpr`). AST builder change. `collectExpr` stop-condition extension to recognize next-arm-pattern (`.IDENT =>`, `else =>`, `not =>`) as a boundary. Touches many tests; do it standalone.
- **switch-stmt body.** Similar shape. Probably shares the same AST-builder plumbing.
- **error-arm `!{}` bindings.** Haven't audited. Caught-error binding needs scope-push before arm body walks.

### §2b followups (machine-cluster-expressiveness deep-dive)

- **C — temporal transitions** (`.Loading after 30s => .TimedOut`). Small grammar + runtime layered on §6.7.8. Default resolution on clock-reset-vs-cumulative per the deep-dive: **reset** (matches XState). Medium compiler complexity; multi-session.
- **F — auto-generated property tests** from machine declarations. Compile-time `~{}` suite emission behind `--emit-machine-tests` flag. Medium complexity, no grammar change.

### Known compiler bugs documented-but-unfixed

1. **Pre-existing parser bug (S22 §6):** untyped-then-typed reactive-decl statement-boundary drops the typed decl. Workaround: typed reactives first, or separate `${}` blocks. S24 notes: "real fix is a body-pre-parser audit."
2. **Machine opener attribute-form migration** — ratified S24, deferred. "Natural carrier" is the next §51 slice (temporal transitions / property tests).
3. **while-stmt scope-push gap** — FIXED this session (`b6c4f5d`). Left here for reference.
4. **Effect-block emission for non-guarded rules** — FIXED this session (`3556b22`). Left here for reference.

### §2i — 2 known self-host fails (deferred since S18)

- `Bootstrap L3: self-hosted API compiles compiler > self-hosted api.js exports compileScrml`
- `Self-host: tokenizer parity > compiled tab.js exists`

Part of the §5-era self-host backlog.

### §5-era backlog

- P3 self-host completion + idiomification.
- P5 TS migrations — `ast-builder.js`, `block-splitter.js` still `.js`.
- P5 ExprNode Phase 4d + Phase 5 — additional coverage, then retire legacy string-form fields.
- Full Lift Approach C Phase 2 — `emitConsolidatedLift` refactor for fragmented bodies.
- Async loading stdlib helpers.
- DQ-12 Phase B — diagnostic quality work.

---

## 3. Test infrastructure notes

- Test suite entry: `bun test compiler/tests/`.
- Pretest hook: `scripts/compile-test-samples.sh`.
- New gauntlet dir: `compiler/tests/unit/gauntlet-s25/` — contains:
  - `lin-005-shadowing.test.js` (§35.5, 11 tests)
  - `machine-effect-without-guard.test.js` (§51, 4 tests)
  - `match-arm-block-scope.test.js` (§2a, 5 tests)
- Suite at tip: 6,969 pass / 10 skip / 2 fail / 25,651 expects / 287 files / ~4.8s.

---

## 4. Agents available

Same primary roster as S22/S23/S24/S25. No staging needed for follow-up slices.

---

## 5. Recommended S26 opening sequence

1. Check `handOffs/incoming/` for messages. Master may have acted on the scrmlTSPub retirement; if so, archive the read message.
2. Resolve the two untracked items on disk (`docs/changes/expr-ast-phase-1-audit/`, `docs/dfas`).
3. Push the 6 unpushed commits via one-time auth or master-PA batch.
4. Decide next priority. Options, roughly by user-vision impact:
   - **E-LIN-006 resolution + implementation** — user decides §35.6-vs-E-LIN-006 interpretation; then ship.
   - **Program-level checkLinear enforcement** — prerequisite to §35.2.2 cross-block hoisting.
   - **match-arm expression-only scope coverage** — AST-builder change; standalone slice.
   - **§2b C temporal transitions** — natural carrier for the deferred machine-opener migration.
   - **§2b F auto-property-tests** — "machine = enforced spec" unlock.

---

## Tags
#session-26 #open #unpushed-6-commits #blocked-lin-006 #blocked-cross-block-lin #queue-match-arm-expr-form #queue-temporal-transitions #queue-property-tests #s25-complete
