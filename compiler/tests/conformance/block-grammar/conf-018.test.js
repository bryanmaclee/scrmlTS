// CONF-018 | §4.4.3 / §4.5
// When the `verbose closers` setting is enabled, all closer forms SHALL be
// normalized to `</tagname>` form in compiler output, error messages, and
// diagnostics. This normalization is for developer-facing output only and
// SHALL NOT affect compiled output.
//
// STATUS: Stub — `verbose closers` is a compiler settings feature (§27)
// not yet implemented. The block splitter records closerForm but the
// normalization layer is a later concern.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-018 (stub): verbose closers normalization (later pass)", () => {
  test("block splitter records closerForm for use by verbose closer pass", () => {
    // The BS records closerForm; the verbose closer pass will normalize it.
    const inferred = split("<p>hello</>")[0];
    expect(inferred.closerForm).toBe("inferred");

    const explicit = split("<p>hello</p>")[0];
    expect(explicit.closerForm).toBe("explicit");
  });

  // TODO: When compiler settings (§27) and the diagnostic formatter are implemented,
  // add a conformance test that verifies verbose closers normalizes output.
});
