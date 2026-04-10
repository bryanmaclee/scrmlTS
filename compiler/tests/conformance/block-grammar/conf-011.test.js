// CONF-011 | §4.4.1
// The trailing `/` SHALL NOT be used inside a `${ }` logic context.
// This is a context boundary violation (E-CTX-002).
//
// STATUS: Stub — E-CTX-002 semantic enforcement (rejecting closers inside
// brace contexts) is partially handled by the block splitter (§4.8 condition 1
// prevents bare `/` recognition inside brace contexts), but explicit E-CTX-002
// error throwing for an attempted trailing `/` inside `${ }` is a later-pass concern.
// The block splitter currently treats the `/` inside `${ }` as raw content (correct),
// but does not emit E-CTX-002 itself.
import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";

function split(src) {
  return splitBlocks("test.scrml", src).blocks;
}

describe("CONF-011 (stub): trailing / inside ${ } → E-CTX-002 (later pass)", () => {
  test("/ inside ${ } is treated as raw content by block splitter (no E-CTX-002 at BS level)", () => {
    // The block splitter does not close the outer tag when it sees / inside ${ }.
    // §4.8 condition 1 ensures / inside brace context is raw. E-CTX-002 is later.
    const blocks = split("<p>${ a / b }</>");
    const p = blocks.find(b => b.name === "p");
    expect(p).toBeDefined();
    // The p tag is eventually closed by the trailing / after the `}`, not by the / inside ${}
    expect(p.closerForm).toBe("inferred");
  });

  // TODO: When the structural analysis pass is implemented, add an E2E conformance
  // test that verifies E-CTX-002 is emitted when a trailing / appears inside ${ }.
});
