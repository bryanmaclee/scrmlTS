# scrmlTS — Session 143 (OPEN)

**Date:** 2026-05-29
**Previous:** `handOffs/hand-off-146.md` (S142 CLOSE — emitted-JS parse gate flipped DEFAULT-ON v0.6.11 + errorBoundary built from-scratch §19.6+C-hybrid + gate-found-tail fix-wave + NEW branch-leak class caught/recovered).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-147.md` at S144 OPEN.

**Session-start "in one line":** opened on v0.6.11 (gate default-ON, errorBoundary functional); the S141→S142 parse-gate arc is CLOSED end-to-end + errorBoundary closed C7/R24-step-3b. **S143 ran gauntlet R28 (Content-Publishing-Platform "Press", all 5 personas) — high-yield: validated the S142 errorBoundary + parse-gate work, surfaced 5 PA-verified compiler bugs + 1 canon-fix.** Awaiting user triage/fix-wave/cut decision + commit auth.

---

## 🎯 S143 — GAUNTLET R28 RESULTS (Content Publishing Platform "Press")

**Ran as 2 background workflows:** build (5 dev personas parallel, dev-returns-content) → verification (5 overseers + synthesis), with PA independent re-verification (R26) of every file-as-bug finding. Artifacts in `scrml-support/docs/gauntlets/gauntlet-r28/` (BRIEF + 5 sources + 5 reports + OVERSEER-REPORT.md + overseer-verdicts-raw.json) + `gauntlet-r28-report.md`. **NOT committed (no commit auth yet this session).**

**Two validation wins (the S142 work):**
- **errorBoundary (§19.6) works end-to-end** — all 5 personas; nested inner-catches-first + `fallback=` + per-variant `renders` w/ payload + C-hybrid backstop §19.6.8 + E-ERROR-005 exhaustiveness. ZERO walls. (elixir: "smoothest part — worked exactly as §19.6 documents.")
- **Parse gate (§2.2.1 default-ON) earning its keep** — zero false positives across 5 clean compiles + 2 true-positive codegen-defect classes caught (R28-1, R28-2). Overseer caught 2 dev MISREPORTS on the transition() path (react claimed fires=false; svelte claimed dormant=false).

**5 PA-confirmed compiler bugs (filed known-gaps §R28; §0 HIGH 1→5, MED 9→11):**
- **R28-7 (HIGH*, 5/5):** schemaFor/tableFor reject `T | not` nullable optional fields. SPEC unmappable-lists (§41.15.8/§41.16.6) do NOT include unions; §14.8.3 ties nullable↔`T|not` bidirectionally. L22 "define once" breaks on the most common DB shape. *Severity/scope = PA-DECISION.*
- **R28-6 (HIGH, 4/5):** variant-progression `transition()` enforcement DORMANT on the `.get()` SQL-row return path (SPEC §14.12.6.2/§14.12.10 require the fire). Mechanism wired (svelte's enum-payload shape fires) but leaks on the common shape. PA-confirmed.
- **R28-2 (HIGH, 4/5) = UN-DEFER Bug 54:** tableFor `<column>` row-access broken BOTH ways — `:let` (mandated) forwarded-as-HTML/gate-fires; `@row` (deferred) emits wrong `_scrml_reactive_get("row")`. tableFor column slots non-functional for row data. PA-confirmed.
- **R28-1 (HIGH, 3/5):** `@.` leak in `<match on=@.field>` inside `<each as alias>` — gate-caught. CONTEXT-DEPENDENT (not minimally isolable; reproducers = dev sources).
- **R28-3 (HIGH, 2/5):** `:`-shorthand engine + `//`-comment breaks block-splitting (trips kickstarter §4.1 Mario shape). PA-confirmed.
- **R28-4 (MED, 1/5):** `E-PA-002` advertises a `?{} CREATE TABLE` fix the scanner ignores (misleading diagnostic).
- **R28-5 (MED) = C4 confirmed** with clean reproducer (object-literal E-TYPE-001 dormant).

