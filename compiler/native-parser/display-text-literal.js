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
// MK3.1 SCOPE (landed): the engine SKELETON — the `type DisplayTextLiteral
// :enum` declaration + the `<engine>` declaration with its rule= contract
// (see the .scrml). MK3.2 (landed) filled the substantive literal-scanning
// logic for `.Outside` / `.InLiteralText`:
//   - the `"` open transition (.Outside -> .InLiteralText) and the `"`
//     close transition (.InLiteralText -> .Outside);
//   - the `\"` / `\\` / `\${` escape recognition consumed within
//     `.InLiteralText` (SPEC §4.18.3 — `\"` / `\\`; §4.18.4 — `\${`);
//   - whitespace accumulated VERBATIM into the literal-text segment
//     (SPEC §4.18.5 — no collapse, no strip);
//   - `'` and a backtick are ORDINARY interior characters — no transition
//     (SPEC §4.18.3);
//   - emit the DisplayTextLiteral AST node carrying the literal's text
//     segment(s);
//   - an unterminated literal -> E-CTX-001 against the opening `"`
//     (SPEC §4.18.3 / §4.18.7 recovery).
//
// MK3.3 SCOPE — THIS dispatch — fills `.InInterpolation` (SPEC §4.18.4):
//   - an un-escaped `${` inside `.InLiteralText` opens an interpolation
//     (.InLiteralText -> .InInterpolation); the segment so far is closed;
//   - the `${expr}` body is logic — it delegates to the M2 JS expression
//     parser (lex() the interpolation body, then parseExpr()); the
//     interpolation body extent is the run from `${` to the matching `}`,
//     found by walking M1's token stream + tracking brace depth (the M1
//     lex-in-template.js `bracketDepthAtOpen` pattern — R1 seam punch-list
//     P6; M1's lexer does not emit a brace token from inside a string /
//     comment / template, so brace-depth tracking over its token stream
//     is string-aware for free);
//   - the matching `}` closes the interpolation (.InInterpolation ->
//     .InLiteralText); a new literal-text segment begins after it;
//   - a display-text literal carrying interpolations is ONE node — its
//     `segments` array carries each literal-text run, its `exprs` array
//     carries each interpolation expression (the §4.18.4 / D3
//     `{ segments, exprs }` Template-node shape — N interpolations yield
//     N exprs interleaved with N+1 segments);
//   - an interpolation that reaches EOF before its matching `}` is
//     unterminated — E-CTX-001 against the `${`.
// MK3.3 also wires `scanDisplayTextLiteral` into the markup trampoline's
// code-default body dispatch + emits `E-UNQUOTED-DISPLAY-TEXT` (§4.18.7);
// that wiring lives in parse-markup.js (the body-mode-aware dispatch).
//
// THE ESCAPE SET IS DELIBERATELY MINIMAL. SPEC §4.18.3 — a display-text
// literal recognizes exactly `\"` and `\\`; §4.18.4 adds `\${`. It does
// NOT recognize the full JS string-escape table (`\n` / `\xHH` / `\uHHHH`
// / line-continuation / …). MK3.2 therefore does NOT reuse
// lex-in-single-string's `scanStringEscape` (which decodes that whole
// table); the literal-text escape scanner here is §4.18-specific. A
// backslash followed by any other character is a malformed escape —
// `E-PARSE-001` (SPEC §4.18.3) — recovered by emitting the backslash
// literally and continuing.

import { peekChar, peekStr, advance, isEof } from "./cursor.js";
import { makeSpan } from "./span.js";
// MK3.3 — the `${...}` interpolation body delegates to the M1 lexer + the
// M2 JS expression parser (charter Q1.E / SPEC §4.18.4; R1 seam P6).
// `lex(source): Token[]` tokenizes the interpolation body; `parseExpr
// (tokens): { ast, errors }` builds the Expr AST. The interpolation-extent
// scan walks the M1 token stream directly — TokenKind names the brace
// tokens it counts.
import { lex } from "./lex.js";
import { parseExpr } from "./parse-expr.js";
import { TokenKind } from "./token.js";

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
// .js keeps the same shape).
export function doubleQuote() {
    return String.fromCharCode(34);
}

