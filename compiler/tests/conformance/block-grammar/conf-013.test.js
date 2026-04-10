// CONF-013 | §4.4.2
// If the innermost open tag's name does not match, this SHALL be a compile
// error (E-MARKUP-002 / E-CTX-001 at block-splitter level).
import { describe, test, expect } from "bun:test";
import { splitBlocks, BSError } from "../../../src/block-splitter.js";

function expectError(src, code) {
  // splitBlocks() collects errors rather than throwing
  const result = splitBlocks("test.scrml", src);
  const match = result.errors.find(e => e.code === code);
  expect(match, `Expected error ${code}`).toBeDefined();
  expect(match).toBeInstanceOf(BSError);
}

describe("CONF-013: mismatched explicit closer → error", () => {
  test("</wrong> when <p> is open → E-CTX-001", () => {
    expectError("<p>hello</div>", "E-CTX-001");
  });

  test("</p> when <div> is open → E-CTX-001", () => {
    expectError("<div>hello</p>", "E-CTX-001");
  });
});
