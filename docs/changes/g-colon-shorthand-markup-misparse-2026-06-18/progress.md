# g-colon-shorthand-markup-misparse — progress

## 2026-06-18 — startup + SPEC ruling
- Worktree verified, bun install + pretest done. Full-suite baseline green (17252 tests).
- SPEC ruling (Rule 4): markup-as-value IS valid as a `:`-shorthand single-expression body.
  - §4.14:985 — "markup-as-value (cross-ref §1.4) are all legal as the single-expression body"
  - §4.14:1029 worked engine example: `<Loading rule=... : <p>Loading...</>>`
  - §4.14:990 — "The `angleDepth` rule (§4.13) applies inside the expression — embedded markup is handled by tracking angle depth"
  - §51.0.I:25826 — state-child `:`-shorthand is a code-default single expression incl. "nested tags (markup-as-value)"
  - §18.0.1:11213-11216 — match-arm `:`-shorthand same; after-`>` placement parses IDENTICALLY (W-COLON-SHORTHAND-LEGACY-PLACEMENT only)
  - "Prefer bare-body for multi-element markup arms" is a DOC NOTE (preference), NOT a prohibition. Single-element markup shown as valid.
- FIX DIRECTION: (a) — teach block-splitter to disambiguate the opener `>` from markup-body tags via §4.13 angleDepth.

## Root cause
- block-splitter `scanAttributes` tracked brace/paren/bracket/ternary depth but NOT angle depth inside a `:`-shorthand body.
- Documented gap in scanAttributes header comment (lines 928-933): "Embedded markup-as-value inside the shorthand body ... is NOT handled".
- Symptom: `<Loading : <p>x</p>>` truncated body at inner `<p>`'s `>`; engine/match body shredded; E-CTX-001 cascade (inside-opener) or whole-engine-dissolves-to-text + E-STRUCTURAL-ELEMENT-MISPLACED + E-VARIANT-AMBIGUOUS cascade (after-`>`).

## Step 1 — inside-opener `:`-shorthand markup body (DONE)
- Added `shorthandAngleDepth` to scanAttributes; §4.13 increment on `<[A-Za-z/]`, decrement on `>` / `/>` while depth>0, gated on `shorthand===true`.
- repro-inside-markup.scrml now compiles exit 0. repro-barebody still clean.
- NEXT: after-`>` deprecated placement (different recognition path) still dissolves to text.

## Step 2 — after-`>` deprecated placement (engine locus) (DONE)
- ROOT (deeper than brief framed): `engine`/`machine` were MISSING from COMPOUND_LIFT_EXEMPT_TAGS.
  - `<engine>` at top level → classifyOpenerForCompoundScan saw the engine as "compound" (post-`>` newline+ident),
    then the after-`>` child `<Idle rule=.Done> :` → the `:` after the child's `>` classified as "state-decl" (line ~1823),
    so peekCompoundStateDeclSignal fired → scanCompoundBlockEnd grabbed the whole engine as opaque text → EOF-dissolved
    → misleading E-STRUCTURAL-ELEMENT-MISPLACED on `<engine>` (engine never became a block) + bare-variant cascade.
  - This is why even the after-`>` DISPLAY-TEXT (non-markup) form failed identically — body content was irrelevant; the
    compound-lift mis-classification was the trigger.
- FIX: added `engine` + `machine` to COMPOUND_LIFT_EXEMPT_TAGS (exact parallel to the match/each exemption — engine is a
  Tier-2 structural container per §4.15/§51.0, not a compound state-decl). Now BS falls through to the markup-opener path.
- ADDED (belt-and-suspenders for the main-loop path): tryConsumeAfterCloseColonShorthand() + topIsEngineBody() scope guard +
  after-`>` leaf-emit branches in both the no-space markup/component opener path and the whitespace-state opener path. An
  after-`>` `:`-shorthand state-child is now a self-terminating leaf (no context push), captured verbatim for the
  engine-statechild-parser re-parse + W-COLON-SHORTHAND-LEGACY-PLACEMENT.
- VERIFIED: after-markup / after-text / after-min all compile exit 0 + fire W-COLON-SHORTHAND-LEGACY-PLACEMENT per state-child.
  inside-opener (markup + non-markup) still clean. bare-body still clean. match after-> (text+markup) still clean.
  GENUINE E-STRUCTURAL (real <engine> in ${} logic) STILL fires. E-COLON-SHORTHAND-ON-VOID + E-CLOSER-001 intact.

## Step 3 — minimize isComponent footprint + regression test + gap flip (DONE)
- P3-FOLLOW isComponent-budget test bailed on the first (duplicate-leaf-emit) approach (+3 isComponent occurrences > budget 28).
  REFACTORED: replaced the two duplicate after-`>` leaf-emit blocks with `afterCloseColon`/`stateAfterCloseColon` flags merged
  into the EXISTING shorthand-leaf branches (reuses existing `isComponent:` stamps → net ZERO new isComponent occurrences; diff
  shows no +/- isComponent lines). brief: "do NOT edit the allowlist — PA owns it"; honored — minimized footprint instead.
- Regression test: compiler/tests/unit/g-colon-shorthand-markup-misparse.test.js (12 tests, all pass) — §1 BS inside-opener
  shorthand-leaf shape, §2 BS after-`>` no-dissolve + shorthand-leaf + non-markup, §3 E2E compile (inside clean / after-`>` lint×3 /
  bare-body / inside-non-markup), §4 no-over-relax (genuine E-STRUCTURAL + E-COLON-SHORTHAND-ON-VOID + E-CLOSER-001).
- Adjacent suites green: colon-shorthand-inside-opener-s154b, engine-statechild-colon-shorthand-child, each-colon-shorthand-r25-bug-40,
  closer-on-shorthand-body-e-closer-001-bug74, block-splitter, p3-follow-no-isComponent-routing, engine-statechild-b15 (273/0).
- known-gaps.md: gap flipped open→resolved + full resolution note (SPEC ruling §4.14:985/:990/:1029 + §51.0.I:25826 + §18.0.1:11216,
  fix direction (a), root = block-splitter angleDepth + compound-lift-exemption, NOT the ast-builder E-STRUCTURAL symptom).
  state.ts --write regenerated gap-counts (MED 10→9); --check PASS.
