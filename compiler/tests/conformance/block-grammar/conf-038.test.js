// CONF-038 | §4.9
// The preprocessor SHALL produce output that is treated as source text by the
// block splitter. The block splitter applies its rules to the expanded text
// without knowledge of macro origin.
//
// STATUS: Stub — the preprocessor pass is not yet implemented. This test
// verifies the block splitter's behavior when given pre-expanded text directly
// (simulating what the preprocessor would produce).
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-038 (stub): preprocessor output treated as source text", () => {
  test("block splitter processes pre-expanded text identically to literal source", () => {
    // Simulate preprocessor output: the BS sees the result, not the macro
    const expandedText = '<p>hello</>'; // what INLINE_P("hello") might expand to
    const blocks = split(expandedText);
    expect(blocks[0].type).toBe("markup");
    expect(blocks[0].name).toBe("p");
  });

  // TODO: When the preprocessor pass is implemented, add integration tests that
  // run source with macros through the full PP→BS pipeline and verify the BS
  // classifies the expanded output correctly.
});
