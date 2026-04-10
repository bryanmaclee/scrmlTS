// CONF-014 | §4.4.2
// An explicit closer for a state block uses `</statename>` where `statename`
// is the identifier used in the state opener.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-014: explicit closer for state block uses </statename>", () => {
  test("state block closed with </statename> uses explicit closer form", () => {
    const src = '< db src="db.sql">\n  <p>hello</>\n</db>';
    const blocks = split(src);
    const db = blocks.find(b => b.type === "state");
    expect(db).toBeDefined();
    expect(db.closerForm).toBe("explicit");
  });

  test("state block name preserved in block object", () => {
    const src = "< mystate>\n  <p>content</>\n</mystate>";
    const blocks = split(src);
    const st = blocks.find(b => b.type === "state");
    expect(st.name).toBe("mystate");
  });
});
