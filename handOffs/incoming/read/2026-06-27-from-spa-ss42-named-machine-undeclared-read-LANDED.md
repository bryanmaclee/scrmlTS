# sPA ss42 → PA — re-integration: named-machine undeclared-read (Model 1) — items 1-3 LANDED

**List:** `spa-lists/ss42-named-machine-undeclared-read.md` (Model-1 named-machine undeclared-read; ss39 item-3 post-ruling arc; survey-first).
**Branch:** `spa/ss42` — **tip `acfac754`** (bookkeeping; code+test tip `b2b2d804`). `origin/main...spa/ss42` = `0 5`; 5 commits ahead, no leak. Base `origin/main 7d8b527a`.
**Date:** 2026-06-27. **Status: items 1-3 LANDED, item 4 deferred (per list). 0 parked, 0 dropped.**

## Items

| # | Item | Status | SHA |
|---|------|--------|-----|
| 1 | Corpus sweep + narrow the S192 pre-bind | **landed-on-branch** | `1ab17ce3` |
| 2 | Route match `on=@X` through E-STATE-UNDECLARED walker | **landed-on-branch** | `061d48a7` |
| 3 | Fix W-ENGINE-INITIAL-MISSING misfire | **landed-on-branch** | `60b600fb` |
| — | Regression test (sPA-requested) | landed | `b2b2d804` |
| 4 | Optional unbound-named-machine lint | **deferred — needs own ruling** | — (not built) |

Files: `compiler/src/type-system.ts` (+87), `compiler/src/symbol-table.ts` (+16/-1), new `compiler/tests/unit/named-machine-undeclared-read-ss42.test.js` (+270). One dispatch (scrml-js-codegen-engineer, opus). True full `bun test compiler/tests/` = **25519 pass / 0 fail**. No M6.5.b.0 allowlist rebaseline (0 within-node shift).

## ⚠ READ FIRST — item-1 discriminator was CORRECTED vs the list's literal wording

The list (and my brief) said "narrow the pre-bind to **derived-only** (§51.9)." The agent **empirically proved that is wrong** and would REGRESS non-named `<engine for=Type>` §51.0.C auto-cells (`@phaseTag`, `@orderStatus`, …) — the `:11314` pre-bind is the SOLE typer scope-binding for those cells, so a derived-only narrow false-fires `E-STATE-UNDECLARED` on `machine-basic.scrml` / `engine-modern-001-basic.scrml`.

**Landed discriminator (SPEC-correct):** skip the pre-bind ONLY for **NAMED non-derived** machines — `machine.hadNameAttr === true && machine.isDerived !== true`. KEEP it for (i) §51.9 derived/projection machines and (ii) non-named `<engine for=Type>` engines. Grounded in §51.0.B (`name=` does NOT source an auto-var) vs §51.0.C (`for=Type` DOES auto-derive `@phaseTag`). New `MachineType.hadNameAttr` threaded from `engine-decl.hadNameAttr` through all 5 `registry.set` sites in `buildMachineRegistry`. This is the cookbook-vs-empirical class (S124) — the list's framing conflated §51.0.C auto-derive with §51.9 derived. The landed behavior satisfies the list's ACCEPTANCE exactly; only the implementation framing differs.

## What landed (per item)
- **Item 1 (`1ab17ce3`):** the narrow above. **Sweep = ~0 blast radius** — compiled corpus + flogence adopter clean (the one `name=` corpus hit is in a comment); 17 test fixtures referenced named machines but **0 newly-fired, 0 migrations**.
- **Item 2 (`061d48a7`):** routed match `on=@X` through the read-side walker — implemented in the typer's `match-block` case (NOT `emit-match.ts`; the diagnostic belongs in the typer), via `parseExprToNode` → `checkLogicExprIdents` with `@.`/bare-variant/`${}`-wrapper guards. `<match on=@totallyUndeclared>` now fires; declared `@var` still resolves.
- **Item 3 (`60b600fb`):** `symbol-table.ts` ~6360 W-condition gained `&& hadNameAttr !== true && legacyMachineKeyword !== true` (§51.3 named + `<machine>`-keyword arrow forms have zero state-children). NOT over-suppressed — a genuine non-named `<engine for=Phase>` state-child engine missing `initial=` STILL fires.
- **Regression test (`b2b2d804`):** 10 cases, REAL compiled source, cross-stream diagnostic-partition helper. **Non-vacuous** — the agent neutralized the item-1 narrow and confirmed cases 1+2 fail (revert to silent-empty), then restored source clean. sPA re-ran it independently: 10/0.

## sPA verify
- New regression test re-run independently: 10/0. Agent's full `compiler/tests/` 25519/0 (final state). FF-merged the agent's 4 verified commits onto `spa/ss42` (linear, no rebase).
- **The bookkeeping commit (mark-done + progress + BRIEF archival) re-runs the full gate** — see deferred-commit note below.

## Bookkeeping commit — was OOM-gated, now FINALIZED (`acfac754`)
A concurrent sibling sPA (`scrml-spa-ss40`) + its dev agent were grinding full-suite hooks during my landing (free memory 4-5G, below the >6G gate, S219). I deferred the docs bookkeeping commit rather than SIGKILL their work. Memory recovered ~minutes later and I committed it: **`acfac754` (mark-done list + `ss42.progress.md` + BRIEF archival), full pre-commit gate green (0 fail / 18181 tests).** The branch is fully finalized; FF `acfac754`.

## PA actions
- **FF-merge `spa/ss42` (`acfac754`) → main; push.** Clean (`0 5` on current main).
- **ss40 is DISJOINT** from ss42 (ss40 = tailwind/css/ast-builder; ss42 = type-system/symbol-table/emit-match) — despite the list's general "type-system.ts hot file" S211 caution, there is no concrete conflict with the ss40 lane.
- **known-gaps:** if a gap entry tracks the named-machine silent-empty, flip it fixed (Model 1 implemented).
- **Prunable:** agent worktree `agent-a1715789fd1a9c5cf` (its 4 commits are now on `spa/ss42` via FF) + branch `worktree-agent-a1715789fd1a9c5cf`; the ss42 sPA worktree `/home/bryan-maclee/scrmlMaster/scrml-spa-ss42`.
