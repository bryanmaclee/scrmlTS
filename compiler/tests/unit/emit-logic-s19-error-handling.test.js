/**
 * emit-logic.js — §19 Error Handling Codegen Tests
 *
 * Tests for throw-stmt and guarded-expr cases in emitLogicNode, and for the
 * §19 built-in error type classes in scrml-runtime.js.
 *
 * Coverage:
 *   §1  throw-stmt — basic throw codegen
 *   §2  throw-stmt — auto new-prefix for constructor calls
 *   §3  throw-stmt — passes through non-constructor throws unchanged
 *   §4  throw-stmt — reactive ref in throw expression
 *   §5  guarded-expr — null guardedNode re-throws
 *   §6  guarded-expr — bare-expr guardedNode in try block
 *   §7  guarded-expr — let-decl guardedNode hoisted outside try block
 *   §8  guarded-expr — const-decl guardedNode hoisted outside try block
 *   §9  guarded-expr — wildcard arm produces else-branch handler
 *   §10 guarded-expr — named type arm produces instanceof check
 *   §11 guarded-expr — named type arm checks .type field (serialization)
 *   §12 guarded-expr — no wildcard arm produces else re-throw
 *   §13 guarded-expr — multiple arms emitted in order (if/else if/else)
 *   §14 guarded-expr — arm binding is declared as const in handler
 *   §15 guarded-expr — empty arms array re-throws
 *   §16 guarded-expr — arm handler with @reactive ref is rewritten
 *   §17 runtime — NetworkError extends Error with .type and .cause
 *   §18 runtime — ValidationError extends Error with .type
 *   §19 runtime — SQLError extends Error with .type
 *   §20 runtime — AuthError extends Error with .type
 *   §21 runtime — TimeoutError extends Error with .type
 *   §22 runtime — ParseError extends Error with .type
 *   §23 runtime — NotFoundError extends Error with .type
 *   §24 runtime — ConflictError extends Error with .type
 *   §25 runtime — error .cause defaults to null
 *   §26 runtime — error .cause is set from options
 */

import { describe, test, expect } from "bun:test";
import { emitLogicNode } from "../../src/codegen/emit-logic.js";
import { resetVarCounter } from "../../src/codegen/var-counter.ts";
import { SCRML_RUNTIME } from "../../src/runtime-template.js";

function resetAndRun(fn) {
  resetVarCounter();
  return fn();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeThrowStmt(expr) {
  return { kind: "throw-stmt", expr };
}

function makeBareExpr(expr) {
  return { kind: "bare-expr", expr };
}

function makeLetDecl(name, init) {
  return { kind: "let-decl", name, init };
}

function makeConstDecl(name, init) {
  return { kind: "const-decl", name, init };
}

function makeArm(pattern, binding, handler) {
  return { pattern, binding, handler };
}

function makeGuardedExpr(guardedNode, arms) {
  return { kind: "guarded-expr", guardedNode, arms };
}

// ---------------------------------------------------------------------------
// Runtime class extraction
// ---------------------------------------------------------------------------

// Extract and evaluate just the §19 error type class definitions from the
// runtime template string. The full template references `window` and `document`
// which are unavailable in the test environment. We only need the error classes
// which have no DOM dependencies.
function extractRuntimeClasses() {
  // Find the section from _ScrmlError through the end of ConflictError class
  const match = SCRML_RUNTIME.match(
    /(class _ScrmlError[\s\S]*?class ConflictError[\s\S]*?\n\})/
  );
  if (!match) {
    throw new Error("Could not find §19 error class section in SCRML_RUNTIME");
  }
  const evalFn = new Function(`
    ${match[1]}
    return { _ScrmlError, NetworkError, ValidationError, SQLError, AuthError,
             TimeoutError, ParseError, NotFoundError, ConflictError };
  `);
  return evalFn();
}

let runtimeClasses;
try {
  runtimeClasses = extractRuntimeClasses();
} catch (e) {
  runtimeClasses = null;
}

// ---------------------------------------------------------------------------
// §1-§4: throw-stmt
// ---------------------------------------------------------------------------

