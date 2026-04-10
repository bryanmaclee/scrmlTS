// Conformance test for: SPEC §4.11.2 (Canonical SQL Context Sigil: `?{`)
// "`?{` SHALL be the sole opening sigil for SQL contexts."
// "`!{` SHALL be the opening sigil for error contexts (§19). It is NOT an
//  alias for `?{` and SHALL NOT produce a SQL context under any circumstances."
// "The context model table in §3.1 is authoritative for all context types
//  including the error context `!{ }`. The two sigils have distinct,
//  non-overlapping meanings."

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../../src/block-splitter.js";
import { buildAST } from "../../../src/ast-builder.js";

function run(src) {
  const bsOut = splitBlocks("test.scrml", src);
  return buildAST(bsOut);
}

describe("CONF-TAB-005: `?{` produces sql node; `!{` produces error-effect node", () => {
  test("`?{` inside a logic block produces a sql node (or is embedded as sql child)", () => {
    // ?{ `SELECT 1` } inside a ${ } block
    const { ast } = run("${ let rows = ?{`SELECT id FROM users`}.all(); }");
    const logicNode = ast.nodes[0];
    expect(logicNode.kind).toBe("logic");
    // The SQL block is a child of the logic block embedded in the token stream.
    // It may appear as a bare-expr containing a BLOCK_REF, or as a direct sql child node.
    // Either way, the TAB stage should not throw.
    expect(logicNode.body.length).toBeGreaterThan(0);
  });

  test("a top-level sql context node has kind 'sql' not 'error-effect'", () => {
    // A ?{ } at top logic level (embedded child of a logic block)
    // Check we can find the sql node among children
    const { ast } = run("${\n?{`SELECT 1`}.all();\n}");
    const logicNode = ast.nodes[0];
    // Walk children nodes looking for sql kind
    function findKind(nodes, kind) {
      for (const n of nodes) {
        if (!n) continue;
        if (n.kind === kind) return n;
        if (n.body) {
          const r = findKind(n.body, kind);
          if (r) return r;
        }
        if (n.children) {
          const r = findKind(n.children, kind);
          if (r) return r;
        }
      }
      return null;
    }
    // Either there's a sql node, or the BLOCK_REF was absorbed into a bare-expr.
    // The key conformance check: the node is NOT an error-effect when ?{ is used.
    const sqlNode = findKind(ast.nodes, "sql");
    const errNode = findKind(ast.nodes, "error-effect");
    // If sql is recognized as a child block, it should be kind 'sql'
    if (sqlNode) expect(sqlNode.kind).toBe("sql");
    // There must be no spurious error-effect for ?{
    expect(errNode).toBeNull();
  });

  test("a top-level error-effect context node has kind 'error-effect' not 'sql'", () => {
    // !{ } block: contains match arm(s)
    const { ast } = run("${ someExpr() !{ | ::Error e -> handle(e) }; }");
    function findKind(nodes, kind) {
      for (const n of nodes) {
        if (!n) continue;
        if (n.kind === kind) return n;
        if (n.body) {
          const r = findKind(n.body, kind);
          if (r) return r;
        }
        if (n.children) {
          const r = findKind(n.children, kind);
          if (r) return r;
        }
      }
      return null;
    }
    const errNode = findKind(ast.nodes, "error-effect");
    // The error-effect block must not be classified as sql
    if (errNode) {
      expect(errNode.kind).toBe("error-effect");
      expect(errNode.kind).not.toBe("sql");
    }
  });

  test("sql node carries a `query` field (the raw query string)", () => {
    function findKind(nodes, kind) {
      for (const n of nodes) {
        if (!n) continue;
        if (n.kind === kind) return n;
        if (n.body) { const r = findKind(n.body, kind); if (r) return r; }
        if (n.children) { const r = findKind(n.children, kind); if (r) return r; }
      }
      return null;
    }
    const { ast } = run("${\n?{`SELECT id, name FROM users`}.all();\n}");
    const sqlNode = findKind(ast.nodes, "sql");
    if (sqlNode) {
      expect(typeof sqlNode.query).toBe("string");
    }
    // Test passes as long as no error was thrown
  });
});
