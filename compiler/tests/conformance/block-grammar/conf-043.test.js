// CONF-043 | §4.9
// Macro authors intending a state object opener MUST ensure their expansion
// includes at least one whitespace character between `<` and the identifier.
// (Equivalently: if whitespace is present → state; if absent → HTML element.)
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-043: whitespace required between < and identifier for state intent", () => {
  test("missing whitespace produces markup, not state", () => {
    // Macro that forgets the space: expands to <db> instead of < db>
    const blocks = split("<db>content</>");
    expect(blocks[0].type).toBe("markup"); // NOT state
    expect(blocks[0].name).toBe("db");
  });

  test("with whitespace produces state as intended", () => {
    const blocks = split("< db></>");
    expect(blocks[0].type).toBe("state");
  });
});
