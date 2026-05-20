// parser-conformance-expr.test.js — expression-parser conformance suite (M2.1).
//
// Per scrml-native-parser-design-2026-05-17.md §D6 + §D7 M2 gating:
//   "Conformance Tier 1+2 PASS on the expression subset ... Tier 1 — node-kind
//    sequence ... Tier 2 — identifier / literal values."
//
// Scope (M2.1 — the first sub-step of M2): PRIMARY EXPRESSIONS. The native
// expression parser (compiler/native-parser/parse-expr.js) parses one primary
// expression at the head of M1's lex(source) token stream. This test runs a
// primary-expression micro-corpus through both the native parser and Acorn
// (the conformance ORACLE per §D6 — never the design template) and asserts:
//
//   Tier 1 — the node-kind SEQUENCE produced by a tree walk matches.
//   Tier 2 — identifier names + literal values at corresponding positions
//            match.
//
// Operators (M2.2), call/member/arrow (M2.3), and scrml-extension expression
// forms (M2.4) are LATER sub-steps — the corpus here is bounded to primary
// expressions. The scrml-extension primaries the native parser DOES emit at
// M2.1 (@-cells, bare variants) have no Acorn equivalent (DD §D6 documented
// divergence) — those are exercised natively-only in the dedicated
// describe-block at the bottom, not diffed against Acorn.
//
// This file MIRRORS parser-conformance-lexer.test.js's structure. It does NOT
// modify scrmlNativeParserStub in parser-conformance/parsers.js — the full
// stub wire-in is M2.3/M2.4 (when the expression parser is complete).

import { describe, test, expect } from "bun:test";
import * as acorn from "acorn";

import { lex as scrmlNativeLex } from "../native-parser/lex.js";
import { parseExpr as scrmlNativeParseExpr } from "../native-parser/parse-expr.js";
import { ExprKind, ArrayElementKind, ObjectPropertyKind } from "../native-parser/ast-expr.js";

const ACORN_OPTS = {
    ecmaVersion: 2025,
    sourceType:  "module",
};

// -----------------------------------------------------------------------------
// nativeToEstree — normalize a native Expr node into an ESTree-shaped node so
// the Tier-1 node-kind walk + Tier-2 value extraction compare apples-to-apples
// against Acorn's ESTree output.
//
// Mapping (DD §D3 — the native Expr enum is intentionally more typed than
// ESTree's `type: string` discriminator; this normalizer projects native →
// ESTree for the conformance diff only):
//   Ident       -> Identifier
//   NumberLit   -> Literal
//   StringLit   -> Literal
//   BoolLit     -> Literal
//   RegexLit    -> Literal (with a `regex` sub-object, per Acorn)
//   TemplateLit -> TemplateLiteral (+ TemplateElement quasis)
//   Array       -> ArrayExpression  (Hole -> null slot; Spread -> SpreadElement)
//   Object      -> ObjectExpression (KeyValue/Shorthand -> Property;
//                                    Spread -> SpreadElement)
//   Paren       -> UNWRAPPED (Acorn produces no paren node)
//   AtCell      -> ScrmlAtCell      (no ESTree equivalent — native-only)
//   BareVariant -> ScrmlBareVariant (no ESTree equivalent — native-only)
// -----------------------------------------------------------------------------
function nativeToEstree(node) {
    if (node === undefined || node === null) return null;

    if (node.kind === ExprKind.Ident) {
        return { type: "Identifier", name: node.name };
    }
    if (node.kind === ExprKind.NumberLit) {
        return { type: "Literal", value: node.value, raw: node.raw };
    }
    if (node.kind === ExprKind.StringLit) {
        return { type: "Literal", value: node.value, raw: node.raw };
    }
    if (node.kind === ExprKind.BoolLit) {
        return { type: "Literal", value: node.value, raw: node.value ? "true" : "false" };
    }
    if (node.kind === ExprKind.RegexLit) {
        return {
            type: "Literal",
            value: {},
            raw: node.raw,
            regex: { pattern: node.pattern, flags: node.flags },
        };
    }
    if (node.kind === ExprKind.TemplateLit) {
        const quasis = node.quasis.map((q, i) => ({
            type: "TemplateElement",
            value: { raw: q.raw, cooked: q.cooked },
            tail: i === node.quasis.length - 1,
        }));
        return {
            type: "TemplateLiteral",
            quasis,
            expressions: node.exprs.map(nativeToEstree),
        };
    }
    if (node.kind === ExprKind.Array) {
        return {
            type: "ArrayExpression",
            elements: node.elements.map((el) => {
                if (el.kind === ArrayElementKind.Hole) return null;
                if (el.kind === ArrayElementKind.Spread) {
                    return { type: "SpreadElement", argument: nativeToEstree(el.expression) };
                }
                return nativeToEstree(el.expression);
            }),
        };
    }
    if (node.kind === ExprKind.Object) {
        return {
            type: "ObjectExpression",
            properties: node.properties.map((p) => {
                if (p.kind === ObjectPropertyKind.Spread) {
                    return { type: "SpreadElement", argument: nativeToEstree(p.expression) };
                }
                if (p.kind === ObjectPropertyKind.Shorthand) {
                    const id = { type: "Identifier", name: p.name };
                    return {
                        type: "Property",
                        kind: "init",
                        method: false,
                        shorthand: true,
                        computed: false,
                        key: id,
                        value: id,
                    };
                }
                // KeyValue
                return {
                    type: "Property",
                    kind: "init",
                    method: false,
                    shorthand: false,
                    computed: p.computed,
                    key: nativeToEstree(p.key),
                    value: nativeToEstree(p.value),
                };
            }),
        };
    }
    if (node.kind === ExprKind.Paren) {
        // Acorn produces no paren node — unwrap.
        return nativeToEstree(node.expression);
    }
    if (node.kind === ExprKind.AtCell) {
        return { type: "ScrmlAtCell", name: node.name };
    }
    if (node.kind === ExprKind.BareVariant) {
        return { type: "ScrmlBareVariant", name: node.name };
    }

    // Unknown / not-yet-mapped — surface so the test fails the row.
    return { type: `Native:${node.kind}` };
}

