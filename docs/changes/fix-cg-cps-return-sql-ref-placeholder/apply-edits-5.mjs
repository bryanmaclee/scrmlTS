// Route-inference must trigger server-escalation for reactive-decl with
// structured sqlNode (the same way it does for `init` strings containing
// `?{...}`). Without this, refreshList() in combined-007-crud.scrml is
// no longer escalated to server because the SQL is now structured and
// the `init` field is "".

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
  "compiler/src/route-inference.ts",
  `    if (node.kind === "reactive-decl") {
      // @name = expr — reactive-decl IS an assignment to an @-prefixed identifier.
      // Also scan the init for server-only resources and callees.
      // Phase 4d: ExprNode-first, string fallback
      const init = (node as any).initExpr ? emitStringFromTree((node as any).initExpr) : ((node as any).init ?? "");

      // Trigger 1: server-only resource in the init expression (e.g. ?{} SQL sigil).
      // Matches the same check applied to let-decl/const-decl/tilde-decl above.
      const reactDeclResourceType = detectServerOnlyResource(init);
      if (reactDeclResourceType !== null) {
        triggers.push({
          kind: "server-only-resource",
          resourceType: reactDeclResourceType,
          span: node.span,
        });
      }

      callees.push(...extractCalleesFromNode(node, "init"));
      return;
    }`,
  `    if (node.kind === "reactive-decl") {
      // @name = expr — reactive-decl IS an assignment to an @-prefixed identifier.
      // Also scan the init for server-only resources and callees.
      // Phase 4d: ExprNode-first, string fallback
      const init = (node as any).initExpr ? emitStringFromTree((node as any).initExpr) : ((node as any).init ?? "");

      // fix-cg-cps-return-sql-ref-placeholder (S40 follow-up): when the AST
      // builder attached a structured sqlNode (because the initializer was
      // \`?{...}.method()\` — see ast-builder tryConsumeSqlInit), \`init\` is
      // "" and \`initExpr\` is undefined. The SQL site is no longer visible
      // to detectServerOnlyResource(string), so we must trigger escalation
      // explicitly here. Mirrors the trigger-1 path for direct \`sql\` nodes
      // at the top of visitNode (line ~537). Without this, server-only
      // functions whose ONLY trigger was \`@x = ?{...}\` lose their route
      // (e.g. refreshList() in combined-007-crud.scrml regressed pre-fix to
      // having no emitted route).
      if ((node as any).sqlNode && (node as any).sqlNode.kind === "sql") {
        triggers.push({
          kind: "server-only-resource",
          resourceType: "sql-query",
          span: node.span,
        });
      }

      // Trigger 1: server-only resource in the init expression (e.g. ?{} SQL sigil).
      // Matches the same check applied to let-decl/const-decl/tilde-decl above.
      const reactDeclResourceType = detectServerOnlyResource(init);
      if (reactDeclResourceType !== null) {
        triggers.push({
          kind: "server-only-resource",
          resourceType: reactDeclResourceType,
          span: node.span,
        });
      }

      callees.push(...extractCalleesFromNode(node, "init"));
      return;
    }`,
  "route-inference.reactive-decl-sqlNode",
);

console.log("\nRoute-inference patch applied.");
