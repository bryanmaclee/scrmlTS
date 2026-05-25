// m67-d8a-i-function-return-type.test.js — M6.7-D8a-i FIX-NATIVE.
//
// ROOT CAUSE (Phase-0 verified):
//   `parseFunctionDecl` (compiler/native-parser/parse-stmt.js:1608) is the
//   bare-`function` (non-modifier-led) declaration parser. It does:
//     consume `function` -> consume name -> parseParamList(ctx)
//       -> parseFunctionBodyInline(ctx, ...)
//   The OMISSION: between `parseParamList(ctx)` and `parseFunctionBodyInline`,
//   the parser does NOT consume an optional `-> ReturnType` annotation. So the
//   SPEC §14 (line 5590) canonical form
//     function add(a: number, b: number) -> number { return a + b }
//   fails native at the `-` of `->` with E-STMT-FUNCTION-BODY ("expected '{' to
//   open a function body"), cascading to E-EXPR-UNEXPECTED + E-STMT-MISSING-
//   SEMICOLON + E-STMT-RETURN-OUTSIDE-FUNCTION. PARAM-type annotation (`x: T`)
//   parses cleanly via skipParamTypeAnnotation — only the RETURN-type was the
//   gap. The sibling `parseScrmlFunctionDecl` (parse-stmt.js:1765) DOES carry
//   the annotation — it calls `skipReturnTypeAnnotation(ctx)` at line 1853
//   under `arrowFollows(cursor)`. SPEC §14:5590 normative: "`->` is the sole
//   return-type annotation syntax for `function` and `fn` declarations" — BOTH
//   forms carry the same grammar. The omission violates SPEC.
//
//   LEXER SHAPE: `->` is lexed as TWO tokens (`Minus` then `GreaterThan`) —
//   the native lexer reserves `TokenKind.Arrow` for the fat arrow `=>`. The
//   `arrowFollows(cursor)` predicate (parse-stmt.js:1713) gates on the
//   two-token sequence.
//
// THE FIX (5 lines):
//   In parseFunctionDecl, between parseParamList and parseFunctionBodyInline:
//     if (arrowFollows(cursor)) {
//         advance(cursor);   // consume `-`
//         advance(cursor);   // consume `>`
//         skipReturnTypeAnnotation(ctx);
//     }
//   skipReturnTypeAnnotation tracks paren/angle nesting so refinement
//   predicates like `number(>0)` or generic `Result(string, ErrorType)` do not
//   end the scan early.
//
// These tests drive the NATIVE parser directly via parseProgram(lex(src)) and
// nativeParseFile (NOT compileScrml — S128 ops #1: escape-hatch masks). They
// assert that the SPEC §14 canonical forms parse with ZERO errors post-fix.
// Pre-fix, every assertion that contains a `->` return annotation fires
// E-STMT-FUNCTION-BODY at the `->`. Post-fix, all forms parse cleanly.

import { describe, test, expect } from "bun:test";

import { lex } from "../../native-parser/lex.js";
import { parseProgram } from "../../native-parser/parse-stmt.js";
import { nativeParseFile } from "../../native-parser/parse-file.js";

// realErrors — strip W-* / I-* diagnostics (warnings / info); only hard
// parse errors are the gate (the `${}` wrapper and default-logic mode emit
// informational diagnostics in both pipelines — see m67-d7 precedent).
function realErrors(arr) {
  return (arr || [])
    .filter((e) => !String(e.code || "").startsWith("W-"))
    .filter((e) => !String(e.code || "").startsWith("I-"))
    .map((e) => e.code);
}

function parseJS(src) {
  const r = parseProgram(lex(src), src);
  return { errors: realErrors(r.errors), body: r.body };
}

function parseScrmlFile(src) {
  const r = nativeParseFile("m67-d8a-i.scrml", src);
  return { errors: realErrors(r.errors), ast: r.ast };
}

