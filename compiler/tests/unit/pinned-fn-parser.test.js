// pinned-fn parser-recognition tests (S105, SPEC §48.6.4)
//
// SPEC §48.6.4 (S98, 2026-05-17) introduced `pinned fn name() { ... }` as the
// opt-out-of-hoisting form. Parser-recognition is the S105 dispatch:
// `pinned` IDENT-prefix is recognized at BOTH fn-decl sites (top-level inside
// `${...}` and nested inside an outer fn body); the AST sets `isPinned: true`
// on the FunctionDeclNode. Downstream symbol-table forward-ref enforcement
// (E-STATE-PINNED-FORWARD-REF on calls to pinned-fn before decl) is a
// separate follow-on dispatch.
//
// `pinned` is the OUTERMOST modifier — must precede `async`/`pure`/`server`.

import { test, expect, describe } from "bun:test";
import { buildAST } from "../../src/ast-builder.js";
import { splitBlocks } from "../../src/block-splitter.js";

function parse(src) {
  const bs = splitBlocks("test.scrml", src);
  const { ast } = buildAST(bs);
  return ast;
}

function findFnDecl(ast, name) {
  const all = [];
  const walk = (n) => {
    if (!n) return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (typeof n !== "object") return;
    if (n.kind === "function-decl" && n.name === name) all.push(n);
    for (const k in n) walk(n[k]);
  };
  walk(ast);
  return all[0] || null;
}

