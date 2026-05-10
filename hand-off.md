# scrmlTS — Session 76 (OPEN)

**Date opened:** 2026-05-09
**Previous:** `handOffs/hand-off-75.md` (S75 close — A1c FULLY CLOSED · A8 A6-1+A6-2+A6-3+A6-4 ✅ · Insight 28 ratified · A9-Ext-5 SURVEY ready · 14 ships · +228 tests · 0 regressions)
**This file:** rotates to `handOffs/hand-off-76.md` at S77 open

---

## Session-open state

**Cross-machine pickup performed at S76 open (this machine):**
- Local was 26 commits behind origin (other machine ran S75 in full and pushed `149c1ab` wrap).
- Local untracked `handOffs/hand-off-74.md` was byte-identical to origin's tracked version (md5 `bb1bd5…`) — safe stale leftover from this machine's pre-S75 partial rotate. Removed.
- Local had `D hand-off.md` (deleted from prior partial rotate). Restored from origin via `git restore`.
- Fast-forward pull clean: `72d691f` → `149c1ab`. 75 files / +13,659 / -736.

**Repo sync state at S76 open:**

| Repo | HEAD | origin sync | Working tree |
|---|---|---|---|
| scrmlTS | `149c1ab` (S75 wrap) | 0/0 ✓ | clean |
| scrml-support | `6c281a6` (S75 Insight 28 + voice article) | 0/0 ✓ | clean |

**Inboxes:**
- This repo `handOffs/incoming/`: empty (only `dist` gitignored + `read/` archive)
- Master `handOffs/incoming/`: empty (only `read/`)

**Tests baseline check:** NOT yet run this session. S75 close recorded **10,763 pass / 68 skip / 1 todo / 3 fail** (3 fails are pre-existing env-only self-host parity, not in pre-commit chain).

**Session-start checklist completion:**
- ✅ pa.md read
- ✅ docs/PA-SCRML-PRIMER.md read in full (843 lines, including §13.7 B3-B22 specifics + §13.8 promotion ergonomics)
- ✅ hand-off.md (S75-close content) read
- ✅ scrml-support/user-voice-scrmlTS.md tail read (S67 + S72 — 10+ contentful entries)
- ✅ Cross-machine sync hygiene per pa.md §"Cross-machine sync hygiene" — both repos fetched + verified 0/0
- ✅ Rotation: previous hand-off was already at `handOffs/hand-off-75.md` (other machine atomically wrote both files at S75 wrap); fresh `hand-off.md` created for S76
- ⏸ project-mapper / incremental map refresh — pending user signal (see Open questions)
- ⏸ Test suite baseline run — pending user signal (heavy operation; defer until needed)

---

## Open questions to surface immediately at S76 open

1. **Map refresh.** `.claude/maps/` may be stale post-S75 (75 files changed; A1c codegen surface fully closed; A8 family advanced through A6-4; B14 PASS 10.B + TS state-child fixes touched symbol-table). Run `/map incremental` against the S75-touched file set or full `/map` cold? Or defer until first dev-agent dispatch needs it?

