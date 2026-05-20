# scrmlTS — Session 112 (CLOSE)

**Date:** 2026-05-20
**Previous:** `handOffs/hand-off-114.md` (S111 CLOSE — rotated at S112 OPEN)
**Machine:** single-machine (S100 directive holds)
**HEAD at S112 OPEN:** `c6c6a11`
**HEAD at S112 CLOSE:** `<the S112 wrap commit>`
**Origin sync at CLOSE:** pushed — scrmlTS + scrml-support (user-authorized "push when wrapped").

---

## S112 net outcome — the native-parser implementation arc, opened and run hard

S112 opened the **charter-B native-parser implementation arc** (the multi-quarter
compiler-front-end replacement, ratified S111) and ran it as a work-horse session:
**6 native-parser sub-steps dispatched + landed clean**, the implementation roadmap
authored, the root README restructured, the incremental-components deep-dive run.

- **M2 — the JS expression parser — M2.1 + M2.2 + M2.3 landed.** M2.4 remains.
- **MK1 — the markup `BlockContext` engine — COMPLETE (MK1.1 + MK1.2 + MK1.3).**
- Tests: **16,213 (S111) → 16,840 / 0 fail / 169 skip / 1 todo** — **+627** tests
  (all conformance tests; zero regressions across all 6 landings).
- 9 commits. Native-parser implementation roadmap authored. README restructured to
  lead with `# scrml`. The incremental-components DD closed with a program-bounding
  verdict.

No `compiler/src/` changes — the native parser ships ALONGSIDE the live pipeline
(`compiler/native-parser/`); the swap is M5/M6, far off.

---

## THREAD 1 (primary) — the native-parser implementation arc

**The roadmap is the tracker:** `docs/changes/native-parser-front-end/IMPLEMENTATION-ROADMAP.md`
— §5 progress table is the source of truth; §4.4 records 4 known issues (K1-K4).

**M-ladder status at S112 CLOSE:**

| Mn | Layer | Status |
|---|---|---|
| M1 — composed-engines lexer | JS | ✅ COMPLETE (S99-S103) |
| M1.5 — expr-literals.js conformance flip | JS | ⬜ pending — minor polish |
| **M2.1** substrate + ParseMode + primary exprs | JS | ✅ landed S112 (`b47c860`) |
| **M2.2** operator expressions | JS | ✅ landed S112 (`bcb4df2`) |
| **M2.3** call/member/optional-chain/new/arrow-heads | JS | ✅ landed S112 (`4c2c4a0`) |
| **M2.4** scrml-extension expression forms | JS | ⬜ **NEXT** — `is`/`is not`/`is some`/`not`/`match`/`~`/`?{}`/`<#id>`/`render`/`lift`/`fail`/`::Variant`. Closes the `preprocessForAcorn` Acorn-workaround failure modes. |
| M3 — statement parser (subsumes BPP) | JS | ⬜ pending — **note:** M2.3 left function/arrow block bodies as `BlockStub` nodes; M3's statement parser re-enters the captured token range. |
| M4 — full bounded JS subset | JS | ⬜ pending — incl. true `ObjectPattern`/`ArrayPattern` (M2.3 parses destructuring-params as Object/Array-literal stand-ins), generator `function*` flag, `await` (M3-adjacent). |
| **MK1** — `BlockContext` engine + context-grid | Markup | ✅ **COMPLETE** S112 (MK1.1 `b1a2ca5` + MK1.2 `4c6ab3c` + MK1.3 `038dd57`) |
| MK2 — `TagFrame` engine (tag tree, closers, `TagKind`) | Markup | ⬜ **NEXT (markup side)** |
| MK3 — `BodyMode` + `DisplayTextLiteral` (§4.18) | Markup | ⬜ pending — resolves the K1 BodyMode forward-ref |
| MK4 — markup↔JS seam; re-tokenizer scaffolding deletion | Markup | ⬜ pending (R1 seam spike de-risked it) |
| M5 — pipeline swap behind `--parser=scrml-native` | Both | ⬜ pending — **the incremental-components-DD revisit gate** |
| M6 — joint retirement (BS + Acorn + BPP deleted) | Both | ⬜ pending |

**S113 NEXT ACTIONS on this thread** — M2.4 (JS chain) and MK2 (markup chain)
parallelize, same as M2.x/MK1.x did. They are the next two dispatches. Compiler-source
dispatches: `scrml-js-codegen-engineer`, `isolation:"worktree"`, F4 block, **+ the
`git merge main --no-edit` startup step** (see HARNESS FINDING below — mandatory now).

