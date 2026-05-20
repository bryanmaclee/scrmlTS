# scrmlTS — Session 112 (IN PROGRESS)

**Date:** 2026-05-20
**Previous:** `handOffs/hand-off-114.md` (S111 CLOSE — rotated at S112 OPEN)
**Machine:** single-machine (S100 directive holds)
**HEAD at S112 OPEN:** `c6c6a11` (S111 wrap `aaf3bd7` + the README-pronunciation commit `c6c6a11`)
**Origin sync at OPEN:** scrmlTS 0/0, scrml-support 0/0 — both clean, both synced.

---

## S112 charter — work-horse session (user directive S112 OPEN)

> "this will be a work-horse session. You, as PA, will need to be orchestrator,
> consolidator, surgical fix when needed, etc. We are going to parallelize what we can.
> also keep the maps incrementally refreshing in back as well"

S112 opens the **native-parser implementation arc** (charter B, ratified S111). PA is
orchestrator + consolidator; parallelize M2 / MK1 chains; incremental map refresh in
background as dispatches land.

---

## S112 PLAN

1. **Native-parser implementation roadmap** — decompose the charter dive's M-ladder
   (M2/M3/M4 JS chain + MK1/MK2/MK3/MK4 markup chain + M5/M6) into a trackable
   per-sub-step decomposition (the analog of M1→M1.1-M1.4). PA-authored.
2. **Dispatch M2.1 (JS expression parser) + MK1.1 (markup BlockContext engine)** in
   parallel — `scrml-js-codegen-engineer`, `isolation:"worktree"`, F4 block, S99
   path-discipline.
3. Maps refresh incrementally as dispatches land (watermark currently `78faa65`).

---

## State-as-of-OPEN

| Item | Status |
|---|---|
| HEAD | `c6c6a11` |
| Tests (last measured S111) | full **16,213 / 169 skip / 1 todo / 0 fail**; pre-commit subset 13,362 / 0 fail |
| Worktrees | main only |
| Inbox `handOffs/incoming/` | empty |
| Hook gate | Configuration B (pre-commit + post-commit + pre-push) |
| pkg.json version | 0.3.3 |
| Maps | fresh (watermark `78faa65`; HEAD `c6c6a11` adds only the README-pronunciation commit) |
| `.claude/agents/` | gitignored; holds elm/jsx/clojure-expert (quoted-text debate roster — retain) |

## Native-parser arc — state at S112 OPEN

- **M1 (composed-engines lexer) COMPLETE** — M1.1-M1.4 shipped S99-S103. Code at
  `compiler/native-parser/` (.scrml canonical + .js shadow per file).
- **Charter B** — native parser replaces the WHOLE front-end (block-splitter + Acorn).
  Charter dive: `scrml-support/docs/deep-dives/scrml-native-parser-front-end-charter-2026-05-20.md`.
- **Charter dive PA-actions status:** A1 (roadmap SUPERSEDED banner) — done S111;
  R3/OQ-2 (§4.18.1/§40.8 reconcile) — done S111 (`78faa65`); R1 seam spike — done S111
  (`docs/changes/native-parser-front-end/SPIKE-markup-js-seam-2026-05-20.md`);
  OQ-1 (v0.4 manifest) — NOT done; A2 (staleness-index refresh) — NOT done.

## Carry-forwards (untouched S111 — see hand-off-114.md for detail)

- §29 vanilla-interop decision — retire vs implement; undecided.
- v0.4 release-cut — queued, unscheduled.
- Interim BS fix — charter dive recommends I-B (case-by-case) over I-A (~65h throw-away);
  PA proceeding I-B unless friction threshold trips.
- Bare-variant inference nested-positions fix (SCOPED, ~3-4h).
- PRIMER match-block section; Bug 1 ring-offset; tableFor v1.next; variantNames; etc.
- `docs/changes/` regrew to 88 dirs (deref-candidate hygiene).

## S112 commit ledger

| Commit | Repo | What |
|---|---|---|
| (pending) | | |

## Tags

#session-112 #IN-PROGRESS #native-parser #charter-B #implementation-arc #work-horse
