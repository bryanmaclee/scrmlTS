// Conformance test for: Pipeline Stage 3 invariant
// "`import` and `export` statements are hoisted into `FileAST.imports` and
//  `FileAST.exports` regardless of where they appear in source (inline
//  imports are valid per spec Section 21)."

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";
import { buildAST } from "../../../src/ast-builder.js";

function run(src) {
  const bsOut = splitBlocks("test.scrml", src);
  return buildAST(bsOut);
}

describe("CONF-TAB-021: import/export statements are hoisted into FileAST top-level fields", () => {
  test("import inside a logic block is hoisted into FileAST.imports", () => {
    const { ast } = run("${ import { util } from './util.js'; }");
    expect(Array.isArray(ast.imports)).toBe(true);
    expect(ast.imports.length).toBeGreaterThan(0);
  });

  test("export inside a logic block is hoisted into FileAST.exports", () => {
    const { ast } = run("${ export const PI = 3.14; }");
    expect(Array.isArray(ast.exports)).toBe(true);
    expect(ast.exports.length).toBeGreaterThan(0);
  });

  test("import hoisted node carries the raw import text", () => {
    const { ast } = run("${ import { helper } from './helper.js'; }");
    const imp = ast.imports[0];
    expect(imp).toBeDefined();
    expect(typeof imp.raw).toBe("string");
    expect(imp.raw).toContain("import");
  });

  test("FileAST.imports is an array (empty when no imports)", () => {
    const { ast } = run("<div>hello</>");
    expect(Array.isArray(ast.imports)).toBe(true);
    expect(ast.imports.length).toBe(0);
  });

  test("FileAST.exports is an array (empty when no exports)", () => {
    const { ast } = run("<div>hello</>");
    expect(Array.isArray(ast.exports)).toBe(true);
    expect(ast.exports.length).toBe(0);
  });

  test("multiple imports from multiple logic blocks are all hoisted", () => {
    const { ast } = run(
      "${ import { a } from './a.js'; }\n${ import { b } from './b.js'; }"
    );
    expect(ast.imports.length).toBeGreaterThanOrEqual(2);
  });
});
