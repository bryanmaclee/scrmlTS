/**
 * Type Encoding — Unit Tests
 *
 * Tests for src/codegen/type-encoding.ts (Phase 1 of ADR-001).
 *
 * Coverage:
 *   §1  normalizeType — each type kind produces correct canonical string
 *   §2  normalizeType — struct fields sorted alphabetically
 *   §3  normalizeType — union members sorted by canonical form
 *   §4  normalizeType — recursive types use &Name reference
 *   §5  normalizeType — nested types normalize recursively
 *   §6  fnv1aHash — empty string produces deterministic output
 *   §7  fnv1aHash — same input always produces same output
 *   §8  fnv1aHash — different inputs produce different outputs
 *   §9  fnv1aHash — output is always 8 chars, base36
 *   §10 encodeTypeName — each kind produces correct prefix letter
 *   §11 encodeTypeName — seq 0-9 and 10-35 produce correct chars
 *   §12 encodeTypeName — full encoded name is valid JS identifier
 *   §13 encodeTypeName — two different types produce different names
 *   §14 encodeTypeNameDebug — includes $ separator and original name
 *   §15 encodeTypeNameDebug — output is valid JS identifier
 *   §16 decodeKind — each prefix letter decodes to correct kind
 *   §17 decodeKind — non-encoded names return null
 *   §18 decodeKind — edge cases (empty string, no prefix)
 *   §19 CollisionChecker — no collision for distinct types
 *   §20 CollisionChecker — collision detected for same prefix different types
 *   §21 CollisionChecker — reset clears state
 */

import { describe, test, expect } from "bun:test";
import {
  normalizeType,
  fnv1aHash,
  encodeTypeName,
  encodeTypeNameDebug,
  decodeKind,
  CollisionChecker,
} from "../../src/codegen/type-encoding.ts";

// ---------------------------------------------------------------------------
// Helpers — type constructors
// ---------------------------------------------------------------------------

const prim = (name) => ({ kind: "primitive", name });
const struct = (name, fieldsObj) => ({
  kind: "struct",
  name,
  fields: new Map(Object.entries(fieldsObj)),
});
const enumT = (name, variantNames) => ({
  kind: "enum",
  name,
  variants: variantNames.map((n) => ({ name: n, payload: null })),
});
const arr = (element) => ({ kind: "array", element });
const union = (...members) => ({ kind: "union", members });
const stateT = (name) => ({ kind: "state", name });
const errorT = (name, fieldsObj) => ({
  kind: "error",
  name,
  fields: new Map(Object.entries(fieldsObj)),
});
const htmlEl = (tag) => ({ kind: "html-element", tag });
const fnT = (name, params, returnType) => ({
  kind: "function",
  name,
  params,
  returnType,
});
const metaSplice = (resultType) => ({ kind: "meta-splice", resultType });
const refBinding = (resolvedType) => ({ kind: "ref-binding", resolvedType });
const notT = () => ({ kind: "not" });
const asIsT = (constraint) => ({ kind: "asIs", constraint });
const cssClassT = () => ({ kind: "cssClass" });

// ---------------------------------------------------------------------------
// §1  normalizeType — each type kind
// ---------------------------------------------------------------------------

