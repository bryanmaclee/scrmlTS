# scrmlTS — Session 146 (CLOSE)

**Date:** 2026-05-30
**Previous:** `handOffs/hand-off-149.md` (S145 CLOSE).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-150.md` at S147 OPEN.

---

**🏁 S146 CLOSE (wrap + push).** Two arcs + a session-start map refresh; no version cut.
1. **GITI-027B per-role SSR content-stripping — RATIFIED A+D** (deep-dive → SPEC §40.9.5 amendment → giti unblocked + pushed).
2. **scrml.dev-in-scrml currency revisit** — the deferred "modern site built in scrml" (dormant since ~S111). 7 commits, ~40 surgical fixes, green on v0.7.0, Playwright-e2e-verified, **user visually approved**.

## State as of CLOSE
- **HEAD scrmlTS:** the S146 wrap commit (this commit) — pushed origin **0/0**. Session commits: `46229a39` maps · `4541d8a0` 027B SPEC §40.9.5 · website 7: `3ab19bd5` `6978f094` `27e590b7` `142f75f1` `6acd345e` `13f34f8b` `d460a2c0` · + this wrap commit.
- **scrml-support:** 027B deep-dive `54583dfa` + OQ-A4-E fix `987aa72` + user-voice S146 + design-insight 35 `8dc9ee5` — committed + PUSHED **0/0**.
- **Cross-machine:** scrmlTS + scrml-support both **0/0** with origin.
- **Tests:** full suite green (pre-push gate passed end-to-end; NO `--no-verify`). Website is docs-only — no test-count delta (~22,303 pass / 223 skip carried from S145).
- **known-gaps §0:** HIGH 0 · MED 14 · LOW 15 · Nominal **9** (+§40.9.5 D-runtime).
- **Worktrees:** NONE created this session — both the 027B deep-dive and the 3 website audit agents were non-worktree research dispatches; all website fixes were PA-direct. `git worktree list` = main only.
- **Inbox:** empty. **Outbox sent:** giti (027B-disposition reply + A recipe) · master (S146 push-coordination — flags giti's uncommitted inbox reply for cross-machine sync).
- **Dev server:** stopped (was serving the website at `:3000` for user visual review).

## 🔬 S146 EXECUTION LOG

### Session start
project-mapper cold-start (watermark `9ab7aa38` S142 → `948d3f2f` v0.7.0; 38 commits / ~37 src files stale; commit `46229a39`). non-compliance.report flagged **12 deref-to-scrml-support candidates** (stale v0next planning/audit docs — carry-forward). Git/inbox/hooks clean at OPEN.

### Arc 1 — GITI-027B per-role SSR content-stripping (RATIFIED A+D)
Scope-locked against SPEC: §40.9.5 already normative that `<auth role>` is a JS-mount/code-split gate NOT content-secrecy, with per-role HTML stripping a *consciously deferred* design question → 027B = lift-the-deferral, not a bug (027A's warning stands). `scrml-deep-dive` ran (`giti-027b-per-role-ssr-content-stripping-2026-05-30.md`; PA corrected an OQ-A4-E option (b)/(c) slip in its matrix). Deep-dive recommended a 3-way debate; **user ratified directly (verbatim: "ratify A now, ratify D now but as an arc that can be started as immediately as is high leverage"):**
- **A** (server-side omission) — canonical-now + target-agnostic. **PA recipe-verified**: giti's `owner-only-marker-12345` secret emits to `.server.js` ONLY (0 in html/client.js), exit-0.
- **D** (server-render-time role-gating runtime) — ratified strategic direction, **high-leverage-gated arc**, spec-ahead-of-impl (Nominal). §58 build-target is the A/D bridge.
- **B** (per-role static HTML, = OQ-A4-E (b) S91-rejected) — rejected. **C** (runtime DOM-prune) — killed (security theater).
- Landed: SPEC §40.9.5 amendment (`4541d8a0`) + user-voice S146 + design-insight 35 + deep-dive DISPOSITION banner (scrml-support). **giti reply sent** (A recipe unblocks them). Pushed.

### Arc 2 — scrml.dev-in-scrml currency revisit (sequence 1→3→2, user-chosen)
- **Phase 1 fix-to-green:** 8 bare-`/` `E-SYNTAX-050` (standalone `/` separators in prose → `&#47;`) → exit-0 / 98 pages (`3ab19bd5`).
- **Phase 3 currency (6 commits):** auth.scrml **security-footgun reframe** + new W-AUTH-CONTENT-NOT-GATED page (`6978f094`); **5 leaked agent-only scratch-work blocks** removed — rendered `/home/bryan/...` paths + private audit tables; marker-audit found 4, PA caught a 5th in server-boundary-disappears (`27e590b7`+`142f75f1`); §11→§52 citations + status reframes + 2 UNBUILT primitives (`invalidate()`, `scrml migrate` DB-apply) (`142f75f1`); v0.3 channel+schema placement reversals + sql `runs:/returns:`→brace bodies (`6acd345e`); **version policy** site-wide stamp → v0.7.0 + 15 chips dropped (`13f34f8b`); reference-medium (lift post-S132 / engine `@light` casing / match lint severity / validators ×3 / req schema / onIdle broken self-write example / reference/index bogus `derived` keyword) + **SPEC-INDEX §38** stale channel row (`d460a2c0`).
- **Phase 2 visit-verify:** Playwright e2e **203 passed (chromium + firefox)** — HTTP 200 + shell composition + no console errors + link-integrity all pages. webkit env-blocked (missing `libwoff2dec.so.1.0.2`, not a site defect). User visually approved at `localhost:3000` before push.
- 3 read-only audit agents (articles / reference / learn+landing) produced the findings; error-pages scanned PA-direct (clean). All fixes PA-direct.

