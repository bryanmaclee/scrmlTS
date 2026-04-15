// Gauntlet S19: block-splitter must not emit E-SYNTAX-050 for a literal `/`
// in markup text content (e.g., between `${}` interpolations). The error is
// reserved for legacy bare-closer patterns where the `/` is adjacent to either
// another tag (`<`) or EOF.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src);
}

describe("S19: bare '/' in markup text content is literal", () => {
  test("'/' between two ${} interpolations compiles clean", () => {
    const src = [
      "${",
      "    @a = 1",
      "    @b = 2",
      "}",
      "<p>${@a} / ${@b}</>",
    ].join("\n");
    const result = split(src);
    const slashErrs = result.errors.filter((e) => e.code === "E-SYNTAX-050");
    expect(slashErrs).toEqual([]);
  });

  test("legacy bare '/' closer attempt still fires E-SYNTAX-050", () => {
    // `<p>hi/</p>`: the `/` is immediately followed by `<`, i.e., a classic
    // Phase 1/2 "trailing `/` before next tag" closer pattern. This MUST
    // still be diagnosed so users migrate to `</>` or `</tag>`.
    const result = split("<p>hi/</p>");
    const slashErrs = result.errors.filter((e) => e.code === "E-SYNTAX-050");
    expect(slashErrs.length).toBeGreaterThan(0);
  });
});
