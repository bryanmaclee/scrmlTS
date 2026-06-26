# sPA ss21 — re-integration (render + expression codegen)

**From:** sPA ss21 · **To:** PA · **Date:** 2026-06-25 1902
**List:** `spa-lists/ss21-render-expr-codegen.md` · **Branch:** `spa/ss21` · **Tip SHA:** `760254a9`
**Base:** `9ac06830` (your s221 boot bookkeeping, atop `cf9f1109`==origin/main; contains ss20 `8a0e9e3d`). spa/ss21 = base + 5 fix commits, clean linear. Divergence vs origin/main = `0 6` (the 6 = your 9ac06830 + my 5 fixes) → clean merge.

## End state: ALL 5 items landed. NONE fully parked (item 4 is partial — Bug A landed, Bug B parser-level parked).

| # | Item | Tier | Landed SHA | Disposition |
|---|---|---|---|---|
| 1 | g-request-lift-bare-if-condition | LOW | `808bc135` | FIXED (locus → emit-reactive-wiring.ts) |
| 2 | g-tablefor-column-slot-literal-interp | MED | `0d78b7ec` | FIXED (locus → emit-table-for.ts) + r28 test strengthened |
| 3 | g-if-chain-branch-display-null-interp | MED | `6f06044d` | FIXED (extends ss20 item-1 gate) |
| 4 | g-unary-left-of-exponent-no-paren | MED | `b85d9795` | **PARTIAL** — Bug A FIXED; Bug B parked (parser-level) |
| 5 | g-errors-anchor-not-reactively-clearing | MED | `760254a9` | FIXED (Option B; runtime untouched) |

Per-item BRIEF.md under `docs/changes/ss21-*-2026-06-25/`.

## Per-item detail + LOCUS REFINEMENTS (the PA footprints were close but off on 3 items)

**Item 1** — locus is **emit-reactive-wiring.ts** (the reactive-dep detector), NOT emit-lift.js. The detector only recognized `_scrml_reactive_get(...)`, not a deep-reactive `_scrml_request_<id>` member read, so the bare-if lift group fell into the non-reactive branch → the `if` ran once at module-init, frozen. Fix: treat a whole-token `_scrml_request_<id>` read (id in requestIds) as a reactive dep → `_scrml_effect`-wrapped. Test 4/0.

**Item 2** — locus is **emit-table-for.ts** (the dedicated tableFor emitter), NOT emit-lift.js. A `<column>` slot delivers its `<code>${@row.name}</code>` as a RAW markup TEXT child (unlike top-level inline markup, which the parser splits) → emit-lift rendered it literally. Fix: `splitTableForTextInterp` + `rewriteAtDotInNodeExpand` (the ss17 each-body split prior art) iter-scope-lowering `@row.field`. **Also strengthened the masked test** `r28-bug-2-tablefor-column-row-access.test.js` (the lone `toContain("row.name")` passed on the literal `${@row.name}` substring; added `not.toContain("${@row.name}")`). Browser 12/0, r28 6/0.

**Item 3** — extended the ss20 item-1 display gate (`computeDisplayToggleCondition` + `ifGuardStack` + `ifGuard` LogicBinding) to the `if-chain-branch`/`if-chain-else` node kinds, gating descendant interp effects on each branch's own visibility predicate (lockstep). Single-`if=`/`show=`/clean-subtree untouched. Browser 13/0.

**Item 4 — PARTIAL (read this).** The brief conflated TWO bugs:
- **Bug A — FIXED.** `(-@a) ** 2` (parenthesized): acorn drops the source parens → `binaryOperandNeedsParens` returned false for a unary left operand of `**` → emitted the invalid flat `-… ** 2`. Added a precise `**`-left-unary case to `binaryOperandNeedsParens` (emit-expr.ts) AND the twin `emitStringFromTree` (expression-parser.ts — precedented by the g-paren-ternary fix touching both). Excludes ++/-- update bases. Full S215 matrix green; 23 tests; suite 25246/0.
- **Bug B — PARKED → PA (parser-level decision).** The list's literal repro `-@a ** 2` (UNparenthesized) is an acorn PARSE ERROR → `rewriteReactiveRefs` falls back to a precedence-blind REGEX that emits invalid `- _scrml_reactive_get("a") ** 2`. Needs a parser-level decision: ACCEPT `-@a**2` as `(-@a)**2`, or REJECT with a clean diagnostic. NOT a `binaryOperandNeedsParens` change.

