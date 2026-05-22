// parser-conformance-parse-file.test.js — C1 / M5-swap conformance.
//
// The native-parser `nativeParseFile` assembler (compiler/native-parser/
// parse-file.js) is the FileAST bridge: it turns a scrml source file into the
// live `FileAST` shape (compiler/src/types/ast.ts:1487) every downstream stage
// (NR / RI / AG / CG) consumes — the drop-in analogue of the live pipeline's
// `buildAST` (compiler/src/ast-builder.js ~L11971).
//
// THE CONTRACT — `nativeParseFile(filePath, source)` returns
// `{ filePath, ast: FileAST, errors }` where:
//   - `ast.nodes` is the lowercase ASTNode union, mapped from the native
//     parser's PascalCase BlockKind block-stream;
//   - the six hoisted collections + `hasProgramRoot` come from A3's
//     `collectHoisted`;
//   - `authConfig` / `middlewareConfig` are `null` (PRECG derives them
//     downstream — they are NOT computed in the assembler);
//   - every node + hoisted decl shares ONE id space (the threaded `idGen`);
//   - `errors` carries the native parser's diagnostics + synthesis info
//     diagnostics.
//
// SCOPE NOTE — this is a NATIVE-parser conformance file. It exercises
// `nativeParseFile` directly on curated scrml exemplars; it does not cross-
// check against the live `buildAST` node-for-node (the native block payloads
// are sketch-depth for some kinds — that cross-check is C2's dual-pipeline
// canary). The assertions here are SHAPE + completeness audits.

import { describe, test, expect } from "bun:test";

import { nativeParseFile } from "../native-parser/parse-file.js";

// allIds — collect every numeric `id` reachable in the FileAST: the `nodes`
// tree (recursing markup `children` + logic/meta `body`) plus the hoisted
// declaration collections. Used by the single-id-space assertions.
function allIds(ast) {
  const ids = [];
  function walkNode(n) {
    if (n === undefined || n === null) return;
    if (typeof n.id === "number") ids.push(n.id);
    if (Array.isArray(n.children)) {
      for (const c of n.children) walkNode(c);
    }
    if (Array.isArray(n.body)) {
      for (const s of n.body) walkNode(s);
    }
  }
  for (const node of ast.nodes) walkNode(node);
  const decls = [
    ...ast.imports, ...ast.exports, ...ast.typeDecls,
    ...ast.components, ...ast.machineDecls,
  ];
  for (const d of decls) {
    if (d !== undefined && d !== null && typeof d.id === "number") ids.push(d.id);
  }
  return ids;
}

// =============================================================================
// C1 §1 — the result + FileAST shape.
// =============================================================================
describe("C1 §1 — nativeParseFile result + FileAST shape", () => {
  test("returns { filePath, ast, errors } with the FileAST top-level fields", () => {
    const r = nativeParseFile("app.scrml", "<div>hi</div>");
    expect(r.filePath).toBe("app.scrml");
    expect(Array.isArray(r.errors)).toBe(true);
    const ast = r.ast;
    expect(ast.filePath).toBe("app.scrml");
    expect(Array.isArray(ast.nodes)).toBe(true);
    expect(Array.isArray(ast.imports)).toBe(true);
    expect(Array.isArray(ast.exports)).toBe(true);
    expect(Array.isArray(ast.components)).toBe(true);
    expect(Array.isArray(ast.typeDecls)).toBe(true);
    expect(Array.isArray(ast.machineDecls)).toBe(true);
    expect(Array.isArray(ast.channelDecls)).toBe(true);
    expect(typeof ast.hasProgramRoot).toBe("boolean");
  });

  test("authConfig and middlewareConfig are left null (PRECG derives them)", () => {
    const r = nativeParseFile("app.scrml", "<program><div>x</div></program>");
    expect(r.ast.authConfig).toBe(null);
    expect(r.ast.middlewareConfig).toBe(null);
  });

  test("a non-string source folds to an empty FileAST with no nodes", () => {
    const r = nativeParseFile("app.scrml", undefined);
    expect(r.ast.nodes.length).toBe(0);
    expect(r.ast.imports.length).toBe(0);
    expect(r.ast.hasProgramRoot).toBe(false);
  });

  test("a non-string filePath folds to an empty-string filePath", () => {
    const r = nativeParseFile(undefined, "<div/>");
    expect(r.filePath).toBe("");
    expect(r.ast.filePath).toBe("");
  });
});

