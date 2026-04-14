/**
 * @module codegen/reactive-deps
 *
 * AST-based reactive dependency extraction for the CG stage.
 *
 * Provides string-literal-aware extraction of @var references from expression strings,
 * replacing inline regex scanning in emit-event-wiring.js and emit-logic.js.
 *
 * The key improvement over naive regex: a scan of `@var` in `"use @theme here"` will
 * correctly return nothing (the reference is inside a string literal), whereas a bare
 * regex test on the full expression string would produce a false positive.
 *
 * Optionally filters results against a known set of reactive variable names collected
 * from the AST. This provides the scope-chain-based filtering described in Phase 4 of
 * the CG rewrite plan.
 */

import { getNodes } from "./collect.ts";
import { extractReactiveDepsFromAST, forEachIdentInExprNode } from "../expression-parser.ts";

/** A loosely-typed AST node. */
type ASTNode = Record<string, unknown>;

// ---------------------------------------------------------------------------
// extractReactiveDeps
// ---------------------------------------------------------------------------

/**
 * Extract all reactive variable names (@var) referenced in an expression string.
 *
 * Respects string literal boundaries — @var inside quoted strings is NOT extracted.
 * Handles single-quoted, double-quoted, and template literal strings.
 * Handles escaped characters inside strings.
 *
 * @param expr — raw expression string (may contain @var references)
 * @param knownReactiveVars — if provided, only return names in this set
 * @returns set of reactive variable names (without @ prefix)
 */
export function extractReactiveDeps(
  expr: string,
  knownReactiveVars: Set<string> | null = null,
): Set<string> {
  if (!expr || typeof expr !== "string") return new Set();

  // Phase 1 restructure: try acorn-based extraction first.
  // Falls back to manual scanner for expressions acorn can't parse.
  try {
    const astResult = extractReactiveDepsFromAST(expr, knownReactiveVars);
    if (astResult.size > 0) return astResult;
  } catch {
    // Acorn parse failed — fall through to manual scanner
  }

  const found = new Set<string>();
  let inString: string | null = null; // null, '"', "'", or '`'
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];

    if (inString === null) {
      if (ch === '"' || ch === "'" || ch === '`') {
        inString = ch;
        i++;
        continue;
      }
      // Check for @varName pattern
      if (ch === '@') {
        // Peek ahead: must be followed by an identifier start char
        const rest = expr.slice(i + 1);
        const m = rest.match(/^([A-Za-z_$][A-Za-z0-9_$]*)/);
        if (m) {
          const varName = m[1];
          if (knownReactiveVars === null || knownReactiveVars.has(varName)) {
            found.add(varName);
          }
          i += 1 + varName.length;
          continue;
        }
      }
      i++;
    } else {
      // Inside a string literal
      if (ch === '\\') {
        // Skip the escaped character
        i += 2;
        continue;
      }
      if (ch === inString) {
        inString = null;
      }
      i++;
    }
  }

  return found;
}

// ---------------------------------------------------------------------------
// collectReactiveVarNames
// ---------------------------------------------------------------------------

/**
 * Collect all reactive variable names declared in a fileAST.
 *
 * Walks logic blocks for reactive-decl nodes and returns their names.
 * This gives a fast lookup set for use with extractReactiveDeps filtering.
 *
 * @param fileAST
 * @returns set of reactive variable names (without @ prefix)
 */
export function collectReactiveVarNames(fileAST: Record<string, unknown>): Set<string> {
  const names = new Set<string>();
  const nodes = getNodes(fileAST);

  function visit(nodeList: unknown[]): void {
    if (!Array.isArray(nodeList)) return;
    for (const node of nodeList) {
      if (!node || typeof node !== "object") continue;
      const n = node as ASTNode;
      if (n.kind === "reactive-decl" && n.name) {
        names.add(n.name as string);
      }
      // Tilde-decl with reactive deps compiles to a derived reactive
      // Phase 4d: ExprNode-first — check initExpr for @-prefixed idents, string fallback
      if (n.kind === "tilde-decl" && n.name) {
        const initExpr = n.initExpr;
        const hasReactiveDep = initExpr
          ? _exprNodeHasReactiveRef(initExpr)
          : /@/.test((n.init as string) ?? "");
        if (hasReactiveDep) {
          names.add(n.name as string);
        }
      }
      if (n.kind === "logic" && Array.isArray(n.body)) {
        visit(n.body as unknown[]);
      }
      if (Array.isArray(n.children)) {
        visit(n.children as unknown[]);
      }
      // Recurse into control flow bodies (match arms, if/else, for/while, try)
      if (n.kind === "match-stmt" && Array.isArray((n as any).body)) {
        visit((n as any).body as unknown[]);
      }
      if (n.kind === "if-stmt") {
        if (Array.isArray((n as any).consequent)) visit((n as any).consequent as unknown[]);
        if (Array.isArray((n as any).alternate)) visit((n as any).alternate as unknown[]);
      }
      if ((n.kind === "for-stmt" || n.kind === "while-stmt") && Array.isArray((n as any).body)) {
        visit((n as any).body as unknown[]);
      }
      if (n.kind === "try-stmt") {
        if (Array.isArray((n as any).body)) visit((n as any).body as unknown[]);
        if ((n as any).catchNode && Array.isArray((n as any).catchNode.body)) visit((n as any).catchNode.body as unknown[]);
        if (Array.isArray((n as any).finallyBody)) visit((n as any).finallyBody as unknown[]);
      }
    }
  }

  visit(nodes as unknown[]);
  return names;
}

