# scrmlTS — Session 113 (OPEN — mid-session)

**Date:** 2026-05-20
**Previous:** `handOffs/hand-off-115.md` (S112 CLOSE — rotated at S113 OPEN)
**Machine:** single-machine (S100 directive holds)
**HEAD at S113 OPEN:** `87453fb` · **HEAD now:** `226797c`+ (see commit ledger)
**Origin sync:** scrmlTS — unpushed S113 commits (housekeeping + 2 landings + M3-decomp); scrml-support — clean.

---

## S113 net so far — native-parser arc, two parallel rounds

S113 is running the charter-B native-parser arc as a work-horse session, same shape
as S112. **Round 1: M2.4 + MK2.1 dispatched in parallel, both landed clean.** Round 2
(MK2.2 + M3.1) dispatched.

- **M2 ladder COMPLETE** — M2.1-M2.4 all landed (M2.4 this session).
- **MK2.1 landed** — first sub-step of the MK2 markup `TagFrame` engine.
- Maps cold-refreshed (watermark `87453fb`; `compiler/native-parser/` now mapped).
- M3 decomposed into M3.1-M3.4 (roadmap §3.2).
- Tests: S112 close 16,840 → **16,954 / 0 fail / 169 skip / 1 todo** (+114, 0 regressions).

No `compiler/src/` changes — native parser ships ALONGSIDE the live pipeline
(`compiler/native-parser/`); swap is M5/M6.

---

## THREAD 1 (primary) — native-parser charter-B implementation arc

**Tracker:** `docs/changes/native-parser-front-end/IMPLEMENTATION-ROADMAP.md` — §5 progress
table is source of truth; §3.1 = MK2 decomposition; §3.2 = M3 decomposition; §4.4 = K1-K5.

**M-ladder status at this point in S113:**

| Mn | Layer | Status |
|---|---|---|
| M1 — composed-engines lexer | JS | ✅ COMPLETE (S99-S103) |
| M1.5 — expr-literals.js conformance flip | JS | ⬜ pending — minor polish |
| **M2 — JS expression parser** | JS | ✅ **COMPLETE** — M2.1-M2.3 (S112) + M2.4 (S113 `17e1099`) |
| **M3 — JS statement parser** | JS | ⬜ DECOMPOSED S113 (§3.2): M3.1 dispatched · M3.2/M3.3/M3.4 pending |
| M4 — full bounded JS subset | JS | ⬜ pending |
| **MK1 — `BlockContext` engine** | Markup | ✅ COMPLETE (S112) |
| **MK2 — `TagFrame` engine** | Markup | ⬜ DECOMPOSED S113 (§3.1): MK2.1 landed (`226797c`) · MK2.2 dispatched · MK2.3 pending |
| MK3 — `BodyMode` + `DisplayTextLiteral` (§4.18) | Markup | ⬜ pending — resolves K1 |
| MK4 — markup↔JS seam; re-tokenizer scaffolding deletion | Markup | ⬜ pending |
| M5 — pipeline swap behind `--parser=scrml-native` | Both | ⬜ pending — incremental-components-DD revisit gate |
| M6 — joint retirement (BS + Acorn + BPP deleted) | Both | ⬜ pending |

**In-flight dispatches (Round 2, S113):** MK2.2 + M3.1, both `scrml-js-codegen-engineer`,
worktree-isolated, background. When they land: MK2.3 next (markup), M3.2/M3.3 next (JS —
they parallelize; both depend only on M3.1).

**Authority docs:** charter dive `scrml-support/docs/deep-dives/scrml-native-parser-front-end-charter-2026-05-20.md`;
S98 DD `scrml-native-parser-design-2026-05-17.md`; roadmap §3.1/§3.2/§4.4.

---

## S113 ANOMALIES + carry-forward notes

**MK2.1 agent STALLED (Round 1) — recovered.** The MK2.1 agent stalled (600s
watchdog) with its implementation fully committed (5 WIP commits) but the test file
uncommitted + 1 bug (`advance` used in 2 test helpers, never imported — 18 identical
`ReferenceError`s). PA crash-recovery salvage: one-word import fix, verified
145/18→163/0, committed to the worktree branch (`f759f0f`), landed via file-delta.
Established uncommitted-work-recovery pattern. **Watch:** if a future native-parser
dispatch stalls, check the worktree — implementation is usually committed; the
uncommitted remainder is salvageable.

