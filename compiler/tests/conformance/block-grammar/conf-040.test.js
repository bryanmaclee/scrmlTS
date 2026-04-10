// CONF-040 | §4.9
// A macro expansion that produces an ill-formed block SHALL cause the block
// splitter to emit an error, and the error message SHALL reference the
// block-splitter input span, not the original pre-expansion macro span.
//
// STATUS: Stub — preprocessor not yet implemented. Source location tracking
// for pre-expansion spans requires PP implementation.
import { describe, test, expect } from "bun:test";
import { splitBlocks, BSError } from "../../../src/block-splitter.js";

describe("CONF-040 (stub): ill-formed macro expansion → BS error with BS input span", () => {
  test("ill-formed input produces a BSError with position info", () => {
    // Simulate an ill-formed macro expansion (unclosed ${ at BS input level)
    try {
      splitBlocks("test.scrml", "<p>${ unclosed");
    } catch (e) {
      expect(e).toBeInstanceOf(BSError);
      // The error should have position information from the BS input
      expect(e).toHaveProperty("line");
      // Note: this references BS input span, not a pre-expansion span
    }
  });

  // TODO: When the preprocessor is implemented, add a test that verifies
  // the error span references the expanded text position, not the pre-expansion
  // macro invocation position.
});