// ---------------------------------------------------------------------------
// collectDerivedVarNames
// ---------------------------------------------------------------------------

/**
 * Collect all derived reactive variable names declared in a fileAST.
 *
 * Walks logic blocks for reactive-derived-decl nodes and returns their names.
 * This set is used by rewriteReactiveRefs to route reads of derived names through
 * _scrml_derived_get() instead of _scrml_reactive_get().
 *
 * Per §6.6: `const @name = expr` declarations produce `reactive-derived-decl` nodes.
 * Their values live in the derived cache, not the reactive state map. Reads must use
 * _scrml_derived_get to benefit from lazy pull + dirty flag semantics.
 *
 * @param fileAST
 * @returns set of derived variable names (without @ prefix)
 */
export function collectDerivedVarNames(fileAST: Record<string, unknown>): Set<string> {
  const names = new Set<string>();
  const nodes = getNodes(fileAST);

  function visit(nodeList: unknown[]): void {
    if (!Array.isArray(nodeList)) return;
    for (const node of nodeList) {
      if (!node || typeof node !== "object") continue;
      const n = node as ASTNode;
      if (n.kind === "reactive-derived-decl" && n.name) {
        names.add(n.name as string);
      }
      if (n.kind === "logic" && Array.isArray(n.body)) {
        visit(n.body as unknown[]);
      }
      if (Array.isArray(n.children)) {
        visit(n.children as unknown[]);
      }
      // Recurse into control flow bodies (match arms, if/else, for/while, try)
      if (n.kind === "match-stmt" && Array.isArray((n as any).body)) {
        visit((n as any).body as unknown[]);
      }
      if (n.kind === "if-stmt") {
        if (Array.isArray((n as any).consequent)) visit((n as any).consequent as unknown[]);
        if (Array.isArray((n as any).alternate)) visit((n as any).alternate as unknown[]);
      }
      if ((n.kind === "for-stmt" || n.kind === "while-stmt") && Array.isArray((n as any).body)) {
        visit((n as any).body as unknown[]);
      }
      if (n.kind === "try-stmt") {
        if (Array.isArray((n as any).body)) visit((n as any).body as unknown[]);
        if ((n as any).catchNode && Array.isArray((n as any).catchNode.body)) visit((n as any).catchNode.body as unknown[]);
        if (Array.isArray((n as any).finallyBody)) visit((n as any).finallyBody as unknown[]);
      }
    }
  }

  visit(nodes as unknown[]);
  return names;
}

// ---------------------------------------------------------------------------
// ExprNode-aware reactive ref detection (Phase 4d)
// ---------------------------------------------------------------------------

/**
 * Check whether an ExprNode tree contains any @-prefixed ident (reactive ref).
 * Used as a fast boolean check — no need to collect all names.
 */
function _exprNodeHasReactiveRef(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  let found = false;
  forEachIdentInExprNode(node as any, (ident) => {
    if (!found && typeof ident.name === "string" && ident.name.startsWith("@")) {
      found = true;
    }
  });
  return found;
}

/**
 * Extract all reactive variable names (@var) from an ExprNode tree.
 * ExprNode-first counterpart to extractReactiveDeps (string-based).
 *
 * @param node - An ExprNode tree (e.g. initExpr, condExpr)
 * @param knownReactiveVars - Optional filter set (without @ prefix)
 * @returns Set of reactive variable names (without @ prefix)
 */
export function extractReactiveDepsFromExprNode(
  node: unknown,
  knownReactiveVars: Set<string> | null = null,
): Set<string> {
  const found = new Set<string>();
  if (!node || typeof node !== "object") return found;
  forEachIdentInExprNode(node as any, (ident) => {
    if (typeof ident.name === "string" && ident.name.startsWith("@")) {
      const varName = ident.name.slice(1); // strip @
      if (knownReactiveVars === null || knownReactiveVars.has(varName)) {
        found.add(varName);
      }
    }
  });
  return found;
}
