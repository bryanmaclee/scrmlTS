# Dispatch B — progress (F5 + F6 downstream passes)

Append-only. Timestamps local.

## 2026-05-21 — startup
- Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-a837728e73f0beacf
- `git merge main` fast-forward 092fa90a..ea97993e clean; bun install + bun run pretest OK.

## 2026-05-21 — Phase 0 (locate producers + seam)
- Producers in ast-builder.js:
  - `detectResetExprPresence` @11932 → `hasResetExpr`
  - `detectEqualityExprPresence` @11998 → `hasEqualityExpr`
  - `detectMarkupForStmtChunkPresence` @12085 (+ `CHUNKED_MARKUP_TAGS` @12081, `MARKUP_FOR_STMT_SENTINEL` @12080) → `{hasChunkedMarkupTag, hasForStmt}`
  - 3 detector calls @12769/12775/12785; 4 field assigns @12798-12801 on `ast` object.
  - authConfig extraction @12308-12339 (incl. programNode.auth/loginRedirect/csrf/sessionExpiry annotation side-effect).
  - middlewareConfig extraction @12352-12411; field assigns @12802-12803.
  - E-MW-002 ratelimit validation @12413-12422 — STAYS in ast-builder (error-push, not extraction).
- buildAST returns `{ filePath, ast, errors }`; the 6 fields live on `ast`.
- Consumers read `fileAST?.ast?.hasX ?? fileAST?.hasX` (both shapes) — emit-client.ts; `=== false`/`=== undefined` guards stay.
- authConfig consumed by route-inference.ts (Stage 5 RI) + auth-graph.ts (Stage 7.55 AG) + codegen — so the seam MUST be before RI.
- SEAM CHOSEN: api.js, new stage immediately after the TAB loop (after line 728), mutating `result.ast`. Earliest post-AST point; pipeline-agnostic (native parser at v0.6 produces the same tabResult shape).
- New modules: `compiler/src/compute-pgo-flags.ts`, `compiler/src/compute-program-config.ts` (src-root convention — siblings protect-analyzer.ts / route-inference.ts run as api.js pipeline stages).

## 2026-05-21 — implementation complete
- Created compiler/src/compute-pgo-flags.ts (computePGOFlags — 3 detectors transplanted verbatim).
- Created compiler/src/compute-program-config.ts (computeProgramConfig — authConfig + middlewareConfig extraction + <program>-node annotation side-effect transplanted verbatim).
- api.js: new Stage 3.004 PRECG loop after the TAB loop (api.js +import lines 15-16; new stage block before GCP1) — mutates tabResult.ast with the 6 fields.
- ast-builder.js: removed the 3 detector functions + sentinels + CHUNKED_MARKUP_TAGS (228 lines), the 3 calls + 4 field assigns, the authConfig/middlewareConfig extraction blocks; kept hasProgramRoot, kept E-MW-002 validation (with a minimal local ratelimit lookup), kept `programNode` decl.
- Coupled test updates (6 files): pgo-c2-markup-forstmt-fold.test.js, has-equality-expr-flag.test.js, session-auth.test.js, a9-ext5-program-attr.test.js, middleware-handle.test.js reproduce the PRECG seam in their parse helpers; hardcoded-thresholds-bucket-bc-injection.test.js source-grep retargeted to compute-program-config.ts; self-host/ast.test.js stripIds extended for authConfig/middlewareConfig + program-node auth annotation.
- Full suite: 17846 pass / 0 fail / 169 skip / 1 todo. Pre-commit gate subset: 13362 pass / 0 fail (== baseline).
- Committed 1bd2fc51.
