# S154 ruling (b) — inside-opener `:`-shorthand canonical EVERYWHERE (deprecate after-`>`)

## Progress log (append-only, timestamped)

- 2026-06-03: START at worktree agent-a2fe1059bbcb9c033, base d0d66d3e (merged main ff from f9d4b0f1).
  Startup verification clean: bun install OK, pretest OK, baseline 15765 pass / 89 skip / 1 todo / 0 fail.
  Next: read authoritative spec-drafts (DRAFT rev2 + REVIEW) before any editing.

- 2026-06-03 (step 2): READ authoritative drafts (DRAFT rev2 + REVIEW) IN FULL. Re-derived current
  SPEC line numbers (post-S160(c) landing, total 31521):
    §4.14: 963-1042 (already inside-opener canonical; needs after-:-ws note + after-> deprecation note + markup-arm note)
    §51.0.I: 24873-; def line 24875 ("MAY use <tag attrs> : expr"), table row 24886 — REWRITE both
    §51.0.B Mario: 24139-24148; prose ref 24100 — MIGRATE
    §18.0.1: 10880-; bullet 10937, syntax 10889-10892, display-text ex 10907-10910 — REWRITE bullet + migrate
    §34: W-MATCH-ARROW-LEGACY row at 16522 (template); insert new W-row after W-GIVEN-ARROW-LEGACY (16523)
    after-> space arms (>\s+:\s): 10889-92,10907-10,10915,10937,10956-57,10962-63,11002-05,11023,24100,24143-46,24459-60,24515-16,24542-45,24804-09,24875,24886,30488-90
    no-space >: arms: 8086-88,24205-08,24226-27,24241,25065-67,25072
  D4 EXCEPTION: leave 10891-92 (Ready/Failed markup-as-value bodies) BARE-BODY — do NOT migrate to </ul>>/</p>> tail.
    NOTE: 10891-92 are <Ready(rows)> : <ul>... and <Failed(msg)> : <p>... — markup bodies, leave bare-body.

- 2026-06-03 (step 3): VERIFY-NOT-ASSERT (R26 reverse) — ALL confirmed via parser-direct probes:
    engine parser (parseEngineStateChildren): after-> (space AND no-space >:) parses today w/ isColonShorthand=true;
      INSIDE-OPENER produces NO entries today (findStateChildCloser finds no closer -> malformed skip). CONFIRMED legacy-TS = after-> only.
    match parser (parseMatchArms): after-> parses (bodyForm shorthand); INSIDE-OPENER -> E-MATCH-PARSE-001. CONFIRMED.
    isColonShorthandOpener (1513) ALREADY detects inside-opener `:` (string/paren/brace-aware, ws-precedence) but is used
      ONLY by closer-finders to skip the push — NOT by parseEngineStateChildren body-extraction. findOpenerEnd (1436) is string-aware,
      returns FINAL `>`.
    W-MATCH-ARROW-LEGACY emission: symbol-table.ts:6495, type-system.ts:6520 (mirror pattern).
    migrate.js: rewriteMatchArmArrows (194/223) AST-driven, wired at migrateFile step 1b (2094); rewriteGivenGuardArrows sibling.
  Next: land SPEC amendments first (self-contained), then impl + coupled tests.

- 2026-06-03 (step 4): SPEC + SPEC-INDEX committed (6c4c82f1, gate passed).
- 2026-06-03 (step 5): COMPILER-SOURCE IMPL:
    engine-statechild-parser.ts: NEW findInsideOpenerColonPos (isColonShorthandOpener delegates);
      parseEngineStateChildren splits opener at inside-: into attr-region + body; findOpenerEnd gains
      angleDepth (nested markup-as-value body `>` no longer truncates). legacyColonPlacement on after-> entries.
    match-statechild-parser.ts: scanOpenerAttrs detects inside-: -> scanToOpenerClose (string/${}/angleDepth);
      NEW inside-opener shorthand push; legacyColonPlacement:true on after-> push. MatchArmEntry +field.
    symbol-table.ts: EngineStateChildEntry +legacyColonPlacement; validateEngineStateChildrenAndRules +
      W-COLON-SHORTHAND-LEGACY-PLACEMENT emission (info); validateMatchBlock per-arm W-emission.
    migrate.js: NEW rewriteColonShorthandPlacement (AST-driven, body-isolated, string/angleDepth-aware) +
      rewriteColonPlacementInBody helper; wired migrateFile step 1d; totals + help text.
  VERIFY: parser probes all green (inside parses, after-> legacy flag, worst-case string opaque, after-:-ws
    optional, payload before :, markup-as-value angleDepth, self-close/bare-body unaffected).
  E2E (match): inside compiles clean; after-> fires W-lint x3; client JS BYTE-IDENTICAL (normalized). node --check PASS.
  PRE-EXISTING (NOT my change, confirmed via stash): after-> ENGINE form fails E2E at block-splitter
    (E-STRUCTURAL-ELEMENT-MISPLACED) — after-> engine never worked E2E; inside-opener engine now DOES.
  PRE-EXISTING (NOT my change): `<span :@thing />` (/> + shorthand) fires E-DG-002 not E-CLOSER-001 (HTML path,
    S159); ruling (b) says "no change" to /> handling -> surfaced in NOTES, NOT fixed (out of scope).
  Tests: 26 pass (colon-shorthand-inside-opener-s154b.test.js). engine/match/colon suite 135 pass. commands 156 pass.
  Next: full pre-commit gate, commit impl+tests coupled, then R26 + SPEC-conformance check.

- 2026-06-03 (step 6): gate caught m66-b2-engine-statechild-walker dual-walk parity test —
  legacy parseEngineStateChildren now sets legacyColonPlacement on every entry; native walker
  lacked it -> toEqual structural-parity fail. FIX: native walker emits legacyColonPlacement:false
  (native is inside-opener-only, never legacy). 474 entry-related tests green. Re-running full gate.

- 2026-06-03 (step 7 — DONE): impl+test committed (62d6a267, full gate passed).
  PHASE 3 R26 EMPIRICAL VERIFICATION COMPLETE:
    Real match block (4 arms, display-text + ${@count} interpolation), compiled both INSIDE-opener
    and after-> forms through the full pipeline:
      - INSIDE: 0 real errors. AFTER: 0 real errors + W-COLON-SHORTHAND-LEGACY-PLACEMENT x4.
      - client JS BYTE-IDENTICAL (normalized) between the two forms — AST-identity + zero-codegen CONFIRMED.
      - node --check exit 0 on the INSIDE emitted JS.
  Final gate (unit+integration+conformance): 15791 pass / 89 skip / 1 todo / 0 fail (+26 = new test file).
  Baseline was 15765 pass. Zero regressions.
  Commits: 8f6b6f3f (WIP) -> 6c4c82f1 (SPEC) -> 62d6a267 (impl+test).
  DEFERRED (surfaced, NOT fixed — out of scope per ruling (b) "no change" to /> handling):
    - `<span :@thing />` (/> + :-shorthand) fires E-DG-002, NOT E-CLOSER-001 as §4.14 line 982 specifies.
      PRE-EXISTING (confirmed via stash, unchanged by this dispatch). HTML-element S159 path. Surface to PA.
    - after-> ENGINE form fails E2E at block-splitter (E-STRUCTURAL-ELEMENT-MISPLACED) — PRE-EXISTING;
      after-> engine never worked E2E. The inside-opener engine form now DOES work E2E (net improvement).
      The engine W-lint fires only when after-> body text reaches parseEngineStateChildren (match locus
      proven E2E; engine after-> doesn't survive block-splitting, so engine W-lint is parser-verified not E2E).
