# Progress: f-component-004

- [2026-04-30 startup] Worktree at agent-a2eda9e889fd5ccef. Confirmed stale-base recovery needed (was at 3338377, expected 966a493)
- [2026-04-30 startup] Recovered: git fetch + git reset --hard main → 966a493. Symlinks recreated for node_modules and compiler/node_modules.
- [2026-04-30 startup] bun run pretest OK. Baseline `bun test`: 8479 pass / 40 skip / 0 fail (8519 total). Note: first run had a transient ECONNREFUSED network failure in serve.test.js; second run clean.
- [2026-04-30 startup] Branch created: changes/f-component-004
- [diagnosis] Confirmed substituteProps in component-expander.ts:558 handles only text-node `value` and markup attr string-literals. Falls through to a generic recursive descent on array fields for "other node kinds" — but this only walks top-level; it does NOT understand ExprNode structure, nor does it walk LogicNode.body items.
- [diagnosis] LogicNode.body items are LogicStatements (BareExprNode, ConstDeclNode, LetDeclNode, IfStmtNode, ReturnStmtNode, FunctionDeclNode, etc.) Each carries an ExprNode subtree (initExpr, exprNode, condExpr, etc.). The walker must dispatch by statement kind and recurse into ExprNode subtrees.
- [diagnosis] ExprNode shapes documented at compiler/src/types/ast.ts:1126-1430. Existing read-only walker forEachIdentInExprNode lives in compiler/src/expression-parser.ts:2083 — useful as reference but we need a transforming walker (clones nodes).
- [diagnosis] Props map values are caller-side strings: string-literal attr values OR variable-ref names. For ExprNode-position substitution, we need TYPED replacement (string → LitExpr, variable-ref → IdentExpr). Build a parallel propsExprMap of pre-parsed ExprNodes alongside the existing string props map.
- [diagnosis] Strategy: substituteProps gets a third arg (optional propsExprMap). New helper substitutePropsInExprNode walks ExprNode trees, returns clones with IdentExpr substitutions. Shadowing tracked via a Set<string> threaded through scope boundaries (lambda params, local declarations).
