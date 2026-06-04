// native-match-arm-same-line.test.js — F3 swap-family conformance.
//
// The native expression parser (compiler/native-parser/parse-expr.js) could
// parse NEWLINE-separated match arms but NOT SAME-LINE space-separated arms:
//
//   const phase = match @phase { .Idle => "idle" .Busy => "busy" }
//
// fired E-EXPR-MATCH-PATTERN + an E-EXPR-UNCLOSED-BRACE cascade because the
// arm-body parser greedy-consumed the next arm's `.Variant` pattern as member
// access on the prior body. The legacy BS+Acorn path parses same-line arms
// fine. F3 (change-id native-match-arm-same-line-2026-06-04) extended
// `isAtArmBoundary` to terminate an arm body at a SAME-LINE next-arm pattern
// too (it previously required a NEWLINE). The disambiguation is the existing
// arrow-anchored `peekStartsArmPattern` predicate — a lowercase `.field`
// member-access continuation has no following arm-arrow, so it is NOT a
// boundary; an uppercase `.Variant => ...` IS.
//
// Same-line and newline arms build the SAME match AST (spans aside) and so
// emit identical JS — these tests assert structural AST parity between the
// two forms plus zero parse errors on the same-line form, and that the
// member-access / nested-match / object-literal / payload-binding controls
// do NOT regress.

import { describe, test, expect } from "bun:test";

import { lex as scrmlNativeLex } from "../native-parser/lex.js";
import { parseExpr as scrmlNativeParseExpr } from "../native-parser/parse-expr.js";

// --- helpers -----------------------------------------------------------------

function parse(src) {
    return scrmlNativeParseExpr(scrmlNativeLex(src));
}

// Find the first Match node anywhere in the AST (the expression may wrap it).
function findMatch(node, depth = 0) {
    if (node === null || node === undefined || typeof node !== "object" || depth > 10) {
        return null;
    }
    if (node.kind === "Match") {
        return node;
    }
    for (const key of Object.keys(node)) {
        const value = node[key];
        if (Array.isArray(value)) {
            for (const item of value) {
                const found = findMatch(item, depth + 1);
                if (found !== null) return found;
            }
        } else if (value !== null && typeof value === "object") {
            const found = findMatch(value, depth + 1);
            if (found !== null) return found;
        }
    }
    return null;
}

// Strip every `span` field so two ASTs built from differently-offset source
// (same-line vs newline) compare structurally.
function stripSpans(node) {
    if (Array.isArray(node)) {
        return node.map(stripSpans);
    }
    if (node !== null && typeof node === "object") {
        const out = {};
        for (const key of Object.keys(node)) {
            if (key === "span") continue;
            out[key] = stripSpans(node[key]);
        }
        return out;
    }
    return node;
}

function structurallyEqual(srcA, srcB) {
    const a = stripSpans(parse(srcA).ast);
    const b = stripSpans(parse(srcB).ast);
    return JSON.stringify(a) === JSON.stringify(b);
}

// --- same-line arms now parse (was the F3 failure) ---------------------------

describe("F3 — same-line match arms parse without error", () => {
    test("same-line `=>` arms parse to a 2-arm Match, no errors", () => {
        const { ast, errors } = parse('match @phase { .Idle => "idle" .Busy => "busy" }');
        expect(errors.length).toBe(0);
        const m = findMatch(ast);
        expect(m).not.toBe(null);
        expect(m.arms.length).toBe(2);
    });

    test("same-line `:>` colon-arrow arms parse to a 2-arm Match, no errors", () => {
        const { ast, errors } = parse('match @phase { .Idle :> "idle" .Busy :> "busy" }');
        expect(errors.length).toBe(0);
        const m = findMatch(ast);
        expect(m.arms.length).toBe(2);
    });

    test("same-line `->` legacy-arrow arms parse to a 2-arm Match, no errors", () => {
        const { ast, errors } = parse('match @phase { .Idle -> "idle" .Busy -> "busy" }');
        expect(errors.length).toBe(0);
        const m = findMatch(ast);
        expect(m.arms.length).toBe(2);
    });

    test("three same-line arms parse to a 3-arm Match", () => {
        const { ast, errors } = parse('match @s { .A => 1 .B => 2 .C => 3 }');
        expect(errors.length).toBe(0);
        const m = findMatch(ast);
        expect(m.arms.length).toBe(3);
    });

    test("same-line `else` / `_` wildcard arms parse", () => {
        const elseR = parse('match @p { .A => 1 else => 2 }');
        expect(elseR.errors.length).toBe(0);
        expect(findMatch(elseR.ast).arms.length).toBe(2);

        const wildR = parse('match @p { .A => 1 _ => 2 }');
        expect(wildR.errors.length).toBe(0);
        expect(findMatch(wildR.ast).arms.length).toBe(2);
    });

    test("same-line qualified-variant arms parse", () => {
        const { ast, errors } = parse('match @p { Color.Red => 1 Color.Blue => 2 }');
        expect(errors.length).toBe(0);
        expect(findMatch(ast).arms.length).toBe(2);
    });

    test("same-line payload-binding arms parse", () => {
        const { ast, errors } = parse('match @p { .Ok(v) => v .Err(e) => 0 }');
        expect(errors.length).toBe(0);
        expect(findMatch(ast).arms.length).toBe(2);
    });

    // NOTE: is-pattern arms (`is .Ok => 1`) are a SEPARATE pre-existing native
    // gap — they fail in BOTH same-line AND newline form (orthogonal to F3,
    // which only governs the arm-BOUNDARY). F3's contract for is-pattern is
    // PARITY: same-line behaves identically to newline. Asserted below.
    test("same-line is-pattern arms behave identically to the newline form (parity)", () => {
        const sameLine = parse('match @p { is .Ok => 1 is .Err => 2 }');
        const newline = parse('match @p {\n  is .Ok => 1\n  is .Err => 2\n}');
        expect(sameLine.errors.map((e) => e.code)).toEqual(newline.errors.map((e) => e.code));
    });
});