describe("normalizeType", () => {
  test("§1.1 primitive", () => {
    expect(normalizeType(prim("string"))).toBe("p:string");
    expect(normalizeType(prim("number"))).toBe("p:number");
    expect(normalizeType(prim("bool"))).toBe("p:bool");
  });

  test("§1.2 struct", () => {
    const t = struct("User", { name: prim("string"), age: prim("number") });
    expect(normalizeType(t)).toBe("s:User{age:p:number,name:p:string}");
  });

  test("§1.3 enum", () => {
    const t = enumT("Color", ["Red", "Green", "Blue"]);
    expect(normalizeType(t)).toBe("e:Color{Red,Green,Blue}");
  });

  test("§1.4 array", () => {
    expect(normalizeType(arr(prim("string")))).toBe("a:[p:string]");
  });

  test("§1.5 union", () => {
    const t = union(prim("string"), prim("number"));
    // members sorted: p:number < p:string
    expect(normalizeType(t)).toBe("u:(p:number|p:string)");
  });

  test("§1.6 state", () => {
    expect(normalizeType(stateT("Counter"))).toBe("t:Counter");
  });

  test("§1.7 error", () => {
    const t = errorT("NotFound", { code: prim("number"), msg: prim("string") });
    expect(normalizeType(t)).toBe("r:NotFound{code:p:number,msg:p:string}");
  });

  test("§1.8 html-element", () => {
    expect(normalizeType(htmlEl("div"))).toBe("h:div");
    expect(normalizeType(htmlEl("input"))).toBe("h:input");
  });

  test("§1.9 function", () => {
    const t = fnT("add", [], prim("number"));
    expect(normalizeType(t)).toBe("f:add():p:number");
  });

  test("§1.10 not", () => {
    expect(normalizeType(notT())).toBe("n:");
  });

  test("§1.11 asIs with constraint", () => {
    expect(normalizeType(asIsT(prim("string")))).toBe("x:p:string");
  });

  test("§1.12 asIs without constraint", () => {
    expect(normalizeType(asIsT(null))).toBe("x:");
  });

  test("§1.13 cssClass", () => {
    expect(normalizeType(cssClassT())).toBe("k:");
  });

  test("§1.14 meta-splice", () => {
    expect(normalizeType(metaSplice(prim("string")))).toBe("m:p:string");
  });

  test("§1.15 ref-binding", () => {
    expect(normalizeType(refBinding(prim("number")))).toBe("b:p:number");
  });

  // §2 struct fields sorted alphabetically
  test("§2 struct fields sorted alphabetically", () => {
    const t = struct("Point", {
      z: prim("number"),
      x: prim("number"),
      y: prim("number"),
    });
    expect(normalizeType(t)).toBe(
      "s:Point{x:p:number,y:p:number,z:p:number}"
    );
  });

  // §3 union members sorted by canonical form
  test("§3 union members sorted by canonical form", () => {
    // b:p:number < p:string
    const t = union(prim("string"), refBinding(prim("number")));
    const normalized = normalizeType(t);
    const members = normalized.slice(3, -1).split("|");
    // verify sorted
    expect(members).toEqual([...members].sort());
  });

  // §4 recursive types use &Name reference
  test("§4 recursive types use &Name reference", () => {
    const node = struct("Node", { value: prim("number") });
    // Create a self-referencing struct: Node { value: number, next: Node }
    node.fields.set("next", node);
    const result = normalizeType(node);
    expect(result).toBe("s:Node{next:&Node,value:p:number}");
  });

  // §5 nested types normalize recursively
  test("§5 nested types normalize recursively", () => {
    const inner = struct("Inner", { x: prim("number") });
    const outer = arr(inner);
    expect(normalizeType(outer)).toBe("a:[s:Inner{x:p:number}]");
  });

  test("§5.1 deeply nested union of arrays of structs", () => {
    const t = union(
      arr(struct("A", { f: prim("string") })),
      arr(struct("B", { g: prim("number") }))
    );
    const result = normalizeType(t);
    expect(result).toContain("a:[s:A{f:p:string}]");
    expect(result).toContain("a:[s:B{g:p:number}]");
    expect(result).toStartWith("u:(");
  });
});

// ---------------------------------------------------------------------------
// §6-§9  fnv1aHash
// ---------------------------------------------------------------------------

