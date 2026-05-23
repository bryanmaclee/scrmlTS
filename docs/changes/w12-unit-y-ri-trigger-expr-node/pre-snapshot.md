# Pre-snapshot — Wave 12 Unit Y

## Baseline at start

- Branch: main (worktree-local; commits go direct to main per project policy)
- HEAD: 136678e5
- Worktree: /home/bryan/scrmlMaster/scrmlTS/.claude/worktrees/agent-a1d541b64f1ee816b

## Test counts

- `bun test`: 19770 pass / 175 skip / 1 todo / 0 fail / 60281 expect() calls / 19946 tests / 746 files / ~45s
  - Earlier flake observed in first run (2 network failures, HTTP 500); not pipeline-related.
- `bun test compiler/tests/unit/route-inference.test.js`: 171 pass / 0 fail / 375 expect() calls (1 file)

## Targeted file state

- `compiler/src/route-inference.ts` — 3288 lines. `walkBodyForTriggers` at L828-1217 has:
  - Trigger 1/2/D2c detection on the bare-expr STRING field (L881-936)
  - Trigger 1/D2c detection on let/const/tilde-decl init STRING field (L938-998)
  - Trigger 1/D2c detection on state-decl init STRING field (L1001-1048)
  - Trigger 1/2/D2c detection on return-stmt/throw-stmt expr STRING field (L1064-1109)
  - W10-P CALLEE COLLECTION on EXPR_NODE fields (L1158-1205) — *but no trigger detection on same fields*

## Gap to close

S121 W10-P added `EXPR_NODE_CALLEE_FIELDS` recursion at L1182-1205 that scans
`condExpr | iterExpr | headerExpr | resultExpr | valueExpr` + `cStyleParts.{init|cond|update}Expr`
for CALLEE extraction (`exprNodeCollectCallees`) — but explicitly noted in the
commit message and in-source comment (L1173-1176): *"No trigger detection
(server-only resource, protected-field-access) is added on these fields —
that's an orthogonal class of false-negatives out of scope for this dispatch
(callees-only mirrors the brief)."*

Unit Y closes the sister false-negative: extend the same EXPR_NODE field scan
to also emit Trigger 1 (server-only-resource), Trigger 1-D2c (imported-server-namespace),
and Trigger 2 (protected-field-access) via `emitStringFromTree(exprNode)` →
the same three string-based detectors already used by the bare-expr branch.

## Reference pattern

L1635-2655 sister walker (`walkMarkupContext` → `markupReferencedNames`) already
demonstrates the exact pattern: `for each ExprNode field → emitStringFromTree(v)
→ apply string-based detector`. We mirror that here for the three trigger detectors.

## Tags
#scrmlts #w12 #unit-y #route-inference #pre-snapshot

## Links
- [progress.md](./progress.md)
</content>
</invoke>