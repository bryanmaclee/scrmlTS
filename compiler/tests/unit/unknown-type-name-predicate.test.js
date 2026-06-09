/**
 * §14.1.2 / E-TYPE-UNKNOWN-NAME — predicate-isolation unit tests.
 *
 * Exercises the two leaf-classification primitives in isolation:
 *   - isUnrecognizedTypeNameAtom(name, typeRegistry, importSpecifierNames)
 *   - forEachTypeNameLeaf(typeExpr, visit) — leaf extraction over raw type text
 *
 * These are the load-bearing predicate + leaf-walk; the end-to-end driver fires
 * (compile-path) live in unknown-type-forbidden.test.js.
 */

import { describe, test, expect } from "bun:test";
import {
  isUnrecognizedTypeNameAtom,
  forEachTypeNameLeaf,
  BUILTIN_TYPES,
} from "../../src/type-system.ts";

// A registry that mirrors buildTypeRegistry's seed (BUILTIN_TYPES) plus a couple
// of locally-declared names + a forward-ref placeholder.
function mkRegistry(extraNames = []) {
  const r = new Map(BUILTIN_TYPES);
  for (const n of extraNames) r.set(n, { kind: "unknown" }); // Pass-1 placeholder shape
  return r;
}

// Convenience: collect all leaf names yielded by forEachTypeNameLeaf.
function leaves(expr) {
  const out = [];
  forEachTypeNameLeaf(expr, (n) => out.push(n));
  return out;
}

// Convenience: does a type-expr yield ANY unrecognized leaf?
function exprHasUnknown(expr, registry, imports = new Set()) {
  let hit = false;
  forEachTypeNameLeaf(expr, (n) => {
    if (isUnrecognizedTypeNameAtom(n, registry, imports)) hit = true;
  });
  return hit;
}

describe("isUnrecognizedTypeNameAtom — leaf classifier", () => {
  const reg = mkRegistry(["Status", "LoadCardRow"]);
  const imports = new Set(["ImportedThing"]);

  test("Frobnicate (genuine unknown PascalCase) → true", () => {
    expect(isUnrecognizedTypeNameAtom("Frobnicate", reg, imports)).toBe(true);
  });

  test("asIs → false (sanctioned escape hatch)", () => {
    expect(isUnrecognizedTypeNameAtom("asIs", reg, imports)).toBe(false);
  });

  test("primitives string/number/int/integer/boolean/bool → false", () => {
    for (const p of ["string", "number", "int", "integer", "boolean", "bool"]) {
      expect(isUnrecognizedTypeNameAtom(p, reg, imports)).toBe(false);
    }
  });

  test("NAMED_SHAPES lowercase vocabulary email/url/uuid/phone/time/color → false (PascalCase gate)", () => {
    for (const s of ["email", "url", "uuid", "phone", "time", "color", "date"]) {
      expect(isUnrecognizedTypeNameAtom(s, reg, imports)).toBe(false);
    }
  });

  test("the 8 PascalCase built-in error/enum types → false", () => {
    for (const t of [
      "NetworkError", "ValidationError", "SQLError", "AuthError",
      "TimeoutError", "ParseError", "NotFoundError", "ConflictError",
    ]) {
      expect(isUnrecognizedTypeNameAtom(t, reg, imports)).toBe(false);
    }
  });

  test("same-file declared struct name (Status) → false (registry presence)", () => {
    expect(isUnrecognizedTypeNameAtom("Status", reg, imports)).toBe(false);
  });

  test("forward-ref placeholder (kind unknown but present) → false", () => {
    // buildTypeRegistry Pass-1 registers EVERY decl name as a tUnknown()
    // placeholder; presence (not kind) is the forward-ref-safe test.
    const fwd = mkRegistry(["Later"]); // Later present as unknown placeholder
    expect(isUnrecognizedTypeNameAtom("Later", fwd, imports)).toBe(false);
  });

  test("imported-specifier name → false (single-file-mode landmine guard)", () => {
    expect(isUnrecognizedTypeNameAtom("ImportedThing", reg, imports)).toBe(false);
  });

  test("not → false (absence type, lowercase)", () => {
    expect(isUnrecognizedTypeNameAtom("not", reg, imports)).toBe(false);
  });

  test("lowercase typo (frobnicate) → false (PascalCase gate; not a candidate)", () => {
    expect(isUnrecognizedTypeNameAtom("frobnicate", reg, imports)).toBe(false);
  });
});

