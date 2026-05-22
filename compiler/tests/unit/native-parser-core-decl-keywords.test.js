// native-parser-core-decl-keywords.test.js — M5-swap Wave 1 (B4 + B5 + B6).
//
// Native-parser productions for core scrml declaration constructs the
// JS-subset M1-M4 parser had no production for:
//   B4 — `lin name = expr`            linear-binding declaration (SPEC §35.2)
//   B5 — `type Name : kind = {...}`   type declaration (SPEC §14)
//   B6 — `[pure] [server] fn ... !`   function modifiers (SPEC §48 / §48.6.4)
//
// Three layers under test, end to end:
//   1. lexing       — `lin` / `type` / `fn` / `server` / `pure` lex to their
//      `Kw*` TokenKinds (token.js JS_KEYWORDS).
//   2. parsing      — parseProgram dispatches the new declaration productions
//      (parse-stmt.js parseLinDecl / parseTypeDecl / parseScrmlFunctionDecl).
//   3. translation  — translateStmtList maps the new native Stmt kinds to the
//      live `lin-decl` / `type-decl` / `function-decl` LogicStatement kinds
//      (translate-stmt.js), reading the B6 modifier fields.
//
// DRIVER: source -> `lex` -> `parseProgram` -> `translateStmtList`.

import { describe, test, expect } from "bun:test";

import { lex } from "../../native-parser/lex.js";
import { TokenKind, JS_KEYWORDS } from "../../native-parser/token.js";
import { StmtKind } from "../../native-parser/ast-stmt.js";
import { parseProgram } from "../../native-parser/parse-stmt.js";
import { translateStmtList } from "../../native-parser/translate-stmt.js";

// parse — source -> native Stmt[] (+ errors).
function parse(source) {
    return parseProgram(lex(source));
}

// translate — source -> live LogicStatement[].
function translate(source, idGen) {
    return translateStmtList(parse(source).body, idGen);
}

// =============================================================================
describe("§0 — lexer keyword recognition", () => {
    test("lin / type / fn / server / pure are JS_KEYWORDS entries", () => {
        expect(JS_KEYWORDS.lin).toBe(TokenKind.KwLin);
        expect(JS_KEYWORDS.type).toBe(TokenKind.KwType);
        expect(JS_KEYWORDS.fn).toBe(TokenKind.KwFn);
        expect(JS_KEYWORDS.server).toBe(TokenKind.KwServer);
        expect(JS_KEYWORDS.pure).toBe(TokenKind.KwPure);
    });

    test("a `lin` bareword lexes to KwLin", () => {
        const toks = lex("lin x = 1");
        expect(toks[0].kind).toBe(TokenKind.KwLin);
    });

    test("a `type` bareword lexes to KwType", () => {
        const toks = lex("type X : enum = {}");
        expect(toks[0].kind).toBe(TokenKind.KwType);
    });

    test("a `fn` / `server` / `pure` bareword lexes to its Kw* kind", () => {
        expect(lex("fn f {}")[0].kind).toBe(TokenKind.KwFn);
        expect(lex("server fn f {}")[0].kind).toBe(TokenKind.KwServer);
        expect(lex("pure fn f {}")[0].kind).toBe(TokenKind.KwPure);
    });

    test("the new keywords are still valid member-property names", () => {
        // `obj.type` / `obj.fn` — `parseMemberProperty` admits any keyword as
        // a property name, so a member access with one of the new keywords
        // as the property is not a parse error.
        const out = translate("obj.type;");
        expect(out.length).toBe(1);
        expect(out[0].kind).toBe("bare-expr");
        expect(parse("obj.fn;").errors.length).toBe(0);
    });
});

