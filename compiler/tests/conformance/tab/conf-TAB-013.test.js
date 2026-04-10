// Conformance test for: SPEC §10.4 — "The compiler SHALL track all `lift`
// calls within a logic block and accumulate them into a typed array."
// "The compiler SHALL validate that all lifted values are of a compatible
//  type. Lifting heterogeneous types that are not mutually coercible SHALL be
//  a compile error (E-TYPE-012)."
//
// At the TAB stage: the compiler records lift-expr nodes in order. Type
// validation is a downstream concern (TS stage), but the TAB stage must
// produce a correctly-ordered list so that TS can validate them.
// Pipeline contract: "`lift` expressions are represented as `LiftExpr` nodes,
// not as raw JS strings."

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";
import { buildAST } from "../../../src/ast-builder.js";

function run(src) {
  const bsOut = splitBlocks("test.scrml", src);
  return buildAST(bsOut);
}

describe("CONF-TAB-013: lift-expr nodes are structured nodes not raw JS strings", () => {
  test("lift-expr has a structured `expr` field, not a raw string body", () => {
    const { ast } = run("${ lift myValue; }");
    const logic = ast.nodes[0];
    const lift = logic.body.find((n) => n.kind === "lift-expr");
    expect(lift).toBeDefined();
    // The expr field must be an object with a `kind` discriminant
    expect(typeof lift.expr).toBe("object");
    expect(lift.expr).not.toBeNull();
    expect(typeof lift.expr.kind).toBe("string");
  });

  test("lift-expr with markup target has expr.kind === 'markup' or 'expr'", () => {
    const { ast } = run("${\n  lift <li>item/;\n}");
    const logic = ast.nodes[0];
    const lift = logic.body.find((n) => n.kind === "lift-expr");
    expect(lift).toBeDefined();
    expect(["markup", "expr"]).toContain(lift.expr.kind);
  });

  test("lift-expr with plain identifier has expr.kind === 'expr'", () => {
    const { ast } = run("${ lift someIdentifier; }");
    const logic = ast.nodes[0];
    const lift = logic.body.find((n) => n.kind === "lift-expr");
    expect(lift.expr.kind).toBe("expr");
  });

  test("lift-expr nodes appear in source order within the logic body", () => {
    const { ast } = run("${ lift first; lift second; lift third; }");
    const logic = ast.nodes[0];
    const lifts = logic.body.filter((n) => n.kind === "lift-expr");
    expect(lifts.length).toBe(3);
    // Source order: first.span.start < second.span.start < third.span.start
    expect(lifts[0].span.start).toBeLessThan(lifts[1].span.start);
    expect(lifts[1].span.start).toBeLessThan(lifts[2].span.start);
  });

  test("lift body is NOT a raw string — it is a structured node", () => {
    const { ast } = run("${ lift item; }");
    const logic = ast.nodes[0];
    const lift = logic.body.find((n) => n.kind === "lift-expr");
    // The expr field must not be a raw string
    expect(typeof lift.expr).not.toBe("string");
  });
});
