/**
 * S28 gauntlet — multi-statement effect body in machine rules.
 *
 * Pre-S28 `parseMachineRules` split rule lines on `raw.split(/[\n;]/)`,
 * which fragmented effect bodies containing `;`:
 *
 *   .A => .B { @x = 1; @y = 2 }
 *
 * broke into three lines:
 *   1. `.A => .B { @x = 1`     (unterminated brace, garbage rule)
 *   2. `@y = 2 }`              (no `=>`, silently dropped)
 *   3. (empty)
 *
 * The fix: depth-tracking scanner replaces the regex so `;` inside `{}`
 * (and `()`, `[]`, strings, comments) does not split.
 *
 * Surfaced in the S27 wrap as a known pre-existing parser bug; closed here
 * alongside the S28 elision slices.
 */

import { describe, test, expect } from "bun:test";
import { buildMachineRegistry, buildTypeRegistry } from "../../../src/type-system.js";

function span() {
  return { file: "test.scrml", start: 0, end: 0, line: 1, col: 1 };
}

function makeTypeDecl(name, kind, raw) {
  return { kind: "type-decl", name, typeKind: kind, raw, span: span() };
}

function makeMachineDecl(machineName, governedType, rulesRaw) {
  return { kind: "machine-decl", machineName, governedType, rulesRaw, span: span() };
}

const ENUM_ABC = makeTypeDecl("S", "enum", "{ A, B, C }");

describe("S28 parseMachineRules — multi-statement effect body", () => {
  test("single-statement effect body (baseline) still parses", () => {
    const typeRegistry = buildTypeRegistry([ENUM_ABC], [], span());
    const errors = [];
    const machines = [makeMachineDecl("M", "S", ".A => .B { @x = 1 }")];
    const registry = buildMachineRegistry(machines, typeRegistry, errors, span());
    expect(errors).toEqual([]);
    const rule = registry.get("M").rules[0];
    expect(rule.from).toBe("A");
    expect(rule.to).toBe("B");
    expect(rule.effectBody?.trim()).toBe("@x = 1");
  });

  test("semicolon-separated effect body is preserved as one rule", () => {
    const typeRegistry = buildTypeRegistry([ENUM_ABC], [], span());
    const errors = [];
    const machines = [makeMachineDecl("M", "S", ".A => .B { @x = 1; @y = 2 }")];
    const registry = buildMachineRegistry(machines, typeRegistry, errors, span());
    expect(errors).toEqual([]);
    const mach = registry.get("M");
    // Exactly ONE rule (pre-fix there were zero because `{ @x = 1` was
    // rejected and `@y = 2 }` was silently dropped).
    expect(mach.rules).toHaveLength(1);
    const rule = mach.rules[0];
    expect(rule.from).toBe("A");
    expect(rule.to).toBe("B");
    expect(rule.effectBody).toContain("@x = 1");
    expect(rule.effectBody).toContain("@y = 2");
  });

  test("newline inside effect body does not split the rule", () => {
    // Raw text contains a literal newline inside the braces.
    const body = ".A => .B {\n  @x = 1\n  @y = 2\n}";
    const typeRegistry = buildTypeRegistry([ENUM_ABC], [], span());
    const errors = [];
    const machines = [makeMachineDecl("M", "S", body)];
    const registry = buildMachineRegistry(machines, typeRegistry, errors, span());
    expect(errors).toEqual([]);
    const mach = registry.get("M");
    expect(mach.rules).toHaveLength(1);
    expect(mach.rules[0].effectBody).toContain("@x = 1");
    expect(mach.rules[0].effectBody).toContain("@y = 2");
  });

  test("multiple rules separated by `;` at depth 0 still split correctly", () => {
    // Two rules, each with a single-statement effect body. The outer `;`
    // separates them (depth 0); the inner `;` is allowed by the fix.
    const typeRegistry = buildTypeRegistry([ENUM_ABC], [], span());
    const errors = [];
    const machines = [makeMachineDecl("M", "S",
      ".A => .B { @x = 1; @y = 2 }; .B => .C { @z = 3 }")];
    const registry = buildMachineRegistry(machines, typeRegistry, errors, span());
    expect(errors).toEqual([]);
    const mach = registry.get("M");
    expect(mach.rules).toHaveLength(2);
    expect(mach.rules[0].effectBody).toContain("@x = 1");
    expect(mach.rules[0].effectBody).toContain("@y = 2");
    expect(mach.rules[1].effectBody?.trim()).toBe("@z = 3");
  });

  test("semicolon inside a string literal does not split", () => {
    const typeRegistry = buildTypeRegistry([ENUM_ABC], [], span());
    const errors = [];
    const machines = [makeMachineDecl("M", "S",
      '.A => .B { log("one; two; three") }')];
    const registry = buildMachineRegistry(machines, typeRegistry, errors, span());
    expect(errors).toEqual([]);
    const mach = registry.get("M");
    expect(mach.rules).toHaveLength(1);
    expect(mach.rules[0].effectBody).toContain('"one; two; three"');
  });

  test("line comment containing `;` does not split", () => {
    const typeRegistry = buildTypeRegistry([ENUM_ABC], [], span());
    const errors = [];
    const machines = [makeMachineDecl("M", "S",
      ".A => .B // note; see spec\n")];
    const registry = buildMachineRegistry(machines, typeRegistry, errors, span());
    expect(errors).toEqual([]);
    const mach = registry.get("M");
    // One rule with a comment attached to the line — no spurious second
    // "see spec" rule.
    expect(mach.rules).toHaveLength(1);
  });
});
