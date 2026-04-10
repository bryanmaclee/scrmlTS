// CONF-003 | §4.1
// The compiler SHALL validate the element name against the built-in HTML element
// registry. A name that is not a known HTML element and not a defined component
// SHALL be a compile error (E-MARKUP-001).
//
// STATUS: Stub — E-MARKUP-001 is enforced by a later pass (structural analysis /
// type system), not by the block splitter. The block splitter classifies the
// block type; validation against the HTML registry happens downstream.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-003 (stub): unknown element name — E-MARKUP-001 (later pass)", () => {
  test("block splitter classifies unknown element name as markup (no error at BS level)", () => {
    // The block splitter does not know the HTML registry. It classifies by
    // character pattern only. E-MARKUP-001 is a later-pass concern.
    const blocks = split("<unknownelement>hello</>");
    expect(blocks[0].type).toBe("markup");
    expect(blocks[0].name).toBe("unknownelement");
    // No E-MARKUP-001 thrown here — that is a downstream pass responsibility.
  });

  // TODO: When the structural analysis pass (PA) is implemented, add an E2E
  // conformance test that verifies E-MARKUP-001 is emitted for unknown element names.
});
