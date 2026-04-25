# Progress: lsp-cleanup-retired-bpp-import

## Investigation (2026-04-25, agent-ab884e60ece40d220)

- [start] Read intake.md — claim: "lsp/server.js:26 imports runBPP from body-pre-parser.js"
- [investigate] Inspected lsp/server.js line 26 in current HEAD — line is a comment in the L3 docstring, not an import. No `runBPP` import anywhere in server.js.
- [investigate] Grepped `runBPP|body-pre-parser` across `lsp/`:
  - `lsp/handlers.js:32`  — comment documenting BPP retirement (intentional, explains the gap)
  - `lsp/handlers.js:163` — `if (code.startsWith("E-BPP-")) return "scrml/body-pre-parser"` — diagnostic source mapping for the legacy `E-BPP-001` error code which is still emitted by `compiler/src/body-pre-parser.ts`. Keep.
  - `lsp/handlers.js:232` — comment explaining the BPP-skip in the analyze pipeline (intentional)
  - `lsp/handlers.js:824` — entry in the error documentation map for `E-BPP-001`. Keep — error code is still live.
  - **No `runBPP` import or call anywhere in `lsp/`.**
- [investigate] Grepped E-BPP across `compiler/src/` — found that `compiler/src/body-pre-parser.ts` still emits `E-BPP-001` on parse failure. So the LSP's diagnostic-source mapping and error documentation entry are still load-bearing and must NOT be removed.
- [git history] Found commit `00d42c9 chore(lsp-cleanup-retired-bpp-import): drop dead runBPP import + call` — this exact change-id was already implemented and merged. The `runBPP` import + try/catch were dropped from `lsp/handlers.js` (which is where they actually lived; the intake's "lsp/server.js:26" pointer was off — handlers.js is the in-process analysis module).
- [verify branch ancestry] `git log 205602d --grep "lsp-cleanup-retired"` — `00d42c9` is in the current HEAD ancestry on main. Cleanup is live.
- [verify tests] `bun run test` from worktree (after clean install): **7825 pass / 40 skip / 0 fail / 370 files** — exact baseline match at `205602d`.
- [decision] Code cleanup is complete. The only outstanding work was the missing change-directory paper trail: the implementation commit `00d42c9` was bundled with L3-prep changes and never created a dedicated `docs/changes/lsp-cleanup-retired-bpp-import/` directory beyond the intake. Closing that out here.

## Status

**CLOSED — already implemented in commit `00d42c9`.** No new code change. The remaining BPP references in `lsp/handlers.js` (lines 32, 163, 232, 824) are intentional and load-bearing:

- Lines 32 and 232 are explanatory comments documenting the retirement so future readers understand why TAB feeds directly into PA.
- Line 163 maps the live `E-BPP-001` error code (still emitted by `compiler/src/body-pre-parser.ts` — the file persists as a no-op shim with one residual error path) to its diagnostic source.
- Line 824 documents the same `E-BPP-001` code in the error message catalog.

If `body-pre-parser.ts` is ever fully deleted (separate, larger change), lines 163 and 824 should be revisited then.

## Tags

#cleanup #lsp #bpp #closed #already-implemented #pipeline-hygiene

## Links

- /home/bryan-maclee/scrmlMaster/scrmlTS/docs/changes/lsp-cleanup-retired-bpp-import/intake.md
- /home/bryan-maclee/scrmlMaster/scrmlTS/lsp/server.js
- /home/bryan-maclee/scrmlMaster/scrmlTS/lsp/handlers.js
- /home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/body-pre-parser.ts
- Implementation commit: `00d42c9` chore(lsp-cleanup-retired-bpp-import): drop dead runBPP import + call
