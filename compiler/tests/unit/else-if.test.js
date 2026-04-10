/**
 * else / else-if= — Unit Tests (§17.1.1)
 *
 * Tests for if=/else-if=/else chain collapsing in the AST builder
 * and codegen output for conditional branch rendering.
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

function parse(source) {
  const bsOut = splitBlocks("test.scrml", source);
  return buildAST(bsOut);
}

function programNodes(source) {
  const result = parse(source);
  const prog = result.ast.nodes.find(n => n.kind === "markup" && n.tag === "program");
  return { children: prog?.children ?? [], errors: result.errors };
}

// ---------------------------------------------------------------------------
// §1: if/else chain detection
// ---------------------------------------------------------------------------

describe("§17.1.1 — if/else chain collapsing", () => {
  test("if/else sibling pair collapses into if-chain node", () => {
    const { children } = programNodes(`<program>
      <span if=@show>visible</>
      <span else>hidden</>
    </>`);
    const chain = children.find(n => n.kind === "if-chain");
    expect(chain).toBeDefined();
    expect(chain.branches.length).toBe(1);
    expect(chain.elseBranch).toBeDefined();
  });

  test("if/else-if/else chain collapses correctly", () => {
    const { children } = programNodes(`<program>
      <div if=@a>A</>
      <div else-if=@b>B</>
      <div else>C</>
    </>`);
    const chain = children.find(n => n.kind === "if-chain");
    expect(chain).toBeDefined();
    expect(chain.branches.length).toBe(2); // if + else-if
    expect(chain.elseBranch).toBeDefined();
  });

  test("standalone if= (no else) is NOT collapsed", () => {
    const { children } = programNodes(`<program>
      <span if=@show>visible</>
      <p>other</>
    </>`);
    const chain = children.find(n => n.kind === "if-chain");
    expect(chain).toBeUndefined();
    const ifNode = children.find(n => n.kind === "markup" && n.tag === "span");
    expect(ifNode).toBeDefined();
  });

  test("whitespace between siblings does not break chain", () => {
    const { children } = programNodes(`<program>
      <span if=@show>visible</>

      <span else>hidden</>
    </>`);
    const chain = children.find(n => n.kind === "if-chain");
    expect(chain).toBeDefined();
  });

  test("non-whitespace element between siblings breaks chain", () => {
    const { children } = programNodes(`<program>
      <span if=@show>visible</>
      <p>separator</>
      <span else>orphaned</>
    </>`);
    // else without preceding if= → E-CTRL-001
    const chain = children.find(n => n.kind === "if-chain");
    expect(chain).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// §2: Error codes
// ---------------------------------------------------------------------------

describe("§17.1.1 — error codes", () => {
  test("E-CTRL-001: orphaned else", () => {
    const { errors } = programNodes(`<program>
      <p>text</>
      <span else>orphan</>
    </>`);
    const err = errors.find(e => e.code === "E-CTRL-001");
    expect(err).toBeDefined();
  });

  test("E-CTRL-002: orphaned else-if", () => {
    const { errors } = programNodes(`<program>
      <p>text</>
      <span else-if=@x>orphan</>
    </>`);
    const err = errors.find(e => e.code === "E-CTRL-002");
    expect(err).toBeDefined();
  });

  test("E-CTRL-003: chain extends past else", () => {
    const { errors } = programNodes(`<program>
      <span if=@a>A</>
      <span else>B</>
      <span else>C</>
    </>`);
    const err = errors.find(e => e.code === "E-CTRL-003");
    expect(err).toBeDefined();
  });

  test("E-CTRL-005: if + else on same element", () => {
    const { errors } = programNodes(`<program>
      <span if=@a else>both</>
    </>`);
    const err = errors.find(e => e.code === "E-CTRL-005");
    expect(err).toBeDefined();
  });

  test("no errors for valid if/else chain", () => {
    const { errors } = programNodes(`<program>
      <span if=@show>A</>
      <span else>B</>
    </>`);
    const ctrlErrors = errors.filter(e => e.code?.startsWith("E-CTRL-"));
    expect(ctrlErrors.length).toBe(0);
  });

  test("no errors for valid if/else-if/else chain", () => {
    const { errors } = programNodes(`<program>
      <div if=@a>A</>
      <div else-if=@b>B</>
      <div else-if=@c>C</>
      <div else>D</>
    </>`);
    const ctrlErrors = errors.filter(e => e.code?.startsWith("E-CTRL-"));
    expect(ctrlErrors.length).toBe(0);
  });
});
