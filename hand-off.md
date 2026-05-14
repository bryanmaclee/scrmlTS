# scrmlTS — Session 90 (OPEN)

**Date:** 2026-05-13 (S90; opened directly after S89 wrap)
**Previous:** `handOffs/hand-off-89.md` (S89 CLOSE — 36-commit landmark; HEAD `71305fe`)
**This file:** rotates to `handOffs/hand-off-90.md` at S91 open

**Tests at S90 open:** **12,065 pass / 117 skip / 1 todo / 0 fail / 604 files** at HEAD `71305fe` (carried from S89 close; no S90 work yet).

**Semver state:** v0.2.6 `efbd1e8` still the shipped baseline. v0.3.0 cut path ~95% cleared after S89 (Approach A still has A-2.3..A-2.9 + A-3 + A-4 + A-5 + Wave 4 A/R tracks).

**Cross-machine sync state at S90 open:**
- scrmlTS: 0 ahead / 0 behind origin/main ✅ (S89 wrap pushed)
- scrml-support: 0 ahead / 0 behind origin/main ✅
- Working trees clean across both repos.

**Worktree state at S90 open:** clean. Only main checkout.

**Inbox state:** no unread `.md` messages in `handOffs/incoming/`. Only `dist/` (test artifacts) + `read/` subdirs.

---

## S90 — what happened so far

### Phase 1 — Session-open hygiene (closed clean)
- Rotated S89 hand-off → `handOffs/hand-off-89.md`; opened S90 hand-off.
- Appended S89 verbatim user-voice (4 directives: null/undefined absolute, self-host from-scratch, skinny-arrow lifecycle, "1 all" dispatch authorization) to `../scrml-support/user-voice-scrmlTS.md`.
- FULL_COLD_START map refresh via project-mapper: 11 maps regenerated; HEAD bumped `9b98118 → 71305fe`; test count `11,912/590 → 12,065/604`; Key Facts narrative S88 → S89 close.
- Commits + pushes: scrml-support `52d5650..7a3fbea`; scrmlTS `71305fe..e4c4863` (pre-push gate clean: 12,065 pass / 0 fail / 117 skip + TodoMVC gauntlet PASS).

### Phase 2 — M-7C-D-12 OQ dispositions (ALL 9 RATIFIED)

S89 SCOPING `docs/changes/m-7c-d-12-runtime-sentinel-scoping/SCOPING.md` had 9 OQs. S89 already ratified OQ-1 (Option ε). S90 ratifies the remaining 8:

**Explicit user disposition (3 substantive OQs):**
- **OQ-2 wire-envelope JSON shape** → **(b) `{"__scrml_absent": true}`** — forward-compat with β; mirrors `__scrml_error` canonical precedent (emit-server.ts L952).
- **OQ-5 `?? "undefined"` fallback** → **(a) replace with `"null"`** — preserves existing semantics per §42.5/§42.8; 16 sites (emit-server.ts ×3, emit-logic.ts ×10, scheduling.ts ×3).
- **OQ-6 error-code rename** → **(a) `E-DERIVED-ENGINE-INITIAL-UNDEFINED-RT` → `E-DERIVED-ENGINE-INITIAL-ABSENT-RT`** — breaking-change to error catalog accepted at v0.3 cut window.

**Batch-ratified on agent recommendation (5 OQs):**
- **OQ-3 sequencing** → **Parallel-aggressive variant** (T4 + T1 + T3 NOW; T2 after T4 lands; T5 last). OQ-2/5/6 ratifications already lock the design; saves ~14-22h walltime vs strict spec-first.
- **OQ-4 backwards-compat** → **(b) dual-decoder for scaffold; (a) clean break at v1.0** — T2 decoder accepts both raw `null` (legacy) and `{__scrml_absent:true}` (canonical).
- **OQ-7 DevTools experience** → **(a) accept + document** — §12.5.1 / §42.8 "Runtime Representation" subsection clarifies DevTools shows JS bit-pattern; scrml predicates classify correctly.
- **OQ-8 schema-differ M-7C-D-15** → **DEFER** — §42.9 interop boundary already covers SQL `NULL`; no SQL DDL changes.
- **OQ-9 spec-amend timeline** → **AFTER Wave 4 T+D (closed S89); concurrent with Wave 4 A+R (remaining tracks)** — spec changes are file-disjoint from adopter-content work.

### Phase 3 — Dispatch (in flight, retry round)

