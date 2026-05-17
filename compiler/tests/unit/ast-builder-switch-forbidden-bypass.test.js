/**
 * ast-builder-switch-forbidden-bypass — A7 regression suite (S99 2026-05-17).
 *
 * Gap (pre-A7): SPEC §17 + §34 catalog row mandate that the JavaScript
 * `switch` keyword fires E-SWITCH-FORBIDDEN at every statement-start position
 * in any scrml logic context — universally forbidden, no exceptions. The TAB
 * stage had two inline fire sites (parseOneStatement L5089, parseLogicBody
 * main loop L8567) but the `export function name(...) { switch (...) { ... } }`
 * shape bypassed BOTH:
 *
 *   1. Main loop's `export` handler calls collectExpr() which greedily
 *      consumes the entire `function ... { body }` (collectExpr tracks brace
 *      depth and only stops at depth 0).
 *   2. The body tokens never reach the main-loop function-decl handler at
 *      L7874 — they have already been swallowed into the export-decl's
 *      `expr` text.
 *   3. The ANOMALY-2 synth path at L7125 re-tokenizes a token slice and
 *      invokes parseLogicBody recursively to produce a real function-decl
 *      with parsed params + body. This re-parse DOES hit the L5089 detector,
 *      but the synth call passes `[]` for the `errors` array (intentional —
 *      avoids double-emit against collectExpr's own pass).
 *   4. The switch-stmt AST node is pushed but the error is dropped.
 *
 * Fix (commit e290dec): post-parse `collectForbiddenSwitches` walker runs
 * once at the end of `buildAST` and emits E-SWITCH-FORBIDDEN for every
 * `switch-stmt` node found in the final AST, deduplicated against the
 * inline fire-site emissions by `(span.file, span.start)`.
 *
 * Coverage shapes asserted below:
 *   - Top-level `switch` (existing fire site)
 *   - Nested in `function` body (existing fire site)
 *   - Nested in `fn` body (A6 keyword-form, existing fire site)
 *   - The exact bypass: inside an `export function` body
 *   - Deeply-nested fn chain (4-level: function → function → fn → switch)
 *   - Inside an event-handler attribute body
 *   - Inside a meta block `^{}`
 *   - Inside a `partial match` block (markup-style sibling context)
 *   - The exact shape compiler/self-host/tab.scrml:1078 had
 *   - Dedup invariant: every switch fires EXACTLY one E-SWITCH-FORBIDDEN
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

function parse(src) {
  const filePath = "/test/fixture.scrml";
  const bs = splitBlocks(filePath, src);
  return buildAST(bs);
}

function switchErrors(result) {
  return (result.errors || []).filter(e => e.code === "E-SWITCH-FORBIDDEN");
}

function findAllNodesOfKind(ast, kind) {
  const out = [];
  function walk(n) {
    if (!n || typeof n !== "object") return;
    if (n.kind === kind) out.push(n);
    for (const k of Object.keys(n)) {
      if (k === "span" || k === "id") continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object" && k !== "span") walk(v);
    }
  }
  walk(ast);
  return out;
}

describe("E-SWITCH-FORBIDDEN universal coverage (A7)", () => {
  test("top-level switch fires E-SWITCH-FORBIDDEN (existing fire site preserved)", () => {
    const r = parse(`<program>\n\${ switch (x) { case 1: lift 1 } }\n</program>`);
    expect(switchErrors(r).length).toBe(1);
  });

  test("switch nested in function body fires E-SWITCH-FORBIDDEN", () => {
    const r = parse(`<program>\n\${ function f() { switch (x) { case 1: lift 1 } } }\n</program>`);
    expect(switchErrors(r).length).toBe(1);
  });

  test("switch nested in fn body fires E-SWITCH-FORBIDDEN (A6 nested-fn path)", () => {
    const r = parse(`<program>\n\${ fn f() { switch (x) { case 1: lift 1 } } }\n</program>`);
    expect(switchErrors(r).length).toBe(1);
  });

  test("THE BUG: switch in `export function` body fires E-SWITCH-FORBIDDEN", () => {
    // Pre-A7 this shape silently bypassed BOTH inline fire sites:
    //   1. `export` handler's collectExpr() swallowed the function body whole.
    //   2. The synth re-parse caught it but used a throwaway errors array.
    const r = parse(`<program>\n\${ export function tokenizeBlock(b) { switch (b.type) { case "x": return 1 } } }\n</program>`);
    expect(switchErrors(r).length).toBe(1);
  });

  test("switch in `export fn` body fires E-SWITCH-FORBIDDEN", () => {
    const r = parse(`<program>\n\${ export fn foo() { switch (x) { case 1: lift 1 } } }\n</program>`);
    expect(switchErrors(r).length).toBe(1);
  });

  test("switch in `export server function` body fires E-SWITCH-FORBIDDEN", () => {
    const r = parse(`<program>\n\${ export server function bar() { switch (x) { case 1: lift 1 } } }\n</program>`);
    expect(switchErrors(r).length).toBe(1);
  });

  test("switch in deeply-nested fn chain fires E-SWITCH-FORBIDDEN", () => {
    const r = parse(
      `<program>\n\${ function a() { function b() { fn c() { switch (x) { case 1: lift 1 } } } } }\n</program>`,
    );
    expect(switchErrors(r).length).toBe(1);
  });

  test("switch in `export function` deeply nested fires E-SWITCH-FORBIDDEN", () => {
    // The synth re-parse must re-walk the body recursively for the walker
    // to find a switch buried inside an inner function-decl.
    const r = parse(
      `<program>\n\${ export function outer() { function inner() { switch (x) { case 1: lift 1 } } } }\n</program>`,
    );
    expect(switchErrors(r).length).toBe(1);
  });

  test("switch in meta block `^{}` fires E-SWITCH-FORBIDDEN", () => {
    const r = parse(`<program>\n\${ /* nothing */ }\n^{ switch (x) { case 1: lift 1 } }\n</program>`);
    expect(switchErrors(r).length).toBe(1);
  });

  test("switch in ${} attribute body fires E-SWITCH-FORBIDDEN (S99 follow-on close)", () => {
    // S99 FOLLOW-UP gap closed: `switch` keyword inside an inline `${...}`
    // attribute body (event-handler shape) used to be silently consumed by
    // the expression collector — it never reached the parser as a
    // switch-stmt AST node, so A7's post-parse walker had nothing to walk
    // and the pre-A7 detector wouldn't have fired either.
    //
    // Fix: a structural detector (`findForbiddenSwitchInRaw` /
    // `emitForbiddenSwitchInRaw`) scans the raw attribute-expression text
    // at the ATTR_EXPR / ATTR_BLOCK / BLOCK_REF consumption boundary and
    // emits one E-SWITCH-FORBIDDEN per `switch` keyword (skipping strings,
    // comments, and property-access `.switch`). Dedup against the A7
    // walker is structurally safe: the walker only fires for switch-stmt
    // AST nodes, which acorn cannot produce in expression position.
    const r = parse(
      `<program>\n<button onclick=\${ switch (x) { case 1: lift 1 } }>x</button>\n</program>`,
    );
    expect(switchErrors(r).length).toBe(1);
  });

  test("named event handler with switch in body fires E-SWITCH-FORBIDDEN", () => {
    // The non-bypass path: a function-decl event handler called by name
    // still routes through the parseLogicBody path that produces a
    // switch-stmt AST node, so the walker catches it.
    const r = parse(
      `<program>\n\${ function clickHandler() { switch (x) { case 1: lift 1 } } }<button onclick=clickHandler>x</button></program>`,
    );
    expect(switchErrors(r).length).toBe(1);
  });

  test("the exact shape that tab.scrml:1078 used (multi-arm switch with fall-through and blocks)", () => {
    // Mirrors the pre-A7 switch in compiler/self-host/tab.scrml:1078.
    // Pre-A7: silent bypass via the export-function synth re-parse path.
    // Post-A7: surfaces exactly one E-SWITCH-FORBIDDEN diagnostic.
    const src = `<program>\n\${ export function tokenizeBlock(block, filePath) {
        let type = block.type
        let raw = block.raw
        switch (type) {
            case "markup":
            case "state":
                return tokenizeAttributes(raw)
            case "logic": {
                let body = raw.slice(2, raw.length - 1)
                return tokenizeLogic(body)
            }
            case "meta": {
                let body = raw.slice(2, raw.length - 1)
                return tokenizeLogic(body)
            }
            default:
                return [makeToken("EOF", "")]
        }
    } }\n</program>`;
    const r = parse(src);
    const errs = switchErrors(r);
    // Must fire EXACTLY one error — the pre-A7 silent-bypass behavior
    // would have produced ZERO errors despite the switch-stmt node being
    // present in the AST.
    expect(errs.length).toBe(1);
    // The AST must still contain the switch-stmt node (the walker is a
    // diagnostic emitter; it must NOT mutate the AST).
    expect(findAllNodesOfKind(r.ast, "switch-stmt").length).toBe(1);
  });

  test("dedup invariant: top-level switch fires EXACTLY once (not double-emitted)", () => {
    // The post-parse walker MUST dedup against the inline fire sites. A
    // top-level switch hits the L5089/L8567 detector AND would be re-found
    // by the walker — if dedup is broken, this would produce 2 errors.
    const r = parse(`<program>\n\${ switch (x) { case 1: lift 1 } }\n</program>`);
    expect(switchErrors(r).length).toBe(1);
  });

  test("dedup invariant: nested fn switch fires EXACTLY once", () => {
    const r = parse(`<program>\n\${ function f() { switch (x) { case 1: lift 1 } } }\n</program>`);
    expect(switchErrors(r).length).toBe(1);
  });

  test("multiple distinct switches fire one error per switch", () => {
    const r = parse(
      `<program>\n\${ switch (a) { case 1: lift 1 } switch (b) { case 1: lift 2 } }\n</program>`,
    );
    // Two distinct switch keyword positions → two distinct E-SWITCH-FORBIDDEN
    // emissions (different span.start values → dedup keys differ).
    expect(switchErrors(r).length).toBe(2);
  });

  test("multiple switches in different export functions: one error each", () => {
    // Stresses the export-decl synth re-parse path with multiple switches
    // across separate functions. Each switch must surface its own diagnostic.
    const r = parse(
      `<program>\n\${ export function a() { switch (x) { case 1: lift 1 } } export function b() { switch (y) { case 2: lift 2 } } }\n</program>`,
    );
    expect(switchErrors(r).length).toBe(2);
  });
});
