// CONF-022 | §4.6
// The disambiguation rule (§4.3) SHALL NOT be evaluated for any `<` character
// encountered while a brace-delimited context is on the context stack.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-022: disambiguation rule not evaluated inside brace context", () => {
  test("< immediately followed by letter inside ${ } is not classified as markup", () => {
    // <p inside ${ } should not produce a markup block; < is raw content
    const blocks = split("<div>${ x <p> hello }</>");
    // Only one markup block should exist: the outer <div>
    const markupBlocks = blocks.filter(b => b.type === "markup");
    expect(markupBlocks).toHaveLength(1);
    expect(markupBlocks[0].name).toBe("div");
  });

  test("< followed by space inside ${ } is not classified as state", () => {
    const blocks = split("<div>${ x < db }</>");
    const stateBlocks = blocks.filter(b => b.type === "state");
    expect(stateBlocks).toHaveLength(0);
  });
});
