// Refine emit-logic case "reactive-decl" SQL handler — gate by
// opts.boundary === "server". On client, the SQL emission would produce
// `_scrml_sql\`...\`` which is server-only (E-CG-006 catches it). The
// client-side top-level `@x = ?{...}` placeholder leak is a SIBLING bug
// (separate code path, separate fix scope). Leaving the legacy fallthrough
// preserves the pre-existing client behavior; this fix is scoped to the
// server side per the intake.

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

patch(
  "compiler/src/codegen/emit-logic.ts",
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
  `    case "reactive-decl": {
      // fix-cg-cps-return-sql-ref-placeholder (S40 follow-up): when the
      // initializer was \`?{...}.method()\` (or bare \`?{...}\`), the AST
      // builder attached a structured \`sqlNode\` and set \`init: ""\` /
      // omitted \`initExpr\`. On the SERVER boundary we recurse into case
      // "sql" and wrap as a _scrml_reactive_set call. (E-CG-006 forbids
      // emitting _scrml_sql on the client, so the client path falls through
      // to the legacy emitter which emits the long-standing pre-existing
      // sql-ref placeholder — a sibling bug out of scope for this fix.)
      // This branch covers the rare case where a server function has a
      // non-CPS-final \`@x = ?{...}\` reactive-decl statement (the CPS-final
      // stmt is intercepted by emit-server.ts:600/684 directly without
      // reaching emit-logic).
      // Mirrors emit-logic case "return-stmt" + case "lift-expr" SQL handling.
      if (opts.boundary === "server" && node.sqlNode && node.sqlNode.kind === "sql") {
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
      // Client path (or no sqlNode): legacy emitter. If sqlNode is present
      // but boundary is client, the fallthrough relies on init=""/initExpr
      // being absent — the legacy emitter will read \`node.init ?? "undefined"\`
      // → "undefined" and emit \`_scrml_reactive_set("name", undefined)\`.
      // This is BETTER than the prior \`/_* sql-ref:N *_/\` placeholder leak
      // because it parses cleanly. The semantically-correct client-side fix
      // (mountHydrate routing) is sibling work for a follow-up intake.
      const initStr: string = node.init ?? "undefined";
      const ctx = opts.encodingCtx;
      const encodedName = ctx ? ctx.encode(node.name) : node.name;`,
  "refine.emit-logic.reactive-decl-server-only",
);

console.log("\nemit-logic refinement applied.");
