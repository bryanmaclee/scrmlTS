// CONF-047 | §3.2 / §4.6
// E-CTX-003: unclosed brace context at end of file — a `${`, `?{`, `#{`, or
// `!{` was opened but never closed.
import { describe, test, expect } from "bun:test";
import { splitBlocks, BSError } from "../../../src/block-splitter.js";

function expectError(src, code) {
  // splitBlocks() collects errors rather than throwing
  const result = splitBlocks("test.scrml", src);
  const match = result.errors.find(e => e.code === code);
  expect(match, `Expected error ${code}`).toBeDefined();
  expect(match).toBeInstanceOf(BSError);
}

describe("CONF-047: E-CTX-003 on unclosed brace context at EOF", () => {
  test("unclosed ${ at EOF → E-CTX-003", () => {
    expectError("<p>${ let x = 1;", "E-CTX-003");
  });

  test("unclosed ?{ at EOF → E-CTX-003", () => {
    expectError("<p>?{ query here", "E-CTX-003");
  });

  test("nested unclosed brace → E-CTX-003", () => {
    expectError("<p>${ fn(() => { return 1;", "E-CTX-003");
  });

  test("properly closed brace context does NOT produce E-CTX-003", () => {
    const result = splitBlocks("test.scrml", "<p>${ let x = 1; }</>");
    expect(result.errors.some(e => e.code === "E-CTX-003")).toBe(false);
  });
});
