/**
 * lint-ghost-patterns — Comment-Range Exclusion (W-LINT-007 follow-up)
 *
 * Regression tests for fix-w-lint-007-comment-range-exclusion (Scope C A2).
 *
 * Adds `buildCommentRanges()` infrastructure and uses it in W-LINT-007's skipIf
 * so JSX-style `prop={val}` patterns appearing inside `//` line comments and
 * `/* * /` block comments are NOT flagged. Comment text per SPEC §27 is not
 * parsed as code — the lint should match.
 *
 * Coverage:
 *   §1 Line comment containing W-LINT-007 ghost text → no diagnostic
 *   §2 Block comment containing W-LINT-007 ghost text → no diagnostic
 *   §3 Sanity — actual JSX-style attr OUTSIDE comment still flagged
 *   §4 Mixed — comment ghost + real ghost → exactly one diagnostic on real line
 *   §5 `//` inside string literal — over-exclusion is acceptable (no ghost present)
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
// §1 Line comment with W-LINT-007 ghost text
// ---------------------------------------------------------------------------

describe("§1 W-LINT-007 — line comment exclusion", () => {
  test("line comment containing <Comp prop={val}> does NOT trigger W-LINT-007", () => {
    const source = [
      "<program>",
      "${ @x = 0 }",
      "// example: <Comp prop={val}> is JSX, not scrml",
      "<p>hi</p>",
      "</program>",
    ].join("\n");
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §2 Block comment with W-LINT-007 ghost text
// ---------------------------------------------------------------------------

describe("§2 W-LINT-007 — block comment exclusion", () => {
  test("block comment containing <Comp prop={val}> does NOT trigger W-LINT-007", () => {
    const source = [
      "<program>",
      "/* multi",
      "   line: <Comp prop={val}>",
      "   example */",
      "<p>hi</p>",
      "</program>",
    ].join("\n");
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// §3 Sanity — real ghost outside any comment is still flagged
// ---------------------------------------------------------------------------

describe("§3 W-LINT-007 — real ghost outside comments still detected", () => {
  test("actual <Comp prop={val}> outside comments still triggers W-LINT-007", () => {
    const source = [
      "<program>",
      "<Comp prop={val}>",
      "</program>",
    ].join("\n");
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// §4 Mixed — both comment-ghost and real-ghost present
// ---------------------------------------------------------------------------

describe("§4 W-LINT-007 — mixed comment + real ghost", () => {
  test("comment-ghost suppressed, real ghost detected — exactly one diagnostic", () => {
    const source = [
      "<program>",
      "// <Comp prop={val}> is the ghost form (lint should NOT fire on this line)",
      "<Comp prop={val}>",
      "</program>",
    ].join("\n");
    const diags = lint(source);
    const wLint007s = diags.filter(d => d.code === "W-LINT-007");
    expect(wLint007s.length).toBe(1);
    // The remaining diagnostic must be on the markup line (line 3), NOT the comment line (line 2).
    expect(wLint007s[0].line).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// §5 `//` inside string literal — over-exclusion is acceptable
// ---------------------------------------------------------------------------

describe("§5 W-LINT-007 — `//` inside string literal (edge case)", () => {
  test("URL containing `//` inside a string does not produce W-LINT-007", () => {
    // The `//` inside the URL is treated as a line-comment start by the
    // range builder, but no W-LINT-007 ghost pattern lives in the URL,
    // so the over-exclusion is harmless.
    const source = [
      "<program>",
      '${ @x = "https://example.com/path" }',
      "<p>${@x}</p>",
      "</program>",
    ].join("\n");
    const diags = lint(source);
    expect(countCode(diags, "W-LINT-007")).toBe(0);
  });
});
