/**
 * Type Encoding Phase 3 — Runtime Decode Table Tests
 *
 * Tests for the decode table generation and runtime reflect function:
 *   - emitDecodeTable() generates correct _scrml_decode_table declarations
 *   - toTypeDescriptor() converts ResolvedTypes to TypeDescriptors
 *   - emitRuntimeReflect() generates a valid reflect function
 *   - EncodingContext.getType() accessor works correctly
 *   - Deduplication of same-prefix entries
 *   - Integration: prefix consistency between decode table and decodeKind
 */

import { describe, test, expect } from "bun:test";
import {
  EncodingContext,
  toTypeDescriptor,
  emitDecodeTable,
  emitRuntimeReflect,
  decodeKind,
} from "../../src/codegen/type-encoding.ts";

// ---------------------------------------------------------------------------
// Test helpers — ResolvedType fixtures
// ---------------------------------------------------------------------------

const STRING_TYPE = { kind: "primitive", name: "string" };
const NUMBER_TYPE = { kind: "primitive", name: "number" };
const BOOL_TYPE = { kind: "primitive", name: "boolean" };

const USER_STRUCT = {
  kind: "struct",
  name: "User",
  fields: new Map([
    ["name", { kind: "primitive", name: "string" }],
    ["age", { kind: "primitive", name: "number" }],
  ]),
};

const STATUS_ENUM = {
  kind: "enum",
  name: "Status",
  variants: [
    { name: "Active", payload: null },
    { name: "Inactive", payload: null },
  ],
};

const STRING_ARRAY = { kind: "array", element: { kind: "primitive", name: "string" } };

const UNION_TYPE = {
  kind: "union",
  members: [
    { kind: "primitive", name: "string" },
    { kind: "primitive", name: "number" },
  ],
};

const FUNC_TYPE = {
  kind: "function",
  name: "greet",
  params: [{ type: { kind: "primitive", name: "string" } }],
  returnType: { kind: "primitive", name: "number" },
};

// ---------------------------------------------------------------------------
// §1 emitDecodeTable — basic cases
// ---------------------------------------------------------------------------