// --- AST parity: same-line === newline (spans aside) -------------------------
// Byte-identical AST => identical downstream codegen / emitted JS.

describe("F3 — same-line AST is structurally identical to the newline form", () => {
    test("`=>` string bodies", () => {
        expect(structurallyEqual(
            'match @phase { .Idle => "idle" .Busy => "busy" }',
            'match @phase {\n  .Idle => "idle"\n  .Busy => "busy"\n}',
        )).toBe(true);
    });

    test("`:>` string bodies", () => {
        expect(structurallyEqual(
            'match @phase { .Idle :> "idle" .Busy :> "busy" }',
            'match @phase {\n  .Idle :> "idle"\n  .Busy :> "busy"\n}',
        )).toBe(true);
    });

    test("member-access bodies", () => {
        expect(structurallyEqual(
            'match @p { .A => obj.field .B => other.x }',
            'match @p {\n  .A => obj.field\n  .B => other.x\n}',
        )).toBe(true);
    });

    test("payload bindings", () => {
        expect(structurallyEqual(
            'match @p { .Ok(v) => v .Err(e) => 0 }',
            'match @p {\n  .Ok(v) => v\n  .Err(e) => 0\n}',
        )).toBe(true);
    });

    test("nested match in arm body", () => {
        expect(structurallyEqual(
            'match @p { .A => match @q { .X => 1 .Y => 2 } .B => 3 }',
            'match @p {\n  .A => match @q {\n    .X => 1\n    .Y => 2\n  }\n  .B => 3\n}',
        )).toBe(true);
    });
});

// --- controls: the disambiguation must NOT mis-classify continuations --------

describe("F3 — disambiguation controls (no over-stopping, no regression)", () => {
    test("member-access body `.A => obj.field .B => other.x` keeps full member bodies", () => {
        const { ast, errors } = parse('match @p { .A => obj.field .B => other.x }');
        expect(errors.length).toBe(0);
        const m = findMatch(ast);
        expect(m.arms.length).toBe(2);
        // each arm body is a Member (obj.field / other.x), NOT truncated to a bare ident
        expect(m.arms[0].body.kind).toBe("Member");
        expect(m.arms[1].body.kind).toBe("Member");
    });

    test("uppercase member body `obj.Field` is NOT split as a boundary", () => {
        const { ast, errors } = parse('match @p { .A => obj.Field .B => 2 }');
        expect(errors.length).toBe(0);
        const m = findMatch(ast);
        expect(m.arms.length).toBe(2);
        expect(m.arms[0].body.kind).toBe("Member");
    });

    test("object-literal-shaped arm body does not leak into the next arm", () => {
        const { ast, errors } = parse('match @p { .A => { x: 1 } .B => 2 }');
        expect(errors.length).toBe(0);
        const m = findMatch(ast);
        expect(m.arms.length).toBe(2);
    });

    test("nested same-line match in an arm body parses both inner and outer", () => {
        const { ast, errors } = parse('match @p { .A => match @q { .X => 1 .Y => 2 } .B => 3 }');
        expect(errors.length).toBe(0);
        const outer = findMatch(ast);
        expect(outer.arms.length).toBe(2);
        const inner = outer.arms[0].body;
        expect(inner.kind).toBe("Match");
        expect(inner.arms.length).toBe(2);
    });

    test("call-expression arm body does not leak into the next arm", () => {
        const { ast, errors } = parse('match @p { .A => foo(1) .B => 2 }');
        expect(errors.length).toBe(0);
        expect(findMatch(ast).arms.length).toBe(2);
    });

    test("ternary arm body does not leak into the next arm", () => {
        const { ast, errors } = parse('match @p { .A => x ? 1 : 2 .B => 3 }');
        expect(errors.length).toBe(0);
        expect(findMatch(ast).arms.length).toBe(2);
    });
});

// --- newline control: the original form is unchanged -------------------------

describe("F3 — newline-separated arms remain correct (no regression)", () => {
    test("newline arms still parse to a 2-arm Match", () => {
        const { ast, errors } = parse('match @phase {\n  .Idle => "idle"\n  .Busy => "busy"\n}');
        expect(errors.length).toBe(0);
        expect(findMatch(ast).arms.length).toBe(2);
    });

    test("newline member-access bodies stay full members", () => {
        const { ast, errors } = parse('match @p {\n  .A => obj.field\n  .B => other.x\n}');
        expect(errors.length).toBe(0);
        const m = findMatch(ast);
        expect(m.arms[0].body.kind).toBe("Member");
        expect(m.arms[1].body.kind).toBe("Member");
    });
});