2. **Next priority — pick ONE (substantive S76 progress already CLOSED several from S75 menu):**
   - ~~**A9 Ext 5 (idempotency-key storage) implementation.**~~ **SHIPPED S76 at `41b0764`** (`feat(a9-ext5): SHIP`). Body-split min-viable v0.2.0 closure complete. Single-agent dispatch D0-D8; 18 files changed (+2,540 LOC); 5 new test files (+81 tests); 5 new §34 catalog rows; new Stage 5.5 (Monotonicity Classifier); `idempotency-store=` `<program>` attr; `.idempotent()` modifier. All 8 OQ resolutions honored. 3 in-scope-but-thin deferrals (D1 export-synth modifier propagation, D3 pure-fn-call detection, D5 Redis backend). Tests at HEAD: 10,874 / 60 / 1 / 0.
   - ~~**A8 A6-5 integration tests**~~ — **SHIPPED S76 at `ff1df97`** (`feat(a6-5): SHIP — testMode opt in compileScrml + .test.js writeOutput + end-to-end integration test`). +26 LOC api.js (testMode opt + writeOutput); +280 LOC NEW integration test (5 tests; spawns `bun test` child process on generated test JS; verifies real bun:test execution). **A8 family fully complete: A6-1+A6-2+A6-3+A6-4+A6-5 all ✅.** Bonus codegen bug surfaced: `~{}` test-block body codegen doesn't insert separators between consecutive `let` statements (filed as separate codegen tightening dispatch; documented in test-bind-end-to-end.test.js docblock). A6-6 (optional LSP/CG API design dive) still TBD.
   - ~~**C15 follow-up dispatches.**~~ **ALL SHIPPED S76.**
     - ~~Codegen-side FileAST-shape divergence (§C15.11/§C15.12)~~ — **SHIPPED S76 at `2867beb`** (`feat(c15.11-12): SHIP — wrapper-vs-inner _scope fallback`). One-line root-cause fix: walker reads `fileAST._scope` but SYM attaches to inner `fileAST.ast._scope`; fallback chain mirrors existing `nodes` pattern. C15 suite 37/37 / 0 skip.
     - ~~MOD re-export engine-category fall-through (§C15.13)~~ — **SHIPPED S76 at `22b6806`** (`feat(c15.13): SHIP — MOD re-export resolution in buildExportRegistry`). Two-pass `buildExportRegistry`: pass 1 stamps + carries internal `_reExportSource`/`_localName`; pass 2 inherits source kind/category/isComponent to fixed-point with cycle-bounded iteration cap; pass 3 strips internal fields. +8 unit tests + §C15.13 unskipped. p3-follow isComponent budget bumped 8→11.
   - **A5 family follow-on (S67-ratified engine extensions, deferred A5-5/A5-6/A5-7):** A5-5 computed-delay impl (~1.5-2.5h); A5-6 Item G B-shakeable timer extensions (~5-10h optional); A5-7 tests + samples (~12-18h).
   - **A9 Ext 5 follow-ups (3 in-scope-but-thin, deferred to follow-up):**
     - D1 export-synth modifier propagation — `export function foo().idempotent()` synthesized shadow node doesn't carry `idempotentModifier` flag through; modifier text preserved in raw export emission so no production breakage today; surface if friction.
     - D3 pure-fn-call detection in classifier — over-emits keys (sound but wasteful); needs threading `functionIndex` through analyzer.
     - D5 Redis backend inlining — stubbed in `runtime/idempotency.js`; SQL backend covers default-resolution; add when adopter explicitly uses `idempotency-store="redis"`.
   - **Insight 28 follow-up OQs (3 standing post-S76 audit):** OQ-bridge-3 (§53.2.1 grammar list audit — currently COLLIDES with A9 Ext 5 agent's SPEC.md edits; defer until agent lands), OQ-bridge-5 (compile-time WARNING when bridged validator on schema-column field — defer to compiler-diagnostics audit), OQ-bridge-2 (re-debate trigger on ≥3 adopter friction reports — passive). **OQ-bridge-4 RESOLVED clean S76 (2026-05-09):** `validate.scrml` audit found zero `server { }` blocks; wider `grep -rn "server {" stdlib/` returned only the documentary comment at `stdlib/crypto/index.scrml:140` recording the historical safeCompare fix. No follow-up code change. Recorded in `scrml-support/design-insights.md` Insight 28 OQ-bridge-4 line.

3. **Articles thread (4 untracked → 5 with run-anywhere/run-forever S75).** Per pa.md Rule 1, no PA-volunteered marketing work; await user-raised threads. (5 in-flight drafts at `scrml-support/voice/articles/`.)

4. **Master inbox carry-overs (still 3 legacy/superseded — safe-to-ignore unless user wants sweep):**
   - `2026-04-22-scrmlTS-to-master-insight-25-multi-meta.md` (UNREAD legacy, S30s era)
   - `2026-05-08-S72-scrmlTS-to-master-needs-push-SUPERSEDED.md` (renamed, master-push retired)
   - `2026-05-08-S71-scrmlTS-to-master-stage-scrml-dev-pipeline.md` (UNREAD, deprioritized; pipeline-substitution clean across 25+ dispatches)

5. **9 worktree branches retained from S75 in `.claude/worktrees/`** plus 1 new from S76 (`worktree-agent-aa1100371152a25fb` for A9 Ext 5 dispatch) — forensic per S67 protocol; not cleanup priority.

---

## Things S76 PA must NOT screw up (from S75 close — items 181-198 verbatim-anchor)

S75 close §"Things S76 PA must NOT screw up" carries forward verbatim. The full S70-S75 cumulative list (items 113-198) is in `handOffs/hand-off-75.md`. **Critical S75 newcomers worth front-loading:**

- 181. **A1c is FULLY CLOSED.** Don't dispatch C0-C23 work. Runtime-behavior bug = A1c integration gap or separate phase, not A1c do-over.
- 182. **C19 was already-shipped-S59.** Grep-before-dispatch rule reinforced — `git log --all --oneline -200 | grep -iE '<step-keywords>'` before issuing any phase-step dispatch.
- 184. **C16 deliberately SKIPPED `runtime/zones.js`.** Trusted-zone elision is v0.3.0; static-zone is compile-time only; no runtime zones.js client exists. Don't manufacture.
- 185. **C16 deferred Loci 5-6** (bare-expr reassignment + reactive-nested-assign). Typer-stage gap. B-series follow-up.
- 187. **C18 used custom branch name (`agent/c18-channel-ws-emission`).** Future PA: when harness-assigned branch shows no commits, look for custom branches.
- 191. **C23 PIPELINE.md re-flowed all 7 v0.next addenda.** Don't reintroduce addendum-style additions; folding into parent-stage narrative is the standing pattern.
- 196. **Insight 28 amendment is documentation-only.** No code change. The `custom(fn)` slot in `stdlib/data/validate.scrml` ALREADY absorbs the bridge in 5 lines.
- 197. **A9 Ext 5 SURVEY found §47 vs §19.9 spec-anchor reroute.** Read SURVEY before any A9-Ext-5 dispatch.

---

## CWD drift recurring pattern (S75 finding, persistent)

Fired ~4-5 times during S75 file-delta landings (filtering worktree diff stats from main paths; checkout commands operating in worktree CWD instead of main). Recovery: `cd /home/bryan-maclee/scrmlMaster/scrmlTS && <command>` and re-run. Not blocking. Persistent friction.

---

## Push state at S76 open

- scrmlTS: 0/0 sync ✓
- scrml-support: 0/0 sync ✓

---

## Tags

#session-76 #open #s75-pickup-clean #cross-machine-recovery-loss-free #a1c-fully-closed-baseline #a9-ext5-dispatch-ready #a8-a6-5-pending #c15-followups-pending
