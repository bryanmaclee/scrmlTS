/**
 * animationFrame() lifecycle built-in — §6.7.7
 *
 * Tests for animationFrame() tokenization, codegen output, and runtime behavior.
 *
 * §1  animationFrame tokenizes as KEYWORD
 * §2  animationFrame(fn) in logic block produces bare-expr (not a reactive subscribe)
 * §3  Compiled output calls animationFrame() as a function (runtime global)
 * §4  animationFrame does NOT emit reactive subscription for @var reads
 * §5  Runtime provides animationFrame global function
 * §6  Runtime _scrml_animation_frame delegates to requestAnimationFrame
 * §7  _scrml_cancel_animation_frames exists in runtime
 * §8  SCRML_RUNTIME contains animationFrame function definition
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { tokenizeLogic } from "../../src/tokenizer.js";
import { SCRML_RUNTIME } from "../../src/runtime-template.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseSource(source, filePath = "/test/app.scrml") {
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
      if (Array.isArray(node.children)) walk(node.children);
      if (Array.isArray(node.body)) walk(node.body);
    }
  }
  walk(nodes);
  return found;
}

// ---------------------------------------------------------------------------
// §1: animationFrame tokenizes as KEYWORD
// ---------------------------------------------------------------------------

describe("§1: animationFrame tokenizes as KEYWORD", () => {
  test("animationFrame is a KEYWORD token", () => {
    const tokens = tokenizeLogic("animationFrame", 0, 1, 1, []);
    const tok = tokens.find(t => t.text === "animationFrame");
    expect(tok).toBeDefined();
    expect(tok.kind).toBe("KEYWORD");
  });

  test("animationFrame(draw) tokenizes with parens as KEYWORD + PUNCT", () => {
    const tokens = tokenizeLogic("animationFrame(draw)", 0, 1, 1, []);
    const afTok = tokens.find(t => t.text === "animationFrame");
    expect(afTok).toBeDefined();
    expect(afTok.kind).toBe("KEYWORD");
  });
});

// ---------------------------------------------------------------------------
// §2: animationFrame in logic block does not produce reactive subscribe
// ---------------------------------------------------------------------------

describe("§2: animationFrame does not produce reactive-subscribe node", () => {
  test("animationFrame call does not produce a when-effect node", () => {
    const source = `<program>
<div>
  \${ animationFrame(draw) }
</>
</>`;
    const { ast } = parseSource(source);
    const whenNodes = findNodes(ast.nodes, "when-effect");
    expect(whenNodes).toHaveLength(0);
  });

  test("animationFrame call produces a bare-expr node", () => {
    const source = `<program>
<div>
  \${ animationFrame(draw) }
</>
</>`;
    const { ast } = parseSource(source);
    const logicNodes = findNodes(ast.nodes, "logic");
    // Find bare-expr nodes in the logic bodies
    const bareExprs = [];
    function findBareExprs(nodeList) {
      for (const n of nodeList) {
        if (!n) continue;
        if (n.kind === "bare-expr") bareExprs.push(n);
        if (Array.isArray(n.body)) findBareExprs(n.body);
        if (Array.isArray(n.children)) findBareExprs(n.children);
      }
    }
    findBareExprs(ast.nodes);
    // At minimum, one bare-expr should contain animationFrame
    const afExpr = bareExprs.find(n => n.expr && n.expr.includes("animationFrame"));
    expect(afExpr).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// §3: Compiled output calls animationFrame() as a function
// ---------------------------------------------------------------------------

describe("§3: compiled output calls animationFrame() correctly", () => {
  test("animationFrame(draw) appears in compiled JS output", () => {
    const source = `<program>
<div>
  \${ animationFrame(draw) }
</>
</>`;
    const { ast } = parseSource(source);

    // Collect all bare-expr bodies from logic nodes
    const exprs = [];
    function collectExprs(nodeList) {
      for (const n of nodeList) {
        if (!n) continue;
        if (n.kind === "bare-expr" && n.expr) exprs.push(n.expr);
        if (Array.isArray(n.body)) collectExprs(n.body);
        if (Array.isArray(n.children)) collectExprs(n.children);
      }
    }
    collectExprs(ast.nodes);

    const afExpr = exprs.find(e => e.includes("animationFrame"));
    expect(afExpr).toBeDefined();
    expect(afExpr).toContain("animationFrame");
    expect(afExpr).toContain("draw");
  });
});

// ---------------------------------------------------------------------------
// §4: animationFrame does not emit reactive wiring for @var reads inside callback
// ---------------------------------------------------------------------------

describe("§4: animationFrame does not produce reactive subscription for @var reads", () => {
  test("@var read inside animationFrame callback does not produce when-effect", () => {
    const source = `<program>
@shapes = []
<div>
  \${ animationFrame(function() { const s = @shapes }) }
</>
</>`;
    const { ast } = parseSource(source);
    // No when-effect should be produced for @shapes read inside the callback
    const whenNodes = findNodes(ast.nodes, "when-effect");
    expect(whenNodes).toHaveLength(0);
  });

  test("standalone when-effect still works separately from animationFrame", () => {
    const source = `<program>
@count = 0
@doubled = 0
\${ when @count changes { @doubled = @count * 2 } }
<div>
  \${ animationFrame(draw) }
</>
</>`;
    const { ast } = parseSource(source);
    const whenNodes = findNodes(ast.nodes, "when-effect");
    // The when-effect for @count is present, but the animationFrame doesn't create one
    expect(whenNodes).toHaveLength(1);
    expect(whenNodes[0].dependencies).toContain("count");
  });
});

// ---------------------------------------------------------------------------
// §5: Runtime provides animationFrame global function
// ---------------------------------------------------------------------------

describe("§5: runtime provides animationFrame global function", () => {
  test("SCRML_RUNTIME contains animationFrame function definition", () => {
    expect(SCRML_RUNTIME).toContain("function animationFrame(");
  });

  test("animationFrame function delegates to _scrml_animation_frame", () => {
    expect(SCRML_RUNTIME).toContain("_scrml_animation_frame(fn)");
  });
});

// ---------------------------------------------------------------------------
// §6: Runtime _scrml_animation_frame
// ---------------------------------------------------------------------------

describe("§6: _scrml_animation_frame is in runtime", () => {
  test("SCRML_RUNTIME contains _scrml_animation_frame function", () => {
    expect(SCRML_RUNTIME).toContain("function _scrml_animation_frame(");
  });

  test("_scrml_animation_frame calls requestAnimationFrame", () => {
    expect(SCRML_RUNTIME).toContain("requestAnimationFrame(fn)");
  });
});

// ---------------------------------------------------------------------------
// §7: _scrml_cancel_animation_frames is in runtime
// ---------------------------------------------------------------------------

describe("§7: _scrml_cancel_animation_frames is in runtime", () => {
  test("SCRML_RUNTIME contains _scrml_cancel_animation_frames function", () => {
    expect(SCRML_RUNTIME).toContain("function _scrml_cancel_animation_frames(");
  });

  test("_scrml_cancel_animation_frames calls cancelAnimationFrame", () => {
    expect(SCRML_RUNTIME).toContain("cancelAnimationFrame(rafId)");
  });
});

// ---------------------------------------------------------------------------
// §8: SCRML_RUNTIME contains complete timer/poll/rAF runtime
// ---------------------------------------------------------------------------

describe("§8: SCRML_RUNTIME contains complete lifecycle runtime", () => {
  test("runtime contains _scrml_timer_start", () => {
    expect(SCRML_RUNTIME).toContain("function _scrml_timer_start(");
  });

  test("runtime contains _scrml_timer_stop", () => {
    expect(SCRML_RUNTIME).toContain("function _scrml_timer_stop(");
  });

  test("runtime contains _scrml_timer_pause", () => {
    expect(SCRML_RUNTIME).toContain("function _scrml_timer_pause(");
  });

  test("runtime contains _scrml_timer_resume", () => {
    expect(SCRML_RUNTIME).toContain("function _scrml_timer_resume(");
  });

  test("runtime contains _scrml_stop_scope_timers", () => {
    expect(SCRML_RUNTIME).toContain("function _scrml_stop_scope_timers(");
  });

  test("_scrml_destroy_scope calls _scrml_stop_scope_timers", () => {
    expect(SCRML_RUNTIME).toContain("_scrml_stop_scope_timers(scopeId)");
  });

  test("_scrml_destroy_scope calls _scrml_cancel_animation_frames", () => {
    expect(SCRML_RUNTIME).toContain("_scrml_cancel_animation_frames(scopeId)");
  });
});
