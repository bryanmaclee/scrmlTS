/**
 * arrow-object-literal-body.test.js — Arrow expression body that is an object literal
 *
 * Regression: GITI-013 (giti inbound 2026-04-25).
 *
 * Before the fix, the structured ExprNode emitter (compiler/src/codegen/emit-expr.ts
 * `emitLambda`) emitted arrow-with-expression-body as
 *   `(${params}) => ${emitExpr(body)}`
 * unconditionally. When the body's emitted form starts with `{` (i.e. an
 * ObjectExpr), the result was `(f) => {path: f.path, ...}`, which JS parses as
 * a block statement (with `path:` as a label), not an expression returning an
 * object. `bun --check` then rejects with `Expected ";" but found ":"`.
 *
 * Fix (compiler/src/codegen/emit-expr.ts):
 *   - When `node.fnStyle !== "function"`, `node.body.kind === "expr"`, and
 *     `node.body.value.kind === "object"`, wrap the emitted body in parens.
 *   - Helper `arrowBodyNeedsParens` is the single point of truth.
 *
 * Coverage:
 *   §1  Sidecar repro — `items.map(f => ({ path: f.path, kind: f.kind }))`
 *       compiles and the server bundle parses as a JS module.
 *   §2  .map callback returning an object literal — emit must contain the parens.
 *   §3  Function arg position — `process(f => ({ k: f }))`.
 *   §4  RHS-of-assignment position — `const make = (a, b) => ({ a, b })`.
 *   §5  Sanity — array literal body `f => [f, f*2]` does NOT get extra parens
 *       (no ambiguity, parens are unnecessary).
 *   §6  Sanity — scalar body `f => 42` does NOT get parens.
 *   §7  Block-body arrow path (Bug C, S34) is NOT regressed: a block-body
 *       arrow inside a call argument still works.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { parse as acornParse } from "acorn";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/arrow-object-literal-body");
const FIXTURE_OUTPUT = join(FIXTURE_DIR, "dist");

function fix(name, src) {
  const path = join(FIXTURE_DIR, name);
  writeFileSync(path, src);
  return path;
}

/**
 * Parse a JS module string. Returns null on success; returns the SyntaxError
 * message on failure. Uses acorn (a compiler dep) with sourceType:"module" so
 * `export` / `import` at top level are accepted.
 */
function parseModule(src) {
  try {
    acornParse(src, { ecmaVersion: 2024, sourceType: "module", allowAwaitOutsideFunction: true, allowReturnOutsideFunction: true });
    return null;
  } catch (e) {
    return String(e?.message ?? e);
  }
}

let sidecarFx, mapObjFx, funcArgFx, rhsFx, arrayBodyFx, scalarBodyFx, blockBodyFx;

