# scrmlTS — Session 26 Hand-Off

**Date opens:** TBD (whenever S26 starts)
**Previous:** `handOffs/hand-off-25.md` (the S25 starting brief)
**Baseline at S25 wrap:** **6,987 pass / 10 skip / 2 fail** (25,677 expects across 290 files) at commit `e171e33`.

---

## 0. Cold-start state

### Pushed to origin/main during S25

- First 8 commits (through `7dd6fe6`) were pushed mid-session via one-time auth (covers E-LIN-005 + while-stmt + effect emission + §35 wording + match-arm-block + s25 wrap brief + s25 archive + tmp-artifactDir cleanup).

### Unpushed at S25 wrap (4 commits)

- `83101c7` — `docs(§35.2.2)`: ratify cross-`${}` block lin — tests + spec.
- `4b1e8b2` — `feat(§2a)`: push scope for if-stmt consequent and alternate branches.
- `1da34e4` — `docs(s25)`: wrap — refresh hand-off with post-wrap slices.
- `e171e33` — `feat(§35.5)`: E-LIN-006 — reject lin consumption inside `<request>`/`<poll>` body.

S26 needs either one-time push auth or a `needs: push` message to master.

### Untracked at S25 wrap

- None. The `docs/dfas` stray and the `docs/changes/expr-ast-phase-1-audit/` artifact issue were resolved in `7dd6fe6` (test now writes to `os.tmpdir()` instead of the repo tree).

### Incoming messages

- `handOffs/incoming/`: empty (only `read/` archive).

### scrmlTSPub status

Retirement message sent to master 2026-04-17-1804. Still pending at S25 wrap; prod if no action.

---

## 1. S25 session summary

### Work done (9 slices, 12 commits including the S24 carryover and 2 housekeeping)

- **E-LIN-005 reject let/const/lin shadowing** (`6f5b90c`). `ScopeEntry.isLin` carries through to let/const/lin-decl binding sites; `checkLinShadowing` fires when a new binding resolves via the scope chain to an isLin entry in a strictly enclosing scope. Same-scope rebinding explicitly out of scope. 11 gauntlet tests. SPEC §35.5 amended.

- **while-stmt scope push** (`b6c4f5d`). Pre-existing gap surfaced by E-LIN-005: the combined `while-stmt / if-stmt` case walked the body without scope push, shadowing a later scope-pushing case. Merged; while-stmt body now pushes a scope.

- **Effect-block emission for non-guarded rules** (`3556b22`). Pre-existing bug from S24. `emitTransitionGuard` took pre-filtered `guardRules` from both callers and re-filtered internally for effect emission, dropping effect-only rules. Fix: pass full `binding.rules`, compute guard-filter and effect-filter independently. 4 tests.

- **§35.1/§35.2 Approach-B wording** (`0e52306`). Pure docs. §35.1 explicitly names "restricted intermediate visibility"; §35.2 gains a normative statement that any reference is a consumption and a second reference — even read-only — is E-LIN-002. Spec now matches existing compiler behavior.

- **match-arm-block body scope push** (`5ab63ac`). `.Variant => { ... }` arm bodies walked by the default-case recursion without scope push, so arm-local bindings leaked and E-LIN-005 didn't fire inside arms. New dedicated case pushes a scope around the body walk. 5 tests.

- **Test-artifact dir moved to `os.tmpdir()`** (`7dd6fe6`). `expr-node-corpus-invariant.test.js` was regenerating `docs/changes/expr-ast-phase-1-audit/escape-hatch-catalog.{json,md}` inside the repo on every run — showing up as untracked noise ever since S21 dereffed the live copy. Redirected to `/tmp/scrml-expr-audit-phase-1/`. Also dropped the empty stray `docs/dfas`.

- **§35.2.2 cross-`${}` block lin — tests + spec** (`83101c7`). Diagnosis showed the feature already works: program-level `checkLinear` enforces lin across top-level `${}` blocks, and the JS emitter hoists the `const` to a single binding at the common ancestor scope. Added 6 tests formalizing the contract (cross-block consume, markup-interpolation consume, unconsumed, intermediate reference, double-consume, multiple lins) and a new §35.2.2 SPEC section. Previously mischaracterized as "blocked by program-level enforcement gap" — corrected.

- **if-stmt branch scope push** (`4b1e8b2`). Parallel fix to the while-stmt slice. if-stmt walked consequent and alternate in the enclosing scope, so `let`/`const` leaked between branches and to the parent scope, and E-LIN-005 did not fire inside if bodies. Separate scope push for each branch. 6 tests. Zero regressions in existing suite — nothing in the corpus relied on the leak.

- **E-LIN-006 reject lin consumption inside `<request>`/`<poll>` body** (`e171e33`). Closes the last user-decision block on §2h lin redesign. Narrow interpretation (A): only the two deferred-execution markup bodies are treated as dominance-unprovable. Closures remain §35.6 territory (capture = synchronous consumption). LinTracker gains `_declDeferredDepth`; checkLinear carries a `currentDeferredDepth` / `currentDeferredCtx` stack updated by a new markup case in walkNode. E-LIN-006 fires before the state check (boundary violation is primary), force-consume suppresses the cascading E-LIN-001. 6 tests. SPEC §35.5 amended with the new error block + normative statements + explicit closure carve-out.

