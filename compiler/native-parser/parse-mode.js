// parse-mode.js — JS-host shadow of parse-mode.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors parse-mode.scrml's header — see that file.

export const ParseMode = Object.freeze({
    TopLevel:        "TopLevel",
    InExpression:    "InExpression",
    InArrayLiteral:  "InArrayLiteral",
    InObjectLiteral: "InObjectLiteral",
    InArguments:     "InArguments",
    InFunctionBody:  "InFunctionBody",
    InClassBody:     "InClassBody",
});

export function initialParseMode() {
    return ParseMode.TopLevel;
}

export function setParseMode(ctx, mode) {
    ctx.currentParseMode = mode;
}

export function getParseMode(ctx) {
    return ctx.currentParseMode;
}

export function enterMode(ctx, mode) {
    const prior = ctx.currentParseMode;
    ctx.currentParseMode = mode;
    return prior;
}

export function exitMode(ctx, priorMode) {
    ctx.currentParseMode = priorMode;
}

export const LEGAL_TRANSITIONS = Object.freeze({
    TopLevel: Object.freeze({
        InExpression:    true,
        InArrayLiteral:  true,
        InObjectLiteral: true,
        InFunctionBody:  true,
        InClassBody:     true,
    }),
    InExpression: Object.freeze({
        TopLevel:        true,
        InExpression:    true,
        InArrayLiteral:  true,
        InObjectLiteral: true,
        InArguments:     true,
    }),
    InArrayLiteral: Object.freeze({
        InExpression: true,
        TopLevel:     true,
    }),
    InObjectLiteral: Object.freeze({
        InExpression: true,
        TopLevel:     true,
    }),
    InArguments: Object.freeze({
        InExpression: true,
        TopLevel:     true,
    }),
    InFunctionBody: Object.freeze({
        TopLevel:     true,
        InExpression: true,
    }),
    InClassBody: Object.freeze({
        TopLevel:     true,
        InExpression: true,
    }),
});

export function isLegalParseModeTransition(from, to) {
    const row = LEGAL_TRANSITIONS[from];
    if (row === undefined || row === null) {
        return false;
    }
    return row[to] === true;
}