describe("emitDecodeTable", () => {
  test("empty context returns empty table", () => {
    const ctx = new EncodingContext({ enabled: true });
    const result = emitDecodeTable(ctx);
    expect(result).toBe("const _scrml_decode_table = {};");
  });

  test("disabled context returns empty table", () => {
    const ctx = new EncodingContext({ enabled: false });
    ctx.register("x", STRING_TYPE);
    const result = emitDecodeTable(ctx);
    expect(result).toBe("const _scrml_decode_table = {};");
  });

  test("one registered primitive produces correct table entry", () => {
    const ctx = new EncodingContext({ enabled: true });
    ctx.register("name", STRING_TYPE);
    const result = emitDecodeTable(ctx);

    expect(result).toContain("_scrml_decode_table");
    expect(result).toContain('"kind":"string"');
    expect(result).not.toBe("const _scrml_decode_table = {};");
  });

  test("one registered struct produces correct TypeDescriptor with fields", () => {
    const ctx = new EncodingContext({ enabled: true });
    ctx.register("user", USER_STRUCT);
    const result = emitDecodeTable(ctx);

    expect(result).toContain('"kind":"struct"');
    expect(result).toContain('"name":"User"');
    expect(result).toContain('"fields"');
    // Fields should be sorted alphabetically: age before name
    const parsed = evalDecodeTable(result);
    const prefix = Object.keys(parsed)[0];
    expect(parsed[prefix].kind).toBe("struct");
    expect(parsed[prefix].name).toBe("User");
    expect(parsed[prefix].fields).toHaveLength(2);
    expect(parsed[prefix].fields[0].name).toBe("age");
    expect(parsed[prefix].fields[1].name).toBe("name");
  });

  test("one registered enum produces correct TypeDescriptor with variants", () => {
    const ctx = new EncodingContext({ enabled: true });
    ctx.register("status", STATUS_ENUM);
    const result = emitDecodeTable(ctx);

    const parsed = evalDecodeTable(result);
    const prefix = Object.keys(parsed)[0];
    expect(parsed[prefix].kind).toBe("enum");
    expect(parsed[prefix].name).toBe("Status");
    expect(parsed[prefix].variants).toHaveLength(2);
    expect(parsed[prefix].variants[0].name).toBe("Active");
    expect(parsed[prefix].variants[1].name).toBe("Inactive");
  });

  test("two bindings of the same type produce ONE table entry (dedup)", () => {
    const ctx = new EncodingContext({ enabled: true });
    ctx.register("a", STRING_TYPE);
    ctx.register("b", STRING_TYPE);
    const result = emitDecodeTable(ctx);

    const parsed = evalDecodeTable(result);
    const keys = Object.keys(parsed);
    expect(keys).toHaveLength(1);
  });

  test("multiple different types produce multiple entries", () => {
    const ctx = new EncodingContext({ enabled: true });
    ctx.register("name", STRING_TYPE);
    ctx.register("user", USER_STRUCT);
    ctx.register("status", STATUS_ENUM);
    const result = emitDecodeTable(ctx);

    const parsed = evalDecodeTable(result);
    const keys = Object.keys(parsed);
    expect(keys).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// §2 toTypeDescriptor — various type kinds
// ---------------------------------------------------------------------------

describe("toTypeDescriptor", () => {
  test("primitive type", () => {
    const desc = toTypeDescriptor(STRING_TYPE);
    expect(desc).toEqual({ kind: "string" });
  });

  test("number primitive type", () => {
    const desc = toTypeDescriptor(NUMBER_TYPE);
    expect(desc).toEqual({ kind: "number" });
  });

  test("struct type with sorted fields", () => {
    const desc = toTypeDescriptor(USER_STRUCT);
    expect(desc.kind).toBe("struct");
    expect(desc.name).toBe("User");
    expect(desc.fields).toHaveLength(2);
    expect(desc.fields[0].name).toBe("age");
    expect(desc.fields[0].type).toEqual({ kind: "number" });
    expect(desc.fields[1].name).toBe("name");
    expect(desc.fields[1].type).toEqual({ kind: "string" });
  });

  test("enum type with variants", () => {
    const desc = toTypeDescriptor(STATUS_ENUM);
    expect(desc.kind).toBe("enum");
    expect(desc.name).toBe("Status");
    expect(desc.variants).toEqual([{ name: "Active" }, { name: "Inactive" }]);
  });

  test("array type includes element", () => {
    const desc = toTypeDescriptor(STRING_ARRAY);
    expect(desc.kind).toBe("array");
    expect(desc.element).toEqual({ kind: "string" });
  });

  test("union type includes members", () => {
    const desc = toTypeDescriptor(UNION_TYPE);
    expect(desc.kind).toBe("union");
    expect(desc.members).toHaveLength(2);
    expect(desc.members[0]).toEqual({ kind: "string" });
    expect(desc.members[1]).toEqual({ kind: "number" });
  });

  test("function type includes params and returnType", () => {
    const desc = toTypeDescriptor(FUNC_TYPE);
    expect(desc.kind).toBe("function");
    expect(desc.name).toBe("greet");
    expect(desc.params).toHaveLength(1);
    expect(desc.params[0]).toEqual({ kind: "string" });
    expect(desc.returnType).toEqual({ kind: "number" });
  });

  test("state type", () => {
    const stateType = { kind: "state", name: "Counter" };
    const desc = toTypeDescriptor(stateType);
    expect(desc).toEqual({ kind: "state", name: "Counter" });
  });

  test("error type with fields", () => {
    const errorType = {
      kind: "error",
      name: "ValidationError",
      fields: new Map([["message", { kind: "primitive", name: "string" }]]),
    };
    const desc = toTypeDescriptor(errorType);
    expect(desc.kind).toBe("error");
    expect(desc.name).toBe("ValidationError");
    expect(desc.fields).toHaveLength(1);
    expect(desc.fields[0].name).toBe("message");
  });

  test("unknown type", () => {
    const desc = toTypeDescriptor({ kind: "unknown" });
    expect(desc).toEqual({ kind: "unknown" });
  });

  test("self-referential struct does not infinite-loop", () => {
    const selfRef = {
      kind: "struct",
      name: "Node",
      fields: new Map(),
    };
    // Make it self-referential
    selfRef.fields.set("child", selfRef);
    const desc = toTypeDescriptor(selfRef);
    expect(desc.kind).toBe("struct");
    expect(desc.name).toBe("Node");
    // The recursive reference should be a stub
    expect(desc.fields[0].type).toEqual({ kind: "struct", name: "Node" });
  });
});

// ---------------------------------------------------------------------------
// §3 emitRuntimeReflect
// ---------------------------------------------------------------------------

describe("emitRuntimeReflect", () => {
  test("returns valid JS function string", () => {
    const result = emitRuntimeReflect();
    expect(result).toContain("function _scrml_reflect");
    expect(result).toContain("encodedName");
    expect(result).toContain("_scrml_decode_table");
    expect(result).toContain('.slice(0, 10)');
    expect(result).toContain('"foreign"');
  });

  test("generated function is syntactically valid JS", () => {
    // Wrap in decode table + function, then eval
    const js = `const _scrml_decode_table = {};\n${emitRuntimeReflect()}\n_scrml_reflect;`;
    const fn = new Function(js)();
    // Should not throw — valid syntax
    expect(typeof fn).toBe("undefined"); // new Function returns undefined for last expr
  });

  test("reflect returns foreign for non-string input", () => {
    const table = "const _scrml_decode_table = {};";
    const reflect = emitRuntimeReflect();
    const fn = new Function(`${table}\n${reflect}\nreturn _scrml_reflect;`)();
    expect(fn(42)).toEqual({ kind: "foreign" });
    expect(fn(null)).toEqual({ kind: "foreign" });
    expect(fn(undefined)).toEqual({ kind: "foreign" });
  });

  test("reflect returns foreign for unknown prefix", () => {
    const table = "const _scrml_decode_table = {};";
    const reflect = emitRuntimeReflect();
    const fn = new Function(`${table}\n${reflect}\nreturn _scrml_reflect;`)();
    expect(fn("_p000000000")).toEqual({ kind: "foreign" });
  });

  test("reflect returns correct descriptor for known prefix", () => {
    const ctx = new EncodingContext({ enabled: true });
    const encoded = ctx.register("name", STRING_TYPE);

    const table = emitDecodeTable(ctx);
    const reflect = emitRuntimeReflect();
    const fn = new Function(`${table}\n${reflect}\nreturn _scrml_reflect;`)();

    const result = fn(encoded);
    expect(result.kind).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// §4 EncodingContext.getType
// ---------------------------------------------------------------------------

describe("EncodingContext.getType", () => {
  test("returns the registered type", () => {
    const ctx = new EncodingContext({ enabled: true });
    ctx.register("user", USER_STRUCT);
    const type = ctx.getType("user");
    expect(type).toBe(USER_STRUCT);
  });

  test("returns undefined for unregistered names", () => {
    const ctx = new EncodingContext({ enabled: true });
    expect(ctx.getType("nonexistent")).toBeUndefined();
  });

  test("returns undefined after reset", () => {
    const ctx = new EncodingContext({ enabled: true });
    ctx.register("x", STRING_TYPE);
    ctx.reset();
    expect(ctx.getType("x")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// §5 Integration — prefix consistency
// ---------------------------------------------------------------------------

describe("Integration: decode table and decodeKind consistency", () => {
  test("decode table prefix matches what decodeKind extracts", () => {
    const ctx = new EncodingContext({ enabled: true });
    const encoded = ctx.register("user", USER_STRUCT);
    const table = emitDecodeTable(ctx);

    // The prefix in the table should be the first 10 chars of the encoded name
    const prefix = encoded.slice(0, 10);
    expect(table).toContain(JSON.stringify(prefix));

    // decodeKind should return "struct" for the encoded name
    expect(decodeKind(encoded)).toBe("struct");

    // The kind char in the prefix should match the table entry's kind
    const parsed = evalDecodeTable(table);
    expect(parsed[prefix].kind).toBe("struct");
  });

  test("generated decode table is valid JavaScript", () => {
    const ctx = new EncodingContext({ enabled: true });
    ctx.register("name", STRING_TYPE);
    ctx.register("user", USER_STRUCT);
    ctx.register("status", STATUS_ENUM);
    ctx.register("items", STRING_ARRAY);
    ctx.register("val", UNION_TYPE);

    const table = emitDecodeTable(ctx);
    // Should not throw
    const parsed = evalDecodeTable(table);
    expect(Object.keys(parsed).length).toBe(5);
  });

  test("debug mode encoded names still resolve correctly in reflect", () => {
    const ctx = new EncodingContext({ enabled: true, debug: true });
    const encoded = ctx.register("user", USER_STRUCT);
    expect(encoded).toContain("$user");

    const table = emitDecodeTable(ctx);
    const reflect = emitRuntimeReflect();
    const fn = new Function(`${table}\n${reflect}\nreturn _scrml_reflect;`)();

    // Even with debug suffix, reflect should find the prefix
    const result = fn(encoded);
    expect(result.kind).toBe("struct");
    expect(result.name).toBe("User");
  });
});

// ---------------------------------------------------------------------------
// Test utility
// ---------------------------------------------------------------------------

/**
 * Eval a decode table declaration and return the table object.
 */
function evalDecodeTable(tableDecl) {
  return new Function(`${tableDecl}\nreturn _scrml_decode_table;`)();
}
