// CONF-004 | §4.2
// The block splitter SHALL classify any `<` followed by at least one whitespace
// character before an identifier as the start of a state object.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-004: < + whitespace + identifier → state object", () => {
  test("single space between < and identifier → state", () => {
    const blocks = split('< db src="db.sql"></>');
    expect(blocks[0].type).toBe("state");
  });

  test("tab between < and identifier → state", () => {
    const blocks = split("<\tdb src=\"db.sql\"></>");
    expect(blocks[0].type).toBe("state");
  });

  test("no whitespace → markup, not state", () => {
    const blocks = split("<db src=\"db.sql\">content</>");
    expect(blocks[0].type).toBe("markup");
  });
});
