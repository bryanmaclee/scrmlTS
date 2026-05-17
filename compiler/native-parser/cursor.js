// cursor.js — JS-host shadow of cursor.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors cursor.scrml's header — see that file.

export function makeCursor(source) {
    return {
        source,
        pos:  0,
        line: 1,
        col:  1,
    };
}

export function peekChar(cursor, k) {
    const offset = cursor.pos + (k ?? 0);
    if (offset >= cursor.source.length) return "";
    return cursor.source.charAt(offset);
}

export function peekCharCode(cursor, k) {
    const offset = cursor.pos + (k ?? 0);
    if (offset >= cursor.source.length) return -1;
    return cursor.source.charCodeAt(offset);
}

export function peekStr(cursor, n) {
    return cursor.source.substr(cursor.pos, n);
}

export function isEof(cursor) {
    return cursor.pos >= cursor.source.length;
}

export function advance(cursor, n) {
    const steps = n ?? 1;
    let i = 0;
    while (i < steps) {
        if (cursor.pos >= cursor.source.length) return;
        const ch = cursor.source.charCodeAt(cursor.pos);
        cursor.pos = cursor.pos + 1;
        if (ch === 10) {
            cursor.line = cursor.line + 1;
            cursor.col = 1;
        } else {
            cursor.col = cursor.col + 1;
        }
        i = i + 1;
    }
}

export function snapshot(cursor) {
    return { pos: cursor.pos, line: cursor.line, col: cursor.col };
}

export function restore(cursor, snap) {
    cursor.pos = snap.pos;
    cursor.line = snap.line;
    cursor.col = snap.col;
}
