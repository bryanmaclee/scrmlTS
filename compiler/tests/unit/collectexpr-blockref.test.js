/**
 * collectExpr BLOCK_REF tag-nesting tests
 *
 * Validates that collectExpr() correctly handles BLOCK_REF tokens inside tag
 * bodies vs. at top level in logic blocks.
 *
 * Bug: BLOCK_REF at depth 0 in collectExpr() would break the expression even
 * when the BLOCK_REF was inside a tag body (e.g., SQL query inside <div>).
 *
 * Fix: The block splitter now tracks tag nesting inside brace-delimited
 * contexts and annotates child blocks with tagNesting. collectExpr() checks
 * tok.block.tagNesting before treating BLOCK_REF as a statement boundary.
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parse(source) {
  const bsOut = splitBlocks("test.scrml", source);
  return buildAST(bsOut);
}

function parseAST(source) {
  return parse(source).ast;
}

/** Get the block splitter output for inspection */
function split(source) {
  return splitBlocks("test.scrml", source);
}

/** Recursively find all blocks of a given type */
function findBlocks(blocks, type) {
  const result = [];
  for (const b of blocks) {
    if (b.type === type) result.push(b);
    if (b.children) result.push(...findBlocks(b.children, type));
  }
  return result;
}

// ---------------------------------------------------------------------------
// S1  Block splitter: tagNesting annotation
// ---------------------------------------------------------------------------

