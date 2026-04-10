// CONF-042 | §4.9
// A macro expansion that introduces whitespace between `<` and an identifier
// SHALL produce the state object interpretation. This is defined behavior.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-042: whitespace insertion (< space before identifier) → state object", () => {
  test("< + space + identifier → state block regardless of origin", () => {
    // If STATE(db) expands to `< db>`, the < followed by space → state
    const blocks = split("< db></>");
    expect(blocks[0].type).toBe("state");
    expect(blocks[0].name).toBe("db");
  });

  test("< + tab + identifier → state block", () => {
    const blocks = split("<\tmystate></>");
    expect(blocks[0].type).toBe("state");
    expect(blocks[0].name).toBe("mystate");
  });
});
