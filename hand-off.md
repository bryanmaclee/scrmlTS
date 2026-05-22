# scrmlTS — Session 118 (CLOSE)

**Date:** 2026-05-21
**Previous:** `handOffs/hand-off-120.md` (S117 CLOSE — rotated at S118 OPEN)
**Machine:** single-machine (S100 directive holds)
**HEAD at S118 OPEN:** `778b1db3` · **HEAD at S118 CLOSE:** this wrap commit
**Wrap:** full 8-step "full wrap and push" (user-authorized).

---

## S118 net outcome

A very long, dense, productive session. Build-story SPEC authored end-to-end (§58 + §58.5.x); v0.5.0 + v0.6.0 cut and tagged; the README de-duplicated; **all of v0.7 Tier B landed** — the native parser now parses every core-scrml declaration form.

- **scrmlTS:** 11 commits + this wrap commit (+ 2 FUNDING.yml edits the user made via GitHub UI). **scrml-support:** 1 commit (DD Q2 marking).
- **Tests:** 18,173 → **18,358 pass / 169 skip / 1 todo / 0 fail / 742 files / 56,231 expect** (+185 — A2 +109, F4 −4, B4-B5-B6 +38, B1-B2-B3-B7 +42; zero regressions).
- **Releases:** **v0.5.0 + v0.6.0 cut + tagged + pushed.** `package.json` now `0.6.0`.

---

## What landed S118

1. **SPEC §58 Build Story** (`b4da5c3d`) — NEW normative section. Compilation as a pure function `compile(source, buildStory)`; the four-component composite; content-addressed Merkle closure (Approach B); `[story]` manifest table; per-`<program>` `story=` attribute (nested-only); dialect islands; cross-`<program>` ABI invariance; the `*`-marked determinism gaps. §4.12.2 +1 attr row, §34 +2 codes (E-STORY-UNKNOWN, W-STORY-ON-TOP-LEVEL), §47.5/§22.13/§40.8 cross-ref amendments. **Nominal — spec-ahead-of-implementation.** Spec-author calls flagged: SHA-256 closure hash (not §47 FNV-1a-32); OQ-3 inheritance = `db=`-style; OQ-4 top-level `story=` = warn-and-ignore.

2. **SPEC §58.5.1-4** (`974b2079`) — the build-story closure encoding + `build-story.lock` format that §58 deferred. Closure node model (5 kinds, acyclic DAG); canonical node-hash encoding (LF-delimited, SHA-256, bottom-up); the line-based `build-story.lock` serialization; verification. Spec-author calls flagged: line-based `.lock` (go.sum precedent), LF-delimited encoding, node-hash excludes the `name` member.

3. **M5 A2 — expression-catalog bridge** (`c74c2f75`) — `translate-expr.{js,scrml}`, native PascalCase `ExprKind` → live lowercase `ExprNode`. +109 tests. Corrected the re-decomposition DD's catalog counts (native ~37 not ~55; downstream union 20 not 32). 7 native kinds with no clean target → escape-hatch (surfaced, not papered).

4. **M5 F4 — SpanTable retire** (`c1a2e0f5`) — zero-consumer dead structure removed. −4 existence-only tests; net-zero behavior. **This closed the v0.6 M5 units** (A2 + F4 + R4-S117).

5. **v0.5.0 + v0.6.0 release cuts** (`3be02cb1`, `6db511a1`) — the v0.5/v0.6 *work* had all landed S115-S118 but was never tagged. Cut both: pkg.json 0.4.0→0.5.0→0.6.0, changelog release blocks, tags v0.5.0 + v0.6.0, all pushed. Retroactive — the pkg.json-was-0.4.0 drift across S115-S117 is documented accepted-as-known (S94 no-retroactive-renumber precedent). The two tags are close in history (the work landed continuously); honest in the changelog blocks.

6. **README — `story=` + redundancy trim** (`2ee86147`) — build-story section: `compiler=` → `story=` (the S118-ratified name); the stale "not yet specified" framing → "specified in §58." The "Why scrml" section trimmed ~67→~38 lines (it had become a second manual — every beat re-explained in Features + the examples; engines were covered 4×). No feature content cut.

7. **v0.7 Tier B — COMPLETE.** Two combined dispatches:
   - **Wave 1** (`fffdaf50`) — B4 `lin`, B5 `type`, B6 `fn`/`server`/`pure`/`!` modifiers. §34.1 +8 codes. +38 tests.
   - **Wave 2** (`02581580`) — B1 `?` propagate-expr, B2 `!{}` guarded-expr, B3 `~` tilde-decl, B7 `throw`/`try` forbidden-vocab diagnostic. §34.1 +5 codes. +42 tests. Closed the S117 R4 open decision (throw/try DO earn a parse-layer rejection).
   The native parser now parses every core-scrml declaration form.

