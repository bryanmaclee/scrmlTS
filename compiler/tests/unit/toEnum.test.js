/**
 * toEnum() — Unit Tests
 *
 * Tests for:
 *   - rewriteEnumToEnum() expression rewriter (src/codegen/rewrite.js)
 *   - emitEnumLookupTables() lookup table generator (src/codegen/emit-client.js)
 *
 * SPEC §14.4.1: `EnumType.toEnum(str)` converts a string to an enum variant,
 * returning the variant string on match or null on no match.
 *
 * Coverage:
 *   §1  rewriteEnumToEnum — basic single-call transform
 *   §2  rewriteEnumToEnum — multiple calls in one expression
 *   §3  rewriteEnumToEnum — call with a string literal argument
 *   §4  rewriteEnumToEnum — call with a variable argument
 *   §5  rewriteEnumToEnum — passes through non-toEnum method calls unchanged
 *   §6  rewriteEnumToEnum — lowercase type name not matched (must start with uppercase)
 *   §7  rewriteEnumToEnum — passes through null / non-string unchanged
 *   §8  emitEnumLookupTables — unit-variant enum produces correct lookup table
 *   §9  emitEnumLookupTables — payload variants are excluded from lookup table
 *   §10 emitEnumLookupTables — multiple enum types in same file
 *   §11 emitEnumLookupTables — empty enum body produces no table
 *   §12 emitEnumLookupTables — non-enum typeDecls are ignored
 *   §13 emitEnumLookupTables — fileAST with no typeDecls produces no lines
 *   §14 Runtime semantics — lookup table resolves valid variant to string
 *   §15 Runtime semantics — lookup table returns undefined for invalid variant (null via ??)
 *   §16 rewriteExpr — toEnum rewrite integrates correctly in full pipeline
 *   §17 emitEnumLookupTables — uses pre-parsed variants array when available
 *   §18 emitEnumLookupTables — falls back to raw parse when variants array absent
 */

import { describe, test, expect } from "bun:test";
import { rewriteEnumToEnum, rewriteExpr } from "../../src/codegen/rewrite.js";
import { emitEnumLookupTables } from "../../src/codegen/emit-client.js";

// ---------------------------------------------------------------------------
// §1–7  rewriteEnumToEnum — expression rewriter
// ---------------------------------------------------------------------------

