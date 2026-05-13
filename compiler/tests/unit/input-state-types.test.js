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
 * §17 Type-system regression: <#id> member access flows through TS clean (S89 §36 Phase 2.A)
 * §18 E-INPUT-005: duplicate input-state id within same scope (S89 §36 Phase 2.B)
 * §19 SSR no-emit guard: server JS contains no `_scrml_input_*` refs (S89 §36 Phase 3.A — SPEC §36.5.2)
 * §20 Keyboard auto-repeat suppression: justPressedSet add guarded by `!pressedSet.has(key)` (S89 §36 Phase 3.B — SPEC §36.2)
 * §21 Nested-scope cleanup: emitInputStateNode emits register-cleanup with same scopeId as create (S89 §36 Phase 3.C — SPEC §36.5.1)
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { generateHtml } from "../../src/codegen/emit-html.js";
import { emitReactiveWiring } from "../../src/codegen/emit-reactive-wiring.js";
import { makeCompileContext } from "../../src/codegen/context.ts";
import { rewriteInputStateRefs, rewriteExpr } from "../../src/codegen/rewrite.js";
import { runTS } from "../../src/type-system.ts";
import { compileScrml } from "../../src/api.js";
import { SCRML_RUNTIME } from "../../src/runtime-template.js";

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

// ---------------------------------------------------------------------------
// §17: Type-system regression — <#id> member access typing is clean
// ---------------------------------------------------------------------------
//
// S89 §36 Phase 2.A. Input-state-ref is a leaf ExprNode kind (expression-parser.ts
// :2313-2317): forEachIdentInExprNode does not recurse into it. type-system.ts
// has no `input-state-ref` arm — by design, because input-state objects resolve
// at runtime through `_scrml_input_state_registry.get("X")` and expose a
// property bag whose shape depends on which input tag (`<keyboard>` /
// `<mouse>` / `<gamepad>`) registered the id. The leaf-as-opaque approach
// means member access on `<#X>` flows through the type-checker without firing
// E-SCOPE-001 (unknown ident) or E-TYPE-* (type mismatch) — the member chain
// has no base identifier to credit against the scope chain.
//
// These tests pin that contract so that a future TS refactor cannot silently
// regress to firing E-SCOPE-001 on `<#keys>.pressed("Space")` member chains.
// ---------------------------------------------------------------------------

