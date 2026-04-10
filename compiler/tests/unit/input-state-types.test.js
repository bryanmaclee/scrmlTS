/**
 * §35 Input State Types — <keyboard>, <mouse>, <gamepad>
 *
 * Tests for input state type parsing, codegen output, and error codes.
 *
 * §1  <keyboard> markup node parses as kind:"markup" tag:"keyboard"
 * §2  <mouse> markup node parses as kind:"markup" tag:"mouse"
 * §3  <gamepad> markup node parses as kind:"markup" tag:"gamepad"
 * §4  emit-html.js silences keyboard/mouse/gamepad (no HTML output)
 * §5  emit-reactive-wiring.js emits _scrml_input_keyboard_create
 * §6  emit-reactive-wiring.js emits _scrml_input_mouse_create
 * §7  emit-reactive-wiring.js emits _scrml_input_gamepad_create
 * §8  _scrml_register_cleanup is emitted for each input state type
 * §9  E-INPUT-001: <keyboard> missing id emits error
 * §10 E-INPUT-002: <mouse> missing id emits error
 * §11 E-INPUT-003: <gamepad> missing id emits error
 * §12 E-INPUT-004: <gamepad index=> out of range emits error
 * §13 mouse target= attribute is reflected in emitted code
 * §14 gamepad index= attribute is reflected in emitted code
 * §15 all three input state types can coexist in a single program
 * §16 rewriteInputStateRefs: <#id> expressions compile to runtime registry lookups (BUG-1 fix)
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { generateHtml } from "../../src/codegen/emit-html.js";
import { emitReactiveWiring } from "../../src/codegen/emit-reactive-wiring.js";
import { makeCompileContext } from "../../src/codegen/context.ts";
import { rewriteInputStateRefs, rewriteExpr } from "../../src/codegen/rewrite.js";

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
      if (node.kind === "logic" && Array.isArray(node.body)) walk(node.body);
    }
  }
  walk(nodes);
  return found;
}

function compileSource(source) {
  const { ast, errors } = parseSource(source);
  const htmlErrors = [];
  const html = generateHtml(ast.nodes, htmlErrors, false, null, ast);
  const reactiveLines = emitReactiveWiring(makeCompileContext({ fileAST: ast, errors: htmlErrors }));
  return { ast, html, reactiveLines, errors: htmlErrors };
}

// ---------------------------------------------------------------------------
// §1: <keyboard> markup node parsing
// ---------------------------------------------------------------------------

describe("§1: <keyboard> parses as kind:markup tag:keyboard", () => {
  test("keyboard self-closing parses correctly", () => {
    const source = `<program>
<div>
<keyboard id="keys"/>
</>
</>`;
    const { ast } = parseSource(source);
    const nodes = findMarkupNodes(ast.nodes, "keyboard");
    expect(nodes).toHaveLength(1);
    expect(nodes[0].kind).toBe("markup");
    expect(nodes[0].tag).toBe("keyboard");
  });

  test("keyboard id attribute is extracted", () => {
    const source = `<program>
<keyboard id="keys"/>
</>`;
    const { ast } = parseSource(source);
    const node = findMarkupNodes(ast.nodes, "keyboard")[0];
    const idAttr = (node.attrs ?? node.attributes ?? []).find(a => a.name === "id");
    expect(idAttr).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// §2: <mouse> markup node parsing
// ---------------------------------------------------------------------------

describe("§2: <mouse> parses as kind:markup tag:mouse", () => {
  test("mouse self-closing parses correctly", () => {
    const source = `<program>
<mouse id="cursor"/>
</>`;
    const { ast } = parseSource(source);
    const nodes = findMarkupNodes(ast.nodes, "mouse");
    expect(nodes).toHaveLength(1);
    expect(nodes[0].kind).toBe("markup");
    expect(nodes[0].tag).toBe("mouse");
  });

  test("mouse id attribute is extracted", () => {
    const source = `<program>
<mouse id="cursor"/>
</>`;
    const { ast } = parseSource(source);
    const node = findMarkupNodes(ast.nodes, "mouse")[0];
    const idAttr = (node.attrs ?? node.attributes ?? []).find(a => a.name === "id");
    expect(idAttr).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// §3: <gamepad> markup node parsing
// ---------------------------------------------------------------------------

describe("§3: <gamepad> parses as kind:markup tag:gamepad", () => {
  test("gamepad self-closing parses correctly", () => {
    const source = `<program>
<gamepad id="pad"/>
</>`;
    const { ast } = parseSource(source);
    const nodes = findMarkupNodes(ast.nodes, "gamepad");
    expect(nodes).toHaveLength(1);
    expect(nodes[0].kind).toBe("markup");
    expect(nodes[0].tag).toBe("gamepad");
  });

  test("gamepad id and index attributes are extracted", () => {
    const source = `<program>
<gamepad id="pad" index=1/>
</>`;
    const { ast } = parseSource(source);
    const node = findMarkupNodes(ast.nodes, "gamepad")[0];
    const attrs = node.attrs ?? node.attributes ?? [];
    const idAttr = attrs.find(a => a.name === "id");
    const indexAttr = attrs.find(a => a.name === "index");
    expect(idAttr).toBeDefined();
    expect(indexAttr).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// §4: emit-html.js silences keyboard/mouse/gamepad (no HTML output)
// ---------------------------------------------------------------------------

describe("§4: emit-html.js produces no HTML for input state types", () => {
  test("<keyboard> element does not appear in HTML output", () => {
    const source = `<program>
<keyboard id="keys"/>
</>`;
    const { html } = compileSource(source);
    expect(html).not.toContain("<keyboard");
    expect(html).not.toContain("keyboard");
  });

  test("<mouse> element does not appear in HTML output", () => {
    const source = `<program>
<mouse id="cursor"/>
</>`;
    const { html } = compileSource(source);
    expect(html).not.toContain("<mouse");
  });

  test("<gamepad> element does not appear in HTML output", () => {
    const source = `<program>
<gamepad id="pad"/>
</>`;
    const { html } = compileSource(source);
    expect(html).not.toContain("<gamepad");
    expect(html).not.toContain("gamepad");
  });

  test("parent div still appears in HTML output when keyboard is child", () => {
    const source = `<program>
<div class="game">
<keyboard id="keys"/>
</>
</>`;
    const { html } = compileSource(source);
    expect(html).toContain('<div class="game">');
    expect(html).not.toContain("<keyboard");
  });
});

// ---------------------------------------------------------------------------
// §5: emit-reactive-wiring.js emits _scrml_input_keyboard_create
// ---------------------------------------------------------------------------

describe("§5: _scrml_input_keyboard_create is emitted", () => {
  test("compiled output contains _scrml_input_keyboard_create", () => {
    const source = `<program>
<keyboard id="keys"/>
</>`;
    const { reactiveLines } = compileSource(source);
    const code = reactiveLines.join("\n");
    expect(code).toContain("_scrml_input_keyboard_create");
  });

  test("keyboard create call includes the user-supplied id", () => {
    const source = `<program>
<keyboard id="keys"/>
</>`;
    const { reactiveLines } = compileSource(source);
    const code = reactiveLines.join("\n");
    expect(code).toContain('"keys"');
  });

  test("keyboard comment references the id", () => {
    const source = `<program>
<keyboard id="keys"/>
</>`;
    const { reactiveLines } = compileSource(source);
    const code = reactiveLines.join("\n");
    expect(code).toContain('id="keys"');
  });
});

// ---------------------------------------------------------------------------
// §6: emit-reactive-wiring.js emits _scrml_input_mouse_create
// ---------------------------------------------------------------------------

describe("§6: _scrml_input_mouse_create is emitted", () => {
  test("compiled output contains _scrml_input_mouse_create", () => {
    const source = `<program>
<mouse id="cursor"/>
</>`;
    const { reactiveLines } = compileSource(source);
    const code = reactiveLines.join("\n");
    expect(code).toContain("_scrml_input_mouse_create");
  });

  test("mouse create call includes the user-supplied id", () => {
    const source = `<program>
<mouse id="cursor"/>
</>`;
    const { reactiveLines } = compileSource(source);
    const code = reactiveLines.join("\n");
    expect(code).toContain('"cursor"');
  });
});

// ---------------------------------------------------------------------------
// §7: emit-reactive-wiring.js emits _scrml_input_gamepad_create
// ---------------------------------------------------------------------------

describe("§7: _scrml_input_gamepad_create is emitted", () => {
  test("compiled output contains _scrml_input_gamepad_create", () => {
    const source = `<program>
<gamepad id="pad"/>
</>`;
    const { reactiveLines } = compileSource(source);
    const code = reactiveLines.join("\n");
    expect(code).toContain("_scrml_input_gamepad_create");
  });

  test("gamepad create call includes the user-supplied id", () => {
    const source = `<program>
<gamepad id="pad"/>
</>`;
    const { reactiveLines } = compileSource(source);
    const code = reactiveLines.join("\n");
    expect(code).toContain('"pad"');
  });
});

// ---------------------------------------------------------------------------
// §8: _scrml_register_cleanup is emitted for each input state type
// ---------------------------------------------------------------------------

describe("§8: _scrml_register_cleanup is emitted for input state types", () => {
  test("keyboard emits _scrml_register_cleanup with destroy call", () => {
    const source = `<program>
<keyboard id="keys"/>
</>`;
    const { reactiveLines } = compileSource(source);
    const code = reactiveLines.join("\n");
    expect(code).toContain("_scrml_register_cleanup");
    expect(code).toContain("_scrml_input_keyboard_destroy");
  });

  test("mouse emits _scrml_register_cleanup with destroy call", () => {
    const source = `<program>
<mouse id="cursor"/>
</>`;
    const { reactiveLines } = compileSource(source);
    const code = reactiveLines.join("\n");
    expect(code).toContain("_scrml_register_cleanup");
    expect(code).toContain("_scrml_input_mouse_destroy");
  });

  test("gamepad emits _scrml_register_cleanup with destroy call", () => {
    const source = `<program>
<gamepad id="pad"/>
</>`;
    const { reactiveLines } = compileSource(source);
    const code = reactiveLines.join("\n");
    expect(code).toContain("_scrml_register_cleanup");
    expect(code).toContain("_scrml_input_gamepad_destroy");
  });
});

// ---------------------------------------------------------------------------
// §9: E-INPUT-001: <keyboard> missing id
// ---------------------------------------------------------------------------

describe("§9: E-INPUT-001 — <keyboard> missing id", () => {
  test("keyboard without id emits E-INPUT-001", () => {
    const source = `<program>
<keyboard/>
</>`;
    const { errors } = compileSource(source);
    const e001 = errors.find(e => e.code === "E-INPUT-001");
    expect(e001).toBeDefined();
  });

  test("E-INPUT-001 message mentions id attribute", () => {
    const source = `<program>
<keyboard/>
</>`;
    const { errors } = compileSource(source);
    const e001 = errors.find(e => e.code === "E-INPUT-001");
    expect(e001.message).toContain("id");
    expect(e001.message).toContain("keyboard");
  });

  test("keyboard with id does NOT emit E-INPUT-001", () => {
    const source = `<program>
<keyboard id="keys"/>
</>`;
    const { errors } = compileSource(source);
    const e001 = errors.find(e => e.code === "E-INPUT-001");
    expect(e001).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// §10: E-INPUT-002: <mouse> missing id
// ---------------------------------------------------------------------------

describe("§10: E-INPUT-002 — <mouse> missing id", () => {
  test("mouse without id emits E-INPUT-002", () => {
    const source = `<program>
<mouse/>
</>`;
    const { errors } = compileSource(source);
    const e002 = errors.find(e => e.code === "E-INPUT-002");
    expect(e002).toBeDefined();
  });

  test("mouse with id does NOT emit E-INPUT-002", () => {
    const source = `<program>
<mouse id="cursor"/>
</>`;
    const { errors } = compileSource(source);
    const e002 = errors.find(e => e.code === "E-INPUT-002");
    expect(e002).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// §11: E-INPUT-003: <gamepad> missing id
// ---------------------------------------------------------------------------

describe("§11: E-INPUT-003 — <gamepad> missing id", () => {
  test("gamepad without id emits E-INPUT-003", () => {
    const source = `<program>
<gamepad/>
</>`;
    const { errors } = compileSource(source);
    const e003 = errors.find(e => e.code === "E-INPUT-003");
    expect(e003).toBeDefined();
  });

  test("gamepad with id does NOT emit E-INPUT-003", () => {
    const source = `<program>
<gamepad id="pad"/>
</>`;
    const { errors } = compileSource(source);
    const e003 = errors.find(e => e.code === "E-INPUT-003");
    expect(e003).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// §12: E-INPUT-004: <gamepad index=> out of range
// ---------------------------------------------------------------------------

describe("§12: E-INPUT-004 — <gamepad index=> out of range", () => {
  test("gamepad index=5 emits E-INPUT-004", () => {
    const source = `<program>
<gamepad id="pad" index=5/>
</>`;
    const { errors } = compileSource(source);
    const e004 = errors.find(e => e.code === "E-INPUT-004");
    expect(e004).toBeDefined();
  });

  test("E-INPUT-004 message mentions valid range", () => {
    const source = `<program>
<gamepad id="pad" index=5/>
</>`;
    const { errors } = compileSource(source);
    const e004 = errors.find(e => e.code === "E-INPUT-004");
    expect(e004.message).toContain("0, 1, 2, or 3");
  });

  test("gamepad index=0 does NOT emit E-INPUT-004", () => {
    const source = `<program>
<gamepad id="pad" index=0/>
</>`;
    const { errors } = compileSource(source);
    const e004 = errors.find(e => e.code === "E-INPUT-004");
    expect(e004).toBeUndefined();
  });

  test("gamepad index=3 does NOT emit E-INPUT-004", () => {
    const source = `<program>
<gamepad id="pad" index=3/>
</>`;
    const { errors } = compileSource(source);
    const e004 = errors.find(e => e.code === "E-INPUT-004");
    expect(e004).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// §13: mouse target= attribute is reflected in emitted code
// ---------------------------------------------------------------------------

describe("§13: mouse target= is passed to _scrml_input_mouse_create", () => {
  test("mouse with target=@canvas includes target expression in create call", () => {
    // Use string concatenation to avoid template literal issues with @canvas
    const source = "<program>\n<mouse id=\"cursor\" target=@canvas/>\n</>";
    const { reactiveLines } = compileSource(source);
    const code = reactiveLines.join("\n");
    // Should pass a target function, not null
    expect(code).toContain("_scrml_input_mouse_create");
    // The target expression wraps canvas in a getter
    expect(code).toContain("canvas");
  });

  test("mouse without target passes null", () => {
    const source = `<program>
<mouse id="cursor"/>
</>`;
    const { reactiveLines } = compileSource(source);
    const code = reactiveLines.join("\n");
    expect(code).toContain("null");
  });
});

// ---------------------------------------------------------------------------
// §14: gamepad index= attribute is reflected in emitted code
// ---------------------------------------------------------------------------

describe("§14: gamepad index= is passed to _scrml_input_gamepad_create", () => {
  test("gamepad with index=2 includes 2 in create call", () => {
    const source = `<program>
<gamepad id="pad" index=2/>
</>`;
    const { reactiveLines } = compileSource(source);
    const code = reactiveLines.join("\n");
    expect(code).toContain("_scrml_input_gamepad_create");
    expect(code).toContain(", 2)");
  });

  test("gamepad without index defaults to 0", () => {
    const source = `<program>
<gamepad id="pad"/>
</>`;
    const { reactiveLines } = compileSource(source);
    const code = reactiveLines.join("\n");
    expect(code).toContain(", 0)");
  });
});

// ---------------------------------------------------------------------------
// §15: All three input state types can coexist in a single program
// ---------------------------------------------------------------------------

describe("§15: multiple input state types coexist", () => {
  test("keyboard + mouse + gamepad all emit setup code", () => {
    const source = `<program>
<keyboard id="keys"/>
<mouse id="cursor"/>
<gamepad id="pad"/>
</>`;
    const { html, reactiveLines, errors } = compileSource(source);

    // No HTML for any of the three
    expect(html).not.toContain("<keyboard");
    expect(html).not.toContain("<mouse");
    expect(html).not.toContain("<gamepad");

    const code = reactiveLines.join("\n");

    // All three create calls are present
    expect(code).toContain("_scrml_input_keyboard_create");
    expect(code).toContain("_scrml_input_mouse_create");
    expect(code).toContain("_scrml_input_gamepad_create");

    // All three cleanup calls are present
    expect(code).toContain("_scrml_input_keyboard_destroy");
    expect(code).toContain("_scrml_input_mouse_destroy");
    expect(code).toContain("_scrml_input_gamepad_destroy");

    // No E-INPUT-* errors
    const inputErrors = errors.filter(e => e.code?.startsWith("E-INPUT-"));
    expect(inputErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §16: rewriteInputStateRefs — <#id> compiles to runtime registry lookup (BUG-1 fix)
// ---------------------------------------------------------------------------

describe("§16: rewriteInputStateRefs compiles <#id> to runtime registry lookup", () => {
  test("<#keys> rewrites to _scrml_input_state_registry.get(\"keys\")", () => {
    const result = rewriteInputStateRefs("<#keys>");
    expect(result).toBe('_scrml_input_state_registry.get("keys")');
  });

  test("<#cursor> rewrites to _scrml_input_state_registry.get(\"cursor\")", () => {
    const result = rewriteInputStateRefs("<#cursor>");
    expect(result).toBe('_scrml_input_state_registry.get("cursor")');
  });

  test("<#pad> rewrites to _scrml_input_state_registry.get(\"pad\")", () => {
    const result = rewriteInputStateRefs("<#pad>");
    expect(result).toBe('_scrml_input_state_registry.get("pad")');
  });

  test("<#keys>.pressed(\"Space\") rewrites correctly", () => {
    const result = rewriteInputStateRefs('<#keys>.pressed("Space")');
    expect(result).toBe('_scrml_input_state_registry.get("keys").pressed("Space")');
  });

  test("<#cursor>.x rewrites correctly", () => {
    const result = rewriteInputStateRefs("<#cursor>.x");
    expect(result).toBe('_scrml_input_state_registry.get("cursor").x');
  });

  test("<#pad>.buttons[0].pressed rewrites correctly", () => {
    const result = rewriteInputStateRefs("<#pad>.buttons[0].pressed");
    expect(result).toBe('_scrml_input_state_registry.get("pad").buttons[0].pressed');
  });

  test("multiple <#id> refs in one expression all rewrite", () => {
    const result = rewriteInputStateRefs('<#keys>.pressed("a") || <#keys>.justPressed("b")');
    expect(result).toBe('_scrml_input_state_registry.get("keys").pressed("a") || _scrml_input_state_registry.get("keys").justPressed("b")');
  });

  test("expression with no <#id> passes through unchanged", () => {
    const result = rewriteInputStateRefs("@jumping = true");
    expect(result).toBe("@jumping = true");
  });

  test("null/undefined/empty string return unchanged", () => {
    expect(rewriteInputStateRefs(null)).toBe(null);
    expect(rewriteInputStateRefs(undefined)).toBe(undefined);
    expect(rewriteInputStateRefs("")).toBe("");
  });

  test("rewriteExpr includes input state rewrite — <#keys>.pressed() is valid in full pipeline", () => {
    const result = rewriteExpr('<#keys>.pressed("Space")');
    expect(result).toContain('_scrml_input_state_registry.get("keys").pressed("Space")');
    expect(result).not.toContain("<#keys>");
  });

  test("rewriteExpr handles <#id> combined with @reactive refs", () => {
    const result = rewriteExpr('<#keys>.pressed("Space") && @active');
    expect(result).toContain('_scrml_input_state_registry.get("keys").pressed("Space")');
    expect(result).toContain('_scrml_reactive_get("active")');
    expect(result).not.toContain("<#keys>");
    expect(result).not.toContain("@active");
  });
});
