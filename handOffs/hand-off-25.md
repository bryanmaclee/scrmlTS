# scrmlTS — Session 25 Hand-Off

**Date opens:** TBD (whenever S25 starts)
**Previous:** `handOffs/hand-off-24.md`
**Baseline at S24 wrap:** **6,949 pass / 10 skip / 2 fail** (25,619 expects across 284 files) at commit `c5e41b3`.

---

## 0. Cold-start state

### Pushed this session (all on origin/main)

**Batch 1 (7 commits, push authorized one-time):**
- `d2bee47` — `docs(§4.11.4, §51.3.2)`: ratify machine cohesion. `given` stays (static-predicate keyword distinct from runtime `if`); opener migration to attribute form queued, not yet executed.
- `c1d71dd` — `fix(§2c)`: match subject narrowing for local `let`/`const` + function param annotations. Unblocks enum-heavy code.
- `9da03a7` — `fix(§2g)`: extension-less relative imports resolve to `.scrml`.
- `4f72a45` — `fix(§2f)`: in-enum transitions variant-ref whitespace trim.
- `e377223` — `fix(§2d)`: DG credits every @var ref in compound `if=(...)` attribute expressions.
- `ccfc0c0` — `fix(§2e)`: DG credits @var refs inside runtime `^{}` meta html-fragment content.
- `83cc571` — `examples,docs`: drop match-narrowing workaround + showcase `fn` in Mario (§48 pure form, `fn riskBanner(risk: HealthRisk) -> string`).

**Batch 2 (8 commits, push authorized one-time):**
- `9e06884` — `feat(§2a)`: E-SCOPE-001 on undeclared idents in let/const initializers. Includes infrastructure: global allowlist (JS/DOM/scrml-meta builtins), export-decl pre-bind for intra-file forward references.
- `234f116` — `feat(§2a)`: extend E-SCOPE-001 to reactive-decl initializers.
- `e1e21a5` — `feat(§2a)`: loop-scope plumbing (for-stmt / while-stmt / do-while-stmt push scope + bind counter) + if-stmt condition + return-stmt + match-subject + propagate-expr coverage.
- `ec26c63` — `feat(§2a)`: extend to lin-decl / tilde-decl / reactive-derived-decl inits.
- `740de7d` — `feat(§2a)`: extend to reactive-nested-assign RHS + reactive-array-mutation args.
- `a758fe1` — `feat(§2a)`: extend to throw-stmt / fail-expr / reactive-debounced-decl / value-lift.
- `bb01644` — `feat(§2a)`: bare-expr statements + two supporting fixes: removed visitLogicNode short-circuit that was skipping bare-expr entirely; made the AST builder accept the alternate `type:enum Name {...}` form so self-host's tab.scrml populates typeRegistry correctly.

