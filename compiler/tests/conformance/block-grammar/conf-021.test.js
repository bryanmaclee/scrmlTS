// CONF-021 | §4.6
// While the block splitter is inside any brace-delimited context (${ }, ?{ },
// #{ }, !{ }), the `<` character SHALL NOT be recognized as a tag opener or
// a state opener.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-021: < inside brace context is not a tag/state opener", () => {
  test("< in comparison inside ${ } does not open a markup block", () => {
    const blocks = split("<p>${ count < limit }</>");
    // Should be exactly one markup block (the <p>), not two
    const markupBlocks = blocks.filter(b => b.type === "markup");
    expect(markupBlocks).toHaveLength(1);
    expect(markupBlocks[0].name).toBe("p");
  });

  test("< space in ${ } does not open a state block", () => {
    // < db would be state if at top level, but inside ${ } it is raw
    const blocks = split("<p>${ x < db ? 1 : 0 }</>");
    const stateBlocks = blocks.filter(b => b.type === "state");
    expect(stateBlocks).toHaveLength(0);
  });

  test("< in ?{ } is raw content", () => {
    const blocks = split("<p>?{ x < 5 ? 'yes' : 'no' }</>");
    const markupBlocks = blocks.filter(b => b.type === "markup");
    expect(markupBlocks).toHaveLength(1);
  });
});
