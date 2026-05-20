// parse-expr.js — JS-host shadow of parse-expr.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors parse-expr.scrml's header — see that file.
//
// SCOPE — M2.1: PRIMARY EXPRESSIONS ONLY. parseExpression is the single
// recursion seam (== parsePrimary at M2.1; widened by M2.2-M2.4). See the
// .scrml header for the full extension-point map.

import { makeTokenCursor, current, currentKind, peek, peekKind, advance, atEnd, snapshot, restore } from "./token-cursor.js";
import { TokenKind } from "./token.js";
import { makeSpan } from "./span.js";
import { ParseMode, initialParseMode, getParseMode, setParseMode, enterMode, exitMode } from "./parse-mode.js";
import {
    makeIdent, makeNumberLit, makeStringLit, makeBoolLit, makeRegexLit,
    makeTemplateLit, makeTemplateQuasi, makeAtCell, makeBareVariant,
    makeArray, makeArrayItem, makeArraySpread, makeArrayHole,
    makeObject, makeObjectKeyValue, makeObjectShorthand, makeObjectSpread,
    makeParen,
} from "./ast-expr.js";

// --- makeParseExprContext — parser state constructor ---
export function makeParseExprContext(tokens) {
    return {
        cursor:           makeTokenCursor(tokens),
        currentParseMode: initialParseMode(),
        errors:           [],
    };
}

export function recordError(ctx, code, message, span) {
    ctx.errors.push({ code, message, span });
}

// --- parseExpression — the single recursion seam (M2.1: == parsePrimary) ---
export function parseExpression(ctx) {
    return parsePrimary(ctx);
}

// --- parsePrimary — parse one primary expression; dispatch on token kind ---
export function parsePrimary(ctx) {
    const cursor = ctx.cursor;
    const kind = currentKind(cursor);

    // Numeric literal
    if (kind === TokenKind.NumberLit) {
        const tok = advance(cursor);
        return makeNumberLit(tok.value, tok.text, tok.span);
    }

    // String literal
    if (kind === TokenKind.StringLit) {
        const tok = advance(cursor);
        return makeStringLit(tok.cooked, tok.text, tok.span);
    }

    // Boolean literal — true / false
    if (kind === TokenKind.KwTrue) {
        const tok = advance(cursor);
        return makeBoolLit(true, tok.span);
    }
    if (kind === TokenKind.KwFalse) {
        const tok = advance(cursor);
        return makeBoolLit(false, tok.span);
    }

    // Regex literal
    if (kind === TokenKind.RegexLit) {
        const tok = advance(cursor);
        return makeRegexLit(tok.pattern, tok.flags, tok.text, tok.span);
    }

    // Template literal
    if (kind === TokenKind.TemplateChunk) {
        return parseTemplateLiteral(ctx);
    }

    // Identifier
    if (kind === TokenKind.Ident) {
        const tok = advance(cursor);
        return makeIdent(tok.name, tok.span);
    }

    // @-cell
    if (kind === TokenKind.ScrmlAt) {
        const tok = advance(cursor);
        return makeAtCell(tok.name, tok.span);
    }

    // Bare variant .X
    if (kind === TokenKind.BareVariant) {
        const tok = advance(cursor);
        return makeBareVariant(tok.name, tok.span);
    }

    // Parenthesized expression ( expr )
    if (kind === TokenKind.LParen) {
        return parseParenExpression(ctx);
    }

    // Array literal [ ... ]
    if (kind === TokenKind.LBracket) {
        return parseArrayLiteral(ctx);
    }

    // Object literal { ... }
    if (kind === TokenKind.LBrace) {
        return parseObjectLiteral(ctx);
    }

    // Unrecognized
    const here = current(cursor);
    const span = (here === undefined || here === null) ? makeSpan(0, 0, 1, 1) : here.span;
    recordError(ctx, "E-EXPR-UNEXPECTED", "unexpected token in expression position: " + String(kind), span);
    return null;
}

// --- parseParenExpression — ( expr ) ---
export function parseParenExpression(ctx) {
    const cursor = ctx.cursor;
    const open = advance(cursor);   // consume (
    const prior = enterMode(ctx, ParseMode.InExpression);
    const inner = parseExpression(ctx);
    exitMode(ctx, prior);
    const endSpan = expectRParen(ctx, open);
    const span = makeSpan(open.span.start, endSpan.end, open.span.line, open.span.col);
    return makeParen(inner, span);
}