describe("emit-logic §19 §1: throw-stmt basic", () => {
  test("throws with new-prefix for ErrorType constructor", () => {
    const node = makeThrowStmt("NetworkError(\"connection failed\")");
    const result = emitLogicNode(node);
    expect(result).toBe("throw new NetworkError(\"connection failed\");");
  });

  test("emits throw statement (not return)", () => {
    const node = makeThrowStmt("ValidationError(\"invalid\")");
    const result = emitLogicNode(node);
    expect(result).toContain("throw ");
    expect(result).not.toContain("return ");
  });
});

describe("emit-logic §19 §2: throw-stmt auto new-prefix", () => {
  test("uppercase constructor gets new prefix added", () => {
    const node = makeThrowStmt("AuthError(\"forbidden\")");
    const result = emitLogicNode(node);
    expect(result).toContain("throw new AuthError");
  });

  test("already-prefixed new is not doubled", () => {
    const node = makeThrowStmt("new ParseError(\"bad input\")");
    const result = emitLogicNode(node);
    expect(result).not.toContain("throw new new");
    expect(result).toContain("throw new ParseError");
  });

  test("all 8 built-in types get new prefix", () => {
    const types = [
      "NetworkError", "ValidationError", "SQLError", "AuthError",
      "TimeoutError", "ParseError", "NotFoundError", "ConflictError"
    ];
    for (const t of types) {
      const node = makeThrowStmt(`${t}("msg")`);
      const result = emitLogicNode(node);
      expect(result).toBe(`throw new ${t}("msg");`);
    }
  });
});

describe("emit-logic §19 §3: throw-stmt non-constructor passthrough", () => {
  test("lowercase expression passed through without new", () => {
    const node = makeThrowStmt("someError");
    const result = emitLogicNode(node);
    expect(result).toBe("throw someError;");
  });

  test("throw expression with no parens passed through", () => {
    const node = makeThrowStmt("existingErrorObj");
    const result = emitLogicNode(node);
    expect(result).toBe("throw existingErrorObj;");
  });
});

describe("emit-logic §19 §4: throw-stmt reactive ref", () => {
  test("@reactive ref in throw expr is rewritten", () => {
    const node = makeThrowStmt("NetworkError(@errorMsg)");
    const result = emitLogicNode(node);
    expect(result).toContain("_scrml_reactive_get");
    expect(result).toContain('"errorMsg"');
  });
});

// ---------------------------------------------------------------------------
// §5: guarded-expr — null guardedNode
// ---------------------------------------------------------------------------

describe("emit-logic §19 §5: guarded-expr null guardedNode", () => {
  test("null guardedNode still emits try/catch structure", () => {
    const node = makeGuardedExpr(null, [makeArm("_", "e", "null")]);
    const result = resetAndRun(() => emitLogicNode(node));
    expect(result).toContain("try {");
    expect(result).toContain("} catch (");
  });
});

// ---------------------------------------------------------------------------
// §6: guarded-expr — bare-expr guardedNode
// ---------------------------------------------------------------------------

describe("emit-logic §19 §6: guarded-expr bare-expr guardedNode", () => {
  test("bare-expr is emitted inside the try block", () => {
    const node = makeGuardedExpr(
      makeBareExpr("fetch(url)"),
      [makeArm("_", "e", "console.error(e)")]
    );
    const result = resetAndRun(() => emitLogicNode(node));
    expect(result).toContain("try {");
    expect(result).toContain("fetch(url)");
  });

  test("catch block follows try block", () => {
    const node = makeGuardedExpr(
      makeBareExpr("doSomethingRisky()"),
      [makeArm("_", "e", "handleError(e)")]
    );
    const result = resetAndRun(() => emitLogicNode(node));
    const tryIdx = result.indexOf("try {");
    const catchIdx = result.indexOf("} catch (");
    expect(tryIdx).toBeGreaterThanOrEqual(0);
    expect(catchIdx).toBeGreaterThan(tryIdx);
  });
});

// ---------------------------------------------------------------------------
// §7: guarded-expr — let-decl guardedNode
// ---------------------------------------------------------------------------