// backslash — calculation. The one-character `\` escape-introducer. SPEC
// §4.18.3 — inside a display-text literal a `\` introduces an escape
// sequence (`\"` / `\\` / `\${`). Assembled via char-code to keep this
// file consistent with the markup-layer ANOMALY-1 discipline (a literal
// backslash in scrml source needs escaping; the assembled form sidesteps
// it).
export function backslash() {
    return String.fromCharCode(92);
}

// interpolationOpen — calculation. The two-character `${` interpolation
// opener (SPEC §4.18.4 — `${` opens an interpolation inside the literal).
// Assembled via char-code per the markup-layer ANOMALY-1 discipline (a
// brace-bearing literal in scrml source opens a spurious context). MK3.2's
// scanner recognizes this sequence as a segment boundary; MK3.3 wires the
// JS-expression-parser delegation that consumes the interpolation body.
export function interpolationOpen() {
    return String.fromCharCode(36) + String.fromCharCode(123);
}

// LEGAL_FROM_IN_LITERAL_TEXT — the rule= matrix on the <InLiteralText>
// state-child, as a lookup table. From .InLiteralText the engine may
// transition to .Outside (the closing `"`) or .InInterpolation (a `${`
// opener). Validates transitions against this matrix — the live-surface
// rule= mirror, the same shape lex-mode.js's LEGAL_FROM_IN_CODE provides.
export const LEGAL_FROM_IN_LITERAL_TEXT = Object.freeze({
    Outside:         true,
    InInterpolation: true,
});

// ===========================================================================
// MK3.2 — THE LITERAL-TEXT ESCAPE SCANNER (SPEC §4.18.3 + §4.18.4).
//
// Inside a display-text literal exactly THREE escape sequences are
// recognized:
//   \"   -> a literal double-quote   (SPEC §4.18.3)
//   \\   -> a literal backslash      (SPEC §4.18.3)
//   \${  -> a literal `${` sequence  (SPEC §4.18.4 — escapes the
//           interpolation opener so a literal `${` can appear as text)
// Any other character after a `\` is a MALFORMED escape — SPEC §4.18.3
// (E-PARSE-001). The native parser recovers from a malformed escape by
// treating the `\` as a literal backslash character and continuing the
// scan from the character after it (the offending char is then scanned
// normally as the next literal character).
// ===========================================================================

// classifyEscape — calculation (pure predicate). Given the character
// immediately after a `\` (and, for the `${` case, the one after that),
// which escape sequence — if any — does the `\` introduce? Returns one of
// "quote" / "backslash" / "dollarBrace" / "malformed". A `\` at end-of-
// input (no following char) is "malformed" — there is nothing to escape.
export function classifyEscape(afterBackslash, afterAfter) {
    if (afterBackslash === doubleQuote()) return "quote";
    if (afterBackslash === backslash())   return "backslash";
    if (afterBackslash === String.fromCharCode(36) &&
        afterAfter === String.fromCharCode(123)) {
        return "dollarBrace";
    }
    return "malformed";
}

// scanLiteralEscape — STATE write (cursor advance) + calculation (the
// produced cooked text). The cursor is positioned AT the introducing `\`.
// Consume the full escape sequence and return its cooked (resolved) text.
//
// Returns { cooked, malformed }:
//   - `\"`  -> { cooked: '"',  malformed: false }  (2 chars consumed)
//   - `\\`  -> { cooked: '\\', malformed: false }  (2 chars consumed)
//   - `\${` -> { cooked: '${', malformed: false }  (3 chars consumed)
//   - malformed (a `\` before any other char, or a `\` at EOF) ->
//     { cooked: '\\', malformed: true } — the `\` is consumed (1 char);
//     the offending character is left for the caller's next scan iteration
//     (it is an ordinary literal character). The caller records the
//     E-PARSE-001 diagnostic; this fn only does the consumption + cook.
export function scanLiteralEscape(cursor) {
    // Consume the introducing `\`.
    advance(cursor, 1);
    if (isEof(cursor)) {
        // A `\` at end-of-input — nothing to escape. Malformed; the cooked
        // text is the bare backslash.
        return { cooked: backslash(), malformed: true };
    }

    const after = peekChar(cursor, 0);
    const afterAfter = peekChar(cursor, 1);
    const kind = classifyEscape(after, afterAfter);

    if (kind === "quote") {
        advance(cursor, 1);
        return { cooked: doubleQuote(), malformed: false };
    }
    if (kind === "backslash") {
        advance(cursor, 1);
        return { cooked: backslash(), malformed: false };
    }
    if (kind === "dollarBrace") {
        advance(cursor, 2);
        return { cooked: interpolationOpen(), malformed: false };
    }

    // Malformed — a `\` before any other character. The `\` is already
    // consumed; the offending character stays for the next scan iteration
    // (it is an ordinary literal character — SPEC §4.18.3 recovery).
    return { cooked: backslash(), malformed: true };
}