8. **master-list stale-row fix** (`09fbbe97`) — the §0 L22 row claimed "tableFor … impl pending"; verified stale — tableFor v1.0 shipped S105. Row corrected. (PA had burned effort starting toward "author §41.16" before grepping SPEC.md — Rule-4 lesson; see §"Process incidents.")

9. **scrml-support** (`6a3e5ea`) — compiler-story DD Q2 marked RESOLVED (same-landing doc-currency discipline; §58 closed it).

---

## v0.7 DAG — state as of close

The M5-swap re-decomposition DAG (`scrml-support/docs/deep-dives/m5-swap-redecomposition-2026-05-21.md`):

| Unit | Status |
|---|---|
| A1 statement-catalog bridge | ✅ R1, S117 |
| A2 expression-catalog bridge | ✅ S118 (`c74c2f75`) |
| A4 / F4 SpanTable retire | ✅ S118 (`c1a2e0f5`) |
| R4 §34.1 native-parser codes | ✅ S117; +13 from B4-B7 (catalog 66→79) |
| **Tier B — B1/B2/B3/B4/B5/B6/B7** | ✅ **COMPLETE S118** (Waves 1+2) |
| **A3 — engine/component hoist synthesis** | ⬜ **NEXT** — depends on B5 (done); now unblocked + no contention |
| C1 — FileAST assembler (`nativeParseFile`) | ⬜ depends on A2 + A3 + all Tier B |
| C2 — api.js routing + canary + conformance promotion | ⬜ depends on C1 + R4 |

**S119 opens on A3.** Then C1, then C2 (the actual `--parser=scrml-native` pipeline swap). A3 est ~12-18h, C1 ~8-14h, C2 ~8-14h per the DD. Strictly sequential — no parallelism (shared files / dependency chain).

---

## Open threads / carry-forwards — surface at S119 OPEN

1. **v0.7 A3 → C1 → C2** — the remaining M5-swap. A3 first (hoist synthesis: populate `FileAST.{typeDecls, components, machineDecls}` from the native block-stream; the `type` slice was unblocked by B5). DAG + per-unit brief-shapes in the re-decomposition DD §A3/§C1/§C2.

2. **`.scrml` predicate-drift sweep — 33 pre-existing `is not not` sites** across the native-parser `.scrml` mirrors (parse-stmt.scrml 18, parse-expr.scrml 13, ast-expr.scrml 1, ast-stmt.scrml 1 — incl. the `isStmt:481` one). `is not not` is not scrml — presence is `is some` (S115). NOT introduced by S118 (Wave 2 added 1, PA fixed it at landing — Wave 2 lands zero new drift). The `.scrml`-correctness gate is an **M6 precondition** (S115/S116). Warrants a dedicated intent-verified sweep. The mirrors are non-executed (the `.js` shadows are correct) — not a functional bug today, but real debt before self-host.

3. **Build-story §58 follow-on — the determinism audit (§58.12).** §58 + §58.5.x landed (spec-ahead-of-implementation). The remaining §58 follow-on is the whole-compiler determinism audit — a real engineering task + a scheduling decision the compiler-story DD routed to PA/user: **v1.0 gate or fast-follow?** Not decided. The bit-identical-artifact claim stays `*`-marked until done. Also open: §58 has no compiler *implementation* (resolution/generation/verification) — a future wave.

4. **§32 `|>` pipeline operator — no native-parser production.** Surfaced by the B3 agent: the native parser has no `|>` TokenKind / expression-grammar production. Out of B1-B7 scope, not in any roadmap milestone. A native-parser feature gap — file/scope it.

5. **dev.to online article updates** — S115 fixed the article content in-repo; the *published* posts are unchanged. Needs a paste-ready update package + the user's platform action. Carried since S117. (Rule 1: marketing-shaped — work only if Bryan raises it.)

6. **Living Compiler retraction** — draft at `docs/articles/living-compiler-retraction-devto-2026-05-21.md`; pending Bryan's stamp + publish (user action).

7. **scrml.dev article canonicalization** — port surviving dev.to articles to canonical `.scrml` pages. Not started.

8. **SPEC-INDEX Quick-Lookup mini-index stale** — the "Topic → Section" parenthetical line numbers drift; flagged S117, not addressed S118. Separate refresh warranted.

