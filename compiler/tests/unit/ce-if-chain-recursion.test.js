/**
 * CE if-chain recursion — Bug 2a regression coverage.
 *
 * Reproduces the silent-drop pattern surfaced by Wave 3 D2 e2e against
 * examples/05-multi-step-form.scrml. Pre-fix, walkAndExpand fell through
 * to the "all other node kinds: pass through unchanged" tail when it
 * encountered an `if-chain` markup node, leaving any user-component
 * markup nodes inside `branches[].element` / `elseBranch` unexpanded.
 * Downstream emit-html serialised them as `<MyComponent />` text.
 *
 * Fix landed in compiler/src/component-expander.ts walkAndExpand +
 * walkAndExpandSingleMarkup helper. This file pins the behaviour:
 *   §A  consequent (first if=) branch
 *   §B  else-if= branch (chain middle)
 *   §C  else branch (chain tail)
 *   §D  combined chain (if=/else-if=/else) — full integration shape
 *   §E  hasAnyComponentRefs gate fires when refs only live inside chain
 *   §F  ast-walk visits chain branches (VP-2 backstop)
 *
 * Same SHAPE as Bug 6 silent-drop — the regression guard mirrors the
 * walker-recurses-into-control-flow invariant for if-chain.
 *
 * Conventions: idiomatic-examples styling rule applies — no file-top
 * `#{}` blocks in fixtures (S87 ratification).
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runCEFile } from "../../src/component-expander.js";
import { walkFileAst } from "../../src/validators/ast-walk.ts";

// ---------------------------------------------------------------------------
// Helpers (mirror component-expander.test.js conventions)
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

function findIfChain(nodes) {
  return collectNodes(nodes, "if-chain")[0];
}

function findMarkupByTag(nodes, tag) {
  return collectMarkup(nodes).find((n) => n.tag === tag);
}

// ---------------------------------------------------------------------------
// §A consequent branch (first if=)
// ---------------------------------------------------------------------------

describe("§A if-chain consequent branch — component ref expanded", () => {
  test("<MyStep if=@cond/> inlines as the first chain branch element", () => {
    const source = `<program>
\${
  <show> = true
  const MyStep = <div class="step"/>
}
<MyStep if=@show/>
<div else>fallback</div>
</program>`;
    const { ast, errors } = runCEOn(source);
    const ceErrors = errors.filter((e) => e.code && e.code.startsWith("E-COMPONENT-"));
    expect(ceErrors).toHaveLength(0);

    const chain = findIfChain(ast.nodes);
    expect(chain).toBeDefined();
    expect(chain.branches).toHaveLength(1);

    // Branch element should now be the expanded <div class="step"> — NOT a MyStep markup node.
    const branchElement = chain.branches[0].element;
    expect(branchElement).toBeDefined();
    expect(branchElement.kind).toBe("markup");
    expect(branchElement.tag).toBe("div");
    expect(branchElement._expandedFrom).toBe("MyStep");
    expect(branchElement.isComponent).toBeFalsy();

    // No residual MyStep node anywhere in the AST.
    const residual = collectMarkup(ast.nodes).find((n) => n.tag === "MyStep");
    expect(residual).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// §B else-if= branch (chain middle)
// ---------------------------------------------------------------------------

describe("§B if-chain else-if branch — component ref expanded", () => {
  test("<MidStep else-if=@cond/> inlines as the second chain branch element", () => {
    const source = `<program>
\${
  <a> = true
  <b> = false
  const MidStep = <section class="mid"/>
}
<div if=@a>first</div>
<MidStep else-if=@b/>
<div else>tail</div>
</program>`;
    const { ast, errors } = runCEOn(source);
    const ceErrors = errors.filter((e) => e.code && e.code.startsWith("E-COMPONENT-"));
    expect(ceErrors).toHaveLength(0);

    const chain = findIfChain(ast.nodes);
    expect(chain).toBeDefined();
    expect(chain.branches.length).toBeGreaterThanOrEqual(2);

    const midBranch = chain.branches[1];
    expect(midBranch.element.kind).toBe("markup");
    expect(midBranch.element.tag).toBe("section");
    expect(midBranch.element._expandedFrom).toBe("MidStep");

    const residual = collectMarkup(ast.nodes).find((n) => n.tag === "MidStep");
    expect(residual).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// §C else branch (chain tail)
// ---------------------------------------------------------------------------

describe("§C if-chain else branch — component ref expanded", () => {
  test("<TailStep else/> inlines as the elseBranch element", () => {
    const source = `<program>
\${
  <show> = false
  const TailStep = <article class="tail"/>
}
<div if=@show>first</div>
<TailStep else/>
</program>`;
    const { ast, errors } = runCEOn(source);
    const ceErrors = errors.filter((e) => e.code && e.code.startsWith("E-COMPONENT-"));
    expect(ceErrors).toHaveLength(0);

    const chain = findIfChain(ast.nodes);
    expect(chain).toBeDefined();
    expect(chain.elseBranch).toBeDefined();
    expect(chain.elseBranch.kind).toBe("markup");
    expect(chain.elseBranch.tag).toBe("article");
    expect(chain.elseBranch._expandedFrom).toBe("TailStep");

    const residual = collectMarkup(ast.nodes).find((n) => n.tag === "TailStep");
    expect(residual).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// §D combined chain — if=/else-if=/else, the full 05-multi-step-form shape
// ---------------------------------------------------------------------------

describe("§D combined chain — three component refs all inlined", () => {
  test("<First if=/> + <Second else-if=/> + <Third else/> all expand", () => {
    const source = `<program>
\${
  <step> = 1
  const First  = <div class="s1"/>
  const Second = <div class="s2"/>
  const Third  = <div class="s3"/>
}
<First  if=(@step == 1)/>
<Second else-if=(@step == 2)/>
<Third  else/>
</program>`;
    const { ast, errors } = runCEOn(source);
    const ceErrors = errors.filter((e) => e.code && e.code.startsWith("E-COMPONENT-"));
    expect(ceErrors).toHaveLength(0);

    const chain = findIfChain(ast.nodes);
    expect(chain).toBeDefined();
    expect(chain.branches).toHaveLength(2);
    expect(chain.elseBranch).toBeDefined();

    expect(chain.branches[0].element._expandedFrom).toBe("First");
    expect(chain.branches[1].element._expandedFrom).toBe("Second");
    expect(chain.elseBranch._expandedFrom).toBe("Third");

    // No residual user-component markup nodes anywhere.
    for (const tag of ["First", "Second", "Third"]) {
      expect(collectMarkup(ast.nodes).find((n) => n.tag === tag)).toBeUndefined();
    }
  });

  test("expanded children inside chain branches retain their original child markup", () => {
    // Verify that the component body's children survive expansion (not just the root).
    const source = `<program>
\${
  <show> = true
  const Wrap = <div class="wrap"><span class="inner"/></div>
}
<Wrap if=@show/>
<div else>nope</div>
</program>`;
    const { ast } = runCEOn(source);
    const chain = findIfChain(ast.nodes);
    expect(chain).toBeDefined();
    const branchElement = chain.branches[0].element;
    expect(branchElement.tag).toBe("div");
    // The component body's <span class="inner"> child must be present.
    const innerSpan = collectMarkup([branchElement]).find((n) => n.tag === "span");
    expect(innerSpan).toBeDefined();
    expect(innerSpan.attrs.find((a) => a.name === "class").value.value).toBe("inner");
  });
});

// ---------------------------------------------------------------------------
// §E hasAnyComponentRefs gate fires when refs only live inside chain
// ---------------------------------------------------------------------------

describe("§E CE-skip gate — chain-only components still trigger CE", () => {
  test("file with components only in chain branches still gets CE-expanded", () => {
    // Pre-fix, hasAnyComponentRefs would not descend into if-chain branches,
    // potentially short-circuiting CE on files where the only component refs
    // live inside a chain. Confirm the gate now fires.
    const source = `<program>
\${
  <on> = true
  const Only = <p class="only"/>
}
<Only if=@on/>
<div else>x</div>
</program>`;
    const { ast, errors } = runCEOn(source);
    const ceErrors = errors.filter((e) => e.code && e.code.startsWith("E-COMPONENT-"));
    expect(ceErrors).toHaveLength(0);

    // The Only component must have expanded. If the gate failed, the chain
    // branch would still hold an Only markup node.
    const chain = findIfChain(ast.nodes);
    expect(chain.branches[0].element.tag).toBe("p");
    expect(chain.branches[0].element._expandedFrom).toBe("Only");
  });
});

// ---------------------------------------------------------------------------
// §F ast-walk visits chain branches — VP-2 backstop
// ---------------------------------------------------------------------------

describe("§F walkFileAst descends into if-chain branches", () => {
  test("visitor sees the chain branch element node", () => {
    // Build a minimal AST with an if-chain whose branch element is a markup
    // node we can identify by tag. walkFileAst should visit it.
    const source = `<program>
\${ <show> = true }
<section if=@show class="branch-element"/>
<div else>tail</div>
</program>`;
    const bsOut = splitBlocks("test.scrml", source);
    const tabOut = buildAST(bsOut);
    const fileAst = tabOut.ast;

    const visited = [];
    walkFileAst(fileAst, (node) => {
      if (node && typeof node === "object" && node.kind === "markup" && node.tag === "section") {
        visited.push(node);
      }
    });

    // Pre-fix, the generic Array.isArray(n.branches) tail in walkNode would
    // call walkNode on the {condition, element} record but never recurse into
    // `element`. Post-fix, walkNode special-cases if-chain.
    expect(visited.length).toBeGreaterThanOrEqual(1);
  });

  test("visitor sees the elseBranch node", () => {
    const source = `<program>
\${ <show> = true }
<div if=@show>head</div>
<aside else class="else-element"/>
</program>`;
    const bsOut = splitBlocks("test.scrml", source);
    const tabOut = buildAST(bsOut);
    const fileAst = tabOut.ast;

    const visited = [];
    walkFileAst(fileAst, (node) => {
      if (node && typeof node === "object" && node.kind === "markup" && node.tag === "aside") {
        visited.push(node);
      }
    });

    expect(visited.length).toBeGreaterThanOrEqual(1);
  });
});
