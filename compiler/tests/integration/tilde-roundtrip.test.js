/**
 * Regression test — `~` (tilde accumulator) parseExprToNode/emitStringFromTree round-trip.
 *
 * SPEC §32 ratifies `~` as the implicit pipeline accumulator, represented in the
 * AST as `IdentExpr { name: "~" }`. The corpus-invariant test
 * (`expr-node-corpus-invariant.test.js`) asserts the idempotency invariant:
 *
 *   deepEqualExprNode(node, parseExprToNode(emitStringFromTree(node)))
 *
 * for every example file. Once example 16 / 24 begin using `~`, this invariant
 * must hold for ExprNodes containing the accumulator ident.
 *
 * Pre-fix bug: `parseExprToNode` only applied the `~ → __scrml_tilde__` placeholder
 * preprocessing when called with explicit `{ tildeActive: true }`. The corpus
 * invariant test re-parses emitted strings without that flag, so any bare `~` in
 * the emit output was passed verbatim to acorn, which fails to parse `~` as a JS
 * bitwise-NOT (no operand) and the whole expression escape-hatched to a ParseError.
 *
 * Fix (`compiler/src/expression-parser.ts` ~line 825): the placeholder regex is
 * precisely tuned `(?<![A-Za-z0-9_$])~(?![A-Za-z0-9_$])` to match ONLY bare `~`
 * (not adjacent to identifier chars). Bitwise-NOT forms `~x` / `~5` / `~obj.field`
 * have ident or digit immediately after `~` and so are NOT matched. The match is
 * therefore the structural disambiguator: a matched `~` IS the accumulator.
 *
 * This test pins the round-trip stability for:
 *   - bare `~` in primary position
 *   - `~` as call-argument (the corpus failure shape: `ContactsState.Ready(~)`)
 *   - `~` nested deeper (member-chain, multi-arg, nested call)
 *   - `~` in expression positions other than args (binary, ternary, array)
 *
 * Also verifies that bitwise-NOT round-trips remain stable (no regression):
 *   - `~x`, `~5`, `~obj.field`, `~arr[0]` all parse as UnaryExpr and round-trip.
 *
 * @see docs/changes/tilde-codegen/ROUND-TRIP-SURVEY.md
 * @see compiler/tests/integration/expr-node-corpus-invariant.test.js
 */

import { describe, expect, test } from "bun:test";
import {
  parseExprToNode,
  emitStringFromTree,
  deepEqualExprNode,
} from "../../src/expression-parser.ts";

/**
 * Round-trip assert: parse(src) → emit → parse → deepEqual to first parse.
 * Both parses pass `{ tildeActive: true }` to the FIRST call (mimicking the
 * ast-builder's actual call site under a value-lift), and the SECOND call
 * deliberately omits the flag (mimicking the corpus-invariant test's re-parse).
 */
function assertRoundTripStable(src, label = src) {
  const parsed1 = parseExprToNode(src, "test.scrml", 0, { tildeActive: true });
  const emitted = emitStringFromTree(parsed1);
  const parsed2 = parseExprToNode(emitted, "test.scrml", 0);
  const equal = deepEqualExprNode(parsed1, parsed2);
  if (!equal) {
    throw new Error(
      `round-trip NOT stable for ${label}\n` +
        `  emitted:  ${JSON.stringify(emitted)}\n` +
        `  parsed1.kind: ${parsed1.kind}\n` +
        `  parsed2.kind: ${parsed2.kind}`,
    );
  }
  return { parsed1, emitted, parsed2 };
}

