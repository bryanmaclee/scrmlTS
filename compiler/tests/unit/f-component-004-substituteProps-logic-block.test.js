/**
 * F-COMPONENT-004 — substituteProps walks logic-block bodies; shadowing-aware.
 *
 * Background: prior to this fix, substituteProps only walked markup text and
 * string-literal attribute values. Identifier references to declared props
 * inside `${ ... }` logic-block bodies were never substituted, producing
 * E-SCOPE-001 errors at TS time.
 *
 * Coverage:
 *   §1  Basic — prop ref inside `${ const x = name }` substitutes correctly
 *   §2  Member access — `${ const len = name.length }` substitutes leftmost ident
 *   §3  Lambda shadowing — outer `name` does NOT substitute the parameter `name`
 *                          inside the lambda body
 *   §4  Local shadowing — `${ const name = "shadow"; const greeting = name }` —
 *                          outer prop does NOT substitute the local `const name`
 *   §5  Template literal — `${ \`Hello ${name}\` }` substitutes inside `${...}`
 *   §6  Nested logic blocks — recursive substitution works
 *   §7  Member-access shadowing — `name.length` does NOT shadow `name` inside object
 *
 * The tests use the same runCEOn helper as component-expander.test.js, walking
 * the post-CE AST and asserting that prop refs inside logic bodies have been
 * replaced with the typed prop value (LitExpr/IdentExpr).
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runCEFile } from "../../src/component-expander.js";

function runCEOn(source) {
  const bsOut = splitBlocks("test.scrml", source);
  const tabOut = buildAST(bsOut);
  return runCEFile(tabOut);
}

/** Walk the AST and return all logic body items (statements). Walks every
 *  nested statement-array field (consequent, alternate, body, stmts, etc.). */
function collectLogicStmts(nodes) {
  const stmts = [];
  function walk(node) {
    if (!node || typeof node !== "object") return;
    // Logic-block body
    if (node.kind === "logic" && Array.isArray(node.body)) {
      for (const s of node.body) {
        if (s && typeof s === "object" && s.kind) stmts.push(s);
      }
    }
    // Statement-array fields: walk and collect every statement (not just root).
    for (const key of Object.keys(node)) {
      if (key === "span" || key === "id") continue;
      const v = node[key];
      if (Array.isArray(v)) {
        for (const item of v) {
          if (item && typeof item === "object" && item.kind && /-decl$|-stmt$|-expr$|^markup$|^state$|^logic$|^bare-expr$|^lift-expr$|^propagate-expr$|^guarded-expr$|^when-effect$|^when-message$|^cleanup-registration$|^debounce-call$|^throttle-call$|^upload-call$|^transaction-block$|^meta$|^match-arm-inline$/.test(item.kind)) {
            stmts.push(item);
          }
          if (item && typeof item === "object") walk(item);
        }
      } else if (v && typeof v === "object") {
        walk(v);
      }
    }
  }
  nodes.forEach(walk);
  return stmts;
}

/** Walk the AST and find all const-decl / let-decl / bare-expr statements with name === target. */
function findStmtsByName(nodes, predicate) {
  return collectLogicStmts(nodes).filter(predicate);
}

/** Recursively walk an ExprNode tree and collect every IdentExpr.name found. */
function collectIdentNames(node) {
  const names = [];
  function walk(n) {
    if (!n || typeof n !== "object") return;
    if (n.kind === "ident") {
      names.push(n.name);
      return;
    }
    if (n.kind === "lambda") {
      // Walk default values + body
      for (const p of n.params ?? []) {
        if (p.defaultValue) walk(p.defaultValue);
      }
      if (n.body) {
        if (n.body.kind === "expr") walk(n.body.value);
        else if (n.body.kind === "block") (n.body.stmts ?? []).forEach(s => walkStmt(s));
      }
      return;
    }
    for (const key of Object.keys(n)) {
      if (key === "span" || key === "id") continue;
      const v = n[key];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") walk(v);
    }
  }
  function walkStmt(s) {
    if (!s) return;
    for (const key of Object.keys(s)) {
      if (key === "span" || key === "id") continue;
      const v = s[key];
      if (Array.isArray(v)) v.forEach(walkStmt);
      else if (v && typeof v === "object") {
        if (v.kind && /^(ident|lit|binary|call|member|lambda|ternary|unary|object|array|spread|cast|new|index|assign|sql-ref|input-state-ref|escape-hatch|match-expr)$/.test(v.kind)) {
          walk(v);
        } else {
          walkStmt(v);
        }
      }
    }
  }
  walk(node);
  return names;
}

// ---------------------------------------------------------------------------

