/**
 * v0.3 Wave 2 item (b) — synthetic v0.3-shape smoke test
 *
 * Demonstrates that:
 *   - <program> body in default-logic mode accepts bare top-level
 *     declarations (function, let, type) without explicit ${...} wrapping.
 *   - <page> body symmetrically accepts the same declaration shapes.
 *   - The full pipeline (BS -> TAB) succeeds without fatal errors.
 *
 * This is the "small synthetic v0.3-shape fixture" required by brief §7
 * compile-check #5.
 */

import { describe, test, expect } from "bun:test";
import { splitBlocks } from "../../src/block-splitter.js";
import { buildAST } from "../../src/ast-builder.js";

describe("v0.3 W2b smoke — synthetic v0.3-shape fixtures", () => {
  test("v0.3 entry file: <program> with default-logic body decls", () => {
    // Canonical v0.3 entry-file shape. Bare top-level declarations auto-lift.
    // No explicit ${...} wrappers needed for these forms.
    const src = [
      "<program title=\"Counter\">",
      "  let initial = 0",
      "  function double(x) { return x * 2 }",
      "  type Direction:enum = { Up, Down }",
      "  <div class=\"counter\">",
      "    <span>${initial}</span>",
      "  </div>",
      "</program>",
    ].join("\n");
    const bs = splitBlocks("test.scrml", src);
    expect(bs.errors || []).toEqual([]);
    const { ast, errors } = buildAST(bs);
    const fatal = (errors || []).filter(e => e?.severity !== "warning" && e?.code !== "W-PROGRAM-001");
    expect(fatal).toEqual([]);
    // Confirm the AST captured all three decls.
    const seen = { let: false, fn: false, type: false };
    function walk(n) {
      if (!n || typeof n !== "object") return;
      if (Array.isArray(n)) { n.forEach(walk); return; }
      if (n.kind === "let-decl" && n.name === "initial") seen.let = true;
      if (n.kind === "function-decl" && n.name === "double") seen.fn = true;
      if (n.kind === "type-decl" && n.name === "Direction") seen.type = true;
      if (Array.isArray(n.children)) walk(n.children);
      if (Array.isArray(n.body)) walk(n.body);
      if (Array.isArray(n.nodes)) walk(n.nodes);
    }
    walk(ast);
    expect(seen).toEqual({ let: true, fn: true, type: true });
  });

  test("v0.3 route file: bare <page> with per-route attrs + default-logic body", () => {
    // Canonical v0.3 route-file shape. <page> opener carries per-route attrs;
    // body parses in default-logic mode.
    const src = [
      "<page auth=\"required\" ratelimit=\"100/min\">",
      "  function getCurrentUser() { return { name: \"alice\" } }",
      "  type Status:enum = { Idle, Loading, Done }",
      "  <div class=\"page\">page body</div>",
      "</page>",
    ].join("\n");
    const bs = splitBlocks("test.scrml", src);
    expect(bs.errors || []).toEqual([]);
    const { ast, errors } = buildAST(bs);
    // <page> at file top fires W-PROGRAM-001 (no <program> root) — expected,
    // route files don't carry <program>. Filter that out.
    const fatal = (errors || []).filter(e => e?.severity !== "warning" && e?.code !== "W-PROGRAM-001");
    expect(fatal).toEqual([]);

    // <page> attr validation passes for {auth, ratelimit}.
    const pageHits = (errors || []).filter(e =>
      e?.code === "E-PAGE-INVALID-ATTR" || e?.code === "E-PAGE-ROUTE-ATTR-FORBIDDEN"
    );
    expect(pageHits).toEqual([]);
  });

  test("v0.3 nested <program><page><page>: multi-page app shape", () => {
    // Per SPEC §40.8 worked example shape — multi-page app with <page>
    // siblings inside <program>.
    const src = [
      "<program title=\"My App\" db=\"./app.db\">",
      "  <page auth=\"required\">",
      "    function getLoads() { return [] }",
      "    <div>route 1</div>",
      "  </page>",
      "</program>",
    ].join("\n");
    const bs = splitBlocks("test.scrml", src);
    expect(bs.errors || []).toEqual([]);
    const { errors } = buildAST(bs);
    const fatal = (errors || []).filter(e => e?.severity !== "warning");
    expect(fatal).toEqual([]);
  });
});
