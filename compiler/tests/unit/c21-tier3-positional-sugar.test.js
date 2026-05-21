/**
 * c21-tier3-positional-sugar.test.js — A1c Step C21 unit tests
 *
 * Tests the Tier 3 predefined-shape compound positional sugar lowering
 * dispatch arm in `emit-logic.ts case "state-decl"`:
 *
 *   §C21.1  Positive lowering — `<userInfo>: UserInfo = ("alice", 30, true)`
 *           lowers SequenceExpression → typed object literal in struct
 *           field-declaration order.
 *   §C21.2  Detection-gate negatives — no typeAnnotation, non-struct anno,
 *           non-SequenceExpression init, missing typeRegistry → no lowering
 *           (legacy fallthrough applies).
 *   §C21.3  Arity mismatch — too few / too many positionals → E-TYPE-001.
 *   §C21.4  Variant C ad-hoc — no typeAnno → naturally excluded.
 *   §C21.5  Regression — typed Shape 1 non-tuple still works.
 *   §C21.6  Regression — JS comma-operator outside compound init unchanged.
 *   §C21.7  Field-order preservation across struct declaration order.
 *   §C21.8  Span / source preservation in diagnostics.
 *
 * SCOPE: per A1c Step C21 BRIEF + Phase 0 SURVEY — covers Tier 3 lowering
 * detection, mapping, and arity diagnostic. OUT OF SCOPE: per-position type
 * mismatch (downstream §14.3 record-init type-checking), nested struct
 * positional sub-tuples (§14.11 line 7228 forbids), Variant C ad-hoc
 * compound emission (covered by C1).
 *
 * SPEC reference: §14.11 (lines 7210-7253) — M10 positional binding.
 */

import { describe, test, expect } from "bun:test";
import { emitLogicNode } from "../../src/codegen/emit-logic.js";

// ---------------------------------------------------------------------------
// Helpers — synthesize state-decl AST nodes + struct typeRegistries
// ---------------------------------------------------------------------------

/**
 * Build a struct `ResolvedType` matching the shape produced by
 * `compiler/src/type-system.ts:tStruct`.
 *
 * @param name struct type name
 * @param fields array of [fieldName, fieldType] tuples — order matters
 *               (struct field-declaration order is the binding order per
 *               §14.11 line 7226)
 */
function makeStructType(name, fields) {
  return {
    kind: "struct",
    name,
    fields: new Map(fields),
  };
}

function makePrimitive(name) {
  return { kind: "primitive", name };
}

/**
 * Build a typeRegistry containing one or more struct types.
 */
function makeTypeRegistry(...structs) {
  const m = new Map();
  for (const s of structs) m.set(s.name, s);
  return m;
}

/**
 * Synthesize a Tier 3 state-decl AST node — `<NAME>: TypeName = (a, b, c)`.
 *
 * Mirrors what ast-builder.js produces (per ast-builder.js:3219-3392 +
 * expression-parser.ts:1329-1332 — SequenceExpression → escape-hatch).
 */
function tier3Node(name, typeAnnotation, rawSequenceText) {
  return {
    kind: "state-decl",
    name,
    init: rawSequenceText,
    initExpr: {
      kind: "escape-hatch",
      nativeKind: "SequenceExpression",
      raw: rawSequenceText,
      span: { file: "<test>", start: 0, end: rawSequenceText.length, line: 1, col: 1 },
    },
    shape: "plain",
    structuralForm: true,
    isConst: false,
    typeAnnotation,
    span: { start: 0, end: rawSequenceText.length },
  };
}

// ---------------------------------------------------------------------------
// §C21.1 Positive lowering
// ---------------------------------------------------------------------------

