// CONF-010 | §4.4.1
// Content after the trailing `/` is not part of the closed tag's content.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-010: content after trailing / is not part of closed tag", () => {
  test("sibling text after trailing / is not inside the tag", () => {
    // After <p>hello/ the tag is closed; any following content is a sibling
    const blocks = split("<p>hello</>\nafter");
    const p = blocks.find(b => b.type === "markup" && b.name === "p");
    expect(p).toBeDefined();
    // 'after' should be a sibling text block, not inside p
    const after = blocks.find(b => b.type === "text" && b.raw.includes("after"));
    expect(after).toBeDefined();
  });

  test("sibling markup after trailing / is a sibling, not child", () => {
    const blocks = split("<p>hello</>\n<span>world</>");
    const p = blocks.find(b => b.name === "p");
    const span = blocks.find(b => b.name === "span");
    expect(p).toBeDefined();
    expect(span).toBeDefined();
    // span is a top-level sibling, not a child of p
    const spanInsideP = p.children?.find(c => c.name === "span");
    expect(spanInsideP).toBeUndefined();
  });
});