// =============================================================================
describe("§1 — B4: `lin` lin-decl", () => {
    test("`lin name = expr` parses to a LinDecl native Stmt", () => {
        const prog = parse("lin token = fetchToken()");
        expect(prog.body.length).toBe(1);
        expect(prog.body[0].kind).toBe(StmtKind.LinDecl);
        expect(prog.body[0].name).toBe("token");
        expect(prog.body[0].init).not.toBeNull();
        expect(prog.errors.length).toBe(0);
    });

    test("`lin name = expr` translates to a live `lin-decl`", () => {
        const out = translate("lin token = fetchToken()");
        expect(out.length).toBe(1);
        expect(out[0].kind).toBe("lin-decl");
        expect(out[0].name).toBe("token");
        expect(out[0].initExpr).not.toBeUndefined();
        expect(out[0].initExpr).not.toBeNull();
    });

    test("`lin` inside a block body translates correctly", () => {
        const out = translate("{ lin nextId = idCounter + 1; }");
        expect(out.length).toBe(1);
        expect(out[0].kind).toBe("lin-decl");
        expect(out[0].name).toBe("nextId");
    });

    test("a `lin` with no initializer records E-STMT-LIN-INIT", () => {
        const prog = parse("lin orphan");
        expect(prog.body[0].kind).toBe(StmtKind.LinDecl);
        expect(prog.errors.map((e) => e.code)).toContain("E-STMT-LIN-INIT");
    });

    test("a `lin` with no name records E-STMT-LIN-NAME", () => {
        const prog = parse("lin = 1");
        expect(prog.errors.map((e) => e.code)).toContain("E-STMT-LIN-NAME");
    });

    test("a `lin-decl` translation omits initExpr when there is no init", () => {
        const out = translate("lin orphan");
        expect(out.length).toBe(1);
        expect(out[0].kind).toBe("lin-decl");
        expect(out[0].initExpr).toBeUndefined();
    });
});

// =============================================================================
describe("§2 — B5: `type` declarations", () => {
    test("`type Name : enum = { ... }` parses to a TypeDecl native Stmt", () => {
        const prog = parse("type DutyStatus : enum = { OnDuty, OffDuty, Sleeper }");
        expect(prog.body.length).toBe(1);
        expect(prog.body[0].kind).toBe(StmtKind.TypeDecl);
        expect(prog.body[0].name).toBe("DutyStatus");
        expect(prog.body[0].typeKind).toBe("enum");
        expect(prog.errors.length).toBe(0);
    });

    test("`type` body form translates to a live `type-decl` with `raw`", () => {
        const out = translate("type DutyStatus : enum = { OnDuty, OffDuty }");
        expect(out.length).toBe(1);
        expect(out[0].kind).toBe("type-decl");
        expect(out[0].name).toBe("DutyStatus");
        expect(out[0].typeKind).toBe("enum");
        // `raw` mirrors the live ast-builder's "{ " + body + " }" space-join.
        expect(out[0].raw).toBe("{ OnDuty , OffDuty }");
    });

    test("`type Name : kind` alias form has empty `raw`", () => {
        const out = translate("type UserId : number");
        expect(out.length).toBe(1);
        expect(out[0].kind).toBe("type-decl");
        expect(out[0].name).toBe("UserId");
        expect(out[0].typeKind).toBe("number");
        expect(out[0].raw).toBe("");
    });

    test("`type Name = expr` inline-alias form carries the alias as `raw`", () => {
        const out = translate("type Id = number");
        expect(out.length).toBe(1);
        expect(out[0].kind).toBe("type-decl");
        expect(out[0].name).toBe("Id");
        expect(out[0].typeKind).toBe("");
        expect(out[0].raw).toBe("number");
    });

    test("`type Name : struct = {...}` struct body form", () => {
        const out = translate("type Config : struct = { timeout : number }");
        expect(out[0].kind).toBe("type-decl");
        expect(out[0].typeKind).toBe("struct");
        expect(out[0].raw).toBe("{ timeout : number }");
    });

    test("`export type ...` routes the declaration (no longer dropped)", () => {
        // B5 fix — `export type` previously fell through to E-STMT-EXPORT-DECL
        // because `type` lexed as an Ident; the type was DROPPED entirely.
        const prog = parse("export type Status : enum = { A, B }");
        expect(prog.body.length).toBe(1);
        expect(prog.body[0].kind).toBe(StmtKind.Export);
        expect(prog.body[0].declaration).not.toBeNull();
        expect(prog.body[0].declaration.kind).toBe(StmtKind.TypeDecl);
        expect(prog.errors.length).toBe(0);
    });

    test("an exported `type` translates with exportKind 'type'", () => {
        const out = translate("export type Status : enum = { A, B }");
        expect(out.length).toBe(1);
        expect(out[0].kind).toBe("export-decl");
        expect(out[0].exportKind).toBe("type");
        expect(out[0].exportedName).toBe("Status");
    });

    test("a `type` with no name records E-STMT-TYPE-NAME", () => {
        const prog = parse("type : enum = {}");
        expect(prog.errors.map((e) => e.code)).toContain("E-STMT-TYPE-NAME");
    });

    test("a `type` body missing its `}` records E-STMT-TYPE-UNCLOSED-BODY", () => {
        const prog = parse("type Broken : enum = { A, B");
        expect(prog.errors.map((e) => e.code)).toContain("E-STMT-TYPE-UNCLOSED-BODY");
    });
});

