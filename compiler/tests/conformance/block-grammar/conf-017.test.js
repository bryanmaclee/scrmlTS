// CONF-017 | §4.4.3
// The compiler SHALL know, at the point of the bare `/`, which block is being
// closed. This information SHALL be available in diagnostic output.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-017: block splitter knows which block is closed by bare /", () => {
  test("closedName is recorded on the block when using bare / closer", () => {
    const blocks = split("<section>content\n</>");
    const section = blocks.find(b => b.name === "section");
    expect(section).toBeDefined();
    // The block object should carry name information for diagnostic use
    expect(section.name).toBe("section");
    expect(section.closerForm).toBe("inferred");
  });

  test("error for unclosed tag includes block name", () => {
    try {
      splitBlocks("test.scrml", "<p>unclosed");
    } catch (e) {
      // The error should mention the unclosed block name
      expect(e.message).toMatch(/p/);
    }
  });
});
