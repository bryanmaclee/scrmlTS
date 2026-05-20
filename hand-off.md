# scrmlTS — Session 109 (OPEN)

**Date:** 2026-05-19
**Previous:** `handOffs/hand-off-111.md` (S108 CLOSE — rotated at S109 OPEN)
**Machine:** single-machine (S100 directive holds)
**HEAD at S109 OPEN:** `df1211d` (S108 wrap)
**Origin sync at OPEN:** scrmlTS 0/0; scrml-support 0/0

---

## Session-start state

- Working tree clean
- `handOffs/incoming/` empty
- `git worktree list` shows main only
- Hook gate: Configuration B (`.git/hooks/` has pre-commit + post-commit + pre-push + .bak files)
- pkg.json version `0.3.3` (unchanged — no release cut planned at OPEN)
- Tests at HEAD (per S108 close ledger; not re-baselined this session yet):
  - pre-commit subset: **13,304 pass / 88 skip / 1 todo / 0 fail / 690 files / 44,794 expect**
  - full `bun test compiler/tests/`: **16,147 pass / 169 skip / 1 todo / 0 fail / 723 files / 47,209 expect**
- **Maps watermark: `6616a69` — HEAD `df1211d` is ~23 commits ahead.** Mandatory refresh BEFORE any dev-agent dispatch this session.
- scrml-support: 1 untracked file (`docs/deep-dives/bug-4-docs-mode-escape-2026-05-19.md` from S108 — not committed; surface to user).

## Session-start checklist completed

- [x] Read `pa.md` pointer → `../scrml-support/pa-scrmlTS.md` IN FULL (886 lines)
- [x] Read `docs/PA-SCRML-PRIMER.md` (§1-§13.6 in full; §13.7-§15 spot-coverage)
- [x] Read `compiler/SPEC-INDEX.md` IN FULL — S108 SPEC changes noted (§4.17 amended Bug 4 cross-ref; §7.4.2 NEW Bug 5 P3; §26.4/§26.5 Tailwind full-fix expansion; §34 +1 row `W-TAILWIND-UNRECOGNIZED-CLASS`; §41.14.7 Codegen subsection for formFor B5)
- [x] Read `master-list.md` §0 LIVE DASHBOARD + §N open work + §M known bugs spot-read
- [x] Read `handOffs/hand-off-111.md` (S108 CLOSE)
- [x] Read last contentful user-voice entries (S100, S102, S103) — no NEW entries since S103
- [x] Hand-off rotated (S108 close → `handOffs/hand-off-111.md`)
- [x] This fresh `hand-off.md` created for S109
- [x] Git fetch + ahead-behind hygiene (both repos 0/0)
- [x] Worktrees + inbox verified clean
- [x] Hook gate verified Configuration B

## Open questions to surface immediately

1. **Next priority pick** — S108 close enumerated several mid-tier carry-forwards. Top candidates (PA recommendation order, subject to user direction):
   - **(a) Maps refresh** (light; ~5-15min PA-direct OR project-mapper agent) — prerequisite for any dev-agent dispatch this session
   - **(b) Bug 2 phantom E-SYNTAX-050 + 4-cascade** (MED-HI dogfood; needs bisecting reducer; ~2-4h) — last remaining HIGH/MED-HI dogfood bug
   - **(c) Bug 1 ring/gradient compound families** (medium; box-shadow stack trick + multi-utility coordination) — still-deferred Tailwind families
   - **(d) tableFor v1.next 6-item batch** (~6-10h aggregate) — sort-state explicit decl + SELECTABLE-CELL-WRONG-TYPE strict-mode + positional column slots + §17.4a for/else codegen + `date`/`timestamp` BUILTIN_TYPE + inline event handler arrow-param
   - **(e) formFor v1.next B2-B4** (~8-15h aggregate) — registerRenderer + `@label` annotation + auto-recurse nested struct
   - **(f) variantNames (next L22 family member)** — smallest primitive; full 4-gate walk first
   - **(g) Match block-form Phase 5 polish** (~6-10h aggregate) — samples + browser test + PRIMER §18 refresh + wildcard explicit render + payload-binding typer scope + bare-variant inference in nested expression positions
   - **(h) Native parser M2 expression parser** (~2-4 sessions per DD §D7)
   - **(i) Self-host bootstrap broken-import** (~2-4h; S102 carry; unaddressed S103-S108)
   - **(j) Build benchmarks refresh** (~30min-1h; 5+ days stale; last 2026-05-14 v0.3.0 STABLE)
2. **scrml-support untracked deep-dive** — `bug-4-docs-mode-escape-2026-05-19.md` exists locally but NOT committed at session start. Verify with user whether this should be committed (it was load-bearing for S108's Bug 4 C-narrow landing). Possibility: was committed in S108 and got lost, OR was the result of an agent-side write that PA never landed. Surface and clarify.

## Things S109 PA must NOT screw up (carry from S108)

- **Maps refresh BEFORE any dev-agent dispatch** — `6616a69` watermark vs HEAD `df1211d` is ~23 commits behind.
- **`?{` recognition is now Logic-context-only** — block-splitter.js comment block at line 1443 names SPEC §3.1 + §8.1 + the deep-dive path explicitly. Preserve the C-narrow gate if touching brace-context recognition.
- **`_scrml_label_for` is messages-chunk-gated** — typeof-guard in emit-form-for.ts is load-bearing for formFor in files without inline-override validators. Don't remove without preferred long-term fix (messages chunk unconditionally activates on formFor expansion) OR runtime-helper moved to always-present chunk.
- **Match block-form Phase 4 v1 limitations documented in module header** — read emit-match.ts module header before any S109 changes.
- **Tailwind ARBITRARY_PREFIX_MAP + VALID_MATH_FUNCTIONS are now the source of truth for FULL fix** — when adding new families update both. `ring-*` family in particular needs compound-multi-property emission (box-shadow stack).
- **Hook gate is Configuration B** — `--no-verify` is the S88 process-violation surface; never bypass without explicit authorization.
- **Bug 4 C-narrow has scope-expansion follow-ons** — 6 OQs surfaced in the deep-dive; Q-BUG4-OPEN-1 (extend gate to `!{`/`^{`/`_{`) + Q-BUG4-OPEN-5 (broad-C bare-`/` extension) are the load-bearing scope expansions. None block C-narrow; all deferred pending friction signal.

## Carry-forwards from S108 (no change since close)

- v1.0+ structural cleanup of browser-test effect-leak pattern (G1 close residue from S105)
- OQ-TF-11 sub-debate (if user contests MEDIUM verdict on row binding `:let` vs implicit `@row`)
- Puppeteer dep cleanup (Q-PW-PORT-OPEN-1 ratified DEFER; awaiting 1-2 release cycles post-S103 Playwright cutover)
- LEGACY `_scrml_subscribers` retirement (v0.4+; Q-RT3-SR-OPEN-3 ratified DEFER post-impl)
- Marketing-shaped (per pa.md Rule 1 — DEFER unless raised): formFor + schemaFor + tableFor combined sample app + scrml.dev refresh; v0.4 announce content; Bug 4 C-narrow + Bug 5 P3 + match block-form full Tier 1 closure narrative

## Tags

#session-109 #OPEN #single-machine #maps-stale #ready-for-direction
