# scrmlTS — Session 109 (CLOSE)

**Date:** 2026-05-19 → 2026-05-20
**Previous:** `handOffs/hand-off-111.md` (S108 CLOSE — rotated at S109 OPEN)
**Machine:** single-machine (S100 directive holds)
**HEAD at S109 OPEN:** `df1211d` (S108 wrap)
**HEAD at S109 CLOSE (pre-wrap):** `cd326ce` (bare-variant inference SCOPING)
**HEAD at S109 CLOSE (post-wrap):** `<wrap-sha>` (this wrap commit)
**Origin sync at CLOSE:** scrmlTS pushed through `3f27d3a`; `cd326ce` + wrap commit pending push at wrap step 7.

---

## S109 net outcome — 18 substantive commits + 1 wrap

Session opened at "maps refresh + caught up"; user authorized "(a) then (b)" → "ship Fix A, then keep going down the list, afk" → "go" → "push it then phase 5" → "push it and scope bare-variant inference" → "wrap." Net: **18 substantive commits**, **3 dogfood/Phase-5 bugs found + fixed**, **2 vacuous tests found + fixed**, **match block-form genuinely end-to-end functional for the first time**, **1 SCOPING authored**.

Tests at HEAD `cd326ce`:
- **pre-commit subset:** 13,362 pass / 88 skip / 1 todo / 0 fail / 694 files / 44,898 expect
- **full `bun test compiler/tests/`:** 16,213 pass / 169 skip / 1 todo / 0 fail / 728 files / 47,333 expect
- Delta vs S108 close (full 16,147 / 723 / 47,209): **+66 pass / +5 files / +124 expect / 0 fail / 0 regressions**

## S109 commit ledger (18 substantive + 1 wrap)

