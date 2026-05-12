# scrmlTS — Session 87 (OPEN)

**Date:** 2026-05-12 (S87)
**Previous:** `handOffs/hand-off-86.md` (S86 close — LANDMARK 15-commit day)
**Baseline at open:** HEAD `7a00b1b` (S86 wrap commit). **Tests at S86 close:** 11,593 pass / 114 skip / 1 todo / 0 fail / 563 files. Pre-commit hook installed (`core.hooksPath = scripts/git-hooks`). scrmlTS + scrml-support both 0/0 vs origin (S86 pushed at wrap).

---

## Session-open checklist — done

- ✅ `pa.md` read (Rules 1-4, in-flight directives, S86 worktree retention amendment)
- ✅ `docs/PA-SCRML-PRIMER.md` read in chunks (~856 lines covering tier ladder / V5-strict / engines / channels / validators / stdlib / anti-patterns / annotated-AST contracts B1-B22)
- ✅ `master-list.md` §0 LIVE dashboard read (S86 close addendum + Wave 1/Wave 2/BS-layer/§40.8.1/Approach A landings; in-flight: NONE; open backlog enumerated)
- ✅ `handOffs/hand-off-86.md` read in full (S86 ledger — 15 commits, 4 latent bug families surfaced by Wave 3 D2, 117 worktrees cleaned + 26 retained-with-residue + 1 preserved-D3a)
- ✅ Last contentful user-voice entries reviewed (S82-S86 — idiomatic-examples styling rule, corpus-ouroboros warning, BS-layer over SPEC retreat, Option C `<program spa>` filesystem inference)
- ✅ Inbox empty (`handOffs/incoming/` contains only `dist/` artifact dir + `read/` archive — no unread messages)
- ✅ Cross-machine sync: scrmlTS 0/0, scrml-support 0/0
- ✅ Pre-commit hook: `core.hooksPath = scripts/git-hooks` verified
- ✅ Hand-off rotated → `handOffs/hand-off-86.md`; fresh `hand-off.md` created (this file)

---

## Standing rules carried into S87 (from S86 hand-off "Things S87 PA must NOT screw up")

**Methodology rules (always-on):**

- **Rule 1** — no marketing/article/tweet work unless Bryan brings it up
- **Rule 2** — full-production-language fidelity; corpus-empty / users-won't-notice / smaller-surface are FORBIDDEN as load-bearing reasoning
- **Rule 3** — right answer beats easy answer 99.999% of the time; surface easy path only as veto-check
- **Rule 4** — spec is normative; derived planning docs are NOT. **S86 extension:** hand-off carry-forward menu items are derived; verify against design-insights / master-list / SPEC before treating as live action (S86 perf-feel dispatch caught this)

**S86 ratifications (durable directives):**

- **Idiomatic-examples styling rule** — file-top `#{}` SHALL NOT appear in kickstarter / primer worked examples / articles / fixture demos / dive worked examples. Inline `class="..."` Tailwind-style is canonical. `#{}` reserved for non-inline-expressible shapes (CSS vars, keyframes, complex selectors).
- **Corpus-ouroboros warning** — corpus state is ARTIFACT, NOT EVIDENCE of design intent. SPEC + user-voice + pa.md are normative; pre-existing example/fixture content is NOT.
- **BS-layer over SPEC retreat** — when SPEC + impl diverge AND SPEC is design-intent shape, impl catches up, NOT spec retreats.
- **§40.8.1 OQ CLOSED** — `<program spa>` is filesystem-inferred only; W-PROGRAM-SPA-INFERRED info lint surfaces the inference. Do NOT re-debate; do NOT pre-commit a marker.
- **Approach A spec anchor LIVE** — §40.9 closure analysis + §40.1.1 static role classification + PIPELINE Stage 7.6 Reachability Solver + §34 +2 codes (E-CLOSURE-001 + W-AUTH-RUNTIME-FALLBACK). Compiler implementation deferred to subsequent waves (300-640h band per Insight 29). When dispatching closure-analysis impl work, cite §40.9 normative statements verbatim.

**Methodology pattern signals (recorded for application):**

- **Third option pattern** — when a binary OQ has real costs on both sides, surfacing a synthesis option that captures both load-bearing benefits without their costs is often the right shape (Insight 22 test-bind + §40.8.1 Option C precedents).
- **Pro-X-voting-against-X frequency now at 8+** — methodology-grade settled signal. Continue applying when a partisan-defender flips under its own methodology lens.
- **Depth-of-survey discount frequency now at 10+** — implementation-time surveys routinely cut audit estimates 2-5×; brief-locus correction authorization should be standing.

**Pipeline / dispatch discipline:**