// ===========================================================================
// MK3.2 — THE DisplayTextLiteral AST NODE (SPEC §4.18.8 — distinct kind).
//
// SPEC §4.18.4: a display-text literal is "a sequence of literal-text
// segments and `${expr}` interpolations" — the template-string shape. A
// literal carrying interpolations is ONE body child interleaving literal
// segments and interpolated expressions (NOT decomposed into siblings).
// The node carries `{ segments, exprs }` — the §4.18.4 / D3 Template-node
// shape (parallels the JS-layer `Template(quasis, exprs)`).
//
// `segments` and `exprs` interleave (the §4.18.4 template-string shape):
// N interpolations split the literal into N+1 literal-text segments, so a
// literal with N interpolations has `segments.length === N + 1` and
// `exprs.length === N`. A non-interpolation literal therefore has exactly
// ONE segment and an empty `exprs`. The render order is segment[0],
// expr[0], segment[1], expr[1], …, segment[N].
//
// A segment is `{ raw, cooked }`: `raw` is the verbatim source between the
// quotes (escapes UNRESOLVED — SPEC §4.18.5 whitespace is in `raw` exactly
// as written); `cooked` is the resolved text (escapes applied — `\"` ->
// `"`, `\\` -> `\`, `\${` -> `${`). Codegen's §4.18.6 auto-HTML-escape
// reads `cooked`; the two-stage cook/escape split mirrors the JS-layer
// template-chunk `{ raw, cooked }`. Each entry of `exprs` is the M2
// `Expr` AST node the interpolation body parsed to.
// ===========================================================================

// makeLiteralSegment — calculation (pure data builder). One literal-text
// segment of a display-text literal: { raw, cooked }.
export function makeLiteralSegment(raw, cooked) {
    return { raw, cooked };
}

// makeDisplayTextLiteralNode — calculation (pure data builder). The
// DisplayTextLiteral AST node. `segments` is the literal-text-segment
// array; `exprs` is the interpolation-expression array (empty at MK3.2 —
// non-interpolation); `span` is the whole-literal span (the opening `"`
// through the closing `"`, or through EOF / the body closer for an
// unterminated literal); `terminated` records whether a closing `"` was
// found (false for an unterminated literal recovered per §4.18.7).
export function makeDisplayTextLiteralNode(segments, exprs, span, terminated) {
    return {
        kind: "DisplayTextLiteral",
        segments,
        exprs,
        span,
        terminated,
    };
}

// ===========================================================================
// THE DIAGNOSTIC SINK — shared with the markup layer (tag-frame.js).
//
// The display-text-literal scan produces these diagnostics:
//   - E-CTX-001 — an unterminated literal (EOF / the body closer reached
//     before the closing `"`); blamed at the OPENING `"` (SPEC §4.18.3 /
//     §4.18.7). Recovered: the captured text is the literal's content.
//   - E-PARSE-001 — a malformed escape (a `\` before a char other than
//     `"` / `\` / `${`); blamed at the `\`. Recovered: the `\` is a
//     literal backslash (SPEC §4.18.3).
//   - E-CTX-001 (MK3.3) — an unterminated `${...}` interpolation (EOF
//     reached before the matching `}`); blamed at the `${`. Recovered:
//     the captured text from `${` to EOF is the interpolation body.
//   - the M2 expression parser's own diagnostics for a malformed
//     interpolation body — surfaced into this same `ctx.diagnostics`
//     stream (MK3.3 — so a bad expression inside `${...}` is one uniform
//     diagnostic stream with the literal-scan diagnostics).
// The sink is `ctx.diagnostics` — the SAME array tag-frame.js's
// pushDiagnostic appends to (MK2.2 introduced it). display-text-literal.js
// re-implements the lazy-init + push here rather than importing tag-frame
// .js, so the module does not take a dependency on the whole TagFrame
// engine for one array push (and there is no display-text-literal <->
// tag-frame import cycle). The shape — { code, message, span } — is
// identical, so the conformance harness reads one uniform diagnostic
// stream.
// ===========================================================================

