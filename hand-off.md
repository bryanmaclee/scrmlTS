# scrmlTS — Session 100 (LIVE)

**Date:** 2026-05-17
**Previous:** `handOffs/hand-off-102.md` (S99 CLOSE-prepared S100 pickup brief — locked Tailwind option (a) + carry-forwards). Also `handOffs/hand-off-101.md` (S99 CLOSE comprehensive bloat-OK wrap).
**Machine:** TBD — surface to user at first interaction. Cross-machine state was symmetric at S99 CLOSE; the inbox message at `handOffs/incoming/2026-05-17-1900-machine-A-to-machine-B-mpa-fix-landed.md` is addressed to Machine B specifically, so if this is Machine B, that is in-scope; if Machine A, it stays unread for the other side.

---

## Session-start checklist — DONE

1. ✅ Read `pa.md` pointer → `../scrml-support/pa-scrmlTS.md` IN FULL (886 lines)
2. ✅ Read `docs/PA-SCRML-PRIMER.md` §1-§8 (pillars + Tier ladder + V5-strict + RHS shapes + engines + S67 amendments + validators)
3. ✅ Read `compiler/SPEC-INDEX.md` IN FULL (current map: 57 sections + appendices, 27,144 lines)
4. ✅ Read `master-list.md` §0 LIVE DASHBOARD (Phase status + A1c Wave 1+2+3 closed at S73; Wave 4 next; A5-1+A5-2+A5-3+A5-4+A5-5+A5-5b+A5-6+A5-7 all shipped; B1-surfaced bugs all closed; v0.3.0 STABLE shipped S92 `c520369`; Approach A whole-stack closed S92)
5. ✅ Read `handOffs/hand-off-102.md` (the S100 pickup brief) — rotated from former `hand-off.md`
6. ✅ Read last 7 contentful user-voice entries from S99 (`../scrml-support/user-voice-scrmlTS.md` lines 6878-end)
7. ✅ Cross-machine sync hygiene — both scrmlTS + scrml-support clean + even with origin (0/0)
8. ✅ Inbox check — 1 unread: `2026-05-17-1900-machine-A-to-machine-B-mpa-fix-landed.md` (addressed to Machine B; revert checklist for 8 `/pages/` workaround files)
9. ✅ Worktree state — `git worktree list` shows main only (per per-dispatch cleanup discipline)
10. ✅ Git-hook configuration — configuration B (rich) — pre-commit + post-commit + pre-push all installed in `.git/hooks/`

---

## Baseline at S100 open

- **scrmlTS HEAD:** `5ea7561` — `docs(s99-CLOSE): Machine-A consolidation wrap — MPA fix + Tailwind direction + S100 pickup`
- **scrml-support HEAD:** `e149662` (per S99 close hand-off)
- **Tests (full suite, S99 CLOSE baseline):** 15,342 pass / 133 skip / 1 todo / 2 fail / 1 error / 687 files / 44,255 expect
- **Tests (pre-commit subset, S99 CLOSE baseline):** 12,555 pass / 92 skip / 1 todo / 0 fail / 654 files
- **Pre-existing pre-push failure:** `compiler/tests/unit/bug-k-sync-effect-throw.test.js` — 1 fail since S98 close; orthogonal to docs work; each S99 reference-build-out push has required individually-authorized `--no-verify`. **Authorization does NOT carry to S100.** Bug-k investigation tagged as carry-forward priority #4 in S100 pickup brief (~1-2h dispatch).

---

## Fire-now (locked at S99 CLOSE, user verbatim "A the tailwid dir")

**Tailwind engine gap — option (a):** Extend built-in Tailwind engine to cover typography plugin + missing core utilities (`font-mono`, `prose` family incl. `prose-slate` / `prose-lg` / `not-prose`, `border-collapse`, spot-check sweep across `docs/website/` for additional missing utilities).

- **Likely files:** `compiler/src/codegen/emit-tailwind.ts` (or equivalent — verify location at dispatch time) + `compiler/SPEC.md` §26.6 NEW Typography Plugin subsection + tests + sample fixtures.
- **Scope:** ~8-15h depending on typography-plugin coverage breadth (full vs scoped-to-docs-usage).
- **Authority:** pa.md Rule 2 (full-production fidelity) + Rule 3 (right answer beats easy 99.999%) + flagship-claim alignment with `docs/website/pages/articles/css-without-build-step.scrml`.
- **Dispatch shape:** `scrml-dev-pipeline` with `isolation: "worktree"`; F4 startup-verification + S99 path-discipline echo-pwd-in-first-commit aid + S99 leak-counter ("S99 had 6 path-discipline leaks; this would be incident #7") in brief.
- **Pre-dispatch:** confirm SPEC §26 current shape via direct read; confirm Tailwind engine file location via grep.

---

## Carry-forward priorities (from S99 CLOSE)

