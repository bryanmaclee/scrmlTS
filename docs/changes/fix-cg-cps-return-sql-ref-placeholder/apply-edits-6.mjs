// Extend hasServerOnlyResourceInInit() to recognize the structured sqlNode
// field. Without this, CPS-eligibility detection misses reactive-decls
// whose initializer is a SQL ref now captured as sqlNode (not as `?{...}`
// string in `init`).
//
// This mirrors the existing string-based check (line 880: /\?\{`/.test(init))
// but for the structured form.

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
  `function hasServerOnlyResourceInInit(node: LogicStatement): boolean {
  // Phase 4d: ExprNode-first, string fallback
  const init = (node as any).initExpr ? emitStringFromTree((node as any).initExpr) : (typeof (node as any).init === "string" ? (node as any).init : "");
  if (!init) return false;

  // Check for SQL sigil (?{\`)
  if (/\\?\\{\`/.test(init)) return true;

  // Check for other server-only resource patterns
  if (detectServerOnlyResource(init) !== null) return true;

  return false;
}`,
  `function hasServerOnlyResourceInInit(node: LogicStatement): boolean {
  // fix-cg-cps-return-sql-ref-placeholder (S40 follow-up): when the AST
  // builder attached a structured sqlNode (because the initializer was
  // \`?{...}.method()\`), \`init\` is "" and \`initExpr\` is undefined. The
  // structured form is the canonical way to detect SQL-init from now on;
  // the legacy string match remains for back-compat / defense-in-depth.
  // Without this, \`refreshList()\` in combined-007-crud.scrml regressed to
  // E-RI-002 because CPS split was no longer detected for \`@users = ?{...}\`.
  if ((node as any).sqlNode && (node as any).sqlNode.kind === "sql") return true;

  // Phase 4d: ExprNode-first, string fallback
  const init = (node as any).initExpr ? emitStringFromTree((node as any).initExpr) : (typeof (node as any).init === "string" ? (node as any).init : "");
  if (!init) return false;

  // Check for SQL sigil (?{\`)
  if (/\\?\\{\`/.test(init)) return true;

  // Check for other server-only resource patterns
  if (detectServerOnlyResource(init) !== null) return true;

  return false;
}`,
  "route-inference.hasServerOnlyResourceInInit",
);

console.log("\nhasServerOnlyResourceInInit patch applied.");
