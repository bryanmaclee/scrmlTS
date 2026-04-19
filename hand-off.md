# scrmlTS — Session 28 Wrap

**Date opened:** 2026-04-19
**Date closed:** 2026-04-19 (single-day session)
**Previous:** `handOffs/hand-off-28.md` (S27 wrap, rotated in as S28 starting brief)
**Baseline entering S28:** 7,126 pass / 10 skip / 2 fail (26,187 expects / 309 files) at `75404a2`.
**Final at S28 close:** **7,183 pass / 10 skip / 2 fail** (26,415 expects / 315 files) at `a15cdb6`.

---

## 0. Close state

### S28 commits — 9 unpushed (sent to master via `needs:push`)
Tip: `a15cdb6`. Push coordination message dropped at `/home/bryan/scrmlMaster/handOffs/incoming/`.

### Uncommitted
- `docs/SEO-LAUNCH.md` — same untouched edit, 4 sessions running.

### Incoming
`handOffs/incoming/` empty (only `read/` archive).

### Cross-repo
scrmlTSPub retirement still pending at master since S25.

---

## 1. Session theme — "validation elision arc + the small wins parade"

S28 had two distinct phases. **Phase A** (commits 1–3, ~half the session): the user-queued static-elision deep-dive plus full implementation. **Phase B** (commits 4–9): a chain of clean small/medium wins riding on the warm context.

### S28 commit chain (origin)

| # | Commit | Scope |
|---|--------|-------|
| 1 | `01f5847` | spec(§51.5.2): clarify validation elision — side effects still run. Tightens normative text — "SHALL NOT emit a runtime guard" was ambiguous once §51.11 audit + §51.12 timers + §51.3.2 effects were ratified. New normative permits compile-time-baked `rule` field under elision. |
| 2 | `cb25aaa` | feat(§51.5.2): validation elision slice 1 — Cat 2.a/2.b. `classifyTransition` + `emitElidedTransition` for literal unit-variant RHS against unguarded wildcard rules. 22 tests. |
| 3 | `59b35a1` | feat(§51.5): validation elision slices 2–4 — payload + E-MACHINE-001 + --no-elide. Cat 2.d (payload literals via balanced-paren scanner), Cat 2.f (compile-time E-MACHINE-001 via module-level CGError collector drained by codegen index), `setNoElide()` / `SCRML_NO_ELIDE=1` env var for CI dual-mode. 17 new tests. |
| 4 | `17b8972` | fix(§51.3): parseMachineRules preserves multi-statement effect bodies. Replaces `raw.split(/[\n;]/)` with depth-tracking `splitRuleLines` so `{ @x = 1; @y = 2 }` stays one rule. 6 tests. |
| 5 | `fdb43f0` | fix(§14.4): parseEnumBody splits single-line payload variants on commas. `splitTopLevel(variantsSection, ["\n", ","])` so `{ Pending, Success(value: number), Failed(error: string) }` registers all three variants instead of zero. Closes the slice-2 runtime-E2E gap. 5 tests + 2 backfilled. |
| 6 | `2f3f95e` | feat(§51.13.1 phase 7): guarded projection-machine property tests. Mirrors phase 2's parametrization model — projection harness takes `guardResults` map keyed on rule label, generator emits one test per guarded rule + one terminal (unguarded fallback or `undefined` when all-guarded). Spec §51.13 + §51.13.1(d) updated. 8 tests. |
| 7 | `6c1dfe7` | feat(§51.14): E-REPLAY-003 — reject cross-machine replay at compile time. §51.14.6 non-goal lifted. Reverse map `auditTarget → machineName` lets the replay validator detect when log's owning machine ≠ target's machine. Synthetic-log replays still permitted. 3 tests (1 modified, 2 new). |
| 8 | `5c61438` | refactor: centralize user-fn extraction + fix bare-keyword gotcha. New `compiler/tests/helpers/extract-user-fns.js` replaces 8 duplicated regexes. Bare-word entries (`effect`, `lift`, `replay`, etc.) gain `(?!_\d)` negative lookahead so a user fn named `effect` no longer gets filtered as an internal helper. Doc note in `var-counter.ts`. |
| 9 | `a15cdb6` | fix(§19): scope-check error-arm handler bodies + bind caught-error. Pre-S28 the `guarded-expr` case never walked arm.handlerExpr through scope checking — undeclared identifiers in handlers compiled cleanly. Symmetric with propagate-expr's binding push. 6 tests. Closes S25-queued item. |

