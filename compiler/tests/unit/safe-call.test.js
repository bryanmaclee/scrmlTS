/**
 * safe-call — unit tests for scrml:host safeCall primitive
 *
 * Tests the runtime shim at compiler/runtime/stdlib/host.js directly.
 * The shim is imported as an ES module so the try/catch implementation
 * is exercised exactly as it runs in bundled output.
 *
 * Coverage:
 *   SC-01  Non-throwing thunk returns its value unchanged
 *   SC-02  Thunk returning null passes null through (falsy-return safety)
 *   SC-03  Thunk returning undefined passes undefined through
 *   SC-04  Thunk returning 0 passes 0 through (falsy-return safety)
 *   SC-05  Thunk returning empty string passes "" through (falsy-return safety)
 *   SC-06  throw new Error("msg") → HostError::Thrown with message and name
 *   SC-07  throw new TypeError("type msg") → name: "TypeError"
 *   SC-08  throw "string value" → message: "string value", name: "UnknownThrow"
 *   SC-09  throw null → message: "null", name: "UnknownThrow"
 *   SC-10  throw undefined → message: "undefined", name: "UnknownThrow"
 *   SC-11  throw 42 → message: "42", name: "UnknownThrow"
 *   SC-12  throw false → message: "false", name: "UnknownThrow"
 *   SC-13  throw { message: "obj" } (no .name string) → name: "Error"
 *   SC-14  throw { message: "obj", name: "" } (empty name) → name: "Error"
 *   SC-15  Result on throw has __scrml_error: true sentinel
 *   SC-16  Result on throw has type: "HostError"
 *   SC-17  Result on throw has variant: "Thrown"
 *   SC-18  Result on throw has data.message (string) and data.name (string)
 *   SC-19  Successful result does NOT have __scrml_error property
 *   SC-20  async thunk that resolves returns a Promise (not caught sync)
 *   SC-21  HostError.Thrown() variant constructor produces correct shape
 *   SC-22  HostError.variants lists all variant names
 *   SC-23  safeCall is callable from a regular (non-server) function context
 *   SC-24  Nested safeCall — inner error does not propagate to outer
 */

import { describe, test, expect } from "bun:test";
import { safeCall, HostError } from "../../runtime/stdlib/host.js";

// ---------------------------------------------------------------------------
// SC-01 through SC-05: falsy-return safety — success path
// ---------------------------------------------------------------------------

describe("safeCall — success path (non-throwing thunk)", () => {

    test("SC-01: returns value from non-throwing thunk", () => {
        const result = safeCall(() => 42);
        expect(result).toBe(42);
    });

    test("SC-02: thunk returning null passes null through", () => {
        const result = safeCall(() => null);
        // null is a valid return value, not an error
        expect(result).toBeNull();
    });

    test("SC-03: thunk returning undefined passes undefined through", () => {
        const result = safeCall(() => undefined);
        expect(result).toBeUndefined();
    });

    test("SC-04: thunk returning 0 passes 0 through (falsy is not an error)", () => {
        const result = safeCall(() => 0);
        expect(result).toBe(0);
    });

    test("SC-05: thunk returning empty string passes through", () => {
        const result = safeCall(() => "");
        expect(result).toBe("");
    });

    test("SC-19: successful result does NOT have __scrml_error property", () => {
        const result = safeCall(() => ({ key: "value" }));
        // The return value is the object itself; no __scrml_error wrapper
        expect(result).toEqual({ key: "value" });
        expect(result.__scrml_error).toBeUndefined();
    });

});

// ---------------------------------------------------------------------------
// SC-06 through SC-18: throw path — Error sentinel shape
// ---------------------------------------------------------------------------

