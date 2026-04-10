// CONF-035 | §4.8
// `/` in the two-character self-closing sequence `/>` SHALL NOT be classified
// as a bare closer. Self-closing void-element syntax is handled by the markup
// tokenizer.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-035: / in /> is not a bare closer", () => {
  test("<br/> does not produce a closed markup block via bare /", () => {
    const blocks = split("<br/>");
    const br = blocks.find(b => b.name === "br");
    expect(br).toBeDefined();
    // The closerForm should NOT be 'inferred' (which would mean bare / was used)
    // It should be 'self-closing' or some other form recognized by the markup tokenizer
    expect(br.closerForm).not.toBe("inferred");
  });

  test("<input/> does not use bare / closer", () => {
    const blocks = split("<input/>");
    const input = blocks.find(b => b.name === "input");
    expect(input).toBeDefined();
    expect(input.closerForm).not.toBe("inferred");
  });

  test("<img src='x'/> does not use bare / closer", () => {
    const blocks = split("<img src='x'/>");
    const img = blocks.find(b => b.name === "img");
    expect(img).toBeDefined();
    expect(img.closerForm).not.toBe("inferred");
  });
});
