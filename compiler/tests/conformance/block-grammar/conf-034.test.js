// CONF-034 | §4.8
// `/` inside a quoted string literal at any context level SHALL be treated as
// raw content and SHALL NOT be recognized as a closer.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-034: / inside quoted string is raw content", () => {
  test("/ in double-quoted attribute value is not a closer", () => {
    const blocks = split('<a href="/home">click</>');
    const a = blocks.find(b => b.name === "a");
    expect(a).toBeDefined();
    expect(a.closerForm).toBe("inferred"); // closed by trailing / after 'click'
    expect(a.raw).toContain('"/home"');
  });

  test("multiple / in double-quoted value are all raw", () => {
    const blocks = split('<a href="/path/to/page">go</>');
    const a = blocks.find(b => b.name === "a");
    expect(a).toBeDefined();
    expect(a.closerForm).toBe("inferred");
  });

  test("/ in single-quoted attribute value is not a closer", () => {
    const blocks = split("<a href='/path/'>go</>");
    const a = blocks.find(b => b.name === "a");
    expect(a).toBeDefined();
    expect(a.closerForm).toBe("inferred");
  });
});
