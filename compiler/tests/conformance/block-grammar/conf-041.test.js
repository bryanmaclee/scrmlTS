// CONF-041 | §4.9
// A macro expansion that collapses whitespace between `<` and an identifier
// SHALL produce the HTML element interpretation. This is defined behavior.
// (Simulated: if OPEN_TAG(div) expands to `<div`, the `<` immediately followed
// by `d` → HTML element.)
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-041: whitespace collapse (< immediately before identifier) → HTML element", () => {
  test("< immediately followed by identifier → markup block", () => {
    const blocks = split("<div>content</>");
    expect(blocks[0].type).toBe("markup");
    expect(blocks[0].name).toBe("div");
  });

  test("no whitespace between < and identifier is the HTML element rule regardless of origin", () => {
    // This test applies to any input — whether it came from macro expansion or literal source.
    // The rule is: < + no whitespace + identifier = HTML element.
    const blocks = split("<mycomponent>hello</>");
    expect(blocks[0].type).toBe("markup");
    expect(blocks[0].name).toBe("mycomponent");
  });
});
