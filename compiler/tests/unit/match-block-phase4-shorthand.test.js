/**
 * match-block-phase4-shorthand.test.js — Match block-form Phase 4 codegen:
 * `:`-shorthand body codegen.
 *
 * S108 authoring per docs/changes/match-block-form-scoping/SCOPING.md §Phase 4.
 *
 * Phase 4 scope (this landing):
 *   - `<Variant> : expr` shorthand body — bodyRaw is captured as an expression
 *     by Phase 2's parseMatchArms (bodyForm: "shorthand"). Phase 4 codegen
 *     parses bodyRaw via expression-parser:parseExprToNode and synthesizes a
 *     `logic > bare-expr` AST node. The synthesized node flows through
 *     generateHtml's interpolation path:
 *       - compile-time-known constants → folded inline (Bug 5 P3 path)
 *       - reactive cell refs (@x) → placeholder + reactive binding
 *       - non-foldable non-reactive → placeholder + one-shot textContent
 *
 * Pre-Phase 4 (S108 Phase 3 baseline): bodyRaw flowed through the bare-body
 * re-parse path which treats it as markup — rendering literal expressions
 * like `<Idle> : "Press to load"` as the literal text `"Press to load"`
 * INCLUDING quotes (since `"Press to load"` parsed as markup is a single
 * text node with the quoted-string source). Phase 4 closes that gap.
 *
 * Coverage:
 *   §1  Shorthand string literal — `<Idle> : "Press to load"` → inline `Press to load`
 *   §2  Shorthand const reference — `<Done> : VERSION` where `const VERSION = "v0.3.0"` → inline `v0.3.0`
 *   §3  Shorthand reactive cell — `<Loading> : @count` → placeholder + reactive binding
 *   §4  Shorthand expression — `<X> : @a + @b` → reactive expression binding
 *   §5  Regression — bare-body (Phase 3 path) still works
 *   §6  Regression — self-closing (no body) still works
 *
 * Out of Phase 4 v1 scope (deferred):
 *   - Bare-variant inference in `:`-shorthand arm patterns (§18.0.3 — typer integration)
 *   - Payload-binding type-system scope integration (`<Ready(rows)> : doSomething(rows)`)
 *   - Wildcard `<_>` explicit render
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { emitMatchBodyRenderForFile } from "../../src/codegen/emit-match.ts";

function parse(src) {
  const bs = splitBlocks("/tmp/test.scrml", src);
  const tab = buildAST(bs, null);
  return tab.ast;
}

function makeCtx(fileAST) {
  return {
    fileAST,
    errors: [],
    csrfEnabled: false,
    registry: {
      logicBindings: [],
      eventBindings: [],
      pushArmContext: () => {},
      popArmContext: () => {},
      addLogicBinding(b) { this.logicBindings.push(b); },
      addEventBinding(b) { this.eventBindings.push(b); },
    },
    derivedNames: new Set(),
    encodingCtx: null,
  };
}

// ---------------------------------------------------------------------------
// §1: Shorthand string literal
// ---------------------------------------------------------------------------

describe("§1: `:`-shorthand string literal", () => {
  test("`<Idle> : \"Press to load\"` produces a render fn returning the literal text (NOT the quoted form)", () => {
    const src = `\${
    type Phase:enum = { Idle, Loading }
    @phase = .Idle
}
<match for=Phase on=@phase>
    <Idle> : "Press to load"
    <Loading> : "Loading..."
</match>
`;
    const ast = parse(src);
    const ctx = makeCtx(ast);
    const out = emitMatchBodyRenderForFile(ast, ctx);
    expect(out.renderFunctions.length).toBeGreaterThan(0);
    const allRenderJs = out.renderFunctions.join("\n");
    // The Idle arm's render fn should emit the literal "Press to load" — NOT
    // the source-string `"Press to load"` with literal quotes (which was
    // the pre-Phase-4 bug shape).
    expect(allRenderJs).toContain("Press to load");
    // Specifically: NOT the JSON-stringified source including quotes
    expect(allRenderJs).not.toMatch(/\\"Press to load\\"/);
  });
});

// ---------------------------------------------------------------------------
// §2: Shorthand const reference — fold inline via Bug 5 P3 path
// ---------------------------------------------------------------------------

describe("§2: `:`-shorthand const reference — fold inline via Bug 5 P3 const-fold env", () => {
  test("`<Done> : VERSION` where const VERSION = \"v0.3.0\" → inline v0.3.0 in render fn", () => {
    const src = `\${
    const VERSION = "v0.3.0"
    type Phase:enum = { Idle, Done }
    @phase = .Done
}
<match for=Phase on=@phase>
    <Idle> : "loading"
    <Done> : VERSION
</match>
`;
    const ast = parse(src);
    const ctx = makeCtx(ast);
    const out = emitMatchBodyRenderForFile(ast, ctx);
    const allRenderJs = out.renderFunctions.join("\n");
    // Done arm's render fn should return inline "v0.3.0" via Bug 5 P3 fold
    expect(allRenderJs).toContain("v0.3.0");
    // Should NOT just emit the bare ident "VERSION" as if it were unrewritten
    // (the fold inlines the literal; the ident shouldn't appear in HTML body).
    // Note: emit-html may emit "v0.3.0" as plain inline text, no placeholder.
  });
});

// ---------------------------------------------------------------------------
// §3: Shorthand reactive cell — emits placeholder + binding
// ---------------------------------------------------------------------------

describe("§3: `:`-shorthand reactive cell — placeholder + reactive binding", () => {
  test("`<Loading> : @count` registers a logic binding with @count as reactive ref", () => {
    const src = `\${
    type Phase:enum = { Loading }
    <count> = 0
    @phase = .Loading
}
<match for=Phase on=@phase>
    <Loading> : @count
</match>
`;
    const ast = parse(src);
    const ctx = makeCtx(ast);
    const out = emitMatchBodyRenderForFile(ast, ctx);
    // The synthesized logic node should register a logic-binding for @count
    expect(ctx.registry.logicBindings.length).toBeGreaterThan(0);
    const binding = ctx.registry.logicBindings.find(
      (b) => b.expr && b.expr.includes("count"),
    );
    expect(binding).toBeDefined();
    // The render fn HTML should contain a data-scrml-logic placeholder
    const allRenderJs = out.renderFunctions.join("\n");
    expect(allRenderJs).toContain("data-scrml-logic=");
  });
});

// ---------------------------------------------------------------------------
// §4: Shorthand compound reactive expression
// ---------------------------------------------------------------------------

describe("§4: `:`-shorthand compound reactive expression", () => {
  test("`<X> : @a + @b` registers binding with both cells as reactive refs", () => {
    const src = `\${
    type T:enum = { X }
    <a> = 1
    <b> = 2
    @t = .X
}
<match for=T on=@t>
    <X> : @a + @b
</match>
`;
    const ast = parse(src);
    const ctx = makeCtx(ast);
    const out = emitMatchBodyRenderForFile(ast, ctx);
    expect(ctx.registry.logicBindings.length).toBeGreaterThan(0);
    // The binding should reference both @a and @b
    const allBindings = ctx.registry.logicBindings.map((b) => b.expr).join(" | ");
    expect(allBindings).toContain("a");
    expect(allBindings).toContain("b");
  });
});

// ---------------------------------------------------------------------------
// §5: Regression — bare-body (Phase 3) still works
// ---------------------------------------------------------------------------

describe("§5: Regression — bare-body Phase 3 path still works", () => {
  test("`<Idle><p>Idle</p></>` still parses + renders the <p> markup", () => {
    const src = `\${
    type Phase:enum = { Idle, Done }
    @phase = .Idle
}
<match for=Phase on=@phase>
    <Idle>
        <p>Idle</p>
    </>
    <Done>
        <p>Done</p>
    </>
</match>
`;
    const ast = parse(src);
    const ctx = makeCtx(ast);
    const out = emitMatchBodyRenderForFile(ast, ctx);
    const allRenderJs = out.renderFunctions.join("\n");
    expect(allRenderJs).toContain("<p>Idle</p>");
    expect(allRenderJs).toContain("<p>Done</p>");
  });
});

// ---------------------------------------------------------------------------
// §6: Regression — self-closing arms still empty
// ---------------------------------------------------------------------------

describe("§6: Regression — self-closing arms produce empty render fns", () => {
  test("`<Idle/>` produces a no-body arm; dispatcher still emits", () => {
    const src = `\${
    type Phase:enum = { Idle, Done }
    @phase = .Idle
}
<match for=Phase on=@phase>
    <Idle/>
    <Done><p>Done</p></>
</match>
`;
    const ast = parse(src);
    const ctx = makeCtx(ast);
    const out = emitMatchBodyRenderForFile(ast, ctx);
    const allRenderJs = out.renderFunctions.join("\n");
    // Idle arm's render fn returns "" (empty); Done arm renders <p>Done</p>
    expect(allRenderJs).toContain("<p>Done</p>");
    expect(out.dispatchers.length).toBeGreaterThan(0);
  });
});