**The M1.x cleanup cluster** — four items to sequence together as one M1.x dispatch
(all non-blocking; all "sequence alongside M1.5"):
- **M1.5** — `expr-literals.js` conformance flip (regex-token normalizer).
- **K2** — pre-existing M1 circular import (`lex-in-code.scrml` ↔ `lex-in-regex.scrml`,
  E-IMPORT-002 + aliased-import E-SCOPE-001). Blocks all native-parser `.scrml` from
  compiling cleanly. **Must be fixed before M6** (the native parser self-hosts its
  `.scrml` at M6 — charter Q8). NOT in the README ANOMALY list.
- **K3** — M1 lexer compound-assignment maximal-munch gap (11 of 16 compound-assign
  operators lex as two tokens; M2.2 re-composes at the parse layer).
- **K4** — M1 lexer optional-chain gap (`?.ident` lexes as 3 tokens; M2.3 re-composes
  at the parse layer).
Roadmap §4.4 has all four with full detail. K3/K4 are AST-equivalent-to-Acorn parse-layer
workarounds — correct, just not in the canonical home.

**Authority docs (unchanged):** charter dive
`scrml-support/docs/deep-dives/scrml-native-parser-front-end-charter-2026-05-20.md`;
S98 DD `scrml-native-parser-design-2026-05-17.md`; R1 seam spike
`docs/changes/native-parser-front-end/SPIKE-markup-js-seam-2026-05-20.md`;
`compiler/native-parser/README.md` (charter-B framing, refreshed S112).

---

## THREAD 2 — incremental scrml-native compiler components DD (CLOSED)

The S111-parked DD ran S112. Output:
`scrml-support/docs/deep-dives/incremental-scrml-native-compiler-components-2026-05-20.md`
(committed to scrml-support at the S112 wrap).

**Verdict — program-bounding:** beyond the front-end parser there is **no second
strong incremental scrml-native-component candidate.** The front-end is special —
lexing/parsing ARE state machines. Every post-front-end stage (TS, DG, CG, NR, MOD,
…) is calculation-shaped — a port would be the (C)-anti-pattern that "showcases
nothing." The incremental v0.x components genuinely ARE v1.0's self-host built early,
but the qualifying set = just the front-end. **Charter B is very likely the first of
*one* such increment, not the first of many.**

**Sequencing:** open no further component; revisit gate = **charter-B M5**.
**Grain debate** (whole-stage vs nanopass) — **PARKED for the M5 revisit** (user
decision, S112). The DD recommended it as optional; M5 re-examines grain with real
implementation evidence.

---

## THREAD 3 — root README restructure (DONE, `78daa8c`)

