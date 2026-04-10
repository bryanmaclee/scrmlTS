// CONF-028 | §4.7
// During `//` suppression, the characters `<`, `${`, `?{`, `#{`, `!{`, `/`,
// `}`, and `</` SHALL all be treated as raw content and SHALL NOT trigger any
// context-stack transition.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-028: all delimiters are raw content during // suppression", () => {
  test("< in comment does not open a block", () => {
    const blocks = split("// <p>\n<div>ok</>");
    expect(blocks.filter(b => b.name === "p")).toHaveLength(0);
  });

  test("${ in comment does not open logic context", () => {
    const src = "// ${ let x = 1; }\n<p>hello</>";
    const blocks = split(src);
    const p = blocks.find(b => b.name === "p");
    expect(p).toBeDefined();
    expect(p.closerForm).toBe("inferred");
  });

  test("} in comment does not close a brace context", () => {
    // ${ opens at top level; } inside comment doesn't close it; real } does
    const src = "<p>${ x = 1; // }\n}</>";
    expect(() => split(src)).not.toThrow();
  });

  test("/ in comment does not close a markup block", () => {
    // The / in the comment should not close <p>
    const src = "<p>text // /\nmore text</>";
    const blocks = split(src);
    const p = blocks.find(b => b.name === "p");
    expect(p).toBeDefined();
    // p is closed by the / after 'more text', not by the / in the comment
    expect(p.closerForm).toBe("inferred");
  });
});