beforeAll(() => {
  mkdirSync(FIXTURE_DIR, { recursive: true });

  // §1: faithful copy of the GITI-013 sidecar reproducer
  sidecarFx = fix("sidecar.scrml", `<program>
\${
  server function classify() {
    const items = [
      { path: "a.txt", kind: "added" },
      { path: "b.txt", kind: "modified" },
    ]
    const out = items.map(f => ({ path: f.path, kind: f.kind }))
    return { count: out.length }
  }

  @res = { count: 0 }
  @res = classify()
}

<div>
  <p>arrow-object probe</p>
</div>
</program>
`);

  // §2: .map returning an object literal (client-mode arrow)
  mapObjFx = fix("map-obj.scrml", `<program>
\${
  @items = [{ id: 1 }, { id: 2 }]
  @rows = []
  function rebuild() {
    @rows = @items.map(it => ({ key: it.id, label: "x" }))
  }
}
<button onclick=rebuild()>go</button>
</program>
`);

  // §3: arrow returning object literal as an arg to a non-method call
  funcArgFx = fix("func-arg.scrml", `<program>
\${
  function process(fn) { return fn(1) }
  @result = process(n => ({ value: n, double: n * 2 }))
}
<p>${ "${@result.value}" }</p>
</program>
`);

  // §4: arrow returning object literal as RHS of an assignment
  rhsFx = fix("rhs.scrml", `<program>
\${
  const make = (a, b) => ({ a: a, b: b })
  @r = make(1, 2)
}
<p>${ "${@r.a}" }</p>
</program>
`);

  // §5: arrow returning array literal — should NOT get parens (no ambiguity)
  arrayBodyFx = fix("array-body.scrml", `<program>
\${
  @items = [1, 2, 3]
  @pairs = []
  function rebuild() {
    @pairs = @items.map(n => [n, n * 2])
  }
}
<button onclick=rebuild()>go</button>
</program>
`);

  // §6: arrow returning scalar — should NOT get parens
  scalarBodyFx = fix("scalar-body.scrml", `<program>
\${
  @items = [1, 2, 3]
  @count = 0
  function rebuild() {
    @count = @items.map(n => 42).length
  }
}
<button onclick=rebuild()>go</button>
</program>
`);

  // §7: regression guard — block-body arrow (Bug C path) still works
  blockBodyFx = fix("block-body.scrml", `<program>
\${
  @items = [1, 2, 3]
  @doubled = []
  function rebuild() {
    @doubled = @items.map((n, i) => {
      if (i % 2 == 0) {
        return n * 2
      }
      return n
    })
  }
}
<button onclick=rebuild()>go</button>
</program>
`);
});

afterAll(() => {
  rmSync(FIXTURE_DIR, { recursive: true, force: true });
});

function compile(path) {
  return compileScrml({ inputFiles: [path], outputDir: FIXTURE_OUTPUT, write: false });
}

// ---------------------------------------------------------------------------
// §1: Sidecar reproducer
// ---------------------------------------------------------------------------

