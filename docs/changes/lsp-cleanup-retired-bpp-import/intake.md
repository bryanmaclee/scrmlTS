# lsp-cleanup-retired-bpp-import — Intake

**Surfaced:** S40 2026-04-24, by LSP enhancement scoping deep-dive.
**Status:** filed, not started.
**Priority:** trivial — currently harmless cleanup.

## Symptom

`lsp/server.js:26` imports `runBPP` from `body-pre-parser.js`, but PIPELINE.md v0.6.0 (2026-04-02) explicitly removed BPP as a no-op stage. The import works (the module still exists as a no-op shim) but is misleading — a future reader would think BPP is still part of the pipeline.

## Reproducer

```bash
grep -n "runBPP\|body-pre-parser" lsp/server.js
```

## Suggested fix

1. Remove the `import { runBPP } from "..."` line at `lsp/server.js:26`.
2. Remove the `runBPP(...)` call in the analyze pass (if any).
3. Verify LSP still starts: `bun run lsp/server.js --stdio` and check it advertises capabilities to a connected client (smoke test in editor).

## Why trivial

No behavior change — BPP was already a no-op. The only effect is fewer lines in the LSP and a less-confusing reading of the file.

## Reference

- LSP deep-dive `docs/deep-dives/lsp-enhancement-scoping-2026-04-24.md` ("Surprising findings" #1)
- PIPELINE.md v0.6.0 (2026-04-02) — BPP removed

## Tags
#cleanup #lsp #trivial #pipeline-hygiene
