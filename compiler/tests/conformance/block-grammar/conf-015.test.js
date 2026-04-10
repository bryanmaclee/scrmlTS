// CONF-015 | §4.4.3 (Phase 3 update)
// Bare `/` is NO LONGER a valid closer. It produces E-SYNTAX-050.
// Use `</>` or `</tag>` instead.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src);
}

describe("CONF-015: bare / is no longer a valid closer (Phase 3)", () => {
  // NOTE: these test strings intentionally use bare / to verify rejection
  test("bare / in markup produces E-SYNTAX-050", () => {
    const result = split("<p>hello" + "/");
    expect(result.errors.some(e => e.code === "E-SYNTAX-050")).toBe(true);
  });

  test("E-SYNTAX-050 message suggests </>", () => {
    const result = split("<div>content" + "/");
    const err = result.errors.find(e => e.code === "E-SYNTAX-050");
    expect(err).toBeDefined();
    expect(err.message).toContain("</>");
  });

  test("</> still works as inferred closer", () => {
    const blocks = split("<p>hello</>").blocks;
    const p = blocks.find(b => b.name === "p");
    expect(p).toBeDefined();
    expect(p.closerForm).toBe("inferred");
  });

  test("</tag> still works as explicit closer", () => {
    const blocks = split("<p>hello</p>").blocks;
    const p = blocks.find(b => b.name === "p");
    expect(p).toBeDefined();
    expect(p.closerForm).toBe("explicit");
  });
});
