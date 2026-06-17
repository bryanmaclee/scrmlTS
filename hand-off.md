# scrml — Session 200 (CLOSE — WRAPPED via the SECOND live baton-pass)

**Date:** 2026-06-16.
**Previous:** `handOffs/hand-off-204.md` (S199 CLOSE — the first live baton-pass; rotated here at S200 wrap).
**Next-session pickup:** rotate THIS file → `handOffs/hand-off-205.md` at next OPEN.
**Profile:** A — FULL.
**Repo:** **`scrml`** (the working TS compiler — renamed FROM `scrmlTS` this session; the dormant self-host repo is now `scrml-native`). `origin = git@github.com:bryanmaclee/scrml.git`.

**Closed via the SECOND live baton-pass.** The S200 session booted COLD (a fresh PA in `/…/scrml` post-switchover — the S199 delta-log [19] "next boot is a fresh PA, not a vPA absorption" reader), did the rename Phase-3 + the `<each>` compile-chain fixes un-logged, then re-seeded `handOffs/delta-log.md` with Session 200 [1]–[8] + a baton entry and stood down. A warm vPA (booted mid-session off `vpa.md`) absorbed the delta-log through the baton entry **[8]**, assumed PA authority, and ran this 8-step wrap **WARM**. This fat hand-off persists for cold-start safety + audit; the delta-log is what the next vPA absorbs.

---

## Session-close state (verified)
- **HEAD:** `wrap(s200)` (this wrap commit). Substantive S200 landings: rename sweep `efe74909` (scrml) · `<each>` STEP 1 `60ace8b4` · STEP 2 A+B `ecba9fee` · C1+C2 `39bd061f` · docs/file-gap `64f189b7` · delta-log+baton `f22a169c`. (Cross-repo rename: scrml-native `9c87b86` · scrml-support `0f52df5`.)
- **Sync:** scrml pushed (pre-wrap was 0/0 at `f22a169c`; the wrap commit + maps follow-on ride this push). scrml-support 0/0. scrml-native pushed at rename. All 3 repos clean.
- **Board:** **HIGH 3 · MED 11 · LOW 20 · Nominal 8** (unchanged count from S199 close: S200 RESOLVED 2 HIGH [`g-each-component-body-invalid-js` + `g-each-peritem-if-predicate-not-lowered`] and FILED 1 HIGH [`g-nested-component-member-arg-misparse`]; the peritem-if gap was filed+resolved same session).
- **Tests:** full suite **24,386 / 0** (at the C1+C2 landing `39bd061f`); pre-commit subset **17,128 / 90 / 0** (live `bun scripts/state.ts`). No compiler source changed after `39bd061f` (docs/delta-log/wrap are docs-only) → full suite unchanged through close; pre-push hook is the gate.
- **Maps:** refreshed in the wrap's follow-on maps commit (was stale at `76d03aa9`, 9 commits behind HEAD) via `project-mapper` incremental on the S200 source surface (`compiler/src/codegen/emit-each.ts` + `compiler/src/component-expander.ts` + predicate-codegen). See delta-log [10].
- **Inbox:** empty. **Worktrees:** main only (S200 `fix(ce)`/`fix(codegen)` dispatch worktrees already 6b-cleaned).
- **Experts staged** (`~/.claude/agents/`): `xstate-expert` · `elm-architecture-expert` · `threejs-webgl-integration-expert`.
- **Version:** v0.7.0.

---

## What landed S200 (detail)

