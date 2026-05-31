# scrmlTS — Session 148 (CLOSE)

**Date:** 2026-05-31
**Previous:** `handOffs/hand-off-151.md` (S147 CLOSE).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-152.md` at S149 OPEN.

---

## 🏁 S148 CLOSE (`push it` + `capture it all` / wrap)

- **HEAD scrmlTS:** `a0f61a20` — pushed origin **0/0**. 7 session commits: `189143a2` maps · `8056ff5d` C1 SPEC · `e41c95d4` C1 compiler · `07bc712c` corpus arm sweep · `5b24c46f` given-`:>` SPEC · `8d2d699b` SPEC worked-examples · `a0f61a20` given-`:>` compiler.
- **scrml-support:** pushed **0/0**. 2 commits: `dff0e41` C1 docs (design-insight 33 + deep-dive + user-voice) · `23433ea` self-demo-website deep-dive.
- **Cross-machine:** both repos **0/0** with origin post-push; pre-push gate passed (full suite + TodoMVC, no `--no-verify`).
- **Tests:** full suite **22,376 pass / 0 fail / 220 skip / 1 todo**; within-node 1005/0.
- **known-gaps §0:** HIGH **0** · MED **13** (+source-map-stub) · LOW **14** · Nominal **8** (§51.0.H-C1 implemented).
- **Worktrees:** main only (4 dispatched this session — C1 ×2 [crash+finish], given-compiler, SPEC-examples — all file-delta-landed + cleaned). **Inbox:** empty.
- **THREE ARCS:** (1) engine on-enter `effect=` Fork C1 SHIPPED (crash-recovered) · (2) match-`:>` tail CLEARED · (3) self-demo-website deep-dive DONE + 2 experts FORGED. See §"🌐 S148 WEBSITE", §"🔬 S148 MATCH-`:>` TAIL", §C1 sections below + changelog S148 + master-list §0.6 S148 + known-gaps §0 S148 + user-voice S148.

### ⭐ S149 FIRST ACTION — run the F1+F2 provenance-architecture debate (see §"🌐 S148 WEBSITE")
Experts ready in `~/.claude/agents/` (`source-map-provenance-expert` + `in-browser-compilation-expert`). Brief = `scrml-support/docs/deep-dives/scrml-self-demo-website-2026-05-31.md`. **CAVEAT:** the deep-dive's sub-agent (`Task`) dispatch was DENIED by the runtime — `@debate-curator` may hit the same; be ready to PA-orchestrate (dispatch each expert via Agent + run debate-judge). Then (c) no-regrets builds (engine "what-comes-next" view + fix the source-map stub).

### Carry-forward backlog → S149 (also master-list §0.6 S148)
- **3 S148 findings → known-gaps detail:** source-map stub (NEW MED, the deep-dive crux) · `derived=match` not covered by match-`:>` tooling (triage) · `migrate` `<machine>`-in-comment over-reach (tool bug).
- **S147-carried:** open MEDs C4 (object-literal lifecycle E-TYPE-001) / C6 (formFor-in-engine) / R28-8 (design call) / `:`-shorthand fragility / Bug 60 · D-runtime arc (027B) · tier-rung re-deep-dive · 12 non-compliance deref candidates.

---

## 🟢 S148 OPEN — session-start state

- **HEAD scrmlTS:** `09f74bee` (S147 wrap commit). Clean. origin **0/0**.
- **scrml-support:** clean, origin **0/0**.
- **Cross-machine sync:** both repos fetched + verified `0 0` (behind/ahead) at OPEN. No staleness.
- **Inbox:** EMPTY (`handOffs/incoming/` no `.md` files).
- **Git hooks:** configuration B (local-rich) assumed (carried — pre-commit + post-commit + pre-push). Not re-verified at OPEN; verify before first push if relevant.
- **Tests (carried from S147 close):** full suite **22,337 pass / 0 fail / 219 skip**; within-node parity **1005/0**.
- **known-gaps §0 (carried):** HIGH **0** · MED **12** · LOW **14** · Nominal **9**.
- **Worktrees:** main only (S147 cleaned both dispatched worktrees). None to clean.
- **Maps:** `.claude/maps/` watermark `948d3f2f` (committed `46229a39`, S146). HEAD is ahead by the full S147 set; **3 of those touched compiler-source** — `f444290a` (ast-builder.js `matchArrowGlyphAt` + type-system.ts W-MATCH-ARROW-LEGACY + migrate.js), `bf5ad0db` (protect-analyzer.ts deep-walk), `07655674` (dependency-graph.ts E-DG-002 credit). **Maps are STALE for those files.** Refresh (incremental) before any compiler-source dispatch touching ast-builder/type-system/migrate/protect-analyzer/dependency-graph, OR brief the agent to treat map content as starting-hypothesis-to-verify for those files.
- **`full wrap` directive:** NOT active.

## Session-start checklist — DONE
1. ✅ Read pa.md (`../scrml-support/pa-scrmlTS.md`) IN FULL (1068L).
2. ✅ Read `docs/PA-SCRML-PRIMER.md` IN FULL (1428L).
3. ✅ Read `compiler/SPEC-INDEX.md` IN FULL (384L).
4. ✅ Read `master-list.md` §0 LIVE DASHBOARD (§0.1 phase progress + §0.6 surfaced-divergences head incl. S147 entry + carry-forward).
5. ✅ Read `hand-off.md` (S147 CLOSE) → rotated to `hand-off-151.md`.
6. ✅ Read last contentful user-voice entries (S145–S147; S146 GITI-027B ratification; S147 working-style + branch-leak addendum).
7. ✅ Rotated hand-off; created this fresh file.
8. ✅ Cross-machine sync hygiene (fetch + ahead/behind both repos — `0 0`).
9. ✅ Inbox check (empty).
10. ⏳ Prompt user re: incremental map refresh (surfaced in OPEN report).

## Durable working-style directive in force (S147 user-voice)
> "pick the largest target that is high priority and that is fully ratified and go go go, if my input is needed, park the progress and move on to what you can"

When given an open "what's next" mandate: pick the LARGEST target that is BOTH high-priority AND fully-ratified-FOR-IMPLEMENTATION (distinguish from ratified-as-direction-but-gated, e.g. D-runtime/027B which is gated). Drive autonomously; PARK genuine input-needed walls and move on rather than blocking. Pairs with Rule 3 (largest-RIGHT-target, not lowest-touch).

## 🔬 S148 EXECUTION LOG (IN-FLIGHT)

**Session work so far:**
1. **Maps refresh** (`189143a2`, pushed-pending) — incremental refresh of the 6 maps affected by the 5 S147 compiler-source files; watermark `948d3f2f`→`09f74bee`. project-mapper reported zero non-compliance. Pre-commit + coherence-check clean.
2. **Engine on-enter C1 arc — RATIFIED + IN FLIGHT** (Insight 33 Fork C1, carried from S144). User: "go on the on-enter C1 arc."
   - **3 edge-case rulings settled via AskUserQuestion (S148, durable design):**
     - (i) `<errorBoundary>` does NOT catch a boot-effect throw (render-context only; `!` failures route via the effect's own `!{}` into the engine error variant; non-`!` throw → §19.6.8 backstop).
     - (ii) onIdle ordering → variant inits → `<onIdle>` arms (module-init=first event) → opener effect fires; effect's init→initial edge does NOT reset the watchdog; cross-variant writes inside reset normally.
     - (iii) `effect=` on a `derived=` opener → FORBID, new code `E-ENGINE-EFFECT-ON-DERIVED`.
     - (history-restore ordering MOOT for C1 — C1 is boot-only.)
   - **Phase 1 (PA-direct) LANDED `8056ff5d`** — SPEC normative core: §51.0.H NEW Form 3 (opener `effect=`, boot-only Elm init) + amended Skipped note; §51.0.B opener attr+syntax; §51.0.J E-ENGINE-EFFECT-ON-DERIVED rule row; §51.0.R ordering note; §51.0.F.1 self-WRITE/self-TARGET/construction trichotomy graft; §34 +1 row; SPEC-INDEX regen + S148 notes; README Stage-3 flagship fix (self-target → opener effect=, `:>` arms); PRIMER §7. Pre-commit + post-commit passed. Honest spec-ahead until Phase 2 wires the compiler.
   - **Phase 2 — DISPATCHED, agent `a0e864eeba0e8c568` CRASHED mid-codegen (transient socket error, 97 tool-uses/27min), RECOVERED.** BRIEF.md archived (S136). The crashed agent got through: parser (ast-builder.js opener `effect=${...}` capture → `openerEffect` field) + within-node rebump + SYM (symbol-table.ts: `openerEffect` on `EngineMetadata` + `E-ENGINE-EFFECT-ON-DERIVED` firing before the legacy-source-var skip) — ALL COMMITTED + gated. Then wrote the codegen (emit-engine.ts `emitEngineOpenerEffect`+`emitEngineOpenerEffectsForFile` re-parsing the raw opener body via BS+TAB → `emitLogicBody` so `@phase=.X` routes through `_scrml_engine_direct_set`; boot-only after onIdle arm; tree-shake; emit-client.ts wire-in) — UNCOMMITTED at crash + UNVERIFIED (never compiled/tested). Write-validation DEFERRED (B15 raw-text precedent, as authorized). **Recovery:** main verified clean (NO leak, 0/2); checkpoint-committed the codegen to the crashed agent's branch (`14ee3f4a`); **re-dispatched FINISH agent `aa0b4a7e4a932912e`** which inherited via `git merge`, verified the codegen's unrun API calls (one type-only fix: `EmitLogicOptsLike`→`EmitLogicOpts`, exported it), wrote tests + happy-dom acceptance, ran R26, gated. Finish agent reported clean (FINAL_SHA `f6315770`; full suite 22357/0; its own branch-leak check clean).
   - **Phase 2 LANDED `e41c95d4`** via S67 file-delta (9 files: ast-builder.js parser + symbol-table.ts SYM/E-ENGINE-EFFECT-ON-DERIVED + emit-engine.ts/emit-client.ts/emit-logic.ts codegen + 2 new test suites +332 unit/+162 browser + within-node rebump + progress.md). **PA-INDEPENDENT R26 (clean bare-body reproducer): all 3 green** — boot effect at module-init in the §51.0.H Form 3 block (`@phase` → `_scrml_engine_direct_set`); `node --check` clean; derived+opener-effect → E-ENGINE-EFFECT-ON-DERIVED (exit 1). **Initial PA-R26 panic was a reproducer artifact** — my all-`:`-shorthand engines tripped the KNOWN S145 `:`-shorthand-state-body fragility (`E-STRUCTURAL-ELEMENT-MISPLACED`), unrelated to C1; bare-body reproducer confirmed C1 works. Write-validation DEFERRED (B15 raw-text precedent; `.skip` test) — runtime §51.0.F check still fires; tracked as a LOW (consistent with the existing in-state-child-body deferral). **S147 coherence held: main 0/3, all PA-authored; both agent worktrees cleaned (main only).**
   - **Same-landing docs DONE:** design-insight 33 → IMPLEMENTED + 3 rulings; deep-dive → historical + DISPOSITION banner; user-voice S148. Committed scrml-support `dff0e41`.

**Remaining wrap-steps (maintained-tier, not blocking):** known-gaps §0 (Nominal 9→8: §51.0.H-C1 was a Nominal entry, now implemented; + file the deferred opener-effect write-validation as a LOW) · master-list §0.6 S148 entry · hand-off finalize.

**PUSH-PENDING:** scrmlTS main **3 ahead** of origin (`189143a2` maps · `8056ff5d` C1 SPEC core · `e41c95d4` C1 impl) · scrml-support **1 ahead** (`dff0e41` C1 docs) — ALL unpushed; no push authorization given yet this session.

## 🌐 S148 WEBSITE — self-demonstrating compile-transparent scrml.dev (STRATEGIC ARC — deep-dive DISPATCHED)

**User thesis (S148, durable):** *"no one is going to take scrml seriously unless they see it really in action first."* A self-demonstrating scrml.dev: scrml src (left, syntax-highlighted) | the live site (middle, IS a scrml app) | compiled JS/HTML/CSS (right), with **real (compiler-emitted, NOT faked) color-coordinated src↔output mapping**, an engine **"what-could-come-next"** reachable-state view, KB nav, test-dashboard embed, modern next-gen nav. Ratified: self-demo · engine-heavy · **real provenance** · **full replacement** of the current ~97-page site · next-gen nav (current is plain-HTML/no-animation).

**CRUX = span provenance** (source-span → emitted JS/HTML/CSS spans, bidirectional) — scrml doesn't emit it today; it's the load-bearing dependency AND a v1.0-debuggability necessity anyway (browser devtools error→`.scrml` mapping). The "what-comes-next" engine view is nearly free (the compiler already has the transition graph). PA refinement: three-column godbolt frame is the flagship mode for engine-heavy DEMO pages, lighter views for reference (≠ every page three-column).

**DEEP-DIVE DONE + PUSHED** — `scrml-support/docs/deep-dives/scrml-self-demo-website-2026-05-31.md` (scrml-support `23433ea`, on origin). 378 lines. **KILLER FINDING (source-verified):** scrml's source maps are a DEGENERATE STUB today — `compiler/src/codegen/index.ts` ~L938/949 calls `addMapping(i, 0, 0)` for every output line → the entire compiled file maps to source 0:0. Structurally-valid Source Map v3 that carries ZERO provenance — misleading, not just missing; §47.5 already PROMISES real maps (SPEC ~L21421). **Crux shrinks:** spans already tracked on every token + AST node; the work is threading span into ~40 `emit-*.ts` emitters (instrumentation, not analysis). **Free win:** engine "what-comes-next" view is ~90% data-exposure (`engineMeta.stateChildren` + the already-shipped `__scrml_transitions_*` client-bundle table) — ship regardless. **3 forks → debate:** F1 pre-computed-static vs in-browser-live (esbuild-wasm ~11MB / self-host à la Elm Guida) · F2 Source-Map-v3-only vs custom-bidirectional-JS+HTML+CSS · F3 emitter-threading (lower-stakes). Eliminated: faked-mapping, B2-as-substitute. **Honest gap:** the dev-persona poll was SYNTHESIZED (runtime denied the deep-dive's sub-agent dispatch), not live — a live re-poll is Q5.

**USER DECISION (S148): (c) greenlit** the no-regrets first moves (ship engine "what-comes-next" view + FIX the lying source-map stub) + **forge the 2 experts (DONE)** + **run the F1+F2 debate FIRST THING NEXT SESSION.**

**S148 VISION ADDITIONS (ratified/captured; detail in user-voice S148 + master-list §0.6):** (a) **"what kind of app" range toggle = PROGRESSIVE-ENHANCEMENT LAYERS** (no-JS old-school-HTML ↔ comprehensive-pages ↔ fancy-SPA; toggle the PE layer to PROVE the no-JS baseline is real — NOT a recompile-target; ties to §40.8 SPA-inference + scrml's PE default). (b) **auth scoped to a DOGFOOD** (sign-in/out/prefs/settings; community space DEFERRED — product, and gated content depends on 027B-D). (c) **scrml PLAYGROUND** = the in-browser-live-compile fork (F1-C2) made a destination; PA: likely the single highest-leverage adoption artifact; heavy thumb toward F1→C2. (d) **interactive "build YOUR project" tutorial** (NEW) — teach scrml's generic PRINCIPLES via the visitor's own small-but-doable project, not a fixed example; "choose your own adventure" = a DECISION TREE over scrml's FINITE PRIMITIVE SURFACE (state-w/-transitions→engine · form→formFor · real-time→channels · auth→scrml:auth · list→`<each>`); the GUIDED PATH THROUGH THE PLAYGROUND (depends on in-browser-compile → another F1→C2 thumb). Open fork: deterministic-decision-tree vs LLM-adaptive. All feed the next-session website/learning-system design + the F1 architecture decision.

**NEXT-SESSION FIRST ACTION — run the F1+F2 debate.** Experts FORGED + READY (in `~/.claude/agents/`, load at session start): `source-map-provenance-expert` (164L, argues real/standard/complete provenance + F2-A1 Source-Map-v3) + `in-browser-compilation-expert` (149L, argues in-browser-live + F1-C2). Both opus, Read-only. **Debate framing (deep-dive Phase-5 rec):** F1 (C1 pre-computed-static vs C2 in-browser-live) COUPLED with F2 (A1 Source-Map-v3 vs A2 custom-bidirectional-JS+HTML+CSS); brief = the deep-dive doc. Consider adding `simplicity-defender` (does three-column-everything over-reach?). **CAVEAT:** the deep-dive's sub-agent (Task) dispatch was DENIED by the runtime — so `@debate-curator` (which spawns expert sub-agents) may hit the same; be ready to PA-ORCHESTRATE the debate (dispatch each expert directly via Agent + run debate-judge) if curator's sub-spawns are blocked. Per `feedback_no_greek_chars_in_options` keep any option labels ASCII.

**(c) no-regrets builds (greenlit, sequence after/with the debate — source-map-fix SCOPE depends on F2):** (1) fix the source-map stub — thread real spans into the JS Source Map v3 at the emit point (~40 emit-*.ts); minimal JS-v3 version is fork-independent, HTML/CSS scope is F2-dependent. (2) expose the engine transition-graph as queryable data (compiler side; fully fork-independent — `__scrml_transitions_*` already shipped).

**3 S148 FINDINGS → known-gaps at wrap (per pa.md don't-soft-classify):**
- **Source-map stub (HIGH-ish, adopter-facing):** §47.5 promises source maps; compiler emits structurally-valid-but-empty v3 (`addMapping(i,0,0)`). A dev opening devtools sees every error at line 0. Real gap, not doc gap. (= the deep-dive crux.)
- **derived=match arms not covered by match-`:>` tooling** (SPEC-examples agent): `derived=match` arms held as raw matchBody string; NOT flagged by W-MATCH-ARROW-LEGACY nor rewritten by `migrate --fix`; 3 SPEC §51.0.J lines left `=>`. Triage: should derived=match participate in the `:>` deprecation? If yes, extend lint+migrate to that path, then flip.
- **migrate.js Migration-2 comment over-reach** (corpus sweep): `<machine>`→`<engine>` regex rewrites inside COMMENT/string context (corrupted a hos.scrml comment). Tool bug — add comment/string skip.

## 🔬 S148 MATCH-`:>` TAIL (DONE — user: "clear the match tail now")

Both parked decisions ratified via AskUserQuestion (durable): **(Q1) standalone `given x => body` FLIPS to `:>`** (extend the §18.2 arm-separator canon); **(Q2) run the corpus arm-arrow sweep now** (arm-arrows only).

- **Corpus arm-arrow sweep LANDED `07bc712c`** — `migrate examples --fix` (AST-driven, arm-arrows only): 32 `=>`/`->`→`:>` across 7 example apps; byte-identical. **Scoped to arm-arrows** — reverted the bundled `<machine>`→`<engine>` (it over-reached into COMMENT text in `23-trucking-dispatch/.../hos.scrml`). **NEW FOLLOW-UP (tool bug):** migrate.js Migration-2 (`<machine>`→`<engine>`, regex) doesn't skip comment/string context. **samples/+tests/ NOT swept** (migrate excludes them by default — they intentionally exercise deprecation-path fixtures; correct). stdlib `->` are fn-returns (untouched).
- **Standalone-`given` SPEC amendment LANDED `5b24c46f`** — §42.2.3 grammar `(':>' | '=>')` + separator note (`:>` canonical, `=>` deprecated) + §34 NEW `W-GIVEN-ARROW-LEGACY` (sibling of W-MATCH-ARROW-LEGACY, given-guard-scoped) + worked examples → `:>` + SPEC-INDEX regen. Honest spec-ahead until the compiler lands.
- **Standalone-`given` compiler DISPATCHED — agent `a22404aa65fd74463`** (BRIEF.md archived `docs/changes/match-given-colon-2026-05-31/`). Parser (`:>` at ast-builder.js ~5760 given-guard + `separatorGlyph` field) + W-GIVEN-ARROW-LEGACY lint + `migrate --fix` given-guard rule + tests. Mirrors the S147 match-arrow landing. **PENDING LANDING** — on completion: S147 coherence + S67 file-delta + R26 + worktree cleanup.

- **SPEC worked-examples migration DISPATCHED — agent `a2a5c847af354ebf6`** (BRIEF.md archived `docs/changes/spec-arm-arrow-migration-2026-05-31/`). Flip match + `!{}` arm `=>`/`->` → `:>` in SPEC.md ```scrml blocks; lint-oracle-first + structural rules; CONSERVATIVE (surface ambiguous, don't guess); produces `FLIP-MANIFEST.md` as PA's review surface. SCOPE explicitly EXCLUDES lambdas / fn-returns / lifecycle `->` / grammar productions documenting aliases / legacy `<machine>` rule arrows / standalone-given (Phase C) / prose. **PENDING LANDING** — PA review = manifest spot-check + DO-NOT-TOUCH boundary verify; then S67 file-delta + coherence + cleanup.

**Match-tail REMAINING (deprecation-window — both forms valid; non-urgent):**
- **In-match given doc fixes** (PRIMER §6.5 line ~612, kickstarter line 297 — `given u =>` arms INSIDE match → `:>`; supported now).
- **Standalone-given doc sites** (PRIMER ~601/875, kickstarter 1086/1113) — flip to `:>` AFTER the compiler lands (Phase C; else compiled-doc breakage).
- **`migrate --fix` re-run** for given-guards on examples after the compiler lands (any standalone-given corpus uses).

## Open / carry-forward → S148 (from master-list §0.6 S147 entry + hand-off-151)

**match-`:>` tail (deprecation window — rideable, NOT blocking):**
- **Corpus mass-migration** (~300+ `.scrml`: `->` ~300 + arm-`=>` via `bun scrml migrate <dir> --fix`) — tool ready + byte-identical-verified, but **bundles the `<machine>`→`<engine>` baseline migration**; decide whether to run the full deprecation-sweep vs ride the window. Large blast radius → surface before mass-rewriting. **NEEDS-INPUT (parked S147).**
- **SPEC worked-example migration** (manual `=>`/`->` arm → `:>` across §18/§19/§51/§41 examples; covered by "examples may use either form" during window). Use landed lint as arm-vs-lambda oracle.
- **Standalone `given x => body` scope-question** (§42.2.3) — deep-dive scoped match+`!{}` only; does standalone `given`'s `=>` also flip to `:>`? 3 doc sites parked as `=>` (PRIMER §6.5; kickstarter 297/1086/1113). **NEEDS-INPUT (parked S147).**
- Optional lint-coverage completeness (derived-RHS `const <x> = match` + match-in-fn-body raw-text contexts not walked; `migrate --fix` catches all regardless).

**Open MEDs (12):**
- **C4** — object-literal lifecycle E-TYPE-001 (flagship; carried R27→S147).
- **C6** — formFor bind in engine state-child scope.
- **R28-8** — design call: bare-variant inference into object-literal fields (extend §14.10 vs canon-fix kickstarter §4.8). **NEEDS DESIGN DECISION.**
- **`:`-shorthand-state-body fragility** (S145 NEW MED) — `:`-shorthand engine hits `E-STRUCTURAL-ELEMENT-MISPLACED` block-splitter fragility. User ratified KEEP-`:`-shorthand → BUG TO FIX (not retire). Mandatory-whitespace-after-`:` noted as ergonomic wart (not changing now).
- **Bug 60** — render-by-tag nested-compound (MED; deferred S140).

**NEW LOW (deferred, S147):** `<` inside a markup-region lambda body parse-truncates → spurious E-DG-002 as a symptom (tokenizer `<`-disambiguation; broader root). LOW count 14.

**Tiny follow-up (1-liner):** SPEC §34 E-PA-002 row summary stale ("invalid protect= syntax" — actually shadow-DB-can't-build). Not bundled S147.

**Ratified arcs awaiting implementation (gated / direction — NOT "go-now" per S147 selection rule):**
1. **D-runtime arc (027B)** — server-render-time role-gating runtime; framework-owned dynamic-target gate. Start WHEN HIGH-LEVERAGE; Nominal/spec-ahead. Deep-dive `giti-027b-per-role-ssr-content-stripping-2026-05-30.md` is the design substrate. §58 build-target is the A/D bridge. (A ratified canonical-now + recipe-verified S146.)
2. **§51.0.H-C1 on-enter impl arc** (carried S144) — `effect=` on `<engine>` opener (boot-only init→initial= edge effect; Insight 33). Needs: SPEC §51.0.H amendment + `effect=`-on-opener codegen + §51.0.R module-init linkage + 3 edge-case rulings (E-ENGINE-EFFECT-ON-DERIVED; errorBoundary scope over boot-effect throw; boot-effect ordering vs `<onIdle>` arming) + README Stage-3 flagship canon fix (self-target → opener-`effect=`). **This is the most-ratified "go-now" candidate of the gated arcs** — Fork C1 ratified, design-insight 33; implementation is enumerated.
3. **tier-rung re-deep-dive** (carried S144) — the S64 `tier-ladder-rungs-stability` rejection was corpus-ouroboros-driven (corpus-zero decisive one session before pa.md Rule 2 forbade exactly that). Re-evaluate intermediate-rung / Tier 0→1 jump-pain on pure DX merits; corpus-zero discounted; re-test on post-R24-R28 gauntlets; inherit on-enter "design-for-witnessed-need" precedent. Probably its own session; ideally AFTER on-enter (C1) lands.

**Hygiene / housekeeping:**
- **12 non-compliance deref-to-scrml-support candidates** (from S146 map refresh; `.claude/maps/non-compliance.report.md`) — stale v0next planning/audit docs. Cleanup parked.
- **within-node allowlist staleness** (~40 stale-high entries; carried) — hygiene pass.
- **Map refresh** — incremental refresh needed for the 5 compiler-source files S147 touched before any related dispatch.
- **native parser** M2.4 + MK2 (charter B multi-quarter arc) · native-parser brace-less-`continue`/`break` label fix.
- **fresh gauntlet R29** (vs v0.7.0+ baseline).

## pa.md directives in force
- **S136** BRIEF.md archival (per `isolation:worktree` dispatch) · **S138** R26 bidirectional empirical-verification doctrine · **S139** `full wrap` discriminator (not active) · **S146** `feedback_show_visual_work_before_push` (serve UI in browser before push) · **S147** branch-leak coherence addendum (verify `git rev-list --left-right origin/main…HEAD` AHEAD==PA-authored AND branch-tip==FINAL_SHA on every dispatch landing, not just `git status`).
- Standing: `--no-verify` prohibition (extends pre-push) · S126 Bash-edit + no-`cd`-into-main · S99 path-discipline · S88 explicit `isolation:worktree` · S90 CWD gate · S83 commit-discipline + verify-git-state-not-narrative · S94 bump-on-tag · S67 file-delta landing.
- Rules: R1 no-marketing-unless-user-raised · R2 not-a-toy · R3 right-beats-easy · R4 SPEC-normative · R5 shoot-straight.

## Tags
#session-148 #OPEN #caught-up #carry-forward-match-colon-tail #carry-forward-C1-on-enter #carry-forward-027B-D #carry-forward-tier-rung #known-gaps-HIGH-0
