# scrmlTS — Session 43 (OPEN)

**Date opened:** 2026-04-26
**Previous:** `handOffs/hand-off-43.md` (S42 closed)
**Baseline entering S43:** **7,906 pass / 40 skip / 0 fail / 378 files** at `4db8d37`. Working tree clean. In sync with `origin/main`.

---

## 0. Pickup mode

S42 hand-off was deliberately bloated per the permanent context-density directive — read `handOffs/hand-off-43.md` in full before starting work. Findings tracker at `docs/audits/scope-c-findings-tracker.md` is the live bug-state source of truth.

---

## 1. Open questions surfaced at S43 start

(Updated through S43 staleness reconciliation arc — see §4 session log.)

1. **scrml-support PUSH pending — needs user authorization before propagating cross-machine.**
   - After S43 reset to origin/main + `user-voice-scrmlTS.md` re-append (now contains S41 retro + S42 + S43 entries, ~16KB+), local scrml-support has 1 untracked file (`user-voice-scrmlTS.md`) ready to commit + push.
   - Master PA inbox message dropped at `~/scrmlMaster/handOffs/incoming/2026-04-26-1230-scrmlTS-to-master-staleness-reconciliation-and-cross-machine-rule.md` describing the arc.
   - **Without push, the file does NOT propagate to the other machine.** User-voice strategy (private + cross-machine synced) requires push.
   - **Decision needed:** authorize push from scrmlTS-PA-machine, OR defer to master PA on the other machine after manual sync.
2. **Dispatch A7 + A8** — both T2 intakes filed at S42 close, same parser family as A3. A7 first per intakes' coordination note (A8 may resolve as side-effect). Worktree dispatches with the F4 startup-verification + path-discipline block.
3. **Inbox arrivals mid-S43 from 6nz** — 4 untracked files at `handOffs/incoming/2026-04-26-1041-*` (1 message + 3 `.scrml` sidecar reproducers): bugs M/N/O from playground-six. Arrived after S43 session-start survey, surfaced post-commit. Need triage / intake / dispatch decision.
4. **`dist/` pollution under `handOffs/incoming/dist/`** — STILL pending disposition, carried S40 → S41 → S42 → S43. Files: `2026-04-22-0940-bugI-name-mangling-bleed.{client.js,html}`, `scrml-runtime.js`. User has not made a decision in 4 sessions.
5. **W-PROGRAM-001 pinned discussion** at `docs/pinned-discussions/w-program-001-warning-scope.md` — user chose option 1 (path-based suppression) as working assumption. NOT compiler-change-authorized. Live questions parked.
6. **examples/VERIFIED.md** has 22 unchecked rows. User may want to verify some before further example work.

---

## 2. Top of queue (S43 candidates)

1. Dispatch A7 — `${@reactive}` BLOCK_REF interpolation in component def. T2, intake `docs/changes/fix-component-def-block-ref-interpolation-in-body/intake.md`. Trace-first per intake.
2. Dispatch A8 — `<select><option>` children in component def. T2, intake at `docs/changes/fix-component-def-select-option-children/intake.md`. May resolve as side-effect of A7.
3. Verify scrml-support's pending writes are committed by scrml-support PA.
4. Stage 7 (Scope C) — re-run validation experiments against kickstarter v1. Target avg compile probability >75%. Empirical proof v1 actually improves over v0.

### Next priority

5. Settings.json PreToolUse hook for F4 — platform-level fix for the agent tool-routing leak.
6. Stage 5 (Scope C) — README, PIPELINE, master-list, `.claude/maps/` audit.
7. Stage 4 (Scope C) — deeper warn-only sample sub-classification.
8. Stage 8 (Scope C) — cross-model validation.

### Carried from S41 + earlier

- Bug L re-attempt (widened scope; depends on string + regex + template + comment unification).
- Self-host parity (couples to Bug L).
- Auth-middleware CSRF mint-on-403 (session-based path) — partially shipped per S42 audit; remaining gap deferred.
- Phase 0 `^{}` audit continuation (4 items).
- `scrml vendor add <url>` CLI — adoption gap.
- Bun.SQL Phase 2.5 — async PA + real Postgres introspection at compile time.
- LSP `endLine`/`endCol` Span detached.
- Strategic: Problem B (discoverability/SEO/naming).
- Cross-repo: 6nz playground-four cosmetic reverts.
- `dist/` pollution disposition (item 4 above).

---

## 3. Open content backfill (tracked, not blocking)

