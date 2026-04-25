// Apply codegen edits for fix-cg-cps-return-sql-ref-placeholder.
//
// Edit 1: emit-server.ts:599-602 (useBaselineCsrf=true CPS site).
// Edit 2: emit-server.ts:682-685 (useBaselineCsrf=false CPS site).
// Edit 3: emit-logic.ts case "reactive-decl" — handle node.sqlNode for
//          client-side `_scrml_reactive_set("name", <sql-expr>);` emission.

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(import.meta.dir, "../../../");

function patch(file, before, after, label) {
  const path = resolve(ROOT, file);
  const src = readFileSync(path, "utf8");
  const occ = src.split(before).length - 1;
  if (occ !== 1) {
    throw new Error(`[${label}] BEFORE found ${occ} times — expected 1`);
  }
  writeFileSync(path, src.replace(before, after));
  console.log(`OK  ${label}  ${file}`);
}

// ---------------------------------------------------------------------------
// 1) emit-server.ts: CPS site under useBaselineCsrf=true (L599)
// ---------------------------------------------------------------------------

patch(
  "compiler/src/codegen/emit-server.ts",
  `      if (cpsSplit) {
        for (const idx of cpsSplit.serverStmtIndices) {
          if (idx < body.length) {
            const stmt = body[idx];
            if (stmt && stmt.kind === "reactive-decl" && cpsSplit.returnVarName === stmt.name) {
              const initExpr = emitExprField(stmt.initExpr, stmt.init ?? "undefined", { mode: "server" });
              lines.push(\`    const _scrml_cps_return = \${initExpr};\`);
              continue;
            }
            const code = serverRewriteEmitted(emitLogicNode(stmt, { boundary: "server" }));
            if (code) {
              for (const line of code.split("\\n")) {
                lines.push(\`    \${line}\`);
              }
            }
          }
        }
        if (cpsSplit.returnVarName && cpsSplit.serverStmtIndices.length > 0) {
          const lastServerIdx = cpsSplit.serverStmtIndices[cpsSplit.serverStmtIndices.length - 1];
          const lastStmt = body[lastServerIdx];
          if (lastStmt && lastStmt.kind === "reactive-decl" && lastStmt.name === cpsSplit.returnVarName) {
            lines.push(\`    return _scrml_cps_return;\`);
          } else if (lastStmt && (lastStmt.kind === "let-decl" || lastStmt.kind === "const-decl")) {
            lines.push(\`    return \${lastStmt.name};\`);
          } else if (lastStmt && lastStmt.kind === "bare-expr") {
            const emitted = serverRewriteEmitted(emitLogicNode(lastStmt, { boundary: "server" }));
            if (emitted) {
              const returnExpr = emitted.replace(/;$/, "");
              lines.push(\`    return \${returnExpr};\`);
            }
          }
        }
      } else {`,
  `      if (cpsSplit) {
        for (const idx of cpsSplit.serverStmtIndices) {
          if (idx < body.length) {
            const stmt = body[idx];
            if (stmt && stmt.kind === "reactive-decl" && cpsSplit.returnVarName === stmt.name) {
              // fix-cg-cps-return-sql-ref-placeholder (S40 follow-up): when the
              // continuation is \`@x = ?{...}.method()\`, the AST builder attached
              // a structured \`sqlNode\` so we can route through emit-logic case
              // "sql" instead of \`emitExprField(initExpr, init, ...)\` — which
              // would otherwise produce \`/_* sql-ref:N *_/\` from the SQL-placeholder
              // ExprNode that safeParseExprToNode preprocesses \`?{}\` into.
              if (stmt.sqlNode && stmt.sqlNode.kind === "sql") {
                const sqlStmt = serverRewriteEmitted(emitLogicNode(stmt.sqlNode, { boundary: "server" })) ?? "";
                const sqlExpr = sqlStmt.replace(/;\\s*$/, "");
                lines.push(\`    const _scrml_cps_return = \${sqlExpr};\`);
                continue;
              }
              const initExpr = emitExprField(stmt.initExpr, stmt.init ?? "undefined", { mode: "server" });
              lines.push(\`    const _scrml_cps_return = \${initExpr};\`);
              continue;
            }
            const code = serverRewriteEmitted(emitLogicNode(stmt, { boundary: "server" }));
            if (code) {
              for (const line of code.split("\\n")) {
                lines.push(\`    \${line}\`);
              }
            }
          }
        }
        if (cpsSplit.returnVarName && cpsSplit.serverStmtIndices.length > 0) {
          const lastServerIdx = cpsSplit.serverStmtIndices[cpsSplit.serverStmtIndices.length - 1];
          const lastStmt = body[lastServerIdx];
          if (lastStmt && lastStmt.kind === "reactive-decl" && lastStmt.name === cpsSplit.returnVarName) {
            lines.push(\`    return _scrml_cps_return;\`);
          } else if (lastStmt && (lastStmt.kind === "let-decl" || lastStmt.kind === "const-decl")) {
            lines.push(\`    return \${lastStmt.name};\`);
          } else if (lastStmt && lastStmt.kind === "bare-expr") {
            const emitted = serverRewriteEmitted(emitLogicNode(lastStmt, { boundary: "server" }));
            if (emitted) {
              const returnExpr = emitted.replace(/;$/, "");
              lines.push(\`    return \${returnExpr};\`);
            }
          }
        }
      } else {`,
  "1.emit-server.cps.useBaselineCsrf-true",
);

