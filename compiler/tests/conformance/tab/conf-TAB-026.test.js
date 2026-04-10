// Conformance test for: SPEC §3.2 Context Stack Rules
// "The compiler SHALL maintain a context stack."
// "An unclosed context at end of file SHALL be a compile error (E-CTX-003)."
//
// NOTE: E-CTX-003 is now collected into errors[] rather than thrown — the block
// splitter continues scanning after each error to surface all problems in one pass.
// This test confirms both the error-collection behavior (negative cases) and that
// well-formed inputs produce valid AST nodes (positive cases).

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";
import { buildAST, TABError } from "../../../src/ast-builder.js";

function run(src) {
  const bsOut = splitBlocks("test.scrml", src);
  return buildAST(bsOut);
}

describe("CONF-TAB-026: TAB operates on balanced blocks from BS; valid inputs produce valid AST", () => {
  test("a well-formed markup block produces a markup node without error", () => {
    expect(() => run("<div>hello</>")).not.toThrow();
    const { ast } = run("<div>hello</>");
    expect(ast.nodes[0].kind).toBe("markup");
  });

  test("a well-formed logic block produces a logic node without error", () => {
    expect(() => run("${ let x = 1; }")).not.toThrow();
    const { ast } = run("${ let x = 1; }");
    expect(ast.nodes[0].kind).toBe("logic");
  });

  test("a well-formed state block produces a state node without error", () => {
    expect(() => run('< db src="db.sql"></>\n')).not.toThrow();
    const { ast } = run('< db src="db.sql"></>\n');
    expect(ast.nodes[0].kind).toBe("state");
  });

  test("a well-formed meta block produces a meta node without error", () => {
    expect(() => run("<div>^{ let x = 1; }</>")).not.toThrow();
  });

  test("BS error recovery: unclosed context at EOF is reported in errors[], does not throw", () => {
    // splitBlocks() no longer throws — it collects E-CTX-003 into errors[] and
    // returns whatever blocks were parsed up to the unclosed context.
    let result;
    expect(() => {
      result = splitBlocks("test.scrml", "<div>unclosed");
    }).not.toThrow();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].code).toBe("E-CTX-003");
  });

  test("nested markup blocks: each level produces a correctly-parented node", () => {
    const { ast } = run("<section>\n  <div>\n    <p>text</>\n  </div>\n</section>");
    const section = ast.nodes[0];
    expect(section.kind).toBe("markup");
    expect(section.tag).toBe("section");
    const div = section.children.find((c) => c.kind === "markup");
    expect(div).toBeDefined();
    expect(div.tag).toBe("div");
  });
});