// =============================================================================
// C1 §2 — BlockKind -> ASTNode kind mapping.
// =============================================================================
describe("C1 §2 — BlockKind -> ASTNode mapping", () => {
  test("a `<div>` Markup block maps to a `markup` node", () => {
    const r = nativeParseFile("app.scrml", "<div>hello</div>");
    const markup = r.ast.nodes.find(n => n.kind === "markup");
    expect(markup).toBeDefined();
    expect(markup.tag).toBe("div");
    expect(Array.isArray(markup.children)).toBe(true);
    expect(Array.isArray(markup.attrs)).toBe(true);
    expect(typeof markup.selfClosing).toBe("boolean");
    expect(typeof markup.isComponent).toBe("boolean");
  });

  test("free text maps to a `text` node carrying the verbatim slice", () => {
    const r = nativeParseFile("app.scrml", "<div>hello world</div>");
    const markup = r.ast.nodes.find(n => n.kind === "markup");
    const text = markup.children.find(c => c.kind === "text");
    expect(text).toBeDefined();
    expect(text.value).toBe("hello world");
  });

  test("a `// line comment` maps to a `comment` node (verbatim slice)", () => {
    const r = nativeParseFile("app.scrml", "// a remark\n<div/>");
    const comment = r.ast.nodes.find(n => n.kind === "comment");
    expect(comment).toBeDefined();
    expect(comment.value).toContain("a remark");
  });

  test("a `${...}` block maps to a `logic` node", () => {
    const r = nativeParseFile("app.scrml", "${ let x = 1 }");
    const logic = r.ast.nodes.find(n => n.kind === "logic");
    expect(logic).toBeDefined();
    expect(Array.isArray(logic.body)).toBe(true);
  });

  test("a `?{...}` block maps to a `sql` node with query + chainedCalls", () => {
    const r = nativeParseFile("app.scrml", "${ let rows = ?{ select * from t }.all() }");
    // The `?{...}` SQL block parses inside the logic body as an expression;
    // a top-level `?{...}` maps to a `sql` node. Use the top-level form.
    const r2 = nativeParseFile("app.scrml", "?{ select * from users }.all()");
    const sql = r2.ast.nodes.find(n => n.kind === "sql");
    expect(sql).toBeDefined();
    expect(typeof sql.query).toBe("string");
    expect(Array.isArray(sql.chainedCalls)).toBe(true);
  });

  test("a `#{...}` block maps to a `css-inline` node with rules", () => {
    const r = nativeParseFile("app.scrml", "#{ color: red; }");
    const css = r.ast.nodes.find(n => n.kind === "css-inline");
    expect(css).toBeDefined();
    expect(Array.isArray(css.rules)).toBe(true);
  });

  test("a `^{...}` block maps to a `meta` node with body + parentContext", () => {
    const r = nativeParseFile("app.scrml", "^{ let m = 1 }");
    const meta = r.ast.nodes.find(n => n.kind === "meta");
    expect(meta).toBeDefined();
    expect(Array.isArray(meta.body)).toBe(true);
    expect(typeof meta.parentContext).toBe("string");
  });

  test("a `!{...}` block maps to an `error-effect` node with arms", () => {
    const r = nativeParseFile("app.scrml", "!{ | ::NotFound e -> log(e) }");
    const ee = r.ast.nodes.find(n => n.kind === "error-effect");
    expect(ee).toBeDefined();
    expect(Array.isArray(ee.arms)).toBe(true);
  });

  test("isComponent is true for an uppercase-initial tag, false for lowercase", () => {
    const r = nativeParseFile("app.scrml", "<Card/>\n<div/>");
    const card = r.ast.nodes.find(n => n.kind === "markup" && n.tag === "Card");
    const div = r.ast.nodes.find(n => n.kind === "markup" && n.tag === "div");
    expect(card.isComponent).toBe(true);
    expect(div.isComponent).toBe(false);
  });
});