// =============================================================================
describe("§3 — B6: `fn` / `server` / `pure` / `!` function modifiers", () => {
    test("a bare `fn` declaration carries fnKind 'fn'", () => {
        const out = translate("fn taxFor(amount) { return amount }");
        expect(out.length).toBe(1);
        expect(out[0].kind).toBe("function-decl");
        expect(out[0].name).toBe("taxFor");
        expect(out[0].fnKind).toBe("fn");
        expect(out[0].isServer).toBe(false);
        expect(out[0].canFail).toBe(false);
        expect(out[0].params).toEqual(["amount"]);
    });

    test("`pure fn` sets isPure", () => {
        const out = translate("pure fn taxFor(amount) { return amount }");
        expect(out[0].fnKind).toBe("fn");
        expect(out[0].isPure).toBe(true);
        expect(out[0].isServer).toBe(false);
    });

    test("`server fn ... !` sets isServer + canFail", () => {
        const out = translate("server fn saveOrder(order) ! { return order }");
        expect(out[0].fnKind).toBe("fn");
        expect(out[0].isServer).toBe(true);
        expect(out[0].canFail).toBe(true);
    });

    test("`! -> ErrorType` records errorType", () => {
        const out = translate("server fn loadUser(id) ! -> LoadError { return id }");
        expect(out[0].isServer).toBe(true);
        expect(out[0].canFail).toBe(true);
        expect(out[0].errorType).toBe("LoadError");
    });

    test("`pure server fn` sets both isPure and isServer", () => {
        const out = translate("pure server fn calc(x) { return x }");
        expect(out[0].isPure).toBe(true);
        expect(out[0].isServer).toBe(true);
    });

    test("a `fn` with no param list parses (params optional)", () => {
        const out = translate("fn noParams { return 1 }");
        expect(out[0].kind).toBe("function-decl");
        expect(out[0].name).toBe("noParams");
        expect(out[0].params).toEqual([]);
    });

    test("a `fn` with a `-> Type` return annotation parses", () => {
        const prog = parse("fn calc(x) -> number { return x }");
        expect(prog.errors.length).toBe(0);
        expect(prog.body[0].kind).toBe(StmtKind.FunctionDecl);
    });

    test("a `fn` with a `: Type` return annotation parses", () => {
        const prog = parse("fn calc2(x) : number { return x }");
        expect(prog.errors.length).toBe(0);
        expect(prog.body[0].kind).toBe(StmtKind.FunctionDecl);
    });

    test("a plain JS `function` still carries fnKind 'function'", () => {
        // B6 must NOT regress the plain `function` form — the legacy 6-arg
        // makeFunctionDecl call shape defaults to fnKind:"function".
        const out = translate("function plainJs() { return 2 }");
        expect(out[0].kind).toBe("function-decl");
        expect(out[0].fnKind).toBe("function");
        expect(out[0].isServer).toBe(false);
        expect(out[0].canFail).toBe(false);
        expect(out[0].isPure).toBeUndefined();
    });

    test("`export fn` routes through the modifier production", () => {
        const prog = parse("export fn helper(x) { return x }");
        expect(prog.body[0].kind).toBe(StmtKind.Export);
        expect(prog.body[0].declaration.kind).toBe(StmtKind.FunctionDecl);
        expect(prog.body[0].declaration.fnKind).toBe("fn");
    });

    test("an exported `fn` translates with exportKind 'fn'", () => {
        const out = translate("export fn helper(x) { return x }");
        expect(out[0].kind).toBe("export-decl");
        expect(out[0].exportKind).toBe("fn");
        expect(out[0].exportedName).toBe("helper");
    });

    test("an exported `server fn` translates with exportKind 'fn'", () => {
        const out = translate("export server fn save(o) ! { return o }");
        expect(out[0].kind).toBe("export-decl");
        expect(out[0].exportKind).toBe("fn");
    });

    test("the body of a `fn` is translated to live LogicStatements", () => {
        const out = translate("fn f(x) { let y = x; return y }");
        expect(out[0].kind).toBe("function-decl");
        expect(Array.isArray(out[0].body)).toBe(true);
        expect(out[0].body.map((n) => n.kind)).toEqual(["let-decl", "return-stmt"]);
    });
});

