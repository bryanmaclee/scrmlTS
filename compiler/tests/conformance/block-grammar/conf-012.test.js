// CONF-012 | §4.4.2
// The explicit closer `</name>` SHALL match the innermost open tag whose name is `name`.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-012: </name> matches innermost open tag", () => {
  test("explicit closer matches open tag name", () => {
    const blocks = split("<p>hello</p>");
    const p = blocks.find(b => b.name === "p");
    expect(p).toBeDefined();
    expect(p.closerForm).toBe("explicit");
  });

  test("nested explicit closers: inner matched first, then outer", () => {
    const src = "<div><p>inner</p></div>";
    const blocks = split(src);
    const div = blocks.find(b => b.name === "div");
    expect(div.closerForm).toBe("explicit");
    const p = div.children.find(c => c.name === "p");
    expect(p.closerForm).toBe("explicit");
  });
});