**M2.4 agent used `--no-verify` on intermediate WIP commits without authorization.**
Substantively harmless under the file-delta protocol (its final commit + both PA
landing commits ran the full gate), but a pa.md-rule deviation. **Round-2 briefs
were amended** to explicitly state the intermediate-WIP-hook policy (PA's landing
commit is the real gate; the brief now says so + says ask before `--no-verify` on
anything else).

**Brief-vs-SPEC `not` correction (Rule 4).** M2.4 brief (echoing roadmap §1) said
`not` has a "prefix form" — SPEC §42.10 + E-TYPE-045: prefix `not (expr)` is a
compile error, `!` is negation. M2.4 agent parsed `not` as the absence-value atom
only + flagged it; roadmap §1 corrected.

**K5 surfaced + logged (roadmap §4.4):** M1 lexer gaps — `#` has no lex branch
(`<#id>` lexes with a span gap), standalone `~` lexes as `BitNot`, `::` lexes as two
`Colon`s. M2.4 re-composes all three at the parse layer (same class as K3/K4).
Canonical fix is M1's lexer — sequence with the M1.x cleanup cluster.

---

## Open questions / carry-forwards

1. **Native-parser arc** — Round 2 (MK2.2 + M3.1) in flight; then MK2.3 + M3.2/M3.3.
2. **M1.x cleanup cluster** (M1.5 + K2 + K3 + K4 + **K5**) — one dispatch; K2 must
   precede M6. Queued.
3. **§29 vanilla-interop** — retire vs implement — undecided (S110 carry).
4. **v0.4 release-cut** — queued, unscheduled. v0.4 = release-cut of accumulated
   post-v0.3.0 work; charter-B native parser is v0.5+/multi-quarter, NOT v0.4.
5. **`docs/changes/` regrowth** — flagged S111 (now 91 dirs per the S113 maps
   non-compliance report); deref hygiene carry-forward.
6. **Push** — S113 commits unpushed (housekeeping `7c3d898`, M2.4 `17e1099`, MK2.1
   `226797c`, + M3-decomp commit). Pre-push hook is a ~5-min full gate.
7. Pre-existing carries (see `handOffs/hand-off-114.md`): bare-variant-inference-nested
   fix; PRIMER match-block section; Bug 1 ring-offset; tableFor v1.next impl; etc.

## Things S113+ PA must NOT screw up

- Every compiler-source `isolation:"worktree"` dispatch brief MUST carry the
  `git merge main --no-edit` startup step + a predecessor-file check (S112 finding).
- The native-parser `.scrml` files do NOT compile cleanly (K1 + K2) — EXPECTED; the
  `.js` shadows are the executable surface. Do not chase compile errors.
- Roadmap §5 progress table is PA-owned — when a dev agent edits the roadmap, do NOT
  file-delta the roadmap from the agent branch; PA flips the row. (Round-2 briefs
  forbid agents touching the roadmap at all.)
- The grain debate is PARKED for M5 — do not run it early.

---

## State-as-of (S113 mid-session)

| Item | Status |
|---|---|
| HEAD | `226797c` + the M3-decomposition commit (this commit) |
| Tests | **16,954 pass / 0 fail / 169 skip / 1 todo** (+114 vs S112; 0 regressions) |
| `compiler/src/` changes | none — native parser ships alongside |
| Worktrees | main + 2 retained (agent-a3f3d6857a42bf077 M2.4, agent-a98858e25af967172 MK2.1) — clean at wrap; +2 Round-2 worktrees will allocate |
| scrmlTS origin sync | unpushed S113 commits |
| scrml-support origin sync | clean |
| Inbox `handOffs/incoming/` | empty |
| Hook gate | Configuration B (pre-commit + post-commit + pre-push) |
| pkg.json version | 0.3.3 |
| `.claude/maps/` | fresh — cold-refreshed S113 at `87453fb` |

## S113 commit ledger

| Commit | What |
|---|---|
| `7c3d898` | chore(s113-open) — maps cold-refresh + roadmap MK2 §3.1 decomposition + hand-off rotation |
| `17e1099` | feat(native-parser) M2.4 — JS expression parser scrml-extension forms (M2 ladder complete) |
| `226797c` | feat(native-parser) MK2.1 — TagFrame engine + opener recognition + TagKind |
| `<this>` | chore(s113) — roadmap M3 §3.2 decomposition + hand-off refresh |

## Tags

#session-113 #OPEN #native-parser #charter-B #implementation-arc #M2-complete
#MK2.1-landed #M3-decomposed #round-2-dispatched #stall-recovery