// =============================================================================
describe("§4 — shared-`!` disambiguation (DD OQ3)", () => {
    test("trailing signature-`!` does not consume the body `{`", () => {
        // The trailing `!` on a `fn` signature is a single Bang token; the
        // body `{` stays available as the function-body opener. A future B2
        // `!{}` guarded-expr production operates in EXPRESSION position — a
        // distinct grammar position — so the two `!` uses do not collide.
        const prog = parse("server fn f() ! { return 1 }");
        expect(prog.errors.length).toBe(0);
        const fn = prog.body[0];
        expect(fn.kind).toBe(StmtKind.FunctionDecl);
        expect(fn.canFail).toBe(true);
        // the body parsed — the `{` was the function body, not consumed by `!`.
        expect(Array.isArray(fn.body)).toBe(true);
        expect(fn.body.length).toBe(1);
        expect(fn.body[0].kind).toBe(StmtKind.Return);
    });

    test("a prefix `!` (logical-not) in an expression is unaffected", () => {
        // `!cond` at expression position is logical-not — the B6 trailing-`!`
        // grammar is gated on function-declaration-head position only.
        const prog = parse("let ok = !cond;");
        expect(prog.errors.length).toBe(0);
        expect(prog.body[0].kind).toBe(StmtKind.VarDecl);
    });
});

// =============================================================================
describe("§5 — id-stamping + span discipline", () => {
    test("LinDecl / TypeDecl / fn nodes get stamped ids from the shared counter", () => {
        const counter = { next: 100 };
        const out = translate(
            "lin a = 1\ntype T : enum = { X }\nfn f() { return 1 }",
            counter,
        );
        const ids = out.map((n) => n.id);
        // ids are unique + monotonic from the shared counter start.
        expect(ids[0]).toBeGreaterThan(100);
        expect(new Set(ids).size).toBe(ids.length);
    });

    test("every new node carries a span", () => {
        const out = translate(
            "lin a = 1\ntype T : enum = { X }\nfn f() { return 1 }",
        );
        for (const n of out) {
            expect(n.span).not.toBeUndefined();
            expect(n.span).not.toBeNull();
            expect(typeof n.span.start).toBe("number");
        }
    });
});

// =============================================================================
describe("§6 — corpus shapes — no leaked native kinds", () => {
    // The set of live lowercase kinds the B4/B5/B6 translation may emit.
    const LIVE_KINDS = new Set([
        "lin-decl", "type-decl", "function-decl", "export-decl",
        "let-decl", "const-decl", "return-stmt", "bare-expr",
    ]);

    test("a mixed declaration corpus translates to live lowercase kinds only", () => {
        const src = [
            "lin token = fetchToken()",
            "type DutyStatus : enum = { OnDuty, OffDuty }",
            "pure fn taxFor(amount) { return amount }",
            "server fn saveOrder(order) ! -> SaveError { return order }",
            "export type UserId : number",
            "export fn helper(x) { return x }",
        ].join("\n");
        const out = translate(src);
        expect(out.length).toBe(6);
        for (const n of out) {
            expect(LIVE_KINDS.has(n.kind)).toBe(true);
        }
        expect(out.map((n) => n.kind)).toEqual([
            "lin-decl", "type-decl", "function-decl",
            "function-decl", "export-decl", "export-decl",
        ]);
    });
});

