// m6-2a-markupvalue-bridge-source-aware.test.js — M6.2a integration smoke.
//
// The M6.2 STOP-doc (commit a30c2b17) identified that `makeLiftExpr` left a
// raw native `MarkupValue` inside `lift-expr.expr.node`. Downstream consumers
// (component-expander, name-resolver, dependency-graph, codegen) read
// `expr.node.tag` / `.attrs` / `.children` / `.isComponent` — all undefined
// on a raw native MarkupValue.
//
// M6.2a's fix: `translateMarkupValueToLiveNode` in translate-stmt.js. This
// suite drives the SOURCE-AVAILABLE path — `nativeParseFile` runs the full
// pipeline, the JS-host parseMarkupValue captures the markup-as-value with
// `ctx.source` set, and the resulting MarkupValue carries the parsed
// Markup-block array (not the token-range fallback). The bridge then
// converts the embedded Markup block into a live MarkupNode-shaped object.
//
// These tests assert:
//   1. The lift-expr's `expr.node` carries `kind:"markup"`, `tag:<string>`,
//      `isComponent:<bool>` — the LIVE MarkupNode shape downstream consumers
//      expect.
//   2. Recursion descends into nested Markup children — a `lift <wrapper>
//      <Inner/></wrapper>` puts a live MarkupNode for `Inner` inside the
//      wrapper's `children` array.
//   3. The bridge does NOT regress non-MarkupValue lift targets (the
//      `expr.kind === "expr"` branch).

import { describe, test, expect } from "bun:test";
import { nativeParseFile } from "../../native-parser/parse-file.js";

function findLiftExpr(nodes) {
    for (const n of nodes) {
        if (!n) continue;
        if (n.kind === "logic" && Array.isArray(n.body)) {
            const found = n.body.find(s => s && s.kind === "lift-expr");
            if (found) return found;
        }
        if (Array.isArray(n.children)) {
            const found = findLiftExpr(n.children);
            if (found) return found;
        }
    }
    return null;
}

describe("M6.2a — translateMarkupValueToLiveNode source-available path", () => {
    test("`lift <TaskCard/>` in a logic body produces a live MarkupNode on expr.node — tag/isComponent set", () => {
        const src = "<program>${ lift <TaskCard/>; }</program>";
        const result = nativeParseFile("/m6-2a/t.scrml", src);
        const lift = findLiftExpr(result.ast.nodes);
        expect(lift).not.toBeNull();
        expect(lift.kind).toBe("lift-expr");
        expect(lift.expr.kind).toBe("markup");
        // Pre-M6.2a: lift.expr.node.kind would be "MarkupValue" (raw native).
        // Post-M6.2a: live "markup" with tag/isComponent populated.
        expect(lift.expr.node).not.toBeNull();
        expect(lift.expr.node.kind).toBe("markup");
        expect(lift.expr.node.tag).toBe("TaskCard");
        expect(lift.expr.node.isComponent).toBe(true);
        expect(Array.isArray(lift.expr.node.attrs)).toBe(true);
        expect(Array.isArray(lift.expr.node.children)).toBe(true);
    });

    test("`lift <section>...</section>` lowercase tag → isComponent=false", () => {
        const src = "<program>${ lift <section>hello</section>; }</program>";
        const result = nativeParseFile("/m6-2a/t.scrml", src);
        const lift = findLiftExpr(result.ast.nodes);
        expect(lift).not.toBeNull();
        expect(lift.expr.node.kind).toBe("markup");
        expect(lift.expr.node.tag).toBe("section");
        expect(lift.expr.node.isComponent).toBe(false);
    });

    test("`lift <wrapper><Inner/></wrapper>` recurses — child Markup becomes a live MarkupNode", () => {
        const src = "<program>${ lift <wrapper><Inner/></wrapper>; }</program>";
        const result = nativeParseFile("/m6-2a/t.scrml", src);
        const lift = findLiftExpr(result.ast.nodes);
        expect(lift).not.toBeNull();
        expect(lift.expr.node.kind).toBe("markup");
        expect(lift.expr.node.tag).toBe("wrapper");
        // Find the live MarkupNode child — must NOT be a raw native Markup
        // block (kind:"Markup" PascalCase with `name`, not `tag`).
        const liveChildMarkup = (lift.expr.node.children || []).find(c =>
            c && c.kind === "markup" && c.tag === "Inner"
        );
        expect(liveChildMarkup).toBeDefined();
        expect(liveChildMarkup.isComponent).toBe(true);
        // Negative: there must NOT be a raw native Markup block (PascalCase
        // kind) leaking through.
        const leakedRawNative = (lift.expr.node.children || []).find(c =>
            c && c.kind === "Markup"
        );
        expect(leakedRawNative).toBeUndefined();
    });

    test("non-MarkupValue lift targets continue to use the expr branch (no regression)", () => {
        const src = "<program>${ lift value; }</program>";
        const result = nativeParseFile("/m6-2a/t.scrml", src);
        const lift = findLiftExpr(result.ast.nodes);
        expect(lift).not.toBeNull();
        expect(lift.expr.kind).toBe("expr");
        expect(lift.expr.node).toBeUndefined();
    });

    test("ids are stamped from the shared idGen — no id 0 in the converted MarkupNode tree", () => {
        const src = "<program>${ lift <Outer><Inner/></Outer>; }</program>";
        const result = nativeParseFile("/m6-2a/t.scrml", src);
        const lift = findLiftExpr(result.ast.nodes);
        expect(lift).not.toBeNull();
        expect(lift.expr.node.id).toBeGreaterThan(0);
        const inner = (lift.expr.node.children || []).find(c => c && c.kind === "markup");
        if (inner) {
            expect(inner.id).toBeGreaterThan(0);
            // No two synthesized nodes share an id (the shared idGen
            // discipline — parse-file.js:66-73).
            expect(inner.id).not.toBe(lift.expr.node.id);
        }
    });
});
