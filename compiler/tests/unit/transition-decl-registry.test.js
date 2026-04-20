/**
 * §54.3 — Transition Registration (S32 Phase 4c)
 *
 * When a state-constructor-def contains `transition-decl` children,
 * the type system attaches them to the StateType as a
 * `transitions: Map<string, TransitionInfo>` field.
 *
 * TransitionInfo shape:
 *   { name, paramsRaw, targetSubstate, span }
 *
 * Phase 4a produced the block structure, Phase 4b produced the AST node.
 * Phase 4c makes the info queryable from the stateTypeRegistry so the
 * Phase 4e/4f checks (E-STATE-TRANSITION-ILLEGAL, E-STATE-TERMINAL-MUTATION)
 * have the data they need.
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

describe("§54.3 Phase 4c: transition-decl registers onto StateType.transitions", () => {
  test("state without any transitions has no transitions field", () => {
    const registry = registryFor(
      `< Submission id(string)>\n` +
      `    < Draft body(string)></>\n` +
      `    < Validated body(string)></>\n` +
      `</>`
    );
    expect(registry.get("Draft").transitions).toBeUndefined();
    expect(registry.get("Validated").transitions).toBeUndefined();
    expect(registry.get("Submission").transitions).toBeUndefined();
  });

  test("single transition attaches to its declaring substate", () => {
    const registry = registryFor(
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate(now: Date) => < Validated> { }\n` +
      `    </>\n` +
      `    < Validated body(string)></>\n` +
      `</>`
    );
    const draft = registry.get("Draft");
    expect(draft.transitions).toBeDefined();
    expect(draft.transitions instanceof Map).toBe(true);
    expect(draft.transitions.size).toBe(1);
    const validate = draft.transitions.get("validate");
    expect(validate).toBeDefined();
    expect(validate.name).toBe("validate");
    expect(validate.targetSubstate).toBe("Validated");
    expect(validate.paramsRaw).toBe("now: Date");
  });

  test("multiple transitions accumulate on one substate", () => {
    const registry = registryFor(
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate(now: Date) => < Validated> { }\n` +
      `        cancel() => < Validated> { }\n` +
      `    </>\n` +
      `    < Validated body(string)></>\n` +
      `</>`
    );
    const draft = registry.get("Draft");
    expect(draft.transitions.size).toBe(2);
    expect(draft.transitions.get("validate").targetSubstate).toBe("Validated");
    expect(draft.transitions.get("cancel").targetSubstate).toBe("Validated");
    expect(draft.transitions.get("cancel").paramsRaw).toBe("");
  });

  test("transition-decl attached only to its own substate, not siblings", () => {
    const registry = registryFor(
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate() => < Validated> { }\n` +
      `    </>\n` +
      `    < Validated body(string)>\n` +
      `        archive() => < Submitted> { }\n` +
      `    </>\n` +
      `    < Submitted body(string)></>\n` +
      `</>`
    );
    const draft = registry.get("Draft");
    const validated = registry.get("Validated");
    expect(draft.transitions.size).toBe(1);
    expect(draft.transitions.has("validate")).toBe(true);
    expect(draft.transitions.has("archive")).toBe(false);
    expect(validated.transitions.size).toBe(1);
    expect(validated.transitions.has("archive")).toBe(true);
    expect(validated.transitions.has("validate")).toBe(false);
  });

  test("parent state with declared substates does NOT inherit their transitions", () => {
    const registry = registryFor(
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate() => < Validated> { }\n` +
      `    </>\n` +
      `    < Validated body(string)></>\n` +
      `</>`
    );
    const submission = registry.get("Submission");
    expect(submission.transitions).toBeUndefined();
    expect(submission.substates).toBeDefined();
    expect(submission.substates.has("Draft")).toBe(true);
  });

  test("transition-decl on a non-substate (top-level state) still registers", () => {
    // A transition-decl without a parent substate container is unusual but
    // should not crash — the registry still attaches the transition so
    // downstream passes can surface a semantic diagnostic.
    const registry = registryFor(
      `< Solo name(string)>\n` +
      `    reset() => < Other> { }\n` +
      `</>\n`
    );
    const solo = registry.get("Solo");
    expect(solo).toBeDefined();
    expect(solo.transitions).toBeDefined();
    expect(solo.transitions.size).toBe(1);
    expect(solo.transitions.get("reset").targetSubstate).toBe("Other");
  });

  test("span is present on each TransitionInfo", () => {
    const registry = registryFor(
      `< Outer id(string)>\n    < Inner body(string)> go() => < Final> { } </>\n    < Final body(string)></>\n</>`
    );
    const inner = registry.get("Inner");
    expect(inner.transitions).toBeDefined();
    const go = inner.transitions.get("go");
    expect(go.span).toBeDefined();
    expect(typeof go.span.start).toBe("number");
    expect(go.span.end).toBeGreaterThan(go.span.start);
  });
});