**1. Repo rename `scrmlTS`→`scrml`, self-host `scrml`→`scrml-native` (`efe74909` + cross-repo; pushed).**
Administrative rename, no compiler/source behavior change. The working compiler takes the public canonical name **`scrml`**; the dormant self-host repo becomes **`scrml-native`**. Phase 1 (GitHub renames — old URLs auto-redirect) + Phase 2 (local dir renames + `git remote set-url` ×2 + memory-slug re-key `-scrmlTS`→`-scrml` + S100 hook `sed`) done via `RENAME-S200-switchover.sh` (user ran it from a terminal outside the session). Phase 3 SURGICAL content sweep across 3 repos: scrml `efe74909` · scrml-native `9c87b86` (fixed a broken `build-self-host.js` import `../scrmlTS`→`../scrml`) · scrml-support `0f52df5` (`git mv` 4 sidecars `pa-scrmlTS.md`→`pa-scrml.md` etc. + body sweep + resource-mapper regen). **Forward-looking current-truth swept; historical records preserved verbatim** (changelog/hand-off/user-voice/deep-dives/design-insights/archived briefs correctly retain "scrmlTS" as the name-at-that-time). Full suite green across the move (24,372/0). giti/6nz/master notified of the rename via their inboxes. ~/.claude agents + hook edits done with user "go" (self-mod classifier). Plan + target list: `docs/changes/s200-repo-rename/SCOPING.md`.

**2. The `<each>` compile-chain — 4 bugs, board `<each>` now COMPILES end-to-end.**
A wrong prior diagnosis was corrected: the `<each>`-over-component-list did NOT "render correctly while only the structural form compiled" — the for-lift form *only compiled*, with inlined component helper **calls** surviving into the client bundle **unbound** (latent silently-swallowed runtime `ReferenceError` in EVERY shipped component-with-helper, incl. the flagship board). Chain:
- **STEP 1 `60ace8b4`** — CE augments the consumer's existing import with the inlined module's non-component (helper) exports → binds inlined helper calls corpus-wide + fixes `<each>` `E-SCOPE-001` for DIRECT component children. +browser regression; 24,372/0.
- **STEP 2 A+B `ecba9fee`** — **(A)** transitive helper import (synthesize consumer import + `importGraph` edge for transitively-inlined modules the consumer never imports; inject into a logic block for TS scope + `ast.imports`/`importGraph` for codegen); **(B)** expression-valued nested-prop substitution (`s=fmt(n)`). **`g-each-component-body-invalid-js` component-body core RESOLVED.** 24,377/0.
- **C1+C2 `39bd061f`** — per-item each codegen (text-based emitter) now **(C1)** lowers `is some`/`is not`/`not` predicates via new `lowerEachExpr` (`parseExprToNode`→`emitExprField`, guarded) + **(C2)** supports `if=` conditionals (lower predicate, GATE `appendChild`, re-eval per render). **`g-each-peritem-if-predicate-not-lowered` RESOLVED.** Board `<each>` compiles end-to-end. +browser regression (5/5 fail pre-fix); 24,386/0.
- **`64f189b7` (docs)** — filed the remaining board-RENDER blocker `g-nested-component-member-arg-misparse` (HIGH) + state-regen.

**3. Delta-log re-seed + baton (`f22a169c`, pushed).** The cold S200 session was un-logged; this commit wrote Session 200 delta-log [1]–[8] + the baton entry, handing the wrap to the warm vPA.

---

## ⏭️ OPEN THREADS / NEXT PRIORITIES

1. **3 open HIGH gaps** — the remaining high-value scrml-correctness work (delicate BS/codegen, fresh-arc-shaped per the repeated-crash + S140 PA-direct-during-instability lessons):
   - `g-nested-component-member-arg-misparse` (**HIGH**, NEW S200) — **the last board-RENDER blocker.** A member-access ARG to a NESTED component (`<Badge s=row.name/>` / `status=load.status`) mishandles `.field` (`E-COMPONENT-011` phantom-attr split / member dropped → `statusLabel(l)` not `statusLabel(l.status)`) + the inlined component-root class-attr interpolation emits raw. Pre-existing (for-lift has it too); ISOLATED (direct member-prop USE works). Closing this finishes the board `<each>` conversion render-side (compile is already done).
   - `g-markup-value-ternary-fnreturn-codegen` (**HIGH**, pre-existing S197) — markup-as-value (Pillar 1) fails to codegen in 3 forms (inline ternary `${c ? <a/> : <b/>}` · derived-cell ternary · `fn f() -> markup { return <m/> }`). Blocks the deferred `32-markup-as-value` example.
   - `g-each-body-bare-variant-arg` (**HIGH**, pre-existing) — `emit-each.ts`, non-blocking.
