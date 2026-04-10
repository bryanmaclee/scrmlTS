// CONF-001 | §4.1
// The block splitter SHALL classify any `<` immediately followed by an ASCII
// letter or underscore (with zero intervening characters) as the start of an
// HTML element.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-001: < + letter/underscore → HTML element", () => {
  test("< followed immediately by lowercase letter is markup", () => {
    const blocks = split("<p>hello</>");
    expect(blocks[0].type).toBe("markup");
    expect(blocks[0].name).toBe("p");
  });

  test("< followed immediately by uppercase letter is markup", () => {
    const blocks = split("<Div>hello</>");
    expect(blocks[0].type).toBe("markup");
    expect(blocks[0].name).toBe("Div");
  });

  test("< followed immediately by underscore is markup", () => {
    const blocks = split("<_custom>hello</>");
    expect(blocks[0].type).toBe("markup");
    expect(blocks[0].name).toBe("_custom");
  });

  test("< followed by digit is NOT markup — treated as raw text", () => {
    // Digit immediately after < is not a valid identifier start per §4.1.
    // The block splitter does not recognize <1... as a tag opener; the
    // character sequence is treated as raw text content.
    const blocks = split("<1tag>hello</>");
    expect(blocks[0].type).toBe("text");
  });
});