describe("safeCall — throw path (Error sentinel shape)", () => {

    test("SC-06: throw new Error returns HostError::Thrown with message and name", () => {
        const result = safeCall(() => { throw new Error("something went wrong"); });
        expect(result).toBeDefined();
        expect(result.__scrml_error).toBe(true);
        expect(result.type).toBe("HostError");
        expect(result.variant).toBe("Thrown");
        expect(result.data.message).toBe("something went wrong");
        expect(result.data.name).toBe("Error");
    });

    test("SC-07: throw new TypeError uses the error's .name field", () => {
        const result = safeCall(() => { throw new TypeError("type mismatch"); });
        expect(result.__scrml_error).toBe(true);
        expect(result.data.message).toBe("type mismatch");
        expect(result.data.name).toBe("TypeError");
    });

    test("SC-08: throw string literal → name: UnknownThrow", () => {
        const result = safeCall(() => { throw "string error"; });
        expect(result.__scrml_error).toBe(true);
        expect(result.data.message).toBe("string error");
        expect(result.data.name).toBe("UnknownThrow");
    });

    test("SC-09: throw null → message: null, name: UnknownThrow", () => {
        const result = safeCall(() => { throw null; });
        expect(result.__scrml_error).toBe(true);
        expect(result.data.message).toBe("null");
        expect(result.data.name).toBe("UnknownThrow");
    });

    test("SC-10: throw undefined → message: undefined, name: UnknownThrow", () => {
        const result = safeCall(() => { throw undefined; });
        expect(result.__scrml_error).toBe(true);
        expect(result.data.message).toBe("undefined");
        expect(result.data.name).toBe("UnknownThrow");
    });

    test("SC-11: throw number → message is string-coerced, name: UnknownThrow", () => {
        const result = safeCall(() => { throw 42; });
        expect(result.__scrml_error).toBe(true);
        expect(result.data.message).toBe("42");
        expect(result.data.name).toBe("UnknownThrow");
    });

    test("SC-12: throw boolean false → message: false, name: UnknownThrow", () => {
        const result = safeCall(() => { throw false; });
        expect(result.__scrml_error).toBe(true);
        expect(result.data.message).toBe("false");
        expect(result.data.name).toBe("UnknownThrow");
    });

    test("SC-13: throw object with .message string but no .name → name: Error", () => {
        // Object has a string .message but no .name — name defaults to "Error"
        const result = safeCall(() => { throw { message: "custom object" }; });
        expect(result.__scrml_error).toBe(true);
        expect(result.data.message).toBe("custom object");
        expect(result.data.name).toBe("Error");
    });

    test("SC-14: throw object with .message and empty .name → name: Error", () => {
        // Empty name string treated as missing
        const result = safeCall(() => { throw { message: "has message", name: "" }; });
        expect(result.__scrml_error).toBe(true);
        expect(result.data.message).toBe("has message");
        expect(result.data.name).toBe("Error");
    });

    test("SC-15: error result has __scrml_error: true", () => {
        const result = safeCall(() => { throw new Error("x"); });
        expect(result.__scrml_error).toBe(true);
    });

    test("SC-16: error result has type: HostError", () => {
        const result = safeCall(() => { throw new Error("x"); });
        expect(result.type).toBe("HostError");
    });

    test("SC-17: error result has variant: Thrown", () => {
        const result = safeCall(() => { throw new Error("x"); });
        expect(result.variant).toBe("Thrown");
    });

    test("SC-18: error result data has string fields message and name", () => {
        const result = safeCall(() => { throw new RangeError("out of range"); });
        expect(typeof result.data.message).toBe("string");
        expect(typeof result.data.name).toBe("string");
        expect(result.data.message).toBe("out of range");
        expect(result.data.name).toBe("RangeError");
    });

});

// ---------------------------------------------------------------------------
// SC-20: async thunk — safeCall is synchronous; it cannot catch async throws
// ---------------------------------------------------------------------------

describe("safeCall — async thunk behavior", () => {

    test("SC-20: async thunk that resolves returns a Promise (not an error)", async () => {
        // safeCall is synchronous. An async thunk returns a Promise.
        // The Promise is the return value — not an error sentinel.
        // Async throws inside the thunk are NOT caught by safeCall.
        // (This is the documented behavior — async support is a separate dispatch.)
        const result = safeCall(async () => "async value");
        // result is a Promise because the thunk returns one
        expect(result).toBeInstanceOf(Promise);
        const resolved = await result;
        expect(resolved).toBe("async value");
    });

});

// ---------------------------------------------------------------------------
// SC-21, SC-22: HostError enum-constructor shape
// ---------------------------------------------------------------------------

describe("HostError variant constructor", () => {

    test("SC-21: HostError.Thrown() produces the correct variant object shape", () => {
        const v = HostError.Thrown("file not found", "Error");
        // Mirrors the shape the scrml compiler emits for enum variant objects
        // (see emit-control-flow.ts emitVariantBindingPrelude)
        expect(v.variant).toBe("Thrown");
        expect(v.data.message).toBe("file not found");
        expect(v.data.name).toBe("Error");
    });

    test("SC-22: HostError.variants lists all variant names", () => {
        expect(Array.isArray(HostError.variants)).toBe(true);
        expect(HostError.variants).toContain("Thrown");
        expect(HostError.variants.length).toBe(1);
    });

});

// ---------------------------------------------------------------------------
// SC-23: safeCall called from a plain function (non-server context)
// ---------------------------------------------------------------------------

describe("safeCall — callable from non-server function context", () => {

    test("SC-23: safeCall works inside a regular JS function", () => {
        // Simulates calling safeCall from a compiled scrml `function` (non-server).
        // The shim has no server-only APIs and is callable from any context.
        function parseNumber(raw) {
            return safeCall(() => {
                const n = JSON.parse(raw);
                if (typeof n !== "number") throw new TypeError("not a number");
                return n;
            });
        }

        const good = parseNumber("42");
        expect(good).toBe(42);

        const bad = parseNumber('"not-a-number"');
        expect(bad.__scrml_error).toBe(true);
        expect(bad.data.name).toBe("TypeError");
        expect(bad.data.message).toBe("not a number");
    });

});

// ---------------------------------------------------------------------------
// SC-24: nested safeCall — inner error does not propagate to outer
// ---------------------------------------------------------------------------

describe("safeCall — nesting behavior", () => {

    test("SC-24: inner safeCall error result is returned as a value, not rethrown", () => {
        // The inner safeCall catches the throw and returns an error sentinel.
        // The outer safeCall sees the sentinel as a normal return value (not a throw).
        // This verifies that safeCall does not confuse sentinel objects with throws.
        const result = safeCall(() => {
            const inner = safeCall(() => { throw new Error("inner error"); });
            // inner is the error sentinel — it IS a value, not a throw
            return inner;
        });

        // The outer safeCall succeeded (returned the inner result as a value)
        expect(result.__scrml_error).toBe(true);
        expect(result.variant).toBe("Thrown");
        expect(result.data.message).toBe("inner error");
    });

});