// --- parseArrayLiteral — [ elem, elem, ... ] ---
export function parseArrayLiteral(ctx) {
    const cursor = ctx.cursor;
    const open = advance(cursor);   // consume [
    const prior = enterMode(ctx, ParseMode.InArrayLiteral);
    const elements = [];

    while (atEnd(cursor) === false && currentKind(cursor) !== TokenKind.RBracket) {
        // Hole — comma in element position
        if (currentKind(cursor) === TokenKind.Comma) {
            elements.push(makeArrayHole());
            advance(cursor);   // consume the ,
            continue;
        }

        // Spread element ...expr
        if (currentKind(cursor) === TokenKind.Ellipsis) {
            advance(cursor);   // consume ...
            const innerPrior = enterMode(ctx, ParseMode.InExpression);
            const spreadExpr = parseExpression(ctx);
            exitMode(ctx, innerPrior);
            elements.push(makeArraySpread(spreadExpr));
        } else {
            // Plain element expression
            const innerPrior = enterMode(ctx, ParseMode.InExpression);
            const itemExpr = parseExpression(ctx);
            exitMode(ctx, innerPrior);
            elements.push(makeArrayItem(itemExpr));
        }

        // After an element: either a , separator or the closing ]
        if (currentKind(cursor) === TokenKind.Comma) {
            advance(cursor);   // consume the separator ,
        } else {
            break;
        }
    }

    exitMode(ctx, prior);
    const close = expectRBracket(ctx, open);
    const span = makeSpan(open.span.start, close.end, open.span.line, open.span.col);
    return makeArray(elements, span);
}

// --- parseObjectLiteral — { prop, prop, ... } ---
export function parseObjectLiteral(ctx) {
    const cursor = ctx.cursor;
    const open = advance(cursor);   // consume {
    const prior = enterMode(ctx, ParseMode.InObjectLiteral);
    const properties = [];

    while (atEnd(cursor) === false && currentKind(cursor) !== TokenKind.RBrace) {
        // Spread property { ...rest }
        if (currentKind(cursor) === TokenKind.Ellipsis) {
            advance(cursor);   // consume ...
            const innerPrior = enterMode(ctx, ParseMode.InExpression);
            const spreadExpr = parseExpression(ctx);
            exitMode(ctx, innerPrior);
            properties.push(makeObjectSpread(spreadExpr));
        } else {
            const prop = parseObjectProperty(ctx);
            if (prop === undefined || prop === null) {
                break;
            }
            properties.push(prop);
        }

        // After a property: either a , separator or the closing }
        if (currentKind(cursor) === TokenKind.Comma) {
            advance(cursor);   // consume the separator ,
        } else {
            break;
        }
    }

    exitMode(ctx, prior);
    const close = expectRBrace(ctx, open);
    const span = makeSpan(open.span.start, close.end, open.span.line, open.span.col);
    return makeObject(properties, span);
}

// --- parseObjectProperty — one non-spread object-literal property ---
export function parseObjectProperty(ctx) {
    const cursor = ctx.cursor;
    const startKind = currentKind(cursor);

    // Computed key [ expr ] : value
    if (startKind === TokenKind.LBracket) {
        advance(cursor);   // consume [
        const keyPrior = enterMode(ctx, ParseMode.InExpression);
        const keyExpr = parseExpression(ctx);
        exitMode(ctx, keyPrior);
        expectRBracket(ctx, current(cursor));
        if (expectColon(ctx) === false) {
            return null;
        }
        const valuePrior = enterMode(ctx, ParseMode.InExpression);
        const valueExpr = parseExpression(ctx);
        exitMode(ctx, valuePrior);
        return makeObjectKeyValue(keyExpr, valueExpr, true);
    }

    // Identifier / string / number key
    let keyNode = null;
    if (startKind === TokenKind.Ident) {
        const tok = advance(cursor);
        keyNode = makeIdent(tok.name, tok.span);
    } else if (startKind === TokenKind.StringLit) {
        const tok = advance(cursor);
        keyNode = makeStringLit(tok.cooked, tok.text, tok.span);
    } else if (startKind === TokenKind.NumberLit) {
        const tok = advance(cursor);
        keyNode = makeNumberLit(tok.value, tok.text, tok.span);
    } else {
        const here = current(cursor);
        const span = (here === undefined || here === null) ? makeSpan(0, 0, 1, 1) : here.span;
        recordError(ctx, "E-EXPR-OBJECT-KEY", "expected an object-literal property key", span);
        return null;
    }

    const afterKind = currentKind(cursor);

    if (afterKind === TokenKind.Colon) {
        advance(cursor);   // consume :
        const valuePrior = enterMode(ctx, ParseMode.InExpression);
        const valueExpr = parseExpression(ctx);
        exitMode(ctx, valuePrior);
        return makeObjectKeyValue(keyNode, valueExpr, false);
    }

    if (afterKind === TokenKind.Comma || afterKind === TokenKind.RBrace) {
        // Shorthand — legal only for an identifier key
        if (keyNode.kind !== "Ident") {
            recordError(ctx, "E-EXPR-OBJECT-SHORTHAND", "shorthand object property requires an identifier key", keyNode.span);
            return null;
        }
        return makeObjectShorthand(keyNode.name);
    }

    if (afterKind === TokenKind.LParen) {
        recordError(ctx, "E-EXPR-OBJECT-METHOD-UNSUPPORTED", "object-literal methods are parsed at M2.3 (function-body parser)", keyNode.span);
        return null;
    }

    recordError(ctx, "E-EXPR-OBJECT-PROP", "malformed object-literal property", keyNode.span);
    return null;
}