Parallel dispatch of 3 of 5 tracks per OQ-3 ratification:
- **T1 — AST internal cleanup** (10-14h, agent `a72b73107987faddd`): types/ast.ts LitExpr discriminator migration; parser stops manufacturing `"null"`/`"undefined"` litTypes; gauntlet-phase3 detector migration; component-expander; type-system whitelists.
- **T3 — `?? "undefined"` fix** (7-8h, agent `acb3b94dfdfe860c6`): 16-site mechanical replace `"undefined"` → `"null"` + new CG-level lint forbidding literal `undefined` JS-keyword interpolation as regression guard.
- **T4 — SPEC amendments** (4-7h, agent `adb60dde9579cd067`): §12.5.1 + new §50.x + §51.0.J + §34 catalog row + SPEC-INDEX refresh.

T2 (wire envelope, 10-12h) fires after T4 lands. T5 (audit closure docs, 2-4h) last.

#### Sub-phase 3.A — First dispatch routing finding (BLOCKED then RECOVERED)

**Symptom.** First-attempt dispatch (T1=`aaa100cd3664eec90`, T3=`a8aacdceef607dff9`, T4=`ad2cc4be28dcc7e5a`) — all three agents reported BLOCKED at startup-verification: harness provisioned their `isolation: "worktree"` worktrees under `/home/bryan-maclee/scrmlMaster/scrml-support/.claude/worktrees/agent-<id>/` instead of `scrmlTS/.claude/worktrees/`. Agents correctly refused to write per F4 + pa.md path-discipline rules.

**Root cause.** The Agent tool's `isolation: "worktree"` provisions worktrees based on the **Bash shell's current CWD**. PA's earlier user-voice commit chain (`cd /home/bryan-maclee/scrmlMaster/scrml-support && git add ... && git commit ... && git push ...`) persisted the shell CWD in scrml-support. Subsequent `git -C /home/bryan-maclee/scrmlMaster/scrmlTS <cmd>` calls do NOT change CWD — only `cd` does. When PA dispatched the three agents, the harness inherited scrml-support as the active CWD and routed worktrees there.

**Recovery.** Zero work-lost — F4 startup-verification block in each brief caught the wrong-repo `pwd` output, agents stopped before any writes. PA:
1. Ran `TaskStop` on T4 (still in flight; T1 + T3 had already returned BLOCKED).
2. Cleaned up the orphaned scrml-support locked worktree (`agent-ad2cc4be28dcc7e5a`).
3. Ran `cd /home/bryan-maclee/scrmlMaster/scrmlTS && pwd` to reset CWD.
4. Re-dispatched all 3 agents with the same briefs + an added "RETRY DISPATCH" note instructing the F4 verification to enforce the `scrmlTS/.claude/worktrees/` path-prefix check.
5. Verified post-dispatch: all 3 retry worktrees correctly under `scrmlTS/.claude/worktrees/` at base `725e07c`.

**Memory rule saved.** `feedback_agent_isolation_cwd_routing.md` captures the finding — added to MEMORY.md index. Operational rule for future PA: **after any Bash chain that includes `cd <sibling-repo>` during a session, run an explicit `cd /home/bryan-maclee/scrmlMaster/scrmlTS && pwd` BEFORE the next `Agent({isolation: "worktree"})` dispatch sequence.** Equivalent prevention: never `cd` into sibling repos — use `git -C <path>` for all sibling-repo git operations to keep CWD locked to scrmlTS throughout the session.

**Defense-in-depth confirmed.** This incident validates the F4 + path-discipline brief mandates (pa.md S58 + S88 layers). When the harness routing is broken, the F4 block + "STOP if check fails" is the protective gate. Without it, agents would have written compiler-source changes into scrml-support worktrees and tried to commit/push them — the work would have been lost or polluted. Keep F4 blocks mandatory in every dev-agent brief.

**Defensive brief amendment.** The retry briefs now explicitly require the worktree path to start with `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/`. This sharpens the F4 check from "is this a worktree?" to "is this a worktree IN THE EXPECTED REPO?" — the standing pa.md F4 template should be updated to include this check in S91 maintenance.

### Phase 4 — Track landings (3 of 5 tracks LANDED in main)

All three retry agents completed cleanly. PA file-delta'd each into main, then unified `progress.md` from the three branches.

| Track | Agent | Agent FINAL_SHA | PA landing commit | Lines | Tests delta |
|---|---|---|---|---|---|
| **T1** AST cleanup | `a72b73107987faddd` | `46ec263` (5 commits) | `850a298` | +485/-52 | +23 |
| **T3** codegen + lint | `acb3b94dfdfe860c6` | `16185f5` (6 commits) | `887f420` | +705/-21 | +28 |
| **T4** SPEC amendments | `adb60dde9579cd067` | `7d76e20` (4 commits) | `8cef7f5` | +173/-58 | 0 |
| (PA progress unified) | — | — | `e3b1624` | +65/-0 | 0 |

