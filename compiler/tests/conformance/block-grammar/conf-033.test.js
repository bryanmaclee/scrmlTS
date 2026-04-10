// CONF-033 | §4.8
// `/` inside a brace-delimited context SHALL be treated as raw content
// (division operator, regex delimiter, URL component, etc.).
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-033: / inside brace context is raw content", () => {
  test("division operator / inside ${ } does not close outer tag", () => {
    const blocks = split("<p>${ total / count }</>");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].name).toBe("p");
    expect(blocks[0].closerForm).toBe("inferred");
  });

  test("multiple / inside ${ } are all raw", () => {
    const blocks = split("<p>${ a / b / c }</>");
    expect(blocks[0].closerForm).toBe("inferred");
    expect(blocks[0].raw).toContain("a / b / c");
  });

  test("/ inside ?{ } is raw", () => {
    const blocks = split("<p>?{ x / y }</>");
    expect(blocks[0].closerForm).toBe("inferred");
  });
});
