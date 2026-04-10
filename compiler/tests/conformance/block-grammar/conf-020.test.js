// CONF-020 | §4.5
// The developer MAY write any closer form regardless of the `verbose closers`
// compiler setting. The setting affects output only, not what is accepted as input.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-020: all closer forms accepted regardless of settings", () => {
  test("trailing / is accepted", () => {
    expect(() => split("<p>hello</>")).not.toThrow();
  });

  test("explicit </name> is accepted", () => {
    expect(() => split("<p>hello</p>")).not.toThrow();
  });

  test("bare / on its own line is accepted", () => {
    expect(() => split("<p>hello\n</>")).not.toThrow();
  });

  test("mixed closer forms in same file are accepted", () => {
    const src = "<div>\n  <p>inner</>\n  <span>other</span>\n</>";
    expect(() => split(src)).not.toThrow();
  });
});
