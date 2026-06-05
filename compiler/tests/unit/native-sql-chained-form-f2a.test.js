// native-sql-chained-form-f2a.test.js — F2a (FIX-NATIVE).
//
// change-id: native-sql-chained-form-f2a-2026-06-04
//
// THE GAP. A CHAINED `?{...}.get()` / `.all()` / `.run()` SQL expression at
// statement position parses (native pre-translate) to a `Call`-headed
// expression — the `Sql` atom wrapped in a postfix `Member` + `Call` chain,
// NOT a bare `Sql` atom (`e.kind === "Sql"`). Before F2a the chained form fell
// through to `makeBareExpr` -> `translateExpr` -> `translateSql`, which emits a
// `sql-ref{nodeId:-1}` and DISCARDS the `Sql.raw` query text. Codegen then
// emitted `null /* sql-ref:-1 */.all()` (0 `_scrml_sql`, E-PA-002).
//
// THE FIX (translate-stmt.js `reconstructChainedSql`): detect the native
// `Call(Member(...Member(Sql, m), ...), args)` chain BEFORE translateExpr runs
// (while `Sql.raw` is intact), and reconstruct the live `{kind:"sql", query,
// chainedCalls, span}` node — attached as `sqlNode` on the return/let/const
// node (mirroring the live ast-builder L5282/L5384/L9810 shape) and emitted
// DIRECTLY as a `kind:"sql"` statement for a bare `?{}.run()` (mirroring the
// live BLOCK_REF + consumeSqlChainedCalls statement path, ast-builder.js L7884).
//
// UNIT scope: the four clean translate-stmt statement positions — return /
// let-decl / const-decl / bare-expr — plus the `${}`-param query path and the
// §8.9.5 `.nobatch()` compile-time marker. End-to-end byte-identical emit
// parity (native == default) lives in the R26 probe (see progress.md).
//
// DRIVER: source -> `lex` -> `parseProgram` -> `translateStmtList` (the same
// unit driver translate-stmt-bridge.test.js uses).

import { describe, test, expect } from "bun:test";

import { lex } from "../../native-parser/lex.js";
import { parseProgram } from "../../native-parser/parse-stmt.js";
import { translateStmtList } from "../../native-parser/translate-stmt.js";

function translate(source, idGen) {
    const tokens = lex(source);
    const program = parseProgram(tokens);
    return translateStmtList(program.body, idGen);
}

// stripIds — drop the counter-derived `id` + `span` so the structural shape can
// be compared (also strips them off a nested `sqlNode`).
function stripIds(node) {
    if (!node || typeof node !== "object") return node;
    const { id, span, sqlNode, ...rest } = node;
    if (sqlNode) {
        const { id: _i, span: _s, ...sqlRest } = sqlNode;
        rest.sqlNode = sqlRest;
    }
    return rest;
}

