/**
 * Test helpers for ExprNode round-trip invariant tests.
 * Used by compiler/tests/unit/expr-node-round-trip.test.js
 */

import {
  parseExprToNode,
  emitStringFromTree,
  normalizeWhitespace,
} from "../../src/expression-parser.ts";
import type { ExprNode } from "../../src/types/ast.ts";

/**
 * Assert the round-trip invariant:
 *   normalizeWhitespace(emitStringFromTree(parseExprToNode(input))) === normalizeWhitespace(input)
 *
 * Returns the parsed ExprNode for further inspection.
 * Throws if the invariant is violated.
 */
export function assertRoundTrip(
  input: string,
  filePath = "<test>",
  offset = 0
): ExprNode {
  const node = parseExprToNode(input, filePath, offset);
  const emitted = emitStringFromTree(node);
  const norm_in = normalizeWhitespace(input);
  const norm_out = normalizeWhitespace(emitted);
  if (norm_in !== norm_out) {
    throw new Error(
      `Round-trip invariant violated for: ${JSON.stringify(input)}\n` +
        `  Expected (normalized): ${JSON.stringify(norm_in)}\n` +
        `  Got (normalized):      ${JSON.stringify(norm_out)}\n` +
        `  Raw emitted:           ${JSON.stringify(emitted)}\n` +
        `  Node kind:             ${node.kind}`
    );
  }
  return node;
}

/**
 * Parse an expression and return the ExprNode.
 * Convenience wrapper for tests that only care about the tree shape.
 */
export function parse(
  input: string,
  filePath = "<test>",
  offset = 0
): ExprNode {
  return parseExprToNode(input, filePath, offset);
}

/**
 * Assert that parsing `input` produces a node of the given kind.
 * Returns the node for further inspection.
 */
export function assertKind(
  input: string,
  expectedKind: ExprNode["kind"]
): ExprNode {
  const node = parse(input);
  if (node.kind !== expectedKind) {
    throw new Error(
      `Expected node kind ${JSON.stringify(expectedKind)} for: ${JSON.stringify(input)}\n` +
        `  Got: ${JSON.stringify(node.kind)}`
    );
  }
  return node;
}

/**
 * Count EscapeHatchExpr nodes in a tree (recursive).
 * Used to verify zero escape hatches for corpus invariant.
 */
export function countEscapeHatches(node: ExprNode): number {
  if (node.kind === "escape-hatch") return 1;
  let count = 0;
  count += walkChildren(node, countEscapeHatches);
  return count;
}

/**
 * Collect all EscapeHatchExpr nodes in a tree (recursive).
 * Returns array of { path, node } for diagnostics.
 */
export function collectEscapeHatches(
  node: ExprNode,
  path = "root"
): Array<{ path: string; estreeType: string; raw: string }> {
  if (node.kind === "escape-hatch") {
    return [{ path, estreeType: node.estreeType, raw: node.raw }];
  }
  return walkChildrenCollect(node, collectEscapeHatches, path);
}

// -------------------------------------------------------------------------
// Internal tree-walking helpers
// -------------------------------------------------------------------------

function walkChildren(node: ExprNode, fn: (n: ExprNode) => number): number {
  let count = 0;
  switch (node.kind) {
    case "ident":
    case "lit":
    case "sql-ref":
    case "input-state-ref":
    case "escape-hatch":
      break;
    case "array":
      for (const el of node.elements) {
        if (el.kind !== "spread") count += fn(el);
        else count += fn(el.value);
      }
      break;
    case "object":
      for (const prop of node.props) {
        if (prop.kind === "spread") count += fn(prop.value);
        else count += fn(prop.value);
      }
      break;
    case "spread":
      count += fn(node.value);
      break;
    case "unary":
      count += fn(node.operand);
      break;
    case "binary":
      count += fn(node.left) + fn(node.right);
      break;
    case "assign":
      count += fn(node.target) + fn(node.value);
      break;
    case "ternary":
      count += fn(node.test) + fn(node.consequent) + fn(node.alternate);
      break;
    case "member":
      count += fn(node.object);
      break;
    case "index":
      count += fn(node.object) + fn(node.index);
      break;
    case "call":
      count += fn(node.callee);
      for (const arg of node.args) count += fn(arg);
      break;
    case "new":
      count += fn(node.callee);
      for (const arg of node.args) count += fn(arg);
      break;
    case "lambda":
      if (node.body && !Array.isArray(node.body)) count += fn(node.body);
      break;
    case "cast":
      count += fn(node.expr);
      break;
    case "match-expr":
      count += fn(node.subject);
      break;
  }
  return count;
}

function walkChildrenCollect(
  node: ExprNode,
  fn: (
    n: ExprNode,
    path: string
  ) => Array<{ path: string; estreeType: string; raw: string }>,
  path: string
): Array<{ path: string; estreeType: string; raw: string }> {
  const results: Array<{ path: string; estreeType: string; raw: string }> = [];
  switch (node.kind) {
    case "ident":
    case "lit":
    case "sql-ref":
    case "input-state-ref":
    case "escape-hatch":
      break;
    case "array":
      for (let i = 0; i < node.elements.length; i++) {
        const el = node.elements[i];
        if (el.kind !== "spread") results.push(...fn(el, `${path}.elements[${i}]`));
        else results.push(...fn(el.value, `${path}.elements[${i}].value`));
      }
      break;
    case "object":
      for (let i = 0; i < node.props.length; i++) {
        const prop = node.props[i];
        if (prop.kind === "spread")
          results.push(...fn(prop.value, `${path}.props[${i}].value`));
        else results.push(...fn(prop.value, `${path}.props[${i}].value`));
      }
      break;
    case "spread":
      results.push(...fn(node.value, `${path}.value`));
      break;
    case "unary":
      results.push(...fn(node.operand, `${path}.operand`));
      break;
    case "binary":
      results.push(...fn(node.left, `${path}.left`));
      results.push(...fn(node.right, `${path}.right`));
      break;
    case "assign":
      results.push(...fn(node.target, `${path}.target`));
      results.push(...fn(node.value, `${path}.value`));
      break;
    case "ternary":
      results.push(...fn(node.test, `${path}.test`));
      results.push(...fn(node.consequent, `${path}.consequent`));
      results.push(...fn(node.alternate, `${path}.alternate`));
      break;
    case "member":
      results.push(...fn(node.object, `${path}.object`));
      break;
    case "index":
      results.push(...fn(node.object, `${path}.object`));
      results.push(...fn(node.index, `${path}.index`));
      break;
    case "call":
      results.push(...fn(node.callee, `${path}.callee`));
      for (let i = 0; i < node.args.length; i++) {
        results.push(...fn(node.args[i], `${path}.args[${i}]`));
      }
      break;
    case "new":
      results.push(...fn(node.callee, `${path}.callee`));
      for (let i = 0; i < node.args.length; i++) {
        results.push(...fn(node.args[i], `${path}.args[${i}]`));
      }
      break;
    case "lambda":
      if (node.body && !Array.isArray(node.body))
        results.push(...fn(node.body, `${path}.body`));
      break;
    case "cast":
      results.push(...fn(node.expr, `${path}.expr`));
      break;
    case "match-expr":
      results.push(...fn(node.subject, `${path}.subject`));
      break;
  }
  return results;
}
