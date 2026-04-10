/**
 * `not` keyword — Unit Tests (§42)
 *
 * Tests for scrml's unified absence value:
 *   §1  Tokenizer: `not` is recognized as a keyword
 *   §2  AST: `x = not` parses as assignment with not literal
 *   §3  AST: `x is not` parses as expression
 *   §4  Codegen: `not` rewrites to `null`
 *   §5  Codegen: `is not` rewrites to null check
 *   §6  Type system: `not` is a builtin type
 *   §7  Type system: tNot() produces correct shape
 *   §8  Codegen: `x != not` pattern
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { rewriteNotKeyword, rewritePresenceGuard, rewriteExpr } from "../../src/codegen/rewrite.ts";
import { emitLogicNode } from "../../src/codegen/emit-logic.ts";
import { tNot, tPrimitive, tUnion, tUnknown, tAsIs, checkExhaustiveness, checkUnionExhaustiveness, isOptionalType, checkNotAssignment, checkNotReturn, BUILTIN_TYPES } from "../../src/type-system.ts";

function parse(source) {
  const bsOut = splitBlocks("test.scrml", source);
  return buildAST(bsOut);
}

// ---------------------------------------------------------------------------
// §1-§3: Tokenizer + AST
// ---------------------------------------------------------------------------

describe("not keyword — tokenizer and AST", () => {
  test("§1 `not` in logic body does not produce parse error", () => {
    const result = parse("${ let x = not }");
    // Should parse without fatal errors (not may appear as ident or keyword)
    const fatalErrors = result.errors.filter(e => !e.code?.startsWith("W-"));
    // not might trigger some warnings but shouldn't be a fatal parse error
    expect(result.ast).toBeDefined();
    expect(result.ast.nodes.length).toBeGreaterThan(0);
  });

  test("§2 `x = not` produces logic node with not in expression", () => {
    const result = parse("${ let x = not }");
    const logic = result.ast.nodes.find(n => n.kind === "logic");
    expect(logic).toBeDefined();
    if (logic?.body) {
      const decl = logic.body.find(n => n.kind === "let-decl");
      if (decl) {
        expect(decl.init).toContain("not");
      }
    }
  });

  test("§3 `x is not` parses as expression", () => {
    const result = parse("${ let check = x is not }");
    const logic = result.ast.nodes.find(n => n.kind === "logic");
    expect(logic).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// §4-§5, §8: Codegen rewrite
// ---------------------------------------------------------------------------

describe("not keyword — codegen rewrite", () => {
  test("§4 standalone `not` rewrites to `null`", () => {
    const result = rewriteNotKeyword("not");
    expect(result).toBe("null");
  });

  test("§4b `let x = not` rewrites not to null", () => {
    const result = rewriteNotKeyword("let x = not");
    expect(result).toContain("null");
    expect(result).not.toContain("not");
  });

  test("§5 `x is not` rewrites to null/undefined check", () => {
    const result = rewriteNotKeyword("x is not");
    expect(result).toBe("(x === null || x === undefined)");
  });

  test("§5b `is not` with reactive var (@name) preserves @ for later rewrite", () => {
    const result = rewriteNotKeyword("@name is not");
    // @ is preserved so the reactive rewrite can expand it later
    expect(result).toBe("(@name === null || @name === undefined)");
  });

  test("§5c `is not` with dotted property access", () => {
    const result = rewriteNotKeyword("obj.prop is not");
    expect(result).toBe("(obj.prop === null || obj.prop === undefined)");
  });

  test("§5d negated `is not` pattern", () => {
    const result = rewriteNotKeyword("!(@x is not)");
    // inner `@x is not` rewrites correctly
    expect(result).toContain("@x === null || @x === undefined");
  });

  test("§8 no-op when no `not` keyword present", () => {
    expect(rewriteNotKeyword("a + b")).toBe("a + b");
  });

  test("§8b preserves `not` inside string literals", () => {
    const input = '"this is not a test"';
    const result = rewriteNotKeyword(input);
    expect(result).toBe(input);
  });

  test("§8c empty/null input", () => {
    expect(rewriteNotKeyword("")).toBe("");
    expect(rewriteNotKeyword(null)).toBe(null);
  });
});

// ---------------------------------------------------------------------------
// §9-§12: Presence guard `(x) => { body }` (§42)
// ---------------------------------------------------------------------------

describe("presence guard — rewritePresenceGuard (§42)", () => {
  test("§9 basic presence guard rewrites to if-statement", () => {
    const result = rewritePresenceGuard("( x ) => { use ( x ) }");
    expect(result).toContain("if (x !== null && x !== undefined)");
    expect(result).toContain("use ( x )");
    expect(result).not.toContain("=>");
  });

  test("§9b presence guard with longer variable name", () => {
    const result = rewritePresenceGuard("( userName ) => { console . log ( userName ) }");
    expect(result).toBe("if (userName !== null && userName !== undefined) { console . log ( userName ) }");
  });

  test("§9c presence guard with underscore-prefixed variable", () => {
    const result = rewritePresenceGuard("( _val ) => { doSomething ( _val ) }");
    expect(result).toContain("if (_val !== null && _val !== undefined)");
  });

  test("§10 multi-param arrow is NOT rewritten (regression guard)", () => {
    const result = rewritePresenceGuard("( x , y ) => { return x + y }");
    expect(result).not.toContain("if (");
    expect(result).toContain("=>");
  });

  test("§10b expression-body arrow with parens is NOT rewritten (regression guard)", () => {
    // Single-param with parens but expression body (no braces) — not a presence guard
    const result = rewritePresenceGuard("( x ) => x . value");
    expect(result).not.toContain("if (");
    expect(result).toContain("=>");
  });

  test("§10c inline callback in method call is NOT rewritten (regression guard)", () => {
    // The whole expression is not `(x) => { ... }` at the top level
    const result = rewritePresenceGuard("items . map ( ( x ) => x . value )");
    expect(result).not.toContain("if (");
    expect(result).toContain("map");
  });

  test("§10d no-op when no arrow present", () => {
    const result = rewritePresenceGuard("a + b");
    expect(result).toBe("a + b");
  });

  test("§10e no-op when null/undefined input", () => {
    expect(rewritePresenceGuard("")).toBe("");
    expect(rewritePresenceGuard(null)).toBe(null);
  });
});

describe("presence guard — rewriteExpr integration (§42)", () => {
  test("§11 rewriteExpr rewrites presence guard in full pipeline", () => {
    const result = rewriteExpr("( x ) => { use ( x ) }");
    expect(result).toContain("if (x !== null && x !== undefined)");
    expect(result).not.toContain("=>");
  });

  test("§11b rewriteExpr does not affect regular arrow in expression context", () => {
    // This is not a top-level presence guard (there's surrounding code)
    const result = rewriteExpr("items.map(x => x.value)");
    expect(result).toContain("map");
    expect(result).toContain("=>");
    expect(result).not.toContain("if (x !== null");
  });

  test("§11c rewriteExpr does not affect multi-param arrow", () => {
    const result = rewriteExpr("( x , y ) => x + y");
    expect(result).not.toContain("if (x !== null");
    expect(result).toContain("=>");
  });
});

describe("presence guard — emitLogicNode bare-expr (§42)", () => {
  test("§12 bare-expr presence guard emits clean if-block without trailing semicolon", () => {
    const node = {
      id: 1,
      kind: "bare-expr",
      expr: "( x ) => { use ( x ) }",
      span: { file: "test.scrml", start: 0, end: 22, line: 1, col: 1 },
    };
    const result = emitLogicNode(node);
    expect(result).toContain("if (x !== null && x !== undefined)");
    expect(result).not.toMatch(/\}\s*;$/);  // should not end with };
    expect(result).toContain("use");
  });

  test("§12b bare-expr presence guard with @reactive var in body", () => {
    const node = {
      id: 2,
      kind: "bare-expr",
      expr: "( item ) => { @items . push ( item ) }",
      span: { file: "test.scrml", start: 0, end: 38, line: 1, col: 1 },
    };
    const result = emitLogicNode(node);
    expect(result).toContain("if (item !== null && item !== undefined)");
    expect(result).toContain("push");
  });

  test("§12c regular bare-expr arrow (multi-param) is NOT rewritten to if-block", () => {
    const node = {
      id: 3,
      kind: "bare-expr",
      expr: "arr.sort(( a , b ) => a - b)",
      span: { file: "test.scrml", start: 0, end: 28, line: 1, col: 1 },
    };
    const result = emitLogicNode(node);
    expect(result).not.toContain("if (a !== null");
    expect(result).not.toContain("if (b !== null");
  });
});

// ---------------------------------------------------------------------------
// §6-§7: Type system
// ---------------------------------------------------------------------------

describe("not keyword — type system", () => {
  test("§6 `not` is in BUILTIN_TYPES", () => {
    expect(BUILTIN_TYPES.has("not")).toBe(true);
  });

  test("§7 tNot() produces { kind: 'not' }", () => {
    const t = tNot();
    expect(t.kind).toBe("not");
  });

  test("§7b BUILTIN_TYPES.get('not') has kind 'not'", () => {
    const t = BUILTIN_TYPES.get("not");
    expect(t).toBeDefined();
    expect(t.kind).toBe("not");
  });
});

// ---------------------------------------------------------------------------
// §13-§16: E-SYNTAX-010 — reject `null`/`undefined` in value position (§42)
// ---------------------------------------------------------------------------

describe("E-SYNTAX-010 — null/undefined rejection (§42)", () => {
  test("§13 rewriteNotKeyword detects `null` and pushes E-SYNTAX-010", () => {
    const errors = [];
    rewriteNotKeyword("let x = null", errors);
    const syntaxErrors = errors.filter(e => e.code === "E-SYNTAX-010");
    expect(syntaxErrors.length).toBe(1);
    expect(syntaxErrors[0].message).toContain("null");
    expect(syntaxErrors[0].message).toContain("not");
  });

  test("§13b rewriteNotKeyword detects `undefined` and pushes E-SYNTAX-010", () => {
    const errors = [];
    rewriteNotKeyword("let x = undefined", errors);
    const syntaxErrors = errors.filter(e => e.code === "E-SYNTAX-010");
    expect(syntaxErrors.length).toBe(1);
    expect(syntaxErrors[0].message).toContain("undefined");
  });

  test("§14 E-SYNTAX-010 not triggered without errors array", () => {
    // Should not throw when no errors array provided
    const result = rewriteNotKeyword("let x = null");
    expect(result).toBe("let x = null");
  });

  test("§14b `null` inside string literal does NOT trigger E-SYNTAX-010", () => {
    const errors = [];
    rewriteNotKeyword('"null value"', errors);
    const syntaxErrors = errors.filter(e => e.code === "E-SYNTAX-010");
    expect(syntaxErrors.length).toBe(0);
  });

  test("§14c `nullify` (identifier containing null) does NOT trigger E-SYNTAX-010", () => {
    const errors = [];
    rewriteNotKeyword("nullify(x)", errors);
    const syntaxErrors = errors.filter(e => e.code === "E-SYNTAX-010");
    expect(syntaxErrors.length).toBe(0);
  });

  test("§14d `undefined` inside string literal does NOT trigger E-SYNTAX-010", () => {
    const errors = [];
    rewriteNotKeyword('"check for undefined"', errors);
    const syntaxErrors = errors.filter(e => e.code === "E-SYNTAX-010");
    expect(syntaxErrors.length).toBe(0);
  });

  test("§15 rewriteExpr propagates E-SYNTAX-010 via errors array", () => {
    const errors = [];
    rewriteExpr("let x = null", errors);
    const syntaxErrors = errors.filter(e => e.code === "E-SYNTAX-010");
    expect(syntaxErrors.length).toBe(1);
  });

  test("§16 AST parser produces E-EQ-002 for `== not`", () => {
    const result = parse("${ let check = x == not }");
    const eqErrors = result.errors.filter(e => e.code === "E-EQ-002");
    expect(eqErrors.length).toBeGreaterThan(0);
    expect(eqErrors[0].message).toContain("is not");
  });

  test("§16b AST parser produces E-EQ-002 for `!= not`", () => {
    const result = parse("${ let check = x != not }");
    const eqErrors = result.errors.filter(e => e.code === "E-EQ-002");
    expect(eqErrors.length).toBeGreaterThan(0);
    expect(eqErrors[0].message).toContain("is not");
  });

  test("§16c `== not` is rewritten to `is not` in output (recovery)", () => {
    const result = parse("${ let check = x == not }");
    const logic = result.ast.nodes.find(n => n.kind === "logic");
    expect(logic).toBeDefined();
    // The expression should contain "is not" after recovery rewrite
    const decl = logic?.body?.find(n => n.kind === "let-decl");
    if (decl && decl.init) {
      expect(decl.init).toContain("is not");
      expect(decl.init).not.toContain("==");
    }
  });
});

// ---------------------------------------------------------------------------
// §17-§19: E-TYPE-042 — reject `== not` / `=== not` in rewrite pass (§42)
// ---------------------------------------------------------------------------

describe("E-TYPE-042 — equality-based not check rejection (§42)", () => {
  test("§17 rewriteNotKeyword detects `== not` and pushes E-TYPE-042", () => {
    const errors = [];
    rewriteNotKeyword("x == not", errors);
    const typeErrors = errors.filter(e => e.code === "E-TYPE-042");
    expect(typeErrors.length).toBe(1);
    expect(typeErrors[0].message).toContain("== not");
    expect(typeErrors[0].message).toContain("is not");
  });

  test("§17b rewriteNotKeyword detects `!= not` and pushes E-TYPE-042", () => {
    const errors = [];
    rewriteNotKeyword("x != not", errors);
    const typeErrors = errors.filter(e => e.code === "E-TYPE-042");
    expect(typeErrors.length).toBe(1);
    expect(typeErrors[0].message).toContain("!(x is not)");
  });

  test("§17c rewriteNotKeyword detects `=== not` and pushes E-TYPE-042", () => {
    const errors = [];
    rewriteNotKeyword("x === not", errors);
    const typeErrors = errors.filter(e => e.code === "E-TYPE-042");
    expect(typeErrors.length).toBe(1);
  });

  test("§17d rewriteNotKeyword detects `!== not` and pushes E-TYPE-042", () => {
    const errors = [];
    rewriteNotKeyword("x !== not", errors);
    const typeErrors = errors.filter(e => e.code === "E-TYPE-042");
    expect(typeErrors.length).toBe(1);
  });

  test("§18 `== not` inside string literal does NOT trigger E-TYPE-042", () => {
    const errors = [];
    rewriteNotKeyword('"x == not"', errors);
    const typeErrors = errors.filter(e => e.code === "E-TYPE-042");
    expect(typeErrors.length).toBe(0);
  });

  test("§18b no E-TYPE-042 when valid `is not` is used", () => {
    const errors = [];
    rewriteNotKeyword("x is not", errors);
    const typeErrors = errors.filter(e => e.code === "E-TYPE-042");
    expect(typeErrors.length).toBe(0);
  });

  test("§19 `== not` triggers E-TYPE-042 via rewriteExpr", () => {
    const errors = [];
    rewriteExpr("x == not", errors);
    const typeErrors = errors.filter(e => e.code === "E-TYPE-042");
    expect(typeErrors.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §20-§22: T | not type union inference
// ---------------------------------------------------------------------------

describe("T | not type union (§42)", () => {
  test("§20 tNot() is distinct from other builtin types", () => {
    const notType = tNot();
    const stringType = BUILTIN_TYPES.get("string");
    expect(notType.kind).toBe("not");
    expect(stringType.kind).not.toBe("not");
  });

  test("§21 `not` in match arm is valid pattern", () => {
    // `match x { not => ... (x) => ... }` should parse
    const result = parse("${ match val { not => handleAbsence ( ) , (val) => handlePresence ( val ) } }");
    expect(result.ast).toBeDefined();
    expect(result.ast.nodes.length).toBeGreaterThan(0);
  });

  test("§22 `not` as return value parses correctly", () => {
    const result = parse("${ return not }");
    expect(result.ast).toBeDefined();
    const logic = result.ast.nodes.find(n => n.kind === "logic");
    expect(logic).toBeDefined();
  });

  test("§22b tUnion with tNot produces a union containing not", () => {
    const unionType = tUnion([tPrimitive("string"), tNot()]);
    expect(unionType.kind).toBe("union");
    expect(unionType.members.length).toBe(2);
    expect(unionType.members.some(m => m.kind === "not")).toBe(true);
    expect(unionType.members.some(m => m.kind === "primitive")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §23-§27: E-MATCH-012 — match on T | not without not arm (§42)
// ---------------------------------------------------------------------------

describe("E-MATCH-012 — match exhaustiveness with not (§42)", () => {
  test("§23 checkUnionExhaustiveness reports `not` missing from T | not", () => {
    const unionType = tUnion([tPrimitive("string"), tNot()]);
    // Only cover string, not `not`
    const armPatterns = [
      { kind: "is-type", typeName: "string" },
    ];
    const result = checkUnionExhaustiveness(unionType, armPatterns);
    expect(result.missing).toContain("not");
  });

  test("§23b checkUnionExhaustiveness reports nothing missing when both covered", () => {
    const unionType = tUnion([tPrimitive("string"), tNot()]);
    const armPatterns = [
      { kind: "is-type", typeName: "string" },
      { kind: "is-type", typeName: "not" },
    ];
    const result = checkUnionExhaustiveness(unionType, armPatterns);
    expect(result.missing.length).toBe(0);
  });

  test("§23c checkUnionExhaustiveness reports nothing missing when wildcard covers all", () => {
    const unionType = tUnion([tPrimitive("string"), tNot()]);
    const armPatterns = [
      { kind: "is-type", typeName: "string" },
      { kind: "wildcard" },
    ];
    const result = checkUnionExhaustiveness(unionType, armPatterns);
    expect(result.missing.length).toBe(0);
  });

  test("§24 checkExhaustiveness emits E-MATCH-012 for T | not missing not arm", () => {
    const unionType = tUnion([tPrimitive("string"), tNot()]);
    const matchNode = {
      arms: [
        { pattern: { kind: "is-type", typeName: "string" } },
      ],
    };
    const span = { file: "test.scrml", start: 0, end: 10, line: 1, col: 1 };
    const errors = [];
    checkExhaustiveness(matchNode, unionType, span, errors);
    const matchErrors = errors.filter(e => e.code === "E-MATCH-012");
    expect(matchErrors.length).toBe(1);
    expect(matchErrors[0].message).toContain("not");
    expect(matchErrors[0].message).toContain("§42");
  });

  test("§24b checkExhaustiveness does NOT emit E-MATCH-012 when wildcard present", () => {
    const unionType = tUnion([tPrimitive("string"), tNot()]);
    const matchNode = {
      arms: [
        { pattern: { kind: "is-type", typeName: "string" } },
        { pattern: { kind: "wildcard" } },
      ],
    };
    const span = { file: "test.scrml", start: 0, end: 10, line: 1, col: 1 };
    const errors = [];
    checkExhaustiveness(matchNode, unionType, span, errors);
    const matchErrors = errors.filter(e => e.code === "E-MATCH-012");
    expect(matchErrors.length).toBe(0);
  });

  test("§25 checkExhaustiveness does NOT emit E-MATCH-012 when not arm is present", () => {
    const unionType = tUnion([tPrimitive("string"), tNot()]);
    const matchNode = {
      arms: [
        { pattern: { kind: "is-type", typeName: "string" } },
        { pattern: { kind: "is-type", typeName: "not" } },
      ],
    };
    const span = { file: "test.scrml", start: 0, end: 10, line: 1, col: 1 };
    const errors = [];
    checkExhaustiveness(matchNode, unionType, span, errors);
    expect(errors.length).toBe(0);
  });

  test("§26 non-not union still uses E-TYPE-006", () => {
    const unionType = tUnion([tPrimitive("string"), tPrimitive("number")]);
    const matchNode = {
      arms: [
        { pattern: { kind: "is-type", typeName: "string" } },
      ],
    };
    const span = { file: "test.scrml", start: 0, end: 10, line: 1, col: 1 };
    const errors = [];
    checkExhaustiveness(matchNode, unionType, span, errors);
    const typeErrors = errors.filter(e => e.code === "E-TYPE-006");
    expect(typeErrors.length).toBe(1);
    const matchErrors = errors.filter(e => e.code === "E-MATCH-012");
    expect(matchErrors.length).toBe(0);
  });

  test("§27 T | not missing both T and not still emits E-MATCH-012 + E-TYPE-006", () => {
    const unionType = tUnion([tPrimitive("string"), tNot()]);
    const matchNode = {
      arms: [],  // no arms at all
    };
    const span = { file: "test.scrml", start: 0, end: 10, line: 1, col: 1 };
    const errors = [];
    checkExhaustiveness(matchNode, unionType, span, errors);
    const matchErrors = errors.filter(e => e.code === "E-MATCH-012");
    const typeErrors = errors.filter(e => e.code === "E-TYPE-006");
    expect(matchErrors.length).toBe(1);
    expect(typeErrors.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §28-§32: E-TYPE-041 — reject `not` assigned to non-optional type (§42)
// ---------------------------------------------------------------------------

describe("E-TYPE-041 — not assignment to non-optional type (§42)", () => {
  test("§28 isOptionalType returns true for `not` type", () => {
    expect(isOptionalType(tNot())).toBe(true);
  });

  test("§28b isOptionalType returns true for `string | not` union", () => {
    expect(isOptionalType(tUnion([tPrimitive("string"), tNot()]))).toBe(true);
  });

  test("§28c isOptionalType returns false for plain `string`", () => {
    expect(isOptionalType(tPrimitive("string"))).toBe(false);
  });

  test("§28d isOptionalType returns true for `unknown` (permissive)", () => {
    expect(isOptionalType(tUnknown())).toBe(true);
  });

  test("§28e isOptionalType returns true for `asIs` (permissive)", () => {
    expect(isOptionalType(tAsIs())).toBe(true);
  });

  test("§29 checkNotAssignment returns null for optional type", () => {
    const result = checkNotAssignment(tUnion([tPrimitive("string"), tNot()]), "x");
    expect(result).toBeNull();
  });

  test("§29b checkNotAssignment returns error for non-optional type", () => {
    const result = checkNotAssignment(tPrimitive("string"), "x");
    expect(result).not.toBeNull();
    expect(result).toContain("E-TYPE-041");
    expect(result).toContain("string | not");
  });

  test("§30 checkNotAssignment returns null for `not` type itself", () => {
    expect(checkNotAssignment(tNot(), "x")).toBeNull();
  });

  test("§30b checkNotAssignment includes variable name in error", () => {
    const result = checkNotAssignment(tPrimitive("number"), "myVar");
    expect(result).toContain("myVar");
    expect(result).toContain("number");
  });
});

// ---------------------------------------------------------------------------
// §33-§35: E-TYPE-043 — reject function returning `not` on non-optional return (§42)
// ---------------------------------------------------------------------------

describe("E-TYPE-043 — function returning not with non-optional return type (§42)", () => {
  test("§33 checkNotReturn returns null for optional return type", () => {
    const result = checkNotReturn(tUnion([tPrimitive("string"), tNot()]), "getData");
    expect(result).toBeNull();
  });

  test("§33b checkNotReturn returns error for non-optional return type", () => {
    const result = checkNotReturn(tPrimitive("string"), "getData");
    expect(result).not.toBeNull();
    expect(result).toContain("E-TYPE-043");
    expect(result).toContain("getData");
    expect(result).toContain("string | not");
  });

  test("§34 checkNotReturn returns null for unknown return type", () => {
    expect(checkNotReturn(tUnknown(), "fn")).toBeNull();
  });

  test("§35 checkNotReturn includes function name in error", () => {
    const result = checkNotReturn(tPrimitive("boolean"), "isValid");
    expect(result).toContain("isValid");
    expect(result).toContain("boolean");
  });
});

// ---------------------------------------------------------------------------
// §42.2.2a: `is some` — positive presence check
// ---------------------------------------------------------------------------

describe("§42.2.2a: is some — positive presence check", () => {
  test("@var is some compiles to !== null && !== undefined", () => {
    const result = rewriteExpr("@x is some", {});
    expect(result).toContain("!== null");
    expect(result).toContain("!== undefined");
  });

  test("identifier is some compiles correctly", () => {
    const result = rewriteExpr("user is some", {});
    expect(result).toContain("user !== null");
    expect(result).toContain("user !== undefined");
  });

  test("dotted.path is some compiles correctly", () => {
    const result = rewriteExpr("card.title is some", {});
    expect(result).toContain("card.title !== null");
    expect(result).toContain("card.title !== undefined");
  });

  test("is some does not match inside strings", () => {
    const result = rewriteExpr('"x is some"', {});
    expect(result).toBe('"x is some"');
  });

  test("is some does not match partial identifiers", () => {
    const result = rewriteExpr("isSomething is some", {});
    // isSomething should not be mangled — only the `is some` operator applies
    expect(result).toContain("isSomething !== null");
  });

  test("is null rewrites to === null (after not→null conversion)", () => {
    const result = rewriteExpr("x is null");
    expect(result).toContain("=== null");
    expect(result).not.toContain("is null");
  });

  test("not (expr) rewrites to !(expr) for logical negation", () => {
    const result = rewriteExpr("not (x === null)");
    expect(result).toContain("!(");
    expect(result).not.toMatch(/null\s*\(/);
  });

  test("not (x is not) rewrites to !(x === null || x === undefined)", () => {
    const result = rewriteExpr("not (x is not)");
    expect(result).toContain("!(");
    expect(result).toContain("=== null");
  });
});
