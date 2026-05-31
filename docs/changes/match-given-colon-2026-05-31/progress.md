# progress — match-given-colon-2026-05-31 (S148, standalone `given` guard `:>` canonical)

Worktree base: 09f74bee (session-start) → merged main (5b24c46f) to pick up s148 SPEC core
(W-GIVEN-ARROW-LEGACY §42.2.3 + §34 row). pwd: .claude/worktrees/agent-a22404aa65fd74463.

## 2026-05-31 — Step 1 (parser) DONE
- ast-builder.js: both standalone given-guard parse sites (parseLogicBody ~5788 return-form
  + ~9963 nodes.push-form) now record `separatorGlyph: ":>" | "=>"` on the given-guard node.
  `:>` canonical, `=>` deprecated alias — both single OPERATOR tokens; isMatchArrow accepts
  either (unchanged). Default ":>" when no separator present (defensive). Mirrors S147 armArrow.
- E-SYNTAX-043 (old `(x) =>` form) + E-SYNTAX-044 (property-path in given) code paths
  byte-untouched (diff scoped to the 2 given-guard sites only). E-SYNTAX-044 verified firing.
- Coupled within-node parity rebump (S125): the new `separatorGlyph` field is LIVE-AHEAD of the
  native parser → +1 MISSING-FIELD per given fixture. Bumped 6 fixture budgets in
  parser-conformance-within-node-allowlist.json (phase2 087/088/090, phase3 094/095/096).
  within-node 1005/0.
- AST probe confirms: `given x :> {}` → sep ":>", `given x => {}` → sep "=>",
  `given x, y :> {}` multi → sep ":>". In-match `given x => ...` STILL parses to a given-guard
  node (sep "=>") — must NOT fire W-GIVEN-ARROW-LEGACY (Step 2 scoping concern).

## NEXT — Step 2 (lint W-GIVEN-ARROW-LEGACY), Step 3 (migrate --fix), Step 4 (tests), Step 5 (gate)
- KEY scoping finding: in-match given arm produces a given-guard node in the match body.
  W-GIVEN-ARROW-LEGACY must be STANDALONE-only; suppress on given-guards that are direct
  children of a match body (mark during match-stmt walk).

## 2026-05-31 — Step 2 (lint W-GIVEN-ARROW-LEGACY) DONE
- type-system.ts: givenArrowLegacyMessage helper (mirrors matchArrowLegacyMessage);
  new visitNode `case "given-guard"` fires W-GIVEN-ARROW-LEGACY (info severity → warnings)
  when separatorGlyph === "=>" AND not __inMatchBody. Walks guard body (replaces default
  recursion). match-stmt case marks direct given-guard children __inMatchBody=true before
  walking → in-match given fires W-MATCH-ARROW-LEGACY only (no double-fire).
- VERIFIED via probe: standalone `given x =>` fires 1x (warnings stream, errors=0);
  `given x :>` 0; `given x, y =>` multi 1x; JS arrow `(x) => x` 0; in-match all-`:>` 0/0.
  No cross-contamination W-GIVEN vs W-MATCH.

## 2026-05-31 — Step 3 (migrate --fix) DONE
- migrate.js: rewriteGivenGuardArrows (exported) — AST-driven, walks given-guard nodes with
  separatorGlyph === "=>", finds the first `=>` at/after span.start (identifier-list has no
  `=>`), splices `:>` right-to-left with byte-check fail-safe. Wired into the --fix block
  (Step 1c, runs post arm-arrow rewrite). migrations.givenGuardArrow count reported separately
  (totalGivenGuardArrow: decl + accumulation + summary line "given-guard `:>` migrations: N").
  Help text + --fix flag description extended.
- NOT in-match-scoped (intentional): an in-match given arm is a given-guard node whose `=>`
  separator SHALL also become `:>` (§42.2.3); the lint in-match suppression is lint-only.
- VERIFIED via probe: standalone `given x =>` → `given x :>` byte-exact, count 1, idempotent;
  `given x :>` no-op; lambdas `(x) => x*2` / `nums.map((y) => y+1)` untouched (count 0);
  mixed given+lambda rewrites only the guard; multi-var `given x, y =>` → `given x, y :>`.

## 2026-05-31 — Step 4 (tests) DONE
- compiler/tests/unit/given-arrow-colon-canonical-s148.test.js — 19 tests, all pass:
  §A separatorGlyph preservation (:> / => , single + multi); §B W-GIVEN-ARROW-LEGACY
  firing scope (=> fires info 1x; :> 0; multi-=> 1x; JS arrow 0; partition warnings/errors);
  §C no cross-contam (in-match given => fires W-MATCH not W-GIVEN; all-:> neither);
  §D migrate precision (rewrite byte-exact; lambda untouched; multi; no-op; idempotent;
  post-rewrite zero-lint); §E codegen-identical (clientJs + serverJs byte-equal for =>/:>).
