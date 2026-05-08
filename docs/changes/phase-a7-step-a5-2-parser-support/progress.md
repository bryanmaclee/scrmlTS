# A5-2 progress log

Append-only timestamped log per pa.md global rule (Crash Recovery: Incremental
Commits + Progress Reports). Each entry: what was just done, what's next, any
blockers.

---

## 2026-05-08 — Phase 0 SURVEY started

- **Done:** Startup verification — pwd / git rev-parse / git status clean / bun install (114 packages) / bun run pretest (samples/compilation-tests/dist populated).
- **Done:** Fast-forwarded worktree branch `worktree-agent-ac20dd0bc553333e5` from `f59bbcc` to `cb73f41` to pick up BRIEF.md (BRIEF was on main but not on worktree HEAD when worktree was created).
- **Done:** Read full BRIEF.md (472 lines).
- **Done:** Read SPEC.md §51.0.M-Q (lines 20503-20988) — full sub-section text for all five S67 features.
- **Done:** Read symbol-table.ts:200-310 (EngineMetadata + EngineStateChildEntry shapes), 3680-3720 (PASS 10.A registration), 4209-4437 (PASS 11 B15 walker).
- **Done:** Read engine-statechild-parser.ts (full file — primary touch-point).
- **Done:** Read expression-parser.ts:680-910 (preprocessForAcorn + esTreeToExprNode bare-variant unmask).
- **Done:** Read ast-builder.js:119-142 (shouldSkipExprParse leading-dot relaxation), 8550-8730 (engine-decl construction).
- **Done:** Read primer §13.7 B14/B15/B17/B20 specifics (lines 664-768).
- **Done:** Verified tokenizer.ts has no closed prefix registry — `internal:` recognition is local to engine-statechild-parser.
- **Done:** Verified ast.ts does not declare an EngineDeclNode interface — engine-decl is plain JS object construction in ast-builder.js.
- **Done:** Verified lint-ghost-patterns.js W-LINT-004 catches `on[A-Z]=` HTML attributes, NOT `<onTimeout>` tag forms — zero churn.
- **Done:** Wrote SURVEY.md with locus confirmations, body-walk feasibility verdict, `.Variant.history` zero-source-change bet, tokenizer-not-touched verdict, EngineRuleForm Option A recommendation, 10-sub-step cost decomposition, scope-corrections (none), risk register.

**SURVEY VERDICT:** proceed as briefed. ~7-10h, ~150-200 LOC + 35-50 unit tests, single dispatch. No scope amendments. No tokenizer/ast.ts/BS churn.

**STOPPED at Phase 0 per BRIEF §5.** Awaiting PA acknowledgment + implementation authorization.

**Next (when authorized):** sub-step 1 — type extensions to symbol-table.ts (`OnTimeoutEntry`, `NestedEngineEntry`, `EngineStateChildEntry` +4 fields, `EngineRuleForm` +Option A flags). Compile-clean checkpoint.
