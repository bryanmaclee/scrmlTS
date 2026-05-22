// token.js — JS-host shadow of token.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors token.scrml's header — see that file.
//
// S114 K3+K4+K5 update — maximal-munch closure. M1 now emits as a SINGLE
// TokenKind every multi-char operator that JS recognizes as one operator:
// 11 compound-assigns (K3), `?.` optional chain (K4), `#` (K5a `<#id>`-only),
// `::` (K5c). See token.scrml header.

export const TokenKind = Object.freeze({
    LParen:      "LParen",
    RParen:      "RParen",
    LBrace:      "LBrace",
    RBrace:      "RBrace",
    LBracket:    "LBracket",
    RBracket:    "RBracket",
    Semicolon:   "Semicolon",
    Comma:       "Comma",
    Dot:         "Dot",
    Ellipsis:    "Ellipsis",
    Arrow:       "Arrow",
    Colon:       "Colon",
    Question:    "Question",
    // K5a/K5c maximal-munch additions:
    Hash:        "Hash",                // `#` — surfaces in `<#id>` per §36 (S114 K5a)
    DoubleColon: "DoubleColon",         // `::` member-access alias per §14.4 (S114 K5c)
    // K4 maximal-munch addition:
    OptionalChain: "OptionalChain",     // `?.` optional-chain operator (S114 K4)

    Assign:                 "Assign",
    PlusAssign:             "PlusAssign",
    MinusAssign:            "MinusAssign",
    StarAssign:             "StarAssign",
    SlashAssign:            "SlashAssign",
    // K3 maximal-munch additions — 11 compound-assigns previously emitted
    // as two adjacent tokens (re-composed at the parse layer in M2.2's
    // TWO_TOKEN_ASSIGN_OPS table). The lexer now emits each as a single
    // token; the parse layer's re-composition is RETIRED.
    PercentAssign:                "PercentAssign",                  // %=
    StarStarAssign:               "StarStarAssign",                 // **=
    BitShiftLeftAssign:           "BitShiftLeftAssign",             // <<=
    BitShiftRightAssign:          "BitShiftRightAssign",            // >>=
    BitShiftRightUnsignedAssign:  "BitShiftRightUnsignedAssign",    // >>>=
    BitAndAssign:                 "BitAndAssign",                   // &=
    BitOrAssign:                  "BitOrAssign",                    // |=
    BitXorAssign:                 "BitXorAssign",                   // ^=
    LogicalAndAssign:             "LogicalAndAssign",               // &&=
    LogicalOrAssign:              "LogicalOrAssign",                // ||=
    NullishCoalesceAssign:        "NullishCoalesceAssign",          // ??=
    Plus:                   "Plus",
    Minus:                  "Minus",
    Star:                   "Star",
    Slash:                  "Slash",
    Percent:                "Percent",
    StarStar:               "StarStar",
    Equal:                  "Equal",
    NotEqual:               "NotEqual",
    StrictEqual:            "StrictEqual",
    StrictNotEqual:         "StrictNotEqual",
    LessThan:               "LessThan",
    LessEqual:              "LessEqual",
    GreaterThan:            "GreaterThan",
    GreaterEqual:           "GreaterEqual",
    LogicalAnd:             "LogicalAnd",
    LogicalOr:              "LogicalOr",
    NullishCoalesce:        "NullishCoalesce",
    BitAnd:                 "BitAnd",
    BitOr:                  "BitOr",
    BitXor:                 "BitXor",
    BitNot:                 "BitNot",
    BitShiftLeft:           "BitShiftLeft",
    BitShiftRight:          "BitShiftRight",
    BitShiftRightUnsigned:  "BitShiftRightUnsigned",
    Increment:              "Increment",
    Decrement:              "Decrement",
    Bang:                   "Bang",

    KwIf:         "KwIf",
    KwElse:       "KwElse",
    KwFor:        "KwFor",
    KwWhile:      "KwWhile",
    KwDoWhile:    "KwDoWhile",
    KwReturn:     "KwReturn",
    KwBreak:      "KwBreak",
    KwContinue:   "KwContinue",
    KwFunction:   "KwFunction",
    KwLet:        "KwLet",
    KwConst:      "KwConst",
    KwVar:        "KwVar",
    KwClass:      "KwClass",
    KwExtends:    "KwExtends",
    KwNew:        "KwNew",
    KwImport:     "KwImport",
    KwExport:     "KwExport",
    KwFrom:       "KwFrom",
    KwAs:         "KwAs",
    KwDefault:    "KwDefault",
    KwAsync:      "KwAsync",
    KwAwait:      "KwAwait",
    KwYield:      "KwYield",
    KwTry:        "KwTry",
    KwCatch:      "KwCatch",
    KwFinally:    "KwFinally",
    KwThrow:      "KwThrow",
    KwTrue:       "KwTrue",
    KwFalse:      "KwFalse",
    KwNull:       "KwNull",
    KwUndefined:  "KwUndefined",
    KwTypeof:     "KwTypeof",
    KwInstanceof: "KwInstanceof",
    KwIn:         "KwIn",
    KwOf:         "KwOf",
    KwVoid:       "KwVoid",
    KwDelete:     "KwDelete",
    KwThis:       "KwThis",
    KwSuper:      "KwSuper",

    KwIs:         "KwIs",
    KwNot:        "KwNot",
    KwMatch:      "KwMatch",
    KwLift:       "KwLift",
    KwFail:       "KwFail",
    KwRender:     "KwRender",
    KwGiven:      "KwGiven",
    KwSome:       "KwSome",
    // M5-swap Wave 1 — core scrml declaration / function keywords.
    // B4: `lin` linear-binding declaration (SPEC §35.2).
    // B5: `type` declaration — struct / enum / alias (SPEC §14).
    // B6: `fn` shorthand-function + `server` / `pure` function modifiers
    //     (SPEC §48 / §48.6.4). The native parser was a JS subset (M1-M4)
    //     and knew only `function`; these are the scrml-extension keywords.
    KwLin:        "KwLin",
    KwType:       "KwType",
    KwFn:         "KwFn",
    KwServer:     "KwServer",
    KwPure:       "KwPure",

    NumberLit:    "NumberLit",
    StringLit:    "StringLit",
    TemplateChunk:"TemplateChunk",
    TemplateInterpStart: "TemplateInterpStart",
    TemplateInterpEnd:   "TemplateInterpEnd",
    RegexLit:     "RegexLit",
    BoolLit:      "BoolLit",

    Ident:        "Ident",

    BareVariant:    "BareVariant",
    ScrmlAt:        "ScrmlAt",
    SqlBlock:       "SqlBlock",
    InputStateRef:  "InputStateRef",
    Tilde:          "Tilde",
    LogicEscapeOpen:  "LogicEscapeOpen",
    LogicEscapeClose: "LogicEscapeClose",

    Newline:    "Newline",
    Whitespace: "Whitespace",
    EOF:        "EOF",
});

