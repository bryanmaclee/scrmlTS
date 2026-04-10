/**
 * §51 State Transition Rules — Enum Transitions Parsing Unit Tests
 *
 * Tests transition rules parsing through parseEnumBody and buildTypeRegistry.
 * The transitions block is parsed inside parseEnumBody (not a separate function).
 */

import { describe, test, expect } from "bun:test";
import {
  buildTypeRegistry,
  parseEnumBody,
  BUILTIN_TYPES,
} from "../../src/type-system.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function span() {
  return { file: "test.scrml", start: 0, end: 0, line: 1, col: 1 };
}

function makeTypeDecl(name, kind, raw) {
  return {
    kind: "type-decl",
    name,
    typeKind: kind,
    raw,
    span: span(),
  };
}

// ---------------------------------------------------------------------------
// §51.2-a: Enum without transitions block
// ---------------------------------------------------------------------------

describe("§51.2-a parseEnumBody — no transitions block", () => {
  test("returns transitionRules: null for unrestricted enum", () => {
    const registry = new Map(BUILTIN_TYPES);
    const { variants, transitionRules } = parseEnumBody("{ North\nSouth\nEast\nWest }", registry);
    expect(variants).toHaveLength(4);
    expect(transitionRules).toBeNull();
  });

  test("empty enum body returns transitionRules: null", () => {
    const registry = new Map(BUILTIN_TYPES);
    const { variants, transitionRules } = parseEnumBody("{ }", registry);
    expect(variants).toHaveLength(0);
    expect(transitionRules).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §51.2-b: Basic transitions block
// ---------------------------------------------------------------------------

describe("§51.2-b parseEnumBody — basic transitions block", () => {
  test("parses two transition rules correctly", () => {
    const registry = new Map(BUILTIN_TYPES);
    const { variants, transitionRules } = parseEnumBody(
      "{ Pending\nProcessing\nShipped\ntransitions {\n  .Pending => .Processing\n  .Processing => .Shipped\n} }",
      registry
    );
    expect(variants).toHaveLength(3);
    expect(transitionRules).not.toBeNull();
    expect(transitionRules).toHaveLength(2);
    expect(transitionRules[0].from).toBe("Pending");
    expect(transitionRules[0].to).toBe("Processing");
    expect(transitionRules[1].from).toBe("Processing");
    expect(transitionRules[1].to).toBe("Shipped");
  });

  test("rule fields default guard/label/effectBody to null", () => {
    const registry = new Map(BUILTIN_TYPES);
    const { transitionRules } = parseEnumBody(
      "{ A\nB\ntransitions { .A => .B } }",
      registry
    );
    expect(transitionRules).toHaveLength(1);
    expect(transitionRules[0].guard).toBeNull();
    expect(transitionRules[0].label).toBeNull();
    expect(transitionRules[0].effectBody).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §51.2-c: Wildcard rules
// ---------------------------------------------------------------------------

describe("§51.2-c parseEnumBody — wildcard rules", () => {
  test("parses * => .Error wildcard", () => {
    const registry = new Map(BUILTIN_TYPES);
    const { transitionRules } = parseEnumBody(
      "{ Ok\nError\ntransitions { * => .Error } }",
      registry
    );
    expect(transitionRules).toHaveLength(1);
    expect(transitionRules[0].from).toBe("*");
    expect(transitionRules[0].to).toBe("Error");
  });
});

// ---------------------------------------------------------------------------
// §51.2-d: E-MACHINE-010 — guard in type-level transitions
// ---------------------------------------------------------------------------

describe("§51.2-d E-MACHINE-010: guard in type-level transitions", () => {
  test("emits E-MACHINE-010 when given keyword found", () => {
    const registry = new Map(BUILTIN_TYPES);
    const errors = [];
    const { transitionRules } = parseEnumBody(
      "{ A\nB\ntransitions { .A => .B given (x > 0) } }",
      registry, errors, span(), "TestEnum"
    );
    expect(transitionRules).toHaveLength(1);
    const machineErrors = errors.filter(e => e.code === "E-MACHINE-010");
    expect(machineErrors.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// §51.2-e: Self-transition
// ---------------------------------------------------------------------------

describe("§51.2-e parseEnumBody — self-transition", () => {
  test(".A => .A is valid", () => {
    const registry = new Map(BUILTIN_TYPES);
    const { transitionRules } = parseEnumBody(
      "{ A\nB\ntransitions { .A => .A } }",
      registry
    );
    expect(transitionRules).toHaveLength(1);
    expect(transitionRules[0].from).toBe("A");
    expect(transitionRules[0].to).toBe("A");
  });
});

// ---------------------------------------------------------------------------
// §51.2-f: :: alias syntax
// ---------------------------------------------------------------------------

describe("§51.2-f parseEnumBody — :: alias syntax", () => {
  test("::Variant is normalized to variant name", () => {
    const registry = new Map(BUILTIN_TYPES);
    const { transitionRules } = parseEnumBody(
      "{ A\nB\ntransitions { ::A => ::B } }",
      registry
    );
    expect(transitionRules).toHaveLength(1);
    expect(transitionRules[0].from).toBe("A");
    expect(transitionRules[0].to).toBe("B");
  });
});

// ---------------------------------------------------------------------------
// §51.2-g: buildTypeRegistry integration
// ---------------------------------------------------------------------------

describe("§51.2-g buildTypeRegistry — enum transitions", () => {
  test("enum without transitions → transitionRules: null", () => {
    const decls = [makeTypeDecl("Direction", "enum", "{ North\nSouth }")];
    const registry = buildTypeRegistry(decls, [], span());
    const type = registry.get("Direction");
    expect(type.kind).toBe("enum");
    expect(type.transitionRules).toBeNull();
  });

  test("enum with transitions → transitionRules populated", () => {
    const decls = [makeTypeDecl("Status", "enum",
      "{ Pending\nDone\ntransitions { .Pending => .Done } }")];
    const registry = buildTypeRegistry(decls, [], span());
    const type = registry.get("Status");
    expect(type.kind).toBe("enum");
    expect(type.transitionRules).toHaveLength(1);
    expect(type.transitionRules[0].from).toBe("Pending");
    expect(type.transitionRules[0].to).toBe("Done");
  });

  test("variants are unaffected by transitions block", () => {
    const decls = [makeTypeDecl("Status", "enum",
      "{ Pending\nDone\ntransitions { .Pending => .Done } }")];
    const registry = buildTypeRegistry(decls, [], span());
    const type = registry.get("Status");
    expect(type.variants).toHaveLength(2);
    expect(type.variants.map(v => v.name)).toContain("Pending");
    expect(type.variants.map(v => v.name)).toContain("Done");
  });
});
