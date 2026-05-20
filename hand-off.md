# scrmlTS — Session 113 (OPEN)

**Date:** 2026-05-20
**Previous:** `handOffs/hand-off-115.md` (S112 CLOSE — rotated at S113 OPEN)
**Machine:** single-machine (S100 directive holds)
**HEAD at S113 OPEN:** `87453fb`
**Origin sync at S113 OPEN:** scrmlTS clean, 0/0 vs origin/main · scrml-support clean, 0/0 vs origin/main

---

## S113 session-start state

PA caught up via the full session-start checklist: pa.md (→ `../scrml-support/pa-scrmlTS.md`
IN FULL), PRIMER, SPEC-INDEX, master-list §0, S112 CLOSE hand-off, last ~11 contentful
user-voice entries (S99-S111; no S112 user-voice — S112 was an autonomous workhorse
session), native-parser IMPLEMENTATION-ROADMAP.

- **Git sync:** scrmlTS + scrml-support both clean and in sync with origin (0/0).
- **Hooks:** Configuration B — `core.hooksPath = .git/hooks`; pre-commit + post-commit
  + pre-push all installed. Leave as-is.
- **Inbox:** `handOffs/incoming/` empty.
- **Worktrees:** main only (S112 cleaned 8 at wrap).
- **Maps:** `.claude/maps/` STALE — watermark `78faa65`, HEAD `87453fb` (12 commits
  behind; 49 files changed). The native-parser dir (M2 + MK1 files) is unmapped.

---

## NEXT PRIORITY (S113)

The native-parser charter-B implementation arc is the top thread. Next two dispatches
parallelize (same as M2.x / MK1.x in S112):

1. **M2.4** — JS scrml-extension expression forms (`is`/`is not`/`is some`/`not`/`match`/
   `~`/`?{}`/`<#id>`/`render`/`lift`/`fail`/`::Variant`/`.Variant`). Closes the 5+
   `preprocessForAcorn` Acorn-workaround failure modes. Roadmap §1, ~7-15h. Depends M2.3 ✅.
2. **MK2** — markup `TagFrame` engine (tag tree, 3 closer forms, `TagKind`, structural-
   element recognition). Roadmap §3, ~25-55h. Depends MK1 ✅.

Both are compiler-source dispatches: `scrml-js-codegen-engineer`, `isolation:"worktree"`,
F4 startup-verification block, **+ the `git merge main --no-edit` startup step** (S112
HARNESS FINDING — mandatory). M3 follows M2.4.

Also queued (not blocking the arc):
- **M1.x cleanup cluster** — one dispatch: M1.5 (conformance flip) + K2 (M1 circular
  import — load-bearing, must precede M6) + K3/K4 (M1 lexer maximal-munch gaps). Roadmap §4.4.
- **Maps refresh** — `.claude/maps/` stale; run `/map incremental` or cold refresh early.

---

## THREAD 1 (primary) — native-parser charter-B implementation arc

**Tracker:** `docs/changes/native-parser-front-end/IMPLEMENTATION-ROADMAP.md` — §5 progress
table is the source of truth; §4.4 records 4 known issues (K1-K4).

**M-ladder status at S113 OPEN:**

| Mn | Layer | Status |
|---|---|---|
| M1 — composed-engines lexer | JS | ✅ COMPLETE (S99-S103) |
| M1.5 — expr-literals.js conformance flip | JS | ⬜ pending — minor polish |
| M2.1 substrate + ParseMode + primary exprs | JS | ✅ landed S112 (`b47c860`) |
| M2.2 operator expressions | JS | ✅ landed S112 (`bcb4df2`) |
| M2.3 call/member/optional-chain/new/arrow-heads | JS | ✅ landed S112 (`4c2c4a0`) |
| **M2.4** scrml-extension expression forms | JS | ⬜ **NEXT** (roadmap §1) |
| M3 — statement parser (subsumes BPP) | JS | ⬜ pending — re-enters M2.3's `BlockStub` token ranges |
| M4 — full bounded JS subset | JS | ⬜ pending |
| MK1 — `BlockContext` engine + context-grid | Markup | ✅ COMPLETE S112 (MK1.1+MK1.2+MK1.3) |
| **MK2** — `TagFrame` engine | Markup | ⬜ **NEXT (markup side)** (roadmap §3) |
| MK3 — `BodyMode` + `DisplayTextLiteral` (§4.18) | Markup | ⬜ pending — resolves K1 |
| MK4 — markup↔JS seam; re-tokenizer scaffolding deletion | Markup | ⬜ pending |
| M5 — pipeline swap behind `--parser=scrml-native` | Both | ⬜ pending — incremental-components-DD revisit gate |
| M6 — joint retirement (BS + Acorn + BPP deleted) | Both | ⬜ pending |