### Blocked slices resolved this session

- **E-LIN-006** — user selected interpretation (A) "narrow" — markup `<request>`/`<poll>` bodies only; closures remain per §35.6. Shipped in `e171e33`.
- **§35.2.2 cross-block hoisting** — diagnosis corrected (not blocked, already-working behavior). Tests + spec shipped in `83101c7`.

Both blockers listed in the initial S25 wrap brief have been cleared this session. §2h lin redesign (Approach B) is now effectively complete in the compiler.

### Suite trajectory

6,949 → 6,987 pass (+38), 25,619 → 25,677 expects (+58), 284 → 290 files (+6). Same 2 pre-existing self-host fails. Zero regressions across all nine slices.

### Incidental discoveries (not fixed)

- **match-arm expression-only form (`.Variant => singleExpr` without `{ }`).** S24 hand-off estimated this at 30–60 min, but on inspection it requires `collectExpr` stop-condition changes in the AST builder to delimit arms without braces. Larger than expected — queued for S26 with a more realistic scope estimate.
- **switch-stmt body walk.** Probe showed an outer lin referenced inside a switch body is NOT counted as consumption — `lin x = …` followed by `switch (…) { case 1: { console.log(x) } }` still fires E-LIN-001 (unconsumed). switch-stmt body walking is likely not integrated with checkLinear. Queued.
- **error-arm `!{}` binding scope.** Not audited this session. The caught-error binding probably needs its own scope-push case.

---

## 2. Queued for S26

### §2h lin redesign — remaining work

None blocking. Approach B is complete in the compiler per the 2026-04-13 deep-dive. Future work that could be layered on top is Approach C (cross-function `lin:out` / `lin:in` explicit teleportation), which the deep-dive marked as optional and would only be warranted if users request cross-function lin mobility — not on the critical path.

### §2a remaining coverage

- **match-arm expression-only form** (`.Variant => singleExpr`). AST builder change. `collectExpr` stop-condition extension to recognize next-arm-pattern (`.IDENT =>`, `else =>`, `not =>`) as a boundary. Touches many tests; do it standalone.
- **switch-stmt body.** Not walked by checkLinear today (confirmed by probe this session — outer lin referenced in a switch case body doesn't count as consumption). Investigate whether switch is used in real code before prioritizing; match-stmt is the idiomatic form.
- **error-arm `!{}` bindings.** Haven't audited. Caught-error binding needs scope-push before arm body walks.

### §2b followups (machine-cluster-expressiveness deep-dive)

- **C — temporal transitions** (`.Loading after 30s => .TimedOut`). Small grammar + runtime layered on §6.7.8. Default resolution on clock-reset-vs-cumulative per the deep-dive: **reset** (matches XState). Medium compiler complexity; multi-session.
- **F — auto-generated property tests** from machine declarations. Compile-time `~{}` suite emission behind `--emit-machine-tests` flag. Medium complexity, no grammar change.

### Known compiler bugs documented-but-unfixed

1. **Pre-existing parser bug (S22 §6):** untyped-then-typed reactive-decl statement-boundary drops the typed decl. Workaround: typed reactives first, or separate `${}` blocks. S24 notes: "real fix is a body-pre-parser audit."
2. **Machine opener attribute-form migration** — ratified S24, deferred. "Natural carrier" is the next §51 slice (temporal transitions / property tests).
3. **while-stmt scope-push gap** — FIXED this session (`b6c4f5d`). Left here for reference.
4. **Effect-block emission for non-guarded rules** — FIXED this session (`3556b22`). Left here for reference.
5. **if-stmt branch-body scope leak** — FIXED this session (`4b1e8b2`). Left here for reference.

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
  - `lin-cross-block.test.js` (§35.2.2, 6 tests)
  - `if-stmt-scope.test.js` (§2a, 6 tests)
  - `lin-006-deferred-ctx.test.js` (§35.5, 6 tests)
- Suite at tip: 6,987 pass / 10 skip / 2 fail / 25,677 expects / 290 files / ~4.8s.

---

## 4. Agents available

Same primary roster as S22/S23/S24/S25. No staging needed for follow-up slices.

---

## 5. Recommended S26 opening sequence

1. Check `handOffs/incoming/` for messages. Master may have acted on the scrmlTSPub retirement; if so, archive the read message.
2. Push the 4 unpushed commits via one-time auth or master-PA batch.
3. Decide next priority. §2h lin redesign is now complete. Options, roughly by user-vision impact:
   - **§2b C temporal transitions** — natural carrier for the deferred machine-opener migration (§51.3.2).
   - **§2b F auto-property-tests** — "machine = enforced spec" unlock.
   - **match-arm expression-only scope coverage** — AST-builder change; standalone slice.
   - **switch-stmt integration with checkLinear** — likely small, depends on whether switch is actually used in real code.
   - **S22 pre-existing parser bug** — untyped-then-typed reactive-decl statement-boundary. Body-pre-parser audit; unknown size.

---

## Tags
#session-26 #open #unpushed-4-commits #lin-redesign-complete #queue-temporal-transitions #queue-property-tests #queue-match-arm-expr-form #queue-switch-stmt-lin #queue-s22-parser-bug #s25-complete
