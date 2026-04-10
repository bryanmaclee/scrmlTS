// CONF-036 | §4.8
// The block splitter SHALL track quote state (inside/outside a quoted string)
// continuously as it scans. A `"` that is not preceded by a backslash toggles
// the double-quote state; a `'` toggles the single-quote state.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-036: quote state tracked continuously", () => {
  test("/ after closing quote is a closer", () => {
    // href="/path" closes the quote; then / closes the tag
    const blocks = split('<a href="/path">link</>');
    const a = blocks.find(b => b.name === "a");
    expect(a).toBeDefined();
    expect(a.closerForm).toBe("inferred");
  });

  test("escaped quote does not toggle quote state", () => {
    // \\" inside a string should not close the string
    const blocks = split('<p title="say \\"hello\\"">text</>');
    const p = blocks.find(b => b.name === "p");
    expect(p).toBeDefined();
    expect(p.closerForm).toBe("inferred");
  });

  test("single and double quotes are tracked independently", () => {
    // double-quote string containing a single quote
    const blocks = split(`<p title="it's here">text</>`);
    const p = blocks.find(b => b.name === "p");
    expect(p).toBeDefined();
    expect(p.closerForm).toBe("inferred");
  });
});