// -----------------------------------------------------------------------------
// nodeKindSequence — Tier 1. Walk an ESTree-shaped tree in a deterministic
// pre-order and produce the flat sequence of node `type` strings. Both the
// native (normalized) tree and the Acorn tree are walked by the same routine,
// so a mismatch is a true structural divergence (E-CONFORMANCE-1).
// -----------------------------------------------------------------------------
function nodeKindSequence(node, out) {
    const acc = out ?? [];
    if (node === undefined || node === null) {
        acc.push("Hole");
        return acc;
    }
    if (typeof node !== "object") return acc;
    if (typeof node.type !== "string") return acc;

    acc.push(node.type);

    // Recurse into the child shapes our corpus produces. Order is fixed so the
    // sequence is stable.
    if (node.type === "ArrayExpression") {
        for (const el of node.elements) nodeKindSequence(el, acc);
    } else if (node.type === "ObjectExpression") {
        for (const p of node.properties) nodeKindSequence(p, acc);
    } else if (node.type === "Property") {
        // Skip the key for a shorthand (Acorn's key === value object); else
        // walk key then value.
        if (!node.shorthand) nodeKindSequence(node.key, acc);
        nodeKindSequence(node.value, acc);
    } else if (node.type === "SpreadElement") {
        nodeKindSequence(node.argument, acc);
    } else if (node.type === "TemplateLiteral") {
        // Interleave quasis + expressions in source order: q0 e0 q1 e1 ... qN.
        for (let i = 0; i < node.quasis.length; i++) {
            nodeKindSequence(node.quasis[i], acc);
            if (i < node.expressions.length) nodeKindSequence(node.expressions[i], acc);
        }
    }
    return acc;
}

