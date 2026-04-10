// Conformance test for: SPEC §5.2 rule 2
// "`attr=name` SHALL resolve `name` as an identifier in the current scope at
//  the point of use. The compiler SHALL emit code that passes the runtime
//  value of `name` as the attribute value."
//
// At the TAB stage this means: an unquoted identifier attribute value must be
// classified as AttrValue { kind: 'variable-ref', name: string }.

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";
import { buildAST } from "../../../src/ast-builder.js";

function run(src) {
  const bsOut = splitBlocks("test.scrml", src);
  return buildAST(bsOut);
}

describe("CONF-TAB-007: unquoted identifier attribute produces kind=variable-ref", () => {
  test("disabled=submitting produces kind=variable-ref", () => {
    const { ast } = run("<button disabled=submitting>Submit</>");
    const btn = ast.nodes[0];
    const attr = btn.attrs.find((a) => a.name === "disabled");
    expect(attr).toBeDefined();
    expect(attr.value.kind).toBe("variable-ref");
    expect(attr.value.name).toBe("submitting");
  });

  test("value=fieldVal on div produces kind=variable-ref with name='fieldVal'", () => {
    // Use div to avoid void-element closer requirement
    const { ast } = run("<div value=fieldVal>content</>");
    const el = ast.nodes[0];
    const attr = el.attrs.find((a) => a.name === "value");
    expect(attr.value.kind).toBe("variable-ref");
    expect(attr.value.name).toBe("fieldVal");
  });

  test("unquoted identifier is NOT classified as string-literal", () => {
    const { ast } = run("<div value=myVar>content</>");
    const el = ast.nodes[0];
    const attr = el.attrs.find((a) => a.name === "value");
    expect(attr.value.kind).not.toBe("string-literal");
  });

  test("unquoted identifier is NOT classified as call-ref", () => {
    const { ast } = run("<div value=myVar>content</>");
    const el = ast.nodes[0];
    const attr = el.attrs.find((a) => a.name === "value");
    expect(attr.value.kind).not.toBe("call-ref");
  });

  test("multiple unquoted identifier attributes are all variable-ref", () => {
    const { ast } = run("<div value=a title=b lang=c>content</>");
    const el = ast.nodes[0];
    for (const attr of el.attrs) {
      expect(attr.value.kind).toBe("variable-ref");
    }
  });
});