**No `compiler/src/` changes through the arc** — the native parser ships ALONGSIDE the
live pipeline (`compiler/native-parser/`); swap is M5/M6. Per-file discipline: `.scrml`
canonical + `.js` shadow; tests import the `.js`. The native-parser `.scrml` files do NOT
compile cleanly (K1 BodyMode forward-ref + K2 circular import) — EXPECTED; the `.js`
shadows are the executable surface. Do not "fix" by chasing compile errors.

**Authority docs:** charter dive `scrml-support/docs/deep-dives/scrml-native-parser-front-end-charter-2026-05-20.md`;
S98 DD `scrml-native-parser-design-2026-05-17.md`; R1 seam spike
`docs/changes/native-parser-front-end/SPIKE-markup-js-seam-2026-05-20.md`;
`compiler/native-parser/README.md`.

**Grain debate** (whole-stage vs nanopass for post-front-end stages) — PARKED for the
M5 revisit (S112 user decision). Do not run early.

---

## Open questions / carry-forwards to surface at S113

1. **Native-parser arc** — M2.4 + MK2 next dispatches; M3 after M2.4. (Top priority.)
2. **M1.x cleanup cluster** (M1.5 + K2 + K3 + K4) — one dispatch; K2 must precede M6.
3. **Maps refresh** — `.claude/maps/` stale at `78faa65`; refresh early S113.
4. **§29 vanilla-interop** — retire vs implement — undecided (S110 carry; user has not ruled).
5. **v0.4 release-cut** — queued, unscheduled. v0.4 = release-cut of accumulated post-v0.3.0
   work (L22 family, §26 Tailwind, S107-110 bug arc, native-parser M1, SPEC §4.18). The
   native-parser whole-front-end charter B is v0.5+/multi-quarter — NOT v0.4.
6. **`docs/changes/` regrowth** — flagged S111 (88 dirs); deref hygiene carry-forward.
7. Pre-existing carries (see `handOffs/hand-off-114.md`): bare-variant-inference-nested
   fix (SCOPED ~3-4h); PRIMER match-block section; Bug 1 ring-offset; tableFor v1.next
   impl (~10-15h, SPEC §41.16 spec'd); formFor v1.next; quoted-text BS-retrofit Waves 2-7
   CANCELLED (native parser implements §4.18 at MK3).

## Things S113 PA must NOT screw up

- Every compiler-source `isolation:"worktree"` dispatch brief MUST carry the
  `git merge main --no-edit` startup step + a predecessor-file check (S112 HARNESS FINDING).
- The native-parser `.scrml` files do NOT compile cleanly (K1 + K2) — EXPECTED; the `.js`
  shadows are the executable surface. Do not chase compile errors.
- The grain debate is PARKED for M5 — do not run it early.
- Roadmap §5 tracker is PA-owned — when a dev agent edits it, do NOT file-delta the
  roadmap from the agent branch; PA flips the row (avoids the shared-table conflict).

---

## State-as-of-S113-OPEN

| Item | Status |
|---|---|
| HEAD | `87453fb` |
| Tests (S112 CLOSE) | 16,840 pass / 0 fail / 169 skip / 1 todo / 49,417 expect / 730 files |
| `compiler/src/` changes | none planned this arc — native parser ships alongside |
| Worktrees | main only |
| scrmlTS / scrml-support origin sync | both clean, 0/0 |
| Inbox `handOffs/incoming/` | empty |
| Hook gate | Configuration B (pre-commit + post-commit + pre-push) |
| pkg.json version | 0.3.3 |
| `.claude/maps/` | STALE — watermark `78faa65`; refresh deferred to S113 |
| `.claude/agents/` | gitignored; elm/jsx/clojure-expert retained |

## Tags

#session-113 #OPEN #native-parser #charter-B #implementation-arc #M2.4 #MK2
