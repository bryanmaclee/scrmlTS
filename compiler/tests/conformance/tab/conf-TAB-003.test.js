// Conformance test for: SPEC §4.10.2 (Attribute Spanning Across Lines)
// "The markup tokenizer (TAB stage) SHALL accept tag attribute lists that span
//  multiple lines. Line breaks between attributes SHALL be treated as
//  whitespace. There is no restriction on the number of lines an attribute
//  list may occupy."
//
// The block splitter already classified <div\n  class=...\n> as a markup
// block. The TAB stage must parse its multi-line attribute list without error.

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";
import { buildAST } from "../../../src/ast-builder.js";

function run(src) {
  const bsOut = splitBlocks("test.scrml", src);
  return buildAST(bsOut);
}

describe("CONF-TAB-003: TAB accepts tag attribute lists spanning multiple lines", () => {
  test("two attributes on separate lines are both parsed", () => {
    const src = '<div\n  class="container"\n  id="main"\n>hello</>';
    const { ast } = run(src);
    const div = ast.nodes[0];
    expect(div.kind).toBe("markup");
    expect(div.tag).toBe("div");
    const names = div.attrs.map((a) => a.name);
    expect(names).toContain("class");
    expect(names).toContain("id");
  });

  test("three attributes on separate lines are all parsed", () => {
    const src = '<button\n  type="submit"\n  disabled=isLoading\n  onclick=save()\n>Go</>';
    const { ast } = run(src);
    const btn = ast.nodes[0];
    expect(btn.kind).toBe("markup");
    const names = btn.attrs.map((a) => a.name);
    expect(names).toContain("type");
    expect(names).toContain("disabled");
    expect(names).toContain("onclick");
  });

  test("attribute values are correctly classified despite multiline list", () => {
    const src = '<div\n  class="field"\n  value=fieldVal\n  onchange=handleChange()\n>hello</>';
    const { ast } = run(src);
    const el = ast.nodes[0];
    expect(el.kind).toBe("markup");
    const classAttr = el.attrs.find((a) => a.name === "class");
    expect(classAttr?.value?.kind).toBe("string-literal");
    const valAttr = el.attrs.find((a) => a.name === "value");
    expect(valAttr?.value?.kind).toBe("variable-ref");
    const evAttr = el.attrs.find((a) => a.name === "onchange");
    expect(evAttr?.value?.kind).toBe("call-ref");
  });

  test("single-line attribute list is still accepted (baseline)", () => {
    const src = '<div class="container" id="main">hello</>';
    const { ast } = run(src);
    expect(ast.nodes[0].kind).toBe("markup");
    expect(ast.nodes[0].attrs.length).toBe(2);
  });

  test("newline between the tag identifier and first attribute is accepted", () => {
    // <div\n  class="c"> — identifier on line 1, attribute on line 2
    const src = '<div\n  class="c"\n>hello</>';
    const { ast } = run(src);
    expect(ast.nodes[0].kind).toBe("markup");
    expect(ast.nodes[0].attrs[0].name).toBe("class");
  });
});
