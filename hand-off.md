# scrmlTS — Session 114 (OPEN)

**Date:** 2026-05-21
**Previous:** `handOffs/hand-off-116.md` (S113 CLOSE — rotated at S114 OPEN)
**Machine:** single-machine (S100 directive holds)
**HEAD at S114 OPEN:** `e613621` (S113 wrap)
**Origin sync at OPEN:** scrmlTS 0/0 (clean, pushed through S113 wrap) · scrml-support 0/0 (clean — 5 pre-existing untracked `voice/articles/2026-05-09-*.md` drafts + `tools/` dir; not S114-relevant; carry as-is).
**Inbox:** empty (no `handOffs/incoming/*.md` outside `read/`).
**Worktrees:** main only (S113 cleaned all 13 at wrap; verified `git worktree list`).
**`.claude/maps/`:** watermark `87453fb` — ~19 commits behind HEAD. **Refresh before any S114 dev dispatch.**

---

## S114 OPEN status

S113 was a 13-dispatch native-parser arc landing **four milestones (M2, M3, MK2, MK3) +
M4.1 + K2** with zero regressions (tests 16,840 → **17,812**). S114 inherits a clean tree
and the M4.2 dispatch as the immediate next priority.

Session-start checklist completed: pa.md (full read via `../scrml-support/pa-scrmlTS.md`),
PA-SCRML-PRIMER §1-§7 (key sections; updated 2026-05-17), SPEC-INDEX (366L navigation map),
master-list §0 dashboard, S113 CLOSE hand-off, last 5 contentful user-voice entries (S100,
S102, S103, S110, S111). Sync hygiene OK both repos; inbox empty; worktrees clean.

**Caught up. Next priority: M4.2 dispatch (native parser arc).**

---

## THREAD 1 (primary, inherited from S113) — native-parser charter-B implementation arc

**Tracker:** `docs/changes/native-parser-front-end/IMPLEMENTATION-ROADMAP.md` — §5 progress
table = source of truth; §3.4 = M4 decomposition (M4.1 ✅ done, M4.2 + M4.3 pending);
§4.4 = K-ledger.

**M-ladder status (carried from S113 CLOSE):**

| Mn | Layer | Status |
|---|---|---|
| M1 — composed-engines lexer | JS | ✅ COMPLETE (S99-S103) |
| M1.5 — expr-literals.js conformance flip | JS | ✅ COMPLETE (S102 `bcb48c9f`; verified S113) |
| M2 — JS expression parser | JS | ✅ COMPLETE (S112-S113) |
| M3 — JS statement parser | JS | ✅ COMPLETE (S113 — M3.1-M3.4) |
| **M4 — full bounded JS subset** | JS | 🔶 M4.1 ✅; **M4.2 + M4.3 pending** |
| MK1 — `BlockContext` engine | Markup | ✅ COMPLETE (S112) |
| MK2 — `TagFrame` engine | Markup | ✅ COMPLETE (S113 — MK2.1-MK2.3) |
| MK3 — `BodyMode` + `DisplayTextLiteral` | Markup | ✅ COMPLETE (S113 — MK3.1-MK3.3; §4.18 native) |
| MK4 — markup↔JS seam + re-tokenizer scaffolding deletion | Markup | ⬜ pending — gated on M4 |
| M5 — pipeline swap behind `--parser=scrml-native` | Both | ⬜ pending — incremental-components-DD revisit gate |
| M6 — joint retirement (BS + Acorn + BPP deleted) | Both | ⬜ pending |

**Sequential plan (S114 forward):**
1. **M4.2** — K6 destructuring unification (`parseParamTarget` literal-stand-ins → real
   `ObjectPattern`/`ArrayPattern` binding nodes) + the for-head `noIn` flag into M2's
   binary climber. Decomposed §3.4 — dispatch-ready. Touches `parse-expr`/`ast-expr`/etc.
2. **M4.3** — full-corpus conformance (Tier 1+2 on every `.scrml` in samples/examples/
   stdlib/self-host) + Tier 3 spans + Tier 4 + residual D5. Closes M4. Depends M4.2.
3. **MK4** — the markup↔JS seam (R1 spike §3 contract) + re-tokenizer-scaffolding
   deletion. Needs M4. Decompose §3.5 then dispatch.
4. **M5** — pipeline swap behind `--parser=scrml-native` + canary.
5. **M6** — joint retirement (delete BS + Acorn + BPP).

**K-cleanup follow-ups (roadmap §4.4):**
- **K9** — markup-layer twin of K2: `block-context`↔`parse-ctx` circular import + aliased
  imports across `block-context`/`parse-ctx`/`parse-markup`/`tag-frame`. Mirror the K2
  recipe. **Must precede M6.**
- **K10** — `ast-expr.scrml` ~L575 `!= not` (E-EQ-002 — should be `is not`). One-line fix.
  Sequence AFTER M4 (M4.2/M4.3 are editing `ast-expr.scrml` — avoid a collision).
- **K8** — `function`→`fn` refactor across the native-parser `.scrml` (whole-parser
  scope). Unblocked now K2 is fixed; standalone dispatch.
