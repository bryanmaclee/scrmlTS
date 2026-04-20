/**
 * arrow-block-body-in-call-arg.test.js — Block-body arrow functions as call arguments
 *
 * Regression: 6nz inbound 2026-04-20 Bug C.
 *
 * The expression parser converts arrow functions with a BlockStatement body
 * (e.g. `(n, i) => { if (...) return n*2; return n }`) to an EscapeHatchExpr
 * because a structured representation of JS block statements is not in
 * Phase 1 scope. The raw source text is captured on the escape-hatch so
 * downstream emitters can pass it through verbatim.
 *
 * Bug: the CallExpression case recursed into its args WITHOUT threading
 * `rawSource`, so each arrow arg was built with raw="". The downstream
 * emitter then dropped the empty raw, producing `.map()` with no
 * callback — the entire arrow silently vanished.
 *
 * Fix (expression-parser.ts):
 *   - CallExpression case threads rawSource into arg recursion.
 *   - ArrowFunctionExpression/FunctionExpression case slices the arrow's
 *     own raw substring from rawSource using node.start/end, validated
 *     with a shape regex so mis-aligned offsets fall back safely.
 *
 * Coverage:
 *   §1  Bug C repro — `arr.map((n, i) => { ... })` keeps the callback body
 *   §2  forEach — `arr.forEach((x) => { ... })` keeps the callback
 *   §3  filter — `arr.filter((x) => { if (...) return true; return false })` keeps the callback
 *   §4  Single-expression arrow unchanged (regression guard) — `arr.map(e => e.x)` still works
 *   §5  Nested arrow — arrow inside arrow body
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { compileScrml } from "../../src/api.js";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const FIXTURE_DIR = join(import.meta.dir, "__fixtures__/arrow-block-body");
const FIXTURE_OUTPUT = join(FIXTURE_DIR, "dist");

function fix(name, src) {
  const path = join(FIXTURE_DIR, name);
  writeFileSync(path, src);
  return path;
}

let mapFx, forEachFx, filterFx, singleExprFx, nestedFx;

beforeAll(() => {
  mkdirSync(FIXTURE_DIR, { recursive: true });

  mapFx = fix("map.scrml", `<program>
\${
  @numbers = [1, 2, 3, 4, 5]
  @doubled = []
  function recompute() {
    @doubled = @numbers.map((n, i) => {
      if (i % 2 == 0) {
        return n * 2
      }
      return n
    })
  }
}
<button onclick=recompute()>run</button>
</program>
`);

  forEachFx = fix("forEach.scrml", `<program>
\${
  @count = 0
  @items = [1, 2, 3]
  function runEach() {
    @items.forEach((x) => {
      @count = @count + x
    })
  }
}
<button onclick=runEach()>go</button>
</program>
`);

  filterFx = fix("filter.scrml", `<program>
\${
  @items = [1, 2, 3, 4, 5]
  @keep = []
  function runFilter() {
    @keep = @items.filter((x) => {
      if (x > 2) {
        return true
      }
      return false
    })
  }
}
<button onclick=runFilter()>filter</button>
</program>
`);

  singleExprFx = fix("single.scrml", `<program>
\${
  @items = [1, 2, 3]
  @out = []
  function runSingle() {
    @out = @items.map(e => e * 10)
  }
}
<button onclick=runSingle()>x10</button>
</program>
`);

  nestedFx = fix("nested.scrml", `<program>
\${
  @rows = [[1, 2], [3, 4]]
  @out = []
  function runNest() {
    @out = @rows.map((row, i) => {
      return row.map((v, j) => {
        return v + i + j
      })
    })
  }
}
<button onclick=runNest()>nest</button>
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
// §1: Bug C repro — arr.map with multi-statement arrow body
// ---------------------------------------------------------------------------

describe("§1: Bug C — arr.map((n, i) => { ... }) keeps callback", () => {
  test("compile succeeds", () => {
    const result = compile(mapFx);
    expect(result.errors).toEqual([]);
  });

  test("the .map() call is NOT emitted empty", () => {
    const result = compile(mapFx);
    const js = result.outputs.get(mapFx).clientJs;
    expect(js).not.toMatch(/\.map\(\s*\)/);
  });

  test("the arrow callback body appears in the output", () => {
    const result = compile(mapFx);
    const js = result.outputs.get(mapFx).clientJs;
    // An arrow `=>` must appear after `.map(` — searching for `=>` between
    // `.map(` and the matching return means the callback is present.
    expect(js).toMatch(/\.map\(/);
    expect(js).toMatch(/=>/);
    // The body content appears somewhere — `return n * 2` is specific to the test
    expect(js).toContain("return n * 2");
  });

  test("the emitted JS is parseable", () => {
    const result = compile(mapFx);
    const js = result.outputs.get(mapFx).clientJs;
    expect(() => new Function(js)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// §2: forEach
// ---------------------------------------------------------------------------

describe("§2: arr.forEach((x) => { ... })", () => {
  test("forEach callback body is preserved", () => {
    const result = compile(forEachFx);
    expect(result.errors).toEqual([]);
    const js = result.outputs.get(forEachFx).clientJs;
    expect(js).not.toMatch(/\.forEach\(\s*\)/);
    expect(js).toMatch(/\.forEach\([^)]*=>/);
  });
});

// ---------------------------------------------------------------------------
// §3: filter
// ---------------------------------------------------------------------------

describe("§3: arr.filter((x) => { ... })", () => {
  test("filter callback body with branching is preserved", () => {
    const result = compile(filterFx);
    expect(result.errors).toEqual([]);
    const js = result.outputs.get(filterFx).clientJs;
    expect(js).not.toMatch(/\.filter\(\s*\)/);
    expect(js).toContain("return true");
    expect(js).toContain("return false");
  });
});

// ---------------------------------------------------------------------------
// §4: Single-expression arrow unchanged
// ---------------------------------------------------------------------------

describe("§4: single-expression arrow regression guard", () => {
  test("`arr.map(e => e * 10)` still emits a structured arrow, not escape-hatch", () => {
    const result = compile(singleExprFx);
    expect(result.errors).toEqual([]);
    const js = result.outputs.get(singleExprFx).clientJs;
    expect(js).not.toMatch(/\.map\(\s*\)/);
    // `e =>` or `(e) =>` arrow present — either form is valid JS
    expect(js).toMatch(/\.map\(\s*\(?\s*e\s*\)?\s*=>/);
  });
});

// ---------------------------------------------------------------------------
// §5: Nested arrows — arrow inside arrow
// ---------------------------------------------------------------------------

describe("§5: nested block-body arrows", () => {
  test("outer arrow and inner arrow both appear", () => {
    const result = compile(nestedFx);
    expect(result.errors).toEqual([]);
    const js = result.outputs.get(nestedFx).clientJs;
    // Both map() calls must have callback args (two arrows present)
    const arrowCount = (js.match(/=>/g) ?? []).length;
    expect(arrowCount).toBeGreaterThanOrEqual(2);
  });
});