### §51.5 validation elision — closed end-to-end

The static-elision deep-dive
(`scrml-support/docs/deep-dives/machine-guard-static-elision-2026-04-19.md`)
ratified Approach C — **validation work is elidable, side-effect work is
spec-normative on every successful transition**. Implementation across 4
slices in a single session, plus the §51.5.2 spec amendment that
disambiguates the normative text.

Coverage today:
- Cat 2.a/2.b: literal unit-variant RHS against unguarded wildcard rule with no specific shadow → bare `_scrml_reactive_set` (or IIFE with side effects only).
- Cat 2.d: payload variants like `Shape.Circle(10)` — same gates, balanced-paren classifier accepts the call shape.
- Cat 2.f: trivially-illegal targets → compile-time `E-MACHINE-001` (picked up the §51.5.1 symmetric obligation).
- Slice 4: `setNoElide()` / env-var `SCRML_NO_ELIDE=1` for CI dual-mode parity. §51.5.1 illegal detection runs BEFORE the no-elide gate (normative correctness obligation, not a performance optimization).

Deferred (intentional):
- Cat 2.c self-assignment no-op
- Cat 2.e flow-sensitive `__prev` tracking (probably S30+, needs profiling data first)
- Cross-function elision via parameter typing
- Struct-machine cross-field invariant proof

### Adjacent fixes that surfaced during S28

| Bug | Surfaced | Fix |
|---|---|---|
| Multi-stmt effect bodies fragmented on `;` | S27 wrap noted | `splitRuleLines` with depth/string/comment tracking |
| Single-line payload enum registers zero variants | Slice-2 runtime test | `splitTopLevel` with `["\n", ","]` |
| Cross-machine replay silently nonsensical | §51.14.6 non-goal | Compile-time `E-REPLAY-003` |
| User fn named `effect` filtered as internal helper | S27 wrap noted | `(?!_\d)` lookahead in shared `extract-user-fns.js` |
| Error-arm handler body never scope-checked | S25 wrap noted | Per-arm scope-push w/ binding |

### Files touched

**Production code:**
- `compiler/SPEC.md` — §51.5.2 normative amendment, §51.13.1 phase-7 description, §51.14.6 non-goal narrowing
- `compiler/src/codegen/emit-machines.ts` — `classifyTransition`, `emitElidedTransition`, no-elide flag, machine-codegen error collector
- `compiler/src/codegen/emit-machine-property-tests.ts` — phase-7 projection harness rewrite
- `compiler/src/codegen/index.ts` — drain machine-codegen errors into the codegen errors list
- `compiler/src/codegen/var-counter.ts` — naming-convention doc note
- `compiler/src/type-system.ts` — `splitRuleLines`, payload enum comma-split, E-REPLAY-003, error-arm scope-push

**Tests:**
- `compiler/tests/helpers/extract-user-fns.js` — new shared helper
- `compiler/tests/unit/gauntlet-s28/elision-cat-2a-2b.test.js` — 22 tests
- `compiler/tests/unit/gauntlet-s28/elision-slice-2-3-4.test.js` — 17 tests
- `compiler/tests/unit/gauntlet-s28/multi-stmt-effect-body.test.js` — 6 tests
- `compiler/tests/unit/gauntlet-s28/payload-enum-comma-split.test.js` — 5 tests
- `compiler/tests/unit/gauntlet-s28/projection-guard-phase-7.test.js` — 8 tests
- `compiler/tests/unit/gauntlet-s28/error-arm-scope.test.js` — 6 tests
- 8 S27 test files refactored to use `extractUserFns`
- 3 S25 temporal tests retargeted (transition target validity now checked at compile time)
- 1 S26 phase-6 test retargeted (unlabeled vs labeled-guarded projection)
- 1 S27 cross-machine replay test flipped to assert E-REPLAY-003

