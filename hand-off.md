# scrml — Session 230 (OPEN)

**Date:** 2026-06-28. **Profile:** A — FULL (booted via `/boot`). Fresh session — content filled during the session + at wrap. Prior close (S229, full narrative) archived at `handOffs/hand-off-232.md`.

## 🚨 NEXT-START / board @ boot
Board (digest @ boot): **HIGH 0 · MED 6 · LOW 9 · Nom 7 · v0.7.1.** Suite green @ S229 close (25734/0/211). Repo clean, 0/0 with origin. Delta-log at [209]. Commit gate healthy (`.git/hooks`, config B).

## Inherited live threads (from S229 — awaiting user)
1. **`dpa-017` BANKED for the dPA drain** — `g-sql-row-protect-leak` security-contract debate (**A** static-prove-and-error vs **B** structural-redaction-floor; soundness-floor adjudication). 3 experts PRE-STAGED in `flogence/.claude/agents/` (information-flow-security · type-systems-refinement · secure-boundary-redaction). To run: boot a dPA rooted in `/home/bryan-maclee/scrmlMaster/flogence` → `read dpa.md and boot` → drains → artifact + design-insight CANDIDATE → PA+user ratify the §14.8.7 amendment + build decomp.
2. **v0.8 framing decision (OPEN).** Native-parser-swap peg is STALE (Road-B froze the native parser S222). S229 SSR survey established `g-tier1-ssr-prerender` is a sub-arc of the server-render-time / dynamic-deployment-target arc (§58 Nominal · §40.9.5 · GITI-027B Option-D). Decide what v0.8 *is*; the 3 SSR rulings (deployment-target model · Option-A-DOM-prerender-vs-B-state-inline · auth/protect-during-SSR) are its step-0. SCOPE: `docs/changes/g-tier1-ssr-prerender-2026-06-28/SCOPE.md`.

## Open follow-ons (filed, non-blocking)
- `g-markup-session-read` deferreds: a no-auth-`@session` diagnostic + the missing GET `/_scrml/session` route (`session.current` hydrates null today).
- `import-resolution.test.js` hygiene: test transiently deletes its own committed fixtures mid-run; make it use a temp dir (~LOW).
- README anchor `#metaprogramming-` — eyeball the rendered GitHub page.

## Boot anomalies surfaced (S230)
- **scrml-support `M user-voice-scrml.md` uncommitted** at boot (S229 user-voice append not committed at the S229 wrap) + 3 untracked sibling inbox messages. Cross-machine-sync-hygiene surface — surface/commit when next touching scrml-support.
- **Hand-off rotation numbering desync** — rotated-file index is a monotonic counter ~+3 ahead of the session number (`hand-off-229.md` = Session 226). This S229 close archived to `hand-off-232.md`. Cosmetic; not fixed (renumbering history is risky).

## pa.md directives in force
R1–R5 · `---` delimiter · Profile A · S228 flobase-routing · S219 PRIMARY-GOAL + flogence digest-boot · S227 dock · S226 landing-concurrency + inversion-op · S215 adversarial-verify · S138 R26 + reverse-direction · S147 coherence · S94 bump-on-tag · S136 BRIEF archival · S88/S99/S126 path-discipline · gate-cleanup-on-landing-success · wrap 8-step.

## Tags
#session-230 #open #boot-profile-a #board-HIGH-0 #v0.7.1 #dpa-017-banked #v0.8-framing-open
