# scrmlTS — Session 164 (OPEN)

**Date:** 2026-06-04
**Previous:** `handOffs/hand-off-168.md` (= S163 CLOSE).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-169.md` at next OPEN.
**Profile:** opened **A (FULL)** ("read pa.md and start session"; default A). Full session-start completed (pa.md full + PRIMER full + SPEC-INDEX full + master-list §0 + hand-off + user-voice S153→S163 tail + git sync + inbox + hook check).

---

## 🟢 S164 IN PROGRESS — autonomous native-parser-swap loop. §51.0.S family FULLY closed; lift-closetag landed; F2 SQL in flight. Flip 674→631→(pending re-measure).

### AUTONOMOUS SWAP-LOOP STATUS (user grant S164: "land on clean R26, move to next, autonomous flow")
The loop: land each clean-R26 family → pick next from `docs/changes/native-swap-triage-s164/TRIAGE.md` → dispatch → repeat; surface only on R26-fail / survey-STOP-needing-a-ruling / family-needing-a-decision / re-measure milestone.
- **LANDED this loop:** message-arm `7cbad5dd` + exprNode `c1566faa` (§51.0.S family FULLY native-parity) · lift-closetag `649f4ef8` (markup-as-value close-tag lexer fix; ~50-file lift family; within-node −19 pure convergence).
- **IN FLIGHT:** F2 SQL `?{}`-in-server-fn (`native-sql-body-server-fn-f2-2026-06-04`; survey-STOP gate — multi-context risk).
- **QUEUE (per TRIAGE.md):** table-for struct-field-drop (~21, silent miscompile) → engine-body-render (~11) → re-measure + re-triage → (later) lifecycle/structural-in-logic missing-enforcement. **AVOID single-dispatch:** enum-subset struct-ctor (multi-stage) + r24-bug-31 (multi-gap, 2 roots).
- **8 PA commits, coherence 0/8 at F2-dispatch, push HELD.** The full triage family-map + provenance is persisted at `docs/changes/native-swap-triage-s164/TRIAGE.md`.

### Repo state at OPEN
- **scrmlTS:** HEAD `f11db672` (S163 wrap), `origin/main` **0/0** (clean, synced). Working tree clean (only the S164 hand-off rotation staged).
- **scrml-support:** **0/0** (clean, synced).
- **Inbox:** EMPTY (`handOffs/incoming/` has no unread `.md`).
- **Hooks:** config B (local-rich — `.git/hooks/` has pre-commit + post-commit + pre-push). Leave as-is.
- **Version:** on top of **v0.7.0** (pkg.json unchanged; S163 was a parity-closer + bug-fix session, no tag).
- **Tests at last close (S163):** full `bun run test` **22,998 pass / 0 fail / 220 skip / 1 todo / 907 files**. Within-node parity 1005/0.

### Where we are — the strategic line (ratified S161 direction-a)
The **native-parser swap** is the #1 strategic line: finish the native parser → flip `--parser=scrml-native` to default → delete BS+Acorn+BPP at M6. Realistically a **v0.8 multi-session target**. Rationale is self-describing / one-front-end / fragility-class-elimination — NOT "shrink the bug backlog" (most recent bug effort is POST-parse codegen/type-system the swap reduces none of). **The Phase-A default-flip itself is a STANDING USER DECISION** (STOPped+reverted once at `404fc619`); PA dispatches PARITY-CLOSERS feeding the eventual user-authorized flip, never "the flip" itself.

**Flip-failure trajectory:** 1,150 (S161) → ~790 / 199 files (S162) → **674 (S164 re-measure, this session).** The S163 engine-substrate fix + B1 killed **~116 (−15%)**. Of 674: ~6 environmental ECONNREFUSED + 2 within-node SPAN-COORD → **~666 genuine across 181 files / ~6 families.** Honest read: real drop but NOT the hoped "steep" — most silently-miscompiling engine files compiled *clean* before, so they only failed the runtime-asserting flip-tests; the substrate fix's value is correctness, not headcount. **Remaining family signatures:** `E-CODEGEN-INVALID-JS` (18) · `E-TYPE-063` (15)+`E-VARIANT-AMBIGUOUS` (4) native bare-variant resolution · `E-TYPE-001/-020` (14/14) lifecycle/exhaustiveness · **B2 §51.0.S** `E-ENGINE-ACCEPTS-NOT-ENUM` (4)+`E-ENGINE-MSG-UNKNOWN` (3)+engine-message-dispatch conf/browser (~20) · `E-MATCH-NOT-EXHAUSTIVE` (7)+`E-MATCH-SUBSET-DEAD-ARM` (4) · F2 SQL-in-server-fn (~29 by file) · L22 promote-each/table-for/form-for (~55 by file).

### IN-FLIGHT THIS SESSION (S164)
1. **Flip re-measure — DONE** (674; method: throwaway detached worktree at `f11db672`, `api.js:630 null→"scrml-native"`, `bun install`+`pretest`+`bun test compiler/tests/`; worktree removed, main untouched, branch coherence 0/0). Log at `/tmp/flip-remeasure-s164.log`.
2. **Maps refresh — DONE** (PA-direct, surgical → watermark `f11db672`; F1 corrected to CLOSED; B2 flagged THE NEXT DISPATCH; 674 landed across primary/domain/structure).
3. **F1-narrow + B2 — §51.0.S message-arm — LANDED `7cbad5dd`** (parser-level). First B2-only dispatch survey-STOPped (correctly): the hand-off's anchor `native-parser/native-walker/...:516` was STALE (real path `compiler/src/native-walker/engine-statechild-walker.ts:516`), and B2 alone is gated by an upstream F1 parse bug. Re-dispatched COMBINED F1-narrow + B2: **F1-narrow** (parse-markup.js `dispatchCodeDefaultBody` + new `scanMessageArmRegionExtent`) recognizes the leading-`|` message-arm region (was spurious `E-UNQUOTED-DISPLAY-TEXT`); **B2** wires `parseMessageArms(bodyRaw).arms` into the native walker (line 516) + `acceptsType=readAttrName(attrs,"accepts")` into `collect-hoisted.js synthEngineDecl`. PA-independent verify: native `engineMeta` byte-identical; within-node **1005/0** (benign +2 EXTRA-FIELD acceptsType:null rebump on 4 nested/hierarchy fixtures); E-UNQUOTED 2→0; +5 native tests. **NOT full-fixture-R26-closed:** native still exits 1 on `engine-message-dispatch-s6.scrml` with ONE `E-CODEGEN-INVALID-JS` = the ORTHOGONAL exprNode-population gap (raw `@dragPhase.advance(...)` in onclick) — the fixture header itself pre-flags it. Landed honestly as parser-level parity; full-fixture emit-R26 completes when exprNode lands. Briefs: `docs/changes/native-engine-message-arm-b2-2026-06-04/` (survey) + `native-f1narrow-b2-msgarm-2026-06-04/` (combined).
4. **native attr-value `exprNode`+`argExprNodes` population — LANDED `c1566faa`** (cross-cutting closer). Placed in the NATIVE-WALKER (`compiler/src/native-walker/attrvalue-exprnode-walker.ts` NEW `populateNativeAttrValueExprNodes`, run from `api.js` native `_buildAST`; native-path-ONLY) — NOT tag-frame.js (native-parser/* can't import the live acorn parser without inverting self-host layering). Reuses live `safeParseExprToNodeGlobal` (exported from ast-builder.js). **Scope-catch:** the headline `onclick=@x.advance(.Drop(...))` parses as `call-ref` → needed BOTH `exprNode` (expr/variable-ref) AND `argExprNodes` (call-ref, ast-builder.js:1831-1832); the walker covers both. PA-independent verify: **R26(A) isolated + R26(B) message-dispatch BOTH BYTE-IDENTICAL** (native==default; dispatch markers 4==4); within-node **1005/0** (MISSING-FIELD 31790→30569 −1221 convergence; KIND-NAME/FIELD-SHAPE unchanged; benign +34 SPAN-COORD/+2 EXTRA-FIELD rebump); +6 tests; 12 handler files → 0 native E-CODEGEN-INVALID-JS. **★ §51.0.S engine message-dispatch family is now FULLY native-parity end-to-end** (message-arm `7cbad5dd` + exprNode `c1566faa`). **FLAGGED follow-up:** native attr-value `span.start` is block-relative (not file-absolute) inside lift/each markup-as-value subtrees (PRE-EXISTING; the exprNode pass propagates it → the +34 SPAN-COORD residual; emit byte-identical; top-level byte-identical to live). Brief: `docs/changes/native-attrvalue-exprnode-population-2026-06-04/`.
5. **flip re-measure (post-exprNode) — DONE: 674 → 631 (−43).** The §51.0.S closures landed where expected: `E-ENGINE-ACCEPTS-NOT-ENUM` 4→0 (message-arm) + `E-VARIANT-AMBIGUOUS` 4→0 + `E-TYPE-063` 15→3 (−12, the bare-variant-in-handler-arg resolution the `argExprNodes` fix unlocked) + `E-CODEGEN-INVALID-JS` 18→17. **Honest read:** modest raw-count move because the TEST-SUITE flip-failures are dominated by OTHER families (the exprNode fix's broad impact is in the ADOPTER corpus — spot-check: 40 example files → only 2 residual E-CODEGEN-INVALID-JS, both other families — which the test-suite count doesn't capture). **Remaining 631 top families:** promote-each (~25) · table-for (~22 unit+integration) · lifecycle-shape1 (~12) · enum-subset (b2/b4 ~22) · error-handler-const-bind (~12) · structural-in-logic (~11) · server-fn-star-sql / sql-loop-hoist (F2, ~20) · engine-body-render (~11) · if-as-expression (~12). Top codes: E-CODEGEN-INVALID-JS 17 · E-TYPE-020 14 · E-TYPE-001 14 · E-RI-002 6 · E-MATCH-NOT-EXHAUSTIVE 6 · E-CG-006 6. **NB: flip-remeasure perl MUST be line-agnostic** (`s/^    parser = null,$/.../` regex-only, NO `$.==N` gate) — the line drifts after every api.js landing (S164 bit this: hardcoded `$.==630` silently missed after the exprNode landing shifted it to 631 → a bogus "2-fail" control reading).

### SYNC NOTE — origin behind local (push held)
- **scrmlTS local HEAD is AHEAD of origin/main by 4 PA commits — NOT pushed** (user said "land, not push"): `154a1799` (session-start + flip re-measure 674 + maps) · `7cbad5dd` (F1-narrow + B2 message-arm) · `0aa94d2f` (maps/hand-off: message-arm landed, exprNode next) · `c1566faa` (exprNode+argExprNodes population). **Consequence:** `isolation:worktree` dispatches branch from origin/main (`f11db672`), so a dispatch worktree's startup MUST `git merge <latest-local-HEAD>` to inherit the session's landings + fresh maps (the exprNode dispatch did this cleanly). If/when push is authorized, this gymnastics goes away.

### REMAINING WORKLIST (after exprNode)
- **mario PowerUp enum-with-constructor-params truncation under native** (NEW S163) — native captures only `["Mushroom"]` (drops Flower/Feather), mis-emits `PowerUp.Flower(3)` as `"Flower"(3)`, match-arm positional-bind fails. SEPARATE from engine-substrate (a payload-bearing-enum native gap; mario residual = 133 diff-lines). Triage + scope.
- **`effect=` opener (§51.0.H Form 3 openerEffect)** — native `synthEngineDecl` has no openerEffect read. Small separate gap.
- F2 SQL `?{}`-in-server-fn (~58) · F4 formFor expansion (~32) · F5 `const @name` derived-decl (~20) · F6/F9 fn param/export-fn-body (~16) · F7 missing diagnostics (~15). F8 stdlib `await import()` = stdlib-migration task (not native).

### OPEN QUESTIONS / DESIGN CALLS
1. **Phase-A default-flip = STANDING USER DECISION** (see above). PA never dispatches "the flip."
2. **v0.7 → v0.8 placement** — the swap is a v0.8 target; the engine-substrate fix is a big chunk of the ~790; re-measure to re-baseline.
3. **M6.5 emit-logic path-(a) shims vs path-(b)** — needs ratification BEFORE that dispatch. Not on the current critical path.

### CARRY-FORWARD (F1 follow-ups + backlog)
- **B1 deferred:** malformed-reset diagnostic surfacing under native (native produces the reset-expr with the E-RESET-NO-ARG diagnostic field but doesn't run the ast-builder surfacer; no parity REGRESSION — native==default behavior).
- **§4.18 corpus migration** (bare display text → `"..."` literals, engine/match arms + `:`-shorthand) — deferred swap-prep backlog per the S163 §4.18 ruling (native enforces, live stays lenient until M6 deletes it).
- **F8 stdlib migration** (`await import()` in `^{}` → off `await`; native is the strict no-`await` enforcer per S162 ruling) — migration backlog, its own task.
- **Maps:** STALE. Refreshed to `c3303adc` mid-S163 (the S162 arc), but HEAD moved to `a41df176`+ (B1 + engine-substrate landings past the watermark). **The maps' "F1 = arm-body E-UNQUOTED-DISPLAY-TEXT" framing is INACCURATE** (true dominant cause = `machineDecls` two-instance identity defect). Refresh to HEAD + CORRECT the F1 framing before the next native-parser dispatch (maps were load-bearing every batch in S155/S163 — the legacy-BS+TAB vs native parser-path fork).
- **Per-feature engine parity** — S163 verified basic/hierarchy/onTimeout/onIdle/history/effects recover byte-identical. Derived engines + deeper sub-features still want their own positive flip-tests before claiming full parity.
- **native `.scrml` mirrors are FEATURE-stale** (S162 finding) — not just predicate-drift; whole machinery missing vs the `.js`. S115 lockstep is MOOT for native fixes until a re-sync (brief the conditional form, not a rigid mandate). Also: `is given`/`is not given` predicate-drift 22 occ/6 files (LOW).
- **Bug backlog (MED 9):** Bug 1 Tailwind · V-kill READ-side · MCP V0 deferrals · Generator policy · L19 multi-statement-handler · A5 freeze-extension · R28-1d (NOT-REPRODUCED) · C6 · Bug 14 MCP-partial.
- **LOW backlog** (incl. S162 `.scrml`-mirror feature-staleness, native is-pattern-arm, native if-as-expr; + `is given`/`is not given` predicate-drift).
- **S154 carry:** body-split/CPS debt (Ext 2/3) · per= per-instance engines (DD) · self-tree-shaking compiler build-story DD-candidate · self-demo scrml.dev F1/F2 debate · 6NZ caps stray.

## pa.md directives in force
- Rules R1–R5. `---` delimiter (S152). Profile A/B (S156). `full wrap`/88% floor (S139). Standing-autonomy grant available on user say-so (review→land→push→R26→wrap, surface only on real failure / design ruling).
- Dispatch discipline: S88 isolation explicit · F4 startup-verify · S112 merge-startup · S99/S126 Bash-edit + no-`cd` (S100 hook active) · S136 BRIEF.md archival · S138 R26/dual-verify (PA-independent EVERY landing) · S147 branch-leak coherence (every commit, 0/N). `--no-verify` forbidden (recurring agent reflex — brief reinforces; held every time).
- **CWD discipline (S159/S90):** `cd <main>` / `pwd` checks before every worktree dispatch + main-side write post-dispatch.
- **Survey-STOP gate (S158/S163):** the user's chosen pattern; twice prevented over-commit in S163.
- **Methodology bank (S163):** native-parser-swap parity surveys MUST byte-compare native-vs-default EMIT, not check fatal-error-absence (the S139 trap at survey level).
- Canonical dev-agent `scrml-js-codegen-engineer`. Reconnaissance/triage + surveys via `general-purpose` (read-only). project-mapper (non-isolated) for maps refresh — commit with explicit `.claude/maps/` pathspec (it shares main's index; S119).

## Tags
#session-164 #open #profile-a-full-start #native-parser-swap-arc #flip-re-measure-opener #engine-substrate-fixed-S163 #v0.8-target #high-0
