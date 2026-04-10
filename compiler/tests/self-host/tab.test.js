import { describe, test, expect, beforeAll } from "bun:test";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// JS originals
import {
  tokenizeAttributes as jsTokenizeAttributes,
  tokenizeLogic as jsTokenizeLogic,
  tokenizeSQL as jsTokenizeSQL,
  tokenizeCSS as jsTokenizeCSS,
  tokenizeError as jsTokenizeError,
  tokenizePassthrough as jsTokenizePassthrough,
  tokenizeBlock as jsTokenizeBlock,
} from "../../src/tokenizer.js";

import { compileScrml } from "../../src/api.js";

// ---------------------------------------------------------------------------
// Compile the self-hosted tokenizer at test setup time
// ---------------------------------------------------------------------------

let scrmlMod;

beforeAll(async () => {
  const tmpDir = mkdtempSync(join(tmpdir(), "tab-parity-"));
  const scrmlFile = join(__dirname, "..", "..", "self-host", "tab.scrml");

  const result = compileScrml({
    inputFiles: [scrmlFile],
    outputDir: tmpDir,
    mode: "library",
    write: true,
    verbose: false,
    log: () => {},
  });

  if (result.errors.length > 0) {
    const msgs = result.errors.map(e => `[${e.code}] ${e.message}`).join("\n");
    throw new Error(`Failed to compile tab.scrml:\n${msgs}`);
  }

  const outputFile = join(tmpDir, "tab.js");
  scrmlMod = await import(outputFile);

  // Clean up temp dir after import (module is cached)
  // (Don't clean up — Bun may still need the file for source maps, etc.)
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip the `.block` property from BLOCK_REF tokens since the self-hosted
 * version may attach it slightly differently (object identity). We compare
 * everything else.
 */
function stripBlockRefs(tokens) {
  return tokens.map(t => {
    const { block, ...rest } = t;
    return rest;
  });
}

function assertSameTokens(jsTokens, scrmlTokens, label) {
  const a = stripBlockRefs(jsTokens);
  const b = stripBlockRefs(scrmlTokens);
  expect(b.length).toBe(a.length);
  for (let i = 0; i < a.length; i++) {
    expect(b[i]).toEqual(a[i]);
  }
}

// ---------------------------------------------------------------------------
// tokenizeAttributes — markup
// ---------------------------------------------------------------------------

describe("tokenizeAttributes parity", () => {
  const cases = [
    ["simple tag", '<div>', 0, 1, 1, "markup"],
    ["self-closing", '<br/>', 0, 1, 1, "markup"],
    ["with class string", '<div class="foo">', 0, 1, 1, "markup"],
    ["with ident value", '<div id=bar>', 0, 1, 1, "markup"],
    ["boolean attribute", '<input disabled>', 0, 1, 1, "markup"],
    ["call attribute", '<div on:click=handle()>', 0, 1, 1, "markup"],
    ["call with args", '<div on:click=handle("arg1", 2)>', 0, 1, 1, "markup"],
    ["brace-block attr", '<div props={a: 1, b: 2}>', 0, 1, 1, "markup"],
    ["if= quoted expr", '<div if="@show">', 0, 1, 1, "markup"],
    ["if= negation", '<div if=!@hidden>', 0, 1, 1, "markup"],
    ["if= paren expr", '<div if=(@state === "loading")>', 0, 1, 1, "markup"],
    ["multiple attrs", '<div class="foo" id=bar disabled>', 0, 1, 1, "markup"],
    ["at-name attr", '<input @value>', 0, 1, 1, "markup"],
    ["self-closing with attrs", '<img src="x.png" alt="test"/>', 0, 1, 1, "markup"],
    ["nested parens expr", '<div if=((@a || @b) && @c)>', 0, 1, 1, "markup"],
    ["class:active expr", '<div class:active=(@tool === "select")>', 0, 1, 1, "markup"],
  ];

  for (const [label, raw, off, ln, co, bt] of cases) {
    test(label, () => {
      const js = jsTokenizeAttributes(raw, off, ln, co, bt);
      const sh = scrmlMod.tokenizeAttributes(raw, off, ln, co, bt);
      assertSameTokens(js, sh, label);
    });
  }
});

// ---------------------------------------------------------------------------
// tokenizeAttributes — state
// ---------------------------------------------------------------------------

describe("tokenizeAttributes (state) parity", () => {
  const cases = [
    ["state block", '< counter>', 0, 1, 1, "state"],
    ["state with typed decl", '< myState count(number)>', 0, 1, 1, "state"],
    ["state with attr", '< myState value="hello">', 0, 1, 1, "state"],
    ["state with multiple", '< myState count(number) name(string)>', 0, 1, 1, "state"],
  ];

  for (const [label, raw, off, ln, co, bt] of cases) {
    test(label, () => {
      const js = jsTokenizeAttributes(raw, off, ln, co, bt);
      const sh = scrmlMod.tokenizeAttributes(raw, off, ln, co, bt);
      assertSameTokens(js, sh, label);
    });
  }
});

// ---------------------------------------------------------------------------
// tokenizeLogic
// ---------------------------------------------------------------------------

describe("tokenizeLogic parity", () => {
  const cases = [
    ["empty", "", 0, 1, 1, []],
    ["simple ident", "foo", 0, 1, 1, []],
    ["keyword", "let x = 5", 0, 1, 1, []],
    ["string double", '"hello world"', 0, 1, 1, []],
    ["string single", "'hello'", 0, 1, 1, []],
    ["string backtick", "`template`", 0, 1, 1, []],
    ["number int", "42", 0, 1, 1, []],
    ["number float", "3.14", 0, 1, 1, []],
    ["number hex", "0xFF", 0, 1, 1, []],
    ["number exp", "1e10", 0, 1, 1, []],
    ["at_ident", "@count", 0, 1, 1, []],
    ["tilde", "~", 0, 1, 1, []],
    ["line comment", "// hello\nx", 0, 1, 1, []],
    ["block comment", "/* hello */x", 0, 1, 1, []],
    ["multi-char op ===", "a === b", 0, 1, 1, []],
    ["multi-char op =>", "x => x + 1", 0, 1, 1, []],
    ["spread", "...args", 0, 1, 1, []],
    ["arrow fn", "(a, b) => a + b", 0, 1, 1, []],
    ["complex expr", 'let x = @count > 0 ? "yes" : "no"', 0, 1, 1, []],
    ["all keywords", "if else for while return let const fn lift", 0, 1, 1, []],
    ["scrml keywords", "fail transaction cleanup upload debounce throttle", 0, 1, 1, []],
    ["more keywords", "env public when changes animationFrame broadcast disconnect", 0, 1, 1, []],
    ["top-level keywords", "use using with navigate not", 0, 1, 1, []],
    ["punct chars", "()[]{},.;:!&|+-*/%^~=<>?", 0, 1, 1, []],
    ["assignment ops", "x += 1; y -= 2; z *= 3; w /= 4; m %= 5", 0, 1, 1, []],
    ["logical ops", "a && b || c ?? d", 0, 1, 1, []],
    ["comparison ops", "a == b; c != d; e <= f; g >= h", 0, 1, 1, []],
    ["power op", "a ** b", 0, 1, 1, []],
    ["nullish assign", "x ??= 5; y &&= true; z ||= false", 0, 1, 1, []],
    ["shift ops", "a << 1; b >> 2; c >>> 3", 0, 1, 1, []],
    ["range op", "1..10", 0, 1, 1, []],
    ["scope op", "Mod::func", 0, 1, 1, []],
    ["string escape", '"hello \\"world\\""', 0, 1, 1, []],
    ["multiline", "let x = 1\nlet y = 2\nlet z = x + y", 0, 1, 1, []],
    ["@ as punct", "@", 0, 1, 1, []],
    ["number binary", "0b1010", 0, 1, 1, []],
    ["number octal", "0o777", 0, 1, 1, []],
    ["class decl", "class Foo extends Bar { }", 0, 1, 1, []],
    ["async await", "async function f() { await x }", 0, 1, 1, []],
    ["dot access", "a.b.c", 0, 1, 1, []],
    ["negative exp", "1e-5", 0, 1, 1, []],
    ["underscore num", "1_000_000", 0, 1, 1, []],
  ];

  for (const [label, content, off, ln, co, children] of cases) {
    test(label, () => {
      const js = jsTokenizeLogic(content, off, ln, co, children);
      const sh = scrmlMod.tokenizeLogic(content, off, ln, co, children);
      assertSameTokens(js, sh, label);
    });
  }
});

// ---------------------------------------------------------------------------
// tokenizeLogic with BLOCK_REF children
// ---------------------------------------------------------------------------

describe("tokenizeLogic BLOCK_REF parity", () => {
  test("child block produces BLOCK_REF", () => {
    const content = 'let x = ${inner}; let y = 2';
    const child = {
      type: "logic",
      raw: "${inner}",
      span: { start: 8, end: 16, line: 1, col: 9 },
      children: [],
    };
    const js = jsTokenizeLogic(content, 0, 1, 1, [child]);
    const sh = scrmlMod.tokenizeLogic(content, 0, 1, 1, [child]);
    assertSameTokens(js, sh, "block_ref");
  });

  test("non-brace child types are ignored", () => {
    const content = "hello world";
    const child = {
      type: "text",
      raw: "hello",
      span: { start: 0, end: 5, line: 1, col: 1 },
      children: [],
    };
    const js = jsTokenizeLogic(content, 0, 1, 1, [child]);
    const sh = scrmlMod.tokenizeLogic(content, 0, 1, 1, [child]);
    assertSameTokens(js, sh, "text child ignored");
  });
});

// ---------------------------------------------------------------------------
// tokenizeSQL
// ---------------------------------------------------------------------------

describe("tokenizeSQL parity", () => {
  const cases = [
    ["backtick query", "`SELECT * FROM users`", 0, 1, 1],
    ["raw fallback", "SELECT 1", 0, 1, 1],
    ["whitespace before backtick", "  `INSERT INTO t VALUES (1)`", 0, 1, 1],
    ["empty backtick", "``", 0, 1, 1],
    ["multiline query", "`SELECT *\nFROM users\nWHERE id = 1`", 0, 1, 1],
  ];

  for (const [label, content, off, ln, co] of cases) {
    test(label, () => {
      const js = jsTokenizeSQL(content, off, ln, co);
      const sh = scrmlMod.tokenizeSQL(content, off, ln, co);
      assertSameTokens(js, sh, label);
    });
  }
});

// ---------------------------------------------------------------------------
// tokenizeCSS
// ---------------------------------------------------------------------------

describe("tokenizeCSS parity", () => {
  const cases = [
    ["simple property", "color: red;", 0, 1, 1],
    ["multiple properties", "color: red; font-size: 14px;", 0, 1, 1],
    ["class selector", ".foo { color: blue; }", 0, 1, 1],
    ["id selector", "#bar { margin: 0; }", 0, 1, 1],
    ["element selector", "body { padding: 0; }", 0, 1, 1],
    ["universal selector", "* { box-sizing: border-box; }", 0, 1, 1],
    ["custom property", "--main-color: #333;", 0, 1, 1],
    ["comment", "/* hello */ color: red;", 0, 1, 1],
    ["nested selector", ".parent > .child { display: flex; }", 0, 1, 1],
    ["multiple selectors", ".a, .b { color: green; }", 0, 1, 1],
    ["property no semi", "color: red", 0, 1, 1],
    ["attribute selector", "[data-x] { opacity: 1; }", 0, 1, 1],
    ["pseudo selector", "~:hover { color: blue; }", 0, 1, 1],
  ];

  for (const [label, content, off, ln, co] of cases) {
    test(label, () => {
      const js = jsTokenizeCSS(content, off, ln, co);
      const sh = scrmlMod.tokenizeCSS(content, off, ln, co);
      assertSameTokens(js, sh, label);
    });
  }
});

// ---------------------------------------------------------------------------
// tokenizeError
// ---------------------------------------------------------------------------

describe("tokenizeError parity", () => {
  const cases = [
    ["simple match arm", '| ::NotFound e -> "not found"', 0, 1, 1],
    ["multiple arms", '| ::NotFound e -> "nf"\n| ::Timeout e -> "to"', 0, 1, 1],
    ["empty", "", 0, 1, 1],
  ];

  for (const [label, content, off, ln, co] of cases) {
    test(label, () => {
      const js = jsTokenizeError(content, off, ln, co);
      const sh = scrmlMod.tokenizeError(content, off, ln, co);
      assertSameTokens(js, sh, label);
    });
  }
});

// ---------------------------------------------------------------------------
// tokenizePassthrough
// ---------------------------------------------------------------------------

describe("tokenizePassthrough parity", () => {
  test("text block", () => {
    const js = jsTokenizePassthrough("text", "hello world", 0, 1, 1);
    const sh = scrmlMod.tokenizePassthrough("text", "hello world", 0, 1, 1);
    assertSameTokens(js, sh, "text");
  });

  test("comment block", () => {
    const js = jsTokenizePassthrough("comment", "// a comment\n", 0, 1, 1);
    const sh = scrmlMod.tokenizePassthrough("comment", "// a comment\n", 0, 1, 1);
    assertSameTokens(js, sh, "comment");
  });

  test("empty text", () => {
    const js = jsTokenizePassthrough("text", "", 0, 1, 1);
    const sh = scrmlMod.tokenizePassthrough("text", "", 0, 1, 1);
    assertSameTokens(js, sh, "empty text");
  });
});

// ---------------------------------------------------------------------------
// tokenizeBlock — full dispatcher
// ---------------------------------------------------------------------------

describe("tokenizeBlock parity", () => {
  test("markup block", () => {
    const block = {
      type: "markup",
      raw: '<div class="foo">',
      span: { start: 0, end: 17, line: 1, col: 1 },
      children: [],
    };
    const js = jsTokenizeBlock(block, "test.scrml");
    const sh = scrmlMod.tokenizeBlock(block, "test.scrml");
    assertSameTokens(js, sh, "markup block");
  });

  test("state block", () => {
    const block = {
      type: "state",
      raw: '< counter count(number)>',
      span: { start: 0, end: 24, line: 1, col: 1 },
      children: [],
    };
    const js = jsTokenizeBlock(block, "test.scrml");
    const sh = scrmlMod.tokenizeBlock(block, "test.scrml");
    assertSameTokens(js, sh, "state block");
  });

  test("logic block", () => {
    const block = {
      type: "logic",
      raw: '${let x = 1}',
      span: { start: 0, end: 12, line: 1, col: 1 },
      children: [],
    };
    const js = jsTokenizeBlock(block, "test.scrml");
    const sh = scrmlMod.tokenizeBlock(block, "test.scrml");
    assertSameTokens(js, sh, "logic block");
  });

  test("meta block", () => {
    const block = {
      type: "meta",
      raw: '^{import x from "y"}',
      span: { start: 0, end: 20, line: 1, col: 1 },
      children: [],
    };
    const js = jsTokenizeBlock(block, "test.scrml");
    const sh = scrmlMod.tokenizeBlock(block, "test.scrml");
    assertSameTokens(js, sh, "meta block");
  });

  test("sql block", () => {
    const block = {
      type: "sql",
      raw: '?{`SELECT 1`}',
      span: { start: 0, end: 13, line: 1, col: 1 },
      children: [],
    };
    const js = jsTokenizeBlock(block, "test.scrml");
    const sh = scrmlMod.tokenizeBlock(block, "test.scrml");
    assertSameTokens(js, sh, "sql block");
  });

  test("css block", () => {
    const block = {
      type: "css",
      raw: '#{color: red;}',
      span: { start: 0, end: 14, line: 1, col: 1 },
      children: [],
    };
    const js = jsTokenizeBlock(block, "test.scrml");
    const sh = scrmlMod.tokenizeBlock(block, "test.scrml");
    assertSameTokens(js, sh, "css block");
  });

  test("error-effect block", () => {
    const block = {
      type: "error-effect",
      raw: '!{| ::Err e -> x}',
      span: { start: 0, end: 17, line: 1, col: 1 },
      children: [],
    };
    const js = jsTokenizeBlock(block, "test.scrml");
    const sh = scrmlMod.tokenizeBlock(block, "test.scrml");
    assertSameTokens(js, sh, "error-effect block");
  });

  test("test block", () => {
    const block = {
      type: "test",
      raw: '~{"mytest" { assert(true) }}',
      span: { start: 0, end: 28, line: 1, col: 1 },
      children: [],
    };
    const js = jsTokenizeBlock(block, "test.scrml");
    const sh = scrmlMod.tokenizeBlock(block, "test.scrml");
    assertSameTokens(js, sh, "test block");
  });

  test("text block", () => {
    const block = {
      type: "text",
      raw: "some text content",
      span: { start: 0, end: 17, line: 1, col: 1 },
      children: [],
    };
    const js = jsTokenizeBlock(block, "test.scrml");
    const sh = scrmlMod.tokenizeBlock(block, "test.scrml");
    assertSameTokens(js, sh, "text block");
  });

  test("comment block", () => {
    const block = {
      type: "comment",
      raw: "// a comment\n",
      span: { start: 0, end: 13, line: 1, col: 1 },
      children: [],
    };
    const js = jsTokenizeBlock(block, "test.scrml");
    const sh = scrmlMod.tokenizeBlock(block, "test.scrml");
    assertSameTokens(js, sh, "comment block");
  });

  test("unknown block type", () => {
    const block = {
      type: "unknown",
      raw: "???",
      span: { start: 0, end: 3, line: 1, col: 1 },
      children: [],
    };
    const js = jsTokenizeBlock(block, "test.scrml");
    const sh = scrmlMod.tokenizeBlock(block, "test.scrml");
    assertSameTokens(js, sh, "unknown block type");
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("edge cases", () => {
  test("tokenizeLogic: empty string produces only EOF", () => {
    const js = jsTokenizeLogic("", 0, 1, 1, []);
    const sh = scrmlMod.tokenizeLogic("", 0, 1, 1, []);
    assertSameTokens(js, sh, "empty logic");
    expect(js).toHaveLength(1);
    expect(js[0].kind).toBe("EOF");
  });

  test("tokenizeLogic: only whitespace", () => {
    const js = jsTokenizeLogic("   \n\t  ", 0, 1, 1, []);
    const sh = scrmlMod.tokenizeLogic("   \n\t  ", 0, 1, 1, []);
    assertSameTokens(js, sh, "whitespace only");
  });

  test("tokenizeLogic: with non-zero base offset", () => {
    const js = jsTokenizeLogic("let x = 1", 100, 5, 10, []);
    const sh = scrmlMod.tokenizeLogic("let x = 1", 100, 5, 10, []);
    assertSameTokens(js, sh, "non-zero offset");
    // Verify offsets are shifted
    expect(js[0].span.start).toBe(100);
    expect(js[0].span.line).toBe(5);
  });

  test("tokenizeAttributes: component tag (uppercase)", () => {
    const raw = '<MyComponent prop="val"/>';
    const js = jsTokenizeAttributes(raw, 0, 1, 1, "markup");
    const sh = scrmlMod.tokenizeAttributes(raw, 0, 1, 1, "markup");
    assertSameTokens(js, sh, "component tag");
  });

  test("tokenizeCSS: empty content", () => {
    const js = jsTokenizeCSS("", 0, 1, 1);
    const sh = scrmlMod.tokenizeCSS("", 0, 1, 1);
    assertSameTokens(js, sh, "empty css");
  });

  test("tokenizeSQL: empty content", () => {
    const js = jsTokenizeSQL("", 0, 1, 1);
    const sh = scrmlMod.tokenizeSQL("", 0, 1, 1);
    assertSameTokens(js, sh, "empty sql");
  });

  test("tokenizeLogic: string with escape sequences", () => {
    const content = '"hello\\nworld\\t\\\\"';
    const js = jsTokenizeLogic(content, 0, 1, 1, []);
    const sh = scrmlMod.tokenizeLogic(content, 0, 1, 1, []);
    assertSameTokens(js, sh, "escape sequences");
  });

  test("tokenizeLogic: consecutive operators", () => {
    const content = "a !== b && c === d";
    const js = jsTokenizeLogic(content, 0, 1, 1, []);
    const sh = scrmlMod.tokenizeLogic(content, 0, 1, 1, []);
    assertSameTokens(js, sh, "consecutive ops");
  });

  test("tokenizeLogic: dot-starting number", () => {
    const content = ".5";
    const js = jsTokenizeLogic(content, 0, 1, 1, []);
    const sh = scrmlMod.tokenizeLogic(content, 0, 1, 1, []);
    assertSameTokens(js, sh, "dot number");
  });
});