---

## 2. Queued for S29 — **Next PA should be ready for deep work**

The remaining queue is no longer "small wins" territory. Each item below is a
medium-to-large arc that benefits from a fresh context window.

### Highest-priority deep arcs

1. **P3 self-host modernization.** The 2 pre-existing self-host fails
   (`Bootstrap L3` and `tab.js exists`) trace to source files in
   `compiler/self-host/` that haven't been kept current with scrml's
   evolving strictness. Build-self-host current state:
   - PASS: module-resolver, meta-checker, block-splitter, tokenizer
   - FAIL: body-pre-parser (3 errs, `trimmed` unclosed), ast-builder
     (47 errs, primarily `try/catch` not scrml + dynamic `import(URL)`
     pattern compiler mangles), protect-analyzer (38 errs, `!==`),
     route-inference (20 errs, `null` not scrml), type-system (116
     errs, mostly `null`), dependency-graph (20 errs, `visit` undeclared)

   Each module needs source modernization to match current scrml spec.
   Not a single-arc fix — sustained translation work. ast.scrml is the
   gnarliest because of the dynamic `await import(new URL(...).href)`
   pattern in the parseExprToNode fallback chain (lines 31-42); the
   compiler currently strips part of it producing malformed JS output
   (saw `.href)` fragment in the stale dist). Recommend: scope a single
   module first as a sample, decide whether the rest is mechanical
   translation or genuinely blocked on language-feature gaps.

2. **P5 ExprNode Phase 4d/Phase 5 — drop string fields.** Per master-list
   §267: 15 of 17 consumer files were converted to ExprNode-first with
   string fallback during S11. Remaining: component-expander.ts (needs
   structural matching) and body-pre-parser.ts (inherently string-based).
   Final step is to delete the legacy string expression fields from AST
   types — that's the structural refactor that retires the string-form
   surface. Risk: spread across many AST node types, broad blast radius.

3. **Lift Approach C Phase 2.** Phase 2c-lite landed S18 (dead BS+TAB
   reparse block removed); full Phase 2 involves `emitConsolidatedLift`
   refactor for fragmented bodies.

### Medium arcs (could fit in a normal session)

4. **§51.13 phase 8 — guarded projection runtime parity.** Phase 7 (S28)
   parametrized guard results for the test harness. A future phase could
   inject real reactive-state to evaluate guards directly. Explicitly
   deferred in S28 as "leapfrog of phase 2's input-synthesis deferral."
   Only worth tackling once a phase-2 input-synthesis story exists.

5. **`< machine for=Struct>` cross-field invariants.** Approach C from the
   2026-04-08 unification debate ratified `for Type` (broader than
   `for EnumType`). The implementation was deferred. Compile-time
   `E-MACHINE-005` paths and `self.field` references in guards are the
   touchpoints. Adjacent to phase-7 in feel.

### Carried small items (probably one-shot)

6. **Async loading stdlib helpers.**
7. **DQ-12 Phase B** — diagnostic quality work.

### Long-deferred design

- **Approach C lin** (cross-function `lin:out` / `lin:in`) — still deferred.

---

## 3. Important design decisions made this session

### Validation elision — Approach C (partial) is final

The radical-doubt deep-dive's SPARK hybrid is implemented. Key correction
to the framing: "elision" is misleading. **Validation work** (variant
extraction, matched-key resolution, throw construction) is elidable.
**Side-effect work** (commit + audit + timer + effect body) is normative
on every successful transition. The §51.5.2 spec amendment makes this
explicit; the implementation honors it.

