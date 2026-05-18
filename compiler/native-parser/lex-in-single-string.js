// lex-in-single-string.js — JS-host shadow of lex-in-single-string.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors lex-in-single-string.scrml's header.

import { peekChar, advance, isEof } from "./cursor.js";
import { makeToken, TokenKind, QuoteKind } from "./token.js";
import { makeSpan } from "./span.js";
import { LexMode, setMode } from "./lex-mode.js";

// --- decodeSingleEscapeChar — JS escape table (ECMA-262 §12.8.4) ---
export function decodeSingleEscapeChar(c) {
    if (c === "n")  return "\n";
    if (c === "r")  return "\r";
    if (c === "t")  return "\t";
    if (c === "b")  return "\b";
    if (c === "f")  return "\f";
    if (c === "v")  return "\v";
    if (c === "0")  return "\0";
    if (c === "\\") return "\\";
    if (c === "'")  return "'";
    if (c === "\"") return "\"";
    if (c === "`")  return "`";
    if (c === "/")  return "/";
    return c;
}

// --- scanHexEscape — N hex digits → codepoint string ---
export function scanHexEscape(cursor, digitCount) {
    let hex = "";
    let i = 0;
    while (i < digitCount && !isEof(cursor)) {
        hex = hex + peekChar(cursor, 0);
        advance(cursor, 1);
        i = i + 1;
    }
    const cp = parseInt(hex, 16);
    if (Number.isNaN(cp)) return "";
    return String.fromCodePoint(cp);
}

// --- scanBraceUnicodeEscape — \u{...} brace form ---
export function scanBraceUnicodeEscape(cursor) {
    advance(cursor, 1); // consume {
    let hex = "";
    while (!isEof(cursor) && peekChar(cursor, 0) !== "}") {
        hex = hex + peekChar(cursor, 0);
        advance(cursor, 1);
    }
    if (peekChar(cursor, 0) === "}") {
        advance(cursor, 1);
    }
    const cp = parseInt(hex, 16);
    if (Number.isNaN(cp)) return "";
    return String.fromCodePoint(cp);
}

// --- scanStringEscape — one full escape sequence starting at backslash ---
export function scanStringEscape(cursor) {
    advance(cursor, 1); // consume backslash
    if (isEof(cursor)) return "";
    const c = peekChar(cursor, 0);

    // LineContinuation
    if (c === "\n") { advance(cursor, 1); return ""; }
    if (c === "\r") {
        advance(cursor, 1);
        if (!isEof(cursor) && peekChar(cursor, 0) === "\n") advance(cursor, 1);
        return "";
    }

    // \xHH
    if (c === "x") {
        advance(cursor, 1);
        return scanHexEscape(cursor, 2);
    }

    // \uHHHH or \u{...}
    if (c === "u") {
        advance(cursor, 1);
        if (!isEof(cursor) && peekChar(cursor, 0) === "{") {
            return scanBraceUnicodeEscape(cursor);
        }
        return scanHexEscape(cursor, 4);
    }

    advance(cursor, 1);
    return decodeSingleEscapeChar(c);
}

// --- scanSingleQuotedString ---
export function scanSingleQuotedString(cursor) {
    const start = cursor.pos;
    const line = cursor.line;
    const col = cursor.col;

    advance(cursor, 1); // consume opening '
    let cooked = "";

    while (!isEof(cursor)) {
        const c = peekChar(cursor, 0);
        if (c === "\\") {
            cooked = cooked + scanStringEscape(cursor);
            continue;
        }
        if (c === "'") {
            advance(cursor, 1);
            break;
        }
        cooked = cooked + c;
        advance(cursor, 1);
    }

    const raw = cursor.source.substring(start, cursor.pos);
    return { raw, cooked, span: makeSpan(start, cursor.pos, line, col) };
}

// --- dispatchInSingleString — state-aware wrapper ---
export function dispatchInSingleString(cursor, ctx) {
    setMode(ctx, LexMode.InSingleString);
    const { raw, cooked, span } = scanSingleQuotedString(cursor);
    ctx.tokens.push(makeToken(TokenKind.StringLit, raw, span, { raw, cooked, quote: QuoteKind.Single }));
    setMode(ctx, LexMode.InCode);
}
