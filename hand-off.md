# scrmlTS — Session 64 (CLOSE — substantial work landed across audit + 3 debates + B2 + 2 cleanups + SPEC §17.5 close + article + primer +11 amendments)

**Date opened:** 2026-05-06
**Date closed:** 2026-05-06 (same calendar day, very long session)
**Previous:** `handOffs/hand-off-63.md` (S63 — B1 LANDED + Stage 0c PLANNED + article-pair drafted + queued debate)
**This file:** rotates to `handOffs/hand-off-64.md` at S65 open

**Tests at close:** **8,941 / 44 / 1 / 0 / 8,986 / 440** (was 8,933 at S63 close; +13 net from B2's integration tests; -5 from Stage 0c.A's deleted unit tests; +5 from B2's other tests = +13 net; matches expectations).

---

## TL;DR — what landed in S64

This was a **very long session** with multiple parallel-running threads. Big-picture work:

| Thread | Outcome | HEAD (scrmlTS) |
|---|---|---|
| **Stage 0c.A function-overload deletion** | ✅ LANDED | commits `9d4c68f` → `82c6581` → `e1dd7a2` → `6507475` |
| **Phase 4d completion sweep** | ✅ LANDED (audit over-extrapolated 5→1 reactive kinds; survey corrected) | `578f6f5` → `cfe3988` → `efd87d1` |
| **Phase A1b Step B2 (E-NAME-COLLIDES-STATE)** | ✅ LANDED | `527461d` → `f12c116` → `0dee2f7` (depth-of-survey discount #6) |
| **SPEC §17.5 amendments** (S63 unbundle, then S64 close) | ✅ LANDED | `8bda55f` |
| **Forgotten-surface audit** | ✅ LANDED + acted-on | `07b4898` |
| **Top-3 + remaining-8 primer amendments** | ✅ LANDED | `07b4898` + `c8c8bb9` |
| **Debate-02 verdict (function-overload deletion confirmed)** | ✅ judged + actioned | scrml-support `03cfb57` |
| **Debate-03 verdict (component-overload SPEC track CLOSED)** | ✅ judged + actioned | scrml-support `761531d`, scrmlTS `8bda55f` |
| **Tier-ladder rungs+stability deep-dive** | ✅ landed | scrml-support `9123af6` |
| **Debate-04 verdict (switch hard-error per audit rec 5)** | ✅ judged + actioned | scrml-support `9123af6` |
| **Article amendments (component half: doc-only-not-deprecated)** | ✅ LANDED | `8bda55f` |
| **0c.F audit-doc updates** | ✅ LANDED | scrml-support `fec630f` |
| **SPEC §34: 4 missing error-code catalog entries** | ✅ LANDED | `112358d` |
| **`jsx-dispatch-expert` forge** | ✅ via PA Write (not git-tracked) | `~/.claude/agents/jsx-dispatch-expert.md` |
| **Tweet handle fix** | ✅ LANDED | `df7d6d4` |
| **Predicate-gaps inventory** | ✅ captured (option 1; no deep-dive) | scrml-support `9123af6` |
| **3 design-insight entries appended** | ✅ LANDED | scrml-support |

**Final commit count:** scrmlTS 13 commits; scrml-support 4 commits; total 17 commits across 2 repos. **All pushed at session close.**

---

## BIG DECISIONS RATIFIED THIS SESSION

### 1. Function-overload mechanism DELETED (Stage 0c.A landed)

Authorized by debate-02 verdict (4-deprecate-hard / 1-soft / 0-retain). Code surface: `emit-overloads.ts` (deleted), `buildOverloadRegistry`, `tagFunctionsWithStateType`, `FunctionDeclNode.stateTypeScope` field, 5 unit tests. 1 file deleted + 8 edited; tests dropped exactly -5 (the asserting unit tests); zero regressions. **HEAD `6507475`.**

### 2. Component-overload SPEC track CLOSED WITHOUT RESOLUTION (debate-03 verdict)

S64 forgotten-surface audit established that component-overloading was DOC-ONLY in SPEC; never implemented in compiler. Debate-03 (4-CLOSE / 2-DEFER / 0-DESIGN) confirmed close. **roc-expert EXPLICITLY RETRACTED their debate-02 carve-out**, calling it "a category error transposed across languages" — scrml's `<match for=Type>` is a structural element (markup-typed pattern matching), not a function-call site, dissolving the JSX-call-site asymmetry that grounded the carve-out. SPEC §18.0.1 explicitly authorizes structurally-different markup trees in match arm bodies (the empirical gate). SPEC §17.5 amended to record close. SPEC-ISSUE-010-COMPONENT closed.

### 3. Switch-stmt stays HARD-ERROR (debate-04 verdict — Approach A+)

Tier-ladder rungs+stability deep-dive recommended Approach C (sanction switch as Tier 0+ on-ramp). Bryan was skeptical: "I'm not entirely convinced." Fired debate-04 for adversarial scrutiny.

**3-of-3 unanimous Approach A** (the deep-dive's recommendation rejected):
- crystal-multi-dispatch (pro-sanction by design — VOTED AGAINST TYPE): synonym-not-sliver — switch and JS-style `match expr {}` are isomorphic; same-shape-different-syntax fails per-shape sliver test. 58 corpus files use the JS-style match form already.
- gingerbill: **string-switch trap** — the 174 `if=`-using files are over STRINGS, not enums. Sanctioning switch entrenches string-discriminator anti-pattern by giving it a comfortable home that BYPASSES the promotion lint (no enum exists for `W-SWITCH-PROMOTABLE` to point to).
- simplicity-defender: applied debate-02 per-shape sliver + debate-03 predicate-survival + debate-03 asymmetric-forfeit-cost; all three triangulated to A. Pillar #6 erosion ("provability falls out of whichever surface you happened to type") if synonyms ship.

**Verdict: Approach A+** (audit recommendation 5 honored as written, plus three constructive execution improvements):
- did-you-mean: match quickfix on E-SWITCH-FORBIDDEN
- W-LIFECYCLE-CANDIDATE tightening on `if=` over string-literal RHS values that match enum-tag lexical shape
- Document JS-style `match expr {}` form as canonical value-return rung in primer + tier-ladder-promotion article

**Tier ladder stays at 3 rungs. No Rung 0.5 or 1.5.**

### 4. Predicate expansion is ORTHOGONAL to tier-ladder/switch arc (Bryan's correction)

Mid-debate, Bryan flagged: "none of this discounts predicate expansion." Tier-ladder verdict + debate-04 outcome don't argue against any of the 17 predicate-vocabulary gaps. Captured as `scrml-support/docs/predicate-gaps-inventory-2026-05-06.md` (small/mid/structural buckets). NOT deep-dived; revisit when A1c surfaces real-app friction OR when SPEC-ISSUE-§53.13.1-4 gets touched.

### 5. Phase A1b Step B2 (E-NAME-COLLIDES-STATE) LANDED

First lock-firing step in A1b. Two-pass design within `symbol-table.ts` — PASS 1 (B1, unchanged) registers state-decls; PASS 2 (NEW) traverses for local-decl collisions using `_scope` annotations PASS 1 attached. Avoids forward-reference issues since state-decls hoist per SPEC §6.

**Surface much smaller than 4-6h estimate** — depth-of-survey discount #6 (~30 min impl vs 4-6h estimate). 5x. Audit recommendation #2 in compiler-forgotten-surface mitigation pattern continues to validate.

4 unrelated channel tests needed fixing — they used `messages = [...messages, ...]` inside server functions, which parses as `tilde-decl` and now correctly fires E-NAME-COLLIDES-STATE under B2. Replaced with neutral `return author` bodies.

**§S11D.5 .todo NOT promoted** — root cause is parser-level (BS produces 0 blocks for top-level Variant C compound). B1's absorption note correctly anticipated this; awaits parser dispatch (Step 11.0g or similar).

### 6. Phase 4d completion sweep LANDED — audit's reactive-* over-extrapolation corrected

Audit said "5 retired reactive-* AST kinds + walker arms across 10 src files." Survey of `ast-builder.js` proved only 1 was truly retired (`ReactiveDerivedDeclNode`); the other 4 (`reactive-debounced-decl`, `reactive-array-mutation`, `reactive-explicit-set`, `reactive-nested-assign`) are still actively constructed by the parser. Audit had over-extrapolated from a JSDoc tag that only existed on one kind. Agent corrected scope without confirmation — exactly the brief-locus correction authorization that the depth-of-survey discount methodology mandates.

19 deprecated string fields dropped (audit said ~32; partial sweep had landed earlier in S40). Walker arms not pruned because already done in S60.

### 7. Forgotten-surface audit landed — 11 primer amendments applied

5-bucket audit at `scrmlTS/docs/audits/compiler-forgotten-surface-2026-05-06.md`. Top findings:
- P0 SPEC §17.5 drift (function-overload was retired ahead of debate; component-overload UNDETERMINED — fixed S64)
- P1 Phase 4d completion sweep (largest cleanup-debt cluster)
- P1 Stage 0c.A function-overload deletion (clean surface map)
- 11 primer-amendment proposals (top 3 + remaining 8 ALL APPLIED in S64)

Primer amendments cover: pipeline bookends (`lint-ghost-patterns` pre-pass + `gauntlet-phase[1|3]` post-TAB walkers), retired-AST-kinds-still-walker-handled, SPEC.md ~410k token Read-budget reality, attribute-registry update requirement for new structural elements, `setBPPOverrides` self-host shim, open SPEC-ISSUE registry, schema-differ flow, legacy `<machine>` + migrate CLI, §13.5 NEW spec-real-estate-vs-adoption table.

### 8. SPEC §34 catalog: 4 missing error codes added

Audit found E-CTRL-011, E-META-EVAL-001, E-META-EVAL-002, E-SYNTAX-050 emitted in `compiler/src/` but absent from §34. Added with emit-site cross-references.

---

## DESIGN-INSIGHT contributions this session (4 entries appended to `scrml-support/design-insights.md`)

### Insight #1 (debate-02): "The sliver test is per-shape, not per-feature"

Function dispatch (logic-shaped, reducible to match) and component dispatch (markup-shaped, JSX-call-site-asymmetric) are different questions even when implementation lumps them. Future sliver investigations should treat "no pro-retain voice attempted construction" as a gap in the evidence, not as agreement. Convergent dissent across philosophically-spread experts is stronger signal than any individual vote.

### Insight #2 (debate-03): Structural-element-as-markup-value reframe

When a language elevates a control-flow construct from a statement to a structural element of the same kind as its existing first-class values, asymmetries that exist in source languages with statement-vs-expression dichotomies do NOT transfer. The roc-expert's explicit retraction of their own debate-02 carve-out is the load-bearing finding. **Future scrml language-design decisions that import asymmetry-shaped slivers from JS-shaped languages must first verify whether the asymmetry's predicate (statement-vs-expression position) survives scrml's structural-element-as-markup-value reframe; many will not.**

Plus: asymmetric-forfeit-cost decomposition for spec-direction questions on never-implemented features (CLOSE-and-wrong / DEFER-and-wrong / DESIGN-AND-SHIP-and-wrong); and convergent-dissent-INVERSION across consecutive debates as cross-debate signal (Roc + Crystal converged on debate-02 carve-out, split on debate-03 follow-through).

### Insight #3 (debate-04): Synonym-not-sliver + string-switch trap + pro-X-voting-against-X pattern

Three durable contributions:
- **Synonym-not-sliver:** when a candidate language surface is isomorphic to an existing one (same discriminator, same arity rules, same exhaustiveness against same type system), the candidate is a synonym, not a sliver — earns L7-violating-anti-pattern-status, not rung-status. Per-shape sliver test should include synonym-detection as a precondition.
- **String-switch trap:** when a sanctioned construct, used over the wrong discriminator type, BYPASSES the safety the language was meant to deliver, the sanction entrenches the anti-pattern by giving it a comfortable home. **A sanction earns its place only if the safety enforcement applies in the same shape as the sanction's permission.**
- **Pro-X-voice-voting-against-X pattern** (cross-debate signal — Roc in debate-03 + Crystal in debate-04, frequency-of-two qualifies as methodology-grade signal): when a panel's expert positioned to argue a position votes against that position after honest construction, the rejection is structurally stronger than any number of expected votes for it.

### Bonus methodology — three-test triangulation

Per-shape sliver test (debate-02) + predicate-survival check (debate-03) + asymmetric-forfeit-cost (debate-03) = three orthogonal axes. Convergence across orthogonal axes is structurally stronger than unanimous voting on a single axis. **For future scrml language-design decisions: when evaluating a contested option, run all three tests independently; if they triangulate, the verdict is decisively load-bearing; if they split, the question is genuinely undetermined and warrants further deep-dive.**

---

## A+ verdict execution items (carry-forward into S65 or later)

Per debate-04 verdict — three execution items NOT yet implemented:

1. **`did-you-mean: match` quickfix on E-SWITCH-FORBIDDEN** (formerly E-SYNTAX-052 territory). When the parser detects a `switch (...)` token, hard-error with helpful guidance. Scope: small dispatch (~1-2h). Couples with audit recommendation #5 (try/throw/switch hard-error diagnostic). Replaces the audit's "P1 v0.2.0" recommendation row.
2. **W-LIFECYCLE-CANDIDATE tightening** — fire harder on `if=` over string-literal RHS values that match enum-tag lexical shape. Scope: ~1h. Already-existing lint; just tightening predicate.
3. **Document JS-style `match expr {}` as canonical value-return rung** in primer §1 (tier ladder) + `docs/articles/tier-ladder-promotion-devto-2026-05-04.md` (article body). Currently invisible — described as "two match shapes coexist" but not framed as a tier surface. The discoverability fix that addresses the deep-dive's diagnosis (devs not reaching `<match for=Type>`) without adding language surface.

These three together are the constructive part of A+; can be a single small dispatch (~3-5h total).

---

## Open questions to surface immediately at S65 open

1. **B3 dispatch readiness.** B2 landed cleanly. B3 (`@name` resolution — bare-`@`-prefix in expression position resolves to state cell; record resolved-target on the ExprNode) is the next A1b step. Estimate per A1b plan: 4-6h focused (could be smaller per depth-of-survey-discount pattern). Powers B5+.

2. **A+ verdict execution** — should the three execution items above (did-you-mean / W-LIFECYCLE / doc-JS-match-style) land as a small dispatch, or fold into B3+ work, or defer until A1c?

3. **Article publishing** — the deprecation article gate is now LIFTED (debate-03 + debate-04 ratified the claim it makes). Tier-ladder is independent. Both still `published: false` waiting on Bryan's call. The article was amended this session to reflect:
   - Function-overload: code DELETED (was: "deprecated for v0.2.0")
   - Component-overload: was DOC-ONLY in SPEC, never implemented (was: implied parity with function-overload)
   - Article preserves Bryan's voice throughout (4 surgical edits)

4. **Predicate expansion thread** — captured at `scrml-support/docs/predicate-gaps-inventory-2026-05-06.md` per Bryan's option (1). Revisit when A1c surfaces real-app friction OR when SPEC-ISSUE-§53.13.1-4 gets touched OR when a real adopter reports `reqIf` as a blocker.

5. **§S11D.5 .todo promotion** — still NOT promoted per B2 finding. Root cause is parser-level (BS produces 0 blocks for top-level Variant C compound). Awaits Step 11.0g or similar parser dispatch.

6. **Depth-of-survey-discount counter is now 6** — primer §12 mitigation pattern. Up from 5 at S59 close. Pattern continues to fire reliably; PA can trust survey-first methodology heavily for any audit that estimates "new infrastructure needed."

7. **Carry-forward from S62/S63 unresolved set:**
   - Article truthfulness audit dispositions (15 articles, S59 carry-forward)
   - scrml.dev v0.2.0 announce refresh (could now lead with B1 + B2 landed + Stage 0c.A complete + scrml-not-superset)
   - 6 KEEP-RECENT-LANDED dirs deref (PA recommended hold until S65; now eligible after this large session)
   - Maps refresh root cause investigation (S61 issue still open)
   - Tier-ladder em-dashes decision (deferred or clean for tonal consistency — author's call)

---

## Things S65 PA needs to NOT screw up

Augments S62/S63 standing list (1-34). New S64 additions:

35. **Switch-stmt is HARD-ERROR per audit rec 5 + debate-04 A+ verdict.** Don't let any agent or future sketch sanction it as Tier 0+ on-ramp. The synonym-not-sliver finding is locked.

36. **Try-stmt + Throw-stmt stay HARD-ERROR alongside switch-stmt.** Audit rec 5 stands as a coherent group rejection of JS-statement-shape constructs. Don't split off any of the three.

37. **Component-overload is CLOSED WITHOUT RESOLUTION.** SPEC-ISSUE-010-COMPONENT closed; do not re-open without new render-shape evidence from authored apps. SPEC §17.5 records this.

38. **Tier ladder stays at 3 rungs (Tier 0/1/2).** No Rung 0.5 or 1.5. The deep-dive's 6-rung sketch is dissolved by debate-04. Don't let any agent re-propose this without new corpus evidence.

39. **The `match expr {}` JS-style form IS the canonical value-return rung** (per A+ verdict). Currently undocumented as a tier; the doc fix is queued. PA dispatching tier-ladder-related work should treat this form as first-class, not "two shapes coexist."

40. **String-switch trap is now part of the methodology stack.** Apply alongside per-shape sliver test, predicate-survival check, asymmetric-forfeit-cost. **A sanction earns its place only if safety enforcement applies in the same shape as the sanction's permission.** Test against any future feature proposal.

41. **`jsx-dispatch-expert` agent is at `~/.claude/agents/jsx-dispatch-expert.md`** (forged S64). NOT git-tracked. Available at NEXT session start (mid-session forging required `general-purpose` workaround in this session). Available agents post-S65: 45 total.

42. **B2's two-pass `symbol-table.ts` design is load-bearing for B3+.** PASS 1 registers state-decls; PASS 2 walks for local-decl collisions using `_scope` annotations attached by PASS 1. B3 should follow same pattern (additive PASS for `@name` resolution).

43. **Worktree-isolation harness has a routing bug** — pipeline dispatched with `isolation: "worktree"` may route to scrml-support worktree instead of scrmlTS. Pattern surfaced S64 + recovered via re-dispatch as `general-purpose` no-isolation with frequent commits. Successful in Stage 0c.A + Phase 4d + B2. **Until harness fix lands, prefer `general-purpose` no-isolation for compiler-source dispatches with strong incremental-commit instructions.**

44. **Predicate expansion is ORTHOGONAL to tier-ladder/switch — captured at `scrml-support/docs/predicate-gaps-inventory-2026-05-06.md`.** Bryan correction: "none of this discounts predicate expansion." Don't conflate.

45. **scrml-support push protocol confirmed clean.** Both repos pushed at S64 close (scrmlTS HEAD `0dee2f7`; scrml-support HEAD `9123af6`). Cross-machine sync hygiene: any divergence at S65 open should be investigated before work.

46. **debate-curator + scrml-deep-dive can't dispatch sub-agents** (their tool sets exclude Agent). PA must orchestrate panels directly via parallel Agent dispatches (the pattern used for debate-02, debate-03, debate-04). Brief draft → fire 5-7 experts in parallel → write transcript → fire judge.

47. **Design-insights.md write-truncation hazard.** S64 judge-agent inadvertently truncated 1367 lines down to ~70 via Write call. Recovered via `git stash` (working tree was clean). **For large-file appends, always use Edit (not Write) and verify Read-before-Edit succeeded.**

---

## State as of S64 close (verified at wrap)

| Field | Value |
|---|---|
| scrmlTS HEAD (post-wrap) | `0dee2f7` (B2 finalize) |
| scrmlTS origin sync | clean post-push (0 ahead / 0 behind) |
| scrml-support HEAD (post-wrap) | `9123af6` (S64 design-arc commit) |
| scrml-support origin sync | clean post-push (0 ahead / 0 behind) |
| Tests | **8,941 / 44 / 1 / 0 / 8,986 / 440** (full suite, browser included) |
| Working tree (both repos) | clean post-wrap |
| Inbox | empty |
| Active agents (post-S64) | 45 (44 at S63 + jsx-dispatch-expert forged S64) |
| Permissions whitelist | unchanged |
| Depth-of-survey-discount counter | 6 (was 5 at S59) |
| Design insights count (since 2026-03-22) | 30+ entries (debate-02/03/04 + tier-ladder methodology + predicate-survival + per-shape-sliver-refinement + string-switch trap + pro-X-voting-against-X) |

### File-modification inventory (this session — for cherry-pick / forensic review)

**scrmlTS commits (13 from session-open `df7d6d4`):**
1. `07b4898` — SPEC §17.5 unbundle + primer top-3 amendments + forgotten-surface audit (foundation pass)
2. `c8c8bb9` — primer amendments 5.1-5.11 from forgotten-surface audit
3. `9d4c68f` — Stage 0c.A WIP: delete emit-overloads codegen surface
4. `82c6581` — Stage 0c.A WIP: delete buildOverloadRegistry from type-system + unit tests
5. `e1dd7a2` — Stage 0c.A WIP: delete tagFunctionsWithStateType + stateTypeScope field
6. `6507475` — Stage 0c.A finalize: progress.md
7. `df7d6d4` — tweet handle fix (terminal_shop → terminaldotshop)
8. `578f6f5` — Phase 4d WIP: drop @deprecated Phase 4d string fields from ast.ts
9. `cfe3988` — Phase 4d WIP: drop retired reactive-derived-decl AST kind interface
10. `efd87d1` — Phase 4d finalize: primer §12 + progress log
11. `8bda55f` — debate-03 consequences: SPEC §17.5 close + article + A1c plan
12. `527461d` — A1b Step B2 WIP: scaffold progress.md + survey findings
13. `f12c116` — A1b Step B2 WIP: fire E-NAME-COLLIDES-STATE on local-decl shadowing state-cell name
14. `112358d` — SPEC §34: 4 missing error codes (folded in Chunk 3 B2 tests by accident — content correct, message cosmetically misleading)
15. `0dee2f7` — A1b Step B2 finalize: progress.md with chunk 3 + chunk 4 findings

**scrml-support commits (4 from session-open `7035db1`):**
1. `03cfb57` — debate-02 transcript + design-insight (function-overload deletion)
2. `761531d` — debate-03 transcript + design-insight (component-overload CLOSE)
3. `fec630f` — 0c.F audit-doc updates: overload closure notes refreshed
4. `9123af6` — tier-ladder deep-dive + debate-04 transcript + insight + predicate-gaps inventory

**Global (not git-tracked):**
- `~/.claude/agents/jsx-dispatch-expert.md` — NEW (forged S64; ~870 lines, color magenta, model opus, tools [Read]). Available next-session.

**Articles (scrmlTS, both `published: false`):**
- `docs/articles/why-scrml-has-to-deprecate-function-and-component-overloading-devto-2026-05-06.md` — 4 surgical edits (component-half framing: deprecated → closed-as-doc-only). Bryan's voice preserved throughout.
- `docs/articles/tier-ladder-promotion-devto-2026-05-04.md` — UNCHANGED this session. Awaits A+ verdict execution (document JS-style `match expr {}` as canonical value-return rung).

---

## Cross-references

- **S63 close ledger (this rotation):** `handOffs/hand-off-63.md`
- **S64 working ledger (this file becomes):** `handOffs/hand-off-64.md` at S65 open
- **PA scrml expert primer (READ FIRST every session):** `docs/PA-SCRML-PRIMER.md` (last updated S64)
- **PA directives:** `pa.md`
- **Master-list dashboard (live progress):** `master-list.md` §0
- **A1b RATIFIED plan:** `docs/changes/phase-a1b-resolve-type/SCOPE-AND-DECOMPOSITION.md`
- **A1c RATIFIED plan + Stage 0c amendment (S64):** `docs/changes/phase-a1c-codegen/SCOPE-AND-DECOMPOSITION.md` §4.-1 (0c.A LANDED, 0c.B-D REMOVED, 0c.E LANDED, 0c.F LANDED)
- **A1a final state:** `docs/changes/phase-a1a-lex-parse/AST-CONTRACTS-AND-DECOMPOSITION.md`
- **B1 brief + progress (S62/S63):** `docs/changes/phase-a1b-step-b1-symbol-table-extension/`
- **B2 brief + progress (S64):** `docs/changes/phase-a1b-step-b2-name-collides-state/progress.md`
- **Stage 0c.A progress:** `docs/changes/stage-0c.a-overload-deletion/progress.md`
- **Phase 4d progress:** `docs/changes/phase-4d-completion-sweep/progress.md`
- **Forgotten-surface audit (S64):** `docs/audits/compiler-forgotten-surface-2026-05-06.md`
- **Deprecation article:** `docs/articles/why-scrml-has-to-deprecate-function-and-component-overloading-devto-2026-05-06.md`
- **Companion article:** `docs/articles/tier-ladder-promotion-devto-2026-05-04.md`
- **Debate-02 transcript:** `../scrml-support/docs/debates/debate-02-state-type-overload-deletion-2026-05-06.md`
- **Debate-03 transcript:** `../scrml-support/docs/debates/debate-03-component-overload-decision-2026-05-06.md`
- **Debate-04 transcript:** `../scrml-support/docs/debates/debate-04-switch-as-tier-0-plus-2026-05-06.md`
- **Tier-ladder deep-dive:** `../scrml-support/docs/deep-dives/tier-ladder-rungs-stability-2026-05-06.md`
- **Predicate-gaps inventory:** `../scrml-support/docs/predicate-gaps-inventory-2026-05-06.md`
- **Design insights:** `../scrml-support/design-insights.md`

---

## Tags

#session-64 #close #stage-0c-a-landed #b2-landed #phase-4d-landed #debate-02-judged #debate-03-judged #debate-04-judged #tier-ladder-deep-dive-landed #spec-17-5-closed #spec-issue-010-component-closed #11-primer-amendments #spec-34-catalog-additions #forgotten-surface-audit #depth-of-survey-discount-6 #synonym-not-sliver #string-switch-trap #pro-x-voting-against-x #predicate-gaps-captured-not-deep-dived #methodology-stack-triangulation #jsx-dispatch-expert-forged