**Tests at S90 progress merge HEAD `e3b1624`:** **11,374 pass / 88 skip / 1 todo / 0 fail / 578 files** (pre-commit gate subset; full-suite count to verify via pre-push hook on next push). Baseline pre-commit was 11,323 / 575 — delta +51 pass / +3 files matches T1 (+23) + T3 (+28).

**T1 substantive findings:**
- Discriminator strategy: `raw` field discriminates user-source `null`/`undefined` from synthetic/canonical absence. User `null` → `litType:"not", raw:"null"`; canonical `not` keyword → `litType:"not", raw:"not"`; synthetic absence (array hole, reset-RHS, is-* RHS) → `litType:"not", raw:"not"`. `emitStringFromTree` round-trip preserves source-token via `raw`.
- **Semantic refinement (intentional):** array holes `[1,,3]` now emit JS `null` (was JS `undefined` via `litType:"undefined"` fallback to `node.raw`). Aligned with §42.5/§42.8.
- Scope-notes (NOT migrated, defensible): `route-inference.ts` JS_KEYWORDS defensive filter; `tokenizer.ts` + `ast-builder.js` VALUE_KEYWORDS lexer-level classifications; `type-system.ts` `tPrimitive("null")` JS-host DOM ref type.
- **Pre-existing gap surfaced (NOT closed, follow-up):** component PropDecl `defaultValue:"null"` raw-attribute-string bypasses GCP3 walker. Track 1 preserves current behavior. Separate dispatch needed.

**T3 substantive findings:**
- 16-site migration confirmed (emit-server.ts ×3 / emit-logic.ts ×10 / scheduling.ts ×3).
- **Lockstep migration** of 3 consumer guards in emit-logic.ts (L612 `=== "undefined"` → `=== "null"`; L1906/L1921 `!== "undefined"` → `!== "null"`) — per SCOPING risk register; the fallback default + consumer guards are a coupled sentinel-pair.
- **Semantic cascade (intentional, OQ-5 (a)):** `fail E.Variant` (no args) now produces `data: null` instead of `data: undefined`. Pre-existing test migrated.
- New lint `W-CG-UNDEFINED-INTERPOLATION` (W-CG-* family). Idiom-aware exemptions: paired `null && undefined` (§42.5/§42.8); `typeof X !== "undefined"`; comments; string literals; template-literal text; embedded runtime block (M-7C-D-14 scope) masked.
- Corpus sanity sweep at agent: 289 samples + 45 stdlib = 334 files compiled, **0 W-CG-UNDEFINED-INTERPOLATION findings**.

