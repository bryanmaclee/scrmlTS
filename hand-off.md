# scrmlTS — Session 157 (CLOSE)

**Date:** 2026-06-03 (opened 2026-06-02)
**Previous:** `handOffs/hand-off-161.md` (= S156 CLOSE).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-162.md` at next OPEN.

---

## 🏁 S157 CLOSE — autonomous bug-fix pass: 6 bugs RESOLVED (match-exhaustiveness arc COMPLETE) + maps refresh

Opened **Profile A (FULL)** ("read pa.md and start session"; no profile signal → default A). User then directed: **"refresh maps then start bug 65"**, then **"continue fixing bugs autonomously"** + **"go ahead"** (commit auth). Ran an autonomous bug-fix pass: 6 bugs resolved, each via `scrml-js-codegen-engineer` (isolation:worktree, bg) → S67 file-delta → PA-authored commit → PA independent dual-verify (S138). Every landing additive-diff-verified (S147 coherence + no prior-fix revert) + regression-guarded against the other landed bugs.

### Sync / repo state at CLOSE
- **scrmlTS:** clean, HEAD `e9924b4e`, `origin/main` **0/7** (7 PA commits — **PUSH PENDING**, no push authorized).
  - `358581a8` (maps refresh + hand-off rotation) · `e2ca4978` (Bug 63) · `63fcba72` (Bug 65) · `8226d304` (Bug 68) · `f28d8128` (Bug 67) · `fe4ca941` (Bug 71) · `e9924b4e` (Bug 70).
- **scrml-support:** clean, `origin/main` **0/0** (no writes this session; user-voice not appended — no durable language directive, only process/execution directives).
- **Tests at close:** full `bun run test` **22,810 pass / 0 fail / 220 skip / 1 todo** (S156 baseline 22,753; **+57** = Bug63 +9 / Bug65 +18 / Bug68 +8 / Bug67 +6 / Bug71 +9 / Bug70 +7; 0 regression). *(confirm final count from the wrap test run — see test-suite line.)*
- **Hooks:** config B (pre-commit + post-commit + pre-push). Untouched. The S100 path-discipline hook FIRED correctly during Bug 68 (denied a `--no-verify`) + Bug 70 (rejected a Write-tool call in a worktree) — held the line.
- **Inbox:** EMPTY. **Worktrees:** cleaned at wrap (see §6b) — main only.
- **Version:** on top of v0.7.0 (pkg.json unchanged; no tag — bug-fix pass).

### known-gaps §0 state at CLOSE
- **HIGH 0.** **MED 14** (was 17 at S156 open): −Bug 63/65/67/68 (resolved) −Bug 71 (filed+resolved same session, net 0) +Bug 70 (resolved this session) +Bug 72 (new). Net pre-existing −4, +Bug 72 new = 14.
- **Resolved this session:** Bug 63 · 65 · 67 · 68 · 70 · 71 (6).
- **Filed this session:** Bug 70 (reclassified from the Bug-65 agent's surfacing) · Bug 71 (surfaced by Bug 67, filed+resolved) · Bug 72 (surfaced by Bug 70, OPEN).

### Maps — REFRESHED this session
- `.claude/maps/` regenerated to HEAD `57edc794` (`358581a8` commit) via incremental project-mapper. primary.map.md gained a Bug-65 routing block (load-bearing — the Bug 65 agent confirmed it). Maps are now ~7 commits stale again (the 6 bug fixes landed after the refresh); refresh before the next compiler-source dispatch.

---

## DONE this session (S157) — the 6 bugs

1. **Bug 63 (MED) RESOLVED `e2ca4978`** — markup event-handler `.advance(.V)` now bare-variant type-checked. Localized hookup in `type-system.ts annotateNodes case "markup"`: each `on*` handler attr → `handlerAttrToExprNode()` normalizer → the SAME `inferReactiveSiteBareVariants(..., cellMessageEnums)` call (line 6116 template). Covers plain / `<each>` / engine-state-child / `${}` interp positions. +9 tests. State plane → E-TYPE-063; message plane → E-ENGINE-MSG-UNKNOWN.

2. **Bug 65 (MED) RESOLVED `63fcba72`** — Tier-0 `${for…lift}` engine `.advance`/`@engine=.X` now lower per-item. TRUE root was upstream: `emit-logic.ts:2385` for-stmt dispatch DROPPED engine extras (if-stmt threaded them). Fixed by threading + sharing the Bug 62 helper (`buildEachEngineCtx`/`emitEngineHandlerBody` EXPORTED from emit-each.ts, no fork). Tree-shaken. +12 unit +6 happy-dom. Surfaced Bug 70.

3. **Bug 68 (MED) RESOLVED `8226d304`** — positional-payload enum (`Ok(int)`) now materialized in `parseEnumBody` (+ `getAllVariantInfo`). Root: required a `:` to record a payload field → positional → size-0 Map → misclassified bare. Synthesizes `_<i>` keys. **CLASS-LEVEL** — also closed the tableFor `E-TABLEFOR-VARIANT-PAYLOAD-ENUM-V1` sibling + a constructor payload-drop (`data:{}`→`data:{_0}`). +8 tests.

4. **Bug 67 (MED) RESOLVED `f28d8128`** — `return match expr {...}` in a fn body now exhaustiveness-checked. PARSER gap: the return-stmt builder lacked the match-as-expr hook the let-decl/const-decl builders had. Added it (`return-stmt.matchExpr` structural side-field via `parseOneMatchAsExpr`); typer visits it; E-LIN-003 linear-analysis re-routed; emit via shared `emitMatchExpr` IIFE (same JS shape). +6 tests; within-node allowlist bumped (5 fixtures, M5-out-of-scope). Surfaced Bug 71.

5. **Bug 71 (MED) RESOLVED `fe4ca941`** — derived `const <x> = match` (+ plain `<x> = match`) now exhaustiveness-checked. Sibling of Bug 67 in the structural-decl builder. DUAL-PARSE (collectExpr → reactive emit byte-identical, then rewind + parseOneMatchAsExpr → typer-only structural side-field). Codegen parity proven (`_scrml_derived_subscribe` dep edge intact). CLASS-LEVEL (also plain `<x> = match` init-time). +9 tests. **CLOSES the match-exhaustiveness arc.**

6. **Bug 70 (MED) RESOLVED `e9924b4e`** — `@.` outside `<each>` now fires `E-SYNTAX-064` (was leaking to confusing E-CODEGEN-INVALID-JS). PA **Rule-4 re-diagnosis**: the Bug-65 agent framed it as a Tier-0 `@.`-lowering gap; that's spec-wrong (`@.` is `<each>`-only §17.7.3). Wired E-SYNTAX-064 at 2 loci (`visitAttr` else-fire + `lift-expr` subtree scan; `inEachBodyScope()` was the gate). **§34 row for E-SYNTAX-064 was MISSING — ADDED** (Rule-4 spec-paired); §17.7.3 prose flipped queued→wired. Companion `api.js` fix: suppress redundant E-CODEGEN-INVALID-JS when a prior fatal error exists. +7 tests. Surfaced Bug 72.

**Match-exhaustiveness arc COMPLETE** — `let x = match` (in-fn) ✓ / `return match` (Bug 67) ✓ / `<match for=T>` block-form ✓ / JS-style `match` statement ✓ / derived `const <x> = match` + plain `<x> = match` (Bug 71) ✓.

---

## OPEN QUESTIONS TO SURFACE IMMEDIATELY (S157 CLOSE)

1. **PUSH PENDING — 7 scrmlTS commits unpushed** (`358581a8`..`e9924b4e`). All coherence-verified (0/7, no leak). No push authorized this session. Push? (pre-push runs the full+TodoMVC gate ~5min.) Cross-machine: the other machine won't have these until pushed.
2. **Bug 64 (MED, QUEUED) — needs an (a)-vs-(b) DESIGN confirmation before fix.** Tier-0 `for…lift` index-keyed list reuses DOM nodes on in-place replace → per-item interpolated text goes STALE while `class:`/`if=` toggles DO update (the "sneaky split"). (a) intended index-semantics → doc/lint note; (b) codegen gap (per-item interpolated text should be reactive like the toggles) → fix. The split LEANS (b) (the inconsistency is the tell; "don't soft-classify bugs"), but the disposition explicitly says confirm before fix. NEEDS: happy-dom repro of the split + user ruling on (a)-vs-(b). The next clean bug to tackle once the fork is resolved.
3. **Bug 72 (MED, NEW, OPEN)** — nested `<each>` INSIDE a Tier-0 `${for…lift}` body: the LEGITIMATE nested-each `@.` isn't codegen-rewritten in the lift-embedded position → E-CODEGEN-INVALID-JS. Distinct from Bug 70 (diagnostic); this is a codegen-lowering gap. `emit-each.ts` iter-scope rewriting is the locus. Surfaced by the Bug 70 agent, stash-baseline-verified PRE-EXISTING.
4. **SPEC-INDEX regen pending** — Bug 70 added a §34 E-SYNTAX-064 row (+~1 line, shifts §34+ ranges). Within the index's ±drift tolerance, but regen via `bun scripts/regen-spec-index.ts` at convenience for surgical accuracy.

---

## CARRY-FORWARD (from S156 — design work + backlog)
- **PARKED — Profile-A design session** for the S154 (a)/(b)/(c) rulings still needing spec+codegen:
  - **(a) `:`-shorthand renders on non-void HTML; void rejects.** RATIFIED S154; no open sub-Qs — ready to spec (§4.14 line 997 + new void-reject §34 code) + codegen (mirror `<each>` per-item path + void guard).
  - **(b) `:` inside-opener canonical everywhere.** RATIFIED S154; **2 unruled micro-grammar sub-Qs** (no-space-after-`:` `:@thing`; self-close `/>` + `:`-shorthand vs E-CLOSER-001).
  - **(c) no-RHS typed-decl → canonical empty else `not`.** RATIFIED S154; **3 impl sub-Qs** (exact table incl. enum→`not`; `not`-init lifecycle §42/§14.12; E-DECL-NEEDS-INITIALIZER fate).
- **DD candidate (S155, parked):** self-tree-shaking compiler build-story (§58+§47+self-host). Confirm-pending: is "the whole dependency code issue" = the `bun link` full-toolchain-as-dependency friction? (user never answered S155/S156/S157).
- **Bug backlog (all MED):** Bug 64 (design-fork, above) · Bug 72 (above) · Bug 60 (render-by-tag nested-compound-field) · prior MED tail (see known-gaps §0).
- **#2f native-parser each/match structural promotion** — HARD M5-swap precondition (the within-node allowlist bumps from Bug 67/71 document the current intentional live-vs-native divergence; native MUST gain the match-as-expr + each-promotion hooks before it becomes default).
- Other S154 carry: body-split/CPS debt · #5 lint FPs · #6 cross-file client imports · #7 MCP flip · per= per-instance engines (needs DD) · 6NZ caps stray.

## pa.md directives in force
- Rules R1–R5. `---` answer-delimiter (S152). Profile A/B (S156). `full wrap` / 88% floor (S139). Working-style: largest ratified target, autonomous, park-on-input, surface only on real failure (S147/S155 — exercised heavily this session).
- Dispatch discipline ALL held this session: S88 explicit isolation · F4 startup-verify · **S112 merge-startup** (used on Bug 68/67/71/70 — worktree base = session-start `57edc794`; merging local main kept file-deltas additive, no prior-fix reverts) · S99/S126 Bash-edit + no-`cd` · S136 BRIEF.md archival (all 6 archived) · S138 R26/dual-verify (every landing) · S147 branch-leak coherence + additive-diff check (every landing) · S82 maps-block. `--no-verify` forbidden (held — hook denied one attempt).
- Canonical dev-agent `scrml-js-codegen-engineer` (loads on this machine).

## Process notes (S157)
- **S112 worktree-base-staleness was the load-bearing landing discipline.** Worktrees branch from session-start `57edc794`, NOT live HEAD. Mid-session dispatches (Bug 68 onward) needed a `git merge main` startup step to inherit prior landings — else the file-delta would revert them. Briefed explicitly; held clean on all 4 merge-startup dispatches (verified via additive-diff + prior-fix-presence greps at each landing).
- **Every agent surfaced sibling gaps transparently (Rule 5):** Bug 65→70, Bug 67→71, Bug 68→tableFor(closed)+stale-comment, Bug 70→72, Bug 71→plain-`<x>=match`(closed-in-scope). The "surface, don't silently fix-or-skip" discipline held.
- **PA Rule-4 catch on Bug 70:** corrected the Bug-65 agent's spec-incorrect "lowering" framing to the spec-faithful E-SYNTAX-064 wiring before dispatch.

## Tags
#session-157 #CLOSE #profile-a-full-start #autonomous-bug-pass #6-bugs-resolved #match-exhaustiveness-arc-complete #push-pending #bug64-design-fork #bug72-open
