# scrmlTS — Session 166 (CLOSE)

**Date:** 2026-06-06
**Previous:** `handOffs/hand-off-170.md` (= S165 CLOSE).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-171.md` at next OPEN.
**Profile:** opened **A (FULL)** ("read pa.md and start session"; default A).

## 🏁 S166 CLOSE — data-model axiom arc (deep-dive + debate) + 2 native-parser fixes shipped + a HIGH default-pipeline bug filed · WRAP

A DESIGN-HEAVY session. Opened as a native-parser-swap grind (re-triage → 2 fixes landed), then the user pivoted to a foundational data-model interrogation ("is scrml its own value language or JS leaking through the cracks") that produced a deep-dive + a debate + a cluster of durable axiom ratifications, and surfaced the **JS-host-boundary** as the next foundation. Full suite green; HIGH 0→1 (a real bug filed, not a regression).

---

## SYNC / REPO STATE AT CLOSE
- **scrmlTS:** HEAD `9d12d980` + the wrap commits (this wrap). Coherence verified each landing.
- **scrml-support:** banks written (user-voice + design-insights + deep-dive + debate docs) — committed this wrap.
- **PUSH:** see "Open questions" — surfaced, awaiting authorization (user said "wrap here", did NOT say push).
- **Version:** on v0.7.0 (native parity-closers shadow-only; default output unchanged; no tag, no cross-repo notice).
- **Tests:** full suite green at each landing (bare-function commit `76059024` post-commit gate PASS; ROOT-2 `9d12d980` post-commit gate PASS); within-node **1005/0**.
- **known-gaps:** **HIGH 0→1** (new bug, filed) · MED 9 (+ the function-field-asIs gap, see below) · LOW 16.
- **Worktrees:** see 6b — the 2 dispatch worktrees (bare-function `a902a67a`, cross-file `a48bf500`) cleaned at wrap.
- **Maps:** refreshed to `9d12d980` (wrap step 6c — the NEW directive this session).

## SHIPPED THIS SESSION (native-parser-swap, both pushed earlier or this wrap)
1. **`76059024` bare-`function name()! -> Err` failable recognition** (re-triage #1) — native `parseFunctionDecl` now consumes the trailing `!`/error-type (ported from the proven `parseScrmlFunctionDecl` block) + threads the 7th-arg modifiers. Clean single root, ~31-file blast radius. PA-independent verified. within-node 1005→991→1005 (27-budget residual-preserving rebump on 14 failable fixtures — convergence, not masking; a small MISSING-FIELD+11/EXTRA+8/KIND+4 concentrated on examples/09-error-handling is native field-synthesis incompleteness on NOW-PARSED failable-body nodes, banked). **Flip 451→446 (−5)** — parse-then-downstream: the fix cleared browser-error-boundary 10→1 at parse but EXPOSED a native failable-CODEGEN family (empty `fail X::V(arg)` envelope + arm-body emission) that ate most of the flip gain. **Methodology banked: re-triage estCount = parse-fail count, NOT flip-clear; a parse fix can expose downstream codegen gaps.**
2. **`9d12d980` cross-file `export` raw-slice fix** (re-triage #2 ROOT-2) — `synthExportDecl` anchors the raw slice to `block.bodyStart` (not `span.start`) for `${...}`-wrapped exports (off-by-opener class, like M6.7-C1). E-COMPONENT-020/035 GONE; FX-2 30-test fixture cleared; within-node 1005/0 (NO rebump — resolved via a STRIP_KEY, not a budget bump). PA-independent native probe verified (`<Badge/>` expands, node --check clean). **ROOT-1 (exported inner-decl reaching codegen) agent-reverted + DEFERRED** — its emit-fix worked but surfaced a 58-fixture within-node divergence needing 2 prereqs (deep-shift promoted spans by bodyStart + the native FunctionDecl **trailing-match-as-return + return-type-annotation drop**, which reproduces on NON-exported fns too — a separate native gap; see below).

## RE-TRIAGE (S166) — `docs/changes/native-swap-retriage-s166/TRIAGE.md`
Re-triaged the 451 flip-fails (6 parallel surveys). Corrected a measurement flaw: `bug-k-sync-effect-throw` (24, top of the stack-trace grep) is a MISLABEL — that test never routes through the parser; console.error noise inflated the file-ranking. The 5 real families: bare-function-failable (DONE), cross-file (ROOT-2 DONE), render-by-tag Shape-2 (~17, L), r24-bug-31/if-as-expr (~17, 3 roots), engine-opener-effect (~12, 3 roots incl. the broad block-body translateLambdaBody stub). Authoritative family map for the next swap-grind pickup.

## 🔑 THE DATA-MODEL AXIOM ARC (the session's substance)
Trigger: user questioned the native-parser ROI + caught `Object.freeze` in the native-parser `.scrml` mirrors → opened "scrml has structs, not objects/methods; cyclic refs are vestigial OOP; I'm looking at it a different way."

**Deep-dive:** `scrml-support/docs/deep-dives/scrml-data-model-value-vs-object-2026-06-05.md` (status in-progress). REFUTED the PA's initial "cycles structurally unconstructable" claim — cycles ARE constructible today via (1) `@arr[0] = @arr` bracket-write in-place mutation (spec divergence; §6.5.1 mandates COW; root ast-builder.js:5455) + (2) the Appendix-D JS-host hatch; both crash downstream (JSON.stringify throws; `_scrml_structural_eq` stack-overflows — no cycle guard). But the corpus CONVERGES on value-data (no-null S89, ==-structural/no-===, immutable-arrays DQ-2, V5-value-cells; §45.6 forbids identity-operator as a leak; Elm/Roc lineage).

**Debate:** `scrml-support/docs/debates/two-layer-exemption-2026-06-06.md` — P3 (dated enforce-down bridge) won 47-42-34. P1's correction: the "12k-line rewrite" is a strawman — the real identity surface is ~14 classes (8 are §19.3 error-records) + 3 genuine-identity sites (the Scope/ScopeChain parent-pointer tree). Dissent (live): Elm-compiler-is-Haskell / Roc-compiler-is-Rust chose PERMANENT host-language compilers — P3 bets S89 overrides that.

### RATIFIED (durable; banked to user-voice S166 + design-insights):
- **cycles → FORBID + make acyclic true** — fix the bracket-write in-place leak (route `@arr[i]=x` through COW, §6.5.1-conformant) + reject-on-cycle barrier at JS-host cell-assignment + a defensive seen-set guard in `_scrml_structural_eq`. (User's explicit cycles call — first ruling on value-cycles.)
- **class / this / new → OUT** of adopter source (Part A: SPEC-side, decoupled from the self-host, lands when built).
- **value-native self-host IS the goal** (S89 stands; P3 over P2; Elm/Roc permanent-host-compiler model explicitly rejected). Resolves the session-opening "is the native parser getting anywhere" doubt: the effort is strategically real (path to the value-native showcase), BUT the current `.scrml` mirrors (Object.freeze/class/this JS-transliterations) are NOT the showcase and must become value-native by the milestone.
- **two-layer exemption = P3 dated enforce-down bridge** — class/this/new JS-host-exempt in `compiler/self-host/*.scrml` THROUGH **milestone v1.0.0 (the rewrite GATES v1.0.0)**, tracked by a shrink-only allowlist + CI gate + `W-`/reserved-`E-HOST-IDENTITY-SCAFFOLD` lint; NOT a W-*-LEGACY deprecation (no canonical target → hand-migration). Sequenced AFTER the data-model primitives harden.
- **milestone → v1.0.0 gate** (the value-native self-host rewrite gates v1.0.0).

### REOPENED / corrigendum:
- **Map / Set → NOT a settled keep.** User flagged their own "keep" as familiarity-bias, not a principled warrant. Folds into the JS-host-boundary deep-dive. PA frame: Map = genuine capability gap (runtime-keyed dictionary; structs are fixed-shape); Set = thinner (membership + set-algebra, array+helpers approximate). If kept → raw JS vs scrml-native value-semantics collection types.

### OPEN — each its own deliberation (NOT batch-ratifiable; memory `feedback_no_batch_ratify_foundational_axioms` banked this session):
- **★ THE JS-HOST-BOUNDARY FOUNDATION (next deep-dive, unifying axiom):** does an adopter EVER write raw JS (`Object`/`Math`/`Date`/Map/Set), or does scrml present a complete value-native vocabulary + hide the host? Empirical: adopters write `Object.*` ZERO times (0 in examples, 0 in kickstarter); only stdlib internals + the native-parser scaffold do, and `scrml:data` already ships the value-native equivalents (mapKeys/pick/omit/deepMerge/groupBy…). Appendix-D (the ambient raw-JS-globals whitelist, no import — NOT the same as `scrml:*` stdlib) is currently a PERMANENT SPEC section that BLESSED the leak (added 2026-04-08 post-gauntlet-R1). Same value-native-vs-leak axiom as class/this/new, one layer out. **UPSTREAM of (b) Appendix-D tightening + (e) vocab scrub** (both blocked on it) + Map/Set folds in. NOT ruled.
- **(c) function-typed struct fields → own debate** (currently silent-asIs, enforced by nobody; c1-support-restricted vs c2-reject; §22.5 stored-handler tension; the bridge's hard prerequisite).
- **§15.11.2 parent↔child mechanism → deeper look** (re-examine shared-cell-aliasing vs value-based comms; the Clojure identity/value split reconciles it but the mechanism itself wants re-examination).
- **(d) graphs → normalized ID-data** (self-host already does it voluntarily); user leaning a normalized-store PRIMITIVE (option 2), wants more thought (a 3rd option may emerge).

## BUGS FILED THIS SESSION
- **HIGH — multi-statement deep-set write-loss (DEFAULT pipeline, confirmed PA-independently):** consecutive dotted-path `@x.field =` writes in a `function` body silently DROPPED — `function multi(){ @c=1; @a.ref="p"; @c=2; @a.ref="q" }` emits only the two `@c` sets; both `@a.ref` deep-sets vanish. Lost mutations, no diagnostic. Surfaced as a side-effect of the data-model deep-dive (tangential-cleanup pattern). NOT in `reactive-nested-assign` codegen alone — likely the statement-sequencing in function-body lowering. Needs its own root-cause dispatch.
- **MED-ish — function-typed struct fields silently degrade to asIs** (no enforcement; `{run: 5}` where `run: ()->int` compiles clean). resolveTypeExpr (type-system.ts:1990) has no arrow-type branch → terminal tAsIs. Ties to the (c) debate.
- **Native FunctionDecl trailing-match-as-return + return-type-annotation drop** (surfaced by ROOT-1, reproduces on exported AND non-exported fns) — a genuine native emitted-correctness bug (the match result isn't returned under native); swap-arc-tracked, its own dispatch.

## PROCESS / pa.md CHANGES THIS SESSION
- **NEW wrap step 6c — maps refresh** added to the canonical "wrap" (pa.md + pa-core.md + user-voice S166). User directive: "from now on I want to add map updates to the wrap procedure." Placed as 6c to keep 7=push / 8=meta-docs anchors. (This wrap is the first to execute it.)
- **Memory banked: `feedback_no_batch_ratify_foundational_axioms`** — axiom-level design Qs want one-at-a-time deep-dive/debate, NOT a batched multi-question AskUserQuestion pass (the user pumped the brakes twice this session on a 4-Q ratification attempt). Capability-map before ratify; reopen familiarity-driven "keeps".

## OPEN QUESTIONS TO SURFACE IMMEDIATELY (next session)
1. **PUSH PENDING** — user said "wrap here" without "push"; the wrap commits (ROOT-2 already committed + the wrap docs + maps + scrml-support banks) are LOCAL. Confirm push.
2. **The JS-host-boundary deep-dive** is the queued next foundation (unifying Appendix-D / Map-Set / (b) / (e)). Run it (Profile A).
3. The HIGH multi-statement-deep-set-drop bug — dispatch a root-cause fix (default-pipeline, adopter-facing).
4. (c) function-typed-fields debate; §15.11.2 deeper look; (d) graphs-primitive thought — the remaining data-model facets.
5. Native-parser swap: re-triage doc has the 5 real families; render-by-tag Shape-2 / r24-bug-31 / engine-opener-effect remain (meatier/multi-root). The native FunctionDecl trailing-match-as-return bug is swap-arc-tracked.

## pa.md directives in force
- Rules R1–R5. `---` answer-delimiter. Profile A/B. `full wrap` / 88% floor. **NEW: wrap step 6c maps refresh.** Standing-autonomy is session-scoped (none granted S166; the session ran user-steered).
- Dispatch discipline: S88 isolation explicit · F4 startup-verify · S112 merge-startup · S99/S126 Bash-edit + no-`cd` (S100 hook) · S136 BRIEF.md archival · S138 R26 / PA-independent dual-verify EVERY landing · S147 branch-leak coherence. `--no-verify` forbidden.
- Background-commit race (S164): wait for the completion notification before reading HEAD/coherence.
- Ultracode ON this session (deep-dive + debate run as workflows; the no-batch-ratify lesson is the meta-takeaway).

## Tags
#session-166 #profile-a-full-start #data-model-axiom #value-vs-oop #two-layer-debate-P3 #js-host-boundary-foundation-queued #cycles-forbid #class-this-new-out #value-native-self-host-goal #native-parser-swap #high-bug-filed #wrap-step-6c-maps #push-pending
