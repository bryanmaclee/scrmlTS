# Pre-Snapshot — lsp-l1-see-the-file

**Branch:** `worktree-agent-aae4c42f243b4cb8b` (rebased onto main `7fbbb4f`)
**Recorded:** 2026-04-24

## Test State (baseline)

```
7632 pass
40 skip
0 fail
27476 expect() calls
Ran 7672 tests across 358 files. [6.25s]
```

Includes two ECONNREFUSED errors from network-dependent tests — pre-existing
flakes (not regressions; tests still report 0 fail).

## Current LSP Capability Surface (`lsp/server.js` 965 LOC)

Capabilities advertised in `onInitialize`:
- `textDocumentSync: Full`
- `completionProvider: { triggerCharacters: ["<", "@", "$", "?", "^", ".", ":", "="], resolveProvider: false }`
- `hoverProvider: true`
- `definitionProvider: true`

Notably absent: `documentSymbolProvider`.

## Known Limitations Targeted by L1

1. **No outline view.** No `documentSymbolProvider` capability, no `onDocumentSymbol` handler.
2. **Hover too thin.** `onHover` reports function calls as `name(params) -- function [boundary]`
   but params are unannotated names with no types and no return type. Reactive vars don't
   show "(reactive)" badge clearly. No tilde or lin badging.
3. **Completion miss for `@x.|`.** Completion at line 609 only triggers `@`-var completion
   when `line.endsWith("@")` — typing `@x.<dot>` produces no member completion.

## Existing LSP-related tests

Search: `grep -rn 'lsp' compiler/tests/` returns only an unrelated `<td>` colspan match.
**No existing LSP tests.** L1 will add targeted tests under
`compiler/tests/lsp/` (new directory) since the LSP imports compiler stages directly
and is testable in-process without booting a stdio server.

## Out-of-scope reminders

- L1 does **not** clean up the retired `runBPP` import (separate intake
  `lsp-cleanup-retired-bpp-import`). The `import { runBPP }` line stays as-is.
- No MOD or CE wiring (L2).
- No SQL column completion (L3).
- No component prop completion (L3).
- No semantic tokens (L5).

## Tags

#change #lsp #l1 #pre-snapshot

## Links

- [progress.md](./progress.md)
- [lsp/server.js](../../../lsp/server.js)
- [docs/deep-dives/lsp-enhancement-scoping-2026-04-24.md](../../deep-dives/lsp-enhancement-scoping-2026-04-24.md)
