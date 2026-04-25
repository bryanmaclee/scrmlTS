# Progress: lsp-l1-see-the-file

- [start] Worktree rebased onto main `7fbbb4f`. Baseline tests: 7632 pass / 40 skip / 0 fail / 358 files.
- [start] Read deep-dive (574 lines) and current `lsp/server.js` (965 LOC). Confirmed VS Code extension is fully transparent — server-advertised capabilities flow through.
- [step 1] Pre-snapshot written. Plan:
  - Step A: Add `onDocumentSymbol` handler + `documentSymbolProvider: true` capability. Walk AST to emit symbols for `<state>` blocks, components (PascalCase const), functions (incl. server fn), type-decls, machines (state subtype), reactive vars.
  - Step B: Improve hover — function signatures with full params + boundary, reactive var badge with type, tilde/lin badging.
  - Step C: Fix completion trigger — `@x.|` member completion + audit triggers.
  - Step D: Tests for each — new dir `compiler/tests/lsp/` exercising the LSP handler functions in-process.
  - Step E: Smoke-test the LSP via stdio (`initialize` + `documentSymbol`).
