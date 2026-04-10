// Conformance test for: SPEC §5.2 rule 1
// "`attr=\"value\"` SHALL produce a static attribute with the literal string
//  `value`. The compiler SHALL NOT interpret the string contents as an
//  expression."
//
// Pipeline contract: "Attribute values are fully classified into their quoting
// form. No unclassified raw attribute strings remain in the AST."
// AttrValue { kind: 'string-literal', value: string }

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";
import { buildAST } from "../../../src/ast-builder.js";

function run(src) {
  const bsOut = splitBlocks("test.scrml", src);
  return buildAST(bsOut);
}

describe("CONF-TAB-006: quoted attribute produces kind=string-literal with literal value", () => {
  test("class=\"btn\" produces kind=string-literal and value='btn'", () => {
    const { ast } = run('<button class="btn">OK</>');
    const btn = ast.nodes[0];
    const classAttr = btn.attrs.find((a) => a.name === "class");
    expect(classAttr).toBeDefined();
    expect(classAttr.value.kind).toBe("string-literal");
    expect(classAttr.value.value).toBe("btn");
  });

  test("quoted value containing spaces is preserved literally", () => {
    const { ast } = run('<div class="foo bar baz">hello</>');
    const div = ast.nodes[0];
    const classAttr = div.attrs.find((a) => a.name === "class");
    expect(classAttr.value.kind).toBe("string-literal");
    expect(classAttr.value.value).toBe("foo bar baz");
  });

  test("quoted value containing identifier-like text is NOT treated as expression", () => {
    const { ast } = run('<div class="myVar">hello</>');
    const div = ast.nodes[0];
    const classAttr = div.attrs.find((a) => a.name === "class");
    expect(classAttr.value.kind).toBe("string-literal");
    // It must be string-literal, not variable-ref
    expect(classAttr.value.kind).not.toBe("variable-ref");
  });

  test("multiple quoted attributes are all classified as string-literal", () => {
    const { ast } = run('<a href="/path" target="_blank" rel="noopener">link</>');
    const a = ast.nodes[0];
    for (const attr of a.attrs) {
      expect(attr.value.kind).toBe("string-literal");
    }
  });

  test("quoted empty string is a string-literal with empty value", () => {
    // Use div to avoid void-element issues; the point is the empty quoted value
    const { ast } = run('<div placeholder="">content</>');
    const el = ast.nodes[0];
    const ph = el.attrs.find((a) => a.name === "placeholder");
    expect(ph.value.kind).toBe("string-literal");
    expect(ph.value.value).toBe("");
  });
});
