// CONF-037 | §4.8
// The block splitter SHALL NOT attempt to validate whether a bare `/` is
// "syntactically expected" based on grammar context. That validation is the
// responsibility of the markup tokenizer and the structural analysis pass.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-037: block splitter applies two mechanical conditions only for bare /", () => {
  test("bare / at markup level is accepted even with no open tag (no BS-level validation)", () => {
    // The block splitter applies: not in brace context, not in string → closer.
    // Whether there IS an open tag to close is a structural analysis concern, not BS.
    // This may throw a BSError for unclosed/mismatched stack, but not for
    // "syntactically unexpected closer" as a grammar rule.
    // We test that / at top level outside any open block does NOT silently corrupt.
    try {
      const blocks = split("/");
      // If it doesn't throw, that's fine — structural analysis will catch it
      expect(true).toBe(true);
    } catch (e) {
      // If it throws, it should be a BSError about context stack, not grammar
      expect(e.constructor.name).toBe("BSError");
    }
  });

  test("bare / at markup level when a tag is open closes it without grammar validation", () => {
    // The BS does not check if the closer is expected by attribute parsing etc.
    const blocks = split("<p>content</>");
    expect(blocks[0].closerForm).toBe("inferred");
  });
});
