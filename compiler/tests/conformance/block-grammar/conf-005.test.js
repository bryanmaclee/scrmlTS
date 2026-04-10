// CONF-005 | §4.2
// The amount and type of whitespace between `<` and the identifier SHALL NOT
// affect the semantics; all whitespace-separated forms are equivalent.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-005: whitespace amount/type between < and identifier does not affect semantics", () => {
  test("one space → state with name 'db'", () => {
    const blocks = split("< db></>");
    expect(blocks[0].type).toBe("state");
    expect(blocks[0].name).toBe("db");
  });

  test("multiple spaces → state with name 'db'", () => {
    const blocks = split("<   db></>");
    expect(blocks[0].type).toBe("state");
    expect(blocks[0].name).toBe("db");
  });

  test("tab → state with name 'db'", () => {
    const blocks = split("<\tdb></>");
    expect(blocks[0].type).toBe("state");
    expect(blocks[0].name).toBe("db");
  });

  test("newline → state with name 'db'", () => {
    const blocks = split("<\ndb></>");
    expect(blocks[0].type).toBe("state");
    expect(blocks[0].name).toBe("db");
  });

  test("mixed whitespace → state with name 'db'", () => {
    const blocks = split("< \t db></>");
    expect(blocks[0].type).toBe("state");
    expect(blocks[0].name).toBe("db");
  });
});
