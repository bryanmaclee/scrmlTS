// CONF-027 | §4.7
// Comment suppression applies at ALL context levels — whether the block splitter
// is at top-level markup context, inside a brace-delimited context, or any other
// scanning state.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-027: // comment suppression applies at all context levels", () => {
  test("// inside ${ } suppresses rest of line including closing }", () => {
    // After the comment, the ${ never closes on that line.
    // The } on the next line closes it.
    const src = "<p>${ x = 1; // let y = 2; }\n}</>";
    const blocks = split(src);
    const p = blocks.find(b => b.name === "p");
    expect(p).toBeDefined();
  });

  test("// at top-level markup context suppresses delimiters on that line", () => {
    const blocks = split("// <state db>\n<p>hello</>");
    const state = blocks.filter(b => b.type === "state");
    expect(state).toHaveLength(0);
    const p = blocks.find(b => b.name === "p");
    expect(p).toBeDefined();
  });
});
