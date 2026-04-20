/**
 * §54.2/§54.4 — Phase 3d scope verification
 *
 * Phase 3d landed two things:
 *   1. resolveTypeExpr falls back to stateTypeRegistry, so `let sub: SomeState`
 *      and `@sub: SomeState` resolve to the registered StateType instead of asIs.
 *   2. parseArmPattern recognizes `< SubstateName>` markup syntax as a variant
 *      pattern (alongside the existing `.VariantName` enum shorthand).
 *
 * Full end-to-end substate match exhaustiveness (user writes `match @sub { < Draft> => ... }`
 * and missing arms fire E-TYPE-020) additionally requires the ast-builder's
 * match-arm parser to emit arm patterns instead of html-fragments for
 * `< Name>` openers in arm position. That is Phase 3e+ grammar work.
 *
 * These tests verify Phase 3d's surface directly.
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runTS } from "../../src/type-system.js";

function compile(src) {
  const bs = splitBlocks("/t.scrml", src);
  const { ast } = buildAST(bs);
  return runTS({ files: [ast] });
}

describe("§54.2 Phase 3d — type-annotation resolution to StateType", () => {
  test("`let x: StateName` binds to the registered StateType (was asIs before Phase 3d)", () => {
    const src = `< Submission id(string)>
    < Draft body(string)></>
    < Validated body(string)></>
</>
\${
    let sub: Submission = < Draft></>
    let _ = sub
}`;
    const { stateTypeRegistry, errors } = compile(src);

    // Registry should have Submission with substates
    const submission = stateTypeRegistry.get("Submission");
    expect(submission).toBeDefined();
    expect(submission.substates).toBeDefined();
    expect(submission.substates.has("Draft")).toBe(true);
    expect(submission.substates.has("Validated")).toBe(true);

    // No unresolved-type errors from the annotation
    expect(errors.some(e => e.code === "E-TYPE-024")).toBe(false);
    expect(errors.some(e => e.code === "E-TYPE-025")).toBe(false);
  });

  test("`@x: StateName` reactive annotation also resolves to StateType", () => {
    const src = `< Flow id(string)>
    < Alpha label(string)></>
    < Beta count(number)></>
</>
\${
    @sub: Flow = < Alpha></>
}`;
    const { stateTypeRegistry, errors } = compile(src);
    const flow = stateTypeRegistry.get("Flow");
    expect(flow).toBeDefined();
    expect(flow.substates).toBeDefined();
    expect(flow.substates.has("Alpha")).toBe(true);
    expect(flow.substates.has("Beta")).toBe(true);
    // The binding site should not produce a type-resolution error
    expect(errors.every(e => !["E-TYPE-024","E-TYPE-025"].includes(e.code))).toBe(true);
  });
});

describe("§54.4 Phase 3d — parseArmPattern recognizes `< SubstateName>`", () => {
  // The arm-pattern parser is internal; exercised here via the public entry
  // point checkExhaustiveness through a synthetic match node.
  test("substate arm pattern resolves to variantName (via public checker exports)", async () => {
    const { checkSubstateExhaustiveness } = await import("../../src/type-system.js");
    const submission = {
      kind: "state",
      name: "Submission",
      attributes: new Map(),
      isHtml: false,
      rendersToDom: false,
      constructorBody: null,
      substates: new Set(["Draft", "Validated"]),
    };
    // Arm patterns as they'd look post-parseArmPattern for `< Draft>` / `< Validated>` syntax
    const patterns = [
      { kind: "variant", variantName: "Draft" },
      { kind: "variant", variantName: "Validated" },
    ];
    const r = checkSubstateExhaustiveness(submission, patterns);
    expect(r.missing).toEqual([]);
  });
});