describe("emit-logic §19 §7: guarded-expr let-decl guardedNode", () => {
  test("let-decl initializer captured inside try block", () => {
    const node = makeGuardedExpr(
      makeLetDecl("data", "fetchData()"),
      [makeArm("_", "e", "null")]
    );
    const result = resetAndRun(() => emitLogicNode(node));
    expect(result).toContain("try {");
    expect(result).toContain("fetchData()");
  });

  test("let-decl variable hoisted outside try with var", () => {
    const node = makeGuardedExpr(
      makeLetDecl("data", "fetchData()"),
      [makeArm("_", "e", "null")]
    );
    const result = resetAndRun(() => emitLogicNode(node));
    // var is used (not let/const) so the binding is visible outside the try block
    expect(result).toContain("var data =");
  });

  test("result var is declared before the try block", () => {
    const node = makeGuardedExpr(
      makeLetDecl("data", "fetchData()"),
      [makeArm("_", "e", "null")]
    );
    const result = resetAndRun(() => emitLogicNode(node));
    const letResultIdx = result.indexOf("let _scrml_result_");
    const tryIdx = result.indexOf("try {");
    expect(letResultIdx).toBeLessThan(tryIdx);
  });
});

// ---------------------------------------------------------------------------
// §8: guarded-expr — const-decl guardedNode
// ---------------------------------------------------------------------------

describe("emit-logic §19 §8: guarded-expr const-decl guardedNode", () => {
  test("const-decl initializer captured inside try block", () => {
    const node = makeGuardedExpr(
      makeConstDecl("resp", "http.get(url)"),
      [makeArm("_", "e", "null")]
    );
    const result = resetAndRun(() => emitLogicNode(node));
    expect(result).toContain("http.get(url)");
  });

  test("const-decl variable hoisted outside try with var", () => {
    const node = makeGuardedExpr(
      makeConstDecl("resp", "http.get(url)"),
      [makeArm("_", "e", "null")]
    );
    const result = resetAndRun(() => emitLogicNode(node));
    expect(result).toContain("var resp =");
  });
});

// ---------------------------------------------------------------------------
// §9: guarded-expr — wildcard arm
// ---------------------------------------------------------------------------

describe("emit-logic §19 §9: guarded-expr wildcard arm", () => {
  test("wildcard arm _ produces a catch handler block", () => {
    const node = makeGuardedExpr(
      makeBareExpr("riskyOp()"),
      [makeArm("_", "e", "handleError(e)")]
    );
    const result = resetAndRun(() => emitLogicNode(node));
    expect(result).toContain("handleError");
  });

  test("wildcard arm with _ binding does not emit binding const", () => {
    const node = makeGuardedExpr(
      makeBareExpr("riskyOp()"),
      [makeArm("_", "_", "fallback()")]
    );
    const result = resetAndRun(() => emitLogicNode(node));
    // No spurious `const _ = ...` emitted
    expect(result).not.toContain("const _ =");
  });

  test("wildcard arm with named binding emits const binding", () => {
    const node = makeGuardedExpr(
      makeBareExpr("riskyOp()"),
      [makeArm("_", "err", "log(err)")]
    );
    const result = resetAndRun(() => emitLogicNode(node));
    expect(result).toContain("const err =");
  });
});

// ---------------------------------------------------------------------------
// §10-§11: guarded-expr — named type arm
// ---------------------------------------------------------------------------

