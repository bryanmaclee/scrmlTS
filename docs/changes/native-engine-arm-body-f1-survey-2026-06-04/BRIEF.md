# F1 (native engine arm-body parse) — Phase-0 SURVEY-STOP brief

**Dispatch:** S163, 2026-06-04. **Agent type:** general-purpose (READ-ONLY survey — NO project-tree edits). **Model:** opus.
**Change-id:** native-engine-arm-body-f1-survey-2026-06-04.

## What this is

This is a **Phase-0 SURVEY-STOP**. You CHARACTERIZE the F1 native-parser failure surface and STOP. You do **NOT** write a fix, do **NOT** edit any source under `compiler/`. Your deliverable is a failure-mode breakdown + root-cause loci + a recommended decomposition, returned as your final report (and written to `docs/changes/native-engine-arm-body-f1-survey-2026-06-04/SURVEY.md` in the MAIN checkout — that is the ONLY file you write).

## Strategic context (read once)

scrmlTS is migrating from the legacy block-splitter (BS) + Acorn front-end to a **scrml-native parser** (`compiler/native-parser/`, opt-in via `--parser=scrml-native`). The strategic line (ratified S161, direction-a): drive the native parser to the default, then delete BS+Acorn at M6. The native parser is the **canonical enforcer**; the live (default BS+TAB) pipeline **tolerates legacy forms** the native parser correctly rejects per current SPEC. A "flip" measure (set `compiler/src/api.js:630` `parser = null` → `parser = "scrml-native"` in a throwaway worktree, run the full suite) currently shows **~790 failures**, triaged S162 into **~6 parser families**. **F1 is the dominant family (~168 failures)** — "engine arm-body parse."

**The F8 precedent (S162 user ruling, your decision-framing anchor):** when native rejects a form the live pipeline tolerates AND native's rejection is SPEC-CORRECT, the resolution is **native stays strict; the corpus is migration backlog** — NOT relax native. (F8: stdlib `await import()` in `^{}` — native correctly forbids `await`; the stdlib migrates off it.) Your job is to determine how much of F1 is THIS shape (spec-correct enforcement → corpus migration + a user ruling) vs. a **real native-parser BUG** (native diverges from SPEC on VALID scrml → PA-fixable).

## PA recon already done (start from this — do NOT rediscover it)

The PA reproduced and characterized two F1 shapes before dispatching you:

