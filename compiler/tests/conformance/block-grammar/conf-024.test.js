// CONF-024 | §4.6
// The block splitter SHALL only recognize `<` as a block delimiter at the
// top-level markup or state context level — that is, when no brace-delimited
// context is currently open on the context stack.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-024: < recognized as delimiter only at top-level context", () => {
  test("< at top level opens a markup block", () => {
    const blocks = split("<p>hello</>");
    expect(blocks[0].type).toBe("markup");
  });

  test("< inside nested ${ } does not open a new block", () => {
    const src = "<p>${ outer: ${ inner < 5 } }</>";
    // Should be only the outer <p> block
    expect(blocks => {
      const markup = blocks.filter(b => b.type === "markup");
      expect(markup).toHaveLength(1);
    });
    const blocks = split(src);
    const markup = blocks.filter(b => b.type === "markup");
    expect(markup).toHaveLength(1);
    expect(markup[0].name).toBe("p");
  });
});
