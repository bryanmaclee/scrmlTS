# Anomaly Report: lsp-l3-scrml-unique-completions

## Test Behavior Changes

### Expected
- `compiler/tests/lsp/l3-sql-completions.test.js` (15 new tests) added —
  exercises SQL column completion driven by PA `views` Map, including
  alias resolution, FROM/JOIN/AS forms, and the bare table-name case.
- `compiler/tests/lsp/l3-component-prop-completions.test.js` (11 new tests)
  added — exercises `extractComponentProps`, `detectOpenComponentTag`, and
  `buildComponentPropCompletions` for both same-file and cross-file
  components.
- `compiler/tests/lsp/l3-import-completions.test.js` (11 new tests) added —
  exercises `detectImportClauseContext`, `buildImportCompletions`,
  `listImportedCrossFileComponents`, and the `buildCompletions` integration.
- `docs/changes/lsp-l3-scrml-unique-completions/smoke.test.js` (3 new tests)
  added — end-to-end smoke for each L3 sub-feature with sample
  CompletionItem[] payloads dumped to stdout.
- Test count change: 7714 pass → 7751 pass (+37). 0 → 0 failures.

### Unexpected (Anomalies)
- None.

## E2E Output Changes

### Expected
- L1/L2 LSP suite (67 tests) still passes — verified after Step 1 (BPP
  cleanup) and after each L3 step.

### Unexpected (Anomalies)
- None. The transient `ECONNREFUSED` log line from happy-dom's XHR machinery
  appeared in some `bun test` runs but did not cause failures — same
  behavior as in the pre-snapshot baseline.

## New Warnings or Errors
- None.

## File Changes

```
lsp/handlers.js                                                     +758, -14 (1356 → 2113)
lsp/server.js                                                          +12, -3
compiler/tests/lsp/l3-sql-completions.test.js                        new (208 LOC)
compiler/tests/lsp/l3-component-prop-completions.test.js             new (199 LOC)
compiler/tests/lsp/l3-import-completions.test.js                     new (217 LOC)
docs/changes/lsp-l3-scrml-unique-completions/pre-snapshot.md         new
docs/changes/lsp-l3-scrml-unique-completions/progress.md             new
docs/changes/lsp-l3-scrml-unique-completions/anomaly-report.md       new
docs/changes/lsp-l3-scrml-unique-completions/smoke.test.js           new (130 LOC)
```

No other files were touched — confirmed via `git diff --name-only`.

## Out-of-scope verification
- `compiler/src/ast-builder.js` — untouched (parallel agent's territory).
- `compiler/src/codegen/emit-server.ts` — untouched.
- `compiler/src/codegen/emit-logic.ts` — untouched.
- `compiler/src/protect-analyzer.ts` — untouched.
- `compiler/src/component-expander.ts` — untouched.
- All compiler/src/* — untouched.

## Sample LSP completion responses (from smoke.test.js)

### L3.1 SQL column completion
Cursor inside `?{ SELECT | }` with `<db tables="users">` in scope:
```json
[
  { "label": "id",    "kind": 5, "detail": "INTEGER PK -- users" },
  { "label": "name",  "kind": 5, "detail": "TEXT NOT NULL -- users" },
  { "label": "email", "kind": 5, "detail": "TEXT -- users" }
]
```
(`kind: 5` = `CompletionItemKind.Field`)

### L3.2 component prop completion
Cursor inside `<Card |` after `import { Card } from "./card.scrml"`:
```json
[
  { "label": "title",       "kind": 10, "detail": "title: string",        "insertText": "title=" },
  { "label": "body",        "kind": 10, "detail": "body?: string",        "insertText": "body=" },
  { "label": "publishedAt", "kind": 10, "detail": "publishedAt: string",  "insertText": "publishedAt=" }
]
```
(`kind: 10` = `CompletionItemKind.Property`)

### L3.3 cross-file import completion
Cursor inside `import { | } from "./card.scrml"`:
```json
[
  { "label": "Card", "kind": 7, "detail": "exported const from ./card.scrml" }
]
```
(`kind: 7` = `CompletionItemKind.Class` — Card is detected as a component)

## Anomaly Count: 0
## Status: CLEAR FOR MERGE

## Tags
#lsp #l3 #anomaly-report #scrml-unique-completions

## Links
- [pre-snapshot.md](./pre-snapshot.md)
- [progress.md](./progress.md)
- [smoke.test.js](./smoke.test.js)
- [intake (cleanup)](../lsp-cleanup-retired-bpp-import/intake.md)
- [deep-dive](../../deep-dives/lsp-enhancement-scoping-2026-04-24.md)
