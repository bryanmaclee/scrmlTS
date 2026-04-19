/**
 * machine-payload-binding.test.js — S22 §1b: payload binding in machine rules (§51.3.2).
 *
 * Unit tests for the two layers that land together:
 *   1. Parsing — `parseMachineRules` / `expandAlternation` recognize
 *      `.Variant(binding-list)` on either side of `=>`, resolve each
 *      binding against the variant's declared payload fields, and raise
 *      E-MACHINE-015 / E-MACHINE-016 on misuse.
 *   2. Emission — `emitTransitionGuard` emits the destructuring prelude
 *      `var n = __prev.data.<field>;` inside the keyed guard block so the
 *      guard expression and effect body can reference the local name.
 *
 * Tests go through `buildMachineRegistry` (public API) rather than the
 * internal `parseMachineRules` directly, matching the style of
 * `machine-types.test.js`.
 */

import { describe, test, expect } from "bun:test";
import { buildMachineRegistry, buildTypeRegistry } from "../../../src/type-system.js";
import { emitTransitionGuard, buildBindingPreludeStmts } from "../../../src/codegen/emit-machines.ts";

function span() {
  return { file: "test.scrml", start: 0, end: 0, line: 1, col: 1 };
}

function makeTypeDecl(name, kind, raw) {
  return { kind: "type-decl", name, typeKind: kind, raw, span: span() };
}

function makeMachineDecl(machineName, governedType, rulesRaw) {
  return { kind: "machine-decl", machineName, governedType, rulesRaw, span: span() };
}

// Shared enum used by most tests: matches SPEC §51.3.2's CannonMachine example
// minus the Shot struct reference (scrml primitives are enough for these tests).
const CANNON_ENUM = makeTypeDecl(
  "CannonState",
  "enum",
  "{ Idle\nCharging(level: number)\nFiring(shotId: number)\nReloading(reason: string) }",
);

describe("§1b parseMachineRules — payload bindings", () => {
  test("positional binding resolves to the first declared payload field", () => {
    const typeRegistry = buildTypeRegistry([CANNON_ENUM], [], span());
    const machines = [makeMachineDecl("M", "CannonState", ".Charging(n) => .Idle given (n < 10)")];
    const errors = [];
    const registry = buildMachineRegistry(machines, typeRegistry, errors, span());
    expect(errors).toEqual([]);
    const rule = registry.get("M").rules[0];
    expect(rule.from).toBe("Charging");
    expect(rule.fromBindings).toEqual([{ localName: "n", fieldName: "level" }]);
    expect(rule.toBindings).toBeNull();
    expect(rule.guard).toBe("n < 10");
  });

  test("named binding (field: local) destructures the named field directly", () => {
    const typeRegistry = buildTypeRegistry([CANNON_ENUM], [], span());
    const machines = [makeMachineDecl("M", "CannonState", ".Firing(shotId: s) => .Reloading(reason: r)")];
    const errors = [];
    const registry = buildMachineRegistry(machines, typeRegistry, errors, span());
    expect(errors).toEqual([]);
    const rule = registry.get("M").rules[0];
    expect(rule.fromBindings).toEqual([{ localName: "s", fieldName: "shotId" }]);
    expect(rule.toBindings).toEqual([{ localName: "r", fieldName: "reason" }]);
  });

  test("`_` discards are dropped from the resolved binding list", () => {
    // Multi-field variant with a discard in the middle.
    const multi = makeTypeDecl("Pair", "enum", "{ P(first: number, second: number) }");
    const typeRegistry = buildTypeRegistry([multi], [], span());
    const machines = [makeMachineDecl("M", "Pair", ".P(_, b) => .P(_, b)")];
    const errors = [];
    const registry = buildMachineRegistry(machines, typeRegistry, errors, span());
    expect(errors).toEqual([]);
    const rule = registry.get("M").rules[0];
    // Only `b` survives (the `_` is discarded), and it binds the second field.
    expect(rule.fromBindings).toEqual([{ localName: "b", fieldName: "second" }]);
    expect(rule.toBindings).toEqual([{ localName: "b", fieldName: "second" }]);
  });

  test("E-MACHINE-015: binding against a unit variant is a compile error", () => {
    const typeRegistry = buildTypeRegistry([CANNON_ENUM], [], span());
    const machines = [makeMachineDecl("M", "CannonState", ".Idle(x) => .Charging")];
    const errors = [];
    buildMachineRegistry(machines, typeRegistry, errors, span());
    const e = errors.find(e => e.code === "E-MACHINE-015");
    expect(e).toBeDefined();
    expect(e.message).toContain("unit variant");
    expect(e.message).toContain("Idle");
  });

  test("E-MACHINE-015: named binding of a non-existent field", () => {
    const typeRegistry = buildTypeRegistry([CANNON_ENUM], [], span());
    const machines = [makeMachineDecl("M", "CannonState", ".Charging(bogus: x) => .Idle")];
    const errors = [];
    buildMachineRegistry(machines, typeRegistry, errors, span());
    const e = errors.find(e => e.code === "E-MACHINE-015");
    expect(e).toBeDefined();
    expect(e.message).toContain("bogus");
    expect(e.message).toContain("Declared fields");
    expect(e.message).toContain("level");
  });

  test("E-MACHINE-015: more positional bindings than declared fields", () => {
    const typeRegistry = buildTypeRegistry([CANNON_ENUM], [], span());
    const machines = [makeMachineDecl("M", "CannonState", ".Charging(a, b, c) => .Idle")];
    const errors = [];
    buildMachineRegistry(machines, typeRegistry, errors, span());
    const e = errors.find(e => e.code === "E-MACHINE-015");
    expect(e).toBeDefined();
    expect(e.message).toContain("more positional bindings");
  });

  test("wildcard machine rules (`* => *`) are unaffected by §1b", () => {
    const structDecl = makeTypeDecl("Booking", "struct", "{ nights: number }");
    const typeRegistry = buildTypeRegistry([structDecl], [], span());
    const machines = [makeMachineDecl("M", "Booking", "* => * given (self.nights > 0)")];
    const errors = [];
    const registry = buildMachineRegistry(machines, typeRegistry, errors, span());
    expect(errors).toEqual([]);
    const rule = registry.get("M").rules[0];
    expect(rule.fromBindings).toBeNull();
    expect(rule.toBindings).toBeNull();
  });
});

