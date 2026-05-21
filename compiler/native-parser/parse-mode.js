// parse-mode.js — JS-host shadow of parse-mode.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors parse-mode.scrml's header — see that file.
//
// M4.1 NOTE — async/generator SCOPE is deliberately NOT a ParseMode variant.
// `await`/`yield` legality is the question "is the cursor inside an async /
// generator function body". That is ORTHOGONAL to what ParseMode discriminates
// (which grammar production runs — the `{`-object-vs-block ambiguity, etc.).
// Folding it in would force a combinatorial cross-product
// (InFunctionBody × {sync, async, gen, async-gen}) — the variant explosion
// DD §D3 explicitly rejects. M4.1 carries it as two boolean ctx slots
// (`inAsync`/`inGenerator` — makeParseExprContext / makeParseStmtContext),
// saved+set+restored at every function/arrow entry (the M3.4 `functionDepth`
// pattern). ParseMode is unchanged by M4.1.

export const ParseMode = Object.freeze({
    TopLevel:        "TopLevel",
    InExpression:    "InExpression",
    InArrayLiteral:  "InArrayLiteral",
    InObjectLiteral: "InObjectLiteral",
    InArguments:     "InArguments",
    InFunctionBody:  "InFunctionBody",
    InClassBody:     "InClassBody",
    // InBlock — M3.1 statement-context variant. A `{ ... }` BLOCK statement
    // (a brace-delimited statement list), as distinct from InObjectLiteral
    // (a `{` that opens an object). The classic JS ambiguity — `{` at
    // statement position opens a block; `{` at expression position opens an
    // object literal — IS the condition-dependent dispatch ParseMode exists
    // to carry. The statement parser enters .InBlock for a nested block.
    InBlock:         "InBlock",
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
        InBlock:         true,
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
        InBlock:      true,
    }),
    InClassBody: Object.freeze({
        TopLevel:     true,
        InExpression: true,
    }),
    // InBlock — a block statement is a statement list. From inside a block
    // the parser enters expression context for an expression statement, an
    // inner block for a nested `{}`, a function/class body for a nested
    // declaration; it returns to the prior statement context (TopLevel /
    // InFunctionBody / InBlock) when the block closes.
    InBlock: Object.freeze({
        TopLevel:        true,
        InExpression:    true,
        InArrayLiteral:  true,
        InObjectLiteral: true,
        InFunctionBody:  true,
        InClassBody:     true,
        InBlock:         true,
    }),
});

export function isLegalParseModeTransition(from, to) {
    const row = LEGAL_TRANSITIONS[from];
    if (row === undefined || row === null) {
        return false;
    }
    return row[to] === true;
}
