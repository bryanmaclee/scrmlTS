/**
 * Shared AST-walk helper for the W1 / UVB validators.
 *
 * Walks every reachable node in a FileAST.nodes tree, including:
 *   - markup children
 *   - logic.body / logic.imports / logic.exports / logic.typeDecls / logic.components
 *   - if-stmt / if-expr consequent + alternate
 *   - for-stmt / for-expr / while-stmt / switch-stmt / match-stmt / match-expr body
 *   - try-stmt body + catch.body + finally.body
 *   - lift-expr.expr.node (LiftTarget — kind:"markup" carries an inline node)
 *   - state / state-constructor-def children
 *
 * Calls a visitor with each node it reaches. The visitor decides whether to
 * push diagnostics. The walker NEVER mutates — it is read-only.
 *
 * Usage:
 *   walkFileAst(fileAst, (node) => { if (predicate(node)) errors.push(...); });
 *
 * Why a shared helper: VP-1 / VP-2 / VP-3 all walk the same AST shape with
 * different per-node logic. Without a shared walker, each validator
 * re-implements the same recursion and silently misses node kinds. The
 * earlier W1 implementation missed `lift-expr.expr.node` and `for-stmt.body`,
 * which silently dropped UserBadge from the post-CE invariant pass.
 */

import type { FileAST } from "../types/ast.ts";

export type AstVisitor = (node: unknown) => void;

/**
 * Walk every node reachable from a FileAST.nodes tree.
 */
export function walkFileAst(ast: FileAST | null | undefined, visit: AstVisitor): void {
  if (!ast) return;
  for (const n of ast.nodes ?? []) walkNode(n, visit);
}

/**
 * Walk a single node and recurse into all known child-bearing fields.
 */
export function walkNode(node: unknown, visit: AstVisitor): void {
  if (!node || typeof node !== "object") return;

  visit(node);

  const n = node as Record<string, unknown>;
  const kind = n.kind as string | undefined;

  // markup, state, state-constructor-def: children + attrs
  if (kind === "markup" || kind === "state" || kind === "state-constructor-def") {
    if (Array.isArray(n.children)) for (const c of n.children) walkNode(c, visit);
    // (attrs are not nodes — they're {name, value, span} records — skip)
    return;
  }

  // logic: body + hoisted lists
  if (kind === "logic") {
    if (Array.isArray(n.body)) for (const c of n.body) walkNode(c, visit);
    if (Array.isArray(n.imports)) for (const c of n.imports) walkNode(c, visit);
    if (Array.isArray(n.exports)) for (const c of n.exports) walkNode(c, visit);
    if (Array.isArray(n.typeDecls)) for (const c of n.typeDecls) walkNode(c, visit);
    if (Array.isArray(n.components)) for (const c of n.components) walkNode(c, visit);
    return;
  }

  // if-stmt, if-expr: consequent + alternate
  if (kind === "if-stmt" || kind === "if-expr") {
    if (Array.isArray(n.consequent)) for (const c of n.consequent) walkNode(c, visit);
    if (Array.isArray(n.alternate)) for (const c of n.alternate) walkNode(c, visit);
    return;
  }

  // for-stmt, for-expr, while-stmt, switch-stmt, match-stmt, match-expr: body
  if (
    kind === "for-stmt" ||
    kind === "for-expr" ||
    kind === "while-stmt" ||
    kind === "switch-stmt" ||
    kind === "match-stmt" ||
    kind === "match-expr"
  ) {
    if (Array.isArray(n.body)) for (const c of n.body) walkNode(c, visit);
    return;
  }

  // try-stmt: body + catch.body + finally.body
  if (kind === "try-stmt") {
    if (Array.isArray(n.body)) for (const c of n.body) walkNode(c, visit);
    const catchNode = n.catchNode as { body?: unknown[] } | undefined;
    if (catchNode && Array.isArray(catchNode.body)) {
      for (const c of catchNode.body) walkNode(c, visit);
    }
    const finallyNode = n.finallyNode as { body?: unknown[] } | undefined;
    if (finallyNode && Array.isArray(finallyNode.body)) {
      for (const c of finallyNode.body) walkNode(c, visit);
    }
    return;
  }

  // lift-expr: expr is a LiftTarget; if kind:"markup" it carries an inline node
  if (kind === "lift-expr") {
    const expr = n.expr as { kind?: string; node?: unknown } | undefined;
    if (expr && expr.kind === "markup" && expr.node) walkNode(expr.node, visit);
    return;
  }

  // guarded-expr: guardedNode + arms
  if (kind === "guarded-expr") {
    if (n.guardedNode) walkNode(n.guardedNode, visit);
    // arms: ErrorArm[] — handler is a string, no nodes inside; skip.
    return;
  }

  // function-decl / let-decl / const-decl / etc. may carry bodies in some shapes.
  // Generic fallback: if there's a `body` array of nodes, walk it.
  if (Array.isArray(n.body)) for (const c of n.body as unknown[]) walkNode(c, visit);
  if (Array.isArray(n.children)) for (const c of n.children as unknown[]) walkNode(c, visit);
  if (Array.isArray(n.consequent)) for (const c of n.consequent as unknown[]) walkNode(c, visit);
  if (Array.isArray(n.alternate)) for (const c of n.alternate as unknown[]) walkNode(c, visit);
  if (Array.isArray(n.branches)) for (const c of n.branches as unknown[]) walkNode(c, visit);
  if (Array.isArray(n.arms)) for (const c of n.arms as unknown[]) walkNode(c, visit);
}
