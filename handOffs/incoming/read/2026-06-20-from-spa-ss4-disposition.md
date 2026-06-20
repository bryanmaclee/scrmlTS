# From sPA ss4 → scrml PA: whole-list disposition (block-splitter-native-parser)

**Date:** 2026-06-20 (S209) · **From:** sPA ss4 · **To:** scrml PA (next PA — see note)
**Kind:** re-integration / findings · **Status:** needs: action (branch code to merge)
**Branch:** `spa/ss4` tip **`84e68141`** · base **`e8a5491f`** · worktree `../scrml-spa-ss4`

---

## TL;DR

ss4 ran to completion autonomously: **all 7 items dispositioned.** 4 landed code/test commits on `spa/ss4`, 2 verified-no-fix (NOT-REPRODUCED / healthy-by-design), 1 verified-with-PA-edit-queued, 1 PARKED (design-gated arc). One dev-agent dispatched + landed (item 7b). **Please re-integrate `spa/ss4` onto current origin/main (`41422726`)** — single-writer, S147 coherence-gated.

**Context shift mid-session:** you WRAPPED S209 while ss4 was in flight (origin/main `e8a5491f` → `41422726`; `28de9c81` "ss4/ss13/DD-verdict to next PA"). `spa/ss4` is still based on `e8a5491f` (merge-base intact, clean linear, 6 commits). The 4 wrap commits did NOT touch any ss4 code file (verified). Re-integration is a clean merge/cherry-pick onto `41422726`.

---

## Per-item disposition

| # | Item | Disposition | SHA |
|---|------|-------------|-----|
| 1 | bug-75 colon-shorthand legacy placement | **dropped — NOT-REPRODUCED** (S208 `tryConsumeAfterCloseColonShorthand` already fixed; e2e compiles w/ intended info-warning) | f7f21188 (bookkeeping) |
| 2 | g-blocksplitter-comment-span-not-opaque | **LANDED** — engine `skipCommentOrString` + `parseEngineStateChildren` now treat `<!-- -->` opaque; +7-case test. **Match parser + block-splitter NOT affected** (briefSeed over-claimed the match-arm scanner — R4 catch) | 38edeb0a |
| 3 | native-parser corpus GAP-LEDGER | **dropped — verified healthy by-design** (classifyDivergence re-partitions every run; 991/1008 strict-pass, 0 fail; no isolated fix) | 044c9d43 (bookkeeping) |
| 4 | native-parser byte-identical lexer gap | **LANDED** — 5 of 8 `M1.2-*` bench files flipped to strict `full` (M1.3/M1.5 normalizers landed); 3 genuine residuals documented → item 6 | 044c9d43 |
| 5 | phase-a2-structural-elements | **verified — PA edit queued** (see action #2) | — |
| 6 | native-parser front-end M2-M6 | **PARKED → escalate** (see action #3) | 207064d9 (park note) |
| 7 | derived-value-compound-mutate | **(a) + (b) LANDED** | e6a915c5 (a) · 84e68141 (b) |

`spa/ss4` commits (oldest→newest): f7f21188 · 38edeb0a · 044c9d43 · e6a915c5 · 207064d9 · 84e68141.

---

## PA action items

**1. Re-integrate `spa/ss4` → origin/main (`41422726`).** Clean linear branch on `e8a5491f`; the 4 wrap commits touched no ss4 code file. Net code/test deltas:
- `compiler/src/engine-statechild-parser.ts` (item 2: `skipCommentOrString` + `parseEngineStateChildren` HTML-comment opacity)
- `compiler/src/tokenizer.ts` (item 7a: MULTI_OPS += `<<=`/`>>=`/`>>>=`)
- `compiler/src/ast-builder.js` (item 7a: COMPOUND_OPS completed to the full 15-op set · item 7b: in-compound `const`-derived child registration in parseLogicBody)
- `compiler/tests/unit/engine-statechild-comment-opacity.test.js` (NEW, item 2) · `compiler/tests/unit/derived-value-mutate.test.js` (item 7: §B8.2b shift ops + §B8.3/§B8.6 un-skipped) · `compiler/tests/parser-conformance-lexer.test.js` (item 4: 5 disposition flips)
- Each commit passed the full pre-commit + post-commit browser gate independently.

**2. Apply the item-5 master-list row-A2 currency edit** (NOT done on-branch — master-list.md is PA-owned durable state; editing on a stale-base branch risks the file-delta clobber). All 5 A2 structural elements verified shipped + compiling (`<engine>`+A7 · `<match>` block · `<channel>` · `<errors>` 17 test files · `<onTransition>` 33 test files). Exact replacement for `master-list.md §0.1` row A2:
   - FROM: `| A2 — Structural elements | ... | 25-40h | ⏸️ pending A1 | |`
   - TO: `| A2 — Structural elements | ... | 25-40h | ✅ SHIPPED (A1c waves + A7; live front-end = native-parser Charter B) — S58 row currency-corrected S209/ss4 | all 5 elements compile + heavy test coverage; conformance corpus 991/1008 strict |`

**3. Item 6 (native-parser M2-M6) — ESCALATED, needs PA sequencing.** PARK reasons: (a) the Phase-A default-flip is a STANDING USER DECISION (~v0.8) — not sPA-rulable; (b) footprint (`native-parser/*`) is unbounded for one sPA session. State (roadmap S170): native parser BUILT; flip-failures 1,150→~508; #2f DONE (S162). Remaining buckets for per-milestone dispatch: MISSING-FIELD emit-shape ~296 (dominant) · engine-statechild ~116 · FIELD-SHAPE-other ~21 · each-match residual ~11 · legacy-stage-probe ~14-18. Item-4's 3 residual lexer gaps (decl-class / expr-optional-chain / expr-template-literal byte-identical) fold in here.

**4. Clean up the dev-agent worktree** `.claude/worktrees/agent-a4e244bf6be547466` (branch `worktree-agent-a4e244bf6be547466`, tip 65a52043) — item 7b work file-delta'd onto `spa/ss4`; the worktree is spent.

---

## Notable findings (worth your eyes)

- **Item 7a surfaced a latent silent-data-loss class beyond the named scope.** The tokenizer fix ALONE would have turned `<<=` from a hard error (E-CODEGEN-INVALID-JS) into SILENT statement-dropping. Root: `ast-builder.js` COMPOUND_OPS listed only 7 of the 17 compound/update ops, so a newline-separated 2nd `@x <op>= n` for ANY of the other 10 (`**= &= |= ^= &&= ||= ??= <<= >>= >>>=`) merged + was silently dropped (console.warn only). I completed COMPOUND_OPS to the full set — fixes the named shift trio AND the 7 latent non-shift ops (same root; R2 don't-ship-smaller-surface). Empirically confirmed all 11 affected ops now emit all statements.
- **Item 2 briefSeed over-claimed.** It named both the match-arm scanner AND the engine scanner. Empirically only the engine scanner had the bug; match (raw-body + arm-closer scan) handles `<!-- -->` at every position. R4 verify-before-claim caught it — fix is engine-only.
- **Dispatch coordination:** item 7b agent branched from local main (`41422726`, already wrapped) and merged `spa/ss4` per brief, so its files carried blocker (a). Verified PA-wrap didn't touch the target files + agent-diff = blocker-b-only before file-delta. R26-verified on `spa/ss4` post-land.

`progress.md` (`spa-lists/ss4.progress.md`) on the branch has the full step-by-step. ss4 list file has per-item statuses. No wrap, no master-list/changelog writes (PA-owned). Done.
