// CONF-046 | §3.2 / §4.4.2
// E-CTX-001: mismatched explicit closer — closer tag name does not match
// innermost open tag name.
import { describe, test, expect } from "bun:test";
import { splitBlocks, BSError } from "../../../src/block-splitter.js";

function expectError(src, code) {
  // splitBlocks() collects errors rather than throwing
  const result = splitBlocks("test.scrml", src);
  const match = result.errors.find(e => e.code === code);
  expect(match, `Expected error ${code}`).toBeDefined();
  expect(match).toBeInstanceOf(BSError);
}

describe("CONF-046: E-CTX-001 on mismatched explicit closer", () => {
  test("</div> when <p> is open → E-CTX-001", () => {
    expectError("<p>hello</div>", "E-CTX-001");
  });

  test("</p> when <div> is open → E-CTX-001", () => {
    expectError("<div>hello</p>", "E-CTX-001");
  });

  test("</p> with no open tag → E-CTX-001", () => {
    expectError("text</p>", "E-CTX-001");
  });

  test("matching explicit closer does NOT produce errors", () => {
    const result = splitBlocks("test.scrml", "<p>hello</p>");
    expect(result.errors).toHaveLength(0);
  });
});
