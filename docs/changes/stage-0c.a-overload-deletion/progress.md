# Stage 0c.A — Function-overload deletion progress

Re-dispatch (no isolation). Working directly on scrmlTS main.

## Baseline (2026-05-06)
- HEAD: c8c8bb93a22b36d05099dd0d0fcd0b4acc80ae55
- Working tree: clean
- Test counts: 8933 pass / 44 skip / 1 todo / 0 fail / 31612 expect calls / 8978 across 440 files
- Note: dispatch said expected baseline ~8209; actual is 8933. Expected post-deletion: ~8928 (drop of 5).

## Timeline

- 2026-05-06 baseline captured. Audit §8 read; scope confirmed (13 src sites + 5+ tests + README).
- Survey: all line numbers within 1-2 of audit citations. emit-client.ts call site verified at 545-547 (audit said 545-547). All other sites match.
- workspace-l2.test.js decision: line 11 mention "the workspace-aware overloads of analyzeText / buildDefinitionLocation" refers to TypeScript function-overload signatures (multiple call signatures of TS functions), NOT the SCRML state-type overload feature. INCIDENTAL — leave untouched.
- Chunk 1 committed (9d4c68f): emit-overloads.ts deleted; emit-client.ts/analyze.ts/reactive-deps.ts/codegen/README.md edited. Full test suite: 8933 pass / 0 fail (unchanged). Pre-commit hook: 8209 pass / 0 fail.
- Chunk 2 (combined w/ Chunk 4): type-system.ts surface (function/field/call site/export/comment) + unit tests (import + 5 tests at type-system.test.js:2349-2450) deleted together because they are interlocking — test file imports the deleted export. Full test suite: 8928 pass / 0 fail (drop of 5 = the deleted unit tests, as expected). Commit 82c6581.
- Chunk 3: ast-builder.js (tagFunctionsWithStateType + call site + comment) + ast.ts (stateTypeScope field on FunctionDeclNode). Verified zero remaining references via grep. Full test suite: 8928 pass / 0 fail (no count change). Commit e1dd7a2.

## Final state (2026-05-06)

- HEAD: e1dd7a2dadb264f4892b616a452a5db4ae5d2e16
- Working tree: clean (only unrelated pre-existing edit to docs/articles/teej_baiting_tweet.md, not part of this dispatch)
- Final test counts:
  - Pre-commit (excludes browser): 8204 pass / 33 skip / 1 todo / 0 fail (baseline 8209 → -5 deleted unit tests)
  - Full bun run test: 8928 pass / 44 skip / 1 todo / 0 fail (baseline 8933 → -5 deleted unit tests)
- Files deleted (1): compiler/src/codegen/emit-overloads.ts
- Files edited (8):
  - compiler/src/codegen/emit-client.ts (import + call site)
  - compiler/src/codegen/analyze.ts (FileAST field + FileAnalysis field + plumbing)
  - compiler/src/codegen/reactive-deps.ts (comment)
  - compiler/src/codegen/README.md (row)
  - compiler/src/type-system.ts (function + field + call site + export + comment)
  - compiler/src/ast-builder.js (function + call site + comment)
  - compiler/src/types/ast.ts (FunctionDeclNode.stateTypeScope field)
  - compiler/tests/unit/type-system.test.js (import + 5-test describe block)
- Commits (3): 9d4c68f → 82c6581 → e1dd7a2 (all WIP chunks; PA can squash on cherry-pick if desired)
- workspace-l2.test.js: NOT EDITED (incidental TypeScript-overload-signatures language, not the SCRML state-type overload feature)
- Audit-line drift: zero meaningful drift; line numbers matched the audit citations exactly.
- Out of scope (not touched, as instructed): scrml-support, component-expander.ts, SPEC.md.

