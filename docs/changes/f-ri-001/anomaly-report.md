# Anomaly Report — F-RI-001

Compares post-fix behavior against the pre-snapshot baseline. Every
behavioral difference is classified as **expected** or **unexpected**.

## Test Behavior Changes

### Expected
- `bun test compiler/tests/`: 8165p → 8172p (+7), 0 → 0 fail. The +7
  matches the new test count in `compiler/tests/unit/route-inference-f-ri-001.test.js`.
- Pre-commit hook (`bun test compiler/tests/ --bail` minus browser):
  7440p → 7447p (+7). Same reason.
- Post-commit hook (compiler change detection): triggered as expected on
  the `route-inference.ts` doc edit. TodoMVC + browser validation both
  passed (no regression in compiled-output quality).

### Unexpected (Anomalies)
- None.

## E2E Output Changes

### Expected
- None expected. The doc-only RI change cannot affect emitted code.
  Doc-comment edits do not change the compiled output of any sample.

### Unexpected (Anomalies)
- None.

## New Warnings or Errors

- None.

## Anomaly Count: 0

## Status: CLEAR FOR MERGE

## Tags

- pipeline-stage: RI
- error-code: E-RI-002
- friction-id: F-RI-001
- anomaly-count: 0
- merge-status: clear

## Links

- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aa63ef2454c21549e/docs/changes/f-ri-001/pre-snapshot.md`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aa63ef2454c21549e/docs/changes/f-ri-001/diagnosis.md`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aa63ef2454c21549e/compiler/src/route-inference.ts`
- `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aa63ef2454c21549e/compiler/tests/unit/route-inference-f-ri-001.test.js`