describe("forEachTypeNameLeaf — leaf extraction over raw type text", () => {
  test("bare name → that name", () => {
    expect(leaves("Frobnicate")).toEqual(["Frobnicate"]);
  });

  test("trailing validator `Status req` → Status (leaf-strip)", () => {
    expect(leaves("Status req")).toEqual(["Status"]);
  });

  test("`string req length(>=2)` → string (leaf-strip discards validator)", () => {
    expect(leaves("string req length(>=2)")).toEqual(["string"]);
  });

  test("optional sugar `Status?` → Status", () => {
    expect(leaves("Status?")).toEqual(["Status"]);
  });

  test("linear prefix `lin string` → string", () => {
    expect(leaves("lin string")).toEqual(["string"]);
  });

  test("array `Frobnicate[]` → Frobnicate", () => {
    expect(leaves("Frobnicate[]")).toEqual(["Frobnicate"]);
  });

  test("union `Status | Frobnicate | not` → Status, Frobnicate, not", () => {
    expect(leaves("Status | Frobnicate | not")).toEqual(["Status", "Frobnicate", "not"]);
  });

  test("map `[string: Frobnicate]` → string, Frobnicate", () => {
    expect(leaves("[string: Frobnicate]")).toEqual(["string", "Frobnicate"]);
  });

  test("ordered map `[string: Widget] @ordered` → string, Widget", () => {
    expect(leaves("[string: Widget] @ordered")).toEqual(["string", "Widget"]);
  });

  test("inline struct `{ a: Frobnicate, b: string }` → Frobnicate, string (field NAMES not yielded)", () => {
    expect(leaves("{ a: Frobnicate, b: string }")).toEqual(["Frobnicate", "string"]);
  });

  test("nested inline-struct array `{ a: Widget }[]` → Widget", () => {
    expect(leaves("{ a: Widget }[]")).toEqual(["Widget"]);
  });

  test("enum-subset `Status oneOf([.Active, .Done])` → Status only (variant-literal args carved out)", () => {
    expect(leaves("Status oneOf([.Active, .Done])")).toEqual(["Status"]);
  });

  test("enum-subset `Status notIn([.Done])` → Status only", () => {
    expect(leaves("Status notIn([.Done])")).toEqual(["Status"]);
  });

  test("inline predicate `number(>0)` → no leaf (primitive base + predicate region carved)", () => {
    expect(leaves("number(>0)")).toEqual([]);
  });

  test("function type `() -> void` → no leaf (E-STRUCT-FUNCTION-FIELD owns it)", () => {
    expect(leaves("() -> void")).toEqual([]);
  });

  test("function type `fn(x: Frobnicate)` → no leaf (function shape carved)", () => {
    expect(leaves("fn(x: Frobnicate)")).toEqual([]);
  });

  test("negation `!not` → no leaf", () => {
    expect(leaves("!not")).toEqual([]);
  });

  test("lifecycle `(not to string)` → string (post-type)", () => {
    expect(leaves("(not to string)")).toEqual(["string"]);
  });

  test("lifecycle `(Idle to Frobnicate)` → Frobnicate (post-type, the unknown side)", () => {
    expect(leaves("(Idle to Frobnicate)")).toEqual(["Frobnicate"]);
  });

  test("snippet param `snippet(x: Frobnicate)` → Frobnicate", () => {
    expect(leaves("snippet(x: Frobnicate)")).toEqual(["Frobnicate"]);
  });

  test("bare `snippet` → no leaf", () => {
    expect(leaves("snippet")).toEqual([]);
  });

  test("`.Admin` variant-literal leaf → no leading-[A-Za-z] match → no leaf", () => {
    expect(leaves(".Admin")).toEqual([]);
  });
});

describe("combined — exprHasUnknown end-to-leaf", () => {
  const reg = mkRegistry(["Status"]);

  test("`Status req` does NOT report unknown (declared)", () => {
    expect(exprHasUnknown("Status req", reg)).toBe(false);
  });

  test("`Frobnicate req` reports unknown", () => {
    expect(exprHasUnknown("Frobnicate req", reg)).toBe(true);
  });

  test("`lin string` does NOT report unknown", () => {
    expect(exprHasUnknown("lin string", reg)).toBe(false);
  });

  test("`email` does NOT report unknown (PascalCase gate)", () => {
    expect(exprHasUnknown("email", reg)).toBe(false);
  });

  test("`Status | Frobnicate` reports unknown (one bad member)", () => {
    expect(exprHasUnknown("Status | Frobnicate", reg)).toBe(true);
  });

  test("imported name exempt via importSpecifierNames", () => {
    expect(exprHasUnknown("LoadCardRow[]", reg, new Set(["LoadCardRow"]))).toBe(false);
    expect(exprHasUnknown("LoadCardRow[]", reg, new Set())).toBe(true);
  });
});