// --- parseTemplateLiteral — reassemble M1's template token run ---
export function parseTemplateLiteral(ctx) {
    const cursor = ctx.cursor;
    const quasis = [];
    const exprs = [];

    const firstChunk = advance(cursor);   // the leading TemplateChunk
    // M1 (lex-in-template.js) absorbs the OPENING backtick before it emits
    // the first TemplateChunk — so the chunk's span starts one char AFTER
    // the backtick. The TemplateLit node's span should cover the whole
    // `...` including both backticks (source-faithful, Acorn-equivalent),
    // so the start backs up one char to the opener. The final chunk's
    // `raw` already includes the closing backtick, so `endPos` covers it.
    const startSpan = firstChunk.span;
    const templateStart = startSpan.start > 0 ? startSpan.start - 1 : 0;
    // The opening backtick sits on the same line as the first chunk, one
    // column earlier.
    const templateCol = startSpan.col > 1 ? startSpan.col - 1 : startSpan.col;
    quasis.push(makeTemplateQuasi(stripTrailingBacktick(firstChunk.raw), firstChunk.cooked));
    let endPos = firstChunk.span.end;

    while (currentKind(cursor) === TokenKind.TemplateInterpStart) {
        advance(cursor);   // consume ${  (TemplateInterpStart)

        const interpPrior = enterMode(ctx, ParseMode.InExpression);
        const interpExpr = parseExpression(ctx);
        exitMode(ctx, interpPrior);
        exprs.push(interpExpr);

        // Consume the closing } (TemplateInterpEnd)
        if (currentKind(cursor) === TokenKind.TemplateInterpEnd) {
            advance(cursor);
        } else {
            const here = current(cursor);
            const span = (here === undefined || here === null) ? startSpan : here.span;
            recordError(ctx, "E-EXPR-TEMPLATE-INTERP", "unterminated template interpolation", span);
            break;
        }

        // The chunk after the interpolation
        if (currentKind(cursor) === TokenKind.TemplateChunk) {
            const chunk = advance(cursor);
            quasis.push(makeTemplateQuasi(stripTrailingBacktick(chunk.raw), chunk.cooked));
            endPos = chunk.span.end;
        } else {
            const here = current(cursor);
            const span = (here === undefined || here === null) ? startSpan : here.span;
            recordError(ctx, "E-EXPR-TEMPLATE-CHUNK", "expected a template chunk after interpolation", span);
            break;
        }
    }

    const span = makeSpan(templateStart, endPos, startSpan.line, templateCol);
    return makeTemplateLit(quasis, exprs, span);
}

// --- stripTrailingBacktick — quasi raw should not include the closing ` ---
export function stripTrailingBacktick(raw) {
    if (raw === undefined || raw === null) {
        return "";
    }
    if (raw.length > 0 && raw.charAt(raw.length - 1) === "`") {
        return raw.substring(0, raw.length - 1);
    }
    return raw;
}

// --- expect* helpers — consume a required closing token ---
export function expectRParen(ctx, opener) {
    const cursor = ctx.cursor;
    if (currentKind(cursor) === TokenKind.RParen) {
        const tok = advance(cursor);
        return tok.span;
    }
    recordError(ctx, "E-EXPR-UNCLOSED-PAREN", "expected ')' to close a parenthesized expression", opener.span);
    return makeSpan(opener.span.end, opener.span.end, opener.span.line, opener.span.col);
}

export function expectRBracket(ctx, opener) {
    const cursor = ctx.cursor;
    if (currentKind(cursor) === TokenKind.RBracket) {
        const tok = advance(cursor);
        return tok.span;
    }
    const oSpan = (opener === undefined || opener === null) ? makeSpan(0, 0, 1, 1) : opener.span;
    recordError(ctx, "E-EXPR-UNCLOSED-BRACKET", "expected ']' to close an array literal", oSpan);
    return makeSpan(oSpan.end, oSpan.end, oSpan.line, oSpan.col);
}

export function expectRBrace(ctx, opener) {
    const cursor = ctx.cursor;
    if (currentKind(cursor) === TokenKind.RBrace) {
        const tok = advance(cursor);
        return tok.span;
    }
    recordError(ctx, "E-EXPR-UNCLOSED-BRACE", "expected '}' to close an object literal", opener.span);
    return makeSpan(opener.span.end, opener.span.end, opener.span.line, opener.span.col);
}

export function expectColon(ctx) {
    const cursor = ctx.cursor;
    if (currentKind(cursor) === TokenKind.Colon) {
        advance(cursor);
        return true;
    }
    const here = current(cursor);
    const span = (here === undefined || here === null) ? makeSpan(0, 0, 1, 1) : here.span;
    recordError(ctx, "E-EXPR-EXPECTED-COLON", "expected ':' in object-literal property", span);
    return false;
}

// --- parseExpr — the M2.1 entry point ---
export function parseExpr(tokens) {
    const ctx = makeParseExprContext(tokens);
    const ast = parseExpression(ctx);
    return { ast, errors: ctx.errors };
}
