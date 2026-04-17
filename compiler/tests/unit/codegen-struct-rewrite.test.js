/**
 * Bug fix: Struct construction rewrite (P0-CODEGEN-ADVANCED-FEATURES Bug 2)
 *
 * Struct construction `StructName { fields }` is invalid JS and must be rewritten
 * to a plain object `{ fields }`. Structs are pure data (§14.3) — no methods.
 *
 * The fix: rewriteStructConstruction() in rewrite.ts, added to rewriteExpr() chain.
 */

import { describe, it, expect } from "bun:test";
import { rewriteStructConstruction, rewriteExpr } from "../../src/codegen/rewrite.ts";

// ---------------------------------------------------------------------------
// §1 — Direct rewriteStructConstruction tests
// ---------------------------------------------------------------------------

describe("rewriteStructConstruction — basic struct literal stripping", () => {
  it("strips PascalCase name from struct construction", () => {
    expect(rewriteStructConstruction("Mario { x: 1, y: 2 }")).toBe("{ x: 1, y: 2 }");
  });

  it("strips PascalCase name from struct in assignment", () => {
    expect(rewriteStructConstruction("let m = Mario { x: 0 }")).toBe("let m = { x: 0 }");
  });

  it("strips struct name with spread operator", () => {
    expect(rewriteStructConstruction("Player { ...base, hp: 100 }")).toBe("{ ...base, hp: 100 }");
  });

  it("handles multiple struct constructions in one expression", () => {
    expect(rewriteStructConstruction("let a = Vec2 { x: 1, y: 2 }; let b = Vec2 { x: 3, y: 4 }"))
      .toBe("let a = { x: 1, y: 2 }; let b = { x: 3, y: 4 }");
  });

  it("handles struct with no fields (empty body)", () => {
    expect(rewriteStructConstruction("Empty {}")).toBe("{}");
  });

  it("handles struct with multiword PascalCase name", () => {
    expect(rewriteStructConstruction("GameState { level: 1 }")).toBe("{ level: 1 }");
  });
});

// ---------------------------------------------------------------------------
// §2 — Safety: should NOT rewrite these patterns
// ---------------------------------------------------------------------------

describe("rewriteStructConstruction — safety guards", () => {
  it("does not strip enum member access: Color.Red is NOT a struct", () => {
    // Color.Red would have been rewritten by rewriteEnumVariantAccess first
    // But even if it weren't: Color.Red is preceded by '.', so we check that
    // rewriteStructConstruction doesn't accidentally touch `Foo.Bar { ... }` forms
    // (those are caught by the `.` lookbehind)
    const expr = "obj.Red { x: 1 }"; // hypothetical — not valid scrml, just safety test
    // rewriteStructConstruction: 'Red' IS preceded by '.' so should NOT be stripped
    // Actually our regex is /(?<![.A-Za-z0-9_$])([A-Z][A-Za-z0-9_]*)/
    // 'Red' at position after '.' → lookbehind matches '.' → skip
    expect(rewriteStructConstruction("obj.Red { x: 1 }")).toBe("obj.Red { x: 1 }");
  });

  it("does not strip class declarations", () => {
    expect(rewriteStructConstruction("class Mario { constructor() {} }"))
      .toBe("class Mario { constructor() {} }");
  });

  it("does not strip class with extends", () => {
    expect(rewriteStructConstruction("class Hero extends Mario { attack() {} }"))
      .toBe("class Hero extends Mario { attack() {} }");
  });

  it("does not strip function declarations", () => {
    expect(rewriteStructConstruction("function Handler { }")).toBe("function Handler { }");
  });

  it("does not strip interface/type declarations", () => {
    expect(rewriteStructConstruction("interface Config { key: string }"))
      .toBe("interface Config { key: string }");
    expect(rewriteStructConstruction("type Alias { field: number }"))
      .toBe("type Alias { field: number }");
  });

  it("handles plain lowercase identifiers — no change", () => {
    expect(rewriteStructConstruction("let x = { a: 1 }")).toBe("let x = { a: 1 }");
    expect(rewriteStructConstruction("return { ok: true }")).toBe("return { ok: true }");
  });
});

// ---------------------------------------------------------------------------
// §3 — Integration: rewriteExpr chain includes struct rewrite
// ---------------------------------------------------------------------------

describe("rewriteExpr includes struct construction rewrite", () => {
  it("rewrites struct in full rewriteExpr pipeline", () => {
    const result = rewriteExpr("let m = Mario { x: 1, y: 2 }");
    expect(result).toContain("{ x: 1, y: 2 }");
    expect(result).not.toContain("Mario {");
  });

  it("struct rewrite does not confuse enum payload call expressions", () => {
    // S22 §1a: payload construction is a call to the constructor function,
    // e.g. `GameStatus.Playing(42)` — the struct pass (which looks for
    // `PascalCase {`) must not misinterpret it.
    const result = rewriteExpr("let s = GameStatus.Playing(42)");
    expect(result).toContain("GameStatus.Playing(42)");
    expect(result).not.toContain("GameStatus {");
  });

  it("struct construction name is stripped through rewriteExpr", () => {
    // rewriteExpr strips the struct name AND rewrites reactive refs.
    // Pass 9.5 (struct construction) runs before pass 10 (reactive refs),
    // so `Point { x: @posX }` → `{ x: @posX }` → `{ x: _scrml_reactive_get("posX") }`.
    const result = rewriteExpr("Point { x: @posX, y: @posY }");
    expect(result).not.toContain("Point {");
    // Reactive refs inside the struct body are now rewritten
    expect(result).toContain('_scrml_reactive_get("posX")');
    expect(result).toContain('_scrml_reactive_get("posY")');
  });
});
