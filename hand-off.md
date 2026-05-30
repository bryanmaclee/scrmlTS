# scrmlTS — Session 143 (CLOSE)

**Date:** 2026-05-29 → 2026-05-30
**Previous:** `handOffs/hand-off-146.md` (S142 CLOSE — emitted-JS parse gate flipped DEFAULT-ON v0.6.11 + errorBoundary built §19.6+C-hybrid + gate-found-tail).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-147.md` at S144 OPEN.

**🎯 S143 MILESTONE — gauntlet R28 + complete fix-wave + v0.7.0 cut.** Ran gauntlet R28 (Content-Publishing-Platform "Press", 5 personas) end-to-end (build → independent overseer verification → PA dual-verify), which validated the two S142 investments (errorBoundary + the parse gate) and surfaced a fresh verified bug surface. **Then fixed ALL of it:** 6 HIGH bugs + the long-deferred **Bug 54** closed + 1 canon-fix, all PA R26-verified. **known-gaps HIGH 5→0.** Cut **v0.7.0** (errorBoundary + R28 fix-wave). Full suite **22,215/0/219**, within-node 1005/0, TodoMVC PASS.

**S143 CLOSE — v0.7.0 shipped + wrap+push.** Marathon, exceptionally high-yield. ~14 commits + v0.7.0 tag pushed; 6 worktree dispatches (R28-1/2/3/6/7/1b) all clean-landed (incl. a 3-way type-system.ts merge for R28-2/R28-6 collision + the disjoint R28-7/R28-1b parallel pair). known-gaps §0 at CLOSE: **HIGH 0** · MED 13 · LOW 15 · Nominal 7.

---

## State as of CLOSE

| Item | Value |
|---|---|
| HEAD scrmlTS | `c5dbf15d` — **PUSHED, 0/0 with origin.** v0.7.0 release. |
| Latest release tag | **`v0.7.0`** (`c5dbf15d`, pushed) — "errorBoundary + gauntlet R28 fix-wave" |
| pkg.json | **0.7.0** |
| Tests | full `bun run test` **22,215 / 0 / 219 skip / 1 todo** (pre-push gate); within-node parity 1005/0; TodoMVC PASS |
| HEAD scrml-support | `9951aef` (0/0 with origin) — gauntlet-r28 round + r24/r25 backfill committed+pushed S143 |
| Worktrees | main only (all 6 R28 dispatches cleaned) |
| Inbox | empty |
| Hooks | configuration B (local-rich — pre-commit + post-commit + pre-push) |
| S99 path-discipline counter | 20 (held; minor self-verified deviations banked — see below) |
| Maps | watermark `9ab7aa38`, **STALE ~20 commits** (all S143 R28 codegen/type-system/SPEC landings) — refresh at S144 if dispatching codegen work |
| HIGH bugs open | **0** (R28 fix-wave closed all 5 open + Bug 54) |
| MED / LOW / Nominal | 13 / 15 / 7 |

---

## 🎯 S143 — GAUNTLET R28 + FIX-WAVE (the whole arc)

### Round (committed+pushed scrml-support `9951aef`)
R28 "Press" CMS, 5 personas (React/Go/Elixir/Svelte/Pascal). Two background workflows: build (5 parallel dev-returns-content) → verification (5 overseers + synthesis), PA dual-verify (R26) before filing. Artifacts: `scrml-support/docs/gauntlets/gauntlet-r28/` (BRIEF + 5 sources + 5 reports + OVERSEER-REPORT + overseer-verdicts-raw.json) + `gauntlet-r28-report.md`.
- **Validation wins:** errorBoundary §19.6 (S142) works end-to-end (all 5; zero walls); parse gate (S142 default-ON) zero false positives + 2 true-positive codegen-defect catches. Overseer caught 2 dev misreports (react+svelte on the transition() path).

### Fix-wave — ALL LANDED + PA R26-verified + pushed (v0.7.0)
| Bug | Commit | What |
|---|---|---|
| R28-1 | `e6fb2f3d` | `@.`-leak in `<match on=@.>` inside `<each as>` — gate-fire closed (emit-match `resolveOnExpr` lowers to iter var) |
| R28-3 | `051ce984` | `:`-shorthand engine + `//`-comment BS break (block-splitter `skipTriviaForCompoundScan`, §27.1) |
| R28-6 | `0ecfab98` | variant-progression `transition()` enforcement — agent CORRECTED the brief root cause (`.get()` red herring; real gap = state-decl RHS read-scan) |
| R28-2 | `0dbef110` | tableFor `<column>` row-access both ways (`:let` via §16.6 re-parse + `@row`→loop-local) — **Bug 54 un-deferred + CLOSED** |
| R28-7 | `4144dc30` | schemaFor/tableFor `T \| not` nullable mapping (SPEC §41.15.8a/§41.16.6a; §14.8.3 inverse; user chose fix-now + empty-`<td>`) |
| R28-1b | `1d227a74` | per-item block-form `<match>` inside `<each>` (item-scoped mount + per-mount dispose; happy-dom 11/0) |
| R28-C1 | `44d61a19` | canon-fix: SPEC §14.12.6.2 + PRIMER §6.5 `server fn`→`server function` (6 examples; were E-FN-001) |

**Landing notes:** R28-2/R28-6 both touched type-system.ts → 3-way patch (disjoint regions, verified intact). R28-7/R28-1b dispatched in parallel (file-disjoint; R28-1b scope-fenced off type-system.ts). All S142 branch-coherence checks passed.

