# scrmlTS — Session 113 (CLOSE)

**Date:** 2026-05-20 → 2026-05-21
**Previous:** `handOffs/hand-off-115.md` (S112 CLOSE — rotated at S113 OPEN)
**Machine:** single-machine (S100 directive holds)
**HEAD at S113 OPEN:** `87453fb` · **HEAD at S113 CLOSE:** `<the S113 wrap commit>`
**Origin sync at CLOSE:** pushed — scrmlTS (user-authorized "wrap and push"); scrml-support clean (0/0, nothing to push).

---

## S113 net outcome — the native-parser arc, run hard

S113 was a work-horse session: the charter-B native-parser implementation arc run across
**5 parallel rounds + finishers — 13 dispatches landed, 0 regressions.** **Four
milestones completed: M2, M3, MK2, MK3.**

- **JS chain COMPLETE through M3:** M1 ✅ → M2 ✅ (M2.4) → M3 ✅ (M3.1-M3.4) → M4 (M4.1 landed; M4.2/M4.3 pending).
- **Markup chain COMPLETE through MK3:** MK1 ✅ → MK2 ✅ (MK2.1-MK2.3) → MK3 ✅ (MK3.1-MK3.3) → MK4 (pending — gated on M4).
- **K2 resolved** — the M1-lexer circular import (the must-precede-M6 blocker).
- Tests: S112 close 16,840 → **17,812 / 0 fail / 169 skip / 1 todo** — **+972**, 0 regressions.
- 18 substantive/chore commits + the wrap. Maps cold-refreshed at S113 OPEN.

No `compiler/src/` changes — the native parser ships ALONGSIDE the live pipeline
(`compiler/native-parser/`); the BS + Acorn swap is M5/M6.

---

## THREAD 1 (primary) — native-parser charter-B implementation arc

**Tracker:** `docs/changes/native-parser-front-end/IMPLEMENTATION-ROADMAP.md` — §5 progress
table = source of truth; §3.1 MK2 / §3.2 M3 / §3.3 MK3 (all ✅ COMPLETE) / §3.4 M4
(decomposed — M4.1 ✅, M4.2/M4.3 pending); §4.4 = known issues K1-K10.

**M-ladder status at S113 CLOSE:**

| Mn | Layer | Status |
|---|---|---|
| M1 — composed-engines lexer | JS | ✅ COMPLETE (S99-S103) |
| M1.5 — expr-literals.js conformance flip | JS | ✅ COMPLETE (S102 `bcb48c9f` — was mis-tracked; verified S113) |
| **M2 — JS expression parser** | JS | ✅ COMPLETE (S112-S113) |
| **M3 — JS statement parser** | JS | ✅ COMPLETE (S113 — M3.1-M3.4) |
| **M4 — full bounded JS subset** | JS | 🔶 §3.4 decomposed; **M4.1 ✅ landed**; M4.2 + M4.3 pending |
| **MK1 — `BlockContext` engine** | Markup | ✅ COMPLETE (S112) |
| **MK2 — `TagFrame` engine** | Markup | ✅ COMPLETE (S113 — MK2.1-MK2.3) |
| **MK3 — `BodyMode` + `DisplayTextLiteral`** | Markup | ✅ COMPLETE (S113 — MK3.1-MK3.3; §4.18 native) |
| MK4 — markup↔JS seam; re-tokenizer scaffolding deletion | Markup | ⬜ pending — NOT decomposed; gated on M4 |
| M5 — pipeline swap behind `--parser=scrml-native` | Both | ⬜ pending — incremental-components-DD revisit gate |
| M6 — joint retirement (BS + Acorn + BPP deleted) | Both | ⬜ pending |

**S114 NEXT ACTIONS on this thread (sequential — the two chains have converged at M4):**
1. **M4.2** — K6 destructuring unification (`parseParamTarget` literal-stand-ins → real
   `ObjectPattern`/`ArrayPattern` binding nodes) + the for-head `noIn` flag into M2's
   binary climber. Decomposed §3.4 — dispatch-ready. Touches `parse-expr`/`ast-expr`/etc.
2. **M4.3** — full-corpus conformance (Tier 1+2 on every `.scrml` in samples/examples/
   stdlib/self-host) + Tier 3 spans + Tier 4 + residual D5. Closes M4. Depends M4.2.
3. **MK4** — the markup↔JS seam (R1 spike §3 contract) + re-tokenizer-scaffolding
   deletion. Needs M4. Decompose §3.5 then dispatch.
4. Then **M5** (pipeline swap behind `--parser=scrml-native` + canary) → **M6** (joint
   retirement — delete BS + Acorn + BPP).

Compiler-source dispatches: `scrml-js-codegen-engineer`, `isolation:"worktree"`, F4 block,
**+ the `git merge main --no-edit` startup step + the coupled-code+test = one-logical-unit
commit-discipline clause** (both mandatory — see process notes).

