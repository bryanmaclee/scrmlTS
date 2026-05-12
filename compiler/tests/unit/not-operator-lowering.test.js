/**
 * `not` operator-form lowering — Unit Tests (§45.7)
 *
 * scrml's `not` keyword has two semantics:
 *   - VALUE form (§42): standalone `not` is the non-presence value (replaces null/undefined).
 *     Already covered by not-keyword.test.js.
 *   - OPERATOR form (§45.7): `not <expr>` is unary boolean negation (replaces `!`).
 *     This file covers the operator form, disambiguated from the value form by position.
 *
 * Bug v024-1: `not @gameOver` previously lowered to `null _scrml_reactive_get("gameOver")`
 * — literal "null" followed by the operand with no operator between them. Compiled output
 * failed `node --check`. The rewriter conflated the operator-form (followed by an operand)
 * with the value-form (standalone). This file gates the disambiguated lowering.
 *
 * Tests cover:
 *   §1  not <bare-ident> lowers to !<bare-ident>
 *   §2  not @cell lowers to !_scrml_reactive_get("cell")
 *   §3  not inside conditional position
 *   §4  Compound boolean: && / || with not on both operands
 *   §5  not (paren-expr) — pre-existing regression guard
 *   §6  VALUE-FORM regression — `@x = not`, `return not`, `f(not)` still null
 *   §7  Member access: not @user.profile.active
 *   §8  Function-call operand: not f(x) → !f(x)
 *   §9  AST path — paren-form if=(...) compiles correctly end-to-end via emitExprField
 */

import { describe, test, expect } from "bun:test";
import { rewriteNotKeyword, rewriteExpr } from "../../src/codegen/rewrite.ts";
import { parseExprToNode } from "../../src/expression-parser.ts";
import { emitExprField } from "../../src/codegen/emit-expr.ts";

// ---------------------------------------------------------------------------
// §1: not <bare-ident> — operator form on plain identifier
// ---------------------------------------------------------------------------

describe("§1 — not <bare-ident>", () => {
  test("§1.1 not gameOver lowers to !gameOver", () => {
    const result = rewriteNotKeyword("not gameOver");
    expect(result).toBe("!gameOver");
  });

  test("§1.2 not gameOver via rewriteExpr (full pipeline) lowers to !gameOver", () => {
    const result = rewriteExpr("not gameOver");
    expect(result).toBe("!gameOver");
  });

  test("§1.3 standalone `not <ident>` does NOT emit a literal `null` token", () => {
    const result = rewriteExpr("not gameOver");
    // The bug pattern was "null gameOver" — literal null followed by ident.
    expect(result).not.toMatch(/\bnull\s+gameOver\b/);
  });
});

// ---------------------------------------------------------------------------
// §2: not @cell — operator form on reactive ref
// ---------------------------------------------------------------------------

describe("§2 — not @cell", () => {
  test("§2.1 not @gameOver via rewriteNotKeyword preserves @ for later reactive rewrite", () => {
    // rewriteNotKeyword runs BEFORE rewriteReactiveRefs, so @ must survive the pass.
    const result = rewriteNotKeyword("not @gameOver");
    expect(result).toBe("!@gameOver");
  });

  test("§2.2 not @gameOver via rewriteExpr lowers to !_scrml_reactive_get('gameOver')", () => {
    const result = rewriteExpr("not @gameOver");
    expect(result).toContain('!_scrml_reactive_get("gameOver")');
    // No literal `null` left over.
    expect(result).not.toContain('null _scrml_reactive_get');
    expect(result).not.toContain('null @');
  });
});

// ---------------------------------------------------------------------------
// §3: not inside conditional position
// ---------------------------------------------------------------------------

