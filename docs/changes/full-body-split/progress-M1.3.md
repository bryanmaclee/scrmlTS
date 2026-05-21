# Ext 1 M1.3 — multi-batch planner — progress log

Append-only timestamped log.

- 2026-05-21T00:00 — Startup verification PASSED. Worktree
  `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-af34c5e599890cd1a`.
  `git merge main --no-edit` clean. `bun install` + `bun run pretest` OK.
  Baseline `bun run test`: 17981 pass / 169 skip / 1 todo / 0 fail (the
  earlier 2-fail was a flaky promote-match tempdir race; re-run confirmed
  0 fail).
- 2026-05-21T00:05 — Read EXT-1-IMPL-BRIEF.md §M1.3, dive §B.3 + §I,
  primary.map.md, body-dg-builder.ts (M1.2 landed), route-inference.ts
  CPSSplit/CPSBatch types (M1.1 landed) + analyzeCPSEligibility +
  call site ~2780-2799. Next: write cps-batch-planner.ts.
- 2026-05-21T00:30 — NEW compiler/src/cps-batch-planner.ts written:
  topologicalSort (Kahn) + coalesceServerRuns + detectCrossBatchReject
  + detectMachineCrossing. route-inference.ts: CPSResult extended with
  pureServerIndices / reactiveServerIndices; planner invoked at the
  CPSSplit construction site; reject → RIError, multi-batch → serverBatches.
  Committed e5960f8d (pre-commit gate passed).
- 2026-05-21T00:50 — 24-fixture corpus written. First run: 12 fail —
  the server-bias topo tie-break hoisted independent client statements
  past server statements, collapsing two-batch shapes into one. FIX:
  removed server-bias; tie-break is lowest-source-index. Source order is
  a legal topo order for the conservative straight-line DG; coalescing
  now sees genuine boundaries. All 24 pass. Committed 1ea04870.
- 2026-05-21T01:00 — Full pre-commit gate (unit+integration+conformance):
  13419 pass / 0 fail. Full suite: 18005 pass / 0 fail (baseline 17981
  + 24 new). M1.3 COMPLETE.
- Machine-crossing false-positive assessment: NONE. detectMachineCrossing
  fires ONLY when two .advance() calls on the SAME receiver land in
  DISTINCT batch numbers. Two advances inside one batch's serial
  execution produce no diagnostic (F18 verifies); advances on different
  machines never conflate (F19 verifies). The dive §I "batch boundary
  intervenes" refinement is built in, not deferred.
</content>
</invoke>