describe("C21 §C21.1 — Positive lowering", () => {
  test('3-field struct `<userInfo>: UserInfo = ("alice", 30, true)` lowers to typed object literal', () => {
    const UserInfo = makeStructType("UserInfo", [
      ["name", makePrimitive("string")],
      ["age", makePrimitive("number")],
      ["active", makePrimitive("boolean")],
    ]);
    const node = tier3Node("userInfo", "UserInfo", '("alice", 30, true)');
    const result = emitLogicNode(node, {
      typeRegistry: makeTypeRegistry(UserInfo),
      errors: [],
      boundary: "client",
    });
    // C21 marker confirms the dispatch arm fired
    expect(result).toContain("@c21-tier3");
    expect(result).toContain('_scrml_reactive_set("userInfo"');
    expect(result).toContain('name: "alice"');
    expect(result).toContain("age: 30");
    expect(result).toContain("active: true");
    // The MAIN reactive-set emission must NOT contain the raw SequenceExpression
    // (the bug). The init-thunk MAY now reuse the lowered form too.
    const reactiveSetLine = result.split("\n").find(l => l.includes('_scrml_reactive_set("userInfo"'));
    expect(reactiveSetLine).toBeDefined();
    expect(reactiveSetLine).not.toContain('"alice", 30, true)');
  });

  test("2-field struct lowers in declaration order", () => {
    const Point = makeStructType("Point", [
      ["x", makePrimitive("number")],
      ["y", makePrimitive("number")],
    ]);
    const node = tier3Node("origin", "Point", "(0, 0)");
    const result = emitLogicNode(node, {
      typeRegistry: makeTypeRegistry(Point),
      errors: [],
      boundary: "client",
    });
    expect(result).toContain('_scrml_reactive_set("origin"');
    expect(result).toMatch(/x:\s*0/);
    expect(result).toMatch(/y:\s*0/);
  });

  test("complex value expressions (reactive references) flow through emitExpr", () => {
    const Cart = makeStructType("Cart", [
      ["price", makePrimitive("number")],
      ["count", makePrimitive("number")],
    ]);
    const node = tier3Node("cart", "Cart", "(@unitPrice * 2, @qty + 1)");
    const result = emitLogicNode(node, {
      typeRegistry: makeTypeRegistry(Cart),
      errors: [],
      boundary: "client",
    });
    // Reactive refs should be lowered via _scrml_reactive_get
    expect(result).toContain('_scrml_reactive_get("unitPrice")');
    expect(result).toContain('_scrml_reactive_get("qty")');
    expect(result).toContain("price:");
    expect(result).toContain("count:");
  });

  test("nested object/array values within positionals split correctly on top-level commas", () => {
    const Bundle = makeStructType("Bundle", [
      ["meta", makePrimitive("string")],
      ["items", makePrimitive("string")],
    ]);
    // The inner `[1, 2, 3]` and `{a: 1}` must NOT be split at their internal commas
    const node = tier3Node("b", "Bundle", '({a: 1, b: 2}, [1, 2, 3])');
    const result = emitLogicNode(node, {
      typeRegistry: makeTypeRegistry(Bundle),
      errors: [],
      boundary: "client",
    });
    expect(result).toContain('_scrml_reactive_set("b"');
    expect(result).toContain("meta:");
    expect(result).toContain("items:");
    // Both fields should be present with their full nested values intact
    expect(result).toMatch(/meta:\s*\{[^}]*a:[^}]*1[^}]*b:[^}]*2[^}]*\}/);
    expect(result).toMatch(/items:\s*\[[^\]]*1[^\]]*2[^\]]*3[^\]]*\]/);
  });
});

// ---------------------------------------------------------------------------
// §C21.2 Detection-gate negatives
// ---------------------------------------------------------------------------