describe("§17: <#id> member access — type-system regression (Phase 2.A)", () => {
  function runFullPipelineTS(source) {
    const { ast, errors: tabErrors } = parseSource(source);
    const tsRes = runTS({ files: [ast] });
    return [...(tabErrors || []), ...(tsRes.errors || [])];
  }

  test("<#keys>.pressed(\"Space\") in logic block does not fire E-SCOPE-001", () => {
    const source = `<program>
<keyboard id="keys"/>
<div>\${
    @jumping = <#keys>.pressed("Space")
}</>
</>`;
    const errors = runFullPipelineTS(source);
    const scopeErrors = errors.filter(e => e.code === "E-SCOPE-001");
    expect(scopeErrors).toHaveLength(0);
  });

  test("<#keys>.modifiers.ctrl deep member access does not fire any E-SCOPE / E-TYPE", () => {
    const source = `<program>
<keyboard id="keys"/>
<div>\${
    @ctrl = <#keys>.modifiers.ctrl
}</>
</>`;
    const errors = runFullPipelineTS(source);
    const typeOrScope = errors.filter(e =>
      e.code === "E-SCOPE-001" ||
      (typeof e.code === "string" && e.code.startsWith("E-TYPE-"))
    );
    expect(typeOrScope).toHaveLength(0);
  });

  test("<#cursor>.x / <#cursor>.y / <#cursor>.buttons all flow through clean", () => {
    const source = `<program>
<mouse id="cursor"/>
<div>\${
    @mx = <#cursor>.x
    @my = <#cursor>.y
    @btns = <#cursor>.buttons
    @wheel = <#cursor>.wheel
}</>
</>`;
    const errors = runFullPipelineTS(source);
    const blocking = errors.filter(e =>
      e.code === "E-SCOPE-001" ||
      (typeof e.code === "string" && e.code.startsWith("E-TYPE-"))
    );
    expect(blocking).toHaveLength(0);
  });

  test("<#pad>.buttons[0].pressed (call+index+member chain) flows through clean", () => {
    const source = `<program>
<gamepad id="pad"/>
<div>\${
    @b0 = <#pad>.buttons[0].pressed
    @ax0 = <#pad>.axes[0]
    @c = <#pad>.connected
    @btnPressed = <#pad>.pressed(0)
}</>
</>`;
    const errors = runFullPipelineTS(source);
    const blocking = errors.filter(e =>
      e.code === "E-SCOPE-001" ||
      (typeof e.code === "string" && e.code.startsWith("E-TYPE-"))
    );
    expect(blocking).toHaveLength(0);
  });

  test("<#keys>.pressed combined with @reactive refs does not flag the input-state-ref", () => {
    const source = `<program>
<keyboard id="keys"/>
<state count: int=0/>
<div>\${
    @jumping = <#keys>.pressed("Space") && @count > 0
}</>
</>`;
    const errors = runFullPipelineTS(source);
    // E-SCOPE-001 specifically on "keys" or "_scrml_input_state_registry" would
    // indicate the leaf-as-opaque contract regressed.
    const inputRefScope = errors.filter(e =>
      e.code === "E-SCOPE-001" &&
      (String(e.message ?? "").includes("keys") ||
       String(e.message ?? "").includes("_scrml_input_state_registry"))
    );
    expect(inputRefScope).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §18: E-INPUT-005 — duplicate input-state id within same scope (Phase 2.B)
// ---------------------------------------------------------------------------
//
// S89 §36 Phase 2.B. SPEC §36.7 lines 15854-15871 + §34 catalog line 14938.
// Scope semantics per SPEC §36.5.1 (S89 OQ-B Option α): the IMMEDIATELY
// ENCLOSING scope owns the input-state lifecycle, where scope boundary is
// `<program>` (root permanent scope per §6.7.2) or any element conditionally
// rendered (`if=`). The three input-state tags share a single id namespace
// per §34 line 14938 — `<keyboard id="x"/>` + `<mouse id="x"/>` in the same
// scope is a cross-tag duplicate.
// ---------------------------------------------------------------------------

describe("§18: E-INPUT-005 — duplicate input-state id within scope (Phase 2.B)", () => {
  test("two <keyboard id=\"k\"> in same program scope fires E-INPUT-005", () => {
    const source = `<program>
<keyboard id="k"/>
<keyboard id="k"/>
</>`;
    const { errors } = compileSource(source);
    const dup = errors.filter(e => e.code === "E-INPUT-005");
    expect(dup).toHaveLength(1);
    expect(dup[0].message).toContain("k");
    expect(dup[0].message).toContain("keyboard");
  });

  test("cross-tag duplicate: <keyboard id=\"x\"> + <mouse id=\"x\"> fires E-INPUT-005", () => {
    const source = `<program>
<keyboard id="x"/>
<mouse id="x"/>
</>`;
    const { errors } = compileSource(source);
    const dup = errors.filter(e => e.code === "E-INPUT-005");
    expect(dup).toHaveLength(1);
    expect(dup[0].message).toContain("x");
    // First decl was <keyboard>, second is <mouse> — message should reference
    // both tag kinds to make the cross-tag namespace explicit.
    expect(dup[0].message).toContain("keyboard");
    expect(dup[0].message).toContain("mouse");
  });

  test("cross-tag duplicate: <gamepad id=\"p\"> + <mouse id=\"p\"> fires E-INPUT-005", () => {
    const source = `<program>
<gamepad id="p"/>
<mouse id="p"/>
</>`;
    const { errors } = compileSource(source);
    const dup = errors.filter(e => e.code === "E-INPUT-005");
    expect(dup).toHaveLength(1);
  });

  test("distinct ids in same scope: NO E-INPUT-005", () => {
    const source = `<program>
<keyboard id="keys"/>
<mouse id="cursor"/>
<gamepad id="pad"/>
</>`;
    const { errors } = compileSource(source);
    const dup = errors.filter(e => e.code === "E-INPUT-005");
    expect(dup).toHaveLength(0);
  });

  test("same id in different program scopes (nested): NO E-INPUT-005", () => {
    const source = `<program>
<keyboard id="k"/>
<program name="sub">
<keyboard id="k"/>
</>
</>`;
    const { errors } = compileSource(source);
    const dup = errors.filter(e => e.code === "E-INPUT-005");
    expect(dup).toHaveLength(0);
  });

  test("three identical ids: fires on 2nd AND 3rd occurrence (per-decl emission)", () => {
    const source = `<program>
<keyboard id="k"/>
<keyboard id="k"/>
<keyboard id="k"/>
</>`;
    const { errors } = compileSource(source);
    const dup = errors.filter(e => e.code === "E-INPUT-005");
    // Mirrors E-INPUT-001..004 per-occurrence emission: 2nd and 3rd both fire.
    expect(dup).toHaveLength(2);
  });

  test("same id under nested if= scopes: NO E-INPUT-005 (disjoint mount windows)", () => {
    // §6.7.2 + §36.5.1: if=-rendered elements create independent lifecycle
    // scopes. Two `<keyboard id="k">` declarations in disjoint if= scopes do
    // not overlap in mount/unmount and so are not flagged.
    const source = `<program>
<div if=@a>
<keyboard id="k"/>
</>
<div if=@b>
<keyboard id="k"/>
</>
</>`;
    const { errors } = compileSource(source);
    const dup = errors.filter(e => e.code === "E-INPUT-005");
    expect(dup).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// §19: SSR no-emit guard — server JS contains no `_scrml_input_*` refs (Phase 3.A)
// ---------------------------------------------------------------------------
//
// S89 §36 Phase 3.A. SPEC §36.5.2 (lines 15716-15741) normatively prohibits
// emission of `_scrml_input_keyboard_create`, `_scrml_input_mouse_create`,
// `_scrml_input_gamepad_create`, their `_destroy` counterparts, and the
// `_scrml_input_state_registry` Map into any server-targeted bundle. Input
// state types are client-only — they depend on `document`, browser event
// APIs, `requestAnimationFrame`, and `navigator.getGamepads()`, none of
// which exist in a server JS environment.
//
// This test pins the client-only invariant against future refactors that
// might route input-state emission through a shared path that also feeds
// the server bundle.
// ---------------------------------------------------------------------------

describe("§19: SSR no-emit guard — server JS contains no _scrml_input_* refs (Phase 3.A)", () => {
  let TMP;

  function setupTmp() {
    TMP = mkdtempSync(join(tmpdir(), "input-state-ssr-noemit-"));
    return TMP;
  }

  function teardownTmp() {
    if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  }

  function compileFixture(rel, src) {
    const tmp = setupTmp();
    const inFile = join(tmp, rel);
    mkdirSync(join(inFile, "..").replace(/\/$/, ""), { recursive: true });
    writeFileSync(inFile, src);
    const result = compileScrml({
      inputFiles: [inFile],
      outputDir: join(tmp, "out"),
      write: false,
      log: () => {},
    });
    const out = result.outputs?.get(inFile);
    return {
      clientJs: out?.clientJs ?? "",
      serverJs: out?.serverJs ?? "",
      errors: result.errors ?? [],
    };
  }

  test("keyboard fixture: server JS contains NO _scrml_input_keyboard_create / destroy / registry", () => {
    try {
      const src = `<program>
<keyboard id="keys"/>
<div>game</>
</>
`;
      const { clientJs, serverJs } = compileFixture("kb.scrml", src);

      // Sanity: client output DOES contain the keyboard create + destroy.
      expect(clientJs).toContain("_scrml_input_keyboard_create");
      expect(clientJs).toContain("_scrml_input_keyboard_destroy");

      // Normative: server output does NOT contain any input-state helper refs.
      // (SPEC §36.5.2: "The compiler SHALL NOT emit input-state runtime setup
      // [...] into server JS output. The runtime helpers themselves SHALL NOT
      // appear in any server-targeted bundle.")
      expect(serverJs).not.toContain("_scrml_input_keyboard_create");
      expect(serverJs).not.toContain("_scrml_input_keyboard_destroy");
      expect(serverJs).not.toContain("_scrml_input_state_registry");
    } finally {
      teardownTmp();
    }
  });

  test("mouse fixture: server JS contains NO _scrml_input_mouse_create / destroy", () => {
    try {
      const src = `<program>
<mouse id="cursor"/>
<div>canvas</>
</>
`;
      const { clientJs, serverJs } = compileFixture("ms.scrml", src);

      expect(clientJs).toContain("_scrml_input_mouse_create");
      expect(clientJs).toContain("_scrml_input_mouse_destroy");

      expect(serverJs).not.toContain("_scrml_input_mouse_create");
      expect(serverJs).not.toContain("_scrml_input_mouse_destroy");
      expect(serverJs).not.toContain("_scrml_input_state_registry");
    } finally {
      teardownTmp();
    }
  });

  test("gamepad fixture: server JS contains NO _scrml_input_gamepad_create / destroy", () => {
    try {
      const src = `<program>
<gamepad id="pad"/>
<div>player</>
</>
`;
      const { clientJs, serverJs } = compileFixture("gp.scrml", src);

      expect(clientJs).toContain("_scrml_input_gamepad_create");
      expect(clientJs).toContain("_scrml_input_gamepad_destroy");

      expect(serverJs).not.toContain("_scrml_input_gamepad_create");
      expect(serverJs).not.toContain("_scrml_input_gamepad_destroy");
      expect(serverJs).not.toContain("_scrml_input_state_registry");
    } finally {
      teardownTmp();
    }
  });

  test("all-three coexistence fixture: server JS contains NO _scrml_input_* substring at all", () => {
    try {
      const src = `<program>
<keyboard id="keys"/>
<mouse id="cursor"/>
<gamepad id="pad"/>
<div>combo</>
</>
`;
      const { clientJs, serverJs } = compileFixture("all3.scrml", src);

      // Sanity on client side.
      expect(clientJs).toContain("_scrml_input_keyboard_create");
      expect(clientJs).toContain("_scrml_input_mouse_create");
      expect(clientJs).toContain("_scrml_input_gamepad_create");

      // Catch-all: any `_scrml_input_*` substring in server bundle is a violation.
      // The substring `_scrml_input_` is unique to the input-state runtime —
      // no other compiler-generated symbol uses that prefix.
      expect(serverJs).not.toContain("_scrml_input_");
    } finally {
      teardownTmp();
    }
  });
});

// ---------------------------------------------------------------------------
// §20: Keyboard auto-repeat suppression — runtime regression (Phase 3.B)
// ---------------------------------------------------------------------------
//
// S89 §36 Phase 3.B. SPEC §36.2 normatively specifies "edge-based" semantics
// for `justPressed` (compiler/SPEC.md §36.2). The runtime implements this by
// guarding `justPressedSet.add(key)` behind `!pressedSet.has(key)` —
// runtime-template.js:1514-1519:
//
//     function keydownFn(e) {
//       const key = e.key;
//       if (!pressedSet.has(key)) {
//         justPressedSet.add(key);
//       }
//       pressedSet.add(key);
//       ...
//     }
//
// OS-level auto-repeat fires successive keydown events without intervening
// keyup. Without the guard, every repeat would re-mark the key as
// just-pressed, breaking the edge-detection contract that SPEC §36.6's
// animationFrame loop pattern depends on.
//
// This test loads the SCRML_RUNTIME string, evaluates it in a Function
// context with happy-dom's `document` global, instantiates a keyboard
// input state, and asserts:
//   1. First keydown adds the key to justPressedSet.
//   2. A SECOND keydown for the same key (auto-repeat) does NOT re-add.
//   3. After keyup then a fresh keydown, justPressed fires again.
// ---------------------------------------------------------------------------

describe("§20: keyboard auto-repeat suppression — runtime edge-detection (Phase 3.B)", () => {
  beforeEach(async () => {
    // Defensive idempotent registration — another test in the same bun-test
    // process may have left a registration active. Pattern lifted from
    // 14-mario-runtime-sim.test.js.
    try { await GlobalRegistrator.unregister(); } catch (_) { /* not registered */ }
    GlobalRegistrator.register();
  });

  afterEach(async () => {
    try { await GlobalRegistrator.unregister(); } catch (_) { /* nothing to do */ }
  });

  function instantiateKeyboardRuntime() {
    // Load the runtime in a Function scope so the IIFE side effects (style
    // injection, etc.) execute against happy-dom's `document` global. Then
    // hand back the keyboard create/destroy + the document.dispatchEvent
    // hook for simulating keydown/keyup.
    const exec = new Function(
      "window",
      "document",
      `${SCRML_RUNTIME}\n` +
      `globalThis.__test_kb_create = _scrml_input_keyboard_create;\n` +
      `globalThis.__test_kb_destroy = _scrml_input_keyboard_destroy;\n` +
      `globalThis.__test_kb_registry = _scrml_input_keyboard_registry;\n`
    );
    exec(window, document);

    function dispatch(type, init) {
      // happy-dom's KeyboardEvent honors `key`, `shiftKey`, etc. via the
      // dictionary; if init is missing fields, defaults are false / null
      // which is fine for our edge-detection assertions.
      const ev = new KeyboardEvent(type, init);
      document.dispatchEvent(ev);
    }

    return {
      create: globalThis.__test_kb_create,
      destroy: globalThis.__test_kb_destroy,
      dispatch,
    };
  }

  test("first keydown fires justPressed; second keydown for same key does NOT (auto-repeat suppressed)", () => {
    const { create, destroy, dispatch } = instantiateKeyboardRuntime();
    const state = create("keys", "_scrml_scope_test_1");

    // First keydown: edge transition false->true, justPressed should fire.
    dispatch("keydown", { key: "Space" });
    expect(state.justPressed("Space")).toBe(true);
    expect(state.pressed("Space")).toBe(true);

    // Clear frame state — simulates what an animationFrame loop would do
    // between frames per SPEC §36.6.
    state._clearFrameState();
    expect(state.justPressed("Space")).toBe(false);

    // Second keydown WITHOUT intervening keyup — this is the OS auto-repeat
    // scenario. The `!pressedSet.has(key)` guard at runtime-template.js:1516
    // means justPressedSet.add() is NOT called. justPressed remains false.
    dispatch("keydown", { key: "Space" });
    expect(state.justPressed("Space")).toBe(false);
    // pressed remains true throughout the auto-repeat sequence.
    expect(state.pressed("Space")).toBe(true);

    destroy("keys", "_scrml_scope_test_1");
  });

  test("after keyup + fresh keydown, justPressed fires again (edge re-armed)", () => {
    const { create, destroy, dispatch } = instantiateKeyboardRuntime();
    const state = create("keys", "_scrml_scope_test_2");

    // First press
    dispatch("keydown", { key: "ArrowRight" });
    expect(state.justPressed("ArrowRight")).toBe(true);
    state._clearFrameState();

    // Auto-repeat suppressed
    dispatch("keydown", { key: "ArrowRight" });
    expect(state.justPressed("ArrowRight")).toBe(false);

    // Release
    dispatch("keyup", { key: "ArrowRight" });
    expect(state.pressed("ArrowRight")).toBe(false);
    state._clearFrameState();

    // Fresh press — edge is re-armed because pressedSet was cleared on keyup.
    dispatch("keydown", { key: "ArrowRight" });
    expect(state.justPressed("ArrowRight")).toBe(true);
    expect(state.pressed("ArrowRight")).toBe(true);

    destroy("keys", "_scrml_scope_test_2");
  });

  test("multiple distinct keys: each maintains its own edge state independently", () => {
    const { create, destroy, dispatch } = instantiateKeyboardRuntime();
    const state = create("keys", "_scrml_scope_test_3");

    // Press A
    dispatch("keydown", { key: "a" });
    expect(state.justPressed("a")).toBe(true);
    expect(state.justPressed("b")).toBe(false);

    // Press B while A still held (no clearFrameState between)
    dispatch("keydown", { key: "b" });
    expect(state.justPressed("a")).toBe(true); // still in this frame's set
    expect(state.justPressed("b")).toBe(true);

    state._clearFrameState();

    // Auto-repeat both — neither re-fires.
    dispatch("keydown", { key: "a" });
    dispatch("keydown", { key: "b" });
    expect(state.justPressed("a")).toBe(false);
    expect(state.justPressed("b")).toBe(false);
    expect(state.pressed("a")).toBe(true);
    expect(state.pressed("b")).toBe(true);

    destroy("keys", "_scrml_scope_test_3");
  });
});

// ---------------------------------------------------------------------------
// §21: Nested-scope cleanup — emitInputStateNode pairs create + destroy on scopeId (Phase 3.C)
// ---------------------------------------------------------------------------
//
// S89 §36 Phase 3.C. SPEC §36.5.1 (lines 15685-15714) normatively requires
// that cleanup fire at the immediately enclosing scope's unmount, not at
// top-level program unmount. The codegen pattern at
// `compiler/src/codegen/emit-reactive-wiring.ts:840-846` is:
//
//     const scopeVar = JSON.stringify(genVar("scope"));
//     ...
//     lines.push(`_scrml_input_keyboard_create(${inputIdJs}, ${scopeVar});`);
//     lines.push(`_scrml_register_cleanup(() => _scrml_input_keyboard_destroy(${inputIdJs}, ${scopeVar}));`);
//
// The same `scopeVar` is used in BOTH the create and destroy calls — that's
// the lifecycle pairing contract. A future refactor that disrupts the
// pairing (e.g. mints a separate scopeId for destroy, or hoists the destroy
// to a different scope-registration hook) would silently break SPEC §36.5.1.
//
// This test asserts the contract at the emission level by parsing the
// emitted client JS and confirming the scopeId used in `_create` is the
// same string used in `_destroy` inside a `_scrml_register_cleanup` call.
// ---------------------------------------------------------------------------

describe("§21: nested-scope cleanup — emitInputStateNode pairs create+destroy on same scopeId (Phase 3.C)", () => {
  function extractScopeIdPair(reactiveCode, helperBase) {
    // Match: _scrml_input_<helperBase>_create(<id>, <scopeVar>);
    // and:   _scrml_register_cleanup(() => _scrml_input_<helperBase>_destroy(<id>, <scopeVar>));
    // Capture both scope vars and the cleanup-wrapper.
    const createRe = new RegExp(
      `_scrml_input_${helperBase}_create\\(\\s*("[^"]+")\\s*,\\s*("[^"]+")\\s*[,)]`,
      "g",
    );
    const destroyRe = new RegExp(
      `_scrml_register_cleanup\\(\\s*\\(\\s*\\)\\s*=>\\s*_scrml_input_${helperBase}_destroy\\(\\s*("[^"]+")\\s*,\\s*("[^"]+")\\s*\\)\\s*\\)`,
      "g",
    );
    const creates = [...reactiveCode.matchAll(createRe)].map(m => ({ id: m[1], scope: m[2] }));
    const destroys = [...reactiveCode.matchAll(destroyRe)].map(m => ({ id: m[1], scope: m[2] }));
    return { creates, destroys };
  }

  test("keyboard inside nested <program>: create + register_cleanup→destroy share the same scopeId", () => {
    const source = `<program>
<program name="sub">
<keyboard id="inner"/>
</>
</>`;
    const { reactiveLines } = compileSource(source);
    const code = reactiveLines.join("\n");

    const { creates, destroys } = extractScopeIdPair(code, "keyboard");

    // Exactly one create + one destroy for the single <keyboard>.
    expect(creates).toHaveLength(1);
    expect(destroys).toHaveLength(1);

    // Both reference the same id "inner".
    expect(creates[0].id).toBe('"inner"');
    expect(destroys[0].id).toBe('"inner"');

    // SPEC §36.5.1 invariant: cleanup uses the SAME scopeId that create used.
    expect(creates[0].scope).toBe(destroys[0].scope);

    // The cleanup wrapper is _scrml_register_cleanup(...) (regex match confirms
    // the destroy is enclosed in register_cleanup; this assert pins the
    // arrow-fn syntax against a refactor that bypasses the cleanup hook).
    expect(code).toMatch(/_scrml_register_cleanup\(\s*\(\s*\)\s*=>\s*_scrml_input_keyboard_destroy/);
  });

  test("two keyboards in separate nested scopes: each pairs its own create/destroy independently", () => {
    const source = `<program>
<keyboard id="outer"/>
<program name="sub">
<keyboard id="inner"/>
</>
</>`;
    const { reactiveLines } = compileSource(source);
    const code = reactiveLines.join("\n");

    const { creates, destroys } = extractScopeIdPair(code, "keyboard");

    expect(creates).toHaveLength(2);
    expect(destroys).toHaveLength(2);

    // Each id pairs with itself.
    const outerCreate = creates.find(c => c.id === '"outer"');
    const innerCreate = creates.find(c => c.id === '"inner"');
    const outerDestroy = destroys.find(d => d.id === '"outer"');
    const innerDestroy = destroys.find(d => d.id === '"inner"');
    expect(outerCreate).toBeDefined();
    expect(innerCreate).toBeDefined();
    expect(outerDestroy).toBeDefined();
    expect(innerDestroy).toBeDefined();

    // Each input-state instance's create + destroy share a scopeId.
    expect(outerCreate.scope).toBe(outerDestroy.scope);
    expect(innerCreate.scope).toBe(innerDestroy.scope);

    // Distinct emission calls produce DISTINCT scopeIds (per-call uniqueness
    // is the rationale paragraph at SPEC §36.5.1 line 15710-15714).
    expect(outerCreate.scope).not.toBe(innerCreate.scope);
  });

  test("mouse + gamepad: each input-state tag emits its own paired register_cleanup→destroy", () => {
    const source = `<program>
<mouse id="cursor"/>
<gamepad id="pad"/>
</>`;
    const { reactiveLines } = compileSource(source);
    const code = reactiveLines.join("\n");

    const mousePair = extractScopeIdPair(code, "mouse");
    const gamepadPair = extractScopeIdPair(code, "gamepad");

    expect(mousePair.creates).toHaveLength(1);
    expect(mousePair.destroys).toHaveLength(1);
    expect(mousePair.creates[0].scope).toBe(mousePair.destroys[0].scope);

    expect(gamepadPair.creates).toHaveLength(1);
    expect(gamepadPair.destroys).toHaveLength(1);
    expect(gamepadPair.creates[0].scope).toBe(gamepadPair.destroys[0].scope);

    // Mouse and gamepad get DIFFERENT scopeIds (per-call genVar uniqueness).
    expect(mousePair.creates[0].scope).not.toBe(gamepadPair.creates[0].scope);
  });
});