describe("`~` accumulator — parseExprToNode/emitStringFromTree round-trip", () => {
  test("bare `~` standalone produces IdentExpr that round-trips", () => {
    const { parsed1, emitted } = assertRoundTripStable("~");
    expect(parsed1.kind).toBe("ident");
    expect(parsed1.name).toBe("~");
    expect(emitted).toBe("~");
  });

  test("`~` in call-argument position: func(~)", () => {
    const { parsed1, emitted } = assertRoundTripStable("func(~)");
    expect(parsed1.kind).toBe("call");
    expect(parsed1.args[0].kind).toBe("ident");
    expect(parsed1.args[0].name).toBe("~");
    expect(emitted).toBe("func(~)");
  });

  test("`~` in member-call argument: obj.method(~)", () => {
    const { parsed1, emitted } = assertRoundTripStable("obj.method(~)");
    expect(parsed1.kind).toBe("call");
    expect(parsed1.callee.kind).toBe("member");
    expect(parsed1.args[0].name).toBe("~");
    expect(emitted).toBe("obj.method(~)");
  });

  test("`~` as enum-variant payload: ContactsState.Ready(~) (the corpus failure shape)", () => {
    const { parsed1, emitted } = assertRoundTripStable("ContactsState.Ready(~)");
    expect(parsed1.kind).toBe("call");
    expect(parsed1.callee.kind).toBe("member");
    expect(parsed1.callee.property).toBe("Ready");
    expect(parsed1.args[0].name).toBe("~");
    expect(emitted).toBe("ContactsState.Ready(~)");
  });

  test("`~` as one of multiple call args: f(a, ~, b)", () => {
    const { parsed1, emitted } = assertRoundTripStable("f(a, ~, b)");
    expect(parsed1.kind).toBe("call");
    expect(parsed1.args.length).toBe(3);
    expect(parsed1.args[1].kind).toBe("ident");
    expect(parsed1.args[1].name).toBe("~");
    expect(emitted).toBe("f(a, ~, b)");
  });

  test("`~` nested in inner call: outer(inner(~))", () => {
    const { parsed1, emitted } = assertRoundTripStable("outer(inner(~))");
    expect(parsed1.kind).toBe("call");
    expect(parsed1.args[0].kind).toBe("call");
    expect(parsed1.args[0].args[0].name).toBe("~");
    expect(emitted).toBe("outer(inner(~))");
  });

  test("`~` in binary expression: ~ + 1", () => {
    const { parsed1, emitted } = assertRoundTripStable("~ + 1");
    expect(parsed1.kind).toBe("binary");
    expect(parsed1.op).toBe("+");
    expect(parsed1.left.kind).toBe("ident");
    expect(parsed1.left.name).toBe("~");
    expect(emitted).toBe("~ + 1");
  });

  test("`~` in ternary: cond ? ~ : 0", () => {
    const { parsed1 } = assertRoundTripStable("cond ? ~ : 0");
    expect(parsed1.kind).toBe("ternary");
    expect(parsed1.consequent.kind).toBe("ident");
    expect(parsed1.consequent.name).toBe("~");
  });

  test("`~` in array literal: [~, 1, 2]", () => {
    const { parsed1 } = assertRoundTripStable("[~, 1, 2]");
    expect(parsed1.kind).toBe("array");
    expect(parsed1.elements[0].kind).toBe("ident");
    expect(parsed1.elements[0].name).toBe("~");
  });

  test("`~` as object property value: { x: ~ }", () => {
    const { parsed1 } = assertRoundTripStable("{ x: ~ }");
    expect(parsed1.kind).toBe("object");
    expect(parsed1.props[0].value.kind).toBe("ident");
    expect(parsed1.props[0].value.name).toBe("~");
  });

  test("`~` re-parse without tildeActive flag still produces IdentExpr", () => {
    // This is the failure mode that gated PA's example-16 / example-24 commit.
    // The corpus-invariant test re-parses emitted strings without any tildeActive
    // flag because it has no way to know whether the original parse was in tilde
    // context. Post-fix, the re-parse must still resolve `~` to IdentExpr.
    const reparsed = parseExprToNode("ContactsState.Ready(~)", "test.scrml", 0);
    expect(reparsed.kind).toBe("call");
    expect(reparsed.args[0].kind).toBe("ident");
    expect(reparsed.args[0].name).toBe("~");
  });
});

describe("bitwise-NOT (`~x`) regression — must NOT be intercepted by tilde substitution", () => {
  test("`~x` parses as UnaryExpr op=~ argument=IdentExpr", () => {
    const parsed = parseExprToNode("~x", "test.scrml", 0);
    expect(parsed.kind).toBe("unary");
    expect(parsed.op).toBe("~");
    expect(parsed.argument.kind).toBe("ident");
    expect(parsed.argument.name).toBe("x");
  });

  test("`~5` parses as UnaryExpr op=~ argument=LitExpr 5", () => {
    const parsed = parseExprToNode("~5", "test.scrml", 0);
    expect(parsed.kind).toBe("unary");
    expect(parsed.op).toBe("~");
    expect(parsed.argument.kind).toBe("lit");
    expect(parsed.argument.value).toBe(5);
  });

  test("`~obj.field` parses as UnaryExpr op=~ argument=MemberExpr", () => {
    const parsed = parseExprToNode("~obj.field", "test.scrml", 0);
    expect(parsed.kind).toBe("unary");
    expect(parsed.op).toBe("~");
    expect(parsed.argument.kind).toBe("member");
  });

  test("`~arr[0]` parses as UnaryExpr op=~ argument=IndexExpr", () => {
    const parsed = parseExprToNode("~arr[0]", "test.scrml", 0);
    expect(parsed.kind).toBe("unary");
    expect(parsed.op).toBe("~");
    expect(parsed.argument.kind).toBe("index");
  });

  test("`~x` round-trip stable through emit/reparse", () => {
    assertRoundTripStable("~x");
    assertRoundTripStable("~5");
    assertRoundTripStable("~obj.field");
    assertRoundTripStable("~arr[0]");
  });
});

describe("call-position `~` follows the same path as ast-builder under tildeActive", () => {
  // The ast-builder threads { tildeActive: true } to parseExprToNode after a
  // value-lift. The round-trip fix means callers re-parsing the emitted output
  // (e.g., the corpus-invariant test, or future consumers walking ExprNode trees
  // and re-parsing on-the-fly) get identical results regardless of the flag.
  test("identical IdentExpr produced with or without tildeActive on input containing `~`", () => {
    const withFlag = parseExprToNode("ContactsState.Ready(~)", "test.scrml", 0, { tildeActive: true });
    const noFlag = parseExprToNode("ContactsState.Ready(~)", "test.scrml", 0);
    expect(deepEqualExprNode(withFlag, noFlag)).toBe(true);
  });

  test("identical IdentExpr produced for `func(~)` with/without tildeActive", () => {
    const withFlag = parseExprToNode("func(~)", "test.scrml", 0, { tildeActive: true });
    const noFlag = parseExprToNode("func(~)", "test.scrml", 0);
    expect(deepEqualExprNode(withFlag, noFlag)).toBe(true);
  });

  test("bitwise-NOT `~x` produces identical UnaryExpr with/without tildeActive", () => {
    const withFlag = parseExprToNode("~x", "test.scrml", 0, { tildeActive: true });
    const noFlag = parseExprToNode("~x", "test.scrml", 0);
    expect(deepEqualExprNode(withFlag, noFlag)).toBe(true);
  });
});