// =============================================================================
// C1 §3 — logic-body statement translation through the A1 bridge.
// =============================================================================
describe("C1 §3 — logic-body translation (A1 bridge)", () => {
  test("a `let` decl in a logic body becomes a `let-decl` LogicStatement", () => {
    const r = nativeParseFile("app.scrml", "${ let count = 0 }");
    const logic = r.ast.nodes.find(n => n.kind === "logic");
    expect(logic.body.length).toBe(1);
    expect(logic.body[0].kind).toBe("let-decl");
  });

  test("a `const` decl becomes a `const-decl` LogicStatement", () => {
    const r = nativeParseFile("app.scrml", "${ const PI = 3 }");
    const logic = r.ast.nodes.find(n => n.kind === "logic");
    expect(logic.body[0].kind).toBe("const-decl");
  });

  test("an `if` statement becomes an `if-stmt` LogicStatement", () => {
    const r = nativeParseFile("app.scrml", "${ if (x) { y() } }");
    const logic = r.ast.nodes.find(n => n.kind === "logic");
    expect(logic.body[0].kind).toBe("if-stmt");
  });

  test("a multi-declarator var-decl fans out to one node per declarator", () => {
    const r = nativeParseFile("app.scrml", "${ let a = 1, b = 2 }");
    const logic = r.ast.nodes.find(n => n.kind === "logic");
    expect(logic.body.length).toBe(2);
    expect(logic.body[0].kind).toBe("let-decl");
    expect(logic.body[1].kind).toBe("let-decl");
  });

  test("a `^{...}` meta body is also translated through A1", () => {
    const r = nativeParseFile("app.scrml", "^{ const META = 9 }");
    const meta = r.ast.nodes.find(n => n.kind === "meta");
    expect(meta.body.length).toBe(1);
    expect(meta.body[0].kind).toBe("const-decl");
  });
});

// =============================================================================
// C1 §4 — hoisted-collection assembly (A3 bridge).
// =============================================================================
describe("C1 §4 — hoisted collections (A3 bridge)", () => {
  test("an `import` in a `${...}` block lands in ast.imports", () => {
    const r = nativeParseFile("app.scrml", '${ import foo from "./bar.scrml" }');
    expect(r.ast.imports.length).toBe(1);
  });

  test("an `export` in a `${...}` block lands in ast.exports", () => {
    const r = nativeParseFile("app.scrml", "${ export const X = 1 }");
    expect(r.ast.exports.length).toBe(1);
  });

  test("a top-level `<program>` sets hasProgramRoot", () => {
    const r = nativeParseFile("app.scrml", "<program><div>x</div></program>");
    expect(r.ast.hasProgramRoot).toBe(true);
  });

  test("no `<program>` — hasProgramRoot is false", () => {
    const r = nativeParseFile("app.scrml", "<div>x</div>");
    expect(r.ast.hasProgramRoot).toBe(false);
  });

  test("a top-level `<channel>` is collected into channelDecls", () => {
    const r = nativeParseFile("app.scrml", "<channel name=chat/>");
    expect(r.ast.channelDecls.length).toBe(1);
  });

  test("a `type` decl in a `${...}` block lands in ast.typeDecls", () => {
    const r = nativeParseFile("app.scrml", "${ type Status : enum = { active, idle } }");
    expect(r.ast.typeDecls.length).toBe(1);
    expect(r.ast.typeDecls[0].kind).toBe("type-decl");
  });

  test("a `const Upper = <markup>` is collected into components", () => {
    const r = nativeParseFile("app.scrml", "${ const Card = <div>card</div> }");
    expect(r.ast.components.length).toBe(1);
    expect(r.ast.components[0].kind).toBe("component-def");
    expect(r.ast.components[0].name).toBe("Card");
  });

  test("a top-level `<engine for=Cart>` is synthesized into machineDecls", () => {
    const r = nativeParseFile("app.scrml", "<engine for=Cart>\n  rule\n</>");
    expect(r.ast.machineDecls.length).toBe(1);
    expect(r.ast.machineDecls[0].kind).toBe("engine-decl");
    expect(r.ast.machineDecls[0].governedType).toBe("Cart");
  });
});