describe("block splitter tagNesting annotation", () => {
  test("BLOCK_REF at top level of logic block has no tagNesting", () => {
    // SQL after a let statement = separate statement, no tag context
    const { blocks } = split('${ let x = 1; ?{ SELECT * FROM t } }');
    const sqlBlocks = findBlocks(blocks, "sql");
    expect(sqlBlocks.length).toBeGreaterThanOrEqual(1);
    const sqlBlock = sqlBlocks[0];
    // tagNesting should be 0 or undefined (not set when 0)
    expect(sqlBlock.tagNesting ?? 0).toBe(0);
  });

  test("BLOCK_REF inside <div>...</div> has tagNesting > 0", () => {
    const source = [
      '${',
      '  const Card = <div>',
      '    ?{ SELECT * FROM cards }',
      '  </div>',
      '}',
    ].join('\n');
    const { blocks } = split(source);
    const sqlBlocks = findBlocks(blocks, "sql");
    expect(sqlBlocks.length).toBeGreaterThanOrEqual(1);
    expect(sqlBlocks[0].tagNesting).toBe(1);
  });

  test("BLOCK_REF inside nested tags has tagNesting > 1", () => {
    const source = [
      '${',
      '  const Card = <div><span>',
      '    ?{ SELECT * FROM cards }',
      '  </span></div>',
      '}',
    ].join('\n');
    const { blocks } = split(source);
    const sqlBlocks = findBlocks(blocks, "sql");
    expect(sqlBlocks.length).toBeGreaterThanOrEqual(1);
    expect(sqlBlocks[0].tagNesting).toBe(2);
  });

  test("multiple BLOCK_REFs inside tag body all have tagNesting > 0", () => {
    const source = [
      '${',
      '  const Card = <div>',
      '    ?{ SELECT * FROM cards }',
      '    !{ might-fail() }',
      '  </div>',
      '}',
    ].join('\n');
    const { blocks } = split(source);
    const sqlBlocks = findBlocks(blocks, "sql");
    const errorBlocks = findBlocks(blocks, "error-effect");
    expect(sqlBlocks.length).toBeGreaterThanOrEqual(1);
    expect(errorBlocks.length).toBeGreaterThanOrEqual(1);
    expect(sqlBlocks[0].tagNesting).toBe(1);
    expect(errorBlocks[0].tagNesting).toBe(1);
  });

  test("BLOCK_REF after closing tag has tagNesting 0", () => {
    const source = [
      '${',
      '  const Card = <div>text</div>',
      '  ?{ SELECT * FROM cards }',
      '}',
    ].join('\n');
    const { blocks } = split(source);
    const sqlBlocks = findBlocks(blocks, "sql");
    expect(sqlBlocks.length).toBeGreaterThanOrEqual(1);
    // After </div>, tagNesting should be back to 0
    expect(sqlBlocks[0].tagNesting ?? 0).toBe(0);
  });

  test("self-closing tag does not increment tagNesting", () => {
    const source = [
      '${',
      '  const Card = <br/>',
      '  ?{ SELECT * FROM cards }',
      '}',
    ].join('\n');
    const { blocks } = split(source);
    const sqlBlocks = findBlocks(blocks, "sql");
    expect(sqlBlocks.length).toBeGreaterThanOrEqual(1);
    // <br/> is self-closing, should not increment tagNesting
    expect(sqlBlocks[0].tagNesting ?? 0).toBe(0);
  });

  test("explicit closer </div> decrements tagNesting", () => {
    const source = [
      '${',
      '  const x = <div><p>inner</p>',
      '  ?{ SELECT 1 }',
      '  </div>',
      '  ?{ SELECT 2 }',
      '}',
    ].join('\n');
    const { blocks } = split(source);
    const sqlBlocks = findBlocks(blocks, "sql");
    expect(sqlBlocks.length).toBeGreaterThanOrEqual(2);
    // First SQL is inside <div> (tagNesting = 1, <p> was closed by </p>)
    expect(sqlBlocks[0].tagNesting).toBe(1);
    // Second SQL is after </div> (tagNesting = 0)
    expect(sqlBlocks[1].tagNesting ?? 0).toBe(0);
  });

  test("</> closer decrements tagNesting", () => {
    const source = [
      '${',
      '  const x = <div>',
      '    <p>text</>',
      '    ?{ SELECT 1 }',
      '  </>',
      '  ?{ SELECT 2 }',
      '}',
    ].join('\n');
    const { blocks } = split(source);
    const sqlBlocks = findBlocks(blocks, "sql");
    expect(sqlBlocks.length).toBeGreaterThanOrEqual(2);
    // First SQL is inside <div> after <p> closed by </> (tagNesting = 1)
    expect(sqlBlocks[0].tagNesting).toBe(1);
    // Second SQL is after <div> closed by </> (tagNesting = 0)
    expect(sqlBlocks[1].tagNesting ?? 0).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// S2  AST builder: collectExpr BLOCK_REF behavior
// ---------------------------------------------------------------------------

describe("collectExpr BLOCK_REF statement boundary", () => {
  test("BLOCK_REF at top level of logic block breaks expression (SQL after let = separate statement)", () => {
    const source = [
      '${',
      '  let x = 1',
      '  ?{ SELECT * FROM cards }',
      '}',
    ].join('\n');
    const ast = parseAST(source);
    // The logic block should have two separate nodes:
    // 1. let x = 1
    // 2. sql block
    const logicNode = ast.nodes[0];
    expect(logicNode.kind).toBe("logic");
    expect(logicNode.body.length).toBeGreaterThanOrEqual(2);
    // First statement is a let-decl
    expect(logicNode.body[0].kind).toBe("let-decl");
    // Second statement should be a sql block, not part of the let expression
    expect(logicNode.body[1].kind).toBe("sql");
  });

  test("BLOCK_REF inside tag body does NOT break expression (component expression preserved)", () => {
    const source = [
      '${',
      '  const Card = <div>',
      '    <p>Hello</p>',
      '    ?{ SELECT * FROM cards }',
      '    <p>More</p>',
      '  </div>',
      '}',
    ].join('\n');
    const ast = parseAST(source);
    const logicNode = ast.nodes[0];
    expect(logicNode.kind).toBe("logic");
    // Because Card starts with uppercase, this becomes a component-def.
    // The entire const Card = <div>..?{..}..</div> should be ONE component-def
    // (not split at the BLOCK_REF).
    const compNode = logicNode.body.find(n => n.kind === "component-def");
    expect(compNode).toBeDefined();
    expect(compNode.name).toBe("Card");
    // The component raw expression should include content AFTER the BLOCK_REF
    // (i.e., it was not truncated at the ?{} boundary)
    expect(compNode.raw).toContain("< / div >");
  });

  test("BLOCK_REF inside nested tags preserved in expression", () => {
    const source = [
      '${',
      '  const Card = <div><span>',
      '    ?{ SELECT name FROM users }',
      '  </span></div>',
      '}',
    ].join('\n');
    const ast = parseAST(source);
    const logicNode = ast.nodes[0];
    const compNode = logicNode.body.find(n => n.kind === "component-def");
    expect(compNode).toBeDefined();
    // The expression should include closing tags after the BLOCK_REF
    expect(compNode.raw).toContain("< / span >");
    expect(compNode.raw).toContain("< / div >");
  });

  test("multiple BLOCK_REFs inside tag body all preserved", () => {
    const source = [
      '${',
      '  const Card = <div>',
      '    ?{ SELECT * FROM cards }',
      '    !{ might-fail() }',
      '    <p>end</p>',
      '  </div>',
      '}',
    ].join('\n');
    const ast = parseAST(source);
    const logicNode = ast.nodes[0];
    const compNode = logicNode.body.find(n => n.kind === "component-def");
    expect(compNode).toBeDefined();
    // Expression should reach all the way to </div>
    expect(compNode.raw).toContain("< / div >");
  });

  test("BLOCK_REF after closing tag breaks expression (SQL is separate defChild)", () => {
    const source = [
      '${',
      '  const Card = <div>content</div>',
      '  ?{ SELECT * FROM cards }',
      '}',
    ].join('\n');
    const ast = parseAST(source);
    const logicNode = ast.nodes[0];
    expect(logicNode.kind).toBe("logic");
    // The component-def should have the SQL as a defChild (sibling consumed
    // by the component-def post-processing), NOT as part of its raw expression.
    const compNode = logicNode.body.find(n => n.kind === "component-def");
    expect(compNode).toBeDefined();
    expect(compNode.name).toBe("Card");
    // The raw expression ends at </div> - SQL is NOT in the expression
    expect(compNode.raw).toBe("< div > content < / div >");
    // SQL is consumed as a defChild of the component-def
    expect(compNode.defChildren).toBeDefined();
    expect(compNode.defChildren.length).toBeGreaterThanOrEqual(1);
    expect(compNode.defChildren[0].kind).toBe("sql");
  });

  test("lowercase const with BLOCK_REF at top level breaks correctly", () => {
    // Using lowercase name = const-decl (not component-def)
    const source = [
      '${',
      '  const data = getValue()',
      '  ?{ SELECT * FROM cards }',
      '}',
    ].join('\n');
    const ast = parseAST(source);
    const logicNode = ast.nodes[0];
    expect(logicNode.kind).toBe("logic");
    expect(logicNode.body.length).toBeGreaterThanOrEqual(2);
    expect(logicNode.body[0].kind).toBe("const-decl");
    expect(logicNode.body[1].kind).toBe("sql");
  });
});
