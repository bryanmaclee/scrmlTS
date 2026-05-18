// lex-in-double-string.js — JS-host shadow of lex-in-double-string.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors lex-in-double-string.scrml's header.

import { peekChar, advance, isEof } from "./cursor.js";
import { makeToken, TokenKind, QuoteKind } from "./token.js";
import { makeSpan } from "./span.js";
import { LexMode, setMode } from "./lex-mode.js";
import { scanStringEscape } from "./lex-in-single-string.js";

// --- scanDoubleQuotedString ---
export function scanDoubleQuotedString(cursor) {
    const start = cursor.pos;
    const line = cursor.line;
    const col = cursor.col;

    advance(cursor, 1); // consume opening "
    let cooked = "";

    while (!isEof(cursor)) {
        const c = peekChar(cursor, 0);
        if (c === "\\") {
            cooked = cooked + scanStringEscape(cursor);
            continue;
        }
        if (c === "\"") {
            advance(cursor, 1);
            break;
        }
        cooked = cooked + c;
        advance(cursor, 1);
    }

    const raw = cursor.source.substring(start, cursor.pos);
    return { raw, cooked, span: makeSpan(start, cursor.pos, line, col) };
}

// --- dispatchInDoubleString — state-aware wrapper ---
export function dispatchInDoubleString(cursor, ctx) {
    setMode(ctx, LexMode.InDoubleString);
    const { raw, cooked, span } = scanDoubleQuotedString(cursor);
    ctx.tokens.push(makeToken(TokenKind.StringLit, raw, span, { raw, cooked, quote: QuoteKind.Double }));
    setMode(ctx, LexMode.InCode);
}