describe("§3 — not in conditional position", () => {
  test("§3.1 if (not @x) lowers correctly", () => {
    const result = rewriteExpr("if (not @x) { doThing() }");
    expect(result).toContain('!_scrml_reactive_get("x")');
    expect(result).not.toMatch(/\bnull\s+_scrml_reactive_get/);
  });

  test("§3.2 ternary: not @x ? a : b", () => {
    const result = rewriteExpr("not @x ? a : b");
    expect(result).toContain('!_scrml_reactive_get("x")');
    expect(result).not.toMatch(/\bnull\s+\?/);
  });
});

// ---------------------------------------------------------------------------
// §4: Compound boolean — && / || with not on operands
// ---------------------------------------------------------------------------

describe("§4 — compound boolean", () => {
  test("§4.1 @a && not @b — both operands respected", () => {
    const result = rewriteExpr("@a && not @b");
    expect(result).toContain('_scrml_reactive_get("a")');
    expect(result).toContain('!_scrml_reactive_get("b")');
    expect(result).not.toMatch(/\bnull\s+_scrml_reactive_get/);
  });

  test("§4.2 not @a || not @b — both operands respected", () => {
    const result = rewriteExpr("not @a || not @b");
    expect(result).toContain('!_scrml_reactive_get("a")');
    expect(result).toContain('!_scrml_reactive_get("b")');
    expect(result).not.toMatch(/\bnull\s+_scrml_reactive_get/);
  });

  test("§4.3 @healthRisk == Type.AtRisk && not @gameOver — full mario-style case", () => {
    // Use dot-form (Type.AtRisk) to keep this in rewriteExpr-only territory;
    // the acorn-via-:: branch is exercised in §9.
    const result = rewriteExpr("@healthRisk == Type.AtRisk && not @gameOver");
    expect(result).toContain('!_scrml_reactive_get("gameOver")');
    // No bare `null _scrml_reactive_get` adjacency.
    expect(result).not.toMatch(/\bnull\s+_scrml_reactive_get/);
  });
});

// ---------------------------------------------------------------------------
// §5: not (paren-expr) — pre-existing regression guard
// ---------------------------------------------------------------------------

