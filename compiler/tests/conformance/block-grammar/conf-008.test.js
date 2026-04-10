// CONF-008 | §4.3
// The disambiguation rule SHALL be applied at the block-splitting stage, before
// any tokenization of attributes or content. The result SHALL be stored as the
// block type for all downstream passes.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-008: disambiguation rule applied at block-splitting stage", () => {
  test("result stored as block type 'markup' for immediate-identifier form", () => {
    const blocks = split("<div>hello</>");
    expect(blocks[0].type).toBe("markup");
  });

  test("result stored as block type 'state' for whitespace-separated form", () => {
    const blocks = split("< db></>");
    expect(blocks[0].type).toBe("state");
  });

  test("block type is a property on the block object (downstream accessible)", () => {
    const blocks = split("<p>text</>");
    expect(blocks[0]).toHaveProperty("type");
    expect(typeof blocks[0].type).toBe("string");
  });

  test("disambiguation requires no lookahead beyond first char after <", () => {
    // The first character after < determines the type.
    // Space → state. Letter → markup. Both cases resolved at BS stage.
    expect(split("< x></>")[0].type).toBe("state");
    expect(split("<x>content</>")[0].type).toBe("markup");
  });
});
