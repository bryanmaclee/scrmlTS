/**
 * lint-ghost-patterns — W-LINT-013 Tilde-Range No-Misfire
 *
 * Regression tests for fix-w-lint-013-tilde-range-exclusion (Scope C A6).
 *
 * Core fix: extend lintGhostPatterns to build `tildeRanges` (offsets of `~{...}`
 * test-sigil bodies) and pass them as a 5th arg to skipIf. W-LINT-013 then
 * excludes matches that fall inside a tilde range, since `~{}` bodies contain
 * scrml code (assertions, reactive assignments) that should not be flagged as
 * Vue-style attribute shorthand.
 *
 * Builds on A1 (the `(?!=)` lookahead) and A2 (the comment-range exclusion).
 *
 * Coverage:
 *   §1 Reactive assignment `@count = 0` inside `~{}` → no W-LINT-013
 *   §2 Multiple assignments inside `~{}` → no W-LINT-013
 *   §3 Sanity — real Vue ghost OUTSIDE `~{}` still fires
 *   §4 Mixed — `~{}` body + ghost in markup → exactly 1 lint (on markup, not assignment)
 *   §5 Nested braces inside `~{}` body — brace-balance counter handles correctly
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
// §1 Reactive assignment inside `~{}` — no misfire
// ---------------------------------------------------------------------------

describe("§1 W-LINT-013 — `@var = N` inside `~{}` does not misfire", () => {
  test("`@count = 0` inside test-sigil body produces no W-LINT-013", () => {
    const source = [
      '~{ "x"',
      '  test "y" { @count = 0 }',
      "}",
    ].join("\n");
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-013")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §2 Multiple assignments inside `~{}` — no misfire
// ---------------------------------------------------------------------------

describe("§2 W-LINT-013 — multiple `@var = N` inside `~{}` do not misfire", () => {
  test("three assignments produce zero W-LINT-013", () => {
    const source = [
      '~{ "x"',
      '  test "y" {',
      "    @a = 0",
      "    @b = 1",
      "    @c = 2",
      "  }",
      "}",
    ].join("\n");
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-013")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §3 Sanity — outside `~{}`, real Vue ghost still fires
// ---------------------------------------------------------------------------

describe("§3 W-LINT-013 — real `@click=\"...\"` outside `~{}` still fires", () => {
  test("`<button @click=\"handler\">` triggers exactly one W-LINT-013", () => {
    const source = '<button @click="handler">x</button>';
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-013")).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §4 Mixed — `~{}` body + ghost in markup
// ---------------------------------------------------------------------------

describe("§4 W-LINT-013 — mixed `~{}` body and real ghost in markup", () => {
  test("ghost in markup flagged; assignment inside `~{}` not flagged → exactly 1 diag", () => {
    const source = [
      '~{ "x" test "y" { @count = 0 } }',
      '<button @click="handler">x</button>',
    ].join("\n");
    const diags = lint(source);
    const w013 = diags.filter(d => d.code === "W-LINT-013");
    expect(w013.length).toBe(1);
    // Diagnostic must be on the <button> line (line 2), not the `@count = 0` line (line 1).
    expect(w013[0].line).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// §5 Nested braces inside `~{}` body — brace-balance sanity
// ---------------------------------------------------------------------------

describe("§5 W-LINT-013 — nested `{` `}` inside `~{}` body", () => {
  test("nested object literal does not unbalance the tilde range", () => {
    const source = [
      '~{ "x"',
      '  test "y" {',
      "    const o = { a: 1, b: 2 }",
      "    @count = o.a",
      "  }",
      "}",
    ].join("\n");
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-013")).toBe(0);
  });
});
