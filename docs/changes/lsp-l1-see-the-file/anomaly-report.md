# Anomaly Report — lsp-l1-see-the-file

**Status: CLEAR FOR MERGE**

## Test Behavior Changes

### Expected
- `compiler/tests/lsp/document-symbols.test.js` — 11 new tests, all pass.
- `compiler/tests/lsp/hover.test.js` — 10 new tests, all pass.
- `compiler/tests/lsp/completions.test.js` — 9 new tests, all pass.
- `compiler/tests/lsp/analysis.test.js` — 8 new tests, all pass.
- Total delta: 7632 → 7670 (+38 LSP tests, +4 files). 0 regressions.

### Unexpected (Anomalies)
- None.

## E2E / Sample Compilation Changes

### Expected
- `examples/02-counter.scrml` compiles via `bun run compiler/src/cli.js compile examples/02-counter.scrml` — `Compiled 1 file in 35.8ms`. (LSP changes are isolated to `lsp/`; no compiler-pipeline code was touched.)

### Unexpected (Anomalies)
- None.

## LSP Stdio Smoke Test

Run via `bun docs/changes/lsp-l1-see-the-file/smoke-test.js` from project root.

**Initialize response capabilities:**
```json
{
  "textDocumentSync": 1,
  "completionProvider": {
    "triggerCharacters": ["<", "@", "$", "?", "^", "#", ".", ":", "="],
    "resolveProvider": false
  },
  "hoverProvider": true,
  "definitionProvider": true,
  "documentSymbolProvider": true
}
```

**documentSymbol response (against examples/14-mario-state-machine.scrml):**
- `PowerUp` (kind=10 Enum) — `type :enum`
- `MarioState` (kind=10 Enum) — `type :enum`
- `HealthRisk` (kind=10 Enum) — `type :enum`
- (12 more — total 15 top-level symbols, including @vars, @derived, fns, machines)

**Both PASS lines printed:**
- `PASS: initialize advertises documentSymbolProvider: true`
- `PASS: documentSymbol returned 15 top-level symbols`

## VS Code Sanity

The VS Code extension at `editors/vscode/src/extension.ts` was not modified.
The extension is fully transparent — it forwards every server-advertised
capability to VS Code without filtering (verified during pre-snapshot read
of extension.ts). Therefore: any new capability added to the server's
`onInitialize` (here: `documentSymbolProvider`) propagates to VS Code
automatically without an extension rebuild.

`bunx tsc -p editors/vscode/tsconfig.json --noEmit` was attempted but
blocked by the agent sandbox (typescript not installed in worktree node
modules and the sandbox blocked package-install commands targeted at
editors/vscode/). Since the extension code was untouched, this is not a
real concern.

## New Warnings or Errors

None new. Pre-existing flakes unchanged: two ECONNREFUSED errors in
network-dependent tests are pre-existing (present in baseline).

## Anomaly Count: 0

## Bug fixes that fell out of L1

While implementing the analysis cache, two pre-existing latent bugs in the
LSP became visible and were fixed as part of L1:

1. **extractAnalysisInfo kind-matching bug.** The pre-L1 `extractAnalysisInfo`
   in `lsp/server.js` checked `node.kind === "FunctionDecl"` and
   `node.kind === "ReactiveAssign"` — neither name is what the canonical
   AST emits (`function-decl`, `reactive-decl`). As a result, the
   `analysis.functions` and `analysis.reactiveVars` arrays were always
   empty, so hover-on-function and definition-on-function silently failed
   on every file. Fixed by walking the canonical lowercase-kebab kinds.
   Guarded by `compiler/tests/lsp/analysis.test.js`.

2. **detectContext brace-balance bug.** `detectContext` tracked context
   openers `${`, `?{`, `^{`, `#{` and a single closer `}`, but did not
   track plain `{` openers. Inside `${ type T = { ... } }`, the inner `{`
   was ignored but the inner `}` decremented `depth.logic`, falsely
   placing the cursor at top-level after the inner block. Fixed by
   tracking a `plainDepth` counter alongside the context depths.

Both fixes are in the same change because Step C (completion-trigger
fixes) cannot be tested without them — without fix 1, no
`analysis.functions` to drive completion; without fix 2, the cursor isn't
detected as being inside `${}` in a realistic file.

## Tags

#change #lsp #l1 #anomaly-report

## Links

- [pre-snapshot.md](./pre-snapshot.md)
- [progress.md](./progress.md)
- [smoke-test.js](./smoke-test.js)
- [docs/deep-dives/lsp-enhancement-scoping-2026-04-24.md](../../deep-dives/lsp-enhancement-scoping-2026-04-24.md)
- [lsp/server.js](../../../lsp/server.js)
- [lsp/handlers.js](../../../lsp/handlers.js)
