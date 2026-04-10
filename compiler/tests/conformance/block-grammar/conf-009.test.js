// CONF-009 | §4.4.1
// The trailing `/` SHALL close the innermost open markup tag or state block.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-009: trailing / closes innermost open tag", () => {
  test("trailing / on markup tag content closes the markup block", () => {
    const blocks = split("<p>hello</>");
    expect(blocks[0].type).toBe("markup");
    expect(blocks[0].closerForm).toBe("inferred");
  });

  test("nested: trailing / closes inner tag first", () => {
    const src = "<div>\n  <p>inner</>\n</>";
    const blocks = split(src);
    const div = blocks[0];
    expect(div.type).toBe("markup");
    expect(div.name).toBe("div");
    const p = div.children.find(c => c.type === "markup");
    expect(p.name).toBe("p");
    expect(p.closerForm).toBe("inferred");
  });

  test("trailing / on state block closes the state", () => {
    const src = "< db src=\"db.sql\">\n  <p>hello</>\n</>";
    const blocks = split(src);
    expect(blocks[0].type).toBe("state");
    expect(blocks[0].closerForm).toBe("inferred");
  });
});