export const QuoteKind = Object.freeze({
    Single:   "Single",
    Double:   "Double",
    Backtick: "Backtick",
});

export const JS_KEYWORDS = Object.freeze({
    "if":         TokenKind.KwIf,
    "else":       TokenKind.KwElse,
    "for":        TokenKind.KwFor,
    "while":      TokenKind.KwWhile,
    "do":         TokenKind.KwDoWhile,
    "return":     TokenKind.KwReturn,
    "break":      TokenKind.KwBreak,
    "continue":   TokenKind.KwContinue,
    "function":   TokenKind.KwFunction,
    "let":        TokenKind.KwLet,
    "const":      TokenKind.KwConst,
    "var":        TokenKind.KwVar,
    "class":      TokenKind.KwClass,
    "extends":    TokenKind.KwExtends,
    "new":        TokenKind.KwNew,
    "import":     TokenKind.KwImport,
    "export":     TokenKind.KwExport,
    "from":       TokenKind.KwFrom,
    "as":         TokenKind.KwAs,
    "default":    TokenKind.KwDefault,
    "async":      TokenKind.KwAsync,
    "await":      TokenKind.KwAwait,
    "yield":      TokenKind.KwYield,
    "try":        TokenKind.KwTry,
    "catch":      TokenKind.KwCatch,
    "finally":    TokenKind.KwFinally,
    "throw":      TokenKind.KwThrow,
    "true":       TokenKind.KwTrue,
    "false":      TokenKind.KwFalse,
    "null":       TokenKind.KwNull,
    "undefined":  TokenKind.KwUndefined,
    "typeof":     TokenKind.KwTypeof,
    "instanceof": TokenKind.KwInstanceof,
    "in":         TokenKind.KwIn,
    "of":         TokenKind.KwOf,
    "void":       TokenKind.KwVoid,
    "delete":     TokenKind.KwDelete,
    "this":       TokenKind.KwThis,
    "super":      TokenKind.KwSuper,
    "is":         TokenKind.KwIs,
    "not":        TokenKind.KwNot,
    "match":      TokenKind.KwMatch,
    "lift":       TokenKind.KwLift,
    "fail":       TokenKind.KwFail,
    "render":     TokenKind.KwRender,
    "given":      TokenKind.KwGiven,
    "some":       TokenKind.KwSome,
    // M5-swap Wave 1 — core scrml declaration / function keywords (B4/B5/B6).
    // A keyword here lexes the bareword to its `Kw*` TokenKind; the statement
    // grammar (parse-stmt.js) dispatches the matching declaration production.
    // A keyword used as a member-property name (`obj.type`, `?.fn`) is still
    // accepted — `parseMemberProperty` admits any keyword as a property name.
    //
    // P5-9 — `type` is NOT in this table. `type` is a CONTEXTUAL keyword: a
    // type-declaration lead ONLY at statement position (SPEC §14). Everywhere
    // else (`const type = …` binding name, a `fn g(type)` parameter name, an
    // object-literal key) it is an ordinary identifier — the live Acorn-based
    // front end treats it so. Lexing `type` as a hard `KwType` corrupted ANY
    // file using `type` as a name. It is lexed as an `Ident` carrying a
    // `ctxKw: "type"` marker (CONTEXTUAL_KEYWORDS below); parse-stmt.js's
    // statement dispatch recognises a statement-position `type` decl lead on
    // that marker. `typeof` (KwTypeof) is a genuine HARD keyword — unaffected.
    "lin":        TokenKind.KwLin,
    "fn":         TokenKind.KwFn,
    "server":     TokenKind.KwServer,
    "pure":       TokenKind.KwPure,
});

