// CONF-031 | §4.7
// Comment suppression applies even when `//` appears inside a brace-delimited
// context. Both §4.6 and §4.7 rules are in effect simultaneously.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-031: // inside brace context triggers comment suppression", () => {
  test("// inside ${ } suppresses rest of line, both §4.6 and §4.7 apply", () => {
    // The } after the comment is on the next line; it closes the ${ context
    const src = "<p>${ x = 1; // < fake tag here\n}</>";
    const blocks = split(src);
    const p = blocks.find(b => b.name === "p");
    expect(p).toBeDefined();
    // No fake tag block should exist
    const fakeTags = blocks.filter(b => b.name === "fake");
    expect(fakeTags).toHaveLength(0);
  });

  test("// inside nested brace suppresses delimiters on that line", () => {
    const src = "<p>${ fn(() => { // ${ nested comment\n return 1; }) }</>";
    expect(() => split(src)).not.toThrow();
    const blocks = split(src);
    expect(blocks.find(b => b.name === "p")).toBeDefined();
  });
});