The README now leads with `# scrml` (the language — "an app should be an exhaustive
state machine"), pronunciation under it, the developer note at #2, the full language
showcase, then `## scrmlTS` (demoted — the working-compiler framing + What's-in-here +
the one-line current-state link), then `## Quick start` at the bottom (the two install
sections merged). 711 → 649 lines. All feature content + all 3 code examples + the dev
note preserved verbatim (byte-exact section reassembly). The 31-line "current state"
blockquote → a one-line link. User-directed end-to-end across S112.

---

## HARNESS FINDING (S112) — mid-session worktrees branch from session-start HEAD

`isolation:"worktree"` agents dispatched **mid-session** branch from the
**session-start commit**, NOT live `main` HEAD. M2.1/MK1.1 (dispatched before any PA
commit) were unaffected; everything dispatched after PA had committed (project-mapper,
M2.2, M2.3, MK1.2, MK1.3) branched stale. **Mitigation — now mandatory in every
post-M2.1 dev brief:** a `git merge main --no-edit` startup step that fast-forwards
the fresh worktree branch to current `main`, plus a predecessor-file existence check.
It worked cleanly for M2.2/M2.3/MK1.2/MK1.3 (all extended their predecessors correctly).
**Memory rule saved S112** (`feedback_*` — worktree-base staleness). Every S113+
compiler-source dispatch brief MUST carry the `git merge main` step.

Companion: the **S100 path-discipline hook fired on 4 of 6 dispatches** — each agent's
first Write/Edit used a main-rooted path; the hook rejected it before any write; agents
corrected. **Zero leaks all session.** The platform fix (filed since S42, escalated S99)
is doing its job — empirically validated 4×.

---

## State-as-of-CLOSE

| Item | Status |
|---|---|
| HEAD | `<S112 wrap commit>` |
| Tests | **16,840 pass / 0 fail / 169 skip / 1 todo** / 49,417 expect / 730 files — +627 vs S111, 0 regressions |
| `compiler/src/` changes S112 | NONE — native parser ships alongside (`compiler/native-parser/`) |
| Worktrees | main only (8 cleaned at wrap) |
| scrmlTS origin sync | pushed through the S112 wrap |
| scrml-support origin sync | pushed (the incremental-components DD) |
| Inbox `handOffs/incoming/` | empty |
| Hook gate | Configuration B (pre-commit + post-commit + pre-push) |
| pkg.json version | 0.3.3 (unchanged — S112 is mid-arc work, no release tag) |
| `.claude/maps/` | **STALE** — watermark `78faa65`; refresh held off per user (S112); deferred to S113. The native-parser dir (M2 + MK1 files) is unmapped. |
| `.claude/agents/` | gitignored; elm/jsx/clojure-expert retained |

## Open questions / carry-forwards to surface at S113 OPEN

1. **Native-parser arc — top priority.** M2.4 + MK2 are the next two parallel
   dispatches. M3 after M2.4. The roadmap §5 is the tracker.
2. **The M1.x cleanup cluster** (M1.5 + K2 + K3 + K4) — one M1.x dispatch; K2 is the
   load-bearing one (must precede M6). Schedule it.
3. **Maps refresh** — `.claude/maps/` stale at `78faa65`; held off S112. Refresh early
   S113 (non-isolated, or with the `git merge main` step). T4 carries the detail.
4. **§29 vanilla-interop** — retire vs implement — still undecided (S110 carry).
5. **v0.4 release-cut** — queued, unscheduled (S111 carry).
6. **`docs/changes/` regrowth** — flagged S111 (88 dirs); deref hygiene carry-forward.
7. Pre-existing carries: bare-variant-inference-nested fix (SCOPED ~3-4h); PRIMER
   match-block section; Bug 1 ring-offset; tableFor v1.next; formFor v1.next; etc.
   (see `handOffs/hand-off-114.md`).

## Things S113 PA must NOT screw up

- Every compiler-source `isolation:"worktree"` dispatch brief MUST carry the
  `git merge main --no-edit` startup step + a predecessor-file check (HARNESS FINDING).
- The native-parser `.scrml` files do NOT compile cleanly (K1 BodyMode forward-ref +
  K2 circular import) — that is EXPECTED; the `.js` shadows are the executable surface
  (README ANOMALY-2). Do not "fix" by chasing compile errors.
- The grain debate is PARKED for M5 — do not run it early.
- Roadmap §5 tracker is PA-owned — when a dev agent edits it, do NOT file-delta the
  roadmap from the agent branch; PA flips the row (avoids the shared-table conflict).

## Session-start checklist for S113 PA

1. Read `pa.md` pointer → `../scrml-support/pa-scrmlTS.md` IN FULL.
2. Read `docs/PA-SCRML-PRIMER.md` IN FULL.
3. Read `compiler/SPEC-INDEX.md` IN FULL.
4. Read `master-list.md` §0 IN FULL.
5. Read this `hand-off.md` (S112 CLOSE) — rotate to `handOffs/hand-off-115.md` at S113 OPEN.
6. Read last ~10 contentful user-voice entries.
7. Sync hygiene: `git fetch` scrmlTS + scrml-support.
8. Inbox check; verify worktrees (main only expected).
9. Read `docs/changes/native-parser-front-end/IMPLEMENTATION-ROADMAP.md` — the live arc tracker.
10. Report: caught up + next priority (= M2.4 + MK2 dispatches; + the M1.x cleanup; + the maps refresh).

## S112 commit ledger

| Commit | Repo | What |
|---|---|---|
| `20aad9d` | scrmlTS | native-parser implementation roadmap + S112 hand-off rotation |
| `5ff4838` | scrmlTS | native-parser charter-B framing refresh — README + master-list §0.4 + roadmap M1.5 |
| `b47c860` | scrmlTS | M2.1 — JS expression parser substrate (+114 conformance tests, 16,327/0) |
| `b1a2ca5` | scrmlTS | MK1.1 — markup BlockContext engine skeleton (0-regression) |
| `78daa8c` | scrmlTS | README restructure — lead with `# scrml`, scrmlTS demoted, Quick start to bottom |
| `4c6ab3c` | scrmlTS | MK1.2 — markup context-boundary recognition (+45 tests, 16,372/0) |
| `bcb4df2` | scrmlTS | M2.2 — JS expression parser operators (+212 conformance tests, 16,539/0) |
| `038dd57` | scrmlTS | MK1.3 — comments + sub-context stubs + conformance (+65 tests, 16,649/0; MK1 complete) |
| `4c2c4a0` | scrmlTS | M2.3 — JS expression parser call/member/arrow-heads (+191 conformance tests, 16,840/0) |
| `<wrap>` | scrmlTS | S112 wrap — hand-off + master-list + changelog |
| `<dd>` | scrml-support | incremental-scrml-native-compiler-components DD |

## Tags

#session-112 #CLOSE #native-parser #charter-B #implementation-arc #M2 #MK1
#work-horse #zero-regressions #readme-restructure #incremental-components-dd
#harness-finding-worktree-base #pushed
