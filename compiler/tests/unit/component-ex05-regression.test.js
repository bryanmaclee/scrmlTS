/**
 * Component Expander — ex05 regression tests
 *
 * Regression tests for the bug where component definitions at the TOP LEVEL
 * of a .scrml file (outside ${} blocks) leaked as literal text into HTML output.
 *
 * §Q  Component definitions in ${} blocks — registration and basic expansion
 *
 * Background:
 *   Component definitions (`const Name = <element>...</element>`) must be
 *   inside a ${} logic block. When placed at the TOP LEVEL of a .scrml file
 *   (outside ${}), the block splitter treats the `const Name =` prefix as a
 *   text block — the AST builder never creates component-def nodes, and CE
 *   never registers them. The HTML emitter then emits the text literally.
 *
 *   The correct pattern (matching examples/12-snippets-slots.scrml):
 *     ${ const InfoStep = <div class="step">...</div> }
 *
 *   Component references via `<ComponentName/>` at the MARKUP level (sibling
 *   to the definition block) ARE correctly expanded by CE.
 *
 *   NOTE: `lift <InfoStep>` inside match arm bodies uses a different code path.
 *   Inside ${} braces, `<InfoStep>` is NOT split as a BLOCK_REF by the block
 *   splitter — it remains as raw text in the logic tokenizer stream. The lift
 *   parser then produces lift-expr{kind:"expr"} rather than lift-expr{kind:"markup"},
 *   and CE's walkLogicBody() only handles the "markup" case. This is a compiler
 *   limitation documented by the last test in this file.
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runCEFile } from "../../src/component-expander.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runCEOn(source) {
  const bsOut = splitBlocks("test.scrml", source);
  const tabOut = buildAST(bsOut);
  return runCEFile(tabOut);
}

function collectNodes(nodes, kind) {
  const result = [];
  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (node.kind === kind) result.push(node);
    for (const key of Object.keys(node)) {
      if (key === "span") continue;
      const val = node[key];
      if (Array.isArray(val)) val.forEach(walk);
      else if (val && typeof val === "object") walk(val);
    }
  }
  nodes.forEach(walk);
  return result;
}

function collectMarkup(nodes) {
  return collectNodes(nodes, "markup");
}

// ---------------------------------------------------------------------------
// §Q  Component defs in ${} blocks — registration and markup-level expansion
// ---------------------------------------------------------------------------

describe("§Q component defs in ${} blocks — ex05 regression", () => {
  test("component def in ${} block is registered by CE (ast.components empty after CE)", () => {
    // Verifies the fix: wrapping in ${} makes the component-def visible to CE.
    const source = `<program>
\${ const InfoStep = <div class="info-step"/> }
</program>`;
    const { ast, errors } = runCEOn(source);

    // No component errors (unused component is OK)
    const ceErrors = errors.filter(e => e.code && e.code.startsWith("E-COMPONENT-"));
    expect(ceErrors).toHaveLength(0);

    // CE consumed the component-def into the registry (ast.components is empty)
    expect(ast.components).toHaveLength(0);
  });

  test("component def in ${} block is expanded when referenced at markup level", () => {
    // Standard markup-level expansion: <InfoStep/> as a sibling to the ${} def block.
    // This is the supported pattern (matching examples/12-snippets-slots.scrml).
    const source = `<program>
\${ const InfoStep = <div class="info-step"/> }
<InfoStep/>
</program>`;
    const { ast, errors } = runCEOn(source);

    // No component errors
    const ceErrors = errors.filter(e => e.code && e.code.startsWith("E-COMPONENT-"));
    expect(ceErrors).toHaveLength(0);

    // Component expander should have replaced <InfoStep/> with <div class="info-step"/>
    const divNode = collectMarkup(ast.nodes).find(n => n.tag === "div");
    expect(divNode).toBeDefined();
    expect(divNode.isComponent).not.toBe(true);
    expect(divNode._expandedFrom).toBe("InfoStep");
  });

  test("three component defs in one ${} block are all registered", () => {
    // Mirrors the fixed ex05 pattern: all three component defs in one ${} block.
    const source = `<program>
\${
  const StepA = <div class="step-a"/>
  const StepB = <div class="step-b"/>
  const StepC = <div class="step-c"/>
}
</program>`;
    const bsOut = splitBlocks("test.scrml", source);
    const tabOut = buildAST(bsOut);

    // All three should be in ast.components before CE
    expect(tabOut.ast.components).toHaveLength(3);
    expect(tabOut.ast.components.map(c => c.name)).toContain("StepA");
    expect(tabOut.ast.components.map(c => c.name)).toContain("StepB");
    expect(tabOut.ast.components.map(c => c.name)).toContain("StepC");

    // CE should consume them (registry built, ast.components empty)
    const { ast } = runCEFile(tabOut);
    expect(ast.components).toHaveLength(0);
  });

  test("top-level component def (outside ${}) is NOT recognized — documents current limitation", () => {
    // Top-level `const Name = <div/>` at the file level is treated as text
    // by the block splitter. CE cannot see it as a component-def.
    // The `const Name = ` prefix becomes a text node; the `<div/>` becomes
    // a separate markup block. CE never registers the component.
    // Referencing it as <TopLevelStep/> at markup level produces E-COMPONENT-020.
    const source = `<program>
const TopLevelStep = <div class="step"/>
<TopLevelStep/>
</program>`;
    const { errors } = runCEOn(source);

    // E-COMPONENT-020: component not found in file scope
    const e020 = errors.filter(e => e.code === "E-COMPONENT-020");
    expect(e020.length).toBeGreaterThanOrEqual(1);
    expect(e020[0].message).toContain("TopLevelStep");
  });

  test("lift <InfoStep> inside ${} match arm produces lift-expr with raw expr (current compiler limitation)", () => {
    // Documents the current behavior: `lift <InfoStep>` inside a match arm body
    // produces a lift-expr with {kind: "expr"} rather than {kind: "markup"}.
    // This is because the block splitter does NOT create BLOCK_REFs for `<Tag>`
    // inside brace contexts — it stays as raw text in the logic tokenizer stream.
    // CE's walkLogicBody() only handles lift-expr{kind:"markup"}, so the component
    // is NOT expanded when lifted inside a match arm.
    //
    // TODO: Fix the CE stage to handle lift-expr{kind:"expr"} for component names.
    const source = `<program>
\${ const InfoStep = <div class="info-step"/> }
\${ match (@step) {
  .Info :> { lift <InfoStep> }
} }
</program>`;
    const { ast, errors } = runCEOn(source);

    // CE doesn't produce component errors for this pattern (it doesn't see the ref)
    // but the lift-expr is NOT expanded to the component's markup
    const liftExprs = collectNodes(ast.nodes, "lift-expr");
    expect(liftExprs.length).toBeGreaterThanOrEqual(1);

    // The lift-expr inside the match arm has kind "expr" (raw) not kind "markup" (expanded)
    // This is the documented limitation
    const matchBodyLift = liftExprs.find(le => le.expr && le.expr.kind === "expr");
    expect(matchBodyLift).toBeDefined();
  });
});
