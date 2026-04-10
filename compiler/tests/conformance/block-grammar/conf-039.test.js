// CONF-039 | §4.9
// The block splitter SHALL NOT distinguish between macro-expanded characters
// and literal source characters. For block-splitting purposes, all input
// characters are equivalent regardless of origin.
//
// STATUS: Stub — preprocessor not yet implemented.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-039 (stub): BS does not distinguish macro-expanded from literal chars", () => {
  test("identical source text produces identical BS output regardless of origin", () => {
    // Two sources that produce the same text: one literal, one simulated expansion
    const literal = "<p>hello</>";
    const simulatedExpansion = "<p>hello</>"; // same text
    expect(split(literal)).toEqual(split(simulatedExpansion));
  });

  // TODO: When the preprocessor pass is implemented, verify at the API level that
  // the BS result for macro-expanded source equals the BS result for equivalent
  // literal source.
});