describe("fnv1aHash", () => {
  test("§6 empty string produces deterministic output", () => {
    const h1 = fnv1aHash("");
    const h2 = fnv1aHash("");
    expect(h1).toBe(h2);
    expect(h1.length).toBe(8);
  });

  test("§7 same input always produces same output", () => {
    const input = "s:User{age:p:number,name:p:string}";
    const results = Array.from({ length: 10 }, () => fnv1aHash(input));
    expect(new Set(results).size).toBe(1);
  });

  test("§8 different inputs produce different outputs", () => {
    const inputs = [
      "p:string",
      "p:number",
      "p:bool",
      "s:User{name:p:string}",
      "s:Post{title:p:string}",
      "e:Color{Red,Green,Blue}",
      "a:[p:string]",
      "a:[p:number]",
      "u:(p:number|p:string)",
      "t:Counter",
      "h:div",
      "f:add():p:number",
    ];
    const hashes = inputs.map((i) => fnv1aHash(i));
    // all distinct
    expect(new Set(hashes).size).toBe(inputs.length);
  });

  test("§9 output is always 8 chars, base36", () => {
    const inputs = ["", "hello", "a".repeat(1000), "p:string"];
    for (const input of inputs) {
      const h = fnv1aHash(input);
      expect(h.length).toBe(8);
      expect(/^[0-9a-z]{8}$/.test(h)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// §10-§13  encodeTypeName
// ---------------------------------------------------------------------------

describe("encodeTypeName", () => {
  test("§10 each kind produces correct prefix letter", () => {
    const cases = [
      [struct("A", {}), "s"],
      [enumT("B", ["X"]), "e"],
      [prim("string"), "p"],
      [arr(prim("number")), "a"],
      [union(prim("string")), "u"],
      [stateT("S"), "t"],
      [errorT("E", {}), "r"],
      [htmlEl("div"), "h"],
      [fnT("f", [], prim("string")), "f"],
      [metaSplice(prim("string")), "m"],
      [refBinding(prim("number")), "b"],
      [asIsT(null), "x"],
      [notT(), "n"],
      [cssClassT(), "k"],
    ];

    for (const [type, expectedKind] of cases) {
      const encoded = encodeTypeName(type, 0);
      // _<kind>...
      expect(encoded[1]).toBe(expectedKind);
    }
  });

  test("§11 seq 0-9 produce '0'-'9', seq 10-35 produce 'a'-'z'", () => {
    const t = prim("string");
    for (let i = 0; i <= 9; i++) {
      const encoded = encodeTypeName(t, i);
      expect(encoded[encoded.length - 1]).toBe(String(i));
    }
    for (let i = 10; i <= 35; i++) {
      const encoded = encodeTypeName(t, i);
      expect(encoded[encoded.length - 1]).toBe(i.toString(36));
    }
  });

  test("§12 full encoded name is valid JS identifier", () => {
    const types = [
      struct("User", { name: prim("string") }),
      enumT("Color", ["Red"]),
      prim("number"),
      arr(prim("string")),
    ];
    const jsIdentPattern = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    for (const t of types) {
      const encoded = encodeTypeName(t, 0);
      expect(jsIdentPattern.test(encoded)).toBe(true);
    }
  });

  test("§13 two different types produce different encoded names", () => {
    const a = encodeTypeName(prim("string"), 0);
    const b = encodeTypeName(prim("number"), 0);
    expect(a).not.toBe(b);
  });

  test("§13.1 same type different seq produces different names", () => {
    const a = encodeTypeName(prim("string"), 0);
    const b = encodeTypeName(prim("string"), 1);
    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// §14-§15  encodeTypeNameDebug
// ---------------------------------------------------------------------------

describe("encodeTypeNameDebug", () => {
  test("§14 includes $ separator and original name", () => {
    const encoded = encodeTypeNameDebug(prim("string"), 0, "myVar");
    expect(encoded).toContain("$");
    expect(encoded).toEndWith("$myVar");
  });

  test("§14.1 debug name contains all parts", () => {
    const encoded = encodeTypeNameDebug(
      struct("User", { name: prim("string") }),
      3,
      "currentUser"
    );
    expect(encoded).toStartWith("_s");
    expect(encoded).toContain("$currentUser");
    // seq is '3' right before the $
    const dollarIdx = encoded.indexOf("$");
    expect(encoded[dollarIdx - 1]).toBe("3");
  });

  test("§15 output is valid JS identifier", () => {
    const jsIdentPattern = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    const encoded = encodeTypeNameDebug(prim("number"), 5, "count");
    expect(jsIdentPattern.test(encoded)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// §16-§18  decodeKind
// ---------------------------------------------------------------------------

describe("decodeKind", () => {
  test("§16 each prefix letter decodes to correct kind", () => {
    const mapping = {
      s: "struct",
      e: "enum",
      p: "primitive",
      a: "array",
      u: "union",
      t: "state",
      r: "error",
      h: "html-element",
      f: "function",
      m: "meta-splice",
      b: "ref-binding",
      x: "asIs",
      n: "not",
      k: "cssClass",
    };

    for (const [marker, kind] of Object.entries(mapping)) {
      // Build a valid encoded name: _<marker><8 hash chars><seq>
      const encoded = `_${marker}00000000a`;
      expect(decodeKind(encoded)).toBe(kind);
    }
  });

  test("§16.1 round-trip: encode then decode", () => {
    const types = [
      [struct("X", {}), "struct"],
      [enumT("Y", ["A"]), "enum"],
      [prim("string"), "primitive"],
      [arr(prim("number")), "array"],
      [union(prim("string")), "union"],
      [stateT("S"), "state"],
      [errorT("E", {}), "error"],
      [htmlEl("div"), "html-element"],
      [fnT("f", [], prim("string")), "function"],
      [metaSplice(prim("string")), "meta-splice"],
      [refBinding(prim("number")), "ref-binding"],
      [asIsT(null), "asIs"],
      [notT(), "not"],
      [cssClassT(), "cssClass"],
    ];

    for (const [type, expectedKind] of types) {
      const encoded = encodeTypeName(type, 0);
      expect(decodeKind(encoded)).toBe(expectedKind);
    }
  });

  test("§17 non-encoded names return null", () => {
    expect(decodeKind("myVariable")).toBeNull();
    expect(decodeKind("user")).toBeNull();
    expect(decodeKind("_privateVar")).toBeNull();
    expect(decodeKind("$jquery")).toBeNull();
  });

  test("§18 edge cases", () => {
    expect(decodeKind("")).toBeNull();
    expect(decodeKind("_")).toBeNull();
    expect(decodeKind("_s")).toBeNull(); // too short
    expect(decodeKind("_s0000000")).toBeNull(); // only 7 hash chars
    expect(decodeKind("_z000000000")).toBeNull(); // invalid kind marker
  });
});

// ---------------------------------------------------------------------------
// §19-§21  CollisionChecker
// ---------------------------------------------------------------------------

describe("CollisionChecker", () => {
  test("§19 no collision for distinct types with distinct prefixes", () => {
    const checker = new CollisionChecker();
    const t1 = prim("string");
    const t2 = prim("number");
    const prefix1 = encodeTypeName(t1, 0).slice(0, 10); // _<kind><hash>
    const prefix2 = encodeTypeName(t2, 0).slice(0, 10);

    expect(() => checker.check(t1, prefix1)).not.toThrow();
    expect(() => checker.check(t2, prefix2)).not.toThrow();
  });

  test("§19.1 same type same prefix — no collision", () => {
    const checker = new CollisionChecker();
    const t = prim("string");
    const prefix = "_p" + fnv1aHash(normalizeType(t));
    expect(() => checker.check(t, prefix)).not.toThrow();
    // registering again with same type is fine
    expect(() => checker.check(t, prefix)).not.toThrow();
  });

  test("§20 collision detected for same prefix with different types", () => {
    const checker = new CollisionChecker();
    const t1 = prim("string");
    const t2 = prim("number");
    const fakePrefix = "_pCOLLIDED";

    checker.check(t1, fakePrefix);
    expect(() => checker.check(t2, fakePrefix)).toThrow(/collision/i);
  });

  test("§21 reset clears state", () => {
    const checker = new CollisionChecker();
    const t1 = prim("string");
    const t2 = prim("number");
    const fakePrefix = "_pCOLLIDED";

    checker.check(t1, fakePrefix);
    checker.reset();
    // After reset, registering a different type with same prefix is fine
    expect(() => checker.check(t2, fakePrefix)).not.toThrow();
  });
});
