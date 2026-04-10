// Conformance test for: Pipeline Stage 3 invariant
// "`fn name { ... }` shorthand is normalized to `FunctionDecl` with
//  `kind: 'fn'`."
// (SPEC §4.11.1 mentions `fn name { ... }` as a named function form.)
// Pipeline: "FunctionDecl { name, params, body, kind: 'function' | 'fn', span }"

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";
import { buildAST } from "../../../src/ast-builder.js";

function run(src) {
  const bsOut = splitBlocks("test.scrml", src);
  return buildAST(bsOut);
}

describe("CONF-TAB-020: fn shorthand is normalized to function-decl with fnKind='fn'", () => {
  test("fn name { } inside logic block produces function-decl with fnKind='fn'", () => {
    const { ast } = run("${ fn greet { return 'hello'; } }");
    const logic = ast.nodes[0];
    const fnNode = logic.body.find((n) => n.kind === "function-decl");
    expect(fnNode).toBeDefined();
    expect(fnNode.fnKind).toBe("fn");
  });

  test("fn shorthand name is captured correctly", () => {
    const { ast } = run("${ fn doWork { } }");
    const logic = ast.nodes[0];
    const fnNode = logic.body.find((n) => n.kind === "function-decl");
    expect(fnNode.name).toBe("doWork");
  });

  test("function keyword form produces function-decl with fnKind='function'", () => {
    const { ast } = run("${ function greet(name) { return name; } }");
    const logic = ast.nodes[0];
    const fnNode = logic.body.find((n) => n.kind === "function-decl");
    expect(fnNode).toBeDefined();
    expect(fnNode.fnKind).toBe("function");
  });

  test("fn shorthand carries a valid span", () => {
    const { ast } = run("${ fn myFn { let x = 1; } }");
    const logic = ast.nodes[0];
    const fnNode = logic.body.find((n) => n.kind === "function-decl");
    expect(fnNode.span).toBeDefined();
    expect(typeof fnNode.span.start).toBe("number");
  });

  test("fn shorthand with param list parses correctly", () => {
    const { ast } = run("${ fn compute(x, y) { return x + y; } }");
    const logic = ast.nodes[0];
    const fnNode = logic.body.find((n) => n.kind === "function-decl");
    expect(fnNode).toBeDefined();
    expect(fnNode.fnKind).toBe("fn");
    // params are recorded
    expect(Array.isArray(fnNode.params)).toBe(true);
  });
});