- **`docs/changelog.md` backfill — S40, S41, S42 missing.** The in-repo changelog stops at S39 (2026-04-24). S42 PA wrote the missing sessions in `scrml-support/CHANGELOG-scrmlTS.md` (Keep-a-Changelog format) but option-2 decision (S43) is to fold that content back into the existing prose format. Sources: git log + the scrml-support file (still untracked in scrml-support's tree; safe to read until that PA deletes it). Roughly:
  - **S40** — many landings (LSP L2/L3/L4, SQL-ref placeholder triple, GITI-008 etc., Bun.SQL); 100 commits; close at `d0dfe1b`/`205602d`.
  - **S41** — Bug L landed + reverted; GITI-012 + GITI-013 fixed; kickstarter v0 + clueless-agent + validation experiments; Scope C authorized. Close at `b1ce432`.
  - **S42** — see `handOffs/hand-off-43.md` §2 for the full inventory (6 compiler-bug fixes A1-A6, kickstarter v1, Scope C Stages 1/2/3/6, 8 new examples, F4 finding, three durable directives).
- Folding can happen on the next "wrap" or in a dedicated content pass — not blocking S43 work.

## 4. Session log (chronological)

- 2026-04-26 — S43 opened. pa.md read. S42-closed hand-off read. Rotated S42-closed → `handOffs/hand-off-43.md`. Verified scrmlTS clean + in sync with origin (HEAD `4db8d37`). Inbox empty (only carried `dist/` from S40). Read last contentful entries from `scrml-support/user-voice-scrmlTS.md`.
- 2026-04-26 — Surfaced two changelogs problem (existing `docs/changelog.md` at 803 lines stopping at S39, vs new `scrml-support/CHANGELOG-scrmlTS.md` at 147 lines from S42). User picked option 2: keep in-repo, retire scrml-support file. Updated `pa.md` "wrap" step 3 to point at `docs/changelog.md`.
- 2026-04-26 — User-voice strategy clarification: private + per-project + real-time append + voice-reference for articles. scrml-support privacy confirmed (private GitHub repo). User-voice goes into `scrml-support/user-voice-<repo>.md` for public repos like scrmlTS, and `<repo>/user-voice.md` for private repos like scrml/giti/6nz.
- 2026-04-26 — **Discovered scrml-support staleness:** local clone 12 commits behind origin (local HEAD `d3586e5` from 2026-04-11; origin HEAD `091c4f5` from 2026-04-14). All S40-S42 cross-repo writes had been built on a 12-day-stale baseline. Forensic audit identified 4 local-delta files (1 modified, 3 untracked); verified content overlap with origin via diff/grep (local user-voice.md base 2,194 lines is 100% contained in origin's user-voice-archive.md 2,837 lines, 0 missing). User stated "MAKE NO MISTAKES" principle; full pre-flight audit + checksums + reflog anchor + /tmp backups before any destructive action.
- 2026-04-26 — **Reset executed cleanly.** `git -C scrml-support reset --hard origin/main` → local HEAD now `091c4f5`. user-voice.md reverted to 5-line origin skeleton. user-voice-archive.md (2,837 lines) brought into local tree. user-voice-scrmlTS.md keeper survived (untracked, checksum verified pre/post). Removed CHANGELOG-scrmlTS.md (retraction holds) and the 2026-04-26-1200 retract-changelog inbox message (now moot). Reflog anchor `d3586e5 HEAD@{1}` preserved as undo button.
- 2026-04-26 — Appended S43 user-voice entries to `scrml-support/user-voice-scrmlTS.md`: option-2 changelog decision, user-voice strategy, scrml-support privacy confirmation, "make no mistakes" principle, cross-machine sync hygiene directive.
- 2026-04-26 — Added new "Cross-machine sync hygiene" section to scrmlTS pa.md — session-start fetch + ahead/behind check, session-end push verification, machine-switch protocol, recovery procedure for staleness discovered mid-session.
- 2026-04-26 — Dropped master-PA inbox message at `~/scrmlMaster/handOffs/incoming/2026-04-26-1230-scrmlTS-to-master-staleness-reconciliation-and-cross-machine-rule.md` requesting (A) commit + push of user-voice-scrmlTS.md, (B) propagation of cross-machine sync rule across other pa.md files (master, scrml-support, scrml, giti, 6nz), (C) FYI on retraction message cleanup.
- 2026-04-26 — Pending: PUSH authorization for scrml-support to propagate cross-machine. **Surface to user as §1 item 1.**

---

## Tags
#session-43 #open

## Links
- [pa.md](./pa.md)
- [master-list.md](./master-list.md)
- [examples/VERIFIED.md](./examples/VERIFIED.md)
- [docs/audits/scope-c-findings-tracker.md](./docs/audits/scope-c-findings-tracker.md) — live bug state
- [docs/changes/fix-component-def-block-ref-interpolation-in-body/intake.md](./docs/changes/fix-component-def-block-ref-interpolation-in-body/intake.md) — A7 next
- [docs/changes/fix-component-def-select-option-children/intake.md](./docs/changes/fix-component-def-select-option-children/intake.md) — A8 next
- [handOffs/hand-off-43.md](./handOffs/hand-off-43.md) — S42 closed (rotated S43 open)
