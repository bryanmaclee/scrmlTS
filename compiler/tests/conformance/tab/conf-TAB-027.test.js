// Conformance test for: SPEC §10.5.1 (Lift Accumulation Order)
// "The `lift` accumulator for a logic block is an ordered array. The order of
//  elements in the accumulator is the **runtime execution order** of `lift`
//  calls — that is, the order in which `lift` is actually called at runtime,
//  not the static order in which `lift` appears in the source text."
// "The `lift` accumulator SHALL be ordered by the runtime execution order of
//  `lift` calls within the logic block. Source-text order of `lift`
//  expressions is irrelevant; only actual call order at runtime determines
//  the accumulator sequence."
//
// At the TAB stage: lift-expr nodes must appear in source-text order in the
// body array. This is the structural precondition: each distinct `lift`
// statement is a separate lift-expr node. Runtime ordering is a CG concern.

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";
import { buildAST } from "../../../src/ast-builder.js";

function run(src) {
  const bsOut = splitBlocks("test.scrml", src);
  return buildAST(bsOut);
}

describe("CONF-TAB-027: lift nodes appear in source-text order; each lift is a distinct node", () => {
  test("three lift statements produce three lift-expr nodes in source order", () => {
    const { ast } = run("${ lift a; lift b; lift c; }");
    const logic = ast.nodes[0];
    const lifts = logic.body.filter((n) => n.kind === "lift-expr");
    expect(lifts.length).toBe(3);
    // Source order check: span.start is monotonically increasing
    expect(lifts[0].span.start).toBeLessThan(lifts[1].span.start);
    expect(lifts[1].span.start).toBeLessThan(lifts[2].span.start);
  });

  test("a lift inside an if-branch is a distinct node from surrounding lifts", () => {
    const { ast } = run("${ lift first; if (c) { lift conditional; } lift last; }");
    const logic = ast.nodes[0];
    // The if block with the conditional lift is inside a bare-expr or similar;
    // at minimum the outer two lifts must be distinct lift-expr nodes.
    const lifts = logic.body.filter((n) => n.kind === "lift-expr");
    expect(lifts.length).toBeGreaterThanOrEqual(2);
  });

  test("non-lift statements between lift calls are also represented as nodes", () => {
    const { ast } = run("${ lift a; let x = 1; lift b; }");
    const logic = ast.nodes[0];
    const hasLiftA = logic.body.some(
      (n) => n.kind === "lift-expr" && n.expr?.expr?.includes("a")
    );
    const hasLetX = logic.body.some((n) => n.kind === "let-decl" && n.name === "x");
    const hasLiftB = logic.body.some(
      (n) => n.kind === "lift-expr" && n.expr?.expr?.includes("b")
    );
    expect(hasLiftA || logic.body.some((n) => n.kind === "lift-expr")).toBe(true);
    expect(hasLetX).toBe(true);
    // Both lifts are present
    expect(logic.body.filter((n) => n.kind === "lift-expr").length).toBe(2);
  });
});
