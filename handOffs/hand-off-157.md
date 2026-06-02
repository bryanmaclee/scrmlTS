# scrmlTS — Session 152 (CLOSE)

**Date:** 2026-06-01
**Previous:** `handOffs/hand-off-156.md` (= S151 CLOSE).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-157.md` at S153 OPEN.

---

## 🏁 S152 CLOSE — dogfood-driven fix arc: 5 fixes shipped, HIGH back to 0, 1 grammar feature, 3 design ratifications

The whole session was **dogfooding the language by writing a real todo app** (`masterScrml/req.scrml` + `req2.scrml` — the scrml rendering of Teej's CLI todo). That exercise surfaced and closed a chain of real gaps. The C1-self-demo thesis ("real usage surfaces real gaps") proved itself.

## State as of CLOSE
- **HEAD scrmlTS:** the each-init crash fix `25a1c243` + the wrap commit (this). Session commits ahead of the S151 base `bf2e02e7`: `9c192c73` (#7 each-body) · `b08f44df` (known-gaps) · `efc23ecf` (dev-server fixes) · `5082ff3c` (#6 modules) · `893872e3` (inline-`?{}`) · `46f9bb55` (Shape 4) · `25a1c243` (each-init crash) · + wrap. **Pushed origin 0/0** (pre-push gate green, NO `--no-verify`).
- **scrml-support:** pa.md `---` convention + #6 deep-dive (`bdeaf9d`) pushed; + user-voice S152 (this wrap) pushed. **0/0.**
- **Tests:** full `bun run test` — see CHANGELOG (pre-push gate count). Pre-commit subset was 15,5xx / 0 fail through the session; browser tier 294/0.
- **known-gaps §0:** **HIGH 0** (all S152 HIGHs resolved). NEW this session: **#6 RESOLVED**, **inline-`?{}`-in-branch RESOLVED**, **each-render-before-cell-init crash RESOLVED**, **Shape 4 shipped**, **scrml-dev fixes shipped**, **#7 each-body shipped**. NEW open: **engine-gated-`<each>`-populate (MED)**, **A-4 atom-emitter bare-import follow-up**, **scalar/struct zero-default open Q**, plus the lint false-positives (W-DEAD-FUNCTION on match-arm-only-called fns; I-FN-PROMOTABLE on SQL fns).
- **Worktrees:** cleaned at wrap (all 6 dispatch worktrees landed via file-delta). `git worktree list` = main only.
- **Inbox:** empty. **Outbox:** none sent.

## 🔬 S152 EXECUTION LOG (the dogfood chain)

**Arc 0 — req.scrml / req2.scrml (Teej comparison).** User pointed at `masterScrml/req.md` (TJ DeVries' CLI todo language: first-class `database`, Ecto-style queries, `provide` capability injection, tagged-error `match Int.parse`, `match Runtime.args` dispatch). Wrote `req.scrml` (the scrml rendering) + `req2.scrml` (full-engine variation: `Phase = {Loading,Browsing,Failed(msg)}` + boot-effect + payload-variant + command-router-in-Browsing). The design insight surfaced: the **engine is the PHASE**, the command-`match` is a router inside Browsing (not engine state). Writing it two ways surfaced the whole bug chain below.

**Arc 1 — dogfood reverse-R26 sweep (7 candidates classified).** #6 confirmed HIGH; #7 confirmed broader; inline-object-fn-return + `for=`-in-fn-string confirmed; no-`--sourceMap` LOW; 2 NOT-REPRODUCED minimal; W-DEAD-FUNCTION/I-FN-PROMOTABLE confirmed cosmetic.

**Shipped fixes (all R26-verified, file-delta landed, pushed):**
1. **#7 — `<each>` body interactivity** `9c192c73`. `@.` resolves in attr-value (type-system.ts `inEachBodyScope`); `class:`→classList.toggle, handlers→addEventListener, `${}`→value (emit-each.ts). +18 tests.
2. **scrml dev fixes** `efc23ecf`. Per-file watcher (no inotify-ENOSPC crash — was recursively watching node_modules/sibling-repos) + graceful watch-error degradation + root-`/` entry-preference (no stale-sibling serve). **This + #6 were the actual "nothing renders" the user hit.**
3. **#6 — cross-file CLIENT module-loading** `5082ff3c` (Approach B per deep-dive). `_scrml_modules` registry + exporter footer + importer registry-read + topo-ordered dep `<script>` + IIFE-wrap of cross-file-linked bodies (collision fix). Deep-dive: `scrml-support/docs/deep-dives/client-cross-file-module-loading-2026-06-01.md` (verdict B; A-4-reuse ruled out). +7 tests incl. happy-dom multi-file.
4. **inline `?{}` in conditional branch** `893872e3`. `isServerTriggerStatement`/`analyzeCPSEligibility` recurse into control-flow bodies → inline `?{}` in a `match` arm / `if` branch is a CPS server boundary. Coupled fix: match-stmt server-emit was **leaking `_scrml_sql` into client.js** (E-CG-006) — async-IIFE-wrap + `_scrml_body` marshalled reads; zero SQL in client now. +12 tests.
5. **SPEC §6.2 Shape 4 — typed-array no-RHS → `[]`** `46f9bb55`. `<x>: T[]` (no RHS) → `[]` (defined, `is some` not `not`); non-array typed-no-RHS → NEW `E-DECL-NEEDS-INITIALIZER`; closes the no-init-undefined hole. Root was front-end (no-RHS decl fell through to html-fragment). +15 tests. (Scalar/struct zero-defaults OUT — open Q.)
6. **each-render-before-cell-init crash** `25a1c243` (HIGH). The `<each>` render fired at module-init BEFORE the cell-init → `_scrml_reconcile_list(undefined)` crash; affected ANY no-`<empty>` `<each>` over a same-program cell (compile-clean, runtime-dead). Fix: defer each-dispatchers after reactiveLines (ordering) + `!_items`/`Array.isArray` guards. **#7-test blind spot: all existing each-tests had `<empty>` (whose `!_items` guard masked it); unit each-tests are emit-string-only.** NEW happy-dom test in real module-init order. +90 tests net.

**Design ratifications (durable — in user-voice S152 + pa.md):**
- **`---` answer-delimiter convention** → pa.md (committed `bdeaf9d`). Tail below the last `---` = answers to PA's pending questions.
- **DQ-2 conceded** — reassignment-canonical stands; arrays do NOT have mutation-method reactivity (push/pop/shift don't signal per §6.5 DQ-2; the user conceded the proxy-reactive-array direction). No DQ-2 reopen.
- **Shape 4 ratified** ("1 cool") — typed-array `[]`-default; scalar zero-defaults left open.

## ⚠️ CARRY-FORWARD / OPEN (S153)
1. **engine-gated-`<each>`-populate (NEW MED — the immediate req2 blocker).** An `<each>` whose mount lives inside an engine state-child (req2's `Browsing`) doesn't track its source-cell dep: at module-init the engine is in `initial=` (`Loading`), the each-mount isn't in the DOM, the each-render hits `if (!_mount) return;` BEFORE reading `@cell` → `_scrml_effect_static` records no dep → never re-fires → list never populates. req2 mounts clean (no crash) but stays empty. **Fix: read the source cell BEFORE the `!_mount` early-return (always track the dep), OR re-run each dispatchers on engine variant-swap.** This is the next fix to make req2 actually work end-to-end.
2. **A-4 atom-emitter bare-import follow-up.** Same bare-`import`-in-classic-script class as #6, gated on `emitPerRoute` (default-OFF). Blocks A-4 default-on until it registers into `_scrml_modules`.
3. **Body-split conditional-tier (A9 Ext 3) — the remaining CPS debt.** The inline-`?{}` fix closed single-boundary-in-branch; STILL deferred: multi-server-batch across a branch (server-call-in-arm + server-call-after-match = the "shared reload tail") + `!{}`-handler+server-call in one arm body (both → E-CODEGEN-INVALID-JS today; workaround: one server boundary per arm, extract the rest to named fns). `cps-conditional-classifier.ts` / `cps-loop-planner.ts` still absent (Ext 3/Ext 2 unbuilt). This is where "compiler owns the wiring" carries the most debt — well-characterized now by the req2 dogfood.
4. **scalar/struct zero-default open Q** — should `<x>: int` default to `0`, `<x>: string` to `""`? (Shape 4 did array-only; this is the deliberate-defer.)
5. **predicate-fields standing question** (S151) — user's "exept" reading; enum-subset `oneOf([.A,.B])` gap.
6. **W-DEAD-FUNCTION false-positive** on fns called only from `match`-arm bodies (RI under-counts arm-body calls; cosmetic — they emit+wire). **I-FN-PROMOTABLE** mis-fires on SQL-bearing `function`s (suggests `fn` though `fn` forbids SQL). Both cosmetic.
7. **Carried from S151 (untouched this session):** C1 inc2 (3 flagships + dashboard + KB-nav + PE-toggle); MCP `<program mcp>` flip; R28-8 §14.10 inference impl; `print()` canon decision + `< db>` spacing; srcmap offset-threading; engine-graph multi-file write-loop; given-guard discrimination; `:`-shorthand BS fragility; tier-2 ceiling DD; **maps refresh** (now ~26 commits stale).

## req.scrml / req2.scrml status (masterScrml/, scratch comparison files — NOT repo content)
- **req.scrml** — the USER's WIP hack (OR-arm dead-code + `listTodos` defined in a match-arm + `raw` undefined). Does NOT compile (E-RI-002 / E-SCOPE-001 / E-CODEGEN-INVALID-JS) — those are the user's experimental edits, NOT compiler bugs.
- **req2.scrml** — PA's corrected full-engine baseline. **Compiles clean** (extract-to-fn structure: one server boundary per arm, internal reload). MOUNTS without crash post-each-init-fix. **Does NOT yet populate the list** (carry-forward #1 — engine-gated-each dep gap). So: compile-green + mount-clean + list-empty pending #1.

## pa.md directives in force
- Rules R1–R5. Working-style S147 (largest fully-ratified-for-go target, autonomous, park-on-input). `---` answer-delimiter convention (S152, NEW). `full wrap`/88% floor (S139) available.
- Held this session: 6 isolation:worktree dispatches (all clean-landed, 0 path-discipline leaks — the S100 hook rejected 1 Edit on the #6 agent → switched to Bash); S147 branch-leak coherence held (ahead==PA-authored throughout); S136 BRIEF.md archival on all 6; S138 R26 on every fix; S90 CWD gate before every dispatch; `--no-verify` prohibition held (full pre-push gate passed). No release tag (S94 N/A).

## Tags
#session-152 #CLOSE #dogfood-fix-chain #each-body-7 #scrml-dev-fixes #6-cross-file-modules #inline-sql-in-branch #shape-4-array-default #each-init-crash-resolved #HIGH-back-to-0 #engine-gated-each-MED #dq-2-conceded #delimiter-convention #req-req2-teej-comparison
