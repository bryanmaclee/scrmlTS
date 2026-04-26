/**
 * lint-ghost-patterns — W-LINT-013 Equality No-Misfire
 *
 * Regression tests for fix-w-lint-013-context-scope (Scope C A1).
 *
 * Core fix: regex changed from `\s*=` → `\s*=(?!=)` so `@reactive == value`
 * (scrml equality) no longer misfires as Vue's `@click="..."` ghost.
 * Step 2 also extends skipIf to honor `commentRanges` (provided by A2).
 *
 * Coverage:
 *   §1 `@reactive == value` inside ${} test sigil → no W-LINT-013
 *   §2 `if=(@reactive == value)` attribute expression → no W-LINT-013
 *   §3 Compound `if=(@x == 1 && @y == 2)` → no W-LINT-013
 *   §4 Sanity — real `@click="..."` STILL fires
 *   §5 Sanity — `@click.stop="..."` modifier form STILL fires
 *   §6 Mixed — real ghost + scrml equality → exactly one diagnostic on ghost line
 */

import { describe, test, expect } from "bun:test";
import { lintGhostPatterns } from "../../src/lint-ghost-patterns.js";

function lint(source) {
  return lintGhostPatterns(source, "test.scrml");
}

function countCode(diags, code) {
  return diags.filter(d => d.code === code).length;
}

// ---------------------------------------------------------------------------
// §1 `@reactive == value` inside ${} (test sigil body) — no misfire
// ---------------------------------------------------------------------------

describe("§1 W-LINT-013 — @reactive == value does not misfire", () => {
  test("`assert @count == 0` inside test sigil body produces no W-LINT-013", () => {
    const source = [
      "<program>",
      "${",
      "  @count = 0",
      '  ~{ test "x" { assert @count == 0 } }',
      "}",
      "</program>",
    ].join("\n");
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-013")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §2 `if=(@reactive == value)` attribute expression — no misfire
// ---------------------------------------------------------------------------

describe("§2 W-LINT-013 — if=(@reactive == value) does not misfire", () => {
  test("`<div if=(@x == 5)>` produces no W-LINT-013", () => {
    const source = [
      "<program>",
      "${ @x = 0 }",
      "<div if=(@x == 5)>visible</div>",
      "</program>",
    ].join("\n");
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-013")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §3 Compound equality expression — no misfire
// ---------------------------------------------------------------------------

describe("§3 W-LINT-013 — compound `==` expression does not misfire", () => {
  test("`if=(@x == 1 && @y == 2)` produces no W-LINT-013", () => {
    const source = [
      "<program>",
      "${ @x = 0; @y = 0 }",
      "<div if=(@x == 1 && @y == 2)>both</div>",
      "</program>",
    ].join("\n");
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-013")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §4 Sanity — real Vue `@click="..."` STILL fires
// ---------------------------------------------------------------------------

describe("§4 W-LINT-013 — real @click=\"...\" still fires", () => {
  test("`<button @click=\"handler\">` still triggers W-LINT-013", () => {
    const source = '<button @click="handler">click</button>';
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-013")).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §5 Sanity — modifier form `@click.stop="..."` STILL fires
// ---------------------------------------------------------------------------

describe("§5 W-LINT-013 — @click.stop=\"...\" modifier form still fires", () => {
  test("`<button @click.stop=\"handler\">` still triggers W-LINT-013", () => {
    const source = '<button @click.stop="handler">click</button>';
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-013")).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §6 Mixed — real ghost AND scrml equality, exactly one diagnostic
// ---------------------------------------------------------------------------

describe("§6 W-LINT-013 — mixed ghost + equality", () => {
  test("real @click= ghost flagged, scrml equality not flagged → exactly one diagnostic", () => {
    const source = [
      "<program>",
      "${ @x = 0 }",
      '<button @click="bad">ghost</button>',
      "<span if=(@x == 1)>good</span>",
      "</program>",
    ].join("\n");
    const diags = lint(source);
    const wLint013s = diags.filter(d => d.code === "W-LINT-013");
    expect(wLint013s.length).toBe(1);
    // The diagnostic must be on the <button> line (line 3), NOT the <span> line (line 4).
    expect(wLint013s[0].line).toBe(3);
  });
});
