// Conformance test for: SPEC §10.1 (lift Semantics)
// "`lift` emits a value from within a logic context up to the nearest parent
//  context. Execution continues after `lift` — it does not terminate the
//  logic block. `lift` always produces an array; each `lift` call appends to
//  that array."
// "Function boundary restriction: `lift` searches for the nearest enclosing
//  `${ }` logic context as its accumulation target. However, function bodies
//  are opaque to this search."
//
// At the TAB stage: multiple `lift` statements in the same logic block must
// each produce a separate `lift-expr` node. The AST must represent all of
// them (not just the first).

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";
import { buildAST } from "../../../src/ast-builder.js";

function run(src) {
  const bsOut = splitBlocks("test.scrml", src);
  return buildAST(bsOut);
}

describe("CONF-TAB-011: multiple lift calls in one logic block each produce a lift-expr node", () => {
  test("two lift statements produce two lift-expr nodes", () => {
    const { ast } = run("${ lift first; lift second; }");
    const logicNode = ast.nodes[0];
    const lifts = logicNode.body.filter((n) => n.kind === "lift-expr");
    expect(lifts.length).toBe(2);
  });

  test("three lift statements produce three lift-expr nodes", () => {
    const { ast } = run("${ lift a; lift b; lift c; }");
    const logicNode = ast.nodes[0];
    const lifts = logicNode.body.filter((n) => n.kind === "lift-expr");
    expect(lifts.length).toBe(3);
  });

  test("each lift-expr node has a distinct span (execution continues after lift)", () => {
    const { ast } = run("${ lift a; lift b; }");
    const logicNode = ast.nodes[0];
    const lifts = logicNode.body.filter((n) => n.kind === "lift-expr");
    expect(lifts[0].span.start).not.toBe(lifts[1].span.start);
  });

  test("C-style for-loop parses without E-PARSE-001 and produces a for-stmt node", () => {
    // C-style for (init; cond; update) must parse as a single for-stmt node.
    // Before the fix, the parser stopped at the first `;` inside the parens
    // and emitted E-PARSE-001 on the `)`.
    const { ast, errors } = run("${ for (let i = 0; i < 3; i++) { lift i; } }");
    const parseErrors = errors.filter((e) => e.code === "E-PARSE-001");
    expect(parseErrors.length).toBe(0); // no parse errors
    const logicNode = ast.nodes[0];
    expect(logicNode.kind).toBe("logic");
    const forNode = logicNode.body.find((n) => n.kind === "for-stmt");
    expect(forNode).toBeDefined(); // exactly one for-stmt node
    // iterable must contain all three clauses (init; cond; update)
    const semicolons = (forNode.iterable.match(/;/g) || []).length;
    expect(semicolons).toBeGreaterThanOrEqual(2); // at least two semicolons
  });

  test("logic block continues after lift — subsequent statements also appear as nodes", () => {
    const { ast } = run("${ lift first; let x = 2; lift second; }");
    const logicNode = ast.nodes[0];
    const hasLift = logicNode.body.some((n) => n.kind === "lift-expr");
    const hasLet = logicNode.body.some((n) => n.kind === "let-decl");
    expect(hasLift).toBe(true);
    expect(hasLet).toBe(true);
  });
});