2. **The g-each chain status:** component-body (STEP1 + STEP2 A+B) + predicate/`if=` (C1+C2) DONE; `g-nested-component-member-arg-misparse` is the remaining board-render blocker. Closing it + reverting/landing the board `<each>` conversion completes the trucking board flagship.
3. **flogeance / MPA** — the vPA workflow REFRAMED → Master PA Orchestrator; a 6-DD slate is authored in `flogeance/docs/ideas.md`. flogeance is **LOCAL-ONLY** (commit `d846fec`, no remote — user adds it). flogeance is where the user discusses remaining workflow ideas (more not yet shared). The PA↔vPA system is now LIVE + proven across TWO consecutive baton-passes (S199 + S200).
4. **Trucking corpus rewrite continues** (the S193 "show real scrml" arc): slices 2–5 — decl-coupled validators · `<each>` sweep (now unblocked compile-side) · errors-as-states · typed props.

## Carried backlog (lower priority)
- Wave-3 deferred `32-markup-as-value` (blocked on `g-markup-value-ternary-fnreturn-codegen` HIGH).
- `g-colon-shorthand-markup-misparse` (MED, S199) — BS `:`-shorthand-markup mis-parse → misleading `E-STRUCTURAL-ELEMENT-MISPLACED`.
- Gauntlet measurement; value-native map §59 phase-c build (Nominal); the broader §59/Nominal-spec-ahead slate (8 Nominal entries).

---

## The vPA / flogeance workflow — LIVE, 2 baton-passes proven (orientation for the next vPA)
The model (see `scrml-support/vpa-scrml.md` + `handOffs/delta-log.md` header): the vPA boots ONCE (full PA-style start, overlapped with PA productivity), then stays current by absorbing the PA's `delta-log` on poke (NOT re-reading docs), and **takes the baton** when the PA nears wrap. Rolling baton: vPA → PA → (fresh) vPA. **Single-writer rule:** only the LIVE PA commits/appends-to-delta-log; the vPA is read-only until the baton-pass. The delta-log is ephemeral-per-baton-cycle, raw-stream-only, and WINS over this hand-off on conflict (the hand-off only rewrites at wrap). **S200 process note:** the cold S200 boot ran un-logged (it was the S199 [19] "fresh PA" reader), then properly re-seeded the delta-log [1]–[8] + baton BEFORE standing down — so the warm vPA took a *complete* baton off the stream. The lesson: a cold session that finds itself handing to a warm vPA must catch up the delta-log first. (NOTE: no separate user-voice "Session 200" entry was appended — S200 was execution-heavy [rename + bug fixes]; the durable content is the rename ratification (already in S199 user-voice) + the delta-log [1]–[8].)

## pa.md directives in force
R1–R5 · `---` delimiter · Profile A · S88 isolation-explicit · S99/S126 path-discipline · S112 merge-main · S136 BRIEF.md archival · S138 R26 dual-verify · S147 coherence (`rev-list --left-right` + branch-tip==FINAL_SHA) · S180 waiting-time 3-tier · S198 wrap-calibration + context-economics (warm-marginal) + partner-not-list + within-node-allowlist brief-template fix · S199 baton-pass (PA side: delta-log is PA single-writer; baton vs cold-wrap; 5-step handoff) · wrap 8-step (incl. 6b worktree-clean + 6c maps + 6d state-regen).

## Tags
#session-200 #close #wrapped #second-live-baton-pass #repo-renamed-scrmlTS-to-scrml #each-compile-chain #board-high-3-med-11 #flogeance-mpa
