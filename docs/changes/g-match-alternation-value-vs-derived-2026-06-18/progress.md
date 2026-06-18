# g-match-alternation-value-vs-derived-2026-06-18 — progress

Append-only progress log.

## 2026-06-18 — startup + SPEC ruling
- Worktree: /home/bryan-maclee/scrmlMaster/scrml/.claude/worktrees/agent-a634857265ed2b578
- Startup verification PASS (pwd, toplevel, clean tree, bun install, bun run pretest).
- Maps: read primary.map.md; bug-fix routing → type-system.ts parseArmPattern (parser/typer) + emit-control-flow.ts emitMatchExpr (value-return codegen) / emit-match.ts (block-form).
- SPEC ruling (Rule 4):
  - §18.2 grammar production `match-arm ::= arm-pattern (':>'|'=>'|'->') arm-body`; `variant-pattern ::= ('.'|'::') VariantName ('(' binding-list ')')?` — does NOT formally list a `|`-alternation production (SPEC text gap).
  - §51.0.J (line 25851-25854) NORMATIVE worked example uses `<engine for=Health derived=match @marioState { .Small | .Big => .Healthy ... }>` — a JS-style match expression with `.A | .B` variant-pattern alternation arms.
  - kickstarter v2 §4.10 (line 552-555) teaches the SAME form `.Small | .Big :> .Healthy` as a JS-style match block.
  - §18.10 E-SYNTAX-011 excludes GUARD clauses (`if cond` / `| cond` where cond is a boolean) — NOT variant-pattern alternation.
  - RULING: variant-pattern alternation `.A | .B :> v` IS canonically valid in JS-style value-return match (per §51.0.J normative example + kickstarter §4.10). The value-return path MIS-rejects it as a guard. Fix the parser/typer/codegen.
- Empirical confirmation:
  - value-return `const <s> = match @m { .Small | .Big :> "alive" .Dead :> "dead" }` → E-SYNTAX-011 (WRONG).
  - `derived=match @mario { .Small | .Big :> .Healthy ... }` → compiles clean (correct).

## 2026-06-18 — fix landed
- Root cause: the bug was NOT just the typer guard-misclassification the brief located. THREE coupled seams:
  1. ast-builder.js collectExpr S27 arm-boundary (~3470): a `.Variant =>` immediately after a top-level `|` was treated as a NEW arm boundary → tore `.Small | .Big` into `. Small |` + `. Big :> "alive"`. The trailing `|` on the first piece is what the typer then mis-read as a guard. Fix: `_isAltContinuation` guard — don't break when the preceding collected part is a top-level `|`.
  2. type-system.ts parseArmPattern (~13156): added `altVariants` to ParsedArmPattern; `altRhsIsVariantPattern` + `splitTopLevelPipes` discriminate variant-pattern alternation (every `|`-segment is a variant pattern → harvest altVariants, NOT hasGuard) from a real guard (`| <bool>` → hasGuard). Also broadened the variant-match regex to accept `::` alias (the `::Small | ::Big` leg dropped variants from exhaustiveness).
  3. type-system.ts extractArmsFromMatchNode (~13348): push EVERY alternate (altVariants) so exhaustiveness + dead-arm checks see each.
- Codegen: NO change. emit-control-flow.ts parseMatchArm Form 0 (~989) + armCondition (~1898) ALREADY emit the OR-chain (`tag === "A" || tag === "B"`, S84). Verified reached.
- Empirical verify (R26): repro compiles exit 0; emitted client.js has `if (_scrml_match_2 === "Small" || _scrml_match_2 === "Big") return "alive";`; node --check PASS (client + runtime); runtime probe: both .Small and .Big fire "alive".
- Regressions verified: derived=match alternation STILL compiles; kickstarter §4.10 / §51.0.J derived=match compiles; `return match` (typed param) alternation compiles + correct OR-codegen; 3-way `.A|.B|.C` emits 3-term OR; `::` alias compiles; REAL `| cond` + `if cond` guards STILL fire E-SYNTAX-011 (no over-relax); exhaustiveness narrows to full alternate set (missing → E-TYPE-020, duplicate alternate → E-TYPE-023). Confirmed the secondary E-TYPE-020 on the if-guard case is PRE-EXISTING (git-stash check vs HEAD).
- Tests: compiler/tests/unit/g-match-alternation-value-vs-derived.test.js — 11 pass / 0 fail / 26 expects.
- Full suite `bun run test`: 24445 pass / 0 fail / 231 skip across 1021 files.
- Commits: 14baa32e (code + test, pre-commit gate PASS) · 39b4533f (docs gap-flip + §0 regen, gate PASS).
- gap g-match-alternation-value-vs-derived flipped MED→resolved; §0 MED 11→10; `bun scripts/state.ts --check` PASS.
