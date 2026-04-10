/**
 * Enum Variants + Variant Construction — Unit Tests
 *
 * Tests for:
 *   Feature 1: EnumType.variants runtime API (§14.4.2)
 *     - rewrite Color.variants → Color_variants
 *     - emitEnumLookupTables generates _variants arrays
 *   Feature 2: Enum variant construction as expression (§14.5)
 *     - rewrite Shape.Circle(5) → { variant: "Circle", value: (5) }
 *     - unit variant regression (Direction.North stays as-is)
 *   Feature 3: Nested-paren payload fix (Bug 3, P0-CODEGEN-ADVANCED-FEATURES)
 *     - rewrite GameStatus.Playing(mario: eatPowerUp(m, p)) correctly
 */

import { describe, test, expect } from "bun:test";
import {
  rewriteEnumVariantAccess,
  rewriteExpr,
} from "../../src/codegen/rewrite.ts";
import { emitEnumLookupTables } from "../../src/codegen/emit-client.ts";

// ---------------------------------------------------------------------------
// §1–5  EnumType.variants rewrite
// ---------------------------------------------------------------------------

describe("EnumType.variants rewrite", () => {
  test("§1 rewriteEnumVariantAccess rewrites Color.variants to Color_variants", () => {
    expect(rewriteEnumVariantAccess("Color.variants")).toBe("Color_variants");
  });

  test("§2 rewriteExpr propagates the .variants rewrite", () => {
    expect(rewriteExpr("Color.variants")).toBe("Color_variants");
  });

  test("§3 non-PascalCase obj.variants is not rewritten", () => {
    expect(rewriteEnumVariantAccess("obj.variants")).toBe("obj.variants");
    expect(rewriteEnumVariantAccess("myEnum.variants")).toBe("myEnum.variants");
    expect(rewriteEnumVariantAccess("_Foo.variants")).toBe("_Foo.variants");
  });

  test("§4 multiple enums each get their own variants array", () => {
    const fileAST = {
      typeDecls: [
        {
          kind: "type-decl",
          typeKind: "enum",
          name: "Color",
          variants: [
            { name: "Red", payload: null },
            { name: "Green", payload: null },
            { name: "Blue", payload: null },
          ],
        },
        {
          kind: "type-decl",
          typeKind: "enum",
          name: "Direction",
          variants: [
            { name: "North", payload: null },
            { name: "South", payload: null },
          ],
        },
      ],
    };

    const lines = emitEnumLookupTables(fileAST);
    const variantsLines = lines.filter((l) => l.includes("_variants"));
    expect(variantsLines).toHaveLength(2);
    expect(variantsLines[0]).toBe('const Color_variants = ["Red", "Green", "Blue"];');
    expect(variantsLines[1]).toBe('const Direction_variants = ["North", "South"];');
  });

  test("§5 emitEnumLookupTables generates variants array for enum with mixed unit/payload variants", () => {
    const fileAST = {
      typeDecls: [
        {
          kind: "type-decl",
          typeKind: "enum",
          name: "Shape",
          variants: [
            { name: "Circle", payload: new Map([["radius", { kind: "number" }]]) },
            { name: "Square", payload: null },
            { name: "Triangle", payload: null },
          ],
        },
      ],
    };

    const lines = emitEnumLookupTables(fileAST);
    const variantsLine = lines.find((l) => l.includes("_variants"));
    expect(variantsLine).toBe('const Shape_variants = ["Circle", "Square", "Triangle"];');
  });
});

// ---------------------------------------------------------------------------
// §6–8  Enum variant construction
// ---------------------------------------------------------------------------

describe("Enum variant construction", () => {
  test("§6 unit variant Direction.North is unchanged (accessed via frozen object)", () => {
    // Direction.North stays as property access on the frozen enum object.
    // It is NOT rewritten to "North" — the frozen object handles that.
    expect(rewriteEnumVariantAccess("Direction.North")).toBe("Direction.North");
  });

  test("§7 payload variant Shape.Circle(5) rewrites to tagged object", () => {
    const result = rewriteEnumVariantAccess("Shape.Circle(5)");
    expect(result).toBe('{ variant: "Circle", value: (5) }');
  });

  test("§7b payload variant with complex expression", () => {
    const result = rewriteEnumVariantAccess("Result.Found(user.id)");
    expect(result).toBe('{ variant: "Found", value: (user.id) }');
  });

  test("§7c payload variant through rewriteExpr pipeline", () => {
    const result = rewriteExpr("Shape.Circle(radius)");
    expect(result).toBe('{ variant: "Circle", value: (radius) }');
  });

  test("§8 match/construction compatibility — match destructures by string tag", () => {
    // match compiles variant arms to: tmpVar === "VariantName"
    // Unit variants at runtime are strings: "North"
    // Payload variants at runtime are: { variant: "Circle", value: 5 }
    // So match arms for unit variants check string equality.
    // For payload variants, match would need to check .variant property.
    // This test just verifies the construction produces the right shape.
    const constructed = eval("(" + rewriteEnumVariantAccess("Shape.Circle(42)") + ")");
    expect(constructed).toEqual({ variant: "Circle", value: 42 });
  });
});

// ---------------------------------------------------------------------------
// §9–13  Nested-paren payload fix (Bug 3, P0-CODEGEN-ADVANCED-FEATURES)
// The old regex `([^)]*)` terminated early on nested parens.
// The fix uses balanced-paren extraction.
// ---------------------------------------------------------------------------

describe("Enum variant construction with nested parens (Bug 3 fix)", () => {
  test("§9 payload with nested function call argument", () => {
    // GameStatus.Playing(eatPowerUp(m, p)) — inner call has its own parens
    const result = rewriteEnumVariantAccess("GameStatus.Playing(eatPowerUp(m, p))");
    expect(result).toBe('{ variant: "Playing", value: (eatPowerUp(m, p)) }');
  });

  test("§10 payload with two levels of nesting", () => {
    const result = rewriteEnumVariantAccess("State.Active(compute(a, add(b, c)))");
    expect(result).toBe('{ variant: "Active", value: (compute(a, add(b, c))) }');
  });

  test("§11 payload with method chain in argument", () => {
    const result = rewriteEnumVariantAccess("Result.Ok(items.map(x => x.id))");
    expect(result).toBe('{ variant: "Ok", value: (items.map(x => x.id)) }');
  });

  test("§12 payload with named parameter (colon syntax in arg)", () => {
    const result = rewriteEnumVariantAccess("GameStatus.Playing(mario: eatPowerUp(m, p))");
    expect(result).toBe('{ variant: "Playing", value: (mario: eatPowerUp(m, p)) }');
  });

  test("§13 simple payload still works after fix", () => {
    // Regression: the simple case must still work
    const result = rewriteEnumVariantAccess("Shape.Circle(5)");
    expect(result).toBe('{ variant: "Circle", value: (5) }');
  });

  test("§13b multiple payload constructions in one expression", () => {
    const result = rewriteEnumVariantAccess("let a = X.Foo(f(1, 2)); let b = X.Bar(g(3))");
    expect(result).toContain('{ variant: "Foo", value: (f(1, 2)) }');
    expect(result).toContain('{ variant: "Bar", value: (g(3)) }');
  });
});