// =============================================================================
// C1 §5 — the single shared id space (one idGen threaded through everything).
// =============================================================================
describe("C1 §5 — single id space", () => {
  test("no duplicate ids across nodes + hoisted decls (markup + logic file)", () => {
    const src = '${ import foo from "./bar.scrml" }\n'
      + "<program>\n"
      + "  <div class=\"x\">hello</div>\n"
      + "  ${ let count = 0\n     const total = count }\n"
      + "</program>";
    const r = nativeParseFile("app.scrml", src);
    const ids = allIds(r.ast);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("ids span nodes, translated statements, AND hoisted declarations", () => {
    const src = "${ type T : enum = { a } }\n"
      + "${ const Box = <div>box</div> }\n"
      + "<engine for=Cart>\n  rule\n</>";
    const r = nativeParseFile("app.scrml", src);
    const ids = allIds(r.ast);
    // typeDecls + components + machineDecls each contribute at least one id.
    expect(r.ast.typeDecls.length).toBeGreaterThan(0);
    expect(r.ast.components.length).toBeGreaterThan(0);
    expect(r.ast.machineDecls.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every node id is a positive integer", () => {
    const r = nativeParseFile("app.scrml", "<div>${ let x = 1 }</div>");
    const ids = allIds(r.ast);
    for (const id of ids) {
      expect(Number.isInteger(id)).toBe(true);
      expect(id).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// C1 §6 — error propagation.
// =============================================================================
describe("C1 §6 — error propagation", () => {
  test("a clean parse produces an empty errors array", () => {
    const r = nativeParseFile("app.scrml", "<div>clean</div>");
    expect(r.errors.length).toBe(0);
  });

  test("a stray closer surfaces a native parser diagnostic", () => {
    const r = nativeParseFile("app.scrml", "</div>");
    expect(r.errors.length).toBeGreaterThan(0);
    // The native parser emits a structured { code, message, span } diagnostic.
    expect(typeof r.errors[0].code).toBe("string");
  });

  test("a mismatched closer surfaces a native parser diagnostic", () => {
    const r = nativeParseFile("app.scrml", "<div>x</span>");
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// C1 §7 — full small-file assembly (markup + logic + sql + css + meta).
// =============================================================================
describe("C1 §7 — full small-file assembly", () => {
  const fullFile =
    '${ import db from "./db.scrml" }\n'
    + "^{ const BUILD = 1 }\n"
    + "<program>\n"
    + "  #{ color: blue; }\n"
    + "  <header>Welcome</header>\n"
    + "  ${ let visits = 0 }\n"
    + "  <channel name=live/>\n"
    + "</program>";

  test("the full file assembles without throwing and produces a FileAST", () => {
    const r = nativeParseFile("full.scrml", fullFile);
    expect(r.ast).toBeDefined();
    expect(Array.isArray(r.ast.nodes)).toBe(true);
  });

  test("the full file's hoisted collections are populated", () => {
    const r = nativeParseFile("full.scrml", fullFile);
    expect(r.ast.imports.length).toBe(1);
    expect(r.ast.hasProgramRoot).toBe(true);
    expect(r.ast.channelDecls.length).toBe(1);
  });

  test("the full file's node kinds include markup, logic, and meta", () => {
    const r = nativeParseFile("full.scrml", fullFile);
    const kinds = new Set();
    function collect(n) {
      if (n === undefined || n === null) return;
      kinds.add(n.kind);
      if (Array.isArray(n.children)) {
        for (const c of n.children) collect(c);
      }
    }
    for (const node of r.ast.nodes) collect(node);
    expect(kinds.has("markup")).toBe(true);
    expect(kinds.has("logic")).toBe(true);
    expect(kinds.has("meta")).toBe(true);
  });

  test("the full file's whole FileAST has a single id space", () => {
    const r = nativeParseFile("full.scrml", fullFile);
    const ids = allIds(r.ast);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// =============================================================================
// C1 §8 — `<state>` node synthesis (M5 gap-ledger Phase 1).
//
// A `< Ident ...>` state opener (TagKind.StateOpener — §4.3 space-after-`<`)
// is a `state` / `state-constructor-def` declaration, NOT a `markup` node.
// `nativeParseFile`'s `mapOneBlock` discriminates via `isStateBlock` and
// routes to `synthStateNode`. `shapeStateBlock` (run at parse time) already
// stamped `stateNodeKind` / `stateType` / `typedAttrs` onto the block.
//
// SCOPE — shallow synth: transition-decl collapse (§54.3) + substate metadata
// (§54.2) are a tracked deep-fidelity follow-up and are NOT asserted here.
// =============================================================================
describe("C1 §8 — `<state>` node synthesis", () => {
  test("a `< card>` state opener maps to a `state` node, not `markup`", () => {
    const r = nativeParseFile("app.scrml", '< card title="hi">\n  hello\n</card>');
    const state = r.ast.nodes.find(n => n.kind === "state");
    expect(state).toBeDefined();
    expect(state.stateType).toBe("card");
    expect(r.ast.nodes.find(n => n.kind === "markup")).toBeUndefined();
  });

  test("a `state` node carries non-typed attrs and has no `typedAttrs` field", () => {
    const r = nativeParseFile("app.scrml", '< card title="hi">x</card>');
    const state = r.ast.nodes.find(n => n.kind === "state");
    expect(Array.isArray(state.attrs)).toBe(true);
    expect(state.attrs.length).toBe(1);
    expect(state.attrs[0].name).toBe("title");
    // `typedAttrs` is a state-constructor-def-only field — a plain `state`
    // node (ast.ts:265 StateNode) must not carry it.
    expect("typedAttrs" in state).toBe(false);
  });

  test("a `state` node stamps openerHadSpaceAfterLt true and a span", () => {
    const r = nativeParseFile("app.scrml", "< card>x</card>");
    const state = r.ast.nodes.find(n => n.kind === "state");
    expect(state.openerHadSpaceAfterLt).toBe(true);
    expect(state.span).toBeDefined();
    expect(typeof state.span.start).toBe("number");
  });

  test("a `< Card name(string)>` typed-decl maps to a `state-constructor-def`", () => {
    const r = nativeParseFile("app.scrml", "< Card name(string) age(number?)>\n</Card>");
    const def = r.ast.nodes.find(n => n.kind === "state-constructor-def");
    expect(def).toBeDefined();
    expect(def.stateType).toBe("Card");
    expect(r.ast.nodes.find(n => n.kind === "state")).toBeUndefined();
  });

  test("a `state-constructor-def` carries the TypedAttrDecl[] payload", () => {
    const r = nativeParseFile("app.scrml", "< Card name(string) age(number?)>\n</Card>");
    const def = r.ast.nodes.find(n => n.kind === "state-constructor-def");
    expect(Array.isArray(def.typedAttrs)).toBe(true);
    expect(def.typedAttrs.length).toBe(2);
    expect(def.typedAttrs[0].name).toBe("name");
    expect(def.typedAttrs[0].typeExpr).toBe("string");
    expect(def.typedAttrs[0].optional).toBe(false);
    expect(def.typedAttrs[1].name).toBe("age");
    expect(def.typedAttrs[1].optional).toBe(true);
  });

  test("a state's children recurse — a child `text` node is synthesized", () => {
    const r = nativeParseFile("app.scrml", "< card>\n  body text\n</card>");
    const state = r.ast.nodes.find(n => n.kind === "state");
    const text = state.children.find(c => c.kind === "text");
    expect(text).toBeDefined();
    expect(text.value).toContain("body text");
  });

  test("a nested `<state>` inside a `<state>` is itself synthesized as `state`", () => {
    const r = nativeParseFile("app.scrml", "< outer>\n  < inner>\n  </inner>\n</outer>");
    const outer = r.ast.nodes.find(n => n.kind === "state");
    expect(outer.stateType).toBe("outer");
    const inner = outer.children.find(c => c.kind === "state");
    expect(inner).toBeDefined();
    expect(inner.stateType).toBe("inner");
    // The nested state must NOT be misrouted to `markup`.
    expect(outer.children.find(c => c.kind === "markup")).toBeUndefined();
  });

  test("DISCRIMINATION negative — a plain `<div>` is NOT synthesized as state", () => {
    // `<div>` (no space after `<`) is TagKind-not-StateOpener; `isStateBlock`
    // gates it out and it stays a `markup` node.
    const r = nativeParseFile("app.scrml", "<div>plain</div>");
    const div = r.ast.nodes.find(n => n.kind === "markup");
    expect(div).toBeDefined();
    expect(div.tag).toBe("div");
    expect(r.ast.nodes.find(n => n.kind === "state")).toBeUndefined();
    expect(r.ast.nodes.find(n => n.kind === "state-constructor-def")).toBeUndefined();
  });

  test("a `<state>` node participates in the single shared id space", () => {
    const r = nativeParseFile("app.scrml", "< outer>\n  < inner>txt</inner>\n</outer>");
    const ids = allIds(r.ast);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(Number.isInteger(id)).toBe(true);
      expect(id).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// C1 §8b — `<db>` / `<schema>` lifecycle-keyword state synthesis.
//
// M5 gap-ledger DIFF-deep-seq nested-`<state>` close-out. The §4.3
// `TagKind.StateOpener` signal fires only on the space-after-`<` opener
// (`< db ...>`). The corpus overwhelmingly writes the NO-SPACE form
// (`<db ...>` / `<schema>`), which `tagKindFor` classifies `Html`. The live
// builder normalizes BOTH forms to a `state` node via its
// `_STATE_FORM_LIFECYCLE` name-set (ast-builder.js `buildBlock`); the native
// `isStateBlock` mirrors that via `STATE_FORM_KEYWORDS = ["db","schema"]`.
//
// The divergence this closes: a `<db>` nested inside a top-level `<program>`
// markup body. The native parser produced a `markup` ASTNode for the nested
// `<db>` while the live pipeline produced `state`. The fix is the markup-layer
// recognition (`isStateBlock` + `emitMarkupElement` shaping) — depth-agnostic,
// so a `<db>` nested at any depth flips to `state`.
//
// SCOPE — shallow synth (the deep transition-decl/substate fidelity is a
// tracked follow-up). `engine` / `machine` are NOT state-form keywords here —
// they route to `engine-decl` via `isEngineBlock`.
// =============================================================================
describe("C1 §8b — `<db>` / `<schema>` lifecycle-keyword state synthesis", () => {
  test("a no-space `<db src=...>` maps to a `state` node, not `markup`", () => {
    const r = nativeParseFile("app.scrml", '<db src="contacts.db" tables="contacts">\nx\n</db>');
    const state = r.ast.nodes.find(n => n.kind === "state");
    expect(state).toBeDefined();
    expect(state.stateType).toBe("db");
    expect(r.ast.nodes.find(n => n.kind === "markup")).toBeUndefined();
  });

  test("a no-space `<schema>` maps to a `state` node", () => {
    const r = nativeParseFile("app.scrml", "<schema>\n  cols\n</schema>");
    const state = r.ast.nodes.find(n => n.kind === "state");
    expect(state).toBeDefined();
    expect(state.stateType).toBe("schema");
  });

  test("a no-space `<db>` carries its non-typed attrs and openerHadSpaceAfterLt false", () => {
    const r = nativeParseFile("app.scrml", '<db src="x.db" tables="t">y</db>');
    const state = r.ast.nodes.find(n => n.kind === "state");
    expect(Array.isArray(state.attrs)).toBe(true);
    expect(state.attrs.map(a => a.name).sort()).toEqual(["src", "tables"]);
    // No space after `<` — the live builder stamps openerHadSpaceAfterLt
    // false for the no-space form; the native synth must agree.
    expect(state.openerHadSpaceAfterLt).toBe(false);
    // A plain `state` node (no typed decls) has no `typedAttrs` field.
    expect("typedAttrs" in state).toBe(false);
  });

  test("a `<db>` nested inside a top-level `<program>` synthesizes a `state` child", () => {
    const src = "<program>\n<db src=\"x.db\">\n  ${ <count> = 0 }\n</db>\n</program>\n";
    const r = nativeParseFile("app.scrml", src);
    const program = r.ast.nodes.find(n => n.kind === "markup");
    expect(program).toBeDefined();
    const state = program.children.find(c => c.kind === "state");
    expect(state).toBeDefined();
    expect(state.stateType).toBe("db");
    // The nested `<db>` must NOT be misrouted to `markup`.
    expect(program.children.filter(c => c.kind === "markup").length).toBe(0);
  });

  test("the constructor-def form nested inside `<program>` synthesizes state-constructor-def", () => {
    const src = "<program>\n< Counter count(Int)>\n</Counter>\n</program>\n";
    const r = nativeParseFile("app.scrml", src);
    const program = r.ast.nodes.find(n => n.kind === "markup");
    const def = program.children.find(c => c.kind === "state-constructor-def");
    expect(def).toBeDefined();
    expect(def.stateType).toBe("Counter");
    expect(def.typedAttrs.length).toBe(1);
    expect(def.typedAttrs[0].name).toBe("count");
  });

  test("deeper nesting — `<db>` inside `<schema>` inside `<program>` both synthesize state", () => {
    const src = "<program>\n<schema>\n<db src=\"y.db\">\n</db>\n</schema>\n</program>\n";
    const r = nativeParseFile("app.scrml", src);
    const program = r.ast.nodes.find(n => n.kind === "markup");
    const schema = program.children.find(c => c.kind === "state");
    expect(schema).toBeDefined();
    expect(schema.stateType).toBe("schema");
    const db = schema.children.find(c => c.kind === "state");
    expect(db).toBeDefined();
    expect(db.stateType).toBe("db");
  });

  test("DISCRIMINATION negative — a plain markup child of `<program>` stays `markup`", () => {
    // The fix is state-keyword-specific. A plain `<div>` nested inside a
    // top-level `<program>` must still synthesize a `markup` node — the
    // `STATE_FORM_KEYWORDS` name-set gates it out.
    const src = "<program>\n<div class=\"x\">hi</div>\n</program>\n";
    const r = nativeParseFile("app.scrml", src);
    const program = r.ast.nodes.find(n => n.kind === "markup");
    const div = program.children.find(c => c.kind === "markup");
    expect(div).toBeDefined();
    expect(div.tag).toBe("div");
    // No `<div>` should ever be promoted to a `state` node.
    expect(program.children.find(c => c.kind === "state")).toBeUndefined();
    expect(program.children.find(c => c.kind === "state-constructor-def")).toBeUndefined();
  });

  test("DISCRIMINATION negative — a no-space `<engine>` is NOT a state node", () => {
    // `engine` / `machine` are in the live `_STATE_FORM_LIFECYCLE` set but
    // route to `engine-decl` (via `isEngineBlock`), NOT `state`.
    // `STATE_FORM_KEYWORDS` deliberately excludes them.
    const r = nativeParseFile("app.scrml", "<engine for=Cart>\n  rule\n</>");
    expect(r.ast.nodes.find(n => n.kind === "state")).toBeUndefined();
    expect(r.ast.nodes.find(n => n.kind === "engine-decl")).toBeDefined();
  });
});

// =============================================================================
// C1 §8 — §17.1.1 if-chain collapse (Unit P4-4).
//
// `if=` / `else-if=` / `else` attribute-conditional `markup` siblings are
// folded into ONE `if-chain` ASTNode by the assembler's `collapseIfChainNodes`
// post-pass — the C1 mirror of the live `collapseIfChains` (ast-builder.js
// L11673). The canonical scrml conditional-attribute form is `else-if=`
// (hyphenated — SPEC §17.1.1); the corpus also carries a `else if=` space
// form, but the hyphenated form is canon and is what these exemplars use.
// =============================================================================

// firstIfChain — locate the first `if-chain` ASTNode in a FileAST (recursing
// into markup `children` + logic/meta `body`), or `null` when there is none.
function firstIfChain(ast) {
  let found = null;
  function walk(nodes) {
    for (const n of nodes || []) {
      if (found !== null) return;
      if (n.kind === "if-chain") { found = n; return; }
      if (Array.isArray(n.children)) walk(n.children);
      if (Array.isArray(n.body)) walk(n.body);
    }
  }
  walk(ast.nodes);
  return found;
}

// eCtrlCodes — every E-CTRL-* code on a result's `errors` stream.
function eCtrlCodes(result) {
  return result.errors
    .filter(e => e !== null && typeof e.code === "string" && e.code.startsWith("E-CTRL"))
    .map(e => e.code);
}

describe("C1 §8 — §17.1.1 if-chain collapse", () => {
  test("an if / else-if / else sibling run collapses to ONE `if-chain` node", () => {
    // Three conditional-attributed `<div>` siblings — the maximal chain.
    const src = [
      "<div if=@a>A</div>",
      "<div else-if=@b>B</div>",
      "<div else>C</div>",
    ].join("\n");
    const r = nativeParseFile("app.scrml", src);
    const chain = firstIfChain(r.ast);
    expect(chain).not.toBe(null);
    expect(chain.kind).toBe("if-chain");
    // `if=` + one `else-if=` -> two branches; the `else` is the elseBranch.
    expect(chain.branches.length).toBe(2);
    expect(chain.elseBranch).not.toBe(null);
    expect(chain.elseBranch.kind).toBe("markup");
    // The three raw `markup` siblings collapsed — only the one `if-chain`
    // node survives at the top level.
    expect(r.ast.nodes.filter(n => n.kind === "if-chain").length).toBe(1);
    expect(r.ast.nodes.filter(n => n.kind === "markup").length).toBe(0);
    // Each branch carries the conditional-attribute value + the member node.
    expect(chain.branches[0].element.kind).toBe("markup");
    expect(chain.branches[0].condition).toBeDefined();
    expect(eCtrlCodes(r)).toEqual([]);
  });

  test("a two-arm if / else run collapses (one branch + an elseBranch)", () => {
    const src = "<div if=@a>A</div>\n<div else>B</div>";
    const r = nativeParseFile("app.scrml", src);
    const chain = firstIfChain(r.ast);
    expect(chain).not.toBe(null);
    expect(chain.branches.length).toBe(1);
    expect(chain.elseBranch).not.toBe(null);
    expect(eCtrlCodes(r)).toEqual([]);
  });

  test("a lone `if=` with no continuation stays a raw `markup` node", () => {
    // Live parity (ast-builder.js L11801): a one-arm chain is NOT collapsed.
    const r = nativeParseFile("app.scrml", "<div if=@a>A</div>");
    expect(firstIfChain(r.ast)).toBe(null);
    const div = r.ast.nodes.find(n => n.kind === "markup");
    expect(div).toBeDefined();
    expect(div.tag).toBe("div");
    expect(eCtrlCodes(r)).toEqual([]);
  });

  test("a NESTED if-chain (inside a markup parent) collapses", () => {
    // The collapse pass recurses into every node's `children` array — an
    // if-chain nested inside a `<section>` is folded the same way.
    const src = [
      "<section>",
      "<div if=@a>A</div>",
      "<div else>B</div>",
      "</section>",
    ].join("\n");
    const r = nativeParseFile("app.scrml", src);
    const section = r.ast.nodes.find(n => n.kind === "markup");
    expect(section).toBeDefined();
    const nestedChain = section.children.find(c => c.kind === "if-chain");
    expect(nestedChain).toBeDefined();
    expect(nestedChain.branches.length).toBe(1);
    expect(nestedChain.elseBranch).not.toBe(null);
    // No top-level if-chain — the chain is purely nested.
    expect(r.ast.nodes.filter(n => n.kind === "if-chain").length).toBe(0);
    expect(eCtrlCodes(r)).toEqual([]);
  });

  test("an orphan `else` (no preceding `if=`) fires E-CTRL-001", () => {
    const src = "<div>plain</div>\n<div else>orphan</div>";
    const r = nativeParseFile("app.scrml", src);
    expect(eCtrlCodes(r)).toContain("E-CTRL-001");
    // The orphan `else` element is NOT collapsed — it passes through.
    expect(firstIfChain(r.ast)).toBe(null);
  });

  test("an orphan `else-if=` (no preceding `if=`) fires E-CTRL-002", () => {
    const src = "<div>plain</div>\n<div else-if=@b>orphan</div>";
    const r = nativeParseFile("app.scrml", src);
    expect(eCtrlCodes(r)).toContain("E-CTRL-002");
    expect(firstIfChain(r.ast)).toBe(null);
  });

  test("`else` + `if=` on the same element fires E-CTRL-005", () => {
    const r = nativeParseFile("app.scrml", "<div if=@a else>X</div>");
    expect(eCtrlCodes(r)).toContain("E-CTRL-005");
  });

  test("extending a chain past a terminal `else` fires E-CTRL-003", () => {
    const src = [
      "<div if=@a>A</div>",
      "<div else>B</div>",
      "<div else-if=@c>C</div>",
    ].join("\n");
    const r = nativeParseFile("app.scrml", src);
    expect(eCtrlCodes(r)).toContain("E-CTRL-003");
  });

  test("whitespace-only text between members does not break a chain", () => {
    // §17.1.1 — intervening whitespace-only `text` nodes are not considered
    // to break a chain. The blank lines below produce whitespace `text`
    // siblings that the collapse pass skips.
    const src = "<div if=@a>A</div>\n\n<div else>B</div>\n";
    const r = nativeParseFile("app.scrml", src);
    const chain = firstIfChain(r.ast);
    expect(chain).not.toBe(null);
    expect(chain.branches.length).toBe(1);
    expect(chain.elseBranch).not.toBe(null);
  });

  test("the `if-chain` node REUSES the chain-opening node's id", () => {
    // Live parity (ast-builder.js L11808): the `if-chain` literal sets
    // `id: node.id` — no fresh allocation. The opening `if=` node's id is
    // carried onto the chain node.
    const src = "<div if=@a>A</div>\n<div else>B</div>";
    const r = nativeParseFile("app.scrml", src);
    const chain = firstIfChain(r.ast);
    expect(chain).not.toBe(null);
    expect(typeof chain.id).toBe("number");
    // The opening `if=` element retains its own id; the chain reuses it.
    expect(chain.id).toBe(chain.branches[0].element.id);
  });
});