describe("§1 F-COMPONENT-004 basic — prop ref inside const decl substitutes", () => {
  test("string prop substitutes as LitExpr inside logic-block body", () => {
    const source = `<program>
\${ const Greeter = <div>
  \${
    const greeting = name
  }
</> }
<Greeter name="Alice"/>
</program>`;
    const { ast, errors } = runCEOn(source);
    const ceErrors = errors.filter(e => e.code && e.code.startsWith("E-COMPONENT-"));
    expect(ceErrors).toEqual([]);

    // The const-decl `greeting = name` should have its initExpr substituted to a LitExpr "Alice"
    const greetingDecls = findStmtsByName(ast.nodes, s => s.kind === "const-decl" && s.name === "greeting");
    expect(greetingDecls.length).toBeGreaterThan(0);
    const greetingDecl = greetingDecls[0];
    expect(greetingDecl.initExpr).toBeDefined();
    // After substitution, the IdentExpr `name` becomes a LitExpr with value "Alice".
    expect(greetingDecl.initExpr.kind).toBe("lit");
    expect(greetingDecl.initExpr.value).toBe("Alice");
    expect(greetingDecl.initExpr.litType).toBe("string");
  });

  test("variable-ref prop substitutes as IdentExpr", () => {
    const source = `<program>
\${
  @globalUser = "Bob"
  const Greeter = <div>
    \${
      const who = user
    }
  </>
}
<Greeter user=@globalUser/>
</program>`;
    const { ast, errors } = runCEOn(source);
    const ceErrors = errors.filter(e => e.code && e.code.startsWith("E-COMPONENT-"));
    expect(ceErrors).toEqual([]);

    const whoDecls = findStmtsByName(ast.nodes, s => s.kind === "const-decl" && s.name === "who");
    expect(whoDecls.length).toBeGreaterThan(0);
    const decl = whoDecls[0];
    expect(decl.initExpr).toBeDefined();
    // Should have been replaced with @globalUser (an IdentExpr or pre-built ExprNode)
    expect(decl.initExpr.kind).toBe("ident");
    expect(decl.initExpr.name).toBe("@globalUser");
  });
});

describe("§2 F-COMPONENT-004 member access — only leftmost ident substituted", () => {
  test("name.length substitutes name as LitExpr, leaves .length", () => {
    const source = `<program>
\${ const Sizer = <div>
  \${
    const len = name.length
  }
</> }
<Sizer name="alpha"/>
</program>`;
    const { ast, errors } = runCEOn(source);
    const ceErrors = errors.filter(e => e.code && e.code.startsWith("E-COMPONENT-"));
    expect(ceErrors).toEqual([]);

    const lenDecls = findStmtsByName(ast.nodes, s => s.kind === "const-decl" && s.name === "len");
    expect(lenDecls.length).toBeGreaterThan(0);
    const decl = lenDecls[0];
    expect(decl.initExpr).toBeDefined();
    expect(decl.initExpr.kind).toBe("member");
    // Object should be the substituted LitExpr "alpha"
    expect(decl.initExpr.object.kind).toBe("lit");
    expect(decl.initExpr.object.value).toBe("alpha");
    // Property remains the static string "length"
    expect(decl.initExpr.property).toBe("length");
  });
});

describe("§3 F-COMPONENT-004 lambda shadowing — param shadows prop", () => {
  test("lambda parameter `name` shadows outer `name` prop inside lambda body", () => {
    const source = `<program>
\${ const Wrapper = <div>
  \${
    const fn = (name) => name
  }
</> }
<Wrapper name="outer"/>
</program>`;
    const { ast, errors } = runCEOn(source);
    const ceErrors = errors.filter(e => e.code && e.code.startsWith("E-COMPONENT-"));
    expect(ceErrors).toEqual([]);

    const fnDecls = findStmtsByName(ast.nodes, s => s.kind === "const-decl" && s.name === "fn");
    expect(fnDecls.length).toBeGreaterThan(0);
    const decl = fnDecls[0];
    expect(decl.initExpr).toBeDefined();
    expect(decl.initExpr.kind).toBe("lambda");
    // Body should still contain an ident `name` (NOT replaced with "outer")
    const lambda = decl.initExpr;
    expect(lambda.body.kind).toBe("expr");
    expect(lambda.body.value.kind).toBe("ident");
    expect(lambda.body.value.name).toBe("name");
  });
});

describe("§4 F-COMPONENT-004 local shadowing — local decl shadows prop in subsequent stmts", () => {
  test("`const name = ...` shadows the prop for subsequent stmts in same block", () => {
    const source = `<program>
\${ const Demo = <div>
  \${
    const name = "shadow"
    const greeting = name
  }
</> }
<Demo name="prop-value"/>
</program>`;
    const { ast, errors } = runCEOn(source);
    const ceErrors = errors.filter(e => e.code && e.code.startsWith("E-COMPONENT-"));
    expect(ceErrors).toEqual([]);

    // Find the local `const name = "shadow"` decl
    const nameDecls = findStmtsByName(ast.nodes, s => s.kind === "const-decl" && s.name === "name");
    expect(nameDecls.length).toBeGreaterThan(0);
    const nameDecl = nameDecls[0];
    // Its initExpr is a literal "shadow" (NOT the prop value "prop-value")
    expect(nameDecl.initExpr.kind).toBe("lit");
    expect(nameDecl.initExpr.value).toBe("shadow");

    // The subsequent `const greeting = name` should reference the local `name`
    // (i.e., still an IdentExpr, NOT substituted to "prop-value")
    const greetingDecls = findStmtsByName(ast.nodes, s => s.kind === "const-decl" && s.name === "greeting");
    expect(greetingDecls.length).toBeGreaterThan(0);
    const greetingDecl = greetingDecls[0];
    expect(greetingDecl.initExpr.kind).toBe("ident");
    expect(greetingDecl.initExpr.name).toBe("name");
  });
});