// CONTEXTUAL_KEYWORDS — barewords that are a keyword ONLY in a specific
// grammatical position and a plain identifier everywhere else. Each lexes as
// a `TokenKind.Ident` carrying a `ctxKw` payload field naming the contextual
// keyword; the parse layer decides — by position — whether the keyword
// reading applies. `type` (SPEC §14) is the sole entry: a type-declaration
// lead at statement position, an ordinary identifier otherwise.
export const CONTEXTUAL_KEYWORDS = Object.freeze({
    "type": "type",
});

export function makeToken(kind, text, span, payload) {
    return { kind, text, span, ...(payload ?? {}) };
}

export function makeIdentOrKeyword(text, span) {
    // OWN-property guard — `JS_KEYWORDS` is a plain object, so a bare
    // `JS_KEYWORDS[text]` for an identifier named `constructor` / `toString`
    // / `valueOf` / `hasOwnProperty` / `__proto__` (etc.) would resolve to an
    // inherited `Object.prototype` member instead of `undefined`, mis-lexing
    // that identifier to a non-string `kind`. hasOwnProperty.call restricts
    // the lookup to the keyword table's OWN entries.
    if (Object.prototype.hasOwnProperty.call(JS_KEYWORDS, text) === false) {
        // A contextual keyword (`type`) lexes as an `Ident` carrying a `ctxKw`
        // payload field — the parse layer decides, by position, whether the
        // keyword reading applies. A plain identifier carries no `ctxKw`.
        if (Object.prototype.hasOwnProperty.call(CONTEXTUAL_KEYWORDS, text)) {
            return makeToken(TokenKind.Ident, text, span,
                { name: text, ctxKw: CONTEXTUAL_KEYWORDS[text] });
        }
        return makeToken(TokenKind.Ident, text, span, { name: text });
    }
    const kw = JS_KEYWORDS[text];
    return makeToken(kw, text, span, {});
}

export function makeEof(pos, line, col) {
    return makeToken(TokenKind.EOF, "", { start: pos, end: pos, line, col }, {});
}