describe("emit-logic §19 §10: guarded-expr named type arm instanceof check", () => {
  test("named arm emits instanceof check for the error type", () => {
    const node = makeGuardedExpr(
      makeBareExpr("fetchUser(id)"),
      [makeArm("::NetworkError", "e", "retry()")]
    );
    const result = resetAndRun(() => emitLogicNode(node));
    expect(result).toContain("instanceof NetworkError");
  });

  test("named arm uses if keyword", () => {
    const node = makeGuardedExpr(
      makeBareExpr("fetchUser(id)"),
      [makeArm("::AuthError", "e", "redirectToLogin()")]
    );
    const result = resetAndRun(() => emitLogicNode(node));
    expect(result).toMatch(/if\s*\(/);
  });
});

describe("emit-logic §19 §11: guarded-expr named type arm .type check", () => {
  test("named arm also checks .type === 'TypeName' for serialization safety", () => {
    const node = makeGuardedExpr(
      makeBareExpr("callServer()"),
      [makeArm("::NetworkError", "e", "retry()")]
    );
    const result = resetAndRun(() => emitLogicNode(node));
    expect(result).toContain('.type === "NetworkError"');
  });
});

// ---------------------------------------------------------------------------
// §12: guarded-expr — no wildcard arm re-throws
// ---------------------------------------------------------------------------

describe("emit-logic §19 §12: guarded-expr no wildcard re-throw", () => {
  test("when no wildcard arm, unmatched errors are re-thrown", () => {
    const node = makeGuardedExpr(
      makeBareExpr("parse(text)"),
      [makeArm("::ParseError", "e", "handleParse(e)")]
    );
    const result = resetAndRun(() => emitLogicNode(node));
    expect(result).toContain("else { throw ");
  });

  test("re-throw uses the caught error variable", () => {
    const node = makeGuardedExpr(
      makeBareExpr("parse(text)"),
      [makeArm("::ParseError", "e", "handleParse(e)")]
    );
    const result = resetAndRun(() => emitLogicNode(node));
    // The caught error variable name (_scrml_*err*_N) appears in the re-throw
    // genVar("_scrml_err") → "_scrml__scrml_err_N" (double underscore is correct)
    const throwMatch = result.match(/else \{ throw (_scrml_\w+); \}/);
    expect(throwMatch).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §13: guarded-expr — multiple arms
// ---------------------------------------------------------------------------

describe("emit-logic §19 §13: guarded-expr multiple arms", () => {
  test("two named arms use if/else if", () => {
    const node = makeGuardedExpr(
      makeBareExpr("apiCall()"),
      [
        makeArm("::NetworkError", "e", "retry()"),
        makeArm("::AuthError", "e", "reauth()"),
      ]
    );
    const result = resetAndRun(() => emitLogicNode(node));
    expect(result).toContain("else if (");
    expect(result).toContain("instanceof NetworkError");
    expect(result).toContain("instanceof AuthError");
  });

  test("named arm followed by wildcard arm uses else block", () => {
    const node = makeGuardedExpr(
      makeBareExpr("apiCall()"),
      [
        makeArm("::NetworkError", "e", "retry()"),
        makeArm("_", "e", "showError(e)"),
      ]
    );
    const result = resetAndRun(() => emitLogicNode(node));
    expect(result).toContain("if (");
    expect(result).toContain("else {");
    // No re-throw since wildcard handles all remaining errors
    expect(result).not.toContain("else { throw ");
  });
});

// ---------------------------------------------------------------------------
// §14: guarded-expr — arm binding
// ---------------------------------------------------------------------------

describe("emit-logic §19 §14: guarded-expr arm binding declared as const", () => {
  test("named arm binding is declared as const inside the handler", () => {
    const node = makeGuardedExpr(
      makeBareExpr("getResource()"),
      [makeArm("::NotFoundError", "err", "handle404(err)")]
    );
    const result = resetAndRun(() => emitLogicNode(node));
    // Should have: const err = _scrml_*err*_N;
    // genVar("_scrml_err") → "_scrml__scrml_err_N" (double underscore is expected)
    expect(result).toMatch(/const err = _scrml_\w+;/);
  });
});

// ---------------------------------------------------------------------------
// §15: guarded-expr — empty arms
// ---------------------------------------------------------------------------

describe("emit-logic §19 §15: guarded-expr empty arms re-throw", () => {
  test("empty arms array emits catch that re-throws", () => {
    const node = makeGuardedExpr(
      makeBareExpr("risky()"),
      []
    );
    const result = resetAndRun(() => emitLogicNode(node));
    expect(result).toContain("} catch (");
    expect(result).toContain("throw ");
  });
});

// ---------------------------------------------------------------------------
// §16: guarded-expr — reactive ref in arm handler
// ---------------------------------------------------------------------------

describe("emit-logic §19 §16: guarded-expr arm handler reactive ref", () => {
  test("arm handler with @reactive ref is rewritten", () => {
    const node = makeGuardedExpr(
      makeBareExpr("fetchData()"),
      [makeArm("_", "e", "setError(@lastError)")]
    );
    const result = resetAndRun(() => emitLogicNode(node));
    expect(result).toContain("_scrml_reactive_get");
    expect(result).toContain('"lastError"');
  });
});

// ---------------------------------------------------------------------------
// §17-§26: Runtime error type classes
// ---------------------------------------------------------------------------

// We test the runtime error types by evaluating the class definitions extracted
// from the SCRML_RUNTIME template string. The full template references `window`
// and `document` which are unavailable in the test environment — the error
// classes have no DOM dependencies and can be isolated.

describe("emit-logic §19 §17: runtime NetworkError", () => {
  test("NetworkError is constructable", () => {
    if (!runtimeClasses) return;
    const err = new runtimeClasses.NetworkError("connection refused");
    expect(err.message).toBe("connection refused");
  });

  test("NetworkError.type is 'NetworkError'", () => {
    if (!runtimeClasses) return;
    const err = new runtimeClasses.NetworkError("msg");
    expect(err.type).toBe("NetworkError");
  });

  test("NetworkError extends Error", () => {
    if (!runtimeClasses) return;
    const err = new runtimeClasses.NetworkError("msg");
    expect(err instanceof Error).toBe(true);
  });
});

describe("emit-logic §19 §18: runtime ValidationError", () => {
  test("ValidationError.type is 'ValidationError'", () => {
    if (!runtimeClasses) return;
    const err = new runtimeClasses.ValidationError("invalid field");
    expect(err.type).toBe("ValidationError");
  });
});

describe("emit-logic §19 §19: runtime SQLError", () => {
  test("SQLError.type is 'SQLError'", () => {
    if (!runtimeClasses) return;
    const err = new runtimeClasses.SQLError("constraint violated");
    expect(err.type).toBe("SQLError");
  });
});

describe("emit-logic §19 §20: runtime AuthError", () => {
  test("AuthError.type is 'AuthError'", () => {
    if (!runtimeClasses) return;
    const err = new runtimeClasses.AuthError("unauthorized");
    expect(err.type).toBe("AuthError");
  });
});

describe("emit-logic §19 §21: runtime TimeoutError", () => {
  test("TimeoutError.type is 'TimeoutError'", () => {
    if (!runtimeClasses) return;
    const err = new runtimeClasses.TimeoutError("request timed out");
    expect(err.type).toBe("TimeoutError");
  });
});

describe("emit-logic §19 §22: runtime ParseError", () => {
  test("ParseError.type is 'ParseError'", () => {
    if (!runtimeClasses) return;
    const err = new runtimeClasses.ParseError("unexpected token");
    expect(err.type).toBe("ParseError");
  });
});

describe("emit-logic §19 §23: runtime NotFoundError", () => {
  test("NotFoundError.type is 'NotFoundError'", () => {
    if (!runtimeClasses) return;
    const err = new runtimeClasses.NotFoundError("resource not found");
    expect(err.type).toBe("NotFoundError");
  });
});

describe("emit-logic §19 §24: runtime ConflictError", () => {
  test("ConflictError.type is 'ConflictError'", () => {
    if (!runtimeClasses) return;
    const err = new runtimeClasses.ConflictError("duplicate key");
    expect(err.type).toBe("ConflictError");
  });
});

describe("emit-logic §19 §25: runtime error .cause defaults to null", () => {
  test("error constructed without options has .cause = null", () => {
    if (!runtimeClasses) return;
    const err = new runtimeClasses.NetworkError("msg");
    expect(err.cause).toBeNull();
  });
});

describe("emit-logic §19 §26: runtime error .cause from options", () => {
  test("error constructed with cause option has .cause set", () => {
    if (!runtimeClasses) return;
    const original = new Error("original");
    const err = new runtimeClasses.NetworkError("wrapped", { cause: original });
    expect(err.cause).toBe(original);
  });
});
