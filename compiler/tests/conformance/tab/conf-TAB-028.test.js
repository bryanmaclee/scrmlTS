// Conformance test for: SPEC §10.5.2 (Concurrent lift is Forbidden —
// structural representation)
// "lift calls within a single anonymous logic block SHALL execute in a fully
//  sequential (non-concurrent) order at runtime."
// "If the compiler's dependency graph analysis determines that two or more
//  operations in the same logic block would execute in parallel (§13.2), and
//  two or more of those operations are followed by `lift` calls in the same
//  logic block, this SHALL be a compile error (E-LIFT-001)."
// "The compiler SHALL report E-LIFT-001 during the dependency graph analysis
//  pass, before code generation."
//
// At the TAB stage: E-LIFT-001 is explicitly a DG-stage error, not a TAB
// error. The TAB stage must simply produce lift-expr nodes for all lift
// calls; it does NOT enforce E-LIFT-001. This test confirms the structural
// representation is correct (each lift is a node) and that TAB does NOT
// prematurely throw E-LIFT-001.

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";
import { buildAST } from "../../../src/ast-builder.js";

function run(src) {
  const bsOut = splitBlocks("test.scrml", src);
  return buildAST(bsOut);
}

describe("CONF-TAB-028: TAB does not enforce E-LIFT-001 (that is DG-stage concern)", () => {
  test("two lift calls after independent server calls parse without TABError", () => {
    // Pattern that would be E-LIFT-001 at DG stage:
    // two parallel server calls each followed by a lift.
    // TAB must produce lift-expr nodes, not throw.
    // Use single-quoted string to avoid template-literal ${ } confusion.
    const src = "${ let a = serverA(); let b = serverB(); lift a; lift b; }";
    expect(() => run(src)).not.toThrow();
    const { ast } = run(src);
    const logic = ast.nodes[0];
    const lifts = logic.body.filter((n) => n.kind === "lift-expr");
    expect(lifts.length).toBe(2);
  });

  test("lift after each of two server calls produces two lift-expr nodes", () => {
    const src = "${ let x = fetch1(); lift x; let y = fetch2(); lift y; }";
    const { ast } = run(src);
    const logic = ast.nodes[0];
    const lifts = logic.body.filter((n) => n.kind === "lift-expr");
    expect(lifts.length).toBe(2);
  });

  test("TAB does not add any E-LIFT-001-related error to a parallel-lift pattern", () => {
    // If TAB added such an error, it would throw a TABError. It must not.
    expect(() =>
      run("${ let a = fa(); let b = fb(); lift a; lift b; }")
    ).not.toThrow();
  });
});