describe("§1b expandAlternation — payload bindings across `|`", () => {
  test("identical bindings on all LHS alternatives are accepted", () => {
    // Both alternatives bind the same local name `n` to the same field.
    // The spec allows this — all alternatives share the same binding shape.
    const both = makeTypeDecl("S", "enum", "{ A(x: number)\nB(x: number) }");
    const typeRegistry = buildTypeRegistry([both], [], span());
    const machines = [makeMachineDecl("M", "S", ".A(n) | .B(n) => .A given (n > 0)")];
    const errors = [];
    const registry = buildMachineRegistry(machines, typeRegistry, errors, span());
    expect(errors).toEqual([]);
    // Two expanded rules; both carry the same fromBindings shape.
    const rules = registry.get("M").rules;
    expect(rules).toHaveLength(2);
    expect(rules[0].fromBindings).toEqual([{ localName: "n", fieldName: "x" }]);
    expect(rules[1].fromBindings).toEqual([{ localName: "n", fieldName: "x" }]);
  });

  test("E-MACHINE-016: mismatched LHS alternation bindings", () => {
    const both = makeTypeDecl("S", "enum", "{ A(x: number)\nB(y: number) }");
    const typeRegistry = buildTypeRegistry([both], [], span());
    const machines = [makeMachineDecl("M", "S", ".A(n) | .B(m) => .A given (n > 0)")];
    const errors = [];
    buildMachineRegistry(machines, typeRegistry, errors, span());
    const e = errors.find(e => e.code === "E-MACHINE-016");
    expect(e).toBeDefined();
    expect(e.message).toContain("mismatched");
  });

  test("E-MACHINE-016: some alternatives bind, others do not", () => {
    const both = makeTypeDecl("S", "enum", "{ A(x: number)\nB(y: number) }");
    const typeRegistry = buildTypeRegistry([both], [], span());
    const machines = [makeMachineDecl("M", "S", ".A(n) | .B => .A")];
    const errors = [];
    buildMachineRegistry(machines, typeRegistry, errors, span());
    const e = errors.find(e => e.code === "E-MACHINE-016");
    expect(e).toBeDefined();
  });
});

