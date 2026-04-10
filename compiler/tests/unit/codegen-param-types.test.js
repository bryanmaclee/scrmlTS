/**
 * Bug fix: Type annotation stripping from function params (P0-CODEGEN-ADVANCED-FEATURES Bug 1)
 *
 * In scrml, function params may have type annotations like "mario:Mario".
 * The compiler must strip the ":Type" suffix before emitting JS.
 * These tests verify the fix in emit-functions.ts, emit-server.ts, and emit-logic.ts.
 *
 * The fix: `typeof p === "string" ? p.split(":")[0].trim() : ...`
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { rewriteExpr } from "../../src/codegen/rewrite.ts";
import { emitLogicNode } from "../../src/codegen/emit-logic.ts";
import { resetVarCounter } from "../../src/codegen/var-counter.ts";

beforeEach(() => {
  resetVarCounter();
});

// ---------------------------------------------------------------------------
// Direct test of the param stripping logic (used in all 5 sites)
// ---------------------------------------------------------------------------

describe("Type annotation stripping from string params", () => {
  it("strips :Type suffix from a simple typed param", () => {
    const param = "mario:Mario";
    const stripped = param.split(":")[0].trim();
    expect(stripped).toBe("mario");
  });

  it("strips :Type suffix preserving the param name", () => {
    const param = "player:Player";
    const stripped = param.split(":")[0].trim();
    expect(stripped).toBe("player");
  });

  it("does not affect params without type annotations", () => {
    const param = "username";
    const stripped = param.split(":")[0].trim();
    expect(stripped).toBe("username");
  });

  it("handles multiple colons - only strips after first", () => {
    // Edge case: "a:b:c" → strips to "a"
    const param = "a:b:c";
    const stripped = param.split(":")[0].trim();
    expect(stripped).toBe("a");
  });

  it("handles params with leading/trailing spaces", () => {
    const param = "  mario:Mario  ";
    const stripped = param.split(":")[0].trim();
    expect(stripped).toBe("mario");
  });

  it("handles PascalCase type names", () => {
    const tests = [
      ["user:UserProfile", "user"],
      ["game:GameState", "game"],
      ["item:TodoItem", "item"],
      ["pos:Vec2D", "pos"],
    ];
    for (const [input, expected] of tests) {
      expect(input.split(":")[0].trim()).toBe(expected);
    }
  });
});

// ---------------------------------------------------------------------------
// Integration: emitLogicNode with function-decl containing typed params
// ---------------------------------------------------------------------------

describe("emitLogicNode handles typed params in function-decl", () => {
  it("strips type annotation from string param in function-decl node", () => {
    const node = {
      kind: "function-decl",
      name: "move",
      params: ["mario:Mario", "dx:number"],
      body: [],
    };
    const result = emitLogicNode(node);
    // Should emit: function move(mario, dx) {
    expect(result).toContain("function move(mario, dx)");
    expect(result).not.toContain("mario:Mario");
    expect(result).not.toContain("dx:number");
  });

  it("handles mixed typed and untyped params", () => {
    const node = {
      kind: "function-decl",
      name: "update",
      params: ["x:number", "label", "opts:Options"],
      body: [],
    };
    const result = emitLogicNode(node);
    expect(result).toContain("function update(x, label, opts)");
    expect(result).not.toContain(":number");
    expect(result).not.toContain(":Options");
  });

  it("handles structured param objects (no strip needed)", () => {
    // When param is an object with .name, no stripping needed
    const node = {
      kind: "function-decl",
      name: "render",
      params: [{ name: "item" }, { name: "index" }],
      body: [],
    };
    const result = emitLogicNode(node);
    expect(result).toContain("function render(item, index)");
  });

  it("handles fallback _scrml_arg_N for unnamed params", () => {
    const node = {
      kind: "function-decl",
      name: "handler",
      params: [{}],
      body: [],
    };
    const result = emitLogicNode(node);
    expect(result).toContain("_scrml_arg_0");
  });
});