| # | Commit | What |
|---|---|---|
| 1 | `6005993` | chore(s109-open) maps refresh (8 maps) + hand-off rotation |
| 2 | `204b563` | feat(bug-2) C-narrow — markup-text mode does NOT track string state (SPEC §3.1+§8.1) |
| 3 | `21f14d3` | docs(known-gaps) Bug 2 SHIPPED rotation |
| 4 | `6d69534` | feat(tailwind-arbitrary) Bug 1 partial closure — ring-[length\|color\|var\|keyword] |
| 5 | `3c1b897` | docs(known-gaps) Bug 1 ring rotation |
| 6 | `3609985` | feat(builtin-types) date + timestamp as first-class primitives (tableFor v1.next #6) |
| 7 | `1c4469c` | docs(benchmarks) S109 refresh — bundle 21.5 KB + build 36.7 ms |
| 8 | `07904b9` | fix(test) builtin-types test was vacuous (compileScrml signature misuse) |
| 9 | `2691b20` | feat(match-block) Phase 5 wildcard `<_>` explicit render + full-pipeline integration gap fix |
| 10 | `e8ba2f7` | docs(known-gaps) match block-form Phase 5 rotation |
| 11 | `0d2e988` | chore(s109) hand-off update — 10-commit AFK log |
| 12 | `dc4b562` | fix(test) sql-nobatch §8 test was vacuous (2nd vacuous test, pre-existing) |
| 13 | `7d8ae42` | chore(s109) hand-off touch-up |
| — | **PUSH** | `df1211d..7d8ae42` (13 commits); pre-push gate 16,198 pass / 0 fail + TodoMVC PASS |
| 14 | `9b9f1d2` | fix(match-block) Phase 5 — payload-bearing enums fired spurious E-MATCH-NOT-EXHAUSTIVE |
| 15 | `0780bc1` | test(match-block) Phase 5 — sample + browser test for runtime arm-swap |
| 16 | `531a235` | chore(s109) hand-off update — Phase 5 progress |
| 17 | `3f27d3a` | fix(test) browser-conditionals — 3 stale "logic span present" assertions |
| — | **PUSH** | `7d8ae42..3f27d3a` (4 commits); pre-push gate 16,213 pass / 0 fail + TodoMVC PASS |
| 18 | `cd326ce` | docs(scoping) bare-variant inference in nested expression positions |
| 19 | `<wrap-sha>` | this wrap commit |

**Push state at CLOSE:** origin at `3f27d3a`; `cd326ce` + wrap commit need a final push (wrap step 7).

## S109 substantive work — detail

### Bug fixes (5 — 3 compiler bugs + 2 vacuous tests)

1. **Bug 2 — phantom E-SYNTAX-050 cascade (`204b563`).** Adopter dogfood report. Bisecting reducer found the reporter's hypothesis (multi-line `<a>` + entity-encoded body) was WRONG — the real trigger is *any unpaired `'` or `"` in markup-text body* (`<code>X</code>'s`, `text "with quotes`). Root cause: `block-splitter.js:1059-1095` ran global string-mode tracking in markup-text mode; an unpaired quote ate the rest of the file → `</p>` (and every closer) missed → unclosed-element cascade with wrong line numbers. Fix: removed the markup-text-level quote-tracking block (sibling locus argument to Bug 4 C-narrow S108 — strings are Logic-context, not markup-text). 17 new tests. Documented regression class: rare `paired-quote-/<X-quote` shape now fires E-SYNTAX-050; entity-escape workaround.

2. **Match block-form full-pipeline integration gap (`2691b20`).** **Match block-form had never worked in a real compile.** `collectMatchBlocks` + `findEngineVarForType` walked `fileAST.nodes` but the pipeline passes an outer wrapper with nodes under `fileAST.ast.nodes` → real compiles found 0 match-blocks → the dispatcher was never emitted (`emitMatchMountHtml` still emitted the mount slot since it receives the node directly, so a compile produced a mount `<div>` with nothing behind it). The S108 Phase 3/4 unit tests passed because they call the codegen helper with the bare AST. Fix mirrors `emit-engine.ts:collectC12EngineDecls` dual-shape handling. The S107-S108 "end-to-end functional" framing was overclaimed; now genuinely true + corrected in known-gaps.md.

3. **Payload-bearing enum exhaustiveness (`9b9f1d2`).** `extractEnumVariants` checked `s[pos] === "("` immediately after a variant name, but the enum type-decl's `raw` is tokenizer-JOINED (`Ready ( count : int )` with spaces). The payload-skip never fired → `count` + `int` read as phantom variants → every payload-bearing enum in a `<match>` block hard-failed E-MATCH-NOT-EXHAUSTIVE. Fixed: skip whitespace before the `(` probe. Side finding: the hand-off's "payload-binding typer scope" Phase 5 item was a NON-ISSUE masked by this — payload bindings thread correctly once the false error is gone.

4. **builtin-types vacuous test (`07904b9`).** The S109 `3609985` test file called `compileScrml(filePath, opts)` with a string first-arg — a silent no-op (`fileCount: 0`). Every `expect(errors).toEqual([])` passed vacuously. Fixed: canonical `compileScrml({ inputFiles, … })` + `fileCount > 0` guard. date/timestamp feature verified correct via real compile.

5. **sql-nobatch §8 vacuous test (`dc4b562`).** A SECOND vacuous-compileScrml test, PRE-EXISTING (predates S109), found via a grep sweep after #4. Same misuse + a stale `result.serverJs`-shape assumption. Fixed. Grep sweep confirmed NO remaining string-first-arg call sites in `compiler/tests/`.

### Features shipped (3)

- **Bug 1 ring family partial closure (`6d69534`).** `ring-[length|color|var|keyword]` arbitrary-value Tailwind emit — single-property `box-shadow` with kind-dispatch (length → currentColor; color/var/keyword → 3px default width). ring-offset + gradient still deferred (need preflight CSS infrastructure — documented).
- **date/timestamp BUILTIN_TYPES (`3609985`).** Formalized as `tPrimitive` (tableFor v1.next item #6). emit-table-for.ts + emit-schema-for.ts extended with the `date` case.
- **Match block-form Phase 5 wildcard `<_>` explicit render (`2691b20`).** `emit-variant-guard.ts` gained `defaultArmTag`; the wildcard arm emits as the dispatcher's catch-all `else { ... }` branch.

### Maps + benchmarks + tests + scoping

- **Maps refresh (`6005993`)** — 8 maps regenerated; watermark `6616a69` → `df1211d` era.
- **Benchmarks refresh (`1c4469c`)** — RESULTS.md: build −44% vs v0.3.0 STABLE (PGO Phase 3); bundle +5.8 KB JS (real feature runtime). Stale-dist measurement artifact caught + fixed.
- **Match-block sample + browser test (`0780bc1`)** — NEW `match-002-block-form-arm-swap.scrml` + `browser-match-block.test.js` (6 happy-dom arm-swap tests). End-to-end runtime proof.
- **bare-variant inference SCOPING (`cd326ce`)** — `docs/changes/bare-variant-inference-nested/SCOPING.md`. Two spurious-error gaps isolated (array-literal elements + ternary-in-fn-param). ~3-4h dispatch, no debate needed.

## Match block-form Phase 5 — status at CLOSE

| Item | Status |
|---|---|
| Wildcard `<_>` explicit render | ✅ `2691b20` |
| Full-pipeline integration gap (collectMatchBlocks) | ✅ `2691b20` |
| Payload-bearing enum exhaustiveness | ✅ `9b9f1d2` |
| Payload-binding typer scope | ✅ NON-ISSUE (was masked by the exhaustiveness bug) |
| Samples | ✅ `0780bc1` (match-002) |
| Browser test for runtime arm-swap | ✅ `0780bc1` (6 tests) |
| Bare-variant inference in nested positions | 🟡 SCOPED `cd326ce` — ready-to-dispatch (~3-4h) |
| PRIMER match-block section refresh | ⏸️ NOT DONE — PRIMER has no dedicated match-block walkthrough |

Match block-form is now genuinely end-to-end functional + runtime-verified. 6 of 8 Phase 5 items done; 1 scoped-ready, 1 docs item open.

## State-as-of-CLOSE

| Item | Status |
|---|---|
| Tests pre-commit subset | 13,362 / 88 / 1 / 0 fail / 694 files / 44,898 expect |
| Tests full suite | 16,213 / 169 / 1 / 0 fail / 728 files / 47,333 expect |
| Test delta from S108 | +66 pass / +5 files / +124 expect / 0 fail / 0 regressions |
| Worktree list | main only (`/tmp/s109-bisect` throwaway cleaned at wrap) |
| Origin sync (scrmlTS) | pushed through `3f27d3a`; `cd326ce` + wrap commit PENDING (wrap step 7) |
| Origin sync (scrml-support) | NOT pushed — see "untracked deep-dive" below |
| Inbox `handOffs/incoming/` | empty |
| Path-discipline hook | active (Configuration B — pre-commit + post-commit + pre-push) |
| pkg.json version | 0.3.3 (unchanged — no release cut this session) |
| Maps watermark | refreshed S109 OPEN; 18 commits behind HEAD `cd326ce`. **S110 session-start MUST refresh before any dev-agent dispatch.** |
| docs/known-gaps.md | rotated 3× (Bug 2 closed, Bug 1 ring partial, match block-form Phase 5) |

## Open questions to surface immediately (S110)

1. **`cd326ce` + the wrap commit are unpushed.** Push at wrap step 7 (user authorized push throughout S109).
2. **scrml-support `docs/deep-dives/bug-4-docs-mode-escape-2026-05-19.md` is STILL untracked** in the scrml-support working tree — an S108 deep-dive that appears never to have been committed. Carried forward unresolved S108→S109. Surface for a decision: commit it to scrml-support, or confirm it's intentionally local-only.
3. **Bare-variant inference fix is scoped + ready.** `docs/changes/bare-variant-inference-nested/SCOPING.md` — ~3-4h PA-direct dispatch, no debate needed. Top S110 candidate.

## Carry-forwards for S110

### High-value, ready
- **Bare-variant inference nested-positions fix** — SCOPED (`cd326ce`); ~3-4h; A1 array element-type unwrap + B1 recursive skip-stamp + probe-matrix tests + optional SPEC §14.10 example bullet.
- **PRIMER match-block section** — match block-form is now fully functional; PRIMER has no dedicated walkthrough. Docs work; load-bearing for dev-agent dispatches.

### Mid-tier (need design / scoping)
- **Bug 1 ring-offset + gradient** — blocked on preflight CSS emission infrastructure (a real new subsystem — `*, ::before, ::after` custom-property defaults). Needs scoping.
- **tableFor v1.next — 5 items remain** (date/timestamp #6 shipped S109): §41.16.7 sort-state explicit decl · §41.16.8 SELECTABLE-CELL-WRONG-TYPE strict-mode · §41.16.10 positional column slots · §17.4a for/else codegen · inline event handler arrow-param.
- **formFor v1.next B2-B4** — registerRenderer / `@label` annotation / auto-recurse nested struct (~8-15h aggregate; each needs a design decision).
- **variantNames** — next L22 family member; full 4-gate walk (sliver + synonym-detection + asymmetric-forfeit-cost) required first.

### Larger
- **Native parser M2 expression parser** — ~2-4 sessions.
- **Self-host bootstrap broken-import** — S102 carry; unaddressed S103-S109; investigation-first.

### Light (cleanup)
- Maps refresh required again BEFORE any dev-agent dispatch S110 (18 commits behind watermark).
- Build benchmarks refreshed S109 — current.

### Marketing-shaped (per pa.md Rule 1 — DEFER unless raised)
- Match block-form full Tier-1 closure narrative ("we shipped the language design + the integration gap + the dogfood loop validated it").
- L22 family roster narrative; v0.4 announce content.

## Things S110 PA must NOT screw up

In addition to S96-S108 carry-forwards:

- **Maps refresh BEFORE any dev-agent dispatch** — 18 commits behind watermark.
- **Match block-form `collectMatchBlocks` / `findEngineVarForType` dual-shape** — both now accept `fileAST.ast?.nodes`. If S110 touches emit-match.ts node-walkers, preserve the dual-shape fallback (the S109 `2691b20` comment block explains why). The full-compile integration tests at `match-block-phase5-wildcard.test.js §INTEGRATION` + `browser-match-block.test.js` are the regression guard.
- **`compileScrml` takes a SINGLE options object** — `compileScrml(stringPath)` is a silent no-op. Two vacuous tests were found + fixed S109; any NEW full-compile test MUST use `compileScrml({ inputFiles: [...], … })` + assert `fileCount > 0`.
- **Browser tests read pre-compiled `samples/compilation-tests/dist/`** — `dist/` goes stale until `bun run pretest` recompiles. The S109 stale-test incident (3 browser-conditionals assertions on pre-S108 behavior) was masked for sessions because dist/ wasn't recompiled. When a sample's codegen changes, the dist-consuming browser tests can silently run stale — re-run `bun run pretest` + the browser suite.
- **`extractEnumVariants` operates on tokenizer-JOINED `raw`** — spaces around parens (`Ready ( count : int )`). Any future variant-list parsing must skip whitespace before structural-char probes.
- **Hook gate is Configuration B** — `--no-verify` is the S88 process-violation surface; never bypass without explicit authorization.

## Session-start checklist for S110 PA

1. Read `pa.md` pointer → `../scrml-support/pa-scrmlTS.md` IN FULL
2. Read `docs/PA-SCRML-PRIMER.md` IN FULL (note: still has no dedicated match-block section — Phase 5 carry-forward)
3. Read `compiler/SPEC-INDEX.md` IN FULL — no NEW SPEC sections this session; §3.1/§8.1 (Bug 2 locus) + §14.10/§18.0.3 (bare-variant — SCOPING references) are the S109-relevant anchors
4. Read `master-list.md` §0 LIVE DASHBOARD IN FULL — note S109 CLOSE addendum at top
5. Read this `hand-off.md` (S109 CLOSE) — rotate to `handOffs/hand-off-112.md` at S110 OPEN
6. Read last ~10 contentful user-voice entries — **no new durable user-voice directives this session**
7. Sync hygiene: `git fetch origin && git rev-list --left-right --count origin/main...HEAD` should be 0/0 after the wrap push
8. Inbox check — `handOffs/incoming/*.md` empty
9. Verify worktrees — `git worktree list` shows main only
10. Verify hook gate — Configuration B (`.git/hooks/` pre-commit + post-commit + pre-push)
11. **Maps refresh** — 18 commits behind; refresh BEFORE any dev-agent dispatch
12. Surface the 3 open questions above (unpushed commits resolved by wrap push; scrml-support untracked deep-dive; bare-variant fix ready-to-dispatch)
13. Report: caught up + next priority

## Tags

#session-109 #CLOSE #18-commits #+66-pass #pre-commit-13362 #full-suite-16213 #bug-2-c-narrow #bug-1-ring-partial #date-timestamp-builtins #match-block-phase-5 #match-integration-gap-fixed #payload-enum-exhaustiveness #two-vacuous-tests-fixed #bare-variant-inference-scoped #zero-regressions
