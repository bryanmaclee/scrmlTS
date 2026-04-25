# Progress: lsp-l3-scrml-unique-completions

- [start] worktree branch `worktree-agent-afcf5f48dbb7af602`, rebased onto main `72011b3`.
- bootstrap: `bun install` + `cd compiler && bun install` + `bun run pretest` (built dist samples).
- baseline: `bun test` → 7714 pass / 0 fail / 40 skip.
- pre-snapshot.md written.

## Plan

1. **Step 1 — bundled trivial cleanup `lsp-cleanup-retired-bpp-import`**
   Remove dead `runBPP` import + call from `lsp/handlers.js`. Verify 67 LSP tests pass.
2. **Step 2 — SQL column completion (L3.1)**
   - Extend `analyzeText` to surface `paResult.protectAnalysis.views` on the analysis cache.
   - Add `extractSqlContext()` helper: detect cursor inside `?{}` and resolve ancestor `<db>` block.
   - Add a tiny SQL alias resolver: parse `FROM <table> [<alias>]` from the SQL body.
   - Wire into `buildCompletions`: on SQL context, emit columns from ancestor `<db>` schema.
   - Tests: column completion, table-alias resolution, no false hits outside SQL.
3. **Step 3 — Component prop completion (L3.2)**
   - Add `extractComponentProps()` helper to handlers.js — given a componentDef.raw, run BS+TAB and pluck `props=` propsDecl.
   - Cache parsed props on `analysis.components[i].props` to avoid re-parsing.
   - Detect cursor inside `<Card |...` in markup context.
   - For cross-file components, fetch the foreign componentDef from workspace.fileASTMap.
   - Wire into `buildCompletions`: emit prop names with type as detail.
4. **Step 4 — Cross-file import completion (L3.3)**
   - Detect cursor inside `import { | } from "./other.scrml"`.
   - Resolve target path against workspace; pull exports via workspace.exportRegistry.
   - Wire into `buildCompletions`.
   - Bonus: `<Cap...` in markup should also suggest cross-file imported components.
5. **Step 5 — tests + smoke + anomaly + final commit.**
