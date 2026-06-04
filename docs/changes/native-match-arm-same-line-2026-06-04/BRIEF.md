# TASK — native parser: same-line match-arm boundary detection (swap family F3)  ·  change-id: `native-match-arm-same-line-2026-06-04`

> **Archived dispatch brief (S136).** Verbatim `prompt:` to `scrml-js-codegen-engineer` (isolation:worktree, opus, background), S162 2026-06-04. First swap-grind fix after the #2f arc closed. Family F3 (~44 flip-fails) from the swap-grind triage (agent `a754f880bccfc1a97`). Phase-0-STOP gated. Base: main `e5b673dc`.

---

Native-parser-swap parity work. The native parser can parse NEWLINE-separated match arms but NOT SAME-LINE space-separated arms — `const <label> = match @phase { .Idle => "idle" .Busy => "busy" }` fires `E-EXPR-MATCH-PATTERN` + a cascade. The legacy BS+Acorn path parses it correctly. ~44 flip-failures (blocks Bug 71/67 derived/return `match` exhaustiveness, match-arm-inline, member-access-match-narrows — all fail because the native parser never produces the match AST those parser-agnostic downstream passes consume).

**PHASE-0 SURVEY-STOP GATE — survey the boundary-detection design; if NOT a clean mechanical extension, STOP and report before the heavy edit.**

## ROOT CAUSE (triage — verify)
`parse-expr.js`: `parseMatchExpr` (~L2617), `parseMatchArm` (~L2682), `isAtArmBoundary` (~L2980, used ~L992 + ~L2724). Comment ~L2724: boundary stops "at a **newline**-then-arm-pattern boundary" → arm-body termination is NEWLINE-based. Same-line arms have no newline, so the arm-body expr parser consumes the next arm's pattern.

## FIX DIRECTION
Extend arm-boundary detection so a match-arm body terminates at a SAME-LINE next-arm-pattern too, for `=>` / `:>` / legacy `->`. Legacy parses same-line arms; match it. NO codegen/SPEC change (same-line ≡ newline → same AST → identical JS).

## ⚠️ DESIGN SUBTLETY (the Phase-0 gate reason)
Arm body = ONE expression. After it completes, distinguish new-arm from continuation:
- `.Idle => "idle" .Busy => ...` — `.Busy` (uppercase variant at brace-level, followed by an arrow) STARTS A NEW ARM.
- `.A => obj.field` — `.field` (lowercase member access) is a CONTINUATION, not a new arm.
- `else` / `_` / `given x` at brace-level start arms.
- Nested braces/parens/match/object-literal must NOT be mis-read (track depth).
Disambiguation likely: arm pattern = `.UppercaseVariant` / `::Variant` / `else` / `_` / `given <ident>` at the match's brace-depth, followed by an arm arrow. Lowercase `.ident` = member access. **Clean local extension of `isAtArmBoundary` → PROCEED. Touches broad expr parsing / risks mis-classifying member-access/object-literals/nested-match / needs a design call → STOP + report.**

## SCOPE
- `parse-expr.js` (+ `.scrml` mirror — S115 lockstep) + tests ONLY.
- NOT in scope (separate follow-up): `if (c) { lift x } else { lift y }` in EXPRESSION position — NOTE it, do NOT fix (different production).
- NO codegen/emit/SPEC. STOP+report if it needs any.

## MAPS — REQUIRED FIRST READ
`.claude/maps/primary.map.md` (~100L) + `structure.map.md` (native-parser §). Maps reflect `9f01f6cd`; main `e5b673dc`. Feedback line required.

## STARTUP (F4 + S112 + S90 + S99/S126)
WORKTREE_ROOT = `pwd` (MUST start `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-`, else STOP). `git -C "$WORKTREE_ROOT" rev-parse --show-toplevel`==WORKTREE_ROOT. **S112:** `git -C "$WORKTREE_ROOT" merge --ff-only main` (base must contain `e5b673dc`; verify; report if ff impossible). status clean. `bun install`. `bun run pretest`. ABSOLUTE worktree paths; **Bash-edit (S126)**; NEVER `cd` into main; first commit msg includes `pwd`.

## COMMIT DISCIPLINE (S83)
Commit per step; progress.md each step; `git status` clean before DONE; NEVER `--no-verify`.

## PHASE 0 — SURVEY + STOP-OR-PROCEED
Read the parse loci; reproduce same-line `=>`/`:>` + newline/member-access/nested-match/object-literal controls `--parser=scrml-native`; write the approach + controls into progress.md; DECISION: clean → PROCEED; non-trivial/broad/design-call → STOP + report (no resume here; PA re-dispatches).

## PHASE 2 — FIX (if greenlit) — extend `isAtArmBoundary` + arm-loop; mirror `.scrml`.

## PHASE 3 — R26 (S138 MANDATORY)
Both parsers on: same-line `=>`, same-line `:>`, newline (control), `const <x> = match`, `return match`, member-access arm body (`.A => obj.field` — no regress), nested-match-in-arm, object-literal-in-arm, `else`/`_`. Same-line arms parse + match AST byte-identical/id-offset-equiv to default; controls unchanged; `node --check` clean. Per-fixture verdict.

## WITHIN-NODE (S125): run the parity test; rebump allowlist if changed (REDUCTIONS expected); report delta/direction.
## TEST GATE: new conformance tests (same-line arms parse + controls don't regress); full pre-commit 0 fail; report counts.

## FINAL REPORT: maps feedback; WORKTREE_PATH/FINAL_SHA/branch/FILES_TOUCHED; Phase-0 verdict + approach; Phase-3 per-fixture (incl controls); within-node delta; test counts + 0-regression; the if-as-expr follow-up note; surprises; `git status` clean.

Scope: parse-expr.js (+.scrml) + tests ONLY. NO codegen/SPEC. STOP-and-report if more.