**The K-cleanup follow-ups (roadmap §4.4):**
- **K9** — markup-layer twin of K2: `block-context`↔`parse-ctx` circular import + aliased
  imports across `block-context`/`parse-ctx`/`parse-markup`/`tag-frame`. Mirror the K2
  recipe (a leaf-module extraction + de-aliasing). **Must precede M6.**
- **K10** — `ast-expr.scrml` ~L575 `!= not` (E-EQ-002 — should be `is not`). One-line
  fix. Sequence AFTER M4 (M4.2/M4.3 are editing `ast-expr.scrml` — avoid a collision).
- **K8** — `function`→`fn` refactor across the native-parser `.scrml` (whole-parser
  scope). Unblocked now K2 is fixed; standalone dispatch.
- **K3/K4/K5** — M1 lexer maximal-munch gaps (compound-assign / `?.` / `#`/`~`/`::`).
  parse-expr-coupled — sequence as a post-M4 dispatch (NOT parallel to an M4 sub-step).
- **K6** — handled inside M4.2.

**Authority docs:** charter dive `scrml-support/docs/deep-dives/scrml-native-parser-front-end-charter-2026-05-20.md`;
S98 DD `scrml-native-parser-design-2026-05-17.md`; roadmap §3.1-§3.4 + §4.4.

---

## S113 process notes (for the next PA)

**`--no-verify` brief gap — FOUND + FIXED.** Two early agents (M2.4, M3.2) used
`--no-verify` on interior commits — root cause: a code change + its coupled test update
create a transiently-red window if committed separately. The Round-4+ dev brief states
explicitly: **a code change AND its coupled test update are ONE logical unit — commit
together** (then every commit is green; no `--no-verify` needed). Held cleanly Rounds
4/5 + finishers. **Carry this clause in every native-parser dev brief.** (Memory rule
saved S113.)

**Five Rule-4 charter/brief-vs-SPEC corrections — agents caught PA brief errors against
the SPEC.** M2.4 (`not`-prefix — §42.10), MK2.2 (mismatched-closer is E-MARKUP-002 not
E-CTX-001 — §4.4.1), MK3.1 (`<engine>` body itself is not a code-bearing locus — §4.18.1's
3 loci), MK3.2/MK3.3 (the §4.18.3/§4.18.4 escape-count inconsistency). The agents'
SPEC-verify discipline is working — keep the "verify, don't assume" reminder in briefs.

**MK2.1 agent STALLED (Round 1) — recovered.** Implementation committed, test file
uncommitted + 1 missing-import bug. PA crash-recovery salvage. If a future native-parser
dispatch stalls — the implementation is usually committed; the uncommitted remainder is
salvageable.

**Path-discipline hook:** fired on multiple dispatches (main-rooted Write/Edit attempts)
— EVERY one rejected pre-write, agent corrected. **Zero leaks across all 13 dispatches.**

**Native-parser-local error codes:** the native parser uses an `E-STMT-`/`E-EXPR-`
parser-stage code namespace (NOT the SPEC §34 catalog — verified zero E-STMT- rows in
SPEC.md). §34 reconciliation is an M5 swap-in concern — flag it in the M5 brief.

---

## Open questions / carry-forwards to surface at S114 OPEN

1. **Native-parser arc** — M4.2 → M4.3 → MK4 → M5 → M6 (sequential; see THREAD 1).
2. **The K-cleanups** — K9 (before M6), K10 (after M4), K8 (unblocked), K3/K4/K5 (post-M4).
3. **SPEC §4.18.3 / §4.18.4 escape-count inconsistency** — §4.18.3 says `\"`/`\\` are
   "the only two escape sequences"; §4.18.4 adds `\${`. The native parser implements the
   correct 3-escape union. A one-line §4.18.3 editorial amendment reconciles it — a SPEC
   decision (SPEC.md not touched by PA/agents). Surface to the user.
4. **MK4 `renders`-token note** (from MK2.3) — the R1 spike §1.2 prev-token set names
   `renders`, but the JS-subset `TokenKind` has no `KwRenders` (only `KwRender`). The MK4
   seam brief must confirm the InCode-dispatch prev-token set against the real `TokenKind`
   enum, not the spike's sketch.
5. **§29 vanilla-interop** — retire vs implement — undecided (S110 carry).
6. **v0.4 release-cut** — queued, unscheduled. v0.4 = release-cut of accumulated
   post-v0.3.0 work; charter-B native parser is v0.5+/multi-quarter, NOT v0.4.
7. **`docs/changes/` regrowth** — flagged S111 (now ~92 dirs incl. the per-agent
   `progress-*.md` files this session added); deref hygiene carry-forward.
8. Pre-existing carries (see `handOffs/hand-off-114.md`): bare-variant-inference-nested
   fix; PRIMER match-block section; Bug 1 ring-offset; tableFor v1.next impl; etc.

## Things S114 PA must NOT screw up

- Every compiler-source `isolation:"worktree"` dispatch brief MUST carry: the F4
  startup-verification block + the `git merge main --no-edit` step + the predecessor-file
  check + **the coupled-code+test = one-logical-unit commit-discipline clause** (S113 fix).