**T4 substantive findings:**
- **§57 NEW Wire Format section** (NOT §50 — that slot was occupied by Assignment-as-Expression since v0.next). 7 subsections at SPEC.md L27050-27144.
- Rename: `E-DERIVED-ENGINE-INITIAL-UNDEFINED` → `E-DERIVED-ENGINE-INITIAL-ABSENT`. Three SPEC sites updated (§34 / §51.0.J / §55 validators-summary). Note: SCOPING called it `-RT` suffix; actual SPEC code lacks suffix — surgical rename preserves shape. Runtime-emission rename in compiler/src/* is Track 2 territory.
- §42.8 "Runtime Representation" subsection added (OQ-7).
- SPEC.md grew 27,037 → 27,144 lines.

**PA-side amendment during T4 landing:** §34 catalog row for `W-CG-UNDEFINED-INTERPOLATION` added directly (both T3 and T4 punted on the row). Row sits in W-CG-* family between W-CG-001 and E-ERRORS-001.

**Process flags surfaced:**

- **T1 agent's `--no-verify` use (one commit, mid-dispatch).** Agent's per-step chain included one `--no-verify` commit (`e37d932`) on a worry about a post-commit hook regex false-positive. Subsequent agent commits ran the full pre-commit gate cleanly. PA file-delta landed only the final tree shape through PA-authored commits — **no `--no-verify` in main's history**. Surfaced for transparency per pa.md S88 rule (process violation but final-state-green). Possible mitigation for future dispatches: brief explicitly forbids `--no-verify` without explicit user authorization (matching pa.md rule). For now: noted; no action required.
- **Coordination gap between T3 and T4 on §34 W-CG row.** Each agent punted to the other. PA closed during T4 landing. Could be prevented in future briefs by assigning the row explicitly to one agent (recommend: whichever agent owns SPEC.md edits, i.e., spec-amendment Track).

### Phase 5 — Worktree cleanup + push

- All three retry worktrees cleaned per S83 retention rule (content landed in main; cross-session retention unwarranted): `agent-a72b73107987faddd`, `agent-acb3b94dfdfe860c6`, `agent-adb60dde9579cd067` removed + branches deleted. Final state: only main checkout.
- Push of 4 commits (`725e07c..e3b1624`) backgrounded through pre-push gate (~5min full-suite).

### Remaining M-7C-D-12 work (after this push lands)

- **Track 2 — Wire envelope codegen (10-12h)** — encoder in emit-server.ts that wraps `?? null` in `{"__scrml_absent": true}` envelope when return type is `T | not`; client-side dual-decoder helper (canonical envelope + legacy raw-null fallback per OQ-4); tests. Now unblocked — §57 SPEC text lives at HEAD.
- **Track 5 — Audit closure docs (2-4h)** — document audit-item closure rationale in master-list + audit appendix; re-grep compiler/src/ post-migration; update audit counts (most M-7C-D-N + M-8C-D-N items close as spec-ratified per Option ε).
- Then: bundled paired-migration packets per Wave 9.A audit §6 ordering can begin firing.

---

## Session-start observations (PA work product for S90)

### Map currency
- `primary.map.md` line 3: `commit: 9b98118` — stamped at S89 open (post-worktree-cleanup baseline). S89 then committed 36 commits ending at `71305fe`. The S89 wrap commit `71305fe` updated map FILE CONTENTS (per its commit body: ".claude/maps/* → reflect S89 chain closures + new files (12 map files refreshed)") but the metadata header `commit: 9b98118` was NOT bumped — looks like editor-content was rewritten without re-touching line 3.
- **Action surfaced to user (Q-OPEN-1):** propose incremental `/map` refresh at S90 open to (a) bump the metadata SHA forward and (b) catch any drift from the 36 S89 commits that the wrap-time refresh missed.

### User-voice gap from S89
- `../scrml-support/user-voice-scrmlTS.md` was NOT appended for S89. Last entry in user-voice is S88 (`## Session 88 — 2026-05-12 → 2026-05-13`).
- S89 had **4 durable verbatim directives** that should be in user-voice per pa.md "Writing to user-voice" rules (append-only, verbatim, never paraphrase):
  1. **"null does NOT EXIST IN SCRML! and never will!"** + **"yes this extends to undefined. \"\" is still defined. it is a string, it is empty but a string none the less"** — the absolute null+undefined eradication directive
  2. **Self-host is a from-scratch rewrite** (corrected PA's "TS parity is load-bearing" framing; user verbatim from S89, captured in `feedback_self_host_is_from_scratch.md`: *"look, scrml does it WAY BETTER" — not "look, scrml can do it too."*)
  3. **Skinny arrow `A -> B` semantic** — user verbatim S89: *"starts as A, can become B"* (lifecycle transition; NOT function type / union / mapping)
  4. **"1 all"** + **"1 all. concurrent where safe"** — authorization shape for parallel-dispatch batching
- Memory files captured these. user-voice did NOT. **Action surfaced to user (Q-OPEN-2):** append S89 user-voice section before further S90 work — this is the canonical verbatim log.

---

## Open questions to surface immediately (S90 pickup)

### Q-OPEN-1 — Map refresh
Run incremental `/map` to bump `primary.map.md` commit metadata + capture any S89 deltas the wrap-time refresh missed? Pure-mechanical PA work, ~5 min.

### Q-OPEN-2 — S89 user-voice append
Append 4 S89 verbatim directives to `../scrml-support/user-voice-scrmlTS.md` as `## Session 89 — 2026-05-13` before any other S90 work? Pure-PA append, ~10-15 min.

### Q-OPEN-3 — M-7C-D-12 impl Tracks 1-5 (carried from S89)
Option ε ratified S89. **3 substantive OQs still need disposition before impl:**
- **OQ-2 wire-envelope JSON shape** — small adjustment for absence-vs-JS-host-null wire distinction
- **OQ-5 `?? "undefined"` replacement** — codegen emits literal `"undefined"` string in init-fallback (emit-server.ts L882/L1047/L1139 + emit-logic.ts 10 sites + scheduling.ts L127-L129)
- **OQ-6 `E-DERIVED-ENGINE-INITIAL-UNDEFINED-RT` rename** — error code name contains forbidden `undefined` token; likely → `E-DERIVED-ENGINE-INITIAL-ABSENT-RT`

5 tracks / 33-45h aggregate ready to dispatch after OQ-2/5/6 dispositioned. SCOPING at `docs/changes/m-7c-d-12-runtime-sentinel-scoping/SCOPING.md`.

### Q-OPEN-4 — 9.A classification chain-blocked (carried from S89)
After M-7C-D-12 ratification + impl, ~18 M-7C-D-N + 16 M-8C-D-N items can dispatch as bundled paired edit packets per audit §6 ordering (less the items closed-as-spec-ratified by Option ε).

### Q-OPEN-5 — Wave 4.A remaining tracks (A + R) (carried from S89)
T-track + D-track done S89 via Wave 6. **A-track (scrml.dev refresh)** + **R-track (README + currency)** pending. ~6-12h aggregate.

### Q-OPEN-6 — A-2.3 onward (Reachability Solver continuation) (carried from S89)
A-2.1 scaffold + A-2.2 Component 1 done. A-2.3 reactive_dep_closure (Component 2; 6-10h) next. Then A-2.4..A-2.9. Multi-month walltime to close A-2 wave.

### Q-OPEN-7 — A-3 sub-phases pending (AuthGraph impl) (carried from S89)
SCOPING captured. 5 sub-phases / 30-49h parallel critical path. Depends on A-3's role-enum resolution feeding A-2.5 Component 4.

### Q-OPEN-8 — `default=null` audit-doc closure (carried from S89)
Check whether `docs/audits/articles-currency-table-2026-05-13.md` needs an update note reflecting the post-S89 ruling change (null/undefined now ABSOLUTE — `default=null` is no longer ratifiable).

### Q-OPEN-9 — pa.md S89 amendments (carried from S89)
Consider whether any S89 memory rules reach pa.md update threshold (null-eradication rule + self-host-is-from-scratch rule are arguably load-bearing across all future sessions; might warrant pa.md addendum).

---

## Things S90 PA must NOT screw up (carried forward from S89)

- **DO NOT** revisit "TS parity" as a load-bearing scrml property. TS impl is scaffold; self-host is from-scratch rewrite. Per `feedback_self_host_is_from_scratch.md`.

- **DO NOT** treat `null` or `undefined` as canonical scrml tokens in ANY context. They do not exist in scrml. `""` / `0` / `false` / `[]` / `{}` ARE defined values. Per `feedback_null_does_not_exist_in_scrml.md`.

- **DO NOT** clean up agent worktree BEFORE landing its content into main. Per `feedback_land_before_cleanup.md`.

- **DO** check agent's working tree for uncommitted Step-N work when agent crashes pre-commit. Per `feedback_agent_crash_partial_recovery.md`.

- **DO** trust Rule-4 reconnaissance. S89 had 8 substantive Rule-4 findings (W-PROGRAM-SPA-INFERRED already-done; §36 70%-already-done; Wave 4 substantially-advanced; §13.2 Sub-C already-Sub-B-done; A-2 algorithm SPEC-pinned; 8.C self-host superseded; 9.A all items chain-blocked; 9.B SPEC-already-ratifies-codegen-null).

- **DO** set `isolation: "worktree"` on EVERY dev-agent / scrml-writer / codegen Agent() call. Per S88 addendum to pa.md.

### Rules permanently load-bearing
- Rule 1 — no marketing/article/tweet work unless user brings it up
- Rule 2 — full-production-language fidelity
- Rule 3 — right answer beats easy answer 99.999% of the time
- Rule 4 — spec is normative; derived planning docs are NOT
- S86 ratifications — idiomatic-examples styling rule + corpus-ouroboros warning + BS-layer over SPEC retreat
- S87 memory rules — bash-cleanup dry-run + file-delta base SHA check
- S88 memory rules — file-delta-vs-cherry-pick + stated-intent-vs-corpus migration
- S89 memory rules — land-before-cleanup + agent-crash-partial-recovery + null-does-not-exist-in-scrml + self-host-is-from-scratch

---

## Push state at S90 open

scrmlTS + scrml-support both 0 ahead of origin. Clean baseline.

---

## Tags

#session-90 #open #v0.2.6-baseline #v0.3-in-flight #m-7c-d-12-tracks-pending #A-2-3-onward-pending #A-3-impl-pending #wave-4-A-and-R-pending #user-voice-S89-not-appended #map-metadata-stale-on-line-3
