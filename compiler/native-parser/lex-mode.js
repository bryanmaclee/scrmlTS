// lex-mode.js — JS-host shadow of lex-mode.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors lex-mode.scrml's header — see that file.

export const LexMode = Object.freeze({
    InCode:          "InCode",
    InTemplateBody:  "InTemplateBody",
    InSingleString:  "InSingleString",
    InDoubleString:  "InDoubleString",
    InLineComment:   "InLineComment",
    InBlockComment:  "InBlockComment",
    InRegexBody:     "InRegexBody",
});

export function initialMode() {
    return LexMode.InCode;
}

export function setMode(ctx, mode) {
    ctx.currentMode = mode;
}

export function getMode(ctx) {
    return ctx.currentMode;
}

export const LEGAL_FROM_IN_CODE = Object.freeze({
    InTemplateBody:  true,
    InSingleString:  true,
    InDoubleString:  true,
    InLineComment:   true,
    InBlockComment:  true,
    InRegexBody:     true,
});