// ---------------------------------------------------------------------------
// 2) emit-server.ts: CPS site under useBaselineCsrf=false (L682)
// ---------------------------------------------------------------------------

patch(
  "compiler/src/codegen/emit-server.ts",
  `      if (cpsSplit) {
        for (const idx of cpsSplit.serverStmtIndices) {
          if (idx < body.length) {
            const stmt = body[idx];
            if (stmt && stmt.kind === "reactive-decl" && cpsSplit.returnVarName === stmt.name) {
              const initExpr = emitExprField(stmt.initExpr, stmt.init ?? "undefined", { mode: "server" });
              lines.push(\`  const _scrml_cps_return = \${initExpr};\`);
              continue;
            }
            const code = serverRewriteEmitted(emitLogicNode(stmt, { boundary: "server" }));
            if (code) {
              for (const line of code.split("\\n")) {
                lines.push(\`  \${line}\`);
              }
            }
          }
        }`,
  `      if (cpsSplit) {
        for (const idx of cpsSplit.serverStmtIndices) {
          if (idx < body.length) {
            const stmt = body[idx];
            if (stmt && stmt.kind === "reactive-decl" && cpsSplit.returnVarName === stmt.name) {
              // fix-cg-cps-return-sql-ref-placeholder (S40 follow-up): mirror of
              // the useBaselineCsrf=true CPS site above. Route SQL-init reactive
              // decls through emit-logic case "sql" via the structured sqlNode.
              if (stmt.sqlNode && stmt.sqlNode.kind === "sql") {
                const sqlStmt = serverRewriteEmitted(emitLogicNode(stmt.sqlNode, { boundary: "server" })) ?? "";
                const sqlExpr = sqlStmt.replace(/;\\s*$/, "");
                lines.push(\`  const _scrml_cps_return = \${sqlExpr};\`);
                continue;
              }
              const initExpr = emitExprField(stmt.initExpr, stmt.init ?? "undefined", { mode: "server" });
              lines.push(\`  const _scrml_cps_return = \${initExpr};\`);
              continue;
            }
            const code = serverRewriteEmitted(emitLogicNode(stmt, { boundary: "server" }));
            if (code) {
              for (const line of code.split("\\n")) {
                lines.push(\`  \${line}\`);
              }
            }
          }
        }`,
  "2.emit-server.cps.useBaselineCsrf-false",
);

// ---------------------------------------------------------------------------
// 3) emit-logic.ts case "reactive-decl" — handle sqlNode at top of case
//    so client-side _scrml_reactive_set("name", <sql>) is well-formed too.
// ---------------------------------------------------------------------------

patch(
  "compiler/src/codegen/emit-logic.ts",
  `    case "reactive-decl": {
      const initStr: string = node.init ?? "undefined";
      const ctx = opts.encodingCtx;
      const encodedName = ctx ? ctx.encode(node.name) : node.name;`,
  `    case "reactive-decl": {
      // fix-cg-cps-return-sql-ref-placeholder (S40 follow-up): when the
      // initializer was \`?{...}.method()\` (or bare \`?{...}\`), the AST
      // builder attached a structured \`sqlNode\` and set \`init: ""\` /
      // omitted \`initExpr\`. Recurse into case "sql" and wrap as a
      // _scrml_reactive_set call. Without this, emitExpr(initExpr, ...)
      // would render the broken sql-ref placeholder ExprNode as
      // "(slash-star) sql-ref:N (star-slash)" — the leak this fix targets
      // in combined-007-crud client.js (top-level @users = ?{...}).
      // Mirrors emit-logic case "return-stmt" + case "lift-expr" SQL handling.
      if (node.sqlNode && node.sqlNode.kind === "sql") {
        const sqlStmt = emitLogicNode(node.sqlNode, opts);
        // case "sql" emits an expression form ending in ";". Strip the trailing
        // ";" so we can wrap as \`_scrml_reactive_set(...);\`.
        const sqlExpr = sqlStmt.replace(/;\\s*$/, "");
        const ctx2 = opts.encodingCtx;
        const encodedName2 = ctx2 ? ctx2.encode(node.name) : node.name;
        // Honor the same isInit logic used by the legacy path so machine-bound
        // reassignments of SQL-init vars route through the transition guard.
        const hasTypeAnnotation2 = !!(node as any).typeAnnotation;
        const hasMachineBinding2 = !!(node as any).machineBinding;
        const isInit2 = hasTypeAnnotation2 || hasMachineBinding2 || !(opts.machineBindings?.has(node.name));
        return _emitReactiveSet(encodedName2, sqlExpr, opts, node.name, isInit2);
      }
      const initStr: string = node.init ?? "undefined";
      const ctx = opts.encodingCtx;
      const encodedName = ctx ? ctx.encode(node.name) : node.name;`,
  "3.emit-logic.reactive-decl-sql",
);

console.log("\nAll 3 codegen patches applied.");
