/**
 * AST Builder — String Literal Escape Re-emit Tests (Bug 1)
 *
 * Root cause: ast-builder.js collected STRING tokens and re-quoted them via
 *   `"${tok.text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
 * The tokenizer stores raw source text between delimiters — so `"a\nb"` is
 * stored as the 4-char string `a\nb` (backslash-n literal). The `.replace` step
 * doubled every backslash, producing `"a\\nb"` in emitted JS — which JS parses
 * as literal backslash+n, not LF. Every escape sequence was affected.
 *
 * Fix: `reemitJsStringLiteral(rawInner)` interprets scrml/JS escape sequences
 * (\n \t \r \\ \" \' \0 \b \f \v \xHH \uHHHH \u{HHHHHH}) into their character
 * values, then JSON.stringifies the result to produce a canonical JS literal.
 *
 * Each test compiles a logic block and checks the emitted `init` string for
 * the const declaration. The assertion is: evaluating that JS source via
 * JSON.parse (safe string-only eval) yields the INTENDED value, not the
 * source-backslash-preserving value.
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

function constInit(source) {
  const bs = splitBlocks("test.scrml", source);
  const { ast } = buildAST(bs);
  const logic = ast.nodes.find(n => n.kind === "logic");
  const decl = logic.body.find(n => n.kind === "const-decl" || n.kind === "let-decl");
  return decl?.init;
}

describe("ast-builder string escape re-emit (Bug 1)", () => {
  test("\\n becomes LF in JS value, not literal backslash-n", () => {
    const init = constInit(`\${ const s = "a\\nb" }`);
    expect(init).toBe(`"a\\nb"`);
    expect(JSON.parse(init)).toBe("a\nb");
    expect(JSON.parse(init).length).toBe(3);
  });

  test("\\t becomes TAB", () => {
    const init = constInit(`\${ const s = "x\\ty" }`);
    expect(JSON.parse(init)).toBe("x\ty");
  });

  test("\\r becomes CR", () => {
    const init = constInit(`\${ const s = "x\\ry" }`);
    expect(JSON.parse(init)).toBe("x\ry");
  });

  test("mixed escapes all resolve", () => {
    const init = constInit(`\${ const s = "line1\\nline2\\ttabbed\\rreturn" }`);
    expect(JSON.parse(init)).toBe("line1\nline2\ttabbed\rreturn");
  });

  test("\\\\ emits as single backslash value (not doubled)", () => {
    const init = constInit(`\${ const s = "back\\\\slash" }`);
    expect(JSON.parse(init)).toBe("back\\slash");
    expect(JSON.parse(init).length).toBe(10);
  });

  test('\\" inside double-quoted source preserves the quote value', () => {
    const init = constInit(`\${ const s = "quote\\"inside" }`);
    expect(JSON.parse(init)).toBe(`quote"inside`);
  });

  test("plain string with no escapes round-trips unchanged", () => {
    const init = constInit(`\${ const s = "hello world" }`);
    expect(JSON.parse(init)).toBe("hello world");
  });

  test("empty string emits as empty", () => {
    const init = constInit(`\${ const s = "" }`);
    expect(JSON.parse(init)).toBe("");
  });

  test("single-quote source with escaped apostrophe resolves", () => {
    const init = constInit(`\${ const s = 'it\\'s fine' }`);
    expect(JSON.parse(init)).toBe("it's fine");
  });

  test("unknown escape passes through as literal backslash+char", () => {
    const init = constInit(`\${ const s = "a\\zb" }`);
    expect(JSON.parse(init)).toBe("a\\zb");
  });

  test("string in function-call arg position also correct", () => {
    const init = constInit(`\${ const s = f("x\\ny") }`);
    expect(init).toContain(`"x\\ny"`);
    expect(init).not.toContain(`"x\\\\ny"`);
  });
});
