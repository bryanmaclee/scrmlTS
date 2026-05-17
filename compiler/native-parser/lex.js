// lex.js — JS-host shadow of lex.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors lex.scrml's header — see that file.

import { makeCursor, isEof } from "./cursor.js";
import { makeEof, TokenKind } from "./token.js";
import { LexMode, initialMode, setMode, getMode } from "./lex-mode.js";
import { makeBracketStack } from "./bracket-stack.js";
import { makeRecovery } from "./error-recovery.js";
import { dispatchInCode } from "./lex-in-code.js";

export function makeLexContext() {
    return {
        tokens:       [],
        currentMode:  initialMode(),
        brackets:     makeBracketStack(),
        recovery:     makeRecovery(),
    };
}

export function lex(source) {
    const cursor = makeCursor(source);
    const ctx = makeLexContext();

    const maxIters = (source.length + 1) * 4;
    let iters = 0;

    while (!isEof(cursor) && iters < maxIters) {
        const mode = getMode(ctx);
        const beforePos = cursor.pos;

        if (mode === LexMode.InCode) {
            dispatchInCode(cursor, ctx);
        } else {
            setMode(ctx, LexMode.InCode);
        }

        if (cursor.pos === beforePos && !isEof(cursor)) {
            cursor.pos = cursor.pos + 1;
        }
        iters = iters + 1;
    }

    const last = ctx.tokens.length > 0 ? ctx.tokens[ctx.tokens.length - 1] : null;
    if (last === null || last.kind !== TokenKind.EOF) {
        ctx.tokens.push(makeEof(cursor.pos, cursor.line, cursor.col));
    }

    return ctx.tokens;
}
