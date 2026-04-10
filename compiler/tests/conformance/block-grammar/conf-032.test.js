// CONF-032 | §4.8
// The bare `/` character SHALL be recognized as a context closer by the block
// splitter ONLY when ALL of the following conditions are satisfied simultaneously:
//   1. Not inside any open brace-delimited context
//   2. Not inside a quoted string literal
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-032: bare / recognized as closer only when both conditions met", () => {
  test("/ at markup level, outside string → closer (both conditions met)", () => {
    const blocks = split("<p>hello</>");
    expect(blocks[0].closerForm).toBe("inferred");
  });

  test("/ inside ${ } → not a closer (condition 1 fails)", () => {
    const blocks = split("<p>${ a / b }</>");
    // p is closed by the / after }, not by / inside ${}
    expect(blocks[0].closerForm).toBe("inferred");
    // and the raw includes the division /
    expect(blocks[0].raw).toContain("/ b");
  });

  test("/ inside quoted string → not a closer (condition 2 fails)", () => {
    const blocks = split('<a href="/path/to">click</>');
    const a = blocks.find(b => b.name === "a");
    expect(a).toBeDefined();
    expect(a.closerForm).toBe("inferred"); // closed by trailing / after 'click'
  });
});
