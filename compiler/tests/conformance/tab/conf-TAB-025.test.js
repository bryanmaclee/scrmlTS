// Conformance test for: Pipeline Stage 3 invariant
// "The AST is a pure value — no mutable shared state, no circular references."
// "The compiler SHALL track all `lift` calls within a logic block and
//  accumulate them into a typed array." (SPEC §10.4)
// "components: ComponentDef[] — const Name = <element props> definitions"
// "typeDecls: TypeDecl[]"
//
// The TAB stage must hoist component definitions (`const Name = ...`) and
// type declarations into FileAST.components and FileAST.typeDecls.

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";
import { buildAST } from "../../../src/ast-builder.js";

function run(src) {
  const bsOut = splitBlocks("test.scrml", src);
  return buildAST(bsOut);
}

describe("CONF-TAB-025: component defs and type decls are hoisted into FileAST fields", () => {
  test("const UpperCase = ... inside logic block is hoisted into FileAST.components", () => {
    const { ast } = run("${ const MyButton = <button>OK/; }");
    expect(Array.isArray(ast.components)).toBe(true);
    expect(ast.components.length).toBeGreaterThan(0);
    const comp = ast.components[0];
    expect(comp.name).toBe("MyButton");
  });

  test("component-def node has kind='component-def'", () => {
    const { ast } = run("${ const Card = <div class=\"card\">content/; }");
    const comp = ast.components[0];
    expect(comp).toBeDefined();
    expect(comp.kind).toBe("component-def");
  });

  test("type declaration inside logic block is hoisted into FileAST.typeDecls", () => {
    const { ast } = run("${ type User:record = { name: string, age: number } }");
    expect(Array.isArray(ast.typeDecls)).toBe(true);
    expect(ast.typeDecls.length).toBeGreaterThan(0);
    expect(ast.typeDecls[0].name).toBe("User");
  });

  test("lowercase const is NOT treated as component-def (only uppercase)", () => {
    const { ast } = run("${ const myVar = 42; }");
    // lowercase const should not end up in components
    const isComponent = ast.components.some((c) => c.name === "myVar");
    expect(isComponent).toBe(false);
  });

  test("FileAST.components is empty when no component defs are present", () => {
    const { ast } = run("<div>hello</>");
    expect(ast.components.length).toBe(0);
  });

  test("FileAST.typeDecls is empty when no type declarations are present", () => {
    const { ast } = run("<div>hello</>");
    expect(ast.typeDecls.length).toBe(0);
  });
});
