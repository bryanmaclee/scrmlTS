# M2.1 — JS expression parser substrate + ParseMode engine + primary expressions

Dispatch: native-parser charter-B M2.1. Worktree: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aed5dfa292f32f908

## Plan
- parse-mode.scrml/.js — `type ParseMode:enum` + `<engine for=ParseMode initial=.TopLevel>` (JS context engine, renamed from D2 ParseContext).
- ast-expr.scrml/.js — native `Expr` enum + node constructors per S98 D3.
- token-cursor.scrml/.js — token-stream cursor over M1's Token[] (the parser substrate; analogous to M1's char cursor.scrml).
- parse-expr.scrml/.js — expression parser, M2.1 scope = primary expressions only.
- parser-conformance-expr.test.js — Tier 1+2 conformance vs Acorn on a primary-expression micro-corpus.

## Log
- [start] pwd verified: /home/bryan-maclee/scrmlMaster/scrmlTS/.claude/worktrees/agent-aed5dfa292f32f908. Startup checks 1-5 pass. Baseline: lexer conformance 96 pass / 0 fail.
- Read maps + roadmap §0/§1 + DD D2/D3/D5/D7 + README + M1 source pattern files.
- [done] parse-mode.scrml/.js — ParseMode engine (7 variants; InObjectLiteral composite §51.0.Q.1). Committed.
- [done] ast-expr.scrml/.js — Expr enum + constructors per D3 (primary kinds substantive; M2.2-M2.4 kinds catalog-only). Committed.
- [done] token-cursor.scrml/.js — parser substrate token cursor over M1 Token[]; EOF-clamp + snapshot/restore. Committed.
- [done] parse-expr.scrml/.js — expression parser, M2.1 primary-expression scope; parseExpression is the single M2.2+ recursion seam. Committed.
- [done] parser-conformance-expr.test.js — Tier1+2 vs Acorn on 51-entry primary-expr corpus + 6 native-only scrml-extension cases + 5 Tier-3 span checks + 5 error-path checks = 114 tests, all pass. Committed (incl. template-span backtick fix).
- [verify] Full `bun run test`: 16327 pass / 0 fail / 169 skip / 1 todo. S111 baseline 16213/0/169/1 + 114 new = 16327. ZERO regressions.
- [verify] Pre-commit gate (unit+integration+conformance --bail): 13362 pass / 0 fail.
- [verify] M1 files + README untouched (git diff confirms).

## STATUS: M2.1 COMPLETE
All gating criteria met. M2.2 (operators) continues from parseExpression's seam in parse-expr.scrml.
