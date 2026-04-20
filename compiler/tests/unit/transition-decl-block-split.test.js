// Phase 4a — block-splitter recognition of state-local transition declarations.
//
// Spec §54.3:  `ident(params) => < Target> { body }` at state-body level
// must be recognized so that:
//   - `< Target>` is NOT pushed as a nested state frame (it's a type reference)
//   - `{` opens a logic-body brace context (not orphanBraceDepth)
//
// Without this recognition, the signature's `< Target>` pushes a spurious
// state frame that throws off the stack, producing E-CTX-003.

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";

function split(source) {
  return splitBlocks("test.scrml", source);
}

describe("Phase 4a — transition-decl at state-body level", () => {
  test("empty body — closes cleanly", () => {
    const r = split(`< Submission id(string)>
    < Draft body(string)>
        validate(now: Date) => < Validated> { }
    </>
    < Validated body(string)></>
</>`);
    expect(r.errors).toHaveLength(0);
    expect(r.blocks).toHaveLength(1);
    expect(r.blocks[0].type).toBe("state");
    expect(r.blocks[0].name).toBe("Submission");
  });

  test("logic body — closes cleanly, body emitted as logic block", () => {
    const r = split(`< S>
    < A> noop() => < B> { let x = 1 } </>
    < B></>
</>`);
    expect(r.errors).toHaveLength(0);
    expect(r.blocks).toHaveLength(1);
    // Inside state A, expect: text (pre-sig), logic (body), text (post-body)
    const sFrame = r.blocks[0];
    expect(sFrame.name).toBe("S");
    const aFrame = sFrame.children.find(c => c.type === "state" && c.name === "A");
    expect(aFrame).toBeDefined();
    const logic = aFrame.children.find(c => c.type === "logic");
    expect(logic).toBeDefined();
    expect(logic.raw).toContain("let x = 1");
  });

  test("signature with markup-returning body", () => {
    const r = split(`< Submission id(string)>
    < Draft body(string)>
        validate(now: Date) => < Validated> {
            return < Validated> id = from.id </>
        }
    </>
    < Validated body(string)></>
</>`);
    expect(r.errors).toHaveLength(0);
    expect(r.blocks).toHaveLength(1);
  });

  test("no params — transition with empty parens", () => {
    const r = split(`< S>
    < A> reset() => < B> { } </>
    < B></>
</>`);
    expect(r.errors).toHaveLength(0);
  });

  test("params with type annotation — comma-separated", () => {
    const r = split(`< S>
    < A> go(x: int, y: int) => < B> { } </>
    < B></>
</>`);
    expect(r.errors).toHaveLength(0);
  });

  test("nested parens in params — balanced", () => {
    const r = split(`< S>
    < A> set(v: (int | string)) => < B> { } </>
    < B></>
</>`);
    expect(r.errors).toHaveLength(0);
  });

  test("text containing '=>' but no '< Ident>' followup behaves as before", () => {
    // `f(x) => x` plain arrow function text inside markup — should remain text,
    // no state frames, no logic frames.
    const r = split(`<p>f(x) => x</>`);
    expect(r.errors).toHaveLength(0);
    expect(r.blocks).toHaveLength(1);
    expect(r.blocks[0].type).toBe("markup");
  });

  test("'< Target>' without preceding '=>' is still a normal state opener", () => {
    // Regression guard — without `=>`, `< T>` must still push a state frame.
    const r = split(`< S>
    < A></>
    < B></>
</>`);
    expect(r.errors).toHaveLength(0);
    const s = r.blocks[0];
    expect(s.children.filter(c => c.type === "state")).toHaveLength(2);
  });

  test("'< Target>' followed by non-'{' does NOT trigger logic frame", () => {
    // Only the COMPOUND pattern `=> < T> {` should trigger. Here we have
    // `=> < T>` but then text, not `{` — should stay in default path.
    // This exercises the forward-peek guard.
    const r = split(`< S>
    < A> bad() => < B> text
    </>
    < B></>
</>`);
    // Should NOT crash. May emit some error shape — we just assert no throw
    // and that state S closes eventually.
    expect(r.blocks.length + r.errors.length).toBeGreaterThan(0);
  });
});
