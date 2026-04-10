// CONF-023 | §4.6
// Inside a brace-delimited context, `<` SHALL be treated as a raw character
// and passed through as part of the block's content without any classification.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-023: < inside brace context is passed through as raw content", () => {
  test("raw content of logic block contains the < character", () => {
    const blocks = split("<p>${ a < b }</>");
    const p = blocks.find(b => b.name === "p");
    expect(p).toBeDefined();
    // The raw property of p should include the ${ a < b } as-is
    expect(p.raw).toContain("<");
    expect(p.raw).toContain("${");
  });

  test("no blocks are created for < inside brace context", () => {
    const blocks = split("<p>${ a < b }</>");
    // Only the p block; no additional blocks from < inside the logic context
    expect(blocks).toHaveLength(1);
  });
});