// ensureDiagnostics — STATE write (lazy init). A parse context built
// before MK2.2 has no `diagnostics` slot; this keeps the helper total.
export function ensureDiagnostics(ctx) {
    if (ctx.diagnostics === undefined || ctx.diagnostics === null) {
        ctx.diagnostics = [];
    }
}

// makeDiagnostic — calculation (pure data builder). One structured
// diagnostic: { code, message, span }. Identical shape to tag-frame.js's
// makeDiagnostic so the streams unify.
export function makeDiagnostic(code, message, span) {
    return { code, message, span };
}

// pushDiagnostic — STATE write: append a diagnostic to ctx.diagnostics.
export function pushDiagnostic(ctx, diagnostic) {
    ensureDiagnostics(ctx);
    ctx.diagnostics.push(diagnostic);
}

// ===========================================================================
// MK3.3 — THE `${...}` INTERPOLATION (SPEC §4.18.4).
//
// A display-text literal is "a sequence of literal-text segments and
// `${expr}` interpolations" (§4.18.4) — the template-string shape. The
// `.InLiteralText` -> `.InInterpolation` transition fires on an un-escaped
// `${`; the `.InInterpolation` -> `.InLiteralText` transition fires on the
// matching `}`.
//
// THE INTERPOLATION-EXTENT SCAN. The `${expr}` body is logic; its `}`
// closer is the one that BALANCES the `${`'s `{`. Finding it is a
// brace-depth count — but a `}` inside a string / comment / template
// literal in the body is NOT structural. Rather than re-implement string
// awareness, MK3.3 REUSES the M1 lexer (R1 seam punch-list P6 — "reuse the
// M1 template-literal engine shape"): `lex()` the source from the `${`'s
// `{` onward, then walk the resulting token stream tracking LBrace /
// RBrace depth. M1's lexer consumes string / comment / template bodies in
// their own LexMode dispatchers and does NOT emit a brace token from
// inside them, so brace-depth counting over its token stream is
// string-aware for free. The first RBrace that brings the depth back to 0
// is the interpolation closer — exactly the §4.18.4 "the matching `}`".
//
// The interpolation body text (between `${` and the matching `}`) is then
// lexed + parsed by the M2 JS expression parser (`lex()` + `parseExpr()`);
// the resulting `Expr` AST node is the interpolation's expression.
// ===========================================================================

// findInterpolationCloseOffset — calculation (pure). Given the source text
// of a `${...}` interpolation STARTING AT THE OPENING BRACE `{` (NOT the
// `$` — the caller passes the `{`-onward substring), return the offset —
// relative to that substring — of the character ONE PAST the matching `}`,
// or -1 if no matching `}` exists (an unterminated interpolation).
//
// The M1 token stream is walked: the leading LBrace opens depth 1; every
// further LBrace increments, every RBrace decrements; the RBrace that
// brings depth to 0 is the matching close. `lex()` does not emit a brace
// from inside a string / comment / template body, so the count is
// string-aware. A defensive guard: if the first token is not an LBrace
// (the caller always positions at `{`, so this is unreachable in normal
// operation) the fn returns -1.
export function findInterpolationCloseOffset(braceOnwardSource) {
    const tokens = lex(braceOnwardSource);
    if (tokens.length === 0) return -1;
    if (tokens[0].kind !== TokenKind.LBrace) return -1;

    let depth = 0;
    let i = 0;
    while (i < tokens.length) {
        const tok = tokens[i];
        if (tok.kind === TokenKind.LBrace) {
            depth = depth + 1;
        } else if (tok.kind === TokenKind.RBrace) {
            depth = depth - 1;
            if (depth === 0) {
                // The matching `}` — its span.end is one past the `}`,
                // relative to the braceOnwardSource substring.
                return tok.span.end;
            }
        }
        i = i + 1;
    }
    // The brace depth never returned to 0 — an unterminated interpolation.
    return -1;
}

