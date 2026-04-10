// CONF-025 | §4.6
// The block splitter MUST track brace-delimited context depth correctly.
// Nested braces within a brace-delimited context SHALL increment and decrement
// a brace depth counter; only when the depth counter returns to zero does the
// brace-delimited context close.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-025: brace depth tracked correctly through nested braces", () => {
  test("nested braces do not prematurely close the brace context", () => {
    // ${ if (a) { if (b) { < raw } } } — the < is inside nested braces, still raw
    const blocks = split("<p>${ if (a) { if (b) { x } } }</>");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].name).toBe("p");
  });

  test("brace context closes only at depth zero", () => {
    // After all nested braces close, the top-level } closes the ${ context
    const blocks = split("<p>${ fn(() => { return 1; }) }</>");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].name).toBe("p");
  });

  test("< after brace context closes is recognized as tag opener (sibling)", () => {
    // Close <p> first, then open <span> as a sibling at top level
    const blocks = split("<p>${ x = 1 }</>\n<span>hello</>");
    const span = blocks.find(b => b.name === "span");
    expect(span).toBeDefined();
    expect(span.type).toBe("markup");
  });
});