9. **§29 vanilla-interop** — spec↔impl divergence (SPEC says vanilla `.js`/`.html`/`.css` pass through; the compiler doesn't). Debate panel undefined. Pre-S117 carry-forward.

10. **`.claude/maps/` stale** — watermark `67a17dc5`; HEAD far ahead (11 S118 commits, heavy native-parser changes). Refresh before any S119 dev dispatch that consumes maps.

11. **Pre-existing (S114):** generator (`yield`/`function*`) policy; PRIMER match-block section; MK4 lazy-require ESM cycle. (tableFor v1.next features remain deferred — v1.0 shipped S105.)

## Process incidents — S118

- **CWD-slip ×2.** PA's Bash CWD slipped into agent worktrees after `isolation:worktree` agents completed (B4-B5-B6 + B1-B2-B3-B7). First (B4-B5-B6): not caught early — mis-read a `git -C <relative-worktree-path>` "No such file or directory" as "worktree dir removed" when it meant "CWD is already in a worktree." Diagnosed read-only, recovered, no work lost. Second (B1-B2-B3-B7): caught immediately by a STEP-1 `pwd` check. Memory `feedback_cwd_slip_after_worktree_dispatch.md` updated with the S118 recurrence (#6) + the diagnostic tell + the refinement that the slip can be present *before* any file-delta. **S119: STEP-1 `pwd` verify before the first git command after ANY `isolation:worktree` agent completes.**
- **Stale-derived-doc trap.** PA started toward "author SPEC §41.16 (tableFor)" trusting the master-list "impl pending" row + the deep-dive's "anticipated outline" — without grepping SPEC.md / `compiler/src/` first. tableFor shipped S105. Rule-4 violation in spirit (derived doc over code/spec). Caught before authoring a duplicate; master-list row corrected. **Lesson: grep SPEC.md + the code before trusting a master-list/DD "pending" claim.**
- **Agent `--no-verify`.** The B4-B5-B6 agent used `--no-verify` on 2 early WIP commits then `--amend`-re-gated; contained to the throwaway branch (file-delta = PA's commit is the gated landing). Surfaced; no substantive risk.

## Push state — PUSHED (wrap step 7, user-authorized)

- **scrmlTS** `0 0` with origin (HEAD = this wrap commit). **scrml-support** `0 0`. Tags `v0.5.0` + `v0.6.0` pushed.
- Verify `git rev-list --left-right --count origin/main...HEAD` = `0 0` on both at S119 open.

## State-as-of-close

| Item | Status |
|---|---|
| HEAD | this S118 wrap commit |
| Tests | 18,358 pass / 169 skip / 1 todo / 0 fail / 742 files / 56,231 expect |
| Worktrees | main only (4 agent worktrees cleaned at wrap §6b) |
| scrmlTS origin sync | pushed — `0 0` |
| scrml-support origin sync | pushed — `0 0` |
| Tags | v0.5.0 + v0.6.0 cut + pushed S118 |
| pkg.json version | **0.6.0** (was 0.4.0 at S118 open) |
| Inbox `handOffs/incoming/` | empty |
| Hook gate | Configuration B (pre-commit + post-commit + pre-push) |
| `.claude/maps/` | watermark `67a17dc5` — STALE (HEAD far ahead); refresh before S119 dev dispatch |
| Background agents | none |

## Session-start checklist for S119 PA

1. Read `pa.md` pointer → `../scrml-support/pa-scrmlTS.md` IN FULL.
2. Read `docs/PA-SCRML-PRIMER.md` IN FULL.
3. Read `compiler/SPEC-INDEX.md` IN FULL (now 58 sections — §58 Build Story).
4. Read `master-list.md` §0 IN FULL (the S118 §0.6 entry is the live delta).
5. Read this `hand-off.md` (S118 CLOSE) — rotate to `handOffs/hand-off-121.md` at S119 OPEN.
6. Read recent contentful user-voice — the S118 entry covers the `story=` ratification + the build-story SPEC direction.
7. Sync hygiene: `git fetch` scrmlTS + scrml-support — both should be `0 0`.
8. Maps refresh (`.claude/maps/` stale at `67a17dc5`) before any S119 dev dispatch.
9. Report: caught up + next priority (= v0.7 A3 hoist synthesis → C1 → C2).

---

## Tags
#session-118 #CLOSE #build-story-§58-authored #v0.5.0-v0.6.0-cut
#v0.7-tier-B-complete #B1-B7-landed #readme-trimmed #cwd-slip-×2-recovered #pushed