// =============================================================================
// THE GAP — `function name(params) -> ReturnType { body }` (SPEC §14 line 5590).
// Direct parseProgram probes — bare-`function` declarations at top-level JS
// position (the parseFunctionDecl entry-point covered by the fix).
// =============================================================================
describe("M6.7-D8a-i — `function f(...) -> Type {...}` parses native (parseProgram)", () => {
  const FORMS = [
    {
      label: "param-type + return-type (the canonical SPEC §14 example)",
      src: `function f(x: number) -> number { return x * 2 }`,
    },
    {
      label: "return-type only, no params",
      src: `function f() -> string { return "hi" }`,
    },
    {
      label: "return-type only, multiple params no types",
      src: `function add(a, b) -> number { return a + b }`,
    },
    {
      label: "complex return-type — generic with refinement nesting",
      src: `function f() -> Result(string, ErrorType) { return ok(1) }`,
    },
    {
      label: "complex return-type — union type",
      src: `function f(x: number) -> string | number { return x }`,
    },
    {
      label: "complex return-type — array type",
      src: `function f() -> string[] { return [] }`,
    },
    {
      label: "complex return-type — optional sugar T?",
      src: `function f() -> string? { return "ok" }`,
    },
  ];

  for (const f of FORMS) {
    test(`zero errors — ${f.label}`, () => {
      const r = parseJS(f.src);
      expect(r.errors).toEqual([]);
    });
  }
});

// =============================================================================
// THE Arrow-NOT-PRESENT BRANCH — pre-existing forms must continue to parse.
// These exercise the `arrowFollows(cursor) === false` arm of the new gate.
// =============================================================================
describe("M6.7-D8a-i — pre-fix forms unaffected (no `->` annotation)", () => {
  const FORMS = [
    { label: "neither annotation (baseline)", src: `function f(x) { return x }` },
    { label: "param-type only, no return-type", src: `function f(x: T) { return x }` },
    { label: "no params, no annotation", src: `function f() { return 1 }` },
    { label: "generator", src: `function* gen() { yield 1 }` },
  ];

  for (const f of FORMS) {
    test(`zero errors — ${f.label}`, () => {
      const r = parseJS(f.src);
      expect(r.errors).toEqual([]);
    });
  }
});

// =============================================================================
// .scrml FILE PROBE — the same forms wrapped in a `${...}` logic block.
// Exercises the nativeParseFile pipeline (the path the 4 D8a-i candidate
// fixtures cross-file-components / fn-implicit-return-e2e / tilde-carry-
// forward / tilde-gaps-567 actually hit).
// =============================================================================
describe("M6.7-D8a-i — `${ function ... -> Type {...} }` parses via nativeParseFile", () => {
  const FORMS = [
    {
      label: "canonical SPEC §14 example wrapped",
      src: `\${\nfunction add(a: number, b: number) -> number { return a + b }\n}`,
    },
    {
      label: "the actual tilde-gaps-567 fixture shape",
      src: `\${\nfunction step1(n: number) -> number { return n + 10 }\nfunction step2(n: number) -> number { return n * 3 }\n}`,
    },
    {
      label: "the actual tilde-carry-forward fixture shape",
      src: `\${\nfunction double(x: number) -> number { return x * 2 }\nfunction describe(n: number) -> string { return \`value is \${n}\` }\n}`,
    },
  ];

  for (const f of FORMS) {
    test(`zero errors — ${f.label}`, () => {
      const r = parseScrmlFile(f.src);
      expect(r.errors).toEqual([]);
    });
  }
});

// =============================================================================
// SIBLING-FORM NON-REGRESSION — the `fn`-shorthand and `pure`/`server`-modifier
// forms (handled by parseScrmlFunctionDecl, NOT touched by this fix) must
// continue to accept the same return-type annotation.
// =============================================================================
describe("M6.7-D8a-i — sibling `fn` / modifier forms unaffected", () => {
  const FORMS = [
    { label: "`fn` shorthand with return-type", src: `fn add(a: number, b: number) -> number { return a + b }` },
    { label: "`pure fn` with return-type", src: `pure fn double(x: number) -> number { return x * 2 }` },
    { label: "`server function` with return-type (post-D2)", src: `server function fetchOne(id: number) -> string { return "x" }` },
  ];

  for (const f of FORMS) {
    test(`zero errors — ${f.label}`, () => {
      const r = parseJS(f.src);
      expect(r.errors).toEqual([]);
    });
  }
});