// -----------------------------------------------------------------------------
// valueSequence — Tier 2. Walk the same tree and collect identifier names +
// literal values (+ template cooked strings + regex pattern/flags) in the same
// pre-order. A mismatch is a value divergence (E-CONFORMANCE-2).
// -----------------------------------------------------------------------------
function valueSequence(node, out) {
    const acc = out ?? [];
    if (node === undefined || node === null) return acc;
    if (typeof node !== "object" || typeof node.type !== "string") return acc;

    if (node.type === "Identifier") {
        acc.push("id:" + node.name);
    } else if (node.type === "Literal") {
        if (node.regex) {
            acc.push("regex:" + node.regex.pattern + "/" + node.regex.flags);
        } else {
            acc.push("lit:" + JSON.stringify(node.value));
        }
    } else if (node.type === "TemplateElement") {
        acc.push("quasi:" + node.value.cooked);
    }

    if (node.type === "ArrayExpression") {
        for (const el of node.elements) valueSequence(el, acc);
    } else if (node.type === "ObjectExpression") {
        for (const p of node.properties) valueSequence(p, acc);
    } else if (node.type === "Property") {
        if (!node.shorthand) valueSequence(node.key, acc);
        valueSequence(node.value, acc);
    } else if (node.type === "SpreadElement") {
        valueSequence(node.argument, acc);
    } else if (node.type === "TemplateLiteral") {
        for (let i = 0; i < node.quasis.length; i++) {
            valueSequence(node.quasis[i], acc);
            if (i < node.expressions.length) valueSequence(node.expressions[i], acc);
        }
    }
    return acc;
}

function parseWithAcorn(source) {
    try {
        const ast = acorn.Parser.parseExpressionAt(source, 0, ACORN_OPTS);
        return { ok: true, ast };
    } catch (e) {
        return { ok: false, error: e && e.message ? e.message : String(e) };
    }
}

function parseWithNative(source) {
    try {
        const result = scrmlNativeParseExpr(scrmlNativeLex(source));
        return { ok: true, ast: result.ast, errors: result.errors };
    } catch (e) {
        return { ok: false, error: e && e.message ? e.message : String(e) };
    }
}

// -----------------------------------------------------------------------------
// Acorn-comparable primary-expression micro-corpus. Every entry is a primary
// expression with NO scrml extensions, so raw Acorn parses it and the
// native-vs-Acorn Tier 1+2 diff is meaningful.
// -----------------------------------------------------------------------------
const ACORN_CORPUS = [
    // --- literals ---
    { name: "number literal — integer",        src: "42" },
    { name: "number literal — float",          src: "3.14" },
    { name: "number literal — hex",            src: "0xff" },
    { name: "number literal — exponent",       src: "1e3" },
    { name: "number literal — separators",     src: "1_000_000" },
    { name: "string literal — double-quoted",  src: '"hello"' },
    { name: "string literal — single-quoted",  src: "'world'" },
    { name: "string literal — with escapes",   src: '"a\\nb\\tc"' },
    { name: "boolean literal — true",          src: "true" },
    { name: "boolean literal — false",         src: "false" },
    { name: "regex literal — no flags",        src: "/foo/" },
    { name: "regex literal — with flags",      src: "/foo.bar/gi" },

    // --- identifiers ---
    { name: "identifier — plain",              src: "myVar" },
    { name: "identifier — underscore + digit", src: "_x9" },
    { name: "identifier — dollar",             src: "$ref" },

    // --- parenthesized ---
    { name: "paren — wrapping a number",       src: "(7)" },
    { name: "paren — wrapping an identifier",  src: "(foo)" },
    { name: "paren — nested parens",           src: "(((9)))" },

    // --- array literals ---
    { name: "array — empty",                   src: "[]" },
    { name: "array — number elements",         src: "[1, 2, 3]" },
    { name: "array — mixed literal elements",  src: '[1, "two", true]' },
    { name: "array — identifier elements",     src: "[a, b, c]" },
    { name: "array — single hole",             src: "[1, , 3]" },
    { name: "array — leading hole",            src: "[, 2]" },
    { name: "array — spread element",          src: "[...xs]" },
    { name: "array — spread + items",          src: "[1, ...rest, 9]" },
    { name: "array — nested array",            src: "[[1], [2, 3]]" },
    { name: "array — trailing comma",          src: "[1, 2,]" },

    // --- object literals ---
    { name: "object — empty",                  src: "{}" },
    { name: "object — key-value pairs",        src: "{a: 1, b: 2}" },
    { name: "object — string key",             src: '{"k": 1}' },
    { name: "object — number key",             src: "{0: 1}" },
    { name: "object — shorthand",              src: "{x, y}" },
    { name: "object — mixed shorthand + kv",   src: "{a: 1, b}" },
    { name: "object — computed key",           src: "{[k]: 1}" },
    { name: "object — spread",                 src: "{...rest}" },
    { name: "object — spread + props",         src: "{a: 1, ...rest}" },
    { name: "object — nested object value",    src: "{outer: {inner: 1}}" },
    { name: "object — trailing comma",         src: "{a: 1,}" },
    { name: "object — array value",            src: "{items: [1, 2]}" },

    // --- template literals ---
    { name: "template — no interpolation",     src: "`plain text`" },
    { name: "template — empty",                src: "``" },
    { name: "template — single interpolation", src: "`a${x}b`" },
    { name: "template — leading interp",       src: "`${x} tail`" },
    { name: "template — two interpolations",   src: "`${a} and ${b}`" },
    { name: "template — identifier interp",    src: "`val: ${value}`" },

    // --- composite nesting ---
    { name: "nesting — array of objects",      src: "[{x: 1}, {y: 2}]" },
    { name: "nesting — object with array+obj", src: "{list: [1], meta: {n: 0}}" },
    { name: "nesting — paren in array",        src: "[(1), (2)]" },
];

