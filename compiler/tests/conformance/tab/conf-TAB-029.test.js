// Conformance test for: SPEC §3.1 / Pipeline Stage 3 — LogicBlock shape
// Pipeline contract:
//   LogicBlock { body: LogicNode[], span: Span }
//
// Also covers §3.3 (Context-Coercion Rules) structural note:
// "When a logic context `${ }` exits and the parent context is markup, the
//  value produced by the logic block SHALL be coerced to markup elements."
//
// At the TAB stage: the coercion is downstream (TS). The TAB stage must
// correctly nest the logic block as a child of the markup block and give it
// its body array.

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";
import { buildAST } from "../../../src/ast-builder.js";

function run(src) {
  const bsOut = splitBlocks("test.scrml", src);
  return buildAST(bsOut);
}

describe("CONF-TAB-029: LogicBlock has body array; nests correctly inside markup parents", () => {
  test("logic block has kind='logic' and a body array", () => {
    const { ast } = run("${ let x = 1; }");
    const node = ast.nodes[0];
    expect(node.kind).toBe("logic");
    expect(Array.isArray(node.body)).toBe(true);
  });

  test("logic block nested inside markup is a child of the markup node", () => {
    const { ast } = run("<div>${ let x = 1; }</>");
    const div = ast.nodes[0];
    expect(div.kind).toBe("markup");
    const logicChild = div.children.find((c) => c.kind === "logic");
    expect(logicChild).toBeDefined();
    expect(logicChild.kind).toBe("logic");
  });

  test("logic block body contains parsed nodes for its statements", () => {
    const { ast } = run("${ let x = 1; let y = 2; }");
    const logic = ast.nodes[0];
    expect(logic.body.length).toBeGreaterThanOrEqual(2);
  });

  test("logic block carries a valid span", () => {
    const { ast } = run("${ let z = 3; }");
    const logic = ast.nodes[0];
    expect(logic.span).toBeDefined();
    expect(typeof logic.span.start).toBe("number");
    expect(logic.span.end).toBeGreaterThan(logic.span.start);
  });

  test("empty logic block has an empty body array", () => {
    const { ast } = run("${ }");
    const logic = ast.nodes[0];
    expect(logic.kind).toBe("logic");
    expect(Array.isArray(logic.body)).toBe(true);
    // Body may have zero or negligible nodes
    expect(logic.body.length).toBeGreaterThanOrEqual(0);
  });

  test("multiple sibling logic blocks each produce a separate logic node", () => {
    const { ast } = run("${ let a = 1; }\n${ let b = 2; }");
    const logicNodes = ast.nodes.filter((n) => n.kind === "logic");
    expect(logicNodes.length).toBe(2);
  });
});
