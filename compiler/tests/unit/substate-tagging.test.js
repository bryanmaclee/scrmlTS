/**
 * §54.2 — Nested Substate Tagging (S32 Phase 3a)
 *
 * When a state block is declared inside another state block, the inner
 * block is a "substate" per §54.2. The AST builder tags it with:
 *   - isSubstate: true
 *   - parentState: <enclosing state name>
 *
 * Top-level state blocks remain unchanged (no metadata).
 *
 * This tagging is the foundation for Phase 3b semantic work (field
 * narrowing, match exhaustiveness across substates, E-STATE-FIELD-MISSING,
 * E-STATE-TRANSITION-ILLEGAL, E-STATE-TERMINAL-MUTATION).
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

function parse(src) {
  const bs = splitBlocks("/test/app.scrml", src);
  const { ast } = buildAST(bs);
  return ast.nodes;
}

describe("§54.2: substates tagged with isSubstate + parentState", () => {
  test("top-level state has no substate metadata", () => {
    const nodes = parse(`< Submission>
    id: string
</>`);

    expect(nodes[0].kind).toBe("state");
    expect(nodes[0].stateType).toBe("Submission");
    expect(nodes[0].isSubstate).toBeUndefined();
    expect(nodes[0].parentState).toBeUndefined();
  });

  test("single nested substate is tagged with parent name", () => {
    const nodes = parse(`< Submission>
    < Draft>
        body: string
    </>
</>`);

    const parent = nodes[0];
    expect(parent.isSubstate).toBeUndefined();

    const substates = parent.children.filter(c => c.kind === "state");
    expect(substates.length).toBe(1);
    expect(substates[0].stateType).toBe("Draft");
    expect(substates[0].isSubstate).toBe(true);
    expect(substates[0].parentState).toBe("Submission");
  });

  test("multiple sibling substates each tagged with the same parent", () => {
    const nodes = parse(`< Submission>
    < Draft>
        body: string
    </>
    < Validated>
        body: string
    </>
    < Submitted>
        body: string
    </>
</>`);

    const substates = nodes[0].children.filter(c => c.kind === "state");
    expect(substates.length).toBe(3);
    for (const s of substates) {
      expect(s.isSubstate).toBe(true);
      expect(s.parentState).toBe("Submission");
    }
    expect(substates.map(s => s.stateType)).toEqual(["Draft", "Validated", "Submitted"]);
  });

  test("non-state siblings (text, whitespace) are not tagged as substates", () => {
    const nodes = parse(`< Submission>
    id: string
    < Draft>
        body: string
    </>
</>`);

    const nonStates = nodes[0].children.filter(c => c.kind !== "state");
    for (const c of nonStates) {
      expect(c.isSubstate).toBeUndefined();
      expect(c.parentState).toBeUndefined();
    }
  });
});