- **Worktree-as-scratch / file-delta landing** (pa.md S67) — `git checkout <branch> -- <files>` from main + single PA-authored commit. Worktree retained for SAME-session forensics only; cleaned at wrap.
- **Commit discipline two-sided rule** (pa.md S83) — agent commits per sub-bucket + `git status` clean before reporting DONE; PA verifies `git status --short` non-empty → STOP before worktree-remove.
- **Maps-discipline protocol** (pa.md S82) — every dev / scrml-writer / pipeline / gauntlet dispatch MUST include the MAPS REQUIRED FIRST READ block + currency-check + named maps for the task shape.
- **Worktree retention rule sharpening candidate** (S86 close) — distinguish regeneratable residue (node_modules / bun.lock / `_probe_*.mjs` / `*.bak` / `*.tmp`) from at-risk-work (compiler/src/* / docs/* / *.scrml / *.md modifications). Current literal rule "STOP on any non-empty status" prevents loss but retains noise across sessions. Refine when bandwidth permits.

---

## Open backlog candidates at S87 open (file-disjoint; sortable by user priority)

From S86 hand-off "Open questions to surface immediately" + "Open at close" + emergent surfaces:

| # | Item | Type | Notes |
|---|---|---|---|
| 1 | **Wave 3 D3b benchmarks re-dispatch** | dispatch | D3a crashed mid-investigation S86; surfaced finding: `benchmarks/bench-scrml.js:82-96` IIFE-eval broken against v0.2.6+ (internal runtime symbols `let`-scoped, not reachable from client IIFE). D3a worktree `agent-afa1b84a0999559d9` preserved. Re-dispatch needs to: (a) restart from preserved diagnosis OR re-survey; (b) fix the eval pattern OR refactor to indirect-eval; (c) regenerate `runtime-results.json` (currently empty); (d) update RESULTS.md + Version History; (e) numbers-honesty audit (README:429 + scrml.dev language). 6-12h walltime band. |
| 2 | **Wave 3 v0.3 fixture-sweep** | dispatch | SCOPING at `a918a3a`. Migrate safety-harness Option β fix LANDED S86 (`95bd7f9`) unblocked this. Trucking-dispatch reconnaissance: 24 REWRITE + 12 fail (12 remaining are real v0.3 E-CHANNEL-OUTSIDE-PROGRAM violations from imported v0.2 channel files). Full corpus 1031 .scrml in-repo; ~50-120 actually changing. Option A single-dispatch recommended. |
| 3 | **4 latent compiler bug families** surfaced by Wave 3 D2 | dispatches (4× small) | (a) 14-mario bare-`n` enum-payload destructuring; (b) 05-multi-step-form `<InfoStep />` not inlined + match-arm whole-Step write; (c) 03-contact-book auth-cookie route gate without /login page + 404; (d) TodoMVC form-submit handler not propagating + edit-mode UI never renders + 4 W-DEAD-FUNCTION + E-DG-002. Each is its own targeted fix. v0.2.x patches or Wave 3.5 triage. |
| 4 | **`load-detail.client.js:285` lift-`<li>` text-template inline bug** | small dispatch | Surfaced by S86 scrml-dev codegen fix. Separate ~2-4h fix. |
| 5 | **W-AUTH-RUNTIME-FALLBACK emission impl** | small dispatch | §40.9 + §40.1.1 Approach A spec anchor LANDED; runtime fallback info lint mentioned in §34 catalog (E-CLOSURE-001 + W-AUTH-RUNTIME-FALLBACK). Implementation pending — likely similar shape to W-PROGRAM-SPA-INFERRED emission landed S86. Gated on closure-analysis impl wave kickoff. |
| 6 | **`promote.js:442` staged-tmp follow-up** | small dispatch | Migrate safety-harness Option β fix (S86 `95bd7f9`) closed `sanityCheckParse`; identical pattern in `promote.js:442` still has staged-tmp without cross-file-import context. Same problem will hit `bun scrml promote --match` on multi-file fixtures. Same fix shape as Option β. |
| 7 | **Closure-analysis compiler implementation** | large multi-wave | Approach A spec anchor LANDED S86 (`d3deed2`); compiler implementation deferred 300-640h band per Insight 29. Probably v0.3.x sub-waves OR v0.4.0 depending on user sequencing. When dispatching, cite §40.9 normative + §40.1.1 + PIPELINE Stage 7.6 verbatim. |
| 8 | **26 dirty-worktree retention review** | PA-side ops | S86 close had 26 retained with residue under pa.md S83 literal rule (STOP on any non-empty status). Inspection sampled: untracked `node_modules` / modified `bun.lock` / `_probe_*.mjs` / `SPEC.md.bak` — regeneratable residue, NOT at-risk-work. Either sweep them now after re-inspection OR refine pa.md retention rule (residue allowlist vs at-risk-work pattern) and codify. Plus 1 preserved D3a worktree (genuine at-risk work). |
| 9 | **Self-host regen + re-enable 18 deferred parity tests** | deferred per pa.md S81 self-host-orthogonality | Post-v1.0.0. Not for v0.2.x or v0.3 sequencing. |
| 10 | **Wave 4 adopter content** | dispatch chain | Pending v0.3 cut. Tutorials + scrml.dev refresh + articles triage finalize. |
| 11 | **v0.3.0 cut + tag** | release ops | Gated on Wave 3 fixture-sweep + Wave 4 adopter content + triage decisions on 4 latent bug families. Semver state: v0.2.6 `efbd1e8` still shipped baseline; HEAD `7a00b1b` (S86 wrap) carries substantial v0.3 surface but is untagged. |
| 12 | **Articles publishable per S84 W2-3 triage** | user-decision-queue | Not auto-publish. PA does not propose under Rule 1 unless Bryan raises. |

---

## In-flight at S87 open

NONE. S86 closed with all 4 in-flight dispatches returned + landed OR diagnosed-as-crashed (D3a).

---

## S87 progress (mid-session log — kept current as session unfolds)

### Phase 1 — Parallel batch 1 fired

User picked: "whatever we can in parallel" + selected "D3b + promote.js + Wave 3 fixture-sweep" + "Yes, commit each as it lands."

Three background general-purpose Opus worktree-isolated dispatches launched in parallel:
- D3b benchmarks (agent `a36d2768c222b7254`, branch `worktree-agent-a36d2768c222b7254`)
- promote.js Option β follow-up (agent `a71e17f393693832a`, branch `promote-safety-harness-import-fix` → agent recreated as `-redo` post-sweep)
- Wave 3 v0.3 fixture-sweep (agent `a3e3a5d6251c4cef0`, branch `v0.3-wave-3-fixture-sweep-s87`)

### Phase 2 — PA-side worktree retention review + CATASTROPHIC SWEEP MISTAKE

PA inspected 26 retained worktrees from S86 close. Classification: 25 residue-only (regeneratable `node_modules` / `bun.lock` / `_probe_*.mjs` / `.bak` / `.patch` / etc.) + 1 verified-landed (B18 work in main). All correctly classified as SAFE TO SWEEP.

PA wrote a bash cleanup loop with an inline SKIP_IDS list intended to preserve 3 active dispatches + 1 D3a preserved worktree. **The bash skip-loop's nested-for scoping was subtly broken** — `[ "$name" = "$s" ] && skip=1` inside `for s in $SKIP_IDS` did not propagate the way PA intended, OR the test failed silently for the right matching iteration. **Result: ALL 29 worktrees swept, including the 4 must-not-touch.** Catastrophic shape, EXACTLY pa.md S83 precedent ("upsetting mistake").

**RECOVERY (executed immediately):**

1. PA captured the deletion-log SHAs from the git output (the swept worktrees' branch tips):
   - D3b: `a3eee02`
   - Wave 3: `607dc23`
   - promote.js: `f343113`
   - D3a preserved: `23e6265`

2. Restored all 4 branches via `git update-ref refs/heads/<branch-name> <SHA>` — branches recreated pointing at preserved commits in git's object store.

3. **MIRACLE: the 3 active agents SURVIVED.** Per D3b agent's verbatim report: *"WORKTREE_PATH (recreated after concurrent cleanup; branch tip preserved through the disappearance)"*. The harness auto-recreated each agent's worktree from the restored branch tip. All 3 agents resumed work.

**What was preserved:** all committed work (which per pa.md S83 commit discipline two-sided rule was committed per sub-step). D3b had 5 commits at sweep-time, progressed to 6 commits post-recovery. Wave 3 had Phase 0 recon (1 commit) at sweep-time, progressed to Phase 1 (2 commits) post-recovery. Promote.js had impl (1 commit) at sweep-time, progressed to impl + tests (2 commits) post-recovery.

**What was lost:** D3a's uncommitted WIP findings (the bench-scrml.js refactor + emptied runtime-results.json). BUT — D3a's load-bearing diagnosis was ALREADY captured in S86 commit `24af6a2` (crash-diagnosis doc). So no actually-load-bearing information was lost.

**Memory rule saved** at `~/.claude/projects/-home-bryan-maclee-scrmlMaster-scrmlTS/memory/feedback_pa_bash_cleanup_dry_run.md`:
> PA-side bash cleanup loops (worktrees / branches / files) MUST execute a dry-run pass printing each target without mutating, BEFORE any removal command runs. Same two-sided gate shape as pa.md S83 commit discipline.

### Phase 3 — D3b landed at commit `5762069` (2026-05-12 S87)

D3b agent completed during/post sweep recovery. PA file-delta landed per pa.md S67. Five files: `benchmarks/bench-scrml.js` indirect-eval Option A fix + `benchmarks/todomvc/app.scrml` `.filter(cb).length` compiler-bug fixture dodge + `benchmarks/runtime-results.json` regenerated + `benchmarks/RESULTS.md` happy-dom section refreshed + Version History entry + `docs/changes/wave-3-d3/progress.md` created.

**5th latent compiler bug surfaced (DOCUMENTED, NOT YET FIXED):**
- `.filter(cb).<member>` strips inner callback in v0.2.6+ codegen. Repro: `function f() { return arr.filter(function(t){ return t.x }).length }`. Workaround in TodoMVC fixture; REVERT fixture dodge when compiler-side fix lands.
- Joins the 4 D2-surfaced latent bug families (14-mario / 05-multi-step / 03-contact-book / TodoMVC-form-submit) for Batch 2 triage.

**Other D3b findings (out-of-scope follow-ups):**
- **scrml runtime perf regression in happy-dom vs 2026-04-05 baseline** — partial-update ratio vs React dropped 28.7x → 9.2x. Likely v0.2.4 → v0.2.6 codegen surface growth (Wave 2 / Approach A). Separate perf investigation candidate.
- Chrome benchmark row in RESULTS.md is now v0.2.4-era. Chrome rerun under v0.2.6+ is a separate dispatch.
- scrml.dev landing page lives in a SEPARATE repo (`scrml-dev`); out-of-scope from this PA per pa.md per-repo scope.
- README.md line 429 marketing claim ("Partial update is 8x faster than React; swap-rows is 13x faster") sources to 2026-04-13 Chrome row (preserved). PA Rule 1 declined updating framing; existing "Stale" callout at README:391-404 is sufficient.

### Phase 4 — In flight (promote.js + Wave 3 still running)

- **promote.js**: tip `3c47080` — impl + 7 tests committed; git status clean; near completion. PA will land via file-delta upon completion notification.
- **Wave 3 fixture-sweep**: tip `f274517` — Phase 0 recon + Phase 1 auto-migrate examples/ (16 files) committed. Continuing Phases 2-7. Multi-hour walltime. PA will land carefully on completion, **skipping `benchmarks/todomvc/app.scrml`** which D3b already modified at `5762069` (sibling-parallel-dispatch conflict per pa.md S67 §3 "agent-side-stale-views in the diff").

---

## Open at S87 mid-session

1. **promote.js landing** — pending agent completion notification.
2. **Wave 3 fixture-sweep landing** — pending agent completion (multi-hour band).
3. **Batch 2 — 4 D2-surfaced latent bug families + 5th D3b-surfaced `.filter(cb).<member>` + load-detail.client.js:285 lift-`<li>` bug** — deferred until Wave 3 lands (Wave 3 touches the same example .scrml files as the bug-family fixes; sequencing avoids merge friction).
4. **happy-dom perf regression investigation** — NEW S87 finding (D3b); separate dispatch candidate.
5. **Chrome benchmark rerun** — NEW S87 finding (D3b); separate dispatch candidate.

---

---

## What S87 PA must NOT screw up (carry-forward)

(Full list in S86 hand-off §"Things S87 PA must NOT screw up" — abbreviated here; defer to S86 hand-off for spec citations + line numbers.)

- DO NOT re-fire perf-feel empirical study or debate. Insight 29 ratified S85.
- DO NOT attempt partial trucking-dispatch v0.3 migration. Wave 3 v0.3 fixture-sweep is the canonical sweep wave.
- DO note `<program spa>` is CLOSED. Do not re-debate; do not pre-commit a marker.
- DO note Approach A spec anchor is LIVE. Cite §40.9 normative statements verbatim when dispatching.
- DO apply the corpus-ouroboros warning when reasoning about design calls. "The corpus does X" is DATA, not REASONING.
- DO apply the idiomatic-examples styling rule when authoring scrml in articles / dives / fixtures / kickstarter examples.
- DO surface stale-carry-forward risk at session-open. Verify each backlog item against current truth before treating as actionable.
- DO note Stage 7.5 (Batch Planner) vs Stage 7.6 (Reachability Solver). Don't conflate.

---

## Cross-machine sync state at S87 open

- **scrmlTS:** `git -C ... rev-list --left-right --count origin/main...HEAD` → `0	0`. Clean.
- **scrml-support:** `git -C ... rev-list --left-right --count origin/main...HEAD` → `0	0`. Clean.
- **Pre-commit hook:** `core.hooksPath = scripts/git-hooks` verified.
- **Worktree state at open:** unverified; will run `git worktree list` if needed before dispatching.

---

## Tags

#session-87 #open #v0.3-in-flight #wave-3-d3b-pending #wave-3-fixture-sweep-pending #4-latent-bug-families-triage #closure-analysis-impl-deferred #approach-a-spec-anchor-LIVE #§40.8.1-OQ-CLOSED #worktree-retention-rule-refinement-candidate