describe("§1: sidecar GITI-013 reproducer", () => {
  test("compiles without errors", () => {
    const result = compile(sidecarFx);
    expect(result.errors).toEqual([]);
  });

  test("server.js: arrow body wrapped in parens, not bare braces", () => {
    const result = compile(sidecarFx);
    const serverJs = result.outputs.get(sidecarFx).serverJs;
    // Must contain the canonical parens-wrapped form somewhere
    expect(serverJs).toMatch(/=>\s*\(\s*\{\s*path/);
    // Must NOT contain the bug shape: `=> {path:` (where `path:` is taken as a label)
    expect(serverJs).not.toMatch(/=>\s*\{\s*path\s*:/);
  });

  test("server.js parses as a valid ESM module (no block-statement-vs-object collision)", () => {
    const result = compile(sidecarFx);
    const serverJs = result.outputs.get(sidecarFx).serverJs;
    const err = parseModule(serverJs);
    expect(err).toBeNull();
  });

  test("client.js parses as a valid ESM module", () => {
    const result = compile(sidecarFx);
    const clientJs = result.outputs.get(sidecarFx).clientJs;
    const err = parseModule(clientJs);
    expect(err).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §2: .map callback returning object literal
// ---------------------------------------------------------------------------

describe("§2: .map(it => ({ ... })) on the client", () => {
  test("compiles cleanly and emit contains parens-wrapped object body", () => {
    const result = compile(mapObjFx);
    expect(result.errors).toEqual([]);
    const js = result.outputs.get(mapObjFx).clientJs;
    // Match `=> ({` specifically — single-param arrows are emitted as
    // `(it) =>` so the segment between `.map(` and `=>` may contain a `)`.
    // The shape we care about is the body after `=>`.
    expect(js).toMatch(/=>\s*\(\s*\{\s*key\s*:/);
    // Must NOT contain the bug shape: `=> {key:` with no surrounding paren.
    expect(js).not.toMatch(/=>\s*\{\s*key\s*:/);
  });

  test("client.js parses as a valid ESM module", () => {
    const result = compile(mapObjFx);
    const js = result.outputs.get(mapObjFx).clientJs;
    const err = parseModule(js);
    expect(err).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §3: arrow returning object literal as a function arg
// ---------------------------------------------------------------------------

describe("§3: process(n => ({ ... }))", () => {
  test("compiles and emit contains parens-wrapped body", () => {
    const result = compile(funcArgFx);
    expect(result.errors).toEqual([]);
    const out = result.outputs.get(funcArgFx);
    const combined = `${out.clientJs ?? ""}\n${out.serverJs ?? ""}`;
    expect(combined).toMatch(/=>\s*\(\s*\{\s*value\s*:/);
    expect(combined).not.toMatch(/=>\s*\{\s*value\s*:/);
  });

  test("both bundles parse as valid ESM modules", () => {
    const result = compile(funcArgFx);
    const out = result.outputs.get(funcArgFx);
    expect(parseModule(out.clientJs ?? "")).toBeNull();
    expect(parseModule(out.serverJs ?? "")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §4: arrow returning object literal as RHS of assignment
// ---------------------------------------------------------------------------

describe("§4: const make = (a, b) => ({ ... })", () => {
  test("compiles and the assigned arrow has parens-wrapped body", () => {
    const result = compile(rhsFx);
    expect(result.errors).toEqual([]);
    const out = result.outputs.get(rhsFx);
    const combined = `${out.clientJs ?? ""}\n${out.serverJs ?? ""}`;
    expect(combined).toMatch(/=>\s*\(\s*\{\s*a\s*:/);
  });

  test("both bundles parse as valid ESM modules", () => {
    const result = compile(rhsFx);
    const out = result.outputs.get(rhsFx);
    expect(parseModule(out.clientJs ?? "")).toBeNull();
    expect(parseModule(out.serverJs ?? "")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §5: arrow returning array literal — NO parens added (no ambiguity)
// ---------------------------------------------------------------------------

describe("§5: array-literal body — no spurious parens", () => {
  test("compiles and emit contains `=> [` (NOT `=> ([`)", () => {
    const result = compile(arrayBodyFx);
    expect(result.errors).toEqual([]);
    const js = result.outputs.get(arrayBodyFx).clientJs;
    expect(js).toMatch(/=>\s*\[/);
    // Defensive: the array-body arrow should not have been paren-wrapped.
    expect(js).not.toMatch(/=>\s*\(\s*\[/);
  });

  test("client.js parses as a valid ESM module", () => {
    const result = compile(arrayBodyFx);
    const js = result.outputs.get(arrayBodyFx).clientJs;
    expect(parseModule(js)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §6: scalar body — NO parens added
// ---------------------------------------------------------------------------

describe("§6: scalar body — no spurious parens", () => {
  test("compiles and the `=> 42` form is preserved without parens", () => {
    const result = compile(scalarBodyFx);
    expect(result.errors).toEqual([]);
    const js = result.outputs.get(scalarBodyFx).clientJs;
    expect(js).toMatch(/=>\s*42/);
    expect(js).not.toMatch(/=>\s*\(\s*42\s*\)/);
  });

  test("client.js parses as a valid ESM module", () => {
    const result = compile(scalarBodyFx);
    const js = result.outputs.get(scalarBodyFx).clientJs;
    expect(parseModule(js)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §7: Bug C regression guard — block-body arrow path still works
// ---------------------------------------------------------------------------

describe("§7: block-body arrow (Bug C, S34) is NOT regressed", () => {
  test("compiles and the multi-statement arrow body is preserved verbatim", () => {
    const result = compile(blockBodyFx);
    expect(result.errors).toEqual([]);
    const js = result.outputs.get(blockBodyFx).clientJs;
    // The arrow with block body goes through escape-hatch and emits the raw
    // text — which contains both branches.
    expect(js).toMatch(/\.map\(/);
    expect(js).toContain("return n * 2");
    expect(js).toContain("return n");
  });

  test("client.js parses as a valid ESM module", () => {
    const result = compile(blockBodyFx);
    const js = result.outputs.get(blockBodyFx).clientJs;
    expect(parseModule(js)).toBeNull();
  });
});