## Open questions / S147 priorities (CARRY-FORWARD)
1. **D-runtime arc (027B)** — server-render-time role-gating runtime; start WHEN HIGH-LEVERAGE; Nominal/spec-ahead; deep-dive is the design substrate.
2. **Website deferred-cosmetic** (user deferred): 12 availability-table "Since" columns (still show v0.3.0/S57 internal refs) + bare-prose engine/match/onTimeout state-child bodies → quoted `"..."` display-text literals. + **E-DG-002-on-block-match LOW confirm** (block-form `<match on=@cell>` doesn't register `@cell` as a DG consumer → spurious E-DG-002; observed in recipe-verify).
3. **12 non-compliance deref-to-scrml-support candidates** (from the S146 map refresh; see `.claude/maps/non-compliance.report.md`).
4. **Carried from S145:** match `:>`-canonical impl arc (lint + AST migrate + SPEC §18/§19/§34 + docs) · `:`-shorthand robustness fix (NEW MED) · §51.0.H-C1 impl arc · tier-rung re-deep-dive · R28-1c/1d MED needs-confirm · R28-8 (bare-variant into object-literal) · within-node allowlist staleness · native parser brace-less-`continue`/`break` label fix + M2.4/MK2 · fresh gauntlet R29 (vs v0.7.0+).

## pa.md directives in force
- **S136** BRIEF.md archival (N/A — no worktree dispatches) · **S138** R26 bidirectional · **S139** `full wrap` (not active).
- **NEW memory (S146):** `feedback_show_visual_work_before_push` — serve website/UI in a browser for the user to SEE before pushing (same shape as VERIFIED.md human-verification). Triggered when user interrupted the push to view the site.
- **CANDIDATE PENDING (carried S142→S146):** branch-leak coherence addendum (verify `git rev-list origin/main..HEAD` + branch-tip-vs-FINAL_SHA on every landing) — surface for ratification.
- Standing: `--no-verify` prohibition (extends pre-push) · S126 Bash-edit + no-`cd`-into-main · S99 path-discipline (counter 20; no worktree dispatches this session) · S88 explicit `isolation:worktree` · S90 CWD gate · S83 commit-discipline + verify-git-state · S94 bump-on-tag.
- Rules: R1 no-marketing (website was user-raised — Rule 1 satisfied) · R2 not-a-toy · R3 right-beats-easy · R4 SPEC-normative · R5 shoot-straight.

## Tags
#session-146 #CLOSE #giti-027b-ratified-A+D #insight-35 #spec-40.9.5 #scrml-dev-currency-revisit #auth-footgun-reframe #leaked-trail-removal #version-policy-v0.7.0 #spec-index-§38 #e2e-203-pass #deferred-cosmetic #show-visual-before-push
