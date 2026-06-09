# Tranche 1 REVISION — strip the SQL-row view-selection sub-feature — change-id: typed-sql-row-tranche1-2026-06-08

Dispatched S175 (2026-06-08) to scrml-js-codegen-engineer, isolation:worktree, model opus, background. Agent a25a4535d8605e740. Follows the prior Tranche-1 build (agent af004eb79c8c26290, branch worktree-agent-af004eb79c8c26290 @ 056049379045128c). SendMessage-resume unavailable → fresh worktree pulls the prior branch's tested delta then SUBTRACTS the view-selection (so it never reaches main history).

## WHY
`server` keyword DEPRECATED (route-inference.ts:3054 W-DEPRECATED-SERVER-MODIFIER); isServer set only by it; RI escalates EVERY ?{}-fn to server (§12.2 Trigger 1) so a client-boundary ?{} can't exist → the prior dispatch's projection-side E-PROTECT-001 + view-selection rest on a deprecated keyword + a body-scan heuristic. Strip; defer the protected-column-projection leak to a data-flow/return-boundary follow-on. User S175: "there is no explicite server function, server as a keyword was deprecated long ago, but it keeps showing up." Drift gap filed: g-server-keyword-drift.

## STEPS (full brief in conversation transcript; summary)
1. F4 startup (S88/S90/S99/S126 path discipline; Bash-only edits; no cd; first-commit pwd).
2. Pull the prior delta from worktree-agent-af004eb79c8c26290 (the 10 files) + commit as base; confirm green before stripping.
3. STRIP from type-system.ts (annotateNodes, §14.8.7 block): (1) protectedFieldNames set+loop; (2) functionBodyAccessesProtectedField fn; (3) enclosingSqlFullViewStack + enclosingSqlRowView; (4) the function-decl push/pop; (5) in resolveSqlRowType: const view="full", DELETE the if(view==="client"){...E-PROTECT-001...} branch (column-absent → field asIs + W-SQL-ROW-UNTYPED, no E-PROTECT-001); (6) keep resolveTableView (callers pass "full"). KEEP wrap logic, projection loop, SELECT* expand/degrade, opaque-col field-asIs+lint, whole-row degrade, W-SQL-ROW-UNTYPED, let/const sqlNode path, case sql. KEEP sql-projection.ts, protect-analyzer F-SCHEMA-001, schema-differ export untouched. Grep-confirm the 5 symbols gone; remove only file-wide-unused imports.
4. Tests: remove E-PROTECT-001/view-discrimination cases from sql-row-typing.test.js; keep row-typing/wrap/degradation/lint; NO `server function` in any touched test. SPEC §14.8.7 impl-note: soften — generated-type row typing; full/client view + projection E-PROTECT-001 DEFERRED (RI escalates all ?{}-fns to server; protected-col leak = data-flow/return concern); no `server` keyword refs. KEEP §34 W-SQL-ROW-UNTYPED + E-TYPE-051 any→asIs.
5. Re-verify: full suite green (report delta vs 23,484/0; will be < prior +20); R26 on 23-trucking-dispatch — typed rows still resolve (board+load-detail, customer_name:string via JOIN alias), ZERO E-PROTECT-001, node --check 0. DO NOT mark DONE without green + R26.

## REPORT
WORKTREE_PATH, FINAL_SHA, FILES_TOUCHED, board.scrml row type (proof), suite count+delta, R26 (typed rows + 0 E-PROTECT-001 + node-check), grep-confirm 5 symbols gone, MAPS feedback.
