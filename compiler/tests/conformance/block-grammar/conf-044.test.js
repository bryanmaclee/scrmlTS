// CONF-044 | §4.9
// Macro authors intending an HTML element opener MUST ensure their expansion
// produces `<` immediately followed by the identifier with no intervening
// whitespace.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-044: no whitespace required between < and identifier for HTML element intent", () => {
  test("< immediately followed by identifier produces markup as intended", () => {
    const blocks = split("<div>content</>");
    expect(blocks[0].type).toBe("markup");
    expect(blocks[0].name).toBe("div");
  });

  test("accidental whitespace between < and identifier produces state, not markup", () => {
    // Macro that accidentally adds a space: < div> instead of <div>
    const blocks = split("< div></>");
    expect(blocks[0].type).toBe("state"); // NOT markup
    expect(blocks[0].name).toBe("div");
  });
});
