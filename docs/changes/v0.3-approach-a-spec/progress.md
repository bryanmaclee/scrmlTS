---
title: "v0.3 Approach A — spec-amendment progress log"
date: 2026-05-12
session: S86
status: IN-PROGRESS
worktree: agent-a7caf51fc47f72889
HEAD-at-start: 23e6265
tests-before: 11511 pass / 96 skip / 1 todo / 0 fail / 557 files
---

# Progress log (append-only)

## 2026-05-12 — startup

- WORKTREE_ROOT confirmed `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a7caf51fc47f72889`.
- `bun install` clean.
- `bun run pretest` populated samples/compilation-tests/dist (12 samples).
- `git config core.hooksPath scripts/git-hooks` set.
- Test baseline run twice. First showed 2 flaky fails in `promote-match.test.js` (concurrent `/tmp/scrml-promote-test-*` collisions). Second + third runs CLEAN at 11,511 pass / 96 skip / 1 todo / 0 fail / 557 files. Recording the stable baseline.
- Dispatch expected baseline (`d2469c4` HEAD with 11,580 pass / 114 skip / 562 files) is AHEAD of this worktree's `23e6265`. Treating local clean baseline as TESTS_BEFORE.
- Reading list consumed: SCOPING.md (190 lines), dive H (588 lines), S84 diagnostic (191 lines), Insight 29 (97 lines), SPEC.md §34 catalog area + §40 + §40.8 + §40.8.1 + §41 + §47.5 + §52.1, PIPELINE.md stage index + Stage 7 (DG) + Stage 7.5 (Batch Planner) + Integration Failure Mode Catalog, PA-SCRML-PRIMER §3/§9, S86 Amendment 001 directive, §51.0.M precedent for spec voice.

## Plan (sub-buckets → commits)

1. SPEC.md §40.9 (Closure Analysis — Minimal Playable Surface) — main authoring (~400-500 LOC). Commit 1.
2. SPEC.md §40 amendment (static-role-classification — new §40.1.1 or paragraph in §40.1) ~30-50 LOC. Commit 2.
3. SPEC.md §47.5 amendment (determinism preservation cross-ref) ~20-30 LOC. Commit 3.
4. SPEC.md §52 + §41 cross-refs ~10-20 LOC each, batched. Commit 4.
5. SPEC.md §34 catalog +2 rows. Commit 5.
6. PIPELINE.md new Stage 7.6 (Reachability Solver) — Stage 7.5 already taken by Batch Planner so I'm using 7.6 ~150-200 LOC. Commit 6.
7. SPEC-INDEX regen (mechanical). Commit 7.
8. progress.md final note + tests rerun. Commit 8.

Each commit ends with green `bun run test`.

## Decisions