1. **Bare display text in an engine state-child arm body → `E-UNQUOTED-DISPLAY-TEXT` (fatal), under native only.** Minimal repro:
   ```scrml
   <engine for=Phase initial=.Idle>
       <Loading rule=.Done>
           Loading...
       </>
       ...
   </>
   ```
   Native fires `error [E-UNQUOTED-DISPLAY-TEXT]: Display text in a code-default body must be a quoted display-text literal. Did you mean "Loading..." ?`. The live pipeline compiles it clean (renders bare text as HTML). **This fire is SPEC-CORRECT per §4.18.7** — engine state-child bodies are code-default bodies (§4.18); a bare run is code; display text MUST be a `"..."` display-text literal. When the same file uses `"Loading..."` (quoted), native compiles it cleanly — **including an `<each>` nested inside an engine arm** (PA verified both). So this sub-mode is NOT a parser bug; it is the §4.18 enforcement asymmetry (live=lenient, native=strict). The `E-UNQUOTED-DISPLAY-TEXT` is itself "spec-ahead-of-implementation" — PRIMER §6.3 + §4.18.7 say the LIVE pipeline never wired the fire (it's "queued, NOT yet emitted"); the native parser DID wire it.

2. **A DIFFERENT failure mode exists.** A sweep of 12 real `samples/compilation-tests/engine-*.scrml` fixtures under native: **all 12 compiled clean** (they use quoted text / markup-only arm bodies). But `examples/14-mario-state-machine.scrml` FAILS under native with `E-SCOPE-001` ×2 + `E-SELF-WRITE-DETECTED` ×4 + `E-SHADOW` ×2 — **NOT** E-UNQUOTED-DISPLAY-TEXT. mario compiles clean under the default pipeline. So at least one F1-attributed file fails for a scope-resolution / self-write reason, which may be a **real native bug** (native diverging from spec on valid scrml).

**Conclusion the PA reached:** F1 is MIXED. Your survey must split the ~168 into the §4.18-enforcement bucket (corpus-migration / user-ruling shape) and the real-native-bug bucket (PA-fixable), and quantify each.

## Your survey tasks

### Phase-0 setup (startup)
1. `cd /home/bryan-maclee/scrmlMaster/scrmlTS && pwd && git rev-parse --abbrev-ref HEAD` — confirm you are in the MAIN checkout on `main` at HEAD `c3303adc` (or later). You are NOT in a worktree (this is a read-only survey).
2. Read `.claude/maps/primary.map.md` in full (just refreshed to HEAD this session). The §"Task-Shape Routing → parser / grammar fix (native-parser)" section + the "Native-Parser File Table (S162)" in `structure.map.md` name the F1 loci. Map currency: HEAD is `c3303adc` as of 2026-06-04; maps reflect it.
3. Read SPEC normative sources (pa.md Rule 4 — SPEC is normative): **§4.18** (code-default body mode + display-text literal + §4.18.7 E-UNQUOTED-DISPLAY-TEXT), **§51.0.A/B/I** (engine state-child bodies are code-default), **§51.0.F.1** (idempotent self-write — `W-ENGINE-SELF-WRITE-DETECTED` is an INFO lint, NOT fatal — relevant to the mario `E-SELF-WRITE-DETECTED` finding). Use `compiler/SPEC-INDEX.md` to navigate.
4. Read the F1 loci: `compiler/native-parser/parse-state-body.js` (235L — engine/db/schema state-child classification: `tagKindFor`, `ENGINE_FORM_KEYWORDS`, `isStateBlock`), `compiler/native-parser/parse-markup.js` (markup-classification + the E-UNQUOTED-DISPLAY-TEXT fire path), `compiler/native-parser/display-text-literal.js`, and the scope-resolution path that produces `E-SCOPE-001` / self-write handling that produces `E-SELF-WRITE-DETECTED` under native.

### The characterization (the deliverable)
5. **Build the F1-attributed failing-file list.** Enumerate engine-bearing corpus files (`grep -rln "<engine" compiler/tests samples examples`), compile each under `--parser=scrml-native` (`bun compiler/bin/scrml.js compile <file> --output-dir /tmp/f1-<n> --parser=scrml-native`), and record which FAIL + the fatal error code(s). Note: the authoritative ~168 count comes from the full flip-suite; you may approximate via the per-file corpus compile (lighter) — state which method you used and the count you measured. (If you run the full flip harness in a throwaway worktree, clean it up: `git worktree remove --force` + `git worktree prune`. Do NOT leave worktrees.)
6. **Categorize every failure into buckets:**
   - **(A) §4.18-enforcement (spec-correct; corpus-migration / user-ruling shape):** `E-UNQUOTED-DISPLAY-TEXT` on bare display text in an engine state-child arm body where the live pipeline tolerates it and the native fire is correct per §4.18.7. Count these. Note the migration shape (bare text → `"..."` literal).
   - **(B) Real native-parser BUG (native diverges from SPEC on VALID scrml — PA-fixable):** anything where native fails on a file the SPEC says is valid AND the live pipeline handles correctly. The mario `E-SCOPE-001` / `E-SELF-WRITE-DETECTED`-as-fatal is the lead candidate — characterize its root cause (is native mis-resolving an arm-body scope? Is it firing a self-write lint as fatal when §51.0.F.1 says it's an info no-op? Is it dropping arm content?). Count + root-cause-locus each distinct bug shape.
   - **(C) Other / uncertain:** anything that doesn't cleanly fit A or B; flag for PA.
7. **For bucket (A):** confirm the live pipeline does NOT fire E-UNQUOTED-DISPLAY-TEXT (PA confirmed on one repro — verify the general claim) and that §4.18 Wave-2+ live-enforcement was never wired. State whether migrating the corpus would ALSO require turning on live-enforcement (so the corpus migrates once for both pipelines) or whether live stays lenient (asymmetry). This is the design-ruling fork the PA will take to the user.
8. **For bucket (B):** give a fix decomposition — which native-parser file(s), which function(s), approximate size, and whether each is independent or coupled. Distinguish "small localized fix" from "L-sized rework."

### STOP + report
9. **STOP. Do NOT fix anything.** Write your findings to `docs/changes/native-engine-arm-body-f1-survey-2026-06-04/SURVEY.md` (MAIN checkout, absolute path `/home/bryan-maclee/scrmlMaster/scrmlTS/docs/changes/native-engine-arm-body-f1-survey-2026-06-04/SURVEY.md`) AND return the same as your final report. Structure:
   - **Bucket counts:** (A) §4.18-enforcement = N_A files; (B) real-bug = N_B files across M distinct bug shapes; (C) other = N_C. (Plus the total measured + method.)
   - **Bucket (A) — the user-ruling fork:** the migration shape + scope + the live-enforcement sub-question.
   - **Bucket (B) — the fix decomposition:** per-bug-shape root-cause locus + size + coupling.
   - **Recommendation:** does F1 resolve mostly as a ruling (escalate to user) or mostly as a fix (dispatch codegen-engineer), or both? What is the right ORDER (e.g., get the §4.18 ruling first because it determines whether bucket-A files even need fixing)?

## Discipline
- **READ-ONLY.** Edit NOTHING under `compiler/`. The ONLY file you create is `SURVEY.md` in the change dir.
- **No `cd` into other repos.** Stay in `/home/bryan-maclee/scrmlMaster/scrmlTS`.
- **SPEC is normative (pa.md Rule 4).** When native behavior contradicts a stated SPEC rule on VALID scrml, that's a BUG (bucket B); when native enforces a SPEC rule the live pipeline merely hasn't wired yet, that's enforcement-asymmetry (bucket A). Don't soft-classify — if native drops valid content, say BUG.
- If you run a throwaway worktree for the flip harness, CLEAN IT UP before reporting.
- Report honestly if a bucket is larger or smaller than the PA's "mixed" hypothesis predicted — that is exactly the signal the PA needs.
