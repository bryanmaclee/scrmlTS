/**
 * `given` keyword — Unit Tests (§42.2.3)
 *
 * Tests for scrml's presence guard keyword:
 *   §1  Tokenizer: `given` is recognized as a keyword
 *   §2  AST: single-variable `given x => { body }` parses to given-guard node
 *   §3  AST: multi-variable `given x, y => { body }` parses correctly
 *   §4  AST: `given` inside a logic block parses correctly end-to-end
 *   §5  AST: nested `given` works (given inside given body)
 *   §6  Codegen: single-variable emits null/undefined check
 *   §7  Codegen: multi-variable emits all-or-nothing null/undefined check
 *   §8  Codegen: body nodes are emitted inside the if block
 *   §9  Integration: full compile from source produces correct null/undefined check
 *   §10 Boundary: `given` with empty variable list produces empty output (no crash)
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { tokenizeLogic } from "../../src/tokenizer.js";
import { emitLogicNode } from "../../src/codegen/emit-logic.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parse(source, filePath = "/test/app.scrml") {
  const bsResult = splitBlocks(filePath, source);
  const tabResult = buildAST(bsResult);
  return tabResult;
}

function findNodes(nodes, kind) {
  const found = [];
  function walk(list) {
    for (const node of list) {
      if (!node) continue;
      if (node.kind === kind) found.push(node);
      if (Array.isArray(node.body)) walk(node.body);
      if (Array.isArray(node.children)) walk(node.children);
      if (Array.isArray(node.consequent)) walk(node.consequent);
      if (Array.isArray(node.alternate)) walk(node.alternate);
    }
  }
  walk(nodes);
  return found;
}

function findLogicBody(ast) {
  // Logic blocks are typically inside markup children, not top-level
  let logic = ast.nodes.find(n => n.kind === "logic");
  if (!logic) {
    // Search inside markup children
    for (const node of ast.nodes) {
      if (node.kind === "markup" && Array.isArray(node.children)) {
        logic = node.children.find(n => n.kind === "logic");
        if (logic) break;
      }
    }
  }
  return logic ? (logic.body || []) : [];
}

// ---------------------------------------------------------------------------
// §1: Tokenizer
// ---------------------------------------------------------------------------

describe("§1: given is recognized as a keyword", () => {
  test("tokenizeLogic returns KEYWORD token for 'given'", () => {
    const tokens = tokenizeLogic("given x => { }", 0, 1, 1, []);
    const givenTok = tokens.find(t => t.text === "given");
    expect(givenTok).toBeDefined();
    expect(givenTok.kind).toBe("KEYWORD");
  });

  test("given does not become an IDENT token", () => {
    const tokens = tokenizeLogic("given x => { }", 0, 1, 1, []);
    const identTok = tokens.find(t => t.text === "given" && t.kind === "IDENT");
    expect(identTok).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// §2: AST — single variable
// ---------------------------------------------------------------------------

describe("§2: single-variable given parses to given-guard node", () => {
  test("parses given x => { } to given-guard AST node", () => {
    const source = `<program>
\${ given x => { } }
</>`;
    const { ast, errors } = parse(source);
    const fatalErrors = errors.filter(e => !e.code?.startsWith("W-"));
    expect(fatalErrors).toHaveLength(0);

    const givenNodes = findNodes(ast.nodes, "given-guard");
    expect(givenNodes).toHaveLength(1);
  });

  test("single-variable given-guard has variables: ['x']", () => {
    const source = `<program>
\${ given x => { } }
</>`;
    const { ast } = parse(source);
    const givenNodes = findNodes(ast.nodes, "given-guard");
    expect(givenNodes[0].variables).toEqual(["x"]);
  });

  test("single-variable given-guard has a body array", () => {
    const source = `<program>
\${ given x => { } }
</>`;
    const { ast } = parse(source);
    const givenNodes = findNodes(ast.nodes, "given-guard");
    expect(Array.isArray(givenNodes[0].body)).toBe(true);
  });

  test("given with body content parses body nodes", () => {
    const source = `<program>
\${ given x => { let y = 1 } }
</>`;
    const { ast } = parse(source);
    const givenNodes = findNodes(ast.nodes, "given-guard");
    expect(givenNodes[0].body.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// §3: AST — multi-variable
// ---------------------------------------------------------------------------

describe("§3: multi-variable given parses correctly", () => {
  test("given x, y => { } parses to given-guard with variables: ['x', 'y']", () => {
    const source = `<program>
\${ given x, y => { } }
</>`;
    const { ast } = parse(source);
    const givenNodes = findNodes(ast.nodes, "given-guard");
    expect(givenNodes).toHaveLength(1);
    expect(givenNodes[0].variables).toEqual(["x", "y"]);
  });

  test("three-variable given parses all three", () => {
    const source = `<program>
\${ given a, b, c => { } }
</>`;
    const { ast } = parse(source);
    const givenNodes = findNodes(ast.nodes, "given-guard");
    expect(givenNodes[0].variables).toEqual(["a", "b", "c"]);
  });
});

// ---------------------------------------------------------------------------
// §4: AST — inside logic block end-to-end
// ---------------------------------------------------------------------------

describe("§4: given inside logic block parses end-to-end", () => {
  test("given appears as first statement in logic body", () => {
    const source = `<program>
\${ given user => { let name = user.name } }
</>`;
    const { ast, errors } = parse(source);
    const fatalErrors = errors.filter(e => !e.code?.startsWith("W-"));
    expect(fatalErrors).toHaveLength(0);

    const body = findLogicBody(ast);
    const givenNode = body.find(n => n.kind === "given-guard");
    expect(givenNode).toBeDefined();
    expect(givenNode.variables).toEqual(["user"]);
  });

  test("given can appear after other statements", () => {
    const source = `<program>
\${ let x = 1
given user => { let name = user.name } }
</>`;
    const { ast, errors } = parse(source);
    const fatalErrors = errors.filter(e => !e.code?.startsWith("W-"));
    expect(fatalErrors).toHaveLength(0);
    const givenNodes = findNodes(ast.nodes, "given-guard");
    expect(givenNodes).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// §5: AST — nested given
// ---------------------------------------------------------------------------

describe("§5: nested given works", () => {
  test("given inside given body produces two given-guard nodes", () => {
    const source = `<program>
\${ given x => { given y => { } } }
</>`;
    const { ast, errors } = parse(source);
    const fatalErrors = errors.filter(e => !e.code?.startsWith("W-"));
    expect(fatalErrors).toHaveLength(0);

    // findNodes recursively finds ALL given-guard nodes (outer + inner = 2)
    const allGiven = findNodes(ast.nodes, "given-guard");
    expect(allGiven).toHaveLength(2);

    // The outer given is the one directly in the logic body
    const body = findLogicBody(ast);
    const outer = body.filter(n => n.kind === "given-guard");
    expect(outer).toHaveLength(1);
    expect(outer[0].variables).toEqual(["x"]);

    // The inner given should be in the outer's body
    const inner = findNodes(outer[0].body, "given-guard");
    expect(inner).toHaveLength(1);
    expect(inner[0].variables).toEqual(["y"]);
  });
});

// ---------------------------------------------------------------------------
// §6: Codegen — single-variable null/undefined check
// ---------------------------------------------------------------------------

describe("§6: codegen emits null/undefined check for single variable", () => {
  test("given x emits: if (x !== null && x !== undefined)", () => {
    const node = {
      kind: "given-guard",
      variables: ["x"],
      body: [],
    };
    const output = emitLogicNode(node);
    expect(output).toContain("if (x !== null && x !== undefined)");
  });

  test("single-variable codegen produces if block structure", () => {
    const node = {
      kind: "given-guard",
      variables: ["user"],
      body: [],
    };
    const output = emitLogicNode(node);
    expect(output).toBe("if (user !== null && user !== undefined) {\n}");
  });

  test("body nodes are emitted inside the if block", () => {
    const node = {
      kind: "given-guard",
      variables: ["x"],
      body: [
        { kind: "bare-expr", expr: "console.log(x)" },
      ],
    };
    const output = emitLogicNode(node);
    expect(output).toContain("if (x !== null && x !== undefined) {");
    expect(output).toContain("console.log(x)");
    expect(output).toContain("}");
  });
});

// ---------------------------------------------------------------------------
// §7: Codegen — multi-variable null/undefined check
// ---------------------------------------------------------------------------

describe("§7: codegen emits all-or-nothing check for multi-variable", () => {
  test("given x, y emits: if (x !== null && x !== undefined && y !== null && y !== undefined)", () => {
    const node = {
      kind: "given-guard",
      variables: ["x", "y"],
      body: [],
    };
    const output = emitLogicNode(node);
    expect(output).toContain("x !== null && x !== undefined");
    expect(output).toContain("y !== null && y !== undefined");
    // Both conditions joined with &&
    expect(output).toMatch(/x !== null && x !== undefined && y !== null && y !== undefined/);
  });

  test("three-variable given emits all three checks", () => {
    const node = {
      kind: "given-guard",
      variables: ["a", "b", "c"],
      body: [],
    };
    const output = emitLogicNode(node);
    expect(output).toContain("a !== null && a !== undefined");
    expect(output).toContain("b !== null && b !== undefined");
    expect(output).toContain("c !== null && c !== undefined");
  });
});

// ---------------------------------------------------------------------------
// §8: Codegen — body emission
// ---------------------------------------------------------------------------

describe("§8: body nodes are emitted inside the if block", () => {
  test("return-stmt inside given body is emitted", () => {
    const node = {
      kind: "given-guard",
      variables: ["val"],
      body: [
        { kind: "return-stmt", expr: "val" },
      ],
    };
    const output = emitLogicNode(node);
    expect(output).toContain("return val");
  });

  test("if-stmt inside given body is emitted", () => {
    const node = {
      kind: "given-guard",
      variables: ["x"],
      body: [
        { kind: "if-stmt", condition: "x > 0", consequent: [], alternate: null },
      ],
    };
    const output = emitLogicNode(node);
    expect(output).toContain("if (x > 0)");
  });
});

// ---------------------------------------------------------------------------
// §9: Integration — full compile from source
// ---------------------------------------------------------------------------

describe("§9: integration — full compile from source to JS", () => {
  test("given x produces null/undefined check in full AST", () => {
    const source = `<program>
\${ given x => { let y = 1 } }
</>`;
    const { ast, errors } = parse(source);
    const fatalErrors = errors.filter(e => !e.code?.startsWith("W-"));
    expect(fatalErrors).toHaveLength(0);

    const givenNodes = findNodes(ast.nodes, "given-guard");
    expect(givenNodes).toHaveLength(1);

    const output = emitLogicNode(givenNodes[0]);
    expect(output).toContain("if (x !== null && x !== undefined)");
  });

  test("given x, y produces multi-check in full AST", () => {
    const source = `<program>
\${ given username, password => { } }
</>`;
    const { ast, errors } = parse(source);
    const fatalErrors = errors.filter(e => !e.code?.startsWith("W-"));
    expect(fatalErrors).toHaveLength(0);

    const givenNodes = findNodes(ast.nodes, "given-guard");
    expect(givenNodes).toHaveLength(1);
    expect(givenNodes[0].variables).toEqual(["username", "password"]);

    const output = emitLogicNode(givenNodes[0]);
    expect(output).toContain("username !== null && username !== undefined");
    expect(output).toContain("password !== null && password !== undefined");
  });

  test("existing tests are not broken — not keyword still works", () => {
    // Verify `not` keyword still tokenizes as KEYWORD (regression guard)
    const tokens = tokenizeLogic("let x = not", 0, 1, 1, []);
    const notTok = tokens.find(t => t.text === "not");
    expect(notTok).toBeDefined();
    expect(notTok.kind).toBe("KEYWORD");
  });
});

// ---------------------------------------------------------------------------
// §10: Boundary cases
// ---------------------------------------------------------------------------

describe("§10: boundary and safety cases", () => {
  test("emitLogicNode with empty variables returns empty string", () => {
    const node = {
      kind: "given-guard",
      variables: [],
      body: [],
    };
    const output = emitLogicNode(node);
    expect(output).toBe("");
  });

  test("emitLogicNode with undefined variables returns empty string", () => {
    const node = {
      kind: "given-guard",
      body: [],
    };
    const output = emitLogicNode(node);
    expect(output).toBe("");
  });

  test("given does not break if= or show= parsing (regression guard)", () => {
    const source = `<program>
<div if=visible>Hello</div>
\${ given x => { } }
</>`;
    const { ast, errors } = parse(source);
    const fatalErrors = errors.filter(e => !e.code?.startsWith("W-"));
    expect(fatalErrors).toHaveLength(0);

    const givenNodes = findNodes(ast.nodes, "given-guard");
    expect(givenNodes).toHaveLength(1);
  });

  test("given does not affect match statement parsing (regression guard)", () => {
    const source = `<program>
\${ match color {
    .Red => "red"
    else => "other"
  }
  given x => { } }
</>`;
    const { ast, errors } = parse(source);
    const fatalErrors = errors.filter(e => !e.code?.startsWith("W-"));
    expect(fatalErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §11: E-SYNTAX-043 — old (x) => presence guard syntax is rejected
// ---------------------------------------------------------------------------

describe("§11: E-SYNTAX-043 — old (x) => syntax is a compile error", () => {
  test("basic (x) => {} at statement level emits E-SYNTAX-043", () => {
    const source = `<program>
\${ (x) => { let y = 1 } }
</>`;
    const { errors } = parse(source);
    const err = errors.find(e => e.code === "E-SYNTAX-043");
    expect(err).toBeDefined();
  });

  test("E-SYNTAX-043 message mentions given keyword", () => {
    const source = `<program>
\${ (x) => { } }
</>`;
    const { errors } = parse(source);
    const err = errors.find(e => e.code === "E-SYNTAX-043");
    expect(err).toBeDefined();
    expect(err.message).toContain("given");
  });

  test("multi-param (x, y) => {} at statement level emits E-SYNTAX-043", () => {
    const source = `<program>
\${ (x, y) => { } }
</>`;
    const { errors } = parse(source);
    const err = errors.find(e => e.code === "E-SYNTAX-043");
    expect(err).toBeDefined();
  });

  test("(x) => without block body at statement level emits E-SYNTAX-043", () => {
    const source = `<program>
\${ (x) => handleIt() }
</>`;
    const { errors } = parse(source);
    const err = errors.find(e => e.code === "E-SYNTAX-043");
    expect(err).toBeDefined();
  });

  test("old guard syntax nested inside function body emits E-SYNTAX-043", () => {
    const source = `<program>
\${ fn doWork() {
  (x) => { let result = x + 1 }
} }
</>`;
    const { errors } = parse(source);
    const err = errors.find(e => e.code === "E-SYNTAX-043");
    expect(err).toBeDefined();
  });

  test("valid arrow function in expression position does NOT emit E-SYNTAX-043", () => {
    const source = `<program>
\${ const f = (x) => x + 1 }
</>`;
    const { errors } = parse(source);
    const syntaxErr = errors.find(e => e.code === "E-SYNTAX-043");
    expect(syntaxErr).toBeUndefined();
  });

  test("given x => {} (correct form) does NOT emit E-SYNTAX-043", () => {
    const source = `<program>
\${ given x => { let y = 1 } }
</>`;
    const { errors } = parse(source);
    const syntaxErr = errors.find(e => e.code === "E-SYNTAX-043");
    expect(syntaxErr).toBeUndefined();
  });

  test("three-param (a, b, c) => {} at statement level emits E-SYNTAX-043", () => {
    const source = `<program>
\${ (a, b, c) => { } }
</>`;
    const { errors } = parse(source);
    const err = errors.find(e => e.code === "E-SYNTAX-043");
    expect(err).toBeDefined();
  });

  test("E-SYNTAX-043 does not cause infinite loop or crash", () => {
    const source = `<program>
\${ (x) => { }
given y => { let z = 2 } }
</>`;
    const { ast, errors } = parse(source);
    const syntaxErr = errors.find(e => e.code === "E-SYNTAX-043");
    expect(syntaxErr).toBeDefined();
    // The given-guard node after the error should still parse
    const givenNodes = findNodes(ast.nodes, "given-guard");
    expect(givenNodes).toHaveLength(1);
  });

  test("dotted form (obj.prop) => {} emits E-SYNTAX-043", () => {
    const source = `<program>
\${ (t.due_date) => { let d = t.due_date } }
</>`;
    const { errors } = parse(source);
    const err = errors.find(e => e.code === "E-SYNTAX-043");
    expect(err).toBeDefined();
  });

  test("deep dotted form (a.b.c) => {} emits E-SYNTAX-043", () => {
    const source = `<program>
\${ (a.b.c) => { } }
</>`;
    const { errors } = parse(source);
    const err = errors.find(e => e.code === "E-SYNTAX-043");
    expect(err).toBeDefined();
  });

  test("@reactive dotted form (@task.assignee) => {} emits E-SYNTAX-043", () => {
    const source = `<program>
\${ (@task.assignee) => { } }
</>`;
    const { errors } = parse(source);
    const err = errors.find(e => e.code === "E-SYNTAX-043");
    expect(err).toBeDefined();
  });

  test("bracket index form (arr[i]) => {} emits E-SYNTAX-043", () => {
    const source = `<program>
\${ (arr[i]) => { } }
</>`;
    const { errors } = parse(source);
    const err = errors.find(e => e.code === "E-SYNTAX-043");
    expect(err).toBeDefined();
  });

  test("function call form (getData()) => {} emits E-SYNTAX-043", () => {
    const source = `<program>
\${ (getData()) => { } }
</>`;
    const { errors } = parse(source);
    const err = errors.find(e => e.code === "E-SYNTAX-043");
    expect(err).toBeDefined();
  });

  test("dotted-then-bracket form (obj.arr[0]) => {} emits E-SYNTAX-043", () => {
    const source = `<program>
\${ (obj.arr[0]) => { } }
</>`;
    const { errors } = parse(source);
    const err = errors.find(e => e.code === "E-SYNTAX-043");
    expect(err).toBeDefined();
  });

  test("function call with arg (getData(x)) => {} emits E-SYNTAX-043", () => {
    const source = `<program>
\${ (getData(x)) => { } }
</>`;
    const { errors } = parse(source);
    const err = errors.find(e => e.code === "E-SYNTAX-043");
    expect(err).toBeDefined();
  });
});
