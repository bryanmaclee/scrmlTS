# Progress: f-null-003-004 (W3.1 + W3.2 paired)

W3 follow-on null-sweep extensions. T2-medium dispatch.

## Pre-snapshot — 2026-04-30

- **Branch:** `changes/f-null-003-004`
- **Base commit:** `8dddd27 docs(s51): FRICTION — 5 new findings logged`
- **Worktree path:** `/home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a6e72892ea6ff790f/`
- **Sibling parallel dispatch:** W2 fix (F-COMPONENT-001) running concurrently — DO NOT touch CE / module-resolver / api.js auto-gather paths.

### Baseline `bun test` result

```
8280 pass
40 skip
0 fail
28929 expect() calls
Ran 8320 tests across 392 files. [8.73s]
```

This matches the dispatch-stated baseline. (132 environment-related failures noted before `bash scripts/compile-test-samples.sh` was run — once test samples were built, baseline reproduces clean.)

### Setup steps already done

- Worktree rebased onto main (was 1 commit behind: `3dab098 → 8dddd27`).
- `bun install` in `compiler/` (worktree was missing node_modules).
- `bash scripts/compile-test-samples.sh` (worktree was missing `samples/compilation-tests/dist/`).

## Plan

### W3.1 — bare-null-literal sweep

Extend `gauntlet-phase3-eq-checks.js` to flag bare `null` / `undefined` literal nodes anywhere they appear in value position in the AST — declarations, returns, object property values, array elements, ternary branches, default params, etc.

Detector approach: introduce a second walker pass that visits every exprNode and emits E-SYNTAX-042 when a bare `lit{litType:"null"}` or `lit{litType:"undefined"}` (or unbound `ident{name:"null"|"undefined"}`) is encountered anywhere except as the right-side of an equality comparison (which is already handled by the existing equality detector — must not double-emit).

### W3.2 — string-template attribute interpolation null sweep

`<div class="${@x == null ? a : b}">` — the `${...}` segment is preserved as raw text in `kind:"string-literal"` attribute values and never parsed. Default approach: tactical (option b) — localized re-parse of `${...}` segments inside attribute string-literals within the GCP3 detector.

## Steps

- [HH:MM] Started — branch created, pre-snapshot written
</content>
</invoke>