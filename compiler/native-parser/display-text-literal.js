// display-text-literal.js — JS-host shadow of display-text-literal.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors display-text-literal.scrml's header.
//
// DisplayTextLiteral is the SPEC §4.18.3/.4 `"..."` display-text-literal
// engine (charter Q1.E) — the markup-layer engine that scans a
// display-text literal (a sequence of literal-text segments and `${...}`
// interpolations — the vehicle for plain display text inside a
// code-default body). It is the direct analogue of the M1 JS-layer
// template-literal engine (lex-mode.js's `.InTemplateBody` nested-engine);
// per charter Q1.E + R1 seam punch-list P6 the native parser REUSES that
// engine's shape rather than building a second template-string engine.
//
// MK3.1 SCOPE: the engine SKELETON only — the `type DisplayTextLiteral
// :enum` declaration + the `<engine>` declaration with its rule= contract
// (see the .scrml). The SUBSTANTIVE literal-scanning logic lands later:
//   - MK3.2 — `.Outside` / `.InLiteralText` scanning (the `"` open/close
//     transitions, `\"` / `\\` / `\${` escapes, verbatim-whitespace
//     segment accumulation, the DisplayTextLiteral AST-node emit);
//   - MK3.3 — `.InInterpolation` `${...}` interpolation (delegation to
//     the M2 JS expression parser, the one-node `{segments, exprs}`
//     shape, E-UNQUOTED-DISPLAY-TEXT).
//
// This is the same skeleton-first pattern MK2.1's TagFrame skeleton used.

// LexMode is imported by the .scrml so the `.InInterpolation` composite
// state-child's inner engine resolves; the .js shadow does not need the
// import (the inner engine is the .scrml's canonical SHAPE). Kept as a
// comment so the .scrml<->.js pair stays legible 1:1.
// import { LexMode } from "./lex-mode.js";

// DisplayTextLiteral variant tags — all 3 per charter Q1.E.
//   Outside        — the cursor is NOT inside a display-text literal (the
//                    code-grammar regime in a code-default body).
//   InLiteralText  — the cursor is inside the `"..."` literal,
//                    accumulating a literal-text segment.
//   InInterpolation — the cursor is inside a `${expr}` interpolation
//                    within the literal.
export const DisplayTextLiteral = Object.freeze({
    Outside:         "Outside",
    InLiteralText:   "InLiteralText",
    InInterpolation: "InInterpolation",
});

// initialDisplayTextLiteral — calculation. Matches `initial=.Outside` —
// a code-default body begins OUTSIDE any display-text literal.
export function initialDisplayTextLiteral() {
    return DisplayTextLiteral.Outside;
}

// doubleQuote — calculation. The one-character `"` display-text-literal
// delimiter (SPEC §4.18.3 — `"`-only). Mirrors the .scrml's
// String.fromCharCode form 1:1 (the .scrml assembles it for ANOMALY-1
// string-literal-discipline consistency with the markup-layer files; the
// .js keeps the same shape). MK3.2's literal scanner reads this.
export function doubleQuote() {
    return String.fromCharCode(34);
}

// LEGAL_FROM_IN_LITERAL_TEXT — the rule= matrix on the <InLiteralText>
// state-child, as a lookup table. From .InLiteralText the engine may
// transition to .Outside (the closing `"`) or .InInterpolation (a `${`
// opener). MK3.2 / MK3.3 validate transitions against this matrix — the
// live-surface rule= mirror, the same shape lex-mode.js's
// LEGAL_FROM_IN_CODE provides.
export const LEGAL_FROM_IN_LITERAL_TEXT = Object.freeze({
    Outside:         true,
    InInterpolation: true,
});

// ---------------------------------------------------------------------------
// FORWARD SEAM — MK3.2 + MK3.3 (documented, not implemented here).
//
// MK3.1 is the engine SKELETON. The substantive literal scanner lands in
// two later sub-steps:
//
//   MK3.2 — `.Outside` / `.InLiteralText` scanning: the `"` open/close
//     transitions; the `\"` / `\\` / `\${` escape recognition consumed
//     within `.InLiteralText` (SPEC §4.18.3 + §4.18.4); whitespace
//     accumulated VERBATIM (SPEC §4.18.5); `'` and a backtick are
//     ordinary interior characters; the DisplayTextLiteral AST-node emit
//     (the DisplayTextLiteral block kind — MK3.1 adds the kind to
//     parse-ctx); an unterminated literal -> E-CTX-001 against the
//     opening `"`.
//
//   MK3.3 — `.InInterpolation` `${...}` interpolation: `${` opens an
//     interpolation delegating to the M2 JS expression parser (a
//     DelegationFrame of kind .Interpolation); the matching `}` returns;
//     a literal with interpolations produces ONE AST node (the §4.18.4 /
//     D3 `{ segments, exprs }` Template-node shape); E-UNQUOTED-DISPLAY-
//     TEXT (SPEC §4.18.7) — a parse outcome in a code-default body.
// ---------------------------------------------------------------------------
