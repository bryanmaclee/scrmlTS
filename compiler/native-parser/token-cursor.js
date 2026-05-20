// token-cursor.js — JS-host shadow of token-cursor.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors token-cursor.scrml's header — see that file.

import { TokenKind } from "./token.js";

export function makeTokenCursor(tokens) {
    return {
        tokens,
        idx: 0,
    };
}

export function tokenCount(cursor) {
    return cursor.tokens.length;
}

export function atEnd(cursor) {
    if (cursor.idx >= cursor.tokens.length) {
        return true;
    }
    return cursor.tokens[cursor.idx].kind === TokenKind.EOF;
}

export function peek(cursor, k) {
    const offset = cursor.idx + (k ?? 0);
    if (offset >= cursor.tokens.length) {
        if (cursor.tokens.length === 0) {
            return null;
        }
        return cursor.tokens[cursor.tokens.length - 1];
    }
    if (offset < 0) {
        return cursor.tokens[0];
    }
    return cursor.tokens[offset];
}

export function current(cursor) {
    return peek(cursor, 0);
}

export function peekKind(cursor, k) {
    const tok = peek(cursor, k);
    if (tok === undefined || tok === null) {
        return TokenKind.EOF;
    }
    return tok.kind;
}

export function currentKind(cursor) {
    return peekKind(cursor, 0);
}

export function isKind(cursor, kind) {
    return currentKind(cursor) === kind;
}

export function isKindAt(cursor, k, kind) {
    return peekKind(cursor, k) === kind;
}

export function advance(cursor, n) {
    const steps = n ?? 1;
    const consumed = current(cursor);
    let i = 0;
    while (i < steps) {
        if (cursor.idx < cursor.tokens.length - 1) {
            cursor.idx = cursor.idx + 1;
        }
        i = i + 1;
    }
    return consumed;
}

export function snapshot(cursor) {
    return { idx: cursor.idx };
}

export function restore(cursor, snap) {
    cursor.idx = snap.idx;
}
