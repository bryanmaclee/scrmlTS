// P1.E.A — Block splitter records openerHadSpaceAfterLt and permits self-closing
// state openers. Per SPEC §4.3 amended (P1) and §15.15.5, the whitespace-after-`<`
// is informational and drives W-WHITESPACE-001 from NR; it no longer gates
// downstream classification.
//
// These tests validate the BS-level facts only:
//   • openerHadSpaceAfterLt is present and correctly set on every markup/state block.
//   • Self-closing `< name attrs/>` is now permitted at BS (previously a state
//     opener required a closing tag).
//   • Both `<id>` and `< id>` continue to compile (CONF-001 and CONF-024 preserved).
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("P1.E.A: BS — openerHadSpaceAfterLt annotation", () => {
  test("no-space markup tag has openerHadSpaceAfterLt = false", () => {
    const blocks = split("<p>hello</>");
    expect(blocks[0].type).toBe("markup");
    expect(blocks[0].openerHadSpaceAfterLt).toBe(false);
  });

  test("with-space state opener has openerHadSpaceAfterLt = true", () => {
    const blocks = split("< db src=\"./x.db\" tables=\"users\"></>");
    expect(blocks[0].type).toBe("state");
    expect(blocks[0].openerHadSpaceAfterLt).toBe(true);
  });

  test("with-space state opener is also true for self-closing", () => {
    const blocks = split("< db src=\"./x.db\" tables=\"users\"/>");
    expect(blocks[0].type).toBe("state");
    expect(blocks[0].openerHadSpaceAfterLt).toBe(true);
    expect(blocks[0].closerForm).toBe("self-closing");
  });

  test("self-closing markup leaf has openerHadSpaceAfterLt = false", () => {
    const blocks = split("<img src=\"x.png\"/>");
    expect(blocks[0].type).toBe("markup");
    expect(blocks[0].openerHadSpaceAfterLt).toBe(false);
    expect(blocks[0].closerForm).toBe("self-closing");
  });

  test("nested children inherit nothing — openerHadSpaceAfterLt is per-block", () => {
    const blocks = split("<div><p>x</></>");
    expect(blocks[0].openerHadSpaceAfterLt).toBe(false);
    expect(blocks[0].children[0].openerHadSpaceAfterLt).toBe(false);
  });

  test("newline-after-< produces state with openerHadSpaceAfterLt = true", () => {
    const blocks = split("<\ndb src=\"./x.db\" tables=\"users\"></>");
    expect(blocks[0].type).toBe("state");
    expect(blocks[0].openerHadSpaceAfterLt).toBe(true);
  });

  test("HTML element opener `< div>` keeps state classification (BS-level), but openerHadSpaceAfterLt=true", () => {
    // BS still classifies on whitespace; NR (Stage 3.05) authoritatively resolves
    // kind/category against the unified registry (HTML element vs lifecycle vs user state-type).
    const blocks = split("< div></>");
    expect(blocks[0].type).toBe("state");
    expect(blocks[0].openerHadSpaceAfterLt).toBe(true);
  });
});

describe("P1.E.A: BS — self-closing state opener `< name/>` is now permitted", () => {
  test("`< db src=... tables=... />` parses as state self-closing leaf, no children", () => {
    const blocks = split("< db src=\"./x.db\" tables=\"users\"/>");
    expect(blocks[0].type).toBe("state");
    expect(blocks[0].closerForm).toBe("self-closing");
    expect(blocks[0].children).toEqual([]);
  });

  test("`< schema/>` self-close parses cleanly", () => {
    const out = splitBlocks("test.scrml", "< schema name=Foo bar(int)/>");
    expect(out.errors).toEqual([]);
    expect(out.blocks[0].type).toBe("state");
    expect(out.blocks[0].closerForm).toBe("self-closing");
  });
});
