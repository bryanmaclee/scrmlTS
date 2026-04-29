/**
 * else / else-if= — Unit Tests (§17.1.1)
 *
 * Tests for if=/else-if=/else chain collapsing in the AST builder
 * and codegen output for conditional branch rendering.
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { generateHtml } from "../../src/codegen/emit-html.js";
import { BindingRegistry } from "../../src/codegen/binding-registry.ts";
import { resetVarCounter } from "../../src/codegen/var-counter.ts";

function parse(source) {
  const bsOut = splitBlocks("test.scrml", source);
  return buildAST(bsOut);
}

function programNodes(source) {
  const result = parse(source);
  const prog = result.ast.nodes.find(n => n.kind === "markup" && n.tag === "program");
  return { children: prog?.children ?? [], errors: result.errors };
}

beforeEach(() => {
  resetVarCounter();
});

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

// ---------------------------------------------------------------------------
// §3: Chain branches do not leak if=/else-if=/else attributes
//
// Regression test N31 (Phase 2c recon §5.1, deep-dive §8.2):
//   if-chain branches retain their `if=` / `else-if=` / `else` attribute on
//   `branch.element`. The chain wrapper drives visibility — the inner
//   element's attribute is purely AST-level metadata. Two failure modes if
//   not stripped:
//     (a) TODAY (display-toggle path):  inner element renders with a
//         meaningless `if="..."` HTML attribute leaked into the DOM.
//     (b) POST-Phase-2c (mount/unmount path):  inner if= triggers the
//         `<template>+marker` early-out, producing a duplicate reactive
//         controller fighting with the chain wrapper over the same DOM
//         region.
//
// The strip in emit-html.ts (stripChainBranchAttrs) closes both vectors and
// is invariant under the Phase 2c emission strategy. These tests lock in the
// right shape today AND post-Phase-2c.
// ---------------------------------------------------------------------------

describe("§17.1.1 — chain branches do not leak if=/else-if=/else attributes", () => {
  function compileToHtml(source) {
    const result = parse(source);
    const registry = new BindingRegistry();
    return generateHtml(result.ast.nodes, [], false, registry, result.ast);
  }

  test("N31: 2-branch if/else chain emits no leaked if=/else attribute on inner elements", () => {
    const html = compileToHtml(`<program>
      <div if=@a>A</>
      <div else>B</>
    </>`);
    // Wrapper attributes are present (chain controller).
    expect(html).toContain("data-scrml-if-chain=");
    expect(html).toContain("data-scrml-chain-branch=");
    // Inner elements do NOT leak `if="..."` or `else=""` HTML attributes.
    expect(html).not.toMatch(/<div\b[^>]*\sif="/);
    expect(html).not.toMatch(/<div\b[^>]*\selse=/);
    expect(html).not.toMatch(/<div\b[^>]*\selse-if=/);
  });

  test("N31: 3-branch if/else-if/else chain — no leaked attrs on any branch", () => {
    const html = compileToHtml(`<program>
      <div if=@a>A</>
      <div else-if=@b>B</>
      <div else>C</>
    </>`);
    expect(html).toContain("data-scrml-if-chain=");
    // No inner element should carry if=, else-if=, or else.
    expect(html).not.toMatch(/<div\b[^>]*\sif="/);
    expect(html).not.toMatch(/<div\b[^>]*\selse-if="/);
    expect(html).not.toMatch(/<div\b[^>]*\selse=/);
    // Body content from each branch is still emitted.
    expect(html).toContain("A");
    expect(html).toContain("B");
    expect(html).toContain("C");
  });

  test("N31: clean-subtree chain branches do NOT trigger the mount/unmount early-out", () => {
    // Each branch's body is a static text node — would otherwise pass the
    // cleanliness gate and go through the template+marker path. The chain
    // branch strip prevents that — chain-wrapped elements never enter the
    // mount/unmount emission, regardless of subtree cleanliness.
    const html = compileToHtml(`<program>
      <div if=@a>plain text A</>
      <div else>plain text B</>
    </>`);
    // No <template> element emitted inside the chain.
    expect(html).not.toContain("<template");
    // No mount/unmount marker comment emitted.
    expect(html).not.toContain("scrml-if-marker");
    // No data-scrml-bind-if attribute emitted (mount path uses marker comment instead).
    expect(html).not.toContain("data-scrml-bind-if=");
  });

  test("N31: standalone if= (no chain) is unaffected by the chain-strip", () => {
    // Sanity check: the strip ONLY applies inside chains. A standalone if=
    // element is free to take whatever emission strategy emit-html chooses
    // (display-toggle today; mount/unmount post-Phase-2c).
    const html = compileToHtml(`<program>
      <div if=@solo>standalone</>
      <p>next</>
    </>`);
    // Wrapper attributes are NOT present (no chain).
    expect(html).not.toContain("data-scrml-if-chain=");
  });
});
