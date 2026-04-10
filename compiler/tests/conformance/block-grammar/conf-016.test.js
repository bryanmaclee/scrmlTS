// CONF-016 | §4.4.3
// A bare `/` SHALL NOT be used inside a `${ }` logic context (E-CTX-002).
// Per §4.8, / inside a brace-delimited context is raw content (condition 1 not met).
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-016: bare / inside ${ } is raw content, not a closer", () => {
  test("division / inside ${ } does not close outer tag", () => {
    // The outer <p> should still be open after ${ a / b }
    const blocks = split("<p>${ a / b }</>");
    const p = blocks.find(b => b.name === "p");
    expect(p).toBeDefined();
    // p is closed by the trailing / after }, not by the / inside ${}
    expect(p.closerForm).toBe("inferred");
  });

  test("multiple / inside ${ } do not trigger closer", () => {
    const blocks = split("<p>${ x / y / z }</>");
    const p = blocks.find(b => b.name === "p");
    expect(p).toBeDefined();
    expect(p.closerForm).toBe("inferred");
  });
});