describe("§48.6.4 pinned fn — parser recognition", () => {
  test("§48.6.4.1: bare `pinned fn` at top of logic block", () => {
    const src = `<program>\${ pinned fn helper() { return 1 } }</program>`;
    const ast = parse(src);
    const decl = findFnDecl(ast, "helper");
    expect(decl).not.toBeNull();
    expect(decl.kind).toBe("function-decl");
    expect(decl.fnKind).toBe("fn");
    expect(decl.isPinned).toBe(true);
    expect(decl.isAsync).toBeUndefined();
    expect(decl.isPure).toBeUndefined();
    expect(decl.isServer).toBe(false);
  });

  test("§48.6.4.2: `pinned async fn` — pinned + async flags both set (parser; semantics later)", () => {
    // Note: §13.1 forbids `async fn` semantically (E-FN-005 fires at TS stage).
    // Parser must STILL recognize the form so the semantic check downstream is
    // the one that surfaces the rule, not a parse failure.
    const src = `<program>\${ pinned async fn helper() { return 1 } }</program>`;
    const ast = parse(src);
    const decl = findFnDecl(ast, "helper");
    expect(decl).not.toBeNull();
    expect(decl.isPinned).toBe(true);
    expect(decl.isAsync).toBe(true);
    expect(decl.isServer).toBe(false);
  });

  test("§48.6.4.3: `pinned pure fn` — pinned + pure flags both set (W-PURE-DEPRECATED fires elsewhere)", () => {
    const src = `<program>\${ pinned pure fn double(x) { return x * 2 } }</program>`;
    const ast = parse(src);
    const decl = findFnDecl(ast, "double");
    expect(decl).not.toBeNull();
    expect(decl.isPinned).toBe(true);
    expect(decl.isPure).toBe(true);
    expect(decl.isServer).toBe(false);
  });

  test("§48.6.4.4: `pinned server fn` — pinned + server flags both set", () => {
    const src = `<program>\${ pinned server fn handler() { return 42 } }</program>`;
    const ast = parse(src);
    const decl = findFnDecl(ast, "handler");
    expect(decl).not.toBeNull();
    expect(decl.isPinned).toBe(true);
    expect(decl.isServer).toBe(true);
    expect(decl.isAsync).toBeUndefined();
    expect(decl.isPure).toBeUndefined();
  });

  test("§48.6.4.5: `pinned async server fn` — all three flags set", () => {
    const src = `<program>\${ pinned async server fn handler() { return 0 } }</program>`;
    const ast = parse(src);
    const decl = findFnDecl(ast, "handler");
    expect(decl).not.toBeNull();
    expect(decl.isPinned).toBe(true);
    expect(decl.isAsync).toBe(true);
    expect(decl.isServer).toBe(true);
  });

  test("§48.6.4.6: `pinned pure server fn` — all three flags set", () => {
    const src = `<program>\${ pinned pure server fn handler() { return 0 } }</program>`;
    const ast = parse(src);
    const decl = findFnDecl(ast, "handler");
    expect(decl).not.toBeNull();
    expect(decl.isPinned).toBe(true);
    expect(decl.isPure).toBe(true);
    expect(decl.isServer).toBe(true);
  });

  test("§48.6.4.7: `pinned fn` nested inside outer fn body", () => {
    const src = `<program>\${
      fn outer() {
        pinned fn inner() { return 1 }
        return inner()
      }
    }</program>`;
    const ast = parse(src);
    const inner = findFnDecl(ast, "inner");
    expect(inner).not.toBeNull();
    expect(inner.isPinned).toBe(true);
    expect(inner.fnKind).toBe("fn");
    const outer = findFnDecl(ast, "outer");
    expect(outer).not.toBeNull();
    expect(outer.isPinned).toBeUndefined();
  });

  test("§48.6.4.8: `pinned async fn` nested inside outer fn body", () => {
    const src = `<program>\${
      fn outer() {
        pinned async fn inner() { return 1 }
        return inner()
      }
    }</program>`;
    const ast = parse(src);
    const inner = findFnDecl(ast, "inner");
    expect(inner).not.toBeNull();
    expect(inner.isPinned).toBe(true);
    expect(inner.isAsync).toBe(true);
  });

  test("§48.6.4.9: plain `fn` (no `pinned` prefix) does NOT set isPinned (regression baseline)", () => {
    const src = `<program>\${ fn helper() { return 1 } }</program>`;
    const ast = parse(src);
    const decl = findFnDecl(ast, "helper");
    expect(decl).not.toBeNull();
    expect(decl.isPinned).toBeUndefined();
  });

  test("§48.6.4.10: `async fn` (no pinned) does NOT set isPinned (regression baseline)", () => {
    const src = `<program>\${ async fn helper() { return 1 } }</program>`;
    const ast = parse(src);
    const decl = findFnDecl(ast, "helper");
    expect(decl).not.toBeNull();
    expect(decl.isPinned).toBeUndefined();
    expect(decl.isAsync).toBe(true);
  });

  test("§48.6.4.11: `server fn` (no pinned) does NOT set isPinned (regression baseline)", () => {
    const src = `<program>\${ server fn handler() { return 42 } }</program>`;
    const ast = parse(src);
    const decl = findFnDecl(ast, "handler");
    expect(decl).not.toBeNull();
    expect(decl.isPinned).toBeUndefined();
    expect(decl.isServer).toBe(true);
  });

  test("§48.6.4.12: `let pinned = true` parses as let-decl (regression — `pinned` IDENT not stolen)", () => {
    const src = `<program>\${ let pinned = true }</program>`;
    const ast = parse(src);
    // Must NOT have parsed as function-decl named "pinned" or similar.
    const fnPinned = findFnDecl(ast, "pinned");
    expect(fnPinned).toBeNull();
  });

  test("§48.6.4.13: bare `pinned` IDENT followed by non-fn does NOT trigger fn-decl path", () => {
    // `pinned` followed by `=`, `(`, member access, etc. is an ordinary ident expression.
    // Construction guarantees fn-decl only fires when `pinned` IS the leading prefix
    // AND the token sequence after `pinned` matches a valid fn-decl pattern.
    const src = `<program>\${ const x = pinned }</program>`;
    const ast = parse(src);
    // No function-decl should be emitted.
    const fnPinned = findFnDecl(ast, "pinned");
    expect(fnPinned).toBeNull();
  });

  test("§48.6.4.14: span integrity — `pinned fn` span includes `pinned` keyword", () => {
    const src = `<program>\${ pinned fn helper() { return 1 } }</program>`;
    const ast = parse(src);
    const decl = findFnDecl(ast, "helper");
    expect(decl).not.toBeNull();
    expect(decl.span).toBeTruthy();
    expect(typeof decl.span.start).toBe("number");
    // Span start should be at-or-before the `pinned` keyword in the source.
    const pinnedIdx = src.indexOf("pinned");
    expect(decl.span.start).toBeLessThanOrEqual(pinnedIdx);
  });

  test("§48.6.4.15: `pinned function` (full keyword) NOT recognized as pinned-form (only `fn`)", () => {
    // SPEC §48.6.4 spec'd `pinned fn` only; `pinned function` is not normative.
    // Should NOT set isPinned on a `function`-keyword decl.
    const src = `<program>\${ pinned function helper() { return 1 } }</program>`;
    const ast = parse(src);
    // The parser may handle this as a parse-error OR as a bare-expr `pinned` followed
    // by a function-decl; either way, isPinned MUST NOT be set on the function-decl
    // (which carries fnKind === "function", not "fn").
    const decl = findFnDecl(ast, "helper");
    if (decl) {
      expect(decl.isPinned).toBeUndefined();
    }
    // No assertion on whether parse fails; pa.md Rule 4 — only `pinned fn` is spec'd.
  });

  test("§48.6.4.16: multiple pinned fns at top level — each gets its own isPinned flag", () => {
    const src = `<program>\${
      pinned fn alpha() { return 1 }
      pinned fn beta() { return 2 }
      fn gamma() { return 3 }
    }</program>`;
    const ast = parse(src);
    const a = findFnDecl(ast, "alpha");
    const b = findFnDecl(ast, "beta");
    const c = findFnDecl(ast, "gamma");
    expect(a?.isPinned).toBe(true);
    expect(b?.isPinned).toBe(true);
    expect(c?.isPinned).toBeUndefined();
  });
});