- **Stage number for Reachability Solver:** 7.6 (Stage 7.5 = Batch Planner; 7.6 places RS after BP, before CG; both BP and RS consume DG output). Matches "post-DG, pre-CG" placement in dispatch.
- **§40 amendment placement:** new §40.1.1 sub-section "Static role classification for closure analysis" — minimal disruption to §40.1 Overview voice.
- **§40.9 placement:** between §40.8.1 (OQ for `<program spa>`) and the `---` / `## 41.` boundary. The OQ at §40.8.1 is explicitly deferred and labelled DO NOT TOUCH; §40.9 immediately follows it.
- **Per PA decision:** synchronous-role-classification IS canonical static-resolvability shape (per SCOPING §1.2 + OQ #3). Async-only auth gates trigger `W-AUTH-RUNTIME-FALLBACK` info-level lint.

## Section authoring sequence

Working through §40.9.0 → §40.9.11 sequentially in one Write call; cross-refs and amendments after.

## 2026-05-12 — §40.9 authored + committed (b0e506e)

- SPEC.md §40.9 (Closure Analysis — Minimal Playable Surface) sub-sections §40.9.0 through §40.9.11 authored — ~430 lines of spec text.
- All 5 components (§40.9.2 → §40.9.6) anchored on dive H Components 1-5.
- Worked example uses inline `class="..."` Tailwind-style (S86 Amendment 001 compliant; no file-top `#{}`).
- 2 new error codes defined inline + cataloged at §40.9.11.
- Tests still 11,511 / 0 fail.
- Commit `b0e506e`.

## 2026-05-12 — amendments authored

- §40.1.1 (Static role classification for closure analysis) — new sub-section after §40.1 Overview, mirrors §40.9.5 normative statement from §40 side.
- §47.5 (Scope of Application) — closure-analysis-determinism cross-reference paragraph appended after the test-bind cross-ref; B-deferral language preserved.
- §52 (State Authority) — closure-analysis-Component-3 cross-reference paragraph after the v0.next consistency note, before §52.1.
- §41.9 (Tree-Shaking Behavior) — closure-analysis-Component-5 cross-reference paragraph after the tree-shaking normative statement.
- §34 catalog — `E-CLOSURE-001` + `W-AUTH-RUNTIME-FALLBACK` rows appended at end of table (before `## 35. Linear Types` divider).
- Tests still 11,511 / 0 fail.
- Ready to commit amendments.

## 2026-05-12 — PIPELINE.md Stage 7.6 next

Note: Stage 7.5 is already taken by Batch Planner (BP). Using Stage 7.6 for Reachability Solver (RS). Both consume DG output; RS runs after BP and before CG.

## 2026-05-12 — PIPELINE.md Stage 7.6 authored + amendments committed (1c7d1bf)

- PIPELINE.md new section "Stage 7.6: Reachability Solver (RS) — SPEC ANCHOR" added between Stage 7.5 (BP) and Stage 8 (CG). ~130 lines. INACTIVE marker prominent; compiler-impl deferred.
- Stage Index table updated: rows for 7.5 (BP) and 7.6 (RS) both now visible. The 7.5 row was missing pre-amendment; added it alongside 7.6 for catalog completeness.
- Integration Failure Mode Catalog +4 rows: closure cycle, auth runtime fallback, missing role enum (deferred), pre-markup-context-edge-emission DG.
- Tests still 11,511 / 0 fail.
- Ready to commit PIPELINE.md.

## Next

- Run `bun run scripts/regen-spec-index.ts` (Item H, mechanical).
- Final tests + visual spot-check of §40.9.
- Final commit.

## 2026-05-12 — SPEC-INDEX regenerated + DONE

- `bun run scripts/regen-spec-index.ts` run — 58 rows updated, missing 0. Commit `944da7e`.
- Final tests CLEAN: 11,511 pass / 96 skip / 1 todo / 0 fail / 557 files.
- Visual spot-check of §40.9 end-to-end: voice matches §40.8 (v0.3 Wave 1 precedent) + §51.0.M (S67 `<onTimeout>` precedent). Normative-statement structure consistent. Worked example uses inline `class="..."` Tailwind-style (Amendment 001 compliant). All 12 sub-sections present (§40.9.0 → §40.9.11).
- Final commit count: 4 spec / 1 SPEC-INDEX regen / 1 progress = 6 logical buckets across 4 commits (one per logical sub-bucket per pa.md S83 two-sided rule).
- All sub-buckets per SCOPING.md §1 completed; nothing in dispatch's deferred-items list was authored.

## FINAL STATE

| Item | Sub-bucket | Commit | LOC delta | Status |
|---|---|---|---|---|
| A | §40.9.0 → §40.9.11 (Closure Analysis) | b0e506e | ~430 | DONE |
| B | §40.1.1 (Static role classification) | 1c7d1bf | ~25 | DONE |
| C | §47.5 (determinism cross-ref) | 1c7d1bf | ~5 | DONE |
| D | §52 (Component 3 cross-ref) | 1c7d1bf | ~3 | DONE |
| E | §41.9 (Component 5 cross-ref) | 1c7d1bf | ~3 | DONE |
| F | PIPELINE.md Stage 7.6 | 19c95d6 | ~135 | DONE |
| G | §34 catalog +2 rows | 1c7d1bf | ~3 | DONE |
| H | SPEC-INDEX regen | 944da7e | mechanical | DONE |

Tests at every commit: 11,511 pass / 0 fail. Worktree status: clean.
