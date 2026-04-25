// Step 2: emit-logic.ts handler for the new "sql" lift-expr variant.
//
// Run from worktree root:
//   bun docs/changes/fix-lift-sql-chained-call/apply-fix-step2.mjs

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dir, '../../..');

function patchFile(file, edits) {
  let src = fs.readFileSync(file, 'utf8');
  for (const { find, replace, label } of edits) {
    if (!src.includes(find)) {
      console.error(`PATCH FAILED: '${label}' — find string not present in ${file}`);
      console.error("---FIND---\n" + find + "\n---END FIND---");
      process.exit(1);
    }
    const before = src;
    src = src.replace(find, replace);
    if (src === before) {
      console.error(`PATCH NO-OP: '${label}'`);
      process.exit(1);
    }
    console.log(`Applied: ${label}`);
  }
  fs.writeFileSync(file, src);
}

const emitLogicPath = path.join(repoRoot, 'compiler/src/codegen/emit-logic.ts');

// In `case "lift-expr":`, before the existing `if (opts.boundary === "server" && liftE)`
// block, insert a guard for the new `liftE.kind === "sql"` variant. Both the
// server and non-server branches need to handle it.
//
// Strategy: recursively call emitLogicNode on the SQL child node to reuse the
// existing `case "sql":` emission logic. Strip the trailing semicolon to get
// the expression form, then either `return <expr>;` (server boundary) or
// just `<expr>;` (drop value).
const findStr = `      if (opts.boundary === "server" && liftE) {
        if (liftE.kind === "expr" && typeof liftE.expr === "string") {
          const rhsExpr = emitExprField(liftE.exprNode, liftE.expr.trim(), { mode: "server", dbVar: opts.dbVar });
          return \`return \${rhsExpr};\`;
        }
        // Markup in a server handler is not meaningful — emit a typed
        // compile-time comment so inspection shows the failure cause.
        return \`return null; /* server-lift: non-expr form */\`;
      }`;

const replaceStr = `      if (opts.boundary === "server" && liftE) {
        if (liftE.kind === "expr" && typeof liftE.expr === "string") {
          const rhsExpr = emitExprField(liftE.exprNode, liftE.expr.trim(), { mode: "server", dbVar: opts.dbVar });
          return \`return \${rhsExpr};\`;
        }
        // fix-lift-sql-chained-call (S40): \`lift ?{...}.method()\` inside a
        // server function — the ast-builder now wraps the SQL block as
        // \`expr: { kind: "sql", node: <sqlNode> }\`. Reuse the existing
        // \`case "sql":\` emission by recursing on the SQL child node, then
        // promote the resulting expression to a return statement.
        if (liftE.kind === "sql" && liftE.node) {
          const sqlStmt = emitLogicNode(liftE.node, opts);
          // \`case "sql"\` always returns an expression form ending in \`;\`
          // (e.g. \`await sql\\\`SELECT ...\\\`;\` or \`(await sql\\\`SELECT ...\\\`)[0] ?? null;\`).
          // Strip the trailing \`;\` so we can wrap as \`return …;\`.
          const sqlExpr = sqlStmt.replace(/;\\s*$/, "");
          return \`return \${sqlExpr};\`;
        }
        // Markup in a server handler is not meaningful — emit a typed
        // compile-time comment so inspection shows the failure cause.
        return \`return null; /* server-lift: non-expr form */\`;
      }
      // fix-lift-sql-chained-call (S40): non-server boundary — \`lift ?{...}\`
      // outside a server function is unusual but should emit something
      // parseable. Drop the value and emit the SQL as a statement so the
      // query still runs (matches the bare \`?{}\` semantics).
      if (liftE && liftE.kind === "sql" && liftE.node) {
        return emitLogicNode(liftE.node, opts);
      }`;

patchFile(emitLogicPath, [
  { find: findStr, replace: replaceStr, label: "emit-logic: lift-expr handler — recognise kind:'sql' variant" },
]);

console.log("\nemit-logic.ts patched.");
