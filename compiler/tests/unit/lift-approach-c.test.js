/**
 * Lift Approach C — parseLiftTag Structured MarkupNode Tests
 *
 * Tests that `lift <tag>...</>` inline markup produces a structured
 * {kind: "markup", node: MarkupNode} result, not a {kind: "expr"} string.
 *
 * Coverage:
 *   §1  Basic tags — <tag>text</>
 *   §2  Self-closing — <br/>, void elements
 *   §3  Attributes — string, ident, call-ref, BLOCK_REF, absent
 *   §4  Compound attribute names — bind:value, class:active, aria-label, data-id
 *   §5  Nested tags — recursive markup
 *   §6  BLOCK_REF children — ${expr} as logic children
 *   §7  Closers — </> inferred, </tagname> explicit
 *   §8  Bare component refs — <ComponentName> with no closer
 *   §9  Non-markup lift — falls back to expr path (identifiers, calls)
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

function run(src) {
  return buildAST(splitBlocks("test.scrml", src)).ast;
}

function findLift(ast) {
  function walk(nodes) {
    for (const n of nodes || []) {
      if (!n) continue;
      if (n.kind === "lift-expr") return n;
      for (const k of ["body", "consequent", "alternate", "children"]) {
        if (Array.isArray(n[k])) {
          const r = walk(n[k]);
          if (r) return r;
        }
      }
    }
    return null;
  }
  return walk(ast.nodes);
}

describe("Lift Approach C §1: basic tag markup", () => {
  test("simple tag with text produces structured markup", () => {
    const ast = run("${ lift <li>hello</> }");
    const lift = findLift(ast);
    expect(lift?.expr?.kind).toBe("markup");
    expect(lift.expr.node.tag).toBe("li");
    expect(lift.expr.node.closerForm).toBe("inferred");
  });

  test("tag with text child produces text node", () => {
    const ast = run("${ lift <p>hello</> }");
    const lift = findLift(ast);
    expect(lift?.expr?.kind).toBe("markup");
    const children = lift.expr.node.children;
    expect(children.length).toBeGreaterThan(0);
    expect(children.some(c => c.kind === "text")).toBe(true);
  });
});

describe("Lift Approach C §2: self-closing and void elements", () => {
  test("self-closing <br/> produces markup with selfClosing=true", () => {
    const ast = run("${ lift <br/> }");
    const lift = findLift(ast);
    expect(lift?.expr?.kind).toBe("markup");
    expect(lift.expr.node.tag).toBe("br");
    expect(lift.expr.node.selfClosing).toBe(true);
  });

  test("self-closing void element <input type=\"text\"/>", () => {
    const ast = run(`\${ lift <input type="text"/> }`);
    const lift = findLift(ast);
    expect(lift?.expr?.kind).toBe("markup");
    expect(lift.expr.node.tag).toBe("input");
    expect(lift.expr.node.selfClosing).toBe(true);
  });
});

describe("Lift Approach C §3: attributes", () => {
  test("string attribute produces string-literal value", () => {
    const ast = run(`\${ lift <div class="card">x</> }`);
    const lift = findLift(ast);
    expect(lift?.expr?.kind).toBe("markup");
    const attrs = lift.expr.node.attrs;
    expect(attrs.length).toBe(1);
    expect(attrs[0].name).toBe("class");
    expect(attrs[0].value.kind).toBe("string-literal");
    expect(attrs[0].value.value).toBe("card");
  });

  test("identifier attribute produces variable-ref value", () => {
    const ast = run(`\${ lift <input checked=done/> }`);
    const lift = findLift(ast);
    expect(lift?.expr?.kind).toBe("markup");
    const attrs = lift.expr.node.attrs;
    expect(attrs.length).toBe(1);
    expect(attrs[0].name).toBe("checked");
    expect(attrs[0].value.kind).toBe("variable-ref");
  });

  test("call attribute produces call-ref value", () => {
    const ast = run(`\${ lift <button onclick=toggleTodo(todo.id)>x</> }`);
    const lift = findLift(ast);
    expect(lift?.expr?.kind).toBe("markup");
    const attrs = lift.expr.node.attrs;
    expect(attrs.length).toBe(1);
    expect(attrs[0].name).toBe("onclick");
    expect(attrs[0].value.kind).toBe("call-ref");
    expect(attrs[0].value.name).toBe("toggleTodo");
    expect(attrs[0].value.args).toEqual(["todo.id"]);
  });

  test("boolean attribute without = produces absent value", () => {
    const ast = run(`\${ lift <input disabled/> }`);
    const lift = findLift(ast);
    expect(lift?.expr?.kind).toBe("markup");
    const attrs = lift.expr.node.attrs;
    expect(attrs.length).toBe(1);
    expect(attrs[0].name).toBe("disabled");
    expect(attrs[0].value.kind).toBe("absent");
  });

  test("multiple attributes parsed independently", () => {
    const ast = run(`\${ lift <input type="text" name=field disabled/> }`);
    const lift = findLift(ast);
    expect(lift?.expr?.kind).toBe("markup");
    const attrs = lift.expr.node.attrs;
    expect(attrs.length).toBe(3);
    expect(attrs[0].name).toBe("type");
    expect(attrs[1].name).toBe("name");
    expect(attrs[2].name).toBe("disabled");
  });
});

describe("Lift Approach C §4: compound attribute names", () => {
  test("hyphenated attr (aria-label) produces single compound name", () => {
    const ast = run(`\${ lift <button aria-label="Delete">x</> }`);
    const lift = findLift(ast);
    expect(lift?.expr?.kind).toBe("markup");
    const attrs = lift.expr.node.attrs;
    expect(attrs[0].name).toBe("aria-label");
    expect(attrs[0].value.kind).toBe("string-literal");
  });

  test("colon attr (bind:value) produces single compound name", () => {
    const ast = run(`\${ lift <input bind:value=@name/> }`);
    const lift = findLift(ast);
    expect(lift?.expr?.kind).toBe("markup");
    const attrs = lift.expr.node.attrs;
    expect(attrs[0].name).toBe("bind:value");
  });

  test("class:active conditional attr", () => {
    const ast = run(`\${ lift <li class:active=isSelected>x</> }`);
    const lift = findLift(ast);
    expect(lift?.expr?.kind).toBe("markup");
    const attrs = lift.expr.node.attrs;
    expect(attrs[0].name).toBe("class:active");
  });
});

describe("Lift Approach C §5: nested tags", () => {
  test("nested tag becomes markup child", () => {
    const ast = run(`\${ lift <div><span>inner</></> }`);
    const lift = findLift(ast);
    expect(lift?.expr?.kind).toBe("markup");
    const outer = lift.expr.node;
    expect(outer.tag).toBe("div");
    const markupChild = outer.children.find(c => c.kind === "markup");
    expect(markupChild).toBeDefined();
    expect(markupChild.tag).toBe("span");
  });

  test("deeply nested tags preserve structure", () => {
    const ast = run(`\${ lift <a><b><c>deep</></></> }`);
    const lift = findLift(ast);
    expect(lift?.expr?.kind).toBe("markup");
    const a = lift.expr.node;
    expect(a.tag).toBe("a");
    const b = a.children.find(c => c.kind === "markup");
    expect(b.tag).toBe("b");
    const c = b.children.find(c => c.kind === "markup");
    expect(c.tag).toBe("c");
  });
});

describe("Lift Approach C §6: BLOCK_REF children (${expr})", () => {
  test("${expr} in text content produces logic child", () => {
    const ast = run(`\${ lift <li>\${item.name}</> }`);
    const lift = findLift(ast);
    expect(lift?.expr?.kind).toBe("markup");
    const children = lift.expr.node.children;
    const logic = children.find(c => c.kind === "logic");
    expect(logic).toBeDefined();
  });
});

describe("Lift Approach C §7: closers", () => {
  test("</> inferred closer", () => {
    const ast = run(`\${ lift <p>text</> }`);
    const lift = findLift(ast);
    expect(lift?.expr?.kind).toBe("markup");
    expect(lift.expr.node.closerForm).toBe("inferred");
  });

  test("</tagname> explicit closer", () => {
    const ast = run(`\${ lift <li>text</li> }`);
    const lift = findLift(ast);
    expect(lift?.expr?.kind).toBe("markup");
    expect(lift.expr.node.closerForm).toBe("explicit");
  });
});

describe("Lift Approach C §8: bare component refs", () => {
  test("<ComponentName> followed by } is treated as bare ref", () => {
    // Bare component ref: <ComponentName> with no </> closer,
    // followed immediately by a } (match arm body closer or block end)
    const ast = run(`\${ match x { .A :> { lift <InfoStep> } } }`);
    const lift = findLift(ast);
    expect(lift?.expr?.kind).toBe("markup");
    expect(lift.expr.node.tag).toBe("InfoStep");
    expect(lift.expr.node.isComponent).toBe(true);
    expect(lift.expr.node.closerForm).toBe("bare-ref");
  });
});

describe("Lift Approach C §9: non-markup lift falls back to expr path", () => {
  test("lift <identifier> produces expr kind", () => {
    const ast = run(`\${ lift someValue; }`);
    const lift = findLift(ast);
    expect(lift?.expr?.kind).toBe("expr");
  });

  test("lift <function_call()> produces expr kind", () => {
    const ast = run(`\${ lift fn(x); }`);
    const lift = findLift(ast);
    expect(lift?.expr?.kind).toBe("expr");
  });
});
