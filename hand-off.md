# scrmlTS — Session 133 (CLOSE)

**Date:** 2026-05-26
**Previous:** `handOffs/hand-off-135.md` (S132 CLOSE — grammar-lockdown decisions A+B + one-shot-lift canon + maps refresh + user-voice cadence rule).
**Machine:** Cross-machine carrier — if this is the OTHER machine, PA auto-memory does NOT sync; hand-off + user-voice are the carriers (both pushed at S132 wrap).
**HEAD at OPEN:** `dbe481c8` (S132 wrap).
**pkg.json:** 0.6.0 (no tag cut).
**Baseline tests:** 21,584 pass / 0 fail / 170 skip / 1 todo / 794 files (S131; S132 was docs-only, no delta).
**Maps watermark:** `c2d3f7ae` (S132 open). 5 post-watermark commits all docs/spec — none touched `type-system.ts` or related codegen → maps safe for compiler-source dispatches this session.

---

## Session start

- pa.md ✓ read in full
- PRIMER ✓ read (mandatory header + §1-§6.3 — §6.4 one-shot-lift content landed S132, available)
- SPEC-INDEX ✓ read (navigation map; full SPEC sections will be read per-dispatch via offset+limit)
- master-list §0 ✓ read (S132 entry @ §0.6)
- hand-off ✓ read + rotated → 135
- user-voice S132 tail ✓ read
- git status: clean, both repos in sync with origin (0 0)
- inbox: empty

## ✅ S133 Fire #1 — E-FN-003 attributed-markup false-positive — LANDED

