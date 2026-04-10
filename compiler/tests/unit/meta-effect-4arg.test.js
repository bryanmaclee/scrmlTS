/**
 * meta-effect-4arg.test.js — 4-Argument _scrml_meta_effect Runtime Tests
 *
 * Tests for the updated _scrml_meta_effect runtime function.
 * Covers SPEC §22.5: the 4-argument form with capturedBindings and typeRegistry.
 *
 * These tests execute the runtime code directly in Bun by eval-ing SCRML_RUNTIME
 * via the Function constructor (same pattern as meta-effect.test.js).
 *
 * Coverage:
 *   4A-1  meta.bindings is accessible when capturedBindings is passed
 *   4A-2  meta.bindings is null when capturedBindings is null
 *   4A-3  meta.types is accessible when typeRegistry is passed
 *   4A-4  meta.types is null when typeRegistry is null
 *   4A-5  Backward compat: 2-arg call still works (meta.bindings/types are null)
 *   4A-6  meta.bindings is the exact capturedBindings object passed in
 *   4A-7  meta.types.reflect returns type data for known types
 *   4A-8  meta.types.reflect returns null for unknown types
 *   4A-9  meta.types.reflect accepts any string without throwing
 */

import { describe, test, expect } from "bun:test";
import { SCRML_RUNTIME } from "../../src/runtime-template.js";

/**
 * Evaluate the SCRML_RUNTIME string in a controlled scope and return the
 * named runtime functions. Uses Function constructor to avoid polluting the
 * test module's global scope.
 */
function makeRuntime() {
  const code = `
${SCRML_RUNTIME}

return {
  _scrml_state,
  _scrml_subscribers,
  _scrml_reactive_get,
  _scrml_reactive_set,
  _scrml_reactive_subscribe,
  _scrml_register_cleanup,
  _scrml_destroy_scope,
  _scrml_cleanup_registry,
  _scrml_meta_effect,
  _scrml_tracking_stack,
};
`;
  // eslint-disable-next-line no-new-func
  return new Function(code)();
}

// ---------------------------------------------------------------------------
// 4A-1: meta.bindings accessible when capturedBindings passed
// ---------------------------------------------------------------------------

