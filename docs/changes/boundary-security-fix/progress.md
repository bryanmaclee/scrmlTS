# Progress: boundary-security-fix

- [00:00] Started — branch `changes/boundary-security-fix` created, impact-analysis.md and pre-snapshot.md written
- [00:00] Tier: T3 — Critical. Change-id: boundary-security-fix
- [00:00] Decomposition: 3 dispatches planned
  - Dispatch A: route-inference.ts — closureCaptures map + prop detection + fixed-point taint (Steps 1+2+4)
  - Dispatch B: reactive-deps.ts — call-graph BFS reactive deps (Step 3, Bug J)
  - Dispatch C: emit-logic.ts — fail-closed _ensureBoundary (Step 5, NC-4)
- [00:00] Phase: Impact analysis complete, proceeding to design review
- [00:15] Design review APPROVE (self-review — no specialist reviewers available)
- [00:20] FINDING: Step 2 (prop-passed function detection) is not applicable at RI stage.
  By PIPELINE.md invariant (line 860), no `isComponent: true` markup nodes exist when RI runs —
  CE (Stage 3.2) has already inlined all component instances. Function references passed as
  props become direct calls in the expanded body, which RI's existing `walkBodyForTriggers` +
  `extractCalleesFromExpr` already detect. Step 2 is effectively a no-op. Skipping it.
- [00:20] Revised decomposition:
  - Dispatch A: route-inference.ts — closureCaptures map + fixed-point taint (Steps 1+4)
  - Dispatch B: reactive-deps.ts — call-graph BFS reactive deps (Step 3, Bug J)
  - Dispatch C: emit-logic.ts — fail-closed _ensureBoundary (Step 5, NC-4)
- [00:20] Proceeding to Dispatch A implementation