describe("§5 F-COMPONENT-004 template literal — interpolations are rewritten", () => {
  test("backtick template `Hello ${name}` substitutes name inside interpolation", () => {
    const source = `<program>
\${ const T = <div>
  \${
    const out = \`Hello \${name}\`
  }
</> }
<T name="world"/>
</program>`;
    const { ast, errors } = runCEOn(source);
    const ceErrors = errors.filter(e => e.code && e.code.startsWith("E-COMPONENT-"));
    expect(ceErrors).toEqual([]);

    const outDecls = findStmtsByName(ast.nodes, s => s.kind === "const-decl" && s.name === "out");
    expect(outDecls.length).toBeGreaterThan(0);
    const decl = outDecls[0];
    expect(decl.initExpr).toBeDefined();
    // Either lit (litType template) or escape-hatch (TemplateLiteral) — either way, raw
    // text should contain the substituted "world" inside the interpolation.
    const raw = decl.initExpr.raw;
    expect(typeof raw).toBe("string");
    // After rewrite, the interpolation `${name}` becomes `${"world"}` (the LitExpr emit form)
    expect(raw).toContain("\"world\"");
  });
});

describe("§6 F-COMPONENT-004 nested logic blocks — recursive substitution", () => {
  test("logic block inside if-stmt body inside outer logic block substitutes prop", () => {
    const source = `<program>
\${ const Cond = <div>
  \${
    if (true) {
      const greeting = name
    }
  }
</> }
<Cond name="hello"/>
</program>`;
    const { ast, errors } = runCEOn(source);
    const ceErrors = errors.filter(e => e.code && e.code.startsWith("E-COMPONENT-"));
    expect(ceErrors).toEqual([]);

    const greetingDecls = findStmtsByName(ast.nodes, s => s.kind === "const-decl" && s.name === "greeting");
    expect(greetingDecls.length).toBeGreaterThan(0);
    const decl = greetingDecls[0];
    expect(decl.initExpr.kind).toBe("lit");
    expect(decl.initExpr.value).toBe("hello");
  });
});

describe("§7 F-COMPONENT-004 deep substitution — nested in expressions", () => {
  test("prop ref inside ternary substitutes correctly", () => {
    const source = `<program>
\${ const T = <div>
  \${
    const out = name == "x" ? name : "other"
  }
</> }
<T name="x"/>
</program>`;
    const { ast, errors } = runCEOn(source);
    const ceErrors = errors.filter(e => e.code && e.code.startsWith("E-COMPONENT-"));
    expect(ceErrors).toEqual([]);

    const outDecls = findStmtsByName(ast.nodes, s => s.kind === "const-decl" && s.name === "out");
    expect(outDecls.length).toBeGreaterThan(0);
    const decl = outDecls[0];
    expect(decl.initExpr.kind).toBe("ternary");
    // Both `name` references in the ternary should be substituted
    expect(decl.initExpr.condition.kind).toBe("binary");
    expect(decl.initExpr.condition.left.kind).toBe("lit");
    expect(decl.initExpr.condition.left.value).toBe("x");
    expect(decl.initExpr.consequent.kind).toBe("lit");
    expect(decl.initExpr.consequent.value).toBe("x");
  });

  test("prop ref inside object property value substitutes", () => {
    const source = `<program>
\${ const O = <div>
  \${
    const obj = { name: name, fixed: 42 }
  }
</> }
<O name="taggy"/>
</program>`;
    const { ast, errors } = runCEOn(source);
    const ceErrors = errors.filter(e => e.code && e.code.startsWith("E-COMPONENT-"));
    expect(ceErrors).toEqual([]);

    const objDecls = findStmtsByName(ast.nodes, s => s.kind === "const-decl" && s.name === "obj");
    expect(objDecls.length).toBeGreaterThan(0);
    const decl = objDecls[0];
    expect(decl.initExpr.kind).toBe("object");
    const nameProp = decl.initExpr.props.find(p => p.kind === "prop" && p.key === "name");
    expect(nameProp).toBeDefined();
    expect(nameProp.value.kind).toBe("lit");
    expect(nameProp.value.value).toBe("taggy");
  });
});