// scanInterpolation — STATE write (cursor advance) + calculation (the
// parsed expression). The cursor MUST be positioned AT the `${`'s `$`
// (the `.InLiteralText` -> `.InInterpolation` trigger — an un-escaped
// `${`). The interpolation is scanned to its matching `}`; the body is
// delegated to the M2 JS expression parser.
//
// Returns { expr, terminated }:
//   - `expr` — the M2 `Expr` AST node the `${expr}` body parsed to (or
//     `null` for an empty `${}` body / an unterminated interpolation that
//     captured no parseable body);
//   - `terminated` — true iff a matching `}` was found (false for an
//     unterminated interpolation — EOF reached before the `}`).
//
// On exit the cursor is positioned ONE PAST the matching `}` (terminated)
// or AT EOF (unterminated). An unterminated interpolation records
// E-CTX-001 against the `${`. The M2 parser's own diagnostics for a
// malformed body expression are forwarded into `ctx.diagnostics`.
export function scanInterpolation(cursor, ctx) {
    const interpPos = cursor.pos;
    const interpLine = cursor.line;
    const interpCol = cursor.col;

    // The `${`'s `{` is one char past the `$`. Lex from the `{` onward so
    // the M1 token stream's first token is the LBrace the depth count
    // opens on.
    const braceStart = interpPos + 1;
    const braceOnward = cursor.source.substring(braceStart);
    const closeOffset = findInterpolationCloseOffset(braceOnward);

    if (closeOffset < 0) {
        // Unterminated interpolation — EOF before the matching `}`. SPEC
        // §4.18.4 / §4.18.7 recovery — E-CTX-001 against the `${`; the
        // captured body is from `${`+2 to EOF. Advance the cursor to EOF.
        const bodyStart = interpPos + 2;
        const bodyText = cursor.source.substring(bodyStart);
        advance(cursor, cursor.source.length - cursor.pos);
        pushDiagnostic(ctx, makeDiagnostic(
            "E-CTX-001",
            "Unterminated interpolation in display-text literal — no " +
            "closing brace before end of input.",
            makeSpan(interpPos, interpPos + 2, interpLine, interpCol),
        ));
        const expr = parseInterpolationBody(bodyText, ctx);
        return { expr, terminated: false };
    }

    // The matching `}` end — absolute (closeOffset is relative to the
    // `{`-onward substring). The interpolation body is the run between the
    // `${` and the matching `}`: from interpPos+2 to one-before-the-`}`.
    const absoluteCloseEnd = braceStart + closeOffset;
    const bodyStart = interpPos + 2;
    const bodyEnd = absoluteCloseEnd - 1;
    const bodyText = cursor.source.substring(bodyStart, bodyEnd);

    // Advance the markup cursor past the matching `}`.
    advance(cursor, absoluteCloseEnd - cursor.pos);

    const expr = parseInterpolationBody(bodyText, ctx);
    return { expr, terminated: true };
}

// parseInterpolationBody — calculation (the parsed expression) + STATE
// write (diagnostic forwarding). Lex + parse one interpolation body text
// via the M2 JS expression parser. An empty / whitespace-only body parses
// to `null` (an empty `${}` interpolation has no expression). The M2
// parser's diagnostics are forwarded into `ctx.diagnostics` so a malformed
// interpolation expression is one uniform diagnostic stream with the
// literal-scan diagnostics.
export function parseInterpolationBody(bodyText, ctx) {
    if (bodyText === undefined || bodyText === null) return null;
    if (bodyText.trim().length === 0) return null;
    const tokens = lex(bodyText);
    const result = parseExpr(tokens);
    if (result.errors !== undefined && result.errors !== null) {
        let i = 0;
        while (i < result.errors.length) {
            const e = result.errors[i];
            pushDiagnostic(ctx, makeDiagnostic(e.code, e.message, e.span));
            i = i + 1;
        }
    }
    return result.ast;
}