- **K3/K4/K5** — M1 lexer maximal-munch gaps (compound-assign / `?.` / `#`/`~`/`::`).
  parse-expr-coupled — sequence as a post-M4 dispatch (NOT parallel to an M4 sub-step).
- **K6** — handled inside M4.2.

**Authority docs:**
- Charter dive — `scrml-support/docs/deep-dives/scrml-native-parser-front-end-charter-2026-05-20.md`
- S98 design DD — `scrml-support/docs/deep-dives/scrml-native-parser-design-2026-05-17.md`
- Roadmap §3.1-§3.4 + §4.4 — `docs/changes/native-parser-front-end/IMPLEMENTATION-ROADMAP.md`

---

## Mandatory dispatch-brief clauses (S113 process baseline — carry into S114)

Every compiler-source `isolation:"worktree"` dispatch MUST include all of:

1. **F4 startup-verification block** (pwd / git-toplevel / status / `bun install` / `bun run pretest`).
2. **`git merge main --no-edit`** startup step (S112 finding — mid-session worktrees branch
   from session-start commit, not live HEAD).
3. **Predecessor-file check.**
4. **Coupled-code+test = one logical unit** (S113 fix — `--no-verify` gap; commit code +
   coupled test together so every commit is green; no `--no-verify` needed).
5. **`isolation: "worktree"` parameter explicit** on the Agent() call (S88).
6. **Path-discipline reminder + S99 incident-counter** in the F4 block.
7. **MAPS — REQUIRED FIRST READ** block (`primary.map.md` + task-shape routing; commit-SHA
   + date filled in from current `primary.map.md` line 3).

---

## Open questions / carry-forwards to surface

1. **Native-parser arc** — M4.2 → M4.3 → MK4 → M5 → M6 (sequential; THREAD 1).
2. **K-cleanups** — K9 (before M6), K10 (after M4), K8 (unblocked), K3/K4/K5 (post-M4).
3. **SPEC §4.18.3 / §4.18.4 escape-count inconsistency** (S113 surfaced) — §4.18.3 says
   `\"`/`\\` are "the only two escape sequences"; §4.18.4 adds `\${`. Native parser
   implements the correct 3-escape union. One-line §4.18.3 editorial amendment reconciles
   it — a SPEC decision (SPEC.md not touched by PA/agents). **Surface to user.**
4. **MK4 `renders`-token note** (from MK2.3, S113) — R1 spike §1.2 prev-token set names
   `renders`, but the JS-subset `TokenKind` has no `KwRenders` (only `KwRender`). The MK4
   seam brief must confirm the InCode-dispatch prev-token set against the real `TokenKind`
   enum, not the spike's sketch.
5. **§29 vanilla-interop** — retire vs implement — undecided (S110 carry).
6. **v0.4 release-cut** — queued, unscheduled. v0.4 = release-cut of accumulated
   post-v0.3.0 work; charter-B native parser is v0.5+/multi-quarter, NOT v0.4.
7. **`docs/changes/` regrowth** — flagged S111 (~92 dirs incl. the per-agent
   `progress-*.md` files S113 added); deref hygiene carry-forward.
8. Pre-existing carries (from earlier hand-offs): bare-variant-inference-nested fix;
   PRIMER match-block section; Bug 1 ring-offset; tableFor v1.next impl; etc.

---

## Things S114 PA must NOT screw up (carried from S113)

- Every compiler-source `isolation:"worktree"` dispatch brief MUST carry the 7 clauses above.
- The native-parser `.scrml` files: K2 resolved the M1-lexer cycle, but **K9 (markup-layer
  cycle) + K10 (`ast-expr` `!= not`) remain** — the full `.scrml` set does NOT yet compile
  cleanly (K2-gating sweep: 18 of 27 clean). The `.js` shadows are the executable surface.
  Do not chase the K9/K10 compile errors as bugs — they are tracked.
- Roadmap §5 progress table is PA-owned — agents briefed not to touch the roadmap.
- The grain debate is PARKED for M5 — do not run it early.
- K3/K4/K5 are parse-expr-coupled — do NOT dispatch them parallel to an M4 sub-step.
- **Maps refresh before any S114 dev dispatch** — watermark is `87453fb`; HEAD is `e613621`
  (19 commits ahead). The M4.2 dispatch's brief needs the post-S113 commit + date.

---

## State-as-of-OPEN

| Item | Status |
|---|---|
| HEAD | `e613621` (S113 wrap) |
| Tests (last recorded — S113 close) | **17,812 pass / 0 fail / 169 skip / 1 todo** / 52,503 expect / 731 files |
| `compiler/src/` changes S114-so-far | NONE |
| Worktrees | main only |
| scrmlTS origin sync | 0/0 (clean) |
| scrml-support origin sync | 0/0 (clean — pre-existing untracked drafts, carry-as-is) |
| Inbox `handOffs/incoming/` | empty (only `read/`) |
| Hook gate | Configuration B (pre-commit + post-commit + pre-push) |
| pkg.json version | 0.3.3 (unchanged) |
| `.claude/maps/` | watermark `87453fb` (S113 OPEN); 19 commits behind — refresh before dispatch |
| `.claude/agents/` | gitignored; elm/jsx/clojure-expert retained |

---

## Tags

#session-114 #OPEN #native-parser #charter-B #implementation-arc #M4.2-next