describe("§5 — not (paren-expr) regression guard", () => {
  test("§5.1 not (x === null) still maps to !(x === null)", () => {
    const result = rewriteExpr("not (x === null)");
    expect(result).toContain("!(");
    expect(result).not.toMatch(/null\s*\(/);
  });

  test("§5.2 not (@a == @b) lowers correctly", () => {
    const result = rewriteExpr("not (@a == @b)");
    expect(result).toContain("!(");
    expect(result).toContain('_scrml_reactive_get("a")');
    expect(result).toContain('_scrml_reactive_get("b")');
  });
});

// ---------------------------------------------------------------------------
// §6: VALUE-FORM regression — value-form `not` must still lower to `null`
// ---------------------------------------------------------------------------

describe("§6 — value-form regression (§42)", () => {
  test("§6.1 standalone `not` still rewrites to `null`", () => {
    expect(rewriteNotKeyword("not")).toBe("null");
  });

  test("§6.2 `@x = not` — `not` at end of expression stays as null literal", () => {
    const result = rewriteNotKeyword("@x = not");
    expect(result).toBe("@x = null");
  });

  test("§6.3 `return not` — `not` after return stays as null literal", () => {
    const result = rewriteNotKeyword("return not");
    expect(result).toBe("return null");
  });

  test("§6.4 `f(not)` — `not` as function arg stays as null literal", () => {
    const result = rewriteNotKeyword("f(not)");
    expect(result).toBe("f(null)");
  });

  test("§6.5 `[not]` — `not` in array literal stays as null literal", () => {
    const result = rewriteNotKeyword("[not]");
    expect(result).toBe("[null]");
  });

  test("§6.6 `not,` — `not` followed by comma stays as null literal", () => {
    const result = rewriteNotKeyword("[a, not, b]");
    expect(result).toContain("null");
    // The `not` is in value position (preceded by `, ` and followed by `,`).
    expect(result).toBe("[a, null, b]");
  });
});

// ---------------------------------------------------------------------------
// §7: Member access — not @user.profile.active
// ---------------------------------------------------------------------------

describe("§7 — member access operand", () => {
  test("§7.1 not @user.profile.active lowers to !@user.profile.active (pre reactive rewrite)", () => {
    const result = rewriteNotKeyword("not @user.profile.active");
    expect(result).toBe("!@user.profile.active");
  });

  test("§7.2 not obj.prop lowers to !obj.prop", () => {
    const result = rewriteNotKeyword("not obj.prop");
    expect(result).toBe("!obj.prop");
  });
});

// ---------------------------------------------------------------------------
// §8: Function-call operand — not f(x) → !f(x)
// ---------------------------------------------------------------------------

describe("§8 — function-call operand", () => {
  test("§8.1 not f(x) — `not f` consumed; call binds tighter so `!f(x)` semantically correct", () => {
    const result = rewriteNotKeyword("not f(x)");
    // Conservative: regex consumes only `not f`; `(x)` follows naturally.
    // `!f(x)` parses in JS as `!(f(x))` because call > unary precedence.
    expect(result).toBe("!f(x)");
  });

  test("§8.2 not @x.method() — `not @x.method` consumed; call binds tighter", () => {
    const result = rewriteNotKeyword("not @x.method()");
    expect(result).toBe("!@x.method()");
  });
});

// ---------------------------------------------------------------------------
// §9: AST path — paren-form if=(...) end-to-end via emitExprField
// ---------------------------------------------------------------------------
//
// The expressions below cover the parseExprToNode + emitExpr path. The bug case in
// 14-mario-state-machine.scrml uses `if=(...)` which tokenizes as ATTR_EXPR carrying
// the paren-wrapped raw text. When the expression contains `::` (e.g. `HealthRisk::AtRisk`)
// acorn fails to parse and the path falls through to rewriteExpr — covered above.
// When the expression contains only standard JS-parseable bits (after scrml preprocessing),
// the AST path runs through emitExpr — the cases below.

describe("§9 — AST path (parseExprToNode + emitExprField)", () => {
  test("§9.1 parseExprToNode on `not @gameOver` produces a unary-not, not a stray lit", () => {
    const node = parseExprToNode("not @gameOver", "test.scrml", 0);
    // The fix must produce a unary expression whose operand is @gameOver,
    // NOT a partial parse that drops @gameOver.
    expect(node.kind).toBe("unary");
    expect(node.op).toBe("!");
    expect(node.argument).toBeDefined();
    expect(node.argument.kind).toBe("ident");
    expect(node.argument.name).toBe("@gameOver");
  });

  test("§9.2 emitExprField on `not @gameOver` emits !<reactive>", () => {
    const node = parseExprToNode("not @gameOver", "test.scrml", 0);
    const out = emitExprField(node, "not @gameOver", { mode: "client" });
    expect(out).toBe('!_scrml_reactive_get("gameOver")');
  });

  test("§9.3 emitExprField on `@a && not @b` keeps both operands", () => {
    const node = parseExprToNode("@a && not @b", "test.scrml", 0);
    const out = emitExprField(node, "@a && not @b", { mode: "client" });
    expect(out).toContain('_scrml_reactive_get("a")');
    expect(out).toContain('!_scrml_reactive_get("b")');
    expect(out).not.toMatch(/\bnull\s+_scrml_reactive_get/);
  });

  test("§9.4 paren-form `(not @gameOver)` — even via escape-hatch fallback — compiles cleanly", () => {
    // The parens trigger escape-hatch on this input (acorn can't parse `not @x` either).
    // The fallback rewriteExpr chain must still emit `(!_scrml_reactive_get("gameOver"))`.
    const node = parseExprToNode("(not @gameOver)", "test.scrml", 0);
    const out = emitExprField(node, "(not @gameOver)", { mode: "client" });
    expect(out).toContain('!_scrml_reactive_get("gameOver")');
    expect(out).not.toMatch(/\bnull\s+_scrml_reactive_get/);
  });
});
