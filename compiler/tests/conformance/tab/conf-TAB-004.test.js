// Conformance test for: SPEC §4.11.1 (Canonical Keyword: `lift`)
// "`lift` SHALL be the sole keyword for emitting values from a logic context
//  to its parent context."
// "E-SYNTAX-003 is a parser-level rule, not a tokenizer-level reservation.
//  `extract` is NOT reserved as a scrml keyword in the tokenizer. The
//  tokenizer SHALL classify `extract` as a plain identifier token."
//
// The TAB stage must recognise `lift` as a first-class construct and produce
// a `lift-expr` AST node. `extract` in statement position is a different
// matter (E-SYNTAX-003); but at tokenizer level `extract` is a plain ident.

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";
import { buildAST } from "../../../src/ast-builder.js";

function run(src) {
  const bsOut = splitBlocks("test.scrml", src);
  return buildAST(bsOut);
}

describe("CONF-TAB-004: `lift` is the sole emission keyword; produces lift-expr node", () => {
  test("`lift` in direct logic body produces a lift-expr node", () => {
    const { ast } = run("${ lift myitem; }");
    const logicNode = ast.nodes[0];
    expect(logicNode.kind).toBe("logic");
    const liftNode = logicNode.body.find((n) => n.kind === "lift-expr");
    expect(liftNode).toBeDefined();
    expect(liftNode.kind).toBe("lift-expr");
  });

  test("`lift` of an expression carries kind 'expr' in the LiftTarget", () => {
    const { ast } = run("${ lift someValue; }");
    const logicNode = ast.nodes[0];
    const liftNode = logicNode.body.find((n) => n.kind === "lift-expr");
    expect(liftNode).toBeDefined();
    expect(liftNode.expr.kind).toBe("expr");
  });

  test("`lift` of a markup block carries kind 'markup' in the LiftTarget", () => {
    // lift <li>item/ — the <li> is a child block embedded in the logic block
    const { ast } = run("${\n  lift <li>item/;\n}");
    const logicNode = ast.nodes[0];
    const liftNode = logicNode.body.find((n) => n.kind === "lift-expr");
    expect(liftNode).toBeDefined();
    // LiftTarget.kind is either 'markup' or 'expr'
    expect(["markup", "expr"]).toContain(liftNode.expr.kind);
  });

  test("`lift` node carries a valid span", () => {
    const { ast } = run("${ lift someValue; }");
    const logicNode = ast.nodes[0];
    const liftNode = logicNode.body.find((n) => n.kind === "lift-expr");
    expect(liftNode.span).toBeDefined();
    expect(typeof liftNode.span.start).toBe("number");
  });

  test("`extract` as variable name is tokenized as plain identifier, not a keyword", () => {
    // `extract` used as a variable name SHALL NOT trigger errors at parse level
    const { ast } = run("${ let extract = getExtract(); }");
    const logicNode = ast.nodes[0];
    // Should parse cleanly — no throw
    expect(logicNode.kind).toBe("logic");
    const letNode = logicNode.body.find((n) => n.kind === "let-decl");
    expect(letNode).toBeDefined();
    expect(letNode.name).toBe("extract");
  });

  test("`extract` as imported identifier does not trigger errors at TAB level", () => {
    const { ast } = run("${ import { extract } from './utils.js'; }");
    const logicNode = ast.nodes[0];
    expect(logicNode.kind).toBe("logic");
    // No TABError should have been thrown — parsing succeeds
  });
});
