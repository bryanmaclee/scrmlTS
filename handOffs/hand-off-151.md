# scrmlTS — Session 147 (CLOSE)

**Date:** 2026-05-30 → 2026-05-31
**Previous:** `handOffs/hand-off-150.md` (S146 CLOSE).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-151.md` at S148 OPEN.

---

## 🏁 S147 CLOSE (`wrap and push`)

- **HEAD scrmlTS:** the S147 wrap commit (this) — pushed origin **0/0**. Session commits (8 + wrap): `a2930106` SPEC-match-:> · `f0d7db3b` docs-migrate · `e34de551` match-BRIEF · `f444290a` match-feat (lint+migrate, dispatched) · `bf5ad0db` R28-4 protect-analyzer · `07655674` E-DG-002 class (dispatched) · `1d698cbb` within-node rebump · `cef5ed98` LSP filter · + wrap commit.
- **scrml-support:** pa.md S147 branch-leak addendum (`a81fe59`) + user-voice S147 — pushed **0/0**.
- **Cross-machine:** both repos **0/0** with origin post-push.
- **Tests:** full suite **22,337 pass / 0 fail / 219 skip** (+34 over S146); within-node parity **1005/0**; pre-push gate passed end-to-end (NO `--no-verify`).
- **known-gaps §0:** HIGH **0** · MED **12** · LOW **14** · Nominal **9**.
- **Worktrees:** main only (2 dispatched this session — match-feat + E-DG-002 — both file-delta-landed + cleaned).
- **Inbox:** empty. **Outbox sent:** master (push-coord) · giti + 6nz (`:>`-deprecation / W-MATCH-ARROW-LEGACY FYI).
- **2 dev-agent dispatches**, both clean-landed via S67 file-delta + PA-independent R26 + S147 branch-leak coherence checks; zero path-discipline incidents; BRIEF.md archived for both (S136).

### What shipped — see §"🔬 S147 EXECUTION LOG" + §"🐛 S147 BUG ARC" below + changelog S147 + master-list §0.6 S147 + known-gaps §0 S147.

### Open / carry-forward → S148 (also in master-list §0.6)
- **match-`:>` tail (deprecation window):** corpus mass-migration (`migrate --fix` ready — but bundles the `<machine>`→`<engine>` baseline migration; decide whether to run the full deprecation-sweep vs ride the window) · SPEC worked-examples (manual) · **standalone-`given x => body` scope-question** (deep-dive scoped match+`!{}` only — does standalone `given`'s `=>` flip to `:>`? 3 doc sites parked).
- **Open MEDs:** C4 (object-literal lifecycle E-TYPE-001, flagship) · C6 (formFor bind in engine state-child) · R28-8 (design call: extend §14.10 vs canon-fix §4.8) · `:`-shorthand-state-body fragility (S145) · Bug 60.
- **NEW LOW (deferred, S147):** `<` inside a markup-region lambda body parse-truncates → spurious E-DG-002 as a symptom (tokenizer `<`-disambiguation; broader).
- **Tiny follow-up:** SPEC §34 E-PA-002 row summary stale ("invalid protect= syntax" — actually shadow-DB-can't-build); 1-line fix.
- **Ratified-arc impl:** D-runtime arc (027B) · §51.0.H-C1 on-enter · tier-rung re-deep-dive · 12 non-compliance deref-to-scrml-support candidates.

---

## 🟢 S147 OPEN — session-start state

- **HEAD scrmlTS:** `7be403dd` (S146 wrap commit). Clean. origin **0/0**.
- **scrml-support:** clean, origin **0/0**.
- **Cross-machine sync:** both repos fetched + verified 0/0 at OPEN. No staleness.
- **Inbox:** EMPTY (`handOffs/incoming/` no `.md` files).
- **Git hooks:** configuration B (local-rich) — `.git/hooks/` has pre-commit + post-commit + pre-push. Leave as-is.
- **Tests (carried from S146):** full suite green (~22,303 pass / 223 skip). Website was docs-only — no test delta.
- **known-gaps §0 (carried):** HIGH **0** · MED **14** · LOW **15** · Nominal **9**.
- **Worktrees:** main only (`git worktree list`). None to clean.
- **Maps:** `.claude/maps/` watermark `948d3f2f` (committed `46229a39`, S146). HEAD is 9 commits ahead — ALL docs-only (website currency + SPEC §40.9.5 + wrap); **zero compiler-source changes since the map refresh**, so maps are current for any compiler-source dispatch. Refresh only needed if next work touches website/docs structure.
- **`full wrap` directive:** NOT active.

## 🔬 S147 EXECUTION LOG

**Arc: match arm-arrow `:>` canonical — CORE COMPLETE (largest fully-ratified target; user "go go go").**
- **Branch-leak coherence addendum RATIFIED** (pa.md S147; scrml-support `a81fe59`, unpushed 1-ahead) + memory `feedback_branch_leak_coherence_check`. Self-applied all session (`rev-list origin/main...HEAD` checks held — `0 4` at arc close, all PA-authored).
- **SPEC §18.2/§19/§34 normative core** (`a2930106`): grammar `match-arm ::= arm-pattern (':>' | '=>' | '->') arm-body` (`:>` added — was undocumented despite corpus-dominant); `:>` canonical, `=>`/`->` deprecated aliases; §18+§19 alias-note callouts; new `W-MATCH-ARROW-LEGACY` §34 row (info, arm-scoped, mirrors W-LIFECYCLE-LEGACY-ARROW); E-MATCH-ARM-SEPARATOR text; SPEC-INDEX regen. Wildcard `else`/`_` + variant `.`/`::` UNTOUCHED.
- **Docs migration (clean cases)** (`f0d7db3b`): PRIMER §6/§6.2/§7 + kickstarter match/derived-match/handler/anti-pattern arms → `:>`.
- **Dispatch BRIEF.md archived** (`e34de551`, S136).
- **Compiler-source landing** (`f444290a`, via S67 file-delta from agent `a033b8f5ef0bd0b98` @ `e50b3b72`): ast-builder.js `matchArrowGlyphAt` + glyph-preservation on all match-arm + `!{}`-handler-arm sites (`->` arms now STRUCTURED, were bare-expr; `->` NOT merged into one OPERATOR — protects fn-return path); type-system.ts `W-MATCH-ARROW-LEGACY` emission (match + handler, info, arm-scoped); migrate.js AST-driven `rewriteMatchArmArrows` + `--fix`; 19 new tests + coupled m67-d3 update. **PA-independent R26 PASS**: lint fires 2× arm-scoped on `->` handler arms, migrate --fix rewrites exactly those, arrow-fn `(x)=>` + fn-returns `-> T` UNTOUCHED, post-migrate emit BYTE-IDENTICAL. Full gate 15314/0. Worktree cleaned (main only).

**Arc TAIL (rideable on deprecation window — NOT blocking the milestone):**
1. **Corpus mass-migration** (~300+ `.scrml`: `->` ~300 + arm-`=>` via `bun scrml migrate <dir> --fix`) — tool-built + verified safe (byte-identical). RECOMMEND as a deliberate step (large blast radius — surface before mass-rewriting; window makes it non-urgent). Full `bun test` gate after (corpus = test fixtures).
2. **SPEC worked-example migration** (the "real labor" — manual `=>`/`->` arm → `:>` across §18/§19/§51/§41 examples; covered by "examples may use either form" during window). Use the landed lint as the arm-vs-lambda oracle on extracted blocks.
3. **OPEN QUESTION (user input):** standalone `given x => body` presence-guard (§42.2.3) is outside the deep-dive's match+`!{}` scope, but its `=>` is the same maps-to relation; leaving it `=>` while in-`match` `given`-arms flip reads inconsistent. **Does standalone `given`'s `=>` also flip to `:>`?** 3 doc sites left as `=>` pending (PRIMER §6.5; kickstarter 297/1086/1113). Valid during window regardless.
4. **Lint-coverage follow-up (optional):** the nudge fires on `!{}` handler arms + the match contexts `checkMatchDiagnostics` walks (markup `${match}` + top-level/let-decl), NOT derived-RHS `const <x> = match` nor match-in-fn-body (raw-text, pre-existing). `migrate --fix` catches all via full-AST walk regardless. Tightening the lint coverage is optional info-level completeness.

**PUSH-PENDING:** main **4 ahead** (`a2930106` `f0d7db3b` `e34de551` `f444290a`) · scrml-support **1 ahead** (`a81fe59` pa.md addendum) — both unpushed; no push authorization given this session.

## 🐛 S147 BUG ARC (user: "move to bugs" / "go" — HIGH=0; working MED+LOW backlog)

- **Triage (R26 reverse-direction — confirm before fix):**
  - **R28-1d** (bare-`<program>` default-logic drops `<ul>`/`<each>`) → **NOT-REPRODUCED** on HEAD `f444290a`; canonical bare-`<program>` + `<ul><each>` emits each-wiring correctly. Close as not-reproduced; flag for original-dev-source recheck (may be repro-specific or already fixed). known-gaps: MED -1.
  - **S146 match-DG** (`<match on=@cell>` spurious E-DG-002) + **R27 C9** (derived `.filter()` arrow read spurious E-DG-002) → **BOTH CONFIRMED** reproduce; genuine-unused `@reallyUnused` correctly still fires (regression baseline). Same class (DG reader-accounting under-count; codegen/runtime correct).
- **R28-4 (E-PA-002 misleading diagnostic) → RESOLVED PA-direct `bf5ad0db`.** Root: `extractCreateTableStatements` (protect-analyzer.ts) recursed ONLY `node.children`; `?{} CREATE TABLE` under `body` (top-level `${}` logic block + fn-decl bodies) was invisible → spurious E-PA-002 while the message told adopters to "add CREATE TABLE in a `?{}` block" (they had). AST-dump-confirmed the `logic.body[0]` / `function-decl.body[0]` paths. Fix = generic cycle-safe deep-walk (skip `span`+`_`-keys, depth-cap). Message was correct; scanner was broken. PA R26: both reproducers build shadow DB exit-0; genuine-missing guard holds. +3 regression tests (nest sql under `body` — the position existing top-level-only tests never covered, which is why the gap shipped). suite 43→46/0. Full pre-commit gate passed.
- **E-DG-002 false-positive class (S146 + C9) → DISPATCHED** `ae60844ec0f682c88` (background worktree; BRIEF.md archived `docs/changes/e-dg-002-false-positive-class-2026-05-31/`). Fix: credit (A) derived-RHS arrow-body `@var` reads + (B) markup block-form `<match on=@cell>` headers to `reactiveVarReaders`; HARD guard genuine-unused still fires. **PENDING LANDING** — file-delta + R26 + S147 coherence + worktree cleanup when it completes. Closes 2 LOW ledger items.
- **known-gaps ledger update PENDING** (consolidated post-DG-landing): R28-4 RESOLVED · R28-1d NOT-REPRODUCED · S146+C9 RESOLVED (on DG landing) · §0 counts. **Tiny follow-up noted:** SPEC §34 E-PA-002 row summary is stale ("invalid protect= syntax" — actually shadow-DB-can't-build); 1-line fix, not bundled.

## Session-start checklist — DONE
1. ✅ Read pa.md (`../scrml-support/pa-scrmlTS.md`) in full.
2. ✅ Read `docs/PA-SCRML-PRIMER.md` in full (1428L).
3. ✅ Read `compiler/SPEC-INDEX.md` in full (381L).
4. ✅ Read `master-list.md` §0 dashboard (live phase status + recent session entries S136–S146).
5. ✅ Read `hand-off.md` (S146 CLOSE) → rotated to `hand-off-150.md`.
6. ✅ Read last contentful user-voice entries (S143–S146).
7. ✅ Rotated hand-off; created this fresh file.
8. ✅ Cross-machine sync hygiene (fetch + ahead/behind both repos).
9. ✅ Inbox check (empty).

## Open questions / S147 priorities (CARRY-FORWARD from S146)

**Ratified arcs awaiting implementation:**
1. **D-runtime arc (027B)** — server-render-time role-gating runtime; framework-owned dynamic-target gate. Start WHEN HIGH-LEVERAGE; Nominal/spec-ahead. Deep-dive `giti-027b-per-role-ssr-content-stripping-2026-05-30.md` is the design substrate. §58 build-target is the A/D bridge.
2. **§51.0.H-C1 on-enter impl arc** (carried S144) — `effect=` on `<engine>` opener (boot-only init→initial= edge effect; Insight 33). Needs: SPEC §51.0.H amendment + `effect=`-on-opener codegen + §51.0.R module-init linkage + 3 edge-case rulings (E-ENGINE-EFFECT-ON-DERIVED; errorBoundary scope over boot-effect throw; boot-effect ordering vs `<onIdle>` arming) + README Stage-3 flagship canon fix (self-target → opener-`effect=`).
3. **match `:>`-canonical impl arc** (carried S145) — `:>` ratified SOLE canonical arm-arrow; `=>`/`->` → deprecated aliases. Needs: new `W-MATCH-ARROW-LEGACY` lint (ARM-CONTEXT-SCOPED — `=>` stays valid as lambda) + AST-driven `bun scrml migrate --fix` (must NOT regex) + SPEC §18/§19/§34 amendment + docs migration (SPEC/PRIMER/kickstarter taught `=>`). `!{}` handler arms move in LOCKSTEP (shared parser rule). Codegen cost ZERO (already build identical AST/JS). Deep-dive `match-arrow-colon-canonical-2026-05-30.md`.

**Design re-examinations queued:**
4. **Tier-rung re-deep-dive** (carried S144) — the S64 `tier-ladder-rungs-stability` rejection was corpus-ouroboros-driven (corpus-zero made decisive one session before pa.md Rule 2 forbade exactly that). Re-evaluate the intermediate-rung / Tier 0→1 jump-pain question on pure DX merits: corpus-zero discounted, re-tested on current post-R24-R28 gauntlets, inheriting the on-enter "design-for-witnessed-need" precedent. Probably its own session; ideally AFTER the on-enter (C1) arc lands.

**Bug/diagnostic follow-ups:**
5. **`:`-shorthand robustness fix** (NEW MED, S145) — `:`-shorthand-state-body engines hit `E-STRUCTURAL-ELEMENT-MISPLACED` block-splitter fragility. User ratified KEEP-`:`-shorthand → this is a BUG TO FIX (not a form to retire). Mandatory-whitespace-after-`:` noted as ergonomic wart (not changing now).
6. **E-DG-002-on-block-match LOW confirm** (NEW, S146) — block-form `<match on=@cell>` doesn't register `@cell` as a DG consumer → spurious E-DG-002 (cosmetic; observed in recipe-verify). Needs-confirm.
7. **R28 residual needs-confirm** (carried): R28-1c (`<each>` same-key per-item-reactivity gap — general) · R28-1d (bare-`<program>` default-logic drops `<each>`) · R28-8 the one un-decided (bare-variant inference into object-literal fields: extend §14.10 vs fix kickstarter §4.8) · R28-4 (E-PA-002 misleading diagnostic, MED) · R28-7b (predicated-base-in-union still unmappable).

**Website (deferred-cosmetic — user's call, S146):**
8. 12 availability-table "Since" columns (still show v0.3.0/S57 internal refs) + bare-prose engine/match/onTimeout state-child bodies → quoted `"..."` display-text literals.

**Hygiene / housekeeping:**
9. **12 non-compliance deref-to-scrml-support candidates** (from S146 map refresh; see `.claude/maps/non-compliance.report.md`) — stale v0next planning/audit docs. Cleanup parked.
10. **within-node allowlist staleness** (~40 stale-high entries; carried) — hygiene pass.
11. **native parser M2.4 + MK2** (charter B multi-quarter arc continues) · native-parser brace-less-`continue`/`break` label fix.
12. **fresh gauntlet R29** (vs v0.7.0+ baseline).

## pa.md directives in force
- **S136** BRIEF.md archival (per `isolation:worktree` dispatch) · **S138** R26 bidirectional empirical-verification doctrine · **S139** `full wrap` discriminator (not active) · **S146** `feedback_show_visual_work_before_push` (serve UI in browser before push).
- **CANDIDATE PENDING (carried S142→S146):** branch-leak coherence addendum — verify `git rev-list origin/main..HEAD` + branch-tip-vs-FINAL_SHA on every dispatch landing, not just `git status`. Surface for ratification.
- Standing: `--no-verify` prohibition (extends pre-push) · S126 Bash-edit + no-`cd`-into-main · S99 path-discipline (counter 20) · S88 explicit `isolation:worktree` · S90 CWD gate · S83 commit-discipline + verify-git-state-not-narrative · S94 bump-on-tag.
- Rules: R1 no-marketing-unless-user-raised · R2 not-a-toy · R3 right-beats-easy · R4 SPEC-normative · R5 shoot-straight.

## Tags
#session-147 #OPEN #caught-up #carry-forward-027B-D #carry-forward-C1-on-enter #carry-forward-match-colon-arrow #tier-rung-re-deepdive #known-gaps-HIGH-0
