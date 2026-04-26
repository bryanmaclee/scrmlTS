# scrmlTS — Session 42

**Date opened:** 2026-04-25
**Previous:** `handOffs/hand-off-42.md` (S41 closed)
**Baseline entering S42:** **7,852 pass / 40 skip / 0 fail / 372 files** at `b1ce432`. 4 commits ahead of `origin/main` (the four S41-end docs commits: `c9e1800`, `ecd59b6`, `f3c2061`, `b1ce432`).

---

## 0. Session-start state

- Repo clean at `b1ce432`. Working tree clean.
- Inbox: empty of new messages. The `dist/` pollution carried from S40 still sits in `handOffs/incoming/dist/` pending user disposition (Bug I sidecar artifacts + scrml-runtime.js).
- User-voice debt: **S41 has no entries in `scrml-support/user-voice.md`.** Last entry is S40 (scrmlTS). At minimum the two pivotal S41 user statements (the kickstarter-must-be-right warning and the Scope C authorization) should be appended retroactively if the user wants. Flagging only — not silently writing.

## 1. Open question to surface immediately

Per S41 close (§5 "Open question"): **push the 4 S41 docs commits to origin?** Currently 4 commits ahead. PA has not pushed; awaits explicit authorization.

## 2. Next priority — Scope C docs audit, Stage 1

S41 set up Scope C (full docs audit, multi-session) as the prerequisite for kickstarter v1. Stage 1 is inventory:

- 1.1 Compile every example (baseline at S41 close: 13/14 clean — only example 05 fails on known E-COMPONENT-020)
- 1.2 Compile every sample (baseline: 275 total / 27 clean / 24 failing / 224 warning-only)
- 1.3 Classify the 24 failing samples (intentional negative tests vs stale)
- 1.4 Classify the 224 warning-only samples (testing-of-warnings vs stale-shape vs systemic)
- 1.5 Update `master-list.md` numbers (currently says 297 samples; actual is 275)

Per S41 close §5, confirm with user the Stage 1→2→3→4→5→6→7→8 ordering before starting.

## 3. Standing rules in force (carried)

- Every dev dispatch that writes scrml MUST include **`docs/articles/llm-kickstarter-v1-2026-04-25.md`** AND `scrml-support/docs/gauntlets/BRIEFING-ANTI-PATTERNS.md` in the briefing. v1 (S42) supersedes v0 — v0 had 10 structural errors (real-time recipe, reactive recipe, several anti-pattern rows, `protect=` separator, `<request>` attrs, `signJwt` arity, etc.). v1 is fully verified against current spec + has corresponding compile-tested examples 15-22 to point at. pa.md updated S42 to point at v1.
- Bug L is reverted; main is at the post-revert + S41-fixes baseline. Re-attempt requires widened scope (string + regex + template + comment in one pass).
- Commits to `main` only after explicit user authorization in this session. Push only after explicit authorization. Authorization stands for the scope specified, not beyond.
- All agents on Opus 4.6 (`model: "opus"`).
- Background dev dispatches use `isolation: "worktree"` and follow the incremental-commit + progress-report rule.

## 4. Carried queue (not Scope C, but live)

- Bug L re-attempt (widened scope; depends on string/regex/template/comment unification)
- Self-host parity (couples to Bug L)
- example 05 forward-ref `InfoStep` (E-COMPONENT-020, pre-existing across S39/S40/S41)
- Auth-middleware CSRF mint-on-403 (session-based path, deferred)
- Phase 0 `^{}` audit continuation (4 items)
- `scrml vendor add <url>` CLI (called out in npm-myth article as a real adoption gap)
- Bun.SQL Phase 2.5 — async PA + real Postgres introspection at compile time
- LSP follow-up: `endLine`/`endCol` Span detached as standalone follow-up
- Strategic / non-coding: Problem B (discoverability/SEO/naming) — separate from kickstarter
- Cross-repo: 6nz playground-four cosmetic reverts (not scrmlTS-side work, visibility flag)
- `dist/` build pollution under `handOffs/incoming/dist/` — pending disposition (carried from S40)

## 5. What this PA must believe (carried from S41 close §5)

1. Examples and docs are likely stale. Don't trust them as canonical without spec cross-reference.
2. PA's memory is unreliable. The S41 async/await reveal proved this. Verify before stating.
3. The kickstarter is normative content. Wrong content propagates. Verify before patching.
4. The LLM adoption funnel is the strategic priority (S41 produced the highest-leverage finding to date — kickstarter ⇒ ~17-23× compile-probability lift).
5. Two problems, not one. Kickstarter solves Problem A (build path). Problem B (discoverability/SEO/naming) is upstream and unaddressed.

## 6. What this PA must NOT do (carried from S41 close §5)

- DO NOT patch kickstarter v0 → v1 without first running Scope C inventory (Stage 1)
- DO NOT trust validation agent reports as ground truth (the async/await false positive proves this)
- DO NOT add `await` to the auth recipe (the specific trap)
- DO NOT re-attempt Bug L without scoping in regex + template + comment handling
- DO NOT consider examples directory as ground truth until each file is verified against current spec

