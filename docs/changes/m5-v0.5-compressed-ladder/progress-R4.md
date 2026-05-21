# progress-R4 — M5-swap Unit R4, SPEC §34 reconciliation

Append-only. Timestamps approximate (S117, 2026-05-21).

- S117 start — worktree `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-abd4a4f8b521eb4de`. Startup verification: pwd + repo-root match; `git merge main` brought brief in clean; `bun install` ok; baseline `bun run test` = 18,102 pass / 0 fail / 169 skip / 1 todo / 738 files (matches brief; transient 2-fail flake cleared on the briefed re-run).
- S117 — enumerated native-parser diagnostic codes: 30 `E-EXPR-*` + 35 `E-STMT-*` + 1 `E-MARKUP-VALUE-UNCLOSED` = 66 not in §34; 8 already in §34 (`E-ASYNC/AWAIT/FOR-AWAIT-NOT-IN-SCRML`, `E-UNQUOTED-DISPLAY-TEXT`, `E-CTX-001`, `E-CTX-003`, `E-MARKUP-002`, `E-PARSE-001`).
- S117 — verified §34 currency directly in `compiler/SPEC.md` lines 15097-15660; extracted all 66 code+message pairs from the executed `.js` tier.
- S117 — classified all 66: 66 → (a) NEW §34 row, 0 → (b) map, 0 → (c) internal. Surfaced cross-unit item X1 — the 7 `class`/`try`/`throw` (a*) codes; statement-kind admission belongs to R1.
- S117 — wrote `M5-SWAP-S34-RECONCILIATION-PLAN.md`: enumeration + per-code classification tables + family-level recommendation (new `### 34.1` sub-section). STOP GATE reached.
- NEXT — STOP GATE: report to PA, await ratification of the §34.1-sub-section approach before writing catalog rows.