describe("M2.1 expression-parser conformance — Tier 1 (node-kind sequence)", () => {
    for (const c of ACORN_CORPUS) {
        test(`(tier1) ${c.name} — ${c.src}`, () => {
            const a = parseWithAcorn(c.src);
            const n = parseWithNative(c.src);

            expect(a.ok).toBe(true);
            expect(n.ok).toBe(true);
            // The native parser must report NO diagnostics on a clean
            // primary-expression input.
            expect(n.errors).toEqual([]);

            const acornSeq = nodeKindSequence(a.ast);
            const nativeSeq = nodeKindSequence(nativeToEstree(n.ast));
            expect(nativeSeq).toEqual(acornSeq);
        });
    }
});

describe("M2.1 expression-parser conformance — Tier 2 (identifier / literal values)", () => {
    for (const c of ACORN_CORPUS) {
        test(`(tier2) ${c.name} — ${c.src}`, () => {
            const a = parseWithAcorn(c.src);
            const n = parseWithNative(c.src);

            expect(a.ok).toBe(true);
            expect(n.ok).toBe(true);

            const acornVals = valueSequence(a.ast);
            const nativeVals = valueSequence(nativeToEstree(n.ast));
            expect(nativeVals).toEqual(acornVals);
        });
    }
});

// -----------------------------------------------------------------------------
// Native-only primary-expression cases — scrml extensions M1 LEXES and M2.1
// builds AST nodes for, but which Acorn has no equivalent for (DD §D6
// documented divergence). Exercised against the native parser directly.
// -----------------------------------------------------------------------------
describe("M2.1 expression-parser — scrml-extension primaries (native-only)", () => {
    test("@-cell — @count", () => {
        const n = parseWithNative("@count");
        expect(n.ok).toBe(true);
        expect(n.errors).toEqual([]);
        expect(n.ast.kind).toBe(ExprKind.AtCell);
        expect(n.ast.name).toBe("count");
    });

    test("@-cell — @userProfile", () => {
        const n = parseWithNative("@userProfile");
        expect(n.ok).toBe(true);
        expect(n.ast.kind).toBe(ExprKind.AtCell);
        expect(n.ast.name).toBe("userProfile");
    });

    test("bare variant — .Big", () => {
        const n = parseWithNative(".Big");
        expect(n.ok).toBe(true);
        expect(n.errors).toEqual([]);
        expect(n.ast.kind).toBe(ExprKind.BareVariant);
        expect(n.ast.name).toBe("Big");
    });

    test("bare variant — .Loading", () => {
        const n = parseWithNative(".Loading");
        expect(n.ok).toBe(true);
        expect(n.ast.kind).toBe(ExprKind.BareVariant);
        expect(n.ast.name).toBe("Loading");
    });

    test("@-cell inside an array literal", () => {
        const n = parseWithNative("[@a, @b]");
        expect(n.ok).toBe(true);
        expect(n.errors).toEqual([]);
        expect(n.ast.kind).toBe(ExprKind.Array);
        expect(n.ast.elements.length).toBe(2);
        expect(n.ast.elements[0].expression.kind).toBe(ExprKind.AtCell);
        expect(n.ast.elements[1].expression.kind).toBe(ExprKind.AtCell);
    });

    test("bare variant as an object-property value", () => {
        const n = parseWithNative("{state: .Idle}");
        expect(n.ok).toBe(true);
        expect(n.errors).toEqual([]);
        expect(n.ast.kind).toBe(ExprKind.Object);
        expect(n.ast.properties[0].value.kind).toBe(ExprKind.BareVariant);
        expect(n.ast.properties[0].value.name).toBe("Idle");
    });
});