- The native-parser `.scrml` files: K2 resolved the M1-lexer cycle, but **K9 (the
  markup-layer cycle) + K10 (`ast-expr` `!= not`) remain** — the full `.scrml` set does
  NOT yet compile cleanly (K2-gating sweep: 18 of 27 clean). The `.js` shadows are the
  executable surface. Do not chase the K9/K10 compile errors as bugs — they are tracked.
- Roadmap §5 progress table is PA-owned — agents are briefed not to touch the roadmap.
- The grain debate is PARKED for M5 — do not run it early.
- K3/K4/K5 are parse-expr-coupled — do NOT dispatch them parallel to an M4 sub-step.

## Session-start checklist for S114 PA

1. Read `pa.md` pointer → `../scrml-support/pa-scrmlTS.md` IN FULL.
2. Read `docs/PA-SCRML-PRIMER.md` IN FULL.
3. Read `compiler/SPEC-INDEX.md` IN FULL.
4. Read `master-list.md` §0 IN FULL.
5. Read this `hand-off.md` (S113 CLOSE) — rotate to `handOffs/hand-off-116.md` at S114 OPEN.
6. Read last ~10 contentful user-voice entries.
7. Sync hygiene: `git fetch` scrmlTS + scrml-support.
8. Inbox check; verify worktrees (main only expected — S113 cleaned all 13 at wrap).
9. Read `docs/changes/native-parser-front-end/IMPLEMENTATION-ROADMAP.md` — the live arc tracker.
10. Maps currency check — `.claude/maps/` watermark `87453fb`; HEAD will be far ahead
    (S113 landed ~19 commits). Refresh maps before any S114 dev dispatch.
11. Report: caught up + next priority (= M4.2 dispatch).

## State-as-of-CLOSE

| Item | Status |
|---|---|
| HEAD | `<the S113 wrap commit>` |
| Tests | **17,812 pass / 0 fail / 169 skip / 1 todo** / 52,503 expect / 731 files — +972 vs S112, 0 regressions |
| `compiler/src/` changes S113 | NONE — native parser ships alongside (`compiler/native-parser/`) |
| Worktrees | main only (13 cleaned at wrap) |
| scrmlTS origin sync | pushed through the S113 wrap |
| scrml-support origin sync | clean (0/0 — nothing written this session) |
| Inbox `handOffs/incoming/` | empty |
| Hook gate | Configuration B (pre-commit + post-commit + pre-push) |
| pkg.json version | 0.3.3 (unchanged — S113 is mid-arc work, no release tag) |
| `.claude/maps/` | watermark `87453fb` (S113 OPEN); ~19 commits behind at close — refresh S114 |
| `.claude/agents/` | gitignored; elm/jsx/clojure-expert retained |

## S113 commit ledger

| Commit | What |
|---|---|
| `7c3d898` | chore(s113-open) — maps cold-refresh + roadmap MK2 §3.1 decomposition + hand-off rotation |
| `17e1099` | feat M2.4 — JS expression parser scrml-extension forms (M2 ladder complete) |
| `226797c` | feat MK2.1 — TagFrame engine + opener recognition + TagKind |
| `0a5350e` | chore — roadmap M3 §3.2 decomposition + hand-off refresh |
| `dcb61b8` | feat M3.1 — JS statement parser substrate |
| `86f818c` | feat MK2.2 — closer forms + tag-tree pairing + mismatch recovery |
| `d0cffc5` | feat M3.2 — JS control-flow statements |
| `e5ed5c7` | feat MK2.3 — TagKind classification + P4/P5 — MK2 milestone complete |
| `99c6b8e` | chore — hand-off refresh (post-Round-3) |
| `c36c234` | chore — roadmap MK3 §3.3 decomposition |
| `0ef46230` | feat MK3.1 — BodyMode engine + DisplayTextLiteral skeleton — K1 resolved |
| `3524e69b` | feat M3.3 — functions/classes/imports/try-throw |
| `060fd0be` | feat MK3.2 — DisplayTextLiteral literal scanning |
| `f113259d` | feat M3.4 — error-recovery integration — M3 milestone complete |
| `1a51286c` | feat MK3.3 — ${...} interpolation + E-UNQUOTED-DISPLAY-TEXT — MK3 milestone complete |
| `44563a1c` | chore — roadmap M4 §3.4 decomposition + hand-off refresh |
| `3f3418a0` | feat M1.x cluster — K2 (M1-lexer circular import) resolved + M1.5 verified |
| `905d8c51` | feat M4.1 — async/generator — JS expression-subset operators |
| `<wrap>` | chore(s113-close) — wrap (changelog + master-list + hand-off) |

## Tags

#session-113 #CLOSE #native-parser #charter-B #implementation-arc
#M2-complete #M3-complete #MK2-complete #MK3-complete #M4.1 #K2-resolved
#13-dispatches #4-milestones #zero-regressions #pushed