### §51.5.1 illegal-detection runs BEFORE the no-elide gate

Discovered during slice-4 testing: if the no-elide flag returned
`unknown` from the very top of `classifyTransition`, the §51.5.1
illegal-detection would never fire under no-elide. That violates the
"normative obligation, not optimization" framing — illegal detection
must run regardless of debug knobs. The classifier now does illegal
detection first, then short-circuits to `unknown` for elision purposes
under no-elide. Tests cover both modes.

### E-REPLAY-003 implementation — structural, no entry-shape change

Could've added `machine: "M"` to every audit entry shape (breaking
§51.11.4 contract) or used existing machineRegistry to derive
`auditTarget → machineName` reverse map. Chose the latter. Synthetic
logs (not declared as any machine's audit target) still pass through
because the user is responsible for them.

### Phase 7 guard parametrization mirrors phase 2 (consistency over fidelity)

Surveyed 4 design options for phase-7 guarded projections. Picked
Option A — parametrize guard results, mirroring phase 2's transition-
guard treatment — over real reactive-state simulation (which would
leapfrog phase 2's input-synthesis deferral) and over alternatives
that either weakened the property test (structural-only) or generated
auto-test gaps (skip with comment). Same labeled-guards constraint
carries over.

### Bare-word internal-helper distinction — `_<digit>` is the marker

The `genVar` mangle convention is `_scrml_<safe>_<N>` where N is a
per-compile counter. The trailing `_<digit>` is the ONLY structural
marker that distinguishes a mangled user function from a bare-word
internal helper like `_scrml_effect`. Test filters that don't honor
this distinction will silently swallow user functions named after
internal helpers. Documented in `var-counter.ts`.

---

## 4. Test infrastructure state

- Test suite entry: `bun test compiler/tests/`.
- Pretest hook: `scripts/compile-test-samples.sh`.
- Suite at tip: **7,183 pass / 10 skip / 2 fail** / 26,415 expects / 315 files / ~5.5s.
- Dual-mode parity: same numbers under default and `SCRML_NO_ELIDE=1`.
- New gauntlet dir `compiler/tests/unit/gauntlet-s28/` (6 files, 64 tests).
- New shared helper `compiler/tests/helpers/extract-user-fns.js` — 8 test files use it.
- New CLI/env knob: `SCRML_NO_ELIDE=1` (slice-4).

---

## 5. Agents available

Same primary roster as S22–S27. `scrml-deep-dive` was used once this
session (the static-elision opener). No new agents staged.

---

## 6. Recommended S29 opening sequence

1. Check `handOffs/incoming/` — may have push-confirmation or scrmlTSPub-retirement updates from master.
2. Verify origin/main at the new tip after master pushes (was `a15cdb6` at session close).
3. **The remaining queue is deep work.** Open with intent: pick ONE deep arc and commit context to it. Don't try to slice a deep arc into "small wins" — the previous five sessions have already exhausted the small-wins surface around the machine cluster.
4. Top recommendation: **P3 self-host modernization**. It's the work that closes the 2 pre-existing fails that have been carried since S18. Suggested approach: (a) start with `body-pre-parser.scrml` (only 3 errors, smallest), (b) use it as a translation pattern, (c) move outward. ast.scrml is gnarliest — defer until last.
5. Alternative: **P5 Phase 4d-finish** if user prefers structural cleanup. Requires careful risk management (15 consumer files touched).
6. If user wants something visible to end-users instead of internal: **`< machine for=Struct>` cross-field invariants** (item 5 in queue).

---

## Tags
#session-28 #closed #all-pushed #spec-§51.5.2-amended #validation-elision-shipped #cat-2a #cat-2b #cat-2d #cat-2f #no-elide-flag #§51.13-phase-7-shipped #e-replay-003 #multi-stmt-effect-fix #payload-enum-comma-fix #error-arm-scope-push #extract-user-fns-helper #queue-p3-selfhost #queue-p5-phase-4d #queue-machine-for-struct
