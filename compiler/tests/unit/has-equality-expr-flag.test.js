/**
 * has-equality-expr-flag.test.js — PGO Phase 3 follow-up C1 (S106).
 *
 * Sibling pattern to S102's `hasResetExpr` AST-cached flag (see
 * ast-builder.js detectResetExprPresence + emit-client.ts:142+ consumer).
 *
 * Tests that `detectEqualityExprPresence` in `compiler/src/ast-builder.js`:
 *   - Returns `true` when the AST contains at least one binary `==` or `!=`
 *   - Returns `false` when the AST contains NO binary `==` or `!=`
 *   - Sets `FileAST.hasEqualityExpr` to the right value end-to-end via buildAST
 *
 * Coverage:
 *   §1  Direct walker: empty AST → false
 *   §2  Direct walker: AST with one `==` at top level → true
 *   §3  Direct walker: AST with one `!=` nested in expr subtree → true
 *   §4  Direct walker: AST with logic + arithmetic but no `==`/`!=` → false
 *   §5  Direct walker: nested `==` deep in markup attribute expr → true (short-circuits)
 *   §6  Direct walker: binary `<` / `>` / `+` operators → false (only ==/!= match)
 *   §7  End-to-end via buildAST: file with `if (@x == 0) {}` → ast.hasEqualityExpr === true
 *   §8  End-to-end via buildAST: file with no equality ops → ast.hasEqualityExpr === false
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

// `detectEqualityExprPresence` is module-internal — exercise it via buildAST's
// emitted `hasEqualityExpr` field, OR via the same shape: a small AST tree
// passed through the walker by importing the export. Since the function is
// not exported, exercise via buildAST happy-path + a direct synthetic AST
// helper inline.

// ---------------------------------------------------------------------------
// Direct walker via dynamically-extracted reference. The function is module-
// local; we rebuild a synthetic AST and rely on `buildAST` end-to-end to
// expose the flag. For direct-walker semantics we use the exported buildAST
// flow with crafted inputs.
// ---------------------------------------------------------------------------

function compileToAST(source) {
  const filePath = "/test/has-equality-expr.scrml";
  const blocks = splitBlocks(filePath, source);
  return buildAST(blocks);
}

describe("§1 hasEqualityExpr: empty file → false", () => {
  test("empty source", () => {
    const out = compileToAST("");
    expect(out.ast.hasEqualityExpr).toBe(false);
  });

  test("only comments", () => {
    const out = compileToAST("// a comment\n// another\n");
    expect(out.ast.hasEqualityExpr).toBe(false);
  });
});

describe("§2 hasEqualityExpr: file with `==` → true", () => {
  test("simple `if (@x == 0)`", () => {
    const out = compileToAST(`\${
@x = 0
if (@x == 0) { @x = 1 }
}`);
    expect(out.ast.hasEqualityExpr).toBe(true);
  });

  test("`==` in arithmetic expression position", () => {
    const out = compileToAST(`\${
@x = 5
const <isFive> = @x == 5
}`);
    expect(out.ast.hasEqualityExpr).toBe(true);
  });
});

describe("§3 hasEqualityExpr: file with `!=` → true", () => {
  test("simple `if (@x != 0)`", () => {
    const out = compileToAST(`\${
@x = 0
if (@x != 0) { @x = 0 }
}`);
    expect(out.ast.hasEqualityExpr).toBe(true);
  });
});

describe("§4 hasEqualityExpr: file with no equality ops → false", () => {
  test("logic + arithmetic only — no `==` / `!=`", () => {
    const out = compileToAST(`\${
@x = 0
@y = @x + 1
}`);
    expect(out.ast.hasEqualityExpr).toBe(false);
  });

  test("relational `<` and `>` are NOT equality ops", () => {
    const out = compileToAST(`\${
@x = 5
if (@x < 10) { @x = @x + 1 }
if (@x > 0) { @x = @x - 1 }
}`);
    expect(out.ast.hasEqualityExpr).toBe(false);
  });

  test("assignment `=` is NOT an equality op", () => {
    const out = compileToAST(`\${
@x = 0
@x = @x + 1
}`);
    expect(out.ast.hasEqualityExpr).toBe(false);
  });
});

describe("§5 hasEqualityExpr: deep equality op → true (sentinel short-circuits)", () => {
  test("nested in conditional + function args", () => {
    const out = compileToAST(`\${
@x = 5
function check(v) {
  if (v == 5) { return "five" }
  return "other"
}
const <result> = check(@x)
}`);
    expect(out.ast.hasEqualityExpr).toBe(true);
  });

  test("equality op inside markup attribute expression", () => {
    const out = compileToAST(`\${@count = 0}<div class={@count == 0 ? "empty" : "full"}></div>`);
    expect(out.ast.hasEqualityExpr).toBe(true);
  });
});

describe("§6 hasEqualityExpr: arithmetic-only binary ops → false", () => {
  test("plus / minus / times / divide", () => {
    const out = compileToAST(`\${
@x = 1
@a = @x + 2
@b = @x - 3
@c = @x * 4
@d = @x / 5
}`);
    expect(out.ast.hasEqualityExpr).toBe(false);
  });

  test("logical `&&` / `||` are NOT equality ops", () => {
    const out = compileToAST(`\${
@x = true
@y = false
const <both> = @x && @y
const <either> = @x || @y
}`);
    expect(out.ast.hasEqualityExpr).toBe(false);
  });
});

describe("§7 hasResetExpr + hasEqualityExpr coexist independently", () => {
  test("file with reset() and == both set both flags", () => {
    const out = compileToAST(`\${
@x = 0
@y = 5
if (@x == 0) { reset(@y) }
}`);
    expect(out.ast.hasEqualityExpr).toBe(true);
    expect(out.ast.hasResetExpr).toBe(true);
  });

  test("file with only == — hasEqualityExpr true, hasResetExpr false", () => {
    const out = compileToAST(`\${
@x = 0
if (@x == 0) { @x = 1 }
}`);
    expect(out.ast.hasEqualityExpr).toBe(true);
    expect(out.ast.hasResetExpr).toBe(false);
  });

  test("file with only reset() — hasResetExpr true, hasEqualityExpr false", () => {
    const out = compileToAST(`\${
@x = 5
function clear() { reset(@x) }
}`);
    expect(out.ast.hasEqualityExpr).toBe(false);
    expect(out.ast.hasResetExpr).toBe(true);
  });
});
