/**
 * <poll> lifecycle element — §6.7.6
 *
 * Tests for <poll> parsing, codegen output, and error/warning codes.
 *
 * §1  Poll markup node parses as kind:"markup" tag:"poll"
 * §2  Poll interval attribute is extracted
 * §3  emit-html.js silences poll elements (no HTML output)
 * §4  emit-reactive-wiring.js emits _scrml_timer_start for poll
 * §5  running=@var emits _scrml_reactive_subscribe
 * §6  _scrml_register_cleanup is emitted for poll teardown
 * §7  E-LIFECYCLE-009: poll missing interval emits error
 * §8  E-LIFECYCLE-010: poll interval <= 0 emits error
 * §9  E-LIFECYCLE-012: poll with no body is always an error (not a warning)
 * §10 W-LIFECYCLE-007: poll running=false literal emits warning
 * §11 Poll distinct from timer in tag name
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { generateHtml } from "../../src/codegen/emit-html.js";
import { emitReactiveWiring } from "../../src/codegen/emit-reactive-wiring.js";
import { makeCompileContext } from "../../src/codegen/context.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseSource(source, filePath = "/test/app.scrml") {
  const bsResult = splitBlocks(filePath, source);
  const tabResult = buildAST(bsResult);
  return tabResult;
}

function findMarkupNodes(nodes, tag) {
  const found = [];
  function walk(list) {
    for (const node of list) {
      if (!node) continue;
      if (node.kind === "markup" && node.tag === tag) found.push(node);
      if (Array.isArray(node.children)) walk(node.children);
    }
  }
  walk(nodes);
  return found;
}

function compileSource(source) {
  const { ast, errors: tabErrors } = parseSource(source);
  const cgErrors = [];
  const html = generateHtml(ast.nodes, cgErrors, false, null, ast);
  const reactiveLines = emitReactiveWiring(makeCompileContext({ fileAST: ast, errors: cgErrors }));
  return { ast, html, reactiveLines, errors: cgErrors };
}

// ---------------------------------------------------------------------------
// §1: Poll markup node parsing
// ---------------------------------------------------------------------------

describe("§1: poll markup node parses as kind:markup tag:poll", () => {
  test("poll with interval parses as markup node", () => {
    const source = `<program>
<div>
<poll interval=5000>
  \${ @data = @data }
</>
</>
</>`;
    const { ast } = parseSource(source);
    const pollNodes = findMarkupNodes(ast.nodes, "poll");
    expect(pollNodes).toHaveLength(1);
    expect(pollNodes[0].kind).toBe("markup");
    expect(pollNodes[0].tag).toBe("poll");
  });
});

// ---------------------------------------------------------------------------
// §2: Poll interval attribute
// ---------------------------------------------------------------------------

describe("§2: poll interval attribute is extracted", () => {
  test("interval=10000 is present in attrs", () => {
    const source = `<program>
<div>
<poll interval=10000>
  \${ @serverData = @serverData }
</>
</>
</>`;
    const { ast } = parseSource(source);
    const pollNode = findMarkupNodes(ast.nodes, "poll")[0];
    const intervalAttr = pollNode.attrs.find(a => a.name === "interval");
    expect(intervalAttr).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// §3: emit-html.js silences poll elements
// ---------------------------------------------------------------------------

describe("§3: emit-html.js produces no HTML for <poll>", () => {
  test("poll element does not appear in HTML output", () => {
    const source = `<program>
<div>
<poll interval=5000>
  \${ @data = @data }
</>
</>
</>`;
    const { html } = compileSource(source);
    expect(html).not.toContain("<poll");
    expect(html).not.toContain("</poll>");
  });

  test("parent div still appears in HTML output", () => {
    const source = `<program>
<div>
<poll interval=5000>
  \${ @data = @data }
</>
</>
</>`;
    const { html } = compileSource(source);
    expect(html).toContain("<div");
    expect(html).toContain("</div>");
  });
});

// ---------------------------------------------------------------------------
// §4: emit-reactive-wiring.js emits _scrml_timer_start for poll
// ---------------------------------------------------------------------------

describe("§4: _scrml_timer_start is emitted for poll", () => {
  test("compiled output contains _scrml_timer_start for poll", () => {
    const source = `<program>
<div>
<poll interval=5000>
  \${ @data = @data }
</>
</>
</>`;
    const { reactiveLines } = compileSource(source);
    const combined = reactiveLines.join("\n");
    expect(combined).toContain("_scrml_timer_start(");
  });

  test("_scrml_timer_start includes the poll interval", () => {
    const source = `<program>
<div>
<poll interval=7500>
  \${ @data = @data }
</>
</>
</>`;
    const { reactiveLines } = compileSource(source);
    const combined = reactiveLines.join("\n");
    expect(combined).toContain("7500");
  });

  test("poll with named id uses id in codegen", () => {
    const source = `<program>
<div>
<poll id="priceData" interval=5000>
  \${ @price = @price }
</>
</>
</>`;
    const { reactiveLines } = compileSource(source);
    const combined = reactiveLines.join("\n");
    expect(combined).toContain("priceData");
  });
});

// ---------------------------------------------------------------------------
// §5: running=@var emits reactive subscription
// ---------------------------------------------------------------------------

describe("§5: running=@var emits pause/resume subscription for poll", () => {
  test("running=@active emits _scrml_effect", () => {
    const source = `<program>
@active = true
<div>
<poll interval=5000 running=@active>
  \${ @data = @data }
</>
</>
</>`;
    const { reactiveLines } = compileSource(source);
    const combined = reactiveLines.join("\n");
    expect(combined).toContain('_scrml_effect');
  });
});

// ---------------------------------------------------------------------------
// §6: cleanup registration
// ---------------------------------------------------------------------------

describe("§6: _scrml_register_cleanup emitted for poll teardown", () => {
  test("compiled output contains _scrml_register_cleanup for poll", () => {
    const source = `<program>
<div>
<poll interval=5000>
  \${ @data = @data }
</>
</>
</>`;
    const { reactiveLines } = compileSource(source);
    const combined = reactiveLines.join("\n");
    expect(combined).toContain("_scrml_register_cleanup(");
    expect(combined).toContain("_scrml_timer_stop(");
  });
});

// ---------------------------------------------------------------------------
// §7: E-LIFECYCLE-009: poll missing interval
// ---------------------------------------------------------------------------

describe("§7: E-LIFECYCLE-009 — poll missing interval", () => {
  test("poll without interval attr emits E-LIFECYCLE-009", () => {
    const source = `<program>
<div>
<poll>
  \${ @data = @data }
</>
</>
</>`;
    const { errors } = compileSource(source);
    const e009 = errors.find(e => e.code === "E-LIFECYCLE-009");
    expect(e009).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// §8: E-LIFECYCLE-010: poll interval <= 0
// ---------------------------------------------------------------------------

describe("§8: E-LIFECYCLE-010 — poll interval <= 0", () => {
  test("poll with interval=0 emits E-LIFECYCLE-010", () => {
    const source = `<program>
<div>
<poll interval=0>
  \${ @data = @data }
</>
</>
</>`;
    const { errors } = compileSource(source);
    const e010 = errors.find(e => e.code === "E-LIFECYCLE-010");
    expect(e010).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// §9: E-LIFECYCLE-012: poll with no body is always an error
// ---------------------------------------------------------------------------

describe("§9: E-LIFECYCLE-012 — poll with no body is always an error", () => {
  test("self-closing poll emits E-LIFECYCLE-012 (not just a warning)", () => {
    const source = `<program>
<div>
<poll interval=5000/>
</>
</>`;
    const { errors } = compileSource(source);
    const e012 = errors.find(e => e.code === "E-LIFECYCLE-012");
    expect(e012).toBeDefined();
    // Confirm it's an error code, not a warning
    expect(e012.code).toMatch(/^E-/);
  });

  test("self-closing timer emits W-LIFECYCLE-002 (warning, not error)", () => {
    const source = `<program>
<div>
<timer interval=1000/>
</>
</>`;
    const { errors } = compileSource(source);
    const w002 = errors.find(e => e.code === "W-LIFECYCLE-002");
    expect(w002).toBeDefined();
    // Timer no-body is warning; poll no-body is error — different behavior
    const e012 = errors.find(e => e.code === "E-LIFECYCLE-012");
    expect(e012).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// §10: W-LIFECYCLE-007: poll running=false literal
// ---------------------------------------------------------------------------

describe("§10: W-LIFECYCLE-007 — poll running=false literal", () => {
  test("poll running=false emits W-LIFECYCLE-007", () => {
    const source = `<program>
<div>
<poll interval=5000 running=false>
  \${ @data = @data }
</>
</>
</>`;
    const { errors } = compileSource(source);
    const w007 = errors.find(e => e.code === "W-LIFECYCLE-007");
    expect(w007).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// §11: Poll is distinct from timer
// ---------------------------------------------------------------------------

describe("§11: poll tag is distinct from timer tag", () => {
  test("poll parses as tag:poll, not tag:timer", () => {
    const source = `<program>
<div>
<poll interval=5000>
  \${ @data = @data }
</>
</>
</>`;
    const { ast } = parseSource(source);
    const pollNodes = findMarkupNodes(ast.nodes, "poll");
    const timerNodes = findMarkupNodes(ast.nodes, "timer");
    expect(pollNodes).toHaveLength(1);
    expect(timerNodes).toHaveLength(0);
    expect(pollNodes[0].tag).toBe("poll");
  });

  test("both timer and poll can appear in the same element scope", () => {
    const source = `<program>
<div>
<timer interval=1000>
  \${ @tick = @tick + 1 }
</>
<poll interval=5000>
  \${ @data = @data }
</>
</>
</>`;
    const { reactiveLines } = compileSource(source);
    const combined = reactiveLines.join("\n");
    // Both should be initialized
    const timerStartCount = (combined.match(/_scrml_timer_start/g) || []).length;
    expect(timerStartCount).toBeGreaterThanOrEqual(2);
  });
});
