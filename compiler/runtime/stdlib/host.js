// scrml:host — runtime shim
//
// Hand-written ES module implementing safeCall — the JS-host-throw
// containment primitive declared in stdlib/host/index.scrml.
//
// Used by the compiler's stdlib bundler (bundleStdlibForRun in api.js) to
// make `import { safeCall, HostError } from "scrml:host"` resolvable at
// runtime. The shim is copied to <outputDir>/_scrml/host.js.
//
// Design: approach (α) — see stdlib/host/index.scrml header for rationale.
// The try/catch lives here and nowhere else. scrml source never sees it.
//
// Surface (must match stdlib/host/index.scrml exports):
//   - HostError                — variant constructor object (mirrors enum)
//   - safeCall(thunk)          → { __scrml_error: false } | scrml-error-shape

// ---------------------------------------------------------------------------
// HostError — mirrors the scrml enum declared in stdlib/host/index.scrml
//
// Variant constructor: HostError.Thrown(message, name)
//   → { variant: "Thrown", data: { message, name } }
//
// This is the same shape the scrml compiler emits for enum variants used in
// compiled client code (see emit-control-flow.ts emitVariantBindingPrelude).
// ---------------------------------------------------------------------------

export const HostError = Object.freeze({
  Thrown: function(message, name) {
    return { variant: "Thrown", data: { message, name } };
  },
  variants: ["Thrown"],
});

// ---------------------------------------------------------------------------
// safeCall(thunk) — call a zero-arg thunk, catching any JS exception.
//
// Returns the thunk's return value on success.
// Returns the scrml failable-error sentinel on any throw.
//
// The failable-error sentinel shape is what the scrml compiler emits when a
// `fail` statement fires (see emit-logic.ts "fail-expr" case):
//   { __scrml_error: true, type: "HostError", variant: "Thrown", data: { message, name } }
//
// Callers use `!{}` or `match` to test the result — the compiler inserts:
//   if (result && result.__scrml_error) { /* dispatch on result.variant */ }
//
// Argument normalization for non-Error throws:
//   throw new Error("msg")       → message: "msg",         name: "Error"
//   throw "string value"         → message: "string value", name: "UnknownThrow"
//   throw { message: "obj" }     → message: "[object Object]", name: "UnknownThrow"
//   throw null                   → message: "null",           name: "UnknownThrow"
//   throw undefined              → message: "undefined",      name: "UnknownThrow"
//   throw 42                     → message: "42",             name: "UnknownThrow"
// ---------------------------------------------------------------------------

export function safeCall(thunk) {
  try {
    return thunk();
  } catch (thrown) {
    // Normalize the thrown value to a { message, name } pair.
    // When thrown is an Error instance, use its .message and .name fields.
    // For everything else, coerce to string for message and use "UnknownThrow".
    var message;
    var name;

    if (thrown !== null && thrown !== undefined && typeof thrown.message === "string") {
      // Covers Error instances and any object with a string .message property.
      message = thrown.message;
      name = (typeof thrown.name === "string" && thrown.name.length > 0)
        ? thrown.name
        : "Error";
    } else {
      // Non-Error throw: null, undefined, string, number, boolean, plain object.
      message = thrown === null
        ? "null"
        : thrown === undefined
          ? "undefined"
          : String(thrown);
      name = "UnknownThrow";
    }

    // Return the scrml failable-error sentinel. This is the exact shape that
    // the compiler's !{} handler tests for (emit-logic.ts "guarded-expr" case):
    //   if (result && result.__scrml_error) { /* arm dispatch on result.variant */ }
    return {
      __scrml_error: true,
      type: "HostError",
      variant: "Thrown",
      data: { message: message, name: name },
    };
  }
}
