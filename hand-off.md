# scrmlTS — Session 117 (OPEN)

**Date:** 2026-05-21
**Previous:** `handOffs/hand-off-119.md` (S116 CARRYOVER — rotated at S117 OPEN)
**Machine:** single-machine (S100 directive holds)
**HEAD at S117 OPEN:** `67a17dc5` (S116 carryover commit)

---

## S117 session-start state

Session-start checklist run: pa.md + PRIMER + SPEC-INDEX + master-list §0 + S116 hand-off + user-voice S114/S115 (S116 produced no user-voice append) all read. Sync hygiene: both repos checked.

**Sync state at S117 OPEN:**
- **scrmlTS:** 1 commit ahead of origin (`67a17dc5` — the S116 carryover commit). UNPUSHED. Single-machine so non-blocking — surfaced for push authorization.
- **scrml-support:** 2 commits ahead of origin (`3a4889a` deep-dives + `3282c9c` debate record — S116 landings). UNPUSHED.
- Working trees clean both repos.
- Hook config: B (pre-commit + post-commit + pre-push installed at `.git/hooks/`).
- Inbox `handOffs/incoming/`: empty.

---

## Carry-forwards from S116 (open at S117 OPEN)

1. **M5-swap brief — user review pending.** `docs/changes/m5-v0.5-compressed-ladder/BRIEF-M5-SWAP.md` drafted S116, NOT dispatched. The v0.6 milestone (re-entered M5 = the `--parser=scrml-native` pipeline swap). 4 phases, agent `scrml-js-codegen-engineer`, worktree. Open item: Phase-1-split question (§34 reconciliation could be a parallel `general-purpose` SPEC-text dispatch). Maps refresh required before dispatch (watermark `092fa90a`, HEAD ~21 commits ahead). Brief has `<PA-FILLS-SHA>`/`<PA-FILLS-DATE>`/`<PA-FILLS-ABSOLUTE-WORKTREE-PATH>` placeholders.

2. **Build-story artifact A-vs-B — RATIFIED S117 → Approach B** (content-addressed Merkle closure). PA recommended B, user ratified via AskUserQuestion. Recorded: `~/.claude/design-insights.md` build-story entry (PA/user-ratification block); `debate-build-story-artifact-2026-05-21.md` §"Open decision — RESOLVED"; `compiler-story-living-compiler-2026-05-21.md` Q1 + headline-shape. **Two conditions ride with B:** the expanded `build-story.lock` sidecar is mandatory (S43 anti-image guard); the closure encoding must be normatively specified canonical/bit-stable (new `§N Build Story` SPEC section = DD Q2). **Live follow-ons now:** DD Q2 (normative closure-encoding section) + Q5 (concrete file format) — both unscheduled. The README build-story synthesis paragraph (carry-forward #4) is now landable post-ratification.

3. **§29 debate panel — undefined.** Vanilla-interop retire-vs-implement. Needs who-argues-what decision before it can run.

4. **README synthesis paragraphs HELD till post-debate.** Build-story + code-import one-paragraph syntheses live in the 2 DDs, NOT the README. Build-story debate now run — its paragraph closer to landable once A-vs-B ratified. Apply S115 nominal/asterisk convention on landing.

5. **`.scrml`-correctness gate is an M6 precondition.** F1/F7/F8 each shipped a malformed `.scrml` predicate (`is not not` is not scrml — presence is `is some`). Native-parser `.scrml` tier not test-run. Memory `feedback_native_parser_scrml_predicate_drift.md`.

6. **Living Compiler retraction** — draft committed (`docs/articles/living-compiler-retraction-devto-2026-05-21.md`); pending Bryan's stamp + publish (user action).

7. **scrml.dev article canonicalization** — port surviving dev.to articles to canonical `.scrml` pages. Not started.

8. **ADR + gauntlet-report follow-on sweep** — S115 currency sweep flagged same write-once risk; not audited.

9. **Ext 3 + Ext 2 briefs** — rest of the full-body-split family; not authored. (Ext 1 COMPLETE end-to-end S115.)

10. **Pre-existing (S114):** generator (`yield`/`function*`) policy; tableFor v1.next impl; PRIMER match-block section; MK4 lazy-require ESM cycle.

11. **Vendoring debate** — experts (`nix-expert`/`roc-expert`/`go-module-vendoring-expert`) staged S116 into `~/.claude/agents/`; load this session. Panel per code-import DD: `security-expert` + `nix-expert` + `go-module-vendoring-expert` vs `roc-expert` synthesis. `/registry update` if the index matters.

12. **claude.md restructure** — S116 PA recommended against (CLAUDE.md injected per-turn, not read-once). Logged in case user revisits.

## Push state — PENDING (surface at S117 OPEN)

- scrmlTS: `67a17dc5` unpushed. scrml-support: 2 commits unpushed.
- Single-machine — non-blocking; awaiting user push authorization.

## State-as-of-open

| Item | Status |
|---|---|
| HEAD | `67a17dc5` (S116 carryover) |
| Tests | 18,102 pass / 0 fail / 169 skip / 1 todo / 738 files (S115 CLOSE — not re-run S116; no compiler source touched) |
| Worktrees | main only |
| scrmlTS origin sync | 1 commit ahead — unpushed |
| scrml-support origin sync | 2 commits ahead — unpushed |
| Inbox | empty |
| Hook gate | Configuration B |
| pkg.json version | 0.4.0 (v0.4.0 tag stands — S114) |
| `.claude/maps/` | watermark `092fa90a`; ~21 commits behind — refresh before any dev dispatch |
| Background agents | none |

---

## Tags
#session-117 #OPEN #m5-swap-brief-review-pending #build-story-A-vs-B-open
#push-pending #vendoring-experts-loaded