**Process (banked, shoot-straight):** R28-6 agent self-caught+amended a `--no-verify` on a doc-only commit (load-bearing always gated). R28-1 + R28-7 agents both flagged sibling-index/leak awareness (S119/S126), self-verified clean. R28-7 agent self-recovered a `git checkout` that wiped+reapplied uncommitted impl. Zero net violations; all banked honest.

### NEW findings surfaced (filed known-gaps §R28; S144 carry-forward)
- **R28-1c** (MED, needs-confirm) — `<each>` same-key per-item-reactivity gap: in-place field mutation doesn't re-render per-item content (keyed reconcile reuses the `<li>` without re-running the factory; affects `${article.title}` too — GENERAL each gap, not match-specific).
- **R28-1d** (MED, needs-confirm) — bare-`<program>` default-logic form (no `${...}` wrap) drops `<ul>`/`<each>` (emits no each-mount/render fn).
- **R28-2b** (LOW) — tokenizer strips leading `:` on `:let` (`tokenizer.ts:763`); R28-2 worked around via the `let` alias (`:let` FUNCTIONS today); verbatim `:let` needs a tokenizer dispatch.
- **R28-7b** (LOW) — predicated-base-in-union (`string req length(<=200) | not`) → `[asIs, not]`, still unmappable (resolver loses predicate-base inside a union member).

---

## Open questions / S144 carry-forward

1. **R28-8 DECISION (the one un-decided R28 item)** — bare-variant inference doesn't reach typed object-literal field positions / `is some`-narrowed `==` RHS → E-VARIANT-AMBIGUOUS. Overseer split (svelte: `: T` annotation propagates; elixir: doesn't). **Decision: extend §14.10 inference (compiler) OR fix the kickstarter §4.8 "other position" overclaim (canon).** Note: extending §14.10 touches type-system.ts.
2. **R28-1c / R28-1d** — independent confirmation (R26 reverse-direction) + severity before fix-dispatch. R28-1c could be HIGH if the each per-item-reactivity gap is broad (it affects all per-item content, not just match).
3. **R28-4** (MED) — `E-PA-002` advertises a `?{} CREATE TABLE` fix the scanner ignores (misleading diagnostic). Quick.
4. **R28-2b** (tokenizer `:`) · **R28-7b** (predicated-base-in-union) — LOW follow-ups.
5. **R28-C2** (canon-maintenance) — kickstarter drift bundle: §11.3 stale file-level channel placement; §11.13 SSE recipe omits sleep import; `< db>`/`< schema>` leading-space; §14.12.6.x examples use `print()`. Lints/SPEC correct; kickstarter stale (2026-05-04).
6. **Maps refresh** (~20 commits stale) — before any S144 codegen dispatch.
7. **R28 residuals from S141/S142 still open** (not R28-round): C4 (= R28-5, object-literal lifecycle E-TYPE-001 dormant; now has a clean reproducer) · C6 (formFor bind in engine state-child E-SCOPE-001) · the 2 S142 LOW diagnostic gaps · Bug 9 L3 transitive async · `${@x/}` self-closing-slot dangling `/;` · gauntlet-s79 E-TYPE-025 · within-node allowlist staleness (~40 stale-high).
8. **Native parser M2.4 + MK2** (S112 charter B; multi-quarter).
9. **Fresh gauntlet R29** — now against an even stronger baseline (v0.7.0; all R28 HIGH closed).

---

## pa.md directives in force entering S144
- **S136** BRIEF.md archival · **S138** R26 bidirectional · **S139** `full wrap` (in-session-only; NOT active).
- **CANDIDATE PENDING (carried from S142, NOT YET RATIFIED):** the branch-leak addendum — *"on every dispatch landing, verify `git rev-list origin/main..HEAD` + branch-tip-vs-FINAL_SHA coherence, not just `git status`-clean."* Used it on all 6 R28 landings (all coherent). **Surface for ratification at S144** (it's now battle-tested across 6 dispatches).
- Standing: `--no-verify` prohibition (extends to pre-push); S126 Bash-edit + no-`cd`-into-main; S99 path-discipline (20); S88 explicit isolation:worktree; S90 CWD gate; S83 commit-discipline + verify-git-state; S94 bump-on-tag (executed for v0.7.0); `feedback_file_delta_vs_cherry_pick` (R28-2 3-way patch precedent reinforced).
- Rules: R1 no marketing · R2 not-a-toy · R3 right-beats-easy · R4 SPEC normative · R5 shoot straight · S133 typo-flag.

---

## S143 process learnings (durable)
- **Ultracode workflow orchestration validated end-to-end.** Gauntlet build + overseer-verification ran as 2 background workflows (5+6 agents); the fix-wave + features as 6 parallel/sequential worktree dispatches. The verification chain earned its keep: R26 PA-dual-verify caught 2 of my own first-pass repros being shape-wrong; the overseer caught 2 dev misreports; the R28-6 agent empirically corrected the brief's root-cause hypothesis (Rule 4 / R26 working as designed).
- **The S142 branch-coherence candidate addendum held across 6 landings** — battle-tested; ratify S144.
- **Parallel-dispatch file-collision discipline** — R28-2/R28-6 type-system.ts 3-way patch + R28-7/R28-1b scope-fencing prevented clobbers. The `feedback_file_delta_vs_cherry_pick` rule + region-analysis-before-checkout is the operational guard.

---

## Tags
#session-143 #CLOSE #v0-7-0-shipped #gauntlet-r28 #fix-wave-complete #HIGH-0 #bug-54-closed #tnot-nullable-mapping #errorBoundary-shipped