describe("rewriteEnumToEnum", () => {
  test("§1 transforms a single toEnum call", () => {
    const result = rewriteEnumToEnum("Direction.toEnum(roleString)");
    expect(result).toBe("(Direction_toEnum[roleString] ?? null)");
  });

  test("§2 transforms multiple toEnum calls in one expression", () => {
    const expr = "Direction.toEnum(a) === Direction.toEnum(b)";
    const result = rewriteEnumToEnum(expr);
    expect(result).toBe("(Direction_toEnum[a] ?? null) === (Direction_toEnum[b] ?? null)");
  });

  test("§3 works with a string literal argument", () => {
    const result = rewriteEnumToEnum('Status.toEnum("Active")');
    expect(result).toBe('(Status_toEnum["Active"] ?? null)');
  });

  test("§4 works with a variable argument", () => {
    const result = rewriteEnumToEnum("Color.toEnum(inputVal)");
    expect(result).toBe("(Color_toEnum[inputVal] ?? null)");
  });

  test("§5 passes through non-toEnum method calls unchanged", () => {
    const expr = "direction.toString()";
    expect(rewriteEnumToEnum(expr)).toBe(expr);
  });

  test("§6 lowercase type name is not matched — must start uppercase", () => {
    const expr = "direction.toEnum(x)";
    // lowercase 'd' — should not match
    expect(rewriteEnumToEnum(expr)).toBe(expr);
  });

  test("§7 passes through null and non-string inputs unchanged", () => {
    expect(rewriteEnumToEnum(null)).toBe(null);
    expect(rewriteEnumToEnum(undefined)).toBe(undefined);
    expect(rewriteEnumToEnum("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// §8–13  emitEnumLookupTables — lookup table generation
// ---------------------------------------------------------------------------

describe("emitEnumLookupTables", () => {
  test("§8 unit-variant enum produces correct lookup table line", () => {
    const fileAST = {
      typeDecls: [
        {
          kind: "type-decl",
          typeKind: "enum",
          name: "Direction",
          variants: [
            { name: "North", payload: null },
            { name: "South", payload: null },
            { name: "East", payload: null },
            { name: "West", payload: null },
          ],
        },
      ],
    };

    const lines = emitEnumLookupTables(fileAST);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(
      'const Direction_toEnum = { "North": "North", "South": "South", "East": "East", "West": "West" };',
    );
    expect(lines[1]).toBe(
      'const Direction_variants = ["North", "South", "East", "West"];',
    );
  });

  test("§9 payload variants are excluded from lookup table", () => {
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
    expect(lines).toHaveLength(2);
    // Circle (payload variant) must not appear in toEnum; Square and Triangle must appear
    expect(lines[0]).not.toContain("Circle");
    expect(lines[0]).toContain('"Square": "Square"');
    expect(lines[0]).toContain('"Triangle": "Triangle"');
    // variants array includes ALL variants (unit + payload) in declaration order
    expect(lines[1]).toBe('const Shape_variants = ["Circle", "Square", "Triangle"];');
  });

  test("§10 multiple enum types in same file produces one line per type", () => {
    const fileAST = {
      typeDecls: [
        {
          kind: "type-decl",
          typeKind: "enum",
          name: "Status",
          variants: [
            { name: "Active", payload: null },
            { name: "Inactive", payload: null },
          ],
        },
        {
          kind: "type-decl",
          typeKind: "enum",
          name: "Role",
          variants: [
            { name: "Admin", payload: null },
            { name: "User", payload: null },
          ],
        },
      ],
    };

    const lines = emitEnumLookupTables(fileAST);
    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain("Status_toEnum");
    expect(lines[1]).toContain("Status_variants");
    expect(lines[2]).toContain("Role_toEnum");
    expect(lines[3]).toContain("Role_variants");
  });

  test("§11 enum with all payload variants and no unit variants produces no table line", () => {
    const fileAST = {
      typeDecls: [
        {
          kind: "type-decl",
          typeKind: "enum",
          name: "Shape",
          variants: [
            { name: "Circle", payload: new Map([["radius", { kind: "number" }]]) },
            { name: "Rect", payload: new Map([["w", { kind: "number" }], ["h", { kind: "number" }]]) },
          ],
        },
      ],
    };

    const lines = emitEnumLookupTables(fileAST);
    // No toEnum table (no unit variants), but variants array still emitted
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('const Shape_variants = ["Circle", "Rect"];');
  });

  test("§12 non-enum typeDecls are ignored", () => {
    const fileAST = {
      typeDecls: [
        {
          kind: "type-decl",
          typeKind: "struct",
          name: "User",
          variants: undefined,
        },
        {
          kind: "type-decl",
          typeKind: "enum",
          name: "Status",
          variants: [{ name: "Active", payload: null }],
        },
      ],
    };

    const lines = emitEnumLookupTables(fileAST);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("Status_toEnum");
    expect(lines[1]).toContain("Status_variants");
    expect(lines[0]).not.toContain("User");
    expect(lines[1]).not.toContain("User");
  });

  test("§13 fileAST with no typeDecls produces no lines", () => {
    expect(emitEnumLookupTables({})).toHaveLength(0);
    expect(emitEnumLookupTables({ typeDecls: [] })).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §14–15  Runtime semantics — verified via eval of generated table
// ---------------------------------------------------------------------------

describe("toEnum runtime semantics", () => {
  test("§14 lookup table resolves a valid variant name to itself", () => {
    // Simulate the generated lookup table
    const Direction_toEnum = { "North": "North", "South": "South", "East": "East", "West": "West" };
    expect(Direction_toEnum["North"] ?? null).toBe("North");
    expect(Direction_toEnum["East"] ?? null).toBe("East");
  });

  test("§15 lookup table returns null for an invalid variant name", () => {
    const Direction_toEnum = { "North": "North", "South": "South", "East": "East", "West": "West" };
    expect(Direction_toEnum["Up"] ?? null).toBe(null);
    expect(Direction_toEnum[""] ?? null).toBe(null);
    expect(Direction_toEnum[undefined] ?? null).toBe(null);
  });
});

// ---------------------------------------------------------------------------
// §16  Integration with rewriteExpr pipeline
// ---------------------------------------------------------------------------

describe("rewriteExpr toEnum integration", () => {
  test("§16 rewriteExpr includes toEnum rewrite in the pipeline", () => {
    const result = rewriteExpr("Direction.toEnum(input)");
    expect(result).toBe("(Direction_toEnum[input] ?? null)");
  });

  test("§16b toEnum rewrite runs before reactive-ref expansion", () => {
    // If @input were expanded first to _scrml_reactive_get("input"), the
    // TypeName.toEnum(...) pattern would still match the outer call.
    // The rewrite should produce the lookup call with the reactive getter inside.
    const result = rewriteExpr("Direction.toEnum(@input)");
    // @input is inside the argument — reactive rewrite applies to args too
    // Expected: (Direction_toEnum[_scrml_reactive_get("input")] ?? null)
    expect(result).toContain("Direction_toEnum");
    expect(result).toContain("_scrml_reactive_get");
    expect(result).toContain("?? null");
  });
});

// ---------------------------------------------------------------------------
// §17–18  emitEnumLookupTables — pre-parsed vs raw fallback
// ---------------------------------------------------------------------------

describe("emitEnumLookupTables variant sources", () => {
  test("§17 uses pre-parsed variants array when present", () => {
    const fileAST = {
      typeDecls: [
        {
          kind: "type-decl",
          typeKind: "enum",
          name: "Color",
          // pre-parsed by TS stage
          variants: [
            { name: "Red", payload: null },
            { name: "Green", payload: null },
            { name: "Blue", payload: null },
          ],
          raw: undefined, // raw absent — should use variants array
        },
      ],
    };

    const lines = emitEnumLookupTables(fileAST);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(
      'const Color_toEnum = { "Red": "Red", "Green": "Green", "Blue": "Blue" };',
    );
    expect(lines[1]).toBe(
      'const Color_variants = ["Red", "Green", "Blue"];',
    );
  });

  test("§18 falls back to raw string parse when variants array is absent", () => {
    const fileAST = {
      typeDecls: [
        {
          kind: "type-decl",
          typeKind: "enum",
          name: "Side",
          variants: undefined, // no pre-parsed variants
          raw: "{ Left\n  Right\n  Center }",
        },
      ],
    };

    const lines = emitEnumLookupTables(fileAST);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(
      'const Side_toEnum = { "Left": "Left", "Right": "Right", "Center": "Center" };',
    );
    expect(lines[1]).toBe(
      'const Side_variants = ["Left", "Right", "Center"];',
    );
  });

  test("§18b raw fallback — comma-separated single-line style", () => {
    const fileAST = {
      typeDecls: [
        {
          kind: "type-decl",
          typeKind: "enum",
          name: "Cardinal",
          variants: undefined,
          raw: "{ North, South, East, West }",
        },
      ],
    };

    const lines = emitEnumLookupTables(fileAST);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('"North": "North"');
    expect(lines[0]).toContain('"West": "West"');
    expect(lines[1]).toBe('const Cardinal_variants = ["North", "South", "East", "West"];');
  });

  test("§18c raw fallback — payload variants skipped", () => {
    const fileAST = {
      typeDecls: [
        {
          kind: "type-decl",
          typeKind: "enum",
          name: "Shape",
          variants: undefined,
          raw: "{ Circle(radius:number)\n  Square }",
        },
      ],
    };

    const lines = emitEnumLookupTables(fileAST);
    expect(lines).toHaveLength(2);
    // Circle has payload — should be excluded from toEnum
    expect(lines[0]).not.toContain("Circle");
    expect(lines[0]).toContain('"Square": "Square"');
    // But variants array includes ALL variants (unit + payload)
    expect(lines[1]).toBe('const Shape_variants = ["Circle", "Square"];');
  });
});

// ---------------------------------------------------------------------------
// §19–20  Space-normalized input (tokenizer output format)
// ---------------------------------------------------------------------------

describe("rewriteEnumToEnum — space-normalized tokenizer output", () => {
  test("§19 handles fully space-normalized input from tokenizer", () => {
    // Tokenizer produces space-normalized: "Color . toEnum ( \"Red\" )"
    const result = rewriteEnumToEnum('Color . toEnum ( "Red" )');
    expect(result).toBe('(Color_toEnum["Red"] ?? null)');
  });

  test("§20 handles mixed spacing around dot and opening paren", () => {
    const result = rewriteEnumToEnum("Status . toEnum(input)");
    expect(result).toBe("(Status_toEnum[input] ?? null)");
  });
});