**Canon-fixes (no compiler change):** R28-C1 (HIGH — SPEC §14.12.6.2 + PRIMER §6.5 `server fn`→`server function`; flagship example doesn't compile verbatim) · R28-C2 (kickstarter drift bundle).

**Design call:** R28-8 (bare-variant inference object-literal/==RHS — extend §14.10 vs fix kickstarter §4.8 overclaim; overseer split).

**R28 round COMMITTED + PUSHED** (S143, user-authorized): scrmlTS `eda211f2` (known-gaps §R28 + hand-off + rotation) + scrml-support `9951aef` (gauntlet-r28 round + r24/r25 backfill). Both 0/0 with origin (scrmlTS pre-push full suite 22153/0 + TodoMVC PASS).

### ✅ S143 FIX-WAVE LANDED (4 parallel isolation:worktree dispatches, user-authorized) + canon-fix R28-C1
**All 4 fixes landed + PA R26-verified; full suite 22180/0 (+27 tests), within-node canary 1005/0.** Each landed via S67 file-delta with the S142 branch-tip-vs-FINAL_SHA coherence check (all coherent) + per-fix PA R26 re-verify. R28-2 needed a **3-way patch of type-system.ts** (R28-6 had landed first + touched the same file; disjoint regions — merged clean, both verified intact).
- **R28-3** `051ce984` — block-splitter `skipTriviaForCompoundScan` (`//`/`/* */` trivia in compound-auto-lift scan; SPEC §27.1). +5 tests.
- **R28-6** `0ecfab98` — type-system: fire E-TYPE-LIFECYCLE-VARIANT-NOT-TRANSITIONED on reactive-assignment RHS reads. **Agent corrected the brief's root cause** (the `.get()` was a red herring; the gap was the state-decl RHS read-scan). +6 tests.
- **R28-1** `e6fb2f3d` — emit-match: lower `on=@.field` → `iterVar.field` inside `<each as>` (closes the GATE-FIRE only). +10 tests.
- **R28-2** `0dbef110` — tableFor `<column>` row-access both ways (`:let` via §16.6 re-parse + `@row` → loop-local). **Bug 54 un-deferred + CLOSED.** +6 tests.
- **R28-C1** (PA-direct, pending this commit) — SPEC §14.12.6 + PRIMER §6.5: 6 broken `server fn loadUser/publish ...?{}` worked examples → `server function` (was E-FN-001; corrected example now compiles).

**Process notes (banked, shoot-straight):** R28-6 agent self-caught + amended a `--no-verify` on a doc-only commit (load-bearing commits always gated; no bypass remains). R28-1 agent used the Edit tool for one walker edit then inode-verified no-leak (S126 minor deviation, self-verified clean). R28-1 + R28-2 agents both independently flagged sibling-landing index state (S119 awareness) — handled.

**NEW follow-ups surfaced by the fix-wave (filed known-gaps §R28):** **R28-1b** (HIGH-suspected) — the block-form `<match on=>` dispatcher is emitted at MODULE scope → wrong per-item value for match-on-loop-var inside `<each>` (affects BOTH `@.` and `alias.field`; R28-1 closed only the gate-fire; this is the deeper runtime gap; "node-check-clean ≠ correct" class; needs happy-dom runtime confirm before fix-dispatch). **R28-2b** (LOW) — tokenizer strips leading `:` on `:let` (tokenizer.ts:763); R28-2 worked around via the `let` alias; verbatim `:let` needs a tokenizer dispatch.

**known-gaps §0 now: HIGH 5→2** (R28-1/2/3/6 RESOLVED; OPEN: R28-7 decision-pending + R28-1b NEW) · MED 11 · LOW 14→15 (R28-2b) · Nominal 7.

**Worktrees:** 4 agent worktrees CLEANED at fix-wave close (work landed in main).

**R28-7 DISPATCHED (S143, user chose fix-now + empty-`<td>` for absent tableFor cell)** — agent `a69c9ecb08f566311`, scrml-js-codegen-engineer, isolation:worktree, opus, background. change-id `r28-7-schemafor-tablefor-nullable-tnot-2026-05-29`; BRIEF archived. Builds: SPEC §41.15+§41.16 amendment (`T | not`/`T?` where T mappable → nullable column/cell; ground §14.8.3 inverse; clarify union-exclusion = non-`|not` unions) + schemaFor impl (emit-schema-for.ts + type-system) + tableFor impl (emit-table-for.ts + type-system; empty `<td>` for `not`) + tests + R26 (revert R28 devs' `omit=` workarounds). STOP-latitude (land schemaFor first if the type-classification refactor is large). LANDING: same protocol (S67 file-delta + branch-coherence + PA R26 + canary + commit; **NOTE — both emit-table-for.ts + type-system.ts were touched by the R28-1/R28-2/R28-6 fix-wave already in main, so R28-7's file-delta will likely need 3-way patches on those — analyze regions before checkout, per the `feedback_file_delta_vs_cherry_pick` rule**).

**STILL QUEUED (after R28-7 lands):** · **R28-8 DECISION** (extend §14.10 inference vs fix kickstarter §4.8 overclaim) · **R28-1b** runtime-confirm + fix-dispatch · **R28-2b** tokenizer dispatch · R28-C2 kickstarter drift bundle (canon-maintenance) · errorBoundary version cut (deferred from S142 — now ALSO the R28 fix-wave landed, so a v0.6.12/v0.7.0 cut bundles errorBoundary + the 4 R28 fixes) · maps refresh (now ~17 commits stale).

---

## State as of OPEN

| Item | Value |
|---|---|
| HEAD scrmlTS | `d0a282d9` — **PUSHED, 0/0 with origin.** (S142 wrap commit). Working tree clean. |
| Latest release tag | **`v0.6.11`** (`db9dba55`, pushed) — "emitted-JS parse gate always-on by default" |
| pkg.json | **0.6.11** |
| Gate | **`validateEmit` DEFAULT-ON** (shipped v0.6.11) — compile-time invariant by default; `--no-validate-emit` opt-out; SPEC §2.2.1 active-by-default |
| Tests | full `bun run test` **22,153 / 0 / 219 skip / 1 todo** (838 files) gate-default-ON (S142 close baseline); within-node parity 1005/0 |
| HEAD scrml-support | `2ec6480` (0/0 with origin) — **r24/r25 gauntlet files STILL untracked** (carry-forward, see Open Questions) |
| Worktrees | main only |
| Inbox | empty |
| Hooks | configuration B (local-rich — pre-commit + post-commit + pre-push at `.git/hooks`) |
| S99 path-discipline counter | 20 |
| PA auto-memory | 43 rule files |
| Maps | watermark `9ab7aa38`, committed `942d62e7`. **STALE by 10 commits** — the S142 codegen landings (gate-found-tail `ada56bb6`, gate-flip `db88e989`, errorBoundary `f3e9039d` incl. NEW `emit-error-boundary.ts`) post-date the watermark. Refresh before any codegen dispatch. |
| HIGH bugs open | **1** (known-gaps §0) — Bug 54 (`tableFor :let` parse-layer; DEFERRED) — the only open HIGH |
| MED bugs | 9 · LOW 14 · Nominal 7 (known-gaps §0 at S142 close) |
| `full wrap` directive | NOT active (S139 directive is in-session-only; does not carry across sessions) |

---

## Session-start checklist (S143 OPEN)

- [x] Read `pa.md` pointer → `scrml-support/pa-scrmlTS.md` IN FULL (1051 lines; S136/S138/S139 addendums in force)
- [x] Read `docs/PA-SCRML-PRIMER.md` canon snapshot §1–§13.6 (lines 1–1114; §13.7+ AST-contract appendix on-demand)
- [x] Read `compiler/SPEC-INDEX.md` (full sections table §1–§58 + Quick-Lookup; 30,481 lines / 58 sections)
- [x] Read `master-list.md` §0 LIVE DASHBOARD (§0.1 phase table + §0.2 locks L1-L22 + §0.4 open questions + §0.6 S142/S141/S140 CLOSE entries)
- [x] Read previous `hand-off.md` (S142 CLOSE) IN FULL
- [x] Read user-voice last ~10 contentful entries (S132 tail / S133 / S134 / S136 / S137 / S141 / S142)
- [x] Sync check: scrmlTS 0/0 with origin · scrml-support 0/0 with origin (untracked r24/r25 gauntlet files — carry-forward)
- [x] Hooks: configuration B confirmed
- [x] Inbox check: empty
- [x] Worktree check: main only
- [x] Rotated `hand-off.md` → `handOffs/hand-off-146.md`
- [x] Created fresh `hand-off.md` (this file)
- [ ] Report caught-up + next priority + surface Open Questions — IN PROGRESS

---

## Open questions to surface immediately

1. **PENDING RATIFICATION — candidate pa.md addendum (NEW branch-leak class, S142).** A worktree mid-dispatch HEAD-reset leaked an agent's 11 WIP commits onto LOCAL main's branch ref (origin untouched) — INVISIBLE to the `git status` leak-check (work committed, not uncommitted; distinct from S99 Edit→main class). Caught via S83 verify-git-state-not-narrative + recovered via S89 reachable-SHA. Candidate addendum: *"on every dispatch landing, verify `git rev-list origin/main..HEAD` + branch-tip-vs-reported-FINAL_SHA coherence, not just `git status`-clean."* Surfaced at S142 close for S143 ratification. **Needs user decision: ratify as-written / amend / drop.**
2. **errorBoundary version cut (deferred from S142).** No version cut was made for the errorBoundary build this session. v0.7.0 (feature) or v0.6.12 (patch) candidate. Per S94 bump-on-tag convention, pkg.json bump precedes the tag. **Needs user decision on cut + version number.**
3. **r24/r25 untracked gauntlet artifacts** (scrml-support `docs/gauntlets/gauntlet-r24*` + `gauntlet-r25*`) — write-once bug-provenance; never committed (r27 IS committed). Decide: commit to scrml-support or leave.
4. **Maps stale by 10 commits** — refresh before any codegen-touching dispatch (errorBoundary `emit-error-boundary.ts` + gate-flip not reflected). Incremental refresh ~user-authorized.
5. **Next priority (awaiting user):** the S141→S142 gate arc + errorBoundary arc are COMPLETE — natural pause point. Candidate threads enumerated below.

---

## Candidate next-priority threads (no work started — awaiting user pick)

- **Fresh gauntlet R28** — now against the strongest baseline yet (gate always-on + errorBoundary functional + formFor/each/tableFor runtime-verified). Per S136 bug-priority doctrine, gauntlet rounds interleave with patch cuts to verify each bug tier is dead.
- **R27 residual bugs** (known-gaps §R27): **C4 (MED)** flagship lifecycle `E-TYPE-001` DORMANT on object-literal-constructed struct values (`const u: User = {...}; u.field`) — PRIMER §6.5 / SPEC §14.12.1 flagship shape; root `collectStructBindings` `type-system.ts:14008` has no object-literal path; **no deferral caveat** (don't soft-classify). **C6 (MED)** `bind:value=@<synth>.<field>` → E-SCOPE-001 only when formFor nested in engine state-child. **C8/C9 (LOW)** `@map[.Variant]` silent invalid JS (also a brief-error) + E-DG-002 false-positive on derived `.filter()` arrow reads.
- **2 NEW S142 LOW diagnostic gaps** — brace-compound `<x> = {…}` (non-canonical; structural-children is canonical §6.3) AND bare-prose `<onTransition>` body both compile exit-0 with NO hard diagnostic (silent-swallow class; should fire E-STRUCTURAL-ELEMENT-MISPLACED / E-UNQUOTED-DISPLAY-TEXT).
- **Bug 54** (`tableFor :let` parse-layer; HIGH; DEFERRED) — the only open HIGH; fix-dispatch candidate.
- **within-node allowlist-staleness hygiene** (~40 stale-high fixtures; gate floors residual at 0 so they never fail — regen-to-current hygiene pass; native-parser-team item).
- **canon-vs-impl drift migration** (design-laden; surface at quiet point): `server function` lints `W-DEPRECATED-SERVER-MODIFIER` though all canon teaches it; `< db>` / `< schema>` leading-space trips `W-WHITESPACE-001`. Lints are CORRECT; canon needs migration.
- **Native parser M2.4 + MK2** (S112 charter B; multi-quarter arc) — M1 lexer complete, M2.1-M2.3 + MK1 landed; next M2.4 (JS scrml-extension forms) + MK2.
- **design-insights gate-ratification append** — the emitted-JS parse-gate A+D ratification recorded in 4 places (deep-dive RATIFIED banner, user-voice S141, SPEC §2.2.1, hand-off); a `~/.claude/design-insights.md` entry is the one remaining home. Low-effort. (Note: S142 errorBoundary → design-insights Insight 32 was captured at S142 close per the close entry — verify.)

## DANGLING / DEFERRED (carried, lower priority)

- **Bug 9 L3 transitive async coloring** — defer until adopter demand; §8 tripwire test flags when L3 lands.
- **`${@x/}` self-closing-slot interpolation** emits dangling `/;` (surfaced 2× S140; LOW; triage).
- **gauntlet-s79-signup-form.scrml E-TYPE-025** (pre-existing; triage).
- **Bug 46 verification** — closed-verified S141 (R25 "not implemented" was stale); confirm no regression.
- **README/positioning cascade** (S133 deferred) — pkg.json description done ("A complete compiler for the web."); README + docs/index.html (5 meta-tag sites) candidate for new positioning; articles stay frozen per artifact-fidelity. Marketing-shaped per Rule 1 — do NOT volunteer; only if user raises.

---

## pa.md directives in force entering S143

- **S136** — BRIEF.md archival per `isolation: "worktree"` dispatch (verbatim prompt → `docs/changes/<change-id>/BRIEF.md`).
- **S138** — R26 empirical-verification doctrine BIDIRECTIONAL (forward: verify before claim-CLOSED; reverse: verify before claim-OPEN/dispatch; cross-source sweep + sibling-fix-unmask sub-rules).
- **S139** — `full wrap [arc-name]` discriminator (in-session-only; NOT active until invoked; 88% safety floor).
- Standing: `--no-verify` prohibition (extends to pre-push); S126 Bash-edit + no-`cd`-into-main mitigation; S99 path-discipline counter (20); S88 explicit `isolation: "worktree"`; S90 CWD-routing gate; S83 commit-discipline two-sided + verify-git-state-not-narrative; **candidate S143 branch-leak addendum PENDING (Open Q #1)**.
- Rules: R1 no marketing unless raised · R2 not-a-toy / full-production fidelity · R3 right answer beats easy · R4 SPEC normative (verify derived claims) · R5 shoot straight. S133: flag typos/word-misuse with 1-liner.

---

## Tags
#session-143 #OPEN #v0-6-11-shipped #gate-default-on #errorBoundary-functional #natural-pause-point #branch-leak-addendum-pending