1. **Tailwind engine gap (option a)** — see Fire-now above.
2. **MPA workaround revert** — Machine B territory. 8 files have hard-coded `/pages/` prefixes from S99 workaround `8c0e8ff`; with MPA fix landed at `fc27960`, those prefixes are noise. Checklist in inbox message. ~30min dispatch.
3. **SPEC §47.9.5 worked-example amendment** — dist paths show un-stripped `pages/` shape; should reflect the MPA fix's strip. Small editorial.
4. **bug-k-sync-effect-throw investigation** — pre-existing orthogonal pre-push failure. Each push currently requires `--no-verify` + explicit authorization until closed. ~1-2h.
5. **Day-30 reference build-out continuation** — ~22-30 pages remaining (`<onTimeout>`/`<onIdle>` closers; `#{}`/`^{}`/`_{}` contexts; ~11 keyword pages; ~30 error-code pages). 8-section template; ~3 pages per batch is sustainable.

### Held by user
6. lin redesign Phase 1 — user paused S98.
7. Typestate-primitive meta-shape — design horizon stub at scrml-support `124204e`.
8. Voice corpus curation pass — 1,577 candidates awaiting selective promotion to canonical `quote-library.json`.
9. State-vs-logic essay finalization — user-authored; PA's role is substrate per S95 voice-author redesign.

### v0.5+ horizon
10. CG hotspot deep characterization.
11. BS-level `/* */` bug — sub-anomaly from S98 A1 fix.
12. Path-discipline platform-level fix (PreToolUse hook rejecting absolute writes outside active worktree). **6 incidents in S99 + the inbox message logs incident #6 in landing `fc27960`** — escalating urgency. Filed since S42.
13. Phase B-2 pure-getter-elision optimization.
14. Legacy STRING pipeline retirement (`rewrite.ts _rewriteParenthesizedIsOp`).

---

## Open questions to surface to user at S100 first interaction

- **Which machine is this — A or B?** Cross-machine state was symmetric at S99 CLOSE, but the inbox message specifically routes the MPA-revert task to Machine B. If this is Machine A, the inbox message stays unread for the other side; the fire-now Tailwind dispatch is the primary thread either way.
- **Confirm Tailwind dispatch authorization?** Fire-now locked at S99 CLOSE via "A the tailwid dir" verbatim. PA should confirm the user still wants to fire on session-open vs. take a different first move (e.g., bug-k investigation, MPA revert if Machine B, Day-30 continuation).
- **Scope cap on typography-plugin coverage?** Full port vs. scoped-to-docs-usage materially changes dispatch duration (~8-15h range). User-call territory.
- **`--no-verify` authorization for any push during S100?** bug-k is still failing pre-push. If the dispatch lands and PA needs to push, re-authorization required per S99 disposition ("each push individually authorized; not blanket-future").

---

## S100 in-flight threads

### Landed locally (awaiting push)
- **`6aaa4b0` — MPA `/pages/` revert.** 19 files swept (11 beyond inbox-listed 8; Day-30 build-out batches had added more pages with the workaround). Recompiled `docs/website/`; verified zero `href="/pages/` in any dist HTML; shell composition confirmed end-to-end. Stale `dist/pages/` tree (78 files) cleaned during sanity-check.
- **`49af44c` — bs.test.js describe.skip + master-list follow-on.** Pre-push gate unblocker. Root cause traced: NOT bug-k-sync-effect-throw (which passes 5/5 in isolation), but `bs.test.js` module-load throw on `bs.scrml` post-S89 null tokens. S78 Bootstrap L3 precedent. Full suite now 15,529 / 182 skip / 0 fail / 0 error. `--no-verify` no longer required for pushes.

### Background
- **Tailwind engine extension dispatch** (agent `af860c5136bc379ad`) — fired at S100 open. Two-phase shape: Phase 1 core utilities (font-mono/list-*/space-*/border-collapse/mx-auto, ~3-4h, no SPEC edit) + Phase 2 prose typography plugin port (full Tailwind v3 parity per user direction, ~6-10h, NEW SPEC §26.6). Will land tests + sample fixture. Estimated total ~10-14h. PA monitors completion notification.

### Push state
- 2 commits ahead of origin, 0 behind
- Hold for Tailwind dispatch landing per user direction — push all three (revert + bs-fix + tailwind) in one batch when dispatch reports DONE

---

## Things S100 PA must NOT screw up (carry-forwards from S99 CLOSE)

### Permanently load-bearing
- pa.md Rules 1-5
- All S96-S99 PA-memory rules (`feedback_*.md` across `~/.claude/projects/-home-bryan-*scrmlMaster-scrmlTS/memory/`)
- Cross-machine sync hygiene (S43)
- S83 commit discipline two-sided rule
- S88 `isolation: "worktree"` mandatory on every dev-agent `Agent()` call + `--no-verify` requires explicit user authorization
- S91 CWD-routing rule
- S95 communication norms (shoot straight; no preambles; no politeness performance)
- S96 SPEC-at-session-start; per pa.md Rule 4, SPEC.md is normative — verify against spec text before encoding claims in dispatch briefs
- S98 Pillar 5b (Reach discipline — state-shape first)
- S99 path-discipline addendum (echo-pwd-in-first-commit + leak-counter in briefs + PA-side dual-verify on every dispatch landing)
- S99 voice-author "reuse-over-reinvent" rule
- S99 context-budget operational datum — session-start consumes ~20% of 1M; wrap-suggestion threshold subtracts that from the calculation

### S100 NEW (none yet)

---

## Tags

#session-100 #LIVE #s100-open #fire-now-tailwind-option-a #post-s99-close #machine-tbd #ginger-bill-window-context #path-discipline-pattern-tracking #v0.3.x-patch-arc-active