describe("C21 §C21.2 — Detection-gate negatives (no lowering)", () => {
  test("no typeAnnotation → falls through to legacy reactive-set (Variant C ad-hoc territory)", () => {
    // <formRes> = (a, b, c) — no typeAnnotation, naturally excluded.
    const node = {
      kind: "state-decl",
      name: "formRes",
      init: '("a", "b", "c")',
      initExpr: {
        kind: "escape-hatch",
        nativeKind: "SequenceExpression",
        raw: '("a", "b", "c")',
        span: { start: 0, end: 0 },
      },
      shape: "plain",
      structuralForm: true,
      isConst: false,
      span: { start: 0, end: 0 },
    };
    const errors = [];
    const result = emitLogicNode(node, {
      typeRegistry: new Map(),
      errors,
      boundary: "client",
    });
    // Legacy fallthrough emits the raw escape-hatch text — the latent bug
    // applies here, but per §14.11 line 7229 it's not C21's job to fix
    // Variant C ad-hoc compound shape mismatches; user simply gets the
    // JS-comma-operator semantic.
    expect(result).toContain('_scrml_reactive_set("formRes"');
    // No diagnostic surfaced (out of C21 scope)
    expect(errors.length).toBe(0);
  });

  test("typeAnnotation resolves to non-struct (primitive) → falls through", () => {
    // <count>: number = (a, b) — pathological but parses; non-struct typeAnno.
    const tNumber = makePrimitive("number");
    const reg = new Map([["number", tNumber]]);
    const node = tier3Node("count", "number", "(1, 2)");
    const errors = [];
    const result = emitLogicNode(node, {
      typeRegistry: reg,
      errors,
      boundary: "client",
    });
    // Should fall through to legacy emission (no Tier 3 lowering)
    expect(result).toContain('_scrml_reactive_set("count"');
    // No struct lowering — the lowered object literal is absent
    expect(result).not.toMatch(/^\s*\(\s*\{\s*[a-z]+:/);
    expect(errors.length).toBe(0);
  });

  test("init is non-SequenceExpression (escape-hatch with different nativeKind) → falls through", () => {
    const Point = makeStructType("Point", [
      ["x", makePrimitive("number")],
      ["y", makePrimitive("number")],
    ]);
    // <p>: Point = somefunc() — typed but RHS is a CallExpression, not a
    // SequenceExpression. C21 must NOT lower (positional sugar requires
    // SequenceExpression).
    const node = {
      kind: "state-decl",
      name: "p",
      init: "somefunc()",
      initExpr: {
        kind: "escape-hatch",
        nativeKind: "CallExpression",
        raw: "somefunc()",
        span: { start: 0, end: 0 },
      },
      shape: "plain",
      structuralForm: true,
      isConst: false,
      typeAnnotation: "Point",
      span: { start: 0, end: 0 },
    };
    const errors = [];
    const result = emitLogicNode(node, {
      typeRegistry: makeTypeRegistry(Point),
      errors,
      boundary: "client",
    });
    expect(result).toContain('_scrml_reactive_set("p"');
    expect(errors.length).toBe(0);
    // No Tier-3 lowering: no marker comment, no field-named entries
    expect(result).not.toContain("@c21-tier3");
  });

  test("missing typeRegistry → no lowering (test-fixture compatibility)", () => {
    // When tests bypass the registry entirely, the C21 arm declines.
    const node = tier3Node("userInfo", "UserInfo", '("alice", 30, true)');
    const errors = [];
    const result = emitLogicNode(node, { errors, boundary: "client" });
    // Falls through — emits the SequenceExpression raw via escape-hatch.
    expect(result).toContain('_scrml_reactive_set("userInfo"');
    expect(errors.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §C21.3 Arity mismatch (E-TYPE-001 per §14.11 line 7226)
// ---------------------------------------------------------------------------

describe("C21 §C21.3 — Arity mismatch fires E-TYPE-001", () => {
  test("too few positionals (expected 3, got 2) → E-TYPE-001", () => {
    const UserInfo = makeStructType("UserInfo", [
      ["name", makePrimitive("string")],
      ["age", makePrimitive("number")],
      ["active", makePrimitive("boolean")],
    ]);
    const node = tier3Node("u", "UserInfo", '("alice", 30)');
    const errors = [];
    const result = emitLogicNode(node, {
      typeRegistry: makeTypeRegistry(UserInfo),
      errors,
      boundary: "client",
    });
    expect(errors.length).toBe(1);
    expect(errors[0].code).toBe("E-TYPE-001");
    expect(errors[0].message).toContain("UserInfo");
    expect(errors[0].message).toContain("3 fields");
    expect(errors[0].message).toContain("2 values");
    // Defensive emission — recoverable, doesn't crash
    expect(result).toContain("E-TYPE-001");
  });

  test("too many positionals (expected 2, got 3) → E-TYPE-001", () => {
    const Point = makeStructType("Point", [
      ["x", makePrimitive("number")],
      ["y", makePrimitive("number")],
    ]);
    const node = tier3Node("p", "Point", "(1, 2, 3)");
    const errors = [];
    const result = emitLogicNode(node, {
      typeRegistry: makeTypeRegistry(Point),
      errors,
      boundary: "client",
    });
    expect(errors.length).toBe(1);
    expect(errors[0].code).toBe("E-TYPE-001");
    expect(errors[0].message).toContain("Point");
    expect(errors[0].message).toContain("2 fields");
    expect(errors[0].message).toContain("3 values");
  });

  test("error message references the named-initialiser form", () => {
    // §14.11 cross-ref — the error message guides users to the canonical form.
    const Point = makeStructType("Point", [
      ["x", makePrimitive("number")],
      ["y", makePrimitive("number")],
    ]);
    const node = tier3Node("p", "Point", "(1)");
    const errors = [];
    emitLogicNode(node, {
      typeRegistry: makeTypeRegistry(Point),
      errors,
      boundary: "client",
    });
    expect(errors[0].message).toContain("§14.11");
    expect(errors[0].message).toMatch(/\{x: …, y: …\}/);
  });

  test("missing errors accumulator → diagnostic dropped silently, defensive emit still produced", () => {
    // Test-fixture compatibility: when opts.errors is absent, the helper
    // still recovers without crashing.
    const Point = makeStructType("Point", [
      ["x", makePrimitive("number")],
      ["y", makePrimitive("number")],
    ]);
    const node = tier3Node("p", "Point", "(1)");
    const result = emitLogicNode(node, {
      typeRegistry: makeTypeRegistry(Point),
      // no errors field
      boundary: "client",
    });
    // Still emits a defensive recoverable line
    expect(result).toContain('_scrml_reactive_set("p"');
    expect(result).toContain("E-TYPE-001");
  });
});

// ---------------------------------------------------------------------------
// §C21.4 Variant C ad-hoc rejection (no positional binding allowed per §14.11)
// ---------------------------------------------------------------------------

describe("C21 §C21.4 — Variant C ad-hoc compound exclusion", () => {
  test("compound parent (children !== undefined) routes to C1 arm, not C21", () => {
    // <formRes><name>=""</></ — Variant C ad-hoc form. Even if a typeAnnotation
    // were attached (it shouldn't be), the children field routes to C1's
    // compound-parent arm BEFORE the C21 arm is reached.
    const UserInfo = makeStructType("UserInfo", [
      ["name", makePrimitive("string")],
      ["age", makePrimitive("number")],
    ]);
    const node = {
      kind: "state-decl",
      name: "formRes",
      init: "",
      initExpr: null,
      shape: "plain",
      structuralForm: true,
      isConst: false,
      _cellKind: "compound-parent",
      children: [
        {
          kind: "state-decl",
          name: "name",
          init: '""',
          initExpr: { kind: "lit", value: "", litType: "string" },
          shape: "plain",
          structuralForm: true,
          isConst: false,
          _cellKind: "plain",
          span: { start: 0, end: 0 },
        },
      ],
      span: { start: 0, end: 0 },
    };
    const errors = [];
    const result = emitLogicNode(node, {
      typeRegistry: makeTypeRegistry(UserInfo),
      errors,
      boundary: "client",
    });
    // C1 arm fires — _scrml_derived_declare for parent proxy
    expect(result).toContain('_scrml_derived_declare("formRes"');
    // No C21 lowering, no diagnostic
    expect(errors.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §C21.5 Regression — typed Shape 1 non-tuple still works
// ---------------------------------------------------------------------------

describe("C21 §C21.5 — Regression: typed Shape 1 non-tuple init", () => {
  test('`<count>: number = 0` (typed Shape 1, no SequenceExpression) emits unchanged', () => {
    const tNumber = makePrimitive("number");
    // Use the legacy init-string fallback path (no initExpr) — mirrors C1
    // test pattern. The C21 detection gate fails on initExpr absence (gate 2),
    // so the legacy fallthrough runs.
    const node = {
      kind: "state-decl",
      name: "count",
      init: "0",
      initExpr: undefined,
      shape: "plain",
      structuralForm: true,
      isConst: false,
      typeAnnotation: "number",
      span: { start: 0, end: 0 },
    };
    const errors = [];
    const result = emitLogicNode(node, {
      typeRegistry: new Map([["number", tNumber]]),
      errors,
      boundary: "client",
    });
    expect(result).toContain('_scrml_reactive_set("count"');
    expect(result).toContain(", 0");
    expect(errors.length).toBe(0);
    // No C21 marker — fell through to legacy
    expect(result).not.toContain("@c21-tier3");
  });
});

// ---------------------------------------------------------------------------
// §C21.6 Regression — JS comma-operator outside compound init unchanged
// ---------------------------------------------------------------------------

describe("C21 §C21.6 — Regression: SequenceExpression OUTSIDE compound init", () => {
  test("untyped state-decl with SequenceExpression init emits unchanged (no false-positive lowering)", () => {
    // Without a typeAnnotation, the C21 detection gate fails on gate 1.
    // The legacy fallthrough preserves the JS-comma-operator semantic.
    const node = {
      kind: "state-decl",
      name: "x",
      init: "(1, 2, 3)",
      initExpr: {
        kind: "escape-hatch",
        nativeKind: "SequenceExpression",
        raw: "(1, 2, 3)",
        span: { start: 0, end: 0 },
      },
      shape: "plain",
      structuralForm: true,
      isConst: false,
      // NO typeAnnotation
      span: { start: 0, end: 0 },
    };
    const errors = [];
    const result = emitLogicNode(node, {
      typeRegistry: new Map(),
      errors,
      boundary: "client",
    });
    // Legacy fallthrough — emits the raw text (JS-comma-operator semantic intact)
    expect(result).toContain('_scrml_reactive_set("x"');
    expect(errors.length).toBe(0);
    // Should NOT emit a typed-object-literal lowering (no false positive)
    expect(result).not.toMatch(/^\s*\(\s*\{[a-z]+:/);
  });
});

// ---------------------------------------------------------------------------
// §C21.7 Field-order preservation
// ---------------------------------------------------------------------------

describe("C21 §C21.7 — Field-order preservation", () => {
  test("struct with reordered field declaration produces lowered literal in DECLARATION order", () => {
    // Declaration: { z, y, x } — positional values map to z/y/x respectively.
    const Reordered = makeStructType("Reordered", [
      ["z", makePrimitive("number")],
      ["y", makePrimitive("number")],
      ["x", makePrimitive("number")],
    ]);
    const node = tier3Node("r", "Reordered", "(100, 200, 300)");
    const result = emitLogicNode(node, {
      typeRegistry: makeTypeRegistry(Reordered),
      errors: [],
      boundary: "client",
    });
    // First positional → z (declaration order, NOT alphabetical)
    expect(result).toMatch(/z:\s*100/);
    expect(result).toMatch(/y:\s*200/);
    expect(result).toMatch(/x:\s*300/);
    // Verify ordering in the emitted literal: z appears before y appears before x
    const zIdx = result.indexOf("z:");
    const yIdx = result.indexOf("y:");
    const xIdx = result.indexOf("x:");
    expect(zIdx).toBeGreaterThan(-1);
    expect(yIdx).toBeGreaterThan(zIdx);
    expect(xIdx).toBeGreaterThan(yIdx);
  });
});

// ---------------------------------------------------------------------------
// §C21.8 Span / source preservation in diagnostics
// ---------------------------------------------------------------------------

describe("C21 §C21.8 — Diagnostic span preservation", () => {
  test("E-TYPE-001 carries the SequenceExpression's span", () => {
    const Point = makeStructType("Point", [
      ["x", makePrimitive("number")],
      ["y", makePrimitive("number")],
    ]);
    const node = tier3Node("p", "Point", "(1)");
    // Override the synthesized span to a known value
    node.initExpr.span = { file: "<test>", start: 42, end: 45, line: 7, col: 12 };
    const errors = [];
    emitLogicNode(node, {
      typeRegistry: makeTypeRegistry(Point),
      errors,
      boundary: "client",
    });
    expect(errors.length).toBe(1);
    expect(errors[0].span).toBeDefined();
    expect(errors[0].span.start).toBe(42);
    expect(errors[0].span.end).toBe(45);
    expect(errors[0].span.line).toBe(7);
  });
});
