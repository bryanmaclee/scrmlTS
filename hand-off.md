# scrmlTS — Session 66 (CLOSE — substantial methodology + impl wave)

**Date opened:** 2026-05-06 (continuation evening; same calendar day as S65 close)
**Date closed:** 2026-05-07
**Previous:** `handOffs/hand-off-65.md` (S65 close)
**This file:** rotates to `handOffs/hand-off-66.md` at S67 open
**Tests at close:** **9,090 / 44 / 1 / 0** (full suite); **8,366 / 33 / 1 / 0** (pre-commit subset). Net +71 from S65 baseline 9,019.

---

## TL;DR — what landed

| Layer | Outcome |
|---|---|
| **Methodology** | pa.md "Design discipline" section added with **4 rules** (no marketing; not-a-toy; right-answer-beats-easy; **spec-is-normative-derived-docs-are-NOT**). PERMANENT until v0.2.0 ships. Two precedent-error narratives recorded for future PA |
| **A1b foundational wave 1 COMPLETE** | B1 ✅ B2 ✅ B3 ✅ **B4 ✅ (S66 — import binding + pinned source-position forward-ref check; 32 new tests)** B5 ✅ |
| **A1b wave 2 advanced** | **B6 SHIPPED (render-by-tag classifier; 19 tests)**; B7 + B8 audited pre-dispatch (1 substantive scope expansion + 1 spec naming drift surfaced + 1 wave-ordering caveat) |
| **S66 narrowing reversal** | Reverted 4 commits (drop-`==`-from-spec error). Parser fix: bare-dot variants `.Variant` parseable as primary expressions everywhere. Lint + CLI extended to full predicate matrix (`is` AND `==`). Promotion ergonomics Tier B SHIPPED on full predicate matrix |
| **Tier B (promotion ergonomics) SHIPPED + Tier C scoped** | `bun scrml promote --match` AST→AST span-rewrite + I-MATCH-PROMOTABLE lint live. `--engine` deferred to Tier C with full SCOPE doc |
| **Self-host plan changed** | DEFERRED to post-v1.0.0; **entire self-host scrml compiler** human-authored (not just bootstrap), processed through scrmlTS. ~40-80h removed from v0.2.0 plan |
| **A1c Rule-4 audit landed** | Pre-dispatch spec-faithfulness check on 24-step A1c roadmap. 1 substantive drift (validator catalog `email/url/numeric/integer/custom` claimed as universal-core but NOT in SPEC §55.1) + 1 minor incompleteness (schema lowering table) |
| **Maps cold-start refresh** | First real refresh since S40. ~12 days of work caught up. `7d_intinct_doc_only` 7df773f |
| **Spec amendments** | §6.6.10 `E-REACTIVE-005` → `E-DERIVED-CIRCULAR-DEP` rename footnote (parallel to §6.6.8 S59 pattern) |
| **Primer §8 correction** | Validator catalog drift fixed (drop email/url/numeric/integer; align to SPEC §55.1's actual 14) |
| **Master-driven docs work** | scrml.dev refresh: change-1 (extract styles to `_styles.css`) + change-2 (Bun build script + templates) committed. Master sends per-change FYI/action; PA validates + commits + does NOT proactively run `bun run docs:build` (Rule 1) |

**Total S66 commits on main: 38.** Push pending — Bryan-authorized "wrap and push."

---

## Commit roster (38 since S65 wrap `7334fb0`)

| # | SHA | Topic |
|---|---|---|
| 1 | `7df773f` | Maps cold-start refresh (S40 → S65 catch-up) |
| 2-9 | (Tier B initial: Phase 0/0a/0b/0c/1/2 of original predicate-narrowing path) | parseable-only-`is` lint + CLI shipped |
| 10 | `a841ab4` | Tier B Phase 4 docs (later REVERTED) |
| 11 | `289b4a3` | Tier C SCOPE — `--engine` + W-MATCH-TRANSITIONS-ACCRUING |
| 12-14 | `d66771e` `87b75f9` `3326b91` | **Narrowing reversal** — 4 reverts in 3 commits restoring SPEC §56 + SCOPE.md + docs |
| 15 | `cb167b1` | **Parser principled fix** — bare-dot variants parseable as primary expressions |
| 16 | `4f2ff35` | Lint + CLI: full predicate matrix (`is` AND `==`) + 3 new tests |
| 17 | `7e9121a` | progress.md reversal narrative |
| 18 | `bb97e9a` | Primer §13.8 + article + kickstarter — S66-shipped status |
| 19 | `b9ed76f` | Self-host bootstrap DEFERRED |
| 20 | `c744b19` | **pa.md Rules 1+2+3** added (3 design-discipline rules) |
| 21 | `7a213b9` | Self-host clarification (entire compiler, not just bootstrap) |
| 22 | `0ff3817` (cherry-pick of 5 commits) | **A1b B4 SHIPPED** — import binding + pinned forward-ref source-position check |
| 23 | `f9ab867` | A1c Rule-4 audit |
| 24 | `eba2df0` | Primer §8 validator-catalog correction |
| 25 | `6768132` | **pa.md Rule 4** added (spec is normative, derived docs NOT) |
| 26 | `ac23dde` | A1b B7 Rule-4 audit |
| 27 | `9064767` | spec(§6.6.10) E-REACTIVE-005 → E-DERIVED-CIRCULAR-DEP rename footnote |
| 28 | `5f1b925` | A1b B8 Rule-4 audit |
| 29 | `2ec30cc` | B6 Phase 0 survey (cherry-pick from killed first agent) |
| 30-32 | `efdbb49` `cbf4514` `d1b7f1e` | **B6 SHIPPED** — render-by-tag classifier (PASS 5 + 19 tests + primer §13.7 row) |
| 33 | `afaa6b6` | docs(site) change 1 — extract styles (master-driven) |
| 34 | `26ebfc9` | docs(site) change 2 — Bun build script (master-driven) |

(Numbering approximate — see `git log` for exact sequence.)

---

## Bryan's workflow concern (load-bearing for next-session PA)

**User raised mid-session (verbatim):**
> cherry picking the work on every code edit, rewriting everything from diagnostic agents. it really seams like we are double-dipping work alot. For a while, I had a system implemented where instead of worktrees we just gave agents a throw-away dir with everything they need and they would commit to main and have full permissions within that dir. then changes could just be a quick cp instead of re-hashing everything an agent did. what happend to that?

**Honest analysis (PA's read; Bryan to weigh in):**

Current pattern (worktrees + cherry-pick) was instituted because:
1. Worktrees give safe parallel-dispatch isolation (per concurrency hazard #61)
2. Cherry-pick gives PA review-before-land safety net (S66 narrowing-error reversal validates this — the audit caught it pre-impl)
3. Branch is the crash-recovery checkpoint (B6 first agent killed mid-Phase-1; survey commit on its branch was salvageable)

**But:** Bryan's concern is real. Overhead exists. Specifically:
- Cherry-pick step is mechanical; 90% of dispatches land clean. Conflicts on progress.md (append-only) are recurring.
- "Diagnostic agent rewriting" — not what happens (PA writes audits + briefs FOR agents; agents write impl). But the appearance is similar (two artifacts both touching same territory).
- Multi-step waves (4-8 commits per dispatch) inflate the cherry-pick surface.

**Possible workflow evolutions for next session to consider:**

| Pattern | Pros | Cons |
|---|---|---|
| Current (worktree + cherry-pick) | Safe; review gate; parallel-safe | Cherry-pick churn; progress.md conflicts |
| Trusted dispatches commit to main directly (no cherry-pick) | Fast; matches Bryan's recall | Lose review gate; risk of agent landing wrong work; concurrency-safety needs new mechanism |
| Drop-zone pattern (agent writes to throw-away dir; PA `cp` final state) | Simple; matches Bryan's recall | Lose branch backup if agent crashes; need explicit final-state contract |
| Hybrid: trusted = direct commit; novel = worktree-cherry-pick | Best of both | Requires PA to classify each dispatch |

**S66 narrowing reversal + B4 cycle-detection brief ARE evidence that the review gate has caught real errors.** Direct-commit would have shipped both. So the safety isn't ceremonial.

**My recommendation:** keep worktree+cherry-pick for novel/risky dispatches; introduce a "fast-forward dispatch" mode for surgical follow-ups where agent commits to a branch that PA fast-forwards (not cherry-picks). Reduces churn without losing the review gate.

**This is a methodology evolution worth Bryan's deliberation S67. Not actionable yet.**

---

## Open questions to surface immediately at S67 open

1. **Workflow concern resolution.** Above. PA recommends a small-deliberation lock at S67 open.
2. **B7 dispatch readiness** — full Rule-4 audit on file (`docs/audits/a1b-b7-rule4-audit-2026-05-07.md`); brief should include transitive-fn-call requirement + canonical name `E-DERIVED-CIRCULAR-DEP`. Estimate 5-7h or 8-12h depending on §31 machinery extensibility.
3. **B8 dispatch readiness** — Rule-4 audit on file (`docs/audits/a1b-b8-rule4-audit-2026-05-07.md`); recommends scope to E-DERIVED-VALUE-MUTATE only (3-4h); fold E-SYNTHESIZED-WRITE into B11 (synth-cell registry source).
4. **`docs:build` execution decision.** Master's change-2 added the build script but PA did NOT run `bun run docs:build` (Rule 1: no marketing PA-volunteered work; master's "your call when to run"). Bryan: run when ready, or it stays unrun.
5. **Articles canonical_url/Tier-A site refresh next steps.** Master will continue per-change messages (change 3 = canonical_url frontmatter; change 4 = index.html refresh). PA continues validate-and-commit.

---

## Things S67 PA must NOT screw up

S65/S64 standing list 1-68 carries forward verbatim. New S66 additions:

69. **Spec is normative; derived planning docs are NOT.** pa.md Rule 4 + 2 cited precedents (S66 narrowing reversal, B4 cycle-detection brief). Verify every spec-derivative claim against `compiler/SPEC.md` BEFORE encoding into a brief. SCOPE-AND-DECOMPOSITION docs DRIFT.

70. **No marketing/article/tweet PA-volunteered work** while v0.2.0 is in flight. Article truthfulness audits, X-snippet selection, dev.to drafts, kickstarter copy edits — silent off-list unless Bryan raises.

71. **scrml is not a toy.** No "ship smaller surface" / "corpus shows zero" / "users won't notice" reasoning. The bar is structural correctness for full-production fidelity.

72. **Right answer beats easy answer 99.999%.** When PA sees an easy path diverge from the right path, propose the right path and surface the easy path as a veto-check only. Do NOT silently default to easy.

73. **Self-host DEFERRED to post-v1.0.0.** Entire self-host compiler (every module, not just bootstrap) is human-authored; processed through scrmlTS. v0.2.0 plan no longer includes B4-self-host. ~40-80h removed.

74. **Bare-dot variants `.Variant` are parseable everywhere** (S66 parser fix `cb167b1`). `@phase == .Idle` works structurally. Anywhere a primary expression is expected, `.Variant` is a parseable form. No more "drop because corpus shows zero" reasoning on this surface.

75. **Promotion ergonomics Tier B SHIPPED on full predicate matrix** (`is` AND `==`, mixed). I-MATCH-PROMOTABLE + `bun scrml promote --match` live. `--engine` Tier-C-deferred per `docs/changes/promotion-ergonomics/TIER-C-SCOPE.md`.

76. **A1b B4 SHIPPED** — `importBindings` per-scope registry; E-STATE-PINNED-FORWARD-REF source-position rule (NOT cycle detection); E-IMPORT-PINNED-INVALID best-effort fire on `function`/`fn`/`type`/`channel` imports (const/let deferred to B14 with explicit known-limit comment).

77. **A1b B6 SHIPPED** — render-by-tag classifier (PASS 5 in `symbol-table.ts`). Fires E-CELL-NO-RENDER-SPEC + E-CELL-RENDER-SPEC-NOT-BINDABLE. Compound-parent self-tag fires E-CELL-NO-RENDER-SPEC (Phase 0 disposition). PascalCase `<MyComp/>` deferred to B14/M18/M20.

78. **Master-driven docs work in flight.** scrml.dev site refresh per master PA. Change-1 + change-2 committed. PA's role: validate + commit + push. Do NOT volunteer beyond that. `bun run docs:build` not yet run.

79. **First-time rule-4 audit cost ~30min/dispatch saves ~2-4h+ rework.** Two S66 audits already paid for themselves (validator catalog drift + cycle-detection brief error). PA should run Rule-4 audit before EACH new dispatch wave per pa.md operational rule.

80. **B6 dispatch concurrency-confusion lesson.** PA accidentally ran `git cherry-pick` from inside the worktree directory (CWD slipped); cherry-picks landed on the worktree branch, not main. Recovery: `cd` back to main checkout, abort, re-cherry-pick from main. Future PA: verify `pwd` and `git branch --show-current` before cherry-pick.

81. **Killed-agent reuse pattern.** When PA accidentally TaskStops an agent (S66 B6 first dispatch), the survey commit IS salvageable via cherry-pick. Re-dispatch with Phase 0 baked-in skips re-survey. ~3-5h saved vs full restart.

---

## State as of S66 close

| Field | Value |
|---|---|
| scrmlTS HEAD | `26ebfc9` (after master change-2) — push pending |
| scrmlTS origin sync | 38 commits ahead of origin/main — push pending (Bryan-authorized) |
| scrml-support HEAD | `c8104fa` — modified user-voice not yet committed |
| scrml-support origin sync | 0/0 vs origin/main (last commit landed S65) |
| Working tree (scrmlTS) | clean except: `M hand-off.md` (this file), `?? handOffs/hand-off-65.md` (rotation pending), `?? handOffs/incoming/read/2026-05-07-*.md` (3 master messages moved-to-read) |
| Working tree (scrml-support) | `M user-voice-scrmlTS.md` (3 S66 entries appended; not yet committed) |
| Inbox | empty (3 master messages processed → `read/`) |
| Active agents | 45 |
| Tests | **9,090 / 44 / 1 / 0** (full suite) / **8,366 pre-commit** |
| Depth-of-survey-discount counter | **9** (B4 was 4-2h actual vs 6-9h estimate; not formally counted but pattern continues) |
| L-locks count | **L1–L22** (unchanged from S65) |
| Design-insights | 30+ entries; 0 new in S66 (audit/methodology emphasis, not debate-derived) |

### File-modification inventory (S66 — for cherry-pick / forensic review)

**scrmlTS commits:** 38 since `7334fb0` (see Commit roster above).

**scrml-support modifications (uncommitted at scrmlTS wrap):**
- `user-voice-scrmlTS.md` — 3 entries appended: (1) S66 three new rules (no marketing / not-a-toy / right-answer); (2) Self-host deferred + clarification; (3) Rule 4 added.

---

## Cross-references

- **S65 close ledger (rotated):** `handOffs/hand-off-65.md`
- **PA scrml expert primer:** `docs/PA-SCRML-PRIMER.md` (last touch §13.7 B6 row)
- **PA directives:** `pa.md` (Design Discipline section §1-4 + when-in-doubt + cited precedents)
- **Master-list dashboard:** `master-list.md` §0
- **B4 audit:** `docs/audits/a1b-b4-rule4-audit-2026-05-07.md` (deferred — never written; B4 dispatched without explicit audit doc since predecessor agent ran the audit inside its Phase 0 STOP report)
- **B7 audit:** `docs/audits/a1b-b7-rule4-audit-2026-05-07.md`
- **B8 audit:** `docs/audits/a1b-b8-rule4-audit-2026-05-07.md`
- **A1c roadmap audit:** `docs/audits/a1c-roadmap-rule4-audit-2026-05-07.md`
- **Tier C SCOPE:** `docs/changes/promotion-ergonomics/TIER-C-SCOPE.md`
- **B6 SURVEY:** `docs/changes/phase-a1b-step-b6-render-by-tag/SURVEY.md`
- **User-voice S66 entries:** `../scrml-support/user-voice-scrmlTS.md` (uncommitted)

---

## Tags

#session-66 #close #b4-shipped #b6-shipped #pa-rules-1234 #spec-is-normative #s66-narrowing-reversal #parser-bare-dot-fix #self-host-deferred-to-v1 #tier-b-shipped-full-matrix #tier-c-scoped #a1c-rule4-audit #b7-b8-rule4-audited #master-driven-docs-site-refresh #workflow-concern-surfaced #38-commits #wrap-and-push-authorized
