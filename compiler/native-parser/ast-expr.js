// ast-expr.js — JS-host shadow of ast-expr.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors ast-expr.scrml's header — see that file.

export const ExprKind = Object.freeze({
    // Primary — literals
    Ident:       "Ident",
    NumberLit:   "NumberLit",
    StringLit:   "StringLit",
    BoolLit:     "BoolLit",
    RegexLit:    "RegexLit",
    TemplateLit: "TemplateLit",

    // Primary — scrml extensions surfaced by M1
    AtCell:      "AtCell",
    BareVariant: "BareVariant",

    // Primary — composite
    Array:  "Array",
    Object: "Object",
    Paren:  "Paren",

    // Operators (M2.2)
    Unary:       "Unary",
    Update:      "Update",
    Binary:      "Binary",
    Logical:     "Logical",
    Assignment:  "Assignment",
    Conditional: "Conditional",
    Sequence:    "Sequence",

    // Call / member / arrow / function (M2.3)
    Call:     "Call",
    New:      "New",
    Member:   "Member",
    Arrow:    "Arrow",
    Function: "Function",
});

export const ArrayElementKind = Object.freeze({
    Item:   "Item",
    Spread: "Spread",
    Hole:   "Hole",
});

export const ObjectPropertyKind = Object.freeze({
    KeyValue:  "KeyValue",
    Shorthand: "Shorthand",
    Spread:    "Spread",
});

// --- Primary-expression node constructors ---

export function makeIdent(name, span) {
    return { kind: ExprKind.Ident, name, span };
}

export function makeNumberLit(value, raw, span) {
    return { kind: ExprKind.NumberLit, value, raw, span };
}

export function makeStringLit(value, raw, span) {
    return { kind: ExprKind.StringLit, value, raw, span };
}

export function makeBoolLit(value, span) {
    return { kind: ExprKind.BoolLit, value, span };
}

export function makeRegexLit(pattern, flags, raw, span) {
    return { kind: ExprKind.RegexLit, pattern, flags, raw, span };
}

export function makeTemplateLit(quasis, exprs, span) {
    return { kind: ExprKind.TemplateLit, quasis, exprs, span };
}

export function makeTemplateQuasi(raw, cooked) {
    return { raw, cooked };
}

export function makeAtCell(name, span) {
    return { kind: ExprKind.AtCell, name, span };
}

export function makeBareVariant(name, span) {
    return { kind: ExprKind.BareVariant, name, span };
}

export function makeArray(elements, span) {
    return { kind: ExprKind.Array, elements, span };
}

export function makeObject(properties, span) {
    return { kind: ExprKind.Object, properties, span };
}

export function makeParen(expression, span) {
    return { kind: ExprKind.Paren, expression, span };
}

// --- Array-element constructors ---
export function makeArrayItem(expression) {
    return { kind: ArrayElementKind.Item, expression };
}
export function makeArraySpread(expression) {
    return { kind: ArrayElementKind.Spread, expression };
}
export function makeArrayHole() {
    return { kind: ArrayElementKind.Hole };
}

// --- Object-property constructors ---
export function makeObjectKeyValue(key, value, computed) {
    return { kind: ObjectPropertyKind.KeyValue, key, value, computed };
}
export function makeObjectShorthand(name) {
    return { kind: ObjectPropertyKind.Shorthand, name };
}
export function makeObjectSpread(expression) {
    return { kind: ObjectPropertyKind.Spread, expression };
}

// --- Operator / call / member node constructors (M2.2-M2.4 — catalog) ---

export function makeUnary(op, operand, prefix, span) {
    return { kind: ExprKind.Unary, op, operand, prefix, span };
}
export function makeUpdate(op, operand, prefix, span) {
    return { kind: ExprKind.Update, op, operand, prefix, span };
}
export function makeBinary(op, left, right, span) {
    return { kind: ExprKind.Binary, op, left, right, span };
}
export function makeLogical(op, left, right, span) {
    return { kind: ExprKind.Logical, op, left, right, span };
}
export function makeAssignment(op, target, value, span) {
    return { kind: ExprKind.Assignment, op, target, value, span };
}
export function makeConditional(test, consequent, alternate, span) {
    return { kind: ExprKind.Conditional, test, consequent, alternate, span };
}
export function makeSequence(expressions, span) {
    return { kind: ExprKind.Sequence, expressions, span };
}
export function makeCall(callee, args, optional, span) {
    return { kind: ExprKind.Call, callee, args, optional, span };
}
export function makeNew(callee, args, span) {
    return { kind: ExprKind.New, callee, args, span };
}
export function makeMember(object, property, computed, optional, span) {
    return { kind: ExprKind.Member, object, property, computed, optional, span };
}
export function makeArrow(params, body, isAsync, span) {
    return { kind: ExprKind.Arrow, params, body, isAsync, span };
}
export function makeFunction(name, params, body, isAsync, span) {
    return { kind: ExprKind.Function, name, params, body, isAsync, span };
}

// --- isExpr — predicate ---
export function isExpr(node) {
    if (node === undefined || node === null) {
        return false;
    }
    return ExprKind[node.kind] !== undefined;
}
