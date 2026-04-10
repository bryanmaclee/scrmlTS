// CONF-006 | §4.2
// A state identifier SHALL match a known state type or a user-declared state
// name in scope. An unrecognized state identifier SHALL be a compile error (E-STATE-001).
//
// STATUS: Stub — E-STATE-001 state name validation happens in the structural
// analysis / type system pass, not the block splitter. The block splitter records
// the state name for downstream validation.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-006 (stub): unrecognized state identifier — E-STATE-001 (later pass)", () => {
  test("block splitter records state name regardless of whether it is known", () => {
    // The block splitter does not validate state names against a registry.
    // It records block type and name; downstream passes enforce E-STATE-001.
    const blocks = split("< unknownstate></>");
    expect(blocks[0].type).toBe("state");
    expect(blocks[0].name).toBe("unknownstate");
    // No E-STATE-001 thrown here — that is a downstream pass responsibility.
  });

  // TODO: When the structural analysis pass (PA) is implemented, add an E2E
  // conformance test that verifies E-STATE-001 is emitted for unrecognized state names.
});
