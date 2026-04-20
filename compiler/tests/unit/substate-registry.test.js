/**
 * §54.2 — Substate Registration (S32 Phase 3b)
 *
 * When a state-constructor-def is visited with isSubstate:true, the type
 * system registers it with a `parentState` link AND adds it to the
 * parent type's `substates` set.
 *
 * Phase 3a produced the AST metadata; Phase 3b consumes it at registration
 * time. Semantic integration (match exhaustiveness, is-operator narrowing,
 * field visibility, E-STATE-FIELD-MISSING) is Phase 3c+.
 *
 * These tests compile real scrml and inspect the resulting stateTypeRegistry.
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runTS } from "../../src/type-system.js";

function registryFor(src) {
  const bs = splitBlocks("/test/app.scrml", src);
  const { ast } = buildAST(bs);
  const result = runTS({ files: [ast] });
  return result.stateTypeRegistry;
}

describe("§54.2: substates register with parentState + appear in parent's substates set", () => {
  test("top-level state has no parentState and no substates set", () => {
    const registry = registryFor(`< Solo name(string)></>`);
    const solo = registry.get("Solo");
    expect(solo).toBeDefined();
    expect(solo.parentState).toBeUndefined();
    expect(solo.substates).toBeUndefined();
  });

  test("nested substate registers with parentState pointing at the enclosing type", () => {
    const registry = registryFor(
      `< Outer name(string)>\n    < Inner body(string)></>\n</>`
    );

    const inner = registry.get("Inner");
    expect(inner).toBeDefined();
    expect(inner.parentState).toBe("Outer");
  });

  test("parent's substates set includes all declared substate names", () => {
    const registry = registryFor(
      `< Submission id(string) title(string)>\n` +
      `    < Draft body(string) draftedAt(Date)></>\n` +
      `    < Validated body(string) validatedAt(Date)></>\n` +
      `    < Submitted body(string) submittedAt(Date)></>\n` +
      `</>`
    );

    const parent = registry.get("Submission");
    expect(parent).toBeDefined();
    expect(parent.substates).toBeDefined();
    expect(parent.substates.size).toBe(3);
    expect(parent.substates.has("Draft")).toBe(true);
    expect(parent.substates.has("Validated")).toBe(true);
    expect(parent.substates.has("Submitted")).toBe(true);
  });

  test("substate-before-parent registration order still records the linkage", () => {
    // The substate's state-constructor-def may be visited before the parent's
    // outer registration completes (depth-first walk registers inside before
    // the parent state wraps up). The implementation uses a forward-ref
    // placeholder to preserve the substates set.
    const registry = registryFor(
      `< Outer base(string)>\n    < Inner item(string)></>\n</>`
    );

    const outer = registry.get("Outer");
    expect(outer).toBeDefined();
    expect(outer.substates).toBeDefined();
    expect(outer.substates.has("Inner")).toBe(true);
    // And the parent's own fields survived the placeholder overwrite:
    expect(outer.attributes.get("base")).toBeDefined();
  });

  test("no E-STATE-006 emitted by the forward-ref placeholder overwrite", () => {
    const bs = splitBlocks("/test/app.scrml",
      `< Outer base(string)>\n    < Inner item(string)></>\n</>`
    );
    const { ast } = buildAST(bs);
    const result = runTS({ files: [ast] });
    expect(result.errors.some(e => e.code === "E-STATE-006")).toBe(false);
  });
});