**Batch 3 (1 commit, not yet pushed):**
- `c5e41b3` — `feat(§51.11)`: `audit @varName` clause on `< machine>` for replay/time-travel. Emits `{from, to, at}` entries to the named reactive on every successful transition. Bonus fix: machine transition guards now fire for function-body reassignments (were silently bypassed due to hardcoded `isInit = true` in emit-logic's reactive-decl case).

**Suite trajectory:** 6,889 → 6,949 pass (+60). Zero net regressions. Same 2 pre-existing self-host fails.

### Cross-repo state

- **scrml-support**: check `git status` at S25 start — S21/S23 archive pending from earlier hand-offs still.
- **Message to master re scrmlTSPub retirement:** dropped 2026-04-17-1804. If master hasn't acted, consider prodding.

### Incoming messages

- `handOffs/incoming/`: empty (only `read/` archive).

### Repo publicity

Public MIT since end of S22. Unchanged.

### scrmlTSPub status

Retirement message sent to master (2026-04-17-1804). Waiting on master to
replace README / archive GitHub repo. Not our PA's work.

---

## 1. S24 session summary

### Work done

- **Radical-doubt debate on machine cohesion.** User flagged that the `< machine>` opener had drifted into sentence-structure form while every other state opener uses attribute syntax. Ran debate-curator; HYBRID verdict: opener migrates to attribute form (bareword-ident values, not strings), `given` guard keyword stays (preserves static-analysis lane committed in 2026-04-08 machine/contract unification). Ratified in SPEC §4.11.4 + §51.3.2 amendment-queued note; migration execution deferred.

- **§2c match subject narrowing.** Both local `let p: T = ...` inside function bodies AND function parameter type annotations now carry through to match subject resolution. Unblocks enum-heavy code written by new users — Mario and tutorial §2.4 both used a typed-reactive + wrapper workaround that's no longer needed.

- **Four S20-era cleanup items (§2d/e/f/g).** All shipped with tests. Extension-less imports, in-enum transition whitespace trim, compound `if=` DG credit, runtime-meta html-fragment DG credit.

- **§2a E-SCOPE-001 in logic blocks.** Seven progressive slices covering every AST node kind with a walkable ExprNode field: let/const, reactive-decl, reactive-derived-decl, reactive-debounced-decl, lin-decl, tilde-decl, propagate-expr, if-stmt condition, match-subject, return-stmt, throw-stmt, fail-expr, value-lift, reactive-nested-assign, reactive-array-mutation, bare-expr. Loop-scope plumbing (for-stmt / while-stmt) added to support the coverage. 35 new tests in gauntlet-s24.

- **§51.11 audit clause.** Opt-in per-machine transition audit log, per §2b G from machine-cluster-expressiveness deep-dive. Spec + parser + codegen + tests. E-MACHINE-019 for undeclared / duplicate targets. Bonus fix: machine transition guards now actually fire for function-body reassignments — silent bypass existed prior to this session.

### Process notes

- User flagged language cohesion drift across PA sessions. Saved as feedback memory (feedback_language_cohesion.md). Every syntax proposal now checks against how the same concept reads elsewhere in the language.
- Located and re-documented the lin-redesign work: deep-dive done 2026-04-13 (Approach B ratified), spec amendments drafted. Updated project memory; not a "run deep-dive + debate" queue item anymore — it's an "execute implementation" queue item.

### Incidental discoveries (not fixed this session)

- **Pre-existing parser bug (S22 §6):** statement-boundary detection between an untyped `@x = ...` reactive-decl and a typed `@y: M = ...` reactive-decl in the same `${}` block drops the typed one. Workaround: declare typed reactives BEFORE untyped ones, or use separate `${}` blocks. Hit this in the audit-clause test fixtures; worked around. Real fix is a body-pre-parser audit — queued for §5-era backlog.
- **Effect-block emission for non-guarded rules:** `emitTransitionGuard` filters effect rules through the `guardRules` subset, so a rule with an effect block but no `given` guard doesn't emit its effect. Pre-existing. One audit-clause test reshaped to use `given (true) + audit` rather than `{effect} + audit` to sidestep. Queued.

---

## 2. Queued for S25

### §2a remaining (deferred, infrastructural blockers)

- **match-arm body scope.** The AST builder collapses match arms into a single bare-expr escape-hatch string. Needs ast-builder change to produce structured match-arm nodes with pattern + body before the scope walker can fire inside arm bodies. Preparatory work on its own — 30-60 min to structure arms, then coverage is a small slice on top.
- **switch-stmt body.** Similar shape — probably the same AST-builder issue.
- **error-arm `!{}` bindings.** Haven't audited. The caught-error binding needs scope-push before the arm body walks.

### §2b deep-dive followups

- **C — temporal transitions** (`.Loading after 30s => .TimedOut`). Grammar addition + runtime layer on top of §6.7.8 `< timeout>`. Open question to resolve before the spec amendment: on re-entry to `From` during the timer window, does the clock reset or is it cumulative? Default recommendation per deep-dive: **reset** (matches XState).
- **F — auto-generated property tests** from machine decls. Compile-time `~{}` suite emission behind `--emit-machine-tests` flag. No grammar change. Medium complexity.

### §2h lin redesign — IMPLEMENTATION (deep-dive is DONE)

Updated project memory reflects the actual state:
- Deep-dive at `scrml-support/docs/deep-dives/lin-discontinuous-scoping-2026-04-13.md` — Approach B ratified (same-file cross-block hoisting to common-ancestor scope).
- Draft SPEC amendments ready (§35.1, §35.2, new §35.2.2, E-LIN-005, E-LIN-006).
- AST-wiring companion deep-dive at `scrml-support/docs/deep-dives/lin-enforcement-ast-wiring-2026-04-11.md` — prerequisite.
- Formal debate NOT needed unless user now wants Approach C (cross-function teleportation).
- Multi-session implementation scope when user prioritizes it.

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

### Known compiler bugs documented-but-unfixed

1. **Pre-existing parser bug (S22 §6):** untyped-then-typed reactive-decl statement-boundary drops the typed decl.
2. **Effect-block emission for non-guarded rules:** surfaces only when a rule has `{effect}` but no `given`. Fixing requires passing all rules (not just guarded) through the effect-emit path in `emit-machines.ts:emitTransitionGuard`.
3. **Machine opener attribute-form migration** — ratified, deferred. Will land alongside the next §51 amendment (temporal transitions / property tests would be natural carriers).

### Unpushed at S25 start

- `c5e41b3` (§51.11 audit clause). Push was authorized per-commit this session; S25 needs either another one-time auth or queue through master.

---

## 3. Test infrastructure notes

- Test suite entry: `bun test compiler/tests/`.
- Pretest hook: `scripts/compile-test-samples.sh`.
- New gauntlet dir: `compiler/tests/unit/gauntlet-s24/` — contains:
  - `match-type-narrowing.test.js` (§2c, 6 tests)
  - `machine-in-enum-transitions.test.js` (§2f, 3 tests)
  - `dg-compound-if-attr.test.js` (§2d, 4 tests)
  - `dg-runtime-meta-html-fragment.test.js` (§2e, 3 tests)
  - `scope-001-logic-expr.test.js` (§2a, 35 tests — the big one)
  - `machine-audit-clause.test.js` (§51.11, 6 tests)
- Suite at tip: 6,949 pass / 10 skip / 2 fail / 25,619 expects / 284 files / ~4.7s.

---

## 4. Agents available

Same primary roster as S22/S23/S24. No staging needed.

---

## 5. Recommended S25 opening sequence

1. Check `handOffs/incoming/` for messages. Master may have acted on the scrmlTSPub retirement; if so, archive the read message.
2. Push the unpushed `c5e41b3` (§51.11 audit clause) via one-time auth.
3. Decide next priority. Options, roughly by impact:
   - **§2h lin redesign implementation** — the big outstanding user vision item, multi-session scope. Deep-dive and spec amendments are ready to apply.
   - **§2b C temporal transitions** — small grammar addition, natural carrier for the deferred machine-opener migration (ratify + execute in the same commit).
   - **§2b F auto-property-tests** — compile-time test-gen, "machine = enforced spec," largest debuggability unlock per transition written.
   - **match-arm body AST restructuring** — unblocks remaining §2a coverage. Preparatory.
   - Fix the two small pre-existing bugs surfaced in S24 (statement-boundary, effect-without-guard).

---

## Tags
#session-25 #open #unpushed-c5e41b3 #queue-lin-redesign #queue-temporal-transitions #queue-property-tests #queue-match-arm-ast-restructure #s24-complete
