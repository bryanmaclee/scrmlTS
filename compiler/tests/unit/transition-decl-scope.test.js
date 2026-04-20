/**
 * §54.3 Phase 4d — `from` contextual keyword + params binding in transition bodies.
 *
 * Inside a transition body, `from` is bound to the enclosing substate's type.
 * Transition parameters (from paramsRaw) bind with their declared types.
 *
 * Expectations:
 *   - A bare reference to `from` inside the body does NOT emit E-SCOPE-001.
 *   - A bare reference to a declared parameter does NOT emit E-SCOPE-001.
 *   - A reference OUTSIDE the body (e.g., in a sibling statement) DOES emit
 *     E-SCOPE-001 for `from` and for the param name (they are scoped to the body).
 *   - The transition-decl AST node carries `fromSubstate` = enclosing state name.
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";
import { runTS } from "../../src/type-system.js";

function compile(src) {
  const bs = splitBlocks("/test/app.scrml", src);
  const { ast } = buildAST(bs);
  const res = runTS({ files: [ast] });
  return { ast, ...res };
}

function findNode(root, pred) {
  if (!root) return null;
  if (pred(root)) return root;
  const keys = ["nodes", "children", "body", "defChildren", "blocks"];
  for (const k of keys) {
    const v = root[k];
    if (Array.isArray(v)) for (const c of v) { const hit = findNode(c, pred); if (hit) return hit; }
    else if (v && typeof v === "object") { const hit = findNode(v, pred); if (hit) return hit; }
  }
  return null;
}

describe("§54.3 Phase 4d: fromSubstate stamped on transition-decl", () => {
  test("transition-decl nested inside < Draft> has fromSubstate='Draft'", () => {
    const { ast } = compile(
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate() => < Validated> { }\n` +
      `    </>\n` +
      `    < Validated body(string)></>\n` +
      `</>`
    );
    const td = findNode(ast, n => n.kind === "transition-decl" && n.name === "validate");
    expect(td).toBeDefined();
    expect(td.fromSubstate).toBe("Draft");
  });

  test("transition-decl at top-level state gets fromSubstate=<stateName>", () => {
    const { ast } = compile(
      `< Solo name(string)>\n    reset() => < Other> { }\n</>`
    );
    const td = findNode(ast, n => n.kind === "transition-decl");
    expect(td).toBeDefined();
    expect(td.fromSubstate).toBe("Solo");
  });
});

describe("§54.3 Phase 4d: `from` binding inside transition body", () => {
  test("bare `from` reference inside body does NOT emit E-SCOPE-001", () => {
    const { errors } = compile(
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate() => < Validated> { from }\n` +
      `    </>\n` +
      `    < Validated body(string)></>\n` +
      `</>`
    );
    const scopeErrs = errors.filter(e =>
      e.code === "E-SCOPE-001" &&
      String(e.message || "").includes("`from`")
    );
    expect(scopeErrs).toHaveLength(0);
  });

  test("`from.field` reference does not emit E-SCOPE-001 for `from`", () => {
    const { errors } = compile(
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate() => < Validated> { from.body }\n` +
      `    </>\n` +
      `    < Validated body(string)></>\n` +
      `</>`
    );
    const scopeErrs = errors.filter(e =>
      e.code === "E-SCOPE-001" &&
      /\bfrom\b/.test(String(e.message || ""))
    );
    expect(scopeErrs).toHaveLength(0);
  });

  test("declared parameter is in scope inside body", () => {
    const { errors } = compile(
      `< Submission id(string)>\n` +
      `    < Draft body(string)>\n` +
      `        validate(now: Date) => < Validated> { now }\n` +
      `    </>\n` +
      `    < Validated body(string)></>\n` +
      `</>`
    );
    const scopeErrs = errors.filter(e =>
      e.code === "E-SCOPE-001" &&
      /\bnow\b/.test(String(e.message || ""))
    );
    expect(scopeErrs).toHaveLength(0);
  });

  test("`from` is NOT in scope in a sibling statement outside the transition body", () => {
    // `from` is bound only inside transition bodies. Outside, it should fall
    // through to whatever the surrounding scope knows (nothing, in this case,
    // so E-SCOPE-001 fires).
    const { errors } = compile(
      `<program>\n` +
      `\${\n` +
      `  function leak() {\n` +
      `    return from\n` +   // no transition scope here
      `  }\n` +
      `}\n` +
      `</program>`
    );
    const fromErrs = errors.filter(e =>
      e.code === "E-SCOPE-001" &&
      /\bfrom\b/.test(String(e.message || ""))
    );
    // At least one E-SCOPE-001 for `from` outside transition scope
    expect(fromErrs.length).toBeGreaterThanOrEqual(1);
  });
});
