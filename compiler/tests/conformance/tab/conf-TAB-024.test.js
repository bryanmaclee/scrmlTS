// Conformance test for: SPEC §3.1 (Context Model — MarkupElement and
// StateBlock node structures)
// Pipeline contract:
//   MarkupElement { tag: string, attrs: AttrNode[], children: ASTNode[], span }
//   StateBlock    { stateType: string, attrs: AttrNode[], children: ASTNode[], span }
//
// The TAB stage must produce the correct node shapes for markup and state
// blocks, including the correct field names and types.

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";
import { buildAST } from "../../../src/ast-builder.js";

function run(src) {
  const bsOut = splitBlocks("test.scrml", src);
  return buildAST(bsOut);
}

describe("CONF-TAB-024: markup and state nodes have correct structural shape", () => {
  test("markup node has tag, attrs, children, span fields", () => {
    const { ast } = run("<div>hello</>");
    const node = ast.nodes[0];
    expect(node.kind).toBe("markup");
    expect(typeof node.tag).toBe("string");
    expect(Array.isArray(node.attrs)).toBe(true);
    expect(Array.isArray(node.children)).toBe(true);
    expect(node.span).toBeDefined();
  });

  test("markup node.tag matches the element name", () => {
    const { ast } = run("<section>content</>");
    expect(ast.nodes[0].tag).toBe("section");
  });

  test("markup node children include nested markup blocks", () => {
    const { ast } = run("<ul>\n  <li>item</>\n</ul>");
    const ul = ast.nodes[0];
    const liChild = ul.children.find((c) => c.kind === "markup" && c.tag === "li");
    expect(liChild).toBeDefined();
  });

  test("markup node children include text nodes for raw text content", () => {
    const { ast } = run("<p>hello world</>");
    const p = ast.nodes[0];
    const textChild = p.children.find((c) => c.kind === "text");
    expect(textChild).toBeDefined();
    expect(typeof textChild.value).toBe("string");
    expect(textChild.value).toContain("hello world");
  });

  test("state node has stateType, attrs, children, span fields", () => {
    const { ast } = run('< db src="db.sql">\n  <p>hello</>\n</>');
    const node = ast.nodes[0];
    expect(node.kind).toBe("state");
    expect(typeof node.stateType).toBe("string");
    expect(Array.isArray(node.attrs)).toBe(true);
    expect(Array.isArray(node.children)).toBe(true);
    expect(node.span).toBeDefined();
  });

  test("state node stateType matches the state identifier", () => {
    const { ast } = run("< db></>");
    expect(ast.nodes[0].stateType).toBe("db");
  });

  test("state node attrs include parsed attribute nodes", () => {
    const { ast } = run('< db src="db.sql" protect="password"></>');
    const db = ast.nodes[0];
    const srcAttr = db.attrs.find((a) => a.name === "src");
    expect(srcAttr).toBeDefined();
    expect(srcAttr.value.kind).toBe("string-literal");
    expect(srcAttr.value.value).toBe("db.sql");
  });
});