describe("F2a — chained ?{...}.method() SQL promotion at statement position", () => {

    // --- return-stmt -----------------------------------------------------------
    test("return ?{...}.all() attaches a kind:sql sqlNode and OMITS exprNode", () => {
        const out = translate('return ?{`SELECT * FROM tasks`}.all()');
        expect(out.length).toBe(1);
        const ret = out[0];
        expect(ret.kind).toBe("return-stmt");
        // exprNode MUST be absent — the SQL is carried ONLY by sqlNode (mirrors
        // the live return path, ast-builder.js L9810 which omits exprNode).
        expect(ret.exprNode).toBeUndefined();
        expect(ret.sqlNode).toBeDefined();
        expect(ret.sqlNode.kind).toBe("sql");
        expect(ret.sqlNode.query).toBe("SELECT * FROM tasks");
        expect(ret.sqlNode.chainedCalls).toEqual([{ method: "all", args: "" }]);
    });

    // --- let-decl --------------------------------------------------------------
    test("let r = ?{...}.get() attaches a kind:sql sqlNode and OMITS initExpr", () => {
        const out = translate('let r = ?{`SELECT 1`}.get()');
        expect(out.length).toBe(1);
        const decl = out[0];
        expect(decl.kind).toBe("let-decl");
        expect(decl.name).toBe("r");
        expect(decl.initExpr).toBeUndefined();
        expect(decl.sqlNode).toBeDefined();
        expect(decl.sqlNode.kind).toBe("sql");
        expect(decl.sqlNode.query).toBe("SELECT 1");
        expect(decl.sqlNode.chainedCalls).toEqual([{ method: "get", args: "" }]);
    });

    // --- const-decl ------------------------------------------------------------
    test("const r = ?{...}.all() attaches a kind:sql sqlNode and OMITS initExpr", () => {
        const out = translate('const r = ?{`SELECT 1`}.all()');
        expect(out.length).toBe(1);
        const decl = out[0];
        expect(decl.kind).toBe("const-decl");
        expect(decl.name).toBe("r");
        expect(decl.initExpr).toBeUndefined();
        expect(decl.sqlNode).toBeDefined();
        expect(decl.sqlNode.kind).toBe("sql");
        expect(decl.sqlNode.query).toBe("SELECT 1");
        expect(decl.sqlNode.chainedCalls).toEqual([{ method: "all", args: "" }]);
    });

    // --- bare-expr -------------------------------------------------------------
    test("bare ?{...}.run() promotes DIRECTLY to a kind:sql statement (no bare-expr/sql-ref)", () => {
        const out = translate('?{`DELETE FROM t`}.run()');
        expect(out.length).toBe(1);
        const stmt = out[0];
        // The bare-statement chained form is a kind:"sql" statement directly
        // (mirrors live ast-builder L7884 nodes.push(childNode)), NOT a
        // bare-expr wrapping a sql-ref call.
        expect(stmt.kind).toBe("sql");
        expect(stmt.query).toBe("DELETE FROM t");
        expect(stmt.chainedCalls).toEqual([{ method: "run", args: "" }]);
    });

    test("bare ?{...}.run() produces NO residual bare-expr + sql-ref call", () => {
        const out = translate('?{`DELETE FROM t`}.run()');
        const leak = out.find(
            (s) => s && s.kind === "bare-expr" && s.exprNode && s.exprNode.kind === "sql-ref",
        );
        expect(leak).toBeUndefined();
        const callLeak = out.find(
            (s) => s && s.kind === "bare-expr" && s.exprNode && s.exprNode.kind === "call",
        );
        expect(callLeak).toBeUndefined();
    });

    // --- query text + delimiter stripping --------------------------------------
    test("the reconstructed query strips ?{ / } delimiters and the backtick fence", () => {
        const out = translate("let r = ?{`SELECT id, name FROM users WHERE role = 'admin'`}.all()");
        expect(out[0].sqlNode.query).toBe("SELECT id, name FROM users WHERE role = 'admin'");
    });

    // --- ${}-param query path --------------------------------------------------
    test("a ${}-param query is preserved verbatim in the reconstructed sql node", () => {
        const out = translate('return ?{`SELECT * FROM t WHERE x = ${y}`}.all()');
        expect(out[0].sqlNode.query).toBe("SELECT * FROM t WHERE x = ${y}");
        expect(out[0].sqlNode.chainedCalls).toEqual([{ method: "all", args: "" }]);
    });

    // --- §8.9.5 .nobatch() compile-time marker ---------------------------------
    test(".nobatch().all() sets nobatch:true and DROPS nobatch from chainedCalls", () => {
        const out = translate('return ?{`SELECT 1`}.nobatch().all()');
        const sql = out[0].sqlNode;
        expect(sql.nobatch).toBe(true);
        // nobatch is a compile-time flag — it never appears as a chained call.
        expect(sql.chainedCalls).toEqual([{ method: "all", args: "" }]);
    });

    // --- negative: a non-SQL chained call is NOT mis-promoted -------------------
    test("a non-SQL chained call (ident.method()) stays bare-expr — NOT mis-promoted to sql", () => {
        const out = translate("foo.bar()");
        expect(out.length).toBe(1);
        expect(out[0].kind).toBe("bare-expr");
        expect(out[0].sqlNode).toBeUndefined();
    });

    test("a non-SQL chained init (let x = foo.bar()) keeps initExpr — NOT a sqlNode", () => {
        const out = translate("let x = foo.bar()");
        expect(out[0].kind).toBe("let-decl");
        expect(out[0].sqlNode).toBeUndefined();
        expect(out[0].initExpr).toBeDefined();
    });

    // --- id/span discipline ----------------------------------------------------
    test("the reconstructed sql node carries a stamped id + span from the shared counter", () => {
        const idGen = { next: 100 };
        const out = translate('return ?{`SELECT 1`}.all()', idGen);
        expect(typeof out[0].id).toBe("number");
        expect(typeof out[0].sqlNode.id).toBe("number");
        expect(out[0].sqlNode.span).toBeDefined();
        // ids advanced past the supplied base (uniqueness within the file).
        expect(idGen.next).toBeGreaterThan(100);
    });
});