describe("§1b emitTransitionGuard — binding prelude", () => {
  test("from-binding emits `var n = __prev.data.<field>` inside the keyed guard block", () => {
    const rules = [
      {
        from: "Charging",
        to: "Idle",
        guard: "n < 10",
        label: null,
        effectBody: null,
        fromBindings: [{ localName: "n", fieldName: "level" }],
        toBindings: null,
      },
    ];
    const code = emitTransitionGuard("r_state", "newVal", "__t", "M", rules).join("\n");
    // The binding is scoped inside the keyed `if (__matchedKey === "Charging:Idle")` block
    // so it does not leak into other rules' guards. (S27: matched-key rather
    // than raw __key so guarded wildcard rules also fire correctly.)
    expect(code).toMatch(/if \(__matchedKey === "Charging:Idle"\) \{\s*var n = __prev != null && __prev\.data != null \? __prev\.data\.level : undefined;\s*if \(!\(n < 10\)\)/);
  });

  test("to-binding emits `var r = __next.data.<field>` before the effect body", () => {
    const rules = [
      {
        from: "Firing",
        to: "Reloading",
        guard: null,
        label: null,
        effectBody: 'log("reloading: " + r);',
        fromBindings: null,
        toBindings: [{ localName: "r", fieldName: "reason" }],
      },
    ];
    const code = emitTransitionGuard("r_state", "newVal", "__t", "M", rules).join("\n");
    expect(code).toContain("var event = { from: __prev, to: __next };");
    expect(code).toMatch(/var r = __next != null && __next\.data != null \? __next\.data\.reason : undefined;/);
    // The effect body runs AFTER the binding is declared.
    const rIdx = code.indexOf("var r =");
    const effectIdx = code.indexOf('log("reloading');
    expect(rIdx).toBeGreaterThan(-1);
    expect(effectIdx).toBeGreaterThan(rIdx);
  });

  test("rule without bindings emits the legacy single-line guard form", () => {
    const rules = [
      {
        from: "A",
        to: "B",
        guard: "x > 0",
        label: null,
        effectBody: null,
        fromBindings: null,
        toBindings: null,
      },
    ];
    const code = emitTransitionGuard("r_state", "newVal", "__t", "M", rules).join("\n");
    // Legacy form: single `if (__matchedKey === "A:B" && !(x > 0))` line.
    // (S27 parity fix: __matchedKey replaces the old __key compare so
    // wildcard-guarded rules fire correctly.)
    expect(code).toMatch(/if \(__matchedKey === "A:B" && !\(x > 0\)\)/);
    // And no binding prelude. Binding prelude pattern is
    // `var <local> = __prev.data.<field>` / `var <local> = __next.data.<field>`
    // — scope the anti-match on `.data.` to avoid false hits on the
    // variant-extraction helpers introduced in S27 (which reference __prev
    // / __next from inside a parenthesized ternary, not a bare `= __prev`).
    expect(code).not.toMatch(/var \w+ = __prev\.data\./);
    expect(code).not.toMatch(/var \w+ = __next\.data\./);
  });
});

describe("§1b buildBindingPreludeStmts — standalone helper", () => {
  test("produces `var <local> = __prev.data.<field>;` for from-bindings", () => {
    const rule = {
      from: "X",
      to: "Y",
      guard: null,
      label: null,
      effectBody: null,
      fromBindings: [{ localName: "a", fieldName: "x" }, { localName: "b", fieldName: "y" }],
      toBindings: null,
    };
    const stmts = buildBindingPreludeStmts(rule);
    expect(stmts).toHaveLength(2);
    expect(stmts[0]).toContain("var a =");
    expect(stmts[0]).toContain("__prev.data.x");
    expect(stmts[1]).toContain("var b =");
    expect(stmts[1]).toContain("__prev.data.y");
  });

  test("produces empty array when no bindings are present", () => {
    const rule = {
      from: "X",
      to: "Y",
      guard: null,
      label: null,
      effectBody: null,
      fromBindings: null,
      toBindings: null,
    };
    expect(buildBindingPreludeStmts(rule)).toEqual([]);
  });
});
