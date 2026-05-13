# Wave 4.A D-track progress

**Worktree:** `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-ad5eed19b2ac280a1`
**Branch:** `worktree-agent-ad5eed19b2ac280a1`
**Base after rebase:** `bdbf810` (was `9b98118` — rebased onto main to access wave-4-adopter-content SCOPING)
**Task:** Articles currency + edit + retract + do-not-publish disposition (D-1..D-4).

## Timeline

- 2026-05-13T(start) — worktree startup verified (bun install, pretest green).
- Rebased onto `bdbf810` to access wave-4-adopter-content SCOPING.md (originally on main, not in agent base).
- Pre-flight reads consumed: SCOPING.md (§4 articles triage), wave-3-7-corpus-ouroboros audit (S89), S57 ARTICLE-TRUTHFULNESS-AUDIT (stale per S89), changelog mentions of W2-3 (5 articles publishable post-S84).
- D-1 landed at commit `39349f7`: 17-article currency table at `docs/audits/articles-currency-table-2026-05-13.md`.
- D-2 NEEDS-EDIT pass: 3 NEEDS-EDIT-BORDERLINE items (kickstarter v1 + v2 login(), mutability-contracts lifecycle) require user disposition; flagged for D-4 surface (not in this dispatch scope per task spec "if >30% rewrite, flag for separate dispatch").
- D-2 minimal-edit landed: 2 broken cross-links in `why-programming-for-the-browser-needs-a-different-kind-of-language-devto-2026-04-27.md` lines 82-83 — pointed to non-existent `*-draft-*` siblings, corrected to current published devto versions.
- D-2 landed at commit `38bbd08`.
- D-3 RETRACT pass:
  - Copied `llm-kickstarter-v0-2026-04-25.md` + `teej_baiting_tweet.md` to `scrml-support/archive/articles-skipped/`.
  - Removed stale duplicate `scrml-support/archive/articles-skipped/scrml-debate-amends-zod-claim-devto-2026-05-06.md` (article was re-instated to scrmlTS post-S66; archived copy was stale).
  - Replaced original paths with redirect stubs.
  - scrml-support commit: `52d5650`.
- D-3 landed at commit `3f09d17`.
- D-4 DO-NOT-PUBLISH pass:
  - kickstarter v1 + v2 stay in place per pa.md line 319 (dispatch dependency); added DO-NOT-PUBLISH-INTERNAL status line to each header.
  - x-snippet-zod-calibration stays in place per S65 ratification flow; added `publishing_posture: DO-NOT-PUBLISH-INTERNAL` to frontmatter.
  - NO moves to `docs/drafts/` — that directory does not exist and would break pa.md dispatch chain if used for kickstarter v1.
- Wave 4.A D-track CLOSED. Final delta: 17 articles classified, 4 file content changes (1 cross-link fix + 2 retract stubs + 3 DO-NOT-PUBLISH banners), 2 files archived to scrml-support.