// =============================================================================
// §7 — P5-3: `type:kind Name { ... }` kind-FIRST ordering (SPEC §14.3.1).
//
// SPEC §14 specifies both `type Name :kind = {...}` (name-first) and the
// §14.3.1 `type:struct Token { ... }` / `type:enum K { ... }` kind-first
// ordering. The native `parseTypeDecl` previously only handled the name-first
// form — a kind-first `type:enum K { ... }` mis-parsed: the `:` was consumed
// as the name-first discriminator with NO name, the body was never consumed,
// and the enum members leaked as sibling `bare-expr` statements. P5-3 adds the
// kind-first branch (the self-host `tokenizer.scrml` (`tab`) uses this form).
// =============================================================================
describe("§7 — P5-3: `type:kind Name { ... }` kind-first ordering", () => {
    test("`type:enum K { A; B; C }` parses to ONE TypeDecl", () => {
        const prog = parse("type:enum TokenKind { EOF; IDENT; NUMBER }");
        expect(prog.body.length).toBe(1);
        expect(prog.body[0].kind).toBe(StmtKind.TypeDecl);
        expect(prog.body[0].name).toBe("TokenKind");
        expect(prog.body[0].typeKind).toBe("enum");
    });

    test("`type:struct Token { ... }` kind-first struct body form", () => {
        const out = translate("type:struct Token { kind : string ; text : string }");
        expect(out.length).toBe(1);
        expect(out[0].kind).toBe("type-decl");
        expect(out[0].name).toBe("Token");
        expect(out[0].typeKind).toBe("struct");
    });

    test("kind-first body is CONSUMED — members do not leak as bare-expr siblings", () => {
        // The defect signature: the enum body leaking as sibling statements.
        const prog = parse("type:enum K { A; B }\nconst after = 1");
        expect(prog.body.map((s) => s.kind)).toEqual([
            StmtKind.TypeDecl, StmtKind.VarDecl,
        ]);
    });

    test("the name-first `type Name :kind` form still parses unchanged", () => {
        const prog = parse("type DutyStatus : enum = { OnDuty, OffDuty }");
        expect(prog.body.length).toBe(1);
        expect(prog.body[0].kind).toBe(StmtKind.TypeDecl);
        expect(prog.body[0].name).toBe("DutyStatus");
        expect(prog.body[0].typeKind).toBe("enum");
    });

    test("an exported kind-first `export type:enum K { ... }` routes the decl", () => {
        const prog = parse("export type:enum Status { Active; Closed }");
        expect(prog.body.length).toBe(1);
        expect(prog.body[0].kind).toBe(StmtKind.Export);
        expect(prog.body[0].declaration).not.toBeNull();
        expect(prog.body[0].declaration.kind).toBe(StmtKind.TypeDecl);
        expect(prog.body[0].declaration.name).toBe("Status");
        expect(prog.body[0].declaration.typeKind).toBe("enum");
    });
});

// =============================================================================
// §8 — P5-3: `^{ ... }` meta-block statement-loop recovery.
//
// A `^{}` meta block (SPEC §40) can open a `${...}` logic-escape body. The
// native lexer has no `^{` sigil token — `^` lexes as `BitXor`. Without
// statement-position recognition a `^` at statement head routes to the
// expression grammar, stalls (no left operand), and the forward-progress
// guard bails the WHOLE statement loop — every sibling declaration after the
// meta block is dropped. P5-3 recognizes a source-adjacent `^{` and consumes
// the brace body as ONE statement so the loop continues.
// =============================================================================
describe("§8 — P5-3: `^{ ... }` meta-block statement-loop recovery", () => {
    test("a leading `^{}` meta block does not truncate the statement loop", () => {
        const prog = parse(
            "^{ const x = 1 }\nexport function foo() { return 1 }\nconst after = 2");
        // Pre-fix: the `^` stalled the loop — `foo` + `after` were dropped.
        // Post-fix: the `^{}` is consumed as one statement; the siblings parse.
        const kinds = prog.body.map((s) => s.kind);
        expect(kinds).toContain(StmtKind.Export);
        expect(kinds).toContain(StmtKind.VarDecl);
    });

    test("a leading `^{}` is consumed as a single Block statement", () => {
        // The self-host shape: a `^{}` opening a `${}` body. The `^{}` is
        // recognized at statement head and parsed as one statement; the
        // sibling declaration after it parses cleanly.
        const prog = parse("^{ const m = 2 }\nconst b = 3");
        expect(prog.body.map((s) => s.kind)).toEqual([
            StmtKind.Block, StmtKind.VarDecl,
        ]);
    });

    test("an `^{}` after an explicitly-terminated statement parses both", () => {
        const prog = parse("const a = 1;\n^{ const m = 2 }\nconst b = 3");
        expect(prog.body.map((s) => s.kind)).toEqual([
            StmtKind.VarDecl, StmtKind.Block, StmtKind.VarDecl,
        ]);
    });

    test("a stray `^` binary operator is NOT mis-parsed as a meta block", () => {
        // `metaBlockLeadFollows` only fires for a `^{` at statement head — a
        // `^` used as a bitwise-XOR operator inside an expression is left to
        // the expression grammar.
        const prog = parse("const b = a ^ 2");
        expect(prog.body.length).toBe(1);
        expect(prog.body[0].kind).toBe(StmtKind.VarDecl);
    });
});
