// span.js — JS-host shadow of span.scrml.
//
// Per the M1.1 dispatch contract, the .scrml file carries the canonical
// scrml-source SHAPE (Pillar 5b reference; M4+ swap-in target); the .js
// file carries the executable LIVE SURFACE today. The two are kept 1:1.
//
// Driver of this duplication: the v0.3 compiler currently strips function
// bodies from `export function`s declared in `${...}` JS-escape blocks in
// SPA-shape .scrml files (the dispatched-from compiler limitation; not a
// bug to fix in this dispatch). The .scrml file is therefore declarative-
// only at the live layer today; the .js file is what test code imports.
//
// PILLAR 5b classification mirrors span.scrml's header — see that file.

export function makeSpan(start, end, line, col) {
    return { start, end, line, col };
}

export function extendSpan(span, newEnd) {
    return { start: span.start, end: newEnd, line: span.line, col: span.col };
}

export function pointSpan(pos, line, col) {
    return { start: pos, end: pos, line, col };
}
