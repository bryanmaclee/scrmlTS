// Phase 4b — AST collapse of (text-signature + logic-body) sibling pairs
// into a single `transition-decl` node inside a state constructor.
//
// Spec §54.3: inside a state (or substate) constructor body, a
// `ident(params) => < Target> { body }` declaration becomes a
// `transition-decl` AST node carrying name/params/targetSubstate/body.

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

function astFor(source) {
  const bs = splitBlocks("/test/app.scrml", source);
  expect(bs.errors).toHaveLength(0);
  const { ast } = buildAST(bs);
  return ast;
}

function findNode(root, predicate) {
  if (!root) return null;
  if (predicate(root)) return root;
  const keys = ["nodes", "children", "body", "defChildren", "blocks", "typedAttrs", "attrs"];
  for (const k of keys) {
    const v = root[k];
    if (Array.isArray(v)) {
      for (const child of v) {
        const hit = findNode(child, predicate);
        if (hit) return hit;
      }
    } else if (v && typeof v === "object") {
      const hit = findNode(v, predicate);
      if (hit) return hit;
    }
  }
  return null;
}

function findAllNodes(root, predicate, out = []) {
  if (!root) return out;
  if (predicate(root)) out.push(root);
  const keys = ["nodes", "children", "body", "defChildren", "blocks", "typedAttrs", "attrs"];
  for (const k of keys) {
    const v = root[k];
    if (Array.isArray(v)) for (const child of v) findAllNodes(child, predicate, out);
    else if (v && typeof v === "object") findAllNodes(v, predicate, out);
  }
  return out;
}

describe("Phase 4b — AST transition-decl node", () => {
  test("single transition with empty body produces transition-decl", () => {
    const ast = astFor(`< Submission id(string)>
    < Draft body(string)>
        validate(now: Date) => < Validated> { }
    </>
    < Validated body(string)></>
</>`);
    const td = findNode(ast, n => n.kind === "transition-decl");
    expect(td).toBeDefined();
    expect(td.name).toBe("validate");
    expect(td.targetSubstate).toBe("Validated");
    expect(td.paramsRaw).toBe("now: Date");
    expect(Array.isArray(td.body)).toBe(true);
  });

  test("transition with no params", () => {
    const ast = astFor(`< S>
    < A> reset() => < B> { } </>
    < B></>
</>`);
    const td = findNode(ast, n => n.kind === "transition-decl");
    expect(td).toBeDefined();
    expect(td.name).toBe("reset");
    expect(td.targetSubstate).toBe("B");
    expect(td.paramsRaw).toBe("");
  });

  test("transition with multi-arg params", () => {
    const ast = astFor(`< S>
    < A> go(x: int, y: int) => < B> { } </>
    < B></>
</>`);
    const td = findNode(ast, n => n.kind === "transition-decl");
    expect(td.name).toBe("go");
    expect(td.paramsRaw).toBe("x: int, y: int");
  });

  test("multiple transitions in one substate", () => {
    const ast = astFor(`< Submission id(string)>
    < Draft body(string)>
        validate(now: Date) => < Validated> { }
        cancel() => < Validated> { }
    </>
    < Validated body(string)></>
</>`);
    const tds = findAllNodes(ast, n => n.kind === "transition-decl");
    expect(tds).toHaveLength(2);
    expect(tds.map(t => t.name).sort()).toEqual(["cancel", "validate"]);
    const cancelTd = tds.find(t => t.name === "cancel");
    expect(cancelTd.targetSubstate).toBe("Validated");
    expect(cancelTd.paramsRaw).toBe("");
  });

  test("transition-decl lives inside its parent state-constructor-def", () => {
    const ast = astFor(`< Submission id(string)>
    < Draft body(string)>
        validate() => < Validated> { }
    </>
    < Validated body(string)></>
</>`);
    const draft = findNode(ast, n =>
      n.kind === "state-constructor-def" && n.stateType === "Draft"
    );
    expect(draft).toBeDefined();
    const td = draft.children.find(c => c.kind === "transition-decl");
    expect(td).toBeDefined();
    expect(td.name).toBe("validate");
  });

  test("regression: state without any transitions builds cleanly", () => {
    const ast = astFor(`< Submission id(string)>
    < Draft body(string)></>
    < Validated body(string)></>
</>`);
    const tds = findAllNodes(ast, n => n.kind === "transition-decl");
    expect(tds).toHaveLength(0);
    const draft = findNode(ast, n => n.kind === "state-constructor-def" && n.stateType === "Draft");
    expect(draft).toBeDefined();
  });

  test("transition-decl span covers the whole declaration", () => {
    const ast = astFor(`< S>
    < A> validate() => < B> { } </>
    < B></>
</>`);
    const td = findNode(ast, n => n.kind === "transition-decl");
    expect(td.span).toBeDefined();
    expect(td.span.start).toBeGreaterThanOrEqual(0);
    expect(td.span.end).toBeGreaterThan(td.span.start);
  });

  test("transition body is parseable as logic statements", () => {
    const ast = astFor(`< S>
    < A> go() => < B> { let x = 1 } </>
    < B></>
</>`);
    const td = findNode(ast, n => n.kind === "transition-decl");
    expect(td).toBeDefined();
    // Body should contain a let-decl
    const letDecl = td.body.find(n => n.kind === "let-decl" || n.kind === "variable-decl");
    expect(letDecl).toBeDefined();
  });
});
