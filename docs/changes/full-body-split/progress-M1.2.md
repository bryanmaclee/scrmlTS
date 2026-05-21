# Ext 1 M1.2 — body-DG builder — progress

Append-only. Each sub-step timestamped.

- 2026-05-21T11:18 — Dispatch start. Worktree `agent-aaacb75be26922634`. Merged main
  (`849f7f7c`, M1.1 landed). `bun install` + `bun run pretest` clean. Read brief §M1.2,
  dive §B.2, primary.map, route-inference.ts (CPSSplit/CPSBatch/analyzeCPSEligibility),
  ast.ts (LogicStatement union + node shapes), expression-parser.ts
  (forEachIdentInExprNode). Decision: `BodyDG`/`BodyDGNode`/`BodyDGEdge` interfaces
  co-located in `body-dg-builder.ts` — `codegen/types/` does not exist; the established
  convention (monotonicity-analyzer.ts, route-inference.ts) is each analyzer exports its
  own public types from its own file.
- Next: write `compiler/src/body-dg-builder.ts`.
- 2026-05-21T11:30 — `body-dg-builder.ts` written + committed (`366dcde4`). Pre-commit
  gate clean — baseline 13373 pass / 0 fail / 88 skip across 695 files. Decision: unit
  tests construct synthetic AST nodes (matching the kinds `collectStatementFacts` reads)
  rather than driving the full pipeline — the standard analyzer-unit-test pattern; keeps
  fixture edge-lists exact.
- Next: write the ~12-15 fixture test corpus at
  `compiler/tests/unit/ext1-m1-2-body-dg-builder.test.js`.
- 2026-05-21T11:48 — Test corpus written: 22 fixtures (F1-F22), all pass. Coupled fix
  found during corpus build: two adjacent control-flow statements emitted a literal
  duplicate `(k,k-1)` control-anchor edge — added a from→to dedup. Code + test committed
  together (`6d8ace79`, coupled-unit rule). Full `bun run test`: 17933 pass / 0 fail /
  169 skip across 735 files — zero regressions vs baseline (pre-commit gate subset:
  13373 pass / 0 fail / 88 skip).
- M1.2 COMPLETE. body-dg-builder.ts (~640 LOC incl. doc comments) + 22-fixture corpus.
  S1-S5 verdict CLEAN reaffirmed: DG construction is observation only — buildBodyDG
  reads `LogicStatement[]`, never mutates; statement count + per-statement semantics
  unchanged. The DG is the M1.3 reorder substrate; M1.2 records edges only.
</content>
</invoke>
