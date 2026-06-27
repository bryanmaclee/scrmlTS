/**
 * g-unary-of-exponent-arg-no-paren (ss50 item 2) — a prefix unary APPLIED TO a
 * `**` expression MUST parenthesize that argument, or the re-serialized JS is a
 * SyntaxError.
 *
 * JS grammar (ExponentiationExpression):
 *     UnaryExpression
 *   | UpdateExpression ** ExponentiationExpression
 * An un-parenthesized UnaryExpression may NOT be the base of `**`. So
 * `Unary(-, Binary(**, 2, 3))` — source `-(2 ** 3)` — may NOT serialize flat as
 * `-2 ** 3`: `node --check` rejects it ("Unary operator used immediately before
 * exponentiation expression. Parenthesis must be used to disambiguate"). The
 * restriction holds for EVERY prefix unary operator (`-`, `+`, `~`, `!`,
 * `typeof`, `void`, …), so the wrap is unconditional on the operator.
 *
 * THE BUG (this fix): scrml drops the author's parens (acorn parses without
 * `preserveParens`), so codegen receives the bare AST and emitUnary re-emitted
 * the flat `-2 ** 3` — INVALID JS shipped SILENTLY (compile exit-0, but
 * `node --check` / acorn reject the artifact). The fix wraps the `**` argument
 * of a prefix unary: `-(2 ** 3)`.
 *
 * This is the OPERAND-side sibling of g-unary-left-of-exponent-no-paren (ss21,
 * see g-unary-left-of-exponent-paren.test.js), which handles the INVERSE
 * direction — a unary as the LEFT OPERAND of `**` (`(-2) ** 3`). Both guards
 * coexist; this suite asserts the ss21 inverse is unaffected.
 *
 * §1  emit-expr.ts printer — exact emit + acorn validity + runtime value.
 * §2  every prefix unary operator wraps a `**` argument.
 * §3  NO-REGRESSION — the ss21 inverse + sibling shapes gain no spurious parens.
 * §4  end-to-end — `-(2 ** 3)` through a real compile emits valid JS.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import * as acorn from "acorn";
import { emitExpr } from "../../src/codegen/emit-expr.ts";
import { compileScrml } from "../../src/api.js";

// ---------------------------------------------------------------------------
// AST builders (minimal — span is unused by the emit path).
// ---------------------------------------------------------------------------
const SPAN = { start: 0, end: 0 };
const num = (raw) => ({ kind: "lit", litType: "number", raw, span: SPAN });
const id = (name) => ({ kind: "ident", name, span: SPAN });
const bin = (op, left, right) => ({ kind: "binary", op, left, right, span: SPAN });
const un = (op, argument, prefix = true) => ({ kind: "unary", op, argument, prefix, span: SPAN });

const CTX = { mode: "client" };
const emit = (node) => emitExpr(node, CTX);

// `node --check`-faithful validity probe (acorn is the compiler's own dep).
const isValidJs = (js) => {
  try { acorn.parse(`let __r = ${js};`, { ecmaVersion: 2022 }); return true; }
  catch { return false; }
};

// ---------------------------------------------------------------------------
// §1 — emit-expr.ts printer
// ---------------------------------------------------------------------------
describe("g-unary-of-exp §1: emit-expr.ts wraps a `**` argument of a prefix unary", () => {
  test("-(2 ** 3) → -(2 ** 3), valid, === -8", () => {
    const out = emit(un("-", bin("**", num("2"), num("3"))));
    expect(out).toBe("-(2 ** 3)");
    expect(isValidJs(out)).toBe(true);
    expect(eval(out)).toBe(-8);
  });

  test("-(a ** b) → -(a ** b), valid, === -8 (a=2,b=3)", () => {
    const out = emit(un("-", bin("**", id("a"), id("b"))));
    expect(out).toBe("-(a ** b)");
    expect(isValidJs(out)).toBe(true);
    expect(eval("-(2 ** 3)")).toBe(-8);
  });

  test("right operand of the ** is itself unary: -(2 ** -3) → -(2 ** -3), === -0.125", () => {
    const out = emit(un("-", bin("**", num("2"), un("-", num("3")))));
    expect(out).toBe("-(2 ** -3)");
    expect(isValidJs(out)).toBe(true);
    expect(eval(out)).toBe(-0.125);
  });

  test("chained: -(-(2 ** 3)) → - -(2 ** 3) (B3 space-split), valid, === 8", () => {
    // Outer Unary(-, Unary(-, Binary(**))). The INNER unary wraps its `**` arg →
    // `-(2 ** 3)`; the OUTER unary's arg now starts with `-`, so the B3 guard
    // inserts a space (`- -(2 ** 3)`) so the stacked minus does NOT fuse into the
    // `--` pre-decrement token.
    const out = emit(un("-", un("-", bin("**", num("2"), num("3")))));
    expect(out).toBe("- -(2 ** 3)");
    expect(isValidJs(out)).toBe(true);
    expect(eval(out)).toBe(8);
  });

  test("mixed precedence: -(2 ** 3) + 1 → -(2 ** 3) + 1, valid, === -7", () => {
    const out = emit(bin("+", un("-", bin("**", num("2"), num("3"))), num("1")));
    expect(out).toBe("-(2 ** 3) + 1");
    expect(isValidJs(out)).toBe(true);
    expect(eval(out)).toBe(-7);
  });

  test("unary operand of `*`: 2 * -(2 ** 3) → 2 * -(2 ** 3), valid, === -16", () => {
    const out = emit(bin("*", num("2"), un("-", bin("**", num("2"), num("3")))));
    expect(out).toBe("2 * -(2 ** 3)");
    expect(isValidJs(out)).toBe(true);
    expect(eval(out)).toBe(-16);
  });
});

// ---------------------------------------------------------------------------
// §2 — every prefix unary operator wraps a `**` argument (all are SyntaxErrors
//      bare). Excludes the postfix / `++`/`--` update branch.
// ---------------------------------------------------------------------------
describe("g-unary-of-exp §2: every prefix unary operator wraps a `**` argument", () => {
  test("~(2 ** 3) → ~(2 ** 3), valid, === -9", () => {
    const out = emit(un("~", bin("**", num("2"), num("3"))));
    expect(out).toBe("~(2 ** 3)");
    expect(isValidJs(out)).toBe(true);
    expect(eval(out)).toBe(-9);
  });

  test("!(2 ** 3) → !(2 ** 3), valid, === false", () => {
    const out = emit(un("!", bin("**", num("2"), num("3"))));
    expect(out).toBe("!(2 ** 3)");
    expect(isValidJs(out)).toBe(true);
    expect(eval(out)).toBe(false);
  });

  test("+(2 ** 3) → +(2 ** 3), valid, === 8", () => {
    const out = emit(un("+", bin("**", num("2"), num("3"))));
    expect(out).toBe("+(2 ** 3)");
    expect(isValidJs(out)).toBe(true);
    expect(eval(out)).toBe(8);
  });

  test("typeof (2 ** 3) → typeof (2 ** 3) (space kept), valid, === 'number'", () => {
    const out = emit(un("typeof", bin("**", num("2"), num("3"))));
    expect(out).toBe("typeof (2 ** 3)");
    expect(isValidJs(out)).toBe(true);
    expect(eval(out)).toBe("number");
  });

  test("void (2 ** 3) → void (2 ** 3) (space kept), valid, === undefined", () => {
    const out = emit(un("void", bin("**", num("2"), num("3"))));
    expect(out).toBe("void (2 ** 3)");
    expect(isValidJs(out)).toBe(true);
    expect(eval(out)).toBe(undefined);
  });
});

// ---------------------------------------------------------------------------
// §3 — NO-REGRESSION: the ss21 inverse + sibling shapes gain NO spurious parens
// ---------------------------------------------------------------------------
describe("g-unary-of-exp §3: sibling / inverse shapes are NOT over-parenthesized", () => {
  test("ss21 inverse intact: (-2) ** 3 stays (-2) ** 3, valid, === -8", () => {
    const out = emit(bin("**", un("-", num("2")), num("3")));
    expect(out).toBe("(-2) ** 3");
    expect(isValidJs(out)).toBe(true);
    expect(eval(out)).toBe(-8);
  });

  test("both operands unary: (-2) ** (-2) → (-2) ** -2 (left wrapped, right bare), === 0.25", () => {
    const out = emit(bin("**", un("-", num("2")), un("-", num("2"))));
    expect(out).toBe("(-2) ** -2");
    expect(isValidJs(out)).toBe(true);
    expect(eval(out)).toBe(0.25);
  });

  test("non-`**` argument NOT wrapped: -a stays -a", () => {
    expect(emit(un("-", id("a")))).toBe("-a");
  });

  test("unary of `*` argument NOT wrapped (pre-existing, multiplicative negation distributes): -2 * 3", () => {
    // `*` argument is a separate, pre-existing shape; the ss50 fix targets ONLY
    // `**`. (Negation distributes over `*`, so `-2 * 3 === -(2 * 3)` regardless.)
    expect(emit(un("-", bin("*", num("2"), num("3"))))).toBe("-2 * 3");
  });

  test("right unary operand of `**` stays bare: a ** -b → a ** -b (JS allows `2 ** -1`)", () => {
    const out = emit(bin("**", id("a"), un("-", id("b"))));
    expect(out).toBe("a ** -b");
    expect(isValidJs(out)).toBe(true);
    expect(eval("2 ** -3")).toBe(0.125);
  });

  test("unary right operand of a flat binary stays flat: a + -b", () => {
    expect(emit(bin("+", id("a"), un("-", id("b"))))).toBe("a + -b");
  });
});

// ---------------------------------------------------------------------------
// §4 — end-to-end: `-(2 ** 3)` through a real compile emits valid JS
// ---------------------------------------------------------------------------
let TMP;
beforeAll(() => { TMP = mkdtempSync(join(tmpdir(), "gunaryofexp-")); });
afterAll(() => { if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true }); });

function compileSource(name, source) {
  const filePath = join(TMP, name);
  writeFileSync(filePath, source);
  return compileScrml({ inputFiles: [filePath], outputDir: join(TMP, "dist"), write: false, log: () => {} });
}
function clientJsFor(result, srcName) {
  for (const [filePath, out] of result.outputs) {
    if (filePath.endsWith(srcName) && typeof out.clientJs === "string") return out.clientJs;
  }
  return undefined;
}
const clientValid = (js) => {
  try { acorn.parse(js, { ecmaVersion: 2022, sourceType: "module" }); return true; }
  catch { return false; }
};

describe("g-unary-of-exp §4: end-to-end compile of -(2 ** 3) emits valid JS", () => {
  test("structural decl `<r> = -(2 ** 3)` — parens preserved, valid JS", () => {
    const src = `<program>\n\n<r> = -(2 ** 3)\n\n<div>\${@r}</div>\n\n</program>`;
    const result = compileSource("arg-decl.scrml", src);
    const client = clientJsFor(result, "arg-decl.scrml");
    expect(typeof client).toBe("string");
    expect(clientValid(client)).toBe(true);
    expect(client).toContain("-(2 ** 3)");
    // Regression guard: the flat (invalid) `-2 ** 3` must NOT appear.
    expect(client).not.toMatch(/-2 \*\* 3/);
  });

  test("control-flow condition `if (-(2 ** 3) < 0)` — valid JS", () => {
    const src = `<program>\n\n<a> = 1\n\${ if (-(2 ** 3) < 0) { @a = 2 } }\n\n<div>\${@a}</div>\n\n</program>`;
    const result = compileSource("arg-cond.scrml", src);
    const client = clientJsFor(result, "arg-cond.scrml");
    expect(typeof client).toBe("string");
    expect(clientValid(client)).toBe(true);
    expect(client).toContain("-(2 ** 3)");
  });
});
