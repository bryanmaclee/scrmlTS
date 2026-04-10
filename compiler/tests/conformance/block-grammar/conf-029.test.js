// CONF-029 | §4.7
// The `//` sequence itself and all characters through the end of the line
// SHALL be treated as raw content of the current block.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-029: // and all chars through EOL are raw content", () => {
  test("comment text is included in the raw property of the enclosing block", () => {
    const blocks = split("<p>hello // this is a comment\n</>");
    const p = blocks.find(b => b.name === "p");
    expect(p).toBeDefined();
    expect(p.raw).toContain("// this is a comment");
  });

  test("comment at top level is classified as a comment block", () => {
    // A top-level // line is classified by the BS as a 'comment' type block
    const blocks = split("// top-level comment\n<p>hello</>");
    const commentBlocks = blocks.filter(b => b.type === "comment");
    expect(commentBlocks.length).toBeGreaterThan(0);
    expect(commentBlocks[0].raw).toContain("// top-level comment");
  });
});