describe("meta-effect-4arg 4A-1: meta.bindings with capturedBindings", () => {
  test("meta.bindings is the object passed as capturedBindings", () => {
    const rt = makeRuntime();
    const capturedBindings = Object.freeze({ count: 42 });
    let observedBindings = undefined;

    rt._scrml_meta_effect(
      "_scrml_meta_test_1",
      (meta) => { observedBindings = meta.bindings; },
      capturedBindings,
      null
    );

    expect(observedBindings).toBe(capturedBindings);
    expect(observedBindings.count).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// 4A-2: meta.bindings is null when capturedBindings is null
// ---------------------------------------------------------------------------

describe("meta-effect-4arg 4A-2: meta.bindings null when no capturedBindings", () => {
  test("meta.bindings is null when capturedBindings argument is null", () => {
    const rt = makeRuntime();
    let observedBindings = "NOT_SET";

    rt._scrml_meta_effect(
      "_scrml_meta_test_2",
      (meta) => { observedBindings = meta.bindings; },
      null,
      null
    );

    expect(observedBindings).toBeNull();
  });

  test("meta.bindings is null when capturedBindings argument is undefined", () => {
    const rt = makeRuntime();
    let observedBindings = "NOT_SET";

    rt._scrml_meta_effect(
      "_scrml_meta_test_2b",
      (meta) => { observedBindings = meta.bindings; },
      undefined,
      null
    );

    expect(observedBindings).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4A-3: meta.types accessible when typeRegistry passed
// ---------------------------------------------------------------------------

describe("meta-effect-4arg 4A-3: meta.types with typeRegistry", () => {
  test("meta.types is non-null when typeRegistry object is passed", () => {
    const rt = makeRuntime();
    const typeRegistry = {
      Color: { kind: "enum", variants: [{ name: "Red" }] }
    };
    let observedTypes = undefined;

    rt._scrml_meta_effect(
      "_scrml_meta_test_3",
      (meta) => { observedTypes = meta.types; },
      null,
      typeRegistry
    );

    expect(observedTypes).not.toBeNull();
    expect(typeof observedTypes).toBe("object");
  });

  test("meta.types has a reflect() method", () => {
    const rt = makeRuntime();
    const typeRegistry = {};
    let observedTypes = undefined;

    rt._scrml_meta_effect(
      "_scrml_meta_test_3b",
      (meta) => { observedTypes = meta.types; },
      null,
      typeRegistry
    );

    expect(typeof observedTypes.reflect).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// 4A-4: meta.types is null when typeRegistry is null
// ---------------------------------------------------------------------------

describe("meta-effect-4arg 4A-4: meta.types always present (§22.5.1)", () => {
  test("meta.types is always an object with reflect() method, even when typeRegistry is null", () => {
    const rt = makeRuntime();
    let observedTypes = "NOT_SET";

    rt._scrml_meta_effect(
      "_scrml_meta_test_4",
      (meta) => { observedTypes = meta.types; },
      null,
      null
    );

    expect(observedTypes).not.toBeNull();
    expect(typeof observedTypes).toBe("object");
    expect(typeof observedTypes.reflect).toBe("function");
    // reflect() returns null for all types when no registry provided
    expect(observedTypes.reflect("Anything")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4A-5: Backward compat — 2-arg call still works
// ---------------------------------------------------------------------------

describe("meta-effect-4arg 4A-5: backward compatibility with 2-argument form", () => {
  test("2-argument call works without capturedBindings or typeRegistry", () => {
    const rt = makeRuntime();
    let effectRan = false;
    let metaBindings = "NOT_SET";
    let metaTypes = "NOT_SET";

    // 2-argument form: no capturedBindings or typeRegistry
    rt._scrml_meta_effect(
      "_scrml_meta_test_5",
      (meta) => {
        effectRan = true;
        metaBindings = meta.bindings;
        metaTypes = meta.types;
      }
    );

    expect(effectRan).toBe(true);
    // bindings should be null when not passed
    expect(metaBindings).toBeNull();
    // types is always present with reflect() method (§22.5.1)
    expect(metaTypes).not.toBeNull();
    expect(typeof metaTypes.reflect).toBe("function");
    // reflect() returns null for everything when no registry
    expect(metaTypes.reflect("Anything")).toBeNull();
  });

  test("2-argument call does not throw", () => {
    const rt = makeRuntime();
    expect(() => {
      rt._scrml_meta_effect("_scrml_meta_test_5b", () => {});
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 4A-6: meta.bindings is the exact object passed
// ---------------------------------------------------------------------------

describe("meta-effect-4arg 4A-6: meta.bindings identity", () => {
  test("meta.bindings is the same object reference as capturedBindings", () => {
    const rt = makeRuntime();
    const capturedBindings = Object.freeze({ x: 10, y: 20 });
    let observedBindings = undefined;

    rt._scrml_meta_effect(
      "_scrml_meta_test_6",
      (meta) => { observedBindings = meta.bindings; },
      capturedBindings,
      null
    );

    // Exact same reference — not a copy
    expect(observedBindings).toBe(capturedBindings);
  });
});

// ---------------------------------------------------------------------------
// 4A-7: meta.types.reflect returns type data for known types
// ---------------------------------------------------------------------------

describe("meta-effect-4arg 4A-7: meta.types.reflect for known type", () => {
  test("reflect(knownType) returns the registry entry for that type", () => {
    const rt = makeRuntime();
    const typeRegistry = {
      Color: { kind: "enum", variants: [{ name: "Red" }, { name: "Blue" }] },
    };
    let observedColorType = undefined;

    rt._scrml_meta_effect(
      "_scrml_meta_test_7",
      (meta) => { observedColorType = meta.types.reflect("Color"); },
      null,
      typeRegistry
    );

    expect(observedColorType).not.toBeNull();
    expect(observedColorType.kind).toBe("enum");
    expect(observedColorType.variants).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 4A-8: meta.types.reflect returns null for unknown types
// ---------------------------------------------------------------------------

describe("meta-effect-4arg 4A-8: meta.types.reflect for unknown type", () => {
  test("reflect(unknownType) returns null, not throws", () => {
    const rt = makeRuntime();
    const typeRegistry = { KnownType: { kind: "struct", fields: [] } };
    let observedResult = "NOT_SET";

    rt._scrml_meta_effect(
      "_scrml_meta_test_8",
      (meta) => { observedResult = meta.types.reflect("UnknownType"); },
      null,
      typeRegistry
    );

    expect(observedResult).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4A-9: meta.types.reflect does not throw for any string input
// ---------------------------------------------------------------------------

describe("meta-effect-4arg 4A-9: meta.types.reflect is non-throwing", () => {
  test("reflect() accepts any string without throwing", () => {
    const rt = makeRuntime();
    const typeRegistry = {};
    const safeResults = [];

    rt._scrml_meta_effect(
      "_scrml_meta_test_9",
      (meta) => {
        // None of these should throw
        safeResults.push(meta.types.reflect(""));
        safeResults.push(meta.types.reflect("NonExistent"));
        safeResults.push(meta.types.reflect("123"));
        safeResults.push(meta.types.reflect("!@#$"));
      },
      null,
      typeRegistry
    );

    // All return null (not throw)
    expect(safeResults).toEqual([null, null, null, null]);
  });

  test("reflect() with non-string input returns null (not throws)", () => {
    const rt = makeRuntime();
    const typeRegistry = {};
    let result = "NOT_SET";

    rt._scrml_meta_effect(
      "_scrml_meta_test_9b",
      (meta) => {
        // Pass null — should return null gracefully
        result = meta.types.reflect(null);
      },
      null,
      typeRegistry
    );

    expect(result).toBeNull();
  });
});