## 7. Pinned discussions

- **`docs/pinned-discussions/w-program-001-warning-scope.md`** — W-PROGRAM-001 fires on 224/229 warn-only samples (98%). User chose option 1 (path-based suppression in `samples/compilation-tests/`) as **working disposition for downstream audit reasoning**. NOT compiler-change-authorized. Pinned for deeper conversation later. Live questions there.

## 7.1 Findings tracker

**`docs/audits/scope-c-findings-tracker.md`** — single source of truth for everything Scope C surfaced as a real issue (compiler bugs, spec gaps, scaffold-only features, documentation drift, corpus debt). Stable IDs (A1-A5, B1-B3, C1-C3, D1-D10, E1-E2, F1-F3) for cross-reference. Update when something becomes an intake / lands a fix. **Read this first** when picking up Scope C work — it's the live state of "what we know is broken."

## 8. Session log

- 2026-04-25 — S42 opened. Read pa.md, hand-off.md (S41 close). Rotated S41-closed file to `handOffs/hand-off-42.md`. Inbox empty of new messages (`dist/` pollution still pending). Surfaced open question (push S41 commits) and Scope C Stage 1 ordering for user confirmation.
- 2026-04-25 — Created `scrml-support/user-voice-scrmlTS.md` (was missing — pa.md pointed at it but file didn't exist). Seeded with two retroactive S41 strategic statements (kickstarter-must-be-right + Scope C authorization).
- 2026-04-25 — Scope C Stage 1 executed. Master-list count fixed (1.5). 14 examples read + compiled — 9 clean+canonical, 2 warn (compiler issues), 1 fail (ex 05 forward-ref), 2 stale-shape header drift. Background sample-classification agent ran 275 samples → 22/229/24 clean/warn/fail. Spec coverage matrix built — 23 covered, 14 weak, 17 gaps (8 critical for kickstarter v1). Three compiler intakes surfaced (W-LINT-013 misfire, W-LINT-007 comment-scan, ex05 E-COMPONENT-020). Outputs at `docs/audits/scope-c-stage-1-2026-04-25.md` + `docs/audits/scope-c-stage-1-sample-classification.md`.
- 2026-04-25 — User: "1 for now. I want to pin this issue for further discussion later" — re W-PROGRAM-001 disposition. Pinned at `docs/pinned-discussions/w-program-001-warning-scope.md`. User-voice updated.
- 2026-04-25 — User authorized "go" to Stage 2 (kickstarter v0 spec cross-reference matrix). Done. 22 confirmed correct, 10 confirmed wrong (3 CRITICAL + 5 HIGH + 2 LOW), 0 unverified after follow-up resolution. Output at `docs/audits/kickstarter-v0-verification-matrix.md`.
- 2026-04-25 — User authorized resolution of all 8 unverified claims before Stage 3. Done. 4 confirmed correct (auth=, scrml: imports, mint-on-403, CLI), 4 confirmed wrong (.debounced syntax, prop:Type form, protect= separator, @debouncedX phrasing).
- 2026-04-25 — Stage 3 executed. 5 polish refreshes (04, 06, 12, 13, 14) + 4 structural rewrites (05, 07, 08, 12). Ex 05 forward-ref fixed via if-chain. 8 new examples for critical gaps (15 channel, 16 remote-data, 17 schema, 18 state-authority, 19 lin, 20 middleware, 21 navigation, 22-multifile/). 22/22 example files compile. README + master-list updated.
- 2026-04-25 — Findings tracker landed at `docs/audits/scope-c-findings-tracker.md` consolidating 20 bugs/anomalies (5 compiler bugs, 3 spec gaps, 3 scaffold features, 10 doc-drift, 2 corpus debt, 3 process notes). Stable IDs A1-A5/B1-B3/C1-C3/D1-D10/E1-E2/F1-F3.
- 2026-04-25 — Stage 6 executed: kickstarter v1 written from verified ground truth at `docs/articles/llm-kickstarter-v1-2026-04-25.md`. All 10 v0 errors corrected. Auto-await rule promoted to §2 (anchor against JS muscle memory). 8 recipes (auth, real-time, reactive, loading, schema, multi-page, middleware, lin) each cite a working example file. pa.md updated to point at v1.

---

## Tags
#session-42 #active #scope-c-audit #docs-audit-stage-1 #kickstarter-v0-bugs-known #push-pending

## Links
- [handOffs/hand-off-42.md](./handOffs/hand-off-42.md) — S41 closed, comprehensive Scope C plan
- [pa.md](./pa.md)
- [master-list.md](./master-list.md)
- [docs/articles/llm-kickstarter-v0-2026-04-25.md](./docs/articles/llm-kickstarter-v0-2026-04-25.md) — v0, has known bugs
- [docs/experiments/SYNTHESIS-2026-04-25-clueless-agent-runs.md](./docs/experiments/SYNTHESIS-2026-04-25-clueless-agent-runs.md)
- [docs/experiments/VALIDATION-2026-04-25-kickstarter-v0.md](./docs/experiments/VALIDATION-2026-04-25-kickstarter-v0.md)