// ===========================================================================
// MK3.2 + MK3.3 — scanDisplayTextLiteral: THE `.Outside` -> `.InLiteralText`
// -> `.Outside` LITERAL SCAN (SPEC §4.18.3 / §4.18.4 / §4.18.5).
//
// This is the live-surface realization of the DisplayTextLiteral engine's
// `.Outside` / `.InLiteralText` / `.InInterpolation` state-child bodies.
// The cursor MUST be positioned AT the opening `"` (`.Outside` — a `"` is
// the open trigger). The scan:
//
//   1. `.Outside` -> `.InLiteralText`: consume the opening `"`. Anchor the
//      whole-literal span at the `"`.
//   2. `.InLiteralText`: accumulate the current literal-text segment
//      character by character —
//        - `\` introduces an escape (`\"` / `\\` / `\${`) — scanLiteralEscape
//          consumes it; the cooked result joins the segment; a malformed
//          escape records E-PARSE-001;
//        - whitespace (space / tab / newline) is accumulated VERBATIM into
//          the segment (SPEC §4.18.5 — no collapse, no strip);
//        - `'` and a backtick are ORDINARY characters — accumulated, no
//          transition (SPEC §4.18.3);
//        - an un-escaped `${` opens an interpolation — `.InLiteralText` ->
//          `.InInterpolation` (step 2a); the current segment is CLOSED at
//          the `${`;
//        - a `"` closes the literal — `.InLiteralText` -> `.Outside`.
//   2a. `.InInterpolation`: scanInterpolation scans the `${expr}` to its
//      matching `}` (the M1 token-stream brace count) and delegates the
//      body to the M2 JS expression parser. The matching `}` is the
//      `.InInterpolation` -> `.InLiteralText` transition; a NEW literal-
//      text segment begins after it. The parsed expression is pushed to
//      `exprs`.
//   3. `.InLiteralText` -> `.Outside`: consume the closing `"`. The
//      whole-literal span extends through it.
//
//   Unterminated literal: EOF reached before the closing `"`. SPEC §4.18.3
//   / §4.18.7 — E-CTX-001 against the OPENING `"`; recover by treating the
//   captured text (opening `"` through EOF) as the literal's content.
//
// A display-text literal carrying N interpolations is ONE node — the
// `{ segments, exprs }` §4.18.4 / D3 Template-node shape: `segments` has
// N+1 entries, `exprs` has N, render order segment[0] expr[0] segment[1]
// … segment[N]. A non-interpolation literal (the every-§4.18.3-worked-
// example case) is a one-segment, empty-`exprs` node.
//
// Returns { node, stoppedAtInterp }:
//   - `node` — the DisplayTextLiteralNode (one or more segments);
//   - `stoppedAtInterp` — RETAINED for caller-shape stability; MK3.3's
//     scan consumes interpolations in-line, so a clean scan always
//     returns `false` (the literal is fully consumed). The field is kept
//     so existing callers' destructuring does not break; a future caller
//     that wants the interpolation-resume seam reads it.
// ===========================================================================
export function scanDisplayTextLiteral(cursor, ctx) {
    // The opening `"` MUST be at the cursor — the `.Outside` open trigger.
    // A defensive guard: if it is not, produce an empty unterminated node
    // at the cursor and do not advance (the caller's loop sentinel handles
    // progress). The trampoline only calls this when a `"` is recognized,
    // so this branch is unreachable in normal operation.
    const openPos = cursor.pos;
    const openLine = cursor.line;
    const openCol = cursor.col;
    if (peekChar(cursor, 0) !== doubleQuote()) {
        const span = makeSpan(openPos, openPos, openLine, openCol);
        return {
            node: makeDisplayTextLiteralNode(
                [makeLiteralSegment("", "")], [], span, false),
            stoppedAtInterp: false,
        };
    }

    // 1. `.Outside` -> `.InLiteralText`: consume the opening `"`.
    advance(cursor, 1);

    // The interleaved segments + exprs (the §4.18.4 template shape). A
    // segment is opened at `segmentStart`; an interpolation (or the
    // closing `"` / EOF) closes it; `flushSegment` pushes the `{raw,cooked}`.
    const segments = [];
    const exprs = [];
    let segmentStart = cursor.pos;
    let cooked = "";
    let terminated = false;

    while (!isEof(cursor)) {
        const c = peekChar(cursor, 0);

        // A `\` introduces an escape (`\"` / `\\` / `\${`).
        if (c === backslash()) {
            const escapePos = cursor.pos;
            const escapeLine = cursor.line;
            const escapeCol = cursor.col;
            const esc = scanLiteralEscape(cursor);
            cooked = cooked + esc.cooked;
            if (esc.malformed) {
                // SPEC §4.18.3 — a `\` before a char other than `"` / `\`
                // / `${` is a malformed escape. E-PARSE-001, blamed at the
                // `\`; the `\` is recovered as a literal backslash.
                pushDiagnostic(ctx, makeDiagnostic(
                    "E-PARSE-001",
                    "Malformed escape in display-text literal — a backslash " +
                    "may only introduce escaped-quote , escaped-backslash , " +
                    "or escaped-dollar-brace .",
                    makeSpan(escapePos, cursor.pos, escapeLine, escapeCol),
                ));
            }
            continue;
        }

        // A `"` closes the literal — `.InLiteralText` -> `.Outside`.
        if (c === doubleQuote()) {
            terminated = true;
            break;
        }

        // An un-escaped `${` opens an interpolation — `.InLiteralText` ->
        // `.InInterpolation` (SPEC §4.18.4). The current literal-text
        // segment ends here; scanInterpolation consumes the `${expr}` and
        // delegates the body to the M2 expression parser; a NEW segment
        // begins after the matching `}`.
        if (peekStr(cursor, 2) === interpolationOpen()) {
            // Close the current segment at the `${`.
            const raw = cursor.source.substring(segmentStart, cursor.pos);
            segments.push(makeLiteralSegment(raw, cooked));

            // Scan the interpolation + delegate the body to M2.
            const interp = scanInterpolation(cursor, ctx);
            exprs.push(interp.expr);

            // An unterminated interpolation consumed to EOF — the literal
            // cannot terminate. `.InInterpolation` -> `.InLiteralText`:
            // begin a fresh segment after the matching `}`.
            segmentStart = cursor.pos;
            cooked = "";
            continue;
        }

        // Ordinary literal character — accumulated VERBATIM. This branch
        // covers whitespace (space / tab / newline — SPEC §4.18.5 verbatim,
        // no collapse / strip) AND `'` / a backtick (SPEC §4.18.3 —
        // ordinary interior characters, no delimiter role, no transition).
        cooked = cooked + c;
        advance(cursor, 1);
    }

    // Close the final literal-text segment — the run from `segmentStart`
    // (the opening `"` for a no-interpolation literal, or one past the
    // last interpolation's `}`) to the cursor. The verbatim source —
    // escapes UNRESOLVED, every whitespace byte exactly as written
    // (SPEC §4.18.5).
    const finalRaw = cursor.source.substring(segmentStart, cursor.pos);
    segments.push(makeLiteralSegment(finalRaw, cooked));

    // 3. `.InLiteralText` -> `.Outside`: consume the closing `"` (only when
    //    the literal was terminated — an unterminated literal has no `"`
    //    here to consume).
    if (terminated) {
        advance(cursor, 1);
    }

    // The whole-literal span: the opening `"` through the closing `"` (or
    // through EOF for an unterminated literal).
    const span = makeSpan(openPos, cursor.pos, openLine, openCol);

    // Unterminated — EOF reached before the closing `"`. SPEC §4.18.3 /
    // §4.18.7 — E-CTX-001 against the OPENING `"`; the captured text is
    // the literal's content (recovery — the scan already captured it).
    if (!terminated) {
        pushDiagnostic(ctx, makeDiagnostic(
            "E-CTX-001",
            "Unterminated display-text literal — no closing quote before " +
            "end of input.",
            makeSpan(openPos, openPos, openLine, openCol),
        ));
    }

    const node = makeDisplayTextLiteralNode(segments, exprs, span, terminated);
    return { node, stoppedAtInterp: false };
}