**Item 5** — **Option B** (errors emitter). The `<errors of=>` anchor subscribed its render to the DERIVED `.errors` cell via `_scrml_reactive_subscribe`, which never fires for derived cells (they fan out only via `_scrml_trigger`/effects). Wrapped `render_<suffix>()` in `_scrml_effect` (auto-tracks the derived read). Rejected Option A (make derived recompute fire `_scrml_subscribers` — a load-bearing runtime-template.js change, broad blast radius). runtime-template.js NOT touched (no re-baseline needed). Edited only the errors-element region → clean auto-merge with item-3's if-chain region. c11 locked tests updated; RED 4/0→GREEN 4/0.

## Deferred findings (PA decides follow-ons)
1. **Bug B (item 4)** — `-@a ** 2` unparenthesized: parse-error → regex-fallback invalid JS. **VERIFIED behavior:** a REAL `scrml build` FAILS LOUDLY (`E-CODEGEN-INVALID-JS`, exit 1) — so the original "LOUD" framing holds and it is NOT a silent-ship gate gap (the item-4 agent's `write:false` probe not flagging it was a write:false-path artifact). BUT the diagnostic self-blames ("the compiler emitted JavaScript it cannot itself parse") instead of naming the cause — a parser-level accept-or-reject fix should also improve this diagnostic (cf. don't-soft-classify-bugs).
2. **double-unary-minus emit (item 4)** — `Unary(-, Unary(-, a))` serializes as `--a` (decrement token) in BOTH emit-expr `emitUnary` + `emitStringFromTree`; invalid JS for a numeric arg (`--3`). Separate pre-existing emitUnary bug.

## Verification
- Each of the 5 landings passed the full pre-commit blocking gate on the integrated branch.
- Integrated browser sweep on spa/ss21: **275 pass / 0 fail across 36 files** (the 3 new browser tests + ss20 if-guard + each/lift/markup/errors/form/tablefor regressions). c11 errors locked tests 35/0. ss20 `computeDisplayToggleCondition` intact.
- Branch coherence: tip `760254a9`, base+5 linear, tree clean.

## Process notes (this wave was infra-rough — all recovered)
- **Weekly usage limit hit** mid-run (resets 7am America/Denver). It cut off the item-2 re-dispatch agent. No further agent dispatches after that; sPA finished landing/verifying directly (local hooks are not model-limited).
- **3 of 6 agent runs had infra failures, all recovered via the partial-recovery protocol:**
  - items-1+2 combined agent **disconnected** (API connection-closed, classifier down) AFTER committing item 1, before item 2 → salvaged item 1, re-dispatched item 2.
  - item-3 agent **stalled** (600s watchdog) on a redundant POST-commit suite run, AFTER committing → salvaged + self-verified (13/0).
  - item-2 re-dispatch agent **cut off by the weekly limit** BEFORE committing (uncommitted staged work) → sPA backed up + salvaged the 2 files (base parity verified) + did the r28 test-strengthen **sPA-direct** (the agent never reached it).
  - Where the classifier was unavailable, I self-verified each salvaged item by running its tests (1→4/0, 2→12/0+6/0, 3→13/0) rather than trusting the self-report.
- **S112 base-currency applied** this wave (the lesson I missed on ss20): every brief had a `git merge origin/main` + `8a0e9e3d`-ancestor startup step. Agents branched from origin/main == base; no staleness.
- **Scratchpad-race discipline applied** (S220 memory): briefs mandated unique per-agent commit-message filenames.
- spa/ss21 unexpectedly carries your local `9ac06830` bookkeeping commit as its base+1 (harmless — it's your own sPA-list-rebuild, touches none of my files; already on local main).

## Cleanup (PA-owned)
Redundant agent worktree branches (all landed/salvaged): `worktree-agent-{a7a52bbf12519eeb7 (item1), a436243badf723eba (item3), a15445ee85b14b2ed (item4), a9689fe31eb466fe6 (item5)}`; `worktree-agent-a202e3d4eabc12b08` (item2 — UNcommitted, salvaged via file-copy, branch ref still at cf9f1109) + the sPA worktree `../scrml-spa-ss21`. Safe to prune after you merge `spa/ss21`. Item-2's salvaged files are also backed up at the session scratchpad `item2-salvage/`.

— sPA ss21, standing down.
