/**
 * switch-in-expression-body — S99 follow-on dispatch regression suite
 * (closes the FOLLOW-UP gap pinned by A7 in
 * ast-builder-switch-forbidden-bypass.test.js).
 *
 * Gap (residual after S99 A7): the post-parse `collectForbiddenSwitches`
 * walker added by A7 catches every `switch-stmt` AST node, regardless of
 * which parser path produced it. But several attribute-body consumption
 * paths feed raw `${...}` (or `{...}`) text directly into acorn's
 * `parseExpression` — when the first depth-0 keyword is `switch`, acorn
 * rejects it as not-an-expression and returns an `escape-hatch` ExprNode
 * with `nativeKind: "ParseError"`. NO `switch-stmt` AST node ever lands,
 * so the walker has nothing to walk.
 *
 * Fix: a structural text scanner (`findForbiddenSwitchInRaw` in
 * ast-builder.js) wired into each consumption boundary:
 *   - parseAttributes ATTR_EXPR branch (inline `${...}` / `(...)` / `!...` /
 *     `"..."` / unquoted attribute values)
 *   - parseAttributes ATTR_BLOCK non-props branch (`{...}` brace-block values)
 *   - _parseLiftAttrValue BLOCK_REF branch (`${...}` inside lift markup attrs)
 *
 * Composition with A7's walker: structurally safe by construction. The
 * walker fires only for switch-stmt AST nodes; acorn cannot produce one in
 * expression position. The two fire-site spaces are disjoint.
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

function parse(src) {
  const filePath = "/test/fixture.scrml";
  const bs = splitBlocks(filePath, src);
  return buildAST(bs);
}

function switchErrors(result) {
  return (result.errors || []).filter(e => e.code === "E-SWITCH-FORBIDDEN");
}

describe("E-SWITCH-FORBIDDEN — attribute-body consumption-path coverage", () => {
  test("switch in inline event-handler ${ ... } fires (the canonical bypass)", () => {
    const r = parse(
      `<program>\n<button onclick=\${ switch (1) { case 1: @x = 1; break; } }>x</button>\n</program>`,
    );
    expect(switchErrors(r).length).toBe(1);
  });

  test("switch in bind:value=${ ... } body fires", () => {
    const r = parse(
      `<program>\n\${ <count> = 0 }\n<input bind:value=\${ switch (1) { case 1: lift 1 } }/>\n</program>`,
    );
    expect(switchErrors(r).length).toBe(1);
  });

  test("switch in class:active=${ ... } body fires", () => {
    const r = parse(
      `<program>\n<div class:active=\${ switch (1) { case 1: lift true } }>x</div>\n</program>`,
    );
    expect(switchErrors(r).length).toBe(1);
  });

  test("switch in if= attribute (quoted string body) fires", () => {
    // `if=` quoted strings produce ATTR_EXPR tokens (tokenizer L389-395).
    // A `switch` keyword inside a quoted if= value is still in expression
    // position — it should fire.
    const r = parse(
      `<program>\n<div if="switch">x</div>\n</program>`,
    );
    // Note: `switch` here is a bare keyword inside the quoted-string-as-expr
    // value. acorn would reject it. Detector fires.
    expect(switchErrors(r).length).toBe(1);
  });

  test("switch in {...} brace-block attribute (event-handler shape) fires", () => {
    // ATTR_BLOCK non-props path: `attr={...}` snippet/event-handler form.
    // Hits the §14.9 non-props ATTR_BLOCK branch in parseAttributes.
    const r = parse(
      `<program>\n<button onclick={ switch (1) { case 1: lift 1 } }>x</button>\n</program>`,
    );
    expect(switchErrors(r).length).toBe(1);
  });

  test("switch as property name (`obj.switch = 1`) does NOT fire", () => {
    // SPEC §17 forbids the `switch` STATEMENT keyword, not the string
    // appearing as a property name. JS treats `obj.switch` as a property
    // access (reserved-word-as-property is legal in modern JS). The
    // detector must respect the `.` prefix and not fire.
    const r = parse(
      `<program>\n\${ <obj> = { switch_: 0 }\n function f() { @obj.switch = 1 } }\n<button onclick=f()>x</button>\n</program>`,
    );
    // The state-decl shape `<obj> = { switch_: 0 }` is a logic-block decl
    // (not an attribute body). The function body references `@obj.switch`
    // — `.switch` is property-access and must not fire.
    expect(switchErrors(r).length).toBe(0);
  });

  test("switch inside a quoted string in an attribute body does NOT fire", () => {
    // String content `"foo switch bar"` mentions the word `switch` but as
    // string data, not as a keyword. Scanner skips string content.
    const r = parse(
      `<program>\n<button onclick=\${ log("contains switch keyword") }>x</button>\n</program>`,
    );
    expect(switchErrors(r).length).toBe(0);
  });

  test("switch inside a // line comment in an attribute body does NOT fire", () => {
    const r = parse(
      `<program>\n<button onclick=\${ /* nothing */\n  // switch reminder\n  doStuff() }>x</button>\n</program>`,
    );
    expect(switchErrors(r).length).toBe(0);
  });

  test("switch inside a /* block comment */ in an attribute body does NOT fire", () => {
    const r = parse(
      `<program>\n<button onclick=\${ /* should we switch here? */ doStuff() }>x</button>\n</program>`,
    );
    expect(switchErrors(r).length).toBe(0);
  });

  test("switch inside a template literal `\\`...switch...\\`` does NOT fire (string content)", () => {
    // Template-literal string content (between backticks, NOT in `${}`)
    // is data, not keyword position. Detector treats backtick regions as
    // strings.
    const r = parse(
      "<program>\n<button onclick=${ log(`pls switch`) }>x</button>\n</program>",
    );
    expect(switchErrors(r).length).toBe(0);
  });

  test("nested markup inside attribute body — switch in inner ${} fires", () => {
    // Markup-as-value (the load-bearing pillar) — `<button title=${ <span>${ switch ... }</span> }>`.
    // The inner `${...}` is a logic block embedded inside a lift-markup value.
    // The lift parser's _parseLiftAttrValue handles BLOCK_REF for nested
    // markup attributes (the third wire site).
    const r = parse(
      `<program>\n\${ const <badge> = <span title=\${ switch (1) { case 1: lift "a" } }>x</span> }\n<badge/>\n</program>`,
    );
    expect(switchErrors(r).length).toBe(1);
  });

  test("multiple switches in same attribute body — one error each", () => {
    const r = parse(
      `<program>\n<button onclick=\${ switch (a) { case 1: lift 1 }; switch (b) { case 2: lift 2 } }>x</button>\n</program>`,
    );
    expect(switchErrors(r).length).toBe(2);
  });

  test("switches in two distinct attributes — one error each", () => {
    const r = parse(
      `<program>\n<button onclick=\${ switch (a) { case 1: lift 1 } } title=\${ switch (b) { case 2: lift 2 } }>x</button>\n</program>`,
    );
    expect(switchErrors(r).length).toBe(2);
  });

  test("dedup: switch in same source switch via attribute body fires exactly once", () => {
    // The structural-emit path and A7's walker MUST NOT both fire for the
    // same `switch` keyword. By construction, acorn rejects `switch` in
    // expression position so no switch-stmt AST node is produced — the
    // walker can never fire on this path. This test guards that invariant.
    const r = parse(
      `<program>\n<button onclick=\${ switch (a) { case 1: @x = 1; break; } }>x</button>\n</program>`,
    );
    expect(switchErrors(r).length).toBe(1);
  });

  test("composition with named-handler switch — both fire (one per switch)", () => {
    // Function-decl handler with switch in body — A7's walker catches it
    // (the body is parsed as a real function-decl, producing a switch-stmt
    // AST node). Attribute body with switch in expression — the new
    // detector catches it. Two distinct switches, two errors.
    const r = parse(
      `<program>\n\${ function clickHandler() { switch (x) { case 1: lift 1 } } }<button onclick=\${ switch (y) { case 1: lift 2 } }>x</button>\n</program>`,
    );
    expect(switchErrors(r).length).toBe(2);
  });

  test("switch in `(...)` parenthesized attribute body fires", () => {
    // ATTR_EXPR `(...)` shape — tokenizer wraps `(expr)` into ATTR_EXPR
    // with the parens preserved in the text.
    const r = parse(
      `<program>\n<div if=(switch)>x</div>\n</program>`,
    );
    // `(switch)` — bare `switch` in expression position. Detector fires.
    expect(switchErrors(r).length).toBe(1);
  });

  test("identifier containing `switch` as substring does NOT fire (`switchable`)", () => {
    const r = parse(
      `<program>\n\${ <switchable> = true }\n<div if=@switchable>x</div>\n</program>`,
    );
    // `switchable` shares a prefix with `switch` but is NOT the keyword.
    expect(switchErrors(r).length).toBe(0);
  });
});
