// CONF-026 | §4.7
// When the block splitter encounters `//` while scanning source text, it SHALL
// immediately suppress all delimiter recognition from that position to the end
// of the current line.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-026: // suppresses all delimiter recognition to end of line", () => {
  test("commented-out tag is not classified as a block", () => {
    const blocks = split("// <p>hello</>\n<span>world</>");
    // Only <span> should be a block; the commented <p> is raw content
    const markup = blocks.filter(b => b.type === "markup");
    expect(markup).toHaveLength(1);
    expect(markup[0].name).toBe("span");
  });

  test("commented-out logic opener is not a block (closer on next line)", () => {
    // Note: the // suppresses the rest of the line including any / on that line.
    // The closing / must be on a new line.
    const blocks = split("<p>// ${ let x = 1; }\n</>");
    const p = blocks.find(b => b.name === "p");
    expect(p).toBeDefined();
    // The ${ should not open a logic context — it is in a comment
    // p closes cleanly with the / on the next line
    expect(p.closerForm).toBe("inferred");
  });

  test("suppression ends at newline; next line is scanned normally", () => {
    const blocks = split("// <p>commented\n<div>real</>");
    const div = blocks.find(b => b.name === "div");
    expect(div).toBeDefined();
    expect(div.type).toBe("markup");
  });
});
