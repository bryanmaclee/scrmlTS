// lex-in-template.js — JS-host shadow of lex-in-template.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors lex-in-template.scrml's header.
//
// §51.0.Q.1 NESTED-ENGINE PATTERN — see lex-in-template.scrml header for
// the canonical scrml-source shape this shadow mirrors.

import { peekChar, advance, isEof } from "./cursor.js";
import { makeToken, TokenKind } from "./token.js";
import { makeSpan } from "./span.js";
import { LexMode, setMode, getMode } from "./lex-mode.js";
import { scanStringEscape } from "./lex-in-single-string.js";
import { depth as bracketStackDepth } from "./bracket-stack.js";

// --- ensureTemplateStack — lazy init the per-ctx template stack ---
export function ensureTemplateStack(ctx) {
    if (ctx.templateStack === undefined || ctx.templateStack === null) {
        ctx.templateStack = [];
    }
}

export function pushTemplateFrame(ctx, bracketDepthAtOpen) {
    ensureTemplateStack(ctx);
    ctx.templateStack.push({ bracketDepthAtOpen });
}

export function popTemplateFrame(ctx) {
    ensureTemplateStack(ctx);
    if (ctx.templateStack.length === 0) return null;
    return ctx.templateStack.pop();
}

export function topTemplateFrame(ctx) {
    ensureTemplateStack(ctx);
    if (ctx.templateStack.length === 0) return null;
    return ctx.templateStack[ctx.templateStack.length - 1];
}

// --- isTemplateInterpClose — predicate for "is this } the interp closer?" ---
export function isTemplateInterpClose(cursor, ctx) {
    if (getMode(ctx) !== LexMode.InCode) return false;
    ensureTemplateStack(ctx);
    if (ctx.templateStack.length === 0) return false;
    const frame = ctx.templateStack[ctx.templateStack.length - 1];
    if (peekChar(cursor, 0) !== "}") return false;
    return bracketStackDepth(ctx.brackets) === frame.bracketDepthAtOpen;
}

// --- emitTemplateInterpClose — emits TemplateInterpEnd + state transitions ---
export function emitTemplateInterpClose(cursor, ctx) {
    const startPos = cursor.pos;
    const startLine = cursor.line;
    const startCol = cursor.col;
    advance(cursor, 1); // consume the closing }
    ctx.tokens.push(makeToken(
        TokenKind.TemplateInterpEnd,
        "}",
        makeSpan(startPos, cursor.pos, startLine, startCol),
        {},
    ));
    popTemplateFrame(ctx);
    setMode(ctx, LexMode.InTemplateBody);
}

// --- scanTemplateChunk — bytes between ` / `}` and next ` or ${ ---
export function scanTemplateChunk(cursor) {
    const start = cursor.pos;
    const line = cursor.line;
    const col = cursor.col;
    let cooked = "";
    let terminator = "eof";

    while (!isEof(cursor)) {
        const c = peekChar(cursor, 0);
        if (c === "\\") {
            cooked = cooked + scanStringEscape(cursor);
            continue;
        }
        if (c === "`") {
            advance(cursor, 1);
            terminator = "backtick";
            break;
        }
        if (c === "$" && peekChar(cursor, 1) === "{") {
            terminator = "interp";
            break;
        }
        cooked = cooked + c;
        advance(cursor, 1);
    }

    const raw = cursor.source.substring(start, cursor.pos);
    return { raw, cooked, span: makeSpan(start, cursor.pos, line, col), terminator };
}

// --- dispatchInTemplateBody — top-level entry for InTemplateBody mode ---
export function dispatchInTemplateBody(cursor, ctx) {
    const { raw, cooked, span, terminator } = scanTemplateChunk(cursor);

    ctx.tokens.push(makeToken(TokenKind.TemplateChunk, raw, span, { raw, cooked }));

    if (terminator === "backtick") {
        setMode(ctx, LexMode.InCode);
        return;
    }

    if (terminator === "interp") {
        const interpStartPos = cursor.pos;
        const interpStartLine = cursor.line;
        const interpStartCol = cursor.col;
        advance(cursor, 2); // consume ${
        ctx.tokens.push(makeToken(
            TokenKind.TemplateInterpStart,
            "${",
            makeSpan(interpStartPos, cursor.pos, interpStartLine, interpStartCol),
            {},
        ));
        pushTemplateFrame(ctx, bracketStackDepth(ctx.brackets));
        setMode(ctx, LexMode.InCode);
        return;
    }

    // terminator === "eof" — unterminated template; loop sentinel + EOF emit close out.
}