// -----------------------------------------------------------------------------
// Span-preservation spot-checks (DD §D6 Tier 3 — "SHOULD match"). The native
// parser carries a Span on every node; verify the outer-node span covers the
// whole source for a few representative shapes.
// -----------------------------------------------------------------------------
describe("M2.1 expression-parser — span preservation (Tier 3 spot-check)", () => {
    const spanCases = [
        { src: "42" },
        { src: "[1, 2, 3]" },
        { src: "{a: 1}" },
        { src: "(foo)" },
        { src: "`a${x}b`" },
    ];
    for (const c of spanCases) {
        test(`(tier3) outer span covers source — ${c.src}`, () => {
            const n = parseWithNative(c.src);
            expect(n.ok).toBe(true);
            expect(n.ast).toBeDefined();
            expect(n.ast.span).toBeDefined();
            // Every primary-expression node's span covers its full source
            // extent — start at offset 0, end at source.length. (The
            // template literal's start backs up to its opening backtick in
            // parseTemplateLiteral, since M1 absorbs that backtick into the
            // first chunk; see that function's comment.)
            expect(n.ast.span.start).toBe(0);
            expect(n.ast.span.end).toBe(c.src.length);
        });
    }
});

// -----------------------------------------------------------------------------
// Error-path checks — malformed primary expressions must record a structured
// diagnostic (and NOT throw). M2.1 records the fault + stops; M3's
// error-recovery engine adds skipped-token accumulation + re-sync.
// -----------------------------------------------------------------------------
describe("M2.1 expression-parser — error paths (diagnostics, no throw)", () => {
    test("unclosed paren records E-EXPR-UNCLOSED-PAREN", () => {
        const n = parseWithNative("(1");
        expect(n.ok).toBe(true);
        const codes = n.errors.map((e) => e.code);
        expect(codes).toContain("E-EXPR-UNCLOSED-PAREN");
    });

    test("unclosed array records E-EXPR-UNCLOSED-BRACKET", () => {
        const n = parseWithNative("[1, 2");
        expect(n.ok).toBe(true);
        const codes = n.errors.map((e) => e.code);
        expect(codes).toContain("E-EXPR-UNCLOSED-BRACKET");
    });

    test("unclosed object records E-EXPR-UNCLOSED-BRACE", () => {
        const n = parseWithNative("{a: 1");
        expect(n.ok).toBe(true);
        const codes = n.errors.map((e) => e.code);
        expect(codes).toContain("E-EXPR-UNCLOSED-BRACE");
    });

    test("empty input records E-EXPR-UNEXPECTED (EOF in expr position)", () => {
        const n = parseWithNative("");
        expect(n.ok).toBe(true);
        const codes = n.errors.map((e) => e.code);
        expect(codes).toContain("E-EXPR-UNEXPECTED");
    });

    test("object method shape records E-EXPR-OBJECT-METHOD-UNSUPPORTED (M2.3 deferral)", () => {
        const n = parseWithNative("{foo(");
        expect(n.ok).toBe(true);
        const codes = n.errors.map((e) => e.code);
        expect(codes).toContain("E-EXPR-OBJECT-METHOD-UNSUPPORTED");
    });
});
