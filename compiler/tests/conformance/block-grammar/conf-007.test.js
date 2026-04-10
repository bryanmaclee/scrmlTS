// CONF-007 | §4.2
// A state block is a first-class context. Its content is markup context, with
// the state object's fields and reactive bindings in scope throughout.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-007: state block is first-class context; content is markup context", () => {
  test("state block has children that are markup blocks", () => {
    const src = '< db src="db.sql">\n  <p>hello</>\n</>';
    const blocks = split(src);
    expect(blocks[0].type).toBe("state");
    expect(blocks[0].children).toBeDefined();
    const children = blocks[0].children.filter(c => c.type !== "text");
    expect(children[0].type).toBe("markup");
    expect(children[0].name).toBe("p");
  });

  test("state block is classified at depth 0; its child markup is at depth 1", () => {
    const src = '< db src="db.sql">\n  <p>hello</>\n</>';
    const blocks = split(src);
    expect(blocks[0].depth).toBe(0);
    const childMarkup = blocks[0].children.find(c => c.type === "markup");
    expect(childMarkup.depth).toBe(1);
  });
});
