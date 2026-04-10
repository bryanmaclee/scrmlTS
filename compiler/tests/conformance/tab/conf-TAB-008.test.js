// Conformance test for: SPEC §5.2 rule 3
// "`attr=fn()` on an event attribute SHALL wire `fn` as an event listener for
//  that event. Arguments in the parentheses are forwarded to `fn` as
//  additional arguments after the native event object."
//
// At the TAB stage: an unquoted call attribute must be classified as
// AttrValue { kind: 'call-ref', name: string, args: string[] }.

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";
import { buildAST } from "../../../src/ast-builder.js";

function run(src) {
  const bsOut = splitBlocks("test.scrml", src);
  return buildAST(bsOut);
}

describe("CONF-TAB-008: unquoted call attribute produces kind=call-ref", () => {
  test("onclick=save() produces kind=call-ref with name='save'", () => {
    const { ast } = run("<button onclick=save()>Save</>");
    const btn = ast.nodes[0];
    const attr = btn.attrs.find((a) => a.name === "onclick");
    expect(attr).toBeDefined();
    expect(attr.value.kind).toBe("call-ref");
    expect(attr.value.name).toBe("save");
  });

  test("call with no arguments has an empty args array", () => {
    const { ast } = run("<button onclick=save()>Save</>");
    const btn = ast.nodes[0];
    const attr = btn.attrs.find((a) => a.name === "onclick");
    expect(Array.isArray(attr.value.args)).toBe(true);
    expect(attr.value.args.length).toBe(0);
  });

  test("call with one argument includes that argument in args", () => {
    const { ast } = run("<button onclick=save(item)>Save</>");
    const btn = ast.nodes[0];
    const attr = btn.attrs.find((a) => a.name === "onclick");
    expect(attr.value.kind).toBe("call-ref");
    expect(attr.value.args).toContain("item");
  });

  test("call with multiple arguments includes all in args array", () => {
    const { ast } = run("<form onsubmit=submit(formData, options)>go</>");
    const form = ast.nodes[0];
    const attr = form.attrs.find((a) => a.name === "onsubmit");
    expect(attr.value.kind).toBe("call-ref");
    expect(attr.value.args.length).toBe(2);
  });

  test("call-ref is NOT classified as variable-ref or string-literal", () => {
    const { ast } = run("<button onclick=handleClick()>OK</>");
    const btn = ast.nodes[0];
    const attr = btn.attrs.find((a) => a.name === "onclick");
    expect(attr.value.kind).not.toBe("variable-ref");
    expect(attr.value.kind).not.toBe("string-literal");
  });
});