**Commits:** `dbef4f4d` (fix + 4 regression tests) + `27e624bd` (known-gaps doc — Bug 12 RESOLVED).
**Tests:** 21,584 → 21,588 pass / 0 fail (+4, matches new-test count exactly).
**Approach:** B — skip the text heuristic when serialized statement text starts with `<` (markup-shaped via `kind:"escape-hatch"` raw text per `ast-builder.js:122 shouldSkipExprParse`). Approach A (excise serialized markup substrings) abandoned after the agent confirmed markup-in-expression-position is escape-hatch raw text, not structured `kind:"markup"` AST.
**Files changed:** `compiler/src/type-system.ts` (+14L guard at 12798-12810) · `compiler/tests/unit/fn-constraints.test.js` (+105L NEW §8b describe block with 4 tests incl. negative control) · `docs/known-gaps.md` (Bug 12 → RESOLVED; HIGH 3 → 2).
**Agent:** `scrml-js-codegen-engineer` (NOT `scrml-dev-pipeline` — that agent is not loaded in this repo; see Open question #1 below).
**Path discipline:** zero leaks. S99 counter advances 15 → 16.

### Brief errata caught during dispatch
1. **Wrong test-file path in S132 triage** — said `gauntlet-s19/fn-prohibitions.test.js §8 ~line 564` but that file is only 115 lines and has NO §8. Actual §8 is `fn-constraints.test.js:567`. PA-amended at dispatch.
2. **Agent name in S132 brief** — said "Route through `scrml-dev-pipeline`" but `scrml-dev-pipeline` is not loaded. PA re-dispatched via `scrml-js-codegen-engineer` (description matches: "broadly for any compiler-source bug fix... touches `compiler/src/`"). pa.md references `scrml-dev-pipeline` in multiple places — needs reconciliation.

### Known follow-ups from the fix
- **Structural gap (not a regression):** outer-scope writes embedded inside markup interpolations (e.g. `<a href={counter = counter + 1}>`) are not detected pre- or post-fix; the markup escape-hatch isn't structurally parsed. Pre-fix the regex false-attributed to the attr name; post-fix the heuristic is skipped entirely on markup-shaped statements. The `@-cell` write path at `13013-13064` similarly doesn't reach into markup interpolations. Closing this needs structural parsing of escape-hatch markup ExprNodes — separate enhancement, NOT in scope for the bug fix. Recorded in `docs/known-gaps.md` Bug 12 entry.

---

## Carry-forward (from S132 close, queued)

### Grammar-lockdown remaining DECISIONS (UNVERIFIED status — apply §29 lesson)
**⚠️ Verify each against ratification record (HU docs + SPEC) BEFORE teeing up as decision.**
- **C** — E-SCHEMA-003 enforcement (schema-placement-inside-`<program>` enforce now vs defer). F-019 follow-on.
- **D** — Cluster B-code Site 1 retirement (META_BUILTINS purge; 3 prereqs, 7 live callers). Compiler-source.
- **E** — F-003 source-cascade (finish remaining sites; most landed S130).
- **G** — versioning drift (pkg.json 0.6.0 vs changelog) before any tag cut.

### Phase-1c cluster authoring (HU-6 ratified S131 — BG-fireable)
H (flagship reveal: `^{}`+type-as-arg+refinement — wants user eyes on framing) · I self-host idiom · J error-handling · K kickstarter §4 engines · L worker/sidecar/SSE · M module/type-system · N 7 footnotes.

### Iteration/Lifecycle landings
Iteration Landing 3 (`promote --each` CLI impl — SPEC §56.10 spec'd) · Landing 5 (corpus migration 113 sites; BLOCKED by Landing 3) · Lifecycle Landing 3 (PRIMER + kickstarter flagship for `(A to B)`, F-023).

### Findings surfaced S132 (act-on / log)
1. **`scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` DOES NOT EXIST** — pa.md mandates it in every gauntlet/dev brief, but absent from repo. Author or de-mandate.
2. **`key=.id` does NOT silence `W-EACH-KEY-001`** in common path — SPEC §17.7.5-ahead-of-impl. Log to known-gaps.
3. **Canon snippet constraints (one-shot-lift sub-shape 5):** `${render row(it)}` nested inside `${for…lift}` in component body FAILS (Phase-1 re-parse limit); §16.6 lambda fill triggers cosmetic `W-LINT-007` false-positive.
4. **`error.map.md` doesn't catalog `E-SYNTAX-002`** — candidate for next maps regen.

### Methodology lessons banked S132 (in user-voice S132)
- **Verify carry-forward "open" status against ratification record before teeing up as DECISION; present full disposition space, not binary** (the §29 false-binary near-miss). NEW memory candidate this machine: `feedback_verify_status_before_decision.md`.
- **User-voice cadence: as-we-go, never batch-at-wrap** (S131 missing user-voice was power loss; this machine's `feedback_user_voice.md` updated S132).

---

## ✅ S133 Fire #2 — DD: PA Workflow Infrastructure Audit (S42-S132) — LANDED

**DD file:** `scrml-support/docs/deep-dives/pa-workflow-systems-audit-2026-05-26.md` (404L; `status: current` + `last-reviewed: 2026-05-26`)
**Commit:** `29a9e1a` in scrml-support
**Agent:** `scrml-deep-dive` (a0e79671); returned audit as text (system reminder forbids agent .md writes); PA landed to disk + independently verified the headline.

### Headline finding — RETRACTING S132 false claim
**BRIEFING-ANTI-PATTERNS.md EXISTS.** PA-verified post-DD: `/home/bryan-maclee/scrmlMaster/scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` — 125L, 4235 bytes, mtime `2026-04-26 10:21`. The S132 Landing-4 agent's "DOES NOT EXIST" claim was WRONG and was propagated through S132 changelog + master-list §0.6 + S133 hand-off Open Question #4 + S133 DD trigger without any PA-side `find`/`ls` verification across 2 sessions of decision-making.

**Memory rule banked:** `feedback_verify_before_claim.md` — never propagate non-existence claims without independent `find`/`ls`/`grep`. Extends Rule 5 + Rule 4 to artifact-level facts.

### Top DD findings (5 ranked)
1. **BRIEFING-ANTI-PATTERNS exists** (above) — no authoring decision needed.
2. **S82 maps-discipline:** 1/10 hand-offs invoke `MAPS — REQUIRED` block; 0/10 feedback reports. Likely measurement artifact (hand-offs don't quote briefs verbatim) — disambiguate by inspecting 5-10 recent `docs/changes/*/BRIEF.md` files.
3. **Agent-name drift:** pa.md / primer / registry all reference `scrml-dev-pipeline` (NOT loaded); actual is `scrml-js-codegen-engineer`. Maintained tier ↔ operational reality drift; per Rule 4, operational wins → pa.md needs update.
4. **Defense-in-depth GREEN:** PreToolUse hook PA-verified installed (`~/.claude/hooks/path-discipline.sh` + project-local `settings.local.json`); S126 Bash-edit interim active; combined = leak class structurally closed. S99 "counter" is a clean-streak counter (not incident counter) — confirmed.
5. **7 orphan worktrees** from incomplete S132 wrap step 6b; S83-class disk-block risk ~7GB.

### Reframed BRIEFING decision
Original Q ("author or de-mandate") = MOOT. Real Q: **is BRIEFING-ANTI-PATTERNS being included in dispatch briefs at the mandated 100% rate for gauntlet/dev briefs?** DD Recommendation #5: audit 5-10 recent BRIEF.md files (NEXT SESSION, ~30min).

### Recommendations matrix from DD (13 items + 2 new from PA-side follow-up)
**THIS SESSION (DONE):**
- ✅ #1 retract "doesn't exist" claim (hand-off + DD addendum)
- ✅ #2 verify PreToolUse hook (GREEN — installed at `.claude/settings.local.json` + script at `~/.claude/hooks/path-discipline.sh`)
- ✅ #3 pa.md `scrml-dev-pipeline` → `scrml-js-codegen-engineer` (commits `cfc56d8` + `22d3171`)
- ✅ #4 pa.md `agentStore` → `agents-store` (commit `cfc56d8`)
- ✅ #5 audit dispatch-time inclusion rate of MAPS + F4 + BRIEFING (PA-side; landed as DD addendum `ba2bd89`)
- ✅ #9 refresh agent-registry (rebuilt; scrml-dev-pipeline relocated to "stored" with superseded-by note; 12 active core + 13 dev-personas + 19 experts + 3 project-local + 59 stored + 4 commands)
- ✅ #12 bank `feedback_verify_before_claim.md` memory rule
- ✅ DD addendum on scrml-support (`ba2bd89`) — discipline GREEN-to-YELLOW (not RED as DD headline implied); §406 mandate is currently shelf-mandate (no gauntlets since 2026-04-26)

**REVEALED:** scrml-dev-pipeline.md is in `~/.claude/agents-store/` (cold storage by design, not absent) — refined pa.md text accordingly (`22d3171`).

**NEXT SESSION:**
- #6 wrap step 6b worktree cleanup dry-run-first (5min; reclaim 7GB)
- #14 (NEW) post-dispatch BRIEF.md archival to `docs/changes/<id>/BRIEF.md` (~30s/dispatch; closes the S119-S133 paste-into-Agent measurement gap)

**NEAR-TERM:**
- #7 backfill S115 frontmatter on 58 unadopted older deep-dives (~3-4h)
- #8 apply status enum to PA memory rules (30min)
- #10 S115 frontmatter on `ghost-error-mitigation-plan.md` (5min)
- #11 edit/update BRIEFING-ANTI-PATTERNS.md against current canon (iter/lifecycle/MCP added since 2026-04-26) (30-60min)

**DEFERRED until v0.2.0 ships:**
- #13 pa.md structural reorganization pass (2-3h; current 906L accreting)
- #15 (NEW) run a gauntlet round to empirically test §406 mandate (no gauntlets since 2026-04-26)

## ✅ S133 Fire #3 — Worktree cleanup (DD Rec #6) — DONE

461MB reclaimed (audit overestimated at 7GB; actual was ~66MB × 7). All 7 orphan S131 worktrees were dry-run verified work-landed-in-main pre-S132, then removed cleanly. Final state: main only. Per `feedback_pa_bash_cleanup_dry_run.md`.

## ✅ S133 Fire #4 — G versioning drift → v0.6.1 release-cut → LIVE on GitHub

**v0.6.1 LIVE** at github.com/bryanmaclee/scrmlTS. Tag pushed on commit `c5a27b73`.

**Release scope:**
- Bug fixes: Bug W (CRITICAL emitBinary grouping-paren-drop, S126) + Bug 15 (~snapshot, S130-S131) + Bug 12/E-FN-003 (markup-attribute, S133)
- Feature bundles: Iteration `<each>` (Landings 1-4) + Lifecycle annotation `(A to B)` (Landings 1-2-2.5) + MCP V0 series A-E COMPLETE + Match block-form FileAST in native parser
- Spec/canon: grammar-lockdown audits + Phase 2 amendment clusters + one-shot-lift canon + §29 Nominal reframe + V-kill write-side enforcement
- M5/M6 native-parser progress (non-adopter-visible)
- pkg.json description shift: "A complete compiler for the web" (S133 user-voice positioning)

**Commits in v0.6.1 cut:**
- `65c9b6d0` release(s133): pkg.json + changelog
- `fd22a753` description fix
- `c5a27b73` README compile-gate fix (block #1 lift→return + gate-skip #1+#4)
- v0.6.1 annotated tag

**Pre-push gate:** 21,588 tests pass / 0 fail / 170 skip + TodoMVC PASS + README gate 3/2/0 pass/skip/fail.

**Description cascade (DEFERRED to user direction):** README + docs/index.html (5 meta-tag sites) carry the old "single-file, full-stack reactive web language" string; 8 historical article files do too. PA lean: README + landing page get new positioning; articles stay frozen (artifact fidelity). Surfaced in user-voice S133.

## ✅ S133 Fire #5 — C: E-SCHEMA-003 placement enforcement — LANDED

**Commit:** `afbcb47a` (main).
**Files:** `compiler/src/gauntlet-phase1-checks.js` (+140L, added `checkSchemaPlacement` as Check 4) · `compiler/tests/unit/e-schema-003-placement.test.js` (NEW, +198L, 5 mandatory + 2 bonus tests).
**Approach:** **Option β extended-into-existing-module** (cohesion win — gauntlet-phase1-checks.js is the established home for post-TAB structural validators; no api.js wiring change needed; GCP1 stage picks up automatically).
**Tests:** 14,569 → 14,576 (+7, 0 fail).
**Agent:** `aeb2e8c7` — Phase-0 SPEC verification done (§39.3 + §39.12 in full); zero path-discipline leaks.

### Deferred items surfaced by agent (separate concerns)
1. **Silent-swallow of `<schema>` in `${}` logic body** — ast-builder's `parseLogicBody` converts the markup to an `html-fragment` string, losing the user's intent silently. Candidate for a new `W-LOGIC-MARKUP-SWALLOWED` warning OR extension of an existing markup-in-logic diagnostic.
2. **E-SCHEMA-001 / 002 / 004 / 005-009 all remain spec-ahead-of-impl** (`grep` confirms zero fire sites across the family). 001 ("no `db=`") + 002 ("multiple `<schema>`") could fit as extensions to `checkSchemaPlacement`. 004 (unknown column type) belongs in `schema-differ.js`.

### Mid-session CWD slip caught + recovered
After file-delta `git checkout worktree-branch -- <files>` from main, PA's CWD slipped into the worktree (`feedback_cwd_slip_after_worktree_dispatch.md` — S94+S128+S130 banked pattern). Symptom: empty `git status`, wrong-branch `HEAD`. Recovered cleanly via explicit `cd /home/bryan-maclee/scrmlMaster/scrmlTS && pwd` + re-execute file-delta. Zero work damaged. Reinforces the memory rule's continuing relevance.

## 🛑 S133 Fire #6 — D: Cluster B-code Site 1 retirement — **BLOCKED on Step A prerequisite**

**Agent `a803f7` returned Phase-0 STOP** (per `feedback_cookbook_vs_empirical` — the banked rule held; same shape that caught S130's "zero callers" mistake). Zero compiler-source code changes; only the progress.md doc landed (`a662adb6`).

**Empirical finding:** The brief claimed "5 meta-eval.ts callers + 1 rewrite.ts:1985 caller are provably no-ops on cleansed user input." Empirical reproducer disproved it — `^{ const year = bun.eval("new Date().getFullYear()"); emit(...); }` compiles cleanly TODAY, folds to literal at compile time. The callers are ACTIVE — not no-ops.

**Root cause surfaced (latent since S114):** `META_BUILTINS` Set at `compiler/src/meta-checker.ts:117` still includes `"bun"`, `"process"`, `"Bun"`, `"console"` — **contradicts SPEC §22.4 ratification (line 14687):** *"JS-host ambient globals (`bun`, `process`, `setInterval`, `fetch`, etc.) are NOT in the META_BUILTINS set and trigger `E-META-001`."*

**Required sequence:**

- **Step A (PREREQUISITE):** amend `compiler/src/meta-checker.ts:117` — remove `"bun"`, `"process"`, `"Bun"`, `"console"` from `META_BUILTINS`. After Step A, user `^{ bun.eval(...) }` fires `E-META-001` at the meta-checker stage (SPEC-correct). Verify no existing test asserts these as members; handle test fallout. **Cost: ~30min-1h dispatch.**
- **Step B (re-run D):** retire `rewriteBunEval` + 6 callers + 12 tests per the original D plan. SPEC-correct + behaviorally consistent. **Cost: ~3-5h dispatch (the original D estimate).**

**Banked-rule earning continued keep:** `feedback_cookbook_vs_empirical` (S124) has now caught back-to-back partial-correctness incidents (S130 "0 callers" → 7 actual; S133 "provably no-ops" → 5 active). Brief authors keep restating intermediate conclusions without restating prerequisites. **PA candidate for amendment**: when a multi-step plan was decomposed in a prior session with explicit prerequisites, the next-session brief author must re-read the prereq list, NOT copy the conclusion.

**Findings doc:** `docs/changes/d-meta-builtins-2026-05-26/progress.md` (118L; per-caller empirical results + SPEC §22.4 / §30.1 cross-refs + recommended sequencing).

## ✅ S133 Fire #8 — Step A: META_BUILTINS amend (D's prerequisite) — LANDED + PUSHED

**Commit (pushed):** `80b168e6` (scrmlTS).
**Files:** `compiler/src/meta-checker.ts` (4-string removal + comment rewrite; SPEC §22.12 line 14687 attribution) · `compiler/tests/unit/meta-checker.test.js` (§11/§18 reframed to JSON/Object/Math; +§11b/§18b regression-guard +8 logical assertions) · `compiler/tests/unit/self-host-meta-checker.test.js` (inverted assertions; switched console.log to emit(JSON.stringify(...))).
**Tests:** 14,576 → 14,578 (+2 test blocks). 0 fail.
**Agent:** `ae801188` — Phase-0 SPEC verification done (§22.4 + §22.5 + §22.5.1 + §22.11 + §22.12 read in full); test triage NARROWED 10-file brief list to 2 by empirical Phase-0 (other 8 kept-unchanged — runtime-meta tests early-return; bun-eval.test.js tests rewriteBunEval directly).

**Surfaced architectural gap → Bug 17 banked.** SPEC §22.12 line 14687 categorical reading vs. impl's compile-time-only firing. Documented `docs/known-gaps.md` Bug 17 (commit `9f86cfcd`); design call deferred to S134.

## ✅ S133 Fire #13 — Bug 17 known-gaps entry — LANDED + PUSHED

**Commit (pushed):** `9f86cfcd`. NEW HIGH entry §1 "E-META-001 only fires in compile-time meta blocks; runtime blocks silently accept JS-host globals." Resolution-path options listed for S134 design call: (a) extend impl to fire in runtime blocks too · (c) SPEC amendment to narrow §22.12 to compile-time only · (d) partial warning-only for runtime. §0 inventory HIGH 2 → 3.

## 🔥 S133 Fire #12 — IN FLIGHT — D Step B: `rewriteBunEval` retirement

**Dispatched:** `scrml-js-codegen-engineer` (agent `ad582bd9`, isolation:worktree, run_in_background:true).

**Brief shape (post-Step-A re-verify mandate per `feedback_restate_prerequisites_not_conclusions`):**

D's prior Phase-0 STOP (S133 a662adb6) was at HEAD `c5a27b73` (pre-Step-A). Step A has since shifted the landscape. The brief MANDATES empirical re-verify on two shapes:

1. **COMPILE-TIME shape** (`^{ const x = bun.eval(...); emit(...) }`) — expected to NOW fire E-META-001 (Step A regression).
2. **RUNTIME shape** (`^{ const x = bun.eval(...) }`, no emit/reflect) — Bug 17 says this bypasses META_BUILTINS. The question: does `rewriteBunEval` STILL fold this at compile-time (currently MASKING Bug 17), or is it now truly dead?

**Decision gate:**
- If MASK → STOP. Surface for Bug-17-vs-Step-B sequencing decision.
- If DEAD → proceed with deletion of 5 meta-eval.ts callers + 1 rewrite.ts caller + `rewriteBunEval` function + 12 bun-eval.test.js tests.

**Expected outcome (DEAD path):** baseline 14,578 → 14,566 (−12 from dropped tests). **Expected outcome (STOP path):** zero deletion; updated progress.md.

Estimated ~1-3h depending on outcome.

**Dispatched:** `scrml-js-codegen-engineer` (agent `ae801188`, isolation:worktree, run_in_background:true).

**Brief:** amend `compiler/src/meta-checker.ts:117` — remove `"bun"`, `"process"`, `"Bun"`, `"console"` from META_BUILTINS Set. Closes spec-vs-impl divergence latent since S114 (SPEC §22.12 line 14687: "JS-host ambient globals are NOT in META_BUILTINS; trigger E-META-001"). Pre-dispatch SPEC verification done. Agent doing test triage on 10+ affected test files. Estimated ~30min-1h.

**Post-Step-A:** D's deletion becomes SPEC-correct (rewriteBunEval callers truly become no-ops on conformant user input that passed meta-checker).

## ✅ S133 Fire #9 — DD Rec #10: ghost-error-mitigation-plan.md S115 frontmatter — LANDED

**Commit (scrml-support):** `db30700` — `status: historical` + `last-reviewed: 2026-05-26` + provenance note recording all 3 solutions executed (Solution #1 BRIEFING-ANTI-PATTERNS.md exists; Solution #2 `compiler/src/lint-ghost-patterns.js` ~492L; Solution #3 examples/ corpus 26+ apps).

## ✅ S133 Fire #10 — DD Rec #8: PA memory rule corpus S115 frontmatter — LANDED

Applied `status: current` + `last-reviewed: 2026-05-26` to all **42 memory rule files** via perl-bulk insertion after the existing `description:` line. Dry-run-first per `feedback_pa_bash_cleanup_dry_run.md`. Frontmatter shape preserved (existing `name:` / `description:` / `metadata:` fields intact). Per-rule supersession triage deferred — none of the 42 rules empirically observed as structurally obsolete; PreToolUse hook closes one leak class but the defensive patterns (S94/S95/S99/S126 family) still apply in stack. Note: PA auto-memory does NOT sync across machines (S132 finding); the other machine's PA needs to re-apply this batch operation independently using hand-off as carrier.

## ✅ S133 Fire #11 — DD Rec #11: BRIEFING-ANTI-PATTERNS.md content refresh — LANDED

**Commit (scrml-support):** `9c41cad` — file was 2026-04-26 vintage; refreshed against ~1 month of post-2026-04-26 canon. **+7 anti-pattern table rows** covering: iteration `<each>` (S121-S132), null/undefined-don't-exist (S89), no-async/await (S114), `fn`-purity (S114+S132), `lift` in `function` body (S132 §10.4), `(A to B)` lifecycle glyph (S130), META_BUILTINS exclusions (SPEC §22.12), no try/catch (S19+), no-V-kill writes outside `${}` (S123). NEW "Error handling" snippet (try/catch → fail/!{} idiom). Existing iteration row updated (pre-S121 `for @items / lift item /` form retired in favor of `<each>`). `agentStore`→`agents-store` path-drift fix in cross-refs. Cross-refs extended with PRIMER §6.3/§6.4/§11 + kickstarter v2 §7/§11.10/§11.11 links. `status: active` → `status: current` + `last-reviewed: 2026-05-26`.

## ✅ S133 Fire #7 — Positioning cascade (README + docs/index.html) — LANDED

**Commit:** `db8bed66`.
**Files:** `README.md` (1 site at line 642 — scrmlTS section subtitle) · `docs/index.html` (8 sites — title, meta description, meta keywords, og:title, og:description, twitter:title, twitter:description, schema.org JSON-LD description, .tagline visible landing-page hero).
**Stays unchanged:** README line 5 opening (different shape — single-file authoring framing, not positioning), `docs/index.html` line 67 marketing prose paragraph (describes features at length; doesn't need positioning phrase), 8 historical article files (artifact fidelity).

**Dispatched:** `scrml-js-codegen-engineer` (agent `a803f7`, isolation:worktree, run_in_background:true).
**Brief:** retire `rewriteBunEval` function + 5 callers in `meta-eval.ts` + 1 caller in `rewrite.ts:1985` + drop 12 tests in `bun-eval.test.js`. Closes F-002 / F-003 / F-009 (1a) / F-010 (compiler half) — the last piece of the S130 Approach C subsumption arc.
**Phase-0 STOP gate MANDATED:** empirical verify each of the 7 callers is genuinely a no-op on current user input BEFORE deletion (per `feedback_cookbook_vs_empirical` — S130 brief claimed "zero callers"; reality was 7; same rule applies here to the "provably no-ops" claim).
**Expected outcome:** baseline 14,576 → 14,564 (−12 from dropped tests; 0 regressions).
**Estimated cost:** 3-5h.

**Dispatched:** `scrml-js-codegen-engineer` (agent `aeb2e8c7`, isolation:worktree, run_in_background:true).

**Pre-dispatch verify-status (PA-side, completed):**
- SPEC §34 catalog line 16483 declares E-SCHEMA-003: "schema nested in any block other than `<program>` root"
- `grep E-SCHEMA-003 compiler/src/` returns ZERO fire sites (spec-ahead-of-impl)
- `<schema>` IS partially wired (`schema-differ.js` + `emit-schema-for.ts` + Pass A walker for L22 `schemaFor`)
- Pass A walks `<schema>` recursively without parent-check
- 3 mis-placement reproducers tested: all parse cleanly, no E-SCHEMA-003 fire (only unrelated E-PA-002 — different concern)
- AST shape: `<schema>` is `kind === "state"` + `stateType === "schema"`

**Brief preference: Option β** — dedicated `validateSchemaPlacement` pre-pass; cleaner separation, easier to test. Agent has authority to pick α (extend Pass A walker) if cohesion argues for it.

**Tests mandated:** 5 cases (schema inside `<db>`, inside engine, inside `${}` logic, inside component, control-correctly-placed). Negative control non-negotiable.

**Estimated cost:** 2-4h.

## State as of CLOSE

| Item | Value |
|---|---|
| HEAD scrmlTS | `105d6ea2` PUSHED |
| HEAD scrml-support | `9c41cad` PUSHED |
| pkg.json | 0.6.1 (tagged + pushed; description "A complete compiler for the web.") |
| Tests | **21,585 pass / 0 fail / 170 skip / 1 todo** (full suite; per push-gate at `3caff47e` + `105d6ea2`) |
| Net test delta this session | +1 (E-FN-003 +4 / E-SCHEMA-003 +7 / Step A +2 / D Step B −12 = +1) |
| Worktrees | main only (8 cleaned across the session — 7 S131 orphans + 7 S133 dispatches) |
| Inbox | empty |
| S99 path-discipline counter | held; zero leaks across S133's 7 worktree dispatches |
| Cross-repo push | ✅ both repos pushed at every milestone, not just at wrap |
| Memory rules | 4 new this session + 42 existing got S115 frontmatter |

## S133 commit ledger

**scrmlTS (14 commits):**
| SHA | Subject |
|---|---|
| `dbef4f4d` | E-FN-003 fix (Bug 12) |
| `27e624bd` | known-gaps Bug 12 RESOLVED |
| `e792253e` | PRIMER §12 agent-name drift fix |
| `65c9b6d0` | release(s133): v0.6.1 (pkg.json + changelog) |
| `fd22a753` | pkg.json description shift |
| `c5a27b73` | README compile-gate fix (+ v0.6.1 tag) |
| `db8bed66` | positioning cascade (README + docs/index.html) |
| `afbcb47a` | E-SCHEMA-003 placement enforcement |
| `a662adb6` | D Phase-0 STOP findings |
| `80b168e6` | Step A — META_BUILTINS narrow |
| `9f86cfcd` | known-gaps Bug 17 NEW |
| `3caff47e` | D Step B — rewriteBunEval retire |
| `105d6ea2` | Bug 17 (a) RATIFIED + sweep findings |
| (this wrap) | s133-close: hand-off + master-list + changelog |

**scrml-support (9 commits):**
`dd09d53` user-voice typo rule · `29a9e1a` DD landed · `ba2bd89` DD addendum · `cfc56d8` pa.md drifts · `22d3171` pa.md refinement · `bfa1d97` user-voice positioning shift · `db30700` ghost-mitigation frontmatter · `9c41cad` BRIEFING-ANTI-PATTERNS refresh + (8ef13cc + dc3cc96 from S132 carrying through into the push window).

## Memory rules banked S133 (this-machine-only PA auto-memory)
- `feedback_spelling_typo_flag` — 1-liner format for spelling typos + word-misuses
- `feedback_verify_before_claim` — find/ls/grep before claiming non-existence
- `feedback_restate_prerequisites_not_conclusions` — deferred-work brief authoring discipline (S130+S133 back-to-back Phase-0 STOPs)
- 42 pre-existing rules got `status: current` + `last-reviewed: 2026-05-26` per DD Rec #8

## Methodology lessons of the session
1. **Verify-before-claim** caught the BRIEFING-ANTI-PATTERNS.md "doesn't exist" myth that propagated S132→S133.
2. **Phase-0 empirical re-verify** caught back-to-back partial-correctness incidents (S130 "0 callers" / S133 "provably no-ops"). Same agent-side defense; same brief-author-side failure pattern; banked as `feedback_restate_prerequisites_not_conclusions` for forward-looking discipline.
3. **Agent-side-stale-view detection** at S67 file-delta time (D Step A's worktree had old README/index.html; filtered file-delta avoided cascade-rewind).
4. **Cohesion lens** drove Bug 17 resolution: (a) extending the impl is the symmetric counterpart to Step A; (c) and (d) were rejected because they break the symmetry.
5. **CWD slip after `git checkout worktree-branch -- <files>`** recurred 2× this session (C + Step A); both caught by `pwd` + `git rev-parse --abbrev-ref HEAD` before file-delta. Pre-existing memory rule held.

## Findings surfaced this session (act-on / log)
1. **`scrml-dev-pipeline` is in cold storage** at `~/.claude/agents-store/` — not absent. PA initially speculated cross-machine sync gap; registry rebuild surfaced the truth. Stage-able via master inbox if ever needed; current operational compiler-source dev-agent is `scrml-js-codegen-engineer`.
2. **PreToolUse path-discipline hook IS installed** (S100 memory rule confirmed); zero leaks across the session's 7 worktree dispatches.
3. **S99 "counter" is a clean-streak counter**, not an incident counter — confirmed by D Step B + Step A agents both reporting "no leaks detected" alongside counter advances.
4. **Maps-discipline measurement was via hand-off corpus** (wrong artifact); actual BRIEF.md files show MAPS at 100% inclusion in parent / standalone dispatch briefs. DD audit's "S82 dormant" finding was a measurement artifact.
5. **§22.12 line 14687 SPEC architecture gap** beyond bun.eval — applies to all JS-host globals in runtime meta blocks; closed via Bug 17 (a) impl in S134.
6. **Self-host parity gap** at `stdlib/compiler/meta-checker.scrml` + `compiler/self-host/meta-checker.scrml` — these still contain the OLD pre-Step-A META_BUILTINS literal-string list. Self-host parity deferred post-v1.0 per pa.md; will resolve when self-host is updated.

## Carry-forward to S134

### Bug 17 (a) impl — paste-ready brief

Per the S133 ratification + sweep, the S134 brief shape is recorded inline in `docs/known-gaps.md` Bug 17 entry. Highlights:
- Move META_BUILTINS check OUTSIDE the `bodyUsesCompileTimeApis` early-return in `checkMetaBlock` (`compiler/src/meta-checker.ts`)
- Add +6 regression-guard tests for `process`/`fetch`/`setInterval`/`setTimeout`/`Bun`/`console` × runtime context
- PA-side corpus sweep was CLEAN (no migration prereq)
- Baseline 14,566 → 14,572 expected (+6); 0 regressions
- ~2-4h dispatch via `scrml-js-codegen-engineer` (isolation:worktree)

### Other carry-forward items
- **C deferred — W-LOGIC-MARKUP-SWALLOWED candidate** — silent-swallow of `<schema>` in `${}` logic body via ast-builder.js `parseLogicBody` html-fragment conversion. Could be a new warning OR an extension to markup-in-logic diagnostic. ~1-2h.
- **E-SCHEMA-001/002 extension** to `checkSchemaPlacement` — natural sibling to S133's E-SCHEMA-003 impl. ~1-2h.
- **DD Rec #7 — S115 backfill on 58 unadopted older deep-dives** (~3-4h).
- **DD Rec #14 (NEW S133)** — post-dispatch BRIEF.md archival to `docs/changes/<id>/BRIEF.md` (~30s/dispatch; closes the S119-S133 paste-into-Agent measurement gap).
- **DD Rec #15 (NEW S133)** — run a gauntlet round to empirically test §406 mandate (no gauntlets since 2026-04-26).
- **Original S132 carry-forwards:** Lifecycle Landing 3 (PRIMER + kickstarter flagship for `(A to B)`) · Iteration Landings 3/5 sequenced (CLI impl + 113-site corpus migration) · Phase-1c clusters H-N (HU-6 ratified S131; BG-fireable).
- **C/D/E/G grammar-lockdown queue:** D and E collapsed-and-CLOSED this session (B-code Site 1 = F-002/003/009(1a)/010 done end-to-end). C CLOSED (E-SCHEMA-003 enforcement landed). **G CLOSED via v0.6.1 cut.** Queue cleared.

### Description cascade beyond pkg.json + README + index.html
- 8 historical article files in `docs/articles/` carry the old positioning. Per artifact-fidelity convention, likely stay frozen. PA lean recorded user-voice S133. No action queued.

## Open questions for S134
1. **Fire Bug 17 (a) impl** — paste-ready brief in known-gaps Bug 17 entry; ready to dispatch.
2. **Next substantive arc?** — Lifecycle Landing 3 (PRIMER+kickstarter flagship for `(A to B)`) is the next S132 carry-forward of size; Iteration Landing 3 (`promote --each` CLI impl) is bounded; Phase-1c clusters H-N is BG-fireable. User picks.
3. **DD Rec #14 (BRIEF.md archival)** — operationalize going forward? Adds ~30s per dispatch; closes the measurement gap. Adopt or defer.

---

## Tags
#session-133 #OPEN #fire-e-fn-003-first #s132-carry-forward-active
